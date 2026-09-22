"use client";

import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";

type Meteor = { top: number; left: number; delay: number; duration: number };

/** Deterministic hash so every mount produces the same sky. Replaces the old
 * setState-in-effect randomization: no hydration mismatch, no effect-time
 * state, and the field no longer reshuffles on every remount. */
function mhash(seed: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export function Meteors({ number = 18, className }: { number?: number; className?: string }) {
  const seed = useId();

  const meteors = useMemo<Meteor[]>(
    () =>
      Array.from({ length: number }, (_, i) => ({
        top: mhash(seed, i * 4) * 100,
        left: mhash(seed, i * 4 + 1) * 100,
        delay: mhash(seed, i * 4 + 2) * 6,
        duration: 5 + mhash(seed, i * 4 + 3) * 4,
      })),
    [number, seed]
  );

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden suppressHydrationWarning>
      {meteors.map((m, i) => (
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
