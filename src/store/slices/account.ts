/**
 * Core account + session (owned by core). The creator identity is configurable: change `handle`
 * and `name` here (or switch demo profiles) and every route and screen follows.
 */
import type { Role } from "../model";

export interface AccountState {
  handle: string;
  name: string;
  firstName: string;
  avatar: string | null;
  /** Feed / fan-site cover photo (media key or path). */
  cover: string | null;
  /** Cover-page hero image on the white-label site (media key or path). */
  hero: string | null;
  verified: boolean;
  creatorCategory: string; // e.g. "Athletes"
  /** White-label theme (per creator). Changing these restyles the app. */
  theme: { bg: string; secondaryBg: string; accent: string; text: string; buttonText: string; postText?: string };
  /** White Label Site text logo (Customize Appearance › Site Logo). Older saved data may not have it. */
  logo?: { text: string; font: string };
  whiteLabel: { status: "active" | "not-set-up" | "provisioning"; domain: string; siteUrl: string; coverEnabled: boolean; lastPublishedAt?: string | null };
  /** Developer-only demo session (never shown in the original UI). */
  session: { role: Role; delegateId: string | null; fanView: "creator" | "fan" | "logged-out"; profileId: string };
}

export const initialAccount: AccountState = {
  handle: "ajwhite",
  name: "AJ White",
  firstName: "AJ",
  avatar: "creators/ajwhite/avatar", // media key (src/media); fictional creator, rider not identifiable
  cover: "creators/ajwhite/cover",
  hero: "creators/ajwhite/hero-1",
  verified: true,
  creatorCategory: "Athletes",
  theme: { bg: "#191a1c", secondaryBg: "#272a2b", accent: "#bc1111", text: "#ffffff", buttonText: "#ffffff", postText: "#ffffff" },
  logo: { text: "AJ White", font: "Rubik Dirt" },
  whiteLabel: { status: "active", domain: "ajwhite.com", siteUrl: "https://fans.ajwhite.com", coverEnabled: true },
  session: { role: "creator", delegateId: null, fanView: "creator", profileId: "athlete" },
};

/** Display fonts offered in Customize Appearance › Logo Font (bundled locally with Fontsource). */
export const LOGO_FONTS = ["Rubik Dirt", "Bebas Neue", "Permanent Marker", "Bungee", "Black Ops One", "Pacifico", "Roboto"];
export const fontStack = (font: string) => `"${font}", "Roboto", sans-serif`;
