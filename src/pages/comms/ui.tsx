/**
 * Comms-area primitives: pill tabs with count badge, search pill, spinner, skeleton bars, a modal shell
 * whose title can hold an icon, a confirm modal (Confirm tier), FAQ accordion and a counted textarea.
 */
import { useEffect, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader, Minus, Plus, Search, X } from "lucide-react";
import { Button, TextButton } from "../../platform/ui/controls";

/** Magenta count badge (#d2006b, 24px circle, 12px/700). */
export function CountBadge({ n, className = "" }: { n: number; className?: string }) {
  if (n <= 0) return null;
  return (
    <span aria-label={`${n} unread`} className={`inline-flex h-[24px] min-w-[24px] items-center justify-center rounded-full bg-danger px-[4px] text-[12px] font-normal text-white ${className}`}>
      {n}
    </span>
  );
}

/**
 * Page-level pill tab (Activity ALL/UNREAD, Messages MESSAGES/SETUP AUTOMATED MESSAGES, Resources tabs):
 * 40px tall, radius 28, 14px uppercase; active = accent. `weight` mirrors the source (Resources inactive tabs are 400).
 */
export function PillTab({
  active,
  children,
  onClick,
  testid,
  inactiveWeight = "font-bold",
  activeWeight = "font-bold",
  badge,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  testid: string;
  inactiveWeight?: string;
  activeWeight?: string;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-testid={testid}
      onClick={onClick}
      className={`relative inline-flex h-[40px] items-center gap-[10px] whitespace-nowrap rounded-pill px-[20px] text-[14px] uppercase tracking-caps text-white ${
        active ? `bg-accent ${activeWeight}` : `bg-surface ${inactiveWeight} hover:brightness-125`
      }`}
    >
      {children}
      {badge}
    </button>
  );
}

/** Search pill: #3a3d3f, radius 20, magnifier. `tone="accent-icon"` = red magnifier (Resources / Help). */
export function SearchPill({
  value,
  onChange,
  placeholder = "Search",
  testid,
  className = "",
  height = 40,
  redIcon,
  bg = "bg-search",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  testid: string;
  className?: string;
  height?: number;
  redIcon?: boolean;
  bg?: string;
}) {
  return (
    <label className={`flex items-center gap-[12px] rounded-[28px] ${bg} px-[16px] ${className}`} style={{ height }}>
      <Search size={redIcon ? 20 : 18} strokeWidth={redIcon ? 2.4 : 2.6} className={redIcon ? "shrink-0 fill-accent/70 text-accent/70" : "shrink-0 fill-white text-white"} />
      <input
        data-testid={testid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-[0px] flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-muted"
      />
    </label>
  );
}

export function Spinner({ size = 36 }: { size?: number }) {
  const reduce = useReducedMotion();
  return <Loader size={size} className={`text-white/70 ${reduce ? "" : "animate-spin [animation-duration:1.4s]"}`} aria-label="Loading" />;
}

/** Grey skeleton block (#6b6b6b-ish). */
export function Bone({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={`bg-[#6b6b6b] ${className}`} style={style} />;
}

/**
 * Modal shell (dark overlay .7, #272a2b panel, radius 30, title 20/700, X, divider). Title is a ReactNode so it can carry
 * an info icon. Escape closes.
 */
export function CommsModal({
  open,
  onClose,
  title,
  children,
  width = 500,
  top = 80,
  testid,
  footer,
  bodyClass = "px-[30px] py-[20px]",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  width?: number;
  top?: number;
  testid: string;
  footer?: ReactNode;
  bodyClass?: string;
}) {
  useEscape(open, onClose);
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-[0px] z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-[16px] pb-[20px]"
          style={{ paddingTop: top }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <div role="dialog" aria-modal="true" data-testid={testid} style={{ width }} className="max-w-full rounded-card bg-surface">
            <div className="flex items-center justify-between border-b border-black/40 px-[30px] pb-[18px] pt-[22px]">
              <h2 className="flex items-center text-[20px] font-bold">{title}</h2>
              <button aria-label="Close" data-testid={`${testid}-close`} onClick={onClose} className="text-white hover:text-accent">
                <X size={26} />
              </button>
            </div>
            <div className={bodyClass}>{children}</div>
            {footer && <div className="flex items-center justify-end gap-[16px] px-[30px] pb-[28px]">{footer}</div>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useEscape(active: boolean, fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && ref.current();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [active]);
}

/** Confirm-tier step: explicit approval before a send/activate (inferred styling: REF modal pattern). */
export function ConfirmModal({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  testid,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  testid: string;
}) {
  return (
    <CommsModal
      open={open}
      onClose={onCancel}
      title={title}
      testid={testid}
      width={450}
      top={160}
      footer={
        <>
          <TextButton data-testid={`${testid}-cancel`} onClick={onCancel}>
            Cancel
          </TextButton>
          <Button data-testid={`${testid}-confirm`} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[14px] leading-[22px] text-soft">{children}</div>
    </CommsModal>
  );
}

/** FAQ accordion row (#272a2b, r12, 76px header, square +/- icon; open = divider + answer). */
export function FaqItem({
  q,
  children,
  open,
  onToggle,
  testid,
}: {
  q: string;
  children: ReactNode;
  open: boolean;
  onToggle: () => void;
  testid: string;
}) {
  return (
    <div className="rounded-tile bg-surface" data-testid={testid}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex h-[76px] w-full items-center justify-between gap-[16px] px-[24px] text-left text-[16px] tracking-[0.2px] text-white"
      >
        <span>{q}</span>
        <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center border-2 border-white">
          {open ? <Minus size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
        </span>
      </button>
      {open && <div className="space-y-[24px] border-t border-bg px-[40px] pb-[40px] pt-[38px] text-[16px] leading-[24px] tracking-[0.2px] text-white">{children}</div>}
    </div>
  );
}

/** Textarea with "N Characters left" helper (12px italic, right). */
export function CountedTextarea({
  value,
  onChange,
  max = 1000,
  testid,
  className = "",
  ...rest
}: { value: string; onChange: (v: string) => void; max?: number; testid: string } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value">) {
  return (
    <div>
      <textarea
        {...rest}
        data-testid={testid}
        value={value}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
        className={`block w-full resize-y bg-bg px-[24px] py-[22px] text-[14px] font-bold text-white outline-none placeholder:text-muted focus:ring-1 focus:ring-accent ${className}`}
      />
      <p className="mt-[6px] pr-[8px] text-right text-[12px] italic text-white">{max - value.length} Characters left</p>
    </div>
  );
}

/** Simple local disclosure state for a list of FAQ items. */
export function useOpenSet() {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  return [open, toggle] as const;
}

/** Thin accent scrollbar used by the Messages panels and modal lists. */
export const SCROLL =
  "[scrollbar-width:thin] [scrollbar-color:rgb(var(--configThemeColorRgb))_transparent] [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-thumb]:bg-accent";

export const money = (n: number) => `$${n.toFixed(2)}`;
