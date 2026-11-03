import { ANYONE, CREATOR, type RouteDef } from "./types";

const M = "Sidebar › Monetize";
const tab = (id: string, path: string, title: string, shots: string[]): RouteDef => ({
  id: `monetize-${id}`, pattern: `/monetize/${path}`, title, section: "monetize", menu: `${M} › ${title.toUpperCase()}`, layout: "dashboard", access: CREATOR, status: "captured", spec: "14-monetize.md", shots,
});
/** Create / edit flows: not captured (capture was view-only), so URLs and forms are INFERRED. */
const flow = (id: string, pattern: string, title: string, parent: string, menu: string, note = "Route and form inferred (not captured)."): RouteDef => ({
  id, pattern, title, section: "monetize", parent, menu: `${M} › ${menu}`, layout: "dashboard", access: CREATOR, status: "inferred", spec: "14-monetize.md", note,
});

/** Monetize (creator) + public commerce pages. Owned by the Monetize build. Add create/edit routes here. */
export const monetizeRoutes: RouteDef[] = [
  { id: "monetize", pattern: "/monetize", title: "Monetize", section: "monetize", menu: M, layout: "dashboard", access: CREATOR, status: "captured", spec: "14-monetize.md", redirect: "monetize-subscription" },
  tab("subscription", "subscription", "Subscriptions", ["14-", "14a-"]),
  tab("newsletters", "newsletters", "Newsletters", ["14b-"]),
  tab("experience", "experience", "Experiences", ["14c-"]),
  tab("courses", "courses", "Courses", ["14d-"]),
  tab("downloadable", "downloadable", "Downloadables", ["14e-"]),
  tab("merchandise", "merchandise", "Merchandise", ["14f-"]),
  tab("nfts", "nfts", "NFTs", ["14g-"]),
  tab("event-calendar", "event-calendar", "Events & Ticketing", ["14h-"]),
  tab("vip-offers", "vip-offers", "VIP Offers", ["14i-"]),
  tab("portfolio", "portfolio", "Portfolios", ["14j-"]),
  tab("discount-codes", "discount-codes", "Discount Codes", ["14k-"]),
  tab("advertisements", "advertisements", "Advertisements", ["14l-", "14m-", "14x-"]),

  /* create / edit flows (inferred). Bandsintown Import Settings, Add Portfolio and New Discount Code are modals. */
  flow("monetize-plan-add", "/monetize/subscription/add-plan", "Add Plan", "monetize-subscription", "SUBSCRIPTIONS › ADD NEW PLAN"),
  flow("monetize-plan-edit", "/monetize/subscription/edit-plan/:planId", "Edit Plan", "monetize-subscription", "SUBSCRIPTIONS › plan pencil"),
  flow("monetize-subscribers", "/monetize/subscription/subscribers/:planId", "View Subscribers", "monetize-subscription", "SUBSCRIPTIONS › N ACTIVE SUBSCRIBERS"),
  flow("monetize-newsletter-new", "/monetize/newsletters/add", "New Newsletter", "monetize-newsletters", "NEWSLETTERS › + NEW NEWSLETTER", "URL and form from the creator-platform reference pack (newsletter-09…13)."),
  flow("monetize-newsletter-edit", "/monetize/newsletters/edit/:newsletterId", "Edit Newsletter", "monetize-newsletters", "NEWSLETTERS › row pencil", "URL and form from the creator-platform reference pack (newsletter-05…08)."),
  flow("monetize-newsletter-recipients", "/monetize/newsletters/recipients", "Newsletter Recipients", "monetize-newsletters", "NEWSLETTERS › VIEW NEWSLETTER RECIPIENTS"),
  flow("monetize-experience-add", "/monetize/experience/create-experience", "Create Experiences", "monetize-experience", "EXPERIENCES › CREATE EXPERIENCES / Add Another Experience", "URL and form from the creator-platform reference pack (experience-02…16)."),
  // Old path (before the reference pack): kept as a redirect so earlier links and ?work= hand-offs still open the form.
  { ...flow("monetize-experience-add-legacy", "/monetize/experience/add-experience", "Create Experiences", "monetize-experience", "EXPERIENCES › CREATE EXPERIENCES (old URL)", "Redirects to /monetize/experience/create-experience, keeping the query."), redirect: "monetize-experience-add" },
  flow("monetize-experience-edit", "/monetize/experience/edit-experience/:productId", "Edit Experience", "monetize-experience", "EXPERIENCES › card pencil"),
  flow("monetize-course-add", "/monetize/courses/add-course", "Add Course", "monetize-courses", "COURSES › Add Another Course"),
  flow("monetize-course-edit", "/monetize/courses/edit-course/:productId", "Edit Course", "monetize-courses", "COURSES › card pencil"),
  flow("monetize-downloadable-add", "/monetize/downloadable/add-downloadable", "Add Downloadable", "monetize-downloadable", "DOWNLOADABLES › Add Another Downloadable"),
  flow("monetize-downloadable-edit", "/monetize/downloadable/edit-downloadable/:productId", "Edit Downloadable", "monetize-downloadable", "DOWNLOADABLES › card pencil"),
  flow("monetize-merch-add", "/monetize/merchandise/add-external-merchandise", "Add External Merchandise", "monetize-merchandise", "MERCHANDISE › ADD EXTERNAL MERCHANDISE"),
  flow("monetize-merch-edit", "/monetize/merchandise/edit-merchandise/:productId", "Edit Merchandise", "monetize-merchandise", "MERCHANDISE › card pencil"),
  flow("monetize-nft-add", "/monetize/nfts/add-external-nft", "Add External NFT", "monetize-nfts", "NFTS › ADD EXTERNAL NFTS"),
  flow("monetize-nft-edit", "/monetize/nfts/edit-nft/:productId", "Edit External NFT", "monetize-nfts", "NFTS › card pencil"),
  flow("monetize-event-add", "/monetize/event-calendar/add-event", "Add Event", "monetize-event-calendar", "EVENTS & TICKETING › + ADD EVENT"),
  flow("monetize-event-edit", "/monetize/event-calendar/edit-event/:eventId", "Edit Event", "monetize-event-calendar", "EVENTS & TICKETING › event pencil"),
  flow("monetize-event-tickets", "/monetize/event-calendar/manage-native-tickets/:eventId", "Manage Native Tickets", "monetize-event-calendar", "EVENTS & TICKETING › MANAGE NATIVE TICKETS"),
  flow("monetize-vip-add", "/monetize/vip-offers/add-offer", "Add VIP Offer", "monetize-vip-offers", "VIP OFFERS › ADD NEW OFFER"),
  flow("monetize-vip-edit", "/monetize/vip-offers/edit-offer/:offerId", "Edit VIP Offer", "monetize-vip-offers", "VIP OFFERS › row pencil"),

  /* public commerce (fan side) */
  { id: "public-events", pattern: "/dashboard/event-listing/:handle", title: "Competitions", section: "public", menu: "Public Home › Competitions", layout: "public", access: ANYONE, status: "captured", spec: "82-competitions.md", shots: ["82-", "82a-", "82b-", "82c-"] },
  { id: "public-event-detail", pattern: "/dashboard/event-listing/:handle/ticket-purchase/:eventId", title: "Event detail", section: "public", parent: "public-events", menu: "Competitions › an event", layout: "public", access: ANYONE, status: "captured", spec: "88-event-detail.md", shots: ["88-"] },
  { id: "public-videos", pattern: "/dashboard/portfolio/:handle/banner-view/:portfolioId", title: "Videos", section: "public", menu: "Public Home › Videos", layout: "public", access: ANYONE, status: "captured", spec: "81-videos.md", shots: ["81-", "81a-", "81b-", "81c-", "81d-"] },
  { id: "public-video-series", pattern: "/dashboard/portfolio/:handle/video-series/:seriesId", title: "Video Series", section: "public", parent: "public-videos", menu: "Videos › a series", layout: "public", access: ANYONE, status: "captured", spec: "90-video-series.md", shots: ["90-", "90a-", "90b-", "90c-"] },
  { id: "public-store", pattern: "/:handle/store", title: "Store", section: "public", menu: "Profile › Store button", layout: "public", access: ANYONE, status: "captured", shots: ["83-", "83a-", "83b-", "83c-"], note: "Route inferred (no spec); screenshots 83-*. Spec written in src/pages/monetize/NOTES.md." },
  { id: "public-product", pattern: "/:handle/store/:productId", title: "Product detail", section: "public", parent: "public-store", menu: "Store › a product", layout: "public", access: ANYONE, status: "captured", shots: ["85-"], note: "Route inferred (no spec); one screenshot. Spec written in src/pages/monetize/NOTES.md." },
  { id: "public-booking", pattern: "/:handle/store/:productId/book", title: "Book a 1:1 Call", section: "public", parent: "public-product", menu: "Store › Live Video Call › SCHEDULE", layout: "public", access: ANYONE, status: "inferred", note: "Not captured. Built from the Home 'Exclusive experience' card (10-home.md) and the product detail pattern." },
  { id: "public-newsletters", pattern: "/:handle/newsletters", title: "Newsletters", section: "public", menu: "Profile › NEWSLETTERS chip", layout: "public", access: ANYONE, status: "inferred", note: "Not captured. Built from the list-page header pattern (82/83)." },
  { id: "public-vip-deals", pattern: "/:handle/vip-deals", title: "VIP Deals", section: "public", menu: "Profile › VIP DEALS chip", layout: "public", access: ANYONE, status: "inferred", note: "Not captured. Built from the Home 'VIP Deals' rows (10-home.md)." },
  { id: "public-vip-deal", pattern: "/:handle/vip-deals/:offerId", title: "VIP Deal", section: "public", parent: "public-vip-deals", menu: "VIP Deals › VIEW DEAL", layout: "public", access: ANYONE, status: "inferred", note: "Not captured. Built from the event detail two-card pattern (88)." },
];
