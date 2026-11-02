/**
 * Wallet (balance, payouts, cards, referrals, transactions, loyalty, purchases, refunds, fulfillment) and Insights & Fans (fans, metrics, segments).
 * Owned by the Money build. Expand freely: keep the exported names (MoneyState, initialMoney).
 * Actions are plain functions that mutate a draft: act("label", (d) => myAction(d, …)).
 *
 * All people, products and numbers are fictional. The mock "today" is MONEY_TODAY (the capture date).
 */
import type { AppData } from "../store";
import type { Fan, FulfillmentRequest, RefundRequest, Transaction } from "../model";

/** The capture date of the reference pack; periods ("This Month", default date filters) are relative to it. */
export const MONEY_TODAY = "2026-11-02";

/* ------------------------------------------------------------------ types */

/** Earning Metrics categories, in the order of the cards / donut legend (16-insights). */
export const EARNING_CATEGORIES = [
  { key: "tips", label: "Tips", color: "#6b8e4e" },
  { key: "merchandise", label: "Merchandise", color: "#f7b733" },
  { key: "experiences", label: "Experiences", color: "#1ea7e1" },
  { key: "paidDms", label: "Paid Direct Messages", color: "#b5c7a8" },
  { key: "subscriptions", label: "Subscriptions", color: "#4cc24a" },
  { key: "individual", label: "Individual Purchases", color: "#f8c8c8" },
  { key: "referrals", label: "Referrals", color: "#c9a98b" },
  { key: "newsletters", label: "Newsletters", color: "#8e44ad" },
  { key: "livestreams", label: "Livestreams", color: "#f5d000" },
  { key: "courses", label: "Courses", color: "#1de9d6" },
  { key: "downloadables", label: "Downloadables", color: "#7b7bff" },
  { key: "vipOffers", label: "VIP Offers", color: "#f04848" },
  { key: "fundraisers", label: "Fundraisers", color: "#b5651d" },
  // inferred: page-2 legend colours were not visible in the capture.
  { key: "advertisements", label: "Advertisements", color: "#ff8a65" },
  { key: "portfolios", label: "Portfolios", color: "#26a69a" },
  { key: "eventTickets", label: "Event Tickets", color: "#ce93d8" },
  { key: "loyaltyPoints", label: "Loyalty Points", color: "#bdbdbd" },
] as const;
export type EarningCategory = (typeof EARNING_CATEGORIES)[number]["key"];

/** A wallet transaction. `amount` is the net wallet amount; `gross` is what the fan paid (Earning Metrics use gross). */
export interface MoneyTransaction extends Transaction {
  gross?: number;
  category?: EarningCategory | null;
}

export type FanStatusFlag = "subscriber" | "newsletter" | "follower" | "purchaser" | "engager";
export interface MoneyFan extends Fan {
  /** "YYYY-MM-DDTHH:mm" (shown with the capture's "IST" suffix, a source quirk). */
  lastSession: string;
  statuses: FanStatusFlag[];
  imported?: boolean;
  lastEngagedAt?: string | null;
  recruitedAt?: string | null;
  age?: number;
  gender?: "Male" | "Female" | "Other";
}

export interface RefundItem extends RefundRequest {
  fanDeleted?: boolean;
  /** Outcomes decided by TopFan staff, shown instead of the creator's status. */
  adminOutcome?: "Admin Declined" | "Admin Accepted" | "Escalated to Customer Support" | null;
  decidedAt?: string | null;
}

export interface FulfillmentItem extends FulfillmentRequest {
  price: number;
  /** "YYYY-MM-DDTHH:mm" */
  orderedAt: string;
  itemType: "MERCHANDISE (SHOPIFY)" | "EXPERIENCE";
  fanDeleted?: boolean;
  disputed?: boolean;
  /** Placeholder tone for the product image tile (light for merchandise, per capture). */
  imageTone: "light" | "dark";
}

export interface SavedCard {
  id: string;
  brand: "VISA" | "MASTERCARD" | "AMEX";
  last4: string;
  nameOnCard: string;
  zip: string;
  expires: string; // MM/YYYY
}

export interface Referral {
  id: string;
  name: string;
  referredAt: string;
  commissionStart: string;
  commissionEnd: string;
  earned: number;
}

export interface PurchasedPlan {
  id: string;
  creator: string;
  plan: string;
  price: number;
  months: number;
  discountPct?: number;
  status: "expired" | "active";
  refundRequested?: boolean;
  nextRenewal?: string | null;
  autoRenew: boolean;
  benefits: string[];
  included?: { name: string; frequency: string; code: string }[];
}

export type PurchaseCategory =
  | "newsletter" | "merchandise" | "courses" | "experiences" | "tips" | "content" | "messages"
  | "vip-offers" | "downloadables" | "livestreams" | "portfolio" | "tickets";

export interface PurchaseRow {
  id: string;
  title: string;
  subtitle?: string;
  status?: "Canceled" | "Open" | "Confirmed";
  from: string;
  date: string;
  /** null = the source renders an empty price cell (known source bug, reproduced). */
  price: number | null;
  currency?: "USD" | "EUR";
}

export interface ContentPostStat {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  impressions: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface DailyEngagement {
  date: string;
  newFollowers: number;
  newSubscribers: number;
  newPosts: number;
  impressions: number;
  /** Post engagements, all on the White Label Site in the capture. */
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  visitsTopfan: number;
  visitsWls: number;
  dmsReceived: number;
  dmsSent: number;
  portfolio: number;
}

export interface FanSegment {
  id: string;
  name: string;
  createdAt: string;
  criteria: Record<string, string>;
}

export interface MoneyState {
  /* --- cross-section contract (keep these fields; others read them) --- */
  fans: MoneyFan[];
  transactions: MoneyTransaction[];
  balance: { available: number; pending: number; lifetime: number; currency: "USD" };
  payoutAccount: { connected: boolean; label: string | null };
  refundRequests: RefundItem[];
  fulfillmentRequests: FulfillmentItem[];
  loyaltyHistory: { id: string; date: string; description: string; points: number }[];
  /* --- area fields --- */
  payoutCountry: string;
  savedCards: SavedCard[];
  referralLink: string;
  referrals: Referral[];
  purchasedPlans: PurchasedPlan[];
  purchases: Record<PurchaseCategory, PurchaseRow[]>;
  contentPosts: ContentPostStat[];
  engagementDaily: DailyEngagement[];
  segments: FanSegment[];
}

/* ------------------------------------------------------------------ seed */

const tx = (
  id: string,
  date: string,
  type: string,
  amount: number,
  category: EarningCategory | null,
  extra: Partial<MoneyTransaction> = {},
): MoneyTransaction => ({ id, date, type, description: type, amount, status: "Completed", category, ...extra });

const transactions: MoneyTransaction[] = [
  // 15b capture window (Oct 26 – Nov 2, 2026)
  tx("t01", "2026-11-01", "Subscription Earning", 49.6, "subscriptions", { gross: 67.5, fan: "Wesley Harlan", description: "Gold Plan (1 Month) renewal" }),
  tx("t02", "2026-11-01", "Advertisement Earning", 0.07, "advertisements", { description: "Sponsored placement · Summit Optics" }),
  tx("t03", "2026-10-31", "Advertisement Earning", 0.19, "advertisements", { description: "Sponsored placement · Summit Optics" }),
  tx("t04", "2026-10-30", "Advertisement Earning", 0.4, "advertisements", { description: "Sponsored placement · Summit Optics" }),
  tx("t05", "2026-10-29", "Livestream Tip Earning", 3.62, "tips", { gross: 5, fan: "Lena Okafor", description: "Tip during “Sunday Q&A” livestream" }),
  tx("t06", "2026-10-29", "Advertisement Earning", 0.27, "advertisements", { description: "Sponsored placement · Summit Optics" }),
  tx("t07", "2026-10-28", "Subscription Earning", 3.43, "subscriptions", { gross: 5, fan: "Marcus Bell", description: "Bronze Plan (1 Month) renewal" }),
  tx("t08", "2026-10-28", "Advertisement Earning", 0.01, "advertisements", { description: "Sponsored placement · Summit Optics" }),
  tx("t09", "2026-10-27", "Advertisement Earning", 0.37, "advertisements", { description: "Sponsored placement · Summit Optics" }),
  tx("t10", "2026-10-26", "Advertisement Earning", 0.55, "advertisements", { description: "Sponsored placement · Summit Optics" }),
  // older history (All Time / Last Month)
  tx("t11", "2026-10-20", "Merchandise Earning", 62.3, "merchandise", { gross: 84.75, fan: "Grant Whitfield", description: "Ridgeline Pro Board Wax Kit" }),
  tx("t12", "2026-10-15", "Course Earning", 38.5, "courses", { gross: 52.4, fan: "Priya Raman", description: "Learn How to Ride Switch" }),
  tx("t13", "2026-10-12", "Experience Earning", 60.13, "experiences", { gross: 81.8, fan: "Owen Castillo", description: "Live Video Call with Me" }),
  tx("t14", "2026-10-05", "Post Tip Earning", 7.35, "tips", { gross: 10, fan: "Sofia Marin", description: "Tip on “Made it to Italy!”" }),
  tx("t15", "2026-10-03", "Downloadable Earning", 7.35, "downloadables", { gross: 10, fan: "Northline Crew", description: "E-Book: Tune a Snowboard" }),
  tx("t16", "2026-09-30", "Withdrawal", -1500, null, { description: "Payout to bank account" }),
  tx("t17", "2026-09-29", "Livestream Purchase", -23, null, { description: "Livestream #Health&Wellness #Fitness · Balance With Juniper" }),
  tx("t18", "2026-09-18", "Subscription Earning", 18.38, "subscriptions", { gross: 25, fan: "Hannah Brooks", description: "Gold Plan (1 Month)" }),
  tx("t19", "2026-09-10", "Dm Sale Earning", 3.68, "paidDms", { gross: 5, fan: "Theo Lindgren", description: "Paid direct message" }),
  tx("t20", "2026-08-28", "Newsletter Earning", 3.68, "newsletters", { gross: 5, fan: "Ava Sinclair", description: "Premium newsletter issue" }),
  tx("t21", "2026-08-14", "Fundraiser Earning", 73.5, "fundraisers", { gross: 100, fan: "Daniel Okoye", description: "Road to the 2026 Games fundraiser" }),
  tx("t22", "2026-07-30", "VIP Offer Earning", 14.7, "vipOffers", { gross: 20, fan: "Mateo Alvarez", description: "Summit Optics VIP offer" }),
  tx("t23", "2026-07-12", "Referral Commission", 4.2, "referrals", { description: "Commission · Milo Brandt" }),
  tx("t24", "2026-06-21", "Livestream Earning", 11.03, "livestreams", { gross: 15, fan: "Isla Fernandez", description: "Paid livestream ticket" }),
  tx("t25", "2026-06-02", "Individual Content Earning", 2.94, "individual", { gross: 4, fan: "Caleb Turner", description: "Post unlock" }),
];

const FIRST = ["Liam", "Maya", "Ethan", "Chloe", "Noah", "Zara", "Lucas", "Ivy", "Mason", "Nora", "Elijah", "Ruby", "Aiden", "Stella", "Caleb", "Leah", "Owen", "Hazel", "Julian", "Aria", "Levi", "Piper", "Ezra", "Quinn", "Miles", "Willa", "Felix", "Jade", "Silas", "Tessa", "Rhett", "Mila", "Beckett", "Sage"];
const LAST = ["Harper", "Nguyen", "Calloway", "Brennan", "Delgado", "Whitaker", "Okafor", "Lindqvist", "Moreau", "Sutton", "Kowalski", "Ramsey", "Fairbanks", "Ellison", "Vance", "Holloway", "Prescott", "Navarro", "Kincaid", "Abernathy"];
const CITIES = [
  "Denver, Colorado, United States", "Boulder, Colorado, United States", "Salt Lake City, Utah, United States", "Portland, Oregon, United States",
  "Bend, Oregon, United States", "Seattle, Washington, United States", "Reno, Nevada, United States", "Bozeman, Montana, United States",
  "Burlington, Vermont, United States", "Lake Placid, New York, United States", "Vancouver, British Columbia, Canada", "Calgary, Alberta, Canada",
  "Innsbruck, Tyrol, Austria", "Chamonix, Auvergne-Rhône-Alpes, France", "Queenstown, Otago, New Zealand", "Sapporo, Hokkaido, Japan",
];

type FanSeed = [name: string, location: string, lastSession: string, statuses: FanStatusFlag[], extra?: Partial<MoneyFan>];
const namedFans: FanSeed[] = [
  ["Trevor Lindell", "Denver, Colorado, United States", "2026-11-02T10:58", ["newsletter", "follower", "engager"]],
  ["Studio Bot", "Valencia, Valencian Community, Spain", "2026-11-01T18:59", ["subscriber", "newsletter", "follower", "purchaser"], { subscription: "Silver Plan", totalSpent: 48 }],
  ["Gavin Mercer", "Parker, Colorado, United States", "2026-11-01T03:09", ["newsletter", "follower", "purchaser", "engager"], { totalSpent: 81.8 }],
  ["Coastal Ridge Hawks", "Astoria, Oregon, United States", "2026-10-31T04:54", ["newsletter", "follower"]],
  ["Grant Whitfield", "Keystone, Colorado, United States", "2026-10-30T21:12", ["newsletter", "follower", "purchaser"], { totalSpent: 84.75 }],
  ["Balance With Juniper", "Denver, Colorado, United States", "2026-10-30T08:40", ["newsletter", "follower", "engager"]],
  ["Shane Corbett", "Colorado City, TX, USA", "2026-10-29T16:05", ["newsletter", "follower"]],
  ["Northline Crew", "Jaipur, Rajasthan, India", "2026-10-28T11:27", ["newsletter", "follower", "purchaser"], { totalSpent: 10 }],
  ["Skye Garrison", "Golden, Colorado, United States", "2026-10-27T19:44", ["newsletter", "follower"]],
  ["Marissa Kotler", "New York, United States", "2026-10-27T07:15", ["newsletter", "follower", "engager"]],
  ["Kendall Baxter", "Denver, Colorado, United States", "2026-10-26T13:30", ["newsletter", "follower"]],
  ["Rowan Pike", "Beverly Hills, California, United States", "2026-10-19T20:21", ["newsletter", "follower"]],
  ["Dale Hendricks", "Denver, Colorado, United States", "2026-10-14T03:54", ["newsletter", "follower"]],
  ["Arjun Mehta", "Gurugram, Haryana, India", "2026-10-12T16:51", ["newsletter", "follower", "engager"]],
  ["Brady Sorensen", "West Lafayette, Wabash Township, Indiana, United States", "2026-09-24T05:44", ["subscriber", "newsletter", "follower", "purchaser", "engager"], { subscription: "Gold Plan", totalSpent: 125 }],
  ["Carter Sylvan", "Astoria, Oregon, United States", "2026-09-23T23:05", ["newsletter", "follower", "engager"]],
  ["Colin Dunmore", "New York, United States", "2026-08-26T08:32", ["newsletter", "follower", "engager"]],
  ["Nolan Leclair", "Toronto, Ontario, Canada", "2026-08-06T21:42", ["newsletter", "follower"]],
  ["Wesley Harlan", "Denver, Colorado, United States", "2026-05-21T03:00", ["subscriber", "newsletter", "follower", "purchaser"], { subscription: "Gold Plan", totalSpent: 202.5 }],
  // fans referenced by older transactions / refunds (older sessions)
  ["Lena Okafor", "Boulder, Colorado, United States", "2026-07-30T19:12", ["newsletter", "follower", "purchaser", "engager"], { totalSpent: 5 }],
  ["Marcus Bell", "Salt Lake City, Utah, United States", "2026-07-28T07:41", ["subscriber", "newsletter", "follower"], { subscription: "Bronze Plan", totalSpent: 30 }],
  ["Priya Raman", "Seattle, Washington, United States", "2026-07-25T22:05", ["newsletter", "follower", "purchaser"], { totalSpent: 862.18 }],
  ["Owen Castillo", "Reno, Nevada, United States", "2026-07-21T10:33", ["newsletter", "follower", "purchaser"], { totalSpent: 990.37 }],
  ["Sofia Marin", "Bend, Oregon, United States", "2026-07-18T14:50", ["newsletter", "follower", "purchaser", "engager"], { totalSpent: 740.77 }],
  ["Hannah Brooks", "Bozeman, Montana, United States", "2026-07-15T09:02", ["subscriber", "newsletter", "follower", "purchaser"], { subscription: "Gold Plan", totalSpent: 75 }],
  ["Theo Lindgren", "Calgary, Alberta, Canada", "2026-07-12T18:27", ["newsletter", "follower", "purchaser"], { totalSpent: 5 }],
  ["Ava Sinclair", "Burlington, Vermont, United States", "2026-07-09T06:15", ["newsletter", "follower", "purchaser"], { totalSpent: 105 }],
  ["Daniel Okoye", "Portland, Oregon, United States", "2026-07-06T20:48", ["newsletter", "follower", "purchaser", "engager"], { totalSpent: 181.8 }],
  ["Mateo Alvarez", "Vancouver, British Columbia, Canada", "2026-07-03T11:19", ["subscriber", "newsletter", "follower", "purchaser"], { subscription: "Silver Plan", totalSpent: 168 }],
  ["Isla Fernandez", "Queenstown, Otago, New Zealand", "2026-06-29T08:44", ["newsletter", "follower", "purchaser"], { totalSpent: 15 }],
  ["Caleb Turner", "Lake Placid, New York, United States", "2026-06-25T16:36", ["newsletter", "follower", "purchaser"], { totalSpent: 4 }],
  ["Everett Hale", "Innsbruck, Tyrol, Austria", "2026-06-20T13:58", ["subscriber", "newsletter", "follower"], { subscription: "Bronze Plan", totalSpent: 5 }],
];

function buildFans(): MoneyFan[] {
  const out: MoneyFan[] = namedFans.map(([name, location, lastSession, statuses, extra], i) => ({
    id: `fan${i + 1}`,
    name,
    username: name.toLowerCase().replace(/[^a-z]/g, ""),
    avatar: null,
    email: `${name.toLowerCase().replace(/[^a-z]/g, ".")}@example.com`,
    joinedAt: `2025-0${(i % 9) + 1}-1${i % 10}`,
    subscription: null,
    totalSpent: 0,
    engagement: statuses.includes("engager") ? 3 + ((i * 7) % 19) : 0,
    recruited: 0,
    groupIds: [],
    location,
    lastSession,
    statuses,
    lastEngagedAt: statuses.includes("engager") ? `2026-0${(i % 6) + 4}-1${i % 9}` : null,
    recruitedAt: null,
    age: 19 + ((i * 5) % 30),
    gender: i % 3 === 0 ? "Female" : "Male",
    ...extra,
  }));
  // 35 generated fans (fictional), older sessions; a few recruiters and imported contacts.
  for (let i = 0; out.length < 54; i++) {
    const name = `${FIRST[(i * 7) % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`;
    const m = 7 - Math.floor(i / 6); // Jul 2026 → Jan 2026
    const day = 28 - ((i * 4) % 26);
    const statuses: FanStatusFlag[] = ["newsletter", "follower"];
    if (i % 5 === 0) statuses.push("engager");
    if (i % 9 === 0) statuses.unshift("subscriber");
    if (i % 7 === 0) statuses.push("purchaser");
    const imported = i % 11 === 4;
    out.push({
      id: `fan${out.length + 1}`,
      name,
      username: name.toLowerCase().replace(/[^a-z]/g, ""),
      avatar: null,
      email: `${name.toLowerCase().replace(/ /g, ".")}@example.com`,
      joinedAt: `2025-${String((i % 12) + 1).padStart(2, "0")}-0${(i % 9) + 1}`,
      subscription: statuses.includes("subscriber") ? "Bronze Plan" : null,
      totalSpent: statuses.includes("purchaser") ? 10 + (i % 4) * 15 : statuses.includes("subscriber") ? 5 : 0,
      engagement: statuses.includes("engager") ? 2 + (i % 13) : 0,
      recruited: i % 13 === 2 ? 2 : i % 13 === 8 ? 1 : 0,
      groupIds: [],
      location: CITIES[i % CITIES.length],
      lastSession: `2026-${String(Math.max(m, 1)).padStart(2, "0")}-${String(Math.max(day, 1)).padStart(2, "0")}T${String(5 + (i % 15)).padStart(2, "0")}:${String((i * 13) % 60).padStart(2, "0")}`,
      statuses: imported ? ["newsletter"] : statuses,
      imported,
      lastEngagedAt: statuses.includes("engager") ? `2026-${String(Math.max(m, 1)).padStart(2, "0")}-0${(i % 8) + 1}` : null,
      recruitedAt: i % 13 === 2 || i % 13 === 8 ? `2026-${String(Math.max(m - 1, 1)).padStart(2, "0")}-15` : null,
      age: 18 + ((i * 3) % 40),
      gender: i % 2 ? "Female" : "Male",
    });
  }
  return out;
}

const refundRequests: RefundItem[] = [
  { id: "rf1", date: "2026-09-28", fan: "Northline Crew", item: "E-Book: Tune a Snowboard", type: "Downloadable", amount: 10, reason: "Downloaded the wrong edition", status: "Pending" },
  { id: "rf2", date: "2025-05-14", fan: "Deleted User", fanDeleted: true, item: "How to Ride a Snowboard", type: "Course", amount: 100, reason: "Course not as described", status: "Approved" },
  { id: "rf3", date: "2025-05-12", fan: "Deleted User", fanDeleted: true, item: "Gold Plan", type: "Subscription", amount: 25, reason: "Charged twice", status: "Approved" },
  { id: "rf4", date: "2025-05-09", fan: "Deleted User", fanDeleted: true, item: "Silver Plan", type: "Subscription", amount: 10, reason: "Forgot to cancel", status: "Declined", adminOutcome: "Admin Declined" },
  { id: "rf5", date: "2025-05-07", fan: "Deleted User", fanDeleted: true, item: "Gold Plan", type: "Subscription", amount: 25, reason: "Accidental upgrade", status: "Approved", adminOutcome: "Admin Accepted" },
  { id: "rf6", date: "2025-05-05", fan: "Mateo Alvarez", item: "Silver Plan", type: "Subscription", amount: 48, reason: "Didn't use the plan this month", status: "Pending" },
  { id: "rf7", date: "2025-05-05", fan: "Everett Hale", item: "Bronze Plan", type: "Subscription", amount: 5, reason: "Subscribed by mistake", status: "Pending" },
  { id: "rf8", date: "2025-05-03", fan: "Mateo Alvarez", item: "Free Gift with any Summit Goggle Purchase", type: "Vip Offer", amount: 100, reason: "Gift never arrived", status: "Approved" },
  { id: "rf9", date: "2025-04-30", fan: "Deleted User", fanDeleted: true, item: "How to Ride a Snowboard", type: "Course", amount: 100, reason: "Unable to access videos", status: "Pending", adminOutcome: "Escalated to Customer Support" },
  { id: "rf10", date: "2025-04-26", fan: "Daniel Okoye", item: "Live Video Call with Me", type: "Experience", amount: 81.8, reason: "Schedule conflict", status: "Declined" },
];

function buildFulfillment(): FulfillmentItem[] {
  const MERCH = ["Ridgeline Pro Board", "Hometown Glide Board", "Ridgeline Pro Board", "Ridgeline Pro Board", "Hometown Glide Board", "Summit Beanie", "Team AJ Hoodie"];
  const EXP = ["Live Video Call with Me", "Personalized Video from Me", "Shoutout on Social Media"];
  const CUSTOMERS = ["Grant Whitfield", "Owen Castillo", "Priya Raman", "Sofia Marin", "Hannah Brooks", "Daniel Okoye", "Ava Sinclair"];
  const seeded: Omit<FulfillmentItem, "id" | "date" | "status">[] = [
    { item: "Ridgeline Pro Board", type: "Merchandise", itemType: "MERCHANDISE (SHOPIFY)", price: 908.6, orderedAt: "2026-08-15T06:47", fan: "Grant Whitfield", imageTone: "light" },
    { item: "Live Video Call with Me", type: "Experience", itemType: "EXPERIENCE", price: 81.8, orderedAt: "2026-08-06T16:12", fan: "Deleted User", fanDeleted: true, imageTone: "dark" },
    { item: "Hometown Glide Board", type: "Merchandise", itemType: "MERCHANDISE (SHOPIFY)", price: 809.82, orderedAt: "2026-07-25T00:25", fan: "Grant Whitfield", imageTone: "light" },
    { item: "Ridgeline Pro Board", type: "Merchandise", itemType: "MERCHANDISE (SHOPIFY)", price: 809.78, orderedAt: "2026-05-29T14:03", fan: "Priya Raman", imageTone: "light" },
    { item: "Ridgeline Pro Board", type: "Merchandise", itemType: "MERCHANDISE (SHOPIFY)", price: 908.57, orderedAt: "2026-05-19T09:41", fan: "Owen Castillo", imageTone: "light" },
    { item: "Hometown Glide Board", type: "Merchandise", itemType: "MERCHANDISE (SHOPIFY)", price: 730.77, orderedAt: "2026-05-19T08:10", fan: "Sofia Marin", imageTone: "light" },
    { item: "Personalized Video from Me", type: "Experience", itemType: "EXPERIENCE", price: 50, orderedAt: "2026-04-30T18:22", fan: "Hannah Brooks", imageTone: "dark" },
    { item: "Shoutout on Social Media", type: "Experience", itemType: "EXPERIENCE", price: 100, orderedAt: "2026-04-11T12:00", fan: "Ava Sinclair", imageTone: "dark" },
    { item: "Live Video Call with Me", type: "Experience", itemType: "EXPERIENCE", price: 81.8, orderedAt: "2026-03-27T20:35", fan: "Daniel Okoye", imageTone: "dark" },
  ];
  const out: FulfillmentItem[] = seeded.map((s, i) => ({ ...s, id: `ff${i + 1}`, date: s.orderedAt.slice(0, 10), status: "Pending" }));
  // 86 older, resolved items (95 total, as in 15f).
  for (let i = 0; out.length < 95; i++) {
    const exp = i % 4 === 1;
    const month = 3 - Math.floor(i / 24); // Mar 2026 backwards
    const y = month >= 1 ? 2026 : 2025;
    const mm = month >= 1 ? month : 12 + month;
    const dd = String(27 - (i % 24)).padStart(2, "0");
    const orderedAt = `${y}-${String(mm).padStart(2, "0")}-${dd}T${String(8 + (i % 12)).padStart(2, "0")}:${String((i * 17) % 60).padStart(2, "0")}`;
    const status: FulfillmentItem["status"] = i % 10 === 3 ? "Cancelled" : i % 15 === 7 ? "In Progress" : "Fulfilled";
    out.push({
      id: `ff${out.length + 1}`,
      date: orderedAt.slice(0, 10),
      orderedAt,
      fan: i % 17 === 5 ? "Deleted User" : CUSTOMERS[i % CUSTOMERS.length],
      fanDeleted: i % 17 === 5,
      item: exp ? EXP[i % EXP.length] : MERCH[i % MERCH.length],
      type: exp ? "Experience" : "Merchandise",
      itemType: exp ? "EXPERIENCE" : "MERCHANDISE (SHOPIFY)",
      price: exp ? [81.8, 50, 100][i % 3] : Math.round((640 + ((i * 37) % 280) + (i % 100) / 100) * 100) / 100,
      status,
      disputed: i === 22,
      imageTone: exp ? "dark" : "light",
    });
  }
  return out;
}

const ALBERT_BENEFITS = ["Enjoy free music more than the enjoyable fedwrikcs allowances.", "Enjoy free music more than the enjoyable fedwrikcs allowances as per the benefit", "Money Saving VIP Offers from my Partners"];

export const initialMoney: MoneyState = {
  fans: buildFans(),
  transactions,
  balance: { available: 27592.19, pending: 212.75, lifetime: 41318.62, currency: "USD" },
  payoutAccount: { connected: false, label: null },
  refundRequests,
  fulfillmentRequests: buildFulfillment(),
  loyaltyHistory: [], // spec: empty
  payoutCountry: "United States",
  savedCards: [{ id: "card1", brand: "VISA", last4: "0008", nameOnCard: "AJ White", zip: "12200", expires: "12/2028" }],
  referralLink: "https://www7.topfan.dev/share/a7c3f1",
  referrals: [
    { id: "ref1", name: "Milo Brandt", referredAt: "2025-04-24", commissionStart: "2025-04-24", commissionEnd: "2026-04-24", earned: 0 },
    { id: "ref2", name: "Tessa Lindqvist", referredAt: "2025-04-18", commissionStart: "2025-04-18", commissionEnd: "2026-04-18", earned: 0 },
  ],
  purchasedPlans: [
    // Benefit copy keeps the source's typo ("fedwrikcs") — a visible source quirk.
    { id: "pp1", creator: "Marlow Reyes", plan: "Premium Plan", price: 10, months: 1, status: "expired", autoRenew: false, benefits: ALBERT_BENEFITS },
    {
      id: "pp2", creator: "Balance With Juniper", plan: "Premium Plan + 1:1 Personal Coaching", price: 100, months: 1, status: "active", nextRenewal: "2026-11-24", autoRenew: true,
      benefits: ["Exclusive Feed Content: Articles, Videos & More", "Premium Newsletter Access", "VIP Deals from My Sponsors", "Monthly Live Group Session"],
      included: [{ name: "Wellness Coaching Call", frequency: "1 Per Month", code: "DEMO-WC-7Q2K" }],
    },
    { id: "pp3", creator: "Everett Hale", plan: "Post Feed Plan A", price: 420, months: 12, discountPct: 30, status: "expired", refundRequested: true, autoRenew: false, benefits: ["exclusive content"] },
    { id: "pp4", creator: "Everett Hale", plan: "Downloadable Super Plan", price: 403.2, months: 12, discountPct: 30, status: "expired", refundRequested: true, autoRenew: false, benefits: ["Exclusive video posts", "Get Events free access", "Get Chatroom access", "Downloadable library"] },
    { id: "pp5", creator: "Everett Hale", plan: "Experience Plan", price: 747.6, months: 12, discountPct: 30, status: "expired", autoRenew: false, benefits: ["Monthly experience credit"] },
    { id: "pp6", creator: "Everett Hale", plan: "Course Super Plan", price: 52, months: 1, status: "expired", autoRenew: false, benefits: ["Plan verify"] },
    { id: "pp7", creator: "Copper Canyon Band", plan: "All Access + Presale + Merch Gift", price: 8, months: 1, status: "expired", autoRenew: false, benefits: ["Access to the Ticket Pre-Sale", "First Access to New Music", "Behind the Scenes Photos, Videos, and Livestreams", "Annual Merch Gift"] },
  ],
  purchases: {
    newsletter: [],
    merchandise: [
      { id: "pm1", title: "Find Your Center Hoodie", status: "Canceled", from: "Balance With Juniper", date: "2025-11-12", price: 84.3 },
      { id: "pm2", title: "2024 Open Road Long Sleeve Tee", status: "Open", from: "Copper Canyon Band", date: "2025-05-13", price: null },
      { id: "pm3", title: "Late Night Encore T-Shirt", status: "Confirmed", from: "Copper Canyon Band", date: "2025-04-23", price: 32 },
    ],
    courses: [
      { id: "pc1", title: "Learn How to Snowboard", from: "Rowan Pike", date: "2026-03-09", price: 52.62, currency: "EUR" },
      { id: "pc2", title: "Park Basics: Boxes & Rails", from: "Rowan Pike", date: "2025-06-02", price: 43.25 },
      { id: "pc3", title: "How to Ride a Snowboard", from: "AJ White", date: "2025-05-09", price: 81.8 },
    ],
    experiences: [
      { id: "pe1", title: "Personalized Video", subtitle: "Personalized Video from Me", status: "Canceled", from: "AJ White", date: "2025-04-25", price: 50 },
      { id: "pe2", title: "Social Media Follow or Post", subtitle: "Comment or Follow on Social Media", status: "Canceled", from: "AJ White", date: "2025-04-25", price: 100 },
      { id: "pe3", title: "Shoutout", subtitle: "Shoutout From the Band!", status: "Open", from: "Copper Canyon Band", date: "2025-04-20", price: 25 },
    ],
    tips: [
      { id: "pt1", title: "Copper Canyon Band", subtitle: "Post", from: "Copper Canyon Band", date: "2026-01-12", price: 5 },
      { id: "pt2", title: "Balance With Juniper", subtitle: "Direct Message", from: "Balance With Juniper", date: "2025-11-12", price: 5 },
      { id: "pt3", title: "Marlow Reyes", subtitle: "Direct Message", from: "Marlow Reyes", date: "2025-11-07", price: 5 },
      { id: "pt4", title: "Marlow Reyes", subtitle: "Direct Message", from: "Marlow Reyes", date: "2025-09-19", price: 20 },
      { id: "pt5", title: "Tumble", subtitle: "Post", from: "Tumble", date: "2025-07-29", price: 5 },
    ],
    content: [
      { id: "pf1", title: "So much fun today at the Winter Jam. #winterjam #Sports", subtitle: "Image", from: "Rowan Pike", date: "2026-03-17", price: 3.81 },
      { id: "pf2", title: "First run of the season, who's riding this weekend?", subtitle: "Video", from: "Rowan Pike", date: "2025-12-02", price: 2.5 },
    ],
    messages: [
      { id: "pd1", title: "Direct Message Content", from: "Copper Canyon Band", date: "2025-07-01", price: 1.25 },
      { id: "pd2", title: "Direct Message Content", from: "Marlow Reyes", date: "2025-06-14", price: 2 },
    ],
    "vip-offers": [],
    downloadables: [{ id: "pw1", title: "E-Book: Tune a Snowboard", from: "AJ White", date: "2025-04-25", price: 10 }],
    livestreams: [
      { id: "pl1", title: "Livestream #Health&Wellness #Fitness", from: "Balance With Juniper", date: "2025-09-29", price: 23 },
      { id: "pl2", title: "Test on Wed", from: "Balance With Juniper", date: "2025-09-25", price: 1 },
    ],
    portfolio: [],
    tickets: [],
  },
  contentPosts: [
    { id: "cp1", title: "Made it to Italy! Thanks for your support, go USA! 🇺🇸", type: "Image", createdAt: "2026-02-15", impressions: 0, engagements: 7, likes: 0, comments: 0, shares: 0 },
    { id: "cp2", title: "Hey guys, I need your help raising money to support my training to qualify for the 2026 Games. Every bit helps!", type: "Fundraiser", createdAt: "2025-11-18", impressions: 0, engagements: 11, likes: 0, comments: 0, shares: 0 },
    { id: "cp3", title: "Just got back from riding in Sölden, Austria. Epic. 🇦🇹", type: "Image", createdAt: "2025-11-18", impressions: 0, engagements: 0, likes: 0, comments: 0, shares: 0 },
    { id: "cp4", title: "In this handy manual, you'll learn to ride switch like a pro #Sports", type: "Downloadable", createdAt: "2025-04-28", impressions: 0, engagements: 0, likes: 0, comments: 0, shares: 0 },
    { id: "cp5", title: "Relieving my Gold Medal at the Olympics. #sports #snowboarding", type: "Video", createdAt: "2025-04-23", impressions: 0, engagements: 7, likes: 0, comments: 0, shares: 0 },
    { id: "cp6", title: "So much fun today at the Winter Jam. #winterjam #Sports", type: "Image", createdAt: "2025-04-06", impressions: 0, engagements: 7, likes: 0, comments: 0, shares: 0 },
    { id: "cp7", title: "Some of my favorite images from the #olympics!", type: "Image", createdAt: "2025-04-06", impressions: 0, engagements: 7, likes: 0, comments: 0, shares: 0 },
    { id: "cp8", title: "Which snowboard should I ride in this years X Games? #Sports #XGames", type: "Poll", createdAt: "2025-04-06", impressions: 0, engagements: 7, likes: 0, comments: 0, shares: 0 },
    { id: "cp9", title: "Check out my newest Goggle Collab with Summit Optics", type: "Link", createdAt: "2025-04-06", impressions: 0, engagements: 7, likes: 0, comments: 0, shares: 0 },
    { id: "cp10", title: "Listen to my appearance on the Bomb Hole podcast with my friend Jamie Rhodes", type: "Audio", createdAt: "2025-04-06", impressions: 0, engagements: 7, likes: 0, comments: 0, shares: 0 },
    { id: "cp11", title: "AJ White is ready for new heights", type: "Article", createdAt: "2025-04-06", impressions: 0, engagements: 7, likes: 0, comments: 0, shares: 0 },
    { id: "cp12", title: "Getting BIG air in Tahoe last weekend #snowboarding", type: "Image", createdAt: "2025-04-06", impressions: 0, engagements: 7, likes: 0, comments: 0, shares: 0 },
    { id: "cp13", title: "In this e-book, I will teach you my secrets to tuning a competition ready snowboard.", type: "Downloadable", createdAt: "2025-04-06", impressions: 0, engagements: 0, likes: 0, comments: 0, shares: 0 },
    { id: "cp14", title: "My friends at #ridgeline are giving away 10 beanie hats to my fans. To enter, tell us your favorite run!", type: "Giveaway", createdAt: "2025-04-06", impressions: 0, engagements: 0, likes: 0, comments: 0, shares: 0 },
  ],
  engagementDaily: [
    // This Month = Nov 1–2 → 21 + 53 = 74 post engagements, 3 WLS visits (16a).
    day("2026-11-02", { engagements: 53, visitsWls: 2 }),
    day("2026-11-01", { engagements: 21, visitsWls: 1 }),
    day("2026-10-27", { engagements: 9, visitsWls: 4, newFollowers: 1, dmsReceived: 2, dmsSent: 1 }),
    day("2026-10-21", { engagements: 14, visitsWls: 3, visitsTopfan: 2, likes: 3 }),
    day("2026-10-12", { engagements: 6, newSubscribers: 1, visitsWls: 5, comments: 1 }),
    day("2026-10-03", { engagements: 12, newFollowers: 2, visitsWls: 2, shares: 1 }),
    day("2026-09-18", { engagements: 8, newSubscribers: 1, visitsWls: 6 }),
    day("2026-08-14", { engagements: 22, newFollowers: 3, visitsWls: 9, dmsReceived: 3, dmsSent: 3 }),
  ],
  segments: [],
};

function day(date: string, p: Partial<DailyEngagement>): DailyEngagement {
  return { date, newFollowers: 0, newSubscribers: 0, newPosts: 0, impressions: 0, engagements: 0, likes: 0, comments: 0, shares: 0, visitsTopfan: 0, visitsWls: 0, dmsReceived: 0, dmsSent: 0, portfolio: 0, ...p };
}

/* ------------------------------------------------------------------ selectors */

/** Refunds still waiting for the creator's decision (Wallet tab badge). */
export const pendingRefunds = (d: AppData) => d.money.refundRequests.filter((r) => r.status === "Pending" && !r.adminOutcome);
/** Fulfillment items still open (Wallet tab badge). */
export const openFulfillments = (d: AppData) => d.money.fulfillmentRequests.filter((f) => f.status === "Pending");

/** Status label the Refund Requests table shows. */
export const refundStatusLabel = (r: RefundItem) => r.adminOutcome ?? (r.status === "Approved" ? "Accepted" : r.status);
/** Status label the Fulfillment list shows. */
export const fulfillmentStatusLabel = (f: FulfillmentItem) =>
  f.disputed ? "Disputed" : ({ Pending: "Open", "In Progress": "Awaiting Fan Confirmation", Fulfilled: "Payment Released", Cancelled: "Canceled" } as const)[f.status];

/** Returns why a withdrawal can't happen, or null if it can. */
export function withdrawBlocker(d: AppData, amount: number): string | null {
  if (!d.money.payoutAccount.connected) return "Connect a payout account before withdrawing.";
  if (!(amount > 0)) return "Enter an amount greater than $0.00.";
  if (amount > d.money.balance.available) return "Amount is more than your current wallet balance.";
  return null;
}

/* ------------------------------------------------------------------ actions (call inside act) */

const r2 = (n: number) => Math.round(n * 100) / 100;
let seq = 0;
const nid = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Withdraw `amount` from the wallet balance to the connected payout account (mock; Protected, need finance.write). */
export function withdraw(d: AppData, amount: number) {
  if (withdrawBlocker(d, amount)) return;
  d.money.balance.available = r2(d.money.balance.available - amount);
  d.money.transactions.unshift({ id: nid("t"), date: MONEY_TODAY, type: "Withdrawal", description: `Payout to ${d.money.payoutAccount.label}`, amount: -r2(amount), status: "Pending", category: null });
}

/** Connect a (fake) payout account; flips the mock flag only (Protected, need finance.write). */
export function connectPayoutAccount(d: AppData, label: string, country: string) {
  d.money.payoutAccount = { connected: true, label };
  d.money.payoutCountry = country;
}

/** Disconnect the payout account (Protected, need finance.write). */
export function disconnectPayoutAccount(d: AppData) {
  d.money.payoutAccount = { connected: false, label: null };
}

/** Save a fake test card (Protected, need finance.write). */
export function addCard(d: AppData, card: Omit<SavedCard, "id">) {
  d.money.savedCards.push({ ...card, id: nid("card") });
}

/** Remove a saved card (Protected, need finance.write). */
export function removeCard(d: AppData, id: string) {
  d.money.savedCards = d.money.savedCards.filter((c) => c.id !== id);
}

/** Accept a pending refund: marks it Accepted, records "Fan Refund Issued" and lowers the balance (Confirm, need finance.write). */
export function approveRefund(d: AppData, id: string) {
  const r = d.money.refundRequests.find((x) => x.id === id);
  if (!r || r.status !== "Pending" || r.adminOutcome) return;
  r.status = "Approved";
  r.decidedAt = MONEY_TODAY;
  d.money.balance.available = r2(d.money.balance.available - r.amount);
  d.money.transactions.unshift({ id: nid("t"), date: MONEY_TODAY, type: "Fan Refund Issued", description: `${r.item} ${r.type}`, fan: r.fan, amount: -r.amount, status: "Completed", category: null });
}

/** Decline a pending refund (Confirm, need finance.write). */
export function declineRefund(d: AppData, id: string) {
  const r = d.money.refundRequests.find((x) => x.id === id);
  if (!r || r.status !== "Pending" || r.adminOutcome) return;
  r.status = "Declined";
  r.decidedAt = MONEY_TODAY;
}

/** Mark an open experience as fulfilled → "Awaiting Fan Confirmation" (need content.write). */
export function markExperienceFulfilled(d: AppData, id: string) {
  const f = d.money.fulfillmentRequests.find((x) => x.id === id);
  if (!f || f.status !== "Pending" || f.itemType !== "EXPERIENCE") return;
  f.status = "In Progress";
}

/** Cancel an open order and refund the fan (Confirm, need finance.write). */
export function cancelAndRefundFulfillment(d: AppData, id: string) {
  const f = d.money.fulfillmentRequests.find((x) => x.id === id);
  if (!f || f.status !== "Pending") return;
  f.status = "Cancelled";
  d.money.balance.available = r2(d.money.balance.available - f.price);
  d.money.transactions.unshift({ id: nid("t"), date: MONEY_TODAY, type: "Fan Refund Issued", description: f.item, fan: f.fan, amount: -f.price, status: "Completed", category: null });
}

/** Turn auto-renewal off for a purchased plan (need finance.write). */
export function cancelAutoRenewal(d: AppData, planId: string) {
  const p = d.money.purchasedPlans.find((x) => x.id === planId);
  if (p) {
    p.autoRenew = false;
    p.nextRenewal = null;
  }
}

/** Renew an expired purchased plan with the saved card (mock payment; need finance.write). */
export function renewPlan(d: AppData, planId: string) {
  const p = d.money.purchasedPlans.find((x) => x.id === planId);
  if (!p) return;
  const [y, m, dd] = MONEY_TODAY.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1 + p.months, dd));
  p.status = "active";
  p.autoRenew = true;
  p.nextRenewal = next.toISOString().slice(0, 10);
  d.money.transactions.unshift({ id: nid("t"), date: MONEY_TODAY, type: "Subscription Purchase", description: `${p.plan} · ${p.creator}`, amount: -p.price, status: "Completed", category: null });
}

/** Remove a purchased plan card from My Purchases (need finance.write). */
export function removePurchasedPlan(d: AppData, planId: string) {
  d.money.purchasedPlans = d.money.purchasedPlans.filter((x) => x.id !== planId);
}

/** Save a fan segment from the Segmentation & Outreach form (need content.write). */
export function createSegment(d: AppData, name: string, criteria: Record<string, string>) {
  d.money.segments.push({ id: nid("seg"), name, criteria, createdAt: MONEY_TODAY });
}

export type _Draft = AppData;

/** inferred: add/remove a fan in a Group (Preferences › Groups → assigned in Fan Relationship Management). Needs content.write. */
export function setFanGroup(d: AppData, fanId: string, groupId: string, inGroup: boolean) {
  const f = d.money.fans.find((x) => x.id === fanId);
  if (!f) return;
  f.groupIds = inGroup ? [...new Set([...f.groupIds, groupId])] : f.groupIds.filter((g) => g !== groupId);
}
