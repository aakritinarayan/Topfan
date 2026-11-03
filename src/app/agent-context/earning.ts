/**
 * Earning discovery: the twelve Monetize features, grouped for conversation (not TopFan's own tab
 * order), each tied to its feature (route) and its guided task. Also the rules that turn what a
 * creator says about earning into: one broad question, all options, a guided decision, or a
 * recommendation. Every option resolves through the feature registry; nothing here has a route of its own.
 */
import { featureById } from "./features";
import { normalizeText } from "./intent";
import { taskById } from "./tasks";

/** "earns" = fans pay for it directly · "supports" = helps sell or showcase, not income on its own. */
export type EarnKind = "earns" | "supports";

export interface EarnOption {
  featureId: string;
  taskId: string;
  /** One plain line, from the feature's own description. */
  line: string;
  kind: EarnKind;
}

export type EarnGroupId = "membership" | "knowledge" | "products" | "events";

export const EARN_GROUPS: { id: EarnGroupId; label: string; ids: string[] }[] = [
  { id: "membership", label: "Memberships and exclusive content", ids: ["subscriptions", "newsletters", "vip-offers"] },
  { id: "knowledge", label: "Knowledge and personal experiences", ids: ["courses", "experiences", "downloadables"] },
  { id: "products", label: "Products and creative work", ids: ["merchandise", "portfolios", "nfts"] },
  { id: "events", label: "Events and brand opportunities", ids: ["events", "advertisements", "discount-codes"] },
];

export const EARN_OPTIONS: Record<string, EarnOption> = {
  subscriptions: { featureId: "subscriptions", taskId: "launch-subscription", kind: "earns", line: "Monthly plans fans pay for to get your exclusive content." },
  newsletters: { featureId: "newsletters", taskId: "send-newsletter", kind: "earns", line: "Email newsletters to fans, free or paid." },
  "vip-offers": { featureId: "vip-offers", taskId: "vip-offer", kind: "earns", line: "Special deals and perks, free or unlocked with a purchase or subscription." },
  courses: { featureId: "courses", taskId: "sell-course", kind: "earns", line: "Sell a course with lessons." },
  experiences: { featureId: "experiences", taskId: "sell-experience", kind: "earns", line: "Sell shoutouts, personalized videos, video calls and 1:1 sessions." },
  downloadables: { featureId: "downloadables", taskId: "sell-downloadable", kind: "earns", line: "Sell digital files fans can download." },
  merchandise: { featureId: "merchandise", taskId: "sell-merch", kind: "earns", line: "Sell merchandise through Shopify or an external link." },
  portfolios: { featureId: "portfolios", taskId: "create-portfolio", kind: "supports", line: "Group your videos or photos into portfolios fans can browse. Shows your work." },
  nfts: { featureId: "nfts", taskId: "list-nft", kind: "earns", line: "List NFTs you sell elsewhere." },
  events: { featureId: "events", taskId: "event-tickets", kind: "earns", line: "Create events and sell tickets." },
  advertisements: { featureId: "advertisements", taskId: "brand-ads", kind: "earns", line: "Brands pay to advertise with you; you approve which ones." },
  "discount-codes": { featureId: "discount-codes", taskId: "discount-code", kind: "supports", line: "Codes that take money off your plans and products. Helps sales; not income on its own." },
};

/** Every option must point at a real feature (route) and a real task: checked at load in dev. */
export const earnProblems = () =>
  Object.values(EARN_OPTIONS).flatMap((o) => [...(featureById(o.featureId) ? [] : [`no feature ${o.featureId}`]), ...(taskById(o.taskId) ? [] : [`no task ${o.taskId}`])]);

/* ---------------- what the creator said → what to show ---------------- */

export type EarnIntent =
  | { kind: "broad"; question: string }
  | { kind: "all" }
  | { kind: "decide" }
  | { kind: "recommend"; ids: string[]; why: string; note?: string; question?: string; goal?: string };

/** Specific goals → recommended features (most relevant first). Checked in order. */
const RECOMMEND: { re: RegExp; ids: string[]; why: string; note?: string; question?: string }[] = [
  { re: /\b(recurring|monthly|every month|steady) (income|revenue|money|earnings?)\b|\brecurring\b.*\b(income|revenue)\b/, ids: ["subscriptions"], why: "For income every month, Subscriptions fit best: fans pay a monthly plan for your exclusive content." },
  { re: /\bexclusive content\b|\bpaid (membership|members)\b|\bmembership\b/, ids: ["subscriptions"], why: "For exclusive content, Subscriptions fit best: fans pay a monthly plan to see it." },
  { re: /\b(personal|1:1|one on one|private) (coaching|sessions?|lessons?|calls?)\b|\bcoaching\b/, ids: ["experiences"], why: "For personal coaching, use Experiences: fans book and pay for 1:1 video calls or sessions." },
  { re: /\bteach|\beducat|\bshare (what|my) (i know|knowledge|skills)\b|\btutorials?\b/, ids: ["courses", "experiences", "downloadables"], why: "There are three ways to teach on TopFan, depending on the format.", question: "How would you like to teach?" },
  { re: /\bexclusive (experiences?|perks?|deals?|access)\b.*\b(biggest|best|top|closest|loyal|super) fans\b|\b(biggest|best|top) fans\b.*\bexclusive (experiences?|perks?|deals?)\b/, ids: ["vip-offers", "experiences"], why: "For your biggest fans: VIP Offers give them special deals and perks; Experiences sell personal time with you." },
  { re: /\b(branded|own) (products?|merch|merchandise|clothing|apparel)\b|\bmerch(andise)?\b|\b(t ?shirts?|hoodies?|apparel)\b/, ids: ["merchandise"], why: "For products with your brand, use Merchandise: sell items through Shopify or an external link." },
  { re: /\b(organi[sz]e|host|run|plan|create|sell tickets for) (a |an )?(paid )?(event|meetup|meet up|show|concert|workshop|competition)s?\b|\bpaid events?\b|\bsell tickets\b/, ids: ["events"], why: "For an event, use Events & Ticketing: create the event and sell tickets." },
  { re: /\bbrand(s)? (collab|collaborations?|partnerships?|deals?)\b|\bcollaborat\w* with brands\b|\bwork with brands\b|\bsponsor/, ids: ["advertisements"], why: "For brand collaborations, use Advertisements: brands pay to advertise with you, and you approve which ones." },
  { re: /\bencourage (more )?(sales|purchases|buying)\b|\bdiscounts?\b|\bpromo codes?\b|\bcoupons?\b|\b(run|have) a sale\b/, ids: ["discount-codes"], why: "For that, use Discount Codes: codes that take money off your plans and products.", note: "Discount codes don't earn money on their own; they help you sell more of what you already offer." },
  { re: /\b(from|with|off) my videos\b|\bmonetize my videos\b|\bsell my videos\b/, ids: ["subscriptions", "portfolios"], why: "Two ways to use your videos: lock them for paying subscribers with Subscriptions, and show them off in Portfolios.", note: "Portfolios showcase your videos; the income comes from Subscriptions." },
  { re: /\bdigital (products?|downloads?|files?)\b|\bebooks?\b|\bpresets?\b|\bpdfs?\b/, ids: ["downloadables"], why: "For digital products, use Downloadables: sell files fans can download." },
  { re: /\bpaid newsletters?\b|\bnewsletters?\b.*\b(paid|charge|earn)/, ids: ["newsletters"], why: "Use Newsletters: email fans, and lock an issue behind a price if you like." },
  { re: /\bnfts?\b|\bcollectibles?\b/, ids: ["nfts"], why: "Use NFTs: list NFTs you sell elsewhere on your store." },
];

const ALL = /\b(all|every|other) (the )?(ways|options)\b.*\b(earn|money|monetiz|income)|\bearning options\b|\bways (can i|to|i can) (earn|make money)\b|\bhow (can|do) i (earn|make money) on topfan\b|\bwhat can i sell\b/;
const DECIDE = /\b(help me|can you help me|i need help|i can't|i cant|not sure how to) (decide|choose|pick|figure out)\b.*\b(earn|money|monetiz|sell)|\bwhich (way|option) (to|should i) (earn|monetiz)|\bbest way (to|for me to) (earn|make money|monetiz)/;
const BROAD = /\b(earn|earning|make|making) (some )?(money|income|cash)\b|\bstart earning\b|\bearn (more )?(from|on)\b|\bmoneti[sz](e|ing)\b|\b(generate|grow|increase|more) (revenue|income)\b|\brevenue\b|\bget paid\b|\bmake a living\b|\bstart selling\b|\bsell (something|stuff|things)\b|\bsell to my fans\b|\bpaid access\b/;

/** What the creator said about earning, or null if it isn't about earning. */
export function matchEarning(raw: string): EarnIntent | null {
  const text = normalizeText(raw).trim();
  if (ALL.test(text)) return { kind: "all" };
  if (DECIDE.test(text)) return { kind: "decide" };
  for (const r of RECOMMEND) if (r.re.test(text)) return { kind: "recommend", ids: r.ids, why: r.why, note: r.note, question: r.question };
  if (BROAD.test(text)) return { kind: "broad", question: /\bsell|selling\b/.test(text) ? "What would you like to sell?" : "What kind of earning fits you best?" };
  return null;
}

/** "Help me decide": one question, each answer is a recommendation. */
export const DECIDE_OPTIONS: { id: string; label: string; ids: string[]; why: string; note?: string }[] = [
  { id: "monthly", label: "Income every month", ids: ["subscriptions"], why: "Subscriptions: fans pay a monthly plan for your exclusive content." },
  { id: "teach", label: "Teach what I know", ids: ["courses", "experiences", "downloadables"], why: "Pick the format: a course with lessons, live 1:1 sessions, or a file to download." },
  { id: "products", label: "Sell products", ids: ["merchandise", "downloadables"], why: "Merchandise for physical items; Downloadables for digital files." },
  { id: "event", label: "Run an event", ids: ["events"], why: "Events & Ticketing: create the event and sell tickets." },
  { id: "brands", label: "Work with brands", ids: ["advertisements"], why: "Advertisements: brands pay to advertise with you, and you approve which ones." },
  { id: "fans", label: "Reward my biggest fans", ids: ["vip-offers", "experiences"], why: "VIP Offers for special deals and perks; Experiences for personal time with you." },
];
