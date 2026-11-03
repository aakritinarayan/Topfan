/** Content Autopilot panel kit: the panel's own buttons, cards and helpers (shared by review and planning). */
import type { ReactNode } from "react";
import { ArrowLeft, BarChart3, FileText, Image as ImageIcon, Video } from "lucide-react";
import { act } from "../../store/store";
import type { APDraft } from "../../store/slices/autopilot";

export const btnPrimary = "h-9 rounded-pill bg-accent px-4 text-[13px] font-black uppercase tracking-caps hover:brightness-110 disabled:opacity-50";
export const btnOutline = "h-9 rounded-full border border-accent px-4 text-[13px] font-black uppercase tracking-caps text-accent hover:bg-accent-tint disabled:opacity-50";
export const btnText = "h-9 px-2 text-[13px] font-bold text-soft underline-offset-2 hover:text-white hover:underline";

export const fmtSlot = (iso: string) => new Date(iso).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
export const TYPE_LABEL: Record<APDraft["type"], string> = { text: "Text", poll: "Poll", images: "Image", video: "Video" };
export const TypeIcon = ({ t }: { t: APDraft["type"] }) => (t === "poll" ? <BarChart3 size={14} /> : t === "images" ? <ImageIcon size={14} /> : t === "video" ? <Video size={14} /> : <FileText size={14} />);

export function Card({ children, testid }: { children: ReactNode; testid?: string }) {
  return (
    <section data-testid={testid} className="rounded-[20px] bg-surface p-4 text-sm leading-5">
      {children}
    </section>
  );
}

export function Header({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {onBack && (
        <button onClick={onBack} aria-label="Back" data-testid="ap-back" className="flex h-7 w-7 items-center justify-center rounded-full text-soft hover:bg-bg hover:text-white">
          <ArrowLeft size={16} />
        </button>
      )}
      <h3 className="flex-1 text-[15px] font-bold">{title}</h3>
    </div>
  );
}

export const run = (label: string, fn: Parameters<typeof act>[1]) => act(`autopilot.${label}`, fn, { need: "content.write" });
