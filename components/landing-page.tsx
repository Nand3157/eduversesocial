"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Clock3,
  Eye,
  LockKeyhole,
  Menu,
  MessageCircleMore,
  ShieldCheck,
  Star,
  X,
  Sparkles,
  Zap,
  Layers
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FAQS } from "@/lib/agentic/faq";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { LandingMobileDock } from "@/components/ui/mobile-bottom-nav";

type Review = {
  id: string;
  name: string;
  role: string | null;
  rating: number;
  content: string;
  created_at: string;
};

const EMPTY_FEEDBACK = { name: "", role: "", rating: 5, content: "" };

const railSignals = [
  { platform: "IG", post: "Exam prep carousel", timing: "Wed · 18:30", lift: "+3.2× saves", status: "REPEAT" },
  { platform: "FB", post: "Parent Q&A thread", timing: "Mon · 08:10", lift: "+41 comments", status: "KEEP" },
  { platform: "TH", post: "One-minute concept", timing: "Fri · 12:20", lift: "+18% reach", status: "TEST" },
  { platform: "IG", post: "Behind the lesson", timing: "Tue · 17:45", lift: "+2.4× shares", status: "REPEAT" }
];

const signalMetrics = [
  { label: "REACH / 28 DAYS", value: "142.9K", detail: "save velocity +4.2%" },
  { label: "ENGAGEMENT", value: "18.4K", detail: "comments + saves" },
  { label: "POSTS", value: "47", detail: "IG · FB · Threads" }
];

const memoryStages = [
  { number: "01", title: "Connect once", copy: "Link Instagram Business, Facebook Pages, or Threads through Meta’s official consent flow." },
  { number: "02", title: "Read the signal", copy: "Reach, saves, comments, timing, and post format arrive together in one live timeline." },
  { number: "03", title: "Keep the reason", copy: "Every recommendation points back to the post and signal that earned it." }
];

const featureColumns = [
  { icon: BarChart3, title: "A live view across platforms", copy: "One timeline for Instagram, Facebook, and Threads, with graceful empty states when a platform has no data.", kicker: "FAC 014" },
  { icon: MessageCircleMore, title: "Memory that compounds", copy: "Patterns stay with your workspace, so the next decision starts with what your audience actually did.", kicker: "FAC 022" },
  { icon: ShieldCheck, title: "Publishing with receipts", copy: "Schedule or publish through verified Meta delivery, with encrypted tokens and retry-safe execution.", kicker: "FAC 041" }
];

function Wordmark({ className }: { className?: string }) {
  return (
    <a aria-label="EduVerse home" className={cn("inline-flex min-h-11 items-center gap-2.5", className)} href="#top">
      <Image src="/icon.svg" alt="" width={36} height={36} className="h-9 w-9 rounded-[10px] object-cover shadow-sm ring-1 ring-black/10" />
      <span className="font-display text-[1.18rem] font-semibold tracking-[-0.04em] text-[var(--landing-ink)]">Edu<span className="font-normal text-[var(--landing-signal)]">Verse</span></span>
    </a>
  );
}

function SignalBoard() {
  return (
    <div className="landing-board-wrap">
      <div className="signal-board" aria-label="Simulated EduVerse recommendation board">
        <div className="signal-board-topline"><span>EDUVERSE / WORKSPACE 001</span><span className="signal-board-live"><i aria-hidden="true" /> SIMULATED</span></div>
        <div className="signal-board-title"><div><p className="signal-board-kicker">AUDIENCE MEMORY / 14 DAYS</p><h2>What your audience<br /><em>kept.</em></h2></div><div className="signal-board-stamp">SAMPLE<br />DATA</div></div>
        <div className="signal-board-dashboard">
          <div className="signal-board-metrics" aria-label="Simulated audience summary">
            {signalMetrics.map((metric) => <div className="signal-metric" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></div>)}
          </div>
          <div className="signal-chart" role="img" aria-label="Simulated fourteen day engagement trend rising by 4.2 percent">
            <div className="signal-chart-head"><span>14-DAY TREND · ENGAGEMENT</span><strong>+4.2%</strong></div>
            <svg viewBox="0 0 360 118" aria-hidden="true" focusable="false">
              <defs><linearGradient id="signal-chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#d87843" stopOpacity=".28" /><stop offset="1" stopColor="#d87843" stopOpacity="0" /></linearGradient></defs>
              <path className="signal-chart-grid" d="M0 24H360M0 59H360M0 94H360M72 0V118M144 0V118M216 0V118M288 0V118" />
              <path className="signal-chart-area" d="M0 96 C22 92 34 94 52 87 S88 89 106 78 S138 83 157 70 S187 76 208 62 S241 65 260 52 S292 54 310 42 S343 45 360 28 V118 H0 Z" />
              <path className="signal-chart-line" d="M0 96 C22 92 34 94 52 87 S88 89 106 78 S138 83 157 70 S187 76 208 62 S241 65 260 52 S292 54 310 42 S343 45 360 28" />
              <path className="signal-chart-secondary" d="M0 105 C24 103 38 104 57 100 S91 101 110 94 S143 98 161 90 S194 93 212 84 S245 88 263 78 S295 82 314 72 S345 75 360 65" />
            </svg>
            <span className="signal-chart-note">Sample trend · every point labeled simulated</span>
          </div>
        </div>
        <div className="signal-board-table-wrap">
          <table className="signal-board-table">
            <caption className="sr-only">Simulated audience signal recommendations</caption>
            <thead><tr><th scope="col">SOURCE</th><th scope="col">POST</th><th scope="col">WINDOW</th><th scope="col">SIGNAL</th></tr></thead>
            <tbody>{railSignals.map((signal, index) => <tr key={`${signal.platform}-${signal.post}`} className={`signal-row signal-row-${index + 1}`}><td><span className={cn("signal-platform", signal.platform === "IG" && "signal-platform-ig", signal.platform === "FB" && "signal-platform-fb")}>{signal.platform}</span></td><th scope="row">{signal.post}</th><td>{signal.timing}</td><td><span className="signal-lift">{signal.lift}</span><span className="signal-status">{signal.status}</span></td></tr>)}</tbody>
          </table>
        </div>
        <div className="signal-board-footer"><span><Clock3 aria-hidden="true" /> LAST SYNC · 2 MIN AGO</span><span>WHY THIS? <ArrowRight aria-hidden="true" /></span></div>
      </div>
      <div className="landing-board-note"><span>01</span> Live data enters. Context stays.</div>
    </div>
  );
}

function MemoryStages() {
  return <div className="memory-stages">{memoryStages.map((stage, index) => <div className="memory-stage" key={stage.number}><div className="memory-stage-mark" aria-hidden="true"><span>{stage.number}</span>{index < memoryStages.length - 1 && <i />}</div><div><h3>{stage.title}</h3><p>{stage.copy}</p></div></div>)}</div>;
}

// Mobile collapsible section - beautiful expand on click, smaller footprint
function MobileExpandable({
  kicker,
  title,
  subtitle,
  defaultOpen = false,
  children,
  icon,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const reduceMotion = useReducedMotion();
  return (
    <div className="overflow-hidden rounded-[20px] border border-[var(--landing-line)] bg-[var(--landing-island-strong)] shadow-[0_12px_32px_-16px_rgba(15,17,21,0.18)] backdrop-blur-[16px] lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[68px] w-full items-center justify-between gap-3 px-4 py-4 text-left touch-manipulation active:bg-[var(--landing-paper-deep)]/50"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--landing-signal)]/20 bg-[var(--landing-signal)]/10 text-[var(--landing-signal)]">{icon}</span>}
          <div className="min-w-0">
            {kicker && <p className="mono text-[10px] font-semibold tracking-[0.14em] text-[var(--landing-signal)]">{kicker}</p>}
            <p className="truncate font-display text-[15px] font-semibold tracking-tight text-[var(--landing-ink)]">{title}</p>
            {subtitle && <p className="mt-0.5 line-clamp-1 text-xs leading-4 text-[var(--landing-muted)]">{subtitle}</p>}
          </div>
        </div>
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-[var(--landing-paper)] text-[var(--landing-muted)] transition-all duration-200", open ? "rotate-180 border-[var(--landing-signal)] bg-[var(--landing-signal)] text-[var(--landing-action-ink)]" : "border-[var(--landing-line)]")}>
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-[var(--landing-line)]"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [feedbackForm, setFeedbackForm] = useState(EMPTY_FEEDBACK);
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const landingShellRef = useRef<HTMLDivElement>(null);
  const landingHeaderRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
        const progress = Math.min(window.scrollY / maxScroll, 1);
        const glassShift = `${-40 + progress * 120}%`;
        const glassOpacity = `${0.12 + progress * 0.12}`;
        landingShellRef.current?.style.setProperty("--landing-glass-shift", glassShift);
        landingShellRef.current?.style.setProperty("--landing-glass-opacity", glassOpacity);
        landingHeaderRef.current?.style.setProperty("--landing-glass-shift", glassShift);
        landingHeaderRef.current?.style.setProperty("--landing-glass-opacity", glassOpacity);
        setScrolled(window.scrollY > 12);
        frame = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, []);
  useEffect(() => { fetch("/api/reviews", { cache: "no-store" }).then((response) => (response.ok ? response.json() : { reviews: [] })).then((data) => setReviews(data.reviews ?? [])).catch(() => setReviews([])).finally(() => setLoadingReviews(false)); }, []);

  // Prevent body scroll when mobile menu open + focus trap
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFeedbackStatus("submitting"); setFeedbackMessage("");
    try {
      const response = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...feedbackForm, rating: Number(feedbackForm.rating) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Feedback could not be sent right now.");
      setFeedbackStatus("success"); setFeedbackMessage(data.message ?? "Thanks — your feedback is waiting for moderation."); setFeedbackForm(EMPTY_FEEDBACK);
    } catch (error) { setFeedbackStatus("error"); setFeedbackMessage(error instanceof Error ? error.message : "Feedback could not be sent right now."); }
  };

  const scrollTo = (id: string) => { setMobileOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }); };
  const navItems = ["how", "features", "feedback", "faq"];
  const navLabel = (id: string) => id === "how" ? "How it works" : id[0].toUpperCase() + id.slice(1);

  return (
    <div ref={landingShellRef} id="top" className="landing-shell min-h-screen pb-[96px] lg:pb-0">
      <header ref={landingHeaderRef} className={cn("landing-header sticky top-0 z-40", scrolled && "landing-header-scrolled", mobileOpen && "landing-header-open")}>
        <div className="landing-wrap flex h-[64px] items-center justify-between"><Wordmark /><nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">{navItems.map((id) => <button key={id} onClick={() => scrollTo(id)} className="landing-nav-link min-h-11 rounded-full px-3.5 text-[13px] font-medium">{navLabel(id)}</button>)}</nav><div className="flex items-center gap-2"><ThemeToggle /><Button asChild variant="ghost" size="sm" className="hidden rounded-full text-[var(--landing-muted)] sm:inline-flex"><Link href="/login">Sign in</Link></Button><Button asChild size="sm" className="hidden rounded-full bg-[var(--landing-signal)] px-5 text-white hover:bg-[var(--landing-signal-dark)] sm:inline-flex"><Link href="/signup">Start free <ArrowRight className="h-3.5 w-3.5" /></Link></Button><button type="button" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)} className="landing-menu-button lg:hidden">{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div></div>
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.button aria-label="Close menu backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 top-[64px] z-30 bg-[var(--landing-ink)]/20 backdrop-blur-sm lg:hidden" />
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} className="landing-mobile-menu relative z-40 overflow-hidden border-t border-[var(--landing-line)] bg-[var(--landing-island-strong)]/95 backdrop-blur-xl lg:hidden">
                <div className="landing-wrap grid gap-1.5 py-4">
                  {navItems.map((id) => (
                    <button key={id} onClick={() => scrollTo(id)} className="flex min-h-[52px] items-center justify-between rounded-2xl border border-[var(--landing-line)] bg-[var(--landing-paper)] px-4 text-left text-[15px] font-medium text-[var(--landing-ink)] active:bg-[var(--landing-paper-deep)]">
                      <span>{navLabel(id)}</span><ArrowRight className="h-4 w-4 text-[var(--landing-muted)]" />
                    </button>
                  ))}
                  <div className="mt-2 grid gap-2">
                    <Button asChild className="h-12 rounded-full bg-[var(--landing-signal)] text-[15px] font-semibold text-[var(--landing-action-ink)] hover:bg-[var(--landing-signal-dark)]"><Link href="/signup" onClick={() => setMobileOpen(false)}>Start free — no credit card <ArrowRight className="h-4 w-4" /></Link></Button>
                    <Button asChild variant="secondary" className="h-12 rounded-full border-[var(--landing-line)] bg-transparent text-[var(--landing-ink)]"><Link href="/demo" onClick={() => setMobileOpen(false)}><Eye className="h-4 w-4" /> Explore live demo</Link></Button>
                    <Button asChild variant="ghost" className="h-11 rounded-full"><Link href="/login" onClick={() => setMobileOpen(false)}>Sign in</Link></Button>
                  </div>
                  <p className="pt-2 text-center mono text-[10px] tracking-[0.08em] text-[var(--landing-muted)]">Trusted by educators · Meta Graph OAuth · Encrypted & revocable</p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      <main id="main-content">
        <section className="landing-hero" aria-labelledby="hero-heading"><div className="landing-wrap landing-hero-grid"><motion.div initial={reduceMotion ? undefined : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}><p className="landing-overline"><i aria-hidden="true" /> SOCIAL INTELLIGENCE FOR PEOPLE WHO TEACH</p><h1 id="hero-heading">Your audience leaves signals.<br /><em>Keep the pattern.</em></h1><p className="landing-hero-copy">EduVerse turns real Instagram, Facebook, and Threads engagement into a memory you can act on — what worked, why it worked, and what to post next.</p><p className="landing-hero-activation">Free to start · no card · connect Meta when you&apos;re ready for live data.</p><div className="landing-actions"><Button asChild className="h-12 rounded-full bg-[var(--landing-signal)] px-6 text-white shadow-[0_10px_24px_rgba(182,83,39,0.2)] hover:bg-[var(--landing-signal-dark)]"><Link href="/signup">Start free <ArrowRight className="h-4 w-4" /></Link></Button><Link href="/demo" className="landing-text-link"><Eye className="h-4 w-4" /> Preview the demo</Link></div><div className="landing-proof-row"><span><Check aria-hidden="true" /> No credit card</span><span><LockKeyhole aria-hidden="true" /> Encrypted &amp; revocable</span></div></motion.div><motion.div initial={reduceMotion ? undefined : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}><SignalBoard /></motion.div></div></section>

        <div className="landing-wrap landing-platform-rail" aria-label="Supported platforms"><span className="landing-rail-label">ONE MEMORY / THREE SOURCES</span><div className="landing-platforms"><span><i className="platform-dot platform-dot-ig" /> Instagram</span><span><i className="platform-dot platform-dot-fb" /> Facebook</span><span><i className="platform-dot platform-dot-th" /> Threads</span></div><span className="landing-rail-label landing-rail-right">OFFICIAL META GRAPH API</span></div>

        {/* Desktop: original two-col. Mobile: beautiful expandable stacked */}
        <section id="how" className="landing-section landing-section-rule" aria-labelledby="how-heading">
          <div className="landing-wrap">
            {/* Mobile beautiful expandables */}
            <div className="grid gap-3 lg:hidden">
              <div className="text-center">
                <p className="landing-section-label">THE MEMORY LOOP</p><h2 id="how-heading-mobile" className="mt-3 font-display text-[26px] font-semibold leading-[0.95] tracking-[-0.05em] text-[var(--landing-ink)]">A post becomes useful when the reason stays with it.</h2><p className="mx-auto mt-3 max-w-[32ch] text-sm leading-6 text-[var(--landing-muted)]">Tap to explore each step — compact, clear, no scrolling marathon.</p>
              </div>
              <MobileExpandable kicker="STEP 01" title="Connect once" subtitle="Link Meta sources in one OAuth" icon={<Sparkles className="h-4 w-4" />} defaultOpen>
                <p className="text-sm leading-6 text-[var(--landing-muted)]">Link Instagram Business, Facebook Pages, or Threads through Meta’s official consent flow. Tokens encrypted, revocable anytime.</p>
              </MobileExpandable>
              <MobileExpandable kicker="STEP 02" title="Read the signal" subtitle="Reach, saves, timing in one view" icon={<BarChart3 className="h-4 w-4" />}>
                <p className="text-sm leading-6 text-[var(--landing-muted)]">Reach, saves, comments, timing, and post format arrive together in one live timeline — no tab hopping.</p>
              </MobileExpandable>
              <MobileExpandable kicker="STEP 03" title="Keep the reason" subtitle="Every suggestion has receipts" icon={<Layers className="h-4 w-4" />}>
                <p className="text-sm leading-6 text-[var(--landing-muted)]">Every recommendation points back to the post and signal that earned it. Provenance, not guesswork.</p>
              </MobileExpandable>
            </div>
            {/* Desktop unchanged */}
            <div className="hidden lg:grid landing-two-col"><div className="landing-section-intro"><p className="landing-section-label">THE MEMORY LOOP</p><h2 id="how-heading">A post becomes useful when the reason stays with it.</h2><p>Most dashboards make you re-learn the same lesson every week. EduVerse keeps the signal attached to the work, so your next decision starts further ahead.</p></div><MemoryStages /></div>
          </div>
        </section>

        <section id="features" className="landing-section landing-section-quiet" aria-labelledby="features-heading">
          <div className="landing-wrap">
            {/* Mobile: expandable feature cards */}
            <div className="lg:hidden">
              <div className="text-center">
                <p className="landing-section-label">BUILT FOR THE NEXT POST</p><h2 className="mx-auto mt-3 max-w-[14ch] font-display text-[26px] font-semibold leading-[0.95] tracking-[-0.06em] text-[var(--landing-ink)]">Less dashboard theatre. <em className="font-serif font-normal text-[var(--landing-signal)]">More useful context.</em></h2>
              </div>
              <div className="mt-6 grid gap-3">
                {featureColumns.map(({ icon: Icon, title, copy, kicker }) => (
                  <MobileExpandable key={title} kicker={kicker} title={title} subtitle={copy.slice(0, 44) + "…"} icon={<Icon className="h-4 w-4" />}>
                    <div className="flex gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--landing-paper-deep)] text-[var(--landing-signal)]"><Icon className="h-5 w-5" /></span>
                      <div>
                        <h3 className="font-display text-[15px] font-semibold text-[var(--landing-ink)]">{title}</h3>
                        <p className="mt-1 text-sm leading-6 text-[var(--landing-muted)]">{copy}</p>
                      </div>
                    </div>
                  </MobileExpandable>
                ))}
              </div>
            </div>
            {/* Desktop */}
            <div className="hidden lg:block"><div className="landing-section-intro landing-section-intro-wide"><p className="landing-section-label">BUILT FOR THE NEXT POST</p><h2 id="features-heading">Less dashboard theatre.<br /><em>More useful context.</em></h2></div><div className="landing-feature-grid">{featureColumns.map(({ icon: Icon, title, copy }) => <article key={title} className="landing-feature"><Icon aria-hidden="true" className="h-5 w-5 text-[var(--landing-signal)]" /><h3>{title}</h3><p>{copy}</p></article>)}</div></div>
          </div>
        </section>

        <section className="landing-wrap landing-receipt-section" aria-labelledby="receipt-heading">
          {/* Mobile collapsed */}
          <div className="lg:hidden">
            <MobileExpandable kicker="RECOMMENDATION RECEIPT" title="Repeat the format that earned saves." subtitle="Sample provenance included" icon={<Zap className="h-4 w-4" />} defaultOpen>
              <div className="space-y-4">
                <p className="text-sm leading-6 text-[var(--landing-muted)]">“Exam prep carousel” outperformed your recent post average by 3.2× on saves.</p>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between rounded-xl border border-[var(--landing-line)] bg-[var(--landing-paper)] px-3 py-2.5"><span className="mono text-[11px] text-[var(--landing-muted)]">RECOMMENDATION</span><strong className="text-sm text-[var(--landing-ink)]">Carousel</strong></div>
                  <div className="flex items-center justify-between rounded-xl border border-[var(--landing-line)] bg-[var(--landing-paper)] px-3 py-2.5"><span className="mono text-[11px] text-[var(--landing-muted)]">BEST WINDOW</span><strong className="text-sm text-[var(--landing-ink)]">Wed · 18:30</strong></div>
                  <div className="flex items-center justify-between rounded-xl border border-[var(--landing-line)] bg-[var(--landing-paper)] px-3 py-2.5"><span className="mono text-[11px] text-[var(--landing-muted)]">SOURCE SIGNAL</span><strong className="text-sm text-[var(--landing-ink)]">Save velocity</strong></div>
                </div>
                <Link href="/demo" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[var(--landing-signal)] px-4 py-2.5 text-sm font-semibold text-[var(--landing-action-ink)]">See sample provenance <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </MobileExpandable>
          </div>
          {/* Desktop */}
          <div className="hidden lg:block">
            <div className="signal-receipt"><div className="signal-receipt-header"><span>RECOMMENDATION RECEIPT</span><span>SIMULATED WORKSPACE · AUG 12</span></div><div className="signal-receipt-grid"><div><p className="signal-board-kicker">WHY THIS?</p><h2 id="receipt-heading">Repeat the format<br /><em>that earned saves.</em></h2><p className="signal-receipt-copy">“Exam prep carousel” outperformed your recent post average by 3.2× on saves.</p></div><div className="signal-receipt-data"><div><span>RECOMMENDATION</span><strong>Carousel</strong></div><div><span>BEST WINDOW</span><strong>Wed · 18:30</strong></div><div><span>SOURCE SIGNAL</span><strong>Save velocity</strong></div><Link href="/demo" className="signal-receipt-link">See sample provenance <ArrowRight aria-hidden="true" /></Link></div></div></div>
          </div>
        </section>

        <section id="feedback" className="landing-section landing-section-rule" aria-labelledby="feedback-heading"><div className="landing-wrap">
          {/* Mobile expandable wrapper */}
          <div className="lg:hidden">
            <MobileExpandable kicker="EARLY NOTES" title={reviews.length ? `${reviews.length} verified notes` : "Be the first to leave a note"} subtitle="People are still writing the first draft." icon={<Star className="h-4 w-4" />} defaultOpen>
              <div className="space-y-4">
                {(loadingReviews ? Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--landing-paper-deep)]" />) : reviews.length ? reviews.slice(0,2).map((review) => (
                  <article key={review.id} className="rounded-xl border border-[var(--landing-line)] bg-[var(--landing-paper)] p-4">
                    <div className="flex gap-1">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("h-3.5 w-3.5", i < review.rating ? "fill-[var(--landing-signal)] text-[var(--landing-signal)]" : "text-[var(--landing-line)]")} />)}</div>
                    <blockquote className="mt-2 font-serif text-sm leading-6 text-[var(--landing-ink)]">“{review.content}”</blockquote>
                    <footer className="mt-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--landing-ink)] mono text-[10px] text-white">{review.name.split(" ").map((p) => p[0]).join("").slice(0,2)}</span><div><strong className="text-xs text-[var(--landing-ink)]">{review.name}</strong><small className="ml-1 text-xs text-[var(--landing-muted)]">{review.role ?? "Creator"}</small></div></footer>
                  </article>
                )) : <p className="rounded-xl border border-dashed border-[var(--landing-line)] p-6 text-center text-sm text-[var(--landing-muted)]">No approved notes yet — yours could be first.</p>)}
                <details className="group">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-xl border border-[var(--landing-line)] bg-[var(--landing-paper)] px-4 py-3 text-sm font-semibold text-[var(--landing-ink)]">Share your experience <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
                  <div className="pt-3">
                    <MobileFeedbackForm feedbackForm={feedbackForm} setFeedbackForm={setFeedbackForm} feedbackStatus={feedbackStatus} feedbackMessage={feedbackMessage} submitFeedback={submitFeedback} />
                  </div>
                </details>
              </div>
            </MobileExpandable>
          </div>

          {/* Desktop original */}
          <div className="hidden lg:block">
            <div className="landing-section-heading-row"><div><p className="landing-section-label">EARLY NOTES</p><h2 id="feedback-heading">People are still writing the first draft.</h2></div><span className="landing-count">{reviews.length ? `${reviews.length} VERIFIED NOTES` : "NO APPROVED NOTES YET"}</span></div><div className={cn("landing-feedback-grid", !loadingReviews && !reviews.length && "landing-feedback-empty")}>{(loadingReviews || reviews.length > 0) && <div className="landing-reviews">{(loadingReviews ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="landing-review landing-review-skeleton" />) : reviews.slice(0, 3).map((review) => <article key={review.id} className="landing-review"><div className="landing-stars">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={cn("h-3.5 w-3.5", index < review.rating ? "fill-[var(--landing-signal)] text-[var(--landing-signal)]" : "text-[var(--landing-line]")} />)}</div><blockquote>“{review.content}”</blockquote><footer><span>{review.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><strong>{review.name}</strong><small>{review.role ?? "Creator"}</small></div></footer></article>))}</div>}<form onSubmit={submitFeedback} className="landing-feedback-form landing-glass-island"><p className="landing-section-label">SHARE YOUR EXPERIENCE</p><h3>Give feedback.</h3><p>Tell us what helped or what needs work. Submissions are moderated before they appear publicly.</p><div className="landing-form-grid"><label>Name<input required maxLength={80} autoComplete="name" value={feedbackForm.name} onChange={(event) => setFeedbackForm((current) => ({ ...current, name: event.target.value }))} /></label><label>Role <span>(optional)</span><input maxLength={120} autoComplete="organization-title" value={feedbackForm.role} onChange={(event) => setFeedbackForm((current) => ({ ...current, role: event.target.value }))} /></label></div><label className="mt-3 block">Feedback<textarea required maxLength={2000} rows={4} value={feedbackForm.content} onChange={(event) => setFeedbackForm((current) => ({ ...current, content: event.target.value }))} placeholder="What helped? What needs work?" /></label><fieldset><legend>Rating</legend><div className="landing-rating-group">{[1,2,3,4,5].map((value) => <label key={value}><input type="radio" name="rating" value={value} checked={feedbackForm.rating===value} onChange={() => setFeedbackForm((c)=>({ ...c, rating: value }))} /><span>{value}</span></label>)}</div></fieldset><Button type="submit" disabled={feedbackStatus==="submitting"} className="mt-4 w-full rounded-full bg-[var(--landing-signal)] text-[var(--landing-action-ink)] hover:bg-[var(--landing-signal-dark)]">{feedbackStatus==="submitting" ? "Sending…" : "Submit for moderation"}</Button>{feedbackMessage && <p className={cn("mt-3 rounded-xl px-3 py-2 text-sm", feedbackStatus==="error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>{feedbackMessage}</p>}</form></div>
          </div>
        </div></section>

        <section id="pricing" className="landing-wrap landing-demo-section"><div className="landing-demo-strip"><div><p className="landing-section-label">WANT TO LOOK AROUND FIRST?</p><h2>See the workflow before you connect.</h2><p>Read-only demo. Simulated numbers clearly labeled. No login needed.</p></div><Button asChild variant="secondary" className="rounded-full border-[var(--landing-line)] bg-transparent text-[var(--landing-ink)] hover:bg-[var(--landing-paper)]"><Link href="/demo"><Eye className="h-4 w-4" /> Open the demo</Link></Button></div></section>

        <section id="faq" className="landing-section landing-section-quiet" aria-labelledby="faq-heading">
          {/* Mobile accordion beautiful */}
          <div className="landing-wrap lg:hidden">
            <p className="landing-section-label text-center">PLAIN ANSWERS</p><h2 className="mx-auto mt-3 max-w-[16ch] text-center font-display text-[26px] font-semibold leading-[0.95] tracking-[-0.05em]">Questions worth asking before you connect.</h2>
            <div className="mt-6 grid gap-3">
              {FAQS.slice(0,4).map((faq) => (
                <MobileExpandable key={faq.question} title={faq.question} kicker="FAQ">
                  <p className="text-sm leading-6 text-[var(--landing-muted)]">{faq.answer}</p>
                </MobileExpandable>
              ))}
            </div>
          </div>
          <div className="hidden lg:block landing-wrap landing-two-col landing-faq-grid"><div className="landing-section-intro"><p className="landing-section-label">PLAIN ANSWERS</p><h2 id="faq-heading">Questions worth asking before you connect.</h2><p>EduVerse is deliberately clear about what is live, what is simulated, and what stays under your control.</p></div><div className="landing-faq-list">{FAQS.slice(0, 4).map((faq) => <details key={faq.question}><summary>{faq.question}<span><ChevronDown aria-hidden="true" className="h-4 w-4" /></span></summary><p>{faq.answer}</p></details>)}</div></div>
        </section>

        <section className="landing-closing" aria-labelledby="closing-heading"><div className="landing-wrap landing-closing-inner"><p className="landing-overline"><i aria-hidden="true" /> LIVE-ONLY · NO FAKE METRICS</p><h2 id="closing-heading">Stop guessing.<br /><em>Start remembering.</em></h2><p>Connect Meta to see your real engagement, or preview the workflow first with clearly labeled sample data.</p><div className="landing-actions landing-actions-centered"><Button asChild className="h-12 rounded-full bg-[var(--landing-signal)] px-6 text-white hover:bg-[var(--landing-signal-dark)]"><Link href="/signup">Start free <ArrowRight className="h-4 w-4" /></Link></Button><Button asChild variant="secondary" className="h-12 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link href="/demo"><Eye className="h-4 w-4" /> Preview the demo</Link></Button></div><p className="landing-privacy-note">By connecting you agree to <Link href="/privacy">Privacy</Link> · AES-256-GCM · RLS · revocable.</p></div></section>
      </main>

      <LandingMobileDock />
    </div>
  );
}

type FeedbackFormState = typeof EMPTY_FEEDBACK;
function MobileFeedbackForm({
  feedbackForm,
  setFeedbackForm,
  feedbackStatus,
  feedbackMessage,
  submitFeedback,
}: {
  feedbackForm: FeedbackFormState;
  setFeedbackForm: React.Dispatch<React.SetStateAction<FeedbackFormState>>;
  feedbackStatus: "idle" | "submitting" | "success" | "error";
  feedbackMessage: string;
  submitFeedback: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={submitFeedback} className="grid gap-3 rounded-2xl border border-[var(--landing-line)] bg-[var(--landing-paper)] p-4">
      <div className="grid gap-3">
        <label className="text-xs font-semibold text-[var(--landing-ink)]">Name<input required maxLength={80} value={feedbackForm.name} onChange={(e) => setFeedbackForm((c) => ({ ...c, name: e.target.value }))} className="mt-1 w-full rounded-xl border border-[var(--landing-line)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--landing-signal)]" placeholder="Ada Lovelace" /></label>
        <label className="text-xs font-semibold text-[var(--landing-ink)]">Role <span className="font-normal text-[var(--landing-muted)]">(optional)</span><input maxLength={120} value={feedbackForm.role} onChange={(e) => setFeedbackForm((c) => ({ ...c, role: e.target.value }))} className="mt-1 w-full rounded-xl border border-[var(--landing-line)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--landing-signal)]" placeholder="Educator, creator…" /></label>
        <label className="text-xs font-semibold text-[var(--landing-ink)]">Feedback<textarea required maxLength={2000} rows={3} value={feedbackForm.content} onChange={(e) => setFeedbackForm((c) => ({ ...c, content: e.target.value }))} className="mt-1 w-full rounded-xl border border-[var(--landing-line)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--landing-signal)]" placeholder="What helped? What needs work?" /></label>
      </div>
      <fieldset className="border-0 p-0">
        <legend className="text-xs font-semibold text-[var(--landing-ink)]">Rating</legend>
        <div className="mt-2 flex gap-2">{[1,2,3,4,5].map((v) => <label key={v} className="flex-1"><input type="radio" name="mobile-rating" value={v} checked={feedbackForm.rating===v} onChange={() => setFeedbackForm((c)=>({ ...c, rating: v }))} className="peer sr-only" /><span className="grid h-11 place-items-center rounded-xl border border-[var(--landing-line)] bg-white text-sm font-medium text-[var(--landing-muted)] peer-checked:border-[var(--landing-signal)] peer-checked:bg-[var(--landing-signal)] peer-checked:text-[var(--landing-action-ink)]">{v}</span></label>)}</div>
      </fieldset>
      <Button type="submit" disabled={feedbackStatus==="submitting"} className="h-12 rounded-full bg-[var(--landing-signal)] text-[var(--landing-action-ink)] hover:bg-[var(--landing-signal-dark)]">{feedbackStatus==="submitting" ? "Sending…" : "Submit for moderation"}</Button>
      {feedbackMessage && <p className={cn("rounded-xl px-3 py-2 text-sm", feedbackStatus==="error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>{feedbackMessage}</p>}
    </form>
  );
}
