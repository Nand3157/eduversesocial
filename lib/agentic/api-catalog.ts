import type { ApiScope } from "@/lib/agentic/site";

/**
 * Machine-readable catalog of the public HTTP API. This one structure feeds
 * /openapi.json, /api/openapi.yaml, /api/tools.json (function calling), and
 * the MCP tools/list response, so the documented surface can never drift from
 * the real routes in app/api/**.
 */

export type JsonSchema = {
  type: "object" | "string" | "number" | "integer" | "boolean" | "array";
  description?: string;
  properties?: Record<string, JsonSchema & { enum?: string[]; format?: string; items?: JsonSchema; example?: unknown }>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  minimum?: number;
  maximum?: number;
  maxLength?: number;
};

export interface ApiParameter {
  name: string;
  in: "query" | "path" | "header";
  required: boolean;
  description: string;
  schema: Pick<JsonSchema, "type"> & { enum?: string[]; default?: string };
}

export interface ApiOperation {
  /** Route path as mounted under app/api (leading slash). */
  path: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  operationId: string;
  summary: string;
  description: string;
  tag: string;
  /** Empty array = zero-auth endpoint agents can call without credentials. */
  scopes: ApiScope[];
  parameters?: ApiParameter[];
  requestBody?: { schema: JsonSchema; example: Record<string, unknown> };
  responses: Record<string, { description: string }>;
  /**
   * True when an LLM agent may invoke this directly via function calling or
   * MCP. Browser redirects and Meta webhook receivers are excluded.
   */
  agentCallable: boolean;
}

const JSON_OK = { "200": { description: "Success with a JSON body." } };
const RATE_LIMITED = { "429": { description: "Rate limit exceeded; retry after the window resets." } };

export const API_OPERATIONS: ApiOperation[] = [
  {
    path: "/api/health",
    method: "GET",
    operationId: "getHealth",
    summary: "Service health probe",
    description:
      "Returns service status and the current server timestamp. Zero-auth and unmetered; use it as the sandbox smoke test before calling anything else.",
    tag: "System",
    scopes: [],
    responses: {
      ...JSON_OK,
      "200": { description: "JSON body: { status: \"ok\", timestamp: ISO-8601 string }." }
    },
    agentCallable: true
  },
  {
    path: "/api/ai/status",
    method: "GET",
    operationId: "getAiStatus",
    summary: "AI provider availability",
    description:
      "Reports which AI provider and model power the chat assistant right now (provider, model, displayName). Zero-auth.",
    tag: "System",
    scopes: [],
    responses: JSON_OK,
    agentCallable: true
  },
  {
    path: "/api/reviews",
    method: "GET",
    operationId: "listReviews",
    summary: "List approved customer reviews",
    description:
      "Returns up to 24 approved public reviews with id, name, role, rating (1-5), content, and created_at. Zero-auth; returns { reviews: [] } when storage is not configured.",
    tag: "Reviews",
    scopes: [],
    responses: JSON_OK,
    agentCallable: true
  },
  {
    path: "/api/reviews",
    method: "POST",
    operationId: "createReview",
    summary: "Submit a customer review",
    description:
      "Publishes a customer review immediately. Rate limited to 5 submissions per minute per client.",
    tag: "Reviews",
    scopes: ["write:reviews"],
    requestBody: {
      schema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Reviewer display name.", maxLength: 80 },
          role: { type: "string", description: "Optional reviewer role, e.g. Social Media Manager.", maxLength: 120 },
          rating: { type: "integer", description: "Star rating.", minimum: 1, maximum: 5 },
          content: { type: "string", description: "Review text.", maxLength: 800 }
        },
        required: ["name", "rating", "content"],
        additionalProperties: false
      },
      example: { name: "Ada Lovelace", role: "Growth lead", rating: 5, content: "The posting windows are uncannily accurate." }
    },
    responses: {
      "200": { description: "Review published." },
      "400": { description: "Validation failed (missing/oversized fields)." },
      ...RATE_LIMITED,
      "503": { description: "Review storage unavailable." }
    },
    agentCallable: true
  },
  {
    path: "/api/chat",
    method: "POST",
    operationId: "sendChatMessage",
    summary: "Chat with the audience-intelligence assistant",
    description:
      "Sends a conversation to the EduVerse assistant grounded in the caller's live Meta analytics. Requires an authenticated session cookie. Streams plain-text chunks; ends when the model finishes.",
    tag: "Assistant",
    scopes: ["invoke:chat"],
    requestBody: {
      schema: {
        type: "object",
        properties: {
          conversationId: { type: "string", description: "Optional existing conversation UUID.", format: "uuid" },
          messages: {
            type: "array",
            description: "Ordered turns, oldest first. Max 20 messages of up to 8000 characters each.",
            items: {
              type: "object",
              properties: {
                role: { type: "string", enum: ["user", "assistant"] },
                content: { type: "string" },
                image: { type: "string", description: "Optional base64 data-URL image attachment." }
              },
              required: ["role", "content"]
            }
          }
        },
        required: ["messages"],
        additionalProperties: false
      },
      example: { messages: [{ role: "user", content: "What should I post on Instagram this week?" }] }
    },
    responses: {
      "200": { description: "Streaming text/plain response." },
      "401": { description: "Not authenticated." },
      "429": { description: "Rate limited." }
    },
    agentCallable: false
  },
  {
    path: "/api/chat",
    method: "GET",
    operationId: "getChatStatus",
    summary: "Chat session status",
    description: "Returns whether the current session has an active AI-backed chat available. Requires an authenticated session cookie.",
    tag: "Assistant",
    scopes: ["invoke:chat"],
    responses: {
      ...JSON_OK,
      "401": { description: "Not authenticated." }
    },
    agentCallable: false
  },
  {
    path: "/api/meta/connect",
    method: "GET",
    operationId: "getMetaConnection",
    summary: "Connected Meta accounts",
    description:
      "Returns the authenticated user's connected Instagram/Facebook/Threads connections and OAuth state. Requires an authenticated session cookie.",
    tag: "Meta",
    scopes: ["meta:read"],
    responses: {
      "200": { description: "Connection list for the signed-in account." },
      "401": { description: "Not authenticated." }
    },
    agentCallable: false
  },
  {
    path: "/api/meta/connect",
    method: "DELETE",
    operationId: "disconnectMetaAccount",
    summary: "Disconnect a Meta account",
    description: "Removes stored OAuth tokens for one connected platform. Requires an authenticated session cookie.",
    tag: "Meta",
    scopes: ["meta:write"],
    parameters: [
      { name: "platform", in: "query", required: true, description: "Platform to disconnect.", schema: { type: "string", enum: ["instagram", "facebook", "threads"] } }
    ],
    responses: {
      "200": { description: "Account disconnected." },
      "400": { description: "Unknown platform." },
      "401": { description: "Not authenticated." }
    },
    agentCallable: false
  },
  {
    path: "/api/meta/analytics",
    method: "GET",
    operationId: "getMetaAnalytics",
    summary: "Cross-platform engagement analytics",
    description:
      "Aggregated reach, saves, comment sentiment, and posting-window telemetry across every connected Meta account for the signed-in user. Requires an authenticated session cookie.",
    tag: "Meta",
    scopes: ["meta:read"],
    responses: {
      "200": { description: "Analytics payload keyed by platform." },
      "401": { description: "Not authenticated." }
    },
    agentCallable: false
  },
  {
    path: "/api/meta/upload",
    method: "POST",
    operationId: "uploadMedia",
    summary: "Upload media for publishing",
    description:
      "Stores an image/video attachment for a later publish call. Accepts multipart/form-data. Requires an authenticated session cookie.",
    tag: "Meta",
    scopes: ["meta:write"],
    requestBody: {
      schema: { type: "object", properties: { file: { type: "string", description: "Binary multipart part named 'file'." } }, required: ["file"] },
      example: {}
    },
    responses: {
      "200": { description: "Media stored; returns its handle/URL." },
      "401": { description: "Not authenticated." },
      "413": { description: "File too large." }
    },
    agentCallable: false
  },
  {
    path: "/api/meta/publish",
    method: "POST",
    operationId: "publishPost",
    summary: "Publish or schedule a post",
    description:
      "Publishes immediately or schedules via the official Meta Graph API to a connected account. Requires an authenticated session cookie.",
    tag: "Meta",
    scopes: ["meta:write"],
    requestBody: {
      schema: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["instagram", "facebook", "threads"] },
          caption: { type: "string" },
          scheduledAt: { type: "string", description: "ISO-8601 timestamp for scheduled publishing." }
        },
        required: ["platform"]
      },
      example: { platform: "instagram", caption: "Behind the scenes of our launch", scheduledAt: "2026-08-25T15:00:00Z" }
    },
    responses: {
      "200": { description: "Post created or scheduled." },
      "401": { description: "Not authenticated." },
      "409": { description: "Account not connected." }
    },
    agentCallable: false
  },
  {
    path: "/api/meta/scheduler",
    method: "PATCH",
    operationId: "runSchedulerTick",
    summary: "Run the scheduled-publish worker tick",
    description:
      "Cron entry point that publishes any due scheduled posts. Protected by the SCHEDULER_SECRET shared secret header, not user sessions.",
    tag: "Meta",
    scopes: ["meta:write"],
    parameters: [
      { name: "authorization", in: "header", required: true, description: "Bearer SCHEDULER_SECRET value.", schema: { type: "string" } }
    ],
    responses: {
      "200": { description: "Tick completed." },
      "401": { description: "Missing or wrong secret." }
    },
    agentCallable: false
  },
  {
    path: "/api/account/delete",
    method: "DELETE",
    operationId: "deleteAccount",
    summary: "Permanently delete the account",
    description:
      "Irreversibly deletes the signed-in account plus stored tokens, analytics cache, and workspace membership. Requires a recent authenticated session.",
    tag: "Account",
    scopes: ["account:delete"],
    responses: {
      "200": { description: "Account deleted." },
      "401": { description: "Not authenticated." }
    },
    agentCallable: false
  }
];

export function getAgentCallableOperations(): ApiOperation[] {
  return API_OPERATIONS.filter((operation) => operation.agentCallable);
}
