import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Braces, CheckCircle2, Terminal } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";

export const metadata: Metadata = {
  title: "EduVerse developer resources",
  description: "Simple, machine-readable ways to explore EduVerse: OpenAPI, function-calling tools, MCP, markdown, and public API health checks."
};

const resources = [
  ["OpenAPI JSON", "/openapi.json", "Typed HTTP operations, request shapes, responses, scopes, and versioning policy."],
  ["OpenAPI YAML", "/api/openapi.yaml", "The same API description in YAML for tooling that prefers it."],
  ["Function-calling tools", "/api/tools.json", "OpenAI-compatible tool definitions for the public, zero-auth operations."],
  ["MCP endpoint", "/.well-known/mcp", "Streamable HTTP JSON-RPC endpoint with health, reviews, and catalog tools."],
  ["Agent guide", "/llms.txt", "Plain-language instructions for agents choosing the right EduVerse surface."],
  ["Markdown pages", "/md/", "Readable versions of public pages; also request HTML routes with Accept: text/markdown."]
] as const;

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main id="main-content" className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">EduVerse developers</p>
        <h1 className="mt-4 max-w-3xl font-heading text-4xl font-medium tracking-tight text-ink sm:text-6xl">Start with a clear, small surface.</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-mutedText">
          EduVerse gives agents a few stable ways to inspect the service before they ask a person to connect an account. Health, AI status, and approved reviews are public. Meta analytics, publishing, chat, and account actions require the signed-in browser session that owns the workspace.
        </p>

        <section className="mt-14" aria-labelledby="resources-heading">
          <h2 id="resources-heading" className="font-heading text-2xl font-medium text-ink">Machine-readable resources</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map(([label, href, description]) => (
              <a key={href} href={href} className="group rounded-2xl border border-borderSoft bg-surface p-5 transition-colors hover:border-primary/40">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink">{label}</span>
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <p className="mt-2 text-sm leading-6 text-mutedText">{description}</p>
                <code className="mt-4 block break-all text-[11px] text-faintText">{href}</code>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-8 border-t border-borderSoft pt-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="font-heading text-2xl font-medium text-ink">First request</h2>
            <p className="mt-4 text-sm leading-7 text-mutedText">Use the versioned health endpoint for a quick smoke test. It returns JSON, stable error codes, and standard rate-limit headers.</p>
            <div className="mt-5 flex items-center gap-2 text-sm text-success"><CheckCircle2 aria-hidden="true" className="h-4 w-4" /> No account needed</div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-borderSoft bg-surface">
            <div className="flex items-center gap-2 border-b border-borderSoft px-4 py-3 text-xs text-mutedText"><Terminal aria-hidden="true" className="h-4 w-4 text-primary" /> curl</div>
            <pre className="overflow-x-auto p-4 text-xs leading-6 text-ink"><code>curl https://eduversesocial.vercel.app/api/v1/health</code></pre>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-primary/20 bg-accent-soft p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Braces aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h2 className="font-heading text-xl font-medium text-ink">Authentication note</h2>
              <p className="mt-2 text-sm leading-7 text-mutedText">The public API currently exposes read-only discovery endpoints without credentials. Protected operations use the EduVerse Supabase session inside the app. A separate OAuth authorization server and self-serve API keys are not live yet; we will publish them here before asking agents to depend on them.</p>
              <Link href="/contact" className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">Ask about access</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
