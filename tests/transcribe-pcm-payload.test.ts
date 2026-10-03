/**
 * The transcription endpoint only accepts raw 16-bit little-endian mono PCM
 * (`audio/l16`) — every container format is rejected by the provider.
 *
 * Two bugs shipped against that contract:
 *   1. the route parsed `data:audio/<mime>;base64,<payload>`, but MediaRecorder
 *      is constructed with `audio/webm;codecs=opus`, so the data URL is
 *      `data:audio/webm;codecs=opus;base64,...`. The regex required `;base64,`
 *      immediately after the MIME type and rejected the whole payload with
 *      "Unsupported audio payload."
 *   2. the decode step lived on the server and needed `AudioContext`, which
 *      Node does not have — so even a well-formed container could never be
 *      turned into PCM.
 *
 * The client now decodes (lib/audio/pcm-clip.ts) and posts bare base64 plus the
 * sample rate. These tests pin that contract so the data-URL shape cannot creep
 * back in.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transcribed: Array<{ audioBase64: string; sampleRate: number }> = [];
let transcribeResult = "transcribed text";
let user: { id: string; email_confirmed_at: string } | null = { id: "user_1", email_confirmed_at: "2026-01-01" };

function fakeSupabase() {
  return {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: () => new Proxy({}, { get: () => () => undefined })
  };
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fakeSupabase() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: async () => ({ allowed: true }) }));
vi.mock("@/lib/ai/voice-input", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/voice-input")>()),
  transcribeAudio: async (options: { audioBase64: string; sampleRate: number }) => {
    transcribed.push(options);
    return { text: transcribeResult };
  }
}));

const { POST } = await import("@/app/api/ai/transcribe/route");

function post(body: unknown): Promise<Response> {
  return POST(new Request("https://eduverse.test/api/ai/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }));
}

/** 16 kHz mono PCM for ~0.5 s, base64-encoded the way the client encodes it. */
const PCM_BASE64 = Buffer.alloc(16_000 * 2, "\x01").toString("base64");

beforeEach(() => {
  transcribed.length = 0;
  transcribeResult = "transcribed text";
  user = { id: "user_1", email_confirmed_at: "2026-01-01" };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/ai/transcribe", () => {
  it("accepts bare base64 PCM and forwards the client's sample rate", async () => {
    const response = await post({ audio: PCM_BASE64, sampleRate: 16_000, languageCode: "auto" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ text: "transcribed text" });
    expect(transcribed).toEqual([{ audioBase64: PCM_BASE64, sampleRate: 16_000 }]);
  });

  it("rejects the old data:audio/... shape instead of forwarding garbage", async () => {
    // What MediaRecorder + readAsDataURL used to produce, codecs included.
    const dataUrl = `data:audio/webm;codecs=opus;base64,${PCM_BASE64}`;
    const response = await post({ audio: dataUrl, sampleRate: 16_000 });

    expect(response.status).toBe(400);
    expect(transcribed).toHaveLength(0);
  });

  it("requires a sample rate, so the provider is never asked for implicit audio metadata", async () => {
    const response = await post({ audio: PCM_BASE64 });
    expect(response.status).toBe(400);
    expect(transcribed).toHaveLength(0);
  });

  it("rejects a sample rate the l16 decoder does not support", async () => {
    expect((await post({ audio: PCM_BASE64, sampleRate: 1_000 })).status).toBe(400);
    expect((await post({ audio: PCM_BASE64, sampleRate: 192_000 })).status).toBe(400);
    expect(transcribed).toHaveLength(0);
  });

  it("caps the payload so one request cannot burn unbounded bandwidth", async () => {
    const response = await post({ audio: "A".repeat(3_000_001), sampleRate: 16_000 });
    expect(response.status).toBe(400);
    expect(transcribed).toHaveLength(0);
  });

  it("reports an empty transcript distinctly from a transport failure", async () => {
    transcribeResult = "";
    const response = await post({ audio: PCM_BASE64, sampleRate: 16_000 });
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toHaveProperty("error", expect.stringContaining("No speech"));
  });

  it("requires a verified account", async () => {
    user = { id: "user_1", email_confirmed_at: "" };
    const response = await post({ audio: PCM_BASE64, sampleRate: 16_000 });
    expect(response.status).toBe(403);
    expect(transcribed).toHaveLength(0);
  });
});
