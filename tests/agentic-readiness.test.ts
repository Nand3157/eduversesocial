import { describe, expect, it, vi } from "vitest";
import { API_OPERATIONS, getAgentCallableOperations } from "@/lib/agentic/api-catalog";
import {
  MARKDOWN_CONTENT_TYPE,
  VARY_VALUE,
  isMarkdownNegotiable,
  markdownIndex,
  notFoundMarkdown,
  pageMarkdown,
  wantsMarkdown
} from "@/lib/agentic/markdown";
import { handleMcpPostBody, mcpToolDefinitions, MCP_PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS } from "@/lib/agentic/mcp";
import { buildOpenApiSpec } from "@/lib/agentic/openapi";
import { buildOrganizationJsonLd, ONBOARDING, SCOPE_NAMES, SITE } from "@/lib/agentic/site";
import { buildFunctionCallingTools } from "@/lib/agentic/tools";
import { needsQuoting, toYaml } from "@/lib/agentic/yaml";

const BASE = "https://eduverse.example";

describe("markdown content negotiation (#4)", () => {
  it("detects a bare text/markdown Accept header", () => {
    expect(wantsMarkdown("text/markdown")).toBe(true);
    expect(wantsMarkdown("text/markdown; charset=utf-8")).toBe(true);
  });

  it("honors q-values including q=0", () => {
    expect(wantsMarkdown("text/html;q=0.9, text/markdown;q=0.5")).toBe(true);
    expect(wantsMarkdown("text/markdown;q=0")).toBe(false);
  });

  it("does not match wildcard-only or HTML-only headers", () => {
    expect(wantsMarkdown("*/*")).toBe(false);
    expect(wantsMarkdown("text/*")).toBe(false);
    expect(wantsMarkdown("text/html,application/xhtml+xml")).toBe(false);
    expect(wantsMarkdown(null)).toBe(false);
  });

  it("excludes machine routes and extensions from negotiation", () => {
    expect(isMarkdownNegotiable("/")).toBe(true);
    expect(isMarkdownNegotiable("/signup")).toBe(true);
    expect(isMarkdownNegotiable("/md/")).toBe(false);
    expect(isMarkdownNegotiable("/md/signup")).toBe(false);
    expect(isMarkdownNegotiable("/.well-known/mcp")).toBe(false);
    expect(isMarkdownNegotiable("/openapi.json")).toBe(false);
    expect(isMarkdownNegotiable("/icon.svg")).toBe(false);
    expect(isMarkdownNegotiable("/llms.txt")).toBe(false);
  });

  it("renders known pages and a markdown index", () => {
    const home = pageMarkdown("/", BASE);
    expect(home?.title).toContain(SITE.name);
    expect(home?.markdown).toContain(`${BASE}/openapi.json`);
    expect(pageMarkdown("/signup", BASE)).not.toBeNull();
    expect(pageMarkdown("/nope", BASE)).toBeNull();
    expect(markdownIndex(BASE)).toContain("# EduVerse");
  });

  it("builds an agent-recovery 404 body with site-map links", () => {
    const body = notFoundMarkdown("/some-missing-path", BASE);
    expect(body).toContain("404");
    expect(body).toContain("/some-missing-path");
    for (const link of ["/sitemap.xml", "/llms.txt", "/openapi.json", "/.well-known/mcp"]) {
      expect(body).toContain(link);
    }
  });

  it("exports the cache-correct Vary value and content type", () => {
    expect(VARY_VALUE).toBe("Accept, Accept-Encoding");
    expect(MARKDOWN_CONTENT_TYPE).toBe("text/markdown; charset=utf-8");
  });
});

describe("OpenAPI specification (#3, #7)", () => {
  interface RequestBodyDoc {
    content?: Record<string, { schema?: { required?: string[]; properties?: Record<string, { type: string; maximum?: number }> } }>;
  }
  interface OperationDoc {
    operationId: string;
    description: string;
    responses: Record<string, unknown>;
    security: unknown[];
    parameters?: unknown[];
    requestBody?: RequestBodyDoc;
  }
  const spec = buildOpenApiSpec(BASE) as unknown as {
    openapi: string;
    info: { title: string; description: string };
    paths: Record<string, Partial<Record<"get" | "post" | "patch" | "delete", OperationDoc>>>;
    components: {
      securitySchemes: {
        eduverseOAuth: { flows: { authorizationCode: { scopes: Record<string, string> } } };
      };
    };
    "x-scopes-supported": string[];
  };

  it("is OpenAPI 3.1 with server info", () => {
    expect(spec.openapi).toMatch(/^3\.1\./);
    expect(spec.info.title).toContain(SITE.name);
    expect(spec.paths["/api/health"]).toBeTruthy();
  });

  it("gives every operation a unique operationId, summary, description, and responses", () => {
    const ids = new Set<string>();
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (!operation) continue;
        expect(operation.operationId, `${method} ${path}`).toBeTruthy();
        expect(operation.description, operation.operationId).toBeTruthy();
        expect(Object.keys(operation.responses).length, operation.operationId).toBeGreaterThan(0);
        ids.add(operation.operationId);
      }
    }
    expect(ids.size).toBe(API_OPERATIONS.length);
  });

  it("documents typed request bodies matching the catalog examples", () => {
    const createReview = spec.paths["/api/reviews"].post!;
    const requestBody = createReview.requestBody;
    expect(requestBody, "createReview documents a request body").toBeTruthy();
    const schema = requestBody!.content!["application/json"].schema!;
    expect(schema.required).toEqual(expect.arrayContaining(["name", "rating", "content"]));
    expect(schema.properties?.rating?.maximum).toBe(5);
    expect(createReview.parameters ?? []).toHaveLength(0);
  });

  it("declares named OAuth2 scopes in the security scheme (#5)", () => {
    const oauth = spec.components.securitySchemes.eduverseOAuth;
    const declaredScopes = Object.keys(oauth.flows.authorizationCode.scopes);
    expect(declaredScopes.sort()).toEqual([...SCOPE_NAMES].sort());
    expect(spec["x-scopes-supported"].sort()).toEqual([...SCOPE_NAMES].sort());
    expect(declaredScopes.length).toBeGreaterThanOrEqual(5);
  });

  it("applies least-privilege scope requirements per operation", () => {
    expect(spec.paths["/api/health"]!.get!.security).toEqual([]);
    expect(spec.paths["/api/reviews"]!.get!.security).toEqual([]);
    expect(spec.paths["/api/reviews"]!.post!.security).toEqual([{ eduverseOAuth: ["write:reviews"] }]);
    expect(spec.paths["/api/meta/publish"]!.post!.security).toEqual([{ eduverseOAuth: ["meta:write"] }]);
    expect(spec.paths["/api/account/delete"]!.delete!.security).toEqual([{ eduverseOAuth: ["account:delete"] }]);
  });

  it("covers every catalog path/method pair exactly once", () => {
    for (const operation of API_OPERATIONS) {
      const method = operation.method.toLowerCase() as "get" | "post" | "patch" | "delete";
      const item = spec.paths[operation.path];
      expect(item?.[method], `${operation.method} ${operation.path}`).toBeTruthy();
    }
  });

  it("includes onboarding guidance in info.description (#9)", () => {
    const description = spec.info.description;
    expect(description).toContain("When to use");
    expect(description).toContain("/signup");
    expect(description).toContain(ONBOARDING.rateLimits.slice(0, 20));
  });
});

describe("function calling compatibility (#8)", () => {
  const tools = buildFunctionCallingTools(BASE) as Array<{
    type: string;
    function: { name: string; description: string; parameters: { type: string; properties: Record<string, unknown>; required?: string[]; additionalProperties: boolean } };
  }>;

  it("exposes one tool per agent-callable operation with unique names", () => {
    expect(tools.map((tool) => tool.function.name)).toEqual(
      expect.arrayContaining(["getHealth", "listReviews", "createReview"])
    );
    const callableIds = getAgentCallableOperations().map((operation) => operation.operationId);
    expect(tools.map((tool) => tool.function.name).sort()).toEqual([...callableIds].sort());
    expect(new Set(tools.map((tool) => tool.function.name)).size).toBe(tools.length);
  });

  it("uses valid JSON-schema parameter objects", () => {
    for (const tool of tools) {
      expect(tool.type).toBe("function");
      expect(tool.function.parameters.type).toBe("object");
      expect(tool.function.description.length).toBeGreaterThan(20);
    }
    const submit = tools.find((tool) => tool.function.name === "createReview")!;
    expect(submit.function.parameters.required).toEqual(expect.arrayContaining(["name", "rating", "content"]));
  });

  it("never exposes session-scoped operations to direct function calling", () => {
    const names = tools.map((tool) => tool.function.name);
    expect(names).not.toContain("publishPost");
    expect(names).not.toContain("deleteAccount");
    expect(names).not.toContain("sendChatMessage");
  });
});

describe("MCP server handshake (#12)", () => {
  const context = { sessionId: "test-session", origin: BASE, fetcher: vi.fn() as unknown as typeof fetch };

  it("completes initialize with protocol negotiation", async () => {
    const { status, body } = await handleMcpPostBody(
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "ora-audit", version: "1" } } }),
      context
    );
    expect(status).toBe(200);
    const result = body!.result as { protocolVersion: string; capabilities: { tools: unknown }; serverInfo: { name: string } };
    expect(result.protocolVersion).toBe(MCP_PROTOCOL_VERSION);
    expect(result.capabilities.tools).toBeDefined();
    expect(result.serverInfo.name).toBe(SITE.name);
  });

  it("downgrades gracefully when the client requests an unsupported version", async () => {
    const { body } = await handleMcpPostBody(
      JSON.stringify({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "1999-01-01" } }),
      context
    );
    expect(SUPPORTED_PROTOCOL_VERSIONS).toContain((body!.result as { protocolVersion: string }).protocolVersion);
  });

  it("acknowledges notifications/initialized with 202 and no body", async () => {
    const result = await handleMcpPostBody(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }), context);
    expect(result.status).toBe(202);
    expect(result.body).toBeNull();
  });

  it("lists tools over the public surface", async () => {
    const { body } = await handleMcpPostBody(JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/list" }), context);
    const tools = (body!.result as { tools: Array<{ name: string; inputSchema: { type: string } }> }).tools;
    expect(tools.map((tool) => tool.name)).toContain("health_check");
    expect(tools.map((tool) => tool.name)).toContain("submit_review");
    for (const tool of tools) expect(tool.inputSchema.type).toBe("object");
    // Consistent with the static definitions helper.
    expect(mcpToolDefinitions().map((tool) => tool.name).sort()).toEqual(tools.map((tool) => tool.name).sort());
  });

  it("executes tools through the injected fetcher", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ status: "ok" }), { status: 200 })) as unknown as typeof fetch;
    const { body } = await handleMcpPostBody(JSON.stringify({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "health_check", arguments: {} } }), { ...context, fetcher });
    const result = body!.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("ok");
    expect(result.isError).toBeFalsy();
    expect(fetcher).toHaveBeenCalledWith(`${BASE}/api/health`);
  });

  it("returns -32601 for unknown methods and -32700 for invalid JSON", async () => {
    const missing = await handleMcpPostBody(JSON.stringify({ jsonrpc: "2.0", id: 5, method: "resources/list" }), context);
    expect((missing.body!.error as { code: number }).code).toBe(-32601);
    const badJson = await handleMcpPostBody("{not json", context);
    expect((badJson.body!.error as { code: number }).code).toBe(-32700);
  });

  it("rejects non-JSON-RPC payloads", async () => {
    const result = await handleMcpPostBody(JSON.stringify({ hello: true }), context);
    expect((result.body!.error as { code: number }).code).toBe(-32600);
  });
});

describe("organization structured data (#10)", () => {
  it("includes contactPoint with email, phone, and contactType plus a PostalAddress", () => {
    const jsonLd = buildOrganizationJsonLd(BASE) as Record<string, unknown> & {
      contactPoint: Array<{ "@type": string; email: string; telephone: string; contactType: string }>;
      address: { "@type": string; streetAddress: string; addressLocality: string; addressRegion: string; postalCode: string; addressCountry: string };
    };
    expect(jsonLd["@type"]).toBe("Organization");
    expect(jsonLd.contactPoint[0].email).toBe(SITE.email);
    expect(jsonLd.contactPoint[0].telephone).toBe(SITE.phone);
    expect(jsonLd.contactPoint[0].contactType).toBeTruthy();
    expect(jsonLd.address["@type"]).toBe("PostalAddress");
    for (const field of ["streetAddress", "addressLocality", "addressRegion", "postalCode", "addressCountry"]) {
      expect(String(jsonLd.address[field as keyof typeof jsonLd.address])).toBeTruthy();
    }
  });
});

describe("YAML emitter used by /api/openapi.yaml", () => {
  it("quotes scalars that would parse as other types", () => {
    expect(needsQuoting("200")).toBe(true);
    expect(needsQuoting("true")).toBe(true);
    expect(needsQuoting("2026-08-25T15:00:00Z")).toBe(true);
    expect(needsQuoting("GET")).toBe(false);
    expect(needsQuoting("read:analytics")).toBe(false);
    expect(needsQuoting("Contains: colon")).toBe(true);
  });

  it("emits maps, sequences, and nested structures in block style", () => {
    const yaml = toYaml({
      openapi: "3.1.0",
      empty: {},
      list: [],
      tags: [{ name: "System", description: "Zero-auth probes." }, "plain"],
      info: { title: "EduVerse HTTP API", version: "1.0.0" },
      responses: { "200": { description: "OK" } }
    });
    // "3.1.0" is not a valid YAML number, so it stays an (unquoted) string.
    expect(yaml).toContain("openapi: 3.1.0\n");
    expect(yaml).toContain("empty: {}\n");
    expect(yaml).toContain("list: []\n");
    expect(yaml).toContain("- name: System\n");
    expect(yaml).toContain("  description: Zero-auth probes.\n");
    expect(yaml).toContain("- plain\n");
    expect(yaml).toContain('responses:\n  "200":\n    description: OK\n');
    expect(yaml.endsWith("\n")).toBe(true);
  });

  it("serializes the full OpenAPI document without crashing", () => {
    const yaml = toYaml(buildOpenApiSpec(BASE));
    expect(yaml).toContain("operationId: getHealth");
    expect(yaml).toContain("eduverseOAuth:");
  });
});
