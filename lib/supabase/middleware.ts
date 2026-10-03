import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

// `requestHeaders` lets the proxy forward modified request headers (the CSP
// nonce) downstream so Server Components and Next's bootstrap scripts see them.
export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  const response = NextResponse.next({ request: { headers: requestHeaders ?? request.headers } });
  if (!hasSupabaseConfig()) return { response, user: null };
  const supabase = createServerClient(supabaseUrl!, supabasePublishableKey!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => {
        request.cookies.set(name, value);
        response.cookies.set(name, value, options);
      })
    }
  });
  // Verify the signed token here; the dashboard layout loads the user record
  // where it needs current profile data. This avoids an Auth network lookup in
  // the request proxy on every protected navigation.
  const { data } = await supabase.auth.getClaims();
  return { response, user: data?.claims ?? null };
}
