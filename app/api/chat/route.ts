import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { getWorkspaceContext, EDUVERSE_SYSTEM_PROMPT, isSelfHarmMessage, SELF_HARM_SAFE_RESPONSE } from "@/lib/ai/eduverse-prompt";
import { fetchMetaAnalytics } from "@/lib/meta-analytics";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getGeminiModel } from "@/lib/ai/model";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(8_000),
  // Attachments arrive as base64 data URLs. The cap keeps image payloads
  // within a few MB so a malicious client cannot burn unbounded provider
  // spend or DB storage.
  image: z.string().startsWith("data:").max(4_000_000).optional()
});
const requestSchema = z.object({ conversationId: z.string().uuid().optional(), messages: z.array(messageSchema).min(1).max(12) }).superRefine(({ messages }, ctx) => {
  if (messages.at(-1)?.role !== "user") {
    ctx.addIssue({ code: "custom", message: "The latest chat message must be from the user." });
  }
  if (messages.filter((message) => message.image).length > 1) {
    ctx.addIssue({ code: "custom", message: "Only one image can be sent with a chat request." });
  }
});
type ChatMessage = z.infer<typeof messageSchema>;
const MESSAGE_PAGE_SIZE = 20;
const GEMINI_MODEL = getGeminiModel();
const FAST_GEMINI_MODEL = process.env.GEMINI_FAST_MODEL || "gemini-3.5-flash-lite";
// chat_messages.content_check caps a row at 20 000 characters. 4096 tokens is
// roughly 16k characters of prose, so replies are clamped before persistence.
const MAX_PERSISTED_CHARACTERS = 20_000;

type Provider = "gemini";

function latestUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user");
}

function needsDeeperThinking(messages: ChatMessage[]) {
  const latest = latestUserMessage(messages);
  return Boolean(latest?.image || (latest && /\b(why|analy[sz]e|analysis|analytics?|insights?|audience|engagement|reach|impressions?|followers?|perform(?:ance)?|compare|comparison|strategy|strategic|recommend(?:ation)?|forecast|trend|best[ -]?time|posting window|explain|evaluate|calculate|metrics|growth|campaign|roadmap|carousel|reels?|step[ -]?by[ -]?step)\b/i.test(latest.content)));
}

async function* withFirstChunk(first: IteratorResult<string>, stream: AsyncGenerator<string>) {
  if (!first.done) yield first.value;
  yield* stream;
}

async function* geminiStream(messages: ChatMessage[], workspaceContext: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("your-gemini") || apiKey.length < 15) {
    throw new Error("Gemini API key is not configured.");
  }
  const client = new GoogleGenAI({ apiKey });

  const recentMessages = messages;
  let latestImageIndex = -1;
  recentMessages.forEach((message, index) => { if (message.image) latestImageIndex = index; });
  const contents = recentMessages.map((message, index) => {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: index === recentMessages.length - 1 ? message.content : message.content.slice(0, 2400) }];
    if (index === latestImageIndex && message.image?.startsWith("data:")) {
      const match = message.image.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }
    return {
      role: message.role === "assistant" ? "model" : "user",
      parts
    };
  });

  const needsReasoning = needsDeeperThinking(messages);
  const config = {
    systemInstruction: `${EDUVERSE_SYSTEM_PROMPT}\n\n${getWorkspaceContext()}\n\n${workspaceContext}`,
    maxOutputTokens: 4096,
    thinkingConfig: { thinkingLevel: needsReasoning ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL }
  };

  const stream = await client.models.generateContentStream({ model: needsReasoning ? GEMINI_MODEL : FAST_GEMINI_MODEL, contents, config });
  for await (const chunk of stream) yield chunk.text ?? "";
}

async function getWorkspaceId(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, userId: string) {
  try {
    const { data } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", userId).limit(1).maybeSingle();
    return data?.workspace_id as string | undefined;
  } catch {
    return undefined;
  }
}

// Short-TTL per-user cache so chat messages do not re-run the full analytics
// pipeline (several DB round trips plus up to a full Graph fan-out) for every
// single message. Keyed by user id to avoid leaking context across sessions.
const WORKSPACE_CONTEXT_TTL_MS = 5 * 60_000;
const WORKSPACE_CONTEXT_TIMEOUT_MS = 8_000;
const UNAVAILABLE_WORKSPACE_CONTEXT = "LIVE META ANALYTICS: unavailable. Do not make workspace-specific claims.";
const SKIPPED_WORKSPACE_CONTEXT = "LIVE META ANALYTICS: not loaded for this request. Do not make workspace-specific claims.";
const workspaceContextCache = new Map<string, { at: number; value: string }>();
const workspaceContextPending = new Map<string, Promise<string>>();

function needsMetaContext(messages: ChatMessage[]) {
  const latest = latestUserMessage(messages);
  return Boolean(latest && /\b(analytics?|insights?|audience|followers?|reach|impressions?|engagement|best[ -]?times?|posting window|instagram|facebook|threads|meta account|connected account|performance|metrics|growth|reels?|carousel)\b/i.test(latest.content));
}

async function getLiveWorkspaceContext(userId?: string) {
  if (userId) {
    const cached = workspaceContextCache.get(userId);
    if (cached && Date.now() - cached.at < WORKSPACE_CONTEXT_TTL_MS) return cached.value;
    const pending = workspaceContextPending.get(userId);
    if (pending) return pending;
  }
  const controller = new AbortController();
  const build = async () => {
    try {
      const analytics = await fetchMetaAnalytics(undefined, false, userId, controller.signal);
      if (!analytics.live) return UNAVAILABLE_WORKSPACE_CONTEXT;
      return `LIVE META ANALYTICS SNAPSHOT:\n${JSON.stringify({
        accounts: analytics.accounts.map((account) => ({ name: account.name, platform: account.platform, handle: account.handle, followers: account.followers })),
        metrics: analytics.metrics,
        recentPosts: analytics.recentPosts.slice(0, 8).map((post) => ({
          platform: post.platform,
          accountLabel: post.accountLabel,
          date: post.date,
          post: post.post.slice(0, 500),
          likes: post.likes,
          comments: post.comments,
          shares: post.shares,
          reach: post.reach,
          mediaType: post.mediaType
        })),
        memory: analytics.memoryItems.slice(0, 8).map((item) => item.slice(0, 300)),
        bestTimes: analytics.bestTimes
          ? {
              timezone: analytics.bestTimes.timezone,
              sampleSize: analytics.bestTimes.sampleSize,
              confidence: analytics.bestTimes.confidence,
              windows: analytics.bestTimes.windows.slice(0, 3),
              byAccount: analytics.bestTimes.byAccount.slice(0, 4)
            }
          : null,
        error: analytics.error
      })}`;
    } catch {
      return UNAVAILABLE_WORKSPACE_CONTEXT;
    }
  };
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const pending = Promise.race([
    build(),
    new Promise<string>((resolve) => {
      timeout = setTimeout(() => {
        controller.abort();
        resolve(UNAVAILABLE_WORKSPACE_CONTEXT);
      }, WORKSPACE_CONTEXT_TIMEOUT_MS);
    })
  ]);
  if (userId) workspaceContextPending.set(userId, pending);
  let value: string;
  try {
    value = await pending;
  } finally {
    if (userId && workspaceContextPending.get(userId) === pending) workspaceContextPending.delete(userId);
  }
  if (timeout) clearTimeout(timeout);
  if (userId && value !== UNAVAILABLE_WORKSPACE_CONTEXT) {
    if (workspaceContextCache.size > 100) {
      for (const [key, entry] of workspaceContextCache) {
        if (Date.now() - entry.at >= WORKSPACE_CONTEXT_TTL_MS) workspaceContextCache.delete(key);
      }
    }
    workspaceContextCache.set(userId, { at: Date.now(), value });
  }
  return value;
}

async function getOrCreateConversation(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, workspaceId: string, userId: string, conversationId: string | undefined, title: string) {
  if (conversationId) {
    const { data } = await supabase.from("chat_conversations").select("id").eq("id", conversationId).eq("workspace_id", workspaceId).maybeSingle();
    if (data) return data.id as string;
  }
  const { data, error } = await supabase.from("chat_conversations").insert({ workspace_id: workspaceId, created_by: userId, title: title.slice(0, 80) }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId");
    const before = url.searchParams.get("before");
    const supabase = await createClient();
    if (!supabase) return Response.json({ conversations: [], messages: [] });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

    // Opening a saved chat only needs its message page. RLS on chat_messages
    // scopes this query to conversations in the signed-in user's workspace.
    if (conversationId) {
      if (!z.string().uuid().safeParse(conversationId).success) return Response.json({ error: "Conversation not found." }, { status: 404 });
      if (before && Number.isNaN(Date.parse(before))) return Response.json({ error: "Invalid message cursor." }, { status: 400 });
      let messageQuery = supabase.from("chat_messages").select("id,role,content,image,created_at").eq("conversation_id", conversationId);
      if (before) messageQuery = messageQuery.lt("created_at", before);
      const { data: page, error: messagesError } = await messageQuery
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(MESSAGE_PAGE_SIZE + 1);
      if (messagesError) throw messagesError;
      if (!before && !page?.length) return Response.json({ error: "Conversation not found." }, { status: 404 });
      const hasMore = (page?.length ?? 0) > MESSAGE_PAGE_SIZE;
      const messages = (page ?? []).slice(0, MESSAGE_PAGE_SIZE).reverse();
      return Response.json({ conversationId, messages, hasMore }, { headers: { "Cache-Control": "no-store" } });
    }

    const workspaceId = await getWorkspaceId(supabase, user.id);
    if (!workspaceId) return Response.json({ conversations: [], messages: [] });
    const { data: conversations, error: conversationsError } = await supabase.from("chat_conversations").select("id,title,updated_at").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }).limit(20);
    if (conversationsError) throw conversationsError;
    if (!conversations?.length) return Response.json({ conversations: [], messages: [] }, { headers: { "Cache-Control": "no-store" } });

    // list=1 returns only the conversation list (used to refresh the sidebar).
    if (url.searchParams.get("list") === "1") {
      return Response.json({ conversations }, { headers: { "Cache-Control": "no-store" } });
    }

    const target = conversations[0];
    const { data: page, error: messagesError } = await supabase.from("chat_messages").select("id,role,content,image,created_at").eq("conversation_id", target.id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(MESSAGE_PAGE_SIZE + 1);
    if (messagesError) throw messagesError;
    const hasMore = (page?.length ?? 0) > MESSAGE_PAGE_SIZE;
    const messages = (page ?? []).slice(0, MESSAGE_PAGE_SIZE).reverse();
    return Response.json({ conversations, conversationId: target.id, messages, hasMore }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logger.error("chat_history_load_failed", { reason: error instanceof Error ? error.message : "unknown" });
    return Response.json({ error: "Chat history is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function DELETE(request: Request) {
  const conversationId = new URL(request.url).searchParams.get("conversationId");
  if (!conversationId || !z.string().uuid().safeParse(conversationId).success) {
    return Response.json({ error: "A valid conversation ID is required." }, { status: 400 });
  }
  const supabase = await createClient();
  if (!supabase) return Response.json({ error: "Service unavailable." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const workspaceId = await getWorkspaceId(supabase, user.id);
  if (!workspaceId) return Response.json({ error: "Conversation not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("chat_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();
  if (error) {
    logger.error("chat_conversation_delete_failed", { reason: error.message });
    return Response.json({ error: "Could not delete this conversation. Try again." }, { status: 500 });
  }
  if (!data) return Response.json({ error: "Conversation not found." }, { status: 404 });
  return Response.json({ success: true });
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid chat request." }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return Response.json({ error: "Service unavailable." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  // Email verification gate matches proxy.ts/dashboard/layout.tsx
  if (!user.email_confirmed_at) return Response.json({ error: "Verify your email to use chat." }, { status: 403 });
  const rateKey = user.id;
  const [minuteLimit, dailyLimit] = await Promise.all([
    checkRateLimit(`chat:${rateKey}`, 20, 60_000),
    checkRateLimit(`chat:daily:${rateKey}`, 200, 24 * 60 * 60 * 1000)
  ]);
  if (!minuteLimit.allowed) return Response.json({ error: "Too many requests. Please try again in a minute." }, { status: 429 });
  if (!dailyLimit.allowed) return Response.json({ error: "Daily chat limit reached (200/day). Try again tomorrow." }, { status: 429 });

  let conversationId: string | undefined;
  let persistenceUnavailable = false;
  const latest = parsed.data.messages.at(-1)!;
  const isSelfHarm = isSelfHarmMessage(latest.content);
  const workspaceContextPromise = !isSelfHarm && needsMetaContext(parsed.data.messages)
    ? getLiveWorkspaceContext(user.id)
    : Promise.resolve(SKIPPED_WORKSPACE_CONTEXT);

  {
    const workspaceId = await getWorkspaceId(supabase, user.id);
    if (!workspaceId) persistenceUnavailable = true;
    else try {
      conversationId = await getOrCreateConversation(supabase, workspaceId, user.id, parsed.data.conversationId, latest.content);
      const { error: messageError } = await supabase.from("chat_messages").insert({ conversation_id: conversationId, role: "user", content: latest.content, image: latest.image ?? null });
      if (messageError) throw messageError;
    } catch (error) {
      logger.warn("chat_persistence_unavailable", { userId: user.id, reason: error instanceof Error ? error.message : "unknown" });
      conversationId = undefined;
      persistenceUnavailable = true;
    }
  }

  // Self-harm safe completion: if latest user message signals distress, return
  // a supportive, resource-rich response without calling the LLM. Logs for audit.
  if (isSelfHarm) {
    logger.warn("chat_self_harm_safe_response", { userId: user.id });
    const encoder = new TextEncoder();
    const safeAnswer = SELF_HARM_SAFE_RESPONSE;
    // Persist the safe assistant response if possible so history remains consistent
    const body = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(safeAnswer));
        if (conversationId) {
          try {
            const { error: messageError } = await supabase.from("chat_messages").insert({ conversation_id: conversationId, role: "assistant", content: safeAnswer });
            if (messageError) throw messageError;
            const { error: conversationError } = await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
            if (conversationError) throw conversationError;
          } catch (e) {
            logger.warn("chat_safe_answer_persist_failed", { conversationId, reason: e instanceof Error ? e.message : "unknown" });
          }
        }
        controller.close();
      }
    });
    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-AI-Provider": "gemini",
        "X-Self-Harm-Safe": "1",
        "X-Chat-Persistence": persistenceUnavailable ? "unavailable" : "saved",
        ...(conversationId ? { "X-Conversation-ID": conversationId } : {})
      }
    });
  }

  const workspaceContext = await workspaceContextPromise;
  let stream: AsyncGenerator<string>;
  const provider: Provider = "gemini";
  try {
    const candidate = geminiStream(parsed.data.messages, workspaceContext);
    stream = withFirstChunk(await candidate.next(), candidate);
  } catch (error) {
    // Only pass through errors we deliberately raised (e.g. "API key is not
    // configured"); never echo provider internals or stack traces to clients.
    const message = error instanceof Error && error.message.startsWith("Gemini API key") ? error.message : "The AI provider is unavailable. Check server configuration.";
    return Response.json({ error: message }, { status: 503 });
  }

  const encoder = new TextEncoder();
  let answer = "";
  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          answer += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
        if (conversationId && answer.trim()) {
          try {
            const { error: messageError } = await supabase.from("chat_messages").insert({ conversation_id: conversationId, role: "assistant", content: answer.trim().slice(0, MAX_PERSISTED_CHARACTERS) });
            if (messageError) throw messageError;
            const { error: conversationError } = await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
            if (conversationError) throw conversationError;
          } catch (error) {
            logger.warn("chat_answer_persist_failed", { conversationId, reason: error instanceof Error ? error.message : "unknown" });
          }
        }
        controller.close();
      } catch (error) {
        logger.error("chat_stream_failed", { reason: error instanceof Error ? error.message : "unknown" });
        controller.error(new Error("The AI provider stream could not complete."));
      }
    }
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-AI-Provider": provider,
      "X-Chat-Persistence": persistenceUnavailable ? "unavailable" : "saved",
      ...(conversationId ? { "X-Conversation-ID": conversationId } : {})
    }
  });
}
