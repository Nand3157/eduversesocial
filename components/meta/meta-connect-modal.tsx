"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Link2Off, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import type { MetaAccount } from "@/lib/meta-api";

interface MetaConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: (accounts: MetaAccount[]) => void;
}

const STATUS_META: Record<MetaAccount["status"], { label: string; className: string }> = {
  active: { label: "Connected", className: "border-success/25 bg-success/10 text-success" },
  token_expiring: { label: "Token expiring soon", className: "border-amber-500/30 bg-amber-500/10 text-amber-600" },
  expired: { label: "Token expired", className: "border-danger/25 bg-danger/10 text-danger" },
  permission_required: { label: "Permission required", className: "border-amber-500/30 bg-amber-500/10 text-amber-600" },
  disconnected: { label: "Disconnected", className: "border-borderSoft bg-surface text-mutedText" }
};

export function MetaConnectModal({ isOpen, onClose, onConnected }: MetaConnectModalProps) {
  const router = useRouter();
  const [connecting, setConnecting] = useState<"facebook" | "threads" | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [connectedList, setConnectedList] = useState<MetaAccount[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    setErrorMessage(null);
    setAuthRequired(false);
    try {
      const response = await fetch("/api/meta/connect", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) {
        setAuthRequired(true);
        setErrorMessage(null);
        setConnectedList([]);
        return;
      }
      setConnectedList(data.accounts ?? []);
      if (!response.ok && data.error) setErrorMessage(data.error);
    } catch {
      setErrorMessage("Could not reach the Meta connection service.");
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadAccounts();
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, loadAccounts]);

  if (!isOpen) return null;

  const startConnect = (kind: "facebook" | "threads") => {
    if (authRequired) {
      router.push("/login?next=/dashboard/settings");
      return;
    }
    setConnecting(kind);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      window.location.assign(kind === "threads" ? "/api/meta/threads" : "/api/meta/oauth");
    } catch {
      setErrorMessage("Could not reach the Meta connection service.");
      setConnecting(null);
    }
  };

  const disconnectAccount = async (account: MetaAccount) => {
    setLoadingAccounts(true);
    try {
      const response = await fetch("/api/meta/connect", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: account.id }) });
      if (!response.ok) throw new Error("Disconnect failed.");
      const next = connectedList.filter((item) => !(item.id === account.id && item.platform === account.platform));
      setConnectedList(next);
      onConnected?.(next);
      window.dispatchEvent(new Event("eduverse:analytics-refresh"));
    } catch {
      setErrorMessage("Could not disconnect the account.");
    } finally {
      setLoadingAccounts(false);
    }
  };

  const connectedCount = connectedList.filter((account) => account.status === "active" || account.status === "token_expiring").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-borderSoft bg-card p-6 shadow-glass">
        <div className="flex items-center justify-between border-b border-borderSoft pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-medium text-ink">Connect Meta accounts</h3>
              <p className="text-xs text-mutedText">Instagram Business, Facebook Pages and Threads</p>
            </div>
          </div>
          <button aria-label="Close Meta connection dialog" onClick={onClose} className="rounded-lg p-2 text-mutedText transition hover:bg-surface hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div className="rounded-xl border border-primary/25 bg-accent-soft p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Live Graph API connection</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-mutedText">
              Connecting opens Meta&apos;s consent screen and returns you here. Only accounts Meta actually returns are shown — nothing is simulated.
            </p>
          </div>

          {authRequired && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-2">
                <p className="font-semibold">Sign in required</p>
                <p className="text-amber-700/80 dark:text-amber-300/80">You need to be logged in to connect Meta accounts. Sign in first, then return here to connect.</p>
                <a href="/login?next=/dashboard/settings" className="inline-flex items-center justify-center rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-background hover:bg-ink/90">
                  Go to login
                </a>
              </div>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => startConnect("facebook")}
              disabled={connecting !== null || authRequired}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-semibold text-background transition hover:bg-ink/90 disabled:opacity-50"
              title={authRequired ? "Sign in required" : undefined}
            >
              {connecting === "facebook" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {connecting === "facebook" ? "Opening Meta…" : "Connect Facebook & Instagram"}
            </button>
            <button
              onClick={() => startConnect("threads")}
              disabled={connecting !== null || authRequired}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-borderSoft bg-surface px-4 py-2.5 text-xs font-semibold text-ink transition hover:bg-white/10 disabled:opacity-50"
              title={authRequired ? "Sign in required" : undefined}
            >
              {connecting === "threads" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {connecting === "threads" ? "Opening Threads…" : "Connect Threads"}
            </button>
          </div>

          {successMessage && <div className="rounded-lg border border-success/25 bg-success/10 p-3 text-xs text-success">{successMessage}</div>}
          {errorMessage && !authRequired && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/25 bg-danger/10 p-3 text-xs text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-semibold text-mutedText">Accounts returned by Meta ({connectedCount} connected)</h4>
            </div>
            {loadingAccounts ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-borderSoft bg-surface p-6 text-xs text-mutedText">
                <RefreshCw className="h-4 w-4 animate-spin" /> Checking Meta Graph API…
              </div>
            ) : connectedList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-borderSoft bg-surface p-6 text-center text-xs leading-relaxed text-mutedText">
                No linked accounts yet. Connect Facebook &amp; Instagram or Threads above.
              </div>
            ) : (
              <div className="space-y-2">
                {connectedList.map((account) => {
                  const status = STATUS_META[account.status] ?? STATUS_META.disconnected;
                  return (
                    <div key={`${account.platform}-${account.id}`} className="flex items-center justify-between rounded-xl border border-borderSoft bg-surface p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {account.avatarUrl ? <Image src={account.avatarUrl} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full border border-borderSoft object-cover" /> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{account.name.slice(0, 1).toUpperCase()}</span>}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-ink">{account.name}</p>
                          <p className="truncate text-[11px] text-mutedText">{account.platform === "instagram" ? "Instagram" : account.platform === "threads" ? "Threads" : "Facebook Page"} · {account.handle}{account.followers !== undefined ? ` · ${account.followers.toLocaleString()} followers` : ""}</p>
                        </div>
                      </div>
                      <div className="ml-3 flex shrink-0 items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${status.className}`}>
                          {account.status === "active" && <Check className="h-3 w-3" />}
                          {status.label}
                        </span>
                        {account.status === "expired" || account.status === "permission_required" ? (
                          <button onClick={() => startConnect(account.platform === "threads" ? "threads" : "facebook")} disabled={connecting !== null} className="inline-flex items-center gap-1 rounded-lg border border-borderSoft bg-card px-2 py-1 text-[10px] font-semibold text-primary transition hover:bg-white/10">
                            <RefreshCw className="h-3 w-3" /> Reconnect
                          </button>
                        ) : (
                          <button onClick={() => disconnectAccount(account)} disabled={loadingAccounts} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-danger transition hover:opacity-75 disabled:opacity-50" aria-label={`Disconnect ${account.name}`}>
                            <Link2Off className="h-3 w-3" /> Disconnect
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-borderSoft pt-4">
          <button onClick={onClose} className="rounded-xl border border-borderSoft bg-surface px-4 py-2 text-xs font-semibold text-ink transition hover:bg-white/10">Close</button>
        </div>
      </div>
    </div>
  );
}
