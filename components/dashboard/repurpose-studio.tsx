"use client";

import { useMemo, useState } from "react";
import { Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
import type { AnalyticsPost } from "@/lib/meta-analytics";
import { useAnalytics } from "@/components/dashboard/analytics-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const platforms = ["instagram", "facebook", "threads"] as const;
type Platform = typeof platforms[number];
type Variants = Record<Platform, string>;

function engagement(post: AnalyticsPost) {
  const n = (value: string) => Number(value.replace(/[^\d.]/g, "")) || 0;
  return n(post.likes) + n(post.comments) + n(post.shares);
}

export function RepurposeStudio({ onSchedule }: { onSchedule: (caption: string, platform: Platform) => void }) {
  const { data } = useAnalytics();
  const posts = useMemo(() => [...(data?.recentPosts ?? [])].sort((a, b) => engagement(b) - engagement(a)), [data?.recentPosts]);
  const [selected, setSelected] = useState(0);
  const [variants, setVariants] = useState<Variants | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const source = posts[selected];

  const generate = async () => {
    if (!source?.post) return;
    setGenerating(true); setError(""); setVariants(null);
    try {
      const response = await fetch("/api/meta/repurpose", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: source.post, platform: source.platform, metrics: `${source.likes} likes, ${source.comments} comments, ${source.shares} shares` })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not create variants.");
      setVariants(result.variants as Variants);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create variants."); }
    finally { setGenerating(false); }
  };

  return <Card>
    <CardHeader className="pb-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Smart repurposing</CardTitle><CardDescription className="mt-1">Keep the winning insight; rewrite the delivery for each network.</CardDescription></div><Button size="sm" variant="secondary" disabled={!source?.post || generating} onClick={generate}>{generating ? <Loader2 className="h-4 w-4 animate-spin" /> : variants ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}{generating ? "Adapting…" : variants ? "Regenerate" : "Create 3 variants"}</Button></div></CardHeader>
    <CardContent className="space-y-4">
      {!posts.length ? <p className="rounded-xl border border-dashed border-borderSoft bg-surface p-4 text-sm text-mutedText">Connect Meta and load post history to adapt one of your real posts.</p> : <>
        <label className="block"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faintText">Successful post</span><select value={selected} onChange={(event) => { setSelected(Number(event.target.value)); setVariants(null); }} className="h-10 w-full rounded-xl border border-borderSoft bg-surface px-3 text-sm text-ink outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40">{posts.map((post, index) => <option key={`${post.platform}-${post.date}-${index}`} value={index}>{post.platform} · {engagement(post).toLocaleString()} interactions · {post.post.slice(0, 100)}</option>)}</select></label>
        {source && <div className="rounded-xl border border-borderSoft bg-surface p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-faintText">Source insight · {source.platform} · {source.date}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{source.post}</p><p className="mt-3 text-xs text-mutedText">{source.likes} likes · {source.comments} comments · {source.shares} shares</p></div>}
      </>}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      {variants && <div className="grid gap-3 lg:grid-cols-3">{platforms.map((platform) => <div key={platform} className="rounded-xl border border-borderSoft p-3"><label htmlFor={`repurpose-${platform}`} className="text-xs font-semibold capitalize text-ink">{platform}</label><textarea id={`repurpose-${platform}`} rows={6} maxLength={2200} value={variants[platform]} onChange={(event) => setVariants((current) => current ? { ...current, [platform]: event.target.value } : current)} className="mt-2 w-full resize-y rounded-lg border border-borderSoft bg-surface p-3 text-xs leading-5 text-ink outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40" /><Button size="sm" variant="secondary" className="mt-2 w-full" onClick={() => onSchedule(variants[platform], platform)}><Send className="h-3.5 w-3.5" />Edit & schedule</Button></div>)}</div>}
      <p className="text-[10px] text-faintText">AI adapts copy only. Review every variant before scheduling; media is not copied automatically.</p>
    </CardContent>
  </Card>;
}
