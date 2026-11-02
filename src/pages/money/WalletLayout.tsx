/** Wallet title + the 7 main tab pills (2 rows) with the Refund / Fulfillment count badges (15 Layout). */
import type { ReactNode } from "react";
import { useRouter } from "../../app/router";
import { pathFor } from "../../app/routeCatalog";
import { useData } from "../../store/store";
import { openFulfillments, pendingRefunds } from "../../store/slices/money";
import { CountBadge, TabPill } from "./ui";

const TABS = [
  { id: "wallet-balance", label: "Current Balance" },
  { id: "wallet-referrals", label: "Referrals" },
  { id: "wallet-transactions", label: "Transaction History" },
  { id: "wallet-loyalty", label: "Loyalty History" },
  { id: "wallet-purchases", label: "My Purchases" },
  { id: "wallet-refunds", label: "Refund Requests" },
  { id: "wallet-fulfillment", label: "My Fulfillment Requests" },
] as const;

export function WalletLayout({ routeId, active, children }: { routeId: string; active: (typeof TABS)[number]["id"]; children: ReactNode }) {
  const { navigate } = useRouter();
  const counts = useData((d) => ({ refunds: pendingRefunds(d).length, fulfillment: openFulfillments(d).length }));
  return (
    <div data-testid={`page-${routeId}`}>
      <h4 className="text-[24px] font-bold">Wallet</h4>
      <nav aria-label="Wallet" className="mt-[26px] flex flex-wrap gap-x-[8px] gap-y-[16px]">
        {TABS.map((t) => {
          const to = pathFor(t.id);
          return (
            <TabPill key={t.id} href={to} active={active === t.id} onClick={() => navigate(to)} testid={`wallet-tab-${t.id.replace("wallet-", "")}`}>
              {t.label}
              {t.id === "wallet-refunds" && <CountBadge n={counts.refunds} />}
              {t.id === "wallet-fulfillment" && <CountBadge n={counts.fulfillment} />}
            </TabPill>
          );
        })}
      </nav>
      <div className="mt-[29px]">{children}</div>
    </div>
  );
}
