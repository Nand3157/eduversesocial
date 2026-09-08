import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/dashboard/app-shell";
import { createClient } from "@/lib/supabase/server";
import { fetchMetaAnalytics } from "@/lib/meta-analytics";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your live audience overview: reach, saves, memory signals, and posting windows."
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!supabase || !user) redirect("/login?next=/dashboard");
  if (!user.email_confirmed_at) redirect("/verify-email");

  let profile: { display_name?: string | null; role?: string | null; bio?: string | null } | null = null;
  if (supabase) {
    const { data } = await supabase.from("profiles").select("display_name,role,bio").eq("id", user.id).maybeSingle();
    profile = data;
  }

  // Server-first analytics: fetch the live snapshot here so the dashboard
  // paints with data instead of skeleton → client fetch → API route. The
  // provider still revalidates on explicit refresh. Never throws — failures
  // resolve to an error snapshot the UI renders as an empty state.
  const initialAnalytics = await fetchMetaAnalytics().catch(() => null);

  return (
    <AppShell email={user.email} profile={profile} initialAnalytics={initialAnalytics}>
      {children}
    </AppShell>
  );
}