"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Eye, Loader2, Lock, Menu, MessageCircle, ShieldCheck, Sparkles, Star, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { features, platformLogos } from "@/data/mock";
import { MetaConnectModal } from "@/components/meta/meta-connect-modal";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { TiltCard } from "@/components/ui/tilt-card";
import { ScrambleHover } from "@/components/smoothui/scramble-hover";
import {
  EASE_OUT,
  fadeUp,
  staggerContainer,
  staggerItem
} from "@/components/motion-variants";

const EASE = EASE_OUT;

type Review = {
  id: string;
  name: string;
  role: string | null;
  rating: number;
  content: string;
  created_at: string;
};

function ReviewStars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={cn("h-3.5 w-3.5", star <= rating ? "fill-primary text-primary" : "text-faintText")} />
      ))}
    </span>
  );
}

function Wordmark({ className }: { className?: string }) {
  return (
    <a aria-label="EduVerse home" className={`inline-flex items-center gap-2.5 ${className ?? ""}`} href="#top">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-background">
        <Sparkles className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="font-display text-[1.25rem] font-semibold tracking-tight text-ink">
        Edu<em className="font-normal text-primary">Verse</em>
      </span>
    </a>
  );
}

export function LandingPage() {
  const router = useRouter();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);

  const handleConnectClick = async () => {
    if (checkingAuth) return;
    setCheckingAuth(true);
    try {
      const response = await fetch("/api/meta/connect", { cache: "no-store" });
      if (response.status === 401) {
        router.push("/login?next=/dashboard/settings");
        return;
      }
    } catch {
      // fall through to modal — server will redirect if needed
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
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  // Gentle scroll parallax on the hero backdrop so the page feels alive while
  // scrolling instead of strictly static.
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOrbY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const heroOrbScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  // The header floats transparent over the hero and only gains its backdrop
  // blur and hairline border after the visitor starts scrolling.
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (latest) => setScrolled(latest > 24));

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

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = pageRef.current;
    if (!element || event.pointerType === "touch") return;
    const rect = element.getBoundingClientRect();
    element.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
    element.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
  };

  const scrollToUseCase = () => {
    document.getElementById("telemetry")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div id="top" ref={pageRef} onPointerMove={handlePointerMove} className="spotlight-page min-h-screen bg-background text-ink selection:bg-accent-soft selection:text-ink">
      <ScrollProgress />
      {/* Modals */}
      <MetaConnectModal isOpen={connectModalOpen} onClose={() => setConnectModalOpen(false)} />

      {/* Header */}
      <header className={cn("sticky top-0 z-40 transition-[background-color,backdrop-filter,border-color] duration-300", scrolled || mobileMenuOpen ? "border-b border-borderSoft bg-background/85 backdrop-blur-xl" : "border-b border-transparent bg-transparent")}>
        <nav className="mx-auto flex min-h-[68px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Wordmark />
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Button onClick={() => router.push("/demo")} size="sm" variant="secondary" className="hidden sm:inline-flex border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20">
              <Eye className="h-3.5 w-3.5" />
              Live Demo
            </Button>
            <Button onClick={() => router.push("/login")} size="sm" className="hidden bg-ink text-background hover:bg-ink/90 sm:inline-flex">
              <ScrambleHover>Open dashboard</ScrambleHover>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <button
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="grid h-10 w-10 place-items-center rounded-full border border-borderSoft bg-surface text-ink transition hover:border-primary/50 sm:hidden"
              onClick={() => setMobileMenuOpen((open) => !open)}
              type="button"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="overflow-hidden border-b border-borderSoft bg-background sm:hidden"
            >
              <div className="space-y-1 px-5 py-4">
                {[
                  ["How it works", "telemetry"],
                  ["Try demo", "sandbox"],
                  ["Features", "features"],
                  ["Reviews", "feedback"]
                ].map(([label, id]) => (
                  <button
                    className="block w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-ink transition hover:bg-surface"
                    key={id}
                    onClick={() => scrollToSection(id)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
                <Button onClick={() => router.push("/demo")} className="mt-2 w-full bg-amber-500/15 text-amber-700 border border-amber-500/20 hover:bg-amber-500/25">
                  <Eye className="h-4 w-4" />
                  Explore Live Demo
                </Button>
                <Button onClick={() => router.push("/login")} className="w-full bg-ink text-background hover:bg-ink/90">
                  Open dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="pt-2 text-center text-xs text-mutedText">
                  <a href="/privacy" className="font-medium text-primary hover:underline">
                    Privacy & Data Security
                  </a>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main id="main-content">
        {/* Hero */}
        <section ref={heroRef} className="relative overflow-hidden px-5 pb-16 pt-20 sm:px-8 sm:pt-28 lg:pb-24">
          <div className="pointer-events-none absolute inset-0 -z-10 texture-dots opacity-60" />
          <motion.div style={{ x: "-50%", y: heroOrbY, scale: heroOrbScale }} className="pointer-events-none absolute left-1/2 top-[-320px] -z-10 h-[640px] w-[900px]">
            <div className="h-full w-full animate-float rounded-full bg-accent-soft blur-3xl" />
          </motion.div>

          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <Badge variant="primary" className="px-3.5 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Meta Graph API · configured version telemetry
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: EASE }}
              className="mt-7 text-balance font-display text-5xl font-medium leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl"
            >
              Social intelligence that <em className="italic text-primary">remembers</em> your audience.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16, ease: EASE }}
              className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-mutedText sm:text-lg"
            >
              EduVerse indexes Instagram Reels, Facebook Pages, and Threads engagement callbacks
              into a persistent memory, then shows you exactly what to post and when.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24, ease: EASE }}
              className="mt-9 flex flex-wrap items-center justify-center gap-3"
            >
              <Button onClick={() => router.push("/signup")} className="bg-ink px-6 py-3 text-sm text-background hover:bg-ink/90">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button onClick={() => router.push("/demo")} variant="secondary" className="border-primary/20 bg-card px-6 py-3 text-sm hover:border-primary/40">
                <Eye className="h-4 w-4 text-primary" />
                Explore Live Demo
              </Button>
              <Button
                onClick={scrollToUseCase}
                variant="secondary"
                className="px-6 py-3 text-sm"
              >
                See how it works
                <ArrowRight className="h-4 w-4 text-primary" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.32 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-mutedText"
            >
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-success" /> No credit card required
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-success" /> Official Meta Graph OAuth
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-success" /> Your data, retained locally
              </span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.38 }}
              className="mt-3 text-center text-xs text-mutedText"
            >
              Try before you connect —{" "}
              <a href="/demo" className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                explore the sandbox dashboard
              </a>{" "}
              with simulated data. No login required.
            </motion.p>
          </div>

          {/* Hero use-case panel */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
            className="relative mx-auto mt-16 max-w-5xl scroll-mt-24"
            id="telemetry"
          >
            <div className="absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-b from-accent-soft to-transparent" />
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-borderSoft bg-surface px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-borderSoft bg-card px-3 py-1 text-[11px] font-mono uppercase tracking-[0.2em] text-success">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                  Use case
                </span>
                <span className="hidden text-[11px] font-mono text-mutedText sm:inline-flex">
                  Connect Meta to unlock live analytics
                </span>
              </div>

              <CardContent className="p-5 sm:p-6">
                <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="grid gap-3">
                    {[
                      {
                        title: "Connect Meta",
                        text: "Link Instagram or Facebook once, then let the dashboard fill with real account data."
                      },
                      {
                        title: "Read real signals",
                        text: "Reach, saves, post timing, and audience behavior appear only after API keys are in place."
                      },
                      {
                        title: "Publish with context",
                        text: "Use the live brief to decide what to post next, instead of guessing from a mock preview."
                      }
                    ].map((step, index) => (
                      <motion.div
                        key={step.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: index * 0.07, ease: EASE }}
                        className="rounded-xl border border-borderSoft bg-surface px-4 py-4 shadow-glass"
                      >
                        <div className="flex items-start gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-primary">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-ink">{step.title}</p>
                            <p className="mt-1 text-sm leading-6 text-mutedText">{step.text}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-borderSoft bg-surface p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-mutedText">Workflow preview</p>
                      <span className="font-mono text-xs text-success">No fake metrics</span>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {[
                        ["Best use case", "Creator and team dashboards"],
                        ["Data source", "Official Meta Graph OAuth"],
                        ["Shown when connected", "Real reach, saves, and posting windows"]
                      ].map(([label, value], index) => (
                        <motion.div
                          key={label}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.35, delay: 0.1 + index * 0.06, ease: EASE }}
                          className="flex items-center justify-between rounded-xl border border-borderSoft bg-card px-4 py-3"
                        >
                          <p className="text-xs text-mutedText">{label}</p>
                          <p className="text-right text-sm font-medium text-ink">{value}</p>
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-sm leading-relaxed text-ink">
                      <p className="font-medium text-success">Use case</p>
                      <p className="mt-0.5 text-mutedText">
                        This landing section explains the product before sign in. The real analytics live in the
                        dashboard after you connect an account.
                      </p>
                    </div>

                    <Button onClick={() => scrollToSection("features")} variant="secondary" className="mt-4 w-full px-5 py-3 text-sm">
                      Explore the workflow
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* Interactive Sandbox / Mock Dashboard Preview */}
        <section id="sandbox" className="mx-auto max-w-6xl scroll-mt-24 px-5 sm:px-8">
          <motion.div {...fadeUp} className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700">
                <Eye className="h-3.5 w-3.5" /> Interactive sandbox · no OAuth required
              </p>
              <h2 className="mt-4 text-balance font-display text-3xl font-medium leading-[1.08] tracking-tight text-ink sm:text-4xl">
                Try the dashboard before you connect.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-mutedText">
                Full live features need Meta Graph OAuth — which can feel heavy before you&apos;ve seen the product. Jump into a
                read-only <strong className="font-semibold text-ink">sandbox preview</strong> with simulated Instagram, Facebook, and
                Threads analytics. No login, no tokens stored.
              </p>
              <ul className="mt-5 grid gap-2 text-sm text-mutedText">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Real dashboard layout — metrics, charts, recommendations, and post telemetry
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Sample data only — clearly marked “Simulated” so you know what&apos;s real vs preview
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> One click to switch to live: create account → Connect Meta on our consent screen
                </li>
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button onClick={() => router.push("/demo")} className="bg-ink px-6 py-3 text-sm text-background hover:bg-ink/90">
                  <Eye className="h-4 w-4" />
                  Explore Live Demo
                </Button>
                <Button onClick={() => router.push("/signup")} variant="secondary" className="px-6 py-3 text-sm">
                  Start free — then connect Meta
                  <ArrowRight className="h-4 w-4 text-primary" />
                </Button>
              </div>
              <p className="mt-3 text-xs text-mutedText">
                By connecting you agree to our{" "}
                <a href="/privacy" className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                  Privacy Policy
                </a>{" "}
                — tokens are AES-256-GCM encrypted and scoped to your workspace.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="relative"
            >
              <div className="absolute -inset-4 -z-10 rounded-[28px] bg-gradient-to-br from-amber-500/10 via-accent-soft to-transparent blur-xl" />
              <Card className="overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-borderSoft bg-surface px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> Sandbox — simulated
                  </span>
                  <span className="hidden text-[11px] font-mono text-faintText sm:inline">/demo — no login</span>
                </div>
                <CardContent className="p-4 sm:p-5">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Views (28d)", value: "142.9K" },
                      { label: "Engagement", value: "18.4K" },
                      { label: "Posts", value: "47" },
                    ].map((m) => (
                      <div key={m.label} className="rounded-xl border border-borderSoft bg-surface px-3 py-3">
                        <p className="text-[11px] text-mutedText">{m.label}</p>
                        <p className="mt-1 font-display text-lg font-semibold tracking-tight text-ink">{m.value}</p>
                        <p className="mt-1 text-[10px] leading-none text-success">Simulated</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl border border-borderSoft bg-surface p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-mutedText">Engagement over time</span>
                      <span className="font-mono text-[11px] text-success">Sample</span>
                    </div>
                    <div className="mt-2 flex h-20 items-end gap-1">
                      {[35, 48, 42, 58, 72, 61, 82, 71, 90, 77, 96, 86, 104, 98].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-md bg-primary/70"
                          style={{ height: `${h}%`, opacity: 0.55 + (i / 14) * 0.45 }}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-faintText">
                      <span>Jul 21 → Aug 7</span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-success" /> No login required
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-success/15 bg-success/10 px-3 py-2.5">
                    <span className="text-xs font-medium text-success">This preview becomes your live dashboard after OAuth.</span>
                    <a href="/demo" className="text-xs font-semibold text-success hover:underline">
                      Open sandbox →
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </section>

        {/* Brand logos */}
        <section className="border-y border-borderSoft bg-surface/60 py-10">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <p className="text-center font-mono text-[11px] uppercase tracking-[0.22em] text-mutedText">
              One feed across the networks you already post to
            </p>
            <div className="marquee-mask mt-7">
              <div className="marquee flex w-max items-center">
                {[0, 1, 2].map((copy) => (
                  <div aria-hidden={copy > 0} className="flex items-center" key={copy}>
                    {platformLogos.map((plat) => (
                      <div
                        key={`${copy}-${plat.slug}`}
                        className="mx-5 flex items-center gap-2 text-mutedText transition-colors duration-200 hover:text-ink sm:mx-7"
                      >
                        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                          <path d={plat.svgPath} />
                        </svg>
                        <span className="font-display text-lg italic tracking-tight">{plat.name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32">
          <motion.div {...fadeUp} className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">How it works</p>
            <h2 className="mt-4 text-balance font-display text-4xl font-medium leading-[1.08] tracking-tight text-ink sm:text-5xl">
              Everything that removes the guesswork from posting.
            </h2>
            <p className="mt-5 text-pretty text-base leading-relaxed text-mutedText">
              Every feature pairs live Meta Graph callbacks with a long-term audience memory, so
              recommendations compound as your audience changes.
            </p>
          </motion.div>

          <motion.div
            className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                role="button"
                tabIndex={0}
                aria-pressed={activeFeature === index}
                onClick={() => setActiveFeature(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveFeature(index);
                  }
                }}
                className={`interactive-card group rounded-2xl border bg-card p-6 shadow-glass outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  activeFeature === index ? "border-primary/60 shadow-glow" : "border-borderSoft"
                }`}
              >
                <motion.span
                  className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-background"
                  whileTap={{ scale: 0.92 }}
                >
                  <feature.icon className="h-5 w-5" strokeWidth={1.75} />
                </motion.span>
                <h3 className="mt-5 font-heading text-xl font-medium tracking-tight text-ink">
                  {feature.title}
                </h3>
                <p className="mt-2.5 text-sm leading-6 text-mutedText">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Reviews */}
        <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-32">
          <motion.div {...fadeUp} className="flex max-w-2xl flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Proof</p>
              <h2 className="mt-4 text-balance font-display text-4xl font-medium leading-[1.08] tracking-tight text-ink sm:text-5xl">
                Loved by people who post every single day.
              </h2>
            </div>
            {reviews.length > 0 && (
              <p className="text-sm text-mutedText">
                {reviews.length} review{reviews.length === 1 ? "" : "s"} ·{" "}
                {(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)} average
              </p>
            )}
          </motion.div>

          <motion.div
            className="mt-14 grid gap-5 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
          >
            {reviewsLoading ? (
              <motion.div
                variants={staggerItem}
                whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -12px var(--accent-strong)" }}
                transition={{ duration: 0.2 }}
                className="col-span-full flex items-center gap-2 rounded-2xl border border-dashed border-borderSoft bg-surface p-6 text-center text-xs text-mutedText hover:border-primary/50 hover:bg-surface/50"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading reviews…
              </motion.div>
            ) : reviews.length === 0 ? (
              <motion.div
                variants={staggerItem}
                whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -12px var(--accent-strong)" }}
                transition={{ duration: 0.2 }}
                className="col-span-full rounded-2xl border border-dashed border-borderSoft bg-surface p-10 text-center hover:border-primary/50 hover:bg-surface/50"
              >
                <Star className="mx-auto h-6 w-6 text-faintText" />
                <h3 className="mt-4 font-heading text-lg font-medium text-ink">No reviews yet.</h3>
                <p className="mt-1.5 text-sm text-mutedText">Be the first to leave one — tell us how EduVerse is working for you.</p>
              </motion.div>
            ) : (
              reviews.map((review) => (
                <TiltCard
                  key={review.id}
                  variants={staggerItem}
                  tiltLimit={9}
                  scale={1.02}
                  className="rounded-2xl border border-borderSoft bg-card p-6 shadow-glass transition-shadow duration-300 hover:shadow-glow"
                >
                  <figure className="flex h-full flex-col justify-between">
                    <blockquote className="text-pretty text-sm leading-7 text-ink">
                      <motion.span animate={{ y: [0, -3, 0] }} transition={{ duration: 2.8, repeat: Infinity, delay: 0.25 }} className="inline-block font-display text-2xl text-primary">“</motion.span>
                      {review.content}
                    </blockquote>
                    <figcaption className="mt-6 border-t border-borderSoft pt-4">
                      <ReviewStars rating={review.rating} />
                      <div className="mt-3 flex items-center gap-3">
                        <motion.span
                          whileTap={{ scale: 0.9 }}
                          className="grid h-9 w-9 place-items-center rounded-full bg-surface text-xs font-semibold text-primary"
                        >
                          {review.name.split(" ").map((n) => n[0]).join("")}
                        </motion.span>
                        <div>
                          <p className="text-sm font-semibold text-ink">{review.name}</p>
                          {review.role && <p className="text-xs text-mutedText">{review.role}</p>}
                        </div>
                      </div>
                    </figcaption>
                  </figure>
                </TiltCard>
              ))
            )}
          </motion.div>
        </section>

        <section id="feedback" className="scroll-mt-24 border-y border-borderSoft bg-surface/50 px-5 py-24 sm:px-8 lg:py-28">
          <motion.div {...fadeUp} className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Leave a review</p>
              <h2 className="mt-4 font-display text-4xl font-medium leading-[1.08] tracking-tight text-ink sm:text-5xl">Help shape EduVerse.</h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-mutedText">Used EduVerse? Tell us what feels useful, confusing, or missing. Reviews are moderated and appear in the wall above after approval.</p>
            </div>
            <Card className="p-6">
              {feedbackSent ? <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="grid min-h-48 place-items-center text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-success/15 text-success"><Check className="h-5 w-5" /></span><h3 className="mt-4 font-heading text-xl font-medium text-ink">Review submitted.</h3><p className="mt-2 text-sm text-mutedText">Thanks! Your review is pending moderation and will appear after approval.</p><Button className="mt-5" size="sm" variant="secondary" onClick={() => setFeedbackSent(false)}>Write another</Button></div></motion.div> : <form onSubmit={handleFeedbackSubmit} className="space-y-5"><div className="grid gap-3 sm:grid-cols-2"><div><label className="text-sm font-medium text-ink">Your name</label><input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} required maxLength={80} placeholder="e.g. Priya Sharma" className="mt-2 w-full rounded-xl border border-borderSoft bg-surface p-3 text-sm text-ink outline-none transition placeholder:text-faintText focus:border-primary" /></div><div><label className="text-sm font-medium text-ink">Role <span className="text-xs text-mutedText">(optional)</span></label><input value={reviewerRole} onChange={(event) => setReviewerRole(event.target.value)} maxLength={120} placeholder="e.g. Social Media Manager" className="mt-2 w-full rounded-xl border border-borderSoft bg-surface p-3 text-sm text-ink outline-none transition placeholder:text-faintText focus:border-primary" /></div></div><div><label className="text-sm font-medium text-ink">How is EduVerse feeling?</label><div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Review rating">{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" aria-label={`${rating} out of 5`} aria-pressed={feedbackRating === rating} onClick={() => setFeedbackRating(rating)} className={`grid h-10 w-10 place-items-center rounded-full border text-sm transition ${feedbackRating === rating ? "border-primary bg-primary text-background" : "border-borderSoft bg-surface text-mutedText hover:border-primary/50"}`}>{rating}</button>)}</div></div><div><label className="text-sm font-medium text-ink">Your review</label><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} required rows={4} maxLength={800} placeholder="What has your experience been like so far?" className="mt-2 w-full resize-none rounded-xl border border-borderSoft bg-surface p-3 text-sm text-ink outline-none transition placeholder:text-faintText focus:border-primary" /></div>{feedbackError && <p className="text-xs text-danger">{feedbackError}</p>}<div className="flex items-center justify-between gap-3"><span className="text-xs text-mutedText">Rating: {feedbackRating}/5</span><Button type="submit" disabled={feedbackSubmitting} className="bg-ink text-background hover:bg-ink/90"><MessageCircle className="h-4 w-4" />{feedbackSubmitting ? "Submitting…" : "Submit review"}</Button></div></form>}
            </Card>
          </motion.div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden bg-ink py-24 text-background lg:py-32">
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] texture-dots" />
          <div className="pointer-events-none absolute right-[-200px] top-[-200px] h-[480px] w-[480px] rounded-full bg-accent-soft blur-3xl" />
          <motion.div {...fadeUp} className="relative mx-auto max-w-2xl px-5 text-center sm:px-8">
            <h2 className="text-balance font-display text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl">
              Ready to stop guessing <em className="italic text-primary">what your audience wants?</em>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-background/70">
              Connect your Meta accounts and let EduVerse build the memory that turns posting into a system. Or explore the sandbox first —
              no OAuth required.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => router.push("/demo")} variant="secondary" className="bg-background/10 border border-background/15 px-6 py-3 text-sm text-background backdrop-blur hover:bg-background/15">
                <Eye className="h-4 w-4" />
                Explore Live Demo
              </Button>
              <Button onClick={() => router.push("/login")} className="bg-background px-6 py-3 text-sm text-ink hover:bg-background/90">
                Open the dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleConnectClick}
                disabled={checkingAuth}
                className="border-2 border-primary bg-primary/15 px-6 py-3 text-sm font-medium text-primary hover:bg-primary/25 hover:border-primary hover:shadow-glow transition-all disabled:opacity-50"
              >
                {checkingAuth ? "Checking…" : "Connect Meta"}
              </Button>
            </div>
            <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-relaxed text-background/60">
              By connecting Meta you agree to our{" "}
              <a href="/privacy" className="font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
                Privacy Policy & Data Security
              </a>{" "}
              — tokens are AES-256-GCM encrypted, scoped to your workspace via RLS, and revocable anytime in{" "}
              <a href="/privacy#revocation" className="underline decoration-background/20 underline-offset-4 hover:decoration-background/40">
                one click
              </a>
              .
            </p>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
