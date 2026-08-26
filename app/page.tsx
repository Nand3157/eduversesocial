import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, Sparkles } from "lucide-react";
import { LandingPage } from "@/components/landing-page";
import { SITE } from "@/lib/agentic/site";
import { faqPageJsonLd } from "@/lib/agentic/faq";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Social intelligence that remembers your audience",
  description:
    "EduVerse connects Instagram, Facebook, and Threads and turns real engagement into persistent audience memory with precise posting recommendations."
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "EduVerse",
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      email: SITE.email,
      telephone: SITE.phone,
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: SITE.contactPointType,
          email: SITE.email,
          telephone: SITE.phone,
          availableLanguage: ["English"]
        }
      ],
      address: {
        "@type": "PostalAddress",
        streetAddress: SITE.address.streetAddress,
        addressLocality: SITE.address.addressLocality,
        addressRegion: SITE.address.addressRegion,
        postalCode: SITE.address.postalCode,
        addressCountry: SITE.address.addressCountry
      }
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "EduVerse",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` }
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#app`,
      name: "EduVerse",
      applicationCategory: "SocialNetworkingApplication",
      operatingSystem: "Web",
      description:
        "Connects Instagram, Facebook, and Threads and turns real engagement into persistent audience memory with precise posting recommendations.",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }
    },
    faqPageJsonLd(SITE_URL)
  ]
};

const productLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Analytics", href: "/dashboard/analytics" },
  { label: "Content", href: "/dashboard/content" },
  { label: "Memory", href: "/dashboard/memory" },
  { label: "Recommendations", href: "/dashboard/recommendations" },
  { label: "AI Chat", href: "/dashboard/chat" }
];

const exploreLinks = [
  { label: "How it works", href: "/#telemetry" },
  { label: "Live Demo", href: "/demo" },
  { label: "Features", href: "/#features" },
  { label: "FAQ", href: "/#faq" },
  { label: "Sign in", href: "/login" },
  { label: "Create account", href: "/signup" }
];

function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-[var(--line-ink)] bg-[var(--surface-ink)] px-5 py-14 sm:px-8 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-3 sprocket-track opacity-20" aria-hidden />
      <div className="mx-auto grid max-w-[1280px] gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link aria-label="EduVerse home" className="inline-flex items-center gap-3" href="/">
            <span className="relative grid h-9 w-9 place-items-center rounded-[9px] bg-white text-ink">
              <Sparkles className="h-4 w-4" strokeWidth={2} />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)] tally-dot" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-white">
              Edu<span className="font-normal text-[var(--accent)]">Verse</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-mono tracking-widest text-white/60">
              EDIT BAY
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/60">
            Social intelligence that remembers your audience — live-only, provenance for every recommendation.
          </p>
          <div className="mt-6 space-y-2.5 text-sm">
            <a className="inline-flex items-center gap-2 text-white/60 hover:text-white" href="mailto:hello@eduverse.app">
              <Mail className="h-4 w-4 text-[var(--accent)]" /> hello@eduverse.app
            </a>
            <br />
            <a className="inline-flex items-center gap-2 text-white/60 hover:text-white" href="tel:+15550123456">
              <Phone className="h-4 w-4 text-[var(--accent)]" /> +1 (555) 012-3456
            </a>
          </div>
        </div>

        <nav aria-label="Product">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/40">Product</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {productLinks.map((link) => (
              <li key={link.href}>
                <Link className="text-white/60 hover:text-white" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Explore">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/40">Explore</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {exploreLinks.map((link) => (
              <li key={link.href}>
                <Link className="text-white/60 hover:text-white" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/40">Trusted by</p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/60">
            <li className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Official Meta Graph OAuth
            </li>
            <li>Instagram · Facebook · Threads</li>
            <li>Encrypted, revocable anytime</li>
            <li>
              <Link href="/privacy" className="font-medium text-[var(--accent)] hover:underline">
                Privacy & Data Security
              </Link>
            </li>
            <li>
              <Link href="/demo" className="font-medium text-[var(--accent)] hover:underline">
                Explore Live Demo (no login)
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-[1280px] flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
        <p>© <CurrentYear /> EduVerse. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/privacy" className="font-medium text-white/40 hover:text-white">
            Privacy Policy
          </Link>
          <Link href="/demo" className="font-medium text-white/40 hover:text-white">
            Live Demo
          </Link>
          <span className="font-mono">TC 00:42:11:04 · LIVE MEMORY ONLY</span>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }}
      />
      <LandingPage />
      <Footer />
    </>
  );
}

// The footer is a server component; without this the copyright year freezes at
// build time. Renders the request-time year, then corrects on the client.
function CurrentYear() {
  return <span suppressHydrationWarning>{new Date().getFullYear()}</span>;
}