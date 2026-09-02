import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { problemResponse, withRateLimitHeaders } from "@/lib/api-response";

export async function GET(request: Request) {
  const incoming = await headers();
  const ip = incoming.get("x-real-ip") ?? incoming.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = 60;
  const rate = await checkRateLimit(`health:${ip}`, limit, 60_000);
  if (!rate.allowed) {
    return withRateLimitHeaders(
      problemResponse(429, "HEALTH_RATE_LIMITED", "Health checks are temporarily rate limited.", "Wait for Retry-After seconds, then try again.", request),
      limit,
      rate
    );
  }
  return withRateLimitHeaders(NextResponse.json({ status: "ok", timestamp: new Date().toISOString() }), limit, rate);
}
