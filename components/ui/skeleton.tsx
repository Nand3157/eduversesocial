import { cn } from "@/lib/utils";

export function Skeleton({ className, label = "Loading…" }: { className?: string; label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative overflow-hidden rounded-lg bg-surface before:absolute before:inset-0 before:-translate-x-full before:animate-sheen before:bg-gradient-to-r before:from-transparent before:via-borderSoft before:to-transparent",
        className
      )}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}
