import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasSupabaseConfig, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

/** Exchanges a short-lived OAuth code for an HttpOnly Supabase session. */
export async function GET(request: NextRequest) {
  const destination = new URL("/dashboard", request.url);
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  // Only allow same-site relative paths; `//evil.com` is rejected explicitly
  // because browsers resolve it as a scheme-relative URL.
  if (next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) destination.pathname = next;
  if (!code || !hasSupabaseConfig()) return NextResponse.redirect(destination);

  const response = NextResponse.redirect(destination);
  const supabase = createServerClient(supabaseUrl!, supabasePublishableKey!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    }
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=oauth_callback_failed", request.url));
  // A recovery link grants a session whose identity proof is the emailed link,
  // so updatePassword may skip the current-password check — but only for
  // sessions minted here, and only for the next 10 minutes. The cookie is
  // HttpOnly and set server-side, so a stolen ordinary session cannot obtain it.
  if (destination.pathname === "/reset-password") {
    response.cookies.set("pw_recovery", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/"
    });
  }
  return response;
}
