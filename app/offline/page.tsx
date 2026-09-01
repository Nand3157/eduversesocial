import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "You're offline",
  description: "EduVerse needs a connection to load your audience data."
};

export default function OfflinePage() {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-[#EEF3F9] p-6 text-ink dark:bg-[#0A0F1E] dark:text-white">
      <div className="w-full max-w-lg rounded-2xl border border-[#D6DFE8] bg-white p-8 text-center shadow-sm dark:border-[#1F2A44] dark:bg-[#141E32] sm:p-10">
        <span aria-hidden="true" className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--accent-soft)] text-primary"><WifiOff className="h-7 w-7" /></span>
        <h1 className="mt-6 font-heading text-3xl font-medium tracking-tight text-ink dark:text-white">You&apos;re offline.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-mutedText dark:text-[#A1A6B2]">EduVerse needs a connection for live Meta analytics, but your cached dashboard and recent chats are still available. Reconnect to refresh Graph data.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild><Link href="/dashboard">Open dashboard</Link></Button>
          <Button asChild variant="secondary" className="dark:border-[#2A2F3A] dark:bg-[#1A1E24] dark:text-white"><Link href="/">Back home</Link></Button>
        </div>
        <p className="mt-5 text-xs text-faintText dark:text-[#7F8694]">PWA installed — this page is served by the service worker when the network is unavailable.</p>
      </div>
    </main>
  );
}
