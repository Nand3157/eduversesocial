"use client";

import { RefreshCw } from "lucide-react";
import { useAnalytics } from "@/components/dashboard/analytics-context";

/**
 * Shows server-side Meta permission/API errors and failed analytics loads as
 * errors instead of making them look like an empty workspace.
 */
export function AnalyticsErrorBanner() {
  const { data, error, loading, refresh } = useAnalytics();
  const message = data?.error ?? (error ? "Analytics failed to load. Retry the request." : null);
  if (!message || loading) return null;
  const needsReconnect = /permission|authorized|scope|reconnect/i.test(message);
  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger"
    >
      <span>{message}</span>
      <div className="flex gap-2">
        {needsReconnect && <button type="button" onClick={() => window.dispatchEvent(new Event("eduverse:open-meta-connect"))} className="inline-flex min-h-[44px] touch-manipulation items-center gap-1.5 rounded-full border border-danger/40 px-4 font-semibold transition hover:bg-danger/10 focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:outline-none">Reconnect Meta</button>}
        <button
          type="button"
          onClick={refresh}
          className="inline-flex min-h-[44px] touch-manipulation items-center gap-1.5 rounded-full border border-danger/40 px-4 font-semibold transition hover:bg-danger/10 focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:outline-none"
        >
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    </div>
  );
}
