import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-surface before:absolute before:inset-0 before:-translate-x-full before:animate-sheen before:bg-gradient-to-r before:from-transparent before:via-borderSoft before:to-transparent",
        className
      )}
    />
  );
}
