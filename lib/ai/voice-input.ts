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
 * (`audio/l16`) with explicit `sample_rate` and `channels` — so the browser
 * recording is decoded to PCM here before it is sent. Language detection
 * therefore always runs in auto mode.
 */

export const TRANSCRIBE_MODEL = process.env.GEMINI_TRANSCRIBE_MODEL || "gemini-3.5-transcribe";

/**
 * Browser MediaRecorder container formats we accept and can decode to PCM.
 * WAV (PCM) is decoded from the RIFF header; MP3 and Ogg/Opus are streamed
 * through the browser's <audio> decoder.
 */
export const SUPPORTED_AUDIO_MIME_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"] as const;

export type VoiceLanguage = { code: string; label: string };

/**
 * Language picker for the UI. The transcription endpoint currently ignores
 * language hints (see module note), so every entry degrades to auto-detect —
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

/**
 * Map a browser MediaRecorder blob type to a canonical container MIME type.
 * Safari records MP4/AAC; Chrome and Firefox record WebM (usually Opus).
 */
export function normalizeAudioMimeType(blobType: string): string {
  if (!blobType) return "audio/webm";
  const base = blobType.toLowerCase().split(";")[0];
  if (base === "audio/x-m4a" || base === "audio/mp4" || base === "audio/m4a") return "audio/mp4";
  if (base === "audio/mpeg" || base === "audio/mp3") return "audio/mpeg";
  if (base === "audio/opus") return "audio/ogg";
  if (base === "audio/x-wav" || base === "audio/wave") return "audio/wav";
  if (base.startsWith("audio/")) return base;
  return "audio/webm";
}

export class TranscribeConfigError extends Error {}
export class AudioDecodeError extends Error {}

/**
 * Extract raw 16-bit little-endian PCM samples from a WAV (RIFF) file.
 * Handles the common cases the browser produces (PCM or IEEE float, mono or
 * stereo, arbitrary sample rate) and throws AudioDecodeError for anything it
 * cannot interpret, so the caller can surface a clear message.
 */
export function extractWavPcm(buffer: ArrayBuffer): {
  samples: Int16Array;
  sampleRate: number;
} {
  const view = new DataView(buffer);
  if (buffer.byteLength < 44 || view.getUint32(0, false) !== 0x52494646 /* "RIFF" */ || view.getUint32(8, false) !== 0x57415645 /* "WAVE" */) {
    throw new AudioDecodeError("Not a WAV file.");
  }

  let offset = 12;
  let format: number | undefined;
  let channels: number | undefined;
  let sampleRate: number | undefined;
  let bitsPerSample: number | undefined;
  let dataStart = -1;
  let dataLength = 0;

  while (offset + 8 <= buffer.byteLength) {
    const id = view.getUint32(offset, false);
    const size = view.getUint32(offset + 4, true);
    if (id === 0x666d7420 /* "fmt " */) {
      format = view.getUint16(offset + 8, true);
      channels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
    } else if (id === 0x64617461 /* "data" */) {
      dataStart = offset + 8;
      dataLength = Math.min(size, buffer.byteLength - dataStart);
    }
    offset += 8 + size + (size % 2); // chunks are word-aligned
    if (size === 0) break; // guard against corrupt headers
  }

  if (dataStart < 0 || channels === undefined || sampleRate === undefined || bitsPerSample === undefined) {
    throw new AudioDecodeError("WAV file is missing required chunks.");
  }

  const bytesPerSample = bitsPerSample >> 3;
  const frames = Math.floor(dataLength / (bytesPerSample * channels));
  const samples = new Int16Array(frames);

  if (format === 1 && bitsPerSample === 16) {
    // Straight copy for 16-bit PCM; downmix stereo by averaging channels.
    for (let frame = 0; frame < frames; frame += 1) {
      let sum = 0;
      for (let channel = 0; channel < channels; channel += 1) {
        sum += view.getInt16(dataStart + (frame * channels + channel) * 2, true);
      }
      samples[frame] = Math.max(-32768, Math.min(32767, Math.round(sum / channels)));
    }
  } else if (format === 3 && bitsPerSample === 32) {
    // 32-bit IEEE float → clamp to int16.
    for (let frame = 0; frame < frames; frame += 1) {
      let sum = 0;
      for (let channel = 0; channel < channels; channel += 1) {
        sum += view.getFloat32(dataStart + (frame * channels + channel) * 4, true);
      }
      samples[frame] = Math.max(-32768, Math.min(32767, Math.round((sum / channels) * 32767)));
    }
  } else if (format === 1 && bitsPerSample === 8) {
    // 8-bit PCM is unsigned with a 128 bias.
    for (let frame = 0; frame < frames; frame += 1) {
      let sum = 0;
      for (let channel = 0; channel < channels; channel += 1) {
        sum += view.getUint8(dataStart + frame * channels + channel) - 128;
      }
      samples[frame] = Math.max(-32768, Math.min(32767, Math.round((sum / channels) * 256)));
    }
  } else {
    throw new AudioDecodeError(`Unsupported WAV format (format=${format}, bits=${bitsPerSample}).`);
  }

  return { samples, sampleRate };
}

/**
 * Decode an audio container (WAV/MP3/MP4/WebM/Ogg) to 16-bit mono PCM at its
 * native sample rate using the browser's audio decoder. Used server-side in
 * Node the browser decoders are unavailable — but on the Vercel/Node runtime
 * this relies on OfflineAudioContext existing, so callers must guard. Returns
 * the samples base64-encoded, ready for the audio/l16 interaction input.
 */
export async function decodeToMonoPcm16Base64(options: {
  arrayBuffer: ArrayBuffer;
  containerMime: string;
}): Promise<{ data: string; sampleRate: number }> {
  const { arrayBuffer, containerMime } = options;

  // Fast path: WAV files are parsed directly (no decoder needed).
  const isWav = normalizeAudioMimeType(containerMime) === "audio/wav";
  if (isWav) {
    const { samples, sampleRate } = extractWavPcm(arrayBuffer);
    // Copy through Buffer to base64 (also works when the DataView is not byte-aligned).
    const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
    return { data: Buffer.from(bytes).toString("base64"), sampleRate };
  }

  // Compressed containers: stream through the platform audio decoder.
  const AudioCtor = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor || typeof OfflineAudioContext === "undefined") {
    throw new AudioDecodeError("Audio decoding is not available in this runtime.");
  }

  const context = new AudioCtor();
  try {
    const decoded = await context.decodeAudioData(arrayBuffer.slice(0));
    await context.close().catch(() => undefined);
    const channelData = decoded.getChannelData(0);
    const samples = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i += 1) {
      samples[i] = Math.max(-32768, Math.min(32767, Math.round(channelData[i] * 32767)));
    }
    return {
      data: Buffer.from(samples.buffer).toString("base64"),
      sampleRate: decoded.sampleRate
    };
  } catch (error) {
    await context.close().catch(() => undefined);
    throw new AudioDecodeError(error instanceof Error ? `Could not decode the recording: ${error.message}` : "Could not decode the recording.");
  }
}

type TranscribeResult = { text: string };

/**
 * Transcribe an audio clip with the Gemini 3.5 Transcribe model via the
 * Interactions API.
 *
 * `audio` must be raw 16-bit little-endian mono PCM samples base64-encoded
 * (see decodeToMonoPcm16Base64): the endpoint rejects inline container data,
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
