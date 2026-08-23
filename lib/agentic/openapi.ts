import { API_OPERATIONS, type ApiOperation } from "@/lib/agentic/api-catalog";
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
  return [{ eduverseOAuth: [...operation.scopes] }];
}

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
            : { "application/json": { schema: { type: "object" } } }
          : { "application/json": { schema: { type: "object", properties: { error: { type: "string" } }, required: ["error"] } } };
      responses[status] = { description, content: okBody };
    }

    item[operation.method.toLowerCase()] = {
      tags: [operation.tag],
      operationId: operation.operationId,
      summary: operation.summary,
      description: `${operation.description}\n\nScopes required: ${operation.scopes.length > 0 ? operation.scopes.join(", ") : "none (zero-auth)"}.`,
      security: operationSecurity(operation),
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
        "**Onboarding:** free tier available; self-serve signup at `/signup`; zero-auth smoke tests at `/api/health` and `GET /api/reviews`. Rate limits: " + ONBOARDING.rateLimits,
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
        schedulerSecret: { type: "http", scheme: "bearer", description: "Shared secret for the cron-only scheduler endpoint (SCHEDULER_SECRET)." },
        eduverseOAuth: {
          type: "oauth2",
          description: "OAuth2 authorization-code flow with named least-privilege scopes. Scope names are mirrored at /.well-known/oauth-protected-resource.",
          flows: {
            authorizationCode: {
              authorizationUrl: "/api/meta/oauth",
              tokenUrl: "/api/meta/oauth/callback",
              scopes: { ...API_SCOPES }
            }
          }
        }
      }
    },
    security: [],
    "x-scopes-supported": [...SCOPE_NAMES],
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
