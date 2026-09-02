import { API_OPERATIONS, type ApiOperation, type JsonSchema } from "@/lib/agentic/api-catalog";
import { API_SCOPES, ONBOARDING, SCOPE_NAMES, SITE } from "@/lib/agentic/site";
import { schemaToObject } from "@/lib/agentic/yaml";

/**
 * Builds the OpenAPI 3.1 document for the public HTTP API. Every operation
 * carries a unique operationId, a human description, typed inputs, and
 * explicit response schemas; scoped operations reference the OAuth2 security
 * scheme so agents can request least-privilege access.
 */

function operationSecurity(operation: ApiOperation): Array<Record<string, string[]>> {
  if (operation.scopes.length === 0) return [];
  return [{ sessionCookie: [] }];
}

const PROBLEM_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    type: { type: "string", format: "uri" },
    title: { type: "string" },
    status: { type: "integer" },
    code: { type: "string" },
    message: { type: "string" },
    resolution: { type: "string" },
    requestId: { type: "string" }
  },
  required: ["type", "title", "status", "code", "message", "resolution"],
  additionalProperties: false
};

const RESPONSE_SCHEMAS: Record<string, JsonSchema> = {
  getHealth: {
    type: "object",
    properties: { status: { type: "string", enum: ["ok"] }, timestamp: { type: "string", format: "date-time" } },
    required: ["status", "timestamp"],
    additionalProperties: false
  },
  getAiStatus: {
    type: "object",
    properties: { provider: { type: "string" }, model: { type: "string" }, displayName: { type: "string" } },
    required: ["provider", "model", "displayName"],
    additionalProperties: false
  },
  listReviews: {
    type: "object",
    properties: {
      reviews: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            role: { type: "string" },
            rating: { type: "integer", minimum: 1, maximum: 5 },
            content: { type: "string" },
            created_at: { type: "string", format: "date-time" }
          },
          required: ["id", "name", "rating", "content"],
          additionalProperties: false
        }
      }
    },
    required: ["reviews"],
    additionalProperties: false
  },
  createReview: {
    type: "object",
    properties: { success: { type: "boolean" }, message: { type: "string" } },
    required: ["success", "message"],
    additionalProperties: false
  },
  getChatStatus: { type: "object", properties: { conversations: { type: "array" }, messages: { type: "array" }, conversationId: { type: "string", format: "uuid" } }, additionalProperties: true },
  getMetaConnection: { type: "object", properties: { success: { type: "boolean" }, live: { type: "boolean" }, accounts: { type: "array" } }, required: ["success", "accounts"], additionalProperties: true },
  disconnectMetaAccount: { type: "object", properties: { success: { type: "boolean" } }, required: ["success"], additionalProperties: false },
  getMetaAnalytics: { type: "object", properties: { live: { type: "boolean" }, accounts: { type: "array" }, metrics: { type: "object" }, recentPosts: { type: "array" } }, required: ["live"], additionalProperties: true },
  uploadMedia: { type: "object", properties: { success: { type: "boolean" }, url: { type: "string", format: "uri" } }, required: ["success", "url"], additionalProperties: false },
  publishPost: { type: "object", properties: { success: { type: "boolean" }, platform: { type: "string" }, postId: { type: "string" }, status: { type: "string" }, url: { type: "string", format: "uri" } }, required: ["success"], additionalProperties: true },
  runSchedulerTick: { type: "object", properties: { processed: { type: "integer" }, succeeded: { type: "integer" }, failed: { type: "integer" } }, additionalProperties: true },
  deleteAccount: { type: "object", properties: { success: { type: "boolean" }, partial: { type: "boolean" }, message: { type: "string" } }, required: ["success"], additionalProperties: true }
};

export function buildOpenApiSpec(baseUrl: string): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const operation of API_OPERATIONS) {
    const item = paths[operation.path] ?? {};
    const isStreaming = operation.operationId === "sendChatMessage";
    const responses: Record<string, unknown> = {};
    for (const [status, { description }] of Object.entries(operation.responses)) {
      const okBody =
        status.startsWith("2") || status === "200"
          ? isStreaming
            ? { "text/plain": { schema: { type: "string", description: "Streamed assistant text." } } }
            : { "application/json": { schema: RESPONSE_SCHEMAS[operation.operationId] ?? { type: "object", additionalProperties: true } } }
          : { "application/problem+json": { schema: PROBLEM_SCHEMA } };
      responses[status] = { description, content: okBody };
    }

    item[operation.method.toLowerCase()] = {
      tags: [operation.tag],
      operationId: operation.operationId,
      summary: operation.summary,
      description: `${operation.description}\n\nScopes required: ${operation.scopes.length > 0 ? operation.scopes.join(", ") : "none (zero-auth)"}.`,
      security: operationSecurity(operation),
      "x-required-scopes": [...operation.scopes],
      ...(operation.parameters ? { parameters: operation.parameters.map((parameter) => ({ ...parameter, schema: { ...parameter.schema } })) } : {}),
      ...(operation.requestBody
        ? {
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: schemaToObject(operation.requestBody.schema),
                  example: operation.requestBody.example
                }
              }
            }
          }
        : {}),
      responses
    };
    paths[operation.path] = item;
  }

  return {
    openapi: "3.1.0",
    info: {
      title: `${SITE.name} HTTP API`,
      version: "1.0.0",
      summary: SITE.tagline,
      description: [
        SITE.description,
        "",
        `**When to use:** an agent should reach for this API when it needs to check service health, read or submit customer reviews, or drive Meta publishing workflows on behalf of a signed-in EduVerse account.`,
        "",
        "**Onboarding:** free tier available; self-serve signup at `/signup`; zero-auth smoke tests at `/api/v1/health` and `GET /api/v1/reviews`. Rate limits: " + ONBOARDING.rateLimits,
        "",
        "Machine-readable companions: `/api/tools.json` (LLM function-calling definitions), `/.well-known/mcp` (Model Context Protocol server), `/.well-known/oauth-protected-resource` (RFC 9728 scope discovery), `/llms.txt` (agent guide)."
      ].join("\n"),
      contact: { name: SITE.name + " support", email: SITE.email },
      license: { name: "Proprietary" }
    },
    servers: [{ url: baseUrl, description: "Current deployment" }],
    tags: [
      { name: "System", description: "Zero-auth health and capability probes." },
      { name: "Reviews", description: "Public customer reviews; reads are open, writes are moderated." },
      { name: "Assistant", description: "AI chat grounded in live audience analytics." },
      { name: "Meta", description: "Instagram/Facebook/Threads connections, analytics, and publishing." },
      { name: "Account", description: "Account lifecycle operations." }
    ],
    components: {
      securitySchemes: {
        // Session cookies authenticate the dashboard's own fetch calls.
        sessionCookie: { type: "apiKey", in: "cookie", name: "sb-auth-token", description: "Supabase session cookie set by /login. Used implicitly by same-origin calls." },
        schedulerSecret: { type: "http", scheme: "bearer", description: "Shared secret for the cron-only scheduler endpoint (SCHEDULER_SECRET)." }
      }
    },
    security: [],
    "x-scopes-supported": [...SCOPE_NAMES],
    "x-api-version": "v1",
    "x-versioning": {
      strategy: "URL path",
      current: "v1",
      stablePublicAliases: ["/api/v1/health", "/api/v1/reviews"],
      deprecation: "Unversioned paths remain for compatibility. Future retirement will be announced here and use Deprecation and Sunset headers before removal."
    },
    "x-authentication": {
      status: "session-based",
      note: "A separate OAuth 2.0 authorization server and self-serve API keys are not live yet. Protected operations require the EduVerse Supabase session cookie.",
      plannedScopes: { ...API_SCOPES }
    },
    paths,
    "x-agent-usage": {
      whenToUse: "Health checks, review retrieval/submission, and authenticated Meta analytics/publishing automation.",
      functionCallingDefinitions: "/api/tools.json",
      mcpServer: "/.well-known/mcp",
      markdownNegotiation: 'Send "Accept: text/markdown" on any page URL to receive text/markdown.',
      agentGuide: "/llms.txt"
    }
  };
}
