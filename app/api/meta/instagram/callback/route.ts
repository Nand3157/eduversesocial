import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, INSTAGRAM_REDIRECT_URI } from "@/lib/meta-config";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { graphRequest } from "@/lib/meta-api";
import { logger } from "@/lib/logger";

type InstagramToken = { access_token?: string; user_id?: string | number; expires_in?: number };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const state = url.searchParams.get("state");
  const expected = jar.get("instagram_login_oauth_state")?.value;
  const fail = (code: string) => {
    const response = NextResponse.redirect(new URL(`/dashboard/settings?instagram=${code}`, request.url));
    response.cookies.delete("instagram_login_oauth_state");
    return response;
  };

  if (url.searchParams.has("error")) return fail("denied");
  if (!state || !expected || state !== expected) return fail("state_invalid");
  const code = url.searchParams.get("code");
  if (!code || !INSTAGRAM_APP_ID || !INSTAGRAM_APP_SECRET || !INSTAGRAM_REDIRECT_URI) return fail("oauth_failed");

  try {
    const shortTokenForm = new FormData();
    shortTokenForm.set("client_id", INSTAGRAM_APP_ID);
    shortTokenForm.set("client_secret", INSTAGRAM_APP_SECRET);
    shortTokenForm.set("grant_type", "authorization_code");
    shortTokenForm.set("redirect_uri", INSTAGRAM_REDIRECT_URI);
    shortTokenForm.set("code", code.replace(/#_$/, ""));
    const shortResponse = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: shortTokenForm, cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const shortToken = await shortResponse.json() as InstagramToken;
    if (!shortResponse.ok || !shortToken.access_token) return fail("code_invalid");

    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", INSTAGRAM_APP_SECRET);
    longUrl.searchParams.set("access_token", shortToken.access_token);
    const longResponse = await fetch(longUrl, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const longToken = await longResponse.json() as InstagramToken;
    if (!longResponse.ok || !longToken.access_token) return fail("token_exchange_failed");

    const supabase = await createClient();
    const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    if (!supabase || !user) return fail("not_authenticated");
    const { data: member } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (!member) return fail("workspace_missing");

    const token = longToken.access_token;
    const profile = await graphRequest<{ id?: string; user_id?: string | number; username?: string }>(
      "instagram",
      "me?fields=user_id,username",
      token,
      { signal: AbortSignal.timeout(15_000) }
    ).catch((): { id?: string; user_id?: string | number; username?: string } => ({}));
    const externalId = String(profile.user_id ?? profile.id ?? shortToken.user_id ?? "");
    if (!externalId) return fail("profile_unavailable");
    const username = profile.username;
    const scopes = ["instagram_business_basic", "instagram_business_content_publish", "instagram_business_manage_insights"];
    const expiresAt = new Date(Date.now() + (longToken.expires_in ?? 5_184_000) * 1000).toISOString();
    const { error } = await supabase.from("social_accounts").upsert({
      workspace_id: member.workspace_id,
      platform: "instagram",
      handle: username || externalId,
      external_id: externalId,
      display_name: username || externalId,
      username,
      parent_account_id: null,
      encrypted_token: encrypt(token),
      token_expires_at: expiresAt,
      scopes,
      status: "active"
    }, { onConflict: "workspace_id,platform,external_id" });
    if (error) throw error;

    const response = NextResponse.redirect(new URL("/dashboard/settings?instagram=connected", request.url));
    response.cookies.delete("instagram_login_oauth_state");
    return response;
  } catch (error) {
    logger.error("instagram_login_callback_failed", { reason: error instanceof Error ? error.message : "unknown" });
    return fail("connection_failed");
  }
}
