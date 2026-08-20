import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { assertHttpsMedia } from "@/lib/meta-api";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const hookSchema = z.object({
  platform: z.enum(["instagram", "facebook", "threads"]),
  mediaType: z.enum(["CAROUSEL", "IMAGE", "VIDEO", "TEXT"]),
  // The draft caption the user already typed; treated as the topic to build on
  // when present, otherwise the model invents the angle from the media.
  caption: z.string().trim().max(2200).optional(),
  mediaUrls: z.array(z.string().url().max(400)).max(10).optional(),
  // Uploaded images arrive as base64 data URLs so the model can actually see
  // the visuals, not just their hosts. Capped like chat attachments.
  images: z.array(z.string().startsWith("data:").max(4_000_000)).max(4).optional(),
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
  instagram: "Instagram Business: conversational, warm, emoji welcome (a single emoji max).",
  facebook: "Facebook Page: slightly more professional and descriptive, community-minded tone.",
  threads: "Threads: short, witty, opinion-driven, natural conversation starter."
};

type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } };

/**
 * Reads a link the user pasted into the composer: image URLs become inline
 * image parts the model can actually look at, everything else is reduced to a
 * readable text snippet (HTML/JSON/plain text). Only public HTTPS hosts pass
 * the SSRF guard, and fetches are size- and time-bounded.
 */
async function readLinkAsPart(url: string): Promise<ContentPart> {
  try {
    const safeUrl = assertHttpsMedia(url);
    const response = await fetch(safeUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "EduVerse-HookBot/1.0", Accept: "text/html,application/json,text/plain,image/*,*/*;q=0.5" }
    });
    if (!response.ok) return { text: `LINK ${safeUrl} (unreachable: HTTP ${response.status})` };
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const buffer = Buffer.from(await response.arrayBuffer());
    if (contentType.startsWith("image/") && buffer.length > 0 && buffer.length <= 4 * 1024 * 1024) {
      return { inlineData: { mimeType: contentType, data: buffer.toString("base64") } };
    }
    if (contentType.includes("html") || contentType.startsWith("text/") || contentType.includes("json")) {
      return { text: `LINK ${safeUrl} (${contentType}):\n${buffer.toString("utf8").replace(/\s+/g, " ").trim().slice(0, 4000)}` };
    }
    return { text: `LINK ${safeUrl} (binary ${contentType} — content not readable)` };
  } catch {
    return { text: `LINK ${url} (could not be read)` };
  }
}

/** Keeps only the first line so the hook is a single sentence even if the model disobeys. */
function singleSentence(text: string): string {
  const line = text.split(/\r?\n/).map((part) => part.trim()).filter(Boolean)[0] ?? text.trim();
  return line;
}

export async function POST(request: Request) {
  const parsed = hookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ success: false, errorCode: "META_INVALID_MEDIA", message: "Invalid hook request." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return Response.json({ success: false, errorCode: "META_AUTH_ERROR", message: "Sign in required." }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return Response.json({ success: false, errorCode: "META_AUTH_ERROR", message: "Sign in required." }, { status: 401 });

  if (!(await checkRateLimit(`hook:${user.id}`, 15, 60_000)).allowed) {
    return Response.json({ success: false, errorCode: "META_RATE_LIMIT", message: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("your-gemini") || apiKey.length < 15) {
    return Response.json({ success: false, errorCode: "META_API_ERROR", message: "Gemini API key is not configured." }, { status: 503 });
  }

  const { platform, mediaType, caption, mediaUrls, images, accountName, accountHandle } = parsed.data;

  // Build the visual/text context: uploaded images first (the model sees them
  // directly), then every pasted link is fetched and read server-side.
  const parts: ContentPart[] = [];
  for (const dataUrl of images ?? []) {
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
    if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
  }
  const linkParts = await Promise.all((mediaUrls ?? []).map(readLinkAsPart));
  const readableLinks = linkParts.filter((part): part is { text: string } => "text" in part).map((part) => part.text);
  const imageCount = parts.length + linkParts.length - readableLinks.length;
  const mediaSummary = readableLinks.length
    ? `LINKED CONTENT READ FROM THE URLS:\n${readableLinks.join("\n---\n")}`
    : "no readable link content — write from the uploaded images";

  const prompt = `Write exactly ONE sentence that opens this post: a scroll-stopping hook line.

TARGET PLATFORM: ${PLATFORM_HINTS[platform]}
FORMAT: ${FORMAT_HINTS[mediaType]}
${imageCount > 0 ? `UPLOADED IMAGES ATTACHED TO THIS REQUEST: ${imageCount} image(s) — actually look at their visual content and reference the most striking detail.` : ""}
MEDIA SOURCES: ${mediaSummary}
${accountName ? `ACCOUNT: ${accountName}${accountHandle ? ` (${accountHandle})` : ""}` : ""}
${caption ? `DRAFT / TOPIC TO BUILD ON: "${caption}"` : "No draft supplied — invent a compelling angle from the images and links."}

Hard constraints (non-negotiable):
- Output exactly ONE sentence. No second sentence, no call to action, no hashtags, no emoji run, no line breaks.
- Keep it under 40 words so it fits the platform's short-caption limit.
- Match the platform's tone above.
- Base the hook on what you actually see in the images and read from the links.
- Do not invent statistics, follower counts, or results.
- Return ONLY the hook sentence. No quotes around it, no markdown, no headings, no bullet points.`;

  try {
    const client = new GoogleGenAI({ apiKey });
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [...parts, { text: prompt }] }],
      config: {
        systemInstruction: "You are a senior social media copywriter. You write one powerful scroll-stopping hook sentence at a time and never fabricate facts or metrics.",
        temperature: 0.7,
        maxOutputTokens: 200
      }
    });
    const text = result.text?.trim();
    if (!text) throw new Error("EMPTY_RESPONSE");
    return Response.json({ success: true, caption: singleSentence(text) });
  } catch (error) {
    logger.error("hook_generation_failed", { reason: error instanceof Error ? error.message : "unknown" });
    return Response.json({ success: false, errorCode: "META_API_ERROR", message: "The AI hook generator is unavailable. Check server configuration." }, { status: 503 });
  }
}