# Social + public entry — build notes

## Routes (src/app/routes/social.ts)
| id | pattern | layout | status |
|---|---|---|---|
| home | `/` | marketing (page renders its own 78px header + footer) | captured (10) |
| newpost | `/dashboard/newpost` | narrow (850) | captured (18) |
| feed | `/:handle` | **dashboard** (changed from "public": spec 11 and the shots show the creator shell with the sticky sidebar) | captured (11) |
| post-detail | `/:handle/post/:postId` (`?edit=1` = Edit Post) | dashboard | inferred |
| chat-room | `/:handle/chat-room` | dashboard | inferred |
| leaderboards | `/:handle/leaderboards` | dashboard | inferred |

Specificity: the three inferred routes have a static segment, so they outrank the `/:handle` catch-all; `/:handle/post/:postId` (104) does not collide with `/:handle/store/:productId`. An unknown handle on `/:handle` renders a small "Page not found" (inferred).

Overlays (src/pages/social/Overlays.tsx, via `useOverlay`): `livestream` (P19), `welcome` (P80), `sign-in` / `join` (inferred). No new overlay ids were needed.

## Files
`Home.tsx`, `Feed.tsx`, `NewPost.tsx`, `PublicPages.tsx` (post / chat room / leaderboards), `Overlays.tsx`, `AuthHeader.tsx` (logged-out header actions), `shared.tsx` (PostCard, SocialModal, ConfirmDialog, RoundCheck, helpers).

## Store actions (src/store/slices/social.ts)
`publishPost` (returns id; `status: "draft"` for Save as Draft), `deletePost`, `togglePin`, `editPostText`, `toggleLike`, `votePoll`, `saveArticleDraft`, `startLivestream`, `endLivestream`, `sendChatMessage`, `addComment`, `joinNewsletter`, `setFanView` (dev mock auth). Selector `publishedPosts`, helper `extraOf`.
Permission use: publish / draft / delete / pin / edit / article auto-save / go live / end live / creator chat → `need: "content.write"`. Likes, votes, comments, newsletter sign-up, mock auth → no capability (fan actions).
Risk tiers: PUBLISH NOW → confirm modal before `act`; Delete Post → confirm modal; Go Live → confirm step inside the Livestream modal. Failed `act` shows `res.reason` and no success toast.

Slice fields added: `likedByMe`, `pinnedPostId`, `articleDraft`, `livestream`, `showcase` (featured store items for the Feed rail and Home merch grid), `chatRoom`, `postComments`, `leaderboard`, `newsletterSignups`. Post per-type data lives in `Post.extra` (typed as `PostExtra`; downloadable posts are `type: "images"` + `extra.variant: "downloadable"` because `PostType` has no downloadable; the welcome video is `extra.variant: "welcome"` and pinned).

Cross-slice reads (read-only): `monetize.plans` (VIEW SUBSCRIPTION PLANS modal), `monetize.events` (Feed countdown, Home Upcoming Events), `prefsB.topicTags` / `prefsB.groups` (New Post selectors), `prefsA.profile.location/bio` (profile card), `INTERESTS` from prefsA. Cross-slice write: `setFanView` writes `account.session.fanView` (the field core declared for the demo session).

Seed migration: the store merges slices shallowly, so browsers that saved the old empty `social.posts` would show an empty Feed. `SocialOverlays` re-seeds posts once when `posts` is empty and the default `likedByMe` ids are present.

## Dev-only mock auth
`?mockAuth=logged-out | fan | creator` on any URL sets `account.session.fanView` (persisted; no visible switch). Sign In / Join modals accept any input, are labelled "Demo sign-in: any details work", and only flip `fanView` to `fan`.

## Known source bugs / quirks reproduced
- Home Experience card title "hared With Community" (typo kept).
- Home "About" paragraph: missing space in "digital space.The platform".
- Footer "Learn More › Welcome" is a plain link to the Feed, while the header "Welcome" opens the modal.
- Feed rail extends past the 1126px viewport in the source; here the body min-width (1280) keeps it visible.
- "Million Views on You Tube" label kept as captured (number shown is not millions).

## Inferred items (marked `// inferred:` in code)
- New Post: DISABLE/ENABLE meaning (stored as `extra.featureEnabled`; defaults ENABLE for Video/Images as captured), Lock panel (unlock price), Collaborate panel (usernames), Select Interests picker, publish-options menu (Save as Draft), publish confirm copy, required-field rules, Topic Tags/Groups selector placement (hidden until ≥2 active tags / ≥1 active group, matching the captured empty state), media-embed toolbar buttons (toast).
- Feed: post kebab actions (pin toggles, edit → post page `?edit=1`, delete confirm), Share = copy link, plans modal, empty filter state, chip targets for VIP Deals / Newsletters (→ store) and the social-media tile, "No upcoming events" handling (countdown hidden when there is no upcoming event).
- Livestream live state + End Livestream; Welcome video is a placeholder that auto-closes after 10s (disabled with `?noDelay=1`).
- Logged-out header (globe + SIGN IN + JOIN), sign-in/join modals, single post page with comments, Chat Room, Leaderboards.
- Home: hero CTA target (logged-out → Join, else Feed), newsletter email validation copy; brand/person names in the captured cover content replaced with fictional ones (Glacier Hydration, Northpeak Outfitters, fictional boards and episodes); free-form copy paraphrased.

## Open questions / hand-offs
- **Core (Shell.tsx):** the dashboard header always shows globe + avatar. For the logged-out variant on Feed and other public pages, render `LoggedOutHeaderActions` (or `HeaderActions`) from `src/pages/social/AuthHeader.tsx` when `account.session.fanView === "logged-out"`. AvatarMenu "Sign Out" (comms) could call `openOverlay` / `setFanView(d, "logged-out")`.
- **Monetize:** `events` is seeded empty, so the Feed countdown card and Home event rows don't show. Home merch / Feed rail use `social.showcase` until Monetize exposes store items; switch to those when available. Videos links use `portfolioId/seriesId = "competition-videos"` — align with the public videos pages when built.
- What DISABLE/ENABLE controls on New Post (assumed: turns the post type on/off).
- Whether Chat Room / Leaderboards / single post use the creator shell or the public layout for fans.
