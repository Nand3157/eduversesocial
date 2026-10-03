/**
 * Client-side recording decoder.
 *
 * The transcription API only accepts inline audio as raw 16-bit little-endian
 * PCM (`audio/l16`) — every container format (webm/opus, mp4/aac, ogg) is
 * rejected with "Request contains an invalid argument". Decoding therefore has
 * to happen in the browser, which already ships decoders for every format
 * MediaRecorder can produce. It cannot happen on the server: Node has no Web
 * Audio API, so an `AudioContext`-based decode there always throws.
 *
 * Output is downmixed to mono and decimated to 16 kHz, which is ample for
 * speech and keeps a 60 s clip at ~1.9 MB of PCM (~2.6 MB base64) — under the
 * request-body ceiling of the hosting platform.
 */

/** Speech-recognition rate. Gemini accepts 8-96 kHz; 16 kHz is the sweet spot. */
export const CLIP_SAMPLE_RATE = 16_000;

export type PcmClip = {
  /** Raw 16-bit little-endian mono PCM samples, base64-encoded (no data: prefix). */
  base64: string;
  /** Sample rate of `base64`, in Hz. */
  sampleRate: number;
};

export class ClipDecodeError extends Error {}

type AudioContextCtor = new () => AudioContext;

/**
 * Decode a recorded audio blob to base64 mono PCM ready for /api/ai/transcribe.
 * Browser-only: relies on `AudioContext.decodeAudioData`.
 */
export async function decodeClipToPcm(blob: Blob, targetSampleRate: number = CLIP_SAMPLE_RATE): Promise<PcmClip> {
  const Ctor =
    (window.AudioContext as AudioContextCtor | undefined) ??
    ((window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext);
  if (!Ctor) throw new ClipDecodeError("This browser cannot decode audio recordings.");

  const context = new Ctor();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(await blob.arrayBuffer());
  } catch {
    throw new ClipDecodeError("Could not read the recording. Try recording again.");
  } finally {
    await context.close().catch(() => undefined);
  }

  const sampleRate = decoded.sampleRate;
  const mono = mixToMono(decoded);
  const samples = sampleRate > targetSampleRate ? decimate(mono, sampleRate, targetSampleRate) : mono;
  const rate = sampleRate > targetSampleRate ? targetSampleRate : sampleRate;
  if (samples.length === 0) throw new ClipDecodeError("The recording was empty.");

  return { base64: encodeInt16(samples), sampleRate: rate };
}

/** Average every channel into one Float32Array. */
function mixToMono(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const mono = new Float32Array(length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) mono[i] += data[i];
  }
  const scale = 1 / buffer.numberOfChannels;
  for (let i = 0; i < length; i += 1) mono[i] *= scale;
  return mono;
}

/**
 * Box-average decimation: each output frame averages the input frames that fall
 * inside its window. Averaging (rather than point sampling) is what keeps the
 * high frequencies that decimation would otherwise alias down into the speech
 * band and garble the transcript.
 */
function decimate(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  const ratio = fromRate / toRate;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < output.length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.max(start + 1, Math.floor((i + 1) * ratio)));
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += input[j];
    output[i] = sum / (end - start);
  }
  return output;
}

/** Float samples in [-1, 1] → clamped int16 → base64 (chunked: btoa is stack-limited). */
function encodeInt16(samples: Float32Array): string {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const scaled = Math.round(samples[i] * 32767);
    pcm[i] = scaled > 32767 ? 32767 : scaled < -32768 ? -32768 : scaled;
  }
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = "";
  const CHUNK = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }
  return btoa(binary);
}
