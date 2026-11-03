# Demo run sheet: TopFan AI

About 13 minutes, in three parts: account setup, finding your way around, and Content Autopilot (plan the week, then review).
Every step below is checked end to end by the tests listed at the bottom.

## Before you present

- [ ] **Optional: connect the AI model.** Copy `.env.example` to `.env.local`, add `ANTHROPIC_API_KEY`, restart `npm run dev`.
  Without it the panel header says **DEMO MODE**. Every phrase on this sheet works in demo mode; open-ended audience questions are better with the model connected.
- [ ] **Run the phrase check:** `node tests/e2e/demo-script.mjs` should print `ALL PASSED`.
- [ ] Chrome at 100% zoom, at the projector's resolution (tested at 1512×805 and 1126×797).
- [ ] Open the starting links below in separate tabs, in order.
- [ ] A reload no longer resets the demo (the reset flag is removed from the address bar once applied). To restart a part, open its starting link again.
- [ ] Press **R** to show or hide the review bar. Hide it before you start. Its **Reset** button restarts the whole demo (local mock data only).
- [ ] **Voice:** try the mic once on the presenting laptop (see "Voice check" below).
- [ ] Keep the backup recording ready.

Two separate demo links, one per pitch. Each keeps its own data, tasks and conversation, and only
suggests its own workflows. Asking one demo for the other's workflow gets "That workflow is available in
the … demo." with a button that opens the other link in a new tab (never a silent switch).

| Demo | Link (add to your host, e.g. `http://localhost:5173`) | Parts |
|---|---|---|
| 1. Account Setup & Navigation: "AI makes TopFan easier to understand, navigate, and use." | `/demo/setup-navigation?resetMock=1` | 1 and 2 |
| 2. AI-Assisted Content: "AI reduces the repetitive effort of creating and managing content." | `/demo/ai-content?resetMock=1` (a second tab) | 3 |

`resetMock=1` starts that demo from clean data (the other demo is untouched). Everything is fictional; nothing real is changed.
Account setup screens use the setup colors from the live product (teal, teal mascot); the platform after setup is red and black.
When the panel is open, it says which page you're on and offers up to three actions for that demo (**More suggestions** for the rest).

## 0. Opening (1 min)

> "Creators come to TopFan to build a business with their fans, not to learn DNS or hunt through 16 settings tabs. We added an assistant on top of TopFan's existing screens. It prepares; the creator decides."

The TopFan screens are unchanged. The assistant is the panel on the right and the red mascot.

## 1. Account setup (4 min): "too technical" → "done in a few clicks"

| Do | What appears | Say |
|---|---|---|
| Click **Let's get started**, then **Yes, I have a domain** | "Type it into Domain Name on the left" | "One question at a time, likely answer first." |
| Type `ajwhite.com` in **Domain Name** | "I found a likely provider: GoDaddy. Want me to fill that in?" | "It recognizes the provider, but asks before touching the form." |
| Click **Fill it in** | "GoDaddy is filled in." with **Undo** | "Every change can be undone." |
| (next card) | Recommends **fans.ajwhite.com** because ajwhite.com handles email | "Pointing the root domain at TopFan would break email. It explains why." |
| **Fill it in**, then **Save & Continue** on the page | Step 2 with the GoDaddy video card | Optional: **Show details** for the raw records. |
| **Prepare it for me** | **Connect your GoDaddy account** (labelled Simulated, no password fields) | "The creator signs in at GoDaddy themselves. We never see their password." |
| **Continue to GoDaddy** | **Review your DNS changes**: the exact two records from this page | "Nothing is added before they approve." |
| **Approve & connect** | **Setting up your DNS records** ("Simulated setup. No changes are being made to GoDaddy."), then **DNS setup prepared** | |
| **Back to TopFan** | "I've completed the simulated DNS setup…" and "Use Verify & Continue to check the connection." | |
| **Verify & Continue** | "Your domain is connected. TopFan can continue setting up your website." | "No dead wait." |
| **Simulate: finish provisioning** (small link under the card) | Panel: **"Your site is ready. Let's make it yours."** with **Edit my cover page**, **Customize my branding**, **Set up Link in Bio** and **More suggestions** | (Real provisioning takes up to 10 minutes.) |
| **Edit my cover page** | Opens **White Label Site**, points at **Edit Cover Page**, then opens the existing editor. "I can help prepare your cover page using the information you've already shared with TopFan…" | "It starts from what TopFan already knows." |
| **Prepare my cover page** | **"Your cover page draft is ready."** Each field shows Draft, its source, or Written by AI. The panel also lists brand colors with a contrast check, a cover image, the sources (website and Instagram marked simulated; Facebook and X links kept but not read) and anything that needs input | "Nothing in the editor has changed yet." |
| **Review in Cover Page Editor** | The SEO fields fill in, and any field the creator already typed in is kept. **Undo** is offered. Then one decision at a time: **Use this image**, then **Use these colors** (these go to Customize Appearance unsaved) | "The creator decides each piece." |
| **Update & Publish** (on the page) | "Your cover page is published." | "Only the creator's click publishes." |

**Cover page stories on request** (add to the editor link `/edit-preference/whitelabel-cover-page`): `?coverFixture=no-website`, `site-unreachable`, `no-photo` or `publish-fail` (the first Update & Publish fails; the assistant checks the status before suggesting a retry).

**Failure stories on request** (add to the DNS step link): `?dnsFixture=connection-failure`, `domain-not-found`, `hosted-elsewhere`, `conflict`, `update-failed` or `propagation-pending`. Each shows its message and offers **Walk me through it**.

**If asked "what if it fails?"** Choose **Walk me through it**, then **Verify & Continue**, then **Help me fix it**: it finds the classic GoDaddy mistake (domain typed twice in the record name).

## 2. Finding your way around (4 min): "ask, don't hunt"

Type each phrase (or use the mic):

| Type | What happens | Say |
|---|---|---|
| `I want to change my website logo.` | Says where it is, with **Open White Label Site**. Click it. | "The creator's words, not TopFan's menu names. The chat stays with you." |
| (on that page) change **Logo Font** with the arrows | The header logo changes instantly; leaving without **Update & Publish** reverts it | "Safe to explore. Nothing is live until you publish." |
| `I want to change my settings.` | Asks: My profile / My website / Notifications / Privacy & password | "When it's ambiguous, it asks." |
| `I want to start earning from my fans, but I don't know where to start.` | One question: four kinds of earning, plus **Explore all earning options**. Pick **Memberships and exclusive content** | "One decision at a time." |
| Click **Subscriptions** in the list | Plans page with "Step 2 of 3" pointing at **Add New Plan** | "Goals become guided steps on the real screens." |
| (optional) `I want to earn through brand collaborations.` | Goes straight to Advertisements, no extra question | "Specific goals get a direct answer." |
| Click **Feed**, collapse the panel, reopen it | **"Continue setting up your subscription?"** | "It remembers what you were doing." |
| `What should I focus on?` | Outbound Email failing first, then orders and refunds | "It prioritizes." |
| `Create a group called Inner Circle` → **Approve** | **Please confirm** card, then the Groups page | "Small changes only after you approve exactly what you see." |

Optional: `What are my earning options?` lists all 12 Monetize features, each marked **Earns** or **Helps sell**; any row opens that feature with its setup steps.

Optional: `fix my email` guides the real Outbound Email screen from Failed to Verified (the domain change asks the creator to type the domain to confirm).

**Optional, roles (30 s):** press **R**, set **Demo role** to **Delegate · Content**, press **R**, ask `Where do I set what fans pay to message me?`. It says the account owner can change this and offers no button. Set the role back to **Creator (owner)**.

## 3. Content Autopilot (4 min): plan the week, then review by exception

Open the third tab.

**3a. Plan my week**

| Do | What appears | Say |
|---|---|---|
| Type `Plan my week` | "Plan next week's posts": 4 short questions, about 2 minutes | "The creator sets the direction once a week." |
| **Start planning**. Type `Competing at the Copper Ridge rail jam on Saturday`, press **+** | The line is added | "Their words are the only new facts the AI may use." |
| (optional) Type or speak in the message box: `Filming a new edit with the crew on Wednesday`, then **Continue** | | "Voice works here too." |
| Step 2: days | Suggested days are pre-selected; **Saturday is added because you mentioned it** | |
| Step 3: topics → **Continue**. Step 4: photos and clips → **See my plan** | | "It only uses the files they pick." |
| Step 5: the plan | One post per day, each showing **From:** its source. Try **↻** (another idea) or **×** | "A visible plan before anything is written." |
| **Approve plan** | "Your week is planned." with what happens next | "Approving lets it draft. It never publishes." |
| **Draft them now** | "Your posts for Nov 9–15 are drafted." | "In the product each draft arrives the day before. This skips the wait." |

**3b. Review by exception**

| Do | What appears | Say |
|---|---|---|
| **Review ready posts** | The Saturday post uses exactly the creator's words, with its source | "Every draft shows where it came from." |
| **Approve**, then the next ones | | |
| (optional) on any draft: **Not right** → **Too generic** | A new version from approved sources | "It never invents facts to fill a gap." |
| After approving: **Save approved drafts** | "Your approved drafts have been saved." | |
| **Open "…"** / **Open next draft** | New Post opens pre-filled; the panel says which draft is open | "Detailed edits and publishing happen in TopFan's own composer." |

**3c. Demo 2: tell it what you want** (`/demo/ai-content`). The full script with exact phrases is `docs/DEMO2_PRESENTER_GUIDE.md`: a post with a simulated image, Gold-only content explained honestly, a newsletter blocked by email verification, a fan experience, and "Plan my entire week".

## 4. Close (1 min)

> "Three things, one rule: the assistant prepares, the creator decides. One decision at a time, everything explained, everything undoable."

## Voice check (do once before presenting)

1. Click the mic in the panel. Chrome asks for microphone permission: allow it.
2. Say "Help me set up a subscription for my biggest fans", then click the stop button.
3. The words appear in the message box for correcting. Press Enter: it starts "Launch a paid subscription".
Voice understands US English only; in Chrome the audio is processed by Google (the panel says so).

## Backup

Parts 1 and 3 don't need the model. Every phrase in Part 2 works in demo mode. Record the full run once as a last resort.

## Automated checks

`node tests/e2e/<name>.mjs` with the dev server on :5173:
`content-agent` (Demo 2's 7 content scenarios; `--viewport=1126x797`) · `two-demos` (both demo journeys, cross-demo requests, page guidance on 11 screens) · `cover-page` (post-setup cover page prefill, fixtures, Demo 2 isolation) · `dns-setup` (GoDaddy setup states and errors) · `demo-links` · `demo-script` (this sheet's phrases) · `scenarios` (navigation A–G + Outbound Email) · `monetize` (all 12 earning destinations) · `task-resume` (paused tasks) · `plan-week` · `autopilot` · `chat-corpus` (194 questions) · `wls-manage` · `launcher` · `media-audit` · `click-audit` (every control on every route).
