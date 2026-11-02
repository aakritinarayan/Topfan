# DESIGN_NOTES — TopFan Assistant POC

The design language below comes from the TopFan platform capture. The old onboarding screenshots supply flow, fields and wording only.

## 0. Source map (what was actually found)

The brief expects `/references/platform/`, `/references/onboarding-flow/`, `/references/content/`, `/references/brand/design-values.md` and `/docs/`. The real folder is laid out differently, so this is how I mapped it:

| Brief path | Actual path | Notes |
|---|---|---|
| `/references/platform/` | `References/topfan-reference/` (`REFERENCE.md`, `pages/*.md`, 263 `screenshots/`) | Single source of truth for visual style. Captured from AJ White's live account on 2 Nov 2026 at 1126px and 1512px wide. |
| `/references/brand/design-values.md` | **Missing.** | I used the token block in `REFERENCE.md` instead. ⚠ FLAG |
| `/references/onboarding-flow/` | `References/Account Setup/` (11 PNGs, teal theme) | Used for flow, steps, fields and wording only. |
| `/references/content/` | **Missing.** | There are no standalone AJ photos or logo. The only imagery is inside screenshots. ⚠ FLAG (see §9) |
| `/docs/` | **Missing.** | `~/Documents/TopFan_Claude/` holds earlier requirement docs and prototypes. I did **not** treat them as a source. ⚠ FLAG |
| — | `References/_ref_extracted/` | A duplicate of `topfan-reference`. Ignored. |

Short codes used below: **REF** = `References/topfan-reference/REFERENCE.md`, **P50** = `pages/50-pref-white-label-site.md`, **P30** = `pages/30-pref-profile.md`, **P50f** = `pages/50f-wls-cover-page-editor.md`, **P10** = `pages/10-home.md`, **P75** = `pages/75-shell-overlays-other.md`, **OB** = `References/Account Setup/*`.

---

## 1. Color

TopFan is white-label: the creator's theme drives the colors through CSS variables (REF › Stack: "Keep that mechanism"). AJ White's theme is red on near-black. **The teal `#1de9b6` platform color is not used anywhere in AJ's dashboard.** It appears only in the old onboarding theme (OB), so it is dropped.

| Token | Hex | Use | Source |
|---|---|---|---|
| `bg` (`--configBgColor`) | `#191a1c` | Page background. Also inputs, selects and inner boxes that sit *inside* cards. | REF tokens; P30 inputs; P50 inner sections |
| `surface` (`--configSecondaryBgColor`) | `#272a2b` | Cards, inactive chips, modals, popovers, dropdown panels | REF tokens; P30 card; P50 modals |
| `surface-2` | `#3a3c3e` | Table dividers, drag-handle circles | P50f table |
| `search` | `#3a3d3f` | Search pills | `pages/13-messages.md`, `pages/17-resources.md` |
| `placeholder-img` | `#434344` | Empty image / cover placeholder | P30 cover banner |
| `accent` (`--configThemeColor`) | `#bc1111` | Primary buttons, active chip, logo, focus, checked radios, links, info icons | REF tokens; every capture |
| `accent-tint` | `rgba(188,17,17,.12–.15)` | Sidebar active and hover row | P75; `pages/11-feed.md` |
| `accent-tint-strong` | `rgba(188,17,17,.2)` | Empty-state icon circle | `pages/13-messages.md` |
| `text` | `#ffffff` | Primary text and button text | REF |
| `text-muted` | `#9f9f9f` | Secondary text and placeholders | REF `--theme-text-secondary` |
| `text-soft` | `#e0e0e0` / `#d0d0d0` | Table descriptions, empty-state text | P50f; `pages/13-messages.md` |
| `text-date` | `#b0b0b0` | Timestamps | `pages/12-activity.md` |
| `badge` / `danger` | `#d2006b` | Count badges and error text | REF `--theme-text-danger`; P75 |
| `toggle-off` | `#9198ab` | Toggle in the off state | REF component patterns |
| `border` | `rgba(255,255,255,.16)` | Hairlines | REF `--theme-border-primary` |
| `backdrop` | `rgba(0,0,0,.70–.75)` | Modal backdrop | REF modal; P50 |
| `delete-gradient` | `linear-gradient(#fd9292,#fb6767)` | DELETE WHITE LABEL SITE only | P50 Domain Details modal |

**⚠ FLAG: there is no success green and no warning yellow in the platform.** The ACTIVE badge is red with a check icon (P50). The yellow warning banners in OB are old-theme. My proposal:
- **Done:** red check-circle, the same pattern as the ACTIVE badge.
- **Please confirm:** outlined red pill.
- **Problem:** magenta `#d2006b` text and icon.
- **Warning box** (replaces the yellow): a `#191a1c` box with a red alert icon.

→ **Please approve, or tell me if a green or yellow is allowed.**

## 2. Typography

| Role | Spec | Source |
|---|---|---|
| Base font | **Roboto**, weights 400/500/700/900. Body 14px/17.5px. | REF typography |
| Page title (h4) | 24px / 700 | P30 "Preferences" |
| Section title "Manage Your White Label Site" | 27.5px / 500 | P50 |
| Card title | 18px / 600 ("Customize Appearance"). Sub-card h4 is 16px / 600. | P50 |
| Modal title | 20px / 600–700. The SEO modal title is uppercase. | P50 |
| Nav item | 16px / 400 | REF shell |
| Body copy / form labels | 16px / 400 | P30, P50 |
| Small labels | 14px / 500 | P50 color rows |
| Input values | **14px / 900** (filled values are heavy) | P30 base input |
| Buttons | 14px / 900, UPPERCASE, letter-spacing .4px | REF |
| Chips | 13px. Inactive 500, active 900. UPPERCASE, .4px. | P30 chip row |
| Badges | 13px / 600–700 | P50 ACTIVE / Published |
| Helper / counter | 12px italic | P50 SEO counter |
| Monospace (DNS values) | System monospace, 14px bold, 0.7 opacity | P50 Domain Details |
| Fan-site headings | **Satoshi** 36–48px / 700–800. Used only inside site previews. | REF; P10 |
| AJ logo | Grungy red stencil display font ("AJ White") | P50 logo font carousel. ⚠ FLAG: font name unknown |

⚠ **Logo font guess:** the font name isn't recorded. I'll approximate it with a Google font (candidates: *Rubik Dirt* or *Black Ops One*) and offer to swap in an SVG of the logo if you have one.
⚠ **Satoshi** comes from Fontshare, not Google Fonts. I'll self-host it in `/public/fonts` so nothing loads from an external service at runtime.

## 3. Radius

| Value | Use | Source |
|---|---|---|
| 28px | Pills: buttons, inputs, selects, chips | REF |
| 30px | Cards and modals (main) | REF; P30 card; P50 SEO modal |
| 16px | Inner sections in cards; Domain Details modal; phone preview | P50 |
| 20px | Dropdown panels, public cards, datepicker | P30 dropdown; P50 palette |
| 12px / 8px | Inner tiles; info popover (8px) | REF |
| 999px / 50% | Badges, segmented toggles, avatars, icon buttons | P50 |

## 4. Spacing and layout

- **Shell:** header 75px. Left column at x 12–280 (268px wide). Content starts at x≈317, ≈785px wide at 1126px. At ≥1280px wide the app sits in a centered container about 1280px wide. (REF › App shell; P30)
- **Chip row:** 8px horizontal gap, 10px vertical gap. Content starts 40px below the last chip row. (P30)
- **Card padding:** 30px. WLS cards use 24px. (REF; P50)
- **Form grid:** two columns with 24px gutters. Label to control 16px; row pitch 110px. (P30)
- **Primary action:** sits *outside* the card, about 34–40px below it, left-aligned. (P30 UPDATE PROFILE; P50 UPDATE & PUBLISH)

## 5. Components

| Component | Spec | Source |
|---|---|---|
| **Primary button** | bg accent, white 14/900 uppercase, .4px tracking, padding 8px 20px, h40, r28. Disabled = opacity .65. Optional leading icon. | REF; P30 |
| **Sidebar CTA** | 268×37, same style, icon on the left ("NEW POST", "LIVESTREAM") | REF shell |
| **Outlined button** | transparent, 1px accent border, accent 13/900, r999, h40 | P50 DESKTOP PREVIEW |
| **Gear outlined button** | 1px accent, accent 14px text, r50, h48, leading icon | P50 SEO button |
| **Text button** | "Cancel" / "BACK", white 14/900 uppercase, no fill | REF modal; OB step 2 |
| **Icon button** | 36–42px accent circle with a white glyph (globe, trash, camera, share) | P50; P30; REF header |
| **Chip tab** | h42, padding 13px, r28. Inactive `#272a2b` 13/500; active accent 13/900. Uppercase. | P30 |
| **Selectable chip** | 1px accent outline; filled accent when selected | REF patterns |
| **Segmented toggle** | `#191a1c` pill wrapper; active segment filled accent, r999, 14/900 (COVER PAGE \| FEED PAGE). DISABLE\|ENABLE is the same idea with a split radius. | P50 |
| **Input** | bg `#191a1c` (inside a card), r28, h55, padding 17px 24px, value 14/900 white. Disabled = .7. | P30 |
| **Textarea** | bg `#191a1c`, r20, padding 17px 24px | P30 Bio |
| **Select (ng-select)** | Same pill, h56, white chevron. Panel: `#191a1c` (or `#272a2b` on a `#191a1c` parent), r20, rows 35px padding 8px 20px; selected row filled accent + bold. | P30; P50 palette |
| **Radio** | Checked = filled accent circle with a white check. Unchecked = 1px accent outline circle. | P50 Site Logo |
| **Toggle** | 22×14 outline pill. Off `#9198ab`, on accent. | REF |
| **Read-only copy field** | `#191a1c` pill h55, mono 14 bold at .7 opacity, with an accent "Copy" text button (18/600) inside on the right | P50 Domain Details |
| **Card** | `#272a2b`, r30, padding 30px. Card title 16px uppercase with a 1px bottom border, *or* 18/600 (WLS). | REF; P50 |
| **Inner box** | `#191a1c`, r16, padding 20–24px (instructions, color sections) | P50 |
| **Badge** | Solid accent pill with icon (ACTIVE), or `#191a1c` pill 13/700 (Published) | P50 |
| **Count badge** | 24px magenta circle, white 12px | P75 |
| **Info icon + popover** | 16px red filled "i". Popover: `#272a2b`, 1px accent border, r8, padding 10px 20px, 280 wide. | P30; P50 |
| **Modal** | 620 wide, `#272a2b`, r30, title 20/700 + X, 1px divider, backdrop .75. Footer: Cancel text + red pill. | REF; P50 |
| **Toast** | Copy is known ("URL copied to clipboard", "White Label site updated and published successfully"). Style **not captured**. ⚠ FLAG: I'll use a `#272a2b` r16 card with a 1px accent border, matching the popover. | P50 |
| **Skeleton** | Grey shimmer blocks | REF; `31a`, `35a` screenshots |
| **Sidebar nav** | Rows 39px, padding 6px 8px 7px 24px, 16/400, line icons. Hover/active: accent-tint pill r18–20, accent icon and label. | REF; P75; `pages/11-feed.md` |
| **Avatar** | Circle with a red ring. Header 42px; sidebar large (~100px). | REF |
| **Phone preview** | ≈352 wide, r16, scrolls internally | P50 |

## 6. Iconography

The platform uses icomoon line icons (outline, ~16–20px, white or accent). These aren't available outside the app (REF › Stack). **Proposal: Lucide** (outline, 1.75 stroke), mapped as globe, trash-2, check-circle, settings, copy, info, home, rss/feed, bell, message-circle, dollar-sign (in a circle), wallet, bar-chart-3, lightbulb, video, plus, camera, share-2, chevron-down, arrow-left, eye, pencil, grip. ⚠ FLAG: it's a substitute, but close to the originals.

The assistant marker is **✦**, set as a text glyph in the accent color, with no gradient.

## 7. Restyling the onboarding wizard (OB → platform)

| OB (old theme) | Platform restyle | Basis |
|---|---|---|
| "TOPFAN" logo header and marketing footer, no sidebar | Creator header ("AJ White" logo) and the Preferences shell: sidebar + "Preferences" title + chip row with WHITE LABEL SITE active. The wizard replaces the "Manage" body. | P50 (the wizard is a mode of `/edit-preference/whitelabel`). ⚠ FLAG (assumption) |
| Black card | `#272a2b` card, r30, padding 30 | REF card |
| Teal outlined "STEP 1 OF 3" pill | Outlined accent pill, 13/700 uppercase | P50 badge family. ⚠ guess |
| Teal check radios | Accent check radios | P50 Site Logo |
| Grey `#424346` select and inputs | `#191a1c` pills inside the card | P30 |
| Teal gradient SAVE & CONTINUE | Accent primary pill + note "Note: This can take up to 60 seconds." | REF; OB |
| CNAME copy fields | Read-only copy field (§5) | P50 Domain Details |
| GoDaddy instruction box | `#191a1c` inner box, r16 | P50 |
| "Unable to Verify DNS Entries" modal | Platform modal style (the guided path replaces it with live per-record status) | REF modal |
| Provisioning: teal ring, countdown, 4-step tracker, yellow banner | Accent ring and tracker, `#191a1c` countdown tile, warning box per §1 | OB 16-42-29. ⚠ restyle guess |
| "Provisioning Complete!" teal badge and buttons | Accent check badge (like ACTIVE) and accent pills | OB 17-13-38 |

The old screens use "Add DNS Records (GoDaddy)" as the heading, with the provider in the title. I kept that wording (OB 16-25-27).

## 8. Assistant layer (native look)

There's no reference for this layer, so it is built entirely from platform parts:
- **Panel:** docked on the right, 360px (340px at 1280). bg `#191a1c`, 1px `rgba(255,255,255,.16)` left border. Its header shows **✦ TopFan Assistant** (16/700, accent ✦), the help-level select (ng-select style) and an X.
- **Messages:** `#272a2b` bubbles, r20, 14/400. Creator replies are right-aligned accent pills.
- **Options:** selectable chips. Recommended option is pre-selected and tagged "Recommended" with a `#191a1c` badge.
- **Plan checklist:** inner box rows with an owner tag ("Assistant" / "You") and a status ("Done" / "Please confirm" / "Up next").
- **Working bar:** a `#272a2b` pill above the panel footer with a spinner, "Assistant is working…" and a **STOP** outlined button.
- **Field highlight:** 2px accent ring, offset 3px, pulsed once. A "Detected" `#191a1c` badge next to the label. **No glow and no gradient.**
- **"Draft" label:** outlined pill, 12/700 uppercase.

**Layout ⚠ FLAG:** at 1440px wide, the shell becomes left-aligned and the panel takes 360px. That leaves the content column at ≈720px, which is close to the 785px captured at 1126 wide. At 1280px it drops to ≈580px, and the 2-column domain form gets tight but still works. The alternative is for the panel to float *over* the right edge of the content. I recommend docked.

## 9. Open questions (anything that changes the visual language)

1. **Status colors.** Accent / magenta only, with no green or yellow? (§1)
2. **Content assets.** `/references/content` is missing. Choices:
   - (a) Crop AJ's avatar, cover and hero photos from the screenshots (low resolution, ~1126px source).
   - (b) You send the asset files.
   - (c) Neutral placeholders.

   Note that the hero image in the captures shows an Olympic event photo, which may not be AJ's own.
3. **Logo font.** Approximate it with a Google font, or do you have an SVG?
4. **Wizard shell.** Show it inside Preferences with the sidebar and chips (my assumption), or match the OB layout (no sidebar)?
5. **`~/Documents/TopFan_Claude/`.** Should any of those docs count as `/docs`?
6. **Scene 8 "today" numbers.** The references give only stated limits: "up to 60 seconds", "up to 10 minutes", "up to 48 hours", and the count of steps and fields. I'll use only those and won't invent a "today" total time unless you give me one.

---

## 10. Decisions (approved 2 Nov 2026)

1. **Status colors:** red and magenta only. Red = completed / confirmation. Magenta `#d2006b` = errors and issues that need attention. No green, no yellow.
2. **Images:** neutral placeholders (`ImageSlot`, `Avatar`). Every asset path lives in `src/config/demo.ts › assets`; set a path there to swap in a real photo or logo. Nothing is cropped from screenshots.
3. **Logo font:** Rubik Dirt (Google Font, bundled through @fontsource).
4. **Wrong social link:** `instagram.com/ajwhite_old`, labelled as simulated in `src/config/demo.ts`.
5. **Scene 8:** only timings and counts the references support. Projected improvements are labelled "Estimated".
6. **`~/Documents/TopFan_Claude/`:** not used.
7. **Mascot:** small avatar inside the assistant UI only. Waiting on a transparent PNG (`assets.mascot`).

Still open: Satoshi (used for fan-site headings in previews) comes from Fontshare and isn't bundled yet, so it falls back to Roboto.

## 11. Layout correction (2 Nov 2026)

- **Account setup** (`OnboardingLayout`) covers Step 1, Step 2, Provisioning and Complete. It has the TopFan header, the setup form on the left and the assistant on the right, and **no** creator dashboard components: no sidebar, Preferences, New Post or Livestream. The TopFan wordmark is a text recreation of the OB header; the emblem is approximated with a Lucide icon.
- **Creator dashboard** (`DashboardLayout` / `FullWidthLayout`) loads only after "Go to My Site" on the Complete screen.
- **Assistant panel:** `clamp(340px, 27vw, 420px)` wide, about 27–30% at 1280–1440. When collapsed it becomes an edge tab, and the form re-centers in the freed space. Its state lives in `AssistantProvider` above both layouts, so the conversation, current task and any running approved operation survive collapsing and the move to the dashboard.
- **Checklists:** "Account setup" (4 technical steps) during onboarding. "Get ready for fans" (brand, first post, payouts, share) only in the dashboard.

## 12. Assistant interaction model (2 Nov 2026): no help levels

- The help-level dropdown and question are removed. The assistant adapts to what the creator does.
- **Flow for every interaction:** understand context → suggest or prepare → ask for approval when needed → act → confirm.
- **Form sync:** if the creator answers in the TopFan form, the open suggestion card is settled and not asked again. This covers having a domain, the provider, the address and verifying directly.
- **Proactive suggestions** (`suggest`) have an X to dismiss them and are skipped while suggestions are paused (bell icon in the panel header). Error explanations, recovery steps and confirmations always appear.
- **Approval required** before anything external (adding DNS records goes through the simulated consent screen) and before filling the form from a suggestion ("Fill it in").
- **During provisioning:** an optional 15-second "Catch the snowflake" game, or a drafted welcome post built only from the creator's bio. The post is labelled "Draft", is never posted, and is offered again in the dashboard.

## 13. Provisioning screen: ambient timer + Launch Run (approved request)

- All original info is kept: page title, "White Label Site Provisioning In Process", the headline, the 10-minute copy, the MM:SS countdown, the 4 milestones, the safe-to-leave line, the Onboarding Guide link and the simulated completion control. The yellow notice box became a plain line to keep containers to one card.
- Loader: a static thin track, plus a red lit arc and an indicator that orbit once every 18 s, plus a red glow that breathes over 6 s. The arc position is decorative and never encodes progress. The time label never moves. The glow dims while the game is played. Reduced motion turns all of it off.
- Countdown: derived from `provisionStartedAt` in the platform store, so it never restarts on remount, game close or navigation. Past the estimate it shows "Taking a little longer than expected / Still checking the status". It never completes on zero. Completion comes only from the (simulated) status control.
- Launch Run (`src/platform/wls/LaunchRun.tsx`) is an original runner (not the Chrome dino). The player is the vector red jelly mascot with spring squash/stretch, blinks, eye shifts and moods (jump/hit/yay). Obstacles are plain blocks on a thin gray ground. Controls: Space/↑/tap, Pause/Resume, Restart, Close. Keys inside form fields and other controls are never intercepted. The game auto-pauses when the tab is hidden. It has no access to provisioning state.
- On real completion: the ring settles to a full red circle with a check. A running game clears the obstacles, the mascot runs to a finish flag and hops twice, then the existing Complete screen opens (6 s fallback).
- The assistant's "Play a quick game" opens this same page game. The earlier in-panel snowflake game was removed (no parallel implementations).
- Review-only: "Simulate: estimate runs over" sets the start back 10 minutes.

## 14. Provisioning: one space scene (approved requests)

- Stepper: a quiet dot rail. Done = 9px gray dot, current = red dot in a 24px ring that breathes gently in opacity, upcoming = dim dot. Only the current short name and "Step X of 4" are shown. Full names are in tooltips and aria-labels. The dots are display only.
- Launch Run obstacles are leaning, smooth space rocks (3 sizes, plus pebble clusters), dark gray with a top-left highlight and a faint red reflection. Collision follows each rock's dome profile with a forgiving inset.
- `SpaceBackdrop.tsx` is the single page-level sky (via the `OnboardingLayout` `backdrop` prop, provisioning only): stars dimmed in the content column, a moon top-left, a ringed planet top-right, a rim-lit planet on the right edge, a red haze and a nebula wisp. It drifts slowly and gets gentle parallax from the game via `spaceMotion.rate`. Reduced motion turns this off.
- The game canvas is transparent: ground line, faint surface band and craters, rocks, mascot. The provisioning card background is transparent. The header is unpinned on this screen only.
- Timer reduced from 296px to 256px. The "Minutes : Seconds" caption was removed at the user's request; the screen-reader status line remains.

## 15. First-time assistant introduction (approved request)

- `AssistantIntro.tsx`: a glass card on Step 1 (translucent dark, blur, thin light border, soft shadow, r20) with the mascot, "Hey! I'm your TopFan companion.", "Let's get started" and a small "Skip". It sits over a 22% dim that ignores pointer events. Nothing is auto-focused.
- "Let's get started": the glass and text fade while the same mascot element flies to the panel avatar along a curved path, shrinking from 84 to 36px, squashing and stretching, in 0.95 s using transforms only. The avatar then settles with a small spring and the panel content fades in (title, checklist, first question).
- Skip, Escape, or any click/focus outside the card (e.g. the form) dismisses it at once without travel; the click and focus go through untouched. Reduced motion: a plain crossfade.
- The panel keeps its column during the intro but stays empty and inert until the mascot lands.
- First question: "Let's get your website ready. Do you already have a domain name?" with "Yes, I have a domain" / "No, help me find one", synced to the form radios. The longer "Hi AJ…" greeting appears only when the intro was never shown (setup entered past Step 1).
- `LiveMascot.tsx`: SVG redraw of the approved mascot (same shape, colors, gloss, rim, glow) so it can blink and glance. It is now used for the panel avatar and launcher too, so it is one character everywhere.
- "Seen" is kept in the assistant store (`intro`), so it never repeats while moving between steps. The prototype has no storage, so a page reload or Reset shows it again. In the product this is a per-creator flag.
- Update: the flight is one rAF-driven timeline instead of keyframes, so there are no seams: 0.14 s soft anticipation, a 1.0 s single cubic ease-in-out glide on a gentle curve (rises, then glides into the panel) with stretch tied to speed, and a 0.34 s damped settle. It starts from the mascot's exact on-screen pose (mid-float) and ends pixel-aligned on the avatar. The avatar appears underneath before the travelling copy is removed. Measured: 0 px jump at start and end, no direction reversals.
- Update: the Skip button was removed at the user's request. Escape or touching the form still dismisses the card without travel.

## 16. Conversational assistant (real model) and voice input

**Why every question got the same reply:** `AssistantPanel.send()` always posted one fixed sentence and never read the question. Replaced.

**Architecture**
- `server/chat.ts` is the only server code. It serves `/api/chat` (Vite dev middleware in `vite.config.ts`, Vercel function in `api/chat.ts`). It reads `ANTHROPIC_API_KEY` from the environment (`.env.local`, gitignored; see `.env.example`). The key never reaches the browser.
- Model: `claude-opus-5-5` (override with `ANTHROPIC_MODEL`), effort `low` for chat latency, streamed. Refusals: server-side `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`), then a friendly message.
- Grounding: `server/knowledge.ts`, distilled only from `References/topfan-reference`. The prompt tells the model to say "not sure" outside it and never to invent features, prices, availability, DNS results or account status.
- Every request carries `src/assistant/chat/context.ts › buildContext()`, built from live app state rather than chat history. It includes the step, the form (has-domain, domain, provider, root vs sub-domain, address), DNS stage, records and verification result, provisioning status, domain-search state (marked simulated), approved decisions, and the actions available right now. The latest state wins over older messages.
- History: plain-text turns from the panel conversation, including tapped choices. It is kept in the assistant store, so it survives collapse, step changes and errors.
- States: thinking dots, then the answer streams in with a caret. A "Thinking… / Answering…" bar has Stop. Errors (busy, timeout, network, unavailable) show "Needs attention" with Try again. Without a key the panel honestly says no model is connected and gives no fake answers.

**Actions (proposed, never executed by the model):** `highlight_field` (runs directly; it changes nothing), `propose_form_update`, `start_domain_finder` and `open_registrar`. Each is validated on the server, validated again in the browser against the live state, and shown as a "Please confirm" card. On approval it is checked once more. Unknown tools are ignored. DNS changes, purchases, connecting accounts and publishing are not available to the model at all.

**Voice:** a mic button beside the input uses the browser's speech recognition. It never starts on its own. States: waiting for permission, listening (live transcript), transcribing, transcript ready (editable, never auto-sent), failed (blocked mic, no mic, no speech, network) with Try again or Type instead, and unsupported (the mic is disabled with an explanation). A notice explains that in Chrome Google processes the audio, and TopFan keeps no audio. Collapsing the panel stops the mic.

**Listen:** an on-demand "Listen" control under each answer uses the browser's speech synthesis. It never plays automatically.

**Mascot moods:** listening (open mouth), transcribing, generating (thinking glow), responding, error.

## 17. Creator Quest (four mascot-led mini-games during provisioning)

Replaces Launch Run. It lives in the provisioning card under "Explore TopFan while we prepare your site" and opens only from "Play Creator Quest" (or the assistant's offer). It never auto-launches.

**Structure** (`src/platform/wls/quest/`)
- `engine.ts`: Launch Run's mascot, physics (same gravity, jump, jelly spring, squash/landing), rocks, ground and drawing, generalized. Free-moving missions add momentum, air control and one-way platforms. It derives these mascot states: idle, running, accelerating, jumping, falling, landing, collecting, interacting, celebrating, collision, recovering, paused. Seeded RNG makes every run deterministic.
- `useGame.tsx`: one rAF loop with DPR canvas, pause on hidden tab, keyboard (←/→ or A/D, Space/↑/W, E/Enter, Esc/P pause), touch buttons (44 px), HUD (Pause/Resume, Restart, Back to missions, score) and visible instructions.
- `missions.ts`: names, objectives, durations, takeaways and the related TopFan feature (references only).
- Games: `RevenueRush` (runner → fictional fan request → choose an offer → simulated interest), `SuperfanSignal` (carry signals to matching fan groups; wrong groups just explain), `FanHQ` (link Content, Community, Experiences, which reveals Store; steps rise to the hub, labeled "Illustration · not your site design"), `InsightExplorer` (find 7 hidden signals → 65/25/10 chart labeled "Game data · fictional" → choose what to make next).
- `CreatorQuest.tsx`: entry, mission cards (preview, objective, duration, Done badge), a "Prefer reading?" non-game view of every takeaway, and the shared result screen (Mission completed, score, takeaway, "In TopFan: …", "Explore this after launch", Play again, Explore another mission, Return to provisioning).
- `state/questStore.tsx`: view, results, saved interests and the event log (mission_started, token_collected (throttled), checkpoint_reached, decision_made, mission_completed, mission_exited). Progress survives leaving a mission.

**Rules kept**
- No currency, no revenue claims: every number and fan request is labeled fictional or simulated.
- Saving an interest only stores it. After launch the assistant mentions it once ("Nothing has been turned on"). Nothing is enabled, created or published by play.
- Game logic, scoring and collisions are local and deterministic. No model calls in the loop. The LLM only sees a `creatorQuest` summary in app_state for questions.
- Provisioning is independent: the clock keeps running, and the games never pause, speed up or reset setup. If the site becomes ready while the quest is open, the game stays as it is. A sticky "Your website is ready … Go to my site" banner appears, the heading stops claiming to auto-open, and the checklist shows 4 of 4.
- Assistant (`QuestCompanion.tsx`): one intro, one takeaway per first completion, at most one hint after 35 s without progress per run, and one post-launch reminder of saved interests.

**Tested** (puppeteer bot that drives the same inputs a player uses): all four missions played to completion at 1440 and 1280, plus pause and freeze, play again, progress kept, the wrong-match path, the ready-during-game banner without resetting game state, the post-launch reminder, and touch controls on a 1280 touch device. Regression suites still pass. The prototype as a whole is desktop-only (min-width 1280), so phone-width layout is not covered.
