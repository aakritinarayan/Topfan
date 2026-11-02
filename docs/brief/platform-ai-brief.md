The user sent a new message while you were working:
<pasted_content id="aa0a">
# TOPFAN — COMPLETE PLATFORM RECONSTRUCTION + INTELLIGENT AI CREATOR COMPANION

## PROJECT BRIEF

You are working inside an existing localhost prototype of TopFan, a creator platform where creators manage their branded websites, content, commerce, fan communities, payments, analytics, and team access.

The current localhost implementation is incomplete. It contains mainly the White Label Site onboarding journey and selected related pages, including the AI assistant, domain configuration, provisioning, completion experience, and Creator Quest.

We need to accomplish TWO connected objectives:

**Objective A — Reconstruct the missing TopFan platform screens.**

Use the attached `topfan-claude-code-prompt.md` and the reference package `topfan-reference.zip` as the primary sources for TopFan's existing design, page structure, navigation, behavior, and feature coverage.

**Objective B — Integrate a persistent, intelligent AI agent across the complete reconstructed platform.**

The AI should simplify navigation and task completion without changing the existing TopFan interface.

The completed prototype must demonstrate how creators can express their goals in everyday language and have the AI guide them through TopFan's existing functionality.

**Core design principle:**

Do not make creators learn the product's internal navigation before they can accomplish something.

Let them express their goal. The AI should identify the appropriate features, navigate the original interface, guide the workflow, and help complete the task.

The result must be a working interactive application, not a static concept.

---

# PART 1 — SOURCE OF TRUTH AND IMPLEMENTATION BOUNDARIES

## 1.1 Required project audit

Before changing code:

1. Inspect the current project structure.
2. Identify its framework, dependencies, and routing.
3. Identify existing screens and their implementation status.
4. Inspect the current White Label Site onboarding.
5. Inspect the AI assistant and its response-generation mechanism.
6. Inspect the red jelly mascot and existing animation logic.
7. Inspect the provisioning and completion screens.
8. Inspect Creator Quest and its existing games.
9. Identify shared design tokens and components.
10. Identify current mock-data and application-state architecture.

Do not recreate working components unnecessarily.

Do not overwrite the existing prototype.

## 1.2 Reference files

The attached Markdown document is:

`topfan-claude-code-prompt.md`

This document contains:

- Existing TopFan navigation.
- Route map.
- Preferences structure.
- Feature inventory.
- Relationships between features.
- Mock account state.
- Rebuild requirements.
- Missing-screen requirements.
- Agent-context preparation.
- Quality requirements.

It also references:

`topfan-reference.zip`

If this ZIP is available in the working environment, extract it into a dedicated reference directory.

Read in order:

1. `REFERENCE.md`
2. All 37 page specification files in `pages/`
3. The 263 reference screenshots in `screenshots/`

Inspect the screenshot references for each screen before implementing that screen.

Do not assume this ZIP exists simply because it is mentioned in the Markdown file.

If the ZIP is missing, search only the authorized project files and attachments. Record the missing reference as a blocker for screenshot-level fidelity. Continue implementing what can be reliably supported by the Markdown specification and existing project, labeling any approximations.

Do not fabricate screenshots or claim a visual match without having inspected the actual references.

## 1.3 Source priority

Apply the following hierarchy:

1. Existing working project code for preserving established behavior.
2. Original TopFan screenshots for visual fidelity.
3. Page specifications for routes, content, states, and interactions.
4. `REFERENCE.md` for design tokens and shared patterns.
5. Uploaded Markdown specification for platform relationships and missing-screen requirements.
6. This prompt for additional AI-agent functionality.
7. Inference where no confirmed reference exists.

Where an existing screen differs from a screenshot, inspect whether the difference is intentional, part of the newer approved prototype, or a reconstruction error.

Do not silently overwrite a newer approved implementation with an older screenshot.

Record unresolved conflicts.

## 1.4 Superseded instructions

The uploaded Markdown file was originally written for a screen-reconstruction-only phase.

It contains instructions such as:

- Do not build the chatbot.
- Do not add AI integration.
- Stop after preparing chatbot documentation.

**These instructions are now superseded.**

The current assignment explicitly includes implementing the AI assistant.

All other applicable fidelity, route, mock-data, privacy, and platform reconstruction requirements remain in force.

## 1.5 Existing UI constraint

We are NOT allowed to redesign the original TopFan platform.

Do not:

- Reorganize the existing sidebar.
- Change established navigation labels.
- Consolidate Preferences tabs.
- Rename Monetize features.
- Redesign the Home, Feed, Wallet, or other feature pages.
- Create a competing AI-only dashboard.
- Replace original forms with chatbot forms.
- Move existing controls to new locations.
- Remove existing user functionality.

The only new persistent UI layer should be the AI agent and its necessary interaction surfaces.

For missing screens, reconstruct the original TopFan interface as accurately as references allow.

The existing AI-assisted onboarding implementation is an approved prototype extension. Preserve it.

---

# PART 2 — FRAMEWORK, DESIGN AND APPLICATION FOUNDATION

## 2.1 Preserve the existing application

Inspect the actual project stack first.

The reference document specifies an Angular 21 standalone application using:

- Bootstrap.
- PrimeNG.
- Quill.
- intl-tel-input.
- flag-icons.
- ngx-bootstrap datepicker.

However, the current localhost prototype may already use a different stack.

Do not rewrite the existing application into Angular solely because the reference pack describes Angular.

If the current project is React/Vite or another framework, preserve that framework and reconstruct the referenced screens using compatible components.

Use the original stack only if it matches the existing project or the user has explicitly selected a migration.

## 2.2 Desktop fidelity

Prioritize the two captured desktop viewports:

- 1126 × 797.
- 1512 × 805.

At the wider viewport, preserve the approximately 1280px centered app container where the reference specifies it.

Preserve desktop layouts, including their unusual behaviors.

Do not redesign layouts to improve them.

Maintain functional browser resizing without introducing obvious clipping or broken overlays. Mobile layout reconstruction is not required by this reference assignment.

## 2.3 Design system

Use the actual TopFan styles from the reference package.

Preserve:

- Typography.
- Spacing.
- Colors.
- Buttons.
- Chips.
- Input fields.
- Tables.
- Modals.
- Tabs.
- Dropdowns.
- Empty states.
- Toasts.
- Navigation behavior.
- Screen-specific layout variations.

White-label creator branding must remain configurable using the existing mechanism.

The AI agent should use the approved dark TopFan assistant styling and red jelly mascot.

Do not apply the assistant's visual design to the entire original platform.

## 2.4 Shared components

Reuse or implement shared components for:

- App header.
- Sidebar.
- Avatar menu.
- Language menu.
- Preferences chip tabs.
- Buttons.
- Inputs.
- Toggles.
- Selectable chips.
- Dropdowns.
- Popovers.
- Date pickers.
- Modals.
- Tables.
- Filters.
- Empty states.
- Loading skeletons.
- Toasts.
- Validation messages.

Each reconstructed screen should be composed from these shared patterns.

---

# PART 3 — EXISTING TOPFAN NAVIGATION

Preserve the original information architecture.

## 3.1 Header

The original header contains:

- TopFan logo.
- Language selector.
- Avatar menu.

Avatar menu entries:

- Edit Preferences.
- Terms & Privacy Policy.
- Help Center & FAQ.
- Sign Out.

Do not add a notification bell or other new controls to the existing header unless present in confirmed references.

## 3.2 Sidebar

Preserve:

- NEW POST.
- LIVESTREAM.
- Home.
- Feed.
- Activity.
- Messages.
- Monetize.
- Wallet.
- Insights & Fans.
- Resources.

Messages and Resources may show badges based on mock account state.

Do not rename these sections to Create, Earn, Finance, Audience, or another simplified IA.

**The AI agent should understand simplified creator language while navigating to the original labels.**

## 3.3 Layout differences

Preserve:

- Public Home without the dashboard sidebar.
- Feed's three-column layout.
- Activity's full-bleed layout.
- Messages' full-bleed layout.
- New Post's narrower content area.
- Existing modal-based Livestream behavior.
- Original Preferences chip navigation.

The AI must work across these layout variations without changing them.

---

# PART 4 — COMPLETE SCREEN RECONSTRUCTION

Build every page documented in the uploaded reference specification and available screenshots.

Do not only build screens required for the initial AI demonstrations.

Every major route must be available for navigation.

## 4.1 Home and Feed

### Public Home

Route:
`/`

Preserve the public marketing-style layout.

Include all documented public navigation, hero sections, and modules from the reference package.

### Feed

Route:
`/:handle`

Use the creator handle as a route parameter.

Include:

- Captured three-column layout.
- Feed content.
- Post cards.
- Existing actions.
- Relevant filters.
- Empty and populated states.
- Access restrictions where documented.

Ensure the default demo handle is configurable.

Use `ajwhite` as the default when matching the reference routes, but do not hardcode it throughout the app.

## 4.2 Activity

Route:
`/dashboard/activity`

Implement:

- Captured activity layout.
- Activity entries.
- Relevant activity states.
- Actions and filters from the reference.
- Full-bleed layout behavior.

## 4.3 Messages

Route:
`/messages`

Preserve original tab and modal behavior on this route.

Include:

- Priority.
- General.
- Message Lists.
- Conversations.
- Relevant inbox states.
- Automated message access where documented.
- Paid-message behavior where supported.
- Message detail.
- Compose/reply interactions.

Use fictional message data.

## 4.4 New Post

Route:
`/dashboard/newpost`

Implement all ten documented post types:

1. Video.
2. Images.
3. Article.
4. Audio.
5. Reel.
6. Poll.
7. Giveaways.
8. Link.
9. Fundraiser.
10. Text.

Preserve the original composer and content-type selection.

Include applicable options:

- Lock.
- Collaborate.
- Select Interests.
- Discovery Feed.
- Require Sign-In.
- Sensitive Content.
- Existing publishing options.

Implement realistic mock drafts, validation, and submission behavior.

Do not invent unsupported scheduling behavior.

## 4.5 Livestream

Use the original modal-over-current-page interaction.

Support:

- Start now.
- Schedule where documented.
- Applicable event relationships.
- Required configuration states.
- Mock success and error states.

## 4.6 Monetize

Preserve all twelve original Monetize sections and their routes.

Routes:

- `/monetize/subscription`
- `/monetize/newsletters`
- `/monetize/experience`
- `/monetize/courses`
- `/monetize/downloadable`
- `/monetize/merchandise`
- `/monetize/nfts`
- `/monetize/event-calendar`
- `/monetize/vip-offers`
- `/monetize/portfolio`
- `/monetize/discount-codes`
- `/monetize/advertisements`

Implement listings, cards, tables, filters, empty states, details, and applicable modals according to the reference pack.

Also implement the relevant create/edit flows:

- Add Plan.
- New Newsletter.
- Add Experience.
- Add Course.
- Add Downloadable.
- Add External Merchandise.
- Add External NFT.
- Add Event.
- Add VIP Offer.
- Add Portfolio.
- New Discount Code.

Preserve existing field labels from the source material.

For Add Experience, retain documented fields such as:

- Type of Experience.
- Enter Title.
- Description.
- Disable/Enable control.

Mark the semantics of undocumented toggles or fields as inferred.

Implement:

- View Subscribers.
- Newsletter Recipients.
- Bandsintown Import Settings.
- Manage Native Tickets.

The AI agent must be able to navigate to every monetization destination, explain it, and coordinate relevant workflows.

## 4.7 Wallet

Preserve the original Wallet structure.

Routes:

- `/wallet`
- `/wallet/current-balance`
- `/wallet/referrals`
- `/wallet/transaction-history`
- `/wallet/loyalty-history`
- `/wallet/my-purchases`
- `/wallet/refund-requests`
- `/wallet/my-fulfillment-requests`

Include documented My Purchases categories:

- Newsletter.
- Merchandise.
- Courses.
- Experiences.
- Tips.
- Content.
- Messages.
- VIP Offers.
- Downloadables.
- Livestreams.
- Portfolio.
- Tickets.

Build required mock flows:

- Withdraw earnings.
- Connect payout account.
- Add card.
- View transactions.
- Review refund requests.
- Manage fulfillment.

All money-related actions must be mock-only.

Do not initiate real payments, bank connections, or withdrawals.

## 4.8 Insights & Fans

Route:
`/insights`

Preserve existing internal tabs and supported query parameters.

Include:

- Earning Metrics.
- Engagement Metrics.
- Post performance table.
- Fan Management.
- Fan Relationship Management.
- Segmentation & Outreach.
- Relevant search and filters.
- CSV export behavior using fictional data.

Preserve the distinction between metrics, fan lists, and fan relationship management.

Support the cross-section relationship where a Group is created in Preferences and fans are assigned through Fan Relationship Management.

## 4.9 Resources

Routes:

- `/resources`
- `/resources/announcements`
- `/resources/tips-tutorials`
- `/resources/service-providers`
- `/resources/creator-support`

Preserve original labels and page states.

Include the unread announcement badge where the mock state requires it.

## 4.10 Help and legal

Routes:

- `/help-faq`
- `/terms-of-service`
- `/privacy-policy`

Use documented content and layouts where available.

Do not invent authoritative legal text where the source is missing.

For undocumented content, use clearly marked nonproduction placeholders.

---

# PART 5 — ALL PREFERENCES SCREENS

The existing reference identifies sixteen primary Preferences tabs.

Preserve those tabs, their order, and their chip-style navigation.

Do not introduce visual group headings into the existing Preferences UI.

Use the source's actual routing structure.

## Primary tabs

1. Profile.
2. Welcome Message.
3. Interests.
4. Creator Type.
5. Customer Support.
6. Notifications & Newsletters.
7. NFT Wallet.
8. Monetization.
9. Privacy, Password & Integrations.
10. White Label Site.
11. Outbound Emails.
12. Link in Bio.
13. Delegation.
14. Topic Tags.
15. Groups.
16. Gamification.

## 5.1 Profile

Route:
`/edit-preference`

Support the documented profile information, editable fields, and validation.

## 5.2 Welcome Message

Route:
`/edit-preference/edit-welcome-message`

Preserve the reference's welcome video/message behavior.

## 5.3 Interests

Route:
`/edit-preference/edit-content`

Implement original interest selection chips.

## 5.4 Creator Type

Route:
`/edit-preference/edit-creator`

Implement creator category selection and follow-up questions.

Include the inferred Add Another Category Type state using documented categories:

- Musicians.
- Influencers.
- Entertainers & Performers.
- Athletes.
- Professionals.
- Organizations.
- Fitness & Wellness.
- Actors.

Use documented athlete-specific questions where available.

Mark unverified follow-up questions as inferred.

## 5.5 Customer Support

Route:
`/edit-preference/customer-support`

Preserve the documented distinctions between creator-managed inquiries and TopFan-managed support.

## 5.6 Notifications & Newsletters

Route:
`/edit-preference/notifications`

Preserve per-creator communication preferences.

## 5.7 NFT Wallet

Route:
`/edit-preference/connect-nft-wallet`

Include:

- MetaMask connection state.
- Resync state.
- Unlink modal.
- Related warnings.

Only simulated integrations.

## 5.8 Monetization Settings

Route:
`/edit-preference/monetization`

Include documented options for:

- Subscriber-only chat and comments.
- Tips.
- Paid direct messages.
- Guaranteed reply.

Keep this distinct from the Monetize product sections.

The AI must understand the difference between "Monetize" and "Monetization settings."

## 5.9 Privacy, Password & Integrations

Route:
`/edit-preference/privacy`

Implement the documented privacy, account, and integration states.

Also implement inferred or partially documented:

- Blocked Users.
- Pause Account.
- Delete Account.
- Calendar integration.
- Data-sharing controls.
- Sign-in methods.
- Password configuration.

Use the exact documented Pause Account modal copy where available.

Keep destructive actions protected.

## 5.10 White Label Site

Routes:

- `/edit-preference/whitelabel`
- `/edit-preference/whitelabel-cover-page`

Preserve the current implemented onboarding flow.

Ensure the existing:

- Domain selection.
- Domain discovery assistance.
- DNS setup.
- Verification.
- Provisioning.
- Creator Quest.
- Site activation.
- Domain details.
- Branding.
- Cover page.
- Colors.
- Logo.
- SEO and GTM settings.

remain functional.

The screenshot and specification references should be used to fill missing original controls, not to remove approved AI features.

The current assistant-led onboarding behavior must remain intact.

## 5.11 Outbound Emails

Route:
`/edit-preference/outbound-emails`

Implement:

- Custom email domain.
- DNS setup information.
- Verification states.
- Verification failure.
- Retry/setup-again behavior.

The default mock account has failed verification.

This should become a primary AI troubleshooting scenario.

## 5.12 Link in Bio

Routes:

- `/edit-preference/link-in-bio`
- `/edit-preference/link-in-bio/add-link-in-bio`

Implement:

- Enable/disable.
- Preview.
- Editing.
- Themes.
- Actions.
- Referral capability where documented.

## 5.13 Delegation

Routes:

- `/edit-preference/delegation/delegation-view`
- `/edit-preference/delegation/delegate-details`

Also implement Add New Delegate.

Documented initial fields:

- First Name.
- Last Name.
- Email Address.

Second-step fields should reflect the available reference information on:

- Content access.
- Financial access.
- Revenue share by stream.

Unverified details must be marked inferred.

## 5.14 Topic Tags

Routes:

- `/edit-preference/topic-tags`
- `/edit-preference/topic-tags/add`

Implement listing, creation, activation, and documented validation.

The reference indicates at least two active tags are required for the relevant behavior.

## 5.15 Groups

Routes:

- `/edit-preference/groups`
- `/edit-preference/groups/add`

Implement group creation and management according to the references.

Preserve its relationship with Insights & Fans and content restrictions.

## 5.16 Gamification

Routes:

- `/edit-preference/gamification/earn-points`
- `/edit-preference/gamification/buy-points`
- `/edit-preference/gamification/badges`

Implement the original documented features and states.

Do not confuse this existing TopFan gamification feature with the separate Creator Quest onboarding mini-games.

They are different systems.

---

# PART 6 — PUBLIC FAN-SIDE SCREENS

Reconstruct the captured public pages and the missing public views described in the reference.

Required:

- Public Home.
- Feed.
- Store.
- Product Detail.
- Welcome modal.
- Videos.
- Competitions.
- Event Detail.
- Video Series.
- Episode Player.
- Newsletters list.
- 1:1 video booking.
- Single Post Detail.
- VIP Deal Detail.
- Chat Room.
- Leaderboards.
- Logged-out header.
- Sign-in.
- Join.

### Public event routes

- `/dashboard/event-listing/:handle`
- `/dashboard/event-listing/:handle/ticket-purchase/:eventId`

### Public video routes

- `/dashboard/portfolio/:handle/banner-view/:portfolioId`
- `/dashboard/portfolio/:handle/video-series/:seriesId`

### Store and Product Detail

Use the available screenshot references:

- `83-*` for Store.
- `85-product-detail-part1.jpg` for Product Detail.

Store should include documented filters:

- ALL.
- COURSES.
- EXPERIENCES.
- MERCHANDISE.
- NFTS.
- DOWNLOADABLES.

Product Detail should include:

- Breadcrumb.
- Product image.
- Description.
- Price.
- Option chips.
- Quantity.
- Share.
- BUY NOW.

Because routes and some behavior are not confirmed, choose consistent inferred routes and document them.

Use only simulated buying.

Implement developer-only mock authentication state for fan-side demonstrations.

Do not alter the real creator navigation to accommodate the mock switch.

---

# PART 7 — MOCK DATA AND INTERCONNECTED APPLICATION STATE

Implement one coherent mock application store.

Use fictional data only.

Persist relevant mock changes locally as appropriate.

## 7.1 Default account state

Use the source's documented demonstration state:

- White Label Site active with a custom domain.
- Outbound Email verification failed.
- Three refund requests.
- Nine fulfillment requests.
- One unread Resources announcement.
- Two advertisement brands awaiting review.
- No automated messages.
- No Topic Tags.
- No Groups.
- Empty Loyalty History.
- Four delegates with different Content/Financial permissions.
- MetaMask linked.
- Google Calendar linked.
- Email-only sign-in.
- Gold, Silver, and Bronze subscription plans.

Use fictional identity information.

Do not copy personal data from screenshots.

## 7.2 Shared data relationships

Model the dependencies documented in the reference.

### Groups

Preferences → Groups creates the group.

Insights & Fans → Fan Relationship Management assigns or manages fans.

Content and offering controls determine access where supported.

### Topic Tags

Preferences creates tags.

Posts use tags.

Fans can filter the Feed.

### Newsletters

Monetize creates newsletters.

Recipients and fan data affect audience selection.

Outbound Emails affects sending-domain readiness.

### Events

Monetize manages events.

Public event routes display them.

Ticket configuration and scheduling connect to the relevant event.

### Paid DMs and Tips

Preferences → Monetization configures options.

Messages and posts use them.

Wallet and Insights display applicable earnings.

### White Label Site

Preferences manages the domain and branding.

The public website reflects supported branding settings.

### Delegation

Role permissions affect access to content and financial functionality.

Revenue share is tracked by relevant stream where documented.

### Referrals

Related data may appear in Wallet, Link in Bio, and Advertisements.

Preserve these separate product contexts.

## 7.3 State synchronization

When an action happens anywhere in the app:

- Update the shared store.
- Update related pages.
- Update relevant account readiness.
- Update the active AI workflow.
- Update task completion status.
- Preserve compatible form state.

Never show an AI success message without a corresponding successful application action.

---

# PART 8 — AI PRODUCT STRATEGY

## 8.1 Final AI concept

Name:

**TopFan AI — Your Creator Companion**

It is a goal-driven assistant layered over the existing TopFan interface.

It must support five internal capabilities:

1. Find.
2. Explain.
3. Guide.
4. Prepare.
5. Diagnose.

It should also be able to execute authorized application actions when supported.

These are internal capabilities, not separate user-selected modes.

## 8.2 One consistent entry point

Reuse the existing red jelly assistant.

The creator can:

- Open it.
- Minimize it.
- Resume it.
- Type a question.
- Record a voice question.
- Select a suggested action.
- Continue an active task.

Do not create a second AI navigation bar or a separate AI homepage.

## 8.3 Simple creator-facing language

The creator should be able to ask:

- "I want to start earning."
- "Where do I change my logo?"
- "How do I sell tickets?"
- "I want to create a VIP club."
- "What should I post next?"
- "Why isn't my email working?"
- "Can you help with this?"
- "I don't understand."
- "What needs my attention?"

Do not require TopFan terminology.

## 8.4 Adaptive interaction

The agent should work for:

- New creators.
- Nontechnical creators.
- Experienced users.
- Musicians.
- Athletes.
- Educators.
- Fitness creators.
- Streamers.
- Writers.
- Podcasters.
- Artists.
- Established teams.
- Delegates.

Creator type may influence recommendations, but must not limit available functionality.

Do not ask creators to select an assistance level.

Adapt naturally based on their questions and available account information.

## 8.5 Simplification rules

Every agent interaction should follow these rules:

- Understand the user's existing context.
- Avoid asking for known information.
- Ask only necessary clarifying questions.
- Ask one question at a time.
- Initially show at most three relevant recommendations where practical.
- Recommend one clear next action.
- Use short, plain-language explanations.
- Allow deeper details on request.
- Preserve task progress.
- Allow Back, Cancel, and Resume.
- Avoid repeating the same instructions.
- Do not force long conversations for simple navigation.
- Respect creator approval and permissions.

The goal is to make the agent sophisticated internally but simple to use.

---

# PART 9 — AI NAVIGATION ENGINE

## 9.1 Reuse the reference agent-context specification

The uploaded Markdown already requires machine-readable catalogs.

Build and extend them.

If using Angular, use the specified location:

`src/app/agent-context/`

If using another stack, use an equivalent directory.

Create:

- `routes`
- `features`
- `tasks`
- `actions`
- `account-state`

Also add:

- `permissions`
- `agent-context`
- `workflow-state`
- `knowledge`
- `recommendations`

Export human-readable or JSON versions to:

`docs/agent-context/`

## 9.2 Route registry

Every relevant destination must have:

- Stable ID.
- Route.
- Title.
- Parent section.
- Existing menu location.
- Access requirements.
- Source reference.
- Captured/spec-only/inferred status.
- Relevant UI element identifiers.

Do not invent routes when confirmed ones exist.

## 9.3 Feature registry

Each feature should include:

- Official TopFan feature name.
- Everyday-language synonyms.
- Description.
- Related creator goals.
- Existing screen destination.
- Prerequisites.
- Related features.
- Available actions.
- Permission requirements.
- Supporting knowledge.
- Implementation status.

Examples:

"Get paid" may relate to Wallet, payout setup, and monetization.

"Create a paid community" may relate to Subscriptions, Groups, and access settings.

"Change my website design" may relate to White Label Site, cover page, logo, and colors.

## 9.4 Stable UI identifiers

Add stable `data-testid` attributes to:

- Navigation items.
- Tabs.
- Buttons.
- Fields.
- Modals.
- Forms.
- Toggles.
- Primary actions.

These attributes must not change the interface visually.

Use them for tests and reliable agent navigation or highlighting where permitted.

## 9.5 Navigation behavior

When the user asks a simple location question:

1. Resolve intent.
2. Find the matching feature.
3. Validate the destination.
4. Open the existing route.
5. Keep the assistant accessible.
6. Provide a concise contextual response.

Example:

User:
"Where can I change my logo?"

AI:
"You'll find it under Preferences → White Label Site."

Action:
Open White Label Site.

Do not generate a lengthy explanation unnecessarily.

## 9.6 Feature ambiguity

Handle similarly named features carefully.

Examples:

- Monetize vs Monetization.
- Wallet vs NFT Wallet.
- Customer Support vs Creator Support vs Help Center.
- Notifications vs Activity.
- Groups vs fan segmentation.
- Link in Bio vs White Label Site.
- Creator Quest vs platform Gamification.

If a creator says:

"I need help with my wallet."

Ask a short clarification only if account context cannot identify the intended destination.

Example:

"Do you mean your earnings and withdrawals, or your connected NFT wallet?"

Do not guess when choosing incorrectly could expose financial or security information.

---

# PART 10 — REAL CONVERSATIONAL AI AND VOICE

## 10.1 Fix the current chatbot behavior

Inspect the existing assistant's response pipeline.

It currently may return repetitive or unrelated predefined responses.

Replace fixed-response behavior as the primary engine with a real LLM integration where API credentials are available.

Use a secure server-side route.

Do not expose API keys in the browser.

Send the model:

- Current user message.
- Necessary recent conversation context.
- Current route.
- Current application state.
- Active task.
- Relevant feature registry entries.
- Relevant permissions.
- Verified help information.

Keep context minimal and permission-scoped.

## 10.2 Functional responses

The assistant must:

- Answer relevant questions naturally.
- Understand follow-ups.
- Explain terms.
- Compare options.
- Identify features.
- Navigate.
- Guide tasks.
- Handle uncertainty.
- Avoid hallucinated product behavior.
- Never repeat one generic response to unrelated questions.

## 10.3 Voice input

Add microphone recording inside the existing assistant input.

Support:

- Microphone permission.
- Start recording.
- Stop recording.
- Cancel.
- Transcription.
- Editable transcript.
- Send message.
- Retry on failure.

Voice messages must enter the same AI pipeline as typed messages.

Do not automatically record.

Optional voice playback can be considered later.

## 10.4 No-AI fallback

If real LLM credentials are unavailable, provide a clearly labeled deterministic demo mode.

It must support the named hero scenarios using actual mock application state.

Do not pretend that demo mode can answer every possible question.

---

# PART 11 — GOAL-BASED AI WORKFLOWS

Implement an active task system.

Each task should have:

- Goal ID.
- Task name.
- Ordered steps.
- Required inputs.
- Page destinations.
- Dependencies.
- Completion checks.
- Current step.
- Confirmation requirements.
- Failure states.
- Recovery actions.
- Pause/resume behavior.

Tasks should span the existing TopFan UI without replacing its forms.

## 11.1 Direct navigation

Example:
"Open my logo settings."

AI opens Preferences → White Label Site.

## 11.2 Launch a subscription

Example:
"I want to start earning through exclusive content."

Flow:

1. Understand intent.
2. Recommend Subscriptions where appropriate.
3. Check relevant account readiness.
4. Open Monetize → Subscriptions.
5. Guide plan creation.
6. Help prepare name, pricing and benefits.
7. Review the plan.
8. Request publication approval.
9. Update mock state.
10. Confirm completion.
11. Offer a related announcement as an optional next step.

## 11.3 Sell a course

Flow:

1. Understand the learning product.
2. Open Courses.
3. Prepare course details.
4. Guide documented curriculum and pricing fields.
5. Review configuration.
6. Request approval before publishing.
7. Confirm the mock result.

## 11.4 Sell a downloadable

Guide the creator through the existing Downloadables functionality.

Support a draft, review, and mock publication.

## 11.5 Sell merchandise

Use the existing Merchandise functionality and documented external integration patterns.

Do not simulate a live Shopify connection as real.

## 11.6 Event and ticket sales

Flow:

1. Open Events & Ticketing.
2. Guide event details.
3. Configure ticket information.
4. Prepare promotional copy.
5. Review and approve.
6. Update demo event.
7. Link to its public event page.

## 11.7 Schedule a livestream

Respect the documented relationship between Livestream and Events.

Do not invent a separate scheduling UI if the product uses a modal or event flow.

## 11.8 Create a VIP group

This is a high-priority cross-section workflow.

Flow:

1. Identify free versus paid intent if necessary.
2. Determine relevant Group and subscription/access capabilities.
3. Open Preferences → Groups.
4. Create the group.
5. Open Insights & Fans when fan assignment is required.
6. Configure eligible fan access.
7. Connect relevant content or offerings using supported controls.
8. Prepare an optional welcome message.
9. Request necessary approval.
10. Confirm actual completed steps.

Do not invent automatic synchronization between products and groups where unsupported.

## 11.9 Fix outbound email verification

Use actual mock verification state.

Default state is failed.

AI should:

1. Recognize the failure.
2. Explain its likely meaning using actual available error data.
3. Guide the required DNS records.
4. Offer a verified tutorial if available.
5. Help retry verification.
6. Reflect the resulting state.

## 11.10 White Label Site setup

Preserve the existing enhanced onboarding:

- AI welcome and mascot animation.
- Domain ownership question.
- AI domain suggestions.
- Availability-check design.
- Purchase handoff.
- Provider guidance.
- DNS setup.
- Video tutorial.
- Verification.
- Provisioning.
- Creator Quest.
- Completion.

The AI should synchronize with actual form state.

## 11.11 Link in Bio

Navigate to the existing Link in Bio screen.

Guide supported configuration and content.

## 11.12 Topic Tags

Explain the minimum-active-tags requirement where relevant.

Navigate to the existing creation form.

## 11.13 Gamification

Navigate to the existing platform gamification configuration.

Explain available points, badges, and leaderboard functionality.

## 11.14 Delegation

Guide adding a delegate.

Respect Content and Financial permission boundaries.

Require strong confirmation before granting sensitive access.

## 11.15 Refunds and fulfillment

AI should detect pending requests from the mock store.

Show relevant information and navigate to the appropriate existing queue.

Never automatically approve a refund without explicit authorization.

## 11.16 Withdraw earnings

Explain eligibility, available balance, and relevant requirements.

Open the original withdrawal flow.

Use protected confirmation.

No real financial transfer.

## 11.17 Fan segments

Help identify segmentation criteria and navigate to the existing relevant controls.

Use authorized fan data only.

## 11.18 Pause or delete account

Provide clear explanations.

Navigate to existing controls.

Require strong confirmation.

Do not execute destructively through a simple chat instruction.

---

# PART 12 — ACCOUNT HEALTH AND PERSONALIZED RECOMMENDATIONS

This capability is central to the AI's usefulness.

Create a pure account-state function reading the actual mock store.

It should detect:

- Incomplete setup.
- Failed verification.
- Pending refund requests.
- Pending fulfillment.
- New advertisement brands.
- Missing automated messages.
- Insufficient Topic Tags.
- Upcoming events.
- Unfinished drafts.
- Other verified issues.

## 12.1 Recommendation priority

Use this order by default:

1. Critical or blocking issues.
2. Pending operational tasks.
3. Unfinished user-initiated workflows.
4. Relevant setup actions.
5. Goal-based growth opportunities.
6. Optional feature discovery.

Do not show every recommendation at once.

When the user asks:

"What should I focus on today?"

Recommend the most relevant immediate action, explain why, and offer navigation.

Example:

"You have three refund requests waiting for review. Would you like to open them?"

The mock account should actually contain those three requests.

## 12.2 Creator-specific behavior

A musician may receive event or merchandise suggestions.

An educator may receive course or paid-content suggestions.

A streamer may receive livestream or community suggestions.

But creator category is not sufficient evidence.

Use actual stated goals and available account data.

Do not automatically prioritize monetization for every creator.

## 12.3 Nonintrusive behavior

Do not constantly interrupt users.

The agent should remain quiet during normal navigation.

Proactive prompts should be limited to relevant and important information.

Allow dismissal and avoid repeating dismissed suggestions unnecessarily.

---

# PART 13 — AGENT ACTIONS AND USER APPROVAL

Implement validated structured actions.

Examples:

- `searchFeatures`
- `navigateToFeature`
- `getPageContext`
- `getAccountHealth`
- `getCreatorProfile`
- `getSubscriptions`
- `prepareSubscriptionDraft`
- `getFans`
- `prepareMessageDraft`
- `getPendingRefunds`
- `getWalletSummary`
- `getVerificationStatus`
- `startWorkflow`
- `completeWorkflowStep`
- `pauseWorkflow`
- `resumeWorkflow`
- `requestConfirmation`

Adapt names to the existing architecture.

The LLM may propose an action, but application code must validate:

- Parameters.
- Route existence.
- Permission.
- Task state.
- Action eligibility.
- Required approval.

No unrestricted model-generated code execution.

## Risk classification

### Navigate

Read, explain, search, or navigate.

No special confirmation for harmless navigation.

### Draft

Prepare content for review.

Do not publish automatically.

### Confirm

Require explicit approval for publishing, sending, changing live prices, granting access, refunds, and other consequential actions.

### Protected

Require stronger confirmation for:

- Withdrawals.
- Payment details.
- Delegate Financial access.
- Password changes.
- Pause/delete account.
- Site deletion.
- Wallet unlinking.
- DNS changes.

Preserve the original application's own authentication and authorization requirements.

A chat confirmation must not replace required platform security controls.

---

# PART 14 — AI PANEL STATES AND UX

The assistant should support:

- Collapsed.
- Expanded.
- Idle.
- Listening.
- Transcribing.
- Thinking.
- Responding.
- Navigation result.
- Feature recommendation.
- Active task.
- Draft review.
- Confirmation request.
- Action running.
- Success.
- Error.
- Paused task.
- Resumed task.

## Active task card

When guiding a multistep workflow, show a compact task summary inside the agent panel.

Example:

"Launch a paid subscription"

Step 2 of 4.

Next:
"Choose your price and benefits."

Action:
"Open Subscription Settings."

The rest of the original page remains unchanged.

## Keep it simple

Do not show multiple simultaneous forms in the assistant.

Do not recreate the original feature UI inside the conversation.

Keep messages short.

Use action buttons only when relevant.

Maintain the user's current task even if they manually navigate elsewhere.

If they complete the required step manually, update task progress.

If they cancel, preserve draft data where appropriate.

## Contextual accuracy

If the user is on Outbound Emails and asks:

"Why is it failing?"

The AI should understand the question in the context of email-domain verification.

It should not provide an unrelated answer about White Label Site provisioning.

If the user asks:

"How do I fix it?"

The AI should continue the same troubleshooting context.

---

# PART 15 — DEMO CREATOR PROFILES AND PERMISSIONS

Create a developer-only profile switcher.

Support representative demos for:

- Musician.
- Athlete.
- Educator.
- Fitness creator.
- Podcaster/writer.
- Gamer/streamer.
- Artist.
- Established creator with a team.

Use fictional data.

Each profile should have coherent:

- Posts.
- Followers/fans.
- Offerings.
- Earnings.
- Activity.
- Account health.
- Relevant interests.
- Permissions.

Do not introduce the switcher into the original TopFan visible navigation.

Support demonstration roles:

- Creator owner.
- Content delegate.
- Financial delegate.

Use confirmed permissions where documented.

Mark unsupported permission assumptions clearly.

Enforce restrictions at the mock service layer, not merely through chatbot wording.

---

# PART 16 — TESTING AND ACCEPTANCE

Use Playwright where compatible with the current stack.

## 16.1 Screen coverage

Test:

- Every route.
- Every primary navigation item.
- Every Preferences tab.
- Every Monetize section.
- Wallet tabs.
- Resources.
- Insights & Fans.
- Public fan routes.
- Existing onboarding.
- Creator Quest.
- Unknown-route fallback.
- Browser back/forward.

## 16.2 Visual fidelity

At each captured viewport, compare reconstructed pages with available screenshots.

Save QA captures.

Record:

- Matched.
- Partially matched.
- Inferred.
- Missing reference.
- Known difference.

Do not claim pixel-perfect fidelity without a comparison.

## 16.3 AI navigation

Verify that the agent can find and navigate to every major feature.

Test everyday phrasing and synonyms.

Examples:

- "Change my logo."
- "I want to sell merchandise."
- "Where are my refunds?"
- "Show my earnings."
- "How do I add a team member?"
- "I want to send a newsletter."
- "Where are my fans?"
- "Help me create a course."
- "How do I connect my email?"
- "Where are my NFT settings?"

## 16.4 Hero workflow tests

Complete end-to-end tests for:

1. Change logo navigation.
2. Create a post.
3. Launch a subscription.
4. Create a VIP group and manage fan access.
5. Create an event and ticket offering.
6. Fix Outbound Email verification.
7. Review pending refunds.
8. Prepare a welcome message.
9. Complete a permitted delegate task.
10. Ask "What should I do next?"

Ensure the application state changes appropriately.

## 16.5 Conversation quality

Test:

- Unrelated questions.
- Contextual follow-ups.
- Nontechnical explanations.
- Technical explanations.
- Ambiguous requests.
- Previous-step references.
- Error recovery.
- User cancellation.
- Assistant collapse/reopen.
- Voice transcription.
- LLM timeout.
- Mock mode.

The agent must not return a single repeated answer to different questions.

## 16.6 Security

Verify that:

- Unauthorized financial actions are blocked.
- Delegates receive only permitted data.
- Sensitive actions require approval.
- Mock transactions cannot become real.
- API credentials are not client-exposed.
- Imported reference files are not executed.
- User PII from references is not reused.

---

# PART 17 — DOCUMENTATION DELIVERABLES

Create or update:

- `README.md`
- `docs/coverage.md`
- `docs/known-issues.md`
- `docs/open-questions.md`
- `docs/platform-understanding.md`
- `docs/agent-context/`
- `docs/agent-workflows.md`
- `docs/ai-permissions.md`
- `docs/mock-integrations.md`
- `qa/`
- `qa/visual-comparison.md`
- `qa/agent-navigation-tests.md`

Coverage documentation must distinguish:

- Existing reused screens.
- Reconstructed captured screens.
- Spec-only screens.
- Inferred screens.
- Functional demo flows.
- Unsupported/unverified flows.

Also create any missing Store and Product Detail specifications called for by the uploaded Markdown.

---

# PART 18 — IMPLEMENTATION ORDER

Build in phases while preserving the existing prototype.

## Phase 1 — Audit

- Read the existing codebase.
- Inspect attached references.
- Inventory current screens.
- Identify missing screens.
- Identify existing AI capabilities.
- Identify reusable components.
- Establish the route coverage matrix.

## Phase 2 — Foundation

- Normalize application state.
- Build shared components.
- Create route and feature registries.
- Establish mock services.
- Preserve existing user-facing UI.

## Phase 3 — Preferences

Implement all sixteen original Preferences tabs and missing subpages.

Preserve the approved White Label Site and onboarding implementations.

## Phase 4 — Creator dashboard

Build:

- Activity.
- Messages.
- New Post.
- Livestream.
- Monetize.
- Wallet.
- Insights & Fans.
- Resources.

Include their relevant detail, create, edit, and modal states.

## Phase 5 — Public fan-side pages

Build all captured and inferred public screens.

Connect them to the same mock data.

## Phase 6 — AI navigation

Integrate the existing agent with the full route and feature registry.

Make natural-language navigation work.

Fix repetitive conversational responses.

Add reliable context awareness.

## Phase 7 — Guided workflows

Implement the documented task catalog and hero flows.

Add cross-section progress tracking.

Connect approved actions to the mock store.

## Phase 8 — Account intelligence

Implement account health, prioritization, and relevant creator recommendations.

## Phase 9 — Voice and refinement

Complete voice transcription, interaction states, mascot reactions, error recovery, and performance improvements.

## Phase 10 — QA

Test the full connected application.

Repair broken routes, interactions, workflow states, and permissions.

Do not stop after building a few representative screens.

---

# PART 19 — FINAL ACCEPTANCE CRITERIA

The work is complete only when:

1. All documented major TopFan screens are represented.
2. Existing screens have not been redesigned.
3. Missing captured screens follow the reference screenshots.
4. Inferred screens are clearly documented.
5. The original TopFan navigation remains intact.
6. All major destinations are accessible manually.
7. All major destinations are accessible through the AI.
8. The assistant understands natural creator language.
9. Typed questions produce relevant conversational answers.
10. Voice questions can be transcribed and processed.
11. The assistant understands the current page.
12. Multistep workflows preserve context across screens.
13. Supported AI actions update real demo application state.
14. The assistant recognizes manually completed steps.
15. Users can pause, resume, and cancel tasks.
16. Nontechnical users receive clear, simple guidance.
17. Creator-specific recommendations remain relevant.
18. Protected actions enforce permissions and approval.
19. The White Label Site onboarding remains functional.
20. Creator Quest and provisioning remain functional.
21. The completion experience remains intact.
22. Public fan-side pages are connected to the creator-side data.
23. All routes have test coverage.
24. Mock integrations are identified as mock.
25. An implementation report identifies completed work, remaining gaps, and unverified assumptions.

---

# FINAL EXECUTION INSTRUCTION

Start by inspecting the existing localhost project and attached reference specification.

Reconstruct the missing TopFan platform screens using the documented original navigation, routes, screenshots, component patterns, and interactions.

Do not redesign the original interface.

At the same time, preserve and extend the existing AI assistant so that it can understand creator goals, find functionality across the platform, guide multistep tasks, and complete supported actions through the existing screens.

Use one coherent application state so pages and AI stay synchronized.

Work sequentially through the implementation phases, running tests and correcting failures after each major milestone.

Do not ask for confirmation between ordinary implementation steps. If a reference is missing, document it, use a clearly identified approximation where safe, and continue with the rest.

Do not stop at documentation or static mockups.

The final POC must demonstrate the complete product interaction:

**A creator expresses a goal → TopFan AI understands it → identifies the right existing features → navigates the original interface → helps complete the workflow → confirms the result → recommends the next relevant action.**

This must work across the reconstructed TopFan platform, not only within White Label Site onboarding.
