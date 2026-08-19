import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, Sparkles } from "lucide-react";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Social intelligence that remembers your audience",
  description:
    "EduVerse connects your Instagram, Facebook, and Threads accounts and turns real engagement callbacks into a persistent audience memory with precise posting recommendations."
};

const productLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Analytics", href: "/dashboard/analytics" },
  { label: "Memory", href: "/dashboard/memory" },
  { label: "Content", href: "/dashboard/content" },
  { label: "AI Chat", href: "/dashboard/chat" }
];

const exploreLinks = [
  { label: "How it works", href: "/#telemetry" },
  { label: "Features", href: "/#features" },
  { label: "Sign in", href: "/login" },
  { label: "Create account", href: "/signup" }
];

function Footer() {
  return (
    <footer className="border-t border-borderSoft bg-surface px-5 py-14 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link aria-label="EduVerse home" className="inline-flex items-center gap-2.5" href="/">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-background">
              <Sparkles className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-ink">
              Edu<em className="font-normal text-primary">Verse</em>
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-mutedText">
            AI that helps you learn, build, and grow with social intelligence that remembers your
            audience.
          </p>
          <div className="mt-6 space-y-2.5 text-sm">
            <a
              className="inline-flex items-center gap-2 text-mutedText transition-colors hover:text-ink"
              href="mailto:hello@eduverse.app"
            >
              <Mail className="h-4 w-4 text-primary" />
              hello@eduverse.app
            </a>
            <br />
            <a
              className="inline-flex items-center gap-2 text-mutedText transition-colors hover:text-ink"
              href="tel:+15550123456"
            >
              <Phone className="h-4 w-4 text-primary" />
              +1 (555) 012-3456
            </a>
          </div>
        </div>

        <nav aria-label="Product">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-faintText">Product</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {productLinks.map((link) => (
              <li key={link.href}>
                <Link className="text-mutedText transition-colors hover:text-ink" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Explore">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-faintText">Explore</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {exploreLinks.map((link) => (
              <li key={link.href}>
                <Link className="text-mutedText transition-colors hover:text-ink" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-faintText">Trusted by</p>
          <ul className="mt-4 space-y-2.5 text-sm text-mutedText">
            <li>Official Meta Graph OAuth</li>
            <li>Instagram · Facebook · Threads</li>
            <li>Your data, retained locally</li>
          </ul>
        </div>
      </div>

      <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-borderSoft pt-6 text-xs text-mutedText sm:flex-row">
        <p>© {new Date().getFullYear()} EduVerse. All rights reserved.</p>
        <p className="font-mono">Social intelligence that remembers your audience.</p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <>
      <LandingPage />
      <Footer />
    </>
  );
}