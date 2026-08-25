"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import { Check, Eye, Lock, MessageSquareText, Send, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { AudienceGrowthCard, EngagementChartCard, PlatformBreakdownCard, PostingFrequencyCard, SentimentTrendCard } from "@/components/dashboard/lazy-charts";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { PostTable } from "@/components/dashboard/post-table";
import { useAnalytics } from "@/components/dashboard/analytics-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { MetaConnectModal } from "@/components/meta/meta-connect-modal";
import { MetaPublisherModal } from "@/components/meta/meta-publisher-modal";
import { TiltCard } from "@/components/ui/tilt-card";
import { TypewriterText } from "@/components/smoothui/typewriter-text";
import { staggerContainer, staggerItemFast } from "@/components/motion-variants";

export function DashboardHome() {
  const userName = useDashboardStore((state) => state.userName);
  const firstName = userName ? userName.trim().split(" ")[0] : "there";
  // Greet by the actual time of day instead of always saying "good morning".
  // useSyncExternalStore keeps the server render stable ("Good morning") and
  // only swaps in the local-time greeting after hydration — no reflows on mount.
  const greeting = useSyncExternalStore(subscribeGreeting, getGreeting, () => "Good morning");
  const { data: analytics, loading: analyticsLoading } = useAnalytics();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [publisherModalOpen, setPublisherModalOpen] = useState(false);
  const metrics = analytics?.metrics ?? [];
  const memoryItems = analytics?.memoryItems ?? [];
  const recommendations = analytics?.recommendations ?? [];

  return (
    <div className="space-y-6">
      <MetaConnectModal isOpen={connectModalOpen} onClose={() => setConnectModalOpen(false)} />
      <MetaPublisherModal isOpen={publisherModalOpen} onClose={() => setPublisherModalOpen(false)} />

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-success">
            <span className={`h-1.5 w-1.5 rounded-full ${analytics?.live ? "animate-pulse bg-success" : "bg-mutedText"}`} />
            {analytics?.live ? "Meta Graph API live" : "Meta analytics not connected"}
          </div>
          <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            <TypewriterText speed={42}>{`${greeting}, ${firstName}.`}</TypewriterText>
          </h1>
          <p className="mt-1.5 text-sm text-mutedText">
            {analytics?.live ? "Your workspace is showing the latest analytics returned by Meta." : "Connect Meta to replace this workspace with live analytics."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setConnectModalOpen(true)} size="sm" variant="secondary">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Meta connect
          </Button>
          <Button onClick={() => setPublisherModalOpen(true)} size="sm" className="bg-ink text-background hover:bg-ink/90">
            <Send className="h-3.5 w-3.5" />
            Publish post
          </Button>
          <Link href="/dashboard/chat">
            <Button size="sm" className="bg-primary text-background hover:bg-primary-strong">
              <MessageSquareText className="h-3.5 w-3.5" />
              Ask AI strategy
            </Button>
          </Link>
        </div>
      </div>

      {!analyticsLoading && !analytics?.live && (
        <div className="space-y-3">
          <Card className="border-primary/25 bg-accent-soft">
            <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-medium text-ink">Your live analytics workspace is ready.</p>
                <p className="mt-1 text-sm text-mutedText">Connect a Meta User Access Token to load accounts, posts, reach, and engagement.</p>
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-mutedText">
                  <Lock className="h-3 w-3 text-success" /> Tokens AES-256-GCM encrypted ·{" "}
                  <Link href="/privacy" className="font-medium text-primary hover:underline">
                    Privacy & Data Security
                  </Link>
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => setConnectModalOpen(true)} className="shrink-0 bg-ink text-background hover:bg-ink/90">
                  Connect Meta
                </Button>
                <Link href="/demo">
                  <Button variant="secondary" size="sm" className="w-full sm:w-auto border-warning/20 bg-warning/10 text-warning hover:bg-warning/15">
                    <Eye className="h-3.5 w-3.5" /> Explore Live Demo
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          <div className="flex items-center justify-between rounded-xl border border-borderSoft bg-surface/50 px-4 py-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 text-mutedText">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> Curious before OAuth? Preview a simulated dashboard with no login.
            </span>
            <Link href="/demo" className="font-medium text-primary hover:underline">
              Open sandbox →
            </Link>
          </div>
        </div>
      )}

      <motion.div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" variants={staggerContainer} initial="hidden" animate="show">
        {analyticsLoading ? (
          <>
            {[0, 1, 2].map((skeleton) => (
              <Card aria-hidden="true" className="animate-pulse" key={skeleton}>
                <CardContent className="p-5">
                  <div className="h-3.5 w-24 rounded-full bg-surface" />
                  <div className="mt-4 h-8 w-32 rounded-full bg-surface" />
                  <div className="mt-3 h-3 w-44 rounded-full bg-surface" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : metrics.length ? metrics.map((metric) => (
          <TiltCard key={metric.label} variants={staggerItemFast} tiltLimit={10} scale={1.02} className="h-full">
            <Card className="h-full transition-shadow hover:shadow-glow">
              <CardContent className="p-5">
                <p className="text-sm text-mutedText">{metric.label}</p>
                <p className="mt-2 font-display text-3xl font-medium tracking-tight text-ink"><AnimatedNumber suffix={metric.suffix} value={metric.value} /></p>
                <p className="mt-2 text-xs font-medium text-success">{metric.detail}</p>
              </CardContent>
            </Card>
          </TiltCard>
        )) : (
          <Card className="sm:col-span-2 xl:col-span-3"><CardContent className="p-5 text-sm text-mutedText">No live metrics are available yet.</CardContent></Card>
        )}
      </motion.div>

      <div className="grid gap-5 xl:grid-cols-3">
        <EngagementChartCard />
        <Card>
          <CardHeader><CardTitle>Channel telemetry</CardTitle><CardDescription>Share of engagement across connected networks.</CardDescription></CardHeader>
          <CardContent><PlatformBreakdownCard /></CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3"><PostingFrequencyCard /><AudienceGrowthCard /><SentimentTrendCard /></div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div><CardTitle>Meta recommendations</CardTitle><CardDescription>Generated only after live Meta data is available.</CardDescription></div>
            {recommendations.length > 0 && <Badge variant="success">Ready to dispatch</Badge>}
          </CardHeader>
          <CardContent className="space-y-5">
            {recommendations.length ? recommendations.map(([title, timing, detail]) => (
              <div className="space-y-4" key={title}>
                <div className="rounded-xl border border-primary/25 bg-accent-soft p-5">
                  <p className="text-xs font-medium text-primary">Optimal window · {timing}</p>
                  <h2 className="mt-2 font-heading text-2xl font-medium tracking-tight text-ink">{title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-mutedText">{detail}</p>
                </div>
                <Button onClick={() => setPublisherModalOpen(true)} className="bg-ink text-background hover:bg-ink/90"><Sparkles className="h-4 w-4" />Generate draft & schedule to Meta</Button>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-borderSoft bg-surface/50 p-5 text-sm leading-relaxed text-mutedText">No recommendation is being invented. Once Meta returns enough live post and engagement history, EduVerse can generate a grounded next step.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Audience memory timeline</CardTitle><CardDescription>Signals retained from live connected content.</CardDescription></CardHeader>
          <CardContent>
            {memoryItems.length ? <div className="space-y-4">{memoryItems.map((item, index) => (
              <div className="relative flex gap-3" key={item}><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-success/30 bg-success/10"><Check className="h-3.5 w-3.5 text-success" /></span>{index < memoryItems.length - 1 && <span className="absolute left-3 top-7 h-8 w-px bg-borderSoft" />}<div><p className="text-sm font-medium leading-relaxed text-ink">{item}</p><p className="mt-0.5 text-[11px] text-faintText">Derived from live Meta insights.</p></div></div>
            ))}</div> : <div className="rounded-xl border border-dashed border-borderSoft bg-surface/50 p-5 text-sm leading-relaxed text-mutedText">Audience memory will appear after live Meta content is analyzed.</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Meta posts telemetry</CardTitle><CardDescription>Performance across Instagram Business and Facebook Pages.</CardDescription></CardHeader>
        <CardContent><PostTable /></CardContent>
      </Card>
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

// Re-checks the time a few times per hour and only notifies React when the
// greeting actually changes, so the header never goes stale.
function subscribeGreeting(onStoreChange: () => void) {
  let current = getGreeting();
  const id = window.setInterval(() => {
    const next = getGreeting();
    if (next !== current) {
      current = next;
      onStoreChange();
    }
  }, 60_000);
  return () => window.clearInterval(id);
}
