/**
 * 15e Wallet › Refund Requests. Each pending request opens a details modal; Accept / Decline is a
 * Confirm-tier step (explicit confirm screen, need finance.write). Nothing is ever auto-approved.
 */
import { useMemo, useState } from "react";
import { FileClock } from "lucide-react";
import type { PageProps } from "../types";
import { act, useData } from "../../store/store";
import { approveRefund, declineRefund, refundStatusLabel, type RefundItem } from "../../store/slices/money";
import { Avatar, Modal } from "../../platform/ui/surfaces";
import { useToast } from "../../platform/ui/toast";
import { WalletLayout } from "./WalletLayout";
import { Btn, DatePill, EmptyState, fmtDate, InlineError, PillSelect, SearchPill, TableCard, Td, TextBtn, Th, usd } from "./ui";

const STATUSES = ["All Status", "Pending", "Declined", "Accepted", "Admin Declined", "Admin Accepted", "Escalated to Customer Support"];

export function WalletRefunds({ route }: PageProps) {
  const all = useData((d) => d.money.refundRequests);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All Status");
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = useMemo(
    () =>
      all.filter(
        (r) =>
          (!from || r.date >= from) &&
          (!to || r.date <= to) &&
          (!q.trim() || r.fan.toLowerCase().includes(q.trim().toLowerCase())) &&
          (status === "All Status" || refundStatusLabel(r) === status),
      ),
    [all, from, to, q, status],
  );
  const open = all.find((r) => r.id === openId) ?? null;

  return (
    <WalletLayout routeId={route.id} active="wallet-refunds">
      <div className="mt-[22px] flex items-center gap-[16px]">
        <span className="text-[14px]">FILTER BY:</span>
        <DatePill value={from} onChange={setFrom} placeholder="From Date" testid="wallet-refunds-from" />
        <DatePill value={to} onChange={setTo} placeholder="To Date" testid="wallet-refunds-to" />
        <div className="ml-auto">
          <SearchPill value={q} onChange={setQ} placeholder="Search by Requested From" testid="wallet-refunds-search" />
        </div>
      </div>
      <PillSelect value={status} options={STATUSES} onChange={setStatus} width={290} testid="wallet-refunds-status" className="mt-[26px]" />

      {rows.length === 0 ? (
        <EmptyState icon={FileClock} text="No Refund Requests Found" className="mt-[16px]" testid="wallet-refunds-empty" />
      ) : (
        <TableCard className="mt-[16px]" testid="wallet-refunds-table">
          <thead>
            <tr>
              <Th w="20%">Requested From</Th>
              <Th w="32%">Transaction Details</Th>
              <Th w="13%">Requested On</Th>
              <Th w="16%">Refund Amount</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="h-[81px]" data-testid={`wallet-refund-row-${r.id}`}>
                <Td>
                  <div className="flex items-center gap-[6px]">
                    <Avatar size={44} ring={2} />
                    <span className="text-[14px] font-bold text-accent">{r.fan}</span>
                  </div>
                </Td>
                <Td>
                  <button type="button" data-testid={`wallet-refund-open-${r.id}`} onClick={() => setOpenId(r.id)} className="text-left text-accent hover:underline">
                    {r.item} {r.type}
                  </button>
                </Td>
                <Td>{fmtDate(r.date)}</Td>
                <Td>{usd(r.amount)}</Td>
                <Td className="text-[16px] font-bold">
                  {r.status === "Pending" && !r.adminOutcome ? (
                    <button type="button" data-testid={`wallet-refund-review-${r.id}`} onClick={() => setOpenId(r.id)} className="hover:text-accent">
                      Pending
                    </button>
                  ) : (
                    refundStatusLabel(r)
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}
      {open && <RefundModal r={open} onClose={() => setOpenId(null)} />}
    </WalletLayout>
  );
}

/** inferred: the request detail / decision UI was not captured. */
function RefundModal({ r, onClose }: { r: RefundItem; onClose: () => void }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState<null | "accept" | "decline">(null);
  const [err, setErr] = useState<string | null>(null);
  const actionable = r.status === "Pending" && !r.adminOutcome;
  const run = () => {
    const res =
      confirm === "accept"
        ? act("money.approveRefund", (d) => approveRefund(d, r.id), { need: "finance.write" })
        : act("money.declineRefund", (d) => declineRefund(d, r.id), { need: "finance.write" });
    if (!res.ok) return setErr(res.reason);
    toast(confirm === "accept" ? `Refund of ${usd(r.amount)} accepted` : "Refund request declined");
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={confirm ? (confirm === "accept" ? "Accept Refund?" : "Decline Refund?") : "Refund Request"}
      footer={
        actionable ? (
          confirm ? (
            <>
              <TextBtn onClick={() => setConfirm(null)}>Back</TextBtn>
              <Btn data-testid={`wallet-refund-${confirm}-confirm`} onClick={run}>
                {confirm === "accept" ? "Yes, Accept Refund" : "Yes, Decline"}
              </Btn>
            </>
          ) : (
            <>
              <TextBtn data-testid="wallet-refund-decline" onClick={() => setConfirm("decline")}>
                Decline
              </TextBtn>
              <Btn data-testid="wallet-refund-accept" onClick={() => setConfirm("accept")}>
                Accept
              </Btn>
            </>
          )
        ) : undefined
      }
    >
      <div data-testid="modal-wallet-refund">
        {confirm ? (
          <p className="text-[16px] leading-[24px]">
            {confirm === "accept" ? (
              <>
                <b>{usd(r.amount)}</b> will be refunded to <b>{r.fan}</b> and deducted from your wallet balance. This can't be undone.
              </>
            ) : (
              <>
                Decline <b>{r.fan}</b>'s request for a <b>{usd(r.amount)}</b> refund? The fan can escalate to Customer Support.
              </>
            )}
          </p>
        ) : (
          <dl className="grid grid-cols-[160px_1fr] gap-y-[12px] text-[14px]">
            <dt className="text-muted">Requested From</dt>
            <dd className="text-accent">{r.fan}</dd>
            <dt className="text-muted">Transaction</dt>
            <dd>
              {r.item} {r.type}
            </dd>
            <dt className="text-muted">Requested On</dt>
            <dd>{fmtDate(r.date)}</dd>
            <dt className="text-muted">Refund Amount</dt>
            <dd className="font-bold">{usd(r.amount)}</dd>
            <dt className="text-muted">Reason</dt>
            <dd>{r.reason}</dd>
            <dt className="text-muted">Status</dt>
            <dd className="font-bold">{refundStatusLabel(r)}</dd>
          </dl>
        )}
        <InlineError testid="wallet-refund-error">{err}</InlineError>
      </div>
    </Modal>
  );
}
