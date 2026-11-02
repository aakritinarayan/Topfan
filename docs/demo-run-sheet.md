# Demo run sheet: TopFan AI

About 12 minutes, in three parts: account setup, finding your way around, and Content Autopilot.
Every step below was run end to end; `tests/e2e/demo-script.mjs` re-checks the typed phrases.

## Before you present

- [ ] **Connect the AI model.** Copy `.env.example` to `.env.local`, add `ANTHROPIC_API_KEY`, restart `npm run dev`.
  The panel header must **not** say "DEMO MODE". (Every phrase below also works in demo mode, but open questions don't.)
- [ ] **Run the phrase check** with the key in place: `node tests/e2e/demo-script.mjs`. It should print `Answering: live model` and `ALL PASSED`.
- [ ] Use Chrome at the projector's resolution (tested at 1512×805 and 1126×797). Zoom 100%.
- [ ] Open the three starting links below in three tabs, in order.
- [ ] **Don't reload a tab mid-demo**: reloading clears the chat. To restart a part, open its starting link again.
- [ ] Keep the backup recording ready (see the end).
- [ ] Press **R** to show or hide the review bar. Hide it before you start.

| Part | Starting link (add to your host, e.g. `http://localhost:5173`) |
|---|---|
| 1. Account setup | `/edit-preference/whitelabel/setup/domain?resetMock=1` |
| 2. Navigation | `/?resetMock=1` |
| 3. Content Autopilot | `/?resetMock=1` (a fresh tab) |
| 3b. Held post (optional) | `/ajwhite?resetMock=1&apFixture=missing-asset` |

`resetMock=1` starts from clean demo data. Everything is fictional; nothing real is changed.

## 0. Opening (1 min)

> "Creators come to TopFan to build a business with their fans, not to learn DNS or hunt through 16 settings tabs. We added an assistant on top of TopFan's existing screens. It does the preparation; the creator makes every decision."

Point out: the TopFan screens are unchanged. The assistant is the panel on the right and the red mascot.

## 1. Account setup (4 min): "too technical" → "done in a few clicks"

| Do | What appears | Say |
|---|---|---|
| Click **Let's get started** | "Do you already have a domain name?" | "One question at a time, with the likely answer first." |
| Click **Yes, I have a domain** | "Type it into Domain Name on the left" | |
| Type `ajwhite.com` in **Domain Name** | "I found a likely provider: GoDaddy. Want me to fill that in?" | "It recognizes the provider, but asks before touching the form." |
| Click **Fill it in** | "GoDaddy is filled in." with **Undo** | "Every change can be undone." |
| (next card) | "ajwhite.com already handles your email…" with **fans.ajwhite.com** recommended | "This is the step creators get wrong: pointing the root domain at TopFan would break their email. The assistant explains why and recommends a sub-domain." |
| Click **Fill it in**, then **Save & Continue** on the page | Step 2: "This part can get technical…" plus the GoDaddy video card | "The raw records are still here. The assistant translates them." Optional: click **Show details**. |
| Click **Prepare it for me** | The simulated GoDaddy consent window | "The creator signs in at GoDaddy themselves. We never ask for their password." |
| Click **Connect** | "Assistant is working…" with **Stop**, then "2 records added at GoDaddy." | "Visible progress, a Stop button, and Undo afterwards." |
| Click **Verify & Continue** on the page | "Your domain is connected…" Site already works at ajwhite.topfan.dev. | "No dead wait: the site works on a temporary address right away." |
| Click **Draft my first post**, then **Keep it** | A draft marked **Draft**, "Nothing is posted." | "Waiting time becomes useful. Optional: **Play Creator Quest**." |
| Click the small **Simulate: finish provisioning** link under the provisioning card | "Your website is ready!" | "Four steps, no DNS knowledge needed." (Real provisioning takes up to 10 minutes; the link skips the wait.) |

**Variant if asked "what if it fails?"** Choose **Walk me through it** instead of **Prepare it for me**, then click **Verify & Continue**. The assistant says one record needs attention; click **Help me fix it**. It finds the classic GoDaddy mistake (the domain added twice to the record name) and shows the exact name to use. "It diagnoses the problem instead of just saying 'failed'."

## 2. Finding your way around (3 min): "ask, don't hunt"

Open the second tab. Type each phrase exactly:

| Type | What happens | Say |
|---|---|---|
| `Where do I set what fans pay to message me?` | Opens **Preferences › Monetization** | "The creator's words, not TopFan's menu names." |
| `Take me to my wallet` | Asks: earnings and withdrawals, or the NFT wallet? | "When two features sound alike, it asks instead of guessing." |
| `I want to start earning` | Starts **Launch a paid subscription**, Step 1 of 3, and opens the plans page | "Goals become guided steps on the real screens." |
| `What should I focus on?` | Outbound Email failing, orders waiting, refunds waiting, each with a button | "It prioritizes. It doesn't just list everything." |
| `Create a group called Inner Circle` | **Please confirm** card showing exactly what will be added; click **Approve** | "Small changes it can do for you, but only after you approve exactly what you see. Then it opens the page so you can check." |

**Optional, roles (30 s):** press **R**, set **Demo role** to **Delegate · Content**, press **R**, then type `Where do I set what fans pay to message me?`. It says the account owner can change this, and doesn't open the page. Set the role back to **Creator (owner)**.

## 3. Content Autopilot (3 min): review by exception

Open the third tab.

| Do | What appears | Say |
|---|---|---|
| Click **Review** on "Your weekly content is prepared" (or type `Review my posts`) | 4 drafts, each with a suggested time | "It prepared the week from AJ's own material and checked it for repetition and relevance." |
| Click **Review ready posts** | "Training update", with its **Source** and why this time | "Every draft shows where it came from. The time is only a proposal: nothing posts automatically." |
| Click **Approve** | Next draft: the poll | |
| Click **Approve** | "Monday motivation: Never give up on your dreams!…" | "This one is generic." |
| Click **Not right**, then **Too generic** | A new draft based on fan questions, with its source | "Give a reason and it replaces the draft. It never invents facts." |
| (optional) **Edit in New Post** | The original New Post screen, pre-filled | "Detailed edits happen in TopFan's own composer; the creator's edits always win." |

**Optional, 3b:** in the held-post tab, type `Review my posts`. "Photos from the shoot" shows **Missing image** and is held. "It won't fill a gap by making something up."

## 4. Close (1 min)

> "Three things, one rule: the assistant prepares, the creator decides. One decision at a time, everything explained, everything undoable."

Next steps, if asked:
- Insights, fans and earnings answers from any page.
- Answers that use more of TopFan's help content.
- An accuracy score from a set of real creator questions.

## Backup

If the network or model fails: every phrase in part 2 also works in demo mode (the header shows DEMO MODE), and parts 1 and 3 don't need the model. Record the full run once beforehand as a last resort.
