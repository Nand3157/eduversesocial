/**
 * Content negotiation for agents: parse Accept headers, render known pages as
 * markdown, and build recovery-oriented 404 bodies.
 */

export const VARY_VALUE = "Accept, Accept-Encoding";
export const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";

/**
 * Paths eligible for markdown content negotiation. Excludes the markdown
 * route itself (loop guard), machine endpoints that are not HTML documents,
 * and anything with a file extension (assets, .txt, .xml).
 */
export function isMarkdownNegotiable(pathname: string): boolean {
  if (pathname === "/md" || pathname === "/md/" || pathname.startsWith("/md/")) return false;
  if (pathname.startsWith("/.well-known") || pathname.startsWith("/openapi.json")) return false;
  return !/\.[a-z0-9]+$/i.test(pathname);
}

/**
 * True when the client explicitly asks for markdown. Uses q-values; anything
 * with q=0 means "do not send". A bare `Accept: text/markdown` (the common
 * agent form) matches.
 */
export function wantsMarkdown(acceptHeader: string | null | undefined): boolean {
  if (!acceptHeader) return false;
  for (const part of acceptHeader.split(",")) {
    const [rawType, ...params] = part.trim().split(";");
    if (!rawType || rawType.trim() === "*/*" || rawType.trim() === "text/*") continue;
    const type = rawType.trim().toLowerCase();
    if (type !== "text/markdown" && type !== "text/x-markdown") continue;
    let quality = 1;
    for (const param of params) {
      const [key, value] = param.split("=").map((side) => side?.trim());
      if (key === "q") {
        const parsed = Number.parseFloat(value ?? "1");
        quality = Number.isNaN(parsed) ? 1 : parsed;
      }
    }
    if (quality > 0) return true;
  }
  return false;
}

function mdLink(label: string, href: string): string {
  return `- [${label}](${href})`;
}

/** Site map shown to agents on every markdown page and in the 404 body. */
export function siteMapMarkdown(baseUrl: string): string[] {
  return [
    "## Site map",
    "",
    mdLink("Home (product overview)", `${baseUrl}/`),
    mdLink("Sign up (free tier, self-serve)", `${baseUrl}/signup`),
    mdLink("Dashboard", `${baseUrl}/dashboard`),
    mdLink("OpenAPI specification (JSON)", `${baseUrl}/openapi.json`),
    mdLink("Function-calling tool definitions", `${baseUrl}/api/tools.json`),
    mdLink("Agent guide (llms.txt)", `${baseUrl}/llms.txt`),
    mdLink("MCP server (Streamable HTTP)", `${baseUrl}/.well-known/mcp`),
    mdLink("OAuth protected-resource metadata (RFC 9728)", `${baseUrl}/.well-known/oauth-protected-resource`),
    mdLink("XML sitemap", `${baseUrl}/sitemap.xml`)
  ];
}

const PAGE_TITLES: Record<string, { title: string; body: string[] }> = {
  "/": {
    title: "EduVerse — Social intelligence that remembers your audience",
    body: [
      "EduVerse connects Instagram Reels, Facebook Pages, and Threads engagement callbacks into a persistent audience memory, then shows you exactly what to post and when.",
      "## How it works",
      "1. Connect a Meta account once via official Graph OAuth.",
      "2. Real signals — reach, saves, comment sentiment, posting windows — appear in the dashboard.",
      "3. The assistant recommends what to publish next, grounded in live telemetry.",
      "## Best-fit use cases",
      "- Deciding what content to post next on Instagram, Facebook, or Threads.",
      "- Turning raw engagement callbacks into a durable audience memory."
    ]
  },
  "/signup": {
    title: "Create an EduVerse account",
    body: ["Self-serve signup, free tier, no credit card. After signing in you can connect a Meta account and generate API credentials from the dashboard settings."]
  },
  "/login": {
    title: "Sign in to EduVerse",
    body: ["Existing accounts sign in here. Agents should use the API endpoints listed in the OpenAPI spec instead of scraping this page."]
  },
  "/dashboard": {
    title: "EduVerse dashboard",
    body: ["The dashboard requires an authenticated session. Machine access goes through the HTTP API documented at /openapi.json."]
  }
};

/** Render a known page path as markdown; null when unknown. */
export function pageMarkdown(path: string, baseUrl: string): { title: string; markdown: string } | null {
  const normalized = path === "/" || path === "" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}`;
  const page = PAGE_TITLES[normalized];
  if (!page) return null;
  const lines = [`# ${page.title}`, "", ...page.body, ""];
  return { title: page.title, markdown: [...lines, ...siteMapMarkdown(baseUrl)].join("\n") };
}

/** Markdown index served at /md/ describing every negotiable page. */
export function markdownIndex(baseUrl: string): string {
  return [
    "# EduVerse — markdown edition",
    "",
    "Request any page below with `Accept: text/markdown` (or fetch it directly under `/md`).",
    "",
    ...Object.entries(PAGE_TITLES).map(([path, page]) => mdLink(page.title, `${baseUrl}/md${path === "/" ? "/" : path}`)),
    "",
    ...siteMapMarkdown(baseUrl)
  ].join("\n");
}

/** Agent-recovery 404 body with a short site map and where-to-look-next links. */
export function notFoundMarkdown(path: string, baseUrl: string): string {
  return [
    "# 404 — Not found",
    "",
    `\`${path}\` does not exist on EduVerse.`,
    "",
    ...siteMapMarkdown(baseUrl),
    "",
    "## Where to look next",
    "",
    "- Start from the llms.txt agent guide for capabilities and auth.",
    "- Use /openapi.json to discover the HTTP API surface programmatically.",
    "- Ask for any HTML page with `Accept: text/markdown` to get this readable form."
  ].join("\n");
}
