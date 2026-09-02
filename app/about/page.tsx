import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/layout/public-header";

export const metadata: Metadata = {
  title: "About EduVerse",
  description: "Learn why EduVerse exists and how it helps educators understand audience signals without losing context."
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main id="main-content" className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">About EduVerse</p>
        <h1 className="mt-4 max-w-3xl font-heading text-4xl font-medium tracking-tight text-ink sm:text-6xl">Useful audience memory for people who teach.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-mutedText">
          EduVerse helps educators, coaches, and small teams learn from the attention they already earn. It connects official Instagram, Facebook, and Threads data, keeps the useful pattern, and turns it into a clear next step.
        </p>

        <div className="mt-14 grid gap-10 border-t border-borderSoft pt-10 sm:grid-cols-2">
          <section>
            <BookOpen aria-hidden="true" className="h-5 w-5 text-primary" />
            <h2 className="mt-4 font-heading text-2xl font-medium text-ink">Why we built it</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-mutedText">
              <p>Social platforms give you plenty of numbers, but numbers alone do not explain what to do next. EduVerse puts reach, engagement, timing, and post context in the same view so a good lesson does not disappear after one busy week.</p>
              <p>The product is intentionally small and practical. It is not a social feed, an ad network, or a promise to predict the future. It is a calmer place to notice what your audience responded to and decide what deserves another try.</p>
            </div>
          </section>
          <section>
            <ShieldCheck aria-hidden="true" className="h-5 w-5 text-primary" />
            <h2 className="mt-4 font-heading text-2xl font-medium text-ink">How we handle data</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-mutedText">
              <p>Connections use Meta&apos;s official consent screens. Access tokens are encrypted at rest, scoped to the workspace, and removable from Settings. The demo uses sample numbers and never asks for a social account.</p>
              <p>We keep recommendations tied to the source signal that produced them. If live data is unavailable, the interface says so instead of filling the gap with invented metrics.</p>
            </div>
          </section>
        </div>

        <div className="mt-14 flex flex-wrap gap-3">
          <Button asChild><Link href="/demo">See the demo <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></Button>
          <Button asChild variant="secondary"><Link href="/contact">Talk to us</Link></Button>
        </div>
      </main>
    </div>
  );
}
