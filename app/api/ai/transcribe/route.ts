import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { normalizeAudioMimeType, transcribeAudio, TranscribeConfigError, VOICE_LANGUAGES } from "@/lib/ai/voice-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Audio arrives as a base64 data URL from MediaRecorder. 6 MB of base64 is
// roughly 4.5 MB of audio — far more than a voice message needs (the model
// supports up to 1 hour), but small enough that a malicious client cannot
// burn unbounded bandwidth or provider spend.
const MAX_AUDIO_BASE64_LENGTH = 6_000_000;

const requestSchema = z.object({
  audio: z.string().startsWith("data:audio/").max(MAX_AUDIO_BASE64_LENGTH),
  // BCP-47 hint, or "auto" to let the model detect the language.
  languageCode: z.string().trim().max(35).optional()
});

/** Public surface for the chat UI's language picker. */
export async function GET() {
  return Response.json(
    {
      model: process.env.GEMINI_TRANSCRIBE_MODEL || "gemini-3.5-transcribe",
      languages: VOICE_LANGUAGES
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return Response.json({ error: "Service unavailable." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  // Email verification gate matches the chat route.
  if (!user.email_confirmed_at) return Response.json({ error: "Verify your email to use voice input." }, { status: 403 });

  // Transcription is one short call per voice message; a tighter per-minute
  // limit than chat is enough because each message sends at most one clip.
  if (!(await checkRateLimit(`transcribe:${user.id}`, 30, 60_000)).allowed) {
    return Response.json({ error: "Too many voice requests. Please try again in a minute." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid transcription request." }, { status: 400 });

  const match = parsed.data.audio.match(/^data:(audio\/[^;]+);base64,([\s\S]+)$/);
  if (!match) return Response.json({ error: "Unsupported audio payload." }, { status: 400 });
  const [, rawMime, base64] = match;
  if (!base64) return Response.json({ error: "The recording is empty." }, { status: 400 });

  const mimeType = normalizeAudioMimeType(rawMime);
  try {
    const { text } = await transcribeAudio({
      audioBase64: base64,
      mimeType,
      languageCode: parsed.data.languageCode
    });
    if (!text) {
      return Response.json({ error: "No speech was detected in the recording. Try again a little closer to the mic." }, { status: 422 });
    }
    return Response.json({ text }, { headers: { "Cache-Control": "no-store", "X-AI-Provider": "gemini" } });
  } catch (error) {
    if (error instanceof TranscribeConfigError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    logger.error("voice_transcribe_failed", {
      userId: user.id,
      reason: error instanceof Error ? error.message : "unknown"
    });
    return Response.json({ error: "Transcription is unavailable right now. Try again shortly." }, { status: 502 });
  }
}
