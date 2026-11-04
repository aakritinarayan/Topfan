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
- **There is no image backend.** "Generate" shows two pre-made sample photos (licensed landscapes, graded per direction), labelled *simulated* and *not photos of you*. Revisions available: darker, wider with space for text, minimal, cinematic. Other edits (such as removing a background) are declined.
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

## Ideas → full drafts (posts, experiences, newsletters)

**Code:**
- `src/store/slices/ideas.ts` holds:
  - the idea sets: 3–4 per round and 2 rounds per kind, so "more ideas" gives different concepts;
  - `draftFromIdea` (a full draft with a cover image);
  - the shared `imageOptions` pool per content type;
  - the refinements `premium`, `strongerCta`, `changeExperienceType` and `shortenDraft`.
- The flows live in `ContentAgent.tsx`: `ideas`, `pickIdea`, `moreImages`, `refined`, `retype` and `promoteBoth`.
- Routing:
  - Open-ended requests show ideas: "help me create a post / plan an experience / create a newsletter", "… ideas".
  - Follow-ups use the remembered list or the focused draft: "more ideas", "use the second option", "make it more premium", "add a stronger CTA", "generate another image", "change it to a one-to-one call", "create a post and newsletter to promote this", "use this for my newsletter", "continue editing my previous draft".

**Grounding:** every idea is built from the creator's approved sources (training notes, trick list, fan questions, recent posts, live offerings).
- Unknowns stay in `[brackets]` or are listed as needs: price, availability, address, custom instructions.
- Nothing invents news, dates, prices, bookings or achievements.

**Forms:**
- Create Experiences gets type, title, description, duration (scheduled types), the price once the creator gives it, and the preview image, and it starts **Disabled**.
- New Newsletter gets the subject, a headed body (`newsletter.html`, sanitised by the editor) and the cover image. Email verification still blocks sending.
- New Post gets the caption and the attached image.

**Images:**
- Pre-made sample photos, labelled simulated. Each pool matches its screen's rules: posts ≥1080 px wide; newsletter images over 450×200.
- "Generate another image" rotates through the pool and never re-offers the current or a rejected image.

**Safety:**
- Picking a different idea keeps earlier drafts; picking the same idea reopens its draft.
- Text the creator edited on the page is never rewritten. The refinements refuse and offer a new version instead.

**Test:** `tests/e2e/content-ideas.mjs` covers the five scenarios (post, experience, newsletter, connected tasks, demo separation), plus follow-ups, edit protection and refresh.
