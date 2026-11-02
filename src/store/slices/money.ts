/**
 * Wallet (balance, payouts, cards, referrals, transactions, loyalty, purchases, refunds, fulfillment) and Insights & Fans (fans, metrics, segments).
 * Owned by the Money build. Expand freely: keep the exported names (MoneyState, initialMoney).
 * Actions are plain functions that mutate a draft: act("label", (d) => myAction(d, …)).
 */
import type { AppData } from "../store";
import type { Fan, FulfillmentRequest, RefundRequest, Transaction } from "../model";

export interface MoneyState {
  /* --- cross-section contract (keep these fields; others read them) --- */
  fans: Fan[];
  transactions: Transaction[];
  balance: { available: number; pending: number; lifetime: number; currency: "USD" };
  payoutAccount: { connected: boolean; label: string | null };
  refundRequests: RefundRequest[];
  fulfillmentRequests: FulfillmentRequest[];
  loyaltyHistory: { id: string; date: string; description: string; points: number }[];
}

export const initialMoney: MoneyState = {
  fans: [],
  transactions: [],
  balance: { available: 1284.5, pending: 212.75, lifetime: 18432.1, currency: "USD" },
  payoutAccount: { connected: false, label: null },
  refundRequests: [
    { id: "rf1", date: "2026-10-12", fan: "Jordan Ellis", item: "Gold Plan (1 Month)", type: "Subscription", amount: 25, reason: "Charged twice", status: "Pending" },
    { id: "rf2", date: "2026-10-21", fan: "Casey Morgan", item: "Team Hoodie", type: "Merchandise", amount: 55, reason: "Wrong size", status: "Pending" },
    { id: "rf3", date: "2026-10-29", fan: "Riley Brooks", item: "Paid message", type: "Message", amount: 5, reason: "No reply received", status: "Pending" },
  ],
  fulfillmentRequests: Array.from({ length: 9 }, (_, i) => ({
    id: `ff${i + 1}`,
    date: `2026-10-${String(10 + i * 2).padStart(2, "0")}`,
    fan: ["Avery Kim", "Noah Patel", "Lena Fischer", "Diego Ramos", "Hana Sato", "Owen Clarke", "Zoe Martin", "Theo Walsh", "Iris Novak"][i],
    item: ["Shoutout video", "Signed poster", "1:1 video call", "Team Hoodie", "Shoutout video", "Training plan", "Signed poster", "1:1 video call", "Team Hoodie"][i],
    type: ["Experience", "Merchandise", "Experience", "Merchandise", "Experience", "Experience", "Merchandise", "Experience", "Merchandise"][i],
    status: "Pending" as const,
  })),
  loyaltyHistory: [], // spec: empty
};

export type _Draft = AppData;
