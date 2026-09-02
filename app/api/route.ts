import { NextResponse } from "next/server";
import { getBaseUrl, SITE } from "@/lib/agentic/site";

export const dynamic = "force-dynamic";

/** Small API index so an agent can start at /api and find the real surface. */
export function GET(request: Request) {
  const baseUrl = getBaseUrl(request.url);
  return NextResponse.json(
    {
      name: SITE.name,
      description: SITE.description,
      version: "v1",
      documentation: `${baseUrl}/developers`,
      openapi: `${baseUrl}/openapi.json`,
      agentGuide: `${baseUrl}/llms.txt`,
      functionCalling: `${baseUrl}/api/tools.json`,
      mcp: `${baseUrl}/.well-known/mcp`,
      publicEndpoints: [`${baseUrl}/api/v1/health`, `${baseUrl}/api/v1/reviews`]
    },
    { headers: { "Cache-Control": "public, max-age=3600", Vary: "Accept, Accept-Encoding" } }
  );
}
