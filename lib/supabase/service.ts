import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabaseUrl } from "@/lib/supabase/config";

/**
 * Service-role client for trusted server contexts (e.g. the scheduler worker
 * authenticated by SCHEDULER_SECRET). Bypasses RLS, so it must never be used
 * from user-facing routes or shipped to the browser.
 */
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasServiceConfig() {
  return hasSupabaseConfig() && Boolean(serviceRoleKey);
}

export function createServiceClient(): SupabaseClient | null {
  if (!hasServiceConfig()) return null;
  return createSupabaseClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
