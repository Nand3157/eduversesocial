import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Eye, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoDashboard } from "@/components/demo/demo-dashboard";

export const metadata: Metadata = {
  title: "Live Demo — Sandbox Dashboard",
  description:
    "Explore a simulated EduVerse dashboard with sample Meta Graph analytics — no OAuth or account required. See metrics, charts, and recommendations before you connect.",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-borderSoft bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-background">
              <Sparkles className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-ink">
              Edu<em className="font-normal text-primary">Verse</em>
            </span>
            <span className="ml-2 hidden items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 sm:inline-flex">
              <Eye className="h-3 w-3" /> Demo — simulated data
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/privacy" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-mutedText hover:text-ink">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> Privacy & Data Security
            </Link>
            <Link href="/">
              <Button size="sm" variant="secondary">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to site
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-ink text-background hover:bg-ink/90">
                Start free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-mutedText">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <span className="text-faintText">/</span>
          <span className="font-medium text-ink">Live Demo</span>
          <span className="text-faintText">·</span>
          <span>Read-only sandbox — nothing is saved, no Meta connection made.</span>
        </div>
        <DemoDashboard />
      </main>

      <footer className="border-t border-borderSoft bg-surface px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-mutedText sm:flex-row">
          <p>Demo uses synthetic data inspired by real Meta Graph API shapes. Connect your accounts for live numbers.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
