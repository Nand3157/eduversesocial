"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Eye, LayoutDashboard, MessageSquareText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const dashboardTabs = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analytics", href: "/dashboard/analytics", icon: Sparkles },
  { label: "Chat", href: "/dashboard/chat", icon: MessageSquareText },
] as const;

export function LandingMobileDock() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-borderSoft bg-surface/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-md items-center gap-2">
        <Link href="/demo" className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-borderSoft bg-card px-4 py-3 text-sm font-semibold text-ink shadow-sm">
          <Eye className="h-4 w-4" /> Demo
        </Link>
        <Link href="/signup" className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm">
          Start free <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export function DashboardMobileDock() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-borderSoft bg-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
        {dashboardTabs.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-medium transition-colors",
                active ? "border-primary/20 bg-primary text-primary-foreground shadow-sm" : "border-transparent text-mutedText hover:bg-surface-muted hover:text-ink"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function DemoMobileDock() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-borderSoft bg-surface/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-md items-center gap-2">
        <Link href="/" className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-borderSoft bg-card px-4 py-3 text-sm font-medium text-ink">
          Home
        </Link>
        <Link href="/signup" className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm">
          Start free <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
