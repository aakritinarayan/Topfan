# Demo 2: intent-driven content creation (how it works)

Link: `/demo/ai-content`. Demo 1 (`/demo/setup-navigation`) is separate: it has its own storage, conversation and tasks, and it never shows these workflows.

The creator says what they want. The assistant prepares **work items**: posts, newsletters, experiences, and a weekly plan that links them. It then hands each item to the **existing TopFan screen**, and that screen is where anything is saved, sent, published or activated. The assistant prepares; the creator decides.

## Files

| File | Role |
|---|---|
| `src/store/slices/content.ts` | The work-item model and every rule. All changes go through `act()`, and a refused action throws `Refused`, so nothing changes. |
| `src/assistant/platform/ContentAgent.tsx` | Request routing, cards (`WorkCard`, `WeekCard`), and the image, audience, newsletter, experience and week flows. Mounted only on the Demo 2 link. |
| `src/store/refused.ts`, `store.tsx` | `act()` turns `throw new Refused(msg)` into `{ok:false, reason}` and emits a failed event. |
| `src/store/slices/monetize.ts` | `sendNewsletter`/`scheduleNewsletter` are refused unless outbound email is **verified**. This is enforced at the service layer, not by chat wording. |
| `src/pages/social/NewPost.tsx` | `?work=<id>` prefills type, text, poll, Lock and price, and files. Edits sync back (marked "Edited by you"). Save and Publish link the item. |
| `src/pages/monetize/forms/NewsletterForm.tsx` | `?work=` prefills title, body, lock, audience, plans and image. Edits sync back. Save, send and schedule link the item. |
| `src/pages/monetize/forms/ProductForm.tsx` | Add Experience `?work=` prefills type, title, description, price and image. It **starts Disabled**, and Save links the item. |
| `src/assistant/platform/pageGuide.ts` | Demo 2 page intros and actions (New Post, Newsletters, Experiences, Subscriptions, Feed), plus "Continue my …". |
| `src/assistant/platform/TaskCard.tsx` | The Feed welcome: "What would you like to create?", 3 ideas plus "More ideas". |
| `scripts/media/generate-ai-visuals.mjs` | Original illustrations used for **simulated** image generation (no people, no logos). |
| `tests/e2e/content-agent.mjs` | The 7 scenarios and the cross-feature checks. |

## Routing (deterministic)

The order in ChatEngine `ask()` is: other-demo requests → cover page (Demo 1) → `handleContentRequest` → Content Autopilot commands → model or offline. Inside the content router:

1. A price the assistant just asked for ("75", "$12", "free").
2. "Continue my newsletter / post / experience".
3. Week edits: move, remove, shorter, another image, a tier for the exclusive post, approve, pause, continue.
4. "I don't want to plan this every week" → Content Autopilot preferences.
5. Teaser, announcement, image revisions, image requests, audience changes, "shorter".
6. Page-guide phrases (recipients, plans, membership access, performance, required details).
7. A whole week ("entire week", "busy this week", or 3+ kinds of work in one request).
8. Newsletter, then experience/session, then post.

"Plan my content" and "Plan my week" still open the existing Content Autopilot plan.

The model never chooses a route or an action. Every action is a fixed function in `content.ts`.

## States (kept distinct)

Each work item has one of these statuses:

- `draft`
- `approved` (reviewed in the assistant; nothing is live)
- `needs-input`
- `review` / flags
- `blocked` (for example, unverified email)
- `saved` (saved in TopFan)
- `published`, `sent`, `active` (set only by the original screen's own button)
- `paused`, `cancelled`, `failed`

A suggested time is shown as "Suggested: …" and is never presented as scheduled.

## Honest platform limits

- **The post Lock is pay-to-unlock.** It can't restrict a post to one plan. A tier request is explained, and the creator gets three options: Lock with a price they set, a plan-only **newsletter** (newsletters do support plans), or keep it as a draft.
- **Missing plans** get the exact message: "I couldn't find a Platinum membership in your current plans." The options are the existing plans, Set up that membership, or Keep as draft.
- **Broadening visibility** (locked → public) always asks first.
- **Email sending is not verified** in the mock account. Newsletters can be saved as drafts. Send and schedule are refused by the service, and the assistant reports it.
- **Experiences have no date or capacity fields.** Fans request a booking and the creator confirms it. A ticketed date belongs in Events & Ticketing, and the assistant asks which one the creator means.
- **There is no image backend.** "Generate" shows two original pre-made illustrations, labelled *simulated* and *not photos of you*. Revisions available: darker, wider with space for text, minimal, cinematic. Other edits (such as removing a background) are declined.
- **There is no post scheduling** in TopFan, and the assistant never claims a post is scheduled.
- Drafts use only the creator's notes, tricks and posts. Unknown details stay in `[brackets]` or appear as a "needs" line. The assistant doesn't invent results, sponsors, prices, dates or engagement numbers.

## Reset

Use `/demo/ai-content?resetMock=1`, or the app's Reset button. This clears the Demo 2 mock store, including work items. Demo 1's data and any real account data are never touched.

## Smart Link in Bio

Pages: `/edit-preference/link-in-bio` (view) and `/edit-preference/link-in-bio/add-link-in-bio` (the editor). The spec's `/link-in-bio` routes don't exist in this app.

**Code:**
- `src/store/slices/bio.ts` holds candidates, checks, proposals, `applyBio` and `bioSaved`.
- `src/assistant/platform/BioFlows.tsx` holds the flows and the compact review list.
- The editor reads `?work=<id>` and applies the selected changes to its own draft. The creator saves with **Save Changes** and its "Publish Link In Bio" confirmation. The assistant then reads the saved page back and reports what actually landed.

**Destinations come only from existing data:**

| Destination | Shown as | Check |
|---|---|---|
| Experience booking page (`/:handle/store/:id/book`) | "Book My Training Session", … | Verified against the Store: exists and enabled |
| Course page | "Take My Snowboarding Course" | Verified |
| Creator page, where fans subscribe | "Become a Member" | Verified (there is no separate membership page) |
| Store / Newsletters pages | "Shop My Boards" / "Read My Newsletters" | Verified (TopFan has no newsletter signup form, and the assistant says so) |
| Public post | "See My Latest Post" | Verified, and only if public; locked posts are never linked |
| Website and social links from setup | "Visit My Website", "Follow My Journey on Instagram" | Fictional fixture labelled *simulated*. Format is checked; the link is never visited. |

**Flows:**

| Flow | What the assistant does |
|---|---|
| Set up my links | Proposes the destinations above, skipping ones already present. The creator can include/exclude, rename and reorder before saving. |
| Promote an offering | Finds the experience. If it isn't live, keeps a pending proposal with no URL, and fills in the real booking link once the experience is saved and enabled. |
| Improve existing links | Proposes clearer titles, removes duplicates, replaces removed offerings, and adds a missing membership link. Each change can be approved separately. |
| Check if my links are still relevant | Checks deterministically against store data. |
| Goal prioritisation | Handles requests like more subscribers, courses, newsletter readers, or the latest post. If nothing fits the goal, it says so. |
| Add this to my Link in Bio | Uses the experience or announcement in the current conversation, and asks when it's unclear. |
| Follow-up offers | Offers a Link in Bio update after an experience, course, plan, newsletter draft or public post is saved on its own screen. |
| Week plans | A week plan that mentions promotion gets a linked, pending Link in Bio update. If the experience is removed, the update is flagged. |

**Additions (agentic Link in Bio):**
- Flow A starts with an explanation and **Prepare my links** / **I'll do it myself**; review rows show priority, availability and the full destination.
- Links become the editor's own NEW ACTION types: experience bookings and courses → Specific Store Item, posts → Feed Content, events → Event Ticketing, everything else → External Action Item.
- "Add my social profiles" restores missing Social Media Links icons first, otherwise offers buttons. "Suggest a short bio / colours" reuses the profile bio and the website's brand palette (editor draft only).
- Ended events are replaced with the next event; destinations are re-checked when the editor opens; **Save for later** pauses an update and "Continue my Link in Bio" resumes it.
- "Plan my week and help promote my upcoming experience" creates the announcement, members-only post, newsletter, experience and a dependent Link in Bio update. Renaming or moving the experience flags the dependents for review.
- Tests: `tests/e2e/link-in-bio-agentic.mjs`.

**Service-layer rules:**
- `saveLinkInBio` refuses invalid URLs.
- `?bioFixture=save-fail` makes the next save fail once, to demonstrate recovery: the draft stays in the editor and the assistant offers Try again.

**Demo 2 fixture links:** Demo 2 starts with four hand-added links (fictional): "Click Here", "Instagram", a duplicate "IG", and "Summer Park Camp 2026", which points to an offering that doesn't exist. Demo 1's Link in Bio is unchanged.
