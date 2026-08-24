"use client";

import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";

type Variant = "compact" | "card" | "inline";

export function PrivacyNotice({ variant = "compact", className = "" }: { variant?: Variant; className?: string }) {
  if (variant === "inline") {
    return (
      <p className={`text-center text-[11px] leading-relaxed text-mutedText ${className}`}>
        By connecting you agree to our{" "}
        <Link href="/privacy" className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
          Privacy Policy
        </Link>{" "}
        · Tokens are AES-256-GCM encrypted and never logged.
      </p>
    );
  }

  if (variant === "card") {
    return (
      <div className={`rounded-xl border border-success/20 bg-success/10 p-4 ${className}`}>
        <div className="flex items-start gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success/15 text-success">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">How we handle your Meta data</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-mutedText">
              <li>OAuth via official Meta Graph API — you approve permissions on Meta&apos;s screen.</li>
              <li>Access tokens are encrypted at rest (AES-256-GCM) and only decrypted per-workspace for API calls.</li>
              <li>Revocable anytime: disconnect in Settings or remove EduVerse from Meta → Settings → Business integrations.</li>
            </ul>
            <p className="mt-2 text-xs">
              <Link href="/privacy" className="inline-flex items-center gap-1 font-medium text-success hover:underline">
                Read full Privacy & Data Security →
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // compact
  return (
    <div className={`flex items-start gap-2 rounded-xl border border-borderSoft bg-surface/60 px-3.5 py-3 ${className}`}>
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
      <p className="text-[11px] leading-relaxed text-mutedText">
        Meta tokens are <span className="font-medium text-ink">AES-256-GCM encrypted</span> at rest and scoped to your workspace via Supabase RLS.{" "}
        <Link href="/privacy" className="font-semibold text-primary hover:underline">
          Privacy & Data Security
        </Link>
      </p>
    </div>
  );
}

export function PrivacyBadge() {
  return (
    <Link
      href="/privacy"
      className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success transition hover:bg-success/15"
    >
      <ShieldCheck className="h-3 w-3" />
      Privacy & Data Security
    </Link>
  );
}
