"use client";

import { RefreshCw } from "lucide-react";
import { useAnalytics } from "@/components/dashboard/analytics-context";

/**
 * Surfaces the analytics context's `error` (logic defect #3): a failed load
 * must never be mistaken for an empty workspace. Renders only while a load
 * actually failed, so the true empty state ("connect Meta", placeholder
 * cards) stays visually distinct from the error state — and offers a retry
 * through the context's `refresh()`.
 */
export function AnalyticsErrorBanner() {
  const { error, loading, refresh } = useAnalytics();
  if (!error || loading) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger"
    >
      <span>Analytics failed to load — this is an error, not an empty workspace.</span>
      <button
        type="button"
        onClick={refresh}
        className="inline-flex min-h-[44px] touch-manipulation items-center gap-1.5 rounded-full border border-danger/40 px-4 font-semibold transition hover:bg-danger/10 focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:outline-none"
      >
        <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  );
}
