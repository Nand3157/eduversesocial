import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const schema = z.object({
  source: z.string().trim().min(1).max(2200),
  platform: z.string().max(40).optional(),
  metrics: z.string().max(300).optional()
});
const platforms = ["instagram", "facebook", "threads"] as const;

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Choose a post to repurpose." }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return Response.json({ message: "Sign in required." }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ message: "Sign in required." }, { status: 401 });
  if (!(await checkRateLimit(`repurpose:${user.id}`, 8, 60_000)).allowed) return Response.json({ message: "Too many requests. Try again shortly." }, { status: 429 });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("your-gemini") || apiKey.length < 15) return Response.json({ message: "AI repurposing is not configured." }, { status: 503 });

  try {
    const client = new GoogleGenAI({ apiKey });
    const result = await client.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      contents: `Adapt this proven social post into exactly three platform variants. Preserve its central insight and factual meaning. Do not add claims, statistics, promises, or context not present in the source. Do not mention source performance metrics in the copy. Return only valid JSON with keys instagram, facebook, threads, each a string under 2200 characters. Instagram: warm, vivid, concise, optional modest hashtags. Facebook: clear and community-oriented. Threads: conversational and concise.\n\nSource platform: ${parsed.data.platform ?? "unknown"}\nObserved metrics (context only, never repeat as content): ${parsed.data.metrics ?? "not provided"}\nSource post:\n${parsed.data.source}`,
      config: { responseMimeType: "application/json", temperature: 0.5, maxOutputTokens: 1200 }
    });
    const raw = JSON.parse(result.text ?? "{}") as Record<string, unknown>;
    const variants = Object.fromEntries(platforms.map((platform) => [platform, typeof raw[platform] === "string" ? raw[platform].trim().slice(0, 2200) : ""]));
    if (platforms.some((platform) => !variants[platform])) throw new Error("Incomplete variants");
    return Response.json({ success: true, variants });
  } catch {
    return Response.json({ message: "Could not create platform variants. Try again." }, { status: 502 });
  }
}
