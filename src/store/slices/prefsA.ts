/**
 * Preferences tabs 1–9: profile, welcome message, interests, creator type, customer support, notifications, NFT wallet, monetization settings, privacy.
 * Owned by the Preferences A build. Expand freely: keep the exported names (PrefsAState, initialPrefsA).
 * Actions are plain functions that mutate a draft: act("label", (d) => myAction(d, …)).
 *
 * All values are fictional. Passwords are never stored (only "changed at" timestamps).
 */
import type { AppData } from "../store";
import type { ID } from "../model";
import { creator } from "../../config/demo";

/* ---------------- area types ---------------- */

export interface PrefProfile {
  legalFirstName: string;
  legalLastName: string;
  email: string;
  phoneCountry: string; // ISO-2, e.g. "US"
  phone: string; // display-formatted national number
  location: string;
  currency: string;
  birthday: string; // ISO date yyyy-mm-dd
  gender: "Male" | "Female" | "Other" | null;
  bio: string;
  /** Uploads are never sent anywhere: only the chosen file name is kept. */
  coverFileName: string | null;
  avatarFileName: string | null;
  shipping: { country: string; address: string; state: string; city: string; postalCode: string };
}

export interface CreatorTypeEntry {
  id: ID;
  category: string; // one of CREATOR_CATEGORIES
  /** question id → selected option labels */
  answers: Record<string, string[]>;
}

export type SupportInquiry = "business" | "advertising" | "press";

export interface FollowedCreator {
  id: ID;
  name: string;
}

export type NotifChannel = "activity" | "browser" | "email" | "sms" | "newsletter";

export interface BlockedUser {
  id: ID;
  name: string;
  username: string;
  blockedAt: string; // ISO date
}

export interface PrefsAState {
  /* --- cross-section contract (keep these fields; others read them) --- */
  monetization: { subscriberOnlyChat: boolean; subscriberOnlyComments: boolean; tipsEnabled: boolean; dmPrice: number; dmPriceEnabled: boolean; guaranteedReply: boolean };
  integrations: { metamaskLinked: boolean; googleCalendarLinked: boolean; signIn: { email: boolean; google: boolean; apple: boolean; facebook: boolean } };
  welcomeMessage: { enabled: boolean; hasVideo: boolean; text: string };
  _ids?: ID[];

  /* --- Preferences A only --- */
  profile: PrefProfile;
  welcomeVideoFileName: string | null;
  interests: string[];
  creatorTypes: CreatorTypeEntry[];
  customerSupport: Record<SupportInquiry, string[]>;
  notifications: {
    posts: { comments: { checked: boolean; on: boolean }; reactions: { checked: boolean; on: boolean } };
    creators: FollowedCreator[];
    /** creator id → channel → on */
    matrix: Record<ID, Record<NotifChannel, boolean>>;
  };
  wallet: { address: string; lastSyncedAt: string | null };
  privacy: {
    showChatRooms: boolean;
    showPostTimestamps: boolean;
    privateAccount: boolean;
    showLocation: boolean;
    calendarEmail: string;
    /** creator id → share my info */
    sharing: Record<ID, boolean>;
    sharingCreators: FollowedCreator[];
    blocked: BlockedUser[];
    passwordChangedAt: string | null;
  };
  /** Pause / delete only flip these flags: the demo is never locked. */
  accountStatus: { paused: boolean; pausedAt: string | null; deletionRequested: boolean; deletionRequestedAt: string | null };
}

/* ---------------- catalogues (product copy) ---------------- */

/** P32 interests, in the product's order. */
export const INTERESTS = [
  "Health & Wellness", "Fitness", "Travel", "Beauty & Skincare",
  "Food & Recipes", "Cooking", "Music", "Sports", "Fashion", "Dance",
  "Television & Movies", "Business & Real Estate", "Kids & Family",
  "Gaming & E-Sports", "Humor", "Remodel & DIY", "Outdoors",
  "Hacks & Advice", "Faith & Spirituality", "Pets & Animals", "Art & Photography",
  "Lip-Sync", "Celebrity", "College", "Sci-Fi & Fantasy", "Automotive",
  "Magic & Illusion",
];

/** "Add Another Category Type" options (build prompt §5.2). */
export const CREATOR_CATEGORIES = ["Musicians", "Influencers", "Entertainers & Performers", "Athletes", "Professionals", "Organizations", "Fitness & Wellness", "Actors"];

export interface CreatorQuestion {
  id: string;
  text: string;
  multi: boolean;
  options: string[];
}

/**
 * Follow-up questions per category. Athletes Q1 is captured (P33a); Athletes Q2 options and every
 * other category are inferred.
 */
export const CREATOR_QUESTIONS: Record<string, CreatorQuestion[]> = {
  Athletes: [
    { id: "level", text: "At What Level Do You Play?", multi: false, options: ["Amateur", "Collegiate", "Professional", "Olympian"] },
    // inferred: option list (only "Snowboard" was captured as an answer)
    { id: "sport", text: "In Which Sport Do You Compete? (select all that apply)", multi: true, options: ["Baseball", "Basketball", "Football", "Golf", "Hockey", "Skateboard", "Ski", "Snowboard", "Soccer", "Surf", "Tennis", "Track & Field", "Other"] },
  ],
  // inferred: everything below
  Musicians: [
    { id: "role", text: "What Best Describes You?", multi: false, options: ["Solo Artist", "Band", "Producer", "DJ", "Songwriter"] },
    { id: "genre", text: "Which Genres Do You Perform? (select all that apply)", multi: true, options: ["Pop", "Rock", "Hip-Hop", "Country", "Electronic", "Jazz", "Classical", "Other"] },
  ],
  Influencers: [{ id: "topic", text: "What Do You Mostly Post About? (select all that apply)", multi: true, options: ["Lifestyle", "Beauty", "Fashion", "Travel", "Food", "Tech", "Comedy", "Other"] }],
  "Entertainers & Performers": [{ id: "kind", text: "What Kind of Performer Are You?", multi: false, options: ["Comedian", "Magician", "Dancer", "Host", "Other"] }],
  Professionals: [{ id: "field", text: "What Is Your Field?", multi: false, options: ["Business", "Finance", "Health", "Education", "Law", "Other"] }],
  Organizations: [{ id: "type", text: "What Type of Organization Are You?", multi: false, options: ["Team", "Brand", "Non-Profit", "School", "Other"] }],
  "Fitness & Wellness": [{ id: "focus", text: "What Is Your Focus? (select all that apply)", multi: true, options: ["Strength", "Yoga", "Running", "Nutrition", "Mindfulness", "Other"] }],
  Actors: [{ id: "medium", text: "Where Do You Act? (select all that apply)", multi: true, options: ["Film", "Television", "Theater", "Voice", "Other"] }],
};

export const SUPPORT_INQUIRIES: { id: SupportInquiry; label: string }[] = [
  { id: "business", label: "Business Inquiry" },
  { id: "advertising", label: "Advertising Inquiry" },
  { id: "press", label: "Press or Media Request" },
];

/** P34 "Handled by TopFan" rows (locked). */
export const TOPFAN_HANDLED = [
  "Account Issue", "Payment Issue", "Technical Problem", "New Feature Suggestion",
  "Intellectual Property Matter", "Inappropriate Content or User", "Currency Change Request",
];

export const NOTIF_CHANNELS: NotifChannel[] = ["activity", "browser", "email", "sms", "newsletter"];

export const DM_PRICE_PRESETS = [1, 5, 10, 20, 50];
export const DM_PRICE_MIN = 1;

/* ---------------- seed (fictional) ---------------- */

const followed: FollowedCreator[] = [
  "Alpine Lens Co", "Backcountry Bea", "Coach Rivera", "Daily Stretch Lab", "Echo Valley Band",
  "Fresh Powder Kitchen", "Gravity Garage", "Harbor & Pine", "Iron Ridge Fitness", "Juniper Trails",
  "Kettle & Crumb", "Lumen Yoga", "Mesa Moto", "Northwind Audio",
].map((name, i) => ({ id: `fc${i + 1}`, name }));

const sharingCreators: FollowedCreator[] = followed.slice(0, 9);

const allOn = (): Record<NotifChannel, boolean> => ({ activity: true, browser: true, email: true, sms: true, newsletter: true });

export const initialPrefsA: PrefsAState = {
  monetization: { subscriberOnlyChat: false, subscriberOnlyComments: false, tipsEnabled: true, dmPrice: 1, dmPriceEnabled: true, guaranteedReply: false },
  integrations: { metamaskLinked: true, googleCalendarLinked: true, signIn: { email: true, google: false, apple: false, facebook: false } },
  welcomeMessage: { enabled: true, hasVideo: true, text: "Hey, welcome to the crew! Glad you're here." },

  profile: {
    legalFirstName: "Andrew",
    legalLastName: "White",
    email: "aj.white@example.com",
    phoneCountry: "US",
    phone: "(555) 010-2468",
    location: creator.location,
    currency: "US Dollars (USD) $",
    birthday: "1996-02-09",
    gender: "Male",
    bio: creator.bio,
    coverFileName: null,
    avatarFileName: null,
    shipping: { country: "United States", address: "100 Example Lane", state: "Colorado", city: "Silverthorne", postalCode: "80000" },
  },
  welcomeVideoFileName: "welcome-video.mp4",
  interests: ["College"],
  creatorTypes: [{ id: "ct1", category: "Athletes", answers: { level: ["Olympian"], sport: ["Snowboard"] } }],
  customerSupport: {
    business: ["aj.white@example.com"],
    advertising: ["aj.white@example.com"],
    press: ["aj.white@example.com"],
  },
  notifications: {
    posts: { comments: { checked: false, on: false }, reactions: { checked: false, on: false } },
    creators: followed,
    matrix: Object.fromEntries(followed.map((c) => [c.id, allOn()])),
  },
  wallet: { address: "0x5e1d7Fa0c93b2E4f6A18d0b7C3e9F2a41b6c9c4e", lastSyncedAt: null },
  privacy: {
    showChatRooms: true,
    showPostTimestamps: false,
    privateAccount: false,
    showLocation: true,
    calendarEmail: "aj.white@example.com",
    sharingCreators,
    sharing: Object.fromEntries(sharingCreators.map((c, i) => [c.id, i === 0 || i === 4])),
    blocked: [
      { id: "bu1", name: "Spam Bot 3000", username: "spambot3000", blockedAt: "2026-08-14" },
      { id: "bu2", name: "Rude Rider", username: "ruderider", blockedAt: "2026-09-02" },
      { id: "bu3", name: "Fake Giveaway", username: "fakegiveaway", blockedAt: "2026-10-21" },
    ],
    passwordChangedAt: null,
  },
  accountStatus: { paused: false, pausedAt: null, deletionRequested: false, deletionRequestedAt: null },
};

export type _Draft = AppData;

/* ---------------- helpers ---------------- */

const now = () => new Date().toISOString();
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
/** "*** *** abcd" — the masked wallet address shown on the NFT Wallet tab. */
export const maskWallet = (addr: string) => `*** *** ${addr.slice(-4).toLowerCase()}`;

/** Secure Password Requirements (P38 popover): returns the unmet rules. */
export function passwordProblems(pw: string): string[] {
  const out: string[] = [];
  if (!/[^A-Za-z0-9]/.test(pw)) out.push("Should have at least one special character");
  if (!/[A-Z]/.test(pw)) out.push("Should have at least one upper case character");
  if (!/[a-z]/.test(pw)) out.push("Should have at least one lower case character");
  if (!/[0-9]/.test(pw)) out.push("Should have at least one numerical digit");
  if (pw.length < 8) out.push("Should be of at least 8 characters");
  return out;
}

/* ---------------- actions ---------------- */

/** Profile › UPDATE PROFILE: saves the profile form and mirrors the public name onto the account. */
export function updateProfile(d: AppData, p: PrefProfile & { displayName: string }) {
  const { displayName, ...profile } = p;
  d.prefsA.profile = profile;
  d.account.name = displayName.trim();
  d.account.firstName = displayName.trim().split(/\s+/)[0] ?? d.account.firstName;
}

/** Profile › email pencil: changes the sign-in email (simulated; no verification email is sent). */
export function changeEmail(d: AppData, email: string) {
  d.prefsA.profile.email = email.trim();
}

/** Welcome Message › UPDATE: saves enabled state, video presence and message text (max 200 chars). */
export function updateWelcomeMessage(d: AppData, w: { enabled: boolean; hasVideo: boolean; text: string; videoFileName?: string | null }) {
  d.prefsA.welcomeMessage = { enabled: w.enabled, hasVideo: w.hasVideo, text: w.text.slice(0, 200) };
  if (w.videoFileName !== undefined) d.prefsA.welcomeVideoFileName = w.videoFileName;
}

/** Interests › UPDATE: replaces the selected interests. */
export function setInterests(d: AppData, interests: string[]) {
  d.prefsA.interests = INTERESTS.filter((i) => interests.includes(i));
}

/** Creator Type › SUBMIT: saves all creator types; the first one becomes the account's category. */
export function setCreatorTypes(d: AppData, types: CreatorTypeEntry[]) {
  d.prefsA.creatorTypes = types;
  if (types[0]) d.account.creatorCategory = types[0].category;
}

/** Creator Type helper: a new entry for a category (ids are generated). */
export const newCreatorType = (category: string, answers: Record<string, string[]> = {}): CreatorTypeEntry => ({ id: uid("ct"), category, answers });

/** Customer Support › SAVE CHANGES: sets the email recipients for each editable inquiry type. */
export function setSupportEmails(d: AppData, emails: Record<SupportInquiry, string[]>) {
  d.prefsA.customerSupport = emails;
}

/** Notifications › post activity row: the round checkbox or the toggle ("checked" / "on"). */
export function setPostNotification(d: AppData, row: "comments" | "reactions", field: "checked" | "on", value: boolean) {
  d.prefsA.notifications.posts[row][field] = value;
}

/** Notifications › creator matrix: turns one channel on/off for one followed creator. */
export function setCreatorNotification(d: AppData, creatorId: ID, channel: NotifChannel, on: boolean) {
  const row = d.prefsA.notifications.matrix[creatorId] ?? allOn();
  row[channel] = on;
  d.prefsA.notifications.matrix[creatorId] = row;
}

/** NFT Wallet › RESYNC: records a (simulated) resync time. */
export function resyncWallet(d: AppData) {
  d.prefsA.wallet.lastSyncedAt = now();
}

/** NFT Wallet › UNLINK WALLET (Protected, account.admin): marks MetaMask as unlinked. */
export function unlinkWallet(d: AppData) {
  d.prefsA.integrations.metamaskLinked = false;
}

/** NFT Wallet › connect (inferred, simulated): marks MetaMask as linked after an explicit click. No wallet is contacted. */
export function linkWallet(d: AppData) {
  d.prefsA.integrations.metamaskLinked = true;
  d.prefsA.wallet.lastSyncedAt = now();
}

/** Monetization › toggles (subscriber-only chat/comments, tips, DM price on/off, guaranteed reply). */
export function setMonetizationFlag(
  d: AppData,
  key: "subscriberOnlyChat" | "subscriberOnlyComments" | "tipsEnabled" | "dmPriceEnabled" | "guaranteedReply",
  value: boolean,
) {
  d.prefsA.monetization[key] = value;
}

/** Monetization › Edit Price Per Individual Direct Message (Confirm, finance.write). Minimum $1.00. */
export function setDmPrice(d: AppData, price: number) {
  d.prefsA.monetization.dmPrice = Math.max(DM_PRICE_MIN, Math.round(price * 100) / 100);
}

/** Privacy › Audience & Visibility toggles. */
export function setPrivacyFlag(d: AppData, key: "showChatRooms" | "showPostTimestamps" | "privateAccount" | "showLocation", value: boolean) {
  d.prefsA.privacy[key] = value;
}

/** Privacy › Allow sharing of my information with one creator. */
export function setSharing(d: AppData, creatorId: ID, on: boolean) {
  d.prefsA.privacy.sharing[creatorId] = on;
}

/** Privacy › Blocked Users › Unblock: removes a user from the blocked list. */
export function unblockUser(d: AppData, id: ID) {
  d.prefsA.privacy.blocked = d.prefsA.privacy.blocked.filter((b) => b.id !== id);
}

/** Privacy › Unlink Calendar (Confirm, account.admin). */
export function setCalendarLinked(d: AppData, linked: boolean) {
  d.prefsA.integrations.googleCalendarLinked = linked;
}

/** Privacy › Sign-in methods: activates or disconnects a method (simulated, no OAuth). At least one stays active. */
export function setSignInMethod(d: AppData, method: "email" | "google" | "apple" | "facebook", on: boolean) {
  const s = d.prefsA.integrations.signIn;
  const active = Object.values(s).filter(Boolean).length;
  if (!on && s[method] && active < 2) return; // need two methods before disconnecting one
  s[method] = on;
}

/** Privacy › CHANGE PASSWORD (Protected, account.admin): records the change time only; no password is stored. */
export function changePassword(d: AppData) {
  d.prefsA.privacy.passwordChangedAt = now();
}

/** Privacy › Pause Account (Protected, account.admin): flips the paused flag only (the demo is never locked). */
export function pauseAccount(d: AppData) {
  d.prefsA.accountStatus.paused = true;
  d.prefsA.accountStatus.pausedAt = now();
}

/** Privacy › Reactivate (undo pause). */
export function reactivateAccount(d: AppData) {
  d.prefsA.accountStatus.paused = false;
  d.prefsA.accountStatus.pausedAt = null;
}

/** Privacy › Delete Account (Protected, account.admin): flags a deletion request only (nothing is deleted). */
export function requestAccountDeletion(d: AppData) {
  d.prefsA.accountStatus.deletionRequested = true;
  d.prefsA.accountStatus.deletionRequestedAt = now();
}

/** Privacy › Cancel deletion request (undo delete). */
export function cancelAccountDeletion(d: AppData) {
  d.prefsA.accountStatus.deletionRequested = false;
  d.prefsA.accountStatus.deletionRequestedAt = null;
}
