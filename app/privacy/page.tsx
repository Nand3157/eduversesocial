import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock3, Database, Eye, KeyRound, Lock, Mail, ShieldCheck, Trash2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/agentic/site";

export const metadata: Metadata = {
  title: "Privacy Policy & Data Security",
  description:
    "How EduVerse handles your Meta Graph data: permissions requested, how tokens are encrypted and stored, retention, revocation, and your rights.",
};

const lastUpdated = "August 13, 2026";

function Section({ icon: Icon, title, children, id }: { icon: React.ElementType; title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="flex items-center gap-2.5 font-heading text-xl font-medium tracking-tight text-ink">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-primary">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-7 text-mutedText">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-borderSoft bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-background">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-ink">
              Edu<em className="font-normal text-primary">Verse</em>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/demo">
              <Button size="sm" variant="secondary">
                <Eye className="h-3.5 w-3.5" /> Explore demo
              </Button>
            </Link>
            <Link href="/">
              <Button size="sm" variant="ghost">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to site
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <Lock className="h-3 w-3" /> Privacy & Data Security
          </p>
          <h1 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Your data, <em className="italic text-primary">handled with care</em>.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-mutedText">
            EduVerse connects to Instagram, Facebook Pages, and Threads through the official Meta Graph API. This page explains what we
            access, how tokens are protected, and how you stay in control.
          </p>
          <p className="mt-2 text-xs text-faintText">Last updated: {lastUpdated} · Contact: {SITE.email}</p>

          <Card className="mt-8 border-primary/20 bg-accent-soft/40">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-ink">TL;DR — the 30-second version</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-mutedText">
                <li>OAuth happens on Meta&apos;s screen — EduVerse never sees your Meta password.</li>
                <li>Access tokens are encrypted with AES-256-GCM and are scoped to your workspace via Supabase RLS.</li>
                <li>You can disconnect or revoke anytime from Settings or from Meta → Business integrations.</li>
                <li>We never sell data and only call the Graph API your token authorizes.</li>
                <li>
                  Try the <Link href="/demo" className="font-medium text-primary hover:underline">sandbox demo</Link> to preview without OAuth.
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="mt-10 grid gap-10">
            <Section icon={Eye} title="What we access & why" id="access">
              <p>
                When you click <strong className="font-semibold text-ink">Connect Facebook & Instagram</strong> or{" "}
                <strong className="font-semibold text-ink">Connect Threads</strong>, you are sent to Meta&apos;s consent screen. Meta shows
                exactly which permissions EduVerse is requesting — you must approve before any token is issued.
              </p>
              <div className="grid gap-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Facebook + Instagram (one flow)</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs leading-6 text-mutedText">
                    Scopes: <code className="rounded bg-surface px-1.5 py-0.5">public_profile</code>{" "}
                    <code className="rounded bg-surface px-1.5 py-0.5">pages_show_list</code>{" "}
                    <code className="rounded bg-surface px-1.5 py-0.5">pages_read_engagement</code>{" "}
                    <code className="rounded bg-surface px-1.5 py-0.5">pages_manage_posts</code>{" "}
                    <code className="rounded bg-surface px-1.5 py-0.5">instagram_basic</code>{" "}
                    <code className="rounded bg-surface px-1.5 py-0.5">instagram_content_publish</code>{" "}
                    <code className="rounded bg-surface px-1.5 py-0.5">instagram_manage_insights</code>
                    <p className="mt-2">
                      Used to: list your Facebook Pages, link Instagram Business accounts attached to those Pages, read post insights
                      (reach, engagement, saves), and — only if you click Publish — create scheduled or immediate posts on your behalf.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Threads</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs leading-6 text-mutedText">
                    Scopes: <code className="rounded bg-surface px-1.5 py-0.5">threads_basic</code>{" "}
                    <code className="rounded bg-surface px-1.5 py-0.5">threads_content_publish</code>{" "}
                    <code className="rounded bg-surface px-1.5 py-0.5">threads_manage_insights</code>
                    <p className="mt-2">Used to: show your Threads profile, read Threads insights, and publish threads you approve.</p>
                  </CardContent>
                </Card>
              </div>
              <p>
                We do <strong className="font-semibold text-ink">not</strong> request passwords, private messages, or permissions beyond those
                listed. If Meta adds a permission, it appears explicitly on the consent screen before it is granted.
              </p>
              <p className="rounded-xl border border-borderSoft bg-surface px-4 py-3 text-xs">
                <strong className="text-ink">Sandbox alternative:</strong> Not ready to connect? Use{" "}
                <Link href="/demo" className="font-medium text-primary hover:underline">
                  Explore Live Demo
                </Link>{" "}
                — a read-only mock dashboard with simulated data. No OAuth, no tokens stored.
              </p>
            </Section>

            <Section icon={KeyRound} title="How tokens are protected" id="tokens">
              <p>
                After you approve on Meta, Meta redirects back with a short-lived code. EduVerse exchanges that code server-side for a
                long-lived (60-day) User Access Token, then immediately enumerates your Pages and linked Instagram Business accounts. Only
                the resulting <strong className="font-semibold text-ink">page-scoped tokens</strong> are retained.
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="font-semibold text-ink">Encryption at rest — AES-256-GCM</strong> with a random 12-byte IV and auth
                  tag. Stored as <code className="rounded bg-surface px-1.5 py-0.5">iv.tag.ciphertext</code> (base64url). Key material is
                  derived via <code className="rounded bg-surface px-1.5 py-0.5">SHA-256(ENCRYPTION_KEY)</code> and never leaves the server.
                </li>
                <li>
                  <strong className="font-semibold text-ink">Transport</strong> — tokens travel only in{" "}
                  <code className="rounded bg-surface px-1.5 py-0.5">Authorization: Bearer …</code> headers over HTTPS. They are never placed
                  in URLs or logged (see CSP & logging practices below).
                </li>
                <li>
                  <strong className="font-semibold text-ink">Scope isolation</strong> — every row in{" "}
                  <code className="rounded bg-surface px-1.5 py-0.5">social_accounts</code> is gated by Supabase Row-Level Security
                  (RLS) via <code className="rounded bg-surface px-1.5 py-0.5">is_workspace_member(workspace_id)</code>. One workspace
                  cannot read another&apos;s tokens.
                </li>
                <li>
                  <strong className="font-semibold text-ink">CSRF & state</strong> — OAuth state is stored in an HttpOnly, SameSite=Lax
                  cookie (1,800s for Facebook/Instagram, 600s for Threads) and verified on callback. Mismatched state is rejected.
                </li>
              </ul>
              <p className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-xs leading-relaxed">
                <strong className="text-success">Security posture:</strong> Nonce-based CSP in production (
                <code className="rounded bg-white/60 px-1 py-0.5">script-src &apos;nonce-…&apos; &apos;strict-dynamic&apos;</code>),
                HSTS 2 years, X-Frame-Options DENY, COOP/COEP, and a minimal Permissions-Policy. Media URLs for publishing are validated
                to be public HTTPS (localhost/private IPs are rejected).
              </p>
            </Section>

            <Section icon={Database} title="What we store & where" id="storage">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="font-semibold text-ink">social_accounts</strong> — workspace_id, platform, external_id, display_name /
                  username, avatar_url, encrypted_token (nullable on disconnect), token_expires_at, status, parent_account_id (links
                  Instagram → Page).
                </li>
                <li>
                  <strong className="font-semibold text-ink">analytics_cache</strong> — today&apos;s aggregated Graph insights per{" "}
                  <code className="rounded bg-surface px-1.5 py-0.5">(social_account_id, metric_date)</code>, cached for one day and
                  refreshable via <code className="rounded bg-surface px-1.5 py-0.5">?refresh=1</code>. Only successful, non-error snapshots
                  are cached.
                </li>
                <li>
                  <strong className="font-semibold text-ink">scheduled_posts / publishing_attempts</strong> — captions, media URLs, and
                  publish status (idempotent by key{" "}
                  <code className="rounded bg-surface px-1.5 py-0.5">user:platform:externalId:ISO:caption</code>). Retried at most 4
                  times with jittered backoff.
                </li>
                <li>
                  <strong className="font-semibold text-ink">profiles / workspaces / workspace_members</strong> — your display name, role,
                  and bio.
                </li>
              </ul>
              <p>
                All tables are protected by RLS. Data is stored in Supabase Postgres; uploaded media for publishing goes to the{" "}
                <code className="rounded bg-surface px-1.5 py-0.5">post-media</code> Storage bucket (public read, owner-scoped write:{" "}
                <code className="rounded bg-surface px-1.5 py-0.5">foldername(name)[1] = auth.uid()</code>).
              </p>
            </Section>

            <Section icon={Clock3} title="Retention & expiry" id="retention">
              <ul className="list-disc space-y-2 pl-5">
                <li>Page tokens expire after 60 days. EduVerse flags them as “Token expiring soon” 7 days before expiry and “Expired” after.</li>
                <li>Analytics cache is per-day; yesterday&apos;s rows remain readable until superseded but are never used to fabricate metrics.</li>
                <li>Scheduled posts remain until published/cancelled, then archived with attempts for audit.</li>
              </ul>
            </Section>

            <Section icon={Trash2} title="Revocation & deletion" id="revocation">
              <p>You are in control at every layer:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="border-borderSoft bg-surface/60">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-ink">Inside EduVerse</p>
                    <p className="mt-1 text-xs leading-6 text-mutedText">
                      Settings → Connected accounts → <em>Disconnect</em> wipes the encrypted token for that account. Dashboard → Settings →
                      Delete account clears local workspace state and attempts a server-side deletion.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-borderSoft bg-surface/60">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-ink">On Meta</p>
                    <p className="mt-1 text-xs leading-6 text-mutedText">
                      Facebook → Settings → Business integrations (or Instagram → Apps and websites) → Remove EduVerse. This revokes the
                      grant; the next Graph call fails and EduVerse marks the account expired/disconnected.
                    </p>
                  </CardContent>
                </Card>
              </div>
              <p>
                For full erasure (GDPR Art. 17), disconnect first, then email{" "}
                <a href={`mailto:${SITE.email}`} className="font-medium text-primary hover:underline">
                  {SITE.email}
                </a>{" "}
                with your workspace email. We delete workspace rows, storage objects, and revoke any lingering tokens. Backups age out
                within 30 days.
              </p>
            </Section>

            <Section icon={Users} title="What we do not do" id="not-do">
              <ul className="list-disc space-y-1 pl-5">
                <li>We do not sell, rent, or share your Meta data with third parties.</li>
                <li>We do not post without your explicit Publish / Schedule action.</li>
                <li>We do not log raw tokens or place them in URLs, analytics, or error reports.</li>
                <li>We do not invent metrics when Meta returns none — the dashboard shows an explicit empty state.</li>
              </ul>
            </Section>

            <Section icon={Mail} title="Contact & rights" id="contact">
              <p>
                Questions, access/export requests, or deletion:{" "}
                <a href={`mailto:${SITE.email}`} className="font-medium text-primary hover:underline">
                  {SITE.email}
                </a>{" "}
                · {SITE.phone}
              </p>
              <p>
                Address: {SITE.address.streetAddress}, {SITE.address.addressLocality}, {SITE.address.addressRegion}{" "}
                {SITE.address.postalCode}, {SITE.address.addressCountry}.
              </p>
              <p className="text-xs text-faintText">
                This notice supplements our Terms. Meta&apos;s own Data Policy and Platform Terms also apply when you authorize access.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Link href="/signup">
                  <Button size="sm" className="bg-ink text-background hover:bg-ink/90">
                    Create account
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="sm" variant="secondary">
                    Try sandbox demo first
                  </Button>
                </Link>
              </div>
            </Section>

            <Card className="border-borderSoft bg-surface/50">
              <CardContent className="p-5 text-xs leading-6 text-mutedText">
                <p className="font-semibold text-ink">Version history</p>
                <p>
                  {lastUpdated} — Added sandbox demo clarification and explicit encryption/RLS wording. Previous versions available on
                  request at {SITE.email}.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
