import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasSupabaseConfig, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

/** Exchanges a short-lived OAuth code for an HttpOnly Supabase session. */
export async function GET(request: NextRequest) {
  const destination = new URL("/dashboard", request.url);
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  if (next?.startsWith("/")) destination.pathname = next;
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
  return response;
}
