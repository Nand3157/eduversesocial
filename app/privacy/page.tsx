import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Bot, Clock3, Database, Eye, FileText, KeyRound, Lock, Mail, Share2, ShieldCheck, Sparkles, Trash2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { SITE } from "@/lib/agentic/site";

export const metadata: Metadata = {
  title: "Privacy Policy & Data Security",
  description:
    "How EduVerse collects user data, uses AI (Google Gemini), and shares data with third parties (Supabase, Meta, Google, Vercel): permissions requested, how tokens are encrypted and stored, retention, revocation, and your rights.",
};

const lastUpdated = "August 31, 2026";

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
            <Button asChild size="sm" variant="secondary">
              <Link href="/demo">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Explore demo
              </Link>
            </Button>
            <ThemeToggle />
            <Button asChild size="sm" variant="ghost">
              <Link href="/">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to site
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
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
                <li>
                  <strong className="text-ink">We collect user data</strong> you provide (account, workspace, chat messages & images, posts, media)
                  and data from Meta when you connect.
                </li>
                <li>
                  <strong className="text-ink">We use AI</strong> — every chat message and a live analytics snapshot is sent to Google
                  Gemini ({process.env.GEMINI_MODEL || "gemini-3.5-flash"}) to generate answers. No training on your data without consent.
                </li>
                <li>
                  <strong className="text-ink">We share data with third parties only when needed:</strong> Supabase (database/auth/storage),
                  Meta (Graph API), Google (Gemini), Vercel (hosting), and Upstash Redis (rate limiting, if configured).
                </li>
                <li>OAuth happens on Meta&apos;s screen — EduVerse never sees your Meta password.</li>
                <li>Access tokens are encrypted with AES-256-GCM and scoped to your workspace via Supabase RLS.</li>
                <li>You can disconnect or revoke anytime from Settings or from Meta → Business integrations.</li>
                <li>We never sell data. See full details below.</li>
                <li>
                  Try the <Link href="/demo" className="font-medium text-primary hover:underline">sandbox demo</Link> to preview without OAuth.
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="mt-10 grid gap-10">
            <Section icon={FileText} title="Data we collect — what user data we collect" id="collect">
              <p>
                <strong className="font-semibold text-ink">We collect user data</strong> in three categories. We only collect what is needed to
                run EduVerse and we never sell it.
              </p>
              <div className="grid gap-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">1. Information you provide directly</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs leading-6 text-mutedText">
                    <ul className="list-disc space-y-1 pl-4">
                      <li>
                        <strong className="text-ink">Account:</strong> email, display name, avatar URL, role, bio — from sign-up and your
                        profile.
                      </li>
                      <li>
                        <strong className="text-ink">Workspace content:</strong> workspace name/slug, posts and captions you draft, scheduled
                        posts, media files you upload to the <code className="rounded bg-surface px-1 py-0.5">post-media</code> bucket, reviews
                        you submit.
                      </li>
                      <li>
                        <strong className="text-ink">Chat & memory:</strong> every message and optional image you send to Dashboard &gt; Chat,
                        stored as <code className="rounded bg-surface px-1 py-0.5">chat_conversations</code> /{" "}
                        <code className="rounded bg-surface px-1 py-0.5">chat_messages</code>, plus memory entries you save.
                      </li>
                      <li>
                        <strong className="text-ink">Support:</strong> messages you send to {SITE.email} and phone inquiries to {SITE.phone}.
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">2. Information collected automatically</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs leading-6 text-mutedText">
                    <ul className="list-disc space-y-1 pl-4">
                      <li>
                        <strong className="text-ink">Usage & device:</strong> IP address (for rate limiting via{" "}
                        <code className="rounded bg-surface px-1 py-0.5">x-forwarded-for</code>), browser, requested routes, and timestamps —
                        used only for security and rate limits (<code className="rounded bg-surface px-1 py-0.5">chat: 60/min</code>,{" "}
                        <code className="rounded bg-surface px-1 py-0.5">reviews: 5/min</code>).
                      </li>
                      <li>
                        <strong className="text-ink">Cookies & storage:</strong> Supabase auth cookies (
                        <code className="rounded bg-surface px-1 py-0.5">sb-auth-token</code>), OAuth state cookies (HttpOnly, SameSite=Lax,
                        600–1,800s), and local app preferences. No third-party advertising cookies.
                      </li>
                      <li>
                        <strong className="text-ink">Analytics cache:</strong> aggregated Graph insights copied into{" "}
                        <code className="rounded bg-surface px-1 py-0.5">analytics_cache</code> for one day to avoid re-querying Meta on
                        every page load.
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">3. Information from Meta when you connect</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs leading-6 text-mutedText">
                    <p>
                      Only after you approve on Meta&apos;s consent screen: Facebook Pages you administer, linked Instagram Business accounts,
                      Threads profile, and post/page insights (reach, engagement, impressions, saves) and media you authorize for publishing.
                      Passwords and private messages are never requested.
                    </p>
                  </CardContent>
                </Card>
              </div>
              <p className="text-xs">
                Legal basis (GDPR): performance of contract (provide EduVerse), legitimate interest (security, prevent abuse), and consent
                (Meta connection, AI chat). You can request access/export or deletion at{" "}
                <a href={`mailto:${SITE.email}`} className="font-medium text-primary hover:underline">
                  {SITE.email}
                </a>
                .
              </p>
            </Section>

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
                long-lived (30-day) User Access Token, then immediately enumerates your Pages and linked Instagram Business accounts. Only
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
              <p className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-xs leading-relaxed text-ink">
                <strong className="text-success">Security posture:</strong> Nonce-based CSP in production (
                <code className="rounded bg-surface border border-borderSoft px-1 py-0.5 font-mono text-[11px] text-ink">script-src &apos;nonce-…&apos; &apos;strict-dynamic&apos;</code>),
                HSTS 30 days, X-Frame-Options DENY, COOP/COEP, and a minimal Permissions-Policy. Media URLs for publishing are validated
                to be public HTTPS (localhost/private IPs are rejected).
              </p>
            </Section>

            <Section icon={Bot} title="How we use AI — we use AI to power chat" id="ai">
              <p>
                <strong className="font-semibold text-ink">We use AI</strong> (artificial intelligence) to provide the EduVerse Assistant in
                Dashboard &gt; Chat and related content suggestions. Our provider is <strong className="font-semibold text-ink">Google</strong>{" "}
                via the <code className="rounded bg-surface px-1 py-0.5">@google/genai</code> SDK, model{" "}
                <code className="rounded bg-surface px-1 py-0.5">{process.env.GEMINI_MODEL || "gemini-3.5-flash"}</code> (configurable via{" "}
                <code className="rounded bg-surface px-1 py-0.5">GEMINI_MODEL</code>).
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="font-semibold text-ink">What is sent:</strong> your last up to 20 chat messages (text + optional
                  base64 images, each truncated to 4 MB), plus a live workspace context snapshot: connected Meta account names/handles,
                  follower counts, aggregated metrics, and recent post summaries from{" "}
                  <code className="rounded bg-surface px-1 py-0.5">fetchMetaAnalytics()</code>. System instructions from{" "}
                  <code className="rounded bg-surface px-1 py-0.5">lib/ai/eduverse-prompt.ts</code> are also included.
                </li>
                <li>
                  <strong className="font-semibold text-ink">What is not sent:</strong> raw Meta access tokens, your password, or other
                  workspaces&apos; data. Tokens never leave our server except to call the Meta Graph API directly.
                </li>
                <li>
                  <strong className="font-semibold text-ink">Purpose & retention:</strong> solely to generate the assistant&apos;s reply for your
                  request. Google&apos;s API processes the prompt transiently under its API terms; we do not allow training on your prompts
                  without your explicit consent. Your chat history is stored in Supabase (
                  <code className="rounded bg-surface px-1 py-0.5">chat_messages</code>) so you can revisit conversations — delete via
                  Settings or by emailing {SITE.email}.
                </li>
                <li>
                  <strong className="font-semibold text-ink">Human review & accuracy:</strong> AI output may be inaccurate or hallucinated.
                  Do not rely on it for definitive analytics — the dashboard&apos;s live Meta metrics are the source of truth. We never claim a
                  post was published or analyzed unless the Graph API returned that result.
                </li>
                <li>
                  <strong className="font-semibold text-ink">How to opt out:</strong> simply do not use Dashboard &gt; Chat. All other features
                  (analytics, scheduling, publishing) work without calling the AI provider. Contact {SITE.email} to request deletion of
                  stored chat history.
                </li>
              </ul>
              <p className="rounded-xl border border-borderSoft bg-surface px-4 py-3 text-xs">
                Provider docs:{" "}
                <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                  Google Gemini API Terms
                </a>{" "}
                · Model and key are server-side only (<code className="rounded bg-surface px-1 py-0.5">GEMINI_API_KEY</code> never exposed to the
                browser).
              </p>
            </Section>

            <Section icon={Share2} title="Third parties we share data with" id="third-parties">
              <p>
                <strong className="font-semibold text-ink">We share data with third parties</strong> only as listed below and only to provide
                EduVerse. We do not sell your data or share it for advertising.
              </p>
              <div className="overflow-x-auto rounded-xl border border-borderSoft">
                <table className="w-full text-left text-xs leading-6">
                  <thead className="bg-surface text-ink">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Third party</th>
                      <th className="px-3 py-2 font-semibold">Purpose</th>
                      <th className="px-3 py-2 font-semibold">Data sent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderSoft text-mutedText">
                    <tr>
                      <td className="px-3 py-2 font-medium text-ink">Supabase (Supabase, Inc.)</td>
                      <td className="px-3 py-2">Database, authentication, and file storage (Postgres + Auth + Storage bucket post-media)</td>
                      <td className="px-3 py-2">
                        All account, workspace, chat, posts, analytics_cache rows, encrypted tokens, and uploaded media. Hosted per{" "}
                        <code className="rounded bg-surface px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code>.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium text-ink">Meta Platforms, Inc. (Graph API)</td>
                      <td className="px-3 py-2">Fetch insights and publish on your behalf when you approve</td>
                      <td className="px-3 py-2">
                        Page-scoped access tokens, page/profile IDs, caption/media URLs, and publish requests to{" "}
                        <code className="rounded bg-surface px-1 py-0.5">graph.facebook.com / {process.env.META_GRAPH_VERSION || "v26.0"}</code>.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium text-ink">Google LLC (Google Gemini)</td>
                      <td className="px-3 py-2">AI chat completion</td>
                      <td className="px-3 py-2">
                        Chat messages, optional images (inlineData), and live analytics snapshot (see AI section). Via{" "}
                        <code className="rounded bg-surface px-1 py-0.5">@google/genai</code>.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium text-ink">Vercel Inc.</td>
                      <td className="px-3 py-2">Hosting and edge delivery of the Next.js app</td>
                      <td className="px-3 py-2">HTTP requests, IP, headers, and rendered pages (as hosting processor).</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium text-ink">Upstash, Inc. (optional)</td>
                      <td className="px-3 py-2">Distributed rate limiting, if configured</td>
                      <td className="px-3 py-2">
                        Rate-limit counters (<code className="rounded bg-surface px-1 py-0.5">eduverse:rl:*</code>) with IPs/keys hashed — only
                        when <code className="rounded bg-surface px-1 py-0.5">UPSTASH_REDIS_REST_URL</code> is set; otherwise in-memory fallback.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs">
                All processors are bound by their terms and, where required, a DPA. Subprocessors may change; material changes will be noted
                in the version history below and, for active users, via email or in-app notice.
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
                <li>Page tokens expire after 30 days. EduVerse flags them as “Token expiring soon” 7 days before expiry and “Expired” after.</li>
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
                <li>
                  We do not sell or rent your data, and we do not share it with third parties beyond the five listed in{" "}
                  <a href="#third-parties" className="font-medium text-primary hover:underline">
                    Third parties we share data with
                  </a>{" "}
                  (Supabase, Meta, Google Gemini, Vercel, Upstash).
                </li>
                <li>We do not post without your explicit Publish / Schedule action.</li>
                <li>We do not log raw tokens or place them in URLs, analytics, or error reports.</li>
                <li>We do not invent metrics when Meta returns none — the dashboard shows an explicit empty state.</li>
                <li>We do not train AI models on your content without explicit consent.</li>
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
                <Button asChild size="sm" className="bg-ink text-background hover:bg-ink/90">
                  <Link href="/signup">Create account</Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/demo">Try sandbox demo first</Link>
                </Button>
              </div>
            </Section>

            <Card className="border-borderSoft bg-surface/50">
              <CardContent className="p-5 text-xs leading-6 text-mutedText">
                <p className="font-semibold text-ink">Version history</p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    {lastUpdated} — Added explicit Data we collect, How we use AI (Google Gemini), and Third parties we share data with
                    (Supabase, Meta, Google, Vercel, Upstash) disclosures to address audit findings.
                  </li>
                  <li>August 13, 2026 — Added sandbox demo clarification and explicit encryption/RLS wording.</li>
                </ul>
                <p className="mt-2">Previous versions available on request at {SITE.email}.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
