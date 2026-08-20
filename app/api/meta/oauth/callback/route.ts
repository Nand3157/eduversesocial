import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { META_APP_ID, META_APP_SECRET, META_GRAPH_VERSION, META_REDIRECT_URI } from "@/lib/meta-config";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { MetaFacebookService } from "@/lib/meta-api";
import { logger } from "@/lib/logger";
export async function GET(request: Request) {
  const url = new URL(request.url); const jar = await cookies(); const state = url.searchParams.get("state"); const expected = jar.get("meta_oauth_state")?.value;
  const fail = (code: string) => NextResponse.redirect(new URL(`/dashboard/settings?meta=${code}`, request.url));
  if (url.searchParams.get("error")) return fail("denied");
  if (!state || !expected || state !== expected) return fail("state_invalid"); const code = url.searchParams.get("code"); if (!code || !META_APP_ID || !META_APP_SECRET || !META_REDIRECT_URI) return fail("oauth_failed");
  try {
    const tokenUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`); tokenUrl.searchParams.set("client_id", META_APP_ID); tokenUrl.searchParams.set("client_secret", META_APP_SECRET); tokenUrl.searchParams.set("redirect_uri", META_REDIRECT_URI); tokenUrl.searchParams.set("code", code);
    const tokenResponse = await fetch(tokenUrl, { cache: "no-store", signal: AbortSignal.timeout(15_000) }); const token = await tokenResponse.json() as { access_token?: string; expires_in?: number }; if (!tokenResponse.ok || !token.access_token) return fail("code_invalid");
    const supabase = await createClient(); const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } }; if (!supabase || !user) return fail("not_authenticated");
    const { data: member } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle(); if (!member) return fail("workspace_missing");
    const pages = await new MetaFacebookService(token.access_token).pages();
    // The code exchange yields a short-lived *user* token; `expires_in` here
    // reflects that hours-long lifetime, not the ~2-month page token that is
    // actually stored. Storing it would wrongly mark accounts expired within
    // hours, so page-token expiry is left unknown (null): publish failures
    // surface a reconnection prompt instead.
    for (const page of pages.data || []) {
      const { data: pageRow } = await supabase.from("social_accounts").upsert({ workspace_id: member.workspace_id, platform: "facebook", handle: page.name, external_id: page.id, display_name: page.name, encrypted_token: encrypt(page.access_token), token_expires_at: null, scopes: [], status: "active" }, { onConflict: "workspace_id,platform,external_id" }).select("id").single();
      if (page.instagram_business_account && pageRow) await supabase.from("social_accounts").upsert({ workspace_id: member.workspace_id, platform: "instagram", handle: page.instagram_business_account.username || page.instagram_business_account.id, external_id: page.instagram_business_account.id, display_name: page.instagram_business_account.name || page.instagram_business_account.username || page.name, username: page.instagram_business_account.username, avatar_url: page.instagram_business_account.profile_picture_url, parent_account_id: pageRow.id, encrypted_token: encrypt(page.access_token), token_expires_at: null, scopes: [], status: "active" }, { onConflict: "workspace_id,platform,external_id" });
    }
    const response = NextResponse.redirect(new URL("/dashboard/settings?meta=connected", request.url)); response.cookies.delete("meta_oauth_state"); return response;
  } catch (error) {
    logger.error("meta_oauth_callback_failed", { reason: error instanceof Error ? error.message : "unknown" });
    return fail("connection_failed");
  }
}
