/**
 * Cards, badges, modal, image placeholders (see DESIGN_NOTES §5).
 */
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, CircleCheck, ImageIcon, TriangleAlert, User, X } from "lucide-react";
import { FALLBACK, mediaAlt, mediaSrc, reportMediaError, type MediaKind } from "../../media";

/** #272a2b, r30, padding 30 (REF). */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card bg-surface p-[30px] ${className}`}>{children}</div>;
}

/** #191a1c inner box, r16 (P50 instructions / color sections). */
export function InnerBox({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-inner bg-bg p-6 ${className}`}>{children}</div>;
}

/** Outlined accent pill — used for "STEP 1 OF 3" and status headers (restyle of OB teal pill). */
export function OutlinePill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex h-9 items-center rounded-full border border-accent px-4 text-[13px] font-bold uppercase tracking-caps text-white ${className}`}>
      {children}
    </span>
  );
}

/** Solid accent pill with check icon (P50 ACTIVE). */
export function ActiveBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-[20px] bg-accent px-4 text-[13px] font-semibold uppercase text-white">
      <CircleCheck size={14} />
      {children}
    </span>
  );
}

/** #191a1c pill 13/700 (P50 "Published"). */
export function DarkBadge({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-7 items-center rounded-full bg-bg px-3 text-[13px] font-bold text-white">{children}</span>;
}

/** Red seal with white check, next to the creator name. */
export function VerifiedBadge({ size = 26 }: { size?: number }) {
  return <BadgeCheck size={size} className="shrink-0 fill-accent text-white" strokeWidth={2} />;
}

/** Warning box: replaces the OB yellow banner (no yellow in the platform). */
export function NoticeBox({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-inner border border-accent/60 bg-bg px-5 py-4 text-sm leading-5 text-white ${className}`}>
      <TriangleAlert size={20} className="mt-[-1px] shrink-0 text-accent" />
      <div>{children}</div>
    </div>
  );
}

/**
 * Image slot. `src` is a media key (src/media) or a path; it keeps the slot's size and crops with
 * object-cover. No src = the intended empty placeholder (e.g. an upload field). A file that fails to
 * load is replaced by the content-type fallback and recorded (never an unrelated photo).
 */
export function ImageSlot({ src, label, className = "", rounded = "", kind = "image", fit = "cover", eager }: { src?: string | null; label: string; className?: string; rounded?: string; kind?: MediaKind; fit?: "cover" | "contain"; eager?: boolean }) {
  const url = mediaSrc(src);
  const [failed, setFailed] = useState<string | null>(null);
  if (url) {
    const bad = failed === url;
    return (
      <img
        src={bad ? FALLBACK[kind] : url}
        alt={mediaAlt(src, label)}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        data-media={bad ? "fallback" : "ok"}
        onError={() => !bad && (reportMediaError(url, kind), setFailed(url))}
        className={`bg-placeholder-img ${fit === "contain" ? "object-contain" : "object-cover"} ${rounded} ${className}`}
      />
    );
  }
  return (
    <div aria-label={`${label} placeholder`} className={`flex items-center justify-center bg-placeholder-img text-white/35 ${rounded} ${className}`}>
      <ImageIcon size={28} strokeWidth={1.5} />
    </div>
  );
}

/** Circular avatar with red ring. `src` is a media key or path; failures fall back to the avatar illustration. */
export function Avatar({ src, size, ring = 3, alt = "" }: { src?: string | null; size: number; ring?: number; alt?: string }) {
  const url = mediaSrc(src);
  const [failed, setFailed] = useState<string | null>(null);
  const bad = !!url && failed === url;
  return (
    <div className="shrink-0 rounded-full bg-accent" style={{ width: size, height: size, padding: ring }}>
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-placeholder-img">
        {url ? (
          <img src={bad ? FALLBACK.avatar : url} alt={alt} loading="lazy" decoding="async" onError={() => !bad && (reportMediaError(url, "avatar"), setFailed(url))} className="h-full w-full object-cover" />
        ) : (
          <User size={size * 0.45} className="text-white/40" strokeWidth={1.5} />
        )}
      </div>
    </div>
  );
}

/** Modal: 620 wide, #272a2b, r30, title + X, 1px divider, backdrop .75, Escape closes (REF; P50). */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 620,
  uppercaseTitle,
  divider = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  uppercaseTitle?: boolean;
  divider?: boolean;
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
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[var(--backdrop)] px-4 py-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            style={{ width }}
            className="mt-[60px] max-w-full rounded-card bg-surface"
            initial={{ y: 12 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className={`flex items-center justify-between px-[30px] pb-5 pt-7 ${divider ? "border-b border-line" : ""}`}>
              <h2 className={`text-xl font-bold ${uppercaseTitle ? "uppercase" : ""}`}>{title}</h2>
              <button aria-label="Close" onClick={onClose} className="text-white hover:text-accent">
                <X size={24} />
              </button>
            </div>
            <div className="px-[30px] py-6">{children}</div>
            {footer && <div className="flex items-center justify-end gap-3 px-[30px] pb-7">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
