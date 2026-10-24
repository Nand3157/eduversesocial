"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Facebook, Instagram, Loader2, MessageCircle, Users } from "lucide-react";
import { useAnalytics } from "@/components/dashboard/analytics-context";

type Account = ReturnType<typeof useAnalytics>["accounts"][number];

function PlatformIcon({ platform, className = "" }: { platform?: Account["platform"]; className?: string }) {
  if (platform === "facebook") return <Facebook aria-hidden="true" className={className} />;
  if (platform === "instagram") return <Instagram aria-hidden="true" className={className} />;
  if (platform === "threads") return <MessageCircle aria-hidden="true" className={className} />;
  return <Users aria-hidden="true" className={className} />;
}

function platformName(platform: Account["platform"]) {
  return platform === "facebook" ? "Facebook" : platform === "instagram" ? "Instagram" : "Threads";
}

export function AnalyticsAccountSelector() {
  const { accounts, selectedAccountId, selectAccount, loading } = useAnalytics();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 12 });

  const updateMenuPosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPosition({ top: rect.bottom + 8, right: Math.max(12, window.innerWidth - rect.right) });
  };

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onPositionChange = () => updateMenuPosition();
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onPositionChange);
    window.addEventListener("scroll", onPositionChange, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onPositionChange);
      window.removeEventListener("scroll", onPositionChange, true);
    };
  }, [open]);

  if (accounts.length < 2) return null;

  const selected = accounts.find((account) => account.id === selectedAccountId);
  const selectedIndex = selected ? accounts.findIndex((account) => account.id === selected.id) + 1 : 0;
  const selectedLabel = selected?.name ?? "All accounts";
  const optionCount = accounts.length + 1;

  const choose = (index: number) => {
    const account = accounts[index - 1];
    selectAccount(account?.id ?? "");
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "Tab" && open) {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setActiveIndex(selectedIndex);
        setOpen(true);
      } else {
        setActiveIndex((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + optionCount) % optionCount);
      }
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(event.key === "Home" ? 0 : optionCount - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(activeIndex);
      else {
        setActiveIndex(selectedIndex);
        setOpen(true);
      }
    }
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label="Choose account data for the dashboard and AI chat"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined}
        aria-busy={loading}
        title={`Account scope: ${selectedLabel}`}
        onKeyDown={onKeyDown}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((value) => !value);
        }}
        className="group flex h-10 min-w-0 max-w-[220px] items-center gap-2 rounded-xl border border-borderSoft bg-card px-2 text-left shadow-sm transition duration-200 hover:border-primary/40 hover:bg-surface focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 sm:max-w-[260px]"
      >
        <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
          <PlatformIcon platform={selected?.platform} className="h-3.5 w-3.5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-faintText">Account</span>
          <span className="truncate text-xs font-semibold text-ink">{selectedLabel}</span>
        </span>
        {loading ? (
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
        ) : (
          <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 text-faintText transition duration-200 group-hover:text-primary ${open ? "rotate-180 text-primary" : ""}`} />
        )}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-label="Account data scope"
          style={{ position: "fixed", top: menuPosition.top, right: menuPosition.right }}
          className="z-[100] max-h-[min(420px,calc(100dvh-24px))] w-[min(300px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-borderSoft bg-card p-1.5 shadow-[0_18px_50px_rgba(12,18,25,0.2)] ring-1 ring-black/5"
        >
          <div className="px-3 pb-2 pt-2.5">
            <p className="text-xs font-semibold text-ink">Choose account</p>
            <p className="mt-0.5 text-[11px] text-mutedText">Set which channels power your insights</p>
          </div>
          <div className="h-px bg-borderSoft" />
          <div className="py-1">
            <div
              id={`${listboxId}-option-0`}
              role="option"
              aria-selected={!selected}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(0)}
              onClick={() => choose(0)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors ${activeIndex === 0 ? "bg-surface-muted" : "hover:bg-surface-muted"}`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
                <Users aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-ink">All accounts</span>
                <span className="mt-0.5 block text-[10px] text-mutedText">Combined channel insights</span>
              </span>
              {!selected && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />}
            </div>

            <div className="my-1.5 h-px bg-borderSoft" />
            <p className="px-3 pb-1 pt-0.5 text-[9px] font-bold uppercase tracking-[0.13em] text-faintText">Connected channels</p>
            {accounts.map((account, index) => {
              const active = account.id === selectedAccountId;
              const name = platformName(account.platform);
              return (
                <div
                  key={`${account.platform}-${account.id}`}
                  id={`${listboxId}-option-${index + 1}`}
                  role="option"
                  aria-selected={active}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index + 1)}
                  onClick={() => choose(index + 1)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors ${activeIndex === index + 1 ? "bg-surface-muted" : "hover:bg-surface-muted"}`}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-borderSoft bg-surface text-mutedText">
                    <PlatformIcon platform={account.platform} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-ink">{account.name}</span>
                    <span className="mt-0.5 block text-[10px] text-mutedText">{name} <span aria-hidden="true">·</span> {account.status === "active" ? "Connected" : "Needs attention"}</span>
                  </span>
                  {active && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />}
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
