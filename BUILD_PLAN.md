# BUILD_PLAN — TopFan Assistant POC

**Stack:** Vite + React + TypeScript. Tailwind maps to `src/styles/tokens.css` through CSS vars. Framer Motion is used only for panel slide, field pulse and toasts. The output is a static build for Vercel.

## Architecture

```
src/
  config/demo.ts          ← ALL demo data: creator, social link, domain, records, goals, looks, drafts, issues, captions, before/after
  styles/tokens.css       ← design tokens (done)
  state/sceneMachine.ts   ← single reducer: scene, step, path (setup|guide), helpLevel, answers, activity log, working flag
  platform/               ← faithful TopFan recreations (no assistant code)
    Shell (Header, Sidebar), PreferencesChips
    wls/ DomainInfoStep, DnsRecordsStep, ProvisioningStep, SetupComplete, ManageWls (appearance + preview), CoverPageEditor (sections table)
    ui/ Button, Chip, Input, Select, Radio, CopyField, Card, Modal, Badge, InfoPopover, Toast, Skeleton
  assistant/              ← overlay layer only
    AssistantPanel, Message, OptionChips, PlanChecklist, WorkingBar, ActivityHistory, HelpLevelSwitch,
    FieldHighlight, DetectedBadge, ShowDetails, DraftPill, StatusTag
  scenes/                 ← one file per scene: wires platform screen + assistant script
  presenter/PresenterBar  ← "P" toggle, jump list, ←/→, Reset, path switch, skip-delay
```

- **Scene flow.** Each scene is a list of beats, such as `say`, `ask`, `act(delay)`, `highlight(fieldId)` and `await(userClick)`. **→** advances to the next beat or skips the current delay. **←** returns to the previous beat.
- **Delays** are 1–3 s, and every one can be skipped.
- **Undo** reverts that beat's state patch.
- **Data and storage.** No API calls and no browser storage. A page refresh resets the demo.

## Phases

| Phase | Deliverable | Stop for review |
|---|---|---|
| 2 | Platform shell and the WLS screens (Domain Info, DNS Records, Provisioning, Complete, Manage + preview, Cover Page sections table), with the page reachable only by clicking. No assistant. | ✔ |
| 3 | Assistant panel components in a storybook-like `/kit` route, plus the presenter bar | ✔ |
| 4 | Scenes: P0 → P1 → P2 | after each priority |

## Scenes

| # | Pri | Platform screen (recreated) | Assistant layer | Interactions / beats |
|---|---|---|---|---|
| 1 Kickoff | P0 | WLS setup, Step 1 (empty) | Panel opens. Welcome → "Where are you online now?" (paste field, prefilled with the demo link) → loading 2 s → found card (name, bio, photo, links) with Confirm / Edit → goals chips (multi) → help level (3 options; "Set it up for me" recommended) → plan "4 steps · about 10 minutes of your time" | Plan steps:<br>1. Domain details (You)<br>2. Connect domain (Assistant)<br>3. Build your site (Assistant drafts, You approve)<br>4. Check & go live (You) |
| 2 Domain details | P0 | Step 1 form | Creator types `ajwhite.com` → provider select fills "GoDaddy" (pulse + "Detected") → message: "Your domain already handles email, so I'd use a sub-domain. Your email keeps working." → sub-domain radio pre-selected, `fans` filled, alternatives `[club] [team]` → creator clicks SAVE & CONTINUE | Show details: "MX records found → root CNAME would conflict" |
| 3 Connect (setup path) | P0 | Step 2 (dimmed behind) | Explain line → **Connect at GoDaddy** → frame labelled **Simulated** (fake browser chrome, GoDaddy-neutral styling, no GoDaddy logo) listing the 2 records → Connect → working bar + Stop (2 s) → "Done: 2 records added" | Stop → "Stopped. Nothing was changed." Cancel → returns to options. Details show the records. |
| 3b Guided path | P1 | Step 2 "Add DNS Records (GoDaddy)", restyled | Field-by-field GoDaddy steps; live per-record status replaces the generic modal. Record 1 ✓. Record 2 ✗ "name looks like fans.ajwhite.com.ajwhite.com…" → **Check again** → ✓. Optional screenshot upload → simulated analysis pointing at the Name field. | The real VERIFY & CONTINUE stays usable |
| 4 Go live now | P0 | Provisioning (4-step tracker, restyled) | "Your site is already live at ajwhite.topfan.dev…" Status messages per tracker step, with no fake precision. | The tracker advances on beats, not a 10-minute countdown. The original countdown stays visible. |
| 5 Build | P0 | Manage WLS: Customize Appearance + phone preview; Cover Page sections table | **Brand:** 3 look cards (live mini-previews, theme vars only), pick one → app theme vars update. **Sections:** toggles turn on with one-line reasons tied to the goals. **Copy:** hero, About, Experiences blurb, each with a "Draft" pill → Approve all / one by one. | Every change is logged to Activity, with Undo |
| 6 Health check | P1 | Cover Page editor / SEO modal | Scan (1.5 s) → 4 issue cards, each with a fix and Approve: "skate culture"; keyword "Freestyle Skiing"; "hared With Community"; social link (see note) | Approve → field updates + highlight |
| 7 Launch | P0 | Full-screen fan preview of the existing home layout (P10), with desktop and mobile toggle | **Go live** approval modal → "Your site is live at fans.ajwhite.com" → Launch kit: IG / TikTok / X captions (Copy), QR (generated locally), link-in-bio reminder (deep link to the LINK IN BIO chip) | |
| 8 Before / after | P2 | Slide-style screen | Today vs With assistant: steps, decisions, time, failure points. Every "with assistant" number is labelled **Estimated**. "Today" uses only figures quoted from the references. | |

**Always on:** help-level switcher (P0), Stop (P0), Activity history with Undo (P1), and closing the panel (the app still works).

## Grounding notes (no invented facts)

- **Health-check issues** all come from the capture:
  - "skate culture" appears twice in P10.
  - "Freestyle Skiing" is in the SEO keywords (P50c, P50f).
  - "hared With Community" is in P10, marked sic.
  - **Social link:** the capture doesn't show a wrong social link. The closest real issue is the Profile bio linking to toyota.com (P30). I plan to use a **simulated Instagram link pointing to `instagram.com/ajwhite_old`**, set in config and labelled as demo data. ⚠ Please confirm.
- **DNS values** come from the brief. They appear only under "Show details".
- **GoDaddy consent screen.** It's a generic "Simulated" frame with no GoDaddy trademarks beyond the provider name.

## Risks

- The content column at 1280px with the panel open is about 580px wide (DESIGN_NOTES §8).
- No images until the asset question is answered (DESIGN_NOTES §9.2).
