"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Eye,
  Film,
  Loader2,
  Lock,
  Menu,
  Sparkles,
  Star,
  X,
  Clapperboard,
  ScanLine
} from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { features, platformLogos } from "@/data/mock";
import { FAQS } from "@/lib/agentic/faq";
import { MetaConnectModal } from "@/components/meta/meta-connect-modal";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { TiltCard } from "@/components/ui/tilt-card";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Meteors } from "@/components/magicui/meteors";
import { Galaxy } from "@/components/ui/galaxy";
import { BlurText } from "@/components/ui/blur-text";
import { EASE_OUT, fadeUp, staggerContainer, staggerItem } from "@/components/motion-variants";

const EASE = EASE_OUT;

type Review = {
  id: string;
  name: string;
  role: string | null;
  rating: number;
  content: string;
  created_at: string;
};

const heroPosts = [
  {
    id: "reel-08-12",
    date: "AUG 12",
    time: "19:30",
    format: "REEL",
    hook: "POV: you open the wrong file and the class gasps",
    reach: "38.4k",
    saves: "1.2k",
    day: 12,
    tone: "bg-[#101215]",
    accent: "text-white",
    accentMuted: "text-white/70",
    isDark: true
  },
  {
    id: "car-07-29",
    date: "JUL 29",
    time: "18:15",
    format: "CAROUSEL",
    hook: "3 slides that fixed my retention",
    reach: "21.7k",
    saves: "892",
    day: 7,
    tone: "bg-[#EAE3D6]",
    accent: "text-[#0F1115]",
    accentMuted: "text-[#0F1115]/60",
    isDark: false
  },
  {
    id: "thr-08-04",
    date: "AUG 04",
    time: "20:45",
    format: "THREAD",
    hook: "Thread: the hook I stole from a syllabus",
    reach: "14.1k",
    saves: "634",
    day: 9,
    tone: "bg-[#FFB43A]",
    accent: "text-[#0F1115]",
    accentMuted: "text-[#0F1115]/60",
    isDark: false
  },
  {
    id: "reel-07-18",
    date: "JUL 18",
    time: "07:30",
    format: "REEL",
    hook: "7am post that shouldn't have worked",
    reach: "9.3k",
    saves: "201",
    day: 3,
    tone: "bg-[#1A1E24]",
    accent: "text-white",
    accentMuted: "text-white/70",
    isDark: true
  },
  {
    id: "car-08-09",
    date: "AUG 09",
    time: "19:00",
    format: "CAROUSEL",
    hook: "Before / after: hook rewrite",
    reach: "31.2k",
    saves: "1.05k",
    day: 11,
    tone: "bg-[#F6F1E9]",
    accent: "text-[#0F1115]",
    accentMuted: "text-[#0F1115]/60",
    isDark: false
  }
] as const;

const timelineHeights = [34, 52, 78, 88, 84, 96, 68];
const nextRec = {
  when: "TUE 19:30",
  format: "CAROUSEL",
  hook: "Steal the Jul 29 carousel hook",
  provenance: "Because carousels saved 3.2× at night — peak on Aug 12 at 19:30"
};

function ReviewStars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={cn("h-3 w-3", star <= rating ? "fill-[var(--accent)] text-[var(--accent)]" : "text-faintText")} />
      ))}
    </span>
  );
}

function Wordmark({ className }: { className?: string }) {
  return (
    <a aria-label="EduVerse home" className={cn("inline-flex items-center gap-2.5", className)} href="#top">
      <img src="/icon.svg" alt="" width={36} height={36} className="h-9 w-9 rounded-[9px] object-cover ring-1 ring-black/5 shadow-sm" />
      <span className="font-display text-[1.28rem] font-[700] tracking-[-0.03em] text-ink">
        Edu<span className="font-[400] text-[var(--accent-strong)]">Verse</span>
      </span>
    </a>
  );
}

export function LandingPage() {
  const router = useRouter();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [scrub, setScrub] = useState(0);
  const selected = heroPosts[scrub];

  const handleConnectClick = async () => {
    if (checkingAuth) return;
    setCheckingAuth(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      let supabase: ReturnType<typeof createClient> | null = null;
      try {
        supabase = createClient();
      } catch {
        router.push("/login?next=/dashboard/settings");
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=/dashboard/settings");
        return;
      }
      // double-check server still sees session (covers stale client)
      const res = await fetch("/api/meta/connect", { cache: "no-store", credentials: "same-origin" });
      if (res.status === 401 || res.status === 403) {
        router.push("/login?next=/dashboard/settings");
        return;
      }
    } catch {
      router.push("/login?next=/dashboard/settings");
      return;
    } finally {
      setCheckingAuth(false);
    }
    setConnectModalOpen(true);
  };

  const [activeFeature, setActiveFeature] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerRole, setReviewerRole] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [marqueePaused, setMarqueePaused] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const scrollBehavior = prefersReducedMotion ? "auto" : "smooth";
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOrbY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const heroOrbScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (latest) => setScrolled(latest > 16));

  const handleFeedbackSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!feedback.trim() || !reviewerName.trim()) return;
    setFeedbackSubmitting(true);
    setFeedbackError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: reviewerName.trim(),
          role: reviewerRole.trim() || undefined,
          rating: feedbackRating,
          content: feedback.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.review) {
        setReviews((current) => [data.review as Review, ...current]);
        setFeedbackSent(true);
        setFeedback("");
        setReviewerName("");
        setReviewerRole("");
      } else if (res.ok) {
        setReviewsLoading(true);
        fetch("/api/reviews", { cache: "no-store" })
          .then((refresh) => (refresh.ok ? refresh.json() : { reviews: [] }))
          .then((refreshed) => setReviews((refreshed.reviews ?? []) as Review[]))
          .catch(() => undefined)
          .finally(() => setReviewsLoading(false));
        setFeedbackSent(true);
        setFeedback("");
        setReviewerName("");
        setReviewerRole("");
      } else {
        setFeedbackError(data.error || "Could not submit the review.");
      }
    } catch {
      setFeedbackError("Could not reach the review service.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  useEffect(() => {
    fetch("/api/reviews", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { reviews: [] }))
      .then((data) => setReviews((data.reviews ?? []) as Review[]))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const t = setInterval(() => setScrub((s) => (s + 1) % 3), 4200);
    return () => clearInterval(t);
  }, [prefersReducedMotion]);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: scrollBehavior, block: "start" });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = pageRef.current;
    if (!el || event.pointerType === "touch") return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
  };

  return (
    <div ref={pageRef} onPointerMove={handlePointerMove} id="top" className="spotlight-bay min-h-screen bg-background text-ink selection:bg-accent-soft selection:text-ink">
      {/* Header — ink rule, tally, timecode */}
      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-[background-color,backdrop-filter] duration-300",
          scrolled || mobileMenuOpen
            ? "border-borderSoft bg-background/90 backdrop-blur-xl"
            : "border-transparent bg-transparent"
        )}
      >
        <div className="mx-auto flex min-h-[68px] max-w-[1280px] items-center justify-between px-5 sm:px-8">
          <Wordmark />
          <nav className="hidden lg:flex items-center gap-1 text-[13px] font-medium">
            {[
              ["How it works", "telemetry"],
              ["Features", "features"],
              ["Reviews", "proof"],
              ["FAQ", "faq"]
            ].map(([label, id]) => (
              <button key={id} onClick={() => scrollToSection(id)} className="rounded-full px-3.5 py-2 text-mutedText hover:bg-surface hover:text-ink transition">
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" className="hidden sm:inline-flex bg-ink text-background hover:bg-ink/90 rounded-full px-4">
              <Link href="/login">
                Open dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <button
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
              className="grid h-10 w-10 place-items-center rounded-full border border-borderSoft bg-surface text-ink lg:hidden"
              onClick={() => setMobileMenuOpen((o) => !o)}
              type="button"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24, ease: EASE }}
              className="overflow-hidden border-t border-borderSoft bg-background lg:hidden"
            >
              <div className="space-y-1 px-5 py-4">
                {[
                  ["How it works", "telemetry"],
                  ["Features", "features"],
                  ["Reviews", "proof"],
                  ["FAQ", "faq"]
                ].map(([label, id]) => (
                  <button key={id} onClick={() => scrollToSection(id)} className="block w-full rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-surface" type="button">
                    {label}
                  </button>
                ))}
                <Button asChild className="mt-2 w-full bg-ink text-background rounded-full">
                  <Link href="/login">
                    Open dashboard <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <MetaConnectModal isOpen={connectModalOpen} onClose={() => setConnectModalOpen(false)} />

      <main id="main-content">
        {/* HERO — Edit Bay + Light Table : thesis is scrub = memory — galaxy + magicui aurora */}
        <section ref={heroRef} className="relative overflow-hidden">
          <Galaxy className="opacity-60" />
          <div className="hero-ambient opacity-80" aria-hidden />
          <motion.div style={{ y: heroOrbY, scale: heroOrbScale, x: "-50%" }} className="hero-orb" aria-hidden />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-background/45" />
            <div className="absolute inset-0 opacity-[0.05] texture-dots" aria-hidden />
          </div>

          <div className="relative mx-auto max-w-[1280px] px-5 sm:px-8 pt-8 sm:pt-10 pb-10">
            {/* top timecode bar - distilled */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono tracking-widest text-mutedText">
              <span className="inline-flex h-5 items-center rounded bg-ink px-2 text-[10px] font-bold tracking-[0.18em] text-background">REC ●</span>
              <span>14-DAY MEMORY</span>
              <span className="opacity-40">—</span>
              <span>NO FAKE METRICS</span>
            </div>

            {/* hero title */}
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <h1 className="text-balance font-display text-[2.7rem] font-[700] leading-[0.92] tracking-[-0.04em] text-ink sm:text-[3.6rem] lg:text-[4.35rem]">
                  <BlurText text="Your audience" delay={0.1} />
                  <br />
                  <BlurText text="has a memory." delay={0.3} className="font-[400] tracking-[-0.03em]" />
                  <br />
                  <motion.span initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.9, delay: 0.8, ease: [0.16, 1, 0.3, 1] }} className="relative inline-block overflow-hidden">
                    <span className="relative">We keep it.</span>
                    <span className="absolute -bottom-1 left-0 h-[8px] w-full bg-[var(--accent)] opacity-90" aria-hidden />
                  </motion.span>
                </h1>
                <p className="mt-5 max-w-[54ch] text-[15px] leading-7 text-mutedText sm:text-[16px]">
                  EduVerse indexes real Instagram Reels, Facebook Pages, and Threads engagement — reach, saves, posting windows — into a persistent memory. Scrub the timeline: every frame shows what actually happened and what to post next.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button asChild className="rounded-full bg-ink px-6 py-6 text-sm text-background hover:bg-ink/90 relative overflow-hidden shimmer-sweep">
                    <Link href="/signup">
                      Start free <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <a href="/demo" className="inline-flex items-center gap-1.5 rounded-full border border-borderSoft bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-muted transition">
                    Explore sandbox — no login <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 font-medium text-success">
                    <Check className="h-3 w-3" /> No credit card
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-borderSoft px-2.5 py-1 font-medium text-mutedText">
                    IG · FB · Threads · Encrypted
                  </span>
                </div>
              </div>

              {/* right: credibility flag */}
              <div className="hidden lg:flex justify-end">
                <div className="max-w-[34ch] rounded-2xl border border-borderSoft bg-surface p-4 text-sm leading-6 text-mutedText">
                  <p className="font-display text-sm font-semibold tracking-tight text-ink">For solo creators who post like a team.</p>
                  <p className="mt-1">Turn everyday posts into compounding intelligence — no hiring a social team, no inventing numbers.</p>
                  <div className="mt-3 flex gap-2 text-[11px] font-mono">
                    <span className="rounded bg-ink px-2 py-1 text-background">01</span>
                    <span className="rounded bg-[var(--accent)] px-2 py-1 font-bold text-ink">LIVE ONLY</span>
                    <span className="rounded border border-borderSoft bg-background px-2 py-1">PROVENANCE</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* CONTACT SHEET — how it works (no kicker) */}
        <section id="telemetry" className="mx-auto max-w-[1280px] scroll-mt-24 px-5 sm:px-8 py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div className="lg:sticky lg:top-[88px]">
              <h2 className="text-balance font-display text-[30px] font-[700] leading-[0.98] tracking-[-0.03em] sm:text-[38px]">
                How a post becomes memory.
              </h2>
              <p className="mt-4 max-w-[56ch] text-[15px] leading-7 text-mutedText">
                Three prints on the contact sheet. Each one is a promise that no number is invented — only indexed from Meta and then kept.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-mono">
                <span className="rounded-full bg-ink px-3 py-1.5 text-background">CONTACT SHEET 01–03</span>
                <span className="rounded-full border border-borderSoft bg-surface px-3 py-1.5 text-mutedText">GREASE-PEN KEPT MARKS ARE REAL</span>
              </div>
              <div className="mt-8 hidden lg:block rounded-2xl border border-borderSoft bg-surface p-4">
                <p className="text-xs font-mono tracking-widest text-mutedText">EDITOR NOTE</p>
                <p className="mt-2 text-sm leading-6 text-mutedText">Leave a frame empty? The bay shows empty — never a placeholder chart. That honesty is the product.</p>
              </div>
            </div>

            <div className="grid gap-4">
              {[
                {
                  n: "01",
                  tc: "00:01",
                  title: "Connect the gate",
                  text: "Link Instagram Business or Facebook Page once through Meta OAuth. Tokens are AES-256-GCM encrypted, workspace-scoped, revocable. Until you do, the bay stays dark.",
                  meta: "FB+IG OAuth · 30-day long-lived token",
                  tone: "bg-ink text-background"
                },
                {
                  n: "02",
                  tc: "00:14",
                  title: "Index what happened",
                  text: "Reach, saves, comments, post timing — indexed in parallel from Graph API, cached per-day, with per-platform graceful failure. Empty states guide you to connect.",
                  meta: "14-day window · per-day cache · ?refresh=1 bypass",
                  tone: "bg-[var(--accent)] text-ink"
                },
                {
                  n: "03",
                  tc: "00:27",
                  title: "Publish with provenance",
                  text: "Every recommendation shows why: the exact post and signal it came from. Publish now or schedule — idempotent, permission-checked, retry-safe.",
                  meta: "Idempotency key · concurrency 3 · MAX_ATTEMPTS 4",
                  tone: "bg-surface border border-borderSoft"
                }
              ].map((step) => (
                <div key={step.n} className={cn("relative overflow-hidden rounded-2xl p-5 sm:p-6", step.tone)}>
                  <div className="pointer-events-none absolute right-4 top-4 text-[11px] font-mono tracking-widest opacity-60">{step.tc}</div>
                  <div className="flex gap-4">
                    <div className={cn("hidden sm:grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg font-display font-bold tracking-tight", step.tone.includes("bg-ink") ? "bg-background/10 text-background" : step.tone.includes("bg-[var(--accent)]") ? "bg-ink/10 text-ink" : "bg-ink/5 text-ink")}>{step.n}</div>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold tracking-tight">{step.title}</h3>
                      <p className={cn("mt-2 text-sm leading-6", step.tone.includes("bg-ink") ? "text-background/70" : step.tone.includes("bg-[var(--accent)]") ? "text-ink/70" : "text-mutedText")}>{step.text}</p>
                      <p className={cn("mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-mono", step.tone.includes("bg-ink") ? "bg-background/10 text-background/70" : "bg-ink text-background")}>{step.meta}</p>
                    </div>
                  </div>
                  {/* red grease keep mark */}
                  <span className="pointer-events-none absolute -bottom-2 -right-2 rotate-[-8deg] rounded-full border-2 border-[var(--warn)] px-3 py-1 text-[10px] font-mono font-bold tracking-[0.16em] text-[var(--warn)] opacity-80">KEPT</span>
                </div>
              ))}
              <div className="rounded-2xl border border-dashed border-borderSoft bg-surface/60 p-4 text-sm leading-6 text-mutedText">
                <span className="font-semibold text-ink">Sandbox alternative:</span> want to look before you connect? Jump to the monitor wall — simulated metrics clearly labeled, no tokens stored. <a href="/demo" className="font-medium text-ink underline decoration-borderSoft underline-offset-4 hover:decoration-ink">Open demo →</a>
              </div>
            </div>
          </div>
        </section>

        {/* SPROCKET MARQUEE — platforms */}
        <section className="border-y border-borderSoft bg-surface">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-8 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono tracking-[0.18em] text-mutedText">
              <span>ONE FEED · THREE GATES</span>
              <span className="hidden sm:inline">LIVE VIA OFFICIAL META GRAPH API</span>
            </div>
            <div className="marquee-mask mt-4 rounded-xl border border-borderSoft bg-background">
              <div
                className="marquee flex w-max items-center py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{ animationPlayState: marqueePaused ? "paused" : undefined }}
                tabIndex={0}
                role="group"
                aria-label="Supported platforms"
                onFocus={() => setMarqueePaused(true)}
                onBlur={() => setMarqueePaused(false)}
              >
                {[0, 1, 2].map((copy) => (
                  <div aria-hidden={copy > 0} className="flex items-center" key={copy}>
                    {platformLogos
                      .filter((p) => ["instagram", "facebook", "threads"].includes(p.slug))
                      .map((plat) => (
                        <div key={`${copy}-${plat.slug}`} className="mx-6 flex items-center gap-2.5 sm:mx-8 text-ink">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-background">
                            <svg aria-hidden className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                              <path d={plat.svgPath} />
                            </svg>
                          </span>
                          <span className="font-display text-[15px] font-semibold tracking-tight">{plat.name}</span>
                          <span className="hidden sm:inline text-[11px] font-mono tracking-widest text-mutedText">GATE {plat.slug.toUpperCase()}</span>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* BIN — features as bento (avoids same-size cards) */}
        <section id="features" className="mx-auto max-w-[1280px] scroll-mt-24 px-5 sm:px-8 py-12 sm:py-20">
          <div className="max-w-[720px]">
            <h2 className="text-balance font-display text-[30px] font-[700] leading-[0.98] tracking-[-0.03em] sm:text-[40px]">
              Three tapes. One bin.
              <br />
              <span className="font-[400] text-mutedText">Only what removes guesswork.</span>
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-mutedText">Live Meta callbacks + long-term memory. The rest stays in the bin until you need it.</p>
          </div>

          <motion.div
            className="mt-8 grid gap-4 lg:grid-cols-12"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.08 }}
          >
            {/* Row 1: big memory + telemetry */}
            <motion.button
              variants={staggerItem}
              onClick={() => setActiveFeature(0)}
              aria-pressed={activeFeature === 0}
              className={cn(
                "group relative overflow-hidden rounded-[20px] border p-6 text-left lg:col-span-7",
                activeFeature === 0 ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-borderSoft bg-surface hover:border-[var(--accent)]/30"
              )}
            >
              <span className="inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.16em] text-mutedText">
                <span className={cn("h-2 w-2 rounded-full", activeFeature === 0 ? "bg-[var(--accent)] tally-dot" : "bg-borderSoft")} /> BIN A · MEMORY
              </span>
              <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">Meta Graph Memory</h3>
              <p className="mt-2 max-w-[52ch] text-sm leading-6 text-mutedText">Continuously learns from every Reel, Page post, and Thread — performance is predicted from your actual engagement, not a template.</p>
              <div className="mt-4 flex gap-1.5">
                {["REEL", "POST", "THREAD"].map((t) => (
                  <span key={t} className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-mono tracking-widest text-background">
                    {t}
                  </span>
                ))}
              </div>
            </motion.button>

            <motion.button
              variants={staggerItem}
              onClick={() => setActiveFeature(1)}
              aria-pressed={activeFeature === 1}
              className={cn(
                "relative overflow-hidden rounded-[20px] border p-6 text-left lg:col-span-5",
                activeFeature === 1 ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-borderSoft bg-surface hover:border-[var(--accent)]/30"
              )}
            >
              <span className="text-[11px] font-mono tracking-[0.16em] text-mutedText">BIN B · TELEMETRY</span>
              <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">Cross-Platform Telemetry</h3>
              <p className="mt-2 text-sm leading-6 text-mutedText">Reach, save velocity, and comment sentiment across all gates — one timeline, three lines.</p>
            </motion.button>

            {/* distilled: the other tapes tuck into the bin — expand via dashboard */}
            <p className="lg:col-span-12 text-xs text-mutedText">
              <span className="font-medium text-ink">Also in the bin:</span> Audience Sentiment, Publishing Windows, Hook Intelligence — all live in your dashboard, we surface only the next step here.
            </p>

            {/* Row 3: dispatch */}
            <motion.button
              variants={staggerItem}
              onClick={() => setActiveFeature(5)}
              aria-pressed={activeFeature === 5}
              className={cn(
                "group relative overflow-hidden rounded-[20px] border p-6 text-left lg:col-span-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
                activeFeature === 5 ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-borderSoft bg-ink text-background hover:border-[var(--accent)]/40"
              )}
            >
              <div>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.16em]",
                    activeFeature === 5 ? "text-mutedText" : "text-background/60"
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] tally-dot" /> BIN F · DISPATCH
                </span>
                <h3 className={cn("mt-2 font-display text-xl font-semibold tracking-tight", activeFeature === 5 ? "text-ink" : "text-background")}>
                  Automated Meta Dispatch
                </h3>
                <p className={cn("mt-1 max-w-[64ch] text-sm leading-6", activeFeature === 5 ? "text-mutedText" : "text-background/60")}>
                  Schedule & publish directly via official Meta Graph API after verified account connection — idempotent, encrypted, retry-safe.
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                  activeFeature === 5 ? "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-ink" : "border-white/20 bg-white/10 text-background"
                )}
              >
                Publishing infra, not theatre <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </motion.button>
          </motion.div>
        </section>

        {/* SELECTS — reviews as pinned Polaroids — verified only, no synthetic testimonials */}
        <section id="proof" className="mx-auto max-w-[1280px] px-5 sm:px-8 py-12 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-[30px] font-[700] leading-[0.98] tracking-[-0.03em] sm:text-[36px]">Selects — kept frames.</h2>
              <p className="mt-1 text-xs leading-relaxed text-mutedText">
                Verified user reviews only — moderated before publication. No synthetic, AI-generated, or paid testimonials. Every card below
                was submitted via the form on this page and approved by a human moderator.
              </p>
            </div>
            {reviews.length > 0 && (
              <p className="text-sm font-mono tracking-widest text-mutedText">
                {reviews.length} SELECTS · {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)} AVG
              </p>
            )}
          </div>

          <motion.div
            className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.08 }}
          >
            {reviewsLoading ? (
              <div className="col-span-full flex items-center gap-2 rounded-2xl border border-dashed border-borderSoft bg-surface p-6 text-sm text-mutedText">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading selects…
              </div>
            ) : reviews.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-borderSoft bg-surface p-10 text-center">
                <Star className="mx-auto h-6 w-6 text-faintText" />
                <p className="mt-3 font-display font-medium">No selects yet — no fake placeholders.</p>
                <p className="mt-1 text-sm text-mutedText">
                  We never show synthetic testimonials. Be the first to leave a verified kept frame — it appears here only after moderation.
                </p>
              </div>
            ) : (
              reviews.slice(0, 3).map((review) => (
                <div
                  key={review.id}
                  className="rounded-[16px] border border-borderSoft bg-surface p-5"
                >
                  <ReviewStars rating={review.rating} />
                  <blockquote className="mt-3 text-sm leading-6 text-ink">“{review.content}”</blockquote>
                  <div className="mt-4 flex items-center gap-3 border-t border-borderSoft pt-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-semibold text-background">
                      {review.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{review.name}</p>
                      {review.role && <p className="truncate text-xs text-mutedText">{review.role}</p>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>

          {reviews.length > 3 && (
            <p className="mt-4 text-center text-xs font-mono tracking-widest text-mutedText">
              <a href="/dashboard/reviews" className="underline decoration-borderSoft underline-offset-4 hover:decoration-ink">View all reviews →</a>
            </p>
          )}
        </section>

        {/* MONITOR WALL — sandbox */}
        <section id="sandbox" className="mx-auto max-w-[1280px] px-5 sm:px-8 py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <h2 className="font-display text-[28px] font-[700] leading-[0.98] tracking-[-0.03em] sm:text-[34px]">Try the bay before you connect.</h2>
              <p className="mt-3 max-w-[58ch] text-[15px] leading-7 text-mutedText">
                Full live features need Meta Graph OAuth — which feels heavy before you’ve seen the bay. Step into a read-only monitor wall with simulated IG, FB, and Threads telemetry. No login.
              </p>
              <ul className="mt-4 grid gap-2 text-sm text-mutedText">
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-success" /> Real layout — metrics, timeline, and keep stamps
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-success" /> Sample only — every number tagged Simulated
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-success" /> One click to switch to live after OAuth
                </li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="rounded-full bg-ink px-6 py-6 text-background">
                  <Link href="/demo">
                    <Eye className="h-4 w-4" /> Explore Live Demo
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="rounded-full border border-borderSoft bg-surface">
                  <Link href="/signup">
                    Start free — then connect <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-mutedText">
                By connecting you agree to our{" "}
                <a href="/privacy" className="font-medium text-ink underline decoration-borderSoft underline-offset-4 hover:decoration-ink">
                  Privacy Policy
                </a>{" "}
                — tokens AES-256-GCM, workspace-scoped.
              </p>
            </div>

            <div className="relative">
              <div className="absolute -inset-3 -z-10 rounded-[24px] bg-ink/5 blur-xl" />
              <div className="overflow-hidden rounded-[20px] border border-[var(--line-ink)] bg-[var(--surface-ink)] p-3 shadow-ink">
                <div className="flex items-center justify-between px-1 pb-2 text-[11px] font-mono tracking-[0.16em] text-white/50">
                  <span>MONITOR WALL</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--warn)]/30 bg-[var(--warn)]/10 px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-[var(--warn)]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--warn)]" /> SIMULATED
                  </span>
                  <span className="hidden sm:inline font-mono text-white/30">/demo — no login</span>
                </div>
                <div className="grid gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "VIEWS 28D", value: "142.9K" },
                      { label: "ENGAGEMENT", value: "18.4K" },
                      { label: "POSTS", value: "47" }
                    ].map((m) => (
                      <div key={m.label} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <div className="scanline pointer-events-none absolute inset-0 opacity-30" />
                        <p className="relative text-[10px] font-mono tracking-[0.16em] text-white/50">{m.label}</p>
                        <p className="relative mt-1 font-display text-lg font-bold tracking-tight text-white">{m.value}</p>
                        <p className="relative text-[10px] font-mono tracking-widest text-[var(--accent)]">Simulated</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[var(--accent)] px-3 py-2.5 text-xs font-medium text-ink">
                    <span>This wall becomes your live bay after OAuth.</span>
                    <a href="/demo" className="font-bold underline underline-offset-4">
                      Open →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* EDIT LOG — FAQ (FAQPage) */}
        <section id="faq" className="mx-auto max-w-[1280px] scroll-mt-24 px-5 sm:px-8 py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="lg:sticky lg:top-[88px]">
              <h2 className="font-display text-[30px] font-[700] leading-[0.98] tracking-[-0.03em] sm:text-[36px]">Edit log — plainly stated.</h2>
              <p className="mt-3 max-w-[48ch] text-[15px] leading-7 text-mutedText">
                Free during early access, nothing charged without notice, Meta connection revocable in one click. The log is the truth.
              </p>
              <p className="mt-4 text-xs font-mono tracking-widest text-faintText">CANONICAL ANSWERS · ALSO IN llms.txt + /md/faq</p>
            </div>
            <div className="grid gap-3">
              {FAQS.slice(0, 4).map((faq) => (
                <details key={faq.question} className="group rounded-2xl border border-borderSoft bg-surface open:border-[var(--accent)]/30">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold outline-none hover:bg-surface-muted/40 focus-visible:ring-2 focus-visible:ring-[var(--accent)] [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-3">
                      <span className="hidden sm:grid h-7 w-7 place-items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800"><span className="text-xs font-bold">?</span></span>
                      {faq.question}
                    </span>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-borderSoft bg-background text-mutedText transition group-open:rotate-180 group-open:border-[var(--accent)]/40 group-open:text-[var(--accent-strong)]"><span className="text-[16px] leading-none group-open:rotate-0 transition">›</span></span>
                  </summary>
                  <p className="px-5 pb-5 pl-5 sm:pl-14 text-sm leading-7 text-mutedText">{faq.answer}</p>
                </details>
              ))}

            </div>
          </div>
        </section>

        {/* LEAVE REVIEW — slate (kept, bay removed) — consistent with page */}
        <section id="feedback" className="border-y border-borderSoft bg-background px-5 sm:px-8 py-12 sm:py-16">
          <div className="mx-auto grid max-w-[1280px] gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <h2 className="font-display text-[28px] font-[700] leading-[0.98] tracking-[-0.03em] sm:text-[34px]">Slate it. Leave a kept frame.</h2>
              <p className="mt-3 max-w-[48ch] text-sm leading-6 text-mutedText">Used EduVerse? Tell us what landed, what confused, what’s missing. Reviews are moderated and appear as selects after approval.</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-borderSoft bg-surface px-3 py-1.5 text-xs font-mono tracking-widest text-mutedText">
                <Clapperboard className="h-3.5 w-3.5" /> TAKE 01 — YOUR REVIEW
              </div>
            </div>
            <Card className="rounded-[20px] border border-borderSoft bg-card p-6 shadow-soft">
              {feedbackSent ? (
                <motion.div role="status" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="grid min-h-[280px] place-items-center text-center">
                  <div>
                    <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-success/15 text-success">
                      <Check className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-display text-xl font-semibold">Kept. Thank you.</h3>
                    <p className="mt-2 text-sm text-mutedText">Your select is pending moderation and will appear after approval.</p>
                    <Button className="mt-5 rounded-full" size="sm" variant="secondary" onClick={() => setFeedbackSent(false)}>
                      Slate another
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="reviewer-name" className="text-sm font-medium">
                        Your name <span className="text-danger">*</span>
                      </label>
                      <input
                        id="reviewer-name"
                        value={reviewerName}
                        onChange={(e) => setReviewerName(e.target.value)}
                        required
                        maxLength={80}
                        placeholder="e.g. Priya Sharma"
                        className="mt-2 w-full rounded-xl border border-borderSoft bg-background px-3 py-2.5 text-sm outline-none placeholder:text-faintText focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30"
                      />
                    </div>
                    <div>
                      <label htmlFor="reviewer-role" className="text-sm font-medium">
                        Role <span className="text-xs text-mutedText">(optional)</span>
                      </label>
                      <input
                        id="reviewer-role"
                        value={reviewerRole}
                        onChange={(e) => setReviewerRole(e.target.value)}
                        maxLength={120}
                        placeholder="e.g. Creator"
                        className="mt-2 w-full rounded-xl border border-borderSoft bg-background px-3 py-2.5 text-sm outline-none placeholder:text-faintText focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Rating</p>
                    <div className="mt-2 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setFeedbackRating(n)}
                          aria-label={`Rate ${n} out of 5`}
                          className={cn("grid h-9 w-9 place-items-center rounded-full border transition", n <= feedbackRating ? "border-[var(--accent)] bg-[var(--accent)] text-ink" : "border-borderSoft bg-surface text-faintText hover:border-[var(--accent)]/40")}
                        >
                          <Star className={cn("h-4 w-4", n <= feedbackRating && "fill-ink")} />
                        </button>
                      ))}
                      <span className="ml-2 text-sm font-mono text-mutedText">{feedbackRating}/5</span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="feedback" className="text-sm font-medium">
                      Your select
                    </label>
                    <textarea
                      id="feedback"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      required
                      maxLength={800}
                      rows={4}
                      placeholder="What felt useful, confusing, or missing?"
                      className="mt-2 w-full rounded-xl border border-borderSoft bg-background px-3 py-3 text-sm outline-none placeholder:text-faintText focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                    <p className="mt-1 text-right text-xs font-mono text-faintText">{feedback.length}/800</p>
                  </div>
                  {feedbackError && <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">{feedbackError}</p>}
                  <Button type="submit" disabled={feedbackSubmitting || !feedback.trim() || !reviewerName.trim()} className="w-full rounded-full bg-ink py-6 text-background hover:bg-ink/90 disabled:opacity-50">
                    {feedbackSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Slating…
                      </>
                    ) : (
                      <>
                        Slate this take <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <p className="text-center text-xs leading-relaxed text-mutedText">By submitting you agree to moderation. No payment, no auto-renewal.</p>
                </form>
              )}
            </Card>
          </div>
        </section>

        {/* EXPORT BAY — CTA — fixed ink + MagicUI Meteors + HyperUI grid */}
        <section className="relative overflow-hidden bg-[var(--surface-ink)] py-12 sm:py-16">
          <Meteors number={14} className="opacity-30" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: `linear-gradient(var(--accent) 1px, transparent 1px), linear-gradient(90deg,var(--accent) 1px, transparent 1px)`, backgroundSize: "36px 36px" }} />
          </div>
          <div className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-[var(--accent)]/10 blur-3xl" />
          <motion.div {...fadeUp} className="relative mx-auto max-w-[760px] px-5 text-center sm:px-8">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-mono tracking-[0.16em] text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] tally-dot" /> EXPORT BAY — READY
            </div>
            <h2 className="mt-4 text-balance font-display text-[32px] font-[700] leading-[0.95] tracking-[-0.03em] text-white sm:text-[42px]">
              Stop guessing.
              <br />
              <span className="font-[400] text-white/70">Start remembering.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-[58ch] text-[15px] leading-7 text-white/60">Connect Meta and the bay fills with your real posts. Or walk the sandbox first — no OAuth, every number labeled.</p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button asChild className="rounded-full border border-white/15 bg-transparent px-6 py-6 text-white hover:bg-white hover:text-ink">
                <Link href="/demo">
                  <Eye className="h-4 w-4" /> Explore Live Demo
                </Link>
              </Button>
              <Button asChild className="rounded-full bg-[var(--accent)] px-6 py-6 text-ink hover:bg-[var(--accent-strong)]">
                <Link href="/login">
                  Open the dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button onClick={handleConnectClick} disabled={checkingAuth} className="rounded-full border-2 border-[var(--accent)] bg-[var(--accent)]/10 px-6 py-6 text-[var(--accent)] hover:bg-[var(--accent)]/20 disabled:opacity-50">
                {checkingAuth ? "Checking…" : "Connect Meta"}
              </Button>
            </div>
            <p className="mx-auto mt-6 max-w-[64ch] text-xs leading-relaxed text-white/40">
              By connecting you agree to our{" "}
              <a href="/privacy" className="font-medium text-[var(--accent)] underline decoration-white/20 underline-offset-4 hover:decoration-[var(--accent)]">
                Privacy Policy
              </a>{" "}
              — AES-256-GCM, workspace RLS, revocable in one click.
            </p>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
