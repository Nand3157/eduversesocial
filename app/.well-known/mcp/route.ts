import { handleMcpPostBody } from "@/lib/agentic/mcp";
import { VARY_VALUE } from "@/lib/agentic/markdown";
import { problemResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * MCP (Model Context Protocol) endpoint over Streamable HTTP. Agents perform
 * the live handshake here: POST an `initialize` JSON-RPC request, then
 * `tools/list` and `tools/call`.
 */
export async function POST(request: Request) {
  const sessionId = request.headers.get("mcp-session-id") ?? crypto.randomUUID();
  const origin = new URL(request.url).origin;
  const result = await handleMcpPostBody(await request.text(), {
    sessionId,
    origin,
    fetcher: (input, init) => fetch(input, { ...init, cache: "no-store" })
  });

  const headers: Record<string, string> = {
    Vary: VARY_VALUE,
    "Mcp-Session-Id": sessionId,
    "MCP-Protocol-Version": "2025-06-18"
  };

  if (!result.body) return new Response(null, { status: 202, headers });
  return Response.json(result.body, { status: result.status, headers });
}

const METHOD_NOT_ALLOWED = (request: Request, allow: string) => {
  const response = problemResponse(405, "MCP_METHOD_NOT_ALLOWED", `Method not allowed; use ${allow}.`, "Send a JSON-RPC request with POST.", request);
  response.headers.set("Allow", allow);
  return response;
};

/** Server-initiated SSE streams are not offered; advertise POST-only. */
export function GET(request: Request) {
  return METHOD_NOT_ALLOWED(request, "POST");
}

export function DELETE(request: Request) {
  return METHOD_NOT_ALLOWED(request, "POST");
}
