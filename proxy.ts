import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  if (request.nextUrl.pathname.startsWith("/dashboard") && !user) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the full path AND query string (e.g. ?meta=connected toast
    // params) so the user returns exactly where they were after signing in.
    loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }
  return response;
}

export const config = { matcher: ["/dashboard/:path*"] };
