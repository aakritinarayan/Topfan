/**
 * Monetize-area primitives (measured from 14-monetize.md and the 81–90 public specs).
 * Shared platform primitives (Modal, Toggle, Radio, InfoIcon, ImageSlot, Avatar, Input, Select) are reused.
 */
import { useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ArrowLeft, Check, Minus, Plus, Share2 } from "lucide-react";
import { Link, useRouter } from "../../app/router";
import { pathFor } from "../../app/routeCatalog";
import { useData, act, type AppData } from "../../store/store";
import type { Capability } from "../../store/permissions";
import { InfoIcon, Toggle, useOutside } from "../../platform/ui/controls";
import { Avatar, ImageSlot, Modal } from "../../platform/ui/surfaces";
import { posterOf, type MediaKind } from "../../media";
import { useToast } from "../../platform/ui/toast";

/* ------------------------------------------------------------ actions */

/** Run a store write; toast the reason on failure (never show success then). Returns ok. */
export function useRun() {
  const toast = useToast();
  return (label: string, fn: (d: AppData) => void, need: Capability | undefined, success?: string) => {
    const res = act(label, fn, need ? { need } : {});
    if (!res.ok) {
      toast(res.reason);
      return false;
    }
    if (success) toast(success);
    return true;
  };
}

export const useHandle = () => useData((d) => d.account.handle);

/* ------------------------------------------------------------ buttons */

type Btn = ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode };

/** Red pill CTA: h40, r28, padding 8px 20px, 14px/900 uppercase, tracking .4 (14-monetize). */
export function Pill({ icon, className = "", children, ...rest }: Btn) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex h-[40px] shrink-0 items-center justify-center gap-[8px] whitespace-nowrap rounded-pill bg-accent px-[20px] text-[14px] font-black uppercase leading-none tracking-caps text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-[.65] ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

/** Outline pill (12px/700 uppercase, 1px accent): "8 ACTIVE SUBSCRIBERS", "TICKETS". */
export function OutlinePill({ className = "", children, ...rest }: Btn) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-pill border border-accent bg-transparent text-[12px] font-bold uppercase leading-none text-white hover:bg-accent-tint ${className}`}
    >
      {children}
    </button>
  );
}

/** "Mark As Inactive": 12px/700 accent text, 1px accent border, r28, padding 3px 12px. */
export function MarkButton({ children, ...rest }: Btn) {
  return (
    <button
      type="button"
      {...rest}
      className="inline-flex h-[26px] items-center whitespace-nowrap rounded-pill border border-accent px-[12px] text-[12px] font-bold text-accent hover:bg-accent-tint"
    >
      {children}
    </button>
  );
}

/** 28px black circle icon button (table action column). */
export function BlackCircle({ label, children, ...rest }: Btn & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} {...rest} className="inline-flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-black text-white hover:text-accent">
      {children}
    </button>
  );
}

/** Red filled circle icon button (card actions, 40px). */
export function RedCircle({ label, size = 40, children, className = "", ...rest }: Btn & { label: string; size?: number }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      style={{ width: size, height: size }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent text-white hover:brightness-110 ${className}`}
    >
      {children}
    </button>
  );
}

/** Pill tabs used inside sections (ACTIVE / INACTIVE …). variant "chip": inactive bg #272a2b/400; "plain": transparent/700. */
export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
  variant = "chip",
  testid,
  gap = 20,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  variant?: "chip" | "plain";
  testid: string;
  gap?: number;
}) {
  return (
    <div role="tablist" className="flex flex-wrap items-center" style={{ gap }}>
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            data-testid={`${testid}-${t.id}`}
            onClick={() => onChange(t.id)}
            className={`h-[40px] whitespace-nowrap rounded-pill px-[20px] text-[14px] uppercase tracking-caps text-white ${
              on ? "bg-accent font-black" : variant === "chip" ? "bg-surface font-normal hover:brightness-125" : "bg-transparent font-bold hover:text-accent"
            } ${variant === "plain" ? "px-[28px]" : ""}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------ shell */

const TABS: { id: string; label: string }[] = [
  { id: "monetize-subscription", label: "Subscriptions" },
  { id: "monetize-newsletters", label: "Newsletters" },
  { id: "monetize-experience", label: "Experiences" },
  { id: "monetize-courses", label: "Courses" },
  { id: "monetize-downloadable", label: "Downloadables" },
  { id: "monetize-merchandise", label: "Merchandise" },
  { id: "monetize-nfts", label: "NFTs" },
  { id: "monetize-event-calendar", label: "Events & Ticketing" },
  { id: "monetize-vip-offers", label: "VIP Offers" },
  { id: "monetize-portfolio", label: "Portfolios" },
  { id: "monetize-discount-codes", label: "Discount Codes" },
  { id: "monetize-advertisements", label: "Advertisements" },
];

// inferred: the Monetize info icon's popover text was not captured; this paraphrases the product
// note recorded in the build brief (store order is set from the Store button on the profile).
const MONETIZE_INFO =
  "Everything you add here is sold on your Store and profile. To set the order fans see your Store items in, open the Store button on your profile and drag the items.";

/** Monetize page frame: title + info, the 12 sub-tab pills (router links), then the section. */
export function MonetizeFrame({ routeId, active, children }: { routeId: string; active: string; children: ReactNode }) {
  return (
    <div data-testid={`page-${routeId}`} className="max-w-[939px] pt-[5px]">
      <div className="flex items-center">
        <h1 className="text-[24px] font-bold leading-[30px]">Monetize</h1>
        <span className="mt-[2px]">
          <InfoIcon text={MONETIZE_INFO} />
        </span>
      </div>
      <nav aria-label="Monetize sections" className="mt-[20px] flex flex-wrap gap-x-[8px] gap-y-[16px]">
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <Link
              key={t.id}
              to={pathFor(t.id)}
              data-testid={`monetize-tab-${t.id.replace("monetize-", "")}`}
              aria-current={on ? "page" : undefined}
              className={`inline-flex h-[40px] items-center rounded-pill px-[20px] text-[14px] uppercase tracking-caps text-white ${
                on ? "bg-accent font-black" : "bg-surface font-normal hover:brightness-125"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-[26px]">{children}</div>
    </div>
  );
}

/** Section header: title 24/700 left, controls right. */
export function SectionHeader({ title, back, children }: { title: string; back?: () => void; children?: ReactNode }) {
  return (
    <div className="flex min-h-[40px] items-center justify-between gap-4">
      <div className="flex items-center gap-[20px]">
        {back && (
          <button type="button" aria-label="Back" onClick={back} className="text-white hover:text-accent" data-testid="monetize-section-back">
            <ArrowLeft size={24} />
          </button>
        )}
        <h2 className="text-[24px] font-bold leading-[30px]">{title}</h2>
      </div>
      {children && <div className="flex items-center gap-[10px]">{children}</div>}
    </div>
  );
}

/** "Display X on Profile" label + toggle (top-right of some sections). */
export function DisplayToggle({ label, on, onChange, testid }: { label: string; on: boolean; onChange: () => void; testid: string }) {
  return (
    <div className="flex items-center gap-[20px] text-[14px]" data-testid={testid}>
      <span>{label}</span>
      <span className="scale-[1.2]">
        <Toggle on={on} onChange={onChange} label={label} />
      </span>
    </div>
  );
}

/** "Button Label" + dark pill input with red info circle at its right end. */
export function ButtonLabelField({ value, onSave, info, testid }: { value: string; onSave: (v: string) => void; info: string; testid: string }) {
  const [v, setV] = useState(value);
  return (
    <label className="flex items-center gap-[20px] text-[14px]">
      <span>Button Label</span>
      <span className="flex h-[40px] w-[200px] items-center rounded-[25px] bg-surface pl-[25px] pr-[10px]">
        <input
          data-testid={testid}
          value={v}
          maxLength={20}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => v.trim() && v !== value && onSave(v.trim())}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="min-w-0 flex-1 bg-transparent text-[14px] font-bold text-white outline-none"
        />
        <InfoIcon text={info} />
      </span>
    </label>
  );
}

/* ------------------------------------------------------------ cards & tables */

/** Data table card: bg #272a2b, r30, padding 30. */
export function TableCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-x-auto rounded-card bg-surface px-[30px] pb-[10px] pt-[24px] ${className}`}>{children}</div>;
}
export const th = "pb-[24px] text-left text-[13px] font-medium uppercase text-white";
export const td = "border-t border-white/[.12] py-[18px] pr-[12px] text-[14px] align-middle";

/** Empty state: 120px tinted circle with a red icon, grey 18px text below. */
export function EmptyState({ icon, text, className = "" }: { icon: ReactNode; text: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`} data-testid="monetize-empty">
      <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-accent/20 text-accent">{icon}</div>
      <p className="mt-[30px] text-[18px] text-[#c8c8c8]">{text}</p>
    </div>
  );
}

/** Calendar with a star (empty-state icon for events). */
export function CalendarStar({ size = 45 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V2Zm-2 7v10h14V9H5Z" />
      <path d="m12 10.6 1.1 2.3 2.5.3-1.8 1.7.5 2.5-2.3-1.2-2.3 1.2.5-2.5-1.8-1.7 2.5-.3z" />
    </svg>
  );
}

/** Dashed "Add Another X" first grid cell. */
export function AddTile({ label, onClick, testid, height = 319 }: { label: string; onClick: () => void; testid: string; height?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      style={{ height }}
      className="flex w-full flex-col items-center justify-center gap-[14px] rounded-card border border-dashed border-accent text-[16px] text-accent hover:bg-accent-tint"
    >
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
        <circle cx="18" cy="18" r="17" stroke="currentColor" strokeWidth="1.5" />
        <path d="M18 10v16M10 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {label}
    </button>
  );
}

/** Content-type fallback kind for a store product's image slot. */
export const productMediaKind = (kind: string): MediaKind => (kind === "course" ? "course" : kind === "downloadable" ? "ebook" : "product");

/** Still image for a cover that may be a video key (uses the video's poster) or an image key/path. */
export const stillOf = (v: string | null | undefined) => posterOf(v) ?? v ?? null;

/** Full-bleed media card (306×319, r30) with gradient, title, price and corner controls. */
export function MediaCard({
  title,
  price,
  external,
  topLeft,
  topRight,
  bottomRight,
  onOpen,
  testid,
  frame = "light",
  titleCase,
  height = 319,
  image,
  kind = "product",
}: {
  /** Media key or path for the card image (src/media). */
  image?: string | null;
  kind?: MediaKind;
  title: string;
  price?: string | null;
  external?: boolean;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  bottomRight?: ReactNode;
  onOpen?: () => void;
  testid: string;
  frame?: "light" | "none";
  titleCase?: boolean;
  height?: number;
}) {
  return (
    <div
      data-testid={testid}
      style={{ height }}
      className={`group relative w-full overflow-hidden rounded-card ${frame === "light" ? "border-[4px] border-white/85" : ""} bg-placeholder-img`}
    >
      <button type="button" aria-label={`Open ${title}`} onClick={onOpen} className="absolute inset-0" tabIndex={onOpen ? 0 : -1} disabled={!onOpen}>
        <ImageSlot src={image} kind={kind} label={title} className="h-full w-full" />
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
      {topLeft && <div className="absolute left-[20px] top-[20px] flex gap-[10px]">{topLeft}</div>}
      {topRight && <div className="absolute right-[20px] top-[10px] flex gap-[10px] pt-[0px]">{topRight}</div>}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-[20px] pb-[20px]">
        <div className="min-w-0">
          <h3 className={`line-clamp-2 text-[20px] font-bold leading-[24px] text-white ${titleCase ? "capitalize" : ""}`}>{title}</h3>
          {price && (
            <p className="mt-[10px] text-[14px] text-white">
              {price}
              {external && (
                <>
                  {" | "}
                  <span className="text-accent">External</span>
                </>
              )}
            </p>
          )}
        </div>
        {bottomRight && <div className="pointer-events-auto shrink-0">{bottomRight}</div>}
      </div>
    </div>
  );
}

/** Dark "Published" pill (bg #272a2b, 12px, r28, padding 5px 16px). */
export function DarkPill({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-[30px] items-center rounded-pill bg-surface px-[16px] text-[12px] text-white">{children}</span>;
}

/** Status chip (r14, padding 5px 16px, 14px). */
export function StatusChip({ status }: { status: string }) {
  const bg = status === "Sent" ? "bg-[rgba(102,227,146,.2)]" : status === "Scheduled" ? "bg-[rgba(9,198,218,.2)]" : "bg-[rgba(243,205,79,.2)]";
  return <span className={`inline-flex h-[28px] items-center rounded-[14px] px-[16px] text-[14px] ${bg}`}>{status}</span>;
}

/** 86px red date circle: "FEB" / "11" / "2027". */
export function DateBadge({ iso, monthSize = 16 }: { iso: string; monthSize?: number }) {
  const d = new Date(iso);
  const m = d.toLocaleString("en-US", { month: "short", timeZone: "America/Denver" }).toUpperCase();
  const day = d.toLocaleString("en-US", { day: "numeric", timeZone: "America/Denver" });
  const y = d.toLocaleString("en-US", { year: "numeric", timeZone: "America/Denver" });
  return (
    <div className="flex h-[86px] w-[86px] shrink-0 flex-col items-center justify-center rounded-full border border-accent bg-accent text-white">
      <span className="font-bold leading-[24px]" style={{ fontSize: monthSize }}>{m}</span>
      <span className="font-bold leading-[24px]" style={{ fontSize: monthSize }}>{day}</span>
      <span className="text-[13px] leading-[18px]">{y}</span>
    </div>
  );
}

/* ------------------------------------------------------------ modals */

/** Confirm-tier gate: nothing is written until the creator clicks the primary button. */
export function ConfirmModal({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onClose,
  testid,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  testid: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" onClick={onClose} data-testid={`${testid}-cancel`} className="h-[40px] px-[16px] text-[14px] font-black uppercase tracking-caps text-white hover:text-accent">
            Cancel
          </button>
          <Pill onClick={onConfirm} data-testid={`${testid}-confirm`}>
            {confirmLabel}
          </Pill>
        </>
      }
    >
      <div data-testid={`modal-${testid}`} className="text-[16px] leading-[24px] text-white">
        {children}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------ forms (inferred create flows) */

/** Create/edit page frame (INFERRED: follows the Preferences add-page pattern: back arrow, title, card, footer). */
export function FormPage({
  routeId,
  title,
  backTo,
  children,
  footer,
}: {
  routeId: string;
  title: string;
  backTo: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const { navigate } = useRouter();
  return (
    <div data-testid={`page-${routeId}`} className="max-w-[939px]">
      <div className="flex items-center gap-[20px]">
        <button type="button" aria-label="Back" data-testid="monetize-form-back" onClick={() => navigate(backTo)} className="text-white hover:text-accent">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-[24px] font-bold leading-[30px]">{title}</h1>
      </div>
      <div className="mt-[26px] rounded-card bg-surface p-[30px]">
        <div className="flex flex-col gap-[26px]">{children}</div>
        <div className="mt-[30px] flex items-center justify-end gap-[12px] border-t border-line pt-[24px]">{footer}</div>
      </div>
    </div>
  );
}

export function Field({ label, required, info, error, children, htmlFor }: { label: string; required?: boolean; info?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-[12px] flex items-center text-[16px] text-white">
        {label}
        {required && "*"}
        {info && <InfoIcon text={info} />}
      </label>
      {children}
      {error && <p className="mt-[8px] pl-[24px] text-[13px] font-medium text-danger">{error}</p>}
    </div>
  );
}

/** Text input pill (bg #191a1c, r28, h55, 14/900). */
export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { invalid, className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`h-[55px] w-full rounded-pill bg-bg px-[24px] text-[14px] font-black text-white outline-none placeholder:font-bold placeholder:text-muted focus:ring-1 focus:ring-accent ${invalid ? "ring-1 ring-danger" : ""} ${className}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  const { invalid, className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`min-h-[140px] w-full rounded-[20px] bg-bg px-[24px] py-[17px] text-[14px] font-medium leading-[21px] text-white outline-none placeholder:text-muted focus:ring-1 focus:ring-accent ${invalid ? "ring-1 ring-danger" : ""} ${className}`}
    />
  );
}

/** Selectable chips: 1px accent outline; filled accent when selected (REF). */
export function ChipChoice<T extends string>({
  options,
  value,
  onToggle,
  testid,
  multi,
}: {
  options: T[];
  value: T[];
  onToggle: (v: T) => void;
  testid: string;
  multi?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-[10px]" role={multi ? "group" : "radiogroup"}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={on}
            data-testid={`${testid}-${o.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            onClick={() => onToggle(o)}
            className={`inline-flex h-[40px] items-center rounded-pill border border-accent px-[20px] text-[14px] font-bold text-white ${on ? "bg-accent" : "hover:bg-accent-tint"}`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** Square checkbox with red outline / red fill + check (Ads pane). */
export function Checkbox({ checked, onChange, label, testid, children }: { checked: boolean; onChange: () => void; label: string; testid: string; children?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-[12px]">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} aria-label={label} data-testid={testid} />
      <span className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[3px] border-2 ${checked ? "border-accent bg-accent" : "border-accent"}`}>
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
      {children}
    </label>
  );
}

/** Local file picker (keeps only the file name; nothing is uploaded). */
export function FilePick({ value, onChange, accept, testid, label = "Choose File" }: { value?: string; onChange: (name: string, file: File) => void; accept?: string; testid: string; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-[16px]">
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0].name, e.target.files[0])} />
      <Pill onClick={() => ref.current?.click()} data-testid={testid}>
        {label}
      </Pill>
      <span className="text-[14px] text-muted">{value || "No file chosen"}</span>
    </div>
  );
}

/** Quantity stepper (pill bg #191a1c; − dark red, + accent). */
export function Stepper({ value, min = 1, max = 100, onChange, testid }: { value: number; min?: number; max?: number; onChange: (v: number) => void; testid: string }) {
  return (
    <div className="inline-flex h-[44px] items-center rounded-[74px] bg-bg p-[4px]">
      <button
        type="button"
        aria-label="Decrease"
        data-testid={`${testid}-minus`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-accent text-white disabled:bg-[#8b1a1a] disabled:text-white/70"
      >
        <Minus size={16} strokeWidth={3} />
      </button>
      <span className="w-[56px] text-center text-[16px] font-extrabold" data-testid={`${testid}-value`}>
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase"
        data-testid={`${testid}-plus`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-accent text-white disabled:opacity-60"
      >
        <Plus size={18} strokeWidth={3} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ public pages */

/** Public column: 966px wide, centred (no sidebar in the "public" layout). */
export function PublicPage({ routeId, children }: { routeId: string; children: ReactNode }) {
  return (
    <div data-testid={`page-${routeId}`} className="mx-auto w-full max-w-[966px] pt-[38px]">
      {children}
    </div>
  );
}

/** Header row: ← · optional 32px avatar · title (24/700 for list pages; 18/400 breadcrumb on detail pages). */
export function PublicHeader({
  crumbs,
  avatar,
  size = "lg",
  info,
}: {
  crumbs: { label: string; to?: string }[];
  avatar?: boolean;
  size?: "lg" | "sm";
  info?: string;
}) {
  const { back } = useRouter();
  const pic = useData((d) => d.account.avatar);
  return (
    <div className="flex min-h-[34px] items-center gap-[12px]">
      <button type="button" aria-label="Go back" data-testid="public-back" onClick={back} className="mr-[4px] text-white hover:text-accent">
        <ArrowLeft size={24} />
      </button>
      {avatar && <Avatar src={pic} size={32} ring={1} />}
      <h1 className={size === "lg" ? "text-[24px] font-bold leading-[30px]" : "text-[18px] font-normal leading-[24px]"}>
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && " > "}
            {c.to ? (
              <Link to={c.to} className="hover:text-accent">
                {c.label}
              </Link>
            ) : (
              <span className={i === crumbs.length - 1 ? "breadcrumb-current" : ""}>{c.label}</span>
            )}
          </span>
        ))}
      </h1>
      {info && <InfoIcon text={info} />}
    </div>
  );
}

/** Share button (red circle). Uses the clipboard; no network. */
export function ShareButton({ size = 40, testid }: { size?: number; testid: string }) {
  const toast = useToast();
  return (
    <RedCircle
      label="Share"
      size={size}
      data-testid={testid}
      onClick={() => {
        navigator.clipboard?.writeText(window.location.href).catch(() => {});
        toast("Link copied to clipboard");
      }}
    >
      <Share2 size={size * 0.45} />
    </RedCircle>
  );
}

/** Skeleton block (grey bar). */
export function Skel({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-[#7a7a7a] motion-reduce:animate-none ${className}`} />;
}

/** Small kebab / popover menu. */
export function MenuPopover({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, onClose, open);
  if (!open) return null;
  return (
    <div ref={ref} role="menu" className="absolute right-0 top-[44px] z-30 min-w-[165px] rounded-[6px] bg-[#272a2b] py-[6px] shadow-[0_4px_12px_rgba(0,0,0,.45)]">
      {children}
    </div>
  );
}

/** Compact ng-select pill (status filter, collection filter, month/year). */
export function MiniSelect({
  value,
  options,
  onChange,
  testid,
  width = 125,
  height = 40,
  label,
  className = "font-bold text-[14px]",
  placeholder,
}: {
  value: string | null;
  options: string[];
  onChange: (v: string) => void;
  testid: string;
  width?: number;
  height?: number;
  label: string;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  return (
    <div ref={ref} className="relative" style={{ width }}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid={testid}
        onClick={() => setOpen((o) => !o)}
        style={{ height }}
        className={`flex w-full items-center justify-between rounded-pill bg-surface pl-[20px] pr-[20px] text-white ${className}`}
      >
        <span className="truncate">{value ?? placeholder}</span>
        <ChevronDownIcon open={open} />
      </button>
      {open && (
        <ul role="listbox" className="absolute left-0 right-0 z-30 mt-[6px] max-h-[260px] overflow-y-auto rounded-panel bg-surface py-[8px] shadow-[0_4px_12px_rgba(0,0,0,.4)]">
          {options.map((o) => (
            <li key={o}>
              <button
                type="button"
                role="option"
                aria-selected={o === value}
                data-testid={`${testid}-opt-${o.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
                className={`flex h-[35px] w-full items-center px-[20px] text-left text-[14px] hover:bg-accent ${o === value ? "bg-accent font-bold" : ""}`}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
