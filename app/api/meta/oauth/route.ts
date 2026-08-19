import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { META_APP_ID, META_REDIRECT_URI, META_REQUIRED_PERMISSIONS } from "@/lib/meta-config";
export async function GET() {
  if (!META_APP_ID || !META_REDIRECT_URI) return NextResponse.json({ errorCode: "META_AUTH_ERROR", message: "Meta OAuth is not configured." }, { status: 503 });
  const state = randomBytes(32).toString("base64url"); const url = new URL("https://www.facebook.com/dialog/oauth");
  url.searchParams.set("client_id", META_APP_ID); url.searchParams.set("redirect_uri", META_REDIRECT_URI); url.searchParams.set("state", state); url.searchParams.set("response_type", "code");  url.searchParams.set("scope", META_REQUIRED_PERMISSIONS.join(","));
  const response = NextResponse.redirect(url); response.cookies.set("meta_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1800, path: "/" }); return response;
}
