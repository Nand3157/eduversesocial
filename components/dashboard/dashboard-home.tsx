"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import { Check, Eye, Lock, MessageSquareText, Send, ShieldCheck, Sparkles, Layers, MapPinned, Bookmark } from "lucide-react";
import { motion } from "framer-motion";
import { AudienceGrowthCard, EngagementChartCard, PlatformBreakdownCard, PostingFrequencyCard, SentimentTrendCard } from "@/components/dashboard/lazy-charts";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { PostTable } from "@/components/dashboard/post-table";
import { useAnalytics } from "@/components/dashboard/analytics-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { MetaConnectModal } from "@/components/meta/meta-connect-modal";
import { MetaPublisherModal } from "@/components/meta/meta-publisher-modal";
import { staggerContainer, staggerItemFast } from "@/components/motion-variants";

export function DashboardHome() {
  const userName = useDashboardStore((state) => state.userName);
  const firstName = userName ? userName.trim().split(" ")[0] : "there";
  const greeting = useSyncExternalStore(subscribeGreeting, getGreeting, () => "Good morning");
  const { data: analytics, loading: analyticsLoading } = useAnalytics();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [publisherModalOpen, setPublisherModalOpen] = useState(false);
  const [acetate, setAcetate] = useState<"terrain" | "engagement" | "memory">("terrain");
  const metrics = analytics?.metrics ?? [];
  const memoryItems = analytics?.memoryItems ?? [];
  const recommendations = analytics?.recommendations ?? [];

  return (
    <div className="space-y-6">
      <MetaConnectModal isOpen={connectModalOpen} onClose={() => setConnectModalOpen(false)} />
      <MetaPublisherModal isOpen={publisherModalOpen} onClose={() => setPublisherModalOpen(false)} />

      {/* Catalog header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 mono text-[10px] tracking-[0.14em] text-mutedText">
          <span className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${analytics?.live ? "bg-success animate-pulse" : "bg-faintText"}`} aria-hidden="true" /> {analytics?.live ? "LIVE ACETATE — META GRAPH" : "NO ACETATE MOUNTED"}</span>
          <span className="h-3 w-px bg-borderSoft" aria-hidden="true" />
          <span>FAC 001 — ATLAS TABLE</span>
          <span className="h-3 w-px bg-borderSoft" aria-hidden="true" />
          <span>{formatAtlasDate()}</span>
        </div>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="font-heading text-[28px] font-[600] tracking-tight leading-none text-ink sm:text-[36px]">
              {greeting}, <span className="text-primary">{firstName}</span>.
            </h1>
            <p className="mt-2 max-w-[60ch] text-sm leading-6 text-mutedText">
              {analytics?.live ? "Atlas is live. Pull acetates to read terrain, pin the next move to the brass rail." : "Mount a live acetate to replace this workspace with Meta terrain — no invented metrics."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setConnectModalOpen(true)} size="sm" variant="secondary" className="rounded-full">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-primary" /> Meta sync
            </Button>
            <Button onClick={() => setPublisherModalOpen(true)} size="sm" variant="secondary" className="rounded-full">
              <Send aria-hidden="true" className="h-3.5 w-3.5" /> Publish post
            </Button>
            <Button asChild size="sm" variant="accent" className="rounded-full">
              <Link href="/dashboard/chat"><MessageSquareText aria-hidden="true" className="h-3.5 w-3.5" /> Ask atlas</Link>
            </Button>
          </div>
        </div>
        <div className="brass-rule" aria-hidden="true" />
      </div>

      {!analyticsLoading && !analytics?.live && (
        <div className="grid gap-3">
          <div className="catalog-card p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2.5">
                <div className="inline-flex items-center gap-2">
                  <span className="mono text-[10px] tracking-[0.14em] text-faintText">CATALOG CARD · FAC 002</span>
                  <span className="h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
                  <span className="mono text-[10px] tracking-[0.12em] text-primary">REQUIRED</span>
                </div>
                <h2 className="text-balance font-display text-xl font-semibold tracking-tight text-ink">Mount live acetate to read terrain.</h2>
                <p className="max-w-[52ch] text-sm leading-6 text-mutedText">Connect a Meta User Access Token to lay reach, saves, and timing atop your atlas. Tokens are AES-256-GCM encrypted and pinned per drawer.</p>
                <p className="flex items-center gap-1.5 mono text-[11px] tracking-[0.06em] text-faintText"><Lock aria-hidden="true" className="h-3 w-3 text-success" /> ENCRYPTED · RLS ISOLATED · <Link href="/privacy" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">Privacy & Data Security</Link></p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button onClick={() => setConnectModalOpen(true)} variant="accent" className="rounded-full">Connect Meta</Button>
                <Button asChild variant="secondary" size="sm" className="rounded-full">
                  <Link href="/demo"><Eye aria-hidden="true" className="h-3.5 w-3.5" /> Live Demo</Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-borderSoft bg-ink px-4 py-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 text-background/80 mono text-[11px] tracking-[0.08em]"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-success" /> PREVIEW SANDBOX — NO LOGIN</span>
            <Link href="/demo" className="mono text-[11px] tracking-[0.12em] text-primary hover:text-primary-strong">OPEN →</Link>
          </div>
        </div>
      )}

      {/* Atlas table — acetate bar + punched metric windows */}
      <div className="atlas-sheet overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borderSoft bg-surface-muted px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-[8px] border border-primary/25 bg-accent-soft text-primary"><MapPinned aria-hidden="true" className="h-3.5 w-3.5" /></span>
            <div>
              <p className="mono text-[10px] tracking-[0.14em] text-faintText">ATLAS TABLE · FAC 014</p>
              <p className="text-sm font-semibold tracking-tight text-ink">Terrain readings — live acetate</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-surface-muted p-1">
            {(["terrain","engagement","memory"] as const).map((k) => (
              <button key={k} onClick={() => setAcetate(k)} aria-pressed={acetate===k} className={`min-h-11 rounded-full px-3 py-1 mono text-[11px] tracking-[0.10em] transition ${acetate===k ? "bg-primary text-ink" : "text-mutedText hover:text-ink"}`}>
                {k === "terrain" ? "TERRAIN" : k === "engagement" ? "ENGAGEMENT" : "MEMORY"}
              </button>
            ))}
          </div>
        </div>

        {/* punched windows — metrics */}
        <div className="bg-surface-muted p-4 sm:p-5">
          {analyticsLoading ? (
            <div role="status" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[0,1,2].map((s)=>(
                <div key={s} className="h-28 rounded-[10px] border border-borderSoft bg-card/60 animate-pulse" aria-hidden="true" />
              ))}
              <span className="sr-only">Loading terrain…</span>
            </div>
          ) : metrics.length ? (
            <motion.div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" variants={staggerContainer} initial="hidden" animate="show">
              {metrics.map((metric) => (
                <motion.div key={metric.label} variants={staggerItemFast} className="catalog-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="mono text-[10px] tracking-[0.14em] text-faintText">{metric.label.toUpperCase()}</p>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" aria-hidden="true" />
                  </div>
                  <p className="mt-2 display-nums text-[28px] font-[650] leading-none tracking-tight text-ink"><AnimatedNumber suffix={metric.suffix} value={metric.value} /></p>
                  <p className="mt-1.5 mono text-[11px] tracking-[0.04em] text-success flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-success" aria-hidden="true" />{metric.detail}</p>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="rounded-[10px] border border-dashed border-borderSoft bg-card/50 px-4 py-8 text-center mono text-xs tracking-[0.12em] text-mutedText">NO TERRAIN MOUNTED — CONNECT META TO PUNCH WINDOWS</div>
          )}

          {/* acetate veil — a restrained amber wash that keeps the active layer legible */}
          {acetate==="engagement" && (
            <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-primary/25 bg-accent-soft px-3 py-2.5">
              <Layers aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
              <span className="mono text-[11px] tracking-[0.10em] text-primary">ENGAGEMENT ACETATE — CONTOURS VISIBLE · OPACITY 12%</span>
            </div>
          )}
          {acetate==="memory" && (
            <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-warning/25 bg-warning/10 px-3 py-2.5">
              <Bookmark aria-hidden="true" className="h-3.5 w-3.5 text-warning" />
              <span className="mono text-[11px] tracking-[0.10em] text-warning">MEMORY ACETATE — ISOLINES COMPOUNDING</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-3">
        <div className="flex h-full xl:col-span-2">
          <div className="catalog-card flex h-full w-full flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-borderSoft bg-surface-muted px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="mono text-[10px] tracking-[0.14em] text-mutedText">FAC 022 · TIMELINE</span>
                <span className="h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
                <span className="text-sm font-semibold tracking-tight text-ink">14-day engagement contour</span>
              </div>
            </div>
            <div className="p-3 sm:p-4 flex-1 flex flex-col min-h-[280px]"><EngagementChartCard /></div>
          </div>
        </div>
          <div className="catalog-card flex h-full w-full flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-borderSoft bg-surface-muted px-4 py-3">
              <span className="mono text-[10px] tracking-[0.14em] text-mutedText">FAC 014 · TELEMETRY</span>
              <span className="h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-tight text-ink">Channel telemetry</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col bg-card p-3 sm:p-4"><div className="flex h-full w-full flex-1 items-center"><PlatformBreakdownCard className="h-full" /></div></div>
          </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="catalog-card overflow-hidden"><div className="flex items-center gap-2 border-b border-borderSoft bg-surface-muted px-4 py-2.5"><span className="mono text-[10px] tracking-[0.12em] text-faintText">FAC 031</span><span className="text-sm font-medium text-ink">Posting frequency</span></div><div className="p-3"><PostingFrequencyCard /></div></div>
        <div className="catalog-card overflow-hidden"><div className="flex items-center gap-2 border-b border-borderSoft bg-surface-muted px-4 py-2.5"><span className="mono text-[10px] tracking-[0.12em] text-faintText">FAC 032</span><span className="text-sm font-medium text-ink">Audience growth</span></div><div className="p-3"><AudienceGrowthCard /></div></div>
        <div className="catalog-card overflow-hidden"><div className="flex items-center gap-2 border-b border-borderSoft bg-surface-muted px-4 py-2.5"><span className="mono text-[10px] tracking-[0.12em] text-faintText">FAC 033</span><span className="text-sm font-medium text-ink">Sentiment trend</span></div><div className="p-3"><SentimentTrendCard /></div></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="catalog-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-borderSoft bg-surface-muted px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="mono text-[10px] tracking-[0.14em] text-mutedText">FAC 041 · RECOMMENDATIONS</span>
              <span className="h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-tight text-ink">Pin to rail</span>
            </div>
            {recommendations.length > 0 && <Badge className="rounded-full bg-ink text-background border border-borderSoft mono text-[10px] tracking-[0.10em]">READY TO PIN</Badge>}
          </div>
          <div className="space-y-4 bg-card p-4 sm:p-5">
            {recommendations.length ? recommendations.map(([title, timing, detail], i) => (
              <div key={title} className="rounded-[12px] border border-borderSoft bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="mono text-[10px] tracking-[0.12em] text-primary">WINDOW · {timing.toUpperCase()} · {String(i+1).padStart(2,"0")}</p>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-danger pin-pulse" aria-hidden="true" />
                </div>
                <h3 className="mt-1 font-display text-lg font-semibold leading-tight tracking-tight text-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-mutedText">{detail}</p>
                <Button onClick={() => setPublisherModalOpen(true)} variant="accent" className="mt-3 rounded-full text-xs"><Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Generate draft & schedule</Button>
              </div>
            )) : (
              <div className="rounded-[10px] border border-dashed border-borderSoft bg-surface p-5 mono text-xs leading-6 tracking-[0.04em] text-mutedText">EDUVERSE DOES NOT INVENT RECOMMENDATIONS. ONCE META RETURNS ENOUGH HISTORY, A GROUNDED NEXT STEP IS PINNED HERE WITH A RED FLAG.</div>
            )}
          </div>
        </div>

        <div className="catalog-card overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 border-b border-borderSoft bg-surface-muted px-4 py-3">
            <span className="mono text-[10px] tracking-[0.14em] text-faintText">FAC 022 · MEMORY</span>
            <span className="ml-auto mono text-[10px] tracking-[0.10em] text-success">{memoryItems.length ? `${memoryItems.length} CARDS FILED` : "EMPTY DRAWER"}</span>
          </div>
          <div className="flex-1 bg-card p-4 sm:p-5">
            {memoryItems.length ? (
              <div className="space-y-3">
                {memoryItems.map((item, index) => (
                  <div key={item} className="relative flex gap-3">
                    <span aria-hidden="true" className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-primary/25 bg-accent-soft text-primary"><Check className="h-3 w-3" /></span>
                    {index < memoryItems.length - 1 && <span aria-hidden="true" className="absolute left-3 top-7 h-6 w-px bg-borderSoft" />}
                    <div className="min-w-0 flex-1 rounded-[8px] border border-borderSoft bg-surface px-3 py-2.5">
                      <p className="text-sm font-medium leading-5 text-ink">{item}</p>
                      <p className="mt-1 mono text-[10px] tracking-[0.08em] text-faintText">DERIVED FROM LIVE INSIGHTS · FAC 022/{String(index+1).padStart(2,"0")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[10px] border border-dashed border-borderSoft bg-surface p-5 mono text-xs leading-6 tracking-[0.04em] text-mutedText">AUDIENCE MEMORY FILES AFTER LIVE META CONTENT IS ANALYZED — EACH CARD IS A TYPED CATALOG ENTRY, NOT A GENERATED CLAIM.</div>
            )}
          </div>
        </div>
      </div>

      <div className="catalog-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-borderSoft bg-surface-muted px-4 py-3">
          <div className="flex items-center gap-2"><span className="mono text-[10px] tracking-[0.14em] text-faintText">FAC 030 · LEDGER</span><span className="text-sm font-semibold tracking-tight text-ink">Recent posts — telemetry ledger</span></div>
          <span className="mono text-[10px] tracking-[0.10em] text-faintText">{analytics?.recentPosts?.length ?? 0} ROWS</span>
        </div>
        <div className="bg-card p-3 sm:p-4"><PostTable /></div>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
function subscribeGreeting(onStoreChange: () => void) {
  let current = getGreeting();
  const id = window.setInterval(() => { const next = getGreeting(); if (next !== current) { current = next; onStoreChange(); } }, 60_000);
  return () => window.clearInterval(id);
}

function formatAtlasDate() {
  const [year, month, day] = new Date().toISOString().slice(0, 10).split("-");
  return `${day} ${["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][Number(month) - 1]} ${year}`;
}
