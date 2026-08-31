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
    { media: "(prefers-color-scheme: light)", color: "#12100E" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0C0A" }
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
        {/* THESIS: Archive is memory you can walk around — refuses KPI card wall + sprocket hero. OWN-WORLD: Walnut #12100E 45% + cream card #F7F3E8 + brass #D4A85A + cyan acetate 195° 12% + vermillion pin; walnut grain, linen, catalog typed card, acetate veil, brass hairline; JetBrains Mono fac + Sora display + Public Sans. STORY: Educator sees in 5 sec where audience terrain lies (atlas table), which acetate layers are live, what to pin next (recommendations on brass rail). FIRST VIEWPORT: Left catalog cabinet (drawer nav 236px), central atlas table 62% with acetate toggles + metric windows punched into table, right pin rail with recommendation flags; no hero metric. FORM: Archive Atlas #4/7 (Newsroom, Field Notebook, Telemetry, *Atlas Table*, Proofing, Herbarium, Patch Bay) seed 749e3fb6 assigned 4 — raised with Cape drape silhouette + Saville catalog code strip. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance */}
        <div dangerouslySetInnerHTML={{ __html: `<!-- THESIS: Archive is memory you can walk around — refuses KPI card wall + sprocket hero. OWN-WORLD: Walnut #12100E 45% + cream #F7F3E8 + brass #D4A85A + cyan acetate 12% + vermillion pin; walnut grain, linen, typed card, acetate veil, brass hairline. STORY: Educator sees terrain (atlas), layers, pinned next action. FIRST VIEWPORT: Catalog cabinet left, atlas table center with acetate toggles + punched metric windows, pin rail right. FORM: Archive Atlas #4/7 seed 749e3fb6 assigned 4 raised Cape+SAVILLE. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance -->` }} />
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
