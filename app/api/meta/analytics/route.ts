import { NextResponse } from "next/server";
import { fetchMetaAnalytics } from "@/lib/meta-analytics";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Unauthenticated snapshot fetches are still capped (by IP) so the endpoint
  // cannot be used as a free worker or to hammer the Graph API.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkRateLimit(`analytics:${ip}`, 30, 60_000)).allowed) return NextResponse.json({ success: false, live: false, error: "Too many requests. Try again shortly." }, { status: 429 });
  const bypassCache = new URL(request.url).searchParams.get("refresh") === "1";
  const snapshot = await fetchMetaAnalytics(undefined, bypassCache);
  // A failed snapshot already carries success:false plus an error message, and
  // 401 would conflate "provider/API failure" with "not signed in", which the
  // dashboards then treat as an authentication problem.
  return NextResponse.json(snapshot, { status: 200, headers: { "Cache-Control": "no-store" } });
}
