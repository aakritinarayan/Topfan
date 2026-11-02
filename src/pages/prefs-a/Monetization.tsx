/**
 * Preferences › Monetization (/edit-preference/monetization) — spec 37, shots 37-*, 37a, 37b.
 * Toggles save on change (no page save button in the source). Changing the DM price is Confirm tier.
 */
import { useEffect, useState } from "react";
import { CircleDollarSign, Coins, Pencil } from "lucide-react";
import type { PageProps } from "../types";
import { PreferencesPage } from "../../platform/PreferencesPage";
import { Button, TextButton } from "../../platform/ui/controls";
import { Modal } from "../../platform/ui/surfaces";
import { useData } from "../../store/store";
import { DM_PRICE_MIN, DM_PRICE_PRESETS, setDmPrice, setMonetizationFlag } from "../../store/slices/prefsA";
import { InfoPop, PrefCard, PrefRow, TToggle, useRun } from "./ui";

const money = (n: number) => `$${n.toFixed(2)}`;

export function Monetization({ route }: PageProps) {
  const m = useData((d) => d.prefsA.monetization);
  const run = useRun();
  const [priceOpen, setPriceOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const flip = (key: "subscriberOnlyChat" | "subscriberOnlyComments" | "tipsEnabled" | "dmPriceEnabled" | "guaranteedReply") =>
    run(
      "prefs.setMonetizationFlag",
      (d) => setMonetizationFlag(d, key, !m[key]),
      key === "subscriberOnlyChat" || key === "subscriberOnlyComments" ? "content.write" : "finance.write",
    );

  return (
    <PreferencesPage>
      <div data-testid={`page-${route.id}`}>
        <PrefCard title="Monetization" testid="pref-monetization-card">
          <PrefRow
            label="Only Allow Subscribers to Participate in my Chat Room"
            right={<TToggle on={m.subscriberOnlyChat} onChange={() => flip("subscriberOnlyChat")} label="Subscribers-only chat room" testid="pref-monetization-subscriber-chat" />}
          />
          <PrefRow
            label="Only Allow Subscribers to Comment on my Posts"
            right={<TToggle on={m.subscriberOnlyComments} onChange={() => flip("subscriberOnlyComments")} label="Subscribers-only comments" testid="pref-monetization-subscriber-comments" />}
          />
          <PrefRow
            label="Accept Tips on Feed and Chatroom Posts"
            right={<TToggle on={m.tipsEnabled} onChange={() => flip("tipsEnabled")} label="Accept tips" testid="pref-monetization-tips" />}
          />
          <PrefRow
            label="Price to Send You an Individual Direct Message"
            right={
              <>
                <span className="text-sm">Individual Price:</span>
                <span className="ml-2 text-sm" data-testid="pref-monetization-dm-price">
                  {money(m.dmPrice)}
                </span>
                <button
                  type="button"
                  aria-label="Edit direct message price"
                  data-testid="pref-monetization-dm-price-edit"
                  onClick={() => setPriceOpen(true)}
                  className="ml-2 text-white hover:text-accent"
                >
                  <Pencil size={16} fill="currentColor" />
                </button>
                <span className="ml-[25px]">
                  <TToggle on={m.dmPriceEnabled} onChange={() => flip("dmPriceEnabled")} label="Charge for direct messages" testid="pref-monetization-dm-toggle" />
                </span>
              </>
            }
          />
          <PrefRow
            label={'Offer "Guaranteed Reply" on Direct Messages'}
            info={<InfoPop testid="pref-monetization-guaranteed-info" onOpen={() => setInfoOpen(true)}>{null}</InfoPop>}
            right={<TToggle on={m.guaranteedReply} onChange={() => flip("guaranteedReply")} label="Guaranteed reply" testid="pref-monetization-guaranteed" />}
          />
        </PrefCard>

        <GuaranteedReplyModal open={infoOpen} onClose={() => setInfoOpen(false)} />
        <PriceModal open={priceOpen} onClose={() => setPriceOpen(false)} current={m.dmPrice} />
      </div>
    </PreferencesPage>
  );
}

function GuaranteedReplyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--backdrop)] px-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Guaranteed Reply"
        data-testid="modal-pref-guaranteed-reply"
        className="mt-[238px] w-[620px] max-w-full rounded-card bg-surface p-[30px] text-center"
      >
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(76,197,45,.15)] text-[#4cc52d]">
          <CircleDollarSign size={30} />
        </span>
        <h3 className="mt-5 text-2xl font-semibold">Guaranteed Reply</h3>
        <p className="mx-auto mt-3 max-w-[540px] text-[14.4px] leading-[25px]">
          If a user sends you a tip with the required tip amount for a Guaranteed Reply, you must reply before money will be available in your wallet.
        </p>
        <Button autoFocus className="mt-5 w-[200px]" data-testid="pref-guaranteed-reply-okay" onClick={onClose}>
          Okay
        </Button>
      </div>
    </div>
  );
}

function PriceModal({ open, onClose, current }: { open: boolean; onClose: () => void; current: number }) {
  const run = useRun();
  const [preset, setPreset] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (open) {
      setPreset(DM_PRICE_PRESETS.includes(current) ? current : null);
      setCustom(DM_PRICE_PRESETS.includes(current) ? "" : String(current));
      setConfirming(false);
    }
  }, [open, current]);

  const customNum = custom.trim() ? Number(custom) : NaN;
  const value = custom.trim() ? customNum : preset;
  const invalid = custom.trim() !== "" && (!Number.isFinite(customNum) || customNum < DM_PRICE_MIN);
  const canUpdate = value != null && !invalid && Number.isFinite(value) && value !== current;

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={450}
      title="Edit Price Per Individual Direct Message"
      footer={
        confirming ? (
          <>
            <TextButton data-testid="pref-dm-price-back" onClick={() => setConfirming(false)}>
              Back
            </TextButton>
            <Button
              className="w-[120px]"
              data-testid="pref-dm-price-confirm"
              onClick={() => {
                if (run("prefs.setDmPrice", (d) => setDmPrice(d, value as number), "finance.write", "Direct message price updated")) onClose();
              }}
            >
              Confirm
            </Button>
          </>
        ) : (
          <>
            <TextButton data-testid="pref-dm-price-cancel" onClick={onClose}>
              Cancel
            </TextButton>
            <Button className="w-[120px]" data-testid="pref-dm-price-update" disabled={!canUpdate} onClick={() => setConfirming(true)}>
              Update
            </Button>
          </>
        )
      }
    >
      <div data-testid="modal-pref-dm-price">
        {confirming ? (
          // inferred: Confirm-tier step (changing a price needs an explicit confirmation)
          <p className="text-sm leading-[22px]" data-testid="pref-dm-price-confirm-text">
            Change the price to send you an individual direct message from <b>{money(current)}</b> to <b>{money(value as number)}</b>?
          </p>
        ) : (
          <>
            <p className="mb-4 text-base">Amount</p>
            <div role="radiogroup" aria-label="Amount" className="flex flex-wrap gap-2.5">
              {DM_PRICE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={preset === p && !custom}
                  data-testid={`pref-dm-price-preset-${p}`}
                  onClick={() => (setPreset(p), setCustom(""))}
                  className={`h-14 w-[66px] rounded-pill bg-bg text-sm font-black ${preset === p && !custom ? "ring-1 ring-accent" : ""}`}
                >
                  ${p}
                </button>
              ))}
            </div>
            <label htmlFor="dm-custom" className="mb-4 mt-6 block text-base">
              Custom Amount
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className={`relative h-[52px] w-[220px] rounded-pill bg-bg ${invalid ? "ring-1 ring-danger" : ""}`}>
                <span className="absolute left-[22px] top-1/2 -translate-y-1/2 text-sm font-black">$</span>
                <input
                  id="dm-custom"
                  inputMode="decimal"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="CUSTOM AMOUNT"
                  data-testid="pref-dm-price-custom"
                  className="h-full w-full rounded-pill bg-transparent pl-[30px] pr-12 text-sm font-black text-white outline-none placeholder:font-medium placeholder:text-white/80"
                />
                <span className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-accent">
                  <Coins size={16} />
                </span>
              </div>
              <span className="rounded-[6px] bg-accent-tint-strong px-2.5 py-4 text-[13px] font-bold leading-none text-accent">Minimum Amount: {money(DM_PRICE_MIN)}</span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
