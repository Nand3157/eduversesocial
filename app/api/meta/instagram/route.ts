import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { INSTAGRAM_APP_ID, INSTAGRAM_LOGIN_PERMISSIONS, INSTAGRAM_REDIRECT_URI } from "@/lib/meta-config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!supabase || !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", "/dashboard/settings");
    return NextResponse.redirect(loginUrl);
  }
  if (!INSTAGRAM_APP_ID || !INSTAGRAM_REDIRECT_URI) {
    return NextResponse.json({ errorCode: "META_AUTH_ERROR", message: "Instagram Login is not configured. Add the Instagram App ID, secret, and redirect URI on the server." }, { status: 503 });
  }

  const state = randomBytes(32).toString("base64url");
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", INSTAGRAM_APP_ID);
  url.searchParams.set("redirect_uri", INSTAGRAM_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", INSTAGRAM_LOGIN_PERMISSIONS.join(","));
  url.searchParams.set("state", state);
  url.searchParams.set("enable_fb_login", "0");

  const response = NextResponse.redirect(url);
  response.cookies.set("instagram_login_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1800, path: "/" });
  return response;
}
