import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { THREADS_APP_ID, THREADS_APP_SECRET, THREADS_REDIRECT_URI } from "@/lib/meta-config";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { graphRequest } from "@/lib/meta-api";
export async function GET(request: Request) {
  const url = new URL(request.url); const jar = await cookies(); const fail = (code: string) => NextResponse.redirect(new URL(`/dashboard/settings?threads=${code}`, request.url));
  if (url.searchParams.get("error")) return fail("denied");
  if (!url.searchParams.get("state") || url.searchParams.get("state") !== jar.get("threads_oauth_state")?.value) return fail("state_invalid"); const code = url.searchParams.get("code"); if (!code || !THREADS_APP_ID || !THREADS_APP_SECRET || !THREADS_REDIRECT_URI) return fail("oauth_failed");
  try { const body = new URLSearchParams({ client_id: THREADS_APP_ID, client_secret: THREADS_APP_SECRET, redirect_uri: THREADS_REDIRECT_URI, code, grant_type: "authorization_code" }); const tokenResponse = await fetch("https://graph.threads.net/oauth/access_token", { method: "POST", body, cache: "no-store", signal: AbortSignal.timeout(15_000) }); const token = await tokenResponse.json() as { access_token?: string; user_id?: string }; if (!tokenResponse.ok || !token.access_token) return fail("code_invalid");
    // Exchange the short-lived token for a long-lived one (60 days) so the
    // connection survives beyond the default 24 hours.
    let longLived = token.access_token;
    try { const longUrl = new URL("https://graph.threads.net/access_token"); longUrl.searchParams.set("grant_type", "th_exchange_token"); longUrl.searchParams.set("client_secret", THREADS_APP_SECRET!); longUrl.searchParams.set("access_token", token.access_token); const longResponse = await fetch(longUrl, { cache: "no-store", signal: AbortSignal.timeout(15_000) }); const longBody = await longResponse.json() as { access_token?: string }; if (longResponse.ok && longBody.access_token) longLived = longBody.access_token; } catch { /* keep the short-lived token */ }
    const profile = await graphRequest<{ id: string; username?: string; name?: string }>("threads", "me?fields=id,username,name", longLived); const supabase = await createClient(); const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } }; if (!supabase || !user) return fail("not_authenticated"); const { data: member } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle(); if (!member) return fail("workspace_missing"); const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); await supabase.from("social_accounts").upsert({ workspace_id: member.workspace_id, platform: "threads", handle: profile.username || profile.id, external_id: profile.id, display_name: profile.name || profile.username || profile.id, username: profile.username, encrypted_token: encrypt(longLived), token_expires_at: tokenExpiresAt, status: "active", scopes: [] }, { onConflict: "workspace_id,platform,external_id" }); const response = NextResponse.redirect(new URL("/dashboard/settings?threads=connected", request.url)); response.cookies.delete("threads_oauth_state"); return response; } catch { return fail("connection_failed"); }
}
