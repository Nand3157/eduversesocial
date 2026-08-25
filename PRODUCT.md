# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** Educators and EdTech teams — instructors, program leads, community managers, and small education brands — who run an active Instagram / Facebook / Threads presence alongside teaching. Situation: they post consistently (reels, carousels, updates) to reach learners, parents, or professional audiences, but lack a system to remember what resonated, when their audience is active, or what to post next. Job: turn everyday posting into compounding audience intelligence without hiring a full social team.

**Also serves:** Solo creators and small cross-functional teams who post daily and need the same memory → recommendation loop. Education remains the anchoring audience; creator/SMB language in current landing copy is treated as secondary until repositioned.

## Product Purpose

EduVerse connects Instagram, Facebook, and Threads via official Meta Graph API and turns real engagement into persistent audience memory with precise posting recommendations.

Why it exists: education and creator teams guess at timing, format, and hooks because platform analytics are fragmented and ephemeral. EduVerse indexes reach, saves, comments, and post timing into a workspace-scoped memory that compounds over time, so each decision is grounded in the audience's actual behavior — never mock data.

Success means: a connected workspace can answer "what worked, why, and what should I post next and when" from live data, schedule or publish with one click, and see recommendations improve as memory grows.

## Positioning

The product mechanism a neighboring social scheduler could not truthfully copy: **live-only, memory-backed recommendations.** EduVerse refuses to invent metrics. Empty states guide users to connect; live snapshots are fetched in parallel from Graph API (pages, IG business, Threads), cached per-day, and distilled into (1) a 14-day engagement timeline with platform breakdown and top-post detection, (2) a durable Memory timeline, and (3) grounded repurpose recommendations with "Why this?" provenance. Publishing is idempotent, encrypted, and verified (HTTPS-only media, permission/expiry checks).

## Operating Context

- **Workflows:** Supabase Auth (SSR, email/password, verification, magic-link callback, pw_recovery guard) → auto-provisioned workspace (users/profiles/workspaces/workspace_members) → connect Meta (Facebook+Instagram OAuth and separate Threads OAuth, 30-day long-lived token, pages enumeration, CSRF state cookies) → view live analytics dashboard → act on recommendations/memory → publish immediately or schedule (idempotency_key, scheduler worker with concurrency 3, MAX_ATTEMPTS=4, jittered backoff, stale PUBLISHING recovery via Vercel Cron 0 1 * * *) → iterate via CSV import (≤2 MB, ≤50 rows) and Supabase Storage post-media (public HTTPS URL required by Meta).
- **AI layer:** Gemini 3.5 Flash streaming chat grounded in live workspace context (5-min per-user analytics cache), fail-open persistence, 60/min limit, image ≤4 MB.
- **Environments:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript strict, Tailwind 3.4, hosted on Vercel; Supabase Postgres/Auth/Storage/RLS; Vercel Cron + scheduler secret; local Docker alternative via `supabase start` (54321/54322/54323).
- **Routes:** Marketing landing (`/`) with sandbox preview (`/demo`, no OAuth, simulated data clearly labeled), protected `/dashboard/*` (home, analytics, content, memory, recommendations, chat, notifications, settings), `/api/*` for health/reviews/chat/meta, and agent surface (`/openapi.json`, `/llms.txt`, `/md/[[...slug]]`, `/.well-known/mcp`).
- **Compliance:** Tokens encrypted at rest with AES-256-GCM (iv.tag.ciphertext, SHA-256 derived key), RLS on 11+ tables via `is_workspace_member`/`workspace_owner`, nonce-based CSP in proxy.ts, SSRF guard on media URLs, timing-safe scheduler auth, Upstash Redis distributed rate limiting with in-memory fallback.

## Capabilities and Constraints

**Confirmed capabilities:** workspace-scoped multi-tenant data model (11 migrations); RLS + Storage policies (foldername = auth.uid()); dual OAuth flows with 7+ scopes; token encryption/decryption per request; unified publisher (Facebook /photos|/feed, Instagram container→poll→publish, Threads container→poll→publish); scheduling with deduplication and atomic claim; analytics per-platform graceful partial failure + per-day cache + ?refresh=1 bypass; recommendations from top-engaged post with dismiss persistence; Gemini chat with live context injection; landing with parallax hero, marquee, tilt-card reviews, moderated review wall (pending→approved), sitemap/robots/manifest/OG/JSON-LD, offline page, sw.js; agent catalog single-sourced from lib/agentic.

**Constraints:** NEXT_PUBLIC_SITE_URL must be public origin; Meta redirect URIs must exactly match dashboard config; ENCRYPTION_KEY ≥32 chars; SCHEDULER_SECRET/CRON_SECRET required for cron; SUPABASE_SERVICE_ROLE_KEY server-only; GEMINI_API_KEY optional (chat disabled without it); UPSTASH_* optional (in-memory rate limit otherwise); Graph version v26.0 default; Node ≥20.

**Explicitly undecided / must not be invented:** pricing/plan limits beyond team ≤10 stub, specific educator personas beyond "educators / EdTech" anchor, testimonials beyond the 24 moderated reviews endpoint, additional networks beyond IG/FB/Threads, and any binding visual rebrand — current warm palette and fonts are incumbent, not contractual (per user: no hard constraints).

**Terminology:** workspace, audience memory, recommendation, live snapshot, idempotency_key, publishing_attempts, analytics_cache.

## Brand Commitments

Name EduVerse and tagline "Social intelligence that remembers your audience" are current but not legally binding per user confirmation — future work may evolve identity without violating a hard constraint. Existing warm editorial voice ("remember your audience," "no fake metrics") and production domain `eduversesocial.vercel.app` are retained as working facts, not locked brand law. No pinned palette, type, or illustration system to preserve; incumbent tokens in globals.css are evidence only.

## Evidence on Hand

- Real content/data: `components/landing-page.tsx:58`, `data/mock.ts` (6 features, platform logos), `lib/site.ts:1` (SITE_NAME/DESCRIPTION), `supabase/migrations` (11 files), `app/globals.css:5` (token set), `README.md` live analytics + publishing evidence.
- Demonstrations: `/demo` sandbox with simulated metrics (142.9K views etc., clearly labeled), dashboard charts and post table, CSV import.
- Reviews: live endpoint `GET /api/reviews` (24 approved) + pending moderation flow; no pre-fabricated testimonials to copy.
- Assets: SF Pro / Space Grotesk, Fraunces display, JetBrains Mono mono via next/font; Lucide icons, Recharts, Framer Motion; Supabase Storage bucket `post-media`. No licensed photography or mascot to preserve.
- Absences to not fabricate: benchmark claims, customer logos beyond Meta platforms, pricing tiers, or education-specific case studies.

## Product Principles

1. **Live truth only — never mock.** Empty states and "Simulated" labels are features. The product earns trust by refusing to invent reach or engagement.
2. **Memory compounds; recommendations prove provenance.** Every suggestion must trace to a real post or signal and show why, so educators learn the pattern, not just the post.
3. **Publishing is infrastructure, not theatre.** Idempotent, encrypted, permission-checked, and retry-safe — the same rigor as auth and RLS.
4. **Education first, but social-native.** Speak to educators as operators of an audience, not just a classroom; respect their time and their learners' attention.
5. **Explain the system, then get out of the way.** Dashboards scan in seconds, copy is plain, actions are one click — delight lives in clarity, not decoration.

## Accessibility & Inclusion

No product-specific WCAG mandate was confirmed; apply standard web accessibility (keyboard, focus-visible, reduced-motion, forced-colors, high-contrast support present in globals.css:308 and following). Audience includes educators and learners across timezones and devices — ensure readable type, timezone-aware publishing windows, and mobile-usable dashboards. Record any future education-specific inclusion needs explicitly here before implementing.
