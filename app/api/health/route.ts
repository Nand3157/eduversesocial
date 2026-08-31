import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export async function GET() {
  const ip = (await headers()).get("x-real-ip") ?? (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkRateLimit(`health:${ip}`, 60, 60_000)).allowed) return NextResponse.json({ status: "rate_limited" }, { status: 429 });
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
