# TopFan — Deployment Test Results

- **Code commit tested:** `606a2ea` (`main`). The docs commit after it changes no app code.
- **Live URL:** https://topfan-one.vercel.app
- **Bundle:** the live `index-BggF3uKx.js` matches the local `dist/`. Confirmed by fetching the live HTML.
- **`/api/chat`:** `{"configured":false,"model":null}`. Demo mode: no model key on Vercel.
- **Browser:** headless Chrome via puppeteer-core.
- **Run date:** 2026-11-04

## Targets × viewports

| Suite | Local dev (1512×805) | Local dev (1126×797) | Production build, local :4173 | Vercel (1512×805) | Vercel (1126×797) |
|---|---|---|---|---|---|
| `script-demo1.mjs`: onboarding O1–O9 + 10 exact prompts (41 checks) | PASS | PASS | PASS | PASS | PASS |
| `script-demo2.mjs`: 22 exact prompts + 9 variations (32 checks) | PASS | PASS | PASS | PASS* | PASS |
| `plan-week.mjs` (55 checks) | PASS | — | — | PASS* | — |
| `prod-smoke.mjs` (48 checks) | — | — | — | PASS* | — |

\* The first Vercel attempt failed with "detached frame" or a navigation timeout, caused by machine load: macOS `syspolicyd` was pinned at 99% CPU. Each passed on an isolated re-run with no code change.

Mobile widths were not tested, at the user's request.

## Full regression (local dev, 32 suites)

**31 / 32 pass.**

**First pass: 24 passed.** The 8 failures fell into three groups:
- **Real failures, fixed:** content-ideas, demo-script and monetize. Re-run: PASS.
- **Test wording:** script-demo1 (prompt 7 regex). Re-run: PASS.
- **Load or mid-test reload flakes:** chat-corpus, cover-page and newpost-ref. Isolated re-run: PASS. click-audit also failed here; see below.

**click-audit: FAIL (open item).**
- 4,607 original-UI controls clicked, 0 page errors.
- 144 controls do nothing in the mock; examples seen include video player Rewind/Fullscreen and the Insights custom date pickers.
- None of these are in the demo scripts. There was no earlier baseline to compare against.

## Static checks

| Check | Result |
|---|---|
| `npx tsc -p . --noEmit` | PASS |
| `npx tsc -p tsconfig.server.json --noEmit` | PASS |
| `npm run build` | PASS |
| Secret scan of the diff and new files (`sk-ant`, `ghp_`, `github_pat_`, `ANTHROPIC_API_KEY=`) | 0 hits |

## Critical workflows

| # | Workflow | Result |
|---|---|---|
| 1 | Domain discovery → GoDaddy handoff (no invented prices, no password or card asked) | PASS |
| 2 | DNS prepare/approve → verify → provisioning → Creator Quest | PASS |
| 3 | Cover page from what TopFan knows | PASS |
| 4 | Branding and logo | PASS |
| 5 | Settings and wallet navigation (clarifying chips) | PASS |
| 6 | Earning options and brand-collaboration guidance | PASS |
| 7 | Create Inner Circle group (original form, created only on Save) and resume it | PASS |
| 8 | Fans / Fan Relationship Management | PASS |
| 9 | Post draft → image → cinematic → shorter caption | PASS (images are sample artwork) |
| 10 | Monetize: $5 or loyalty points Lock + public teaser | PASS |
| 11 | Newsletter topic ideas → full draft with cover | PASS (cover is sample artwork) |
| 12 | Experience ideas → full proposal → Link in Bio | PASS |
| 13 | Plan My Week: plan → edit → approve → open drafts → edit syncs to the form → what needs approval → save → continue | PASS |
