import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GlassHeader } from "@/components/layout/glass-header";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  return (
    <GlassHeader>
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="EduVerse home" className="inline-flex items-center gap-2.5">
          <Image src="/icon.svg" alt="" width={32} height={32} className="h-8 w-8 rounded-[9px] object-cover shadow-sm" />
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            Edu<em className="font-normal text-primary">Verse</em>
          </span>
        </Link>
        <nav aria-label="Public pages" className="hidden items-center gap-1 md:flex">
          <Link href="/demo" className="rounded-full px-3 py-2 text-xs font-medium text-mutedText transition-colors hover:text-ink">Live demo</Link>
          <Link href="/developers" className="rounded-full px-3 py-2 text-xs font-medium text-mutedText transition-colors hover:text-ink">Developers</Link>
          <Link href="/privacy" className="rounded-full px-3 py-2 text-xs font-medium text-mutedText transition-colors hover:text-ink">Privacy</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm" className="hidden rounded-full px-4 sm:inline-flex">
            <Link href="/signup">Start free <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </div>
    </GlassHeader>
  );
}
