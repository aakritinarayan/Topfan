/**
 * Monetize: plans, newsletters, experiences, courses, downloadables, merchandise, NFTs, events, VIP offers, portfolios, discount codes, ads; plus public store data.
 * Owned by the Monetize build. Expand freely: keep the exported names (MonetizeState, initialMonetize).
 * Actions are plain functions that mutate a draft: act("label", (d) => myAction(d, …)).
 *
 * All seed data is fictional. Brand, product, venue and people names from the reference pack were
 * replaced with made-up equivalents of the same shape and length (see src/pages/monetize/NOTES.md).
 */
import type { AppData } from "../store";
import type { AdBrand, EventItem, ID, SubscriptionPlan } from "../model";

/* ------------------------------------------------------------------ types */

export type ProductKind = "experience" | "course" | "downloadable" | "merchandise" | "nft";

/** One sellable store item (Monetize › Experiences / Courses / Downloadables / Merchandise / NFTs). */
export interface Product {
  id: ID;
  kind: ProductKind;
  title: string;
  description: string;
  /** null = no price shown (downloadables in the capture show none). */
  price: number | null;
  /** Red lock circle on the card: content is paywalled / gated. */
  locked: boolean;
  /** Courses show a "Published" pill. */
  published: boolean;
  /** "| External" products (merch/NFT sold on another site). */
  external: boolean;
  externalUrl?: string;
  /** Shown with a star on the public store ("Feature on Profile"). */
  featured: boolean;
  /** Public store order (drag order). Lower first. */
  order: number;
  image?: string | null;
  /** Local file name only (no upload). */
  fileName?: string;
  /** Experience type (Add Experience › Type of Experience*). */
  experienceType?: string;
  /** Experience duration options (e.g. 1:1 video call: 15/30/45 minutes). */
  durations?: { label: string; price: number }[];
  /** Merch option groups (Product Detail › Color / Board Size chips). */
  options?: { name: string; values: string[] }[];
  /** Shopify collection (Merchandise filter). */
  collection?: string;
  source?: "shopify" | "external" | "native";
  createdAt: string;
}

export type NewsletterStatus = "Draft" | "Sent" | "Scheduled";
export interface Newsletter {
  id: ID;
  title: string;
  body: string;
  status: NewsletterStatus;
  image?: string | null;
  /** Who can read it once delivered. INFERRED options. */
  lock: "Free" | "Subscribers" | "Paid";
  price?: number;
  /** Who it goes to. "groups" reads d.prefsB.groups. INFERRED options. */
  audience: "all" | "plans" | "groups";
  planIds: ID[];
  groupIds: ID[];
  sent: number;
  opened: number;
  unlocked: number;
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

export interface Recipient {
  id: ID;
  name: string;
  email: string;
  source: "Subscriber" | "Follower" | "Newsletter Sign-up";
  joinedAt: string;
}

export interface Subscriber {
  id: ID;
  planId: ID;
  name: string;
  username: string;
  months: 1 | 3 | 6 | 12;
  since: string;
}

export type TicketLevel = EventItem["tickets"][number] & { id: ID; perk: string };

/** Event (contract EventItem + fields the screens need). */
export interface MEvent extends EventItem {
  /** "1:00 PM" local time + zone label ("MST" in lists, "US/Mountain" on the detail page). */
  time: string;
  timeZone: string;
  tzAbbr: string;
  /** Outline CTA buttons on the public listing ("MEET & GREET", "TICKETS"). */
  ctas: string[];
  maxPerPerson: number;
  tickets: TicketLevel[];
}

export interface VipOffer {
  id: ID;
  title: string;
  description: string;
  codeType: "General Code" | "Unique Codes";
  code: string;
  issued: number;
  left: number | "Unlimited";
  lockOptions: ("Individual Purchase" | "Subscription" | "Free")[];
  price?: number;
  endsAt: string;
  active: boolean;
  /** Brand logo (media key or uploaded path): VIP Offers rows, public deal list. */
  logo?: string | null;
  /** Deal photo (media key): public deal detail. */
  image?: string | null;
  order: number;
}

export interface Episode {
  id: ID;
  title: string;
  duration: string; // "00:09"
  seconds: number;
  releaseDate?: string | null;
  description: string;
  locked: boolean;
  /** Playable video (media key); its poster is the thumbnail. */
  video?: string | null;
}
export interface VideoSeries {
  id: ID;
  title: string;
  description: string;
  price: number;
  /** Cover: an image key/path, or a video key (its poster is shown). */
  cover?: string | null;
  episodes: Episode[];
}
export interface Portfolio {
  id: ID;
  title: string;
  type: "Video" | "Photo";
  banner?: string | null;
  series: VideoSeries[];
  singles: Episode[];
  createdAt: string;
}

export interface DiscountCode {
  id: ID;
  code: string;
  used: number;
  applicableFor: string[];
  discountType: "Percentage" | "Fixed Amount";
  value: number;
  endDate: string; // ISO date
  active: boolean;
}

export interface AdCatalogBrand {
  id: ID;
  name: string;
  categories: string[];
  enabled: boolean;
  /** Brand logo (media key); brands without one show initials. */
  logo?: string | null;
}

/** Contract AdBrand plus an optional logo (media key) for the New Brands to Review list. */
export type MAdBrand = AdBrand & { logo?: string | null };

export interface Booking {
  id: ID;
  productId: ID;
  option: string;
  price: number;
  date: string;
  time: string;
  note: string;
  createdAt: string;
}

export interface Order {
  id: ID;
  productId?: ID;
  eventId?: ID;
  label: string;
  quantity: number;
  total: number;
  createdAt: string;
}

export interface MonetizeState {
  /* --- cross-section contract (keep these fields; others read them) --- */
  plans: SubscriptionPlan[];
  /** Contract type: other sections (and dev profiles) push plain EventItems. Read through toMEvent(). */
  events: EventItem[];
  adBrands: MAdBrand[];
  /* --- Monetize-only --- */
  products: Product[];
  newsletters: Newsletter[];
  newslettersOnProfile: boolean;
  recipients: Recipient[];
  subscribers: Subscriber[];
  shopify: { connected: boolean; store: string; lastSyncedAt: string | null };
  collections: string[];
  eventsLabel: string;
  eventsBannerTitle: string;
  eventsDisplay: boolean;
  /** Events banner image (media key or uploaded path): Monetize › Events cover + public listing banner. */
  eventsCover?: string | null;
  bandsintown: { connected: boolean; artist: string; autoImport: boolean; lastImportAt: string | null };
  vipOffers: VipOffer[];
  vipLabel: string;
  vipDisplay: boolean;
  portfolios: Portfolio[];
  discountCodes: DiscountCode[];
  ads: {
    enabled: boolean;
    autoEnableNew: boolean;
    categories: string[];
    catalog: AdCatalogBrand[];
    referralCode: string;
    earnings: { date: string; amount: number; impressions: number }[];
  };
  bookings: Booking[];
  orders: Order[];
}

/* ------------------------------------------------------------------ seed */

const NAMES = [
  "Jordan Pike", "Riley Brooks", "Casey Lund", "Morgan Hale", "Avery Stone", "Quinn Mercer", "Harper Vale", "Rowan Ellis",
  "Skyler Dunn", "Emerson Ray", "Parker Wolfe", "Reese Calder", "Dakota Shaw", "Finley Ross", "Sage Holloway", "Blair Kendrick",
  "Kendall Frost", "Jamie Ortega", "Taylor Nguyen", "Cameron Ruiz", "Alex Moreau", "Drew Kowalski", "Hayden Price", "Logan Avery",
  "Peyton Lark", "Remy Castillo", "Shawn Bishop", "Tatum Reyes", "Elliot Marsh", "Marley Quinn", "Phoenix Hart", "River Cole",
  "Arden Fisk", "Bailey North", "Corey Vance", "Devon Pratt", "Ellis Grant", "Frankie Doyle", "Gray Whitaker", "Hollis Kerr",
  "Indy Patel", "Jesse Romero", "Kai Lindqvist", "Lane Mitchell", "Micah Torres", "Nico Barrett", "Oakley Jensen", "Payton Rhodes",
  "Robin Sato", "Sloane Becker", "Toby Aldridge", "Val Moreno", "Wren Gallagher", "Xan Delgado", "Yael Fischer", "Zion Carter",
  "Ari Lowell",
];
const slug = (n: string) => n.toLowerCase().replace(/[^a-z]+/g, ".");

const recipients: Recipient[] = NAMES.map((name, i) => ({
  id: `rc${i + 1}`,
  name,
  email: `${slug(name)}@example.com`,
  source: i % 3 === 0 ? "Subscriber" : i % 3 === 1 ? "Follower" : "Newsletter Sign-up",
  joinedAt: new Date(Date.UTC(2025, i % 12, 1 + (i % 27))).toISOString().slice(0, 10),
}));

const planSubs: [ID, number][] = [["gold", 8], ["silver", 2], ["bronze", 6]];
let si = 0;
const subscribers: Subscriber[] = planSubs.flatMap(([planId, n]) =>
  Array.from({ length: n }, () => {
    const name = NAMES[(si * 7 + 3) % NAMES.length];
    const months = ([1, 3, 6, 12] as const)[si % 4];
    const s: Subscriber = {
      id: `sub${si + 1}`,
      planId,
      name,
      username: slug(name).replace(".", "_"),
      months,
      since: new Date(Date.UTC(2026, si % 10, 2 + (si % 25))).toISOString().slice(0, 10),
    };
    si++;
    return s;
  }),
);

const NOW = "2026-11-02T10:00:00Z";

export const initialMonetize: MonetizeState = {
  plans: [
    {
      id: "gold", name: "Gold Plan",
      prices: [{ amount: 25, months: 1 }, { amount: 67.5, months: 3, discountPct: 10, freeTrialDays: 1 }, { amount: 120, months: 6, discountPct: 20, freeTrialDays: 3 }, { amount: 210, months: 12, discountPct: 30 }],
      // 7 bullets while the chip says "6 benefits": source bug reproduced (see benefitCountLabel).
      benefits: ["Exclusive Photos", "Exclusive Videos", "Exclusive Podcasts", "All E-Courses are FREE", "Money Saving VIP Offers from my Partners", "Chat Room Access", "5 Free Direct Messages Per Month"],
      subscribers: 8, active: true,
    },
    {
      id: "silver", name: "Silver Plan",
      prices: [{ amount: 10, months: 1 }, { amount: 27, months: 3, discountPct: 10 }, { amount: 48, months: 6, discountPct: 20 }, { amount: 84, months: 12, discountPct: 30 }],
      benefits: ["Exclusive Photos", "Exclusive Videos", "Chat Room Access", "Money Saving VIP Offers from my Partners", "2 Free Direct Messages Per Month"],
      subscribers: 2, active: true,
    },
    {
      id: "bronze", name: "Bronze Plan",
      prices: [{ amount: 5, months: 1 }, { amount: 13.5, months: 3, discountPct: 10 }, { amount: 24, months: 6, discountPct: 20 }, { amount: 42, months: 12, discountPct: 30 }],
      benefits: ["Exclusive Photos", "Chat Room Access"],
      subscribers: 6, active: true,
    },
  ],
  events: [], // spec default for this demo: no events
  adBrands: [
    { id: "ad1", name: "Northpeak Outfitters", status: "new", offer: "Sponsored post", logo: "illustrations/brands/northpeak" },
    { id: "ad2", name: "Glacier Hydration", status: "new", offer: "Story mention", logo: "illustrations/brands/glacier-hydration" },
  ],
  products: [
    { id: "exp-social", kind: "experience", title: "Comment or Follow on Social Media", description: "I'll comment on one of your posts or follow you back on social media.", price: 100, locked: true, published: true, external: false, featured: true, order: 1, experienceType: "Social Media Interaction", image: "experiences/social", createdAt: "2025-05-01" },
    { id: "merch-spectrum", kind: "merchandise", title: "Spectrum X", description: "All Mountain Snowboard. A poppy, versatile and fun board with twin flex and camber that makes short work of every kind of terrain and condition.", price: 899.95, locked: false, published: true, external: false, featured: false, order: 2, source: "shopify", collection: "Home Page", options: [{ name: "Color", values: ["SPECTRUM", "COSMIC", "LINKS"] }, { name: "Board Size", values: ["158", "160", "154"] }], image: "merchandise/spectrum-x", createdAt: "2025-02-01" },
    { id: "exp-personal-video", kind: "experience", title: "Personalized Video from Me", description: "A short personalized video message for you or a friend: birthdays, shout-outs or riding tips.", price: 50, locked: false, published: true, external: false, featured: false, order: 3, experienceType: "Personalized Video", image: "experiences/personal-video", createdAt: "2025-04-01" },
    { id: "exp-video-call", kind: "experience", title: "Live Video Call with Me", description: "We will do a video call where I can show you how to tune your snowboard or answer any of your questions about snowboarding technique!", price: 100, locked: false, published: true, external: false, featured: false, order: 4, experienceType: "1:1 Video Call", durations: [{ label: "15 Minutes", price: 100 }, { label: "30 Minutes", price: 150 }, { label: "45 Minutes", price: 200 }], image: "experiences/video-call", createdAt: "2025-03-01" },
    { id: "dl-switch", kind: "downloadable", title: "E-book: How to Ride Switch", description: "In this handy manual, you'll learn to ride switch like a pro.", price: 15, locked: false, published: true, external: false, featured: true, order: 5, fileName: "how-to-ride-switch.pdf", image: "downloadables/ebook-switch", createdAt: "2025-06-15" },
    { id: "nft-yeti", kind: "nft", title: "Bored Snowboarding Yeti", description: "A one-of-one collectible from my first season on tour.", price: 350, locked: true, published: true, external: true, externalUrl: "https://marketplace.example.com/yeti", featured: true, order: 6, source: "external", image: "posts/nft-yeti", createdAt: "2025-05-30" },
    { id: "merch-airbag", kind: "merchandise", title: "Avalanche Airbag Pack E2-3", description: "Backcountry airbag pack I ride with on every splitboard tour.", price: 1399, locked: true, published: true, external: true, externalUrl: "https://shop.example.com/airbag-pack", featured: false, order: 7, source: "external", collection: "Automated Collection", image: "merchandise/airbag-pack", createdAt: "2025-05-10" },
    { id: "course-learn", kind: "course", title: "Learn How to Snowboard", description: "A step-by-step course from your first day on the hill to linking turns with confidence.", price: 60, locked: false, published: true, external: false, featured: false, order: 8, image: "courses/learn-to-snowboard", createdAt: "2025-04-22" },
    { id: "exp-park", kind: "experience", title: "In Person Terrain Park Session @ Copper Ridge Mountain", description: "Ride a half-day park session with me and work on your rails, jumps and style.", price: 250, locked: false, published: true, external: false, featured: false, order: 9, experienceType: "In Person Session", image: "experiences/park-session", createdAt: "2025-06-01" },
    { id: "dl-tune", kind: "downloadable", title: "E-Book: Tune a Snowboard", description: "In this e-book, I will teach you my secrets to tuning a competition-ready snowboard.", price: 12, locked: false, published: true, external: false, featured: true, order: 10, fileName: "tune-a-snowboard.pdf", image: "downloadables/ebook-tune", createdAt: "2025-03-18" },
    { id: "merch-hero", kind: "merchandise", title: "Home Mountain Hero", description: "A playful all-mountain twin built for laps with friends.", price: 799.95, locked: false, published: true, external: false, featured: true, order: 11, source: "shopify", collection: "Home Page", options: [{ name: "Board Size", values: ["152", "155", "158"] }], image: "merchandise/home-mountain-hero", createdAt: "2025-02-20" },
    { id: "merch-throwback", kind: "merchandise", title: "Throwback", description: "A soft, surfy freestyle deck for spring slush and park laps.", price: 529.95, locked: false, published: true, external: false, featured: false, order: 12, source: "shopify", collection: "Home Page", options: [{ name: "Board Size", values: ["150", "154", "157"] }], image: "merchandise/throwback", createdAt: "2025-02-10" },
  ],
  newsletters: [
    { id: "nl1", title: "", body: "", status: "Draft", lock: "Free", audience: "all", planIds: [], groupIds: [], sent: 0, opened: 0, unlocked: 0, image: "posts/nl-welcome", createdAt: "2026-10-28" },
    { id: "nl2", title: "The Unstoppable Ascent of Snowboarding: Carving a Culture 🏂", body: "How a niche winter pastime grew into a global culture.", status: "Draft", lock: "Subscribers", audience: "all", planIds: [], groupIds: [], sent: 0, opened: 0, unlocked: 0, image: "posts/nl-culture", createdAt: "2026-10-20" },
    { id: "nl3", title: "My New Ride: Summit Pro Hero 🏂🔥", body: "First impressions of my new board after a week of park laps.", status: "Sent", lock: "Paid", price: 3, audience: "all", planIds: [], groupIds: [], sent: 12, opened: 5, unlocked: 2, sentAt: "2026-10-02", image: "posts/nl-new-ride", createdAt: "2026-10-01" },
    { id: "nl4", title: "Asia Bound: Deep Powder & Big Lines in Japan 🇯🇵❄️", body: "Two weeks of storm days and tree runs.", status: "Sent", lock: "Paid", price: 3, audience: "all", planIds: [], groupIds: [], sent: 12, opened: 7, unlocked: 2, sentAt: "2026-02-14", image: "posts/nl-japan", createdAt: "2026-02-13" },
    { id: "nl5", title: "Chasing Powder Dreams: Austrian Adventure 🇦🇹🏂", body: "Alpine villages, long lunches and longer descents.", status: "Sent", lock: "Paid", price: 3, audience: "all", planIds: [], groupIds: [], sent: 10, opened: 6, unlocked: 0, sentAt: "2026-01-20", image: "posts/nl-austria", createdAt: "2026-01-19" },
    { id: "nl6", title: "Training Progress Report for Summit Games 2026", body: "Where my runs are at and what I'm working on next.", status: "Sent", lock: "Subscribers", audience: "all", planIds: [], groupIds: [], sent: 9, opened: 7, unlocked: 0, sentAt: "2025-12-10", image: "posts/nl-training", createdAt: "2025-12-09" },
    { id: "nl7", title: "Snow Report from Copper Ridge", body: "Early-season conditions and what's open.", status: "Sent", lock: "Paid", price: 2, audience: "all", planIds: [], groupIds: [], sent: 7, opened: 3, unlocked: 2, sentAt: "2025-11-25", image: "posts/nl-snow-report", createdAt: "2025-11-24" },
  ],
  newslettersOnProfile: true,
  recipients,
  subscribers,
  shopify: { connected: true, store: "ajwhite-demo.myshopify.example", lastSyncedAt: "2026-10-30T15:00:00Z" },
  collections: ["ALL", "Home Page", "Automated Collection", "Hydrogen", "Digital Goods VAT Tax"],
  eventsLabel: "Competitions",
  eventsBannerTitle: "Competitions",
  eventsDisplay: true,
  eventsCover: "events/banner",
  bandsintown: { connected: false, artist: "", autoImport: false, lastImportAt: null },
  vipOffers: [
    { id: "vip1", title: "Free Gift with any Northpeak Goggle Purchase", description: "Our friends at Northpeak have a special gift for my best fans.", codeType: "General Code", code: "AJGOGGLE", issued: 0, left: "Unlimited", lockOptions: ["Individual Purchase", "Subscription"], price: 5, endsAt: "2029-03-02", active: true, logo: "illustrations/brands/northpeak", image: "experiences/vip-goggles", order: 1 },
    { id: "vip2", title: "10% Off at Ridgeline Boards", description: "Take 10% off anything in the Ridgeline Boards online shop.", codeType: "General Code", code: "AJRIDE10", issued: 0, left: "Unlimited", lockOptions: ["Subscription"], endsAt: "2028-12-31", active: true, logo: "illustrations/brands/ridgeline-boards", image: "experiences/vip-boards", order: 2 },
    { id: "vip3", title: "$1 Off Summit Soda Products at Corner Mart", description: "In honor of my win at the Summit Games, Summit Soda is offering $1.00 off any product at Corner Mart.", codeType: "General Code", code: "AJSODA1", issued: 3, left: "Unlimited", lockOptions: ["Free"], endsAt: "2028-09-15", active: true, logo: "illustrations/brands/summit-soda", image: "experiences/vip-soda", order: 3 },
  ],
  vipLabel: "VIP Deals",
  vipDisplay: true,
  portfolios: [
    {
      id: "1760000000001", title: "Videos", type: "Video", banner: "videos/banner", createdAt: "2026-02-15",
      series: [
        {
          id: "1760000000777", title: "Competition Videos", description: "Videos of my various snowboard competitions around the world", price: 20, cover: "videos/competition-run",
          episodes: [
            { id: "ep1", title: "2026 Summit Games in Aspen", duration: "00:09", seconds: 8, releaseDate: "2026-01-23", description: "Took Bronze on this run", locked: true, video: "videos/halfpipe" },
            { id: "ep2", title: "Ridge Tour Big Air", duration: "00:09", seconds: 8, releaseDate: null, description: "One of my favorite events", locked: true, video: "videos/big-air" },
            { id: "ep3", title: "Big Air in Breckenridge", duration: "00:09", seconds: 8, releaseDate: null, description: "Gold medal at Ridge Tour 2024", locked: false, video: "videos/slopestyle" },
          ],
        },
      ],
      singles: [{ id: "sv1", title: "Single Video", duration: "00:05", seconds: 5, releaseDate: null, description: "", locked: false, video: "videos/reel-park" }],
    },
  ],
  discountCodes: [
    { id: "dc1", code: "save10", used: 8, applicableFor: ["Subscriptions", "Downloadables", "Merchandise", "Experience", "Course", "Newsletter"], discountType: "Percentage", value: 10, endDate: "2030-09-19", active: true },
    { id: "dc2", code: "NewFlash10", used: 3, applicableFor: ["Subscriptions", "Downloadables", "Merchandise", "Experience", "Course", "Newsletter"], discountType: "Percentage", value: 10, endDate: "2025-08-30", active: false },
  ],
  ads: {
    enabled: true,
    autoEnableNew: false,
    categories: ["Athletic Wear", "Athletic Equipment", "Retail", "Food", "Beverages", "Financial"],
    catalog: [
      { id: "b1", name: "Stridewell", categories: ["Athletic Equipment"], enabled: false },
      { id: "b2", name: "Ranchline Boots", categories: ["Athletic Wear"], enabled: false },
      { id: "b3", name: "Ridgeline Boards", categories: ["Athletic Equipment"], enabled: true, logo: "illustrations/brands/ridgeline-boards" },
      { id: "b4", name: "Cascade Outerwear", categories: ["Athletic Wear"], enabled: false },
      { id: "b5", name: "Peakbrew Coffee", categories: ["Beverages"], enabled: false },
      { id: "b6", name: "Shoreline Apparel", categories: ["Athletic Wear"], enabled: false },
      { id: "b7", name: "FreshCrate", categories: ["Food", "Beverages"], enabled: false },
      { id: "b8", name: "Lotusmat", categories: ["Athletic Equipment"], enabled: false },
      { id: "b9", name: "Velocity Athletics", categories: ["Athletic Wear"], enabled: false },
    ],
    referralCode: "AJW7D21C9E",
    earnings: [{ date: "2026-11-01", amount: 0.07, impressions: 41 }],
  },
  bookings: [],
  orders: [],
};

/* ------------------------------------------------------------------ helpers */

export const uid = (p = "id") => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const today = () => new Date().toISOString().slice(0, 10);

/** "$1,399.00" */
export const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Label for the "N benefits" chip. Source bug reproduced: the live chip counts one fewer benefit
 * than the bullets it expands to (Gold shows "6 benefits" over 7 bullets). Cause inferred.
 */
export const benefitCountLabel = (n: number) => {
  const c = Math.max(0, n - 1);
  return `${c} benefit${c === 1 ? "" : "s"}`;
};

export const KIND_LABEL: Record<ProductKind, { badge: string; plural: string; filter: string }> = {
  experience: { badge: "Experience", plural: "Experiences", filter: "EXPERIENCES" },
  course: { badge: "Course", plural: "Courses", filter: "COURSES" },
  downloadable: { badge: "Downloadables", plural: "Downloadables", filter: "DOWNLOADABLES" },
  merchandise: { badge: "Merchandise", plural: "Merchandise", filter: "MERCHANDISE" },
  nft: { badge: "NFT", plural: "NFTs", filter: "NFTS" },
};

/** Public store order: by `order`, then newest. */
export const storeItems = (d: AppData) => [...d.monetize.products].filter((p) => p.published).sort((a, b) => a.order - b.order);

export const isPastEvent = (e: EventItem, now = new Date()) => !!e.past || new Date(e.date).getTime() < now.getTime();

/**
 * View of any EventItem with the fields the Monetize screens need. Events created elsewhere (plain
 * EventItem) get defaults: Mountain time, a TICKETS button, max 100 per person, stable ticket ids.
 */
export function toMEvent(e: EventItem): MEvent {
  const m = e as Partial<MEvent> & EventItem;
  const time = m.time ?? new Date(e.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Denver" });
  return {
    ...e,
    time,
    timeZone: m.timeZone ?? "US/Mountain",
    tzAbbr: m.tzAbbr ?? "MST",
    ctas: m.ctas ?? ["TICKETS"],
    maxPerPerson: m.maxPerPerson ?? 100,
    tickets: e.tickets.map((t, i) => ({ ...t, id: (t as Partial<TicketLevel>).id ?? `${e.id}-t${i}`, perk: (t as Partial<TicketLevel>).perk ?? "" })),
  };
}
/** All events as MEvent, soonest first. */
export const selectEvents = (d: AppData) => d.monetize.events.map(toMEvent).sort((a, b) => a.date.localeCompare(b.date));

/* ------------------------------------------------------------------ actions: plans */

export type PlanInput = Pick<SubscriptionPlan, "name" | "prices" | "benefits">;

/** Add a subscription plan (need content.write). Returns the new id. */
export function addPlan(d: AppData, input: PlanInput) {
  const id = uid("plan");
  d.monetize.plans.push({ id, name: input.name, prices: input.prices, benefits: input.benefits, subscribers: 0, active: true });
  return id;
}

/** Update a plan's name/benefits (need content.write). */
export function updatePlanDetails(d: AppData, id: ID, input: Pick<SubscriptionPlan, "name" | "benefits">) {
  const p = d.monetize.plans.find((x) => x.id === id);
  if (p) Object.assign(p, input);
}

/** Change a plan's price tiers (Confirm tier; need finance.write). */
export function updatePlanPrices(d: AppData, id: ID, prices: SubscriptionPlan["prices"]) {
  const p = d.monetize.plans.find((x) => x.id === id);
  if (p) p.prices = prices;
}

/** Delete a plan (Confirm; need content.write). */
export function deletePlan(d: AppData, id: ID) {
  d.monetize.plans = d.monetize.plans.filter((p) => p.id !== id);
}

/* ------------------------------------------------------------------ actions: newsletters */

export type NewsletterInput = Pick<Newsletter, "title" | "body" | "lock" | "price" | "audience" | "planIds" | "groupIds" | "image">;

/** Audience size for a newsletter (recipients, or subscribers of chosen plans; groups use fans in money.fans). */
export function audienceSize(d: AppData, n: Pick<Newsletter, "audience" | "planIds" | "groupIds">) {
  if (n.audience === "plans") return d.monetize.subscribers.filter((s) => n.planIds.includes(s.planId)).length;
  if (n.audience === "groups") return (d.money.fans ?? []).filter((f) => f.groupIds.some((g) => n.groupIds.includes(g))).length;
  return d.monetize.recipients.length;
}

/** Save a newsletter as Draft (need content.write). Creates it when id is omitted. Returns the id. */
export function saveNewsletterDraft(d: AppData, input: NewsletterInput, id?: ID) {
  const existing = id ? d.monetize.newsletters.find((n) => n.id === id) : undefined;
  if (existing) {
    Object.assign(existing, input);
    return existing.id;
  }
  const nid = uid("nl");
  d.monetize.newsletters.unshift({ id: nid, ...input, status: "Draft", sent: 0, opened: 0, unlocked: 0, createdAt: today() });
  return nid;
}

/** Send now (Confirm tier; need content.write). Sent count = audience size; opens start at 0. */
export function sendNewsletter(d: AppData, input: NewsletterInput, id?: ID) {
  const nid = saveNewsletterDraft(d, input, id);
  const n = d.monetize.newsletters.find((x) => x.id === nid)!;
  n.status = "Sent";
  n.sent = audienceSize(d, n);
  n.sentAt = today();
  n.scheduledAt = null;
  return nid;
}

/** Schedule for later (Confirm tier; need content.write). */
export function scheduleNewsletter(d: AppData, input: NewsletterInput, at: string, id?: ID) {
  const nid = saveNewsletterDraft(d, input, id);
  const n = d.monetize.newsletters.find((x) => x.id === nid)!;
  n.status = "Scheduled";
  n.scheduledAt = at;
  return nid;
}

/** Duplicate a newsletter as a new Draft (need content.write). */
export function duplicateNewsletter(d: AppData, id: ID) {
  const n = d.monetize.newsletters.find((x) => x.id === id);
  if (!n) return;
  const i = d.monetize.newsletters.indexOf(n);
  d.monetize.newsletters.splice(i, 0, { ...structuredClone(n), id: uid("nl"), status: "Draft", sent: 0, opened: 0, unlocked: 0, sentAt: null, scheduledAt: null, createdAt: today() });
}

/** Delete a newsletter (need content.write). */
export function deleteNewsletter(d: AppData, id: ID) {
  d.monetize.newsletters = d.monetize.newsletters.filter((n) => n.id !== id);
}

/** Show/hide the Newsletters chip on the profile (need content.write). */
export function setNewslettersOnProfile(d: AppData, on: boolean) {
  d.monetize.newslettersOnProfile = on;
}

/* ------------------------------------------------------------------ actions: products */

export type ProductInput = Omit<Product, "id" | "order" | "createdAt" | "featured"> & { featured?: boolean };

/** Add a store product of any kind (need content.write). It appears on the public Store. Returns the id. */
export function addProduct(d: AppData, input: ProductInput) {
  const id = uid(input.kind);
  const order = Math.max(0, ...d.monetize.products.map((p) => p.order)) + 1;
  d.monetize.products.push({ ...input, featured: input.featured ?? false, id, order, createdAt: today() });
  return id;
}

/** Edit a product's non-price fields (need content.write). */
export function updateProduct(d: AppData, id: ID, patch: Partial<Omit<Product, "id" | "price">>) {
  const p = d.monetize.products.find((x) => x.id === id);
  if (p) Object.assign(p, patch);
}

/** Change a product's price (Confirm tier; need finance.write). */
export function setProductPrice(d: AppData, id: ID, price: number | null, durations?: Product["durations"]) {
  const p = d.monetize.products.find((x) => x.id === id);
  if (!p) return;
  p.price = price;
  if (durations) p.durations = durations;
}

/** Delete a product (need content.write). */
export function deleteProduct(d: AppData, id: ID) {
  d.monetize.products = d.monetize.products.filter((p) => p.id !== id);
}

/** Feature / unfeature on the profile (Store card kebab › "Feature on Profile"; need content.write). */
export function toggleFeatured(d: AppData, id: ID) {
  const p = d.monetize.products.find((x) => x.id === id);
  if (p) p.featured = !p.featured;
}

/** Re-order the public store (drag handle; need content.write). */
export function moveProduct(d: AppData, id: ID, dir: -1 | 1) {
  const list = [...d.monetize.products].sort((a, b) => a.order - b.order);
  const i = list.findIndex((p) => p.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  const a = list[i].order;
  list[i].order = list[j].order;
  list[j].order = a;
}

/** Simulated Shopify re-sync (no network): stamps the sync time (need content.write). */
export function resyncShopify(d: AppData) {
  d.monetize.shopify.lastSyncedAt = new Date().toISOString();
}

/** Disconnect the Shopify store (Protected tier: unlink store; need account.admin). Removes Shopify products. */
export function disconnectShopify(d: AppData) {
  d.monetize.shopify.connected = false;
  d.monetize.products = d.monetize.products.filter((p) => p.source !== "shopify");
}

/** Mock-connect a Shopify store after the creator's explicit click (need account.admin). */
export function connectShopify(d: AppData, store: string) {
  d.monetize.shopify = { connected: true, store, lastSyncedAt: new Date().toISOString() };
}

/* ------------------------------------------------------------------ actions: events */

export type EventInput = Omit<MEvent, "id" | "source" | "past">;

/** Add a native event (need content.write). It appears on the public event listing. Returns the id. */
export function addEvent(d: AppData, input: EventInput, source: MEvent["source"] = "native") {
  const id = String(Date.now()) + Math.floor(Math.random() * 100);
  const e: MEvent = { ...input, id, source, past: false };
  d.monetize.events.push(e);
  return id;
}

/** Edit an event's details (need content.write). Ticket prices go through updateTicketLevels. */
export function updateEvent(d: AppData, id: ID, patch: Partial<Omit<EventInput, "tickets">>) {
  const e = d.monetize.events.find((x) => x.id === id);
  if (e) Object.assign(e as MEvent, patch);
}

/** Delete an event (need content.write). */
export function deleteEvent(d: AppData, id: ID) {
  d.monetize.events = d.monetize.events.filter((e) => e.id !== id);
}

/** Replace an event's native ticket levels. Price changes are Confirm tier (need finance.write). */
export function updateTicketLevels(d: AppData, id: ID, tickets: TicketLevel[], maxPerPerson?: number) {
  const e = d.monetize.events.find((x) => x.id === id);
  if (!e) return;
  e.tickets = tickets;
  if (maxPerPerson) (e as MEvent).maxPerPerson = maxPerPerson;
}

/** Button label / banner title / display toggle for Events (need content.write). */
export function setEventsSettings(d: AppData, patch: Partial<Pick<MonetizeState, "eventsLabel" | "eventsBannerTitle" | "eventsDisplay">>) {
  Object.assign(d.monetize, patch);
}

/** Save Bandsintown settings; "connect" is a mock flag flip after an explicit click (need content.write). */
export function saveBandsintown(d: AppData, s: Partial<MonetizeState["bandsintown"]>) {
  Object.assign(d.monetize.bandsintown, s);
}

/** Simulated Bandsintown import: adds the fictional tour dates not already present (need content.write). */
export function importBandsintown(d: AppData) {
  const sample: EventInput = {
    title: "Copper Ridge Rail Jam", date: "2027-01-16T20:00:00Z", time: "1:00 PM", timeZone: "US/Mountain", tzAbbr: "MST",
    location: "Copper Ridge Resort - Summit County, Colorado", description: "Imported from Bandsintown.", kind: "event", image: "events/poster",
    ctas: ["TICKETS"], maxPerPerson: 10, tickets: [],
  };
  if (!d.monetize.events.some((e) => e.title === sample.title)) addEvent(d, sample, "bandsintown");
  d.monetize.bandsintown.lastImportAt = new Date().toISOString();
}

/* ------------------------------------------------------------------ actions: VIP offers */

export type VipInput = Omit<VipOffer, "id" | "issued" | "order" | "active">;

/** Add a VIP offer (need content.write). Active offers show on the public VIP Deals page. */
export function addVipOffer(d: AppData, input: VipInput) {
  const id = uid("vip");
  d.monetize.vipOffers.push({ ...input, id, issued: 0, order: d.monetize.vipOffers.length + 1, active: true });
  return id;
}
/** Edit a VIP offer (need content.write; a price change uses finance.write). */
export function updateVipOffer(d: AppData, id: ID, patch: Partial<VipInput>) {
  const o = d.monetize.vipOffers.find((x) => x.id === id);
  if (o) Object.assign(o, patch);
}
/** Mark As Active / Inactive (activating = publishing: Confirm; need content.write). */
export function setVipActive(d: AppData, id: ID, active: boolean) {
  const o = d.monetize.vipOffers.find((x) => x.id === id);
  if (o) o.active = active;
}
/** Delete a VIP offer (need content.write). */
export function deleteVipOffer(d: AppData, id: ID) {
  d.monetize.vipOffers = d.monetize.vipOffers.filter((o) => o.id !== id);
}
/** Move a VIP offer up/down (drag handle; need content.write). */
export function moveVipOffer(d: AppData, id: ID, dir: -1 | 1) {
  const list = [...d.monetize.vipOffers].sort((a, b) => a.order - b.order);
  const i = list.findIndex((o) => o.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  const a = list[i].order;
  list[i].order = list[j].order;
  list[j].order = a;
}
/** VIP button label / display toggle (need content.write). */
export function setVipSettings(d: AppData, patch: Partial<Pick<MonetizeState, "vipLabel" | "vipDisplay">>) {
  Object.assign(d.monetize, patch);
}

/* ------------------------------------------------------------------ actions: portfolios */

/** Add a portfolio (need content.write). It gets its own public page (Videos banner view). */
export function addPortfolio(d: AppData, input: Pick<Portfolio, "title" | "type" | "banner">) {
  const id = String(Date.now());
  d.monetize.portfolios.push({ ...input, id, series: [], singles: [], createdAt: today() });
  return id;
}
/** Delete a portfolio (need content.write). */
export function deletePortfolio(d: AppData, id: ID) {
  d.monetize.portfolios = d.monetize.portfolios.filter((p) => p.id !== id);
}

/* ------------------------------------------------------------------ actions: discount codes */

export type DiscountInput = Omit<DiscountCode, "id" | "used" | "active">;

/** Create a discount code (need content.write). */
export function addDiscountCode(d: AppData, input: DiscountInput) {
  const id = uid("dc");
  d.monetize.discountCodes.push({ ...input, id, used: 0, active: true });
  return id;
}
/** Edit a discount code (need content.write). */
export function updateDiscountCode(d: AppData, id: ID, patch: Partial<DiscountInput>) {
  const c = d.monetize.discountCodes.find((x) => x.id === id);
  if (c) Object.assign(c, patch);
}
/** Mark As Active / Inactive (need content.write). */
export function setDiscountActive(d: AppData, id: ID, active: boolean) {
  const c = d.monetize.discountCodes.find((x) => x.id === id);
  if (c) c.active = active;
}
/** Delete a discount code (need content.write). */
export function deleteDiscountCode(d: AppData, id: ID) {
  d.monetize.discountCodes = d.monetize.discountCodes.filter((c) => c.id !== id);
}

/* ------------------------------------------------------------------ actions: ads */

/** Approve a new ad brand (Confirm tier; need content.write). */
export function approveAdBrand(d: AppData, id: ID) {
  const b = d.monetize.adBrands.find((x) => x.id === id);
  if (b) b.status = "approved";
}
/** Decline a new ad brand (need content.write). */
export function declineAdBrand(d: AppData, id: ID) {
  const b = d.monetize.adBrands.find((x) => x.id === id);
  if (b) b.status = "declined";
}
/** Save Advertisement Preferences (Confirm tier when it enables brands; need content.write). */
export function saveAdPreferences(d: AppData, prefs: { enabled: boolean; autoEnableNew: boolean; enabledIds: ID[] }) {
  d.monetize.ads.enabled = prefs.enabled;
  d.monetize.ads.autoEnableNew = prefs.autoEnableNew;
  d.monetize.ads.catalog.forEach((b) => (b.enabled = prefs.enabledIds.includes(b.id)));
}

/* ------------------------------------------------------------------ actions: fan side */

/** A fan requests a 1:1 booking (simulated; no payment). */
export function requestBooking(d: AppData, b: Omit<Booking, "id" | "createdAt">) {
  d.monetize.bookings.push({ ...b, id: uid("bk"), createdAt: NOW });
}

/** A fan checkout (simulated; no payment). Event tickets decrement the remaining count. */
export function placeOrder(d: AppData, o: Omit<Order, "id" | "createdAt">, ticketId?: ID) {
  d.monetize.orders.push({ ...o, id: uid("ord"), createdAt: new Date().toISOString() });
  const e = o.eventId ? d.monetize.events.find((x) => x.id === o.eventId) : undefined;
  if (e && ticketId) {
    const i = toMEvent(e).tickets.findIndex((x) => x.id === ticketId);
    if (i >= 0) e.tickets[i].sold += o.quantity;
  }
}

export type _Draft = AppData;
