/* eslint-disable react-hooks/set-state-in-effect -- moderation queue legitimately syncs pending reviews on filter change */
"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, XCircle, Trash2, ShieldCheck, Star, Loader2, RefreshCcw, Lock } from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ReviewRow = {
  id: string;
  name: string;
  role: string | null;
  rating: number;
  content: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  user_id: string | null;
};

type Filter = "pending" | "approved" | "rejected" | "all";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= rating ? "fill-primary text-primary" : "text-faintText"}`} />
      ))}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning/15 text-warning border-warning/25",
    approved: "bg-success/15 text-success border-success/25",
    rejected: "bg-danger/10 text-danger border-danger/20"
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[status] ?? "bg-surface"}`}>{status}</span>;
}

export default function ReviewsModerationPage() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const isForbiddenError = error?.toLowerCase().includes("forbidden") || error?.toLowerCase().includes("restricted");

  const fetchReviews = useCallback(async (f: Filter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reviews?status=${f}&limit=100`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Load failed (${res.status})`);
      setReviews((data.reviews ?? []) as ReviewRow[]);
      setCounts(data.counts ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReviews(filter);
  }, [filter, fetchReviews]);

  const mutate = async (id: string, action: "approve" | "reject" | "pending" | "delete") => {
    if (isForbiddenError) {
      setToast("Only the owner account can modify reviews.");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setActionId(id);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Action failed");
      setToast(action === "delete" ? "Review deleted." : `Review ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "set to pending"}.`);
      setTimeout(() => setToast(null), 2500);
      // Optimistic local update: remove or move item without full refetch for speed,
      // then refresh counts in background.
      if (action === "delete") setReviews((cur) => cur.filter((r) => r.id !== id));
      else if (filter !== "all" && filter !== (action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending")) {
        setReviews((cur) => cur.filter((r) => r.id !== id));
      } else {
        const nextStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending";
        setReviews((cur) => cur.map((r) => (r.id === id ? { ...r, status: nextStatus as ReviewRow["status"] } : r)));
      }
      // Refresh counts quietly
      fetch(`/api/admin/reviews?status=${filter}&limit=100`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => { if (d.counts) setCounts(d.counts); })
        .catch(() => undefined);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not update review.");
      setTimeout(() => setToast(null), 3500);
    } finally {
      setActionId(null);
    }
  };

  const tabDefs: Array<[Filter, string]> = [
    ["pending", "Pending"],
    ["approved", "Approved"],
    ["rejected", "Rejected"],
    ["all", "All"]
  ];

  return (
    <div className="space-y-6">
      <PageHeading
        description={
          isForbiddenError
            ? "This moderation queue is restricted to the owner account. Sign in as the owner to manage reviews."
            : "Approve, reject, or delete reviews before they ever appear on the landing page. Pending reviews are invisible publicly."
        }
        eyebrow="Moderation"
        title="Reviews"
      />

      {isForbiddenError && (
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="flex gap-3 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/20 text-warning">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-ink">Restricted to owner account</p>
              <p className="mt-1 text-sm leading-6 text-mutedText">This section and its delete actions are only available to the owner. Sign in with the owner account configured via REVIEW_ADMIN_EMAIL.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-background shadow-glass">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span>{toast}</span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Moderation queue
            </CardTitle>
            <CardDescription>
              {counts ? (
                <>
                  {counts.pending} pending · {counts.approved} approved · {counts.rejected} rejected · {counts.total} total
                </>
              ) : (
                "Sign in to moderate. Requires service-role configuration on the server."
              )}
            </CardDescription>
          </div>
          <Button size="sm" variant="secondary" onClick={() => fetchReviews(filter)} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tabDefs.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${filter === key ? "border-primary bg-primary text-background shadow-glow" : "border-borderSoft bg-surface text-mutedText hover:border-primary/40 hover:text-ink"}`}
              >
                {label}
                {counts && typeof counts[key] === "number" && key !== "all" && <Badge variant="default" className="ml-2">{counts[key]}</Badge>}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
              {error.includes("service-role") || error.includes("503") ? (
                <p className="mt-1 text-xs leading-relaxed">Add <code className="rounded bg-surface px-1">SUPABASE_SERVICE_ROLE_KEY</code> in Vercel env vars and redeploy, then push the new migration.</p>
              ) : null}
            </div>
          )}

          {loading ? (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-dashed border-borderSoft bg-surface px-6 py-12 text-sm text-mutedText">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading reviews…
            </div>
          ) : reviews.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-borderSoft bg-surface px-6 py-14 text-center">
              <Clock3 className="mx-auto h-6 w-6 text-faintText" />
              <p className="mt-3 font-medium text-ink">No {filter === "all" ? "" : filter} reviews.</p>
              <p className="mt-1 text-sm text-mutedText">
                {filter === "pending" ? "New submissions will appear here for approval." : `No reviews with status "${filter}" found.`}
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-borderSoft bg-card p-5 shadow-glass transition hover:shadow-glow">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{r.name}</p>
                        {r.role && <span className="text-xs text-mutedText">· {r.role}</span>}
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Stars rating={r.rating} />
                        <span className="text-xs tabular-nums text-mutedText">{new Date(r.created_at).toLocaleDateString()} · {new Date(r.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-faintText">{r.id.slice(0, 8)}…</span>
                  </div>
                  <blockquote className="mt-3 text-sm leading-7 text-ink">{r.content}</blockquote>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="primary" disabled={!!actionId || isForbiddenError} onClick={() => mutate(r.id, "approve")} className="bg-success hover:bg-success/90" title={isForbiddenError ? "Owner only" : undefined}>
                      {actionId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Approve
                    </Button>
                    <Button size="sm" variant="secondary" disabled={!!actionId || isForbiddenError} onClick={() => mutate(r.id, "reject")} title={isForbiddenError ? "Owner only" : undefined}>
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button size="sm" variant="ghost" disabled={!!actionId || isForbiddenError} onClick={() => mutate(r.id, "pending")} title={isForbiddenError ? "Owner only" : undefined}>
                      <Clock3 className="h-4 w-4" />
                      Pending
                    </Button>
                    <Button size="sm" variant="ghost" disabled={!!actionId || isForbiddenError} onClick={() => { if (confirm(`Delete review by "${r.name}" permanently? This is only allowed for the owner account.`)) void mutate(r.id, "delete"); }} className="ml-auto text-danger hover:bg-danger/10 hover:text-danger" title={isForbiddenError ? "Owner only" : "Permanently delete"}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-6 text-xs leading-relaxed text-mutedText">
            Approved reviews appear on the public landing wall. Rejected and pending reviews stay hidden. Deletes are permanent. Rate limited 60 GET / 30 PATCH per minute.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
