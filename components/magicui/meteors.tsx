"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Meteor = { top: number; left: number; delay: number; duration: number };

export function Meteors({ number = 18, className }: { number?: number; className?: string }) {
  const [meteors, setMeteors] = useState<Meteor[] | null>(null);

  useEffect(() => {
    setMeteors(
      Array.from({ length: number }).map(() => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        delay: Math.random() * 6,
        duration: 5 + Math.random() * 4,
      }))
    );
  }, [number]);

  // SSR: render deterministic placeholders to avoid hydration mismatch; client replaces after mount
  const list =
    meteors ??
    Array.from({ length: number }).map((_, i) => ({
      top: ((i * 37) % 100),
      left: ((i * 57) % 100),
      delay: (i * 0.42) % 6,
      duration: 6,
    }));

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden suppressHydrationWarning>
      {list.map((m, i) => (
        <span
          key={i}
          className="absolute h-0.5 w-24 rotate-[35deg] animate-[meteor_6s_linear_infinite] bg-gradient-to-r from-[var(--accent)] to-transparent"
          style={{
            top: `${m.top}%`,
            left: `${m.left}%`,
            animationDelay: `${m.delay}s`,
            animationDuration: `${m.duration}s`,
          }}
        />
      ))}
      <style>{`@keyframes meteor { 0% { transform: rotate(35deg) translateX(0); opacity: 1; } 70% { opacity: 1; } 100% { transform: rotate(35deg) translateX(-500px); opacity: 0; } }`}</style>
    </div>
  );
}
