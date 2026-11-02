/**
 * Preferences A primitives (area-only). Built on src/platform/ui; measurements from specs 30–38.
 */
import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { Check, Eye, EyeOff, Info } from "lucide-react";
import { act } from "../../store/store";
import type { AppData } from "../../store/store";
import type { Capability } from "../../store/permissions";
import { Button, Input, TextButton, Toggle, useOutside } from "../../platform/ui/controls";
import { Modal } from "../../platform/ui/surfaces";
import { FALLBACK, mediaSrc, reportMediaError } from "../../media";
import { useToast } from "../../platform/ui/toast";

/** Runs a store write and reports failures (role/permission) in a toast. Returns ok. */
export function useRun() {
  const toast = useToast();
  return useCallback(
    (label: string, fn: (d: AppData) => void, need?: Capability, success?: string) => {
      const res = act(label, fn, need ? { need } : {});
      if (!res.ok) {
        toast(res.reason);
        return false;
      }
      if (success) toast(success);
      return true;
    },
    [toast],
  );
}

/** `.walletform-content` card with the `.walletform-title` header (16px uppercase, 1px #191a1c rule). */
export function PrefCard({
  title,
  info,
  children,
  className = "",
  testid,
  weight = "font-normal",
}: {
  title?: ReactNode;
  info?: ReactNode;
  children: ReactNode;
  className?: string;
  testid?: string;
  weight?: string;
}) {
  return (
    <section data-testid={testid} className={`rounded-card bg-surface p-[30px] ${className}`}>
      {title && (
        <div className={`flex items-center border-b border-bg pb-5 text-base uppercase leading-5 ${weight}`}>
          <h3>{title}</h3>
          {info}
        </div>
      )}
      {children}
    </section>
  );
}

/** `.preference-privacy-row`: label left, control right, margin-top 26px. */
export function PrefRow({ label, info, right, testid }: { label: ReactNode; info?: ReactNode; right: ReactNode; testid?: string }) {
  return (
    <div data-testid={testid} className="mt-[26px] flex min-h-[18px] items-center justify-between gap-4">
      <p className="flex items-center text-sm">
        {label}
        {info}
      </p>
      <div className="flex shrink-0 items-center">{right}</div>
    </div>
  );
}

/** Platform Toggle with a test hook. */
export function TToggle({ on, onChange, label, testid }: { on: boolean; onChange: () => void; label: string; testid: string }) {
  return (
    <span data-testid={testid} data-on={on} className="inline-flex">
      <Toggle on={on} onChange={onChange} label={label} />
    </span>
  );
}

/** Red "i" + popover (bg surface, 1px accent, r8, 280 wide) that accepts rich content and alignment. */
export function InfoPop({
  children,
  testid,
  align = "center",
  width = 280,
  className = "ml-3",
  onOpen,
}: {
  children: ReactNode;
  testid: string;
  align?: "left" | "center" | "right";
  width?: number;
  className?: string;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutside(ref, close, open);
  const pos = align === "left" ? "right-[-8px]" : align === "right" ? "left-[-8px]" : "left-1/2 -translate-x-1/2";
  return (
    <span ref={ref} className={`relative inline-flex normal-case ${className}`}>
      <button
        type="button"
        aria-label="More info"
        aria-expanded={open}
        data-testid={testid}
        onClick={(e) => {
          e.stopPropagation();
          if (onOpen) return onOpen();
          setOpen((o) => !o);
        }}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white"
      >
        <Info size={12} strokeWidth={3} className="[&>circle]:hidden" />
      </button>
      {open && (
        <span
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          style={{ width }}
          className={`absolute top-[26px] z-30 block cursor-default rounded-popover border border-accent bg-surface px-5 py-2.5 text-left text-sm font-normal leading-5 tracking-normal text-white shadow-lg ${pos}`}
        >
          <span
            aria-hidden
            className={`absolute -top-[6px] h-[10px] w-[10px] rotate-45 border-l border-t border-accent bg-surface ${
              align === "left" ? "right-[11px]" : align === "right" ? "left-[11px]" : "left-1/2 -translate-x-1/2"
            }`}
          />
          {children}
        </span>
      )}
    </span>
  );
}

/** Grey skeleton bar (31a / 35a). */
export function Skel({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-white/30 motion-reduce:animate-none ${className}`} />;
}

/** 20×20 round checkbox, 1px accent ring; check when checked (P35). */
export function RoundCheck({ checked, onChange, label, testid }: { checked: boolean; onChange: () => void; label: ReactNode; testid: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-3 text-sm">
      <input id={id} data-testid={testid} type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent ${checked ? "bg-accent" : ""}`}>
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
      {label}
    </label>
  );
}

/** DISABLE | ENABLE segmented toggle (P31). */
export function SegToggle({ enabled, onChange, testid }: { enabled: boolean; onChange: (v: boolean) => void; testid: string }) {
  const cls = "h-9 px-[18px] text-[13px] font-black uppercase tracking-caps text-white";
  return (
    <div role="radiogroup" aria-label="Welcome video" className="inline-flex">
      <button
        type="button"
        role="radio"
        aria-checked={!enabled}
        data-testid={`${testid}-disable`}
        onClick={() => onChange(false)}
        className={`${cls} rounded-l-pill ${!enabled ? "bg-accent" : "bg-surface"}`}
      >
        Disable
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={enabled}
        data-testid={`${testid}-enable`}
        onClick={() => onChange(true)}
        className={`${cls} rounded-r-pill ${enabled ? "bg-accent" : "bg-surface"}`}
      >
        Enable
      </button>
    </div>
  );
}

/** Selectable outline chip: 1px accent, filled when selected (P32 / P33a). */
export function SelectChip({
  selected,
  onClick,
  children,
  testid,
  size = "md",
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  testid: string;
  size?: "md" | "lg";
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-testid={testid}
      onClick={onClick}
      className={`whitespace-nowrap rounded-pill border border-accent text-sm font-black tracking-caps text-white transition-colors ${
        size === "lg" ? "h-[43px] px-[30px]" : "h-[41px] px-[25px]"
      } ${selected ? "bg-accent" : "bg-transparent hover:bg-accent-tint"}`}
    >
      {children}
    </button>
  );
}

/** Password input with the eye-slash visibility toggle (P38). Value is never persisted. */
export function PasswordField({
  value,
  onChange,
  testid,
  id,
  invalid,
  autoComplete = "current-password",
}: {
  value: string;
  onChange: (v: string) => void;
  testid: string;
  id?: string;
  invalid?: boolean;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        invalid={invalid}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
        className="pr-[52px]"
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        data-testid={`${testid}-eye`}
        onClick={() => setShow((s) => !s)}
        className="absolute right-[26px] top-1/2 -translate-y-1/2 text-white"
      >
        {show ? <Eye size={22} /> : <EyeOff size={22} />}
      </button>
    </div>
  );
}

/**
 * Protected-tier confirmation (build conventions › Risk tiers): a modal that requires the password
 * and/or a typed phrase before the confirm button enables. Mock check: any non-empty password,
 * and the phrase must match exactly what is shown.
 */
export function ProtectedModal({
  open,
  onClose,
  title,
  testid,
  children,
  confirmLabel,
  onConfirm,
  phrase,
  password = true,
  cancelLabel = "Cancel",
  width = 620,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  testid: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  phrase?: string;
  password?: boolean;
  cancelLabel?: string;
  width?: number;
}) {
  const [pw, setPw] = useState("");
  const [typed, setTyped] = useState("");
  const pwId = useId();
  const phId = useId();
  const valid = (!password || pw.trim().length > 0) && (!phrase || typed.trim() === phrase);
  const close = () => {
    setPw("");
    setTyped("");
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      width={width}
      footer={
        <>
          <TextButton data-testid={`${testid}-cancel`} onClick={close}>
            {cancelLabel}
          </TextButton>
          <Button
            data-testid={`${testid}-confirm`}
            disabled={!valid}
            onClick={() => {
              onConfirm();
              setPw("");
              setTyped("");
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div data-testid={`modal-${testid}`}>
        <div className="text-sm leading-[22px]">{children}</div>
        {phrase && (
          <div className="mt-6">
            <label htmlFor={phId} className="mb-4 block text-base">
              Type <span className="font-black">{phrase}</span> to confirm *
            </label>
            <Input id={phId} data-testid={`${testid}-phrase`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </div>
        )}
        {password && (
          <div className="mt-6">
            <label htmlFor={pwId} className="mb-4 block text-base">
              Enter Password *
            </label>
            <PasswordField id={pwId} value={pw} onChange={setPw} testid={`${testid}-password`} />
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Two-button confirm modal (Confirm tier). */
export function ConfirmModal({
  open,
  onClose,
  title,
  testid,
  children,
  confirmLabel = "Yes",
  cancelLabel = "No",
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  testid: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <TextButton data-testid={`${testid}-cancel`} onClick={onClose}>
            {cancelLabel}
          </TextButton>
          <Button data-testid={`${testid}-confirm`} className="min-w-[120px]" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div data-testid={`modal-${testid}`} className="text-sm leading-[22px]">
        {children}
      </div>
    </Modal>
  );
}

/** 28px creator avatar with a thin accent ring (P35 / P38 lists). `src` = media key; initials when absent. */
export function MiniAvatar({ name, src }: { name: string; src?: string | null }) {
  const url = mediaSrc(src);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent p-px">
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-placeholder-img text-[10px] font-bold text-white/70">
        {url ? <img src={url} alt="" loading="lazy" decoding="async" onError={(e) => (reportMediaError(url, "avatar"), (e.currentTarget.src = FALLBACK.avatar))} className="h-full w-full object-cover" /> : initials}
      </span>
    </span>
  );
}
