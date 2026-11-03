# Deploying the TopFan assistant prototype to Vercel

One Vercel project serves both demos from separate paths:

| Demo | Shareable path | Opens on |
|---|---|---|
| Demo 1: Account Setup & Navigation | `/demo/setup-navigation` | `/edit-preference/whitelabel/setup/domain` |
| Demo 2: AI-Assisted Content | `/demo/ai-content` | `/ajwhite` (the Feed) |

Example: `https://<your-project>.vercel.app/demo/ai-content`.

## 1. Project

- **Framework:** Vite 8 + React 19 + TypeScript (single-page app, React Router-style catalog in `src/app/routeCatalog.ts`) and Tailwind.
- **Backend:** one Vercel serverless function, `api/chat.ts` (Node runtime). It wraps `server/chat.ts`, the same handler the dev server mounts at `/api/chat`.
- **Node.js:** 22 or later (`"engines": { "node": ">=22" }`; developed on Node 24).
- **Package manager:** npm (`package-lock.json`).

## 2. Local setup

```bash
npm ci
cp .env.example .env.local     # optional: add ANTHROPIC_API_KEY (never commit .env.local)
npm run dev                    # http://localhost:5173/demo/setup-navigation  ·  /demo/ai-content
```

## 3. Production build

```bash
npm run build                  # tsc -b && vite build  →  dist/
node scripts/serve-dist.mjs    # serves dist/ the way vercel.json does, on http://localhost:4173
```

## 4. Environment variables

| Name | Where | Required | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Server only (Vercel → Settings → Environment Variables) | No | Connects the live AI model to `/api/chat`. Without it the assistant runs in labelled **Demo mode**. |
| `ANTHROPIC_MODEL` | Server only | No | Defaults to `claude-opus-5-5`. |

- Neither variable has the `VITE_` prefix, so Vite never puts it in the browser bundle.
- There are no public (`VITE_*`) variables.
- `.env`, `.env.local` and `.env.*.local` are git-ignored, and `.env.example` holds only names.
- `/api/chat` is same-origin, so no CORS setup is needed.
- The handler never logs keys or request bodies.

## 5. Vercel configuration (`vercel.json`)

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Root directory | the repository root (`topfan-assistant-poc`) |
| Install command | `npm ci --ignore-scripts` (skips `ffmpeg-static`'s binary download; it's only for the local media scripts) |
| Build command | `npm run build` |
| Output directory | `dist` |
| Function | `api/chat.ts`, `maxDuration: 60` (streamed replies) |
| Rewrites | `/((?!api/).*)` → `/index.html` |

**How routing works.** Vercel serves real files first: JS, CSS, images and videos. `/api/*` goes to the function. Every other path returns `index.html` and the app's router takes over. That's why any TopFan route can be opened directly, refreshed or shared. Examples:
- `/dashboard/newpost`
- `/monetize/newsletters`
- `/monetize/experience/create-experience`
- `/edit-preference/link-in-bio/add-link-in-bio`

The old `/monetize/experience/add-experience` link still works: it redirects to `/create-experience` and keeps `?work=`.

## 6. Deploy with the Vercel CLI (manual)

```bash
npm i -g vercel        # or use npx vercel
vercel login           # you complete this in the browser
vercel link            # create/link ONE project (accept the detected Vite settings)
vercel env add ANTHROPIC_API_KEY production    # optional; paste the key when prompted
vercel                 # preview deployment
vercel --prod          # production deployment
```

The CLI uploads the working directory, minus `.gitignore`d files. Every change needs another `vercel --prod`.

## 7. Deploy with GitHub (recommended for frequent updates)

1. Commit the project and push it to a GitHub repository. `public/assets/generated/` and the new source files are currently untracked, so stage everything with `git add -A`.
2. In Vercel: **Add New → Project → Import** the repository. The settings come from `vercel.json`.
3. Optionally add `ANTHROPIC_API_KEY` under **Settings → Environment Variables** (Production, and Preview if wanted).
4. Every push to the production branch (`main`) redeploys. Every other branch or PR gets its own preview URL.

Local changes never update the hosted site by themselves. Either push to GitHub (automatic deploy) or run `vercel --prod` again. Both demos keep the same production URLs across deployments.

## 8. AI backend

- **Without `ANTHROPIC_API_KEY` (default):**
  - `/api/chat` answers `{"configured": false}`.
  - The panel shows **Demo mode**.
  - The assistant uses its built-in deterministic flows: navigation, guided tasks, content drafts from the creator's notes.
  - New Post › Article › "Insert AI Generated Content" says it prepared the text from the creator's notes.
  - Nothing claims live AI generation.
- **With the key:**
  - Open questions and Article generation go through `/api/chat` (Anthropic SDK, server-side).
  - Every action the model proposes is still validated by the app's mock services, and consequential steps still need the creator's approval.
- **Images:** "generated" images are original, pre-made demo visuals in `public/assets/generated/`. They're labelled "Simulated", so they survive refresh and navigation with no image API.
- **Voice:**
  - Uses the browser's speech recognition and only starts when the user taps the mic. The notice is shown in the panel.
  - Where it's unsupported, the mic button is disabled and typing works.
  - If microphone access is denied, the panel explains how to allow it.

## 9. What is simulated

Everything a creator "connects", "sends" or "publishes" changes only the local mock store in the browser:
- domain availability and prices
- the GoDaddy/DNS connection and verification
- website provisioning
- payments, wallet and refunds
- newsletter sending and email verification
- calendar connections
- Link in Bio publishing
- Content Autopilot scheduling
- generated images
- Article text (without a key)

No real network calls are made except `/api/chat`.

## 10. Demo state and reset

**Where state lives:**
- Each demo keeps its state in this browser's `localStorage`, under its own keys: `topfan-mock-v1:setup-navigation` and `topfan-mock-v1:ai-content`, plus the tasks, setup and Autopilot keys.
- Opening a `/demo/...` link marks that **tab** with its demo (`sessionStorage`). Refreshing, using Back/Forward and navigating inside the tab all stay in that demo.
- The two demos can be open in two tabs at once without sharing conversations or data.

**Reset one demo:**
- Open its link with `?resetMock=1`, e.g. `/demo/ai-content?resetMock=1`, or use **Reset** in the review bar (press **R**).
- This clears only that demo's mock data in this browser. The other demo, real accounts and external services are untouched.

**Hosted state:** nothing is stored server-side, so every viewer gets their own fresh demo.

> Paste the `/demo/...` links when sharing. A bare internal URL such as `/dashboard/newpost` opened in a brand-new tab loads the general app, not a demo, because the demo mode belongs to the tab.

## 11. Updating

```bash
npm run build && node scripts/serve-dist.mjs &          # check the production build locally
BASE_URL=http://localhost:4173 node tests/e2e/prod-smoke.mjs
git add -A && git commit -m "…" && git push             # GitHub flow  (or: vercel --prod)
```

The end-to-end suites in `tests/e2e/` default to the dev server (`http://localhost:5173`). Set `BASE_URL` to run them against another server. `routes-verify.mjs` imports source modules, so it only runs against the dev server.

## 12. Common problems

| Symptom | Cause / fix |
|---|---|
| 404 on refresh of a deep link | The rewrite didn't apply. Make sure `vercel.json` is at the project root and the Root Directory setting points at it. |
| `/api/chat` returns HTML | A custom rewrite is catching `/api/`. Keep the `(?!api/)` exclusion. |
| Panel shows Demo mode after adding the key | Environment variables apply to new deployments only. Redeploy, and check the variable is set for the right environment (Production/Preview). |
| `FUNCTION_INVOCATION_FAILED` on `/api/chat` | Check the function logs. Server-side imports must use explicit `.js` extensions (Node ESM). |
| Build fails at `tsc -b` | Run `npm run build` locally first. It runs the same type check. |
| Images or video missing | Paths are case-sensitive on Vercel (Linux), and files must be committed. Check `git status` for untracked files under `public/`. |
| Install fails downloading ffmpeg | Keep `installCommand: npm ci --ignore-scripts`. |
| Phone shows a tiny page | Expected: the layout is desktop-first and is fitted to the screen. Pinch-zoom works. |
