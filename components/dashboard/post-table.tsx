"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/components/dashboard/analytics-context";

const statusVariant: Record<string, "primary" | "success" | "warning"> = {
  "High intent": "primary",
  Trending: "success",
  Learning: "warning",
  Viral: "success",
  Live: "success"
};

export function PostTable() {
  const { data, loading } = useAnalytics();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"post" | "likes">("post");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const recentPosts = data?.recentPosts ?? [];
    // Expand compact counts ("42.8K" → 42_800) so mixed numeric and
    // abbreviated values sort correctly against each other.
    const likes = (value: string) => {
      const numeric = Number(value.replace(/[^0-9.]/g, ""));
      if (value.includes("M")) return numeric * 1_000_000;
      if (value.includes("K")) return numeric * 1_000;
      return numeric || 0;
    };
    return recentPosts
      .filter((post) => `${post.platform} ${post.post}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (sort === "post" ? a.post.localeCompare(b.post) : likes(b.likes) - likes(a.likes)));
  }, [data, query, sort]);

  const items = filtered.slice((page - 1) * 3, page * 3);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 3));

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faintText" />
          <input
            className="h-10 w-full rounded-full border border-borderSoft bg-surface pl-10 pr-3 text-sm text-ink outline-none transition placeholder:text-faintText focus:border-primary"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search content"
            value={query}
          />
        </label>
        <Button onClick={() => setSort(sort === "post" ? "likes" : "post")} size="sm" variant="secondary">
          <ArrowUpDown className="h-3.5 w-3.5" />
          Sort: {sort === "post" ? "Content" : "Likes"}
        </Button>
      </div>

      {loading ? <div className="rounded-xl border border-dashed border-borderSoft bg-surface/50 p-8 text-center text-xs text-mutedText">Loading live Meta posts…</div> : filtered.length === 0 ? <div className="rounded-xl border border-dashed border-borderSoft bg-surface/50 p-8 text-center text-xs leading-relaxed text-mutedText">No live Meta posts returned yet. Connect a Meta account with post read permissions to populate this library.</div> : <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-separate border-spacing-y-2 text-left text-sm">
          <thead className="text-xs text-mutedText">
            <tr>
              {["Platform", "Content", "Date", "Likes", "Comments", "Shares", "Reach", "Status"].map((column) => (
                <th className="px-3 py-2 font-medium" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout" initial={false}>
              {items.map((post, index) => (
                <motion.tr
                  className="bg-surface text-mutedText transition-colors duration-150 hover:bg-borderSoft/60"
                  key={[post.platform, post.post, post.date, post.likes, post.comments, post.shares, post.reach, index].join("\u0000")}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  <td className="rounded-l-xl px-3 py-3 font-medium text-ink">{post.platform}</td>
                  <td className="max-w-[280px] px-3 py-3 text-ink">{post.post}</td>
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

      <div className="mt-4 flex items-center justify-between text-sm text-mutedText">
        <span>{filtered.length} posts</span>
        <div className="flex gap-2">
          <Button
            aria-label="Previous page"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            size="icon"
            variant="secondary"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Next page"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            size="icon"
            variant="secondary"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
