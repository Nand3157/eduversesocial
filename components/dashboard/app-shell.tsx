"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
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
  PlugZap,
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
import { AnalyticsProvider, useAnalytics } from "@/components/dashboard/analytics-context";
import { AnalyticsErrorBanner } from "@/components/dashboard/analytics-error-banner";
import { GlassHeader } from "@/components/layout/glass-header";
import { DashboardMobileDock } from "@/components/ui/mobile-bottom-nav";
import type { AnalyticsSnapshot } from "@/lib/meta-analytics";

const baseNavigation = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Analytics", "/dashboard/analytics", ChartNoAxesCombined],
  ["Memory", "/dashboard/memory", Brain],
  ["Content", "/dashboard/content", TableProperties],
  ["Recommendations", "/dashboard/recommendations", WandSparkles],
  ["AI Chat", "/dashboard/chat", Bot],
  ["Notifications", "/dashboard/notifications", Bell],
  ["Integrations", "/dashboard/integrations", PlugZap],
  ["Settings", "/dashboard/settings", Settings],
] as const;

const reviewNavEntry = ["Reviews", "/dashboard/reviews", Star] as const;

const subscribeNothing = () => () => undefined;
const getMounted = () => true;
const getServerMounted = () => false;

/**
 * Connection copy for the sidebar. It has to come from the analytics context:
 * the shell used to print "connect Meta" prompts even while a live account was
 * feeding the dashboard it sits next to.
 */
function SidebarConnectionNote({ className, emptyOnly = false }: { className?: string; emptyOnly?: boolean }) {
  const { accounts, data, loading, error } = useAnalytics();
  // A stored account is not the same as a working one: a revoked token or
  // missing Page permission keeps the row while Meta returns nothing.
  const healthy = accounts.filter((account) => account.status === "active").length;
  if (emptyOnly && (accounts.length > 0 || loading || (error && !data?.success))) return null;

  const message = accounts.length > 0 && healthy === 0
    ? `${accounts.length} Meta account${accounts.length === 1 ? "" : "s"} connected, but Meta is not returning data. Reconnect from Settings.`
    : healthy > 0
      ? `${healthy} Meta account${healthy === 1 ? "" : "s"} connected. Live analytics and recommendations are on.`
      : error && !data?.success
        ? "Meta data is unavailable right now. Retry from any dashboard page."
        : loading
          ? "Checking your Meta connection…"
          : emptyOnly
            ? "Live analytics and recommendations appear after you connect an account."
            : "Connect Meta to see live audience data and recommendations.";

  return <p className={cn(emptyOnly && "rounded-[12px] border border-borderSoft bg-surface-muted p-3", className)}>{message}</p>;
}

function SidebarMetaAction({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  const { accounts, data, loading } = useAnalytics();
  const hasAccounts = accounts.length > 0;
  const label = hasAccounts ? "Manage Meta accounts" : loading && !data ? "Checking Meta…" : "Connect Meta";
  const Icon = hasAccounts ? Settings : Sparkles;

  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={cn(
        "bg-primary text-primary-foreground shadow-sm transition hover:bg-primary-strong",
        collapsed ? "grid h-9 w-9 place-items-center rounded-full" : "flex w-full items-center justify-between rounded-full px-3.5 py-2.5 text-sm font-semibold"
      )}
    >
      {collapsed ? <Icon aria-hidden="true" className="h-4 w-4" /> : <span className="flex items-center gap-2"><Icon aria-hidden="true" className="h-3.5 w-3.5" /> {label}</span>}
    </button>
  );
}

function AnalyticsAccountSelector() {
  const { accounts, selectedAccountId, selectAccount, loading } = useAnalytics();
  if (accounts.length < 2) return null;

  return (
    <label className="flex min-w-0 items-center gap-2 rounded-full border border-borderSoft bg-surface px-3 py-1.5 text-xs text-mutedText shadow-sm">
      <span className="shrink-0">Account</span>
      <select
        aria-label="Filter analytics by Meta account"
        value={selectedAccountId}
        onChange={(event) => selectAccount(event.currentTarget.value)}
        aria-busy={loading}
        className="min-w-0 max-w-[160px] cursor-pointer truncate bg-transparent font-medium text-ink outline-none sm:max-w-[220px]"
      >
        <option value="">All accounts</option>
        {accounts.map((account) => (
          <option key={`${account.platform}-${account.id}`} value={account.id}>
            {account.name} · {account.platform === "facebook" ? "Facebook" : account.platform === "instagram" ? "Instagram" : "Threads"}
          </option>
        ))}
      </select>
      {loading && <span className="sr-only" role="status">Loading selected account analytics</span>}
    </label>
  );
}

export function AppShell({ children, email, profile, initialAnalytics }: { children: React.ReactNode; email?: string; profile?: { display_name?: string | null; role?: string | null; bio?: string | null } | null; initialAnalytics?: AnalyticsSnapshot | null }) {
  const pathname = usePathname();
  const { mobileNavOpen: open, sidebarCollapsed: collapsed, setMobileNavOpen: setOpen, toggleSidebar, userName, userEmail, setProfile } = useDashboardStore();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [publisherModalOpen, setPublisherModalOpen] = useState(false);
  const mobileNavCloseRef = useRef<HTMLButtonElement>(null);
  const mobileNavDialogRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(subscribeNothing, getMounted, getServerMounted);

  useEffect(() => {
    const openMetaConnect = () => setConnectModalOpen(true);
    window.addEventListener("eduverse:open-meta-connect", openMetaConnect);
    return () => window.removeEventListener("eduverse:open-meta-connect", openMetaConnect);
  }, []);

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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobileNav();
      if (e.key !== "Tab") return;
      const focusable = Array.from(mobileNavDialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])') ?? []).filter((element) => element.tabIndex !== -1 && element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = prevOverflow; prev?.focus?.(); };
  }, [open, closeMobileNav]);

  const sidebar = () => (
    <aside className={cn("flex h-full flex-col bg-surface text-ink border-r border-borderSoft shadow-sm", collapsed && "lg:w-[76px]")}>
      {/* top brass plate */}
      <div className="shrink-0 border-b border-borderSoft bg-surface">
        <div className="flex items-center justify-between px-3 py-3.5">
          <Link href="/dashboard" aria-label="EduVerse" className="flex items-center gap-3 overflow-hidden">
            <Image src="/icon.svg" alt="EduVerse" width={36} height={36} className="h-9 w-9 shrink-0 rounded-[9px] shadow-[0_1px_0_rgba(0,0,0,0.12)] object-cover" />
            <span className={cn("overflow-hidden whitespace-nowrap flex items-center transition-[clip-path,opacity] duration-300", collapsed ? "clip-path-[inset(0_100%_0_0)] opacity-0" : "opacity-100")}>
              <span className="block font-display text-[15px] font-semibold tracking-tight leading-none">EduVerse</span>
            </span>
          </Link>
          <button aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={toggleSidebar} className="hidden h-8 w-8 place-items-center text-faintText hover:text-ink lg:grid">
            <ChevronLeft aria-hidden="true" className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>
        {!collapsed && <div className="brass-rule mx-3 opacity-20" aria-hidden="true" />}
        {!collapsed && (
          <div className="px-3 py-2.5">
            <p className="mono text-[10px] tracking-[0.12em] text-faintText">AUDIENCE MEMORY</p>
            <SidebarConnectionNote className="mt-1 text-xs leading-4 text-mutedText" />
          </div>
        )}
      </div>

      <nav aria-label="Dashboard navigation" className="flex-1 overflow-y-auto px-2 py-3">
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
                  {/* Navigation item surface */}
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
            <SidebarMetaAction collapsed={false} onClick={() => setConnectModalOpen(true)} />
            <SidebarConnectionNote emptyOnly className="text-xs leading-4 text-mutedText" />
          </div>
        ) : (
          <div className="grid place-items-center gap-2">
            <SidebarMetaAction collapsed onClick={() => setConnectModalOpen(true)} />
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className={cn("dashboard-canvas min-h-screen text-ink", collapsed ? "lg:grid lg:grid-cols-[76px_1fr]" : "lg:grid lg:grid-cols-[272px_1fr]")}>
      <ScrollProgress />
      <AnalyticsProvider initialData={initialAnalytics ?? null}>
        <MetaConnectModal isOpen={connectModalOpen} onClose={() => setConnectModalOpen(false)} onConnected={() => window.dispatchEvent(new Event("eduverse:analytics-refresh"))} />
        <MetaPublisherModal isOpen={publisherModalOpen} onClose={() => setPublisherModalOpen(false)} />

        <div className="sticky top-0 hidden h-screen lg:block">{sidebar()}</div>

        <AnimatePresence>
          {open && (
            <motion.div animate={{ opacity: 1 }} exit={{ opacity: 0 }} initial={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="fixed inset-0 z-50 lg:hidden">
              <div ref={mobileNavDialogRef} role="dialog" aria-modal="true" aria-label="Dashboard navigation" className="absolute inset-0">
                <button aria-label="Close navigation menu" tabIndex={-1} className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
                <motion.div animate={{ x: 0 }} exit={{ x: -280 }} initial={{ x: -280 }} transition={{ type: "spring", stiffness: 320, damping: 32 }} className="relative h-full w-[300px] bg-surface border-r border-borderSoft">
                  {sidebar()}
                  <button ref={mobileNavCloseRef} aria-label="Close navigation menu" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-ink text-background" onClick={() => setOpen(false)}><X aria-hidden="true" className="h-4 w-4" /></button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="min-w-0" inert={open || undefined}>
          <GlassHeader className="flex h-[64px] items-center gap-3 px-4 sm:px-6">
            <Button aria-label="Open navigation menu" className="lg:hidden bg-surface text-ink hover:bg-surface-muted border border-borderSoft" onClick={() => setOpen(true)} size="icon" variant="secondary"><Menu aria-hidden="true" className="h-5 w-5" /></Button>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="mono text-[10px] tracking-[0.16em] text-faintText">WORKSPACE</span>
              <span className="h-3 w-px bg-borderSoft" aria-hidden="true" />
              <span className="mono text-xs tracking-[0.08em] text-ink">{(navigation.find(([,h]) => h===pathname)?.[0] as string) ?? "Dashboard"}</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <AnalyticsAccountSelector />
              <button onClick={() => setPublisherModalOpen(true)} className="hidden items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold tracking-tight text-primary-foreground shadow-sm hover:bg-primary-strong sm:inline-flex">
                <Send aria-hidden="true" className="h-3.5 w-3.5" /> Schedule post
              </button>
              <ThemeToggle />
              <Button asChild aria-label="Notifications" size="icon" variant="secondary" className="bg-surface border-borderSoft text-mutedText hover:text-ink">
                <Link href="/dashboard/notifications"><Bell aria-hidden="true" className="h-4 w-4" /></Link>
              </Button>
              <form action={signOut}>
                <button aria-label={`Sign out${displayName ? `, ${displayName}` : ""}`} title={`${displayName || "Signed in"} · ${activeEmail}`} className="rounded-full outline-none ring-primary hover:opacity-90 focus-visible:ring-2">
                  <Avatar className="h-9 w-9 border border-borderSoft"><AvatarFallback className="bg-accent-soft font-semibold text-primary">{avatarInitials}</AvatarFallback></Avatar>
                </button>
              </form>
            </div>
          </GlassHeader>

          <main id="main-content" className="p-4 pb-[calc(80px_+_env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(80px_+_env(safe-area-inset-bottom))] lg:p-8 lg:pb-8">
            <AnalyticsErrorBanner />
            <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}>
              {children}
            </motion.div>
          </main>
          <DashboardMobileDock />
        </div>
      </AnalyticsProvider>
    </div>
  );
}
