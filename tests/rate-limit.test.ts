import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { checkRateLimit as CheckRateLimit, rateLimiterSize as RateLimiterSize } from "@/lib/rate-limit";

let checkRateLimit: typeof CheckRateLimit;
let rateLimiterSize: typeof RateLimiterSize;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  vi.resetModules();
  vi.unstubAllEnvs();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  ({ checkRateLimit, rateLimiterSize } = await import("@/lib/rate-limit"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("allows requests up to the limit and blocks the rest", async () => {
    for (let i = 0; i < 3; i++) expect((await checkRateLimit("allow", 3, 60_000)).allowed).toBe(true);
    expect((await checkRateLimit("allow", 3, 60_000)).allowed).toBe(false);
  });

  it("resets the window after it elapses", async () => {
    expect((await checkRateLimit("reset", 1, 60_000)).allowed).toBe(true);
    expect((await checkRateLimit("reset", 1, 60_000)).allowed).toBe(false);
    vi.advanceTimersByTime(60_001);
    expect((await checkRateLimit("reset", 1, 60_000)).allowed).toBe(true);
  });

  it("sweeps expired entries so the map stays bounded", async () => {
    await checkRateLimit("alpha", 1, 60_000);
    await checkRateLimit("beta", 1, 60_000);
    expect(rateLimiterSize()).toBe(2);
    vi.advanceTimersByTime(60_001);
    await checkRateLimit("gamma", 1, 60_000); // triggers the periodic sweep
    expect(rateLimiterSize()).toBe(1);
  });

  it("falls back to memory when Redis errors mid-window", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    vi.resetModules();
    ({ checkRateLimit } = await import("@/lib/rate-limit"));
    // Redis INCR fails -> limiter degrades to the in-memory map instead of throwing.
    expect((await checkRateLimit("fallback", 1, 60_000)).allowed).toBe(true);
    expect((await checkRateLimit("fallback", 1, 60_000)).allowed).toBe(false);
  });
});
