import { FINANCE, CREATOR, type RouteDef } from "./types";

const W = "Sidebar › Wallet";
/** Wallet + Insights & Fans. Owned by the Money build. */
export const moneyRoutes: RouteDef[] = [
  { id: "wallet", pattern: "/wallet", title: "Wallet", section: "wallet", menu: W, layout: "dashboard", access: FINANCE, status: "captured", spec: "15-wallet.md", redirect: "wallet-balance" },
  { id: "wallet-balance", pattern: "/wallet/current-balance", title: "Current Balance", section: "wallet", menu: `${W} › Current Balance`, layout: "dashboard", access: FINANCE, status: "captured", spec: "15-wallet.md", shots: ["15-"] },
  { id: "wallet-referrals", pattern: "/wallet/referrals", title: "Referrals", section: "wallet", menu: `${W} › Referrals`, layout: "dashboard", access: FINANCE, status: "captured", spec: "15-wallet.md", shots: ["15a-"] },
  { id: "wallet-transactions", pattern: "/wallet/transaction-history", title: "Transaction History", section: "wallet", menu: `${W} › Transaction History`, layout: "dashboard", access: FINANCE, status: "captured", spec: "15-wallet.md", shots: ["15b-"] },
  { id: "wallet-loyalty", pattern: "/wallet/loyalty-history", title: "Loyalty History", section: "wallet", menu: `${W} › Loyalty History`, layout: "dashboard", access: FINANCE, status: "captured", spec: "15-wallet.md", shots: ["15c-"] },
  { id: "wallet-purchases", pattern: "/wallet/my-purchases", title: "My Purchases", section: "wallet", menu: `${W} › My Purchases`, layout: "dashboard", access: FINANCE, status: "captured", spec: "15-wallet.md", shots: ["15d-", "15x-"] },
  { id: "wallet-purchases-category", pattern: "/wallet/my-purchases/:category", title: "My Purchases", section: "wallet", parent: "wallet-purchases", menu: `${W} › My Purchases › a category`, layout: "dashboard", access: FINANCE, status: "captured", spec: "15-wallet.md", shots: ["15d-"], note: ":category = newsletter | merchandise | courses | experiences | tips | content | messages | vip-offers | downloadables | livestreams | portfolio | tickets; unknown values redirect to /wallet/my-purchases." },
  { id: "wallet-refunds", pattern: "/wallet/refund-requests", title: "Refund Requests", section: "wallet", menu: `${W} › Refund Requests`, layout: "dashboard", access: FINANCE, status: "captured", spec: "15-wallet.md", shots: ["15e-"] },
  { id: "wallet-fulfillment", pattern: "/wallet/my-fulfillment-requests", title: "My Fulfillment Requests", section: "wallet", menu: `${W} › My Fulfillment Requests`, layout: "dashboard", access: CREATOR, status: "captured", spec: "15-wallet.md", shots: ["15f-"] },
  { id: "insights", pattern: "/insights", title: "Insights & Fans", section: "insights", menu: "Sidebar › Insights & Fans", layout: "dashboard", access: CREATOR, status: "captured", spec: "16-insights-fans.md", shots: ["16-", "16a-", "16b-", "16c-", "16d-", "16e-", "16f-", "16g-", "16h-", "16i-"], note: "Tabs stay on /insights; ?tab=engagement and ?tab=fan-relationship-management are supported. Inferred deep links: &sub=segmentation (Segmentation & Outreach) and &status=<Filter By Status option> (e.g. Subscribers, used by VIEW SUBSCRIBERS >)." },
];
