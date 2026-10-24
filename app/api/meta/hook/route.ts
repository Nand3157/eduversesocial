import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { assertHttpsMedia } from "@/lib/meta-api";
import { logger } from "@/lib/logger";
import { getGeminiModel } from "@/lib/ai/model";

export const runtime = "nodejs";

const hookSchema = z.object({
  platform: z.enum(["instagram", "facebook", "threads"]),
  mediaType: z.enum(["CAROUSEL", "IMAGE", "VIDEO", "TEXT"]),
  caption: z.string().trim().max(2200).optional(),
  mediaUrls: z.array(z.string().url().max(2048)).max(10).optional(),
  images: z.array(z.string().startsWith("data:").max(4_000_000)).max(4).optional(),
  accountName: z.string().trim().max(120).optional(),
  accountHandle: z.string().trim().max(120).optional(),
  variations: z.number().int().min(1).max(3).optional(),
  tone: z.enum(["professional", "witty", "bold"]).optional()
});

const GEMINI_MODEL = getGeminiModel();

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
  if (!parsed.success) return Response.json({ success: false, errorCode: "META_INVALID_MEDIA", message: parsed.error.issues[0]?.message ?? "Invalid hook request." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return Response.json({ success: false, errorCode: "META_AUTH_ERROR", message: "Sign in required." }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return Response.json({ success: false, errorCode: "META_AUTH_ERROR", message: "Sign in required." }, { status: 401 });

  if (!(await checkRateLimit(`hook:${user.id}`, 10, 60_000)).allowed) {
    return Response.json({ success: false, errorCode: "META_RATE_LIMIT", message: "Too many requests. Try again shortly." }, { status: 429 });
  }
  if (!(await checkRateLimit(`hook:daily:${user.id}`, 100, 24 * 60 * 60 * 1000)).allowed) {
    return Response.json({ success: false, errorCode: "META_RATE_LIMIT", message: "Daily hook limit reached (100/day). Try again tomorrow." }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("your-gemini") || apiKey.length < 15) {
    return Response.json({ success: false, errorCode: "META_API_ERROR", message: "Gemini API key is not configured." }, { status: 503 });
  }

  const { platform, mediaType, caption, mediaUrls, images, accountName, accountHandle, variations: reqVariations, tone } = parsed.data;
  const variations = reqVariations ?? 3;

  const toneHint = tone ? `TONE OVERRIDE: ${tone.toUpperCase()} — ${tone === "professional" ? "clear, credible, benefit-led" : tone === "witty" ? "light, clever, contrast-driven" : "confident, direct, curiosity-gap"}` : "";
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

  const prompt = `Write exactly ${variations} complete, distinct scroll-stopping hooks for this post, plus 4–6 relevant hashtags.

TARGET PLATFORM: ${PLATFORM_HINTS[platform]}
FORMAT: ${FORMAT_HINTS[mediaType]}
${toneHint}
${imageCount > 0 ? `UPLOADED IMAGES ATTACHED TO THIS REQUEST: ${imageCount} image(s) — look closely and describe only details clearly visible. Never guess the car's color, model, or features.` : ""}
MEDIA SOURCES: ${mediaSummary}
${accountName ? `ACCOUNT: ${accountName}${accountHandle ? ` (${accountHandle})` : ""}` : ""}
${caption ? `DRAFT / TOPIC TO BUILD ON: "${caption}"` : "No draft supplied — invent a compelling angle from the images and links."}

Hard constraints (non-negotiable):
- Each hook must be one complete sentence ending with punctuation, under 30 words, with no CTA, hashtags, or emoji.
- Make each hook usable as written; never end on a dangling word or unfinished phrase.
- Match the platform's tone above${tone ? " and the tone override" : ""}.
- Base hooks on what you actually see in images and read from links.
- Do not invent statistics, follower counts, or results.
- Return 4–6 specific, relevant hashtags, without spaces; avoid generic tags like #viral.`;

  try {
    const client = new GoogleGenAI({ apiKey });
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [...parts, { text: prompt }] }],
      config: {
        systemInstruction: "You are a senior social media copywriter. You write powerful scroll-stopping hook sentences, numbered, and never fabricate facts or metrics.",
        maxOutputTokens: 400,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: {
            hooks: { type: "array", items: { type: "string" }, minItems: variations, maxItems: variations },
            hashtags: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 6 }
          },
          required: ["hooks", "hashtags"],
          propertyOrdering: ["hooks", "hashtags"]
        }
      }
    });
    const text = result.text?.trim();
    if (!text) throw new Error("EMPTY_RESPONSE");
    let output: unknown;
    try { output = JSON.parse(text); } catch { throw new Error("INCOMPLETE_RESPONSE"); }
    const parsedOutput = z.object({ hooks: z.array(z.string().trim().min(1)).length(variations), hashtags: z.array(z.string().trim()).min(4).max(6) }).safeParse(output);
    if (!parsedOutput.success) throw new Error("INCOMPLETE_RESPONSE");
    const captions = parsedOutput.data.hooks.map(singleSentence);
    if (captions.some((hook) => !/[.!?…]$/.test(hook))) throw new Error("INCOMPLETE_RESPONSE");
    const hashtags = [...new Set(parsedOutput.data.hashtags.filter((tag) => /^#[\p{L}\p{N}_]{1,29}$/u.test(tag)).map((tag) => tag.toLocaleLowerCase()))].slice(0, 8);
    if (hashtags.length < 4) throw new Error("INCOMPLETE_RESPONSE");
    return Response.json({ success: true, caption: captions[0], captions, hashtags });
  } catch (error) {
    logger.error("hook_generation_failed", { reason: error instanceof Error ? error.message : "unknown" });
    if (error instanceof Error && error.message === "INCOMPLETE_RESPONSE") {
      return Response.json({ success: false, errorCode: "META_INCOMPLETE_RESPONSE", message: "Gemini returned incomplete hooks. Try generating again." }, { status: 502 });
    }
    return Response.json({ success: false, errorCode: "META_API_ERROR", message: "The AI hook generator is unavailable. Check server configuration." }, { status: 503 });
  }
}
