"use client";

import { createBrowserClient } from "@supabase/ssr";
import { hasSupabaseConfig, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

export function createClient() {
  if (!hasSupabaseConfig()) throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  return createBrowserClient(supabaseUrl!, supabasePublishableKey!);
}
