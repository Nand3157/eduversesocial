import { GoogleGenAI } from "@google/genai";

/**
 * Voice input for the AI chat, powered by Gemini 3.5 Transcribe
 * (https://ai.google.dev/gemini-api/docs/transcribe).
 *
 * The model automatically detects the spoken language across 85+ locales and
 * handles code-switching, so the language picker is only a hint that improves
 * accuracy when the user knows what they will speak.
 */

export const TRANSCRIBE_MODEL = process.env.GEMINI_TRANSCRIBE_MODEL || "gemini-3.5-transcribe";

/** Audio the browser MediaRecorder typically produces, mapped to API MIME types. */
export const SUPPORTED_AUDIO_MIME_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-m4a"] as const;

export type VoiceLanguage = { code: string; label: string };

/**
 * Curated subset of the model's supported BCP-47 locales (85+ total).
 * "auto" lets the model detect and code-switch on its own.
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

/** "auto" enables automatic language detection; anything else is a hard hint. */
export function transcriptionLanguageHint(code: string | undefined): string[] {
  const normalized = (code ?? "auto").trim();
  if (!normalized || normalized.toLowerCase() === "auto") return [];
  return [normalized];
}

/**
 * Map a browser MediaRecorder blob type to a MIME type the transcription API
 * accepts. Safari records MP4/AAC; Chrome and Firefox record WebM (usually
 * Opus, which the API exposes as audio/webm).
 */
export function normalizeAudioMimeType(blobType: string): string {
  if (!blobType) return "audio/webm";
  const base = blobType.toLowerCase().split(";")[0];
  if (base === "audio/x-m4a" || base === "audio/mp4" || base === "audio/m4a") return "audio/mp4";
  if (base === "audio/mpeg" || base === "audio/mp3") return "audio/mp3";
  if (base === "audio/opus") return "audio/ogg";
  if (base === "audio/x-wav" || base === "audio/wave") return "audio/wav";
  if (base.startsWith("audio/")) return base;
  return "audio/webm";
}

export class TranscribeConfigError extends Error {}

type TranscribeResult = { text: string };

/**
 * Transcribe an audio clip with the Gemini 3.5 Transcribe model via the
 * Interactions API. `audioBase64` is raw base64 (no data: prefix) of the
 * recorded clip; clips are short chat messages, so inline data is fine and we
 * avoid a Files API round trip.
 */
export async function transcribeAudio(options: {
  audioBase64: string;
  mimeType: string;
  languageCode?: string;
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
        mime_type: options.mimeType
      }
    ],
    generation_config: {
      transcription_config: {
        // Required by the API: [] or ["auto"] means automatic detection.
        language_hints: transcriptionLanguageHint(options.languageCode)
      }
    }
  });

  const text = (interaction.output_text ?? "").trim();
  return { text };
}
