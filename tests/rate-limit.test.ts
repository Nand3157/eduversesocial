import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { checkRateLimit as CheckRateLimit, rateLimiterSize as RateLimiterSize } from "@/lib/rate-limit";

let checkRateLimit: typeof CheckRateLimit;
let rateLimiterSize: typeof RateLimiterSize;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  vi.resetModules();
  ({ checkRateLimit, rateLimiterSize } = await import("@/lib/rate-limit"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("allows requests up to the limit and blocks the rest", () => {
    for (let i = 0; i < 3; i++) expect(checkRateLimit("allow", 3, 60_000).allowed).toBe(true);
    expect(checkRateLimit("allow", 3, 60_000).allowed).toBe(false);
  });

  it("resets the window after it elapses", () => {
    expect(checkRateLimit("reset", 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit("reset", 1, 60_000).allowed).toBe(false);
    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit("reset", 1, 60_000).allowed).toBe(true);
  });

  it("sweeps expired entries so the map stays bounded", () => {
    checkRateLimit("alpha", 1, 60_000);
    checkRateLimit("beta", 1, 60_000);
    expect(rateLimiterSize()).toBe(2);
    vi.advanceTimersByTime(60_001);
    checkRateLimit("gamma", 1, 60_000); // triggers the periodic sweep
    expect(rateLimiterSize()).toBe(1);
  });
});
