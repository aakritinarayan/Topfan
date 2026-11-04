# Monetize + public commerce — build notes

Spec: `14-monetize.md` + screenshots 14*, public 81/82/83/85/88/90. All seed data is fictional.

## Routes

### Monetize tabs (captured, `src/app/routes/monetize.ts`)
subscription · newsletters · experience · courses · downloadable · merchandise · nfts · event-calendar ·
vip-offers · portfolio · discount-codes · advertisements (`/monetize` redirects to subscription).

### Create / edit flows (all `status: "inferred"`; the spec gives no URLs for them)
| id | path |
|---|---|
| monetize-plan-add / -plan-edit | /monetize/subscription/create (old /add-plan redirects), /edit-plan/:planId |
| monetize-subscribers | /monetize/subscription/subscribers/:planId |
| monetize-newsletter-new / -edit | /monetize/newsletters/add, /edit/:newsletterId |
| monetize-newsletter-recipients | /monetize/newsletters/recipients |
| monetize-experience-add / -edit | /monetize/experience/create-experience, /edit-experience/:productId |
| monetize-course-add / -edit | /monetize/courses/add-course, /edit-course/:productId |
| monetize-downloadable-add / -edit | /monetize/downloadable/add-downloadable, /edit-downloadable/:productId |
| monetize-merch-add / -edit | /monetize/merchandise/add-external-merchandise, /edit-merchandise/:productId |
| monetize-nft-add / -edit | /monetize/nfts/add-external-nft, /edit-nft/:productId |
| monetize-event-add / -edit | /monetize/event-calendar/add-event, /edit-event/:eventId |
| monetize-event-tickets | /monetize/event-calendar/manage-native-tickets/:eventId |
| monetize-vip-add / -edit | /monetize/vip-offers/add-offer, /edit-offer/:offerId |

Modals (no route): Bandsintown Import Settings (`modal-monetize-bandsintown`), Add Portfolio,
New/Edit Discount Code, Events banner title edit, Newsletter preview, Ad earnings View, every Confirm dialog.

### Public (layout `public`)
Captured: public-events (82), public-event-detail (88), public-videos (81), public-video-series (90, episode
player modal 81c/90b), public-store (83), public-product (85).
Inferred: public-booking `/:handle/store/:productId/book`, public-newsletters `/:handle/newsletters`,
public-vip-deals `/:handle/vip-deals`, public-vip-deal `/:handle/vip-deals/:offerId`.
Feed/Home chips can link to them by id: public-store, public-newsletters, public-vip-deals, public-events, public-videos.

## Store actions (`src/store/slices/monetize.ts`)
Helpers: uid, money, benefitCountLabel, KIND_LABEL, storeItems, isPastEvent, toMEvent, selectEvents, audienceSize.
Mutators (call only inside `act`): addPlan, updatePlanDetails, updatePlanPrices*, deletePlan, saveNewsletterDraft,
sendNewsletter†, scheduleNewsletter†, duplicateNewsletter, deleteNewsletter, setNewslettersOnProfile, addProduct,
updateProduct, setProductPrice*, deleteProduct, toggleFeatured, moveProduct, resyncShopify, disconnectShopify‡,
connectShopify, addEvent, updateEvent, deleteEvent, updateTicketLevels*, setEventsSettings, saveBandsintown,
importBandsintown, addVipOffer, updateVipOffer, setVipActive†, deleteVipOffer, moveVipOffer, setVipSettings,
addPortfolio, deletePortfolio, addDiscountCode, updateDiscountCode, setDiscountActive, deleteDiscountCode,
approveAdBrand†, declineAdBrand, saveAdPreferences†, requestBooking, placeOrder.

Writes use `content.write`. Items marked * need `finance.write` (behind a Confirm modal). † are Confirm tier.
‡ is Protected: a Confirm modal plus typing the store name, with `account.admin`.
Fan-side purchases (placeOrder, requestBooking) need no capability. They are simulated: no payment, no network.

`d.monetize.events` stays `EventItem[]`, because `src/app/profiles.ts` pushes plain items into it. Read events
through `selectEvents` or `toMEvent`, which fill in the defaults for time, tz, ctas and tickets.

## Source bugs reproduced
- The plan card counts benefits off by one: it shows "6 benefits" over 7 bullets, because the chip leaves out the Direct Messages bullet (`benefitCountLabel`). Subscriptions + Create/Update Plan follow the aj-white-subscriptions pack (`forms/PlanForm.tsx`, `forms/plan/`).
- Casing is inconsistent: "E-Book" vs "E-book" in downloadable titles.
- Downloadable cards show no price. The store shows a price only for course, NFT and external items, as captured.

## Inferred / not captured
- Every create/edit form layout (fields come from the spec text; layout follows the captured Monetize form style).
- The Experiences Disable/Enable toggle, the experience-type options, and the call-duration rows.
- The "No Active Events" empty copy (only "No Past Events" was captured).
- The Bandsintown modal content. Connect only flips a mock flag. "Import Now" adds one fictional event.
- The Shopify connect bar shown when the store is disconnected.
- The newsletter Schedule date picker and the Groups audience. `d.prefsB.groups` is empty by default, so the form
  shows "You haven't created any Groups yet. Create a Group" with a link to pref-groups-add.
- Ad catalog brands, the Approve/Decline row for new brands, and the earnings View modal.
- The public newsletters list, VIP deals list and detail, 1:1 booking page, and the ticket checkout Confirm.
- The episode player is a simulated timer (no media). The speed menu, mute and fullscreen are UI only.

## Open questions
- Uploaded images are object URLs, so they don't survive a reload. Only the file name persists.
- Groups audience size is 0 until other areas seed fans into groups.
- The 83/85 references show the creator sidebar (the creator viewing their own store). Per the brief, the public
  routes use the `public` layout instead. The drag handle and kebab menu appear when `session.fanView === "creator"`.
- Real URLs for the flow routes are unknown. Swap them in `routes/monetize.ts` if captured later.

## Store and Product Detail spec (from screenshots 83*, 85)
**Store `/:handle/store`.** The header is back arrow, avatar, "<Name>'s Store" and an info icon. The info popover
(83c) explains what fans can buy. Filter chips: ALL · COURSES · EXPERIENCES · MERCHANDISE · NFTS · DOWNLOADABLES
(83a filters to one kind). Below is a 3-column grid of 305×305 cards: image, a 4px white border, a bottom gradient,
and the title (white, 20/700). Top-left is a red kind badge (Experience / Merchandise / Downloadables / NFT /
Course). Top-right is a lock circle when the item is locked to subscribers, plus either a filled star (featured) or
a kebab menu. The kebab (83b) has one item: "Feature on Profile". When the creator views the page, a drag handle
sits bottom-right for reordering. Only published items are listed. External merch and NFTs link out, and the mock
shows a toast instead of navigating. New products created in Monetize appear here immediately.

**Product Detail `/:handle/store/:productId`.** The breadcrumb reads "<Name>'s Store > <Kind> > <Title>". The page
has two columns. Left: a 334×450 image. Right: a rounded surface card with the title (24/700), the description, a
share circle, "Current Price" with the amount, an option group per attribute (e.g. Color, Board Size) shown as pill
chips where the first is selected (red fill) and the rest are outlined, a quantity stepper (− 1 +), and a
200px "BUY NOW" pill. BUY NOW opens a Confirm checkout and records a simulated order. For 1:1 call experiences the
CTA is "Schedule", which opens the inferred booking page (pick a duration, date and time; the request is recorded).

## Reference pack alignment (Experiences, Newsletters)
Source: creator-platform-screens (experience-01…16, newsletter-01…14). Routes now follow it:
`/monetize/experience/create-experience`, `/monetize/newsletters/add`, `/monetize/newsletters/edit/:newsletterId`.
- Experience form: `forms/ExperienceForm.tsx`. The 5 reference types are labels over the stored values
  (`1:1 Video Call`, `In Person Session`, `Personalized Video`, `Social Media Interaction`, `Other`), which bio
  links and the assistant read. Calendar types show the scheduling block (Mon–Fri, 9:00 AM–5:00 PM, 12 Hours,
  15 Days) and store `durations` + `schedule`; In-Person adds a required `address`. Restrictions store
  `restrict` (plans, NFT contracts); `locked` = Subscribers restriction. Preview image is required.
- Google/Outlook Calendar: no OAuth here. The buttons say "isn't available in this demo… nothing was connected".
- DISABLE/ENABLE: experiences = published on the Store; newsletters = shown on the public Newsletters page.
- Newsletter editor: contentEditable + execCommand (emoji, B/I/U, size, lists, link, code, local image/video/audio,
  divider, undo/redo). AI image and "feature an item" tools are not shown (no flow behind them).
  `body` keeps plain text; `bodyHtml` keeps formatting.
- Pricing options: free plans, free NFT contracts, individual price (+ purchase restriction), Loyalty Points
  (`points`; the reference showed no field, this mirrors the post Lock dialog). Lock is derived for compatibility.
- PUBLISH NOW → confirmation with Send To (audience). Chevron → Schedule / Save as Draft. Sending stays refused by
  the store unless outbound email is verified; the form explains this up front.
- Draft autosave: Edit + Draft only, after a change, through `saveNewsletterDraft` (content.write). Failures shown.
- Recipients: dialog from the list, DOWNLOAD CSV builds a local file from the fictional mock recipients.
