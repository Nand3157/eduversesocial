import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { generateSpeech, TtsConfigError } from "@/lib/ai/text-to-speech";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-aloud clips are generated per assistant message. 4,000 characters
// bounds both provider spend per request and response size (a 4k-character
// reply is roughly a minute of speech).
const requestSchema = z.object({
  text: z.string().trim().min(1).max(8_000),
  voice: z.string().trim().max(40).optional()
});

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return Response.json({ error: "Service unavailable." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  // Email verification gate matches the chat route.
  if (!user.email_confirmed_at) return Response.json({ error: "Verify your email to use read aloud." }, { status: 403 });

  // One short TTS call per click; tighter than chat because a reply can be
  // replayed, and the free-tier TTS quota is small.
  if (!(await checkRateLimit(`tts:${user.id}`, 12, 60_000)).allowed) {
    return Response.json({ error: "Too many read-aloud requests. Please try again in a minute." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid read-aloud request." }, { status: 400 });

  try {
    const { audioBase64, mimeType } = await generateSpeech({ text: parsed.data.text, voice: parsed.data.voice });
    const bytes = Buffer.from(audioBase64, "base64");
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(bytes.byteLength),
        // Clips are cheap to regenerate and tied to the message text; never cache.
        "Cache-Control": "no-store",
        "X-AI-Provider": "gemini"
      }
    });
  } catch (error) {
    if (error instanceof TtsConfigError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    logger.error("tts_generate_failed", {
      userId: user.id,
      reason: error instanceof Error ? error.message : "unknown"
    });
    return Response.json({ error: "Read aloud is unavailable right now. Try again shortly." }, { status: 502 });
  }
}
