/**
 * Page map for Preferences A (tabs 1–9 + Blocked Users): route id → component.
 */
import type { PageMap } from "../types";
import { Profile } from "./Profile";
import { WelcomeMessage } from "./WelcomeMessage";
import { Interests } from "./Interests";
import { CreatorType } from "./CreatorType";
import { CustomerSupport } from "./CustomerSupport";
import { Notifications } from "./Notifications";
import { NftWallet } from "./NftWallet";
import { Monetization } from "./Monetization";
import { Privacy } from "./Privacy";
import { BlockedUsers } from "./BlockedUsers";

export const pages: PageMap = {
  "pref-profile": Profile,
  "pref-welcome": WelcomeMessage,
  "pref-interests": Interests,
  "pref-creator-type": CreatorType,
  "pref-customer-support": CustomerSupport,
  "pref-notifications": Notifications,
  "pref-nft-wallet": NftWallet,
  "pref-monetization": Monetization,
  "pref-privacy": Privacy,
  "pref-blocked-users": BlockedUsers,
};
