# EduVerse

EduVerse helps educators and small teams understand what their audience is responding to. It connects Instagram, Facebook, and Threads data, keeps the useful patterns, and turns them into clear posting recommendations.

Live site: [eduversesocial.vercel.app](https://eduversesocial.vercel.app)  
Try it first: [read-only demo](https://eduversesocial.vercel.app/demo)  
Developer guide: [eduversesocial.vercel.app/developers](https://eduversesocial.vercel.app/developers)

## What is here

- A free account with Supabase Auth and workspace-level row security.
- Official Meta OAuth for Instagram, Facebook Pages, and Threads.
- Live reach, engagement, posting-window, and audience data after a connection is approved.
- A memory view that keeps the context behind important posts.
- Recommendations grounded in the connected workspace data.
- Gemini chat that says when live data is unavailable instead of inventing numbers.
- Publishing and scheduling with encrypted tokens, idempotency, retries, and a Vercel Cron worker.
- A read-only demo with clearly labelled sample data. It never asks for Meta access.

## Run it locally

You need Node.js 20 or newer, npm, and a Supabase project. Gemini is optional; Meta publishing needs the Meta app credentials.

```bash
git clone https://github.com/Nand3157/eduversesocial.git
cd eduversesocial
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The main checks are:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

See `.env.example` for the full list of settings. The important values are:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY`
- `META_APP_ID`, `META_APP_SECRET`, and `META_REDIRECT_URI`
- `THREADS_APP_ID`, `THREADS_APP_SECRET`, and `THREADS_REDIRECT_URI`
- `GEMINI_API_KEY` (optional)
- `SCHEDULER_SECRET` or Vercel's `CRON_SECRET`
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for shared production rate limits

After adding the environment values, apply Supabase migrations with `npm run db:migrate`.

## Public API and agent access

Start at [`/developers`](https://eduversesocial.vercel.app/developers) if you are building an integration. It links to every machine-readable resource.

| Resource | Use it for |
| --- | --- |
| [`/api`](https://eduversesocial.vercel.app/api) | API index and links to the public surface |
| [`/api/v1/health`](https://eduversesocial.vercel.app/api/v1/health) | Zero-auth service smoke test |
| [`/api/v1/reviews`](https://eduversesocial.vercel.app/api/v1/reviews) | Read approved reviews; `POST` submits a moderated review |
| [`/openapi.json`](https://eduversesocial.vercel.app/openapi.json) | OpenAPI 3.1 description |
| [`/api/openapi.yaml`](https://eduversesocial.vercel.app/api/openapi.yaml) | The same API in YAML |
| [`/api/tools.json`](https://eduversesocial.vercel.app/api/tools.json) | Function-calling definitions |
| [`/.well-known/mcp`](https://eduversesocial.vercel.app/.well-known/mcp) | MCP Streamable HTTP JSON-RPC endpoint |
| [`/llms.txt`](https://eduversesocial.vercel.app/llms.txt) | Plain-language agent guide |
| [`/md/`](https://eduversesocial.vercel.app/md/) | Markdown versions of public pages |

The `/api/v1/` paths are the stable public aliases. The older unversioned paths remain for compatibility. API failures use `application/problem+json` with a stable `code`, human `message`, and `resolution`. Public responses include `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`; a `429` also includes `Retry-After`.

The public health and review reads work without an account. Protected analytics, chat, publishing, and account actions currently use the signed-in EduVerse Supabase session. A separate OAuth 2.0 authorization server and self-serve API keys are not live yet, so agents should not pretend they can call those protected operations with a bearer token.

## Meta and data safety

Meta connections use the official consent screens. EduVerse never asks for a Meta password. Connected tokens are encrypted with AES-256-GCM, scoped to the workspace, and removed when an account is disconnected. Workspace tables use Supabase RLS. Uploads are checked for supported image types before storage.

The scheduler is protected by a timing-safe secret and uses idempotency keys so a retry does not publish the same post twice. Rate limiting uses Upstash Redis in production when configured, with a development fallback.

Read the full [Privacy & Data Security page](https://eduversesocial.vercel.app/privacy). For deletion, privacy, support, or partnership questions, use [Contact EduVerse](https://eduversesocial.vercel.app/contact).

## Project map

```text
app/                 Pages, layouts, route handlers, metadata files
components/          Landing, dashboard, auth, Meta, and shared UI
actions/              Server actions for auth and profile changes
lib/                  Supabase, Meta, AI, rate limits, publishing, agent docs
supabase/migrations/  Database schema and RLS policies
tests/               Vitest coverage for auth, publishing, limits, and agent docs
cli/                 Small CLI package for public health and review commands
```

## Deploy

Vercel is the intended host. Import the repository, add the environment values, and set `NEXT_PUBLIC_SITE_URL` to the production URL. `vercel.json` runs the scheduler once a day at `0 1 * * *`; Vercel supplies `CRON_SECRET`. Add the production callback URLs to both Meta apps and the production URL to Supabase Auth.

For a self-hosted Node deployment, run `npm run build` followed by `npm run start`, and call the scheduler with `Authorization: Bearer $SCHEDULER_SECRET`.

## Pages for people

- [About EduVerse](https://eduversesocial.vercel.app/about)
- [Contact EduVerse](https://eduversesocial.vercel.app/contact)
- [Privacy & Data Security](https://eduversesocial.vercel.app/privacy)
- [Live demo](https://eduversesocial.vercel.app/demo)

## License

No license file is published yet. Until one is added, the project remains all rights reserved to the EduVerse authors.
