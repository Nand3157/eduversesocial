"use client";

import dynamic from "next/dynamic";

const fallback = <div className="h-[220px] animate-pulse rounded-2xl border border-borderSoft bg-surface/50" />;

export const EngagementChartCard = dynamic(() => import("@/components/chart-card").then((module) => module.EngagementChartCard), {
  ssr: false,
  loading: () => fallback
});
export const PostingFrequencyCard = dynamic(() => import("@/components/chart-card").then((module) => module.PostingFrequencyCard), {
  ssr: false,
  loading: () => fallback
});
export const AudienceGrowthCard = dynamic(() => import("@/components/chart-card").then((module) => module.AudienceGrowthCard), {
  ssr: false,
  loading: () => fallback
});
export const SentimentTrendCard = dynamic(() => import("@/components/chart-card").then((module) => module.SentimentTrendCard), {
  ssr: false,
  loading: () => fallback
});
export const PlatformBreakdownCard = dynamic(() => import("@/components/chart-card").then((module) => module.PlatformBreakdownCard), {
  ssr: false,
  loading: () => fallback
});
