import type { Metadata } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import { Fraunces, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "EduVerse — Social intelligence that remembers your audience",
    template: "%s · EduVerse"
  },
  description:
    "EduVerse indexes Instagram Reels, Facebook Pages, and Threads engagement callbacks into a persistent audience memory, then shows you exactly what to post and when.",
  applicationName: "EduVerse",
  keywords: ["social media analytics", "Meta Graph API", "audience memory", "content scheduling", "Instagram analytics"],
  openGraph: {
    title: "EduVerse",
    description:
      "Social intelligence that remembers your audience. Post with context, not guesswork.",
    type: "website",
    siteName: "EduVerse",
    locale: "en_US"
  }
};

const sans = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
