"use client";

import { Check, Database, Hash, Users } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeading } from "@/components/dashboard/page-heading";
import { useAnalytics } from "@/components/dashboard/analytics-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { staggerContainer, staggerItem, staggerItemFast } from "@/components/motion-variants";

export default function MemoryPage() {
  const { data, loading } = useAnalytics();
  const memoryItems = data?.memoryItems ?? [];
  const postCount = data?.recentPosts.length ?? 0;
  const accountCount = data?.accounts.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeading description="Signals appear here after EduVerse analyzes live connected content." eyebrow="Long-term context" title="Audience memory" />
      <motion.div className="grid gap-5 sm:grid-cols-2" variants={staggerContainer} initial="hidden" animate="show">
        <motion.div variants={staggerItemFast}><Card><CardContent className="flex items-start gap-4 p-5"><span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-primary"><Users className="h-5 w-5" /></span><div><p className="text-sm text-mutedText">Connected accounts</p><p className="mt-1 font-display text-2xl font-medium text-ink">{loading ? "—" : accountCount}</p></div></CardContent></Card></motion.div>
        <motion.div variants={staggerItemFast}><Card><CardContent className="flex items-start gap-4 p-5"><span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-primary"><Database className="h-5 w-5" /></span><div><p className="text-sm text-mutedText">Posts analyzed</p><p className="mt-1 font-display text-2xl font-medium text-ink">{loading ? "—" : postCount}</p></div></CardContent></Card></motion.div>
      </motion.div>
      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader><CardTitle>Memory timeline</CardTitle><CardDescription>Observations returned from connected Meta content.</CardDescription></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-mutedText">Loading live memory…</p> : memoryItems.length ? <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">{memoryItems.map((item, index) => <motion.div className="relative flex gap-4" key={item} variants={staggerItem}><motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.08 + index * 0.06, type: "spring", stiffness: 320, damping: 20 }} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/25 bg-accent-soft text-primary"><Check className="h-4 w-4" /></motion.span>{index < memoryItems.length - 1 && <span className="absolute left-[18px] top-9 h-9 w-px bg-borderSoft" />}<div><p className="font-medium text-ink">{item}</p><p className="mt-1 text-sm text-mutedText">Observed from live Meta analytics.</p></div></motion.div>)}</motion.div> : <div className="rounded-xl border border-dashed border-borderSoft bg-surface/50 p-5 text-sm leading-relaxed text-mutedText">No audience memory is being fabricated. Connect Meta and load enough content for grounded signals to appear.</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Signal coverage</CardTitle><CardDescription>Data categories available from the current Meta connection.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {["Audience behavior", "Content performance", "Topic and hashtag patterns"].map((label) => <div className="flex items-center gap-3 rounded-lg border border-borderSoft bg-surface p-3 text-sm text-mutedText" key={label}><Hash className="h-4 w-4 text-primary" />{label}</div>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
