"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AnalyticsSnapshot } from "@/lib/meta-analytics";

type AnalyticsContextValue = {
  data: AnalyticsSnapshot | null;
  accounts: NonNullable<AnalyticsSnapshot["accounts"]>;
  selectedAccountId: string;
  selectAccount: (accountId: string) => void;
  loading: boolean;
  error: boolean;
  refresh: () => void;
};
const AnalyticsContext = createContext<AnalyticsContextValue>({ data: null, accounts: [], selectedAccountId: "", selectAccount: () => undefined, loading: true, error: false, refresh: () => undefined });

function uniqueAccounts(accounts: AnalyticsSnapshot["accounts"]) {
  return accounts.filter((account, index, all) => all.findIndex((candidate) => candidate.platform === account.platform && candidate.id === account.id) === index);
}

/** Loads analytics after the dashboard shell renders; refreshes use the same API route. */
export function AnalyticsProvider({ children, initialData }: { children: React.ReactNode; initialData?: AnalyticsSnapshot | null }) {
  const [data, setData] = useState<AnalyticsSnapshot | null>(initialData ?? null);
  const [accounts, setAccounts] = useState<AnalyticsSnapshot["accounts"]>(uniqueAccounts(initialData?.accounts ?? []));
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const snapshots = useRef(new Map<string, AnalyticsSnapshot>());
  useEffect(() => {
    if (initialData) snapshots.current.set("all", initialData);
  }, [initialData]);

  useEffect(() => {
    const cacheKey = selectedAccountId || "all";
    const cached = snapshots.current.get(cacheKey);
    if (cached && refreshKey === 0) {
      setData(cached);
      setLoading(false);
      setError(false);
      return;
    }
    setData(cached ?? null);
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) { setLoading(true); setError(false); } });
    // The server caches snapshots per day; manual refreshes bypass the cache.
    // The route reports failures with non-OK statuses (429/403/503) and
    // `success: false` bodies — both must surface as `error` (with a retry),
    // never as a silent null payload indistinguishable from an empty workspace.
    const params = new URLSearchParams();
    if (refreshKey > 0) params.set("refresh", "1");
    if (selectedAccountId) params.set("accountId", selectedAccountId);
    const query = params.toString();
    fetch(`/api/meta/analytics${query ? `?${query}` : ""}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || payload?.success === false) throw new Error("analytics-load-failed");
        return payload;
      })
      .then((payload) => {
        if (!cancelled) {
          snapshots.current.set(cacheKey, payload);
          setData(payload);
          if (!selectedAccountId) setAccounts(uniqueAccounts(payload.accounts ?? []));
        }
      })
      .catch(() => {
        // Distinguish load failure from "Meta not connected" so the UI can
        // offer a retry instead of connect-Meta guidance. Keep the previous
        // snapshot visible when a refresh fails; a transient API error must not
        // erase usable data from every dashboard section.
        if (!cancelled) {
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, selectedAccountId]);

  useEffect(() => {
    const refresh = () => setRefreshKey((value) => value + 1);
    window.addEventListener("eduverse:analytics-refresh", refresh);
    return () => window.removeEventListener("eduverse:analytics-refresh", refresh);
  }, []);

  const value = useMemo(() => ({
    data,
    accounts,
    selectedAccountId,
    selectAccount: setSelectedAccountId,
    loading,
    error,
    refresh: () => setRefreshKey((current) => current + 1)
  }), [data, accounts, selectedAccountId, loading, error]);
  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  return useContext(AnalyticsContext);
}
