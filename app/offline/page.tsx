import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "You're offline",
  description: "EduVerse needs a connection to load your audience data."
};

export default function OfflinePage() { return <main className="grid min-h-screen place-items-center p-6 text-center"><div><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-primary"><WifiOff /></span><h1 className="mt-6 font-heading text-3xl font-medium tracking-tight">You&apos;re offline.</h1><p className="mt-3 text-mutedText">Reconnect to continue working with your audience data.</p><Link className="mt-6 inline-block" href="/dashboard"><Button>Try again</Button></Link></div></main>; }
