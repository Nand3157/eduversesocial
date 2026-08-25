"use client";

import dynamic from "next/dynamic";

function ChartFallback({ height }: { height: number }) {
  return (
    <div role="status" aria-live="polite" style={{ height }} className="animate-pulse rounded-2xl border border-borderSoft bg-surface/50">
      <span className="sr-only">Loading chart…</span>
    </div>
  );
}

const tallFallback = () => <ChartFallback height={280} />;
const fallback = () => <ChartFallback height={220} />;

export const EngagementChartCard = dynamic(() => import("@/components/chart-card").then((module) => module.EngagementChartCard), {
  ssr: false,
  loading: tallFallback
});
export const PostingFrequencyCard = dynamic(() => import("@/components/chart-card").then((module) => module.PostingFrequencyCard), {
  ssr: false,
  loading: fallback
});
export const AudienceGrowthCard = dynamic(() => import("@/components/chart-card").then((module) => module.AudienceGrowthCard), {
  ssr: false,
  loading: fallback
});
export const SentimentTrendCard = dynamic(() => import("@/components/chart-card").then((module) => module.SentimentTrendCard), {
  ssr: false,
  loading: fallback
});
export const PlatformBreakdownCard = dynamic(() => import("@/components/chart-card").then((module) => module.PlatformBreakdownCard), {
  ssr: false,
  loading: fallback
});
