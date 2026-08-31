"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bot,
  Brain,
  ChartNoAxesCombined,
  ChevronLeft,
  LayoutDashboard,
  Menu,
  Send,
  Settings,
  Sparkles,
  Star,
  TableProperties,
  WandSparkles,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { signOut } from "@/actions/auth";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { MetaConnectModal } from "@/components/meta/meta-connect-modal";
import { MetaPublisherModal } from "@/components/meta/meta-publisher-modal";
import { SPRING_SOFT } from "@/components/motion-variants";
import { AnalyticsProvider } from "@/components/dashboard/analytics-context";

const baseNavigation = [
  ["Dashboard", "/dashboard", LayoutDashboard, "FAC 001"],
  ["Analytics", "/dashboard/analytics", ChartNoAxesCombined, "FAC 014"],
  ["Memory", "/dashboard/memory", Brain, "FAC 022"],
  ["Content", "/dashboard/content", TableProperties, "FAC 030"],
  ["Recommendations", "/dashboard/recommendations", WandSparkles, "FAC 041"],
  ["AI Chat", "/dashboard/chat", Bot, "FAC 055"],
  ["Notifications", "/dashboard/notifications", Bell, "FAC 063"],
  ["Settings", "/dashboard/settings", Settings, "FAC 088"],
] as const;

const reviewNavEntry = ["Reviews", "/dashboard/reviews", Star, "FAC 071"] as const;

const subscribeNothing = () => () => undefined;
const getMounted = () => true;
const getServerMounted = () => false;

export function AppShell({ children, email, profile }: { children: React.ReactNode; email?: string; profile?: { display_name?: string | null; role?: string | null; bio?: string | null } | null }) {
  const pathname = usePathname();
  const { mobileNavOpen: open, sidebarCollapsed: collapsed, setMobileNavOpen: setOpen, toggleSidebar, userName, userEmail, setProfile } = useDashboardStore();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [publisherModalOpen, setPublisherModalOpen] = useState(false);
  const mobileNavCloseRef = useRef<HTMLButtonElement>(null);
  const mounted = useSyncExternalStore(subscribeNothing, getMounted, getServerMounted);

  const navigation = [...baseNavigation.slice(0, 6), reviewNavEntry, ...baseNavigation.slice(6)] as const;

  useEffect(() => {
    if (email) {
      setProfile({ email });
      if (userEmail && userEmail !== email) setProfile({ name: "", role: "", bio: "" });
    }
  }, [email, setProfile, userEmail]);

  useEffect(() => {
    if (profile && (profile.display_name || profile.role || profile.bio)) {
      setProfile({ name: profile.display_name || undefined, role: profile.role || undefined, bio: profile.bio || undefined });
    }
  }, [profile, setProfile]);

  const activeEmail = email || userEmail || "learner@eduverse.app";
  const displayName = mounted ? userName : "";
  const avatarInitials = displayName ? displayName.trim().split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : activeEmail.slice(0, 2).toUpperCase();

  const closeMobileNav = useCallback(() => setOpen(false), [setOpen]);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    mobileNavCloseRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") closeMobileNav(); };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = prevOverflow; prev?.focus?.(); };
  }, [open, closeMobileNav]);

  const cabinet = (pillId?: string) => (
    <aside className={cn("flex h-full flex-col bg-[#F8FAFC] dark:bg-[#0B1220] text-ink border-r border-[#D6DFE8] dark:border-[#1F2A44] shadow-[2px_0_12px_rgba(11,18,32,0.04)] dark:shadow-[2px_0_12px_rgba(0,0,0,0.22)]", collapsed && "lg:w-[76px]")}>
      {/* top brass plate */}
      <div className="shrink-0 border-b border-borderSoft bg-surface">
        <div className="flex items-center justify-between px-3 py-3.5">
          <Link href="/dashboard" aria-label="EduVerse" className="flex items-center gap-3 overflow-hidden">
            <img src="/icon.svg" alt="EduVerse" width={36} height={36} className="h-9 w-9 shrink-0 rounded-[9px] shadow-[0_1px_0_rgba(0,0,0,0.12)] object-cover" />
            <span className={cn("overflow-hidden whitespace-nowrap flex items-center transition-[clip-path,opacity] duration-300", collapsed ? "clip-path-[inset(0_100%_0_0)] opacity-0" : "opacity-100")}>
              <span className="block font-display text-[15px] font-semibold tracking-tight leading-none">EduVerse</span>
            </span>
          </Link>
          <button aria-label="Collapse cabinet" onClick={toggleSidebar} className="hidden h-8 w-8 place-items-center text-faintText hover:text-ink lg:grid">
            <ChevronLeft aria-hidden="true" className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>
        {!collapsed && <div className="brass-rule mx-3 opacity-20" aria-hidden="true" />}
        {!collapsed && (
          <div className="px-3 py-2.5">
            <p className="mono text-[10px] tracking-[0.12em] text-faintText">CATALOG — AUDIENCE MEMORY</p>
            <p className="mt-1 text-xs leading-4 text-mutedText">Live acetate on atlas table. Pull a drawer.</p>
          </div>
        )}
      </div>

      <nav aria-label="Archive drawers" className="flex-1 overflow-y-auto px-2 py-3">
        <div className={cn("grid gap-1", collapsed && "gap-1.5")}>
          {navigation.map(([label, href, Icon], idx) => {
            const active = pathname === href;
            const isDividerAfter = (idx === 3 || idx === 6) && !collapsed;
            return (
              <div key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? label : undefined}
                  onClick={() => setOpen(false)}
                  className={cn("group relative flex items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-sm transition-colors", collapsed ? "justify-center" : "justify-start")}
                >
                  {/* drawer plate */}
                  <span
                    className={cn(
                      "absolute inset-0 rounded-[10px] border transition-colors",
                      active ? "bg-ink border-ink text-background shadow-sm" : "border-transparent bg-transparent text-mutedText group-hover:bg-surface-muted group-hover:text-ink"
                    )}
                    aria-hidden="true"
                  />
                  <span className={cn("relative grid h-7 w-7 place-items-center rounded-[8px] border shrink-0 transition-colors", active ? "bg-background text-primary border-borderSoft" : "bg-surface-muted text-mutedText border-borderSoft")}>
                    <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                  </span>
                  {!collapsed && (
                    <span className="relative flex flex-1 items-center gap-2 overflow-hidden">
                      <span className={cn("truncate text-[13px] font-medium tracking-tight", active ? "text-background" : "text-current")}>{label}</span>
                    </span>
                  )}
                </Link>
                {isDividerAfter && <div aria-hidden="true" className="mx-2 my-2 h-px bg-borderSoft" />}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="shrink-0 border-t border-borderSoft bg-surface p-3">
        {!collapsed ? (
          <div className="space-y-3">
            <button onClick={() => setConnectModalOpen(true)} className="flex w-full items-center justify-between rounded-full bg-[#D4A85A] px-3.5 py-2.5 text-sm font-semibold text-[#1A1206] shadow-[0_1px_0_rgba(0,0,0,0.12),0_6px_16px_rgba(212,168,90,0.18)] transition hover:bg-[#E8C27A]">
              <span className="flex items-center gap-2"><Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Meta sync</span>
              <span className="mono rounded-full bg-[#1A1206] px-2 py-0.5 text-[10px] tracking-[0.12em] text-[#D4A85A]">LIVE</span>
            </button>
            <div className="rounded-[12px] border border-borderSoft bg-surface-muted p-3">
              <div className="flex items-center justify-between">
                <span className="mono text-[10px] tracking-[0.14em] text-faintText">ATLAS TABLE</span>
                <span className="flex items-center gap-1.5 mono text-[10px] tracking-[0.10em] text-success"><span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" /> READY</span>
              </div>
              <p className="mt-1.5 text-xs leading-4 text-mutedText">Lay acetates to read terrain. Pins hold next actions.</p>
            </div>
          </div>
        ) : (
          <div className="grid place-items-center gap-2">
            <button onClick={() => setConnectModalOpen(true)} aria-label="Meta sync" className="grid h-9 w-9 place-items-center rounded-full bg-[#D4A85A] text-[#1A1206]"><Sparkles aria-hidden="true" className="h-4 w-4" /></button>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className={cn("dashboard-canvas min-h-screen text-ink", collapsed ? "lg:grid lg:grid-cols-[76px_1fr]" : "lg:grid lg:grid-cols-[272px_1fr]")}>
      <ScrollProgress />
      <AnalyticsProvider>
        <MetaConnectModal isOpen={connectModalOpen} onClose={() => setConnectModalOpen(false)} onConnected={() => window.dispatchEvent(new Event("eduverse:analytics-refresh"))} />
        <MetaPublisherModal isOpen={publisherModalOpen} onClose={() => setPublisherModalOpen(false)} />

        <div className="sticky top-0 hidden h-screen lg:block">{cabinet("nav-pill")}</div>

        <AnimatePresence>
          {open && (
            <motion.div animate={{ opacity: 1 }} exit={{ opacity: 0 }} initial={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="fixed inset-0 z-50 lg:hidden">
              <div role="dialog" aria-modal="true" aria-label="Archive cabinet" className="absolute inset-0">
                <button aria-label="Close cabinet" tabIndex={-1} className="absolute inset-0 bg-[#0F0D0A]/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
                <motion.div animate={{ x: 0 }} exit={{ x: -280 }} initial={{ x: -280 }} transition={{ type: "spring", stiffness: 320, damping: 32 }} className="relative h-full w-[300px] bg-surface border-r border-borderSoft">
                  {cabinet()}
                  <button ref={mobileNavCloseRef} aria-label="Close cabinet" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-ink text-background" onClick={() => setOpen(false)}><X aria-hidden="true" className="h-4 w-4" /></button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-[64px] items-center gap-3 border-b border-borderSoft bg-background/85 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/72 sm:px-6">
            <Button aria-label="Open cabinet" className="lg:hidden bg-surface text-ink hover:bg-surface-muted border border-borderSoft" onClick={() => setOpen(true)} size="icon" variant="secondary"><Menu aria-hidden="true" className="h-5 w-5" /></Button>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="mono text-[10px] tracking-[0.16em] text-faintText">DRAWER</span>
              <span className="h-3 w-px bg-borderSoft" aria-hidden="true" />
              <span className="mono text-xs tracking-[0.08em] text-ink">{(navigation.find(([,h]) => h===pathname)?.[0] as string) ?? "Dashboard"}</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setPublisherModalOpen(true)} className="hidden items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold tracking-tight text-background shadow-sm hover:bg-ink/90 sm:inline-flex">
                <Send aria-hidden="true" className="h-3.5 w-3.5" /> Schedule post
              </button>
              <ThemeToggle />
              <Button asChild aria-label="Notifications" size="icon" variant="secondary" className="bg-surface border-borderSoft text-mutedText hover:text-ink">
                <Link href="/dashboard/notifications"><Bell aria-hidden="true" className="h-4 w-4" /></Link>
              </Button>
              <form action={signOut}>
                <button aria-label={`Sign out${displayName ? `, ${displayName}` : ""}`} title={`${displayName || "Signed in"} · ${activeEmail}`} className="rounded-full outline-none ring-[#D4A85A] hover:opacity-90 focus-visible:ring-2">
                  <Avatar className="h-9 w-9 border border-borderSoft"><AvatarFallback className="bg-accent-soft font-semibold text-primary">{avatarInitials}</AvatarFallback></Avatar>
                </button>
              </form>
            </div>
          </header>

          <main id="main-content" className="p-4 sm:p-6 lg:p-8">
            <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}>
              {children}
            </motion.div>
          </main>
        </div>
      </AnalyticsProvider>
    </div>
  );
}
