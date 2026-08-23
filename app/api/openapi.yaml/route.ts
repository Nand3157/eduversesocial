import { buildOpenApiSpec } from "@/lib/agentic/openapi";
import { toYaml } from "@/lib/agentic/yaml";
import { getBaseUrl } from "@/lib/agentic/site";

export const dynamic = "force-dynamic";

/** Same OpenAPI document as /openapi.json, served as YAML per convention. */
export function GET(request: Request) {
  const yaml = toYaml(buildOpenApiSpec(getBaseUrl(request.url)));
  return new Response(yaml, {
    headers: {
      "Content-Type": "application/yaml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      Vary: "Accept, Accept-Encoding"
    }
  });
}
