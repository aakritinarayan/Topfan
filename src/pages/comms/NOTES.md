# Comms area notes (Activity, Messages, Resources, Help & legal, header menus)

## Routes
| id | URL | status | notes |
|---|---|---|---|
| activity | /dashboard/activity | captured (12, 12a, 12x) | bleed layout; UNREAD tab default; skeleton while loading |
| messages | /messages | captured (13*) | all tabs/modals on one URL; `?tab=automated` opens the automated tab (inferred convenience) |
| resources | /resources | captured | redirects to announcements |
| resources-announcements | /resources/announcements | captured (17) | |
| resources-guides | /resources/tips-tutorials | captured (17a) | |
| resources-providers | /resources/service-providers | captured (17b) | |
| resources-support | /resources/creator-support | captured (17c) | |
| help-faq | /help-faq | captured (72, 72a) | layout changed to `public` (no sidebar, per spec) |
| terms | /terms-of-service | captured (73) | `public` layout; SAMPLE text |
| privacy-policy | /privacy-policy | captured (74) | `public` layout; SAMPLE text |

Header menus: `LanguageMenu`, `AvatarMenu` in `HeaderMenus.tsx` (export names and test ids kept).

## Store actions (src/store/slices/comms.ts)
Activity: `markActivityRead`, `markAllActivityRead`, `followBack`.
Messages: `markConversationRead`, `startConversation`, `sendDirectMessage` (content.write), `sendToMessageList` (content.write, Confirm tier in UI),
`createMessageList` (content.write), `deleteMessageList` (content.write), `saveFanNotes` (content.write), `listRecipientCount`, `previewOf`.
Automated: `saveAutomatedMessage`, `updateAutomatedMessage`, `toggleAutomatedMessage`, `deleteAutomatedMessage` (all content.write; save/update are Confirm tier).
Resources/help: `markAnnouncementRead`, `submitSupportRequest`.
Header: `setLanguage`, `signOut`, `signIn`.
Constants: `RECIPIENT_SEGMENTS`, `AUTOMATED_EVENT_TYPES`, `INQUIRY_TYPES`, `LANGUAGES`.
Contract fields kept: `announcements` (extended with likes/comments/ago/tint), `automatedMessages` (empty by default), `unreadMessages` (= unread conversations, seeded 1, kept in sync by the message actions).

Risk tiers: 1:1 text/media/store/coupon sends go straight through (need content.write). Paid media and Message List broadcasts open a Confirm modal first. Automated message SAVE opens a Confirm ("Activate") modal.

## Source behaviour reproduced (known issues)
- Messages auto-opens the first Priority conversation on load without marking it read (sidebar badge stays 1, as captured). Clicking the row marks it read.
- Escape does NOT close the language or avatar menus (outside click / trigger does).
- Fan Recruitment lists the fan himself as one of his own recruits (as captured).
- Guide title typo "Driving Users To TopFans" kept.
- Recipient count shown as "1 Recipients" (no singular).

## Inferred (marked `// inferred:` in code)
- Activity: row click marks read; FOLLOW → "FOLLOWING"; empty UNREAD state copy.
- Messages: chat header for a Message List; list kebab menu (Open / Delete List + confirm); "Step 2 of 2: Name Your List"; paid media, store item and coupon modals; emoji picker; mic records a mock voice note (click again to send); camera keeps the file name only; Fan Info for fans without seeded details shows "-"; Badges/Groups ✎ link to Preferences › Gamification Badges / Groups; Fan Notes ✎ edits inline.
- Automated: populated list (event, text, Active toggle, edit, delete); price tag opens an inline price field; validation messages.
- Resources: card/provider detail modals; illustration stand-ins are tinted gradient panels (no pack images); FAQ answers 2–6 are sample text.
- Help: FAQ answers 2–7 are sample text; "We are here to Help" opens a Contact Us modal reusing the support form.
- Legal: privacy headings 3–5 inferred; all body copy is sample text with a visible "Sample text" notice.
- Header: language choice is stored (red current item) but UI copy stays English (toast says so); signed-out header shows a "Sign In" pill.

## Data
All fans, messages, businesses (e.g. "Summit Thread Co.", "Studio North Productions") and fan details are invented; emails use example.com, phone 555-01xx. No names or message text from specs 12/13 were copied.

## Open questions / for other owners
- Sign Out navigates to `/` (Home, owned by Social), which has no app header, so the "Sign In" pill is only visible on pages with the header. Home could read `d.comms.signedOut` and call `signIn(d)` for its own logged-out state.
- `useData` caches per store version, so selectors that close over props/state go stale until the next write (hit in Fan Info; fixed locally by selecting whole collections). Worth a note in the store docs.
- BleedLayout is not centred at 1512 (spec 13 says the whole app is a centred 1280 container at 1512); at 1126 it matches.
- The shared `Button`/`Select` use rem sizes (`h-10` = 35px at the 14px root), so pills are ~35px instead of 40px. Comms-owned components use px values.
- Activity skeleton in the source also skeletons the sidebar and hides the header avatar (12x); the sidebar/header are Shell-owned, so only the list skeleton is reproduced.
- Old localStorage from before this build keeps the previous comms values; use `?resetMock=1` once.
