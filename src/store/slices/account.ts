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
  verified: boolean;
  creatorCategory: string; // e.g. "Athletes"
  /** White-label theme (per creator). Changing these restyles the app. */
  theme: { bg: string; secondaryBg: string; accent: string; text: string; buttonText: string };
  whiteLabel: { status: "active" | "not-set-up" | "provisioning"; domain: string; siteUrl: string; coverEnabled: boolean };
  /** Developer-only demo session (never shown in the original UI). */
  session: { role: Role; delegateId: string | null; fanView: "creator" | "fan" | "logged-out"; profileId: string };
}

export const initialAccount: AccountState = {
  handle: "ajwhite",
  name: "AJ White",
  firstName: "AJ",
  avatar: null, // neutral placeholder (no screenshot crops)
  verified: true,
  creatorCategory: "Athletes",
  theme: { bg: "#191a1c", secondaryBg: "#272a2b", accent: "#bc1111", text: "#ffffff", buttonText: "#ffffff" },
  whiteLabel: { status: "active", domain: "ajwhite.com", siteUrl: "https://fans.ajwhite.com", coverEnabled: true },
  session: { role: "creator", delegateId: null, fanView: "creator", profileId: "athlete" },
};
