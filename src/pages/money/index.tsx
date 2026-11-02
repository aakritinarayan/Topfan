/**
 * Page map for Wallet + Insights & Fans: route id → component.
 */
import type { PageMap } from "../types";
import { WalletBalance } from "./WalletBalance";
import { WalletLoyalty, WalletReferrals, WalletTransactions } from "./WalletHistory";
import { WalletPurchases } from "./WalletPurchases";
import { WalletRefunds } from "./WalletRefunds";
import { WalletFulfillment } from "./WalletFulfillment";
import { Insights } from "./Insights";

export const pages: PageMap = {
  // "wallet" redirects to wallet-balance (route.redirect); map it too in case the redirect is bypassed.
  "wallet": WalletBalance,
  "wallet-balance": WalletBalance,
  "wallet-referrals": WalletReferrals,
  "wallet-transactions": WalletTransactions,
  "wallet-loyalty": WalletLoyalty,
  "wallet-purchases": WalletPurchases,
  "wallet-purchases-category": WalletPurchases,
  "wallet-refunds": WalletRefunds,
  "wallet-fulfillment": WalletFulfillment,
  "insights": Insights,
};
