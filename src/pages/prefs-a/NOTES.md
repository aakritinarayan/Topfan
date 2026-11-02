# Preferences A — notes (specs 30–38)

## Routes built
| id | URL | status |
|---|---|---|
| pref-profile | /edit-preference | captured (30, 30a–e) |
| pref-welcome | /edit-preference/edit-welcome-message | captured (31, 31a skeleton) |
| pref-interests | /edit-preference/edit-content | captured (32) |
| pref-creator-type | /edit-preference/edit-creator | captured (33, 33a modal) |
| pref-customer-support | /edit-preference/customer-support | captured (34) |
| pref-notifications | /edit-preference/notifications | captured (35, 35a skeleton) |
| pref-nft-wallet | /edit-preference/connect-nft-wallet | captured (36) |
| pref-monetization | /edit-preference/monetization | captured (37, 37a, 37b) |
| pref-privacy | /edit-preference/privacy | captured (38, 38a, 38b) |
| pref-blocked-users | /edit-preference/privacy/blocked-users | **inferred** (new route, parent pref-privacy) |

## Store actions (src/store/slices/prefsA.ts)
- `updateProfile(d, profile & {displayName})`: saves the profile form; writes `account.name` / `account.firstName`.
- `changeEmail(d, email)`: email pencil (simulated, no verification email).
- `updateWelcomeMessage(d, {enabled, hasVideo, text, videoFileName?})`: Welcome Message UPDATE (max 200 chars).
- `setInterests(d, list)`: Interests UPDATE.
- `setCreatorTypes(d, types)` (+ helper `newCreatorType`): Creator Type SUBMIT; first type → `account.creatorCategory`.
- `setSupportEmails(d, map)`: Customer Support SAVE CHANGES.
- `setPostNotification(d, row, "checked"|"on", v)`: post-activity checkbox / toggle.
- `setCreatorNotification(d, creatorId, channel, on)`: one cell of the creator matrix.
- `resyncWallet(d)`: records a simulated resync.
- `unlinkWallet(d)`: Protected; sets `integrations.metamaskLinked = false`.
- `linkWallet(d)`: inferred reconnect (simulated).
- `setMonetizationFlag(d, key, v)`: monetization toggles.
- `setDmPrice(d, price)`: Confirm tier; min $1.00.
- `setPrivacyFlag(d, key, v)`: Audience & Visibility toggles.
- `setSharing(d, creatorId, on)`: sharing my info with one creator.
- `unblockUser(d, id)`: Blocked Users › Unblock.
- `setCalendarLinked(d, linked)`: Unlink Calendar / re-link.
- `setSignInMethod(d, method, on)`: Activate or disconnect a method (keeps at least one active).
- `changePassword(d)`: Protected; stores only `passwordChangedAt`.
- `pauseAccount` / `reactivateAccount`: Protected pause and its undo (flag only).
- `requestAccountDeletion` / `cancelAccountDeletion`: Protected delete request and its undo (flag only).
- Helpers: `passwordProblems`, `isEmail`, `maskWallet`; catalogues `INTERESTS`, `CREATOR_CATEGORIES`, `CREATOR_QUESTIONS`, `SUPPORT_INQUIRIES`, `TOPFAN_HANDLED`, `DM_PRICE_PRESETS`.

Permissions: profile, email, creator type, customer support, wallet, privacy, password, pause/delete and sign-in use `account.admin`. Tips, DM price and guaranteed reply use `finance.write`. Subscriber-only toggles, interests and the welcome message use `content.write`. Notification toggles and sharing have no capability check (they are personal settings).

## Source bugs and quirks reproduced
- Creator Type edit modal: the current answer is not pre-highlighted when it opens (33a).
- Birthday datepicker year view: every 4th column is drawn in red text (30e).
- Phone dial-code list: Escape does not close it (only the toggle, a pick or an outside click). Its fixed 417px width can overflow the viewport at 1126 (the source's ~12px horizontal scroll).
- Copy typos are kept as captured: "allow you receive notification", "permission to able to see", "If you need change your legal name".

## Inferred items (marked `// inferred:` in code)
- Blocked Users list page, its empty state and the Unblock confirm.
- Pause Account: only the title "Warning!", "Enter Password *", Cancel and PAUSE TEMPORARILY are from the source; the body copy is mine. Also the paused banner, the REACTIVATE flow and the "Paused" chip.
- Delete Account: **placeholder copy**. Typed `DELETE` plus a password, the deletion-requested banner and CANCEL DELETION (undo).
- Pause/Delete info popover copy (not captured).
- Change password: a confirm step, then the "Password Reset Complete" modal (that copy is from the DOM). "Sign In" only closes the modal. Validation messages are inferred.
- Unlink Wallet: title "Unlink Wallet" and the password field are added. The question plus No/Yes come from the DOM. Also the unlinked state with CONNECT METAMASK WALLET.
- Unlink Calendar confirm modal, the "Not Linked" state and Link Calendar.
- Sign-in: disconnecting an Active method opens a confirm (or the "two methods" notice). Activate flips the flag (no OAuth).
- DM price: a Confirm step inside the price modal (BACK / CONFIRM).
- Change Email modal (from the email pencil).
- Add Another Category Type wizard. The categories and prompt come from the build prompt. Follow-up questions for every category except Athletes Q1 are inferred, as is the last-step label "Save".
- Welcome video empty / upload state. Every "… updated" toast copy. The city option lists and free-text state outside the US.
- Customer Support: removing a chip (× on hover), email validation and the rule of at least one email per row.

## Fictional data / deviations
- Profile values (legal name "Andrew White", aj.white@example.com, (555) 010-2468, birthday Feb 9 1996, address) are fictional. Location and bio come from `config/demo.ts`.
- Followed / sharing creators and blocked users are made-up names (the screenshot names were not copied).
- Images are neutral placeholders. The MetaMask tile is a 🦊 emoji on a brown tile, Google is a "G" glyph and Google Calendar is a lucide icon.
- Uploads (cover, avatar, welcome video) keep only the file name and preview in-session through an object URL. `account.avatar` is not written, because an object URL would break after a reload.

## Open questions
- DM price: the contract default is `dmPrice: 5` but the capture shows $1.00. I kept 5 because other areas may read it.
- Should the paused or deletion-requested state show anywhere outside Privacy, such as a shell banner? Today it shows only on the Privacy tab.
- Should delegates see the CREATOR-access tabs (Welcome, Interests)? Routes allow it; writes are capability-checked.

## Verification
- `tsc` is clean for prefs-a, slices/prefsA.ts and routes/prefsA.ts.
- All 10 routes were screenshotted at 1512×805 and spot-checked at 1126×797 against the reference PNGs. No console errors or page errors from these pages.
- An interaction script ran the main flows successfully: datepicker, dial list, creator edit / add wizard + SUBMIT, DM price confirm ($5→$10), guaranteed-reply modal, unlink wallet (Protected) + reconnect, pause → reactivate, delete → cancel, password change → "Password Reset Complete", unblock, and support email add.
- Outside my files: at a 1126px viewport the shell's layout is 1280px wide on every route (including /feed), so the page scrolls horizontally. That belongs to the shell/core owner.
