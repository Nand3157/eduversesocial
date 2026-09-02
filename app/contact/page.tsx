import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";

export const metadata: Metadata = {
  title: "Contact EduVerse",
  description: "Contact EduVerse for product help, privacy requests, deletion requests, and partnership questions."
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main id="main-content" className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Contact EduVerse</p>
        <h1 className="mt-4 max-w-2xl font-heading text-4xl font-medium tracking-tight text-ink sm:text-6xl">A real person is on the other side.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-mutedText">
          Send us a note when something is unclear, a connection needs attention, or you want to understand how we use your data. We read every message and aim to reply within two business days.
        </p>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          <a href="mailto:hello@eduverse.app" className="rounded-2xl border border-borderSoft bg-surface p-5 transition-colors hover:border-primary/40">
            <Mail aria-hidden="true" className="h-5 w-5 text-primary" />
            <h2 className="mt-4 font-heading text-lg font-medium text-ink">General help</h2>
            <p className="mt-2 break-words text-sm leading-6 text-mutedText">hello@eduverse.app</p>
          </a>
          <a href="mailto:privacy@eduverse.app" className="rounded-2xl border border-borderSoft bg-surface p-5 transition-colors hover:border-primary/40">
            <ShieldCheck aria-hidden="true" className="h-5 w-5 text-primary" />
            <h2 className="mt-4 font-heading text-lg font-medium text-ink">Privacy and deletion</h2>
            <p className="mt-2 break-words text-sm leading-6 text-mutedText">privacy@eduverse.app</p>
          </a>
          <a href="mailto:partners@eduverse.app" className="rounded-2xl border border-borderSoft bg-surface p-5 transition-colors hover:border-primary/40">
            <MessageCircle aria-hidden="true" className="h-5 w-5 text-primary" />
            <h2 className="mt-4 font-heading text-lg font-medium text-ink">Partnerships</h2>
            <p className="mt-2 break-words text-sm leading-6 text-mutedText">partners@eduverse.app</p>
          </a>
        </div>

        <section className="mt-14 border-t border-borderSoft pt-10">
          <h2 className="font-heading text-2xl font-medium text-ink">Before you write</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-mutedText">
            <p>For a connection problem, include the platform, the time it happened, and the message you saw. Please do not send passwords, access tokens, or private post exports by email.</p>
            <p>For a privacy request, tell us the account email and what you want removed or reviewed. You can also disconnect Meta accounts and delete your workspace from Dashboard &gt; Settings.</p>
            <p>For API and agent questions, start with the <Link href="/developers" className="font-medium text-primary hover:underline">developer guide</Link>. It lists the public endpoints, OpenAPI file, function-calling tools, and MCP endpoint in one place.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
