/**
 * Create New Plan / Update Plan building blocks, measured from the aj-white-subscriptions reference pack
 * (CLAUDE_CODE_PROMPT.md §1, §7–§9). Mock only: nothing here calls a network or charges anyone.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Coins, Info as InfoGlyph, Menu, Pencil, Search, X, XCircle } from "lucide-react";
import { useOutside } from "../../../../platform/ui/controls";
import { useMockLoading } from "../../../../store/store";
import { money } from "../../../../store/slices/monetize";
import { Pill } from "../../ui";
import { CURRENCIES, adjustedFor, settlementFor } from "./currencies";

/* ------------------------------------------------------------ small pieces */

/** Pill input (h55, r28, padding 17/24, 14px, bold value, dimmed placeholder with .4 tracking). */
export const inputCls =
  "h-[55px] w-full rounded-pill px-[24px] text-[14px] font-bold text-white outline-none placeholder:font-normal placeholder:tracking-[.4px] placeholder:text-white/50 focus:ring-1 focus:ring-accent";

/** 26px selection circle: 2px theme-45 border; checked = theme fill + 14px white check. */
export function Circle({ on, onClick, label, testid, size = 26 }: { on: boolean; onClick?: (e: React.MouseEvent) => void; label: string; testid?: string; size?: number }) {
  const cls = `flex shrink-0 items-center justify-center rounded-full ${on ? "bg-accent" : "border-2 border-accent/45"}`;
  const glyph = on && <Check size={14} strokeWidth={3.5} />;
  if (!onClick)
    return (
      <span aria-hidden data-testid={testid} className={cls} style={{ width: size, height: size }}>
        {glyph}
      </span>
    );
  return (
    <button type="button" role="checkbox" aria-checked={on} aria-label={label} data-testid={testid} onClick={onClick} className={cls} style={{ width: size, height: size }}>
      {glyph}
    </button>
  );
}

/** 16px red "i": popover on click, closes on a second click or outside click; right edge lines up with the icon. */
export function Info({ text, testid }: { text: string; testid?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useOutside(ref, () => setOpen(false), open);
  return (
    <span ref={ref} className="relative ml-[8px] inline-flex align-middle">
      <button
        type="button"
        aria-label="More info"
        aria-expanded={open}
        data-testid={testid}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex h-[16px] w-[16px] items-center justify-center rounded-full bg-accent text-white"
      >
        <InfoGlyph size={12} strokeWidth={3} className="[&>circle]:hidden" />
      </button>
      {open && (
        <span
          role="tooltip"
          data-testid={testid && `${testid}-popover`}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-[22px] z-[60] w-[280px] cursor-default rounded-[8px] border border-accent bg-surface px-[20px] py-[10px] text-left text-[13px] font-bold normal-case leading-[18.85px] tracking-normal text-white"
        >
          {text}
        </span>
      )}
    </span>
  );
}

/** 33px coins button inside a price field. Dim and inert (`.disable`) until the field has a value. */
export function CoinButton({ disabled, onClick, testid, label = "Currency adjustments" }: { disabled: boolean; onClick: () => void; testid?: string; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      data-testid={testid}
      data-disabled={disabled ? "true" : "false"}
      onClick={() => !disabled && onClick()}
      className={`absolute right-[11px] top-1/2 flex h-[33px] w-[33px] -translate-y-1/2 items-center justify-center rounded-full bg-accent text-white ${disabled ? "pointer-events-none opacity-40" : ""}`}
    >
      <Coins size={18} strokeWidth={2.2} />
    </button>
  );
}

/** "No / Yes" segmented pill: 140x36 on --bg, active segment theme. */
export function NoYes({ yes, onChange, testid, label }: { yes: boolean; onChange: (yes: boolean) => void; testid: string; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} data-testid={testid} className="flex h-[36px] w-[140px] shrink-0 rounded-pill bg-bg text-[13px] font-bold">
      {(["No", "Yes"] as const).map((v) => {
        const on = (v === "Yes") === yes;
        return (
          <button key={v} type="button" role="radio" aria-checked={on} data-testid={`${testid}-${v.toLowerCase()}`} onClick={() => onChange(v === "Yes")} className={`h-[36px] w-[70px] rounded-pill ${on ? "bg-accent" : ""}`}>
            {v}
          </button>
        );
      })}
    </div>
  );
}

/** Thin themed scrollbar for inner lists (2px, track --bg, thumb theme). */
export const scrollCls = "subs-scroll overflow-y-auto";
export function ScrollStyle() {
  return (
    <style>{`.subs-scroll{scrollbar-width:thin;scrollbar-color:var(--configThemeColor, #BC1111) var(--bg)}
.subs-scroll::-webkit-scrollbar{width:2px}.subs-scroll::-webkit-scrollbar-track{background:var(--bg)}
.subs-scroll::-webkit-scrollbar-thumb{background:rgb(var(--configThemeColorRgb));border-radius:4px}`}</style>
  );
}

/* ------------------------------------------------------------ modal */

/** Modal: --surface, r30, .75 backdrop, z 9999, vertically centred, fades in. */
export function SubsModal({
  open,
  onClose,
  width,
  testid,
  children,
  label,
}: {
  open: boolean;
  onClose: () => void;
  width: number | string;
  testid: string;
  children: ReactNode;
  label: string;
}) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex overflow-y-auto bg-[rgba(0,0,0,.75)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <div className="m-auto py-[20px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div role="dialog" aria-modal="true" aria-label={label} data-testid={`modal-${testid}`} style={{ width }} className="relative max-w-[100vw] rounded-[30px] bg-surface">
              {children}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ModalHead({ title, onClose, size = 20, children }: { title: string; onClose?: () => void; size?: number; children?: ReactNode }) {
  return (
    <div className="flex items-start justify-between border-b border-bg px-[30px] pb-[18px] pt-[24px]">
      <div>
        <h2 className="font-bold capitalize" style={{ fontSize: size }}>
          {title}
        </h2>
        {children}
      </div>
      {onClose && (
        <button type="button" aria-label="Close" onClick={onClose} className="mt-[2px] text-white hover:text-accent">
          <X size={20} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

const textBtn = "h-[40px] px-[16px] text-[14px] font-black uppercase text-white hover:text-accent";

/* ------------------------------------------------------------ Item Currency Adjustments */

const CURRENCY_INFO =
  "The Adjusted Displayed Price is the amount that will be shown and charged to fans based on their coutry/currency settings. If you want to provide a different price for an item based on a country/currency's cost of living, use this field to make adjustments. All money is settled in US Dollars in your wallet.";

export function CurrencyModal({ open, base, value, onClose, onSave }: { open: boolean; base: number; value?: Record<string, string>; onClose: () => void; onSave: (v: Record<string, string>) => void }) {
  const loading = useMockLoading(700, open ? `open-${base}` : "closed");
  const [edits, setEdits] = useState<Record<string, string>>({});
  useEffect(() => {
    if (open) setEdits(value ?? {});
  }, [open, value]);
  const priceOf = (code: string) => edits[code] ?? adjustedFor(CURRENCIES.find((c) => c.code === code)!, base).toFixed(2);
  return (
    <SubsModal open={open} onClose={onClose} width={920} testid="plan-currency" label="Item Currency Adjustments">
      <button type="button" aria-label="Close" data-testid="plan-currency-close" onClick={onClose} className="absolute -right-[10px] -top-[10px] z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-accent text-white">
        <X size={16} strokeWidth={3} />
      </button>
      <div className="px-[30px] pb-[16px] pt-[26px]">
        <h2 className="flex items-center text-[24px] font-bold capitalize">
          Item Currency Adjustments
          <Info text={CURRENCY_INFO} testid="plan-currency-info" />
        </h2>
        <p className="mt-[6px] text-[14px]">Base Price: {money(base)} USD</p>
      </div>
      {loading ? (
        <p data-testid="plan-currency-loading" className="py-[40px] text-center text-[14px]">
          Loading International Currencies...
        </p>
      ) : (
        <div className="px-[30px]">
          <div className={`${scrollCls} h-[600px]`} data-testid="plan-currency-table">
            <table className="w-full">
              <thead className="sticky top-0 z-[1] bg-surface">
                <tr className="h-[43px] text-[12px] font-semibold uppercase">
                  <th className="text-left">Currency</th>
                  <th className="text-left">Adjusted Displayed Price</th>
                  <th className="text-right">Expected Settlement (USD)</th>
                </tr>
              </thead>
              <tbody>
                {CURRENCIES.map((c) => {
                  const p = priceOf(c.code);
                  return (
                    <tr key={c.code} data-testid={`plan-currency-row-${c.code}`} className="h-[70px] hover:bg-white/[.04]">
                      <td>
                        <div className="flex items-center gap-[8px] text-[16px] font-semibold">
                          {c.code}
                          {c.code === "USD" && <span className="rounded-[4px] bg-accent px-[6px] py-[2px] text-[10.4px] font-semibold uppercase">Base Currency</span>}
                        </div>
                        <div className="text-[14px]">{c.name}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-[10px]">
                          <span className="w-[44px] text-right text-[16px]">{c.symbol}</span>
                          <input
                            aria-label={`${c.code} adjusted price`}
                            data-testid={`plan-currency-input-${c.code}`}
                            inputMode="decimal"
                            value={p}
                            onChange={(e) => setEdits({ ...edits, [c.code]: e.target.value.replace(/[^0-9.]/g, "") })}
                            className="h-[36px] w-[235px] rounded-pill bg-bg px-[16px] text-[14px] text-white outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                      </td>
                      <td className="text-right text-[16px] font-medium">{money(settlementFor(c, Number(p) || 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-[14px] text-[13px] text-white/75">Tip: Adjusted prices are automatically rounded to whole numbers. You can manually override any price for cost of living adjustments.</p>
        </div>
      )}
      <div className="flex justify-end px-[30px] pb-[26px] pt-[16px]">
        {/* TODO(not captured): what Save and Close persists. Here it keeps the overrides on this package in the form only. */}
        <Pill data-testid="plan-currency-save" onClick={() => onSave(edits)}>
          Save and Close
        </Pill>
      </div>
    </SubsModal>
  );
}

/* ------------------------------------------------------------ DM price */

const DM_AMOUNTS = [1, 5, 10, 20, 50];

export function DmPriceModal({ open, value, onClose, onSave }: { open: boolean; value: number; onClose: () => void; onSave: (v: number) => void }) {
  const [pick, setPick] = useState<number | null>(value);
  const [custom, setCustom] = useState("");
  const [cur, setCur] = useState(false);
  useEffect(() => {
    if (!open) return;
    setPick(DM_AMOUNTS.includes(value) ? value : null);
    setCustom(DM_AMOUNTS.includes(value) ? "" : String(value));
  }, [open, value]);
  const customN = Number(custom);
  const bad = custom !== "" && !(customN >= 1);
  const result = custom !== "" ? customN : pick;
  return (
    <SubsModal open={open} onClose={onClose} width={450} testid="plan-dm-price" label="Edit Price Per Individual Direct Message">
      <ModalHead title="Edit Price Per Individual Direct Message" size={18} />
      <div className="px-[26px] pt-[20px]">
        <p className="text-[16px]">Amount</p>
        <div className="mt-[12px] flex gap-[12px]">
          {DM_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={custom === "" && pick === a}
              data-testid={`plan-dm-price-${a}`}
              onClick={() => (setPick(a), setCustom(""))}
              className={`h-[56px] w-[66px] rounded-pill bg-bg text-[14px] font-black ${custom === "" && pick === a ? "ring-1 ring-accent" : ""}`}
            >
              ${a}
            </button>
          ))}
        </div>
        <p className="mt-[20px] text-[16px]">Custom Amount</p>
        <div className="mt-[12px] flex items-center gap-[12px]">
          <label className="relative flex h-[52px] w-[220px] items-center rounded-pill bg-bg pl-[16px] pr-[50px] text-[14px] font-bold">
            $
            <input
              aria-label="Custom amount"
              data-testid="plan-dm-price-custom"
              inputMode="decimal"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="CUSTOM AMOUNT"
              className="ml-[4px] w-full bg-transparent uppercase text-white outline-none placeholder:font-medium placeholder:text-white/80"
            />
            <CoinButton disabled={!custom} onClick={() => setCur(true)} testid="plan-dm-price-currency" />
          </label>
          <span className={`whitespace-nowrap rounded-pill bg-accent/20 px-[10px] py-[6px] text-[11px] font-medium text-accent ${bad ? "ring-1 ring-accent" : ""}`}>Minimum Amount: $1.00</span>
        </div>
      </div>
      <div className="flex justify-end gap-[8px] px-[26px] pb-[24px] pt-[28px]">
        <button type="button" data-testid="plan-dm-price-cancel" onClick={onClose} className={textBtn}>
          Cancel
        </button>
        {/* TODO(not captured): the result of Update. Here it sets the plan's DM price in the form. */}
        <Pill data-testid="plan-dm-price-update" disabled={bad || !result} onClick={() => result && onSave(result)}>
          Update
        </Pill>
      </div>
      <CurrencyModal open={cur} base={customN || 0} onClose={() => setCur(false)} onSave={() => setCur(false)} />
    </SubsModal>
  );
}

/* ------------------------------------------------------------ Add Benefit */

/** Add Benefit modal. Copy quirk kept: editing opens the same modal, still titled "Add Benefit". */
export function BenefitModal({ open, initial, onClose, onSave }: { open: boolean; initial: string; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState(initial);
  useEffect(() => {
    if (open) setName(initial);
  }, [open, initial]);
  const ok = !!name.trim();
  return (
    <SubsModal open={open} onClose={onClose} width={450} testid="plan-benefit" label="Add Benefit">
      <ModalHead title="Add Benefit" onClose={onClose} />
      <div className="px-[26px] pt-[30px]">
        <label htmlFor="plan-benefit-name" className="text-[16px]">
          Benefit Name*
        </label>
        <input
          id="plan-benefit-name"
          data-testid="plan-benefit-name"
          autoFocus
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ok && onSave(name.trim())}
          className={`${inputCls} mt-[16px] h-[48px] bg-bg`}
        />
      </div>
      <div className="flex justify-end gap-[8px] px-[26px] pb-[24px] pt-[40px]">
        <button type="button" data-testid="plan-benefit-cancel" onClick={onClose} className={textBtn}>
          Cancel
        </button>
        <Pill data-testid="plan-benefit-save" disabled={!ok} onClick={() => onSave(name.trim())}>
          Add Benefit
        </Pill>
      </div>
    </SubsModal>
  );
}

/* ------------------------------------------------------------ Plan Benefits multi-select */

export const BENEFIT_OPTIONS = ["Exclusive Photos", "Exclusive Videos", "Exclusive Podcasts", "All E-Courses are FREE", "Money Saving VIP Offers from my Partners", "Chat Room Access"];

export function BenefitsSelect({
  options,
  value,
  onChange,
  onOptions,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  onOptions: (o: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ edit: string | null } | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [grab, setGrab] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => !modal && setOpen(false), open);

  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setAbove(window.innerHeight - r.bottom < 400 && r.top > window.innerHeight - r.bottom);
  }, [open]);

  // Latest selection, so quick successive clicks don't toggle against a stale list.
  const cur = useRef(value);
  cur.current = value;
  const commit = (v: string[]) => ((cur.current = v), onChange(v));
  const toggle = (b: string) => commit(cur.current.includes(b) ? cur.current.filter((x) => x !== b) : [...cur.current, b]);
  const move = (from: string, to: string) => {
    if (from === to) return;
    const next = value.filter((x) => x !== from);
    next.splice(value.indexOf(to), 0, from);
    onChange(next);
  };
  const save = (name: string) => {
    const edit = modal?.edit;
    if (edit) {
      if (name !== edit && options.includes(name)) onChange(value.filter((x) => x !== edit));
      else {
        onOptions(options.map((o) => (o === edit ? name : o)));
        onChange(value.map((x) => (x === edit ? name : x)));
      }
    } else {
      if (!options.includes(name)) onOptions([...options, name]);
      if (!value.includes(name)) onChange([...value, name]);
    }
    setModal(null);
  };
  const shown = options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div>
      <div ref={ref} className="relative w-[calc(100%-24px)]">
        <div
          role="combobox"
          aria-expanded={open}
          aria-label="Plan Benefits"
          tabIndex={0}
          data-testid="plan-benefits-trigger"
          onClick={() => setOpen(true)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(true))}
          className="flex min-h-[56px] cursor-pointer items-center gap-[8px] rounded-pill bg-bg py-[10px] pl-[18px] pr-[50px]"
        >
          {value.length ? (
            <span className="flex flex-wrap gap-[8px]">
              {value.map((b) => (
                <span key={b} data-testid="plan-benefit-chip" className="inline-flex h-[24px] items-center gap-[4px] rounded-pill border border-white px-[10px] text-[11px] font-medium">
                  {b}
                  <button type="button" aria-label={`Remove ${b}`} onClick={(e) => (e.stopPropagation(), toggle(b))}>
                    <XCircle size={13} />
                  </button>
                </span>
              ))}
            </span>
          ) : (
            <span className="text-[14px] font-medium text-white/60">Select Benefits Select Benefits</span>
          )}
          <ChevronDown size={20} className="absolute right-[18px] top-1/2 -translate-y-1/2" />
        </div>
        {open && (
          <div data-testid="plan-benefits-panel" className={`absolute left-0 z-40 w-full rounded-[28px] bg-bg shadow-[0_8px_30px_rgba(0,0,0,.5)] ${above ? "bottom-full mb-[8px]" : "top-full mt-[8px]"}`}>
            <div className="p-[16px] pb-[8px]">
              <label className="flex h-[56px] items-center gap-[12px] rounded-pill bg-surface/60 px-[16px]">
                <Search size={24} />
                <input aria-label="Search benefits" data-testid="plan-benefits-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Select Benefits" className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-[12px] placeholder:text-white/60" />
              </label>
            </div>
            <ul role="listbox" aria-multiselectable="true" className={`${scrollCls} max-h-[250px] px-[16px]`}>
              {shown.map((o) => {
                const on = value.includes(o);
                return (
                  <li key={o} role="option" aria-selected={on} data-testid="plan-benefits-option" onClick={() => toggle(o)} className="flex h-[41px] cursor-pointer items-center justify-between pr-[6px] text-[14px]">
                    {o}
                    <span className={`flex h-[25px] w-[25px] items-center justify-center rounded-full border border-accent ${on ? "bg-accent" : ""}`}>{on && <Check size={14} strokeWidth={3} />}</span>
                  </li>
                );
              })}
            </ul>
            <div className="flex h-[79px] items-center px-[16px]">
              <button type="button" data-testid="plan-benefits-add-new" onClick={() => setModal({ edit: null })} className="h-[40px] w-[153px] rounded-[48px] border border-white text-[15px] font-semibold">
                Add New Benefit
              </button>
            </div>
          </div>
        )}
      </div>
      {!!value.length && (
        <ul className="mt-[12px] flex flex-col gap-[14px]" data-testid="plan-benefit-rows">
          {value.map((b, i) => (
            <li
              key={b}
              data-testid="plan-benefit-row"
              draggable={grab === b}
              onDragStart={(e) => (setDrag(b), e.dataTransfer.setData("text/plain", b))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drag && move(drag, b)}
              onDragEnd={() => (setDrag(null), setGrab(null))}
              className={`flex h-[50px] items-center gap-[14px] rounded-[12px] bg-bg px-[16px] ${drag === b ? "opacity-50" : ""}`}
            >
              <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-white" />
              <span className="flex-1 truncate text-[16px] text-white/75">{b}</span>
              <button type="button" aria-label={`Edit ${b}`} data-testid="plan-benefit-row-edit" onClick={() => setModal({ edit: b })}>
                <Pencil size={16} fill="currentColor" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                aria-label={`Reorder ${b} (drag, or use arrow keys)`}
                data-testid="plan-benefit-row-drag"
                onMouseDown={() => setGrab(b)}
                onMouseUp={() => setGrab(null)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" && i > 0) (e.preventDefault(), move(b, value[i - 1]));
                  if (e.key === "ArrowDown" && i < value.length - 1) (e.preventDefault(), move(value[i + 1], b));
                }}
                className="cursor-grab"
              >
                <Menu size={19} strokeWidth={2.5} />
              </button>
              <button type="button" aria-label={`Remove ${b}`} data-testid="plan-benefit-row-remove" onClick={() => toggle(b)}>
                <X size={20} strokeWidth={2.5} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <BenefitModal open={!!modal} initial={modal?.edit ?? ""} onClose={() => setModal(null)} onSave={save} />
    </div>
  );
}

/* ------------------------------------------------------------ Season Pass date picker */

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** "Nov 20, 2026". TODO(not captured): the format the live field shows once a date is picked. */
export const showDate = (v: string) => (v ? new Date(`${v}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

export function DateField({ value, onChange, testid }: { value: string; onChange: (v: string) => void; testid: string }) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const start = value ? new Date(`${value}T12:00:00`) : today;
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  const first = new Date(view.y, view.m, 1);
  const cells = Array.from({ length: 42 }, (_, i) => new Date(view.y, view.m, 1 - first.getDay() + i));
  const todayIso = iso(today);
  const step = (n: number) => setView(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));
  return (
    <div ref={ref} className="relative">
      <button type="button" data-testid={testid} onClick={() => setOpen((o) => !o)} className={`${inputCls} mt-[16px] flex items-center justify-between bg-surface text-left`}>
        <span className={value ? "" : "font-normal tracking-[.4px] text-white/50"}>{value ? showDate(value) : "Select Date"}</span>
        <CalendarDays size={20} className="text-accent" />
      </button>
      {open && (
        <div data-testid={`${testid}-calendar`} className="absolute left-0 top-full z-40 mt-[6px] w-[290px] overflow-hidden rounded-[24px] border border-accent bg-bg pb-[10px]">
          <div className="flex items-center justify-between bg-accent px-[10px] py-[10px]">
            <button type="button" aria-label="Previous month" data-testid={`${testid}-prev`} onClick={() => step(-1)} className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-bg">
              <ChevronLeft size={16} />
            </button>
            {/* TODO(not captured): the month and year pills probably open month/year views. */}
            <span className="flex gap-[14px]">
              <span data-testid={`${testid}-month`} className="rounded-pill bg-bg px-[12px] py-[4px] text-[13px]">
                {MONTH_NAMES[view.m]}
              </span>
              <span className="rounded-pill bg-bg px-[12px] py-[4px] text-[13px]">{view.y}</span>
            </span>
            <button type="button" aria-label="Next month" data-testid={`${testid}-next`} onClick={() => step(1)} className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-bg">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 px-[8px] pt-[8px] text-center text-[12px]">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
              <span key={d} className={`py-[4px] ${i === 0 || i === 6 ? "text-accent" : ""}`}>
                {d}
              </span>
            ))}
            {cells.map((c, i) => {
              const k = iso(c);
              const off = k <= todayIso;
              const weekend = i % 7 === 0 || i % 7 === 6;
              const other = c.getMonth() !== view.m;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={off}
                  data-testid={`${testid}-day-${k}`}
                  onClick={() => (onChange(k), setOpen(false))}
                  className={`h-[28px] rounded-full text-[12px] ${weekend ? "text-accent" : ""} ${off ? "opacity-30" : other ? "opacity-70" : ""} ${value === k ? "bg-accent !text-white" : "enabled:hover:bg-white/10"}`}
                >
                  {c.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
