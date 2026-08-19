import { NextResponse } from "next/server";
import { fetchMetaAnalytics } from "@/lib/meta-analytics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const bypassCache = new URL(request.url).searchParams.get("refresh") === "1";
  const snapshot = await fetchMetaAnalytics(undefined, bypassCache);
  // A failed snapshot already carries success:false plus an error message, and
  // 401 would conflate "provider/API failure" with "not signed in", which the
  // dashboards then treat as an authentication problem.
  return NextResponse.json(snapshot, { status: 200, headers: { "Cache-Control": "no-store" } });
}
