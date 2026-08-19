"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { useEffect(() => { console.error(error); }, [error]); return <main className="grid min-h-screen place-items-center p-6 text-center"><div><p className="text-sm font-semibold text-primary">Something went wrong</p><h1 className="mt-2 font-heading text-4xl font-medium tracking-tight">We couldn&apos;t load this view.</h1><p className="mt-3 text-mutedText">Your data is safe. Please try loading the page again.</p><Button className="mt-6" onClick={reset}><RefreshCw className="h-4 w-4" />Try again</Button></div></main>; }
