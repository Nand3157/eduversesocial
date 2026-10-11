"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section role="alert" className="mx-auto grid min-h-[50vh] max-w-xl place-items-center text-center">
      <div>
        <p className="text-sm font-semibold text-primary">This dashboard section is unavailable</p>
        <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight text-ink">Your other sections are still available.</h1>
        <p className="mt-3 text-sm leading-6 text-mutedText">Try loading this section again. If it keeps failing, check your connection or sign in again.</p>
        <Button className="mt-6" onClick={reset}><RefreshCw aria-hidden="true" className="h-4 w-4" />Retry section</Button>
      </div>
    </section>
  );
}
