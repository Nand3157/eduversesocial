import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import { JetBrains_Mono, Public_Sans, Sora } from "next/font/google";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { buildOrganizationJsonLd } from "@/lib/agentic/site";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "EduVerse — Social intelligence that remembers your audience",
    template: "%s · EduVerse"
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "EduVerse — Social intelligence that remembers your audience",
    description: SITE_DESCRIPTION,
    url: "/",
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    title: "EduVerse — Social intelligence that remembers your audience",
    description: SITE_DESCRIPTION
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F1E9" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1115" }
  ]
};

const sans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

const display = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display"
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono"
});

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  // proxy.ts mints a per-request nonce in production; the inline theme script
  // must carry it to survive the strict CSP.
  const nonce = process.env.NODE_ENV === "production" ? ((await headers()).get("x-nonce") ?? undefined) : undefined;
  const organizationJsonLd = buildOrganizationJsonLd();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }}
        />
        <Script id="theme-init" strategy="beforeInteractive" nonce={nonce}>
          {`(function () {
  var stored = null;
  try { stored = localStorage.getItem("theme"); } catch (e) {}
  var dark = stored === "dark" || (stored !== "light" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
})();`}
        </Script>
        <Script id="sw-register" strategy="afterInteractive" nonce={nonce}>
          {`if ('serviceWorker' in navigator) { window.addEventListener('load', function() { navigator.serviceWorker.register('/sw.js').catch(function(){}) }); }`}
        </Script>
      </head>
      <body className={`${sans.variable} ${display.variable} ${mono.variable}`}>
        {/* THESIS: Your timeline is your memory — refuses warm-cream floating-card + hero-metric. OWN-WORLD: Ink #0F1115 + off-white #F6F1E9 + amber #FFB43A 40% committed; sprocket tape, light-table kraft, monitor bezel, KEPT grease, tally dot, mono timecode; Sora + Public Sans + JetBrains Mono; offset blur shadows. STORY: Solo creator sees live memory is indexed not invented, believes provenance via scrub, acts: sandbox or start free → connect. FIRST VIEWPORT: Timecode bar atop, ink bay split 60/40 — left light table 5 frames + 14-day playhead timeline, right loupe 168px detail + amber NEXT stamp; actions on stamp; headline 4.35rem. FORM: Edit Bay + Light Table #1/7 (Recorder, Light Table, Riso, Monitor, Pinboard, Control Wall, Notebook) seed 7c9ea9a5 user-pinned beats assigned Lab Notebook. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance */}
        <div dangerouslySetInnerHTML={{ __html: `<!-- THESIS: Your timeline is your memory — refuses warm-cream floating-card + hero-metric. OWN-WORLD: Ink #0F1115 + off-white #F6F1E9 + amber #FFB43A 40% committed; sprocket tape, light-table kraft, monitor bezel, KEPT grease, tally dot, mono timecode; Sora + Public Sans + JetBrains Mono. STORY: Solo creator sees live memory is indexed not invented, believes provenance via scrub, acts: sandbox or start free → connect. FIRST VIEWPORT: Timecode bar atop, ink bay 60/40 — left 5-frame light table + 14-day playhead timeline, right 168px loupe + amber NEXT stamp; actions on stamp; headline 4.35rem. FORM: Edit Bay + Light Table #1/7 seed 7c9ea9a5 user-pinned beats assigned Lab Notebook. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance -->` }} />
        <ThemeProvider>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </ThemeProvider>
      </body>
    </html>
  );
}
