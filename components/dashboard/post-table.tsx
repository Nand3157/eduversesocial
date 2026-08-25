"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/components/dashboard/analytics-context";

const statusVariant: Record<string, "primary" | "success" | "warning" | "default"> = {
  "High intent": "primary",
  Trending: "success",
  Learning: "warning",
  Viral: "success",
  Live: "success",
  Draft: "default"
};

type CsvRow = { platform: string; content: string; date: string };

export function PostTable({ csvRows }: { csvRows?: CsvRow[] }) {
  const { data, loading } = useAnalytics();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"post" | "likes">("post");
  const [page, setPage] = useState(1);
  const [confirmClear, setConfirmClear] = useState(false);
  const [localCsvRows, setLocalCsvRows] = useState<CsvRow[]>(() => csvRows ?? []);
  const [lastCsvRows, setLastCsvRows] = useState<CsvRow[] | undefined>(csvRows);
  if (csvRows && csvRows !== lastCsvRows) {
    setLastCsvRows(csvRows);
    setLocalCsvRows(csvRows);
  }

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem("eduverse:csv-import");
        if (raw && !csvRows) {
          const parsed = JSON.parse(raw) as { rows: CsvRow[] };
          if (parsed?.rows?.length) setLocalCsvRows(parsed.rows);
        }
      } catch {}
    });
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CsvRow[]>).detail;
      if (Array.isArray(detail)) setLocalCsvRows(detail);
    };
    window.addEventListener("eduverse:csv-imported", handler as EventListener);
    return () => window.removeEventListener("eduverse:csv-imported", handler as EventListener);
  }, [csvRows]);

  const filtered = useMemo(() => {
    const recentPosts = data?.recentPosts ?? [];
    const csvPosts = localCsvRows.map((r) => ({
      platform: r.platform === "instagram" ? "Instagram Business" : r.platform === "threads" ? "Threads" : "Facebook Pages",
      post: r.content,
      date: r.date,
      likes: "—",
      comments: "—",
      shares: "—",
      reach: "—",
      status: "Draft" as const,
    }));
    const allPosts = [...csvPosts, ...recentPosts];
    // Expand compact counts ("42.8K" → 42_800) so mixed numeric and
    // abbreviated values sort correctly against each other.
    const likes = (value: string) => {
      const numeric = Number(value.replace(/[^0-9.]/g, ""));
      if (value.includes("M")) return numeric * 1_000_000;
      if (value.includes("K")) return numeric * 1_000;
      return numeric || 0;
    };
    return allPosts
      .filter((post) => `${post.platform} ${post.post}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (sort === "post" ? a.post.localeCompare(b.post) : likes(b.likes) - likes(a.likes)));
  }, [data, query, sort, localCsvRows]);

  const items = filtered.slice((page - 1) * 3, page * 3);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 3));

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search content</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faintText" aria-hidden="true" />
          <input
            id="content-search"
            name="content-search"
            type="search"
            autoComplete="off"
            aria-label="Search content"
            className="h-10 w-full rounded-full border border-borderSoft bg-surface pl-10 pr-3 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-faintText focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search content…"
            value={query}
          />
        </label>
        <Button
          onClick={() => setSort(sort === "post" ? "likes" : "post")}
          size="sm"
          variant="secondary"
          aria-label={`Sorted by ${sort === "post" ? "content" : "likes"} — activate to sort by ${sort === "post" ? "likes" : "content"}`}
          aria-pressed={sort === "likes"}
        >
          <ArrowUpDown aria-hidden="true" className="h-3.5 w-3.5" />
          Sort: {sort === "post" ? "Content" : "Likes"}
        </Button>
      </div>
      {localCsvRows.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-primary/20 bg-accent-soft px-3 py-2 text-xs">
          <span className="text-primary font-medium">{localCsvRows.length} CSV rows kept locally (Draft) — not yet published to Meta</span>
          <button
            onClick={() => {
              if (!confirmClear) {
                setConfirmClear(true);
                return;
              }
              setLocalCsvRows([]);
              try { localStorage.removeItem("eduverse:csv-import"); } catch {}
              setConfirmClear(false);
            }}
            onBlur={() => setConfirmClear(false)}
            className={`touch-manipulation rounded-lg underline decoration-dotted transition focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:outline-none ${confirmClear ? "bg-danger/10 px-2 py-1 font-semibold text-danger hover:text-danger" : "text-mutedText hover:text-ink"}`}
          >
            {confirmClear ? "Clear all rows?" : "Clear"}
          </button>
        </div>
      )}

      {loading ? <div role="status" className="rounded-xl border border-dashed border-borderSoft bg-surface/50 p-8 text-center text-xs text-mutedText">Loading live Meta posts…</div> : filtered.length === 0 ? <div className="rounded-xl border border-dashed border-borderSoft bg-surface/50 p-8 text-center text-xs leading-relaxed text-mutedText">No live Meta posts returned yet. Connect a Meta account with post read permissions to populate this library.</div> : <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-separate border-spacing-y-2 text-left text-sm">
          <thead className="text-xs text-mutedText">
            <tr>
              {["Platform", "Content", "Date", "Likes", "Comments", "Shares", "Reach", "Status"].map((column) => (
                <th className="px-3 py-2 font-medium sticky top-0 z-10 bg-surface" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {items.map((post, index) => (
                <motion.tr
                  className="bg-surface text-mutedText transition-colors duration-150 hover:bg-borderSoft/60"
                  key={[post.platform, post.post, post.date, post.likes, post.comments, post.shares, post.reach, index].join("\u0000")}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  <td className="sticky left-0 z-10 rounded-l-xl bg-surface px-3 py-3 font-medium text-ink shadow-[2px_0_4px_rgba(0,0,0,0.04)]">{post.platform}</td>
                  <td className="max-w-[280px] truncate px-3 py-3 text-ink" title={post.post}>{post.post}</td>
                  <td className="px-3 py-3 tabular-nums">{post.date}</td>
                  <td className="px-3 py-3 tabular-nums">{post.likes}</td>
                  <td className="px-3 py-3 tabular-nums">{post.comments}</td>
                  <td className="px-3 py-3 tabular-nums">{post.shares}</td>
                  <td className="px-3 py-3 tabular-nums">{post.reach}</td>
                  <td className="rounded-r-xl px-3 py-3">
                    <Badge variant={statusVariant[post.status]}>{post.status}</Badge>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>}

      <div className="mt-4 flex items-center justify-between text-sm tabular-nums text-mutedText">
        <span aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "post" : "posts"} · Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            aria-label="Previous page"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            size="icon"
            variant="secondary"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Next page"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            size="icon"
            variant="secondary"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
