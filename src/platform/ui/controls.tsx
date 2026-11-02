/**
 * Form controls and buttons, recreated from References/topfan-reference (see DESIGN_NOTES §5).
 */
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { Check, ChevronDown, Info } from "lucide-react";
import { useToast } from "./toast";

type Btn = ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode };

/** Red pill, 14/900 uppercase, h40, padding 8px 20px. Disabled = opacity .65. (REF; P30) */
export function Button({ icon, className = "", children, ...rest }: Btn) {
  return (
    <button
      {...rest}
      className={`inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-pill bg-accent px-5 text-sm font-black uppercase tracking-caps text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-[.65] disabled:hover:brightness-100 ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

/** Transparent, 1px accent, accent 13/900 (P50 DESKTOP PREVIEW). */
export function OutlineButton({ icon, className = "", children, ...rest }: Btn) {
  return (
    <button
      {...rest}
      className={`inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-accent bg-transparent px-5 text-[13px] font-black uppercase tracking-caps text-accent hover:bg-accent-tint ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

/** "BACK" / "Cancel": white 14/900 uppercase, no fill (REF modal; OB step 2). */
export function TextButton({ className = "", children, ...rest }: Btn) {
  return (
    <button
      {...rest}
      className={`inline-flex h-10 items-center px-4 text-sm font-black uppercase tracking-caps text-white hover:text-accent ${className}`}
    >
      {children}
    </button>
  );
}

/** Accent circle with a white glyph (globe, trash, camera, share). */
export function IconCircle({ size = 42, className = "", children, ...rest }: Btn & { size?: number }) {
  return (
    <button
      {...rest}
      style={{ width: size, height: size }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent text-white hover:brightness-110 ${className}`}
    >
      {children}
    </button>
  );
}

/** Preferences chip tab: h42, padding 13px, r28, 13px uppercase; active = accent/900 (P30). */
export function ChipTab({ active, children, ...rest }: Btn & { active?: boolean }) {
  return (
    <button
      {...rest}
      className={`h-[42px] whitespace-nowrap rounded-pill px-[13px] text-[13px] uppercase tracking-caps text-white ${
        active ? "bg-accent font-black" : "bg-surface font-medium hover:brightness-125"
      }`}
    >
      {children}
    </button>
  );
}

/** Red filled "i" + popover (#272a2b, 1px accent, r8, 280 wide) (P30, P50). */
export function InfoIcon({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useOutside(ref, () => setOpen(false), open);
  return (
    <span ref={ref} className="relative ml-2 inline-flex">
      <button
        type="button"
        aria-label="More info"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white"
      >
        <Info size={12} strokeWidth={3} className="[&>circle]:hidden" />
      </button>
      {open && (
        <span className="absolute left-0 top-6 z-30 w-[280px] rounded-popover border border-accent bg-surface px-5 py-2.5 text-sm font-normal leading-5 text-white shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

export function Label({ children, required, info, htmlFor }: { children: ReactNode; required?: boolean; info?: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-4 flex items-center text-base font-normal text-white">
      {children}
      {required && "*"}
      {info && <InfoIcon text={info} />}
    </label>
  );
}

/** Input: bg #191a1c (inside card), r28, h55, padding 17px 24px, value 14/900 (P30).
 *  tone="surface" = #272a2b, for inputs sitting on a #191a1c inner section (P50 Logo Text). */
export function Input({
  className = "",
  invalid,
  tone = "bg",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; tone?: "bg" | "surface" }) {
  return (
    <input
      {...rest}
      className={`h-[55px] w-full rounded-pill ${tone === "surface" ? "bg-surface" : "bg-bg"} px-6 text-sm font-black text-white outline-none placeholder:font-bold placeholder:text-muted focus:ring-1 focus:ring-accent disabled:opacity-70 ${
        invalid ? "ring-1 ring-danger" : ""
      } ${className}`}
    />
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-2 pl-6 text-[13px] font-medium text-danger">{children}</p>;
}

/** ng-select look: #191a1c pill h56, chevron; panel r20, selected/hover row = accent (P30, P50b). */
export function Select({
  value,
  options,
  placeholder,
  onChange,
  invalid,
  id,
  tone = "bg",
}: {
  value: string | null;
  options: string[];
  placeholder?: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  id?: string;
  tone?: "bg" | "surface";
}) {
  const fill = tone === "surface" ? "bg-surface" : "bg-bg";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-14 w-full items-center justify-between rounded-pill ${fill} pl-6 pr-5 text-left text-sm font-black text-white ${
          invalid ? "ring-1 ring-danger" : ""
        } ${open ? "ring-1 ring-accent" : ""}`}
      >
        <span className={value ? "" : "font-bold text-muted"}>{value ?? placeholder}</span>
        <ChevronDown size={20} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className={`absolute left-0 right-0 top-[66px] z-30 max-h-[260px] overflow-y-auto rounded-panel ${fill} py-2.5 pr-[5px] shadow-[0_4px_12px_rgba(0,0,0,.3)]`}
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
                className={`flex h-[35px] w-full items-center px-5 text-left text-sm hover:bg-accent ${
                  o === value ? "bg-accent font-bold" : ""
                }`}
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

/** Checked = filled accent circle + white check; unchecked = 1px accent outline (P50 Site Logo). */
export function Radio({ checked, onChange, children, name }: { checked: boolean; onChange: () => void; children: ReactNode; name: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-3 text-base text-white">
      <input id={id} type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${
          checked ? "bg-accent" : "border border-accent"
        }`}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
      {children}
    </label>
  );
}

/** Outline pill 22x14; off grey #9198ab, on accent (REF). */
export function Toggle({ on, onChange, label }: { on: boolean; onChange?: () => void; label?: string }) {
  return (
    <button type="button" onClick={onChange} aria-pressed={on} aria-label={label} className="inline-flex items-center">
      <span className={`relative h-[14px] w-[22px] rounded-full border ${on ? "border-accent" : "border-toggle-off"}`}>
        <span
          className={`absolute top-[2px] h-2 w-2 rounded-full transition-all ${on ? "left-[11px] bg-accent" : "left-[2px] bg-toggle-off"}`}
        />
      </span>
    </button>
  );
}

/** Read-only pill with an inline red "Copy" (P50 Domain Details). */
export function CopyField({ value }: { value: string }) {
  const toast = useToast();
  return (
    <div className="flex h-[55px] items-center rounded-pill bg-bg pl-6 pr-6">
      <span className="min-w-0 flex-1 truncate font-mono text-sm font-bold text-white/70">{value}</span>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value).catch(() => {});
          toast("Copied to clipboard");
        }}
        className="ml-4 shrink-0 text-lg font-semibold text-accent hover:brightness-125"
      >
        Copy
      </button>
    </div>
  );
}

export function useOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && onOutside();
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [active, onOutside, ref]);
}
