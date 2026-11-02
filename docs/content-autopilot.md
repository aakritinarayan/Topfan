# Content Autopilot (review by exception)

TopFan AI prepares a week of posts, checks them, and asks the creator to review only what's ready and what needs attention. It all happens inside the existing TopFan AI panel. There is no new page, sidebar item, calendar or composer. For detailed editing, TopFan AI opens the original **New Post** composer.

> The AI prepares, checks, filters and improves. The creator reviews exceptions, authorizes actions, and stays in control.

## Where the code lives

| Part | File |
|---|---|
| State, checks, decisions (mock service layer) | `src/store/slices/autopilot.ts` |
| Panel screens, director, contextual commands | `src/assistant/platform/Autopilot.tsx` |
| Which review screen is open (survives refresh) | `src/assistant/platform/autopilotView.ts` |
| New Post hand-off (`?autopilot=<draftId>`) | `src/pages/social/NewPost.tsx` |
| Model revision (text only, no tools) | `server/chat.ts`, `mode: "autopilot"` |
| "Posts ready for review" health item (priority 3) | `src/app/agent-context/account-state.ts` |

Every write goes through `act("autopilot.*", …, { need: "content.write" })`, so the permission check is in the store, not in chat wording.

## Pipeline

`prepareBatch` runs in this order:

1. Read the strategy: frequency, pillars and voice examples.
2. Read existing posts and approved sources.
3. Generate candidates. Demo mode uses a deterministic library.
4. Run `runChecks` on each candidate, in this order:
   1. A confirmed preference applies → skipped.
   2. A claim isn't backed by an approved source → **factual issue**.
   3. Numbers that appear in no source → **factual issue**.
   4. Similarity of 0.7 or more to a recent post → **duplicate** (discarded and listed as skipped).
   5. Media isn't approved → **missing asset**.
   6. Length is out of bounds → **needs info**.
5. Assign a Smart Timing slot to each draft.
6. Only **ready** drafts go into the default review. Held drafts never block the others.

No model confidence score is used anywhere as authorization.

## Screens (in the panel)

- **A · Summary**
  - Shows "Your weekly content is prepared." with counts for ready, on hold and approved.
  - A compact list shows type, day and time, and status.
  - Buttons: **Review ready posts** (singular when there's only one) and **View held posts**.
  - When nothing is ready, it names the blocker.
- **Held:** each held draft with its reason.
- **B · Detail**
  - Shows text, type, media status, source, and the suggested time with its basis.
  - Buttons: **Approve**, **Not right**, **Edit in New Post**, Back.
  - There is no Publish button.
- **C · Not right**
  - Six reasons; one tap is enough.
  - An optional note. A typed or spoken message on this screen is also treated as the note.
  - Scope: **Apply to this post only** or **Suggest a preference for future content**.
- **D · Resolution** (`rejectDraft`)
  - One automatic revision. If the revision fails the checks, the draft is parked.
  - A second rejection stops revisions and offers **Replace idea** or **Skip it**.
  - *Incorrect information* blocks the draft and asks the creator. It never guesses.
  - *Not relevant* parks the draft without creating a rule.
- **E · Confirm**
  - Shows exactly which drafts are included, using checkboxes, which supports partial approval.
  - Lists excluded held items with their reasons.
  - Offers an optional timing rule.
  - The button names the action, for example **Approve 3 drafts**. Approving doesn't publish.
- **F · Complete**
  - **Save N approved drafts** turns them into real TopFan drafts (`status: "draft"`, linked by `extra.autopilotDraftId`).
  - The heading changes to "Your approved drafts have been saved." only after the store confirms it.
- **Preferences:** saved preferences (removable), posts per week, timing rule, and "Prepare next week (demo)".

## Rules that are enforced

- **Nothing publishes.** Native scheduling doesn't exist for regular posts (the New Post spec has none), so suggested times stay as proposals and the UI says so. Publishing happens only in New Post, behind its own confirmation.
- **Inactivity never approves.** Dismissing ("Not now") or ignoring a batch leaves every draft unpublished.
- **One notification per batch:** a compact card above the conversation (`AutopilotNotice`), derived from stored state so it survives reloads. Its ✕ dismisses the batch. It is never repeated per draft.
- **Preferences need explicit confirmation.** One unexplained rejection never creates a rule. A preference can be reviewed and removed, and the next batch respects it.
- **Manual edits win.** When the creator saves or publishes from New Post, `syncFromPosts` copies their version back and marks it *Your edit*. Later AI actions such as "Make my posts more personal" skip edited drafts. Saving replaces the linked draft post, so a post is never duplicated.
- **Missing assets are never fabricated.** The draft waits on *Needs a photo*. Others proceed.
- **Save failures:**
  - A failed save is marked *Failed*.
  - Before **Retry saving** runs, `readPublicationStatus` checks whether the post actually exists, so nothing is saved twice.
  - Demo trigger: `localStorage.setItem("tf-fail-save", "1")`.
- **Model revision:**
  - Runs only when a model is connected.
  - The server prompt allows approved facts only, returns text only, and can't call tools.
  - The browser re-runs `runChecks` on the result. If the revision fails or the model times out, the deterministic library is used instead.

## Commands (typed or spoken)

Commands are handled deterministically before any model call:

- Review my posts / What's ready this week? / Show my content plan
- Approve the good ones / Approve the remaining posts (opens the confirmation; doesn't approve)
- I don't like this draft, Skip this one, Make it shorter, Try something different
- Don't use this tone again (asks to confirm a preference)
- Make my posts more personal
- Use better times
- Pause / resume content preparation
- Change my posting frequency
- Stop for now

## Demo batch

| Draft | Starts as | Purpose |
|---|---|---|
| Training update (text) | Ready | Easy approval; manual-edit scenario |
| Which trick next? (poll) | Ready | Easy approval |
| Monday motivation (text) | Ready | Generic, meant to be rejected; revises to a fan-question idea |
| Photos from the shoot (image) | Missing image | Missing-asset scenario |
| "Thank you" repeat | Discarded | Duplicate of a recent post |

All content is fictional demo data.

## Tests

The test script is `tests/e2e/autopilot.mjs` (run it with `node tests/e2e/autopilot.mjs [1512|1126]` while the dev server runs). It covers scenarios A–G plus the following:

- the spoken or typed rejection note
- save failure and retry
- refresh persistence
- pause
- a Content delegate approving

It passes at 1512×805 and 1126×797.

## Media states

Each draft that needs media shows a preview with one of four states:

- **Attached:** the creator's own media is on the draft.
- **Suggested:** an approved library item matches what the draft asked for. The creator still approves the draft.
- **Missing:** the requested item isn't in the library. The draft shows "No photo yet" and is held. Nothing is substituted.
- **Unapproved:** the item exists but isn't approved for posting yet. The draft is held.

By default every requested item is in the library and approved, so the batch is complete: 4 ready and 0 on hold. Two URL fixtures show the other states:

- `?apFixture=missing-asset` (scenario C)
- `?apFixture=unapproved-asset` (scenario C2)

Add `&resetMock=1` so the fixture applies to a fresh batch. Approved media goes into the published post. The library uses the same files as the rest of the demo (see `docs/media-coverage.md`).

## Known limits

- Candidates come from a fixed demo library. A real system would generate them from the same approved sources.
- Engagement history comes from the mock posts' likes, comments and views. Timing is a suggestion, never a reach promise.
- "I've added the photo (demo)" and "Approve this photo (demo)" stand in for adding or approving an asset in a real media library.
- Every pack role, including both delegate types, has Content access, so any role can approve. The no-access note only appears if a future role lacks `content.write`.
