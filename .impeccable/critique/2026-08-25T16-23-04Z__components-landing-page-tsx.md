---
target: components/landing-page.tsx
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-25T16-23-04Z
slug: components-landing-page-tsx
---
# Critique — EduVerse Landing + Dashboard (components/landing-page.tsx)

## Design Health Score — 23/40 (Acceptable)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Strong live-status (ScrollProgress, chart empty states, authRequired banner) but marquee has no pause control |
| 2 | Match System / Real World | 1 | Jargon "telemetry / Graph callbacks / save velocity / dispatch" — zero educator/learner language |
| 3 | User Control and Freedom | 3 | Modals dismissible, sandbox as undo-for-OAuth, no trapped flows |
| 4 | Consistency and Standards | 2 | Amber sandbox palette competes with terracotta accent; CTA mixes 3 button grammars |
| 5 | Error Prevention | 3 | Good guards (401→login, disabled states, decrypt try/catch) prevents invented metrics |
| 6 | Recognition Rather Than Recall | 2 | 6 feature cards indistinguishable (same border/shadow, vague copy) requires recall |
| 7 | Flexibility and Efficiency | 2 | Sandbox is expert shortcut, but 9-item flat nav, no keyboard bulk actions |
| 8 | Aesthetic and Minimalist Design | 2 | High ornamental debt (parallax, spotlight, tilt, marquee, sheen) + 4× repeated encryption copy |
| 9 | Error Recovery | 3 | Diagnostic copy ("Could not reach review service", permission_required → Reconnect) |
| 10 | Help and Documentation | 2 | Privacy links omnipresent but no inline help for Memory vs engagementData, no onboarding |
| **Total** | | **23/40** | **Acceptable — significant improvements needed before users are happy** |

## Design Specificity Verdict

**LLM assessment (unanchored):** Warm palette is specific — `app/globals.css:7-15` cream `#faf7f0` / ink `#221b13` / terracotta `#c8552b` with `Fraunces` italic "remembers" `components/landing-page.tsx:267` and `Space Grotesk`/`JetBrains Mono` is memorable vs blue SaaS default. But product story is interchangeable: hero badge "Meta Graph API · configured version telemetry" `components/landing-page.tsx:256`, subhead "indexes Instagram Reels, Facebook Pages, and Threads engagement callbacks" `components/landing-page.tsx:276` and all 6 features in `data/mock.ts:56-88` ("save velocity", "buyer intent", "visual hooks") contain zero education lexicon. Swap wordmark `components/landing-page.tsx:45` to CreatorVerse and it fits any influencer scheduler. Education anchor from PRODUCT.md (reach learners/parents) never appears above fold; footer `app/page.tsx:94` tagline drift "AI that helps you learn, build, and grow" contradicts telemetry voice.

**Deterministic scan:** `detect.mjs --json app components` found **2 anti-patterns** (CLI exit 2):
- `codex-grid-background` advisory `app/globals.css:106` (.surface-grid two-axis grid-line) — borderline false positive, intentional editorial texture with mask fade, not full-bleed slop. Other grids at `app/globals.css:191,273` not flagged.
- `side-tab` warning `components/dashboard/chat-interface.tsx:119` (`border-l-2` on `<blockquote>`) — false positive, semantic blockquote quote affordance, not card slop. `SAFE_TAGS` lists blockquote as safe but regex flagged raw string.

Detector caught nothing the LLM missed; LLM found far more substantive issues (jargon, palette split, 6-way choice overload) that detector is blind to. No additional material hits on `app/page.tsx` or `components/landing-page.tsx` narrow scan.

**Visual overlays:** No reliable user-visible overlay available this run. `live-server.mjs` started on port 8400 (health ok, /detect.js served) but browser visualization skipped — fallback signal: **CLI-only critique** (puppeteer not installed, no harness browser tab tool exposed, `detect.mjs --json http://localhost:8400` → "puppeteer is required for URL scanning"). Report is CLI + code review only.

## Overall Impression

Honest system, anxious voice. The smartest move — refusing to invent metrics and offering a clearly labeled Sandbox `components/landing-page.tsx:428,484` — is buried under telemetry jargon, amber-vs-terracotta palette drift, and ornament overload (parallax `components/landing-page.tsx:95`, spotlight `app/globals.css:133`, tilt `components/landing-page.tsx:664`). An educator scanning between classes sees "not for me" before they see "remembers my audience." Biggest opportunity: make the hero and 3 core features speak educator outcomes (enrollment, parent reach, lesson reels) and consolidate trust into one proof bar — then let the existing live-truth guards shine.

## What's Working

1. **Live-truth made visible — rare honesty.** `components/dashboard/chart-card.tsx:10-13` "No recommendation is being invented", `components/dashboard/post-table.tsx:110` "No live Meta posts returned yet…Connect…", `app/globals.css:308` focus/forced-colors/reduced-motion: product refuses to fake 142.9K view counts. Sandbox labeled "Simulated" `components/landing-page.tsx:499,525` is anti-dark-pattern that earns trust.
2. **Editorial system executed end-to-end including a11y.** Not just palette: `app/globals.css:307-450` ships `skip-link`, `prefers-contrast`, `forced-colors`, `prefers-reduced-motion` (disables sheen/parallax), `tabular-nums`, `focus-visible 2px var(--accent)`; `app/layout.tsx:44` font loading with display swap + no-FOUC theme-init is craftsman detail.
3. **Workflow-as-product staging.** Hero 3-step `components/landing-page.tsx:347-377` (Connect → Read signals → Publish with context) mirrored by dashboard `components/dashboard/dashboard-home.tsx:147-177` (Recommendations → Memory timeline → Posts telemetry) turns abstract "social intelligence" into a rehearseable loop.

## Priority Issues

### [P0] Hero tells creator-telemetry story, not educator outcome
- **Why it matters:** Primary user (educator reaching learners/parents) does not self-recognize; bounce to generic competitors. Design becomes interchangeable per verdict.
- **Fix:** Rewrite hero subhead and 2/6 features to educator idioms: "See which reel enrolled 12 trial learners vs scrolled parents" + features "Parent & Learner Signals" with enrollment hook example. Add one educator proof asset above fold (photo/initials insufficient `components/landing-page.tsx:679-684`).
- **Suggested command:** `$impeccable clarify` + `$impeccable shape`

### [P0] Trust reassurance repeated until it feels risky
- **Why it matters:** Same "Encrypted / AES-256-GCM / revocable / Privacy & Data Security" appears hero `components/landing-page.tsx:313`, sandbox `458-465`, CTA `740-749`, modal `components/meta/meta-connect-modal.tsx:166-176`, banner `components/dashboard/dashboard-home.tsx:79-84`. Frequency implies danger; anxiety valley at high-stakes connect.
- **Fix:** Consolidate into single sticky Trust bar after Sandbox (one row: scope · encryption · one-click revocation); delete duplication elsewhere; keep modal as progressive disclosure only.
- **Suggested command:** `$impeccable clarify` + `$impeccable distill`

### [P1] Split palette + split primary path
- **Why it matters:** Sandbox introduces `amber-500/10` + `amber-700` `components/landing-page.tsx:428,484` against global `--accent #c8552b`; CTA band mixes 3 button grammars (ink / ghost-white / primary-outline `components/landing-page.tsx:724-738`) violates single-primary standard, Hick overload at decision peak.
- **Fix:** Restyle sandbox to terracotta `accent-soft` with amber only as micro-badge; hierarchy: Primary = Start free (ink), Secondary = Explore Live Demo (ghost), Tertiary = text link Connect Meta.
- **Suggested command:** `$impeccable colorize` + `$impeccable layout`

### [P1] Feature grid is 6-way indistinguishable choice
- **Why it matters:** `components/landing-page.tsx:584-614` + `data/mock.ts:56-88` six `interactive-card` equal border/shadow `app/globals.css:148-174`; `activeFeature` border only `components/landing-page.tsx:600` barely distinguishable. Recognition over recall fails; skimmer abandons.
- **Fix:** Reduce to 3 educator pillars (Memory / Timing / Repurpose) with distinct treatment + quantified proof per card; collapse remaining 3 as tertiary list.
- **Suggested command:** `$impeccable distill` + `$impeccable layout`

### [P2] Dashboard IA tax — 9-item flat nav not grouped
- **Why it matters:** `components/dashboard/app-shell.tsx:35-47` Cognitive Load #1 failure (Hick), footer `app/page.tsx:65-79` IA mismatches landing nav, admin-gated Reviews visible to all `components/dashboard/app-shell.tsx:55-58`.
- **Fix:** Group nav: Live (Dashboard, Analytics, Content) | Intelligence (Memory, Recommendations, AI Chat) | System (Notifications, Settings); hide Reviews if not admin; mirror footer IA.
- **Suggested command:** `$impeccable layout` + `$impeccable clarify`

## Persona Red Flags

**Jordan (First-Timer / Skimmer):** Badge "Meta Graph API · configured version telemetry" `components/landing-page.tsx:256` stops scan; workflow preview `391-397` reads as documentation not benefit; 6 cards require reading to choose; CTA 3 equal buttons `724-738` forces compare at exhaustion → picks none.

**Riley (Researcher):** No pricing/compare table despite "No credit card required" `308`; claims "Deep semantic analysis…buyer intent" `data/mock.ts:70` without example thumbnail; reviews show average + initials only, no school/brand provenance `components/landing-page.tsx:664-694` — weak social proof.

**Casey (Distracted Mobile / Privacy-Cautious):** Connect Meta `733` adjacent to Open dashboard `728` unclear difference (login vs OAuth grant); Privacy links low-contrast footnote `463`; modal scope `169` vague "related scopes" disclosed too late; `AES-256-GCM` without lifecycle (where stored/retention).

**Priya — Educator / Course Creator (project-specific):** Dashboard metrics `components/dashboard/dashboard-home.tsx:122-127` show vanity Views/Engagement, no "Saves per learner segment / DMs/enrollments"; PostTable `components/dashboard/post-table.tsx:114-139` columns Likes/Comments/Shares/Reach no hook/topic or repurpose action; zero education imagery; Chat prompts `components/dashboard/chat-interface.tsx:31-36` generic.

**Maya — Program Lead / Small EdTech Brand (project-specific):** Memory items `lib/meta-analytics.ts:437-441` are system logs not report-ready insights; PlatformBreakdown `components/dashboard/chart-card.tsx:40-45` percentages without absolutes/export; AudienceGrowth shows Instagram followers only `30`; no role/permission affordance — AvatarFallback `components/dashboard/app-shell.tsx:234` implies solo despite team promise.

## Minor Observations

- `components/landing-page.tsx:179` sticky header `bg-background/85 backdrop-blur-xl` good but ThemeToggle left of primary CTA causes focus jump on sm
- `components/landing-page.tsx:47` Wordmark `href="#top"` anchor hack — should be Next Link for scroll restoration
- `components/landing-page.tsx:185` ScrambleHover on Open dashboard only — inconsistent delight vs editorial calm
- `app/globals.css:343-365` marquee `32s` with no pause control or `prefers-reduced-motion: pause` beyond duration zero — WCAG 2.2.2 risk; `text-faintText #9c8e7c` on `#faf7f0` ~3.2:1 fails AA for 11px mono `components/landing-page.tsx:539`
- `components/ui/button.tsx:6` active:scale + `whileTap 0.92` double-transform twitchy on mobile
- `app/page.tsx:94-96` tagline drift vs hero — brand wobble noted in PRODUCT.md
- `components/landing-page.tsx:706` rating radiogroup uses `aria-pressed` not `aria-checked`
- `components/dashboard/post-table.tsx:111` `min-w-[800px]` no sticky Platform column on mobile swipe
- `components/dashboard/chart-card.tsx:19` engagement area + comments line share Y scale implying correlation without axis

## Questions to Consider

- If you delete "Meta" from the landing, does any copy prove this is built for *education* — or would a fitness influencer think it's for them?
- Your strongest trust asset is refusing to invent metrics. Would one honest line "Preview is fake, everything after login is real" convert better than 4× AES-256-GCM badges?
- Would forcing an educator to choose between Memory / Recommendations / AI Chat on day one teach compounding — or would a single "Audience Memory" entry that contains the others teach faster?
