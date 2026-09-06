import { describe, expect, it } from "vitest";
import {
  computeBestTimes,
  emptyBestTimes,
  nextOccurrence,
  normalizeContentType,
  normalizePlatform,
  resolveTimezone
} from "@/lib/best-time";
import type { TimedPost } from "@/lib/best-time";

function postAt(timestamp: string, engagement: number, extra: Partial<TimedPost> = {}): TimedPost {
  return { timestamp, platform: "instagram", engagement, ...extra };
}

describe("best-time predictions", () => {
  it("returns empty with a reason when history is insufficient", () => {
    const result = computeBestTimes([], { timezone: "UTC" });
    expect(result.windows).toEqual([]);
    expect(result.sampleSize).toBe(0);
    expect(result.reason).toMatch(/No timed posts/);
    expect(result.confidence).toBe("low");
  });

  it("requires at least 5 timed posts by default", () => {
    const posts = [
      postAt("2026-08-04T13:00:00Z", 100),
      postAt("2026-08-05T13:00:00Z", 120),
      postAt("2026-08-06T13:00:00Z", 110)
    ];
    const result = computeBestTimes(posts, { timezone: "UTC" });
    expect(result.windows).toEqual([]);
    expect(result.reason).toMatch(/Only 3 timed posts/);
  });

  it("buckets by local day+hour in the requested timezone", () => {
    // 6 posts Wed 13:00Z (high) vs 2 posts Mon 09:00Z (low).
    const posts: TimedPost[] = [
      ...["2026-08-05T13:00:00Z", "2026-08-12T13:10:00Z", "2026-08-19T13:20:00Z", "2026-07-22T13:30:00Z", "2026-07-29T13:40:00Z", "2026-08-26T13:05:00Z"].map((timestamp) =>
        postAt(timestamp, 400, { likes: 380, comments: 20 })
      ),
      ...["2026-08-03T09:00:00Z", "2026-08-10T09:00:00Z"].map((timestamp) => postAt(timestamp, 50))
    ];
    const utc = computeBestTimes(posts, { timezone: "UTC", topN: 3 });
    expect(utc.sampleSize).toBe(8);
    expect(utc.windows.length).toBeGreaterThan(0);
    // Wednesday (3) at 13:00 UTC should win on average engagement.
    expect(utc.windows[0]?.dayOfWeek).toBe(3);
    expect(utc.windows[0]?.hour).toBe(13);
    expect(utc.windows[0]?.score).toBe(100);

    // Same instants viewed from New York (UTC-4 in August) shift the hour.
    const ny = computeBestTimes(posts, { timezone: "America/New_York", topN: 3 });
    expect(ny.timezone).toBe("America/New_York");
    expect(ny.windows[0]?.hour).toBe(9);
    expect(ny.windows[0]?.dayOfWeek).toBe(3);
  });

  it("splits windows by platform and content type", () => {
    const posts: TimedPost[] = [
      ...["2026-08-05T13:00:00Z", "2026-08-12T13:00:00Z", "2026-08-19T13:00:00Z"].map((timestamp) =>
        postAt(timestamp, 500, { platform: "instagram", mediaType: "CAROUSEL" })
      ),
      ...["2026-08-06T18:00:00Z", "2026-08-13T18:00:00Z", "2026-08-20T18:00:00Z"].map((timestamp) =>
        postAt(timestamp, 300, { platform: "facebook", mediaType: "TEXT" })
      )
    ];
    const result = computeBestTimes(posts, { timezone: "UTC", topN: 3 });
    expect(result.byPlatform.instagram?.length).toBeGreaterThan(0);
    expect(result.byPlatform.facebook?.length).toBeGreaterThan(0);
    expect(result.byContentType.CAROUSEL?.length).toBeGreaterThan(0);
    expect(result.byContentType.TEXT?.length).toBeGreaterThan(0);

    const filtered = computeBestTimes(posts, { timezone: "UTC", platform: "facebook" });
    expect(filtered.sampleSize).toBe(3);
    expect(filtered.windows).toEqual([]);
  });

  it("tracks per-account peaks", () => {
    const posts: TimedPost[] = [
      ...["2026-08-05T13:00:00Z", "2026-08-12T13:00:00Z", "2026-08-19T13:00:00Z"].map((timestamp) =>
        postAt(timestamp, 400, { accountId: "a1", accountLabel: "@a1" })
      ),
      ...["2026-08-06T18:00:00Z", "2026-08-13T18:00:00Z"].map((timestamp) =>
        postAt(timestamp, 200, { accountId: "a2", accountLabel: "@a2" })
      )
    ];
    const result = computeBestTimes(posts, { timezone: "UTC" });
    // a2 has exactly 2 posts so it qualifies; a1 has 3.
    expect(result.byAccount.map((entry) => entry.accountId).sort()).toEqual(["a1", "a2"]);
  });

  it("computes a future next occurrence matching the window", () => {
    const from = new Date("2026-08-20T10:00:00Z"); // Thursday
    const next = nextOccurrence(3, 13, "UTC", from); // next Wednesday 13:00 UTC
    expect(next.getTime()).toBeGreaterThan(from.getTime());
    expect(next.getUTCDay()).toBe(3);
    expect(next.getUTCHours()).toBe(13);
  });

  it("normalizes platforms and content types", () => {
    expect(normalizePlatform("Instagram Business")).toBe("instagram");
    expect(normalizePlatform("Facebook Pages")).toBe("facebook");
    expect(normalizePlatform("threads")).toBe("threads");
    expect(normalizePlatform("unknown")).toBeNull();
    expect(normalizeContentType("CAROUSEL_ALBUM")).toBe("CAROUSEL");
    expect(normalizeContentType("REELS")).toBe("VIDEO");
    expect(normalizeContentType(undefined)).toBe("TEXT");
  });

  it("falls back to UTC for invalid timezones", () => {
    expect(resolveTimezone("Not/AZone")).toBe("UTC");
    expect(resolveTimezone("Asia/Kolkata")).toBe("Asia/Kolkata");
  });

  it("emptyBestTimes carries the timezone and reason", () => {
    const empty = emptyBestTimes("Asia/Kolkata", "custom reason");
    expect(empty.timezone).toBe("Asia/Kolkata");
    expect(empty.reason).toBe("custom reason");
  });
});
