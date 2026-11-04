/**
 * New Post dialogs and popovers (reference pack §4.3–4.4, newpost-04…38): Lock, Tag Collaborating
 * Creators, picker dialogs (store / portfolio / feed / events / gift), Insert AI Generated Content,
 * the editor's emoji panel, the poll date popover and clock dialog, and Add Custom Gift.
 * Everything lists real mock-store data or the documented empty message; nothing is uploaded or sent.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Coins, Flag, Heart, Leaf, Lightbulb, Plane, Plus, Search, ShoppingBag, Smile, Trophy, Utensils, X } from "lucide-react";
import { Button, InfoIcon, Select, TextButton, useOutside } from "../../platform/ui/controls";
import { ImageSlot } from "../../platform/ui/surfaces";
import { RoundCheck, SocialModal } from "./shared";
import { AI_TYPES, generateArticle, type AiResult, type AiType } from "../../services/articleGen";
import { useData } from "../../store/store";

/* ---------------- Lock ---------------- */

export interface LockDraft {
  subscription: boolean;
  /** Plans whose subscribers can unlock it (Subscription). */
  planIds: string[];
  purchase: boolean;
  points: boolean;
  nft: boolean;
  price: string;
  pointsValue: string;
  nfts: string[];
}
/** Loose format check for a pasted NFT contract address (0x + 40 hex). */
export const NFT_RE = /^0x[0-9a-f]{40}$/i;
// Measured from the live New Post › Lock dialog: 51px pill fields on the page colour, 30px side padding.
const pillField = "flex h-[51px] items-center rounded-pill bg-bg px-[30px]";
const sectionLabel = "text-[16px]";

export function LockDialog({ open, initial, onCancel, onSave }: { open: boolean; initial: LockDraft; onCancel: () => void; onSave: (v: LockDraft) => void }) {
  const [v, setV] = useState(initial);
  const [nftText, setNftText] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const plans = useData((d) => d.monetize.plans.filter((p) => p.active));
  useEffect(() => {
    if (open) (setV(initial), setNftText(""), setErr({}));
  }, [open]);
  const toggle = (k: "subscription" | "purchase" | "points" | "nft") => setV((x) => ({ ...x, [k]: !x[k] }));
  const togglePlan = (id: string) => setV((x) => ({ ...x, planIds: x.planIds.includes(id) ? x.planIds.filter((p) => p !== id) : [...x.planIds, id] }));
  const addNft = () => {
    const c = nftText.trim();
    if (!NFT_RE.test(c)) return setErr((e) => ({ ...e, nft: "Enter a contract address: 0x followed by 40 characters (0–9, a–f)." }));
    if (!v.nfts.some((n) => n.toLowerCase() === c.toLowerCase())) setV((x) => ({ ...x, nfts: [...x.nfts, c] }));
    setNftText("");
    setErr((e) => ({ ...e, nft: "" }));
  };
  const save = () => {
    const e: Record<string, string> = {};
    let nfts = v.nfts;
    // A valid address typed but not ADDed yet counts.
    if (v.nft && NFT_RE.test(nftText.trim()) && !nfts.length) nfts = [nftText.trim()];
    if (v.subscription && !v.planIds.length) e.plans = "Choose at least one plan.";
    if (v.purchase && !(Number(v.price) > 0)) e.price = "Enter a price above $0.";
    if (v.points && !(Number.isInteger(Number(v.pointsValue)) && Number(v.pointsValue) > 0)) e.points = "Enter a whole number of points above 0.";
    if (v.nft && !nfts.length) e.nft = "Add at least one NFT contract address.";
    setErr(e);
    if (Object.keys(e).length) return;
    onSave({ ...v, nfts });
  };
  const opts: [keyof LockDraft & ("subscription" | "purchase" | "points" | "nft"), string][] = [
    ["subscription", "Subscription"],
    ["purchase", "Individual Purchase"],
    ["points", "Loyalty Points"],
    ["nft", "Lock with NFT"],
  ];
  const Err = ({ k }: { k: string }) => (err[k] ? <p className="mt-[6px] text-[12px] text-danger" role="alert">* {err[k]}</p> : null);
  return (
    <SocialModal open={open} onClose={onCancel} title="Choose any of the options below to lock this content:" titleClass="text-[18px] font-bold" width={770} centered hideClose testid="newpost-lock-panel" bodyClass="px-[30px] pb-[20px] pt-[22px]">
      <div className="flex flex-wrap justify-between gap-x-[24px] gap-y-[12px]" role="group" aria-label="Lock options">
        {opts.map(([k, l]) => (
          <label key={k} className="flex cursor-pointer items-center gap-[12px] whitespace-nowrap text-[16px]">
            <RoundCheck testid={`newpost-lock-opt-${k}`} label={l} checked={v[k]} onChange={() => toggle(k)} />
            {l}
          </label>
        ))}
      </div>
      {v.subscription && (
        <div className="mt-[30px]">
          <p className={sectionLabel}>Select Subscription Options:</p>
          {plans.length ? (
            <ul className="mt-[22px] flex flex-col gap-[7px]" data-testid="newpost-lock-plans">
              {plans.map((p) => {
                const on = v.planIds.includes(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      data-testid={`newpost-lock-plan-${p.id}`}
                      onClick={() => togglePlan(p.id)}
                      className="flex h-[55px] w-full items-center justify-between rounded-pill border border-accent px-[30px] text-left text-[16px]"
                    >
                      {p.name}
                      <span className={`flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full ${on ? "bg-accent" : "border border-accent"}`}>{on && <Check size={15} strokeWidth={3.5} />}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-[12px] text-[14px] text-soft">You don't have an active membership plan yet. Create one in Monetize › Subscriptions.</p>
          )}
          <Err k="plans" />
        </div>
      )}
      {v.purchase && (
        <div className="mt-[30px]">
          <p className={sectionLabel}>Individual Purchase</p>
          <div className={`${pillField} mt-[20px] pr-[10px]`}>
            <span className="mr-[6px] text-[16px] font-bold">$</span>
            <input aria-label="Unlock price" data-testid="newpost-lock-price" inputMode="decimal" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value.replace(/[^\d.]/g, "") })} className="w-full bg-transparent text-[16px] font-bold outline-none" />
            <span aria-hidden className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-accent/60">
              <Coins size={18} />
            </span>
          </div>
          <Err k="price" />
        </div>
      )}
      {v.points && (
        <div className="mt-[28px]">
          <p className={sectionLabel}>Allow users to unlock this content with loyalty points</p>
          <div className={`${pillField} mt-[20px] pl-[16px]`}>
            <span aria-hidden className="mr-[12px] flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#f5b301] text-[13px] text-[#9a5b00]">★</span>
            <input aria-label="Loyalty points to unlock" data-testid="newpost-lock-points" inputMode="numeric" value={v.pointsValue} onChange={(e) => setV({ ...v, pointsValue: e.target.value.replace(/[^\d]/g, "") })} className="w-full bg-transparent text-[16px] font-bold outline-none" />
            <span className="ml-[8px] text-[20px] font-medium text-soft">Points</span>
          </div>
          <Err k="points" />
        </div>
      )}
      {v.nft && (
        <div className="mt-[28px]">
          <p className={`flex items-center justify-between pr-[40px] ${sectionLabel}`}>
            Add NFT Contract Address :
            <InfoIcon text="Fans who hold an NFT from this contract can unlock the post. Paste the contract address from the marketplace or your wallet; it starts with 0x." />
          </p>
          <div className={`${pillField} mt-[20px] pr-[24px]`}>
            <input aria-label="NFT contract address" data-testid="newpost-lock-nft-input" value={nftText} onChange={(e) => setNftText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNft())} placeholder="Paste the NFT Contract ID here" className="w-full bg-transparent text-[15px] font-bold outline-none placeholder:text-muted" />
            <button type="button" data-testid="newpost-lock-nft-add" onClick={addNft} className="flex shrink-0 items-center gap-[2px] text-[16px] font-black uppercase text-accent hover:brightness-125">
              <Plus size={18} strokeWidth={3} /> Add
            </button>
          </div>
          <Err k="nft" />
          {v.nfts.length > 0 && (
            <ul className="mt-[10px] flex flex-wrap gap-[6px]" data-testid="newpost-lock-nft-list">
              {v.nfts.map((n) => (
                <li key={n} className="flex items-center gap-[6px] rounded-pill bg-bg px-[12px] py-[4px] font-mono text-[12px]">
                  {n.slice(0, 8)}…{n.slice(-6)}
                  <button type="button" aria-label={`Remove ${n}`} onClick={() => setV({ ...v, nfts: v.nfts.filter((x) => x !== n) })}>
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {!v.subscription && !v.purchase && !v.points && !v.nft && <p className="mt-[20px] text-[14px] text-soft">No option selected: saving removes the Lock and the post stays open to everyone who can see it.</p>}
      <div className="mt-[56px] flex items-center justify-end gap-[24px]">
        <TextButton data-testid="newpost-lock-cancel" onClick={onCancel} className="!text-[16px]">
          Cancel
        </TextButton>
        <Button data-testid="newpost-lock-apply" onClick={save} className="!h-[40px] w-[120px] !text-[16px]">
          Save
        </Button>
      </div>
    </SocialModal>
  );
}

/* ---------------- Tag Collaborating Creators ---------------- */

export interface Creator {
  handle: string;
  name: string;
  avatar: string;
}
export function CollabDialog({ open, creators, selected, onClose, onTag }: { open: boolean; creators: Creator[]; selected: string[]; onClose: () => void; onTag: (handles: string[]) => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>(selected);
  useEffect(() => {
    if (open) (setSel(selected), setQ(""));
  }, [open]);
  const list = creators.filter((c) => `${c.name} ${c.handle}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <SocialModal open={open} onClose={onClose} title="Tag Collaborating Creators" width={390} centered testid="newpost-collab-panel" bodyClass="px-[24px] pb-[24px] pt-[18px]">
      <div className="flex h-[42px] items-center rounded-pill bg-bg px-[16px] text-[13px]">
        <span className="mr-[6px] shrink-0 font-bold">Tag Creator:</span>
        <input aria-label="Search creators" data-testid="newpost-collab-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-full bg-transparent outline-none placeholder:text-muted" />
      </div>
      <p className="mt-[18px] text-[14px] font-bold">Suggested</p>
      <ul className="mt-[8px] max-h-[260px] space-y-[4px] overflow-y-auto pr-[6px]">
        {list.map((c) => {
          const on = sel.includes(c.handle);
          return (
            <li key={c.handle} className="flex h-[46px] items-center gap-[12px]">
              <ImageSlot src={c.avatar} label={c.name} className="h-[34px] w-[34px] shrink-0 rounded-full" />
              <span className="flex-1 truncate text-[14px]">
                {c.name} <span className="text-[12px] text-muted">@{c.handle}</span>
              </span>
              <RoundCheck testid={`newpost-collab-${c.handle}`} label={`Tag ${c.name}`} checked={on} onChange={() => setSel(on ? sel.filter((h) => h !== c.handle) : [...sel, c.handle])} />
            </li>
          );
        })}
        {!list.length && <li className="py-[24px] text-center text-[13px] text-soft">No creators found</li>}
      </ul>
      <Button data-testid="newpost-collab-tag" onClick={() => onTag(sel)} className="mt-[16px] w-full">
        Tag
      </Button>
    </SocialModal>
  );
}

/* ---------------- picker dialog (store items, portfolios, posts, events, gifts) ---------------- */

export interface PickItem {
  id: string;
  label: string;
  sub?: string;
  image?: string | null;
}
export function PickerDialog({
  open,
  title,
  testid,
  items,
  empty,
  primary,
  placeholder = "Search",
  pills,
  initial = null,
  onClose,
  onPick,
}: {
  open: boolean;
  title: string;
  testid: string;
  items: PickItem[];
  empty: string;
  primary: string;
  placeholder?: string;
  /** Filter pills above the search (Feed Content shows ALL). */
  pills?: string[];
  initial?: string | null;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(initial);
  useEffect(() => {
    if (open) (setQ(""), setSel(initial));
  }, [open]);
  const list = items.filter((i) => `${i.label} ${i.sub ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <SocialModal open={open} onClose={onClose} title={title} width={pills ? 640 : 430} centered testid={testid} bodyClass="flex min-h-[300px] flex-col px-[24px] pb-[20px] pt-[20px]">
      {pills && (
        <div className="mb-[14px] flex gap-[8px]">
          {pills.map((p) => (
            <span key={p} className="inline-flex h-[30px] items-center rounded-pill bg-accent px-[16px] text-[12px] font-black uppercase">
              {p}
            </span>
          ))}
        </div>
      )}
      <div className="flex h-[38px] items-center gap-[8px] rounded-pill bg-bg px-[14px] text-[13px]">
        <Search size={15} className="text-accent" />
        <input aria-label={placeholder} data-testid={`${testid}-search`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="w-full bg-transparent outline-none placeholder:text-muted" />
      </div>
      {list.length ? (
        <ul className="mt-[12px] max-h-[300px] flex-1 space-y-[6px] overflow-y-auto pr-[4px]" data-testid={`${testid}-list`}>
          {list.map((i) => (
            <li key={i.id}>
              <label className={`flex cursor-pointer items-center gap-[12px] rounded-popover px-[10px] py-[8px] ${sel === i.id ? "bg-accent-tint" : "hover:bg-white/[.04]"}`}>
                {i.image !== undefined && <ImageSlot src={i.image} label={i.label} className="h-[40px] w-[40px] shrink-0 rounded-tile" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px]">{i.label}</span>
                  {i.sub && <span className="block truncate text-[12px] text-soft">{i.sub}</span>}
                </span>
                <RoundCheck testid={`${testid}-item-${i.id}`} label={i.label} checked={sel === i.id} onChange={() => setSel(i.id)} />
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-[30px]" data-testid={`${testid}-empty`}>
          <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-accent/25 text-accent">
            <ShoppingBag size={26} />
          </span>
          <p className="mt-[8px] text-[13px]">{empty}</p>
        </div>
      )}
      <div className="mt-[14px] flex justify-end">
        <Button data-testid={`${testid}-confirm`} disabled={!sel || !list.some((i) => i.id === sel)} onClick={() => sel && onPick(sel)}>
          {primary}
        </Button>
      </div>
    </SocialModal>
  );
}

/* ---------------- Insert AI Generated Content ---------------- */

export { AI_TYPES };
export function AiDialog({ open, onClose, onResult }: { open: boolean; onClose: () => void; onResult: (r: AiResult) => void }) {
  const [type, setType] = useState<AiType>(AI_TYPES[0]);
  const [text, setText] = useState("");
  const [title, setTitle] = useState(false);
  const [cover, setCover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => {
    if (open) setErr(null);
    else ctl.current?.abort();
  }, [open]);
  const generate = async () => {
    setBusy(true);
    setErr(null);
    ctl.current = new AbortController();
    try {
      const r = await generateArticle({ type, prompt: text.trim(), title, cover }, ctl.current.signal);
      onResult(r);
      onClose();
    } catch (e) {
      if (!ctl.current.signal.aborted) setErr(`Nothing was inserted: ${e instanceof Error ? e.message : "generation failed"}. Your description is kept here.`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <SocialModal open={open} onClose={onClose} title="Insert AI Generated Content" width={560} centered testid="newpost-ai-dialog" bodyClass="px-[24px] pb-[22px] pt-[18px]">
      <p className="text-[14px]">Content Type</p>
      <div className="mt-[10px] w-[260px]" data-testid="newpost-ai-type">
        <Select value={type} options={[...AI_TYPES]} onChange={(v) => setType(v as AiType)} />
      </div>
      <p className="mt-[18px] text-[14px]">Explain what content you would like generated:*</p>
      <textarea aria-label="Describe the content" data-testid="newpost-ai-prompt" maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe the content you want to create..." className="mt-[10px] h-[80px] w-full resize-y rounded-popover bg-bg px-[14px] py-[12px] text-[13px] outline-none placeholder:text-muted" />
      <p className="text-right text-[11px] italic text-soft" data-testid="newpost-ai-count">
        {5000 - text.length} Characters left
      </p>
      <label className="mt-[8px] flex cursor-pointer items-center gap-[10px] text-[14px]">
        <RoundCheck testid="newpost-ai-title" label="Generate an Article Title" checked={title} onChange={() => setTitle(!title)} />
        Generate an Article Title
      </label>
      <label className="mt-[10px] flex cursor-pointer items-center gap-[10px] text-[14px]">
        <RoundCheck testid="newpost-ai-cover" label="Generate a Cover Image" checked={cover} onChange={() => setCover(!cover)} />
        Generate a Cover Image
      </label>
      {err && (
        <p className="mt-[14px] rounded-popover bg-bg px-[14px] py-[10px] text-[13px] text-accent" role="alert" data-testid="newpost-ai-error">
          {err}
        </p>
      )}
      <div className="mt-[18px] flex items-center justify-end gap-[8px]">
        <TextButton data-testid="newpost-ai-cancel" onClick={onClose}>
          Cancel
        </TextButton>
        <Button data-testid="newpost-ai-generate" disabled={!text.trim() || busy} onClick={generate}>
          {busy ? "Generating…" : "Generate"}
        </Button>
      </div>
    </SocialModal>
  );
}

/* ---------------- emoji panel ---------------- */

const EMOJI: [typeof Smile, string, string][] = [
  [Smile, "Smileys & People", "😀 😃 😄 😁 😆 😅 😂 🙂 😉 😊 😇 😍 😘 😎 🤩 🤔 😴 😮 😢 😭 😤 😡 👍 👎 👏 🙌 🙏 💪 👋 🤙"],
  [Leaf, "Animals & Nature", "🐶 🐱 🐻 🦊 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🦅 🐺 🌲 🌳 🌵 🌸 🌻 🍁 🍀 ❄️ ⛄ 🌈 ☀️ 🌙 ⭐ 🔥"],
  [Utensils, "Food & Drink", "🍎 🍊 🍋 🍌 🍉 🍇 🍓 🍒 🥑 🥕 🌽 🥐 🍞 🧀 🍳 🍔 🍟 🍕 🌮 🍣 🍜 🍩 🍪 🎂 🍫 ☕ 🍵 🥤 🍺 🍷"],
  [Trophy, "Activities", "⚽ 🏀 🏈 ⚾ 🎾 🏐 🏓 ⛳ 🏂 ⛷️ 🏄 🚴 🧗 🏋️ 🤸 🏆 🥇 🥈 🥉 🏅 🎯 🎮 🎲 🎸 🎹 🎤 🎧 🎬 🎨 🎟️"],
  [Plane, "Travel & Places", "🚗 🚕 🚌 🚓 🚑 🚒 🚲 🛴 🏍️ ✈️ 🚀 🚁 ⛵ 🚢 🗺️ 🏔️ ⛰️ 🏕️ 🏖️ 🏝️ 🏟️ 🏠 🏙️ 🌋 🗻 🌅 🌄 🌉 🎡 🎢"],
  [Lightbulb, "Objects", "⌚ 📱 💻 🖥️ 📷 📸 🎥 📺 🔦 💡 📚 📖 ✏️ 📝 📌 📎 ✂️ 🔒 🔑 🧰 🎁 🎈 🎉 🎊 💎 💰 💳 📦 📅 🛒"],
  [Heart, "Symbols", "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 💯 ✅ ❌ ⚠️ ❗ ❓ 💬 💤 🔔 🎵 ➕ ➖ ✖️ ➗ ♻️ 🔝 🆕 🆒 🆓 🔴 🔵"],
  [Flag, "Flags", "🏁 🚩 🏳️ 🏴 🏳️‍🌈 🇺🇸 🇨🇦 🇲🇽 🇬🇧 🇮🇪 🇫🇷 🇩🇪 🇪🇸 🇮🇹 🇵🇹 🇳🇱 🇸🇪 🇳🇴 🇫🇮 🇨🇭 🇦🇹 🇯🇵 🇰🇷 🇨🇳 🇮🇳 🇦🇺 🇳🇿 🇧🇷 🇦🇷 🇿🇦"],
];
export function EmojiPanel({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, onClose, true);
  return (
    <div ref={ref} data-testid="newpost-emoji-panel" className="absolute left-[16px] top-[52px] z-30 w-[290px] rounded-popover bg-bg p-[10px] shadow-[0_4px_16px_rgba(0,0,0,.45)]" onMouseDown={(e) => e.preventDefault()}>
      <div className="flex justify-between border-b border-white/[.08] pb-[6px]" role="tablist" aria-label="Emoji categories">
        {EMOJI.map(([I, label], i) => (
          <button key={label} role="tab" aria-selected={tab === i} disabled={tab === i} aria-label={label} title={label} data-testid={`newpost-emoji-tab-${i}`} onClick={() => setTab(i)} className={`flex h-[26px] w-[26px] items-center justify-center rounded ${tab === i ? "text-accent" : "text-white/80 hover:text-white"}`}>
            <I size={15} />
          </button>
        ))}
      </div>
      <p className="mt-[6px] text-[11px] text-soft">{EMOJI[tab][1]}</p>
      <div className="mt-[4px] grid max-h-[180px] grid-cols-8 gap-[2px] overflow-y-auto">
        {EMOJI[tab][2].split(" ").map((e) => (
          <button key={e} data-testid="newpost-emoji" aria-label={`Insert ${e}`} onClick={() => onPick(e)} className="flex h-[30px] items-center justify-center rounded text-[18px] hover:bg-white/10">
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- poll date popover ---------------- */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function DatePopover({ value, onPick, onClose }: { value: string; onPick: (v: string) => void; onClose: () => void }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = value ? new Date(`${value}T00:00`) : today;
  const [m, setM] = useState(start.getMonth());
  const [y, setY] = useState(start.getFullYear());
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, onClose, true);
  const cells = useMemo(() => {
    const first = new Date(y, m, 1);
    const from = new Date(y, m, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => new Date(from.getFullYear(), from.getMonth(), from.getDate() + i));
  }, [m, y]);
  const step = (n: number) => {
    const d = new Date(y, m + n, 1);
    setM(d.getMonth());
    setY(d.getFullYear());
  };
  const canBack = y > today.getFullYear() || (y === today.getFullYear() && m > today.getMonth());
  const sel = "h-[26px] rounded-pill bg-bg px-[12px] text-center text-[12px] hover:text-accent";
  const [view, setView] = useState<"day" | "month" | "year">("day");
  const pastMonth = (i: number, yr: number) => yr < today.getFullYear() || (yr === today.getFullYear() && i < today.getMonth());
  return (
    <div ref={ref} data-testid="newpost-poll-calendar" role="dialog" aria-label="Choose a date" className="absolute left-[30px] top-[46px] z-30 w-[290px] rounded-popover border border-accent bg-surface p-[10px] shadow-[0_4px_16px_rgba(0,0,0,.45)]">
      <div className="flex items-center justify-between rounded-pill bg-accent px-[4px] py-[4px]">
        <button type="button" aria-label="Previous month" disabled={!canBack} onClick={() => step(-1)} className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-bg disabled:opacity-40">
          <ChevronLeft size={14} />
        </button>
        <button type="button" aria-label="Choose month" aria-expanded={view === "month"} data-testid="newpost-poll-cal-month" onClick={() => setView(view === "month" ? "day" : "month")} className={sel}>
          {MONTHS[m]}
        </button>
        <button type="button" aria-label="Choose year" aria-expanded={view === "year"} data-testid="newpost-poll-cal-year" onClick={() => setView(view === "year" ? "day" : "year")} className={sel}>
          {y}
        </button>
        <button type="button" aria-label="Next month" onClick={() => step(1)} className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-bg">
          <ChevronRight size={14} />
        </button>
      </div>
      {view === "month" && (
        <div className="mt-[8px] grid grid-cols-3 gap-[4px]" data-testid="newpost-poll-cal-months">
          {MONTHS.map((n, i) => (
            <button key={n} type="button" disabled={pastMonth(i, y)} onClick={() => (setM(i), setView("day"))} className={`h-[32px] rounded-pill text-[12px] disabled:opacity-30 ${i === m ? "bg-accent font-bold" : "hover:bg-white/10"}`}>
              {n.slice(0, 3)}
            </button>
          ))}
        </div>
      )}
      {view === "year" && (
        <div className="mt-[8px] grid grid-cols-3 gap-[4px]" data-testid="newpost-poll-cal-years">
          {Array.from({ length: 6 }, (_, i) => today.getFullYear() + i).map((n) => (
            <button key={n} type="button" onClick={() => (setY(n), setM(pastMonth(m, n) ? today.getMonth() : m), setView("day"))} className={`h-[32px] rounded-pill text-[12px] ${n === y ? "bg-accent font-bold" : "hover:bg-white/10"}`}>
              {n}
            </button>
          ))}
        </div>
      )}
      <div className={`mt-[8px] grid grid-cols-7 text-center text-[11px] ${view === "day" ? "" : "hidden"}`}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
          <span key={d} className={`py-[4px] ${i === 0 || i === 6 ? "text-accent" : ""}`}>
            {d}
          </span>
        ))}
        {cells.map((d) => {
          const past = d < today;
          const other = d.getMonth() !== m;
          const on = iso(d) === value;
          const wk = d.getDay() === 0 || d.getDay() === 6;
          return (
            <button
              key={iso(d)}
              type="button"
              disabled={past}
              data-testid={`newpost-poll-day-${iso(d)}`}
              onClick={() => onPick(iso(d))}
              className={`m-auto flex h-[28px] w-[28px] items-center justify-center rounded-full text-[12px] ${on ? "bg-accent font-bold" : "hover:bg-white/10"} ${past ? "cursor-not-allowed opacity-30" : other ? "opacity-60" : ""} ${wk && !on ? "text-accent" : ""}`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- poll time (clock) dialog ---------------- */

export function TimeDialog({ open, value, onPick, onClose }: { open: boolean; value: string; onPick: (v: string) => void; onClose: () => void }) {
  const parse = () => {
    const [h, mm] = (value || "12:00").split(":").map(Number);
    return { h: h % 12 || 12, m: mm, pm: h >= 12 };
  };
  const [t, setT] = useState(parse);
  const [mode, setMode] = useState<"h" | "m">("h");
  useEffect(() => {
    if (open) (setT(parse()), setMode("h"));
  }, [open]);
  if (!open) return null;
  const nums = mode === "h" ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const cur = mode === "h" ? t.h : t.m;
  const idx = mode === "h" ? t.h % 12 : Math.round(t.m / 5) % 12;
  const ok = () => onPick(`${String((t.h % 12) + (t.pm ? 12 : 0)).padStart(2, "0")}:${String(t.m).padStart(2, "0")}`);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label="Choose a time" data-testid="newpost-poll-clock" className="w-[300px] overflow-hidden rounded-panel bg-surface">
        <div className="flex items-center justify-center gap-[6px] bg-bg py-[16px] text-[40px] font-light">
          <button type="button" aria-label="Edit hour" disabled={mode === "h"} onClick={() => setMode("h")} className={mode === "h" ? "text-accent" : ""}>
            {pad(t.h)}
          </button>
          :
          <button type="button" aria-label="Edit minutes" disabled={mode === "m"} onClick={() => setMode("m")} className={mode === "m" ? "text-accent" : ""}>
            {pad(t.m)}
          </button>
          <span className="ml-[8px] flex flex-col text-[14px] font-bold">
            <button type="button" data-testid="newpost-poll-am" aria-pressed={!t.pm} disabled={!t.pm} onClick={() => setT({ ...t, pm: false })} className={!t.pm ? "text-accent" : ""}>
              AM
            </button>
            <button type="button" data-testid="newpost-poll-pm" aria-pressed={t.pm} disabled={t.pm} onClick={() => setT({ ...t, pm: true })} className={t.pm ? "text-accent" : ""}>
              PM
            </button>
          </span>
        </div>
        <div className="relative mx-auto my-[18px] h-[220px] w-[220px] rounded-full bg-bg">
          <span className="absolute left-1/2 top-1/2 h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
          <span className="absolute left-1/2 top-1/2 h-[2px] w-[85px] origin-left bg-accent" style={{ transform: `rotate(${idx * 30 - 90}deg)` }} />
          {nums.map((n, i) => {
            const a = ((i * 30 - 90) * Math.PI) / 180;
            const on = n === cur || (mode === "m" && i === idx && cur % 5 !== 0);
            return (
              <button
                key={n}
                type="button"
                data-testid={`newpost-poll-clock-${mode}-${n}`}
                onClick={() => (mode === "h" ? (setT({ ...t, h: n }), setMode("m")) : setT({ ...t, m: n }))}
                style={{ left: 110 + Math.cos(a) * 88 - 16, top: 110 + Math.sin(a) * 88 - 16 }}
                className={`absolute flex h-[32px] w-[32px] items-center justify-center rounded-full text-[13px] ${on ? "bg-accent font-bold" : "hover:bg-white/10"}`}
              >
                {mode === "m" ? pad(n) : n}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-[6px] px-[16px] pb-[14px]">
          <TextButton onClick={onClose}>Cancel</TextButton>
          <Button data-testid="newpost-poll-clock-ok" onClick={ok}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Add Custom Gift ---------------- */

export function CustomGiftDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (g: { name: string; note: string; image: string | null }) => void }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) (setName(""), setNote(""), setImage(null));
  }, [open]);
  const input = "w-full rounded-pill bg-bg px-[18px] text-[13px] font-bold outline-none placeholder:text-muted";
  return (
    <SocialModal open={open} onClose={onClose} title="Add Custom Gift" width={330} centered testid="newpost-gift-custom" bodyClass="px-[18px] pb-[20px] pt-[16px]">
      <p className="text-[14px]">Enter Custom Gift Name*</p>
      <input aria-label="Custom gift name" data-testid="newpost-gift-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter Custom Gift Name" className={`${input} mt-[10px] h-[40px]`} />
      <p className="mt-[16px] text-[14px]">Enter Gift Description*</p>
      <textarea aria-label="Gift description" data-testid="newpost-gift-note" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Enter Gift Description" className={`${input} mt-[10px] h-[76px] resize-y !rounded-popover py-[12px]`} />
      <p className="text-right text-[11px] italic text-soft">{1000 - note.length} Characters left</p>
      <input ref={ref} type="file" hidden accept="image/*" onChange={(e) => (e.target.files?.[0] && setImage(e.target.files[0].name), (e.target.value = ""))} />
      <button type="button" data-testid="newpost-gift-image" onClick={() => ref.current?.click()} className="mt-[12px] flex h-[84px] w-[90px] flex-col items-center justify-center rounded-tile border border-dashed border-accent text-center text-[12px] text-accent hover:bg-accent-tint">
        <Plus size={18} />
        Upload Gift Image
      </button>
      {image && <p className="mt-[6px] truncate text-[12px] text-soft">{image}</p>}
      <div className="mt-[18px] flex items-center justify-end gap-[6px]">
        <TextButton onClick={onClose}>Cancel</TextButton>
        <Button data-testid="newpost-gift-create" disabled={!name.trim() || !note.trim()} onClick={() => onCreate({ name: name.trim(), note: note.trim(), image })}>
          Create Gift
        </Button>
      </div>
    </SocialModal>
  );
}

/** Small anchored popover (editor Link field, Insert menu). */
export function Popover({ children, onClose, className = "", testid }: { children: ReactNode; onClose: () => void; className?: string; testid: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, onClose, true);
  return (
    <div ref={ref} data-testid={testid} className={`absolute z-30 rounded-popover border border-accent bg-surface shadow-[0_4px_16px_rgba(0,0,0,.45)] ${className}`}>
      {children}
    </div>
  );
}
