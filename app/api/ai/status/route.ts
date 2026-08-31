import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const ip = (await headers()).get("x-real-ip") ?? (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkRateLimit(`ai-status:${ip}`, 60, 60_000)).allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  return NextResponse.json(
    { provider: "Google Gemini", model, displayName: "Gemini 3.5 Flash" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
