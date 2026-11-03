# Demo readiness: TopFan AI

Checked on 2026-11-03 against the local dev server, Chrome (headless, puppeteer) at 1512×805 and 1126×797.

## A. Overall readiness

**READY WITH LIMITATIONS.** Every scene in the run sheet (`docs/demo-run-sheet.md`) was executed end to end by automation and passes.
The limitations are about what was *not* verifiable here, not about broken flows:

- **Live AI model: NOT VERIFIED.** No `ANTHROPIC_API_KEY` is configured, so every check ran in the labeled DEMO MODE. All scripted phrases work in demo mode.
- **Real microphone: NOT VERIFIED.** Voice was tested with an injected speech-recognition stub, which proves the transcript → edit → send path but not that a microphone works. See the manual voice check.
- **Mobile: not supported.** The recreated TopFan screens are desktop layouts and are cut off at phone width; making them responsive would redesign TopFan's screens, which is out of scope. Present from a laptop.

## B. Capability matrix

WORKING = real local behavior, verified · MOCKED = simulated by design (labeled) · NOT VERIFIED = needs a manual check.

| # | Capability | Status | Evidence |
|---|---|---|---|
| 1 | Domain setup, one question at a time, provider detection, sub-domain recommendation | WORKING | demo-script, run sheet Part 1 |
| 2 | DNS records via "Prepare it for me" (GoDaddy consent) | MOCKED | Simulated consent window; no real DNS or GoDaddy calls |
| 3 | Verification failure diagnosis ("Help me fix it") | WORKING (simulated check) | run sheet variant |
| 4 | Provisioning wait, temporary address, Creator Quest | MOCKED | "Simulate: finish provisioning" link |
| 5 | Post-setup welcome "Your site is ready…" with ≤4 state-based suggestions | WORKING | scenarios F |
| 6 | Direct navigation from the creator's words, offered as a button, chat preserved | WORKING | scenarios A, B; demo-script |
| 7 | Ambiguity questions (settings, wallet) | WORKING | scenarios G; demo-script |
| 8 | Earning discovery: broad question (4 groups + all 12), "help me decide", recommendations for specific goals, direct "Take me to …" | WORKING | monetize (101 checks), scenarios C |
| 8a | All 12 Monetize features open their own screen and guided setup step (real control highlighted) | WORKING | monetize |
| 9 | Persistent tasks with steps verified against app state | WORKING | scenarios C, E, Email; task-resume |
| 10 | Resume a task from another page; each paused task resumes its own workflow, step and typed input | WORKING | scenarios E; task-resume (34 checks) |
| 11 | Outbound Email fix, Failed → Verified (protected domain confirm) | WORKING (simulated DNS check) | scenarios Email |
| 12 | "What should I focus on?" priorities | WORKING | demo-script |
| 13 | Approval-gated small changes (groups, tags, automated messages) | WORKING | demo-script |
| 14 | Role limits (delegates never get a button to an owner-only screen) | WORKING | demo-script (fixed in this pass) |
| 15 | Any question gets an answer, a navigation or a suggestion (no error, no empty reply) | WORKING (demo mode) | chat-corpus: 194/194 |
| 16 | Voice input: permission/listening states, transcript editable before sending | WORKING with stub · mic NOT VERIFIED | scenarios D |
| 17 | Content Autopilot: plan my week (brief, days, topics, media, visible plan, approve) | WORKING | plan-week (29 checks) |
| 18 | Drafts only from approved sources and the creator's own words; held, never filled in | WORKING | plan-week, autopilot |
| 19 | Review by exception: approve, reject with reason, revise, save as TopFan drafts, open in New Post | WORKING | autopilot, plan-week |
| 20 | Publishing | WORKING, creator only | The assistant never publishes; New Post's own button does |
| 21 | White Label Site manage page (colors, presets, logo text/font live in header, cover enable, preview, remove) | WORKING | wls-manage (19 checks) |
| 22 | Cover page editor (add/edit/delete sections, sub-pages, preview) | WORKING (local state) | manual browser check |
| 23 | Every button on every route does something (or is honestly labeled) | see section F | click-audit |
| 24 | Images and video posters on every route | WORKING | media-audit: 102 routes, 0 issues |
| 25 | Live LLM answers for open questions | NOT VERIFIED | no API key |
| 26 | Demo 2 intent-driven content: post, image (simulated), Lock/tier honesty, newsletter with email blocker, experience, whole week, continuity, Autopilot hand-off | WORKING (simulated image/email/timing) | content-agent (7 scenarios); see `docs/DEMO2_CONTENT_AGENT.md` |

## C. Walkthrough

The presenter's script is `docs/demo-run-sheet.md`. Automated equivalents:

| Scene | Test | Result |
|---|---|---|
| 1 Onboarding | demo-script, scenarios F | PASS |
| 2 AI navigation | scenarios A, B, G; demo-script | PASS |
| 3 Suggested actions | scenarios F | PASS |
| 4 Voice | scenarios D (stub) | PASS · real mic NOT VERIFIED |
| 5 Task continuation | scenarios C, E, Email | PASS |
| 6 Content Autopilot | plan-week, autopilot | PASS |
| 7 General assistant | chat-corpus (194 questions) | PASS |
| Two demo links (journeys, isolation, page guidance on 11 screens × 2) | two-demos, demo-links | PASS |
| GoDaddy DNS setup (states, errors, refresh, no duplicate setup) | dns-setup | PASS |
| Demo 2 content agent (7 scenarios: post+image, Gold/Platinum + teaser, newsletter blocker, experience, entire week, continue, Autopilot + page guidance + reset) | content-agent (1512×805 and 1126×797) | PASS |
| Demo 2 Smart Link in Bio (setup, promote, improve, relevance, "add this", week link, save failure + retry, invalid URL refused, Demo 1 untouched) | link-in-bio | PASS |
| Edit Cover Page with prefill (Demo 1: draft, dirty fields, undo, image/colors, refresh, publish, fixtures; Demo 2 isolation) | cover-page | PASS |

Also run at 1126×797: demo-script and plan-week pass.

## D. Limitations (honest labels in the product)

- Two demo links: `/demo/setup-navigation` (setup, navigation, monetization discovery) and `/demo/ai-content` (writing help, Content Autopilot). Gating is in code: the other demo's workflows aren't suggested, Autopilot can't open in Demo 1, setup guidance doesn't run in Demo 2, and explicit requests get "That workflow is available in the … demo." Conversations are in memory per tab; a full reload starts a new conversation (tasks and data persist per demo).
- Cover page prefill: the existing editor has only SEO Title, Keywords and Description, plus sections and sub-pages, so only those fields are prefilled. Headline and intro copy are shown as Draft text to copy, because the editor has no field for them. Colors go to Customize Appearance as unsaved changes. The image suggestion replaces the cover-page hero image only after an explicit click. The website (`ajwhite-riding.example`) and Instagram data are a fictional fixture labelled simulated; Facebook and X links are kept but never read. Nothing is fetched.
- The DNS error stories need `?dnsFixture=…`; the simulated verification passes once the simulated setup is prepared (no real DNS lookup).
- Simulated, and labeled where shown: GoDaddy connection, DNS verification, provisioning time, Outbound Email verification, payments and withdrawals, Creator Quest numbers, "Draft them now" (the product would draft each post the day before).
- Regular TopFan posts can't be scheduled in the references, so suggested times stay suggestions and publishing is one click per post in New Post.
- Preview-only controls explain themselves instead of acting: fan-side buttons in previews (Link in Bio "Get Your Own Platform", course "Enroll" cards in Messages, site preview buttons), and the Feed audio post (no audio file in the demo).
- The Onboarding Guide link opens Resources › Guides (the guide file isn't in the references).
- Voice: US English only; in Chrome, audio is processed by Google (the panel says so).

## E. Fixes in this pass

- Two distinct demos with shared page guidance: a page intro and up to three actions chosen per demo (Feed, New Post, Subscriptions, Newsletters, Experiences, Courses, Wallet, Insights & Fans, White Label Site, Link in Bio, Groups), a quiet context row once the chat has started, more on request.
- GoDaddy DNS setup: Connect → Review (the actual records) → Processing → Success modal, always labelled Simulated, no credential fields; refresh mid-setup is reported as unconfirmed with Try again; a second Prepare never re-runs the setup.
- Post-setup: "Your site is ready. Let's make it yours." with five priority actions (three shown). **Edit my cover page** goes through White Label Site to the existing editor, where the assistant prepares a sourced draft. It applies the draft only on review, never over the creator's own edits, and offers Undo. Publishing happens only through the editor's Update & Publish. Cover editor values now persist in the mock store across navigation and refresh.
- Account setup screens use the live product's setup colors (teal accent and buttons, teal mascot); the platform after setup stays red and black.

- Paused tasks: every Resume opened the most recently paused task (the button passed no task id). Each task now has its own id; Resume/Cancel act on exactly that task; a missing task shows a recovery message instead of opening another. The VIP group form keeps what was typed. Tasks finished by hand leave the Paused list. The list is compact (3 shown, "Show all").
- Monetization: discovery covers all 12 features (was 3). New guided tasks for Experiences, NFTs, VIP Offers, Portfolios, Discount Codes and Advertisements. Fixed: the Course, Downloadable and Merchandise tasks could never detect a created item (they read the wrong data), and the Merchandise, Newsletter and Events steps pointed at controls that don't exist.

- Content Autopilot: new **Plan my week** flow; completion screen no longer a dead end (shows which draft is open, **Open next draft**, **Back to chat**).
- Logo font and text changes show live in the header; unpublished changes revert on leaving.
- Cover page editor: Preview, Add Section (layout picker), Edit, Delete (with confirm), Add Sub-Page.
- Setup header Language and Account menus; Onboarding Guide link; Locked badges are labels, not dead buttons; quantity minus disabled at 1; preview-only buttons explain themselves.
- Security: a delegate was offered a button to an owner-only screen; offers now use the same access rule as navigation.
- Outbound Email task steps rebuilt to match the page's real flow.
- Demo reset: the review bar **Reset** now restores everything (mock data, tasks, Autopilot, chat, setup); `?resetMock=1` is removed from the address bar after it's applied, so an accidental reload doesn't wipe progress.

## F. Blockers

None for the scripted demo. Click audit results: see below.

`tests/e2e/click-audit.mjs` clicked **3,664 controls** on every route (including controls revealed by other clicks): **0 page errors**.
96 showed no visible effect; each was reviewed and none is a broken control:

| Kind | Why there's no visible change |
|---|---|
| Already-selected tabs, radios, toggles, current carousel dot | Selecting what's selected does nothing (as in the product) |
| Drag handles (Reorder …) | Reordering is by drag or arrow keys, not a click |
| Date and time pickers | Open the browser's native picker, which automation can't see |
| Download CSV | Downloads a local file, which automation can't see |
| Browse (file fields) | Opens the system file chooser |
| Send with an empty message, Discard with no changes, Rewind at 0:00 | Nothing to do yet; Send is shown dimmed |
| Creator Quest Restart/Interact before the game starts | Game input only |
| Placeholder social links (example.com) | Open a new tab; the demo uses example links on purpose |

33 "not re-found" rows were items the audit itself created (duplicated newsletters, new conversations), not app problems.

## G. Reset instructions

- **During a demo:** press **R**, click **Reset** in the review bar. It reloads on setup Step 1 with clean demo data.
- **Any page:** add `?resetMock=1` to the URL.
- What it clears (this browser only, and only for the demo you're in; demo links suffix the keys with `:setup-navigation` or `:ai-content`): `topfan-mock-v1` (mock data), `topfan-tasks-v1` (assistant tasks), `topfan-autopilot-view-v1` (review screen), `topfan-setup-v1` (setup progress), plus in-memory chat, setup and Creator Quest state. It never touches real accounts or services; the demo has none.
