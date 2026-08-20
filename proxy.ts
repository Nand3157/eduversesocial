import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Production CSP with a per-request nonce. The nonce lets Next.js bootstrap
 * its inline runtime while 'strict-dynamic' blocks every injected foreign
 * script; CSP3 browsers ignore 'unsafe-inline' once a nonce is present, and
 * older browsers fall back to it. Dev skips CSP entirely (Turbopack needs
 * 'unsafe-eval', matching the previous config where CSP was prod-only).
 */
function contentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://graph.facebook.com https://graph.threads.net https://*.fbcdn.net https://*.cdninstagram.com https://lookaside.fbsbx.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://graph.facebook.com https://graph.threads.net https://threads.net",
    "upgrade-insecure-requests"
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  let requestHeaders: Headers | undefined;
  let csp: string | undefined;
  if (process.env.NODE_ENV === "production") {
    const nonce = btoa(crypto.randomUUID());
    csp = contentSecurityPolicy(nonce);
    requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    // Next.js reads this request-header CSP and applies the nonce to its own
    // bootstrap scripts automatically.
    requestHeaders.set("Content-Security-Policy", csp);
  }

  const { response, user } = await updateSession(request, requestHeaders);
  if (request.nextUrl.pathname.startsWith("/dashboard") && !user) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the full path AND query string (e.g. ?meta=connected toast
    // params) so the user returns exactly where they were after signing in.
    loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }
  if (csp) response.headers.set("Content-Security-Policy", csp);
  return response;
}

// Cover every page route while excluding API handlers and static assets,
// which neither need a nonce nor benefit from the header.
export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)"]
};
