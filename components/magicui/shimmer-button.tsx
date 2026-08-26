"use client";

import { cn } from "@/lib/utils";

export function ShimmerButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-full bg-ink px-6 py-3 text-sm font-medium text-background transition hover:bg-ink/90",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer-slide_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent",
        className
      )}
      {...props}
    >
      <span className="relative flex items-center gap-2">{children}</span>
    </button>
  );
}
