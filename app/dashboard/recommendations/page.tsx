"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Sparkles, X, Eye, Info, RotateCcw, Send } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeading } from "@/components/dashboard/page-heading";
import { useAnalytics } from "@/components/dashboard/analytics-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TiltCard } from "@/components/ui/tilt-card";
import { Modal, ModalContent, ModalTitle, ModalDescription } from "@/components/ui/modal";
import { MetaPublisherModal } from "@/components/meta/meta-publisher-modal";
import { fadeUp, staggerContainer, staggerItem } from "@/components/motion-variants";

type Rec = [string, string, string];

export default function RecommendationsPage() {
  const { data, loading } = useAnalytics();
  const allRecs = (data?.recommendations ?? []) as Rec[];
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [publisherOpen, setPublisherOpen] = useState(false);
  const [publisherCaption, setPublisherCaption] = useState("");
  const [whyRec, setWhyRec] = useState<Rec | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Hydrate dismissed titles AFTER mount — reading localStorage in the state
  // initializer would desync server HTML from the first client render.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem("eduverse:dismissed-recs");
        if (raw) setDismissed(JSON.parse(raw) as string[]);
      } catch {}
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => { try { localStorage.setItem("eduverse:dismissed-recs", JSON.stringify(dismissed)); } catch {} }, [dismissed]);

  const recommendations = allRecs.filter(([t]) => !dismissed.includes(t));
  const dismissedCount = allRecs.length - recommendations.length;

  const handleSchedule = (rec: Rec) => {
    const [title, timing, detail] = rec;
    setPublisherCaption(`${title} — ${detail} (${timing})`);
    setPublisherOpen(true);
  };
  const handleDismiss = (title: string) => {
    setDismissed((d) => [...d, title]);
    setToast(`Dismissed “${title.slice(0, 40)}…” — restore below.`);
    setTimeout(() => setToast(null), 3000);
  };
  const handleWhy = (rec: Rec) => setWhyRec(rec);

  return (
    <div className="space-y-6">
      <PageHeading description="Practical ideas generated only from live Meta audience and post data. Dismiss what’s not useful — it stays hidden." eyebrow="Your next best move" title="Recommendations" />
      {toast && <div role="status" aria-live="polite" className="rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-sm text-success flex items-center justify-between"><span>{toast}</span><button onClick={() => setToast(null)} aria-label="Dismiss message" className="ml-2 rounded-lg p-1.5 text-success/70 hover:text-success focus-visible:ring-2 focus-visible:ring-success/50 focus-visible:outline-none"><X aria-hidden="true" className="h-4 w-4" /></button></div>}
      {dismissedCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-mutedText">
          <span>{dismissedCount} dismissed</span>
          <button onClick={() => { setDismissed([]); setToast("Restored dismissed recommendations."); setTimeout(()=>setToast(null),2500); }} className="inline-flex touch-manipulation items-center gap-1 rounded-lg py-1 text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"><RotateCcw aria-hidden="true" className="h-3 w-3" /> Restore all</button>
        </div>
      )}
      {loading ? <Card role="status"><CardContent className="p-6 text-sm text-mutedText">Loading live recommendations…</CardContent></Card> : recommendations.length ? <>
        <motion.div {...fadeUp}>
          <Card className="border-primary/25 bg-accent-soft"><CardContent className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><Badge variant="primary">Live recommendation · featured</Badge><h2 className="mt-3 font-heading text-2xl font-medium tracking-tight text-ink">{recommendations[0][0]}</h2><p className="mt-1 text-xs font-medium text-primary">{recommendations[0][1]}</p><p className="mt-2 max-w-2xl text-sm leading-6 text-mutedText">{recommendations[0][2]}</p></div><div className="flex shrink-0 flex-wrap gap-2"><Button className="bg-ink text-background hover:bg-ink/90" onClick={() => handleSchedule(recommendations[0])}><Send aria-hidden="true" className="h-4 w-4" />Schedule this</Button><Button variant="secondary" onClick={() => handleWhy(recommendations[0])}><Info aria-hidden="true" className="h-4 w-4" />Why this?</Button><Button variant="ghost" size="icon" aria-label={`Dismiss: ${recommendations[0][0]}`} onClick={() => handleDismiss(recommendations[0][0])}><X aria-hidden="true" className="h-4 w-4" /></Button></div></CardContent></Card>
        </motion.div>
        <motion.div className="grid gap-5 lg:grid-cols-3" variants={staggerContainer} initial="hidden" animate="show">{recommendations.map(([title, timing, detail]) => <TiltCard key={title} variants={staggerItem} tiltLimit={8} scale={1.02} className="h-full"><Card className="h-full flex flex-col"><CardHeader><div className="flex items-center justify-between"><CalendarClock aria-hidden="true" className="h-5 w-5 text-primary" /><div className="flex gap-1"><Badge variant="success">Ready</Badge><button onClick={() => handleDismiss(title)} aria-label={`Dismiss ${title}`} className="rounded-full p-2 text-mutedText hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"><X aria-hidden="true" className="h-3.5 w-3.5" /></button></div></div><CardTitle className="pt-3 line-clamp-2">{title}</CardTitle><CardDescription>{timing}</CardDescription></CardHeader><CardContent className="flex flex-1 flex-col"><p className="text-sm leading-6 text-mutedText line-clamp-3">{detail}</p><div className="mt-5 flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => handleSchedule([title, timing, detail])}><Send aria-hidden="true" className="h-3.5 w-3.5" />Schedule</Button><Button size="sm" variant="ghost" onClick={() => handleWhy([title, timing, detail])}><Eye aria-hidden="true" className="h-3.5 w-3.5" />Why</Button></div></CardContent></Card></TiltCard>)}</motion.div>
      </> : <Card><CardContent className="p-6"><div className="rounded-xl border border-dashed border-borderSoft bg-surface/50 p-6 text-sm leading-relaxed text-mutedText">EduVerse does not invent recommendations. Connect Meta and load enough real post and engagement history before EduVerse suggests a next move.{dismissedCount>0 && " You dismissed some — restore above to see them."}</div></CardContent></Card>}

      <MetaPublisherModal isOpen={publisherOpen} onClose={() => setPublisherOpen(false)} initialCaption={publisherCaption} onSuccess={() => { setPublisherOpen(false); setToast("Draft queued — will publish per schedule."); setTimeout(()=>setToast(null),3000); }} />

      <Modal open={Boolean(whyRec)} onOpenChange={(o) => { if (!o) setWhyRec(null); }}>
        <ModalContent className="max-w-lg">
          <ModalTitle>Why this recommendation?</ModalTitle>
          <ModalDescription>Provenance: how EduVerse derived this from live data — never invented.</ModalDescription>
          {whyRec && (
            <div className="mt-4 space-y-4">
              <div><p className="text-sm font-semibold text-ink">{whyRec[0]}</p><p className="text-xs text-primary">{whyRec[1]}</p><p className="mt-2 text-sm leading-6 text-mutedText">{whyRec[2]}</p></div>
              <div className="rounded-xl border border-borderSoft bg-surface p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-faintText">Source signals</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-mutedText">
                  {(data?.memoryItems ?? []).slice(0, 3).map((m, i) => <li key={i}>{m}</li>)}
                  {(data?.memoryItems?.length ?? 0) === 0 && <li>No memory items yet — connect Meta first.</li>}
                  {data?.metrics?.slice(0, 2).map((m) => <li key={m.label}>{m.label}: {m.value}{m.suffix} — {m.detail}</li>)}
                </ul>
              </div>
              <div className="rounded-xl border border-success/20 bg-success/10 p-3 text-xs leading-relaxed text-ink">
                <strong className="text-success">Explain like dashboard:</strong> This picks the top-engaged recent post from Graph API and suggests repurposing its topic/format. Ask the AI chat “why did my last carousel perform well?” for a deeper explainer with citations.
              </div>
              <div className="flex justify-between gap-2 pt-2">
                <Button variant="ghost" onClick={() => setWhyRec(null)}>Close</Button>
                <Button variant="primary" onClick={() => { if (whyRec) handleSchedule(whyRec); setWhyRec(null); }}><Sparkles aria-hidden="true" className="h-4 w-4" /> Schedule this</Button>
              </div>
            </div>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
