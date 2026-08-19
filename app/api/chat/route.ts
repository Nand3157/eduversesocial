import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { getWorkspaceContext, EDUVERSE_SYSTEM_PROMPT } from "@/lib/ai/eduverse-prompt";
import { fetchMetaAnalytics } from "@/lib/meta-analytics";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(8_000),
  // Attachments arrive as base64 data URLs. The cap keeps image payloads
  // within a few MB so a malicious client cannot burn unbounded provider
  // spend or DB storage.
  image: z.string().startsWith("data:").max(4_000_000).optional()
});
const requestSchema = z.object({ conversationId: z.string().uuid().optional(), messages: z.array(messageSchema).min(1).max(20) });
type ChatMessage = z.infer<typeof messageSchema>;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

type Provider = "gemini";

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

  const contents = messages.map((message) => {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: message.content }];
    if (message.image && message.image.startsWith("data:")) {
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

  const config = {
    systemInstruction: `${EDUVERSE_SYSTEM_PROMPT}\n\n${getWorkspaceContext()}\n\n${workspaceContext}`,
    temperature: 0.4,
    maxOutputTokens: 4096
  };

  const stream = await client.models.generateContentStream({ model: GEMINI_MODEL, contents, config });
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
const workspaceContextCache = new Map<string, { at: number; value: string }>();

async function getLiveWorkspaceContext(userId?: string) {
  if (userId) {
    const cached = workspaceContextCache.get(userId);
    if (cached && Date.now() - cached.at < WORKSPACE_CONTEXT_TTL_MS) return cached.value;
  }
  const build = async () => {
    try {
      const analytics = await fetchMetaAnalytics();
      if (!analytics.live) return "LIVE META ANALYTICS: unavailable. Do not make workspace-specific claims.";
      return `LIVE META ANALYTICS SNAPSHOT:\n${JSON.stringify({
        accounts: analytics.accounts.map((account) => ({ name: account.name, platform: account.platform, handle: account.handle, followers: account.followers })),
        metrics: analytics.metrics,
        recentPosts: analytics.recentPosts,
        error: analytics.error
      })}`;
    } catch {
      return "LIVE META ANALYTICS: unavailable. Do not make workspace-specific claims.";
    }
  };
  const value = await build();
  if (userId) {
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
    const supabase = await createClient();
    if (!supabase) return Response.json({ conversations: [], messages: [] });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
    const workspaceId = await getWorkspaceId(supabase, user.id);
    if (!workspaceId) return Response.json({ conversations: [], messages: [] });
    const { data: conversations } = await supabase.from("chat_conversations").select("id,title,updated_at").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }).limit(20);
    if (!conversations?.length) return Response.json({ conversations: [], messages: [] }, { headers: { "Cache-Control": "no-store" } });

    const url = new URL(request.url);
    // list=1 returns only the conversation list (used to refresh the sidebar).
    if (url.searchParams.get("list") === "1") {
      return Response.json({ conversations }, { headers: { "Cache-Control": "no-store" } });
    }

    // conversationId=<uuid> loads that specific conversation (verified to belong to this workspace).
    const conversationId = url.searchParams.get("conversationId");
    const target = conversationId ? conversations.find((conversation) => conversation.id === conversationId) : conversations[0];
    if (!target) return Response.json({ error: "Conversation not found." }, { status: 404 });
    const { data: messages } = await supabase.from("chat_messages").select("role,content,image").eq("conversation_id", target.id).order("created_at", { ascending: true }).limit(50);
    return Response.json({ conversations, conversationId: target.id, messages: messages ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ conversations: [], messages: [] });
  }
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid chat request." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser().catch(() => ({ data: { user: null } })) : { data: { user: null } };
  if (supabase && !user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const rateKey = user?.id ?? request.headers.get("x-forwarded-for") ?? "local-demo";
  if (!checkRateLimit(`chat:${rateKey}`, 60, 60_000).allowed) return Response.json({ error: "Too many requests. Please try again in a minute." }, { status: 429 });

  let conversationId: string | undefined;
  let persistenceUnavailable = false;
  const latest = parsed.data.messages.at(-1)!;

  if (supabase && user) {
    const workspaceId = await getWorkspaceId(supabase, user.id);
    if (!workspaceId) persistenceUnavailable = true;
    else try {
      conversationId = await getOrCreateConversation(supabase, workspaceId, user.id, parsed.data.conversationId, latest.content);
      await supabase.from("chat_messages").insert({ conversation_id: conversationId, role: "user", content: latest.content, image: latest.image ?? null });
    } catch {
      conversationId = undefined;
      persistenceUnavailable = true;
    }
  }

  const workspaceContext = await getLiveWorkspaceContext(user?.id);
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
        if (supabase && conversationId && answer.trim()) {
          try {
            await supabase.from("chat_messages").insert({ conversation_id: conversationId, role: "assistant", content: answer.trim() });
            await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
          } catch {
            // Ignore optional DB persistence error
          }
        }
        controller.close();
      } catch {
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
      "X-AI-Model": GEMINI_MODEL,
      "X-Chat-Persistence": persistenceUnavailable ? "unavailable" : "saved",
      ...(conversationId ? { "X-Conversation-ID": conversationId } : {})
    }
  });
}
