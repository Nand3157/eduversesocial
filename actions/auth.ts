"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const credentialsSchema = z.object({ email: z.string().trim().email("Enter a valid email address"), password: z.string().min(8, "Use at least 8 characters") });
const emailSchema = z.object({ email: z.string().trim().email("Enter a valid email address") });
const nameSchema = z.string().trim().min(1, "Enter your name").max(120).optional();
export type AuthResult = { error?: string; message?: string };

async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  } catch {
    return "unknown";
  }
}

// Generic text on every throttle path: never reveal whether the account exists.
const RATE_LIMITED = "Too many attempts. Please try again later.";

export async function signIn(_: AuthResult, formData: FormData): Promise<AuthResult> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  // Per-IP throttles credential spraying; the per-email key slows targeted
  // brute force even when it comes from rotating IP pools.
  const ip = await clientIp();
  const emailKey = parsed.data.email.toLowerCase();
  if (!(await checkRateLimit(`login:ip:${ip}`, 10, 5 * 60_000)).allowed ||
      !(await checkRateLimit(`login:email:${emailKey}`, 5, 15 * 60_000)).allowed) {
    return { error: RATE_LIMITED };
  }
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured. Add the environment variables to enable authentication." };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };
  // Remember the name entered at login so the dashboard greets the user by it on future logins.
  const name = nameSchema.safeParse(formData.get("name") ?? undefined);
  if (name.success && name.data) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, display_name: name.data }, { onConflict: "id" });
      if (profileError) console.error("Failed to remember login name:", profileError);
    }
  }
  // Only allow same-site relative redirects. `//evil.com` passes a bare
  // startsWith("/") check and browsers resolve it as a scheme-relative URL,
  // so it must be rejected explicitly.
  const candidate = String(formData.get("next") ?? "");
  redirect(candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.startsWith("/\\") ? candidate : "/dashboard");
}

export async function signUp(_: AuthResult, formData: FormData): Promise<AuthResult> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!(await checkRateLimit(`signup:ip:${await clientIp()}`, 10, 60 * 60_000)).allowed) {
    return { error: RATE_LIMITED };
  }
  const name = nameSchema.safeParse(formData.get("name") ?? undefined);
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured. Add the environment variables to enable authentication." };
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: name.success && name.data ? { full_name: name.data } : undefined, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback` }
  });
  return error ? { error: error.message } : { message: "Check your email to verify your account." };
}

export async function requestPasswordReset(_: AuthResult, formData: FormData): Promise<AuthResult> {
  const parsed = emailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  // Reset endpoints double as email-bombing vectors, so throttle both the
  // source IP and the targeted mailbox.
  const ip = await clientIp();
  const emailKey = parsed.data.email.toLowerCase();
  if (!(await checkRateLimit(`pwreset:ip:${ip}`, 5, 60 * 60_000)).allowed ||
      !(await checkRateLimit(`pwreset:email:${emailKey}`, 3, 60 * 60_000)).allowed) {
    return { error: RATE_LIMITED };
  }
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured. Add the environment variables to enable authentication." };
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/reset-password` });
  return error ? { error: error.message } : { message: "If that email exists, a reset link is on its way." };
}

export async function updatePassword(_: AuthResult, formData: FormData): Promise<AuthResult> {
  const password = z.string().min(8, "Use at least 8 characters").safeParse(formData.get("password"));
  if (!password.success) return { error: password.error.issues[0]?.message };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured. Add the environment variables to enable authentication." };
  // The settings form verifies the current password before the change; the
  // reset-password flow skips that check because the emailed recovery link is
  // the proof of identity. The server only skips it when the session was minted
  // by a recovery code exchange (HttpOnly pw_recovery cookie) — a session
  // cookie alone never bypasses re-authentication.
  const cookieStore = await cookies();
  const isRecoverySession = cookieStore.get("pw_recovery")?.value === "1";
  const current = formData.get("current");
  if (typeof current !== "string" || !current) {
    if (!isRecoverySession) return { error: "Enter your current password to change it." };
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { error: "Sign in required to change your password." };
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
    if (reauthError) return { error: "Current password is incorrect." };
  }
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: error.message };
  cookieStore.delete("pw_recovery");
  return { message: "Password updated successfully." };
}

export async function updateProfile(_: AuthResult, formData: FormData): Promise<AuthResult> {
  const name = z.string().trim().min(1, "Enter a display name").max(120).safeParse(formData.get("name"));
  const role = z.string().trim().max(120).optional().safeParse(formData.get("role") ?? "");
  const bio = z.string().trim().max(500).optional().safeParse(formData.get("bio") ?? "");
  if (!name.success) return { error: name.error.issues[0]?.message };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured. Add the environment variables to enable authentication." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required to update your profile." };
  // `role`/`bio` only exist after migration 005. Upsert the full payload and,
  // if those columns are missing (migration not yet applied), fall back to the
  // core `display_name` so saving always works.
  const attempt = (payload: Record<string, unknown>) => supabase.from("profiles").upsert(payload, { onConflict: "id" });
  let { error } = await attempt({
    id: user.id,
    display_name: name.data,
    role: role.data || null,
    bio: bio.data || null
  });
  if (error && /column .* does not exist/i.test(`${error.message} ${error.details ?? ""}`)) {
    ({ error } = await attempt({ id: user.id, display_name: name.data }));
  }
  if (error) {
    console.error("updateProfile failed:", error);
    return { error: "Could not save your profile. Please try again." };
  }
  return { message: "Profile updated." };
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
