"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AnalyticsSnapshot } from "@/lib/meta-analytics";

type AnalyticsContextValue = { data: AnalyticsSnapshot | null; loading: boolean; error: boolean; refresh: () => void };
const AnalyticsContext = createContext<AnalyticsContextValue>({ data: null, loading: true, error: false, refresh: () => undefined });

/**
 * Server-first provider. The dashboard layout fetches the snapshot in a
 * Server Component and passes it as `initialData`, so the first paint already
 * has live analytics instead of skeleton → client fetch → API route → the
 * same server function. Explicit refreshes (and the
 * `eduverse:analytics-refresh` event) still revalidate through the API route.
 */
export function AnalyticsProvider({ children, initialData }: { children: React.ReactNode; initialData?: AnalyticsSnapshot | null }) {
  const [data, setData] = useState<AnalyticsSnapshot | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const seeded = initialData != null;

  useEffect(() => {
    // Seeded snapshots render immediately; skip the mount fetch and only
    // revalidate when the user (or an event) explicitly asks for fresh data.
    if (refreshKey === 0 && seeded) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) { setLoading(true); setError(false); } });
    // The server caches snapshots per day; manual refreshes bypass the cache.
    // The route reports failures with non-OK statuses (429/403/503) and
    // `success: false` bodies — both must surface as `error` (with a retry),
    // never as a silent null payload indistinguishable from an empty workspace.
    fetch(refreshKey > 0 ? "/api/meta/analytics?refresh=1" : "/api/meta/analytics", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || payload?.success === false) throw new Error("analytics-load-failed");
        return payload;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        // Distinguish load failure from "Meta not connected" so the UI can
        // offer a retry instead of connect-Meta guidance.
        if (!cancelled) {
          setData(null);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, seeded]);

  useEffect(() => {
    const refresh = () => setRefreshKey((value) => value + 1);
    window.addEventListener("eduverse:analytics-refresh", refresh);
    return () => window.removeEventListener("eduverse:analytics-refresh", refresh);
  }, []);

  const value = useMemo(() => ({ data, loading, error, refresh: () => setRefreshKey((current) => current + 1) }), [data, loading, error]);
  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  return useContext(AnalyticsContext);
}
