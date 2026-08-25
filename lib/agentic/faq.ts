import { SITE } from "@/lib/agentic/site";
import { SITE_URL } from "@/lib/site";

/**
 * Canonical answers to the questions AI engines and human visitors ask most.
 * Every surface — landing FAQ section, FAQPage JSON-LD, llms.txt and the
 * markdown edition — renders from this single array so answers never drift.
 * Facts are grounded in actual product behavior: free during early access,
 * no credit card, Meta tokens revocable anytime, self-serve account deletion.
 */
export const FAQS: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "What is EduVerse?",
    answer:
      "EduVerse is a social intelligence platform for Instagram Reels, Facebook Pages, and Threads. It connects through the official Meta Graph API, indexes your real engagement signals — reach, saves, comment sentiment, posting windows — into a persistent audience memory, and recommends exactly what to post and when."
  },
  {
    question: "How much does EduVerse cost?",
    answer:
      "EduVerse is free during early access. Sign up at /signup with no credit card — every current feature (Meta connection, live analytics, audience memory, AI recommendations, publishing) is included at $0. A paid Pro tier with higher limits is planned, but nothing is billed today and no payment method is ever requested."
  },
  {
    question: "What are the cancellation and refund terms?",
    answer:
      "Because EduVerse is free during early access, there is nothing to cancel and no charges to refund — no card is stored and no auto-renewal exists. You stay in control instead: disconnect your Meta accounts from Dashboard > Settings at any time, revoke authorization from Meta's own Business settings, or permanently delete your workspace via Settings > Delete account, which clears local data immediately and requests server-side erasure."
  },
  {
    question: "What kind of customer support is offered?",
    answer:
      `Support is by email at ${SITE.email} — every message gets a personal reply. The phone number ${SITE.phone} is available for privacy, deletion, or escalation requests. Inside the product, an AI assistant is available around the clock in Dashboard > Chat, grounded in your own analytics. Privacy-specific instructions (data access, backup erasure) live on the Privacy & Data Security page.`
  },
  {
    question: "How does EduVerse work?",
    answer:
      "Three steps: (1) Create a free account or preview the read-only sandbox demo first — no login needed. (2) Connect Facebook Pages plus Instagram Business, or Threads, through Meta's official OAuth consent screen; tokens are exchanged server-side, AES-256-GCM encrypted, and scoped to your workspace. (3) EduVerse indexes the returned posts and engagement callbacks into audience memory and surfaces recommendations, charts, and a publishing scheduler grounded in that live data."
  },
  {
    question: "Who is EduVerse for?",
    answer:
      "Creators and small social teams who post regularly on Instagram Reels, Facebook Pages, or Threads and want decisions driven by their real audience behavior instead of generic best practices — especially anyone tired of guessing what to publish next."
  },
  {
    question: "What makes EduVerse different from other social tools?",
    answer:
      "Persistent audience memory: instead of resetting after each session like typical dashboards, EduVerse compounds what it learns from your engagement callbacks, so recommendations sharpen as your audience changes. It is also honest by construction — it shows simulated sandbox data clearly labeled as such and only claims numbers Meta actually returned."
  },
  {
    question: "Is my Meta data safe with EduVerse?",
    answer:
      "Yes. Access uses Meta's official Graph OAuth with least-privilege scopes (pages_show_list and related). Tokens are AES-256-GCM encrypted and row-level isolated per workspace, never displayed in full, and revocable in one click — either from EduVerse Settings or directly inside Meta Business settings. Full details are on the Privacy & Data Security page."
  }
];

/** schema.org FAQPage node for JSON-LD injection, derived from FAQS. */
export function faqPageJsonLd(baseUrl = SITE_URL) {
  return {
    "@type": "FAQPage",
    "@id": `${baseUrl}/#faq`,
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer }
    }))
  };
}
