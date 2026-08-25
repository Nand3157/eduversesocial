"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn, signUp, requestPasswordReset, updatePassword, type AuthResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";

type Mode = "login" | "signup" | "forgot" | "reset";
const initialState: AuthResult = {};
const config = {
  login: { action: signIn, submit: "Sign in", helper: "New to EduVerse?", link: "/signup", linkLabel: "Create an account" },
  signup: { action: signUp, submit: "Create account", helper: "Already have an account?", link: "/login", linkLabel: "Sign in" },
  forgot: { action: requestPasswordReset, submit: "Send reset link", helper: "Remembered your password?", link: "/login", linkLabel: "Back to sign in" },
  reset: { action: updatePassword, submit: "Update password", helper: "", link: "/login", linkLabel: "Back to sign in" }
} as const;

const inputClass = "mt-2 h-11 w-full rounded-xl border border-borderSoft bg-surface px-3 text-ink outline-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40";

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const details = config[mode];
  const [state, formAction, pending] = useActionState(details.action, initialState);
  const hasPassword = mode === "login" || mode === "signup" || mode === "reset";
  // Only the signup flow asks for a name; sign in stays a two-field form.
  const hasName = mode === "signup";
  const formRef = useRef<HTMLFormElement>(null);

  // Move focus to the first field when the server action reports an error so
  // keyboard and screen-reader users land directly on what needs fixing.
  useEffect(() => {
    if (!state.error) return;
    const form = formRef.current;
    if (!form) return;
    const firstField = form.querySelector<HTMLElement>("input:not([type=hidden])");
    firstField?.focus();
  }, [state.error]);

  // Optional show/hide for the password field — saves typos, costs nothing.
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form ref={formRef} action={formAction} className="mt-7 space-y-4">
      {next && <input name="next" type="hidden" value={next} />}
      {hasName && (
        <label className="block text-sm font-medium text-mutedText">
          Name
          <input
            autoComplete="name"
            className={inputClass}
            name="name"
            placeholder="How should we address you?…"
            required
            type="text"
          />
        </label>
      )}
      {mode !== "reset" && (
        <label className="block text-sm font-medium text-mutedText">
          Email
          <input autoCapitalize="none" autoComplete="email" className={inputClass} name="email" required spellCheck={false} type="email" />
        </label>
      )}
      {hasPassword && (
        <label className="block text-sm font-medium text-mutedText">
          {mode === "reset" ? "New password" : "Password"}
          <span className="relative block">
            <input
              autoComplete={mode === "reset" ? "new-password" : mode === "signup" ? "new-password" : "current-password"}
              className={`${inputClass} pr-11`}
              minLength={8}
              name="password"
              required
              type={showPassword ? "text" : "password"}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-faintText transition hover:text-ink"
              onClick={() => setShowPassword((visible) => !visible)}
              type="button"
            >
              {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
            </button>
          </span>
        </label>
      )}
      {mode === "login" && (
        <Link className="block text-right text-sm font-medium text-primary hover:underline" href="/forgot-password">
          Forgot password?
        </Link>
      )}
      {state.error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{state.error}</p>}
      {state.message && <p role="status" className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">{state.message}</p>}
      <Button className="w-full" disabled={pending} type="submit">
        {pending && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
        {details.submit}
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-mutedText">
        By continuing you agree to our{" "}
        <Link href="/privacy" className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
          Privacy Policy & Data Security
        </Link>
        {mode === "signup" ? " — Meta tokens are AES-256-GCM encrypted and revocable anytime." : " — encrypted tokens, workspace-isolated via RLS."}
      </p>
      {mode === "signup" && (
        <Link
          href="/demo"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-warning/20 bg-warning/10 px-3 py-2.5 text-xs font-medium text-warning transition hover:bg-warning/15"
        >
          <Eye aria-hidden="true" className="h-3.5 w-3.5" /> Explore Live Demo — no signup required
        </Link>
      )}
      {details.helper && (
        <p className="pt-2 text-center text-sm text-mutedText">
          {details.helper}{" "}
          <Link className="font-semibold text-primary hover:underline" href={details.link}>
            {details.linkLabel}
          </Link>
        </p>
      )}
    </form>
  );
}
