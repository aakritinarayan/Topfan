/**
 * 15f Wallet › My Fulfillment Requests: "95 ITEMS" list with status filter.
 * MARK EXPERIENCE AS FULFILLED (experiences only; need content.write) → "Awaiting Fan Confirmation".
 * CANCEL & REFUND (Confirm tier; need finance.write).
 */
import { useMemo, useState } from "react";
import type { PageProps } from "../types";
import { act, useData } from "../../store/store";
import { cancelAndRefundFulfillment, fulfillmentStatusLabel, markExperienceFulfilled, type FulfillmentItem } from "../../store/slices/money";
import { InfoIcon } from "../../platform/ui/controls";
import { ImageSlot, Modal } from "../../platform/ui/surfaces";
import { useToast } from "../../platform/ui/toast";
import { WalletLayout } from "./WalletLayout";
import { Btn, fmtDateTime, InlineError, PillSelect, TextBtn, usd } from "./ui";

const FILTERS = ["All", "Open", "Payment Released", "Canceled", "Awaiting Fan Confirmation", "Disputed"];
const PAGE = 20;

export function WalletFulfillment({ route }: PageProps) {
  const all = useData((d) => d.money.fulfillmentRequests);
  const [filter, setFilter] = useState("All");
  const [limit, setLimit] = useState(PAGE);
  const [confirm, setConfirm] = useState<null | { kind: "fulfill" | "refund"; item: FulfillmentItem }>(null);
  const rows = useMemo(
    () => all.filter((f) => filter === "All" || fulfillmentStatusLabel(f) === filter).sort((a, b) => b.orderedAt.localeCompare(a.orderedAt)),
    [all, filter],
  );

  return (
    <WalletLayout routeId={route.id} active="wallet-fulfillment">
      <section className="-mt-[2px] rounded-card bg-surface px-[30px] pb-[24px] pt-[24px]" data-testid="wallet-fulfillment-list">
        <div className="flex items-center justify-between border-b border-surface-2 pb-[24px]">
          <h5 className="text-[18px] font-bold uppercase" data-testid="wallet-fulfillment-count">
            {rows.length} Items
          </h5>
          <PillSelect
            value={filter}
            options={FILTERS}
            onChange={(v) => {
              setFilter(v);
              setLimit(PAGE);
            }}
            width={236}
            tone="bg"
            testid="wallet-fulfillment-status"
            panelWidth={260}
          />
        </div>
        {rows.slice(0, limit).map((f) => (
          <FulfillmentRow key={f.id} f={f} onAction={(kind) => setConfirm({ kind, item: f })} />
        ))}
        {rows.length === 0 && <p className="py-[40px] text-center text-soft/80">No Fulfillment Requests Found</p>}
        {rows.length > limit && (
          // inferred: the live page loads more on scroll; a button keeps the demo light.
          <div className="flex justify-center pt-[24px]">
            <TextBtn data-testid="wallet-fulfillment-more" onClick={() => setLimit((l) => l + PAGE)}>
              Load More
            </TextBtn>
          </div>
        )}
      </section>
      {confirm && <ConfirmModal kind={confirm.kind} item={confirm.item} onClose={() => setConfirm(null)} />}
    </WalletLayout>
  );
}

function FulfillmentRow({ f, onAction }: { f: FulfillmentItem; onAction: (k: "fulfill" | "refund") => void }) {
  const open = f.status === "Pending";
  const exp = f.itemType === "EXPERIENCE";
  return (
    <article data-testid={`wallet-fulfillment-row-${f.id}`} className="flex gap-[35px] border-b border-surface-2 py-[30px] last:border-b-0">
      <ImageSlot
        src={f.image}
        kind={exp ? "image" : "product"}
        label={f.item}
        rounded="rounded-tile"
        className={`w-[130px] shrink-0 ${exp ? "h-[130px]" : "h-[175px] !bg-[#efefef] !text-black/25"}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between">
          <h3 className="text-[18px] font-bold">{f.item}</h3>
          <div className="flex items-center gap-[12px] text-[16px]">
            Status:
            <span className="inline-flex h-[30px] items-center rounded-[14px] bg-accent px-[14px] text-[16px] font-medium">{fulfillmentStatusLabel(f)}</span>
          </div>
        </div>
        <dl className="mt-[10px] space-y-[16px] text-[14px]">
          <div className="flex items-center gap-[6px]">
            <dt>Item Type:</dt>
            <dd className="font-bold">{f.itemType}</dd>
            {!exp && <InfoIcon text="Merchandise orders are shipped and tracked through your connected Shopify store." />}
          </div>
          <div className="flex items-center gap-[6px]">
            <dt>Item Price:</dt>
            <dd className="text-[20px] font-bold">{usd(f.price)}</dd>
          </div>
          <div className="flex items-center gap-[6px]">
            <dt>Order Date:</dt>
            <dd className="font-bold">{fmtDateTime(f.orderedAt)}</dd>
          </div>
          <div className="flex items-center gap-[6px]">
            <dt>Customer:</dt>
            <dd className="text-accent">{f.fan}</dd>
          </div>
        </dl>
        {open && (
          <div className="mt-[16px] flex items-center gap-[20px]">
            <button type="button" data-testid={`wallet-fulfillment-refund-${f.id}`} onClick={() => onAction("refund")} className="text-[14px] font-black uppercase tracking-caps hover:text-accent">
              Cancel &amp; Refund
            </button>
            {exp && (
              <Btn data-testid={`wallet-fulfillment-fulfill-${f.id}`} className="w-[270px]" onClick={() => onAction("fulfill")}>
                Mark Experience as Fulfilled
              </Btn>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/** inferred: the confirm dialogs were not captured. */
function ConfirmModal({ kind, item, onClose }: { kind: "fulfill" | "refund"; item: FulfillmentItem; onClose: () => void }) {
  const toast = useToast();
  const [err, setErr] = useState<string | null>(null);
  const run = () => {
    const res =
      kind === "fulfill"
        ? act("money.markExperienceFulfilled", (d) => markExperienceFulfilled(d, item.id), { need: "content.write" })
        : act("money.cancelAndRefund", (d) => cancelAndRefundFulfillment(d, item.id), { need: "finance.write" });
    if (!res.ok) return setErr(res.reason);
    toast(kind === "fulfill" ? "Marked as fulfilled. Waiting for the fan to confirm." : `Order canceled and ${usd(item.price)} refunded`);
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={kind === "fulfill" ? "Mark Experience as Fulfilled" : "Cancel & Refund"}
      footer={
        <>
          <TextBtn onClick={onClose}>Cancel</TextBtn>
          <Btn data-testid={`wallet-fulfillment-${kind}-confirm`} onClick={run}>
            {kind === "fulfill" ? "Mark as Fulfilled" : "Cancel & Refund"}
          </Btn>
        </>
      }
    >
      <div data-testid={`modal-wallet-fulfillment-${kind}`} className="text-[16px] leading-[24px]">
        {kind === "fulfill" ? (
          <>
            Confirm you delivered <b>{item.item}</b> to <b>{item.fan}</b>. The fan will be asked to confirm before the payment is released.
          </>
        ) : (
          <>
            Cancel <b>{item.item}</b> for <b>{item.fan}</b> and refund <b>{usd(item.price)}</b> from your wallet balance? This can't be undone.
          </>
        )}
        <InlineError testid="wallet-fulfillment-error">{err}</InlineError>
      </div>
    </Modal>
  );
}
