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
  X
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
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Analytics", "/dashboard/analytics", ChartNoAxesCombined],
  ["Memory", "/dashboard/memory", Brain],
  ["Content", "/dashboard/content", TableProperties],
  ["Recommendations", "/dashboard/recommendations", WandSparkles],
  ["AI Chat", "/dashboard/chat", Bot],
  ["Notifications", "/dashboard/notifications", Bell],
  ["Settings", "/dashboard/settings", Settings]
] as const;

const reviewNavEntry = ["Reviews", "/dashboard/reviews", Star] as const;

const subscribeNothing = () => () => undefined;
const getMounted = () => true;
const getServerMounted = () => false;

export function AppShell({ children, email, profile }: { children: React.ReactNode; email?: string; profile?: { display_name?: string | null; role?: string | null; bio?: string | null } | null }) {
  const pathname = usePathname();
  const { mobileNavOpen: open, sidebarCollapsed: collapsed, setMobileNavOpen: setOpen, toggleSidebar, userName, userEmail, setProfile } = useDashboardStore();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [publisherModalOpen, setPublisherModalOpen] = useState(false);
  const mobileNavCloseRef = useRef<HTMLButtonElement>(null);
  // The persisted zustand store rehydrates after mount; gate identity-derived
  // UI behind `mounted` so server HTML and first client render agree.
  const mounted = useSyncExternalStore(subscribeNothing, getMounted, getServerMounted);

  // Reviews moderation is owner-only via the API (REVIEW_ADMIN_EMAIL env).
  // Keep the nav entry visible for all signed-in users — the page itself
  // shows a restricted state for non-owners based on the API 403 response,
  // so no email literal needs to live in client code.
  const navigation = [...baseNavigation.slice(0, 6), reviewNavEntry, ...baseNavigation.slice(6)] as const;

  useEffect(() => {
    if (email) {
      setProfile({ email });
      // A different user signed in on this browser: the persisted store still
      // holds the previous user's identity (or the demo persona). Clear the
      // name/role/bio so the header and greeting never leak across accounts;
      // the profile-seeding effect below re-applies them from the DB when
      // available.
      if (userEmail && userEmail !== email) {
        setProfile({ name: "", role: "", bio: "" });
      }
    }
  }, [email, setProfile, userEmail]);

  // Seed the store from the persisted profile so the name/role/bio are live
  // across reloads and sessions (the DB is the source of truth).
  useEffect(() => {
    if (profile && (profile.display_name || profile.role || profile.bio)) {
      setProfile({
        name: profile.display_name || undefined,
        role: profile.role || undefined,
        bio: profile.bio || undefined
      });
    }
  }, [profile, setProfile]);

  const activeEmail = email || userEmail || "learner@eduverse.app";
  const displayName = mounted ? userName : "";
  const avatarInitials = displayName
    ? displayName
        .trim()
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : activeEmail.slice(0, 2).toUpperCase();

  // Mobile nav drawer behaves as a modal dialog: Escape closes, focus moves in
  // on open and returns to the trigger on close, background scroll is locked.
  const closeMobileNav = useCallback(() => setOpen(false), [setOpen]);
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    mobileNavCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileNav();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, closeMobileNav]);

  const sidebar = (pillLayoutId?: string) => (
    <aside className={cn("flex h-full flex-col border-r border-borderSoft bg-surface p-3.5 transition-[width] duration-300 ease-out", collapsed && "lg:w-[76px]")}>
      <div className="flex items-center justify-between px-2 py-2">
        <Link aria-label="EduVerse dashboard" className="flex items-center gap-2.5 overflow-hidden" href="/dashboard">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-background">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
          </span>
          <span aria-hidden={collapsed} className={cn("overflow-hidden whitespace-nowrap font-display text-[1.05rem] font-semibold tracking-tight text-ink transition-[clip-path,opacity] duration-300 ease-out", collapsed ? "clip-path-[inset(0_100%_0_0)] opacity-0" : "clip-path-[inset(0_0_0_0)] opacity-100")}>
            EduVerse
          </span>
        </Link>
        <button aria-label="Collapse navigation" className="hidden min-h-11 min-w-11 place-items-center text-faintText hover:text-ink lg:grid" onClick={toggleSidebar}>
          <ChevronLeft aria-hidden="true" className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav aria-label="Dashboard navigation" className="mt-5 space-y-1">
        {navigation.map(([label, href, Icon], idx) => {
          const active = pathname === href;
          const showDivider = (idx === 3 || idx === 6) && !collapsed;
          return (
            <div key={href}>
              <Link
                className={cn(
                  "relative flex min-h-11 items-center gap-3 rounded-full px-3.5 text-sm font-medium transition-colors duration-150",
                  active ? "text-white" : "text-mutedText hover:text-ink"
                )}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                title={collapsed ? label : undefined}
              >
                {active && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-primary"
                    layoutId={pillLayoutId}
                    transition={SPRING_SOFT}
                  />
                )}
                <motion.span
                  animate={active ? { scale: 1.08 } : { scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={SPRING_SOFT}
                  className="grid shrink-0 place-items-center"
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </motion.span>
                <span aria-hidden={collapsed} className={cn("relative z-10 overflow-hidden transition-[clip-path,opacity] duration-300 ease-out", collapsed ? "clip-path-[inset(0_100%_0_0)] opacity-0 pointer-events-none" : "clip-path-[inset(0_0_0_0)] opacity-100")}>{label}</span>
              </Link>
              {showDivider && <div aria-hidden="true" className="mx-3 my-1 h-px bg-borderSoft/60" />}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2.5">
        {!collapsed && (
          <button
            onClick={() => setConnectModalOpen(true)}
            className="flex w-full items-center justify-between rounded-full border border-primary/25 bg-accent-soft px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-accent-soft/70"
          >
            <span className="flex items-center gap-2">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              Meta sync
            </span>
              <span className="text-[10px] font-mono text-mutedText">Live</span>
          </button>
        )}

        {!collapsed && (
          <div className="rounded-xl border border-borderSoft bg-card p-3.5 text-xs text-mutedText">
            <div className="flex items-center justify-between">
              <strong className="font-medium text-ink">Live telemetry</strong>
              <span className="font-mono text-success">Meta</span>
            </div>
            <p className="mt-1 text-[11px] leading-4">Connect Meta to load workspace signals.</p>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className={cn("dashboard-canvas min-h-screen bg-background text-ink transition-[grid-template-columns] duration-300 ease-out", collapsed ? "lg:grid lg:grid-cols-[76px_1fr]" : "lg:grid lg:grid-cols-[250px_1fr]")}>
      <ScrollProgress />
      <AnalyticsProvider>
      <MetaConnectModal isOpen={connectModalOpen} onClose={() => setConnectModalOpen(false)} onConnected={() => window.dispatchEvent(new Event("eduverse:analytics-refresh"))} />
      <MetaPublisherModal isOpen={publisherModalOpen} onClose={() => setPublisherModalOpen(false)} />

      <div className="sticky top-0 hidden h-screen lg:block">{sidebar("nav-pill")}</div>

      <AnimatePresence>
        {open && (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 lg:hidden"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div role="dialog" aria-modal="true" aria-label="Dashboard navigation" className="absolute inset-0">
              <button aria-label="Close navigation" tabIndex={-1} className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
              <motion.div
                animate={{ x: 0 }}
                className="relative h-full w-[280px]"
                exit={{ x: -280 }}
                initial={{ x: -280 }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
              >
                {sidebar()}
                <button
                  ref={mobileNavCloseRef}
                  aria-label="Close navigation"
                  className="absolute right-4 top-4 grid h-11 w-11 place-items-center text-faintText hover:text-ink"
                  onClick={() => setOpen(false)}
                >
                  <X aria-hidden="true" />
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-borderSoft bg-background/85 px-4 backdrop-blur-xl sm:px-6">
          <Button aria-label="Open navigation" className="lg:hidden" onClick={() => setOpen(true)} size="icon" variant="secondary">
            <Menu aria-hidden="true" className="h-5 w-5" />
          </Button>

          <div className="ml-auto flex items-center gap-2.5">
            <button
              onClick={() => setPublisherModalOpen(true)}
              className="hidden touch-manipulation items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-medium text-background transition-[background-color] hover:bg-ink/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none sm:inline-flex"
            >
              <Send aria-hidden="true" className="h-3.5 w-3.5" />
              Schedule post
            </button>
            <ThemeToggle />
            <Button asChild aria-label="Notifications" size="icon" variant="secondary">
              <Link href="/dashboard/notifications">
                <Bell aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
            <form action={signOut}>
              <button
                aria-label={`Sign out${displayName ? `, signed in as ${displayName}` : ""}`}
                title={displayName ? `Signed in as ${displayName} (${activeEmail})` : `Signed in as ${activeEmail}`}
                className="rounded-full outline-none transition hover:opacity-85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Avatar>
                  <AvatarFallback className="bg-accent-soft font-semibold text-primary">{avatarInitials}</AvatarFallback>
                </Avatar>
              </button>
            </form>
          </div>
        </header>

        <main id="main-content" className="p-4 sm:p-6 lg:p-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
      </AnalyticsProvider>
    </div>
  );
}
