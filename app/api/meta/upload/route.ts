import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const uploadSchema = z.object({
  // Base64 data URL, capped like chat attachments so a malicious client
  // cannot burn unbounded storage or bandwidth.
  image: z.string().startsWith("data:").max(4_000_000)
});

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif"
};

// The data-URL MIME header is client-declared, so verify the actual bytes
// before storing: a mismatch would let HTML or scripts land in the public
// bucket disguised as an image.
function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  const gifHeader = buffer.subarray(0, 6).toString("latin1");
  if (gifHeader === "GIF89a" || gifHeader === "GIF87a") return "image/gif";
  return null;
}

export async function POST(request: Request) {
  const parsed = uploadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid image payload." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });

  const rate = await checkRateLimit(`upload:${user.id}`, 30, 60_000);
  if (!rate.allowed) return NextResponse.json({ success: false, message: "Too many uploads. Try again shortly." }, { status: 429 });

  const match = parsed.data.image.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return NextResponse.json({ success: false, message: "Invalid image data." }, { status: 400 });
  const mime = match[1].toLowerCase();
  const ext = MIME_EXT[mime];
  if (!ext) return NextResponse.json({ success: false, message: "Only PNG, JPEG, WebP and GIF images are supported." }, { status: 400 });

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 4 * 1024 * 1024) {
    return NextResponse.json({ success: false, message: "Image must be under 4 MB." }, { status: 400 });
  }
  const sniffedMime = sniffImageMime(buffer);
  if (!sniffedMime || sniffedMime !== mime) {
    return NextResponse.json({ success: false, message: "File content does not match a supported image type." }, { status: 400 });
  }

  const path = `uploads/${user.id}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("post-media")
    .upload(path, buffer, { contentType: mime, upsert: false });
  if (error) return NextResponse.json({ success: false, message: "Could not store the image." }, { status: 500 });

  const { data: publicUrl } = supabase.storage.from("post-media").getPublicUrl(path);
  return NextResponse.json({ success: true, url: publicUrl.publicUrl });
}