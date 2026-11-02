/**
 * 15 Wallet › Current Balance: balance + WITHDRAW, BANK ACCOUNT (country + CONNECT PAYOUT ACCOUNT), SAVED CREDIT CARDS.
 * Withdraw / Connect payout / Add card / Delete card are Protected: confirm modal + typed confirmation, need finance.write.
 * No real bank or card data is ever collected (fake test values only).
 */
import { useState } from "react";
import { Minus, Plus, Trash2, Landmark } from "lucide-react";
import type { PageProps } from "../types";
import { act, getData, useData } from "../../store/store";
import {
  addCard,
  connectPayoutAccount,
  disconnectPayoutAccount,
  removeCard,
  withdraw,
  withdrawBlocker,
  type SavedCard,
} from "../../store/slices/money";
import { InfoIcon, Input } from "../../platform/ui/controls";
import { Modal, NoticeBox } from "../../platform/ui/surfaces";
import { useToast } from "../../platform/ui/toast";
import { WalletLayout } from "./WalletLayout";
import { Btn, InlineError, PillSelect, TextBtn, TypedConfirm, usd } from "./ui";

const COUNTRIES = ["United States", "Canada", "United Kingdom", "Australia", "Germany", "France", "Spain", "Japan", "New Zealand"];

export function WalletBalance({ route }: PageProps) {
  const balance = useData((d) => d.money.balance.available);
  const payout = useData((d) => d.money.payoutAccount);
  const country = useData((d) => d.money.payoutCountry);
  const cards = useData((d) => d.money.savedCards);
  const [countrySel, setCountrySel] = useState(country);
  const [modal, setModal] = useState<null | "need-payout" | "withdraw" | "connect" | "disconnect" | "add-card" | { del: SavedCard }>(null);

  return (
    <WalletLayout routeId={route.id} active="wallet-balance">
      <div className="flex flex-col gap-[20px]">
        {/* Balance */}
        <section className="flex h-[257px] flex-col items-center justify-center rounded-card bg-surface" data-testid="wallet-balance-card">
          <div className="flex items-center text-[18px]">
            Current Wallet Balance
            <InfoIcon text="Your available earnings after TopFan fees and refunds. Pending earnings are added once they clear." />
          </div>
          <div className="mt-[4px] text-[48px] font-bold leading-[60px]" data-testid="wallet-balance-amount">
            {usd(balance)}
          </div>
          <button
            type="button"
            data-testid="wallet-withdraw"
            onClick={() => setModal(payout.connected ? "withdraw" : "need-payout")}
            className="mt-[22px] inline-flex h-[56px] w-[300px] items-center justify-center gap-[12px] rounded-pill bg-accent text-[14px] font-black uppercase tracking-caps text-white hover:brightness-110"
          >
            <Minus size={14} strokeWidth={3} />
            Withdraw
          </button>
        </section>

        {/* Bank account */}
        <section className="rounded-card bg-surface px-[24px] pb-[24px] pt-[22px]" data-testid="wallet-bank-card">
          <h5 className="flex items-center text-[18px] font-bold uppercase">
            Bank Account
            <InfoIcon text="Where withdrawals are sent. TopFan pays out to one bank account at a time." />
          </h5>
          <p className="mb-[12px] mt-[22px] text-[16px]">Country</p>
          <div data-testid="wallet-country">
            <PillSelect size="lg" tone="bg" value={countrySel} options={COUNTRIES} onChange={setCountrySel} testid="wallet-country-select" />
          </div>
          {payout.connected ? (
            <>
              {/* inferred: connected state was not captured */}
              <div className="mt-[24px] flex items-center gap-[16px] rounded-inner bg-bg px-[20px] py-[16px]" data-testid="wallet-payout-connected">
                <Landmark size={22} className="text-accent" />
                <div className="flex-1">
                  <p className="text-[12px] text-muted">Payout Account</p>
                  <p className="text-[16px] font-bold">{payout.label}</p>
                </div>
                <TextBtn data-testid="wallet-payout-disconnect" onClick={() => setModal("disconnect")}>
                  Disconnect
                </TextBtn>
              </div>
            </>
          ) : (
            <Btn data-testid="wallet-connect-payout" className="mt-[24px] w-full" onClick={() => setModal("connect")}>
              Connect Payout Account
            </Btn>
          )}
        </section>

        {/* Saved cards */}
        <section className="rounded-card bg-surface px-[24px] pb-[24px] pt-[24px]" data-testid="wallet-cards-card">
          <div className="flex items-center justify-between">
            <h5 className="text-[18px] font-bold uppercase">Saved Credit Cards</h5>
            <Btn data-testid="wallet-add-card" icon={<Plus size={18} strokeWidth={3} />} onClick={() => setModal("add-card")}>
              Add Card
            </Btn>
          </div>
          <div className="mt-[20px] flex flex-col gap-[12px]">
            {cards.map((c) => (
              <div key={c.id} data-testid={`wallet-card-${c.id}`} className="flex h-[92px] items-center rounded-inner bg-bg px-[20px]">
                <span className="flex h-[60px] w-[60px] items-center justify-center rounded-tile bg-accent-tint-strong text-[17px] font-black italic text-accent">
                  {c.brand === "MASTERCARD" ? "MC" : c.brand}
                </span>
                <dl className="ml-[20px] grid flex-1 grid-cols-4">
                  {[
                    ["Card Number", `**** **** **** ${c.last4}`],
                    ["Name on Card", c.nameOnCard],
                    ["Zip Code", c.zip],
                    ["Expires On", c.expires],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[12px] text-muted">{k}</dt>
                      <dd className="mt-[4px] text-[16px] font-bold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <button
                  type="button"
                  aria-label="Delete card"
                  data-testid={`wallet-card-delete-${c.id}`}
                  onClick={() => setModal({ del: c })}
                  className="flex h-[40px] w-[40px] items-center justify-center rounded-popover bg-accent-tint-strong text-accent hover:brightness-125"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <NeedPayoutModal open={modal === "need-payout"} onClose={() => setModal(null)} onConnect={() => setModal("connect")} />
      {modal === "withdraw" && <WithdrawModal onClose={() => setModal(null)} />}
      {modal === "connect" && <ConnectPayoutModal country={countrySel} onClose={() => setModal(null)} />}
      {modal === "disconnect" && <DisconnectPayoutModal onClose={() => setModal(null)} />}
      {modal === "add-card" && <AddCardModal onClose={() => setModal(null)} />}
      {modal && typeof modal === "object" && <DeleteCardModal card={modal.del} onClose={() => setModal(null)} />}
    </WalletLayout>
  );
}

/* ---------------- modals (inferred: none of these were opened in the capture) ---------------- */

function NeedPayoutModal({ open, onClose, onConnect }: { open: boolean; onClose: () => void; onConnect: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connect a Payout Account"
      footer={
        <>
          <TextBtn onClick={onClose}>Cancel</TextBtn>
          <Btn data-testid="wallet-need-payout-connect" onClick={onConnect}>
            Connect Payout Account
          </Btn>
        </>
      }
    >
      <div data-testid="modal-wallet-need-payout" className="text-[16px] leading-[24px]">
        You need to connect a payout account before you can withdraw your balance.
      </div>
    </Modal>
  );
}

function WithdrawModal({ onClose }: { onClose: () => void }) {
  const available = useData((d) => d.money.balance.available);
  const label = useData((d) => d.money.payoutAccount.label);
  const toast = useToast();
  const [step, setStep] = useState<"amount" | "confirm">("amount");
  const [raw, setRaw] = useState("");
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const amount = Math.round(Number(raw) * 100) / 100;

  const next = () => {
    const why = withdrawBlocker(getData(), amount);
    if (why) return setErr(why);
    setErr(null);
    setStep("confirm");
  };
  const submit = () => {
    const res = act("money.withdraw", (d) => withdraw(d, amount), { need: "finance.write" });
    if (!res.ok) return setErr(res.reason);
    toast(`Withdrawal of ${usd(amount)} requested`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Withdraw"
      footer={
        <>
          <TextBtn onClick={step === "confirm" ? () => setStep("amount") : onClose}>{step === "confirm" ? "Back" : "Cancel"}</TextBtn>
          {step === "amount" ? (
            <Btn data-testid="wallet-withdraw-next" onClick={next}>
              Continue
            </Btn>
          ) : (
            <Btn data-testid="wallet-withdraw-confirm" disabled={typed.trim().toUpperCase() !== "WITHDRAW"} onClick={submit}>
              Confirm Withdrawal
            </Btn>
          )}
        </>
      }
    >
      <div data-testid="modal-wallet-withdraw">
        {step === "amount" ? (
          <>
            <p className="text-[14px] text-muted">Available: {usd(available)}</p>
            <label className="mb-[12px] mt-[20px] block text-[16px]" htmlFor="wallet-withdraw-amount">
              Amount (USD)
            </label>
            <Input className="!text-[14px]" id="wallet-withdraw-amount" data-testid="wallet-withdraw-amount" inputMode="decimal" placeholder="0.00" value={raw} onChange={(e) => setRaw(e.target.value.replace(/[^0-9.]/g, ""))} />
            <button type="button" data-testid="wallet-withdraw-all" className="mt-[12px] text-[14px] font-bold text-accent" onClick={() => setRaw(available.toFixed(2))}>
              Withdraw full balance
            </button>
          </>
        ) : (
          <>
            <p className="text-[16px] leading-[24px]">
              Withdraw <b>{usd(amount)}</b> to <b>{label}</b>? This can't be undone.
            </p>
            <TypedConfirm word="WITHDRAW" value={typed} onChange={setTyped} testid="wallet-withdraw-typed" />
          </>
        )}
        <InlineError testid="wallet-withdraw-error">{err}</InlineError>
      </div>
    </Modal>
  );
}

const DEMO_BANKS = [
  { id: "chk", label: "Demo Checking •••• 6789", routing: "•••••0110" },
  { id: "sav", label: "Demo Savings •••• 4321", routing: "•••••0110" },
];

function ConnectPayoutModal({ country, onClose }: { country: string; onClose: () => void }) {
  const holder = useData((d) => d.account.name);
  const toast = useToast();
  const [pick, setPick] = useState(DEMO_BANKS[0].id);
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const bank = DEMO_BANKS.find((b) => b.id === pick)!;
  const submit = () => {
    const res = act("money.connectPayout", (d) => connectPayoutAccount(d, bank.label, country), { need: "finance.write" });
    if (!res.ok) return setErr(res.reason);
    toast("Payout account connected");
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Connect Payout Account"
      footer={
        <>
          <TextBtn onClick={onClose}>Cancel</TextBtn>
          <Btn data-testid="wallet-connect-confirm" disabled={typed.trim().toUpperCase() !== "CONNECT"} onClick={submit}>
            Connect Payout Account
          </Btn>
        </>
      }
    >
      <div data-testid="modal-wallet-connect-payout">
        <NoticeBox>
          <b>Demo: no real bank connection.</b> Pick one of the fake test accounts below. No bank details are collected or sent anywhere.
        </NoticeBox>
        <dl className="mt-[20px] grid grid-cols-2 gap-[16px] text-[14px]">
          <div>
            <dt className="text-muted">Country</dt>
            <dd className="mt-[4px] font-bold">{country}</dd>
          </div>
          <div>
            <dt className="text-muted">Account Holder</dt>
            <dd className="mt-[4px] font-bold">{holder}</dd>
          </div>
        </dl>
        <p className="mb-[12px] mt-[20px] text-[16px]">Test account</p>
        <div className="flex flex-col gap-[10px]" role="radiogroup" aria-label="Test account">
          {DEMO_BANKS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={pick === b.id}
              data-testid={`wallet-demo-bank-${b.id}`}
              onClick={() => setPick(b.id)}
              className={`flex items-center justify-between rounded-inner bg-bg px-[20px] py-[14px] text-left text-[14px] ${pick === b.id ? "ring-1 ring-accent" : ""}`}
            >
              <span className="font-bold">{b.label}</span>
              <span className="text-muted">Routing {b.routing}</span>
            </button>
          ))}
        </div>
        <TypedConfirm word="CONNECT" value={typed} onChange={setTyped} testid="wallet-connect-typed" />
        <InlineError testid="wallet-connect-error">{err}</InlineError>
      </div>
    </Modal>
  );
}

function DisconnectPayoutModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    const res = act("money.disconnectPayout", (d) => disconnectPayoutAccount(d), { need: "finance.write" });
    if (!res.ok) return setErr(res.reason);
    toast("Payout account disconnected");
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Disconnect Payout Account"
      footer={
        <>
          <TextBtn onClick={onClose}>Cancel</TextBtn>
          <Btn data-testid="wallet-disconnect-confirm" disabled={typed.trim().toUpperCase() !== "DISCONNECT"} onClick={submit}>
            Disconnect
          </Btn>
        </>
      }
    >
      <div data-testid="modal-wallet-disconnect-payout">
        <p className="text-[16px] leading-[24px]">You won't be able to withdraw until you connect a payout account again.</p>
        <TypedConfirm word="DISCONNECT" value={typed} onChange={setTyped} testid="wallet-disconnect-typed" />
        <InlineError>{err}</InlineError>
      </div>
    </Modal>
  );
}

const TEST_CARDS: Omit<SavedCard, "id" | "nameOnCard" | "zip">[] = [
  { brand: "VISA", last4: "4242", expires: "12/2030" },
  { brand: "MASTERCARD", last4: "4444", expires: "09/2029" },
  { brand: "AMEX", last4: "0005", expires: "03/2031" },
];

function AddCardModal({ onClose }: { onClose: () => void }) {
  const name = useData((d) => d.account.name);
  const toast = useToast();
  const [pick, setPick] = useState(0);
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    const c = TEST_CARDS[pick];
    const res = act("money.addCard", (d) => addCard(d, { ...c, nameOnCard: name, zip: "00000" }), { need: "finance.write" });
    if (!res.ok) return setErr(res.reason);
    toast("Card added");
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Add Card"
      footer={
        <>
          <TextBtn onClick={onClose}>Cancel</TextBtn>
          <Btn data-testid="wallet-add-card-confirm" disabled={typed.trim().toUpperCase() !== "ADD CARD"} onClick={submit}>
            Add Card
          </Btn>
        </>
      }
    >
      <div data-testid="modal-wallet-add-card">
        <NoticeBox>
          <b>Demo: test cards only.</b> No real card number, CVC or billing details are collected. Pick a fake test card.
        </NoticeBox>
        <div className="mt-[20px] flex flex-col gap-[10px]" role="radiogroup" aria-label="Test card">
          {TEST_CARDS.map((c, i) => (
            <button
              key={c.last4}
              type="button"
              role="radio"
              aria-checked={pick === i}
              data-testid={`wallet-test-card-${c.last4}`}
              onClick={() => setPick(i)}
              className={`flex items-center gap-[16px] rounded-inner bg-bg px-[20px] py-[14px] text-left text-[14px] ${pick === i ? "ring-1 ring-accent" : ""}`}
            >
              <span className="w-[48px] font-black italic text-accent">{c.brand === "MASTERCARD" ? "MC" : c.brand}</span>
              <span className="flex-1 font-bold">Test card **** {c.last4}</span>
              <span className="text-muted">Exp {c.expires}</span>
            </button>
          ))}
        </div>
        <p className="mt-[16px] text-[14px] text-muted">Name on card: {name} · Zip code: 00000 (demo)</p>
        <TypedConfirm word="ADD CARD" value={typed} onChange={setTyped} testid="wallet-add-card-typed" />
        <InlineError testid="wallet-add-card-error">{err}</InlineError>
      </div>
    </Modal>
  );
}

function DeleteCardModal({ card, onClose }: { card: SavedCard; onClose: () => void }) {
  const toast = useToast();
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    const res = act("money.removeCard", (d) => removeCard(d, card.id), { need: "finance.write" });
    if (!res.ok) return setErr(res.reason);
    toast("Card removed");
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Delete Card"
      footer={
        <>
          <TextBtn onClick={onClose}>Cancel</TextBtn>
          <Btn data-testid="wallet-card-delete-confirm" disabled={typed.trim().toUpperCase() !== "DELETE"} onClick={submit}>
            Delete
          </Btn>
        </>
      }
    >
      <div data-testid="modal-wallet-delete-card">
        <p className="text-[16px] leading-[24px]">
          Remove the card ending in <b>{card.last4}</b>?
        </p>
        <TypedConfirm word="DELETE" value={typed} onChange={setTyped} testid="wallet-card-delete-typed" />
        <InlineError>{err}</InlineError>
      </div>
    </Modal>
  );
}
