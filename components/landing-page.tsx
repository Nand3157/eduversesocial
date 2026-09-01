"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Eye, Lock, Menu, Star, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FAQS } from "@/lib/agentic/faq";
import { ThemeToggle } from "@/components/providers/theme-toggle";

type Review = { id: string; name: string; role: string | null; rating: number; content: string; created_at: string; };

function Wordmark({ className }: { className?: string }) {
  return (
    <a aria-label="EduVerse home" className={cn("inline-flex items-center gap-2.5", className)} href="#top">
      <img src="/icon.svg" alt="" width={36} height={36} className="h-9 w-9 rounded-[9px] object-cover ring-1 ring-black/5 shadow-sm" />
      <span className="font-display text-[1.28rem] font-[700] tracking-[-0.03em] text-ink">
        Edu<span className="font-[400] text-primary">Verse</span>
      </span>
    </a>
  );
}

export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const reduceMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("/api/reviews", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((d) => setReviews(d.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setLoadingReviews(false));
  }, []);

  const scrollTo = (id: string) => { setMobileOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }); };

  return (
    <div id="top" className="min-h-screen bg-[#EEF3F9] dark:bg-[#0A0F1E] text-ink selection:bg-accent-soft">
      <header className={cn("sticky top-0 z-40 border-b backdrop-blur-xl transition", scrolled ? "border-[#D6DFE8] dark:border-[#1F2A44] bg-white/90 dark:bg-[#0B1220]/90 supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-[#0B1220]/80" : "border-transparent bg-transparent")}>
        <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between px-5 sm:px-8">
          <Wordmark />
          <nav className="hidden items-center gap-1 lg:flex">
            {[
              ["How it works", "how"],
              ["Features", "features"],
              ["Reviews", "proof"],
              ["FAQ", "faq"],
            ].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="min-h-11 rounded-full px-3.5 py-2 text-[13px] font-medium text-mutedText transition-colors hover:bg-surface hover:text-ink">
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex rounded-full">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full bg-ink text-background hover:bg-ink/90 px-5 hidden sm:inline-flex">
              <Link href="/signup">Start free <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
            <button aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((v) => !v)} className="grid h-10 w-10 place-items-center rounded-full border border-[#D6DFE8] dark:border-[#1F2A44] bg-surface text-ink lg:hidden">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-[#D6DFE8] dark:border-[#1F2A44] bg-background lg:hidden">
              <div className="space-y-1 px-5 py-4">
                {[["How it works","how"],["Features","features"],["Reviews","proof"],["FAQ","faq"]].map(([l,id]) => (
                  <button key={id} onClick={() => scrollTo(id)} className="block w-full rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-surface">{l}</button>
                ))}
                <Button asChild className="mt-2 w-full rounded-full bg-ink text-background"><Link href="/signup">Start free — no credit card</Link></Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </header>

      {/* HERO — editorial, proof-first */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--line)_1px,transparent_1px),linear-gradient(to_bottom,var(--line)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.04]" />
          <div className="absolute left-1/2 top-[-280px] h-[560px] w-[1200px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,var(--accent)_0%,transparent_70%)] opacity-[0.06] blur-2xl" />
        </div>
        <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:py-20">
          <motion.div initial={reduceMotion ? undefined : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D6DFE8] dark:border-[#1F2A44] bg-surface px-3 py-1 text-xs">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" aria-hidden />
              <span className="font-mono text-[11px] tracking-[0.12em] text-mutedText">LIVE-ONLY · NO FAKE METRICS</span>
            </div>
            <h1 className="mt-4 text-balance font-display text-[2.6rem] font-[700] leading-[0.92] tracking-[-0.04em] text-ink sm:text-[3.25rem] lg:text-[3.85rem]">
              Your audience
              <br />
              <span className="font-[400] tracking-[-0.03em]">has a memory.</span>
              <br />
              <span className="relative inline-block">
                <span className="relative">We keep it.</span>
                <span aria-hidden className="absolute inset-x-0 -bottom-1 h-[7px] bg-[var(--accent)] opacity-90" />
              </span>
            </h1>
            <p className="mt-5 max-w-[56ch] text-[15px] leading-7 text-mutedText sm:text-[16px]">
              EduVerse indexes real Instagram, Facebook and Threads engagement — reach, saves, timing — into a workspace memory that compounds. Every recommendation shows <em className="font-medium text-ink not-italic">why</em> it exists.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button asChild className="rounded-full bg-ink px-6 py-6 text-background shadow-[0_8px_20px_rgba(11,18,32,0.16)] hover:bg-ink/90">
                <Link href="/signup">Start free <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Link href="/demo" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-mutedText underline decoration-[#B9C4D0] underline-offset-4 transition hover:text-ink hover:decoration-ink"><Eye className="h-4 w-4" /> Preview the demo</Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6DFE8] dark:border-[#1F2A44] bg-surface px-2.5 py-1 text-mutedText"><Check className="h-3 w-3 text-success" /> No credit card</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6DFE8] dark:border-[#1F2A44] bg-surface px-2.5 py-1 text-mutedText"><Lock className="h-3 w-3" /> Encrypted & revocable</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6DFE8] dark:border-[#1F2A44] bg-surface px-2.5 py-1 text-mutedText">IG · FB · Threads</span>
            </div>
          </motion.div>

          {/* Preview — atlas table, not floating glass */}
          <motion.div initial={reduceMotion ? undefined : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12, ease: [0.16,1,0.3,1] }} className="relative">
            <div className="overflow-hidden rounded-[16px] border border-[#D6DFE8] dark:border-[#1F2A44] bg-card shadow-soft">
              <div className="flex items-center justify-between border-b border-[#D6DFE8] dark:border-[#1F2A44] bg-surface px-4 py-3">
                <span className="font-mono text-[10px] tracking-[0.14em] text-mutedText">SANDBOX PREVIEW · FAC 001 · SAMPLE DATA</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2 py-1 text-[10px] font-medium text-warning"><span className="h-1.5 w-1.5 rounded-full bg-warning" /> Simulated</span>
              </div>
              <div className="bg-surface p-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { k: "Reach · 28 days", v: "142.9K", sub: "save velocity +4.2%" },
                    { k: "Engagement", v: "18.4K", sub: "comments + saves" },
                    { k: "Posts", v: "47", sub: "IG · FB · Threads" },
                  ].map((m) => (
                    <div key={m.k} className="rounded-xl border border-[#D6DFE8] dark:border-[#1F2A44] bg-background p-3">
                      <p className="font-mono text-[11px] tracking-[0.08em] text-mutedText">{m.k}</p>
                      <p className="mt-1 font-display text-lg font-semibold tracking-tight text-ink">{m.v}</p>
                      <p className="text-[11px] text-success">{m.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-dashed border-[#D6DFE8] dark:border-[#1F2A44] bg-background p-4">
                  <p className="font-mono text-[10px] tracking-[0.14em] text-mutedText">14-DAY TREND · ENGAGEMENT</p>
                  <div className="mt-3 h-[96px] w-full rounded-lg bg-[linear-gradient(to_right,var(--line)_1px,transparent_1px),linear-gradient(to_bottom,var(--line)_1px,transparent_1px)] bg-[size:24px_24px] opacity-60" aria-hidden />
                  <p className="mt-2 text-center font-mono text-[10px] tracking-[0.08em] text-mutedText">Every point comes from a real post</p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[#D6DFE8] dark:border-[#1F2A44] bg-surface px-4 py-2.5">
                <span className="font-mono text-[11px] text-mutedText">Why this recommendation</span>
                <span className="font-mono text-[11px] font-medium text-ink">Sample · Aug 12 · Carousel → 3.2× saves</span>
              </div>
            </div>
            <p className="mt-3 text-center font-mono text-[11px] tracking-[0.06em] text-mutedText">Preview uses simulated numbers. Connect Meta for live data.</p>
          </motion.div>
        </div>
      </section>

      {/* LOGOS — restrained */}
      <section className="border-y border-[#D6DFE8] dark:border-[#1F2A44] bg-white dark:bg-[#0E1424]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <span className="font-mono text-[11px] tracking-[0.16em] text-faintText">ONE FEED · THREE GATES · OFFICIAL META GRAPH API</span>
          <div className="flex items-center gap-6 text-sm font-medium text-mutedText">
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#E1306C]" /> Instagram</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#1877F2]" /> Facebook</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-ink" /> Threads</span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — contact sheet, 3 steps */}
      <section id="how" className="mx-auto max-w-[1280px] scroll-mt-24 px-5 py-14 sm:px-8 sm:py-20">
        <div className="max-w-[720px]">
          <h2 className="font-display text-[28px] font-[700] leading-[0.98] tracking-[-0.03em] sm:text-[34px]">How a post becomes memory.</h2>
          <p className="mt-3 text-[15px] leading-7 text-mutedText">Three steps. No number invented — only indexed, then kept.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { n: "01", title: "Connect your accounts", desc: "Link an Instagram Business account or Facebook Page once through Meta. Access is encrypted, scoped, and revocable.", meta: "OAuth · revocable" },
            { n: "02", title: "See what worked", desc: "Reach, saves, comments, and timing appear together in a clear timeline with graceful handling when a platform has no data.", meta: "14-day history" },
            { n: "03", title: "Act with context", desc: "Recommendations show the post and signal behind them. Schedule or publish with safe, verified delivery.", meta: "Source-backed" },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-[#D6DFE8] dark:border-[#1F2A44] bg-white dark:bg-[#141E32] p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-bold text-background">{s.n}</span>
                <span className="font-mono text-[11px] tracking-[0.14em] text-faintText">STEP {s.n}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-mutedText">{s.desc}</p>
              <p className="mt-3 inline-flex rounded-full bg-ink px-2.5 py-1 text-[11px] font-mono text-background">{s.meta}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES — 3 restrained cards, not bento */}
      <section id="features" className="mx-auto max-w-[1280px] scroll-mt-24 px-5 sm:px-8">
        <div className="max-w-[720px]">
          <h2 className="font-display text-[28px] font-[700] tracking-[-0.03em] sm:text-[34px]">One view for every signal.</h2>
          <p className="mt-3 text-[15px] leading-7 text-mutedText">Live engagement and long-term audience memory, organized around the decisions you need to make.</p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {[
            { title: "Audience memory", desc: "Learn from every Reel, Page post, and Thread using your actual engagement instead of generic benchmarks.", bullets: ["Reels", "Posts", "Threads"] },
            { title: "Cross-platform analytics", desc: "See reach, saves, and comment signals together so patterns are easier to act on.", bullets: ["Reach", "Saves", "Sentiment"] },
            { title: "Safe publishing", desc: "Schedule or publish through the official Meta API with encrypted, verified, retry-safe delivery.", bullets: ["Verified", "Encrypted", "Retry-safe"] },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-[#D6DFE8] dark:border-[#1F2A44] bg-card p-6">
              <h3 className="font-display text-lg font-semibold tracking-tight text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-mutedText">{f.desc}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {f.bullets.map((b) => (
                  <span key={b} className="rounded-full border border-[#D6DFE8] dark:border-[#1F2A44] bg-surface px-2.5 py-1 text-[11px] font-mono tracking-[0.08em] text-mutedText">{b}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center font-mono text-[11px] tracking-[0.08em] text-mutedText">Also available in the dashboard: sentiment, posting windows, and hook intelligence.</p>
      </section>

      <section id="pricing" className="mx-auto max-w-[1280px] scroll-mt-24 px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-6 rounded-2xl border border-[#D6DFE8] bg-white p-6 shadow-sm dark:border-[#1F2A44] dark:bg-[#141E32] sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-[62ch]">
            <h2 className="font-display text-[28px] font-[700] tracking-[-0.03em] sm:text-[34px]">Free during early access.</h2>
            <p className="mt-3 text-[15px] leading-7 text-mutedText">Explore the full workflow without a credit card or auto-renewal. You can disconnect Meta or delete your workspace any time.</p>
          </div>
          <div className="border-t border-[#D6DFE8] pt-5 dark:border-[#1F2A44] sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
            <p className="font-mono text-[11px] tracking-[0.16em] text-mutedText">EARLY ACCESS</p>
            <p className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink">Free</p>
            <p className="mt-1 text-sm text-mutedText">No card · no renewal</p>
          </div>
        </div>
      </section>

      {/* REVIEWS — restrained */}
      <section id="proof" className="mx-auto max-w-[1280px] px-5 py-14 sm:px-8 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-[28px] font-[700] tracking-[-0.03em] sm:text-[32px]">Selects — kept frames.</h2>
          <span className="font-mono text-xs tracking-[0.12em] text-mutedText">{reviews.length ? `${reviews.length} SELECTS` : "Verified only — no fakes"}</span>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {(loadingReviews ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[160px] animate-pulse rounded-2xl border border-[#D6DFE8] dark:border-[#1F2A44] bg-surface" />
          )) : reviews.length ? reviews.slice(0,3).map((r) => (
            <div key={r.id} className="rounded-2xl border border-[#D6DFE8] dark:border-[#1F2A44] bg-card p-5">
              <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-[var(--accent)] text-[var(--accent)]" : "text-faintText"}`} />)}</div>
              <blockquote className="mt-3 text-sm leading-6 text-ink">“{r.content}”</blockquote>
              <div className="mt-4 flex items-center gap-2 border-t border-[#D6DFE8] dark:border-[#1F2A44] pt-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-semibold text-background">{r.name.split(" ").map((n)=>n[0]).join("").slice(0,2)}</span>
                <div><p className="text-sm font-medium leading-none text-ink">{r.name}</p><p className="text-xs text-mutedText">{r.role ?? "Creator"}</p></div>
              </div>
            </div>
            )) : (
              <div className="col-span-3 mx-auto max-w-xl rounded-2xl border border-dashed border-[#D6DFE8] dark:border-[#1F2A44] bg-white dark:bg-[#141E32] p-8 text-center shadow-sm">
                <p className="font-display text-base font-semibold tracking-tight text-ink">No selects yet — no fake placeholders.</p>
                <p className="mt-1.5 text-sm leading-6 text-mutedText">Be the first verified kept frame — moderated before publication.</p>
              </div>
            ))}
        </div>
      </section>

      {/* DEMO STRIP */}
      <section className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="overflow-hidden rounded-2xl border border-[#D6DFE8] dark:border-[#1F2A44] bg-card">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <h3 className="font-display text-xl font-semibold tracking-tight">See the dashboard before you connect.</h3>
              <p className="mt-2 max-w-[52ch] text-sm leading-6 text-mutedText">Open a read-only demo with simulated telemetry. Every number is labeled, and no login is required.</p>
              <ul className="mt-3 space-y-1.5 text-sm text-mutedText">
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-success" /> Same layout as the live dashboard</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-success" /> Sample data is clearly labeled</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Button asChild className="rounded-full bg-ink text-background shadow-sm"><Link href="/demo"><Eye className="h-4 w-4" /> Open the demo</Link></Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ — amber ? as designed, chevron — dark band, always */}
      <section id="faq" className="bg-[#0B1220] px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-[1280px] gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-display text-[28px] font-[700] tracking-[-0.03em] text-white sm:text-[32px]">Edit log — plainly.</h2>
            <p className="mt-3 max-w-[48ch] text-[15px] leading-7 text-white/70">Free during early access, revocable in one click. The log is the truth.</p>
            <p className="mt-3 font-mono text-xs tracking-[0.14em] text-white/40">CANONICAL · llms.txt + /md/faq</p>
          </div>
          <div className="grid gap-3">
            {FAQS.slice(0,4).map((faq) => (
              <details key={faq.question} className="group rounded-2xl border border-white/10 bg-white/[0.06] open:border-[var(--accent)]/30 open:bg-white/[0.08]">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-white hover:bg-white/[0.06] [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-3"><span className="hidden sm:grid h-7 w-7 place-items-center rounded-full bg-white text-[#0B1220] text-xs font-bold">?</span>{faq.question}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-white/70 transition group-open:rotate-180 group-open:bg-[var(--accent)] group-open:text-ink group-open:border-[var(--accent)]"><span>⌄</span></span>
                </summary>
                <p className="px-5 pb-5 pl-5 sm:pl-14 text-sm leading-7 text-white/70">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA — restrained ink — fixed dark, always */}
      <section className="bg-[#0B1220] py-12 sm:py-16">
        <div className="mx-auto max-w-[760px] px-5 text-center sm:px-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] tracking-[0.16em] text-white/60"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> EARLY ACCESS — READY</p>
          <h2 className="mt-4 font-display text-[32px] font-[700] leading-[0.95] tracking-[-0.03em] text-white sm:text-[40px]">Stop guessing.<br /><span className="font-[400] text-white/70">Start remembering.</span></h2>
          <p className="mx-auto mt-4 max-w-[58ch] text-[15px] leading-7 text-white/60">Connect Meta to see your real engagement, or preview the workflow first with clearly labeled sample data.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-full bg-[var(--accent)] text-ink shadow-[0_8px_20px_rgba(255,180,58,0.18)] hover:bg-[var(--accent-strong)]"><Link href="/signup">Start free <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild variant="secondary" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link href="/demo"><Eye className="h-4 w-4" /> Preview the demo</Link></Button>
          </div>
          <p className="mt-6 text-xs text-white/40">By connecting you agree to <Link href="/privacy" className="text-[var(--accent)] underline decoration-white/20 underline-offset-4">Privacy</Link> — AES-256-GCM, RLS, revocable.</p>
        </div>
      </section>
    </div>
  );
}
