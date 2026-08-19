import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const hookSchema = z.object({
  platform: z.enum(["instagram", "facebook", "threads"]),
  mediaType: z.enum(["CAROUSEL", "IMAGE", "VIDEO", "TEXT"]),
  // The draft caption the user already typed; treated as the topic to build on
  // when present, otherwise the model invents the angle from the media.
  caption: z.string().trim().max(2200).optional(),
  mediaUrls: z.array(z.string().url().max(400)).max(10).optional(),
  accountName: z.string().trim().max(120).optional(),
  accountHandle: z.string().trim().max(120).optional()
});

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

const FORMAT_HINTS: Record<z.infer<typeof hookSchema>["mediaType"], string> = {
  CAROUSEL: "Carousel — tease the swipe: each slide delivers one idea, so the hook must promise a numbered payoff.",
  IMAGE: "Single image — the caption carries the story, so lead with the single most valuable claim.",
  VIDEO: "Reels / short video — the first line is the on-screen hook; keep it short, punchy and curiosity-driven.",
  TEXT: "Text post — no media, so the words alone must stop the scroll with a bold, specific opener."
};

const PLATFORM_HINTS: Record<z.infer<typeof hookSchema>["platform"], string> = {
  instagram: "Instagram Business: conversational, warm, emoji and 3-5 relevant hashtags welcome.",
  facebook: "Facebook Page: slightly more professional and descriptive, fewer hashtags, community-minded tone.",
  threads: "Threads: short, witty, opinion-driven, minimal hashtags (1-3), natural conversation starter."
};

export async function POST(request: Request) {
  const parsed = hookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ success: false, errorCode: "META_INVALID_MEDIA", message: "Invalid hook request." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return Response.json({ success: false, errorCode: "META_AUTH_ERROR", message: "Sign in required." }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return Response.json({ success: false, errorCode: "META_AUTH_ERROR", message: "Sign in required." }, { status: 401 });

  if (!checkRateLimit(`hook:${user.id}`, 15, 60_000).allowed) {
    return Response.json({ success: false, errorCode: "META_RATE_LIMIT", message: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("your-gemini") || apiKey.length < 15) {
    return Response.json({ success: false, errorCode: "META_API_ERROR", message: "Gemini API key is not configured." }, { status: 503 });
  }

  const { platform, mediaType, caption, mediaUrls, accountName, accountHandle } = parsed.data;
  const mediaSummary = (mediaUrls ?? []).length
    ? (mediaUrls ?? []).map((url) => { try { return new URL(url).host; } catch { return url; } }).join(", ")
    : "no media URLs supplied — write a text-forward hook";

  const prompt = `Write one ready-to-publish caption for this post.

TARGET PLATFORM: ${PLATFORM_HINTS[platform]}
FORMAT: ${FORMAT_HINTS[mediaType]}
MEDIA SOURCES: ${mediaSummary}
${accountName ? `ACCOUNT: ${accountName}${accountHandle ? ` (${accountHandle})` : ""}` : ""}
${caption ? `DRAFT / TOPIC TO BUILD ON: "${caption}"` : "No draft supplied — invent a compelling angle from the media sources."}

Requirements:
- Open with a scroll-stopping hook line (first sentence).
- Follow with 1-2 supporting sentences that deliver on the promise.
- End with one clear call to action or engagement question.
- Keep the full caption under 2200 characters.
- Match the platform's tone and hashtag guidance above.
- Do not invent statistics, follower counts, or results.
- Return ONLY the caption text. No quotes around it, no markdown, no headings, no bullet points.`;

  try {
    const client = new GoogleGenAI({ apiKey });
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are a senior social media copywriter. You write authentic, specific, high-engagement captions that never fabricate facts or metrics.",
        temperature: 0.8,
        maxOutputTokens: 1024
      }
    });
    const text = result.text?.trim();
    if (!text) throw new Error("EMPTY_RESPONSE");
    return Response.json({ success: true, caption: text });
  } catch {
    return Response.json({ success: false, errorCode: "META_API_ERROR", message: "The AI hook generator is unavailable. Check server configuration." }, { status: 503 });
  }
}