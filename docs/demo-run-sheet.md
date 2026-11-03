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

| Part | Starting link (add to your host, e.g. `http://localhost:5173`) |
|---|---|
| 1. Account setup | `/edit-preference/whitelabel/setup/domain?resetMock=1` |
| 2. Navigation | continue from Part 1, or `/?resetMock=1` |
| 3. Content Autopilot | `/?resetMock=1` (a fresh tab) |

`resetMock=1` starts from clean demo data. Everything is fictional; nothing real is changed.

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
| **Prepare it for me** → **Connect** | "Assistant is working…" with **Stop**, then "2 records added" | "The creator signs in at GoDaddy themselves. We never ask for passwords." |
| **Verify & Continue** | "Your domain is connected…"; site already works at ajwhite.topfan.dev | "No dead wait." |
| **Simulate: finish provisioning** (small link under the card) | "Your website is ready!" | (Real provisioning takes up to 10 minutes.) |
| **Go to my site** | Panel: **"Your site is ready. What would you like to do next?"** with 4 suggestions | Hand-off to Part 2. |

**If asked "what if it fails?"** Choose **Walk me through it**, then **Verify & Continue**, then **Help me fix it**: it finds the classic GoDaddy mistake (domain typed twice in the record name).

## 2. Finding your way around (4 min): "ask, don't hunt"

Type each phrase (or use the mic):

| Type | What happens | Say |
|---|---|---|
| `I want to change my website logo.` | Says where it is, with **Open White Label Site**. Click it. | "The creator's words, not TopFan's menu names. The chat stays with you." |
| (on that page) change **Logo Font** with the arrows | The header logo changes instantly; leaving without **Update & Publish** reverts it | "Safe to explore. Nothing is live until you publish." |
| `I want to change my settings.` | Asks: My profile / My website / Notifications / Privacy & password | "When it's ambiguous, it asks." |
| `I want to start earning from my fans, but I don't know where to start.` | Three paths. Pick **Exclusive content or membership** | "One decision at a time." |
| Click **Open Subscriptions** | Plans page with "Step 1 of 3" | "Goals become guided steps on the real screens." |
| Click **Feed**, collapse the panel, reopen it | **"Continue setting up your subscription?"** | "It remembers what you were doing." |
| `What should I focus on?` | Outbound Email failing first, then orders and refunds | "It prioritizes." |
| `Create a group called Inner Circle` → **Approve** | **Please confirm** card, then the Groups page | "Small changes only after you approve exactly what you see." |

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
`demo-script` (this sheet's phrases) · `scenarios` (navigation A–G + Outbound Email) · `plan-week` · `autopilot` · `chat-corpus` (194 questions) · `wls-manage` · `launcher` · `media-audit` · `click-audit` (every control on every route).
