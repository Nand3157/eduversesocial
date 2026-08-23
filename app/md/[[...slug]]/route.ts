import { MARKDOWN_CONTENT_TYPE, VARY_VALUE, markdownIndex, notFoundMarkdown, pageMarkdown } from "@/lib/agentic/markdown";
import { getBaseUrl } from "@/lib/agentic/site";

export const dynamic = "force-dynamic";

/**
 * Markdown edition of the site. proxy.ts rewrites any request carrying
 * `Accept: text/markdown` to this handler, and agents can also fetch pages
 * directly under /md/<path>. Unknown paths return a real HTTP 404 whose body
 * is markdown with recovery links.
 */
export async function GET(request: Request, context: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await context.params;
  const baseUrl = getBaseUrl(request.url);
  const path = (slug ?? []).join("/");

  const headers = {
    "Content-Type": MARKDOWN_CONTENT_TYPE,
    Vary: VARY_VALUE,
    "Cache-Control": "public, max-age=600"
  };

  if (path === "") {
    return new Response(markdownIndex(baseUrl), { status: 200, headers });
  }

  const page = pageMarkdown(path, baseUrl);
  if (!page) {
    return new Response(notFoundMarkdown(`/${path}`, baseUrl), { status: 404, headers });
  }
  return new Response(page.markdown, { status: 200, headers });
}
