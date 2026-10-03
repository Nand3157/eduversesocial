import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { TranscribeConfigError, transcribeAudio, VOICE_LANGUAGES } from "@/lib/ai/voice-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Audio arrives as raw 16-bit LE mono PCM, base64-encoded and already decoded
// by the browser (lib/audio/pcm-clip.ts). 60 s at the client's 16 kHz is
// ~1.9 MB of PCM → ~2.6 MB of base64; the cap leaves headroom while still
// stopping a malicious client from burning unbounded bandwidth or provider
// spend.
const MAX_AUDIO_BASE64_LENGTH = 3_000_000;
const MIN_SAMPLE_RATE = 8_000;
const MAX_SAMPLE_RATE = 96_000;

const requestSchema = z.object({
  audio: z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/).max(MAX_AUDIO_BASE64_LENGTH),
  sampleRate: z.number().int().min(MIN_SAMPLE_RATE).max(MAX_SAMPLE_RATE),
  // Kept for UI compatibility; the model currently auto-detects (see
  // lib/ai/voice-input.ts for why hints cannot be sent).
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

  const { audio, sampleRate } = parsed.data;

  try {
    // The API only accepts inline audio as raw 16-bit PCM (audio/l16) with an
    // explicit sample rate — container bytes (webm/mp3/wav) are rejected — so
    // the browser decodes to PCM before it is sent (lib/audio/pcm-clip.ts).
    const { text } = await transcribeAudio({ audioBase64: audio, sampleRate });
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
