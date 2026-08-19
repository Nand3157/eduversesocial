"use client";

import { ArrowRight, CalendarClock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeading } from "@/components/dashboard/page-heading";
import { useAnalytics } from "@/components/dashboard/analytics-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TiltCard } from "@/components/ui/tilt-card";
import { fadeUp, staggerContainer, staggerItem } from "@/components/motion-variants";

export default function RecommendationsPage() {
  const { data, loading } = useAnalytics();
  const recommendations = data?.recommendations ?? [];

  return (
    <div className="space-y-6">
      <PageHeading description="Practical ideas generated only from live Meta audience and post data." eyebrow="Your next best move" title="Recommendations" />
      {loading ? <Card><CardContent className="p-6 text-sm text-mutedText">Loading live recommendations…</CardContent></Card> : recommendations.length ? <>
        <motion.div {...fadeUp}>
          <Card className="border-primary/25 bg-accent-soft"><CardContent className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center"><div><Badge variant="primary">Live recommendation</Badge><h2 className="mt-3 font-heading text-2xl font-medium tracking-tight text-ink">{recommendations[0][0]}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-mutedText">{recommendations[0][2]}</p></div><Button className="bg-ink text-background hover:bg-ink/90"><Sparkles className="h-4 w-4" />Generate draft</Button></CardContent></Card>
        </motion.div>
        <motion.div className="grid gap-5 lg:grid-cols-3" variants={staggerContainer} initial="hidden" animate="show">{recommendations.map(([title, timing, detail]) => <TiltCard key={title} variants={staggerItem} tiltLimit={8} scale={1.02} className="h-full"><Card className="h-full"><CardHeader><div className="flex items-center justify-between"><CalendarClock className="h-5 w-5 text-primary" /><Badge variant="success">Ready</Badge></div><CardTitle className="pt-3">{title}</CardTitle><CardDescription>{timing}</CardDescription></CardHeader><CardContent><p className="text-sm text-mutedText">{detail}</p><Button className="mt-5" size="sm" variant="secondary">Explore <ArrowRight className="h-4 w-4" /></Button></CardContent></Card></TiltCard>)}</motion.div>
      </> : <Card><CardContent className="p-6"><div className="rounded-xl border border-dashed border-borderSoft bg-surface/50 p-6 text-sm leading-relaxed text-mutedText">No recommendation is being invented. Connect Meta and load enough real post and engagement history before EduVerse suggests a next move.</div></CardContent></Card>}
    </div>
  );
}
