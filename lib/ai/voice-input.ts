import { GoogleGenAI } from "@google/genai";

/**
 * Voice input for the AI chat, powered by Gemini 3.5 Transcribe
 * (https://ai.google.dev/gemini-api/docs/transcribe).
 *
 * The model automatically detects the spoken language across 85+ locales and
 * handles code-switching, so the language picker is only a hint that improves
 * accuracy when the user knows what they will speak.
 *
 * IMPORTANT (verified against the live API, Oct 2026): the interactions
 * endpoint currently REJECTS the documented `language_codes` /
 * `language_hints` transcription_config fields with HTTP 400, and inline
 * `data:` payloads for every container MIME type (`audio/wav`, `audio/webm`,
 * `audio/mp3`...) with "Request contains an invalid argument". The only
 * inline shape that works is raw headerless 16-bit little-endian PCM
 * (`audio/l16`) with explicit `sample_rate` and `channels` â€” so the recording
 * is decoded to PCM in the browser (lib/audio/pcm-clip.ts, the only runtime
 * that has decoders for every container MediaRecorder can emit) before it
 * reaches this module. Language detection therefore always runs in auto mode.
 */

export const TRANSCRIBE_MODEL = process.env.GEMINI_TRANSCRIBE_MODEL || "gemini-3.5-transcribe";

export type VoiceLanguage = { code: string; label: string };

/**
 * Language picker for the UI. The transcription endpoint currently ignores
 * language hints (see module note), so every entry degrades to auto-detect â€”
 * kept so the UI contract is stable if the API regains the field.
 */
export const VOICE_LANGUAGES: VoiceLanguage[] = [
  { code: "auto", label: "Auto-detect language" },
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "en-IN", label: "English (India)" },
  { code: "es-419", label: "Spanish (Latin America)" },
  { code: "es-US", label: "Spanish (US)" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "it-IT", label: "Italian" },
  { code: "nl-NL", label: "Dutch" },
  { code: "hi-IN", label: "Hindi" },
  { code: "bn-IN", label: "Bengali (India)" },
  { code: "bn-BD", label: "Bengali (Bangladesh)" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "mr-IN", label: "Marathi" },
  { code: "gu-IN", label: "Gujarati" },
  { code: "kn-IN", label: "Kannada" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "pa-IN", label: "Punjabi" },
  { code: "ur-PK", label: "Urdu" },
  { code: "ar-EG", label: "Arabic (Egypt)" },
  { code: "he-IL", label: "Hebrew" },
  { code: "fa-IR", label: "Farsi" },
  { code: "ru-RU", label: "Russian" },
  { code: "uk-UA", label: "Ukrainian" },
  { code: "pl-PL", label: "Polish" },
  { code: "cs-CZ", label: "Czech" },
  { code: "tr-TR", label: "Turkish" },
  { code: "el-GR", label: "Greek" },
  { code: "sv-SE", label: "Swedish" },
  { code: "nb-NO", label: "Norwegian" },
  { code: "da-DK", label: "Danish" },
  { code: "fi-FI", label: "Finnish" },
  { code: "hu-HU", label: "Hungarian" },
  { code: "ro-RO", label: "Romanian" },
  { code: "id-ID", label: "Indonesian" },
  { code: "ms-MY", label: "Malay" },
  { code: "fil-PH", label: "Filipino" },
  { code: "vi-VN", label: "Vietnamese" },
  { code: "th-TH", label: "Thai" },
  { code: "cmn-Hans-CN", label: "Mandarin Chinese" },
  { code: "yue-Hant-HK", label: "Cantonese" },
  { code: "ja-JP", label: "Japanese" },
  { code: "ko-KR", label: "Korean" },
  { code: "af-ZA", label: "Afrikaans" },
  { code: "sw-KE", label: "Swahili" },
  { code: "am-ET", label: "Amharic" },
  { code: "ha-NG", label: "Hausa" }
];

export class TranscribeConfigError extends Error {}

type TranscribeResult = { text: string };

/**
 * Transcribe an audio clip with the Gemini 3.5 Transcribe model via the
 * Interactions API.
 *
 * `audio` must be raw 16-bit little-endian mono PCM samples base64-encoded
 * (see lib/audio/pcm-clip.ts): the endpoint rejects inline container data,
 * and audio/l16 with explicit sample_rate/channels is the only inline shape
 * the API currently accepts. Language always auto-detects.
 */
export async function transcribeAudio(options: {
  /** Base64 of raw 16-bit LE mono PCM (no WAV header). */
  audioBase64: string;
  sampleRate: number;
}): Promise<TranscribeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("your-gemini") || apiKey.length < 15) {
    throw new TranscribeConfigError("Gemini API key is not configured.");
  }

  const client = new GoogleGenAI({ apiKey });
  const interaction = await client.interactions.create({
    model: TRANSCRIBE_MODEL,
    input: [
      {
        type: "audio",
        data: options.audioBase64,
        mime_type: "audio/l16",
        sample_rate: options.sampleRate,
        channels: 1
      }
    ]
  });

  const text = (interaction.output_text ?? "").trim();
  return { text };
}
