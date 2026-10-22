"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import { BarChart3, Check, ChevronDown, Eye, LineChart as LineChartIcon, Lock, MessageSquareText, Send, ShieldCheck, Sparkles, Layers, MapPinned, Bookmark, Users } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import { cn } from "@/lib/utils";

function MobileExpandable({
  kicker,
  title,
  subtitle,
  icon,
  defaultOpen = false,
  children,
  count,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  count?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const reduceMotion = useReducedMotion();
  return (
    <div className="overflow-hidden rounded-2xl border border-borderSoft bg-card shadow-glass md:hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[64px] w-full items-center justify-between gap-3 px-4 py-3.5 text-left touch-manipulation active:bg-surface-muted/50"
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          {icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/20 bg-accent-soft text-primary">{icon}</span>}
          <span className="min-w-0">
            {kicker && <span className="mono block text-[10px] font-semibold tracking-[0.12em] text-faintText">{kicker}</span>}
            <span className="block truncate font-heading text-sm font-semibold tracking-tight text-ink">{title}</span>
            {subtitle && <span className="mt-0.5 line-clamp-1 block text-xs leading-4 text-mutedText">{subtitle}</span>}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {count && <span className="hidden sm:inline-flex mono text-[10px] tracking-[0.08em] text-faintText">{count}</span>}
          <span className={cn("grid h-8 w-8 place-items-center rounded-full border bg-surface text-mutedText transition-all", open ? "rotate-180 border-primary/20 bg-primary text-primary-foreground" : "border-borderSoft")}>
            <ChevronDown className="h-4 w-4" />
          </span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-borderSoft bg-card"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DashboardHome() {
  const userName = useDashboardStore((state) => state.userName);
  const firstName = userName ? userName.trim().split(" ")[0] : "there";
  const greeting = useSyncExternalStore(subscribeGreeting, getGreeting, () => "Good morning");
  const { data: analytics, loading: analyticsLoading, error: analyticsError } = useAnalytics();
  // A stored account whose token or Page permission lapsed keeps its row but
  // returns no data; that is a different problem from "no account yet".
  const needsReconnect = (analytics?.accounts.length ?? 0) > 0 && !analytics?.live;
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [publisherModalOpen, setPublisherModalOpen] = useState(false);
  const [acetate, setAcetate] = useState<"overview" | "engagement" | "memory">("overview");
  const metrics = analytics?.metrics ?? [];
  const memoryItems = analytics?.memoryItems ?? [];
  const recommendations = analytics?.recommendations ?? [];

  return (
    <div className="space-y-6 pb-6 lg:pb-0">
      <MetaConnectModal isOpen={connectModalOpen} onClose={() => setConnectModalOpen(false)} />
      <MetaPublisherModal isOpen={publisherModalOpen} onClose={() => setPublisherModalOpen(false)} />

      {/* Catalog header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 mono text-[10px] tracking-[0.14em] text-mutedText">
          <span className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${analyticsError ? "bg-danger" : analytics?.live ? "bg-success animate-pulse" : needsReconnect ? "bg-[var(--warn)]" : "bg-faintText"}`} aria-hidden="true" /> {analyticsError ? "ANALYTICS UNAVAILABLE" : analytics?.live ? "LIVE META DATA" : needsReconnect ? "META NEEDS ATTENTION" : "NO CONNECTED ACCOUNTS"}</span>
          <span className="h-3 w-px bg-borderSoft" aria-hidden="true" />
          <span>DASHBOARD OVERVIEW</span>
          <span className="h-3 w-px bg-borderSoft" aria-hidden="true" />
          <span>{formatAtlasDate()}</span>
        </div>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="font-heading text-[28px] font-[600] tracking-tight leading-none text-ink sm:text-[36px]">
              {greeting}, <span className="text-primary">{firstName}</span>.
            </h1>
            <p className="mt-2 max-w-[60ch] text-sm leading-6 text-mutedText">
              {analytics?.live ? "Your latest Meta data is ready. Review audience patterns, saved signals, and recommended next steps." : "Connect a Meta account to see your real audience data and recommendations."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setConnectModalOpen(true)} size="sm" variant="secondary" className="rounded-full">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-primary" /> Connect Meta
            </Button>
            <Button onClick={() => setPublisherModalOpen(true)} size="sm" variant="secondary" className="rounded-full">
              <Send aria-hidden="true" className="h-3.5 w-3.5" /> Publish post
            </Button>
            <Button asChild size="sm" variant="accent" className="rounded-full">
              <Link href="/dashboard/chat"><MessageSquareText aria-hidden="true" className="h-3.5 w-3.5" /> Ask EduVerse</Link>
            </Button>
          </div>
        </div>
        <div className="brass-rule" aria-hidden="true" />
      </div>

      {!analyticsLoading && !analyticsError && !analytics?.live && (
        <div className="grid gap-3">
          <div className="catalog-card p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2.5">
                <div className="inline-flex items-center gap-2">
                  <span className="mono text-[10px] tracking-[0.14em] text-faintText">{needsReconnect ? "CONNECTION NEEDS ATTENTION" : "CONNECT YOUR ACCOUNTS"}</span>
                  <span className="h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
                  <span className="mono text-[10px] tracking-[0.12em] text-primary">{needsReconnect ? "RECONNECT" : "REQUIRED"}</span>
                </div>
                <h2 className="text-balance font-display text-xl font-semibold tracking-tight text-ink">{needsReconnect ? "Meta is connected but not returning data." : "Connect an account to see live audience data."}</h2>
                <p className="max-w-[52ch] text-sm leading-6 text-mutedText">{needsReconnect ? "The saved token or its Page permissions no longer allow analytics. Reconnect Meta to restore this workspace; nothing here was deleted." : "Connect Instagram, Facebook, or Threads to review engagement, saves, and posting times. Access tokens are encrypted and scoped to your workspace."}</p>
                <p className="flex items-center gap-1.5 mono text-[11px] tracking-[0.06em] text-faintText"><Lock aria-hidden="true" className="h-3 w-3 text-success" /> ENCRYPTED · RLS ISOLATED · <Link href="/privacy" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">Privacy & Data Security</Link></p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button onClick={() => setConnectModalOpen(true)} variant="accent" className="rounded-full">Connect Meta</Button>
                <Button asChild variant="secondary" size="sm" className="rounded-full">
                  <Link href="/demo"><Eye aria-hidden="true" className="h-3.5 w-3.5" /> Preview demo</Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-borderSoft bg-ink px-4 py-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 text-background/80 mono text-[11px] tracking-[0.08em]"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-success" /> SAMPLE DATA · NO LOGIN REQUIRED</span>
            <Link href="/demo" className="mono text-[11px] tracking-[0.12em] text-primary hover:text-primary-strong">VIEW DEMO →</Link>
          </div>
        </div>
      )}

      {/* Audience overview and live workspace metrics */}
      <div className="atlas-sheet overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borderSoft bg-surface-muted px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-[8px] border border-primary/25 bg-accent-soft text-primary"><MapPinned aria-hidden="true" className="h-3.5 w-3.5" /></span>
            <div>
              <p className="mono text-[10px] tracking-[0.14em] text-faintText">LIVE WORKSPACE DATA</p>
              <p className="text-sm font-semibold tracking-tight text-ink">Audience overview</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-surface-muted p-1">
            {(["overview","engagement","memory"] as const).map((k) => (
              <button key={k} onClick={() => setAcetate(k)} aria-pressed={acetate===k} className={`min-h-11 rounded-full px-3 py-1 mono text-[11px] tracking-[0.10em] transition ${acetate===k ? "bg-primary text-primary-foreground" : "text-mutedText hover:text-ink"}`}>
                {k === "overview" ? "OVERVIEW" : k === "engagement" ? "ENGAGEMENT" : "MEMORY"}
              </button>
            ))}
          </div>
        </div>

        {/* punched windows — metrics */}
        <div className="bg-surface-muted p-4 sm:p-5">
          {analyticsLoading && !metrics.length ? (
            <div role="status" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[0,1,2].map((s)=>(
                <div key={s} className="h-28 rounded-[10px] border border-borderSoft bg-card/60 animate-pulse" aria-hidden="true" />
              ))}
              <span className="sr-only">Loading audience data…</span>
            </div>
          ) : metrics.length ? (
            <motion.div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" variants={staggerContainer} initial="hidden" animate="show">
              {metrics.map((metric) => (
                <motion.div key={metric.label} variants={staggerItemFast} className="catalog-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="mono text-[10px] tracking-[0.14em] text-faintText">{metric.label.toUpperCase()}</p>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" aria-hidden="true" />
                  </div>
                  <p className="mt-2 display-nums text-[28px] font-[650] leading-none tracking-tight text-ink">{metric.value === null ? "—" : <AnimatedNumber suffix={metric.suffix} value={metric.value} />}</p>
                  <p className="mt-1.5 mono text-[11px] tracking-[0.04em] text-success flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-success" aria-hidden="true" />{metric.detail}</p>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="rounded-[10px] border border-dashed border-borderSoft bg-card/50 px-4 py-8 text-center mono text-xs tracking-[0.12em] text-mutedText">{analyticsError ? "ANALYTICS UNAVAILABLE — RETRY FROM THE NOTICE ABOVE" : "CONNECT META TO VIEW YOUR AUDIENCE DATA"}</div>
          )}

          {/* Context for the selected audience view */}
          {acetate==="engagement" && (
            <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-primary/25 bg-accent-soft px-3 py-2.5">
              <Layers aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
              <span className="mono text-[11px] tracking-[0.10em] text-primary">ENGAGEMENT ACETATE — CONTOURS VISIBLE · OPACITY 12%</span>
            </div>
          )}
          {acetate==="memory" && (
            <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-[var(--warn)] bg-[var(--warn-soft)] px-3 py-2.5">
              <Bookmark aria-hidden="true" className="h-3.5 w-3.5 text-warning-ink" />
              <span className="mono text-[11px] tracking-[0.10em] text-warning-ink">MEMORY ACETATE — ISOLINES COMPOUNDING</span>
            </div>
          )}
        </div>
      </div>

      {/* Desktop charts */}
      <div className="hidden md:grid items-stretch gap-5 xl:grid-cols-3">
        <div className="flex h-full xl:col-span-2">
          <div className="catalog-card flex h-full w-full flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-borderSoft bg-surface-muted px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="mono text-[10px] tracking-[0.14em] text-mutedText">ENGAGEMENT TIMELINE</span>
                <span className="h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
                <span className="text-sm font-semibold tracking-tight text-ink">14-day engagement contour</span>
              </div>
            </div>
            <div className="p-3 sm:p-4 flex-1 flex flex-col min-h-[280px]"><EngagementChartCard /></div>
          </div>
        </div>
          <div className="catalog-card flex h-full w-full flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-borderSoft bg-surface-muted px-4 py-3">
              <span className="mono text-[10px] tracking-[0.14em] text-mutedText">PLATFORM BREAKDOWN</span>
              <span className="h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-tight text-ink">Audience by platform</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col bg-card p-3 sm:p-4"><div className="flex h-full w-full flex-1 items-center"><PlatformBreakdownCard className="h-full" /></div></div>
          </div>
      </div>
      {/* Mobile charts expandable */}
      <div className="grid gap-3 md:hidden">
        <MobileExpandable kicker="ENGAGEMENT" title="14-day engagement" subtitle="Tap to explore your live data" icon={<LineChartIcon className="h-4 w-4" />} defaultOpen>
          <div className="min-h-[260px]"><EngagementChartCard /></div>
        </MobileExpandable>
        <MobileExpandable kicker="PLATFORMS" title="Audience by platform" subtitle="Compare connected networks" icon={<Users className="h-4 w-4" />}>
          <div className="min-h-[240px] flex items-center"><PlatformBreakdownCard className="h-full" /></div>
        </MobileExpandable>
      </div>

      {/* Desktop secondary charts */}
      <div className="hidden md:grid gap-5 lg:grid-cols-3">
        <div className="catalog-card overflow-hidden"><div className="flex items-center gap-2 border-b border-borderSoft bg-surface-muted px-4 py-2.5"><span className="text-sm font-medium text-ink">Posting frequency</span></div><div className="p-3"><PostingFrequencyCard /></div></div>
        <div className="catalog-card overflow-hidden"><div className="flex items-center gap-2 border-b border-borderSoft bg-surface-muted px-4 py-2.5"><span className="text-sm font-medium text-ink">Audience growth</span></div><div className="p-3"><AudienceGrowthCard /></div></div>
        <div className="catalog-card overflow-hidden"><div className="flex items-center gap-2 border-b border-borderSoft bg-surface-muted px-4 py-2.5"><span className="text-sm font-medium text-ink">Comment sentiment</span></div><div className="p-3"><SentimentTrendCard /></div></div>
      </div>
      <div className="grid gap-3 md:hidden">
        <MobileExpandable kicker="PUBLISHING" title="Posting frequency" subtitle="Posts published to connected accounts" icon={<BarChart3 className="h-4 w-4" />}>
          <div className="min-h-[220px]"><PostingFrequencyCard /></div>
        </MobileExpandable>
        <MobileExpandable kicker="AUDIENCE" title="Audience growth" subtitle="Follower counts for connected Instagram accounts" icon={<Users className="h-4 w-4" />}>
          <div className="min-h-[220px]"><AudienceGrowthCard /></div>
        </MobileExpandable>
        <MobileExpandable kicker="COMMENTS" title="Comment sentiment" subtitle="Sentiment across recent comments" icon={<MessageSquareText className="h-4 w-4" />}>
          <div className="min-h-[220px]"><SentimentTrendCard /></div>
        </MobileExpandable>
      </div>

      {/* Desktop recommendations + memory */}
      <div className="hidden md:grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="catalog-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-borderSoft bg-surface-muted px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="mono text-[10px] tracking-[0.14em] text-mutedText">RECOMMENDATIONS</span>
              <span className="h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-tight text-ink">Recommendations</span>
            </div>
            {recommendations.length > 0 && <Badge className="rounded-full bg-ink text-background border border-borderSoft mono text-[10px] tracking-[0.10em]">{recommendations.length} SUGGESTIONS</Badge>}
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
              <div className="rounded-[10px] border border-dashed border-borderSoft bg-surface p-5 text-sm leading-6 text-mutedText">Recommendations appear once EduVerse has enough live Meta history to support them.</div>
            )}
          </div>
        </div>

        <div className="catalog-card overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 border-b border-borderSoft bg-surface-muted px-4 py-3">
            <span className="mono text-[10px] tracking-[0.14em] text-faintText">AUDIENCE MEMORY</span>
            <span className="ml-auto mono text-[10px] tracking-[0.10em] text-success">{memoryItems.length ? `${memoryItems.length} SAVED SIGNALS` : "NO SIGNALS YET"}</span>
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
                      <p className="mt-1 mono text-[10px] tracking-[0.08em] text-faintText">BASED ON LIVE AUDIENCE DATA</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[10px] border border-dashed border-borderSoft bg-surface p-5 text-sm leading-6 text-mutedText">Audience signals appear here after EduVerse analyzes live Meta data. Each saved signal stays connected to its source.</div>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-3 md:hidden">
        <MobileExpandable kicker="NEXT STEPS" title="Recommendations" subtitle={recommendations.length ? `${recommendations.length} ready to review` : "No recommendations yet"} icon={<Sparkles className="h-4 w-4" />} defaultOpen>
          {recommendations.length ? (
            <div className="space-y-3">
              {recommendations.map(([title, timing, detail]) => (
                <div key={title} className="rounded-2xl border border-borderSoft bg-surface p-4">
                  <p className="mono text-[10px] tracking-[0.10em] text-primary">WINDOW · {timing.toUpperCase()}</p>
                  <h3 className="mt-1 font-display text-base font-semibold leading-tight text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-mutedText">{detail}</p>
                  <Button onClick={() => setPublisherModalOpen(true)} variant="accent" className="mt-3 w-full rounded-full text-xs"><Sparkles className="h-3.5 w-3.5" /> Generate draft & schedule</Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-borderSoft bg-surface p-4 text-sm leading-6 text-mutedText">Connect Meta to see recommendations based on your audience data.</div>
          )}
        </MobileExpandable>
        <MobileExpandable kicker="SAVED SIGNALS" title="Audience memory" subtitle={memoryItems.length ? `${memoryItems.length} signals saved` : "Signals appear as data comes in"} icon={<Bookmark className="h-4 w-4" />} count={memoryItems.length ? `${memoryItems.length} signals` : undefined}>
          {memoryItems.length ? (
            <div className="space-y-3">
              {memoryItems.map((item) => (
                <div key={item} className="flex gap-3 rounded-xl border border-borderSoft bg-surface px-3 py-3">
                  <span aria-hidden="true" className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-primary/20 bg-accent-soft text-primary"><Check className="h-3.5 w-3.5" /></span>
                  <p className="text-sm font-medium leading-5 text-ink">{item}</p>
                </div>
              ))}
            </div>
          ) : (
              <div className="rounded-xl border border-dashed border-borderSoft bg-surface p-4 text-sm leading-6 text-mutedText">Audience signals appear here after EduVerse analyzes live Meta data. Each saved signal stays connected to its source.</div>
          )}
        </MobileExpandable>
      </div>

      {/* Ledger */}
      <div className="hidden md:block catalog-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-borderSoft bg-surface-muted px-4 py-3">
          <div className="flex items-center gap-2"><span className="text-sm font-semibold tracking-tight text-ink">Recent posts</span></div>
          <span className="mono text-[10px] tracking-[0.10em] text-faintText">{analytics?.recentPosts?.length ?? 0} POSTS</span>
        </div>
        <div className="bg-card p-3 sm:p-4"><PostTable /></div>
      </div>
      <div className="md:hidden">
        <MobileExpandable kicker="PUBLISHED CONTENT" title="Recent posts" subtitle={analytics?.recentPosts?.length ? `${analytics.recentPosts.length} posts` : "No posts yet"} icon={<Eye className="h-4 w-4" />}>
          <div className="bg-card"><PostTable /></div>
        </MobileExpandable>
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
