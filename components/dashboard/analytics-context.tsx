"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AnalyticsSnapshot } from "@/lib/meta-analytics";

type AnalyticsContextValue = { data: AnalyticsSnapshot | null; loading: boolean; error: boolean; refresh: () => void };
const AnalyticsContext = createContext<AnalyticsContextValue>({ data: null, loading: true, error: false, refresh: () => undefined });

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) { setLoading(true); setError(false); } });
    // The server caches snapshots per day; manual refreshes bypass the cache.
    // The route always answers 200 with a snapshot (failures are success:false
    // snapshots), so non-OK responses (e.g. 429) become a null payload.
    fetch(refreshKey > 0 ? "/api/meta/analytics?refresh=1" : "/api/meta/analytics", { cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        // Distinguish transport failure from "Meta not connected" so the UI can
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
  }, [refreshKey]);

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
