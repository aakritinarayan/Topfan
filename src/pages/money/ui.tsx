/**
 * Area primitives for Wallet + Insights & Fans (15-wallet, 16-insights-fans).
 */
import { useRef, useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown, Search, type LucideIcon } from "lucide-react";
import { Button, OutlineButton, TextButton, useOutside } from "../../platform/ui/controls";

/* ---------------- formatting ---------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-11-01" → "Nov 1, 2026" (no timezone shifts). */
export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
/** "2026-11-01" → "November 1, 2026" (chart axis). */
export const fmtDateLong = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${d}, ${y}`;
};
/** "2026-08-15T06:47" → "Aug 15, 2026 6:47 AM". */
export function fmtDateTime(iso: string) {
  const [h, min] = iso.slice(11, 16).split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${fmtDate(iso)} ${hh}:${String(min).padStart(2, "0")} ${ap}`;
}
export const usd = (n: number, cur: "USD" | "EUR" = "USD") =>
  `${n < 0 ? "-" : ""}${cur === "EUR" ? "€" : "$"}${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const signedUsd = (n: number) => (n >= 0 ? `+${usd(n)}` : usd(n));

/** Local file download of CSV text (no network). */
export function downloadCsv(name: string, rows: (string | number)[][]) {
  const text = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------------- pills, badges, tabs ---------------- */

/** Magenta count badge inside a pill: 22px circle, 12px (15 Layout). */
export function CountBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span aria-label={`${n} pending`} className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-danger px-[4px] text-[12px] font-normal text-white">
      {n}
    </span>
  );
}

/** Wallet / Monetize-style tab pill: h40, r28, 14px uppercase; inactive surface/400, active accent/900. */
export function TabPill({
  active,
  children,
  onClick,
  testid,
  bold,
  icon,
  href,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
  testid: string;
  /** Insights tabs are 700 in both states. */
  bold?: boolean;
  icon?: ReactNode;
  href?: string;
}) {
  const cls = `inline-flex h-[40px] items-center gap-[10px] whitespace-nowrap rounded-pill px-[20px] text-[14px] uppercase tracking-caps text-white transition-[filter] ${
    active ? "bg-accent font-black" : `bg-surface ${bold ? "font-bold" : "font-normal"} hover:brightness-125`
  }`;
  if (href)
    return (
      <a
        href={href}
        data-testid={testid}
        aria-current={active ? "page" : undefined}
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        className={cls}
      >
        {icon}
        {children}
      </a>
    );
  return (
    <button type="button" role="tab" aria-selected={!!active} data-testid={testid} onClick={onClick} className={cls}>
      {icon}
      {children}
    </button>
  );
}

/* ---------------- selects / filters ---------------- */

/** Small ng-select pill (h40) used for filters: period, type, status. Panel r16, selected row accent. */
export function PillSelect({
  value,
  options,
  onChange,
  placeholder,
  width,
  testid,
  tone = "surface",
  outline,
  className = "",
  panelWidth,
  size = "md",
}: {
  size?: "md" | "lg";
  value: string | null;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  width?: number | string;
  testid: string;
  tone?: "surface" | "bg";
  outline?: boolean;
  className?: string;
  panelWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  const fill = outline ? "border border-[#6b6b6b] bg-transparent" : tone === "surface" ? "bg-surface" : "bg-bg";
  return (
    <div ref={ref} className={`relative ${className}`} style={{ width }}>
      <button
        type="button"
        data-testid={testid}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex ${size === "lg" ? "h-[56px] pl-[20px] pr-[20px]" : "h-[40px] pl-[20px] pr-[16px]"} w-full items-center justify-between gap-[12px] rounded-pill ${fill} text-left text-[14px] font-bold text-white`}
      >
        <span className="truncate">{value ?? placeholder}</span>
        <ChevronDown size={20} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          data-testid={`${testid}-panel`}
          style={{ width: panelWidth }}
          className={`absolute left-0 ${size === "lg" ? "top-[64px]" : "top-[50px]"} z-30 max-h-[280px] min-w-full overflow-y-auto rounded-inner ${tone === "bg" ? "bg-bg" : "bg-surface"} py-[20px] shadow-[0_4px_16px_rgba(0,0,0,.45)]`}
        >
          {options.map((o) => (
            <li key={o}>
              <button
                type="button"
                role="option"
                aria-selected={o === value}
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
                className={`flex min-h-[35px] w-full items-center px-[20px] text-left text-[14px] hover:bg-accent ${o === value ? "bg-accent font-bold" : ""}`}
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

/** Date pill (195×40, surface, red calendar right). Uses the native date picker; no network. */
export function DatePill({
  value,
  onChange,
  placeholder,
  testid,
  width = 195,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder: string;
  testid: string;
  width?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <label className="relative flex h-[40px] cursor-pointer items-center justify-between rounded-pill bg-surface pl-[20px] pr-[16px] text-[14px]" style={{ width }}>
      <span className={value ? "text-white" : "font-medium text-muted"}>{value ? fmtDate(value) : placeholder}</span>
      <button
        type="button"
        aria-label={`Pick ${placeholder}`}
        onClick={() => {
          try {
            ref.current?.showPicker();
          } catch {
            ref.current?.focus();
          }
        }}
        className="text-accent"
      >
        <CalendarDays size={20} />
      </button>
      <input
        ref={ref}
        type="date"
        data-testid={testid}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="pointer-events-none absolute bottom-0 left-[16px] h-0 w-0 opacity-0"
        tabIndex={-1}
        aria-label={placeholder}
      />
    </label>
  );
}

/** Search pill: red magnifier, placeholder grey. */
export function SearchPill({
  value,
  onChange,
  placeholder,
  testid,
  width = 252,
  tone = "surface",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  testid: string;
  width?: number;
  tone?: "surface" | "search";
}) {
  return (
    <label className={`flex h-[40px] items-center gap-[12px] rounded-[20px] ${tone === "search" ? "bg-search" : "bg-surface"} px-[16px]`} style={{ width }}>
      <Search size={20} className="shrink-0 text-accent" strokeWidth={2.5} />
      <input
        data-testid={testid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-muted"
      />
    </label>
  );
}

/* ---------------- tables, empty states, skeletons ---------------- */

/** Table card: surface, r30, padding 30; header 13px uppercase; rows divided by a subtle line. */
export function TableCard({ children, className = "", testid }: { children: ReactNode; className?: string; testid?: string }) {
  return (
    <div data-testid={testid} className={`rounded-card bg-surface px-[30px] pb-[18px] pt-[22px] ${className}`}>
      <table className="w-full table-fixed border-collapse text-left">{children}</table>
    </div>
  );
}
export const Th = ({ children, className = "", w }: { children?: ReactNode; className?: string; w?: string | number }) => (
  <th style={{ width: w }} className={`h-[58px] border-b border-surface-2 pr-[12px] align-middle text-[13px] font-medium uppercase leading-[16px] text-white ${className}`}>
    {children}
  </th>
);
export const Td = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <td className={`border-b border-surface-2 py-[12px] pr-[12px] align-middle text-[14px] ${className}`}>{children}</td>
);

/** Sort arrows ▲▼ next to a header label. */
export function SortHead({ label, dir, onClick, testid }: { label: string; dir: "asc" | "desc" | null; onClick: () => void; testid: string }) {
  return (
    <button type="button" data-testid={testid} onClick={onClick} className="inline-flex items-center gap-[4px] uppercase" aria-label={`Sort by ${label}`}>
      {label}
      <span className="flex flex-col text-[7px] leading-[6px]">
        <span className={dir === "asc" ? "text-accent" : ""}>▲</span>
        <span className={dir === "desc" ? "text-accent" : ""}>▼</span>
      </span>
    </button>
  );
}

/** Empty state: 120px dark-red circle with a red line icon, 18px grey text. */
export function EmptyState({ icon: Icon, text, className = "", testid }: { icon: LucideIcon; text: string; className?: string; testid?: string }) {
  return (
    <div data-testid={testid} className={`flex flex-col items-center justify-center rounded-card bg-surface py-[100px] ${className}`}>
      <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-accent-tint-strong">
        <Icon size={54} strokeWidth={1.6} className="text-accent" />
      </div>
      <p className="mt-[24px] text-[18px] text-soft/80">{text}</p>
    </div>
  );
}

const Bar = ({ w, h = 14, r = 7, className = "" }: { w: number; h?: number; r?: number; className?: string }) => (
  <span className={`block animate-pulse bg-[#4a4b4d] ${className}`} style={{ width: w, height: h, borderRadius: r }} />
);

/** 15x table skeleton: circle + bars + 3 square action placeholders per row. */
export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div data-testid="wallet-table-skeleton" aria-busy="true" className="overflow-hidden rounded-card bg-surface">
      <div className="flex h-[46px] items-center gap-[60px] border-b border-surface-2 px-[20px]">
        {[144, 64, 54, 44, 82, 94, 82].map((w, i) => (
          <Bar key={i} w={w} h={13} r={6} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-[89px] items-center border-b border-surface-2 px-[20px]">
          <span className="block h-[48px] w-[48px] animate-pulse rounded-full bg-[#4a4b4d]" />
          <Bar w={124} className="ml-[12px]" />
          <Bar w={60} h={28} r={14} className="ml-[24px]" />
          <Bar w={40} className="ml-[48px]" />
          <Bar w={18} className="ml-[56px]" />
          <Bar w={70} className="ml-[44px]" />
          <Bar w={50} className="ml-[64px]" />
          <span className="ml-[84px] flex gap-[10px]">
            {[0, 1, 2].map((k) => (
              <span key={k} className="block h-[28px] w-[28px] animate-pulse rounded-[4px] bg-[#4a4b4d]" />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Inline permission / validation message (role blocked etc.). */
export function InlineError({ children, testid }: { children?: ReactNode; testid?: string }) {
  if (!children) return null;
  return (
    <p role="alert" data-testid={testid} className="mt-[12px] text-[13px] font-medium text-danger">
      {children}
    </p>
  );
}

/** Typed confirmation for Protected actions: the user must type `word` exactly. */
export function TypedConfirm({ word, value, onChange, testid }: { word: string; value: string; onChange: (v: string) => void; testid: string }) {
  return (
    <div className="mt-[20px]">
      <label className="mb-[12px] block text-[14px] text-white" htmlFor={testid}>
        Type <b className="font-black tracking-caps">{word}</b> to confirm
      </label>
      <input
        id={testid}
        data-testid={testid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        className="h-[55px] w-full rounded-pill bg-bg px-[24px] text-[14px] font-black text-white outline-none placeholder:font-bold placeholder:text-muted focus:ring-1 focus:ring-accent"
        placeholder={word}
      />
    </div>
  );
}

/* ---------------- px-accurate wrappers around the shared buttons (root font is 14px) ---------------- */

type BtnProps = Parameters<typeof Button>[0];
/** Shared red pill at the captured 40px / 14px. */
export const Btn = ({ className = "", ...p }: BtnProps) => <Button {...p} className={`!h-[40px] !text-[14px] ${className}`} />;
export const OutlineBtn = ({ className = "", ...p }: BtnProps) => <OutlineButton {...p} className={`!h-[40px] !text-[14px] ${className}`} />;
export const TextBtn = ({ className = "", ...p }: BtnProps) => <TextButton {...p} className={`!h-[40px] !text-[14px] ${className}`} />;

/** Form label at 16px (captured), 14px gap below. */
export const FieldLabel = ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="mb-[14px] flex items-center text-[16px] text-white">
    {children}
  </label>
);
