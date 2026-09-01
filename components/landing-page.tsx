"use client";

import { type FormEvent, useEffect, useState } from "react";
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
  X
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FAQS } from "@/lib/agentic/faq";
import { ThemeToggle } from "@/components/providers/theme-toggle";

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

const memoryStages = [
  { number: "01", title: "Connect once", copy: "Link Instagram Business, Facebook Pages, or Threads through Meta’s official consent flow." },
  { number: "02", title: "Read the signal", copy: "Reach, saves, comments, timing, and post format arrive together in one live timeline." },
  { number: "03", title: "Keep the reason", copy: "Every recommendation points back to the post and signal that earned it." }
];

const featureColumns = [
  { icon: BarChart3, title: "A live view across platforms", copy: "One timeline for Instagram, Facebook, and Threads, with graceful empty states when a platform has no data." },
  { icon: MessageCircleMore, title: "Memory that compounds", copy: "Patterns stay with your workspace, so the next decision starts with what your audience actually did." },
  { icon: ShieldCheck, title: "Publishing with receipts", copy: "Schedule or publish through verified Meta delivery, with encrypted tokens and retry-safe execution." }
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

export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [feedbackForm, setFeedbackForm] = useState(EMPTY_FEEDBACK);
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 12); window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll); }, []);
  useEffect(() => { fetch("/api/reviews", { cache: "no-store" }).then((response) => (response.ok ? response.json() : { reviews: [] })).then((data) => setReviews(data.reviews ?? [])).catch(() => setReviews([])).finally(() => setLoadingReviews(false)); }, []);

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
    <div id="top" className="landing-shell min-h-screen">
      <header className={cn("landing-header sticky top-0 z-40", scrolled && "landing-header-scrolled")}>
        <div className="landing-wrap flex h-[72px] items-center justify-between"><Wordmark /><nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">{navItems.map((id) => <button key={id} onClick={() => scrollTo(id)} className="landing-nav-link min-h-11 rounded-full px-3.5 text-[13px] font-medium">{navLabel(id)}</button>)}</nav><div className="flex items-center gap-2"><ThemeToggle /><Button asChild variant="ghost" size="sm" className="hidden rounded-full text-[var(--landing-muted)] sm:inline-flex"><Link href="/login">Sign in</Link></Button><Button asChild size="sm" className="hidden rounded-full bg-[var(--landing-signal)] px-5 text-white hover:bg-[var(--landing-signal-dark)] sm:inline-flex"><Link href="/signup">Start free <ArrowRight className="h-3.5 w-3.5" /></Link></Button><button type="button" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)} className="landing-menu-button lg:hidden">{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div></div>
        <AnimatePresence>{mobileOpen && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="landing-mobile-menu lg:hidden"><div className="landing-wrap grid gap-1 py-3">{navItems.map((id) => <button key={id} onClick={() => scrollTo(id)} className="min-h-11 px-3 text-left text-sm font-medium text-[var(--landing-ink)]">{navLabel(id)}</button>)}<Button asChild className="mt-2 rounded-full bg-[var(--landing-signal)] text-white hover:bg-[var(--landing-signal-dark)]"><Link href="/signup">Start free — no credit card</Link></Button></div></motion.div>}</AnimatePresence>
      </header>

      <main id="main-content">
        <section className="landing-hero" aria-labelledby="hero-heading"><div className="landing-wrap landing-hero-grid"><motion.div initial={reduceMotion ? undefined : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}><p className="landing-overline"><i aria-hidden="true" /> SOCIAL INTELLIGENCE FOR PEOPLE WHO TEACH</p><h1 id="hero-heading">Your audience leaves signals.<br /><em>Keep the pattern.</em></h1><p className="landing-hero-copy">EduVerse turns real Instagram, Facebook, and Threads engagement into a memory you can act on — what worked, why it worked, and what to post next.</p><div className="landing-actions"><Button asChild className="h-12 rounded-full bg-[var(--landing-signal)] px-6 text-white shadow-[0_10px_24px_rgba(182,83,39,0.2)] hover:bg-[var(--landing-signal-dark)]"><Link href="/signup">Start free <ArrowRight className="h-4 w-4" /></Link></Button><Link href="/demo" className="landing-text-link"><Eye className="h-4 w-4" /> Preview the demo</Link></div><div className="landing-proof-row"><span><Check aria-hidden="true" /> No credit card</span><span><LockKeyhole aria-hidden="true" /> Encrypted &amp; revocable</span></div></motion.div><motion.div initial={reduceMotion ? undefined : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}><SignalBoard /></motion.div></div></section>

        <div className="landing-wrap landing-platform-rail" aria-label="Supported platforms"><span className="landing-rail-label">ONE MEMORY / THREE SOURCES</span><div className="landing-platforms"><span><i className="platform-dot platform-dot-ig" /> Instagram</span><span><i className="platform-dot platform-dot-fb" /> Facebook</span><span><i className="platform-dot platform-dot-th" /> Threads</span></div><span className="landing-rail-label landing-rail-right">OFFICIAL META GRAPH API</span></div>

        <section id="how" className="landing-section landing-section-rule" aria-labelledby="how-heading"><div className="landing-wrap landing-two-col"><div className="landing-section-intro"><p className="landing-section-label">THE MEMORY LOOP</p><h2 id="how-heading">A post becomes useful when the reason stays with it.</h2><p>Most dashboards make you re-learn the same lesson every week. EduVerse keeps the signal attached to the work, so your next decision starts further ahead.</p></div><MemoryStages /></div></section>

        <section id="features" className="landing-section landing-section-quiet" aria-labelledby="features-heading"><div className="landing-wrap"><div className="landing-section-intro landing-section-intro-wide"><p className="landing-section-label">BUILT FOR THE NEXT POST</p><h2 id="features-heading">Less dashboard theatre.<br /><em>More useful context.</em></h2></div><div className="landing-feature-grid">{featureColumns.map(({ icon: Icon, title, copy }) => <article key={title} className="landing-feature"><Icon aria-hidden="true" className="h-5 w-5 text-[var(--landing-signal)]" /><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>

        <section className="landing-wrap landing-receipt-section" aria-labelledby="receipt-heading"><div className="signal-receipt"><div className="signal-receipt-header"><span>RECOMMENDATION RECEIPT</span><span>SIMULATED WORKSPACE · AUG 12</span></div><div className="signal-receipt-grid"><div><p className="signal-board-kicker">WHY THIS?</p><h2 id="receipt-heading">Repeat the format<br /><em>that earned saves.</em></h2><p className="signal-receipt-copy">“Exam prep carousel” outperformed your recent post average by 3.2× on saves.</p></div><div className="signal-receipt-data"><div><span>RECOMMENDATION</span><strong>Carousel</strong></div><div><span>BEST WINDOW</span><strong>Wed · 18:30</strong></div><div><span>SOURCE SIGNAL</span><strong>Save velocity</strong></div><Link href="/demo" className="signal-receipt-link">See sample provenance <ArrowRight aria-hidden="true" /></Link></div></div></div></section>

        <section id="feedback" className="landing-section landing-section-rule" aria-labelledby="feedback-heading"><div className="landing-wrap"><div className="landing-section-heading-row"><div><p className="landing-section-label">EARLY NOTES</p><h2 id="feedback-heading">People are still writing the first draft.</h2></div><span className="landing-count">{reviews.length ? `${reviews.length} VERIFIED NOTES` : "NO APPROVED NOTES YET"}</span></div><div className={cn("landing-feedback-grid", !loadingReviews && !reviews.length && "landing-feedback-empty")}>{(loadingReviews || reviews.length > 0) && <div className="landing-reviews">{(loadingReviews ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="landing-review landing-review-skeleton" />) : reviews.slice(0, 3).map((review) => <article key={review.id} className="landing-review"><div className="landing-stars">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={cn("h-3.5 w-3.5", index < review.rating ? "fill-[var(--landing-signal)] text-[var(--landing-signal)]" : "text-[var(--landing-line]")} />)}</div><blockquote>“{review.content}”</blockquote><footer><span>{review.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><strong>{review.name}</strong><small>{review.role ?? "Creator"}</small></div></footer></article>))}</div>}<form onSubmit={submitFeedback} className="landing-feedback-form"><p className="landing-section-label">SHARE YOUR EXPERIENCE</p><h3>Give feedback.</h3><p>Tell us what helped or what needs work. Submissions are moderated before they appear publicly.</p><div className="landing-form-grid"><label>Name<input required maxLength={80} autoComplete="name" value={feedbackForm.name} onChange={(event) => setFeedbackForm((current) => ({ ...current, name: event.target.value }))} /></label><label>Role <span>(optional)</span><input maxLength={120} autoComplete="organization-title" value={feedbackForm.role} onChange={(event) => setFeedbackForm((current) => ({ ...current, role: event.target.value }))} /></label></div><fieldset><legend>Rating</legend><div className="landing-rating-group" role="radiogroup" aria-label="Rating from one to five stars">{[1, 2, 3, 4, 5].map((rating) => <label key={rating}><input type="radio" name="rating" value={rating} checked={feedbackForm.rating === rating} onChange={() => setFeedbackForm((current) => ({ ...current, rating }))} /><span>{rating}</span></label>)}</div></fieldset><label className="landing-message-label">Feedback<textarea required maxLength={800} rows={4} value={feedbackForm.content} onChange={(event) => setFeedbackForm((current) => ({ ...current, content: event.target.value }))} /><small>{feedbackForm.content.length}/800</small></label><div className="landing-form-submit"><Button type="submit" disabled={feedbackStatus === "submitting"} className="rounded-full bg-[var(--landing-signal)] text-white hover:bg-[var(--landing-signal-dark)]">{feedbackStatus === "submitting" ? "Sending…" : "Send feedback"}<ArrowRight className="h-4 w-4" /></Button>{feedbackMessage && <p role={feedbackStatus === "error" ? "alert" : "status"} aria-live="polite" className={feedbackStatus === "error" ? "text-danger" : "text-[var(--landing-success)]"}>{feedbackMessage}</p>}</div></form></div></div></section>

        <section id="pricing" className="landing-wrap landing-demo-section"><div className="landing-demo-strip"><div><p className="landing-section-label">WANT TO LOOK AROUND FIRST?</p><h2>See the workflow before you connect.</h2><p>Read-only demo. Simulated numbers clearly labeled. No login needed.</p></div><Button asChild variant="secondary" className="rounded-full border-[var(--landing-line)] bg-transparent text-[var(--landing-ink)] hover:bg-[var(--landing-paper)]"><Link href="/demo"><Eye className="h-4 w-4" /> Open the demo</Link></Button></div></section>

        <section id="faq" className="landing-section landing-section-quiet" aria-labelledby="faq-heading"><div className="landing-wrap landing-two-col landing-faq-grid"><div className="landing-section-intro"><p className="landing-section-label">PLAIN ANSWERS</p><h2 id="faq-heading">Questions worth asking before you connect.</h2><p>EduVerse is deliberately clear about what is live, what is simulated, and what stays under your control.</p></div><div className="landing-faq-list">{FAQS.slice(0, 4).map((faq) => <details key={faq.question}><summary>{faq.question}<span><ChevronDown aria-hidden="true" className="h-4 w-4" /></span></summary><p>{faq.answer}</p></details>)}</div></div></section>

        <section className="landing-closing" aria-labelledby="closing-heading"><div className="landing-wrap landing-closing-inner"><p className="landing-overline"><i aria-hidden="true" /> LIVE-ONLY · NO FAKE METRICS</p><h2 id="closing-heading">Stop guessing.<br /><em>Start remembering.</em></h2><p>Connect Meta to see your real engagement, or preview the workflow first with clearly labeled sample data.</p><div className="landing-actions landing-actions-centered"><Button asChild className="h-12 rounded-full bg-[var(--landing-signal)] px-6 text-white hover:bg-[var(--landing-signal-dark)]"><Link href="/signup">Start free <ArrowRight className="h-4 w-4" /></Link></Button><Button asChild variant="secondary" className="h-12 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link href="/demo"><Eye className="h-4 w-4" /> Preview the demo</Link></Button></div><p className="landing-privacy-note">By connecting you agree to <Link href="/privacy">Privacy</Link> · AES-256-GCM · RLS · revocable.</p></div></section>
      </main>

    </div>
  );
}
