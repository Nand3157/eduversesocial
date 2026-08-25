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
    <main id="main-content" className="grid min-h-screen place-items-center p-6 text-center bg-background">
      <div className="max-w-md">
        <span aria-hidden="true" className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-primary"><WifiOff /></span>
        <h1 className="mt-6 font-heading text-3xl font-medium tracking-tight text-ink">You&apos;re offline.</h1>
        <p className="mt-3 text-sm leading-6 text-mutedText">EduVerse needs a connection for live Meta analytics, but your cached dashboard and recent chats are still available. Reconnect to refresh Graph data.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild><Link href="/dashboard">Open dashboard</Link></Button>
          <Button asChild variant="secondary"><Link href="/">Back home</Link></Button>
        </div>
        <p className="mt-4 text-xs text-faintText">PWA installed — this page is served by the service worker when the network is unavailable.</p>
      </div>
    </main>
  );
}
