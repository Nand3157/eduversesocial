import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  return NextResponse.json(
    { provider: "Google Gemini", model, displayName: "Gemini 3.5 Flash" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
