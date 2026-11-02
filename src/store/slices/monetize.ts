/**
 * Monetize: plans, newsletters, experiences, courses, downloadables, merchandise, NFTs, events, VIP offers, portfolios, discount codes, ads; plus public store data.
 * Owned by the Monetize build. Expand freely: keep the exported names (MonetizeState, initialMonetize).
 * Actions are plain functions that mutate a draft: act("label", (d) => myAction(d, …)).
 */
import type { AppData } from "../store";
import type { AdBrand, EventItem, SubscriptionPlan } from "../model";

export interface MonetizeState {
  /* --- cross-section contract (keep these fields; others read them) --- */
  plans: SubscriptionPlan[];
  events: EventItem[];
  adBrands: AdBrand[];
}

export const initialMonetize: MonetizeState = {
  plans: [
    { id: "gold", name: "Gold Plan", prices: [{ amount: 25, months: 1 }, { amount: 67.5, months: 3, discountPct: 10, freeTrialDays: 1 }, { amount: 120, months: 6, discountPct: 20, freeTrialDays: 3 }, { amount: 210, months: 12, discountPct: 30 }], benefits: [], subscribers: 0, active: true },
    { id: "silver", name: "Silver Plan", prices: [{ amount: 15, months: 1 }], benefits: [], subscribers: 0, active: true },
    { id: "bronze", name: "Bronze Plan", prices: [{ amount: 5, months: 1 }], benefits: [], subscribers: 0, active: true },
  ],
  events: [],
  adBrands: [
    { id: "ad1", name: "Northpeak Outfitters", status: "new", offer: "Sponsored post" },
    { id: "ad2", name: "Glacier Hydration", status: "new", offer: "Story mention" },
  ],
};

export type _Draft = AppData;
