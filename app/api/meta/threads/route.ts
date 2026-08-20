import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { THREADS_APP_ID, THREADS_REDIRECT_URI, THREADS_REQUIRED_PERMISSIONS } from "@/lib/meta-config";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!supabase || !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", "/dashboard/settings");
    return NextResponse.redirect(loginUrl);
  }
  if (!THREADS_APP_ID || !THREADS_REDIRECT_URI) return NextResponse.json({ errorCode: "META_AUTH_ERROR", message: "Threads OAuth is not configured." }, { status: 503 });
  const state = randomBytes(32).toString("base64url"); const url = new URL("https://threads.net/oauth/authorize"); url.searchParams.set("client_id", THREADS_APP_ID); url.searchParams.set("redirect_uri", THREADS_REDIRECT_URI); url.searchParams.set("scope", THREADS_REQUIRED_PERMISSIONS.join(",")); url.searchParams.set("response_type", "code"); url.searchParams.set("state", state);
  const response = NextResponse.redirect(url); response.cookies.set("threads_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" }); return response;
}
