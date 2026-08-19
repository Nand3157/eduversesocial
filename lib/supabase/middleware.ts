import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
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
  const { data: { user } } = await supabase.auth.getUser();
  return { response, user };
}
