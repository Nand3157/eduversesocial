import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
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
    type: "website"
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

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
