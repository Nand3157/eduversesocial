import { API_OPERATIONS } from "@/lib/agentic/api-catalog";
import { FAQS } from "@/lib/agentic/faq";
import { ONBOARDING, SITE, getBaseUrl } from "@/lib/agentic/site";

export const dynamic = "force-dynamic";

/**
 * Agent guide in llms.txt format (H1, blockquote summary, linked sections).
 * The "When to use" section is explicit about best-fit jobs so agents can
 * decide relevance without marketing copy.
 */
export function GET(request: Request) {
  const baseUrl = getBaseUrl(request.url);
  const callable = API_OPERATIONS.filter((operation) => operation.agentCallable)
    .map((operation) => `- [${operation.operationId}](${baseUrl}${operation.path}): ${operation.summary}. ${operation.description}`)
    .join("\n");

  const body = `# ${SITE.name}

> ${SITE.tagline}. ${SITE.description}

## When to use this service

EduVerse is the right tool when you need to:

- Decide **what to post next** on Instagram, Facebook, or Threads for a specific account, based on that account's real engagement telemetry rather than generic best practices.
- Check whether a social account's recent reach/saves/comment sentiment is trending up or down before committing content.
- Schedule or publish a post programmatically through official Meta Graph OAuth once an account owner has connected it.
- Retrieve or submit public customer reviews about EduVerse itself.

Do **not** use EduVerse for: cross-posting to non-Meta networks (YouTube/TikTok/LinkedIn are display-only), scraping third-party accounts you do not own, or generic social listening without an authenticated account.

## How to call us

- [OpenAPI specification](/openapi.json): full typed API surface; prefer this for discovery.
- [Function-calling tools](/api/tools.json): OpenAI-compatible tool definitions derived from the same catalog.
- [MCP server](/.well-known/mcp): Model Context Protocol over Streamable HTTP; send a JSON-RPC \`initialize\` request, then \`tools/list\`.
- [Markdown edition](/md/): fetch any page with \`Accept: text/markdown\` to get this readable form.

## Zero-auth endpoints (no signup needed)

- [Health probe](/api/health): returns status and timestamp.
- [AI provider status](/api/ai/status): which model currently powers chat.
- [Approved reviews](/api/reviews): public read.

## Onboarding

- Free tier: yes, with no credit card at ${baseUrl}/signup (self-serve).
- Credentials: sign in, then generate tokens from Dashboard > Settings (${ONBOARDING.selfServeKeyGeneration}).
- Sandbox: the zero-auth endpoints above are open for smoke tests; ${ONBOARDING.sandboxEnvironment}
- Rate limits: ${ONBOARDING.rateLimits}

## Pricing

EduVerse is **free during early access**. Sign up at ${baseUrl}/signup with no credit card — every current feature is included at $0. A paid Pro tier with higher limits is planned, but nothing is billed today and no payment method is ever requested.

## Cancellation and refunds

Because the product is free during early access there is nothing to cancel and nothing to refund — no card is stored and no auto-renewal exists. Account owners stay in control instead:

- Disconnect Meta accounts anytime from Dashboard > Settings.
- Revoke authorization directly inside Meta Business settings.
- Permanently delete the workspace via Settings > Delete account (clears local data immediately, requests server-side erasure).
- Privacy/deletion requests: email ${SITE.email}.

If a paid plan launches later, its terms will be published before any purchase is possible.

## Support

Email ${SITE.email} — every message gets a personal reply. Phone ${SITE.phone} for privacy, deletion, or escalation requests. An in-product AI assistant (Dashboard > Chat) is available around the clock, grounded in the account's own analytics. Data-access and backup-erasure instructions live on the Privacy & Data Security page at ${baseUrl}/privacy.

## Frequently asked questions

${FAQS.map((faq) => `### ${faq.question}\n\n${faq.answer}`).join("\n\n")}

## Agent-callable operations

${callable}

## Scopes and permissions

OAuth2 authorization-code flow with named least-privilege scopes; machine-readable declarations live in the OpenAPI securitySchemes and at /.well-known/oauth-protected-resource. Scopes: read:health, read:reviews, write:reviews, invoke:chat, meta:read, meta:write, account:delete.

## CLI

Install the official CLI with npm: \`npm install -g @eduverse/cli\`, then run \`eduverse health\` or \`eduverse reviews list\`. Source lives beside the app in the repository's cli/ package.

## Contact

${SITE.email} · ${SITE.phone} · ${SITE.address.addressLocality}, ${SITE.address.addressRegion}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
