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
          <span>{new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }).toUpperCase()}</span>
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
            <Button onClick={() => setConnectModalOpen(true)} size="sm" variant="secondary" className="rounded-full bg-[#1E1A14] border-[#2E2416] text-[#B8AA8C] hover:bg-[#232019] hover:text-[#F7F3E8]">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-[#D4A85A]" /> Meta sync
            </Button>
            <Button onClick={() => setPublisherModalOpen(true)} size="sm" className="rounded-full bg-[#F7F3E8] text-[#0B1220] hover:bg-[#ECE5D1] border border-[#DDD2B6]">
              <Send aria-hidden="true" className="h-3.5 w-3.5" /> Publish post
            </Button>
            <Button asChild size="sm" className="rounded-full bg-[#D4A85A] text-[#1A1206] hover:bg-[#E8C27A] shadow-[0_4px_16px_rgba(212,168,90,0.22)]">
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
                  <span className="mono text-[10px] tracking-[0.14em] text-[#8A7D6B]">CATALOG CARD · FAC 002</span>
                  <span className="h-1 w-1 rounded-full bg-[#D4A85A]" aria-hidden="true" />
                  <span className="mono text-[10px] tracking-[0.12em] text-[#D4A85A]">REQUIRED</span>
                </div>
                <h2 className="font-display text-xl font-semibold tracking-tight text-[#0B1220]">Mount live acetate to read terrain.</h2>
                <p className="max-w-[52ch] text-sm leading-6 text-[#4A5A6E]">Connect a Meta User Access Token to lay reach, saves, and timing atop your atlas. Tokens are AES-256-GCM encrypted and pinned per drawer.</p>
                <p className="flex items-center gap-1.5 mono text-[11px] tracking-[0.06em] text-[#8A7D6B]"><Lock aria-hidden="true" className="h-3 w-3 text-[#5FB48A]" /> ENCRYPTED · RLS ISOLATED · <Link href="/privacy" className="text-[#8A5A2B] underline decoration-[#D4A85A]/30 underline-offset-4 hover:decoration-[#D4A85A]">Privacy & Data Security</Link></p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button onClick={() => setConnectModalOpen(true)} className="rounded-full bg-[#1A140F] text-[#F7F3E8] hover:bg-[#232019]">Connect Meta</Button>
                <Button asChild variant="secondary" size="sm" className="rounded-full bg-[#FFF8E6] border-[#E8C27A]/30 text-[#8A5A2B] hover:bg-[#FFF0CC]">
                  <Link href="/demo"><Eye aria-hidden="true" className="h-3.5 w-3.5" /> Live Demo</Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#2E2416] bg-[#1E1A14] px-4 py-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 text-[#B8AA8C] mono text-[11px] tracking-[0.08em]"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-[#5FB48A]" /> PREVIEW SANDBOX — NO LOGIN</span>
            <Link href="/demo" className="mono text-[11px] tracking-[0.12em] text-[#D4A85A] hover:text-[#E8C27A]">OPEN →</Link>
          </div>
        </div>
      )}

      {/* Atlas table — acetate bar + punched metric windows */}
      <div className="atlas-sheet overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D6DFE8] bg-[#EEF3F9] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-[#1A140F] text-[#D4A85A] border border-[#2E2416]"><MapPinned aria-hidden="true" className="h-3.5 w-3.5" /></span>
            <div>
              <p className="mono text-[10px] tracking-[0.14em] text-[#8A7D6B]">ATLAS TABLE · FAC 014</p>
              <p className="text-sm font-semibold tracking-tight text-[#0B1220]">Terrain readings — live acetate</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-[#1A140F] p-1">
            {(["terrain","engagement","memory"] as const).map((k) => (
              <button key={k} onClick={() => setAcetate(k)} aria-pressed={acetate===k} className={`rounded-full px-3 py-1 mono text-[11px] tracking-[0.10em] transition ${acetate===k ? "bg-[#D4A85A] text-[#1A1206]" : "text-[#B8AA8C] hover:text-[#F7F3E8]"}`}>
                {k === "terrain" ? "TERRAIN" : k === "engagement" ? "ENGAGEMENT" : "MEMORY"}
              </button>
            ))}
          </div>
        </div>

        {/* punched windows — metrics */}
        <div className="bg-[#F8FAFC] p-4 sm:p-5">
          {analyticsLoading ? (
            <div role="status" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[0,1,2].map((s)=>(
                <div key={s} className="h-28 rounded-[10px] border border-[#D6DFE8] bg-white/60 animate-pulse" aria-hidden="true" />
              ))}
              <span className="sr-only">Loading terrain…</span>
            </div>
          ) : metrics.length ? (
            <motion.div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" variants={staggerContainer} initial="hidden" animate="show">
              {metrics.map((metric) => (
                <motion.div key={metric.label} variants={staggerItemFast} className="catalog-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="mono text-[10px] tracking-[0.14em] text-[#8A7D6B]">{metric.label.toUpperCase()}</p>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D4A85A] mt-1.5 shrink-0" aria-hidden="true" />
                  </div>
                  <p className="mt-2 display-nums text-[28px] font-[650] leading-none tracking-tight text-[#0B1220]"><AnimatedNumber suffix={metric.suffix} value={metric.value} /></p>
                  <p className="mt-1.5 mono text-[11px] tracking-[0.04em] text-[#5F7A6B] flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#5FB48A]" aria-hidden="true" />{metric.detail}</p>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="rounded-[10px] border border-dashed border-[#2E2416] bg-[#EEF3F9] dark:bg-[#232019] px-4 py-8 text-center mono text-xs tracking-[0.12em] text-[#0B1220] dark:text-[#E8DDC1]">NO TERRAIN MOUNTED — CONNECT META TO PUNCH WINDOWS</div>
          )}

          {/* acetate veil — subtle cyan wash when engagement mode */}
          {acetate==="engagement" && (
            <div className="mt-4 rounded-[10px] border border-[rgba(127,184,200,0.22)] bg-[rgba(127,184,200,0.08)] px-3 py-2.5 flex items-center gap-2">
              <Layers aria-hidden="true" className="h-3.5 w-3.5 text-[#7FB8C8]" />
              <span className="mono text-[11px] tracking-[0.10em] text-[#5A7A85]">CYAN ACETATE — ENGAGEMENT CONTOURS VISIBLE · OPACITY 12%</span>
            </div>
          )}
          {acetate==="memory" && (
            <div className="mt-4 rounded-[10px] border border-[rgba(212,168,90,0.22)] bg-[rgba(212,168,90,0.08)] px-3 py-2.5 flex items-center gap-2">
              <Bookmark aria-hidden="true" className="h-3.5 w-3.5 text-[#D4A85A]" />
              <span className="mono text-[11px] tracking-[0.10em] text-[#8A6A2A]">PARCHMENT ACETATE — MEMORY ISOLINES · COMPOUNDING</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2 flex">
          <div className="catalog-card flex w-full flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-[#D6DFE8] bg-[#EEF3F9] px-4 py-3 dark:bg-[#0E1424] dark:border-[#1F2A44]">
              <div className="flex items-center gap-2">
                <span className="mono text-[10px] tracking-[0.14em] text-mutedText">FAC 022 · TIMELINE</span>
                <span className="h-1 w-1 rounded-full bg-amber-500" aria-hidden="true" />
                <span className="text-sm font-semibold tracking-tight text-ink">14-day engagement contour</span>
              </div>
            </div>
            <div className="p-3 sm:p-4 flex-1 flex flex-col min-h-[280px]"><EngagementChartCard /></div>
          </div>
        </div>
          <div className="catalog-card flex w-full flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[#D6DFE8] bg-[#EEF3F9] px-4 py-3 dark:bg-[#0E1424] dark:border-[#1F2A44]">
              <span className="mono text-[10px] tracking-[0.14em] text-mutedText">FAC 014 · TELEMETRY</span>
              <span className="h-1 w-1 rounded-full bg-amber-500" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-tight text-ink">Channel telemetry</span>
            </div>
            <div className="flex flex-1 flex-col bg-white p-3 dark:bg-[#141E32] sm:p-4"><div className="flex w-full flex-1 items-center"><PlatformBreakdownCard /></div></div>
          </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="catalog-card overflow-hidden"><div className="border-b border-[#D6DFE8] bg-[#EEF3F9] px-4 py-2.5 flex items-center gap-2"><span className="mono text-[10px] tracking-[0.12em] text-[#8A7D6B]">FAC 031</span><span className="text-sm font-medium text-[#0B1220]">Posting frequency</span></div><div className="p-3"><PostingFrequencyCard /></div></div>
        <div className="catalog-card overflow-hidden"><div className="border-b border-[#D6DFE8] bg-[#EEF3F9] px-4 py-2.5 flex items-center gap-2"><span className="mono text-[10px] tracking-[0.12em] text-[#8A7D6B]">FAC 032</span><span className="text-sm font-medium text-[#0B1220]">Audience growth</span></div><div className="p-3"><AudienceGrowthCard /></div></div>
        <div className="catalog-card overflow-hidden"><div className="border-b border-[#D6DFE8] bg-[#EEF3F9] px-4 py-2.5 flex items-center gap-2"><span className="mono text-[10px] tracking-[0.12em] text-[#8A7D6B]">FAC 033</span><span className="text-sm font-medium text-[#0B1220]">Sentiment trend</span></div><div className="p-3"><SentimentTrendCard /></div></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="catalog-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[#D6DFE8] bg-[#EEF3F9] px-4 py-3 dark:bg-[#0E1424] dark:border-[#1F2A44]">
            <div className="flex items-center gap-2">
              <span className="mono text-[10px] tracking-[0.14em] text-mutedText">FAC 041 · RECOMMENDATIONS</span>
              <span className="h-1 w-1 rounded-full bg-amber-500" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-tight text-ink">Pin to rail</span>
            </div>
            {recommendations.length > 0 && <Badge className="rounded-full bg-ink text-background border border-borderSoft mono text-[10px] tracking-[0.10em]">READY TO PIN</Badge>}
          </div>
          <div className="p-4 sm:p-5 space-y-4 bg-white dark:bg-[#141E32]">
            {recommendations.length ? recommendations.map(([title, timing, detail], i) => (
              <div key={title} className="relative overflow-hidden rounded-[12px] border border-[#D6DFE8] bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
                <div className="absolute left-0 top-0 h-full w-1 bg-[#D4A85A]" aria-hidden="true" />
                <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#D44D3A] pin-pulse" aria-hidden="true" />
                <p className="mono text-[10px] tracking-[0.12em] text-[#D4A85A]">WINDOW · {timing.toUpperCase()} · {String(i+1).padStart(2,"0")}</p>
                <h3 className="mt-1 font-display text-lg font-semibold leading-tight tracking-tight text-[#0B1220]">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[#4A5A6E]">{detail}</p>
                <Button onClick={() => setPublisherModalOpen(true)} className="mt-3 rounded-full bg-[#1A140F] text-[#F7F3E8] hover:bg-[#232019] text-xs"><Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Generate draft & schedule</Button>
              </div>
            )) : (
              <div className="rounded-[10px] border border-dashed border-[#D6DFE8] dark:border-[#1F2A44] bg-white dark:bg-[#1E293B] p-5 mono text-xs leading-6 tracking-[0.04em] text-mutedText">EDUVERSE DOES NOT INVENT RECOMMENDATIONS. ONCE META RETURNS ENOUGH HISTORY, A GROUNDED NEXT STEP IS PINNED HERE WITH A RED FLAG.</div>
            )}
          </div>
        </div>

        <div className="catalog-card overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 border-b border-[#D6DFE8] bg-[#EEF3F9] px-4 py-3">
            <span className="mono text-[10px] tracking-[0.14em] text-[#8A7D6B]">FAC 022 · MEMORY</span>
            <span className="ml-auto mono text-[10px] tracking-[0.10em] text-[#5FB48A]">{memoryItems.length ? `${memoryItems.length} CARDS FILED` : "EMPTY DRAWER"}</span>
          </div>
          <div className="flex-1 bg-white dark:bg-[#141E32] p-4 sm:p-5">
            {memoryItems.length ? (
              <div className="space-y-3">
                {memoryItems.map((item, index) => (
                  <div key={item} className="relative flex gap-3">
                    <span aria-hidden="true" className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#1A140F] text-[#D4A85A] border border-[#2E2416]"><Check className="h-3 w-3" /></span>
                    {index < memoryItems.length - 1 && <span aria-hidden="true" className="absolute left-3 top-7 h-6 w-px bg-[#E8DFC6]" />}
                    <div className="min-w-0 flex-1 rounded-[8px] border border-[#D6DFE8] bg-white px-3 py-2.5">
                      <p className="text-sm font-medium leading-5 text-[#0B1220]">{item}</p>
                      <p className="mt-1 mono text-[10px] tracking-[0.08em] text-[#8A7D6B]">DERIVED FROM LIVE INSIGHTS · FAC 022/{String(index+1).padStart(2,"0")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[10px] border border-dashed border-[#D6DFE8] dark:border-[#1F2A44] bg-white dark:bg-[#1E293B] p-5 mono text-xs leading-6 tracking-[0.04em] text-mutedText">AUDIENCE MEMORY FILES AFTER LIVE META CONTENT IS ANALYZED — EACH CARD IS A TYPED CATALOG ENTRY, NOT A GENERATED CLAIM.</div>
            )}
          </div>
        </div>
      </div>

      <div className="catalog-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[#D6DFE8] bg-[#EEF3F9] px-4 py-3">
          <div className="flex items-center gap-2"><span className="mono text-[10px] tracking-[0.14em] text-[#8A7D6B]">FAC 030 · LEDGER</span><span className="text-sm font-semibold tracking-tight text-[#0B1220]">Recent posts — telemetry ledger</span></div>
          <span className="mono text-[10px] tracking-[0.10em] text-[#8A7D6B]">{analytics?.recentPosts?.length ?? 0} ROWS</span>
        </div>
        <div className="bg-white dark:bg-[#141E32] p-3 sm:p-4"><PostTable /></div>
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
