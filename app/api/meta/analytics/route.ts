import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchMetaAnalytics } from "@/lib/meta-analytics";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ success: false, live: false, error: "Analytics is not configured." }, { status: 503 });
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, live: false, error: "Sign in required." }, { status: 401 });

  // Authenticated and per-user rate limited — prevents both anon probing and
  // per-IP bypass across serverless isolates. Daily cap prevents Graph quota burn.
  if (!(await checkRateLimit(`analytics:${user.id}`, 15, 60_000)).allowed) {
    return NextResponse.json({ success: false, live: false, error: "Too many requests. Try again shortly." }, { status: 429 });
  }
  if (!(await checkRateLimit(`analytics:daily:${user.id}`, 300, 24 * 60 * 60 * 1000)).allowed) {
    return NextResponse.json({ success: false, live: false, error: "Daily analytics limit reached (300/day). Try again tomorrow." }, { status: 429 });
  }

  const bypassCache = new URL(request.url).searchParams.get("refresh") === "1";
  const snapshot = await fetchMetaAnalytics(undefined, bypassCache);
  return NextResponse.json(snapshot, { status: 200, headers: { "Cache-Control": "no-store" } });
}
