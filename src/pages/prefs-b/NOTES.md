# Preferences B — build notes (tabs 11–16)

Specs 51–56, screenshots 51*–56*. All data is fictional. Verified with typecheck, puppeteer screenshots at
1512×805 (spot-checked at 1126×797) and scripted click-through flows. No console errors in my routes.

## Routes built

| id | URL | status |
|---|---|---|
| pref-outbound-emails | /edit-preference/outbound-emails | captured (failed state + skeleton); setup / DNS records / verifying / verified states inferred from bundle copy |
| pref-link-in-bio | /edit-preference/link-in-bio | captured |
| pref-link-in-bio-edit | /edit-preference/link-in-bio/add-link-in-bio | captured (edit mode, NEW ACTION menu, Colors & Themes popover) |
| pref-delegation | /edit-preference/delegation/delegation-view | captured (list + filter) |
| pref-delegate-details | /edit-preference/delegation/delegate-details?id=… | captured layout; `?id=` inferred (live app keeps the id in state) |
| pref-delegate-add | /edit-preference/delegation/add-delegate | inferred (step 1 from the brief, step 2 inferred) |
| pref-topic-tags | /edit-preference/topic-tags | captured (empty state); list once tags exist inferred |
| pref-topic-tags-add | /edit-preference/topic-tags/add | captured |
| pref-topic-tags-edit | /edit-preference/topic-tags/edit?id=… | **new**, inferred (bundle names the "Edit Topic Tag" view) |
| pref-groups | /edit-preference/groups | captured (empty state); list + sub-settings inferred |
| pref-groups-add | /edit-preference/groups/add | captured |
| pref-groups-edit | /edit-preference/groups/edit?id=… | **new**, inferred |
| pref-gamification | /edit-preference/gamification/earn-points | captured |
| pref-gamification-buy | /edit-preference/gamification/buy-points | captured |
| pref-gamification-badges | /edit-preference/gamification/badges | captured |

Files: `index.tsx` (page map), `ui.tsx` (InfoPop, EnableToggle, Pill/PlainButton/Field px-size wrappers,
Confirm/Protected modals, StatusSwitch, useWrite), `OutboundEmails.tsx`, `LinkInBio.tsx`, `Delegation.tsx`,
`TagsGroups.tsx`, `Gamification.tsx`.

## Store actions (src/store/slices/prefsB.ts)

Contract fields kept: `groups`, `topicTags` (now `TopicTagRecord` = TopicTag + optional `description`), `delegates`, `outboundEmail`.
Added: `delegateLastSession`, `groupRestrictions`, `linkInBio`, `gamification`, `outboundFlow`.

| action | need | what it does |
|---|---|---|
| addTopicTag(d, {name, description}) | content.write | create an active Topic Tag, returns id |
| updateTopicTag(d, id, patch) | content.write | rename / describe / toggle active |
| deleteTopicTag(d, id) | content.write | delete (after "Delete Topic Tag" confirm) |
| topicTagsActive(d) | — | true when ≥ 2 active tags (feature on) |
| validateTitle(title) | — | shared Title rule: required, 2–20 chars |
| addGroup / updateGroup / deleteGroup | content.write | same as tags, for Groups |
| setGroupRestriction(d, "chatRoom"\|"directMessages", on) | content.write | inferred Group sub-settings |
| addDelegate(d, NewDelegate) | account.admin | invite (status Pending); UI: Content = Confirm, Financial = Protected (type the email) |
| updateDelegateAccess(d, id, access, share) | account.admin | change access / revenue share; same tiers |
| removeDelegate(d, id) | account.admin | status → Inactive (shown as "Removed") |
| resetOutboundEmail(d) | account.admin | SETUP AGAIN after "Reset Email Configuration" confirm → domain choice |
| setOutboundDomain(d, domain) | account.admin | Protected (typed domain): new example records, DNS step |
| markOutboundRecordsAdded(d, bool) | account.admin | mock-only "I've added these records" |
| startOutboundVerification(d) | account.admin | VERIFY OUTBOUND EMAIL SETTINGS → pending ("Verifying Your Domain...") |
| recheckOutboundEmail(d) | account.admin | simulated check: verified only if records marked added, else failed (both steps Failed) |
| deleteOutboundEmail(d) / setOutboundPhase(d, phase) | account.admin | delete configuration / move between flow screens |
| exampleOutboundRecords(domain) | — | example-only DNS records (never real values) |
| setLinkInBioEnabled / setLinkInBioReferral | content.write | DISABLE·ENABLE, referral switch |
| saveLinkInBio(d, {palette, customPalette, theme, actions}) | content.write | SAVE CHANGES (behind a Confirm "Publish" modal) |
| makeBioAction(kind, title, extra) | — | builds a card for NEW ACTION (pure) |
| saveEarnPoints / saveBuyPoints / saveBadges | content.write | gamification SAVE CHANGES per tab |

Default state reproduced: Outbound Email FAILED (both steps Failed), 4 fictional delegates in the captured
type order (Content; Financial, Content; Content; Financial, Content), no Topic Tags, no Groups (empty states).

## Known source bugs / quirks reproduced
- Link In Bio popover says "While Label Site URL".
- Groups popover: "This feature allow you create…", "can be resorted to Groups", and refers to "sub-settings below" that don't render with no groups.
- Topic Tags empty card sits 24px under the header, Groups' 16px (inconsistent spacing kept).
- Delegation shows last sessions in IST (the account's timezone) — kept.
- Badge "New Fan" has 8 auto-assign points but is Inactive (seed kept as captured).
- Referral switch track is accent-outlined even when off (as captured).

## Inferred items (marked `// inferred:` in code)
- Add Delegate step 2 (access radios + per-stream revenue share, shown only for Financial), invite toast, delegate edit-access modal (pencil), remove confirm (trash), CSV contents (local Blob, $0.00 months), year options 2026/2025.
- Delegate status filter: model has Active/Pending/Inactive; Removed = Inactive, Declined matches nothing.
- Outbound Email: layout of setup / DNS records / verifying / verified states, domain options (mail./news./custom sub-domain of the WLS domain), the "I've added these records" mock checkbox + "Demo: verification here is simulated. No real DNS lookup is made." note, Delete Configuration button + body copy, Protected "Change Outbound Email Domain" modal, badge colours for in-progress / verified.
- Topic Tags / Groups list layout (Title, Description, Topic Tag Engagement / Members, Status, Action), edit views, Group delete copy, Group Restrictions sub-settings, "at least two tags" note when < 2 active.
- Gamification: earn-points warning modal copy; DISABLE/ENABLE are part of each tab's draft (saved with SAVE CHANGES).
- Link In Bio: add-action modal fields, custom palette editor (native colour inputs), theme backgrounds in preview, camera buttons use local object URLs, social pencil links to Profile, loading skeleton, Confirm modal on SAVE CHANGES; palette 0 follows the creator's white-label theme.
- Protected modal pattern (typed confirmation) for Financial grants and DNS domain change.

## WLS gaps observed (src/platform/wls/**, not edited)
- Header trash ("Delete domain") has no action / Protected confirm.
- DELETE WHITE LABEL SITE (Domain Details modal) has no "Remove White Label Site" confirm.
- UPDATE & PUBLISH only toasts: no Confirm step and no store write; appearance/colour edits and the cover DISABLE/ENABLE are local state, not `account.theme` / `account.whiteLabel.coverEnabled`.
- Colour validation messages ("…cannot be the same as…") not implemented.
- Choosing "Standard Color Palettes" / "Standard Themes" doesn't show the palette / theme picker (Link In Bio's 12 palettes + 12 themes in `LIB_PALETTES` / `LIB_THEMES` are likely the same sets).
- "Add a Cover Page" empty state (+ SET UP COVER PAGE, "Delete Cover Page" confirm) missing.
- DESKTOP PREVIEW OF WHITE LABEL SITE has no action.
- No `data-testid`s on WLS controls.

## Open questions
- Shared primitives (Button, Input, text-sm…) are rem-based on a 14px root, so they render ~12px/35px instead of the measured 14px/40px. I used px wrappers in my area (`Pill`, `PlainButton`, `Field`); other areas may differ slightly.
- Should Link In Bio ENABLE/DISABLE and referral switch be Confirm tier (they change a public page immediately)? Currently direct writes like the WLS cover toggle.
- Should a Content delegate see Outbound Emails / Delegation at all? Routes are OWNER-only (shell blocks them); writes also need account.admin.
- Buy Points prices are display-only in the capture; if they become editable they need Confirm + finance.write.
- `localStorage` from an earlier session keeps the old delegate order until `?resetMock=1`.
