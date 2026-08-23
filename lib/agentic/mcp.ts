/**
 * Model Context Protocol server over Streamable HTTP, mounted at
 * /.well-known/mcp. Implements the required JSON-RPC methods (initialize,
 * ping, tools/list, tools/call) in stateless single-response mode. Tools map
 * onto the zero-auth public endpoints plus catalog introspection.
 */

import { API_OPERATIONS } from "@/lib/agentic/api-catalog";
import { SITE } from "@/lib/agentic/site";

export const MCP_PROTOCOL_VERSION = "2025-06-18";
export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const MAX_BODY_BYTES = 256_000;

export interface McpToolDefinition {
  name: string;
  title?: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export function mcpToolDefinitions(): McpToolDefinition[] {
  return [
    {
      name: "health_check",
      title: "EduVerse health check",
      description: "Check that the EduVerse service is up. Returns status and server timestamp.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false }
    },
    {
      name: "get_ai_status",
      title: "AI provider status",
      description: "Report which AI provider/model currently powers the EduVerse chat assistant.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false }
    },
    {
      name: "list_reviews",
      title: "List approved reviews",
      description: "Fetch up to 24 approved public customer reviews of EduVerse.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false }
    },
    {
      name: "submit_review",
      title: "Submit a review",
      description:
        "Submit a customer review of EduVerse on behalf of a human user. Stored pending moderation. Rate limited to 5 per minute.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Reviewer display name.", maxLength: 80 },
          role: { type: "string", description: "Optional role, e.g. Social Media Manager.", maxLength: 120 },
          rating: { type: "integer", description: "Star rating.", minimum: 1, maximum: 5 },
          content: { type: "string", description: "Review text.", maxLength: 800 }
        },
        required: ["name", "rating", "content"],
        additionalProperties: false
      }
    },
    {
      name: "list_api_operations",
      title: "List API operations",
      description:
        "List every documented EduVerse HTTP operation with method, path, operationId, scopes, and whether agents may call it directly.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false }
    },
    {
      name: "fetch_page_markdown",
      title: "Fetch page as markdown",
      description:
        "Fetch an EduVerse page (e.g. '/', '/signup', '/dashboard') rendered as markdown for agent consumption.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Page path starting with '/'. Use '/' for the homepage." }
        },
        required: ["path"],
        additionalProperties: false
      }
    }
  ];
}

function jsonRpc(id: unknown, result: unknown) {
  return { jsonrpc: "2.0" as const, id, result };
}
function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0" as const, id, error: { code, message } };
}

export const ERROR_METHOD_NOT_FOUND = -32601;
export const ERROR_INVALID_REQUEST = -32600;
export const ERROR_INVALID_PARAMS = -32602;

/**
 * Handle one JSON-RPC message. Network-touching tools receive a `fetcher`
 * bound to the deployment origin so tests can stub it.
 */
export async function handleMcpMessage(
  message: unknown,
  context: { sessionId: string; origin: string; fetcher: typeof fetch }
): Promise<{ status: number; body: Record<string, unknown> | null }> {
  if (typeof message !== "object" || message === null || !("jsonrpc" in message) || (message as { jsonrpc: unknown }).jsonrpc !== "2.0") {
    return { status: 400, body: jsonRpcError(null, ERROR_INVALID_REQUEST, "Not a JSON-RPC 2.0 message.") };
  }

  const { id, method, params } = message as { id?: unknown; method?: unknown; params?: unknown };

  switch (method) {
    case "initialize": {
      const requested = typeof (params as { protocolVersion?: unknown })?.protocolVersion === "string"
        ? (params as { protocolVersion: string }).protocolVersion
        : undefined;
      const version = requested && SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : MCP_PROTOCOL_VERSION;
      return {
        status: 200,
        body: jsonRpc(id ?? null, {
          protocolVersion: version,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: SITE.name, title: `${SITE.name} MCP server`, version: "1.0.0" },
          instructions:
            "EduVerse turns Meta engagement telemetry into posting recommendations. Start with health_check or list_api_operations; use fetch_page_markdown to read site pages."
        })
      };
    }
    case "notifications/initialized":
      return { status: 202, body: null };
    case "ping":
      return { status: 200, body: jsonRpc(id ?? null, {}) };
    case "tools/list":
      return { status: 200, body: jsonRpc(id ?? null, { tools: mcpToolDefinitions() }) };
    case "tools/call":
      return await callTool(params, id, context);    default:
      return { status: 200, body: jsonRpcError(id ?? null, ERROR_METHOD_NOT_FOUND, `Unknown method: ${String(method)}`) };
  }
}

async function callTool(
  params: unknown,
  id: unknown,
  context: { sessionId: string; origin: string; fetcher: typeof fetch }
): Promise<{ status: number; body: Record<string, unknown> | null }> {
  const { name, arguments: args } = (params ?? {}) as { name?: unknown; arguments?: Record<string, unknown> };
  const origin = context.origin;

  try {
    switch (name) {
      case "health_check": {
        const res = await context.fetcher(`${origin}/api/health`);
        return { status: 200, body: jsonRpc(id ?? null, textResult(await res.text())) };
      }
      case "get_ai_status": {
        const res = await context.fetcher(`${origin}/api/ai/status`);
        return { status: 200, body: jsonRpc(id ?? null, textResult(await res.text())) };
      }
      case "list_reviews": {
        const res = await context.fetcher(`${origin}/api/reviews`);
        return { status: 200, body: jsonRpc(id ?? null, textResult(await res.text())) };
      }
      case "submit_review": {
        const res = await context.fetcher(`${origin}/api/reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args ?? {})
        });
        return { status: 200, body: jsonRpc(id ?? null, textResult(await res.text(), !res.ok)) };
      }
      case "list_api_operations": {
        const lines = API_OPERATIONS.map(
          (operation) =>
            `${operation.method} ${operation.path} — ${operation.operationId}: ${operation.summary} [scopes: ${operation.scopes.join(", ") || "none"}]${operation.agentCallable ? "" : " (session-only)"}`
        );
        return { status: 200, body: jsonRpc(id ?? null, textResult(lines.join("\n"))) };
      }
      case "fetch_page_markdown": {
        const path = typeof args?.path === "string" ? args.path : "";
        const normalized = path.startsWith("/") ? path : `/${path}`;
        const res = await context.fetcher(`${origin}/md${normalized === "/" ? "/" : normalized}`);
        return { status: 200, body: jsonRpc(id ?? null, textResult(await res.text(), !res.ok)) };
      }
      default:
        return { status: 200, body: jsonRpcError(id ?? null, ERROR_INVALID_PARAMS, `Unknown tool: ${String(name)}`) };
    }
  } catch (error) {
    return {
      status: 200,
      body: jsonRpc(id ?? null, textResult(`Tool ${String(name)} failed: ${error instanceof Error ? error.message : "unknown error"}`, true))
    };
  }
}

function textResult(text: string, isError = false) {
  return { content: [{ type: "text", text }], ...(isError ? { isError: true } : {}) };
}

/** Parse and dispatch a raw request body into zero or more responses. */
export async function handleMcpPostBody(
  body: string,
  context: { sessionId: string; origin: string; fetcher: typeof fetch }
): Promise<{ status: number; body: Record<string, unknown> | null }> {
  if (!body || body.length > MAX_BODY_BYTES) {
    return { status: 400, body: jsonRpcError(null, ERROR_INVALID_REQUEST, "Missing or oversized JSON-RPC body.") };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { status: 400, body: jsonRpcError(null, -32700, "Invalid JSON.") };
  }

  // Batches were removed in protocol revision 2025-06-18; single messages only.
  return handleMcpMessage(parsed, context);
}
