"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type GlassHeaderProps = {
  children: ReactNode;
  className?: string;
};

export function GlassHeader({ children, className }: GlassHeaderProps) {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      if (frame) return;

      frame = window.requestAnimationFrame(() => {
        const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
        const progress = Math.min(window.scrollY / maxScroll, 1);
        const header = headerRef.current;

        header?.style.setProperty("--app-glass-shift", `${-40 + progress * 120}%`);
        header?.style.setProperty("--app-glass-opacity", `${0.12 + progress * 0.12}`);
        header?.classList.toggle("app-glass-header-scrolled", window.scrollY > 12);
        frame = 0;
      });
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    update();

    if (!reducedMotion) {
      window.addEventListener("scroll", update, { passive: true });
    }

    return () => {
      window.removeEventListener("scroll", update);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header ref={headerRef} className={cn("app-glass-header sticky top-4 z-30", className)}>
      {children}
    </header>
  );
}
