import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { problemResponse, withRateLimitHeaders } from "@/lib/api-response";
import { getGeminiDisplayName, getGeminiModel } from "@/lib/ai/model";

export const dynamic = "force-dynamic";

export async function GET() {
  const incoming = await headers();
  const ip = incoming.get("x-real-ip") ?? incoming.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = 60;
  const rate = await checkRateLimit(`ai-status:${ip}`, limit, 60_000);
  if (!rate.allowed) return withRateLimitHeaders(problemResponse(429, "AI_STATUS_RATE_LIMITED", "AI status checks are temporarily rate limited.", "Wait for Retry-After seconds, then try again."), limit, rate);
  const model = getGeminiModel();
  return withRateLimitHeaders(NextResponse.json(
    { provider: "Google Gemini", model, displayName: getGeminiDisplayName(model) },
    { headers: { "Cache-Control": "no-store" } }
  ), limit, rate);
}
