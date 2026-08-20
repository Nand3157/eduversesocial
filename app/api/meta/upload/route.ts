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

export async function POST(request: Request) {
  const parsed = uploadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid image payload." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });

  const rate = checkRateLimit(`upload:${user.id}`, 30, 60_000);
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

  const path = `uploads/${user.id}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("post-media")
    .upload(path, buffer, { contentType: mime, upsert: false });
  if (error) return NextResponse.json({ success: false, message: "Could not store the image." }, { status: 500 });

  const { data: publicUrl } = supabase.storage.from("post-media").getPublicUrl(path);
  return NextResponse.json({ success: true, url: publicUrl.publicUrl });
}