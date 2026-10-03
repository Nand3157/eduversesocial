import { GoogleGenAI } from "@google/genai";
import { clampSpeechText, stripMarkdownForSpeech } from "@/lib/speech/speech-text";

/**
 * Text-to-speech for reading assistant replies aloud, powered by
 * Gemini 3.8 Flash-Lite TTS (https://ai.google.dev/gemini-api/docs/speech-generation).
 *
 * The model returns a complete WAV file (RIFF header + 24 kHz mono PCM), which
 * is served to the browser as an <audio>-playable blob — no client-side PCM
 * wrangling needed. Chosen over the larger gemini-3.8-flash-tts because read-
 * aloud replies are latency-sensitive and one-shot; the lite tier is the
 * cheapest voice model while still using the same prebuilt voice set (e.g.
 * Kore, Puck).
 */

export const TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-lite-tts";

/** Prebuilt voices offered by the Gemini TTS models (see the docs' Voice options table). */
export const TTS_VOICES = [
  { name: "Kore", label: "Kore — firm" },
  { name: "Puck", label: "Puck — upbeat" },
  { name: "Charon", label: "Charon — informative" },
  { name: "Fenrir", label: "Fenrir — excitable" },
  { name: "Aoede", label: "Aoede — breezy" },
  { name: "Leda", label: "Leda — youthful" },
  { name: "Zephyr", label: "Zephyr — bright" }
] as const;

export type TtsVoice = (typeof TTS_VOICES)[number]["name"];

const DEFAULT_VOICE: TtsVoice = "Kore";

/** Read-aloud clips are single replies; the cap lives in lib/speech/speech-text. */
export const MAX_TTS_CHARACTERS = 4_000;

export function clampTextForTts(text: string): string {
  return clampSpeechText(text);
}
export function isValidTtsVoice(voice: string | undefined): voice is TtsVoice {
  return !!voice && TTS_VOICES.some((option) => option.name === voice);
}

/**
 * Markdown stripping lives in lib/speech/speech-text (shared with the client
 * device-voice fallback).
 */
export { stripMarkdownForSpeech } from "@/lib/speech/speech-text";

export class TtsConfigError extends Error {}

type TtsResult = { audioBase64: string; mimeType: string };

/**
 * Generate a WAV file for the given text via the Interactions API.
 * Returns base64 (no data: prefix) plus the audio MIME type.
 */
export async function generateSpeech(options: {
  text: string;
  voice?: string;
}): Promise<TtsResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("your-gemini") || apiKey.length < 15) {
    throw new TtsConfigError("Gemini API key is not configured.");
  }

  const spoken = clampSpeechText(stripMarkdownForSpeech(options.text));
  if (!spoken) throw new TtsConfigError("Nothing to speak.");

  const client = new GoogleGenAI({ apiKey });
  const interaction = await client.interactions.create({
    model: TTS_MODEL,
    input: [
      {
        type: "user_input",
        content: [{ type: "text", text: spoken }]
      }
    ],
    response_format: { type: "audio" },
    generation_config: {
      speech_config: [{ voice: isValidTtsVoice(options.voice) ? options.voice : DEFAULT_VOICE }]
    }
  });

  const audio = interaction.output_audio;
  if (!audio?.data) throw new TtsConfigError("The speech model returned no audio.");
  return { audioBase64: audio.data, mimeType: audio.mime_type ?? "audio/wav" };
}
