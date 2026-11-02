/**
 * Preferences B area primitives: info popover anchored the way 52a/54a/55a/56a show it, the DISABLE | ENABLE
 * segmented toggle (app-toggle-enable), back-arrow titles, and the Confirm / Protected modals for risk tiers.
 */
import { useCallback, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { Button, Input, TextButton, useOutside } from "../../platform/ui/controls";
import { Modal } from "../../platform/ui/surfaces";
import { PreferencesPage } from "../../platform/PreferencesPage";
import { useToast } from "../../platform/ui/toast";
import { act, type ActResult, type AppData } from "../../store/store";
import type { Capability } from "../../store/permissions";

/** Button / TextButton / Input at the measured px sizes (the shared primitives use rem, root is 14px). */
export function Pill({ className = "", ...rest }: ComponentProps<typeof Button>) {
  return <Button {...rest} className={`!h-[40px] !px-[20px] !text-[14px] ${className}`} />;
}
export function PlainButton({ className = "", ...rest }: ComponentProps<typeof TextButton>) {
  return <TextButton {...rest} className={`!h-[40px] !text-[14px] ${className}`} />;
}
export function Field({ className = "", ...rest }: ComponentProps<typeof Input>) {
  return <Input {...rest} className={`!text-[14px] ${className}`} />;
}

/** Page root: test id + the Preferences title and chips. */
export function PrefPage({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div data-testid={`page-${id}`}>
      <PreferencesPage>{children}</PreferencesPage>
    </div>
  );
}

/**
 * 16px red "i". Click toggles a 280-wide popover (#272a2b, 1px accent, r8) that opens below the icon with its
 * right edge on the icon (as captured). Escape / outside click close it. `align="left"` opens rightwards.
 */
export function InfoPop({ children, testid, align = "right" }: { children: ReactNode; testid: string; align?: "right" | "left" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutside(ref, close, open);
  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label="More info"
        aria-expanded={open}
        data-testid={testid}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-[16px] w-[16px] items-center justify-center rounded-full bg-accent text-white"
      >
        <Info size={12} strokeWidth={3} className="[&>circle]:hidden" />
      </button>
      {open && (
        <span
          role="tooltip"
          data-testid={`${testid}-popover`}
          className={`absolute top-[26px] z-40 w-[280px] rounded-popover border border-accent bg-surface px-[20px] py-[10px] text-left text-[13px] font-normal normal-case leading-[19px] tracking-normal text-white shadow-lg ${
            align === "right" ? "right-[-8px]" : "left-[-8px]"
          }`}
        >
          {children}
        </span>
      )}
    </span>
  );
}

/** DISABLE | ENABLE segmented toggle (52, 56): each half ~90x36, 13/900; active half = accent, other = #191a1c. */
export function EnableToggle({ on, onChange, testid, tone = "bg" }: { on: boolean; onChange: (on: boolean) => void; testid: string; tone?: "bg" | "surface" }) {
  const off = tone === "bg" ? "bg-bg" : "bg-surface";
  return (
    <div className="flex" role="group" aria-label="Enable or disable" data-testid={testid}>
      <button
        type="button"
        aria-pressed={!on}
        data-testid={`${testid}-disable`}
        onClick={() => onChange(false)}
        className={`h-[36px] min-w-[88px] rounded-l-pill px-[18px] text-[13px] font-black uppercase tracking-caps ${on ? off : "bg-accent"}`}
      >
        Disable
      </button>
      <button
        type="button"
        aria-pressed={on}
        data-testid={`${testid}-enable`}
        onClick={() => onChange(true)}
        className={`h-[36px] min-w-[86px] rounded-r-pill px-[18px] text-[13px] font-black uppercase tracking-caps ${on ? "bg-accent" : off}`}
      >
        Enable
      </button>
    </div>
  );
}

/** "← Title" row used by the add/edit/detail views (54b, 55b, 53b). */
export function BackTitle({ title, onBack, testid, weight = "medium", right }: { title: string; onBack: () => void; testid: string; weight?: "medium" | "bold"; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-[12px]">
        <button type="button" aria-label="Back" data-testid={testid} onClick={onBack} className="text-white hover:text-accent">
          <ArrowLeft size={22} />
        </button>
        <h4 className={`text-[24px] ${weight === "bold" ? "font-bold" : "font-medium"}`}>{title}</h4>
      </div>
      {right}
    </div>
  );
}

/** Run a permission-checked write and report failure in a toast. Returns the result. */
export function useWrite() {
  const toast = useToast();
  return useCallback(
    (label: string, fn: (d: AppData) => void, need: Capability, success?: string): ActResult => {
      const res = act(label, fn, { need });
      if (!res.ok) toast(res.reason);
      else if (success) toast(success);
      return res;
    },
    [toast],
  );
}

/** Confirm tier: explicit confirmation modal before the write. */
export function ConfirmModal({
  open, title, children, confirmLabel, onConfirm, onClose, testid,
}: { open: boolean; title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; onClose: () => void; testid: string }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <PlainButton onClick={onClose} data-testid={`${testid}-cancel`}>Cancel</PlainButton>
          <Pill onClick={onConfirm} data-testid={`${testid}-confirm`}>{confirmLabel}</Pill>
        </>
      }
    >
      <div data-testid={testid} className="text-[16px] leading-6">{children}</div>
    </Modal>
  );
}

/**
 * Protected tier: confirmation modal + typed confirmation (must match `phrase` exactly; mock check).
 * inferred: copy and layout follow the Pause Account warning pattern (38), the product has no captured example.
 */
export function ProtectedModal({
  open, title, children, phrase, confirmLabel, onConfirm, onClose, testid,
}: { open: boolean; title: string; children: ReactNode; phrase: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; testid: string }) {
  const [typed, setTyped] = useState("");
  const ok = typed.trim() !== "" && typed.trim() === phrase;
  const close = () => {
    setTyped("");
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      footer={
        <>
          <PlainButton onClick={close} data-testid={`${testid}-cancel`}>Cancel</PlainButton>
          <Pill
            disabled={!ok}
            data-testid={`${testid}-confirm`}
            onClick={() => {
              setTyped("");
              onConfirm();
            }}
          >
            {confirmLabel}
          </Pill>
        </>
      }
    >
      <div data-testid={testid}>
        <div className="text-[16px] leading-6">{children}</div>
        <label htmlFor={`${testid}-input`} className="mb-[12px] mt-[20px] block text-[16px]">
          Type <span className="font-bold">{phrase}</span> to confirm *
        </label>
        <Field
          id={`${testid}-input`}
          data-testid={`${testid}-input`}
          value={typed}
          autoComplete="off"
          onChange={(e) => setTyped(e.target.value)}
          placeholder={phrase}
        />
      </div>
    </Modal>
  );
}

/** Small switch + status word ("Active" / "Inactive"), as in the gamification tables. */
export function StatusSwitch({ on, onChange, testid, offLabel = "Inactive" }: { on: boolean; onChange: () => void; testid: string; offLabel?: string }) {
  return (
    <button type="button" onClick={onChange} aria-pressed={on} data-testid={testid} className="inline-flex items-center gap-[8px] text-[14px] text-white">
      <span className={`relative h-[14px] w-[22px] rounded-full border ${on ? "border-accent" : "border-toggle-off"}`}>
        <span className={`absolute top-[2px] h-[8px] w-[8px] rounded-full transition-all ${on ? "left-[11px] bg-accent" : "left-[2px] bg-toggle-off"}`} />
      </span>
      {on ? "Active" : offLabel}
    </button>
  );
}
