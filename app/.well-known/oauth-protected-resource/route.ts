import { NextResponse } from "next/server";
import { API_SCOPES, getBaseUrl } from "@/lib/agentic/site";

export const dynamic = "force-dynamic";

/**
 * RFC 9728 protected-resource metadata so agents can discover the named
 * OAuth scopes they may request before touching protected endpoints.
 */
export function GET(request: Request) {
  const baseUrl = getBaseUrl(request.url);
  return NextResponse.json(
    {
      resource: `${baseUrl}/`,
      resource_documentation: `${baseUrl}/llms.txt`,
      authorization_servers: [baseUrl],
      scopes_supported: Object.keys(API_SCOPES),
      bearer_methods_supported: ["header"],
      resource_signing_alg_values_supported: ["RS256"],
      service_documentation: `${baseUrl}/openapi.json`
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
        Vary: "Accept, Accept-Encoding"
      }
    }
  );
}
