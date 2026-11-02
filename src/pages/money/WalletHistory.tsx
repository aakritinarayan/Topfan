/** 15a Referrals, 15b Transaction History, 15c Loyalty History. */
import { useMemo, useState } from "react";
import { FileClock } from "lucide-react";
import type { PageProps } from "../types";
import { useData } from "../../store/store";
import { MONEY_TODAY, type MoneyTransaction } from "../../store/slices/money";
import { Modal } from "../../platform/ui/surfaces";
import { useToast } from "../../platform/ui/toast";
import { WalletLayout } from "./WalletLayout";
import { Btn, DatePill, downloadCsv, EmptyState, fmtDate, PillSelect, signedUsd, SortHead, TableCard, Td, Th } from "./ui";

/* ---------------- 15a Referrals ---------------- */

export function WalletReferrals({ route }: PageProps) {
  const link = useData((d) => d.money.referralLink);
  const referrals = useData((d) => d.money.referrals);
  const toast = useToast();
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const rows = useMemo(() => [...referrals].sort((a, b) => (dir === "asc" ? 1 : -1) * a.referredAt.localeCompare(b.referredAt)), [referrals, dir]);

  return (
    <WalletLayout routeId={route.id} active="wallet-referrals">
      <section className="rounded-card bg-surface px-[30px] pb-[40px] pt-[30px]">
        <h4 className="text-[24px] font-bold">Refer New Creators &amp; Earn Commissions (Network Referrer)</h4>
        <p className="mt-[24px] text-[14px] leading-[28px]">
          TopFan will pay you a 5% commission on gross revenues from subscriptions, individual digital content and course revenue sold by the creator you refer for 12
          full months, 1 month after they create their TopFan account. Revenue from personal experiences, tips, direct messages, and physical merchandise is excluded
          from the referral program. Your 5% commission comes solely from TopFan's share, so your referred creator still receives their full amount of revenue when you
          refer them.
        </p>
        <p className="mt-[30px] text-[16px]">Share your Invite</p>
        <div className="mt-[14px] flex items-center gap-[20px]">
          <div data-testid="wallet-referral-link" className="flex h-[56px] w-[500px] max-w-full items-center truncate rounded-pill bg-bg px-[24px] text-[14px] font-bold">
            {link}
          </div>
          <Btn
            data-testid="wallet-referral-copy"
            className="w-[120px]"
            onClick={() => {
              navigator.clipboard?.writeText(link).catch(() => {});
              toast("Copied to clipboard");
            }}
          >
            Copy
          </Btn>
          <Btn
            data-testid="wallet-referral-share"
            className="w-[120px]"
            onClick={() => {
              // inferred: no real share sheet in the demo; copy + toast instead.
              navigator.clipboard?.writeText(link).catch(() => {});
              toast("Invite link ready to share (copied)");
            }}
          >
            Share
          </Btn>
        </div>
      </section>

      <h4 className="mb-[34px] mt-[42px] text-[24px] font-bold">Your Referrals:</h4>
      <TableCard testid="wallet-referrals-table">
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>
              <SortHead label="Referred Date" dir={dir} onClick={() => setDir(dir === "asc" ? "desc" : "asc")} testid="wallet-referrals-sort-date" />
            </Th>
            <Th>Commission Start Date</Th>
            <Th>Commission End Date</Th>
            <Th>Total Commission Earned</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-testid={`wallet-referral-row-${r.id}`} className="h-[65px]">
              <Td className="text-accent">{r.name}</Td>
              <Td>{fmtDate(r.referredAt)}</Td>
              <Td>{fmtDate(r.commissionStart)}</Td>
              <Td>{fmtDate(r.commissionEnd)}</Td>
              <Td>{signedUsd(r.earned).replace("+", "")}</Td>
            </tr>
          ))}
        </tbody>
      </TableCard>
    </WalletLayout>
  );
}

/* ---------------- shared filter row ---------------- */

export const TRANSACTION_TYPES = [
  "All Transactions",
  ...["Post Unlock", "Experience", "Merchandise", "Course", "Downloadable", "VIP Offer", "Subscription", "Post Tip", "Welcome Message Tip", "Livestream Tip", "Chatroom Tip", "Dm Tip", "Dm Sale"].flatMap((k) => [`${k} Purchase`, `${k} Earning`]),
  "SMS Purchase",
  "Email Marketing",
  "Fan Refund Issued",
  "Refund Received",
  "Delegate Refund",
  "Delegate Refund Issued",
  "Manual Wallet Credit",
  "Manual Wallet Deduction",
  "Referral Commission",
  "Delegate Earning",
  "Deposit",
  "Withdrawal",
  "Newsletter Earning",
  "Newsletter Purchase",
  "Livestream Earning",
  "Livestream Purchase",
  "Fundraiser Purchase",
  "Fundraiser Earning",
  "Advertisement Earning",
  "Portfolio Purchase",
  // inferred: the captured list was truncated after "Portfolio Purchase".
  "Portfolio Earning",
  "Event Ticket Purchase",
  "Event Ticket Earning",
  "Individual Content Earning",
];

/** Default window in the capture: the last 7 days (Oct 26 → Nov 2, 2026). */
const DEFAULT_FROM = "2026-10-26";

function useHistoryFilters() {
  const [from, setFrom] = useState<string | null>(DEFAULT_FROM);
  const [to, setTo] = useState<string | null>(MONEY_TODAY);
  const [type, setType] = useState("All Transactions");
  return { from, setFrom, to, setTo, type, setType };
}

function FilterRow({ f, onCsv, prefix }: { f: ReturnType<typeof useHistoryFilters>; onCsv: () => void; prefix: string }) {
  return (
    <div className="mt-[22px] flex flex-wrap items-center gap-[12px]">
      <span className="text-[14px]">FILTER BY:</span>
      <DatePill value={f.from} onChange={f.setFrom} placeholder="From Date" testid={`${prefix}-from`} />
      <DatePill value={f.to} onChange={f.setTo} placeholder="To Date" testid={`${prefix}-to`} />
      <PillSelect value={f.type} options={TRANSACTION_TYPES} onChange={f.setType} width={267} testid={`${prefix}-type`} />
      <Btn data-testid={`${prefix}-csv`} onClick={onCsv} className="-ml-[4px]">
        Download CSV
      </Btn>
    </div>
  );
}

const inRange = (date: string, from: string | null, to: string | null) => (!from || date >= from) && (!to || date <= to);

/* ---------------- 15b Transaction History ---------------- */

export function WalletTransactions({ route }: PageProps) {
  const all = useData((d) => d.money.transactions);
  const f = useHistoryFilters();
  const [view, setView] = useState<MoneyTransaction | null>(null);
  const rows = useMemo(
    () => all.filter((t) => inRange(t.date, f.from, f.to) && (f.type === "All Transactions" || t.type === f.type)).sort((a, b) => b.date.localeCompare(a.date)),
    [all, f.from, f.to, f.type],
  );
  return (
    <WalletLayout routeId={route.id} active="wallet-transactions">
      <FilterRow
        f={f}
        prefix="wallet-transactions"
        onCsv={() => downloadCsv("transaction-history.csv", [["Date", "Type", "Details", "Transaction Amount"], ...rows.map((t) => [fmtDate(t.date), t.type, t.description, signedUsd(t.amount)])])}
      />
      {rows.length === 0 ? (
        <EmptyState icon={FileClock} text="No Transactions Found" className="mt-[40px]" testid="wallet-transactions-empty" />
      ) : (
        <TableCard className="mt-[37px]" testid="wallet-transactions-table">
          <thead>
            <tr>
              <Th w="25.5%">Date</Th>
              <Th w="41%">Type</Th>
              <Th w="15.5%">Details</Th>
              <Th>Transaction Amount</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="h-[65px]" data-testid={`wallet-transaction-row-${t.id}`}>
                <Td>{fmtDate(t.date)}</Td>
                <Td>{t.type}</Td>
                <Td>
                  <button type="button" data-testid={`wallet-transaction-view-${t.id}`} onClick={() => setView(t)} className="text-accent hover:underline">
                    View
                  </button>
                </Td>
                <Td>{signedUsd(t.amount)}</Td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}
      <Modal open={!!view} onClose={() => setView(null)} title="Transaction Details">
        {view && (
          <dl data-testid="modal-wallet-transaction" className="grid grid-cols-[160px_1fr] gap-y-[12px] text-[14px]">
            <dt className="text-muted">Date</dt>
            <dd>{fmtDate(view.date)}</dd>
            <dt className="text-muted">Type</dt>
            <dd>{view.type}</dd>
            <dt className="text-muted">Details</dt>
            <dd>{view.description}</dd>
            {view.fan && (
              <>
                <dt className="text-muted">Fan</dt>
                <dd className="text-accent">{view.fan}</dd>
              </>
            )}
            {view.gross != null && (
              <>
                <dt className="text-muted">Gross Amount</dt>
                <dd>{signedUsd(view.gross).replace("+", "")}</dd>
              </>
            )}
            <dt className="text-muted">Transaction Amount</dt>
            <dd className="font-bold">{signedUsd(view.amount)}</dd>
            <dt className="text-muted">Status</dt>
            <dd>{view.status}</dd>
          </dl>
        )}
      </Modal>
    </WalletLayout>
  );
}

/* ---------------- 15c Loyalty History ---------------- */

export function WalletLoyalty({ route }: PageProps) {
  const all = useData((d) => d.money.loyaltyHistory);
  const f = useHistoryFilters();
  const rows = all.filter((r) => inRange(r.date, f.from, f.to));
  return (
    <WalletLayout routeId={route.id} active="wallet-loyalty">
      <FilterRow f={f} prefix="wallet-loyalty" onCsv={() => downloadCsv("loyalty-history.csv", [["Date", "Description", "Points"], ...rows.map((r) => [fmtDate(r.date), r.description, r.points])])} />
      {rows.length === 0 ? (
        <EmptyState icon={FileClock} text="No Loyalty History Found" className="mt-[40px] h-[372px] !rounded-[20px] !py-0" testid="wallet-loyalty-empty" />
      ) : (
        <TableCard className="mt-[37px]">
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Description</Th>
              <Th>Points</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="h-[65px]">
                <Td>{fmtDate(r.date)}</Td>
                <Td>{r.description}</Td>
                <Td>{r.points}</Td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </WalletLayout>
  );
}
