/**
 * Preferences tabs 11–16: outbound emails, link in bio, delegates, topic tags, groups, gamification.
 * Owned by the Preferences B build. Expand freely: keep the exported names (PrefsBState, initialPrefsB).
 * Actions are plain functions that mutate a draft: act("label", (d) => myAction(d, …), { need }).
 * All data is fictional (spec 53 contains real-looking people: replaced with made-up delegates).
 */
import type { AppData } from "../store";
import type { Delegate, Group, ID, OutboundEmail, TopicTag } from "../model";
import { personAvatar } from "../../media";

/* ------------------------------------------------------------------ types */

/** Topic Tag plus the optional private description from the add form (54b). */
export type TopicTagRecord = TopicTag & { description?: string };

/** Revenue streams, in the order Delegate Details lists them (53b). */
export const REVENUE_STREAMS = [
  "Subscription", "Newsletters", "Experiences", "Courses", "Downloadables", "Merchandise", "Event Ticketing",
  "VIP Offers", "Portfolios", "Posts", "Tips", "Paid Direct Messages", "Fundraiser", "Livestream", "Loyalty Points",
] as const;

/** One card in the Link In Bio preview (52). */
export interface BioAction {
  id: ID;
  kind: "welcome-video" | "store-item" | "fundraiser" | "general" | "feed" | "portfolio" | "event" | "external";
  title: string;
  text?: string;
  price?: number;
  url?: string;
  /** Media key (src/media) for store-item cards; same key as the product in Monetize. */
  image?: string | null;
}

export interface LinkInBioState {
  enabled: boolean;
  includeReferral: boolean;
  /** Index into LIB_PALETTES (0 = the creator's own theme colours), or -1 = customPalette. */
  palette: number;
  /** "Make a Custom Color Palette" colours (same 6-slot order as LIB_PALETTES). */
  customPalette: string[];
  theme: string | null;
  actions: BioAction[];
}

export interface EarnActivity { id: ID; label: string; points: number; active: boolean }
export interface PointsBundle { id: ID; points: number; bonus: number; price: number; active: boolean }
export interface Badge { id: ID; icon: string; label: string; points: number | null; active: boolean }

export interface GamificationState {
  earnEnabled: boolean;
  displayLeaderboard: boolean;
  activities: EarnActivity[];
  buyEnabled: boolean;
  bundles: PointsBundle[];
  badges: Badge[];
}

/** Mock-only Outbound Email flow state (the contract `outboundEmail` stays the source of truth for status). */
export interface OutboundFlow {
  /** Which screen of the setup flow is showing. "status" = the failed/verifying/verified status card. */
  phase: "status" | "setup" | "records";
  /** inferred: the creator ticked "I've added these records" in the mock DNS step. Drives the simulated check. */
  recordsAdded: boolean;
}

export interface PrefsBState {
  /* --- cross-section contract (keep these fields; others read them) --- */
  groups: Group[];
  topicTags: TopicTagRecord[];
  delegates: Delegate[];
  outboundEmail: OutboundEmail;
  /* --- area-only --- */
  /** Delegate id → last session (ISO). Shown as "STATUS / LAST SESSION". */
  delegateLastSession: Record<ID, string>;
  /** Delegate id → avatar media key (illustration from personAvatar(id)). */
  delegateAvatars: Record<ID, string>;
  /** Chat Room / Direct Messaging restricted to Groups (inferred sub-settings, 55 popover). */
  groupRestrictions: { chatRoom: boolean; directMessages: boolean };
  linkInBio: LinkInBioState;
  gamification: GamificationState;
  outboundFlow: OutboundFlow;
}

/* ------------------------------------------------------------------ static data */

/** Link In Bio standard palettes (52f), 6 colours each: page bg, bg text, post bg, post text, logo/button, button text. */
export const LIB_PALETTES: string[][] = [
  ["#191a1c", "#ffffff", "#272a2b", "#ffffff", "#bc1111", "#ffffff"],
  ["#013956", "#ffffff", "#002740", "#ffffff", "#09c6da", "#000000"],
  ["#f7f8fa", "#292929", "#ffffff", "#292929", "#09c6da", "#000000"],
  ["#191a1c", "#ffffff", "#272a2b", "#ffffff", "#09c6da", "#000000"],
  ["#fcb904", "#463811", "#ffc937", "#463811", "#463811", "#fcb904"],
  ["#cf2f2f", "#ffffff", "#e04545", "#ffffff", "#ffffff", "#cf2f2f"],
  ["#9c51e2", "#ffffff", "#ac5ef5", "#ffffff", "#200737", "#ffffff"],
  ["#002033", "#ffffff", "#0b4466", "#ffffff", "#ffffff", "#002033"],
  ["#f68da7", "#6a001a", "#fc9eb6", "#6a001a", "#6a001a", "#ffffff"],
  ["#ff6a00", "#ffffff", "#ff7a1b", "#ffffff", "#693510", "#ffffff"],
  ["#7ddcb7", "#194030", "#8fe7c5", "#194030", "#1f543f", "#ffffff"],
  ["#000000", "#ffffff", "#242424", "#ffffff", "#ffffff", "#000000"],
];
export const LIB_CUSTOM_PALETTE = ["#000000", "#ffffff", "#2a2a2a", "#ffffff", "#0a84ff", "#ffffff"];
export const LIB_THEMES = [
  "NATURE", "SPACE", "SPEED", "CALM", "VINTAGE", "GAMING", "DREAMY", "DOODLE",
  "POLYGONS/BLUE", "POLYGONS/GREEN", "POLYGONS/WHITE", "POLYGONS/GRAY",
];

/** NEW ACTION dropdown items (52e) → the kind of card they add. */
export const LIB_NEW_ACTIONS: { label: string; kind: BioAction["kind"] }[] = [
  { label: "+ Add a General Action Item", kind: "general" },
  { label: "+ Add a Specific Store Item", kind: "store-item" },
  { label: "+ Add Specific Feed Content Items", kind: "feed" },
  { label: "+ Add a Specific Portfolio Item", kind: "portfolio" },
  { label: "+ Add a Specific Event Ticketing Item", kind: "event" },
  { label: "+ Add an External Action Item", kind: "external" },
];

/** Outbound email DNS record helper text, by record (51 bundle copy). */
export const OUTBOUND_RECORD_HELP: Record<string, string> = {
  "TXT:ses": "Confirms that this domain belongs to you and can send emails",
  "TXT:spf": "Allows this subdomain to send emails safely",
  "TXT:dmarc": "Helps prevent fake emails and improves trust in your domain",
  DKIM1: "Points your domain to another service so features like websites or tracking links work correctly",
  DKIM2: "Helps connect additional subdomains to the same service without managing IP addresses",
  DKIM3: "Used for advanced setup (like email tracking or custom links) to ensure proper routing",
  MX: "Tells the internet where your emails should be delivered",
};

/* ------------------------------------------------------------------ seed */

const FAILED_STEPS: OutboundEmail["steps"] = [
  { label: "DNS Records Verification", status: "Failed" },
  { label: "Outbound Email Services Configuration", status: "Failed" },
];

/** Example-only records (never real DNS values). Order: SES TXT, SPF, DMARC, 3 DKIM CNAMEs, MX. */
export function exampleOutboundRecords(domain: string): OutboundEmail["records"] {
  const sub = domain.split(".")[0];
  return [
    { type: "TXT", host: `_amazonses.${sub}`, value: "example-verification-token-0000" },
    { type: "TXT", host: sub, value: "v=spf1 include:example-mail.net ~all" },
    { type: "TXT", host: `_dmarc.${sub}`, value: "v=DMARC1; p=none;" },
    { type: "CNAME", host: `exampletoken1._domainkey.${sub}`, value: "exampletoken1.dkim.example.net" },
    { type: "CNAME", host: `exampletoken2._domainkey.${sub}`, value: "exampletoken2.dkim.example.net" },
    { type: "CNAME", host: `exampletoken3._domainkey.${sub}`, value: "exampletoken3.dkim.example.net" },
    { type: "MX", host: sub, value: "10 feedback-smtp.example.net" },
  ];
}

const badge = (id: string, icon: string, label: string, points: number | null, active: boolean): Badge => ({ id, icon, label, points, active });

export const initialPrefsB: PrefsBState = {
  groups: [], // spec: no Groups (empty state)
  topicTags: [], // spec: no Topic Tags (empty state)
  // Same row count, types and order as 53 (Content; Financial, Content; Content; Financial, Content). Fictional people.
  delegates: [
    { id: "dl1", firstName: "Leo", lastName: "Grant", email: "leo.grant@example.com", access: ["Content"], revenueShare: {}, status: "Active", addedAt: "2025-11-02" },
    { id: "dl2", firstName: "Maya", lastName: "Torres", email: "maya.torres@example.com", access: ["Financial", "Content"], revenueShare: { Subscription: 10, Merchandise: 5 }, status: "Active", addedAt: "2025-09-14" },
    { id: "dl3", firstName: "Sam", lastName: "Okafor", email: "sam.okafor@example.com", access: ["Content"], revenueShare: {}, status: "Active", addedAt: "2025-03-08" },
    { id: "dl4", firstName: "Priya", lastName: "Shah", email: "priya.shah@example.com", access: ["Financial", "Content"], revenueShare: { Experiences: 8 }, status: "Active", addedAt: "2025-01-20" },
  ],
  delegateAvatars: Object.fromEntries(["dl1", "dl2", "dl3", "dl4"].map((id) => [id, personAvatar(id)])),
  delegateLastSession: {
    dl1: "2026-01-02T18:22:00Z",
    dl2: "2026-03-24T10:23:00Z",
    dl3: "2025-04-15T18:15:00Z",
    dl4: "2025-06-27T18:20:00Z",
  },
  outboundEmail: {
    domain: "mail.ajwhite.com",
    senderEmail: "hello@mail.ajwhite.com",
    status: "failed",
    steps: FAILED_STEPS,
    records: exampleOutboundRecords("mail.ajwhite.com"),
    lastCheckedAt: "2026-11-01T09:30:00Z",
    errorDetail: "The verification records were not found in the domain's DNS.",
  },
  outboundFlow: { phase: "status", recordsAdded: false },
  groupRestrictions: { chatRoom: false, directMessages: false },
  linkInBio: {
    enabled: true,
    includeReferral: false,
    palette: 0,
    customPalette: LIB_CUSTOM_PALETTE,
    theme: null,
    actions: [
      { id: "ba1", kind: "welcome-video", title: "WELCOME VIDEO", text: "Hi everyone, welcome to my new fan community!" },
      { id: "ba2", kind: "store-item", title: "Hometown Hero", text: "All Mountain / Powder Snowboard. Make an impact on the mountain with a Hometown Hero that radiates unity, love, and community!", price: 799.95, image: "merchandise/home-mountain-hero" },
      { id: "ba3", kind: "fundraiser", title: "Fundraiser", text: "Help me get to the next season of competitions! Every gift goes toward travel, coaching and gear.", price: 1250 },
    ],
  },
  gamification: {
    earnEnabled: true,
    displayLeaderboard: true,
    activities: [
      { id: "ea1", label: "Logging in Per Day", points: 1, active: true },
      { id: "ea2", label: "Commenting on a Feed Post (Limit 1 per post)", points: 1, active: true },
      { id: "ea3", label: "Commenting in the Chat Room (Limit 1 per day)", points: 1, active: true },
      { id: "ea4", label: "Watching or Listening to Video, Podcast or Music Portfolio Content (Limit 1 per Item)", points: 1, active: true },
      { id: "ea5", label: "Sharing a Piece of Content (Limit 1 per Content Item)", points: 1, active: true },
      { id: "ea6", label: "Recruiting a New Fan Registration", points: 3, active: true },
      { id: "ea7", label: "Spending Money (Points Per Dollar Spent)", points: 1, active: true },
    ],
    buyEnabled: true,
    bundles: [
      { id: "pb1", points: 500, bonus: 0, price: 5, active: true },
      { id: "pb2", points: 1100, bonus: 100, price: 10, active: true },
      { id: "pb3", points: 2300, bonus: 300, price: 20, active: true },
      { id: "pb4", points: 4500, bonus: 500, price: 40, active: true },
      { id: "pb5", points: 9000, bonus: 1000, price: 80, active: true },
    ],
    badges: [
      badge("bg1", "thumbs-up", "", null, false),
      badge("bg2", "trophy", "Gold Level", 10, true),
      badge("bg3", "crown-badge", "", null, false),
      badge("bg4", "gavel", "Moderator", null, false),
      badge("bg5", "check-seal", "Silver Level", 5, true),
      badge("bg6", "new-seal", "New Fan", 8, false),
      badge("bg7", "flag", "Bronze Level", 3, true),
      badge("bg8", "lightbulb", "", null, false),
      badge("bg9", "rocket", "", null, false),
      badge("bg10", "question", "Fan Ambassador", 4, true),
      badge("bg11", "heart", "", null, false),
      badge("bg12", "person-heart", "", null, false),
      badge("bg13", "dollar", "", null, false),
    ],
  },
};

/* ------------------------------------------------------------------ helpers */

const newId = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const today = () => new Date().toISOString().slice(0, 10);

/** Title rule shared by Topic Tags and Groups (54 bundle): required, 2–20 characters. Returns an error or null. */
export function validateTitle(title: string): string | null {
  const t = title.trim();
  if (!t) return "Title is required";
  if (t.length < 2) return "Minimum 2 characters allowed";
  if (t.length > 20) return "Maximum 20 characters allowed";
  return null;
}

/** Topic Tags are live in the feed only with at least two active tags (54). */
export const topicTagsActive = (d: AppData) => d.prefsB.topicTags.filter((t) => t.active).length >= 2;

/* ------------------------------------------------------------------ actions: topic tags (need content.write) */

/** Create an active Topic Tag. Returns the new id. */
export function addTopicTag(d: AppData, input: { name: string; description?: string }): ID {
  const id = newId("tt");
  d.prefsB.topicTags.push({ id, name: input.name.trim(), description: input.description?.trim() || undefined, active: true, createdAt: today() });
  return id;
}
/** Rename / re-describe a Topic Tag. */
export function updateTopicTag(d: AppData, id: ID, patch: { name?: string; description?: string; active?: boolean }) {
  const t = d.prefsB.topicTags.find((x) => x.id === id);
  if (!t) return;
  if (patch.name !== undefined) t.name = patch.name.trim();
  if (patch.description !== undefined) t.description = patch.description.trim() || undefined;
  if (patch.active !== undefined) t.active = patch.active;
}
/** Delete a Topic Tag (after the "Delete Topic Tag" confirm). */
export function deleteTopicTag(d: AppData, id: ID) {
  d.prefsB.topicTags = d.prefsB.topicTags.filter((x) => x.id !== id);
}

/* ------------------------------------------------------------------ actions: groups (need content.write) */

/** Create an active Group. Returns the new id. */
export function addGroup(d: AppData, input: { name: string; description?: string }): ID {
  const id = newId("gr");
  d.prefsB.groups.push({ id, name: input.name.trim(), description: input.description?.trim() || undefined, active: true, createdAt: today() });
  return id;
}
/** Edit a Group's title, description or active flag. */
export function updateGroup(d: AppData, id: ID, patch: { name?: string; description?: string; active?: boolean }) {
  const g = d.prefsB.groups.find((x) => x.id === id);
  if (!g) return;
  if (patch.name !== undefined) g.name = patch.name.trim();
  if (patch.description !== undefined) g.description = patch.description.trim() || undefined;
  if (patch.active !== undefined) g.active = patch.active;
}
/** Delete a Group. */
export function deleteGroup(d: AppData, id: ID) {
  d.prefsB.groups = d.prefsB.groups.filter((x) => x.id !== id);
}
/** Restrict the Chat Room / Direct Messaging to Groups (inferred sub-settings). */
export function setGroupRestriction(d: AppData, key: "chatRoom" | "directMessages", on: boolean) {
  d.prefsB.groupRestrictions[key] = on;
}

/* ------------------------------------------------------------------ actions: delegates (need account.admin) */

export interface NewDelegate {
  firstName: string;
  lastName: string;
  email: string;
  access: Delegate["access"];
  revenueShare: Record<string, number>;
}
/** Invite a delegate (status Pending until they accept). Granting Financial is Protected in the UI. Returns the id. */
export function addDelegate(d: AppData, input: NewDelegate): ID {
  const id = newId("dl");
  d.prefsB.delegates.push({
    id,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim(),
    access: input.access,
    revenueShare: input.access.includes("Financial") ? input.revenueShare : {},
    status: "Pending",
    addedAt: today(),
  });
  (d.prefsB.delegateAvatars ??= {})[id] = personAvatar(id);
  return id;
}
/** Change a delegate's access and revenue share (Content-only delegates get no revenue share). */
export function updateDelegateAccess(d: AppData, id: ID, access: Delegate["access"], revenueShare: Record<string, number>) {
  const x = d.prefsB.delegates.find((y) => y.id === id);
  if (!x) return;
  x.access = access;
  x.revenueShare = access.includes("Financial") ? revenueShare : {};
}
/** Remove a delegate's access (kept in the list as Removed = status "Inactive"). */
export function removeDelegate(d: AppData, id: ID) {
  const x = d.prefsB.delegates.find((y) => y.id === id);
  if (x) x.status = "Inactive";
}

/* ------------------------------------------------------------------ actions: outbound email (need account.admin) */

/** SETUP AGAIN (after "Reset Email Configuration" confirm): back to the domain choice step. */
export function resetOutboundEmail(d: AppData) {
  const o = d.prefsB.outboundEmail;
  o.status = "not-set-up";
  o.steps = o.steps.map((s) => ({ ...s, status: "Pending" }));
  o.errorDetail = null;
  d.prefsB.outboundFlow = { phase: "setup", recordsAdded: false };
}
/** Choose the sending domain (Protected: changes DNS). Generates example records and shows the DNS step. */
export function setOutboundDomain(d: AppData, domain: string, senderLocal = "hello") {
  const o = d.prefsB.outboundEmail;
  o.domain = domain.trim().toLowerCase();
  o.senderEmail = `${senderLocal}@${o.domain}`;
  o.records = exampleOutboundRecords(o.domain);
  o.status = "not-set-up";
  d.prefsB.outboundFlow = { phase: "records", recordsAdded: false };
}
/** Mock-only: the creator says they've added the records at their DNS provider. */
export function markOutboundRecordsAdded(d: AppData, added: boolean) {
  d.prefsB.outboundFlow.recordsAdded = added;
}
/** VERIFY OUTBOUND EMAIL SETTINGS: start the (simulated) verification → "Verifying Your Domain...". */
export function startOutboundVerification(d: AppData) {
  const o = d.prefsB.outboundEmail;
  o.status = "pending";
  o.steps = [
    { label: "DNS Records Verification", status: "Pending" },
    { label: "Outbound Email Services Configuration", status: "Pending" },
  ];
  o.errorDetail = null;
  d.prefsB.outboundFlow.phase = "status";
}
/**
 * RECHECK STATUS: the simulated check. No DNS lookup happens: it passes only if the records were marked
 * as added in the mock flow, otherwise it fails again (both steps Failed). Returns the new status.
 */
export function recheckOutboundEmail(d: AppData): OutboundEmail["status"] {
  const o = d.prefsB.outboundEmail;
  const ok = d.prefsB.outboundFlow.recordsAdded;
  o.lastCheckedAt = new Date().toISOString();
  if (ok) {
    o.status = "verified";
    o.steps = o.steps.map((s) => ({ ...s, status: "Verified" }));
    o.errorDetail = null;
  } else {
    o.status = "failed";
    o.steps = FAILED_STEPS.map((s) => ({ ...s }));
    o.errorDetail = "The verification records were not found in the domain's DNS.";
  }
  d.prefsB.outboundFlow.phase = "status";
  return o.status;
}
/** Delete Email Configuration: back to "not set up" (emails go out from the default sender). */
export function deleteOutboundEmail(d: AppData) {
  resetOutboundEmail(d);
}
/** Show a phase of the outbound flow without changing the configuration (e.g. UPDATE DOMAIN → setup). */
export function setOutboundPhase(d: AppData, phase: OutboundFlow["phase"]) {
  d.prefsB.outboundFlow.phase = phase;
}

/* ------------------------------------------------------------------ actions: link in bio (need content.write) */

/** DISABLE | ENABLE the public Link In Bio page. */
export function setLinkInBioEnabled(d: AppData, on: boolean) {
  d.prefsB.linkInBio.enabled = on;
}
/** "Include My Referral Link" switch. */
export function setLinkInBioReferral(d: AppData, on: boolean) {
  d.prefsB.linkInBio.includeReferral = on;
}
/** SAVE CHANGES in edit mode: replaces palette, theme and the ordered action list. */
export function saveLinkInBio(d: AppData, draft: Pick<LinkInBioState, "palette" | "customPalette" | "theme" | "actions">) {
  d.prefsB.linkInBio.palette = draft.palette;
  d.prefsB.linkInBio.customPalette = draft.customPalette;
  d.prefsB.linkInBio.theme = draft.theme;
  d.prefsB.linkInBio.actions = draft.actions;
}
/** Build a new action card for the NEW ACTION menu (pure helper, no store write). */
export function makeBioAction(kind: BioAction["kind"], title: string, extra: Partial<BioAction> = {}): BioAction {
  return { id: newId("ba"), kind, title, ...extra };
}

/* ------------------------------------------------------------------ actions: gamification (need content.write) */

/** SAVE CHANGES on EARN POINTS: enable flag, leaderboard and the activity table. */
export function saveEarnPoints(d: AppData, v: Pick<GamificationState, "earnEnabled" | "displayLeaderboard" | "activities">) {
  Object.assign(d.prefsB.gamification, v);
}
/** SAVE CHANGES on BUY POINTS: enable flag and which bundles are on sale. */
export function saveBuyPoints(d: AppData, v: Pick<GamificationState, "buyEnabled" | "bundles">) {
  Object.assign(d.prefsB.gamification, v);
}
/** SAVE CHANGES on BADGES: labels, auto-assign points and status. */
export function saveBadges(d: AppData, badges: Badge[]) {
  d.prefsB.gamification.badges = badges;
}

export type _Draft = AppData;
