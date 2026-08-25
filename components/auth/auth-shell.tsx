import Link from "next/link";
import { Sparkles } from "lucide-react";
import { AuthBackground } from "@/components/auth/auth-background";
import { ThemeToggle } from "@/components/providers/theme-toggle";

export function AuthShell({ children, title, description }: { children: React.ReactNode; title: string; description: string }) {
  return (
    <main id="main-content" className="relative isolate grid min-h-screen place-items-center overflow-hidden bg-background p-4 sm:p-8">
      <AuthBackground />
      <div className="absolute right-4 top-4 z-20 sm:right-8 sm:top-8"><ThemeToggle /></div>
      <div className="relative z-10 grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1fr_420px]">
        <div className="hidden max-w-lg lg:block">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-accent-soft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> EduVerse workspace</p>
          <p className="mt-6 text-balance font-display text-6xl font-medium leading-[0.98] tracking-tight text-ink">Make every signal a <em className="italic text-primary">lesson.</em></p>
          <p className="mt-6 max-w-md text-base leading-relaxed text-mutedText">A calmer way to turn audience behavior into better ideas, better timing, and better outcomes.</p>
          <div className="mt-8 flex items-center gap-3 text-xs text-mutedText"><span className="h-2 w-2 animate-pulse rounded-full bg-success" /> Live learning system <span className="h-px w-10 bg-borderSoft" /> Private by default</div>
        </div>
        <section className="w-full rounded-[28px] border border-borderSoft/80 bg-card/85 p-6 shadow-glass backdrop-blur-xl sm:p-8">
          <Link aria-label="EduVerse home" className="inline-flex items-center gap-2.5" href="/">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-background"><Sparkles aria-hidden="true" className="h-5 w-5" /></span>
            <span className="font-display text-xl font-semibold tracking-tight text-ink">Edu<em className="font-normal text-primary">Verse</em></span>
          </Link>
          <h1 className="mt-8 font-heading text-3xl font-medium tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-mutedText">{description}</p>
          {children}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 border-t border-borderSoft pt-4 text-[11px] text-mutedText">
            <Link href="/privacy" className="font-medium text-primary hover:underline">
              Privacy & Data Security
            </Link>
            <span className="h-3 w-px bg-borderSoft" />
            <Link href="/demo" className="font-medium text-primary hover:underline">
              Explore Live Demo
            </Link>
            <span className="hidden sm:inline text-faintText">· AES-256-GCM · RLS-isolated</span>
          </div>
        </section>
      </div>
    </main>
  );
}
