import { ANYONE, CREATOR, type RouteDef } from "./types";

const M = "Sidebar › Monetize";
const tab = (id: string, path: string, title: string, shots: string[]): RouteDef => ({
  id: `monetize-${id}`, pattern: `/monetize/${path}`, title, section: "monetize", menu: `${M} › ${title.toUpperCase()}`, layout: "dashboard", access: CREATOR, status: "captured", spec: "14-monetize.md", shots,
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
  /* public commerce (fan side) */
  { id: "public-events", pattern: "/dashboard/event-listing/:handle", title: "Competitions", section: "public", menu: "Public Home › Competitions", layout: "public", access: ANYONE, status: "captured", spec: "82-competitions.md", shots: ["82-", "82a-", "82b-", "82c-"] },
  { id: "public-event-detail", pattern: "/dashboard/event-listing/:handle/ticket-purchase/:eventId", title: "Event detail", section: "public", parent: "public-events", menu: "Competitions › an event", layout: "public", access: ANYONE, status: "captured", spec: "88-event-detail.md", shots: ["88-"] },
  { id: "public-videos", pattern: "/dashboard/portfolio/:handle/banner-view/:portfolioId", title: "Videos", section: "public", menu: "Public Home › Videos", layout: "public", access: ANYONE, status: "captured", spec: "81-videos.md", shots: ["81-", "81a-", "81b-", "81c-", "81d-"] },
  { id: "public-video-series", pattern: "/dashboard/portfolio/:handle/video-series/:seriesId", title: "Video Series", section: "public", parent: "public-videos", menu: "Videos › a series", layout: "public", access: ANYONE, status: "captured", spec: "90-video-series.md", shots: ["90-", "90a-", "90b-", "90c-"] },
  { id: "public-store", pattern: "/:handle/store", title: "Store", section: "public", menu: "Profile › Store button", layout: "public", access: ANYONE, status: "captured", shots: ["83-", "83a-", "83b-", "83c-"], note: "Route inferred (no spec); screenshots 83-*." },
  { id: "public-product", pattern: "/:handle/store/:productId", title: "Product detail", section: "public", parent: "public-store", menu: "Store › a product", layout: "public", access: ANYONE, status: "captured", shots: ["85-"], note: "Route inferred (no spec); one screenshot." },
];
