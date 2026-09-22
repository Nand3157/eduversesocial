"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BarChart3, Check, ChevronDown, Eye, Heart, LineChartIcon, MessageSquare, Sparkles, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_SNAPSHOT } from "@/lib/demo-data";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { DemoMobileDock } from "@/components/ui/mobile-bottom-nav";
import { cn } from "@/lib/utils";

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  color: "var(--ink)",
  boxShadow: "var(--shadow-lift)",
  fontVariantNumeric: "tabular-nums",
} as const;
const axisTick = { fill: "var(--faint)", fontSize: 12, fontVariantNumeric: "tabular-nums" } as const;
const COLORS = ["var(--accent)", "var(--ok)", "var(--warn)", "var(--muted)"];

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
          <span className={cn("grid h-8 w-8 place-items-center rounded-full border bg-surface text-mutedText transition-all", open ? "rotate-180 border-primary/20 bg-primary text-ink" : "border-borderSoft")}>
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

export function DemoDashboard() {
  const snap = DEMO_SNAPSHOT;
  const reduceMotion = useReducedMotion();
  const chartAnim = { isAnimationActive: !reduceMotion };

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      {/* Demo banner — catalog-card style matching dashboard */}
      <div className="catalog-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/25 bg-accent-soft text-primary">
              <Eye aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                Sandbox preview — simulated data
                <Badge className="border-0 bg-primary text-ink mono text-[10px]">Demo</Badge>
              </p>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-mutedText">
                This is a read-only mock dashboard so you can explore the layout before connecting Meta. Connect your own accounts to replace this with live Graph API data.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="rounded-full bg-primary text-ink hover:bg-primary-strong">
              <Link href="/signup">
                Create free account <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary" className="rounded-full">
              <Link href="/privacy">How data is handled</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Header — same as dashboard */}
      <div className="flex flex-col justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 mono text-[10px] tracking-[0.14em] text-mutedText">
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" aria-hidden="true" /> Demo workspace · no OAuth required</span>
          <span className="h-3 w-px bg-borderSoft" aria-hidden="true" />
          <span>ATLAS TABLE · SIMULATED</span>
          <span className="h-3 w-px bg-borderSoft" aria-hidden="true" />
          <span>{formatAtlasDate()}</span>
        </div>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-balance font-heading text-[28px] font-[600] tracking-tight leading-none text-ink sm:text-[36px]">
              Good morning, <span className="text-primary">explorer.</span>
            </h1>
            <p className="mt-2 max-w-[60ch] text-sm leading-6 text-mutedText">This preview is populated with sample Meta analytics. Everything below becomes live after OAuth.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary" className="gap-1.5 rounded-full">
              <Sparkles aria-hidden="true" className="h-3 w-3" /> Simulated Graph API
            </Badge>
            <Badge variant="success" className="gap-1.5 rounded-full">
              <BadgeCheck aria-hidden="true" className="h-3 w-3" /> No tokens stored
            </Badge>
          </div>
        </div>
        <div className="brass-rule opacity-20" aria-hidden="true" />
      </div>

      {/* Metrics — desktop atlas sheet, mobile expandable compact */}
      {/* Desktop */}
      <div className="hidden md:block atlas-sheet overflow-hidden">
        <div className="flex items-center gap-2 border-b border-borderSoft bg-surface-muted px-4 py-3">
          <span className="mono text-[10px] tracking-[0.14em] text-mutedText">TERRAIN READINGS · SIMULATED</span>
          <span className="h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-tight text-ink">Demo metrics — sample data</span>
        </div>
        <div className="bg-surface-muted p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {snap.metrics.map((m) => (
              <div key={m.label} className="catalog-card p-4">
                <p className="mono text-[10px] tracking-[0.14em] text-mutedText">{m.label.toUpperCase()}</p>
                <p className="mt-2 font-display text-[26px] font-[650] leading-none tracking-tight text-ink">
                  <AnimatedNumber suffix={m.suffix} value={m.value} />
                </p>
                <p className="mt-1.5 mono text-[11px] tracking-[0.04em] text-success flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-success" aria-hidden="true" />{m.detail}</p>
                <p className="mt-1 mono text-[10px] tracking-[0.06em] text-faintText">Simulated · sample Graph data</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Mobile compact metrics - expandable */}
      <MobileExpandable kicker="TERRAIN READINGS" title="Demo metrics" subtitle="4 windows · 142.9K views · 18.4K engaged" icon={<BarChart3 className="h-4 w-4" />} defaultOpen>
        <div className="grid gap-3 grid-cols-2">
          {snap.metrics.map((m) => (
            <div key={m.label} className="rounded-2xl border border-borderSoft bg-surface p-3.5">
              <p className="mono text-[10px] tracking-[0.12em] text-mutedText line-clamp-1">{m.label.toUpperCase()}</p>
              <p className="mt-1.5 font-display text-[20px] font-[700] leading-none tracking-tight text-ink">
                <AnimatedNumber suffix={m.suffix} value={m.value} />
              </p>
              <p className="mt-1 mono text-[11px] text-success flex items-center gap-1"><span className="h-1 w-1 rounded-full bg-success" />{m.detail.slice(0, 22)}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center mono text-[10px] tracking-[0.06em] text-faintText">Tap any window to explore · Simulated Graph API</p>
      </MobileExpandable>

      {/* Charts — desktop twin, mobile stacked expandables */}
      {/* Desktop charts */}
      <div className="hidden md:grid gap-5 xl:grid-cols-3 items-stretch">
        <div className="xl:col-span-2 flex">
          <div className="catalog-card overflow-hidden flex flex-col h-full w-full">
            <div className="flex items-center justify-between gap-3 border-b border-borderSoft bg-surface-muted px-4 py-3">
              <span className="mono text-[10px] tracking-[0.14em] text-mutedText">FAC 022 · TIMELINE</span>
              <span className="text-sm font-semibold tracking-tight text-ink">Engagement over time</span>
            </div>
            <div className="p-3 sm:p-4 flex-1 flex flex-col min-h-[280px]">
              <p className="mb-2 mono text-[11px] text-faintText">Simulated 14-day sample from Meta Graph API.</p>
              <div role="img" aria-label="Area chart: engagement over the last 14 simulated days." className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={snap.engagementData}>
                    <defs>
                      <linearGradient id="demo-engagement" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--line)" strokeOpacity={0.5} vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
                    <YAxis hide />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--line)" }} />
                    <Area dataKey="engagement" fill="url(#demo-engagement)" stroke="var(--accent)" strokeWidth={2.5} type="monotone" {...chartAnim} />
                    <Line dataKey="comments" dot={false} stroke="var(--ok)" strokeWidth={2} type="monotone" {...chartAnim} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="catalog-card flex h-full flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-borderSoft bg-surface-muted px-4 py-3">
            <span className="mono text-[10px] tracking-[0.14em] text-mutedText">FAC 014 · TELEMETRY</span>
            <span className="h-1 w-1 shrink-0 rounded-full bg-primary max-sm:hidden" aria-hidden="true" />
            <span className="text-sm font-semibold tracking-tight text-ink">Channel telemetry</span>
          </div>
          <div className="flex flex-1 flex-col bg-card p-4 sm:p-5">
            <p className="mono text-[11px] leading-relaxed text-faintText">Share of engagement across networks.</p>
            <div className="mt-3 flex flex-1 flex-col items-center gap-5 sm:flex-row sm:items-center lg:flex-col xl:flex-row xl:items-center">
              <div role="img" aria-label="Pie chart: share of engagement by network." className="h-[176px] w-[176px] shrink-0 sm:h-[164px] sm:w-[164px] lg:h-[180px] lg:w-[180px] xl:h-[168px] xl:w-[168px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={snap.platformBreakdown} dataKey="value" innerRadius={46} outerRadius={70} paddingAngle={4} cx="50%" cy="50%" isAnimationActive={!reduceMotion}>
                      {snap.platformBreakdown.map((entry, i) => (
                        <Cell key={entry.name} fill={COLORS[i % COLORS.length]} stroke="var(--surface)" strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid w-full min-w-0 flex-1 gap-2.5">
                {snap.platformBreakdown.map((p, i) => (
                  <div key={p.name} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-borderSoft/60 bg-surface/60 px-3 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5 text-mutedText">
                      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="truncate text-[13px] font-medium leading-none">{p.name}</span>
                    </span>
                    <strong className="shrink-0 tabular-nums text-sm font-semibold text-ink">{p.value}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile charts - beautiful expandables */}
      <div className="grid gap-3 md:hidden">
        <MobileExpandable kicker="FAC 022 · TIMELINE" title="Engagement over time" subtitle="14-day simulated trend · +12.9%" icon={<LineChartIcon className="h-4 w-4" />} defaultOpen>
          <div role="img" aria-label="Area chart: engagement over the last 14 simulated days." className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snap.engagementData}>
                <defs>
                  <linearGradient id="demo-engagement-mobile" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--faint)", fontSize: 10 }} />
                <YAxis hide />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--line)" }} />
                <Area dataKey="engagement" fill="url(#demo-engagement-mobile)" stroke="var(--accent)" strokeWidth={2.5} type="monotone" {...chartAnim} />
                <Line dataKey="comments" dot={false} stroke="var(--ok)" strokeWidth={2} type="monotone" {...chartAnim} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center mono text-[10px] tracking-[0.06em] text-faintText">Simulated 14-day sample · drag to inspect</p>
        </MobileExpandable>

        <MobileExpandable kicker="FAC 014 · TELEMETRY" title="Channel telemetry" subtitle="Instagram 52% · Facebook 31% · Threads 17%" icon={<Users className="h-4 w-4" />}>
          <div className="flex flex-col items-center gap-4">
            <div role="img" aria-label="Pie chart: share of engagement by network." className="h-[180px] w-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={snap.platformBreakdown} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={4} cx="50%" cy="50%" isAnimationActive={!reduceMotion}>
                    {snap.platformBreakdown.map((entry, i) => (
                      <Cell key={entry.name} fill={COLORS[i % COLORS.length]} stroke="var(--surface)" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid w-full gap-2.5">
              {snap.platformBreakdown.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between gap-3 rounded-xl border border-borderSoft bg-surface px-3 py-3 text-sm">
                  <span className="flex items-center gap-2.5 text-mutedText">
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[13px] font-medium">{p.name}</span>
                  </span>
                  <strong className="tabular-nums text-sm font-semibold text-ink">{p.value}%</strong>
                </div>
              ))}
            </div>
          </div>
        </MobileExpandable>
      </div>

      {/* Secondary charts - desktop grid, mobile expandables */}
      <div className="hidden md:grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Posting frequency</CardTitle>
            <CardDescription>Simulated published posts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div role="img" aria-label="Bar chart: simulated posting frequency per day." className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snap.postingData}>
                  <CartesianGrid stroke="var(--line)" strokeOpacity={0.5} vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
                  <YAxis hide />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent-soft)" }} />
                  <Bar dataKey="value" fill="var(--accent)" radius={[6, 6, 2, 2]} {...chartAnim} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Audience size</CardTitle>
            <CardDescription>Simulated follower counts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div role="img" aria-label="Line chart: simulated audience growth over time." className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snap.growthData}>
                  <CartesianGrid stroke="var(--line)" strokeOpacity={0.5} vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
                  <YAxis hide />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--line)" }} />
                  <Line dataKey="followers" dot={{ r: 4, fill: "var(--ok)", strokeWidth: 0 }} stroke="var(--ok)" strokeWidth={2.5} type="monotone" {...chartAnim} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sentiment trend</CardTitle>
            <CardDescription>Simulated comment sentiment.</CardDescription>
          </CardHeader>
          <CardContent>
            <div role="img" aria-label="Area chart: simulated comment sentiment trend." className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={snap.sentimentData}>
                  <defs>
                    <linearGradient id="demo-sentiment" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="var(--ok)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--ok)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
                  <YAxis hide domain={[0, 1]} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--line)" }} />
                  <Area dataKey="score" fill="url(#demo-sentiment)" stroke="var(--ok)" strokeWidth={2.5} type="monotone" {...chartAnim} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-3 md:hidden">
        <MobileExpandable kicker="FAC 031" title="Posting frequency" subtitle="22 Instagram · 16 Facebook · 9 Threads" icon={<BarChart3 className="h-4 w-4" />}>
          <div role="img" aria-label="Bar chart: simulated posting frequency per day." className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={snap.postingData}>
                <CartesianGrid stroke="var(--line)" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--faint)", fontSize: 11 }} />
                <YAxis hide />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent-soft)" }} />
                <Bar dataKey="value" fill="var(--accent)" radius={[8, 8, 2, 2]} {...chartAnim} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </MobileExpandable>
        <MobileExpandable kicker="FAC 032" title="Audience size" subtitle="34.2K IG · 18.7K Facebook" icon={<Users className="h-4 w-4" />}>
          <div role="img" aria-label="Line chart: simulated audience growth over time." className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={snap.growthData}>
                <CartesianGrid stroke="var(--line)" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--faint)", fontSize: 11 }} />
                <YAxis hide />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--line)" }} />
                <Line dataKey="followers" dot={{ r: 4, fill: "var(--ok)", strokeWidth: 0 }} stroke="var(--ok)" strokeWidth={2.5} type="monotone" {...chartAnim} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </MobileExpandable>
        <MobileExpandable kicker="FAC 033" title="Sentiment trend" subtitle="Avg 0.71 · peak 0.78" icon={<MessageSquare className="h-4 w-4" />}>
          <div role="img" aria-label="Area chart: simulated comment sentiment trend." className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snap.sentimentData}>
                <defs>
                  <linearGradient id="demo-sentiment-mobile" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="var(--ok)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--ok)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--faint)", fontSize: 11 }} />
                <YAxis hide domain={[0, 1]} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--line)" }} />
                <Area dataKey="score" fill="url(#demo-sentiment-mobile)" stroke="var(--ok)" strokeWidth={2.5} type="monotone" {...chartAnim} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </MobileExpandable>
      </div>

      {/* Recommendations + Memory - desktop */}
      <div className="hidden md:grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Recommendation (simulated)</CardTitle>
              <CardDescription>How EduVerse turns live signals into a posting brief.</CardDescription>
            </div>
            <Badge variant="success" className="rounded-full">Demo suggestion</Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            {snap.recommendations.map(([title, timing, detail]) => (
              <div key={title} className="space-y-4">
                <div className="rounded-xl border border-primary/25 bg-accent-soft p-5">
                  <p className="text-xs font-medium text-primary">Optimal window · {timing}</p>
                  <h3 className="mt-2 font-heading text-2xl font-medium tracking-tight text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mutedText">{detail}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild className="rounded-full bg-primary text-ink hover:bg-primary-strong">
                    <Link href="/signup">
                      <Sparkles aria-hidden="true" className="h-4 w-4" /> Sign up to generate your own
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" className="rounded-full">
                    <Link href="/privacy">How recommendations use data</Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audience memory — preview</CardTitle>
            <CardDescription>Signals retained from connected content.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {snap.memoryItems.map((item, index) => (
                <div key={item} className="relative flex gap-3">
                  <span aria-hidden="true" className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-success/30 bg-success/10">
                    <Check className="h-3.5 w-3.5 text-success" />
                  </span>
                  {index < snap.memoryItems.length - 1 && <span aria-hidden="true" className="absolute left-3 top-7 h-8 w-px bg-borderSoft" />}
                  <div>
                    <p className="text-sm font-medium leading-relaxed text-ink">{item}</p>
                    <p className="mt-0.5 text-[11px] text-faintText">Simulated sample — your live memory replaces this after OAuth.</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Mobile recommendations + memory */}
      <div className="grid gap-3 md:hidden">
        <MobileExpandable kicker="FAC 041 · RECOMMENDATIONS" title="Recommendation" subtitle="Optimal window · simulated" icon={<Sparkles className="h-4 w-4" />} defaultOpen count={`${snap.recommendations.length} ready`}>
          <div className="space-y-4">
            {snap.recommendations.slice(0,1).map(([title, timing, detail]) => (
              <div key={title} className="space-y-3">
                <div className="rounded-2xl border border-primary/25 bg-accent-soft p-4">
                  <p className="mono text-[10px] tracking-[0.10em] text-primary">Optimal window · {timing}</p>
                  <h3 className="mt-2 font-heading text-lg font-semibold leading-tight tracking-tight text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-mutedText">{detail}</p>
                </div>
                <Button asChild className="w-full rounded-full bg-primary text-ink hover:bg-primary-strong">
                  <Link href="/signup"><Sparkles aria-hidden="true" className="h-4 w-4" /> Generate your own</Link>
                </Button>
              </div>
            ))}
          </div>
        </MobileExpandable>
        <MobileExpandable kicker="FAC 022 · MEMORY" title="Audience memory" subtitle={`${snap.memoryItems.length} cards filed · simulated`} icon={<Check className="h-3.5 w-3.5" />} count={`${snap.memoryItems.length} cards`}>
          <div className="space-y-3">
            {snap.memoryItems.map((item) => (
              <div key={item} className="flex gap-3 rounded-xl border border-borderSoft bg-surface px-3 py-3">
                <span aria-hidden="true" className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-success/20 bg-success/10"><Check className="h-3.5 w-3.5 text-success" /></span>
                <p className="text-sm font-medium leading-5 text-ink">{item}</p>
              </div>
            ))}
          </div>
        </MobileExpandable>
      </div>

      {/* Recent posts telemetry - desktop table, mobile cards */}
      <div className="hidden md:block">
        <Card>
          <CardHeader>
            <CardTitle>Recent posts — preview</CardTitle>
            <CardDescription>Sample performance across Instagram Business and Facebook Pages.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-left text-sm">
                <thead className="text-xs text-mutedText">
                  <tr>
                    {["Platform", "Content", "Date", "Likes", "Comments", "Shares", "Reach", "Status"].map((c) => (
                      <th key={c} className="px-3 py-2 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {snap.recentPosts.map((post, i) => (
                    <tr key={`${post.post}-${i}`} className="bg-surface text-mutedText">
                      <td className="rounded-l-xl px-3 py-3 font-medium text-ink">{post.platform}</td>
                      <td className="max-w-[280px] px-3 py-3 text-ink">{post.post}</td>
                      <td className="px-3 py-3 tabular-nums">{post.date}</td>
                      <td className="px-3 py-3 tabular-nums">{post.likes}</td>
                      <td className="px-3 py-3 tabular-nums">{post.comments}</td>
                      <td className="px-3 py-3 tabular-nums">{post.shares}</td>
                      <td className="px-3 py-3 tabular-nums">{post.reach}</td>
                      <td className="rounded-r-xl px-3 py-3">
                        <Badge variant="success">{post.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-borderSoft bg-surface/50 px-4 py-3">
              <p className="text-xs leading-relaxed text-mutedText">
                Want this with your real posts? Connect Meta and your <span className="font-medium text-ink">reach, saves, and posting windows</span> populate automatically.
              </p>
              <Button asChild size="sm" className="rounded-full bg-primary text-background hover:bg-primary-strong">
                <Link href="/signup">
                  Explore with your data <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="md:hidden">
        <MobileExpandable kicker="FAC 030 · LEDGER" title="Recent posts" subtitle={`${snap.recentPosts.length} simulated posts`} icon={<Eye className="h-4 w-4" />}>
          <div className="grid gap-3">
            {snap.recentPosts.map((post, i) => (
              <div key={`${post.post}-${i}`} className="rounded-2xl border border-borderSoft bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-ink px-2.5 py-1 mono text-[10px] font-semibold tracking-[0.08em] text-background">{post.platform}</span>
                  <span className="mono text-[11px] text-faintText">{post.date} · {post.reach} reach</span>
                </div>
                <p className="mt-2.5 text-sm font-medium leading-6 text-ink line-clamp-2">{post.post}</p>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  <span className="rounded-xl bg-card border border-borderSoft px-2 py-2 text-center"><span className="block mono text-[10px] text-faintText">LIKES</span><span className="block text-xs font-semibold tabular-nums text-ink">{post.likes}</span></span>
                  <span className="rounded-xl bg-card border border-borderSoft px-2 py-2 text-center"><span className="block mono text-[10px] text-faintText">COMMENTS</span><span className="block text-xs font-semibold tabular-nums text-ink">{post.comments}</span></span>
                  <span className="rounded-xl bg-card border border-borderSoft px-2 py-2 text-center"><span className="block mono text-[10px] text-faintText">SHARES</span><span className="block text-xs font-semibold tabular-nums text-ink">{post.shares}</span></span>
                  <span className="rounded-xl bg-success/10 border border-success/20 px-2 py-2 text-center"><span className="block mono text-[10px] text-success">STATUS</span><span className="block text-xs font-semibold text-success">{post.status}</span></span>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-primary/20 bg-accent-soft p-4">
              <p className="text-xs leading-5 text-mutedText">Want this with your real posts? Connect Meta and your <span className="font-semibold text-ink">reach, saves, and windows</span> populate automatically.</p>
              <Button asChild size="sm" className="mt-3 w-full rounded-full bg-primary text-ink hover:bg-primary-strong"><Link href="/signup">Explore with your data <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
            </div>
          </div>
        </MobileExpandable>
      </div>

      <Card className="border-primary/20 bg-accent-soft/30">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-mutedText">
            <Heart aria-hidden="true" className="h-4 w-4 text-primary" />
            <span>
              Liked the preview? <strong className="text-ink">Create a free account</strong> and connect Meta for the live version. No credit card.
            </span>
          </div>
          <Button asChild className="rounded-full bg-primary text-ink hover:bg-primary-strong">
            <Link href="/signup">Start free — no OAuth needed to peek</Link>
          </Button>
        </CardContent>
      </Card>

      <DemoMobileDock />
    </div>
  );
}

function formatAtlasDate() {
  const [year, month, day] = new Date().toISOString().slice(0, 10).split("-");
  return `${day} ${["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][Number(month) - 1]} ${year}`;
}

// compact preview for landing page hero
export function DemoPreviewMini() {
  const snap = DEMO_SNAPSHOT;
  return (
    <div className="rounded-2xl border border-borderSoft bg-card p-4 shadow-glass">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mutedText">Sandbox preview</p>
        <Badge variant="warning" className="bg-warning/15 text-warning border-warning/20 text-[10px]">Simulated</Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {snap.metrics.slice(0, 3).map((m) => (
          <div key={m.label} className="rounded-xl border border-borderSoft bg-surface px-3 py-2.5">
            <p className="text-[10px] leading-none text-mutedText">{m.label}</p>
            <p className="mt-1 font-display text-sm font-semibold text-ink">
              {m.value.toLocaleString("en-US")}
              {m.suffix}
            </p>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="mt-3 h-[88px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={snap.engagementData.slice(-7)}>
            <Area dataKey="engagement" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.12} strokeWidth={2} type="monotone" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-mutedText">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-success animate-pulse" /> No login required</span>
        <span>47 sample posts</span>
      </div>
    </div>
  );
}
