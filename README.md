# EduVerse — Social intelligence that remembers your audience

> **EduVerse connects Instagram, Facebook, and Threads and turns real engagement into persistent audience memory with precise posting recommendations.**

Live analytics (no mocks), encrypted Meta publishing, idempotent scheduling, and a Gemini-powered assistant grounded in your workspace data — all behind Supabase Auth + RLS.

**Production:** `https://eduversesocial.vercel.app` · **Stack:** Next.js 16 · React 19 · Supabase · Tailwind · Gemini · Vercel

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database & Migrations](#database--migrations)
- [API & Agent Surface](#api--agent-surface)
- [Available Scripts](#available-scripts)
- [Security](#security)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### 1. Authentication & Workspace

- **Supabase Auth (SSR)** — email/password, email verification, magic-link callback (`/auth/callback`), password reset with `pw_recovery` HttpOnly cookie guard.
- **Server-action validation** (`actions/auth.ts`) — Zod + dual rate limiting (per-IP and per-email), open-redirect protection.
- **Auto-provisioned workspace** — `handle_new_user()` trigger creates `users`, `profiles`, `workspaces`, `workspace_members(owner)` on signup.
- **Profile management** — editable `display_name / role / bio` with Zustand persistence across reloads.
- **GDPR-style account deletion** — `DELETE /api/account/delete`.

### 2. Meta Integrations (Official Graph API v26.0)

| Platform | OAuth entry | Scopes |
|----------|-------------|--------|
| **Facebook + Instagram** | `GET /api/meta/oauth` → `facebook.com/dialog/oauth` | `public_profile, pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish, instagram_manage_insights` |
| **Threads** | `GET /api/meta/threads` → `threads.net/oauth/authorize` | `threads_basic, threads_content_publish, threads_manage_insights` |

- Short-lived code → **30-day long-lived token** (`fb_exchange_token`), pages enumerated via `/me/accounts`, Instagram Business accounts linked via `parent_account_id`.
- Tokens encrypted at rest with **AES-256-GCM** (`iv.tag.ciphertext` base64url, key = `SHA-256(ENCRYPTION_KEY)`).
- CSRF state via `HttpOnly` `SameSite=Lax` cookies (1800s / 600s).

### 3. Publishing & Scheduling

- **Unified publisher** (`lib/social-publisher.ts`) — `FacebookPublisher` (`/photos` vs `/feed`), `InstagramPublisher` (container → poll → `/media_publish`), `ThreadsPublisher` (container → poll → `/threads_publish`). HTTPS-only media guard blocks `localhost` / private IPs.
- **Immediate publish** — `POST /api/meta/publish` validates media/hashtags (≤ 2200 chars), checks token expiry + permissions, decrypts and publishes.
- **Scheduled publish** — `idempotency_key = user:platform:externalId:ISO:caption` deduplicates (`23505`), row in `scheduled_posts` with status `SCHEDULED`.
- **Media uploads** — `POST /api/meta/upload` → Supabase Storage `post-media` (public bucket, owner-scoped policies) — required because Meta needs a public HTTPS URL.
- **CSV import** — `Dashboard > Content` accepts `.csv` (≤ 2 MB, ≤ 50 rows, header `platform + content/caption/post + optional date`), persisted to `localStorage:eduverse:csv-import`.
- **Scheduler worker** — `lib/meta-scheduler.ts` + `POST /api/meta/scheduler` (guarded by `SCHEDULER_SECRET` / `CRON_SECRET`, timing-safe compare). Concurrency 3, `MAX_ATTEMPTS=4`, exponential backoff with jitter, stale `PUBLISHING > 10m` recovery, atomic `SCHEDULED → PUBLISHING` claim. Triggered by **Vercel Cron** daily `0 1 * * *`.

### 4. Analytics (Live Only)

- Per-workspace decrypted tokens → parallel Graph calls (`mapLimit 5`) — Page `page_views_total/page_post_engagements/fan_count`, Instagram `reach/accounts_engaged/total_interactions/followers_count`, Threads `views/likes/replies/reposts/quotes/followers_count`.
- **14-day engagement timeline**, platform breakdown, posting frequency, audience growth, top-post detection.
- Empty-state guard — no token → `live: false` placeholder (never invents metrics).
- **Cache** `analytics_cache` per `(social_account_id, metric_date=today)` — success-only, bypassable via `?refresh=1`.

### 5. Audience Memory & Recommendations

- **Memory** (`/dashboard/memory`) — derived from live analytics (account count, post count, top post).
- **Recommendations** (`/dashboard/recommendations`) — grounded repurpose suggestion from top-engaged post, `Why this?` provenance modal, local dismiss (`eduverse:dismissed-recs`).

### 6. AI Assistant (Gemini)

- Model `gemini-3.5-flash` via `@google/genai`, streaming `generateContentStream` (temp 0.4, 4096 tokens).
- System prompt `EDUVERSE_SYSTEM_PROMPT` + **live workspace context** (5-min per-user cache of analytics snapshot) — policy `LIVE DATA POLICY` prevents hallucination when no data.
- Persistence `chat_conversations` + `chat_messages` (supports image `≤ 4 MB` base64), fail-open (DB failure never blocks answer), rate limit `60/min`.
- UI: conversation sidebar, markdown rendering, image attach, throttled stream (100 ms), provenance badge.

### 7. Landing, Reviews & PWA

- Parallax hero, marquee brand logos, 6-card feature grid, tilt-card review wall, inline feedback form (`POST /api/reviews`, 5/min, Zod, moderated `pending` → `approved`).
- `sitemap.ts`, `robots.ts`, `manifest.ts`, `opengraph-image.tsx`, Organization JSON-LD (`SoftwareApplication`), offline page, `sw.js` registration.

### 8. Dashboard Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | 6 metric cards + 5 chart cards + post table + recommendations + memory timeline |
| `/dashboard/analytics` | Full analytics charts |
| `/dashboard/content` | Content library, CSV import, `PostTable`, publisher modal |
| `/dashboard/memory` | Audience memory timeline |
| `/dashboard/recommendations` | Actionable repurpose card |
| `/dashboard/chat` | Gemini assistant |
| `/dashboard/notifications` | Activity feed (placeholder) |
| `/dashboard/settings` | Profile, password, Meta connect, preferences, team (≤ 10), plan limits, delete account |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16.3 (App Router, Turbopack), React 19.2, TypeScript 5.8 strict |
| **Styling** | Tailwind CSS 3.4, PostCSS + Autoprefixer, `class-variance-authority` + `tailwind-merge` |
| **UI** | Radix UI (avatar/dialog/tabs), lucide-react, Recharts, Framer Motion 12, custom `components/ui/*` |
| **Fonts** | `next/font/google` — Space Grotesk (sans), Fraunces (display), JetBrains Mono (mono) |
| **State** | Zustand 5 (dashboard store), Zod 3 (validation) |
| **Backend** | Supabase (Postgres + Auth + Storage + RLS), Supabase SSR 0.12 |
| **AI** | Google GenAI SDK 2.13 — Gemini 3.5 Flash |
| **Security** | AES-256-GCM token encryption, Upstash Redis (distributed rate limit) + in-memory fallback, nonce-based CSP |
| **Infra** | Vercel (hosting + Cron), Supabase Cloud |
| **Tooling** | ESLint 9 + eslint-config-next, Vitest 4, Supabase CLI |

**Path alias:** `@/*` → `./*` · **Image CDNs:** `graph.facebook.com`, `graph.threads.net`, `*.fbcdn.net`, `*.cdninstagram.com`, `lookaside.fbsbx.com`, `*.supabase.co`

---

## Architecture

```
Browser ──► proxy.ts (CSP nonce + Supabase session refresh + /dashboard guard + Accept:text/markdown rewrite)
              │
              ├─► App Router (RSC + Server Actions)
              │     ├─► Supabase SSR (createServerClient via getAll/setAll cookies)
              │     ├─► RLS policies (is_workspace_member / workspace_owner helpers)
              │     └─► Route Handlers (/api/*)
              │
              ├─► Meta Graph API (facebook.com / threads.net) ◄── encrypted tokens (AES-256-GCM)
              ├─► Gemini API (streaming) ◄── live workspace context injection
              └─► Supabase Storage (post-media bucket, public HTTPS URLs for Meta)
```

**Key patterns:**

- `proxy.ts` (not `middleware.ts`) — matcher excludes `api/`, `_next/`, static; mints per-request CSP nonce in production (`script-src 'nonce-...' 'strict-dynamic'`), whitelists `connect-src *.supabase.co graph.facebook.com graph.threads.net`.
- **RLS everywhere** — workspace-isolated policies on 11+ tables; `supabase/config.toml` `project_id: socialpulse`.
- **Rate limiting** — `lib/rate-limit.ts` prefers Upstash Redis `INCR/PEXPIRE` (2.5 s timeout, fail-open), falls back to in-memory fixed-window with 60 s sweep.
- **Publishing reliability** — `mapLimit 3`, idempotent keys, atomic claim, retry only on `RATE_LIMIT/TIMEOUT/API_ERROR` with jittered `60s * 2^attempt`.
- **Analytics** — per-platform graceful partial failure, today's payload cached in `analytics_cache`, `?refresh=1` bypass.
- **Agent-first** — single source `lib/agentic/site.ts` + `api-catalog.ts` drives OpenAPI/MCP/LLMs.txt/markdown negotiation.

---

## Project Structure

```
.
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Marketing landing
│   ├── layout.tsx                # Root layout (fonts, ThemeProvider, CSP nonce, JSON-LD)
│   ├── globals.css               # Design tokens & utilities
│   ├── (auth)/login,signup,forgot-password,reset-password,verify-email
│   ├── auth/callback/route.ts    # Email verification exchange
│   ├── dashboard/                # Protected (auth check in layout)
│   │   ├── layout.tsx            # AppShell + AnalyticsProvider
│   │   ├── page.tsx              # DashboardHome (dynamic, ssr:false)
│   │   ├── analytics/  memory/  content/  recommendations/  chat/  notifications/  settings/
│   │   └── loading.tsx
│   ├── api/
│   │   ├── health/  ai/status/  reviews/  chat/  account/delete/
│   │   └── meta/ oauth, threads, connect, analytics, publish, scheduler, upload, hook
│   ├── .well-known/  md/[[...slug]]/  llms.txt/  openapi.json  sitemap.ts  robots.ts  manifest.ts
│   └── error.tsx  not-found.tsx  offline/
├── actions/auth.ts               # signIn / signUp / requestPasswordReset / updatePassword / updateProfile / signOut
├── components/
│   ├── landing-page.tsx          # Hero + marquee + features + reviews + CTA
│   ├── dashboard/                # app-shell, dashboard-home, lazy-charts, post-table, chat-interface, analytics-context
│   ├── auth/                     # auth-shell, auth-form, auth-background
│   ├── meta/                     # meta-connect-modal, meta-publisher-modal
│   ├── ui/                       # button, badge, card, tabs, avatar, skeleton, modal, tilt-card, scroll-progress
│   ├── smoothui/                 # typewriter-text, scramble-hover, animated-input
│   └── providers/theme-provider
├── lib/
│   ├── site.ts  meta-config.ts  meta-api.ts  meta-analytics.ts  meta-scheduler.ts  social-publisher.ts
│   ├── crypto.ts  rate-limit.ts  logger.ts  utils.ts  async.ts
│   ├── supabase/ server, client, middleware, service, config
│   ├── agentic/ site, openapi, yaml, markdown, tools, api-catalog, mcp
│   ├── ai/eduverse-prompt.ts
│   └── stores/dashboard-store.ts
├── supabase/
│   ├── config.toml
│   └── migrations/               # 11 migrations (see Database section)
├── data/mock.ts                  # Landing static data (platform logos, features)
├── public/  sw.js  icons
├── proxy.ts                      # Middleware: CSP + session + markdown negotiation
├── next.config.mjs  tailwind.config.ts  tsconfig.json  vercel.json  vitest.config.mts
├── cli/  css-dev-skills/  tests/
└── .env.example
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20 (Next.js 16 requirement)
- **npm** (or pnpm/yarn — lockfile is `package-lock.json`)
- **Supabase** account (or local Docker for `supabase start`)
- **Meta Developer** account — two apps: one with **Facebook Login** product, one with **Threads** product
- **Google AI Studio** key for Gemini (optional, chat disabled without it)

### 1. Clone & install

```bash
git clone https://github.com/Nand3157/eduversesocial.git
cd eduversesocial
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local` — see [Environment Variables](#environment-variables). At minimum:

```bash
# Generate a 32+ char secret for token encryption
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
# → paste as ENCRYPTION_KEY

# Generate a scheduler secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → paste as SCHEDULER_SECRET
```

### 3. Supabase setup

**Option A — Hosted (recommended)**

```bash
npm run db:login      # authenticate Supabase CLI once
npm run db:link       # link to your hosted project (prompts for project ref)
npm run db:migrate    # push all migrations
npm run db:status     # verify applied migrations
```

Create the `post-media` bucket if not auto-created (public, owner-scoped — see `supabase/migrations/*post_media_bucket.sql`).

In Supabase Dashboard → **Auth → URL Configuration** set:

- Site URL: `http://localhost:3000`
- Additional redirect URLs: `http://localhost:3000/auth/callback`

**Option B — Local (Docker)**

```bash
npx supabase start    # boots Postgres (54322), API (54321), Studio (54323)
npx supabase db reset # applies all migrations to local DB
# Studio: http://localhost:54323
```

Update `.env.local` Supabase vars to the local values printed by `supabase start`.

### 4. Meta apps setup

1. **Facebook/Instagram app** — https://developers.facebook.com/apps
   - Create app → add **Facebook Login** product.
   - Valid OAuth Redirect URI: `http://localhost:3000/api/meta/oauth/callback`
   - Request permissions: `public_profile, pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish, instagram_manage_insights`.
   - Copy **App ID** → `META_APP_ID`, **App Secret** → `META_APP_SECRET`.

2. **Threads app** — separate Meta app with **Threads** product
   - Redirect URI: `http://localhost:3000/api/meta/threads/callback`
   - Scopes: `threads_basic, threads_content_publish, threads_manage_insights`.
   - Copy **App ID** → `THREADS_APP_ID`, **App Secret** → `THREADS_APP_SECRET`.

> Graph version defaults to `v26.0` (`META_GRAPH_VERSION`). Override only if Meta releases a newer stable version.

### 5. Run

```bash
npm run dev        # http://localhost:3000  (Turbopack)
npm run build      # production build check
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npm test           # vitest run
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Yes | Public site URL for auth redirects & Meta OAuth URIs. Falls back to `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` |
| `META_APP_ID` | Yes | Facebook app ID (Facebook Login product) |
| `META_APP_SECRET` | Yes | Facebook app secret |
| `META_GRAPH_VERSION` | No | Graph API version (default `v26.0`) |
| `META_REDIRECT_URI` | Yes | Must exactly match Meta dashboard redirect URI (`/api/meta/oauth/callback`) |
| `THREADS_APP_ID` | Yes | Threads app ID (separate Meta app) |
| `THREADS_APP_SECRET` | Yes | Threads app secret |
| `THREADS_REDIRECT_URI` | Yes | Threads redirect URI (`/api/meta/threads/callback`) |
| `ENCRYPTION_KEY` | Yes | 32+ random chars — `SHA-256` derived AES-256-GCM key for token encryption |
| `SCHEDULER_SECRET` | Yes | Shared secret for `POST /api/meta/scheduler` (alias `CRON_SECRET` also accepted) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key — **server-side scheduler only**, never exposed to browser |
| `GEMINI_API_KEY` | No | Google GenAI key — chat disabled without it |
| `GEMINI_MODEL` | No | Model name (default `gemini-3.5-flash`) |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis URL — enables distributed rate limiting (falls back to in-memory) |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis token |

See `.env.example` for the full template.

---

## Database & Migrations

Supabase Postgres with **RLS on every table** + `is_workspace_member(uuid)` / `workspace_owner(uuid)` security-definer helpers.

| Migration | Purpose |
|-----------|---------|
| `20250801000000_initial_schema` | Core multi-tenant schema — `users`, `profiles`, `workspaces`, `workspace_members`, `social_accounts`, `posts`, `analytics`, `recommendations`, `memory`, `notifications`, `subscriptions` + triggers |
| `20250802000000_chat_memory` | `chat_conversations`, `chat_messages` |
| `20250803000000_meta_integration` | Extends `social_accounts` (external_id, tokens, scopes), `scheduled_posts`, `publishing_attempts`, `analytics_cache` |
| `20250805000000_profile_fields` | `profiles.role`, `profiles.bio` |
| `20250806000000_chat_image_attachments` | `chat_messages.image` |
| `20250807000000_harden_workspace_rls` | Least-privilege workspace policies (member select, owner update/delete) |
| `20250820000000_post_media_bucket` | Storage bucket `post-media` (public read, owner-scoped write) |
| `20250821000000_reviews` | `reviews` (pending/approved/rejected) |
| `20250822000000_performance_and_rls_fixes` | Indexes + tighter storage insert policy (`foldername(name)[1] = auth.uid()`) |
| `20250823000000_reviews_auto_publish` | Allow direct `approved` insert for immediate UX (superseded) |
| `20250824000000_reviews_require_moderation` | Revert to `pending`-only inserts — reviews require moderation before public display |

```bash
npm run db:new -- <migration-name>  # create new migration
npm run db:migrate                  # apply to linked project
npm run db:status                   # list applied vs pending
```

---

## API & Agent Surface

Single source `lib/agentic/site.ts` + `lib/agentic/api-catalog.ts` drives all agent artifacts.

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Zero-auth liveness probe |
| `GET /api/ai/status` | AI provider + model |
| `GET /api/reviews` | 24 approved reviews |
| `POST /api/reviews` | Submit review for moderation (`pending`, Zod, 5/min) |
| `GET /api/chat` | List conversations / load history (`?conversationId`, `?list=1`) |
| `POST /api/chat` | Streaming Gemini chat (60/min, image ≤ 4 MB) |
| `GET /api/meta/connect` | Connected accounts |
| `DELETE /api/meta/connect` | Disconnect account |
| `GET /api/meta/analytics?refresh=1` | Live analytics snapshot — requires auth (30/min per user) |
| `POST /api/meta/publish` | Immediate or scheduled publish |
| `POST /api/meta/upload` | Media upload → Supabase Storage |
| `POST /api/meta/scheduler` | Cron tick (Bearer `SCHEDULER_SECRET`) |
| `PATCH /api/meta/scheduler` | Cancel / reschedule (user auth, 20/min) |
| `GET /openapi.json` / `GET /api/openapi.yaml` | OpenAPI 3.1 spec (12+ operations) |
| `GET /api/tools.json` | LLM function-calling catalog |
| `GET /.well-known/mcp` | Model Context Protocol |
| `GET /.well-known/oauth-protected-resource` | RFC 9728 protected resource |
| `GET /llms.txt` · `GET /md/[[...slug]]` | Markdown negotiation (`Accept: text/markdown`) |

Security schemes: `sessionCookie` (Supabase Auth), `schedulerSecret` (Bearer), `eduverseOAuth` (named scopes `read:health, read:reviews, write:reviews, invoke:chat, meta:read/write, account:delete`).

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev --turbopack` | Local dev server |
| `build` | `next build` | Production build |
| `start` | `next start` | Serve production build |
| `lint` | `eslint .` | Lint |
| `typecheck` | `tsc --noEmit` | Type check |
| `test` | `vitest run` | Unit tests |
| `db:login` | `supabase login` | Authenticate Supabase CLI |
| `db:link` | `supabase link` | Link to hosted project |
| `db:new` | `supabase migration new` | Create migration |
| `db:migrate` | `supabase db push` | Apply migrations |
| `db:status` | `supabase migration list` | Show migration status |

---

## Security

- **Token encryption** — AES-256-GCM with random 12-byte IV + auth tag, key derived via `SHA-256(ENCRYPTION_KEY)`.
- **CSP** — per-request nonce in production (`script-src 'nonce-...' 'strict-dynamic'`), `connect-src` whitelists Supabase + Meta Graph hosts, `X-Frame-Options DENY`, `HSTS` 30 days, `COOP/COEP`, `Permissions-Policy`.
- **Rate limiting** — Upstash Redis (distributed) with in-memory fallback; fixed-window per route (login 10/5min, signup 10/hr, chat 60/min, reviews 5/min, etc.).
- **RLS** — every user table gated by `is_workspace_member` / `workspace_owner`; `post-media` bucket enforces `foldername(name)[1] = auth.uid()::text`.
- **SSRF guard** — `assertHttpsMedia` blocks `localhost` / private IPs before calling Meta publish.
- **Open-redirect guard** — `//evil.com` style `next` params rejected.
- **Timing-safe scheduler auth** — `SCHEDULER_SECRET` / `CRON_SECRET` compared with `timingSafeEqual`.

---

## Deployment

### Vercel (recommended)

1. Import the repo in Vercel, set all env vars (including `SCHEDULER_SECRET`, `UPSTASH_*` for production rate limits).
2. Cron is preconfigured in `vercel.json`:

   ```json
   { "crons": [{ "path": "/api/meta/scheduler", "schedule": "0 1 * * *" }] }
   ```

   Vercel injects `CRON_SECRET` automatically — set `SCHEDULER_SECRET` to the same value or either is accepted.
3. Add production redirect URIs in both Meta apps (e.g. `https://yourdomain.com/api/meta/oauth/callback`).
4. In Supabase Dashboard → Auth → URL Configuration, add the production URL.

### Self-hosted

Any Node 20+ host works — ensure `NEXT_PUBLIC_SITE_URL` points to the public origin and the scheduler endpoint is hit by your cron (Bearer `SCHEDULER_SECRET`):

```bash
curl -X POST https://yourdomain.com/api/meta/scheduler \
  -H "Authorization: Bearer $SCHEDULER_SECRET"
```

---

## Contributing

1. Fork & branch from `main`.
2. `npm install` → `npm run dev`.
3. Keep `npm run typecheck` and `npm run lint` green.
4. Add tests in `tests/` (`vitest run`).
5. Open a PR — include migration files if you touch Supabase schema.

---

## License

No license file is currently published. All rights reserved to the EduVerse authors unless a `LICENSE` is added. If you intend to open-source, consider adding an [MIT License](https://opensource.org/licenses/MIT).

---

<p align="center">Built with Next.js · Supabase · Gemini · Framer Motion</p>
