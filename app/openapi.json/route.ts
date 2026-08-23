import { NextResponse } from "next/server";
import { buildOpenApiSpec } from "@/lib/agentic/openapi";
import { getBaseUrl } from "@/lib/agentic/site";

export const dynamic = "force-dynamic";

/** OpenAPI 3.1 specification — the machine-readable API surface for agents. */
export function GET(request: Request) {
  return NextResponse.json(buildOpenApiSpec(getBaseUrl(request.url)), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      Vary: "Accept, Accept-Encoding"
    }
  });
}
