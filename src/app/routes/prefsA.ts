import { OWNER, CREATOR, type RouteDef } from "./types";

const P = "Avatar menu › Edit Preferences";
/** Preferences tabs 1–9 (owned by the Preferences A build). */
export const prefsARoutes: RouteDef[] = [
  { id: "pref-profile", pattern: "/edit-preference", title: "Profile", section: "preferences", menu: `${P} › Profile`, layout: "dashboard", access: OWNER, status: "captured", spec: "30-pref-profile.md", shots: ["30-", "30a-", "30b-", "30c-", "30d-", "30e-"] },
  { id: "pref-welcome", pattern: "/edit-preference/edit-welcome-message", title: "Welcome Message", section: "preferences", menu: `${P} › Welcome Message`, layout: "dashboard", access: CREATOR, status: "captured", spec: "31-pref-welcome-message.md", shots: ["31-", "31a-"] },
  { id: "pref-interests", pattern: "/edit-preference/edit-content", title: "Interests", section: "preferences", menu: `${P} › Interests`, layout: "dashboard", access: CREATOR, status: "captured", spec: "32-pref-interests.md", shots: ["32-"] },
  { id: "pref-creator-type", pattern: "/edit-preference/edit-creator", title: "Creator Type", section: "preferences", menu: `${P} › Creator Type`, layout: "dashboard", access: OWNER, status: "captured", spec: "33-pref-creator-type.md", shots: ["33-", "33a-"] },
  { id: "pref-customer-support", pattern: "/edit-preference/customer-support", title: "Customer Support", section: "preferences", menu: `${P} › Customer Support`, layout: "dashboard", access: OWNER, status: "captured", spec: "34-pref-customer-support.md", shots: ["34-"] },
  { id: "pref-notifications", pattern: "/edit-preference/notifications", title: "Notifications & Newsletters", section: "preferences", menu: `${P} › Notifications & Newsletters`, layout: "dashboard", access: OWNER, status: "captured", spec: "35-pref-notifications-newsletters.md", shots: ["35-", "35a-"] },
  { id: "pref-nft-wallet", pattern: "/edit-preference/connect-nft-wallet", title: "NFT Wallet", section: "preferences", menu: `${P} › NFT Wallet`, layout: "dashboard", access: OWNER, status: "captured", spec: "36-pref-nft-wallet.md", shots: ["36-"] },
  { id: "pref-monetization", pattern: "/edit-preference/monetization", title: "Monetization", section: "preferences", menu: `${P} › Monetization`, layout: "dashboard", access: OWNER, status: "captured", spec: "37-pref-monetization.md", shots: ["37-", "37a-", "37b-"] },
  { id: "pref-privacy", pattern: "/edit-preference/privacy", title: "Privacy, Password & Integrations", section: "preferences", menu: `${P} › Privacy, Password & Integrations`, layout: "dashboard", access: OWNER, status: "captured", spec: "38-pref-privacy-password-integrations.md", shots: ["38-", "38a-", "38b-"] },
  { id: "pref-blocked-users", pattern: "/edit-preference/privacy/blocked-users", title: "Blocked Users", section: "preferences", menu: `${P} › Privacy, Password & Integrations › Blocked Users`, parent: "pref-privacy", layout: "dashboard", access: OWNER, status: "inferred", spec: "38-pref-privacy-password-integrations.md", note: "Inferred: the row exists in P38 but the list was never opened. URL and layout are inferred." },
];
