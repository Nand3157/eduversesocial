import { buildFunctionCallingTools } from "@/lib/agentic/tools";
import { getBaseUrl } from "@/lib/agentic/site";

export const dynamic = "force-dynamic";

/**
 * LLM function-calling definitions for every agent-callable endpoint, derived
 * from the same catalog as /openapi.json.
 */
export function GET(request: Request) {
  const baseUrl = getBaseUrl(request.url);
  return Response.json(
    {
      format: "openai.function-calling.v1",
      spec: `${baseUrl}/openapi.json`,
      guide: `${baseUrl}/llms.txt`,
      tools: buildFunctionCallingTools(baseUrl)
    },
    { headers: { "Cache-Control": "public, max-age=3600", Vary: "Accept, Accept-Encoding" } }
  );
}
