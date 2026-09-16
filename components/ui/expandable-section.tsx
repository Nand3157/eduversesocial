"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type ExpandableSectionProps = {
  title: string;
  kicker?: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  countLabel?: string;
  icon?: React.ReactNode;
  collapsibleOn?: "mobile" | "always";
};

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
}

export function ExpandableSection({
  title,
  kicker,
  description,
  defaultOpen = false,
  children,
  className,
  headerClassName,
  countLabel,
  icon,
  collapsibleOn = "mobile",
}: ExpandableSectionProps) {
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(defaultOpen);

  const collapsible = collapsibleOn === "always" || isMobile;

  // On desktop for mobile-only sections, force open
  const isOpen = collapsible ? open : true;

  return (
    <section className={cn("overflow-hidden rounded-2xl border border-borderSoft bg-card shadow-glass sm:rounded-2xl", className)}>
      <button
        type="button"
        aria-expanded={isOpen}
        disabled={!collapsible}
        onClick={() => collapsible && setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5 sm:py-4",
          collapsible ? "cursor-pointer touch-manipulation active:bg-surface-muted/50" : "cursor-default",
          headerClassName
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {icon && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-primary/20 bg-accent-soft text-primary">{icon}</span>}
          <div className="min-w-0">
            {kicker && <p className="mono text-[10px] tracking-[0.14em] text-faintText">{kicker}</p>}
            <h2 className="truncate font-heading text-[15px] font-semibold tracking-tight text-ink sm:text-base">{title}</h2>
            {description && <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-mutedText sm:line-clamp-none">{description}</p>}
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          {countLabel && (
            <span className="hidden rounded-full bg-surface-muted px-2.5 py-1 mono text-[10px] tracking-[0.10em] text-mutedText sm:inline-flex">{countLabel}</span>
          )}
          {collapsible && (
            <span className={cn("grid h-8 w-8 place-items-center rounded-full border border-borderSoft bg-surface text-mutedText transition-all", isOpen && "rotate-180 border-primary/20 bg-accent-soft text-primary")}>
              <ChevronDown className="h-4 w-4" />
            </span>
          )}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={collapsible && !reduceMotion ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={collapsible && !reduceMotion ? { height: 0, opacity: 0 } : undefined}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-borderSoft bg-card px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
              {children}
            </div>
            {/* mobile count below content for thumb */}
            {countLabel && collapsible && (
              <div className="border-t border-borderSoft bg-surface-muted px-4 py-2.5 sm:hidden">
                <span className="mono text-[10px] tracking-[0.10em] text-faintText">{countLabel}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// Simpler inline accordion for landing dark cards (uses details summary styling but with motion)
export function MobileAccordion({
  title,
  children,
  defaultOpen = false,
  kicker,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  kicker?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const reduceMotion = useReducedMotion();
  return (
    <div className="overflow-hidden rounded-2xl border border-borderSoft bg-card lg:hidden">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <div>
          {kicker && <p className="mono text-[10px] tracking-[0.14em] text-faintText">{kicker}</p>}
          <p className="font-heading text-sm font-semibold tracking-tight text-ink">{title}</p>
        </div>
        <span className={cn("grid h-8 w-8 place-items-center rounded-full border border-borderSoft bg-surface text-mutedText transition-transform", open && "rotate-180 bg-primary text-ink border-primary")}>
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-borderSoft"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
