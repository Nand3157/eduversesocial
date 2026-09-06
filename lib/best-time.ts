/**
 * Best-time-to-post predictions.
 *
 * Pure, dependency-free functions that turn per-post engagement history into
 * timezone-aware posting windows. No network, no Meta calls — the caller
 * supplies timed posts (timestamp + engagement + platform + content type) and
 * we bucket them by local day-of-week + hour in the requested IANA timezone.
 *
 * Product rules honoured here:
 * - Live truth only: fewer than `minPosts` timed posts yields zero windows
 *   with an explicit reason instead of invented defaults.
 * - Provenance: every window carries postCount / avgEngagement so the UI can
 *   show "why this?" without fabricating claims.
 */

export type BestTimePlatform = "instagram" | "facebook" | "threads";

export type BestTimeContentType = "IMAGE" | "VIDEO" | "CAROUSEL" | "TEXT";

export interface TimedPost {
  /** ISO-8601 timestamp of when the post was published (UTC from Meta). */
  timestamp: string;
  /** Raw platform label — normalized internally ("Instagram Business" works). */
  platform: string;
  /** Total engagement for the post (likes + comments + shares/views weight). */
  engagement: number;
  likes?: number;
  comments?: number;
  shares?: number;
  /** Raw media type from Meta (IMAGE, VIDEO, CAROUSEL_ALBUM, TEXT, …). */
  mediaType?: string;
  /** Owning account id (social_accounts.id or external_id). */
  accountId?: string;
  /** Human label for per-account breakdowns. */
  accountLabel?: string;
}

export interface PostingWindow {
  /** 0 (Sunday) – 6 (Saturday), matching JS Date conventions. */
  dayOfWeek: number;
  dayLabel: string;
  /** Hour of day in the requested timezone, 0–23 (start of hour). */
  hour: number;
  hourLabel: string;
  /** Human window, e.g. "Wed 6–7 PM". */
  label: string;
  /** 0–100, normalized smoothed avg engagement across buckets. */
  score: number;
  avgEngagement: number;
  postCount: number;
  totalEngagement: number;
  /** Next occurrence of this window as a UTC ISO string (from `from`). */
  nextOccurrenceUtc?: string;
}

export type BestTimeConfidence = "low" | "medium" | "high";

export interface BestTimeResult {
  timezone: string;
  sampleSize: number;
  /** Top windows overall (sorted by score desc). Empty when insufficient data. */
  windows: PostingWindow[];
  /** Top windows per normalized platform. */
  byPlatform: Partial<Record<BestTimePlatform, PostingWindow[]>>;
  /** Top windows per normalized content type. */
  byContentType: Partial<Record<BestTimeContentType, PostingWindow[]>>;
  /** Top window per account id (at most 1 each, sorted by score). */
  byAccount: Array<{ accountId: string; accountLabel: string; platform: string; window: PostingWindow }>;
  confidence: BestTimeConfidence;
  /** Set when windows is empty — render this instead of inventing times. */
  reason?: string;
}

export interface ComputeBestTimesOptions {
  timezone?: string;
  /** How many top windows to return per grouping. */
  topN?: number;
  /** Minimum timed posts before any window is emitted. */
  minPosts?: number;
  /** Optional pre-filters (used by the UI platform/content-type tabs). */
  platform?: string;
  contentType?: string;
  accountId?: string;
  /** Reference instant for nextOccurrenceUtc computation. */
  from?: Date;
}

export const MIN_POSTS_FOR_PREDICTION = 5;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function normalizePlatform(raw: string): BestTimePlatform | null {
  const value = raw.trim().toLowerCase();
  if (value.startsWith("instagram")) return "instagram";
  if (value.startsWith("facebook")) return "facebook";
  if (value === "ig" || value === "fb") return value === "ig" ? "instagram" : "facebook";
  if (value === "threads" || value === "thread") return "threads";
  if (value === "instagram" || value === "facebook") return value;
  return null;
}

export function normalizeContentType(raw?: string): BestTimeContentType {
  const value = (raw ?? "").trim().toUpperCase();
  if (value === "CAROUSEL" || value === "CAROUSEL_ALBUM" || value === "ALBUM") return "CAROUSEL";
  if (value === "VIDEO" || value === "REELS" || value === "REEL" || value === "CLIP") return "VIDEO";
  if (value === "IMAGE" || value === "PHOTO" || value === "PICTURE" || value === "CAROUSEL_ITEM") return "IMAGE";
  return "TEXT";
}

export function resolveTimezone(requested?: string): string {
  const candidate = (requested ?? "").trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    return "UTC";
  }
}

function zonedDayHour(date: Date, timeZone: string): { dayOfWeek: number; hour: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "numeric",
      hour12: false,
      timeZoneName: "short"
    }).formatToParts(date);
    const weekdayPart = parts.find((p) => p.type === "weekday")?.value ?? "";
    const hourPart = parts.find((p) => p.type === "hour")?.value ?? "";
    const dayIndex = DAY_LABELS.findIndex((d) => d.toLowerCase() === weekdayPart.slice(0, 3).toLowerCase());
    let hour = Number(hourPart);
    if (!Number.isFinite(hour)) return null;
    // Some ICU builds return "24" for midnight with hour12:false.
    if (hour === 24) hour = 0;
    if (dayIndex < 0 || hour < 0 || hour > 23) return null;
    return { dayOfWeek: dayIndex, hour };
  } catch {
    return null;
  }
}

function hourLabel(hour: number): string {
  const suffix = hour < 12 ? "AM" : "PM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve} ${suffix}`;
}

export function formatWindowLabel(dayOfWeek: number, hour: number): string {
  const end = (hour + 1) % 24;
  const sameMeridiem = Math.floor(hour / 12) === Math.floor(end / 12) || end === 0;
  if (sameMeridiem && end !== 0) {
    const twelve = hour % 12 === 0 ? 12 : hour % 12;
    const twelveEnd = end % 12 === 0 ? 12 : end % 12;
    const suffix = hour < 12 ? "AM" : "PM";
    return `${DAY_LABELS[dayOfWeek]} ${twelve}–${twelveEnd} ${suffix}`;
  }
  return `${DAY_LABELS[dayOfWeek]} ${hourLabel(hour)}–${hourLabel(end)}`;
}

/**
 * Next UTC instant matching a (dayOfWeek, hour) window in `timezone`,
 * strictly after `from`. Scans forward hour-by-hour (bounded to 8 days).
 */
export function nextOccurrence(dayOfWeek: number, hour: number, timezone: string, from: Date = new Date()): Date {
  const tz = resolveTimezone(timezone);
  // Start at the next hour boundary after `from` to avoid returning "now".
  let candidate = new Date(from.getTime() + 60_000);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(0, 0, 0);
  // If we rounded down to <= from, step forward one hour.
  if (candidate.getTime() <= from.getTime()) candidate = new Date(candidate.getTime() + 3_600_000);
  for (let step = 0; step < 8 * 24 + 1; step++) {
    const zoned = zonedDayHour(candidate, tz);
    if (zoned && zoned.dayOfWeek === dayOfWeek && zoned.hour === hour) return candidate;
    candidate = new Date(candidate.getTime() + 3_600_000);
  }
  return candidate;
}

function confidenceFor(sampleSize: number): BestTimeConfidence {
  if (sampleSize >= 12) return "high";
  if (sampleSize >= 8) return "medium";
  return "low";
}

type Bucket = { dayOfWeek: number; hour: number; count: number; total: number };

function bucketize(posts: TimedPost[], timezone: string): { buckets: Bucket[]; globalAvg: number } {
  const map = new Map<string, Bucket>();
  let total = 0;
  let count = 0;
  for (const post of posts) {
    const at = new Date(post.timestamp);
    if (Number.isNaN(at.getTime())) continue;
    const zoned = zonedDayHour(at, timezone);
    if (!zoned) continue;
    const key = `${zoned.dayOfWeek}-${zoned.hour}`;
    const bucket = map.get(key) ?? { dayOfWeek: zoned.dayOfWeek, hour: zoned.hour, count: 0, total: 0 };
    const engagement = Number.isFinite(post.engagement) && post.engagement >= 0 ? post.engagement : 0;
    bucket.count += 1;
    bucket.total += engagement;
    map.set(key, bucket);
    total += engagement;
    count += 1;
  }
  return { buckets: [...map.values()], globalAvg: count ? total / count : 0 };
}

function toWindows(buckets: Bucket[], globalAvg: number, timezone: string, topN: number, from: Date): PostingWindow[] {
  if (!buckets.length) return [];
  // Bayesian smoothing (m=2 pseudo-posts at the global mean) so a lone
  // single-post spike cannot permanently outrank a consistently good slot.
  const smoothed = buckets.map((b) => ({
    bucket: b,
    smoothedAvg: (b.total + globalAvg * 2) / (b.count + 2)
  }));
  const max = Math.max(...smoothed.map((s) => s.smoothedAvg), 0);
  return smoothed
    .map(({ bucket, smoothedAvg }): PostingWindow => {
      const next = nextOccurrence(bucket.dayOfWeek, bucket.hour, timezone, from);
      return {
        dayOfWeek: bucket.dayOfWeek,
        dayLabel: DAY_LABELS[bucket.dayOfWeek],
        hour: bucket.hour,
        hourLabel: hourLabel(bucket.hour),
        label: formatWindowLabel(bucket.dayOfWeek, bucket.hour),
        score: max > 0 ? Math.round((smoothedAvg / max) * 100) : 0,
        avgEngagement: Math.round((bucket.total / Math.max(1, bucket.count)) * 10) / 10,
        postCount: bucket.count,
        totalEngagement: Math.round(bucket.total),
        nextOccurrenceUtc: next.toISOString()
      };
    })
    .sort((a, b) => b.score - a.score || b.postCount - a.postCount || a.dayOfWeek - b.dayOfWeek || a.hour - b.hour)
    .slice(0, Math.max(1, topN));
}

function applyFilters(posts: TimedPost[], options: ComputeBestTimesOptions): TimedPost[] {
  return posts.filter((post) => {
    if (options.platform) {
      const wanted = normalizePlatform(options.platform);
      const actual = normalizePlatform(post.platform);
      if (!wanted || actual !== wanted) return false;
    }
    if (options.contentType) {
      const wanted = options.contentType.trim().toUpperCase();
      if (normalizeContentType(post.mediaType) !== wanted) return false;
    }
    if (options.accountId && post.accountId !== options.accountId) return false;
    return true;
  });
}

export function emptyBestTimes(timezone = "UTC", reason = "Not enough posting history yet."): BestTimeResult {
  const tz = resolveTimezone(timezone);
  return { timezone: tz, sampleSize: 0, windows: [], byPlatform: {}, byContentType: {}, byAccount: [], confidence: "low", reason };
}

export function computeBestTimes(input: TimedPost[], options: ComputeBestTimesOptions = {}): BestTimeResult {
  const timezone = resolveTimezone(options.timezone);
  const topN = Math.min(Math.max(options.topN ?? 5, 1), 10);
  const minPosts = options.minPosts ?? MIN_POSTS_FOR_PREDICTION;
  const from = options.from ?? new Date();

  // Drop posts with unusable timestamps up front so sampleSize reflects real signal.
  const usable = input.filter((p) => !Number.isNaN(new Date(p.timestamp).getTime()));
  const filtered = applyFilters(usable, options);
  const sampleSize = filtered.length;

  if (sampleSize < minPosts) {
    return {
      timezone,
      sampleSize,
      windows: [],
      byPlatform: {},
      byContentType: {},
      byAccount: [],
      confidence: "low",
      reason:
        sampleSize === 0
          ? "No timed posts with engagement history were returned for these filters."
          : `Only ${sampleSize} timed post${sampleSize === 1 ? "" : "s"} available — connect more history (at least ${minPosts}) for a reliable window.`
    };
  }

  const { buckets, globalAvg } = bucketize(filtered, timezone);
  const windows = toWindows(buckets, globalAvg, timezone, topN, from);

  // Per-dimension breakdowns reuse the same bucketizer on slices. Slices below
  // minPosts are omitted so the UI never shows a "confident" single-post slot.
  const byPlatform: BestTimeResult["byPlatform"] = {};
  (["instagram", "facebook", "threads"] as const).forEach((platform) => {
    const slice = filtered.filter((p) => normalizePlatform(p.platform) === platform);
    if (slice.length >= Math.min(minPosts, 3)) {
      const { buckets: b, globalAvg: avg } = bucketize(slice, timezone);
      const wins = toWindows(b, avg, timezone, Math.min(topN, 3), from);
      if (wins.length) byPlatform[platform] = wins;
    }
  });

  const byContentType: BestTimeResult["byContentType"] = {};
  (["IMAGE", "VIDEO", "CAROUSEL", "TEXT"] as const).forEach((contentType) => {
    const slice = filtered.filter((p) => normalizeContentType(p.mediaType) === contentType);
    if (slice.length >= Math.min(minPosts, 3)) {
      const { buckets: b, globalAvg: avg } = bucketize(slice, timezone);
      const wins = toWindows(b, avg, timezone, Math.min(topN, 3), from);
      if (wins.length) byContentType[contentType] = wins;
    }
  });

  const byAccount: BestTimeResult["byAccount"] = [];
  const accountIds = [...new Set(filtered.map((p) => p.accountId).filter((id): id is string => Boolean(id)))];
  for (const accountId of accountIds) {
    const slice = filtered.filter((p) => p.accountId === accountId);
    if (slice.length < 2) continue;
    const { buckets: b, globalAvg: avg } = bucketize(slice, timezone);
    const wins = toWindows(b, avg, timezone, 1, from);
    if (!wins[0]) continue;
    byAccount.push({
      accountId,
      accountLabel: slice[0]?.accountLabel ?? slice[0]?.platform ?? accountId,
      platform: slice[0]?.platform ?? "unknown",
      window: wins[0]
    });
  }
  byAccount.sort((a, b) => b.window.score - a.window.score);

  return { timezone, sampleSize, windows, byPlatform, byContentType, byAccount, confidence: confidenceFor(sampleSize) };
}

/** One-line provenance string for memory timelines and chat grounding. */
export function describeBestWindow(window: PostingWindow, timezone: string, sampleSize: number): string {
  return `${window.label} ${timezone} — avg ${window.avgEngagement} engagement across ${window.postCount} post${window.postCount === 1 ? "" : "s"} (sample ${sampleSize}, score ${window.score}/100).`;
}
