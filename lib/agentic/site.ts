/**
 * Single source of truth for machine-readable site identity: organization
 * details, API scopes, onboarding signals. Every agent-facing artifact
 * (JSON-LD, OpenAPI, llms.txt, RFC 9728 metadata) is generated from here so
 * they can never drift apart.
 */
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const SITE = {
  name: SITE_NAME,
  legalName: "EduVerse, Inc.",
  description: SITE_DESCRIPTION,
  tagline: "Social intelligence that remembers your audience",
  email: "hello@eduverse.app",
  phone: "+1-555-012-3456",
  address: {
    streetAddress: "548 Market Street, Suite 41220",
    addressLocality: "San Francisco",
    addressRegion: "CA",
    postalCode: "94104",
    addressCountry: "US"
  },
  sameAs: ["https://github.com/Nand3157/eduversesocial", "https://x.com/eduverseapp"],
  contactPointType: "customer support"
} as const;

/** Named OAuth 2.0 scopes agents can request for least-privilege access. */
export const API_SCOPES = {
  "read:health": "Check service health and deployment status without authentication-sensitive data.",
  "read:reviews": "Read approved public customer reviews.",
  "write:reviews": "Submit new customer reviews (published immediately).",
  "invoke:chat": "Send messages to the EduVerse audience-intelligence chat assistant.",
  "meta:read": "Read connected Meta account analytics, insights, and scheduling state.",
  "meta:write": "Connect Meta accounts, upload media, and publish or schedule posts.",
  "account:delete": "Permanently delete the authenticated account and its data."
} as const satisfies Record<string, string>;

export type ApiScope = keyof typeof API_SCOPES;

export const SCOPE_NAMES = Object.keys(API_SCOPES) as ApiScope[];

export const ONBOARDING = {
  freeTier: true,
  selfServeSignup: "/signup",
  selfServeKeyGeneration: "Self-serve API keys are not live yet. Protected operations use the signed-in EduVerse session.",
  sandboxEnvironment:
    "Try /demo for a read-only sandbox dashboard with simulated Meta analytics — no login or OAuth required. Public read-only endpoints (/api/v1/health, GET /api/v1/reviews) are also open without credentials for smoke tests.",
  zeroAuthEndpoints: ["/demo", "/privacy", "/about", "/contact", "/developers", "/api/v1/health", "/api/v1/reviews (GET)", "/openapi.json", "/llms.txt", "/.well-known/mcp"],
  rateLimits: "Public review submissions: 5 per minute per client. Chat: metered per session. Health: unmetered."
} as const;

export function getBaseUrl(requestUrl?: string): string {
  if (requestUrl) {
    try {
      return new URL(requestUrl).origin;
    } catch {
      // fall through to the resolved deployment URL
    }
  }
  // SITE_URL resolves NEXT_PUBLIC_SITE_URL, then Vercel deployment vars.
  return SITE_URL;
}

export function buildOrganizationJsonLd(baseUrl = getBaseUrl()) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    legalName: SITE.legalName,
    url: baseUrl,
    logo: `${baseUrl}/icon-512.png`,
    description: SITE.description,
    email: SITE.email,
    telephone: SITE.phone,
    sameAs: [...SITE.sameAs],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: SITE.contactPointType,
        email: SITE.email,
        telephone: SITE.phone,
        availableLanguage: ["English"]
      }
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.streetAddress,
      addressLocality: SITE.address.addressLocality,
      addressRegion: SITE.address.addressRegion,
      postalCode: SITE.address.postalCode,
      addressCountry: SITE.address.addressCountry
    }
  };
}
