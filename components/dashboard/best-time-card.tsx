"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalytics } from "@/components/dashboard/analytics-context";
import { computeBestTimes, resolveTimezone, type TimedPost } from "@/lib/best-time";
import { MetaPublisherModal } from "@/components/meta/meta-publisher-modal";
import type { AnalyticsSnapshot } from "@/lib/meta-analytics";

const TZ_STORAGE_KEY = "eduverse:besttime-tz";
const PLATFORM_STORAGE_KEY = "eduverse:besttime-platform";
const CONTENT_STORAGE_KEY = "eduverse:besttime-content";

const CURATED_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Africa/Lagos",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland"
];

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function expandCompact(value: string): number {
  const numeric = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric)) return 0;
  if (value.includes("M")) return numeric * 1_000_000;
  if (value.includes("K")) return numeric * 1_000;
  return numeric || 0;
}

/** Prefer live timing signals; fall back to timestamped recentPosts (old cache). */
function signalsFromSnapshot(snapshot: AnalyticsSnapshot | null): TimedPost[] {
  if (!snapshot) return [];
  if (snapshot.timingSignals?.length) return snapshot.timingSignals;
  return (snapshot.recentPosts ?? [])
    .filter((post) => Boolean(post.timestamp))
    .map((post) => ({
      timestamp: post.timestamp!,
      platform: post.platform,
      engagement: expandCompact(post.likes) + expandCompact(post.comments) + expandCompact(post.shares),
      likes: expandCompact(post.likes),
      comments: expandCompact(post.comments),
      shares: expandCompact(post.shares),
      mediaType: post.mediaType ?? "TEXT",
      accountLabel: post.accountLabel ?? post.platform
    }));
}

function formatNextOccurrence(iso: string | undefined, timeZone: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

function toPlatformParam(value: string): string | undefined {
  return value === "all" ? undefined : value;
}

export function BestTimeCard() {
  const { data, loading } = useAnalytics();
  const [timezone, setTimezone] = useState("UTC");
  const [platform, setPlatform] = useState("all");
  const [contentType, setContentType] = useState("all");
  const [hydrated, setHydrated] = useState(false);
  const [publisherOpen, setPublisherOpen] = useState(false);
  const [publisherScheduleIso, setPublisherScheduleIso] = useState<string | undefined>(undefined);

  // Hydrate persisted prefs after mount to avoid SSR/client mismatch.
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const browserTz = browserTimezone();
        const storedTz = localStorage.getItem(TZ_STORAGE_KEY);
        setTimezone(resolveTimezone(storedTz || browserTz));
        const storedPlatform = localStorage.getItem(PLATFORM_STORAGE_KEY);
        if (storedPlatform) setPlatform(storedPlatform);
        const storedContent = localStorage.getItem(CONTENT_STORAGE_KEY);
        if (storedContent) setContentType(storedContent);
      } catch {
        setTimezone(browserTimezone());
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(TZ_STORAGE_KEY, timezone);
      localStorage.setItem(PLATFORM_STORAGE_KEY, platform);
      localStorage.setItem(CONTENT_STORAGE_KEY, contentType);
    } catch {}
  }, [timezone, platform, contentType, hydrated]);

  const timezoneOptions = useMemo(() => {
    const browserTz = (() => {
      try {
        return browserTimezone();
      } catch {
        return "UTC";
      }
    })();
    const set = new Set([...CURATED_TIMEZONES, browserTz, timezone]);
    return [...set].filter(Boolean).sort();
  }, [timezone]);

  const signals = useMemo(() => signalsFromSnapshot(data), [data]);

  const result = useMemo(
    () =>
      computeBestTimes(signals, {
        timezone,
        topN: 3,
        platform: toPlatformParam(platform),
        contentType: contentType === "all" ? undefined : contentType
      }),
    [signals, timezone, platform, contentType]
  );

  const handleSchedule = (slot: { dayOfWeek: number; hour: number; label: string; nextOccurrenceUtc?: string }) => {
    const iso = slot.nextOccurrenceUtc;
    if (!iso) return;
    // Open this card's own publisher prefilled with the slot, and also notify
    // any already-open publisher (e.g. from the header) so both stay in sync.
    setPublisherScheduleIso(iso);
    setPublisherOpen(true);
    const detail: { iso: string; platform?: string; label: string; timezone: string } = {
      iso,
      label: slot.label,
      timezone
    };
    if (platform !== "all") detail.platform = platform;
    window.dispatchEvent(new CustomEvent("eduverse:besttime-schedule", { detail }));
  };

  const publisherPlatform =
    platform === "instagram" || platform === "facebook" || platform === "threads" ? platform : undefined;

  const confidenceVariant = result.confidence === "high" ? "success" : result.confidence === "medium" ? "primary" : "default";

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <CalendarClock className="h-4 w-4" />
            </span>
            <div>
              <CardTitle>Best times to post</CardTitle>
              <CardDescription>
                Posting windows from live per-post engagement — bucketed by day + hour in your timezone, split by account, platform, and format. Never invented.
              </CardDescription>
            </div>
          </div>
          {result.windows.length > 0 && <Badge variant={confidenceVariant}>{result.confidence} confidence · {result.sampleSize} posts</Badge>}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faintText">Timezone</span>
            <select
              aria-label="Posting window timezone"
              value={timezone}
              onChange={(e) => setTimezone(resolveTimezone(e.target.value))}
              className="h-9 w-full rounded-xl border border-borderSoft bg-surface px-2.5 text-xs text-ink outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faintText">Platform</span>
            <select
              aria-label="Filter by platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="h-9 w-full rounded-xl border border-borderSoft bg-surface px-2.5 text-xs text-ink outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <option value="all">All platforms</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="threads">Threads</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faintText">Format</span>
            <select
              aria-label="Filter by content format"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="h-9 w-full rounded-xl border border-borderSoft bg-surface px-2.5 text-xs text-ink outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <option value="all">All formats</option>
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video / Reels</option>
              <option value="CAROUSEL">Carousel</option>
              <option value="TEXT">Text</option>
            </select>
          </label>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div role="status" className="rounded-xl border border-dashed border-borderSoft bg-surface/50 p-6 text-center text-xs text-mutedText">
            Loading live posting windows…
          </div>
        ) : !data?.live ? (
          <div className="rounded-xl border border-dashed border-borderSoft bg-surface/50 p-6 text-xs leading-relaxed text-mutedText">
            Connect Meta to compute posting windows from your real engagement history. EduVerse will not guess times without live post timestamps.
          </div>
        ) : result.windows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-borderSoft bg-surface/50 p-6 text-xs leading-relaxed text-mutedText" role="status">
            {result.reason ?? "Not enough timed history yet."} Publish a few more posts (or wait for Meta to return timestamps), then refresh — windows appear once at least 5 timed posts are available
            {platform !== "all" || contentType !== "all" ? " for these filters. Try widening the platform/format filters." : "."}
          </div>
        ) : (
          <div aria-live="polite" className="space-y-3">
            {result.windows.map((window, index) => (
              <div key={`${window.dayOfWeek}-${window.hour}`} className="rounded-xl border border-borderSoft bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-background" aria-hidden="true">
                      {index + 1}
                    </span>
                    {window.label}
                    <span className="ml-2 text-xs font-normal text-mutedText">· {timezone}</span>
                  </p>
                  <Badge variant="primary">score {window.score}/100</Badge>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-borderSoft" role="img" aria-label={`Confidence score ${window.score} out of 100`}>
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${window.score}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums text-mutedText">
                  <span>
                    avg <strong className="text-ink">{window.avgEngagement}</strong> engagement
                  </span>
                  <span>
                    <strong className="text-ink">{window.postCount}</strong> posts in slot
                  </span>
                  <span>next: {formatNextOccurrence(window.nextOccurrenceUtc, timezone)}</span>
                </div>
                <div className="mt-3">
                  <Button size="sm" variant="secondary" onClick={() => handleSchedule(window)} aria-label={`Schedule a post for ${window.label} in ${timezone}`}>
                    <Send aria-hidden="true" className="h-3.5 w-3.5" />
                    Use this time
                  </Button>
                </div>
              </div>
            ))}
            {result.byAccount.length > 1 && (
              <div className="rounded-xl border border-borderSoft bg-surface-muted/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-faintText">Per-account peaks</p>
                <ul className="mt-2 space-y-1.5">
                  {result.byAccount.slice(0, 4).map((entry) => (
                    <li key={entry.accountId} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 flex-1 truncate text-mutedText">
                        <strong className="font-medium text-ink">{entry.accountLabel}</strong> · {entry.window.label}
                      </span>
                      <span className="tabular-nums text-faintText">score {entry.window.score}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-faintText">
              Buckets are smoothed (2 pseudo-posts at the global mean) so a single viral post can&apos;t permanently claim a slot. Switch timezone to re-bucket the same {result.sampleSize} timed posts
              without refetching.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    <MetaPublisherModal
      isOpen={publisherOpen}
      onClose={() => setPublisherOpen(false)}
      initialScheduleTime={publisherScheduleIso}
      initialPlatform={publisherPlatform}
      onSuccess={() => setPublisherOpen(false)}
    />
    </>
  );
}
