/**
 * Messages modals: New Message (13d), Create New Direct Message List (13c, step 2 inferred), and the composer's
 * paid media / store item / coupon pickers (inferred: not captured).
 */
import { useMemo, useState } from "react";
import { Check, Users } from "lucide-react";
import { useData } from "../../../store/store";
import { RECIPIENT_SEGMENTS, type ChatBody } from "../../../store/slices/comms";
import { Avatar } from "../../../platform/ui/surfaces";
import { Button, FieldError, InfoIcon, Input, Label, TextButton } from "../../../platform/ui/controls";
import { CommsModal, SCROLL, SearchPill, money } from "../ui";
import { StoreItemCard } from "./Chat";

/* ------------------------------------------------------------------ New Message (13d) */

export function NewMessageModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (fanId: string) => void }) {
  const fans = useData((d) => d.comms.fans);
  const [q, setQ] = useState("");
  const shown = [...fans].sort((a, b) => a.name.localeCompare(b.name)).filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <CommsModal open={open} onClose={onClose} title="New Message" testid="modal-new-message" bodyClass="pl-[30px] pr-[33px] pb-[24px] pt-[20px]">
      <SearchPill value={q} onChange={setQ} testid="messages-new-search" bg="bg-bg" />
      <p className="mb-[22px] mt-[22px] text-[16px] font-bold">Select a Recipient</p>
      <ul className={`${SCROLL} max-h-[430px] overflow-y-auto pr-[4px]`}>
        {shown.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              data-testid={`messages-new-recipient-${f.id}`}
              onClick={() => onPick(f.id)}
              className="flex h-[64px] w-full items-center gap-[12px] rounded-lg px-[12px] text-left text-[14px] hover:bg-accent-tint"
            >
              <Avatar src={f.avatar} size={40} ring={0} />
              {f.name}
            </button>
          </li>
        ))}
        {shown.length === 0 && <li className="py-[24px] text-center text-[14px] text-muted">No fans found.</li>}
      </ul>
    </CommsModal>
  );
}

/* ------------------------------------------------------------------ Create New Direct Message List (13c) */

function RadioDot({ on }: { on: boolean }) {
  return (
    <span className={`flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full ${on ? "bg-accent" : "border border-accent"}`}>
      {on && <Check size={14} strokeWidth={3} />}
    </span>
  );
}

export function CreateListModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, fanIds: string[], segments: string[]) => boolean;
}) {
  const fans = useData((d) => d.comms.fans);
  const [step, setStep] = useState<1 | 2>(1);
  const [q, setQ] = useState("");
  const [segs, setSegs] = useState<string[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const reset = () => {
    setStep(1);
    setQ("");
    setSegs([]);
    setIds([]);
    setName("");
    setErr("");
  };
  const close = () => {
    reset();
    onClose();
  };
  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const ql = q.toLowerCase();
  const segShown = RECIPIENT_SEGMENTS.filter((s) => s.toLowerCase().includes(ql));
  const fanShown = useMemo(() => [...fans].sort((a, b) => a.name.localeCompare(b.name)).filter((f) => f.name.toLowerCase().includes(ql)), [fans, ql]);
  const count = segs.length + ids.length;

  return (
    <CommsModal
      open={open}
      onClose={close}
      top={20}
      testid="modal-create-message-list"
      title={
        <>
          Create New Direct Message List
          <InfoIcon text="Group fans into a list so you can send them the same direct message at once." />
        </>
      }
      bodyClass="px-[30px] pb-[20px] pt-[30px]"
    >
      {step === 1 ? (
        <>
          <p className="mb-[20px] text-[14px] font-bold">Step 1 of 2: Choose Recipients</p>
          <SearchPill value={q} onChange={setQ} testid="messages-list-search" bg="bg-bg" />
          <p className="mb-[16px] mt-[22px] text-[16px] font-bold">Add Current Message Lists</p>
          <ul className={`${SCROLL} max-h-[232px] overflow-y-auto pr-[14px]`}>
            {segShown.map((s) => (
              <li key={s}>
                <button type="button" data-testid={`messages-list-segment-${s.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} onClick={() => toggle(segs, setSegs, s)} className="flex h-[48px] w-full items-center gap-[12px] text-left text-[14px]">
                  <span className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-bg">
                    <Users size={18} className="fill-accent text-accent" />
                  </span>
                  <span className="flex-1">{s}</span>
                  <RadioDot on={segs.includes(s)} />
                </button>
              </li>
            ))}
          </ul>
          <p className="mb-[16px] mt-[28px] text-[16px] font-bold">Add Individual Recipients</p>
          <ul className={`${SCROLL} max-h-[232px] overflow-y-auto pr-[14px]`}>
            {fanShown.map((f) => (
              <li key={f.id}>
                <button type="button" data-testid={`messages-list-fan-${f.id}`} onClick={() => toggle(ids, setIds, f.id)} className="flex h-[48px] w-full items-center gap-[12px] text-left text-[14px]">
                  <Avatar src={f.avatar} size={40} ring={0} />
                  <span className="flex-1">{f.name}</span>
                  <RadioDot on={ids.includes(f.id)} />
                </button>
              </li>
            ))}
          </ul>
          <Button data-testid="messages-list-select-recipients" className="mt-[24px] w-full" disabled={count === 0} onClick={() => setStep(2)}>
            Select Recipients
          </Button>
        </>
      ) : (
        // inferred: step 2 was not captured
        <>
          <p className="mb-[20px] text-[14px] font-bold">Step 2 of 2: Name Your List</p>
          <Label htmlFor="ml-name" required>
            List Name
          </Label>
          <Input id="ml-name" data-testid="messages-list-name" value={name} invalid={!!err} onChange={(e) => (setName(e.target.value), setErr(""))} placeholder="Enter a list name" />
          <FieldError>{err}</FieldError>
          <p className="mt-[16px] text-[14px] text-soft" data-testid="messages-list-count">
            {count} {count === 1 ? "recipient" : "recipients"} selected
          </p>
          <div className="mt-[24px] flex items-center justify-end gap-[12px]">
            <TextButton data-testid="messages-list-back" onClick={() => setStep(1)}>
              Back
            </TextButton>
            <Button
              data-testid="messages-list-create"
              onClick={() => {
                if (!name.trim()) return setErr("List name is required");
                if (onCreate(name, ids, segs)) reset();
              }}
            >
              Create List
            </Button>
          </div>
        </>
      )}
    </CommsModal>
  );
}

/* ------------------------------------------------------------------ Paid media (inferred) */

export function PaidMessageModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (body: ChatBody) => void }) {
  const [price, setPrice] = useState("");
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [err, setErr] = useState<{ price?: string; locked?: string }>({});
  const close = () => {
    setPrice("");
    setCaption("");
    setPreview(null);
    setLocked(null);
    setErr({});
    onClose();
  };
  const kind = (n: string | null) => (n && /\.(mp3|wav|m4a|aac|ogg)$/i.test(n) ? "audio" : "image");
  return (
    <CommsModal
      open={open}
      onClose={close}
      title="Send Paid Message"
      testid="modal-paid-message"
      width={500}
      top={100}
      footer={
        <>
          <TextButton data-testid="messages-paid-cancel" onClick={close}>
            Cancel
          </TextButton>
          <Button
            data-testid="messages-paid-next"
            onClick={() => {
              const p = Number(price);
              const e: typeof err = {};
              if (!(p >= 1)) e.price = "Enter a price of at least $1.00";
              if (!locked) e.locked = "Add the locked media";
              setErr(e);
              if (Object.keys(e).length) return;
              onSubmit({ kind: "paid", price: p, caption: caption.trim() || undefined, preview: kind(preview), locked: kind(locked), fileName: locked ?? undefined });
              close();
            }}
          >
            Next
          </Button>
        </>
      }
    >
      <div className="space-y-[20px]">
        <div>
          <Label htmlFor="paid-price" required>
            Price ($)
          </Label>
          <Input id="paid-price" data-testid="messages-paid-price" inputMode="decimal" value={price} invalid={!!err.price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" />
          <FieldError>{err.price}</FieldError>
        </div>
        <div>
          <Label htmlFor="paid-caption">Message</Label>
          <Input id="paid-caption" data-testid="messages-paid-caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a message (optional)" />
        </div>
        <FilePick label="Free Preview" value={preview} onPick={setPreview} testid="messages-paid-preview" />
        <FilePick label="Locked Media" required value={locked} onPick={(v) => (setLocked(v), setErr((x) => ({ ...x, locked: undefined })))} testid="messages-paid-locked" error={err.locked} />
      </div>
    </CommsModal>
  );
}

function FilePick({ label, value, onPick, testid, required, error }: { label: string; value: string | null; onPick: (v: string) => void; testid: string; required?: boolean; error?: string }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      <label className={`flex h-[50px] cursor-pointer items-center justify-between rounded-[25px] bg-bg px-[24px] text-[14px] ${error ? "ring-1 ring-danger" : ""}`}>
        <span className={value ? "font-bold" : "text-muted"}>{value ?? "Choose an image, video or audio file"}</span>
        <span className="text-[14px] font-bold text-accent">Browse</span>
        <input
          type="file"
          accept="image/*,video/*,audio/*"
          className="hidden"
          data-testid={testid}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f.name); // mock: keep the name only, nothing is uploaded
          }}
        />
      </label>
      <FieldError>{error}</FieldError>
    </div>
  );
}

/* ------------------------------------------------------------------ Store item (inferred) */

export function StoreItemModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (body: ChatBody) => void }) {
  const items = useData((d) => d.comms.storeItems);
  const [sel, setSel] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const close = () => {
    setSel(null);
    setCaption("");
    onClose();
  };
  const item = items.find((i) => i.id === sel);
  return (
    <CommsModal
      open={open}
      onClose={close}
      title="Share a Store Item"
      testid="modal-store-item"
      width={620}
      top={60}
      footer={
        <>
          <TextButton onClick={close}>Cancel</TextButton>
          <Button
            data-testid="messages-store-send"
            disabled={!item}
            onClick={() => {
              if (!item) return;
              onSubmit(item.type === "course" ? { kind: "course", itemId: item.id } : { kind: "store", caption: caption.trim() || item.title, itemId: item.id });
              close();
            }}
          >
            Send
          </Button>
        </>
      }
    >
      <ul className={`${SCROLL} max-h-[300px] space-y-[8px] overflow-y-auto pr-[8px]`}>
        {items.map((i) => (
          <li key={i.id}>
            <button
              type="button"
              data-testid={`messages-store-item-${i.id}`}
              onClick={() => setSel(i.id)}
              className={`flex w-full items-center justify-between rounded-inner px-[20px] py-[16px] text-left ${sel === i.id ? "bg-accent" : "bg-bg hover:bg-accent-tint"}`}
            >
              <span>
                <span className="block text-[14px] font-bold">{i.title}</span>
                <span className="block text-[12px] text-soft">{i.type === "course" ? "Course" : "Experience"}</span>
              </span>
              <span className="text-[14px] font-bold">{money(i.price ?? i.options[0]?.price ?? 0)}</span>
            </button>
          </li>
        ))}
      </ul>
      {item && item.type !== "course" && (
        <div className="mt-[20px]">
          <Label htmlFor="store-caption">Message</Label>
          <Input id="store-caption" data-testid="messages-store-caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a message (optional)" />
          <div className="mt-[16px] scale-[.9] origin-top-left">
            <StoreItemCard item={item} />
          </div>
        </div>
      )}
    </CommsModal>
  );
}

/* ------------------------------------------------------------------ Coupon (inferred) */

export function CouponModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (body: ChatBody) => void }) {
  const [code, setCode] = useState("");
  const [pct, setPct] = useState(15);
  const close = () => {
    setCode("");
    setPct(15);
    onClose();
  };
  return (
    <CommsModal
      open={open}
      onClose={close}
      title="Send a Coupon"
      testid="modal-coupon"
      width={450}
      top={140}
      footer={
        <>
          <TextButton onClick={close}>Cancel</TextButton>
          <Button
            data-testid="messages-coupon-send"
            disabled={!code.trim()}
            onClick={() => {
              onSubmit({ kind: "coupon", code: code.trim().toUpperCase(), percent: pct });
              close();
            }}
          >
            Send
          </Button>
        </>
      }
    >
      <Label htmlFor="coupon-code" required>
        Coupon Code
      </Label>
      <Input id="coupon-code" data-testid="messages-coupon-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SNOW15" />
      <p className="mb-[12px] mt-[20px] text-[16px]">Discount</p>
      <div className="flex gap-[8px]">
        {[10, 15, 20, 25].map((p) => (
          <button
            key={p}
            type="button"
            data-testid={`messages-coupon-${p}`}
            onClick={() => setPct(p)}
            className={`h-[40px] rounded-pill border border-accent px-[16px] text-[14px] font-bold ${pct === p ? "bg-accent" : ""}`}
          >
            {p}%
          </button>
        ))}
      </div>
    </CommsModal>
  );
}
