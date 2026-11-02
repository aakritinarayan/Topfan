/**
 * Preferences tabs 1–9: profile, welcome message, interests, creator type, customer support, notifications, NFT wallet, monetization settings, privacy.
 * Owned by the Preferences A build. Expand freely: keep the exported names (PrefsAState, initialPrefsA).
 * Actions are plain functions that mutate a draft: act("label", (d) => myAction(d, …)).
 */
import type { AppData } from "../store";
import type { ID } from "../model";

export interface PrefsAState {
  /* --- cross-section contract (keep these fields; others read them) --- */
  monetization: { subscriberOnlyChat: boolean; subscriberOnlyComments: boolean; tipsEnabled: boolean; dmPrice: number; dmPriceEnabled: boolean; guaranteedReply: boolean };
  integrations: { metamaskLinked: boolean; googleCalendarLinked: boolean; signIn: { email: boolean; google: boolean; apple: boolean; facebook: boolean } };
  welcomeMessage: { enabled: boolean; hasVideo: boolean; text: string };
  _ids?: ID[];
}

export const initialPrefsA: PrefsAState = {
  monetization: { subscriberOnlyChat: false, subscriberOnlyComments: false, tipsEnabled: true, dmPrice: 5, dmPriceEnabled: true, guaranteedReply: false },
  integrations: { metamaskLinked: true, googleCalendarLinked: true, signIn: { email: true, google: false, apple: false, facebook: false } },
  welcomeMessage: { enabled: true, hasVideo: true, text: "" },
};

export type _Draft = AppData;
