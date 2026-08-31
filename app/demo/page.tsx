import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Eye, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoDashboard } from "@/components/demo/demo-dashboard";
import { ThemeToggle } from "@/components/providers/theme-toggle";

export const metadata: Metadata = {
  title: "Live Demo — Sandbox Dashboard",
  description:
    "Explore a simulated EduVerse dashboard with sample Meta Graph analytics — no OAuth or account required. See metrics, charts, and recommendations before you connect.",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#EEF3F9] dark:bg-[#0A0F1E]">
      <header className="sticky top-0 z-30 border-b border-[#D6DFE8] dark:border-[#1F2A44] bg-white/85 dark:bg-[#0B1220]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <img src="/icon.svg" alt="EduVerse" width={32} height={32} className="h-8 w-8 rounded-[9px] shadow-sm object-cover" />
            <span className="font-display text-lg font-semibold tracking-tight text-ink">
              Edu<em className="font-normal text-primary">Verse</em>
            </span>
            <span className="ml-2 hidden items-center gap-1.5 rounded-full border border-warning/20 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning sm:inline-flex">
              <Eye className="h-3 w-3" /> Demo — simulated data
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/privacy" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-mutedText hover:text-ink">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> Privacy & Data Security
            </Link>
            <ThemeToggle />
            <Button asChild size="sm" variant="secondary">
              <Link href="/">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to site
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-ink text-background hover:bg-ink/90">
              <Link href="/signup">Start free</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
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

      <footer className="border-t border-[#D6DFE8] dark:border-[#1F2A44] bg-white dark:bg-[#0B1220] px-5 py-8 sm:px-8">
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
