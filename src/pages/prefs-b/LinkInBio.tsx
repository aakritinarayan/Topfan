/**
 * Preferences › Link In Bio (52). View: /edit-preference/link-in-bio. Edit: /edit-preference/link-in-bio/add-link-in-bio.
 * Captured: header, URL row, referral switch + popovers, desktop/mobile preview, edit toolbar, NEW ACTION menu,
 * Colors & Themes popover, trash/drag handles. inferred: the add-action modal fields, custom palette editor,
 * theme effect on the preview, camera uploads (local object URLs only), the social-row pencil target, skeleton.
 * Saving publishes the public page, so SAVE CHANGES asks for confirmation (Confirm tier).
 */
import { useMemo, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import {
  Camera, ChevronDown, Disc3, Ghost, Globe, Hand, Menu, Monitor, Music, Pencil, Smartphone, Trash2, Zap,
} from "lucide-react";
import { Link, useRouter } from "../../app/router";
import { pathFor } from "../../app/routeCatalog";
import { FieldError, useOutside } from "../../platform/ui/controls";
import { Avatar, ImageSlot, Modal } from "../../platform/ui/surfaces";
import { useToast } from "../../platform/ui/toast";
import { creator as demoCreator } from "../../config/demo";
import { useData, useMockLoading } from "../../store/store";
import { welcomeVideoOf } from "../../store/slices/social";
import { VideoPlayer } from "../../platform/ui/media";
import {
  LIB_NEW_ACTIONS, LIB_PALETTES, LIB_THEMES, makeBioAction, saveLinkInBio, setLinkInBioEnabled, setLinkInBioReferral,
  type BioAction, type LinkInBioState,
} from "../../store/slices/prefsB";
import type { PageProps } from "../types";
import { ConfirmModal, EnableToggle, InfoPop, PrefPage, useWrite, Pill, PlainButton, Field } from "./ui";

type Draft = Pick<LinkInBioState, "palette" | "customPalette" | "theme" | "actions">;
type Device = "desktop" | "mobile";

/** Palette 0 follows the creator's white-label theme (so the accent is never hard-coded). */
function usePalettes(): string[][] {
  const t = useData((d) => d.account.theme);
  return useMemo(() => [[t.bg, t.text, t.secondaryBg, t.text, t.accent, t.buttonText], ...LIB_PALETTES.slice(1)], [t]);
}

function Swatch({ colors, className = "" }: { colors: string[]; className?: string }) {
  return (
    <span className={`flex overflow-hidden rounded-[4px] ${className}`} aria-hidden>
      {colors.map((c, i) => (
        <span key={i} className="h-full flex-1" style={{ background: c }} />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ preview */

interface PV { bg: string; text: string; post: string; postText: string; btn: string; btnText: string }
const pv = (p: string[]): PV => ({ bg: p[0], text: p[1], post: p[2], postText: p[3], btn: p[4], btnText: p[5] });

const THEME_BG: Record<string, string> = {
  NATURE: "radial-gradient(circle at 20% 10%, rgba(60,140,70,.35), transparent 55%)",
  SPACE: "radial-gradient(circle at 80% 0%, rgba(90,70,200,.35), transparent 55%)",
  SPEED: "repeating-linear-gradient(115deg, rgba(255,255,255,.04) 0 12px, transparent 12px 40px)",
  CALM: "linear-gradient(180deg, rgba(120,180,220,.18), transparent 60%)",
  VINTAGE: "linear-gradient(180deg, rgba(170,120,60,.22), transparent 70%)",
  GAMING: "repeating-linear-gradient(0deg, rgba(0,255,170,.05) 0 2px, transparent 2px 24px)",
  DREAMY: "radial-gradient(circle at 30% 20%, rgba(240,140,220,.25), transparent 60%)",
  DOODLE: "radial-gradient(rgba(255,255,255,.06) 1.5px, transparent 1.5px) 0 0/18px 18px",
  "POLYGONS/BLUE": "linear-gradient(135deg, rgba(40,90,200,.3), transparent 60%)",
  "POLYGONS/GREEN": "linear-gradient(135deg, rgba(40,160,90,.3), transparent 60%)",
  "POLYGONS/WHITE": "linear-gradient(135deg, rgba(255,255,255,.18), transparent 60%)",
  "POLYGONS/GRAY": "linear-gradient(135deg, rgba(140,140,140,.25), transparent 60%)",
};

const SOCIALS: { label: string; glyph: ReactNode }[] = [
  { label: "X", glyph: <span className="text-[11px] font-bold">X</span> },
  { label: "Facebook", glyph: <span className="text-[12px] font-bold">f</span> },
  { label: "Instagram", glyph: <Camera size={11} /> },
  { label: "TikTok", glyph: <Music size={11} /> },
  { label: "Snapchat", glyph: <Ghost size={11} /> },
  { label: "LinkedIn", glyph: <span className="text-[10px] font-bold">in</span> },
  { label: "Spotify", glyph: <Disc3 size={11} /> },
  { label: "Website", glyph: <Globe size={11} /> },
];

function BioCard({ c, edit, cover, avatar, onCover, onAvatar, name, bio }: { c: PV; edit: boolean; cover: string | null; avatar: string | null; onCover: () => void; onAvatar: () => void; name: string; bio: string }) {
  return (
    <div className="w-full rounded-[20px] p-[10px] pb-[16px]" style={{ background: c.post, color: c.postText }} data-testid="pref-lib-bio-card">
      <div className="relative">
        <ImageSlot src={cover} label="Cover image" className="h-[165px] w-full" rounded="rounded-[10px]" />
        {edit && (
          <button type="button" aria-label="Change cover image" data-testid="pref-lib-cover-camera" onClick={onCover} className="absolute right-[12px] top-[12px] flex h-[40px] w-[40px] items-center justify-center rounded-full" style={{ background: c.bg, color: c.btn }}>
            <Camera size={18} />
          </button>
        )}
      </div>
      <div className="-mt-[26px] flex flex-col items-center">
        <div className="rounded-full p-[3px]" style={{ background: c.bg }}>
          <div className="h-[92px] w-[92px] overflow-hidden rounded-full">
            <ImageSlot src={avatar} label="Avatar" className="h-full w-full" rounded="rounded-full" />
          </div>
        </div>
        {edit && (
          <button type="button" aria-label="Change profile photo" data-testid="pref-lib-avatar-camera" onClick={onAvatar} className="-mt-[8px] mb-[4px]" style={{ color: c.btn }}>
            <Camera size={14} />
          </button>
        )}
        <p className="mt-[12px] text-[18px] font-bold">{name}</p>
      </div>
      <p className="mt-[16px] rounded-[6px] border px-[10px] py-[8px] text-[14px] leading-[21px] tracking-[.2px]" style={{ borderColor: c.btn }}>{bio}</p>
      <div className="relative mt-[16px] flex items-center justify-center gap-[18px]" style={{ color: c.btn }}>
        {SOCIALS.map((s) => (
          <span key={s.label} aria-label={s.label} className="flex h-[20px] w-[20px] items-center justify-center rounded-[5px] border opacity-80" style={{ borderColor: c.btn }}>
            {s.glyph}
          </span>
        ))}
        {edit && (
          // inferred: social links live in Profile
          <Link to={pathFor("pref-profile")} aria-label="Edit social links" data-testid="pref-lib-social-edit" className="absolute right-[4px] flex h-[30px] w-[30px] items-center justify-center rounded-full bg-surface-2">
            <Pencil size={14} />
          </Link>
        )}
      </div>
    </div>
  );
}

function ActionCard({ a, c, name }: { a: BioAction; c: PV; name: string }) {
  const [qty, setQty] = useState(1);
  const avatar = useData((d) => d.account.avatar);
  const welcomeVideo = useData(welcomeVideoOf);
  const pill = "inline-flex h-[34px] items-center rounded-full px-[26px] text-[11px] font-black uppercase";
  const box: CSSProperties = { borderColor: c.btn, background: c.bg, color: c.text };
  if (a.kind === "welcome-video") {
    return (
      <div className="rounded-[10px] border-2 p-[20px]" style={box}>
        <div className="flex items-center gap-[12px]">
          <span className="flex h-[40px] w-[40px] items-center justify-center rounded-full" style={{ background: c.post, color: c.btn }}><Hand size={18} /></span>
          <span className="text-[14px] font-medium uppercase tracking-[.4px]">{a.title}</span>
        </div>
        <p className="mt-[16px] text-[14px] font-medium leading-6">{a.text}</p>
        <VideoPlayer video={welcomeVideo} label="Welcome video" className="mt-[16px] h-[205px] w-full" rounded="rounded-[18px]" />
      </div>
    );
  }
  if (a.kind === "store-item") {
    return (
      <div className="flex gap-[24px] rounded-[10px] border-2 p-[16px]" style={box}>
        <ImageSlot src={a.image} kind="product" label={a.title} className="h-[132px] w-[110px] shrink-0" rounded="rounded-[14px]" />
        <div className="flex-1 rounded-[6px] p-[20px]" style={{ background: c.post, color: c.postText }}>
          <p className="text-[16px] font-bold">{a.title}</p>
          {a.text && <p className="mt-[2px] text-[12px] leading-[18px]">{a.text}</p>}
          <p className="mt-[16px] text-[12px] font-bold">Current Price</p>
          <p className="mt-[8px] text-[20px] font-semibold">${(a.price ?? 0).toFixed(2)}</p>
          <div className="mt-[16px] inline-flex h-[44px] items-center gap-[4px] rounded-full px-[4px]" style={{ background: c.bg }}>
            <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-[36px] w-[36px] disabled:opacity-50 items-center justify-center rounded-full text-[12px]" style={{ background: c.btn, color: c.btnText }}>–</button>
            <span className="w-[36px] text-center text-[14px] font-bold">{qty}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => q + 1)} className="flex h-[36px] w-[36px] items-center justify-center rounded-full text-[12px]" style={{ background: c.btn, color: c.btnText }}>+</button>
          </div>
          <div className="mt-[48px]">
            <span className={pill} style={{ background: c.btn, color: c.btnText }}>Buy Now</span>
          </div>
        </div>
      </div>
    );
  }
  if (a.kind === "fundraiser") {
    return (
      <div className="rounded-[10px] border-2 p-[20px]" style={box}>
        <div className="flex items-center gap-[10px]">
          <Avatar src={avatar} size={40} ring={2} />
          <span className="text-[14px] font-bold">{name}</span>
        </div>
        <p className="mt-[20px] text-[16px] font-medium leading-6">{a.text}</p>
        <div className="mt-[16px] rounded-[10px] p-[16px]" style={{ background: c.post, color: c.postText }}>
          <p className="text-[14px] font-bold">Fundraiser</p>
          <div className="mt-[12px] h-[8px] overflow-hidden rounded-full" style={{ background: c.bg }}>
            <div className="h-full w-[5%]" style={{ background: c.btn }} />
          </div>
          <div className="mt-[8px] flex justify-between text-[12px]">
            <span><b>${(a.price ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</b> Raised So Far</span>
            <span><b>$25,000.00</b> Goal</span>
          </div>
          <div className="mt-[16px] flex items-center justify-between rounded-[8px] px-[12px] py-[8px] text-[12px]" style={{ background: c.bg }}>
            <span>Bronze <b>$100.00</b></span>
            <span style={{ color: c.btn }}>See Gifts</span>
          </div>
        </div>
      </div>
    );
  }
  // general / feed / portfolio / event / external (inferred card)
  return (
    <div className="rounded-[10px] border-2 p-[20px]" style={box}>
      <p className="text-[16px] font-bold">{a.title}</p>
      {a.text && <p className="mt-[8px] text-[14px] leading-[21px]">{a.text}</p>}
      {a.price != null && <p className="mt-[12px] text-[18px] font-semibold">${a.price.toFixed(2)}</p>}
      <span className={`${pill} mt-[16px]`} style={{ background: c.btn, color: c.btnText }}>
        {a.kind === "event" ? "Get Tickets" : a.kind === "external" ? "Visit" : "View"}
      </span>
    </div>
  );
}

function Preview({ device, draft, palettes, edit, onDraft, loading }: { device: Device; draft: Draft; palettes: string[][]; edit: boolean; onDraft: (d: Draft) => void; loading: boolean }) {
  const c = pv(draft.palette === -1 ? draft.customPalette : palettes[draft.palette] ?? palettes[0]);
  const name = useData((d) => d.account.name);
  const identity = useData((d) => ({ avatar: d.account.avatar, cover: d.account.cover }));
  const [cover, setCover] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<"cover" | "avatar">("cover");
  const dragFrom = useRef<number | null>(null);
  const toast = useToast();
  const pick = (t: "cover" | "avatar") => {
    target.current = t;
    fileRef.current?.click();
  };
  const bg: CSSProperties = { background: draft.theme ? `${THEME_BG[draft.theme]}, ${c.bg}` : c.bg, color: c.text };

  const bio = (
    <BioCard c={c} edit={edit} cover={cover ?? identity.cover} avatar={avatar ?? identity.avatar} onCover={() => pick("cover")} onAvatar={() => pick("avatar")} name={name} bio={demoCreator.bio} />
  );
  const move = (from: number, to: number) => {
    if (from === to) return;
    const actions = draft.actions.slice();
    const [x] = actions.splice(from, 1);
    actions.splice(to, 0, x);
    onDraft({ ...draft, actions });
  };
  const cards = draft.actions.map((a, i) => (
    <div
      key={a.id}
      className="flex items-center gap-[12px]"
      data-testid={`pref-lib-action-${a.id}`}
      onDragOver={edit ? (e: DragEvent) => e.preventDefault() : undefined}
      onDrop={edit ? () => dragFrom.current != null && move(dragFrom.current, i) : undefined}
    >
      <div className="min-w-[0px] flex-1">
        <ActionCard a={a} c={c} name={name} />
      </div>
      {edit && (
        <div className="flex w-[52px] shrink-0 items-center gap-[8px] text-accent">
          <button type="button" aria-label={`Delete ${a.title}`} data-testid={`pref-lib-action-delete-${a.id}`} onClick={() => onDraft({ ...draft, actions: draft.actions.filter((x) => x.id !== a.id) })}>
            <Trash2 size={17} className="fill-accent/30" />
          </button>
          <button
            type="button"
            draggable
            aria-label={`Reorder ${a.title} (Alt+Arrow keys)`}
            data-testid={`pref-lib-action-drag-${a.id}`}
            onDragStart={() => (dragFrom.current = i)}
            onKeyDown={(e) => {
              if (e.altKey && e.key === "ArrowUp" && i > 0) move(i, i - 1);
              if (e.altKey && e.key === "ArrowDown" && i < draft.actions.length - 1) move(i, i + 1);
            }}
            className="cursor-grab"
          >
            <Menu size={20} />
          </button>
        </div>
      )}
    </div>
  ));

  const footer = (
    <div className="flex flex-col items-center gap-[8px] pb-[20px] pt-[16px] text-[14px]" style={{ color: c.btn }}>
      <a href="#" onClick={(e) => (e.preventDefault(), toast("Preview only: on your live page this link takes fans to TopFan's site."))} data-testid="pref-lib-get-platform">Get Your Own Platform</a>
      <span className="flex items-center gap-[4px] text-[13px] font-medium tracking-[.5px] opacity-90"><Zap size={13} />TOP<b>FAN</b></span>
    </div>
  );

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        data-testid="pref-lib-file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const url = URL.createObjectURL(f); // local only, never uploaded
          (target.current === "cover" ? setCover : setAvatar)(url);
          e.target.value = "";
        }}
      />
      {loading ? (
        <div className="mt-[16px] flex gap-[40px] rounded-[8px] bg-bg p-[20px]" data-testid="pref-lib-skeleton" aria-busy="true">
          <div className="h-[420px] w-[47%] max-w-[408px] rounded-[20px] bg-[#6b6b6d]/50" />
          <div className="flex flex-1 flex-col gap-[16px]">
            {[0, 1, 2].map((i) => <div key={i} className="h-[130px] rounded-[10px] bg-[#6b6b6d]/50" />)}
          </div>
        </div>
      ) : device === "desktop" ? (
        <div className={`${edit ? "mt-[12px]" : "mt-[16px]"} overflow-hidden rounded-[8px]`} style={bg} data-testid="pref-lib-canvas-desktop">
          <div className="flex gap-[34px] pl-[20px] pr-[20px] pt-[20px]">
            <div className="flex h-[900px] w-[47%] max-w-[408px] shrink-0 items-center">{bio}</div>
            <div className="lib-scroll h-[900px] flex-1 overflow-y-auto pr-[12px]">
              <div className="flex flex-col gap-[30px] pb-[24px]">{cards}</div>
            </div>
          </div>
          {footer}
        </div>
      ) : (
        <div className={`${edit ? "mt-[12px]" : "mt-[16px]"} mx-auto w-[400px] rounded-[8px] px-[20px] pt-[20px]`} style={bg} data-testid="pref-lib-canvas-mobile">
          {bio}
          <div className="mt-[24px] flex flex-col gap-[24px]">{cards}</div>
          {footer}
        </div>
      )}
      <style>{`.lib-scroll{scrollbar-width:thin;scrollbar-color:${c.btn} transparent}.lib-scroll::-webkit-scrollbar{width:2px}.lib-scroll::-webkit-scrollbar-thumb{background:${c.btn}}`}</style>
    </>
  );
}

/* ------------------------------------------------------------------ edit toolbar pieces */

function ColorsThemes({ draft, palettes, onDraft }: { draft: Draft; palettes: string[][]; onDraft: (d: Draft) => void }) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  const current = draft.palette === -1 ? draft.customPalette : palettes[draft.palette] ?? palettes[0];
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-testid="pref-lib-colors"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-[44px] items-center gap-[12px] rounded-[6px] bg-surface pl-[12px] pr-[12px] text-[12px] font-black uppercase"
      >
        Select Colors and Themes
        <span className="flex h-[32px] items-center gap-[6px] rounded-[6px] bg-bg px-[6px]">
          <Swatch colors={current} className="h-[24px] w-[85px]" />
          <ChevronDown size={18} className="text-accent" />
        </span>
      </button>
      {open && (
        <div className="absolute left-[-20px] top-[52px] z-40 w-[345px] rounded-panel border border-accent bg-surface p-[16px]" data-testid="pref-lib-colors-popover">
          <h5 className="text-[18px] font-semibold">Colors &amp; Themes</h5>
          <div className="mt-[16px] rounded-inner bg-bg p-[16px]">
            <p className="text-[14px] font-medium tracking-[.3px]">Standard Color Palettes:</p>
            <div className="mt-[10px] grid grid-cols-3 gap-[10px]">
              {palettes.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Palette ${i + 1}`}
                  aria-pressed={draft.palette === i}
                  data-testid={`pref-lib-palette-${i}`}
                  onClick={() => onDraft({ ...draft, palette: i })}
                  className={`rounded-[5px] p-[2px] ${draft.palette === i ? "ring-2 ring-accent" : ""}`}
                >
                  <Swatch colors={p} className="h-[26px] w-full" />
                </button>
              ))}
            </div>
          </div>
          <div className="mt-[20px] rounded-inner bg-bg p-[16px]">
            <p className="text-[14px] font-medium tracking-[.3px]">Make a Custom Color Palette:</p>
            <div className="mt-[10px] flex items-center justify-between">
              <button
                type="button"
                aria-label="Use custom palette"
                aria-pressed={draft.palette === -1}
                data-testid="pref-lib-palette-custom"
                onClick={() => onDraft({ ...draft, palette: -1 })}
                className={`rounded-[5px] p-[2px] ${draft.palette === -1 ? "ring-2 ring-accent" : ""}`}
              >
                <Swatch colors={draft.customPalette} className="h-[26px] w-[82px]" />
              </button>
              <button type="button" aria-label="Edit custom palette" data-testid="pref-lib-palette-custom-edit" onClick={() => setCustomOpen((o) => !o)} className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-surface-2">
                <Pencil size={15} />
              </button>
            </div>
            {customOpen && (
              // inferred: native colour inputs (REFERENCE "Colour picker")
              <div className="mt-[12px] grid grid-cols-6 gap-[8px]">
                {["Page bg", "Bg text", "Post bg", "Post text", "Button", "Button text"].map((label, i) => (
                  <input
                    key={label}
                    type="color"
                    aria-label={label}
                    title={label}
                    value={draft.customPalette[i]}
                    onChange={(e) => {
                      const customPalette = draft.customPalette.slice();
                      customPalette[i] = e.target.value;
                      onDraft({ ...draft, customPalette, palette: -1 });
                    }}
                    className="h-[28px] w-full cursor-pointer rounded border-0 bg-transparent p-[0px]"
                  />
                ))}
              </div>
            )}
          </div>
          <div className="mt-[20px] rounded-inner bg-bg p-[16px]">
            <p className="text-[14px] font-medium tracking-[.3px]">Available Themes:</p>
            <div className="mt-[12px] flex flex-wrap gap-x-[8px] gap-y-[10px]">
              {LIB_THEMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={draft.theme === t}
                  data-testid={`pref-lib-theme-${t.toLowerCase().replace("/", "-")}`}
                  onClick={() => onDraft({ ...draft, theme: draft.theme === t ? null : t })}
                  className={`h-[36px] rounded-full px-[15px] text-[12px] font-medium uppercase tracking-[.4px] ${draft.theme === t ? "bg-accent" : "bg-surface"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewAction({ onPick }: { onPick: (kind: BioAction["kind"], label: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-testid="pref-lib-new-action"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-[44px] items-center gap-[6px] rounded-full border border-accent px-[15px] text-[12px] font-black uppercase text-accent"
      >
        New Action <ChevronDown size={16} />
      </button>
      {open && (
        <ul className="absolute right-[-12px] top-[46px] z-40 w-[305px] rounded-panel border border-accent bg-surface px-[20px] py-[12px]" data-testid="pref-lib-new-action-menu">
          {LIB_NEW_ACTIONS.map((a) => (
            <li key={a.kind}>
              <button
                type="button"
                data-testid={`pref-lib-new-action-${a.kind}`}
                onClick={() => {
                  setOpen(false);
                  onPick(a.kind, a.label);
                }}
                className="flex h-[44px] w-full items-center text-left text-[16px] hover:text-accent"
              >
                {a.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** inferred: app-general-action-edit-modal (fields not captured). */
function AddActionModal({ pending, onClose, onAdd }: { pending: { kind: BioAction["kind"]; label: string } | null; onClose: () => void; onAdd: (a: BioAction) => void }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [extra, setExtra] = useState("");
  const [touched, setTouched] = useState(false);
  const priced = pending && ["store-item", "event"].includes(pending.kind);
  const linked = pending && ["general", "external"].includes(pending.kind);
  const err = title.trim() ? null : "Title is required";
  const close = () => {
    setTitle("");
    setText("");
    setExtra("");
    setTouched(false);
    onClose();
  };
  return (
    <Modal
      open={!!pending}
      onClose={close}
      title={pending ? pending.label.replace(/^\+ /, "") : ""}
      footer={
        <>
          <PlainButton onClick={close} data-testid="modal-pref-lib-action-cancel">Cancel</PlainButton>
          <Pill
            data-testid="modal-pref-lib-action-add"
            onClick={() => {
              setTouched(true);
              if (err || !pending) return;
              onAdd(makeBioAction(pending.kind, title.trim(), {
                text: text.trim() || undefined,
                price: priced && extra ? Number(extra) || 0 : undefined,
                url: linked && extra ? extra.trim() : undefined,
              }));
              close();
            }}
          >
            Add
          </Pill>
        </>
      }
    >
      <div data-testid="modal-pref-lib-action" className="flex flex-col gap-[16px]">
        <div>
          <label htmlFor="lib-a-title" className="mb-[12px] block text-[16px]">Title*</label>
          <Field id="lib-a-title" data-testid="modal-pref-lib-action-title" placeholder="Enter Title" value={title} invalid={touched && !!err} onChange={(e) => setTitle(e.target.value)} />
          <FieldError>{touched ? err : null}</FieldError>
        </div>
        <div>
          <label htmlFor="lib-a-text" className="mb-[12px] block text-[16px]">Description</label>
          <Field id="lib-a-text" data-testid="modal-pref-lib-action-text" placeholder="Write Description" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        {(priced || linked) && (
          <div>
            <label htmlFor="lib-a-extra" className="mb-[12px] block text-[16px]">{priced ? "Price (USD)" : "Link URL"}</label>
            <Field id="lib-a-extra" data-testid="modal-pref-lib-action-extra" type={priced ? "number" : "url"} placeholder={priced ? "0.00" : "https://example.com"} value={extra} onChange={(e) => setExtra(e.target.value)} />
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ page */

function DeviceToggle({ device, setDevice }: { device: Device; setDevice: (d: Device) => void }) {
  const cls = (on: boolean) => `flex h-[30px] w-[42px] items-center justify-center rounded-[4px] text-accent ${on ? "bg-[#2f3133]" : ""}`;
  return (
    <div className="flex h-[40px] w-[100px] items-center justify-between rounded-[6px] bg-bg p-[5px]" role="group" aria-label="Preview device">
      <button type="button" aria-label="Mobile preview" aria-pressed={device === "mobile"} data-testid="pref-lib-device-mobile" className={cls(device === "mobile")} onClick={() => setDevice("mobile")}>
        <Smartphone size={17} />
      </button>
      <button type="button" aria-label="Desktop preview" aria-pressed={device === "desktop"} data-testid="pref-lib-device-desktop" className={cls(device === "desktop")} onClick={() => setDevice("desktop")}>
        <Monitor size={19} />
      </button>
    </div>
  );
}

export function LinkInBioPage({ route }: PageProps) {
  const edit = route.id === "pref-link-in-bio-edit";
  const { navigate } = useRouter();
  const toast = useToast();
  const write = useWrite();
  const lib = useData((d) => d.prefsB.linkInBio);
  const handle = useData((d) => d.account.handle);
  const domain = useData((d) => d.account.whiteLabel.domain);
  const palettes = usePalettes();
  const loading = useMockLoading(700);
  const [device, setDevice] = useState<Device>("desktop");
  const saved: Draft = useMemo(() => ({ palette: lib.palette, customPalette: lib.customPalette, theme: lib.theme, actions: lib.actions }), [lib]);
  const [draft, setDraft] = useState<Draft>(saved);
  const [pending, setPending] = useState<{ kind: BioAction["kind"]; label: string } | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const shown = edit ? draft : saved;
  const url = `https://www.${domain}/bio/${handle}`;

  return (
    <PrefPage id={route.id}>
      <div className="-mt-[10px] flex items-center justify-between">
        <h4 className="flex items-center gap-[8px] text-[24px] font-bold">
          Link In Bio
          <InfoPop testid="pref-lib-info">
            A great way to generate more revenue and build your own fan database, is to link to your personal TopFan page from your other social media profiles. You can use your While Label Site URL or create a simplified Link In Bio page using our free generator.
          </InfoPop>
        </h4>
        <EnableToggle
          on={lib.enabled}
          testid="pref-lib-enable"
          tone="surface"
          onChange={(v) => v !== lib.enabled && write("prefsB.setLinkInBioEnabled", (d) => setLinkInBioEnabled(d, v), "content.write")}
        />
      </div>

      <div className="mt-[27px] flex items-center justify-between">
        <div className="flex items-center gap-[12px]">
          <input readOnly value={url} aria-label="Link In Bio URL" data-testid="pref-lib-url" className="h-[40px] w-[312px] rounded-[50px] bg-surface px-[24px] text-[16px] text-muted outline-none" />
          <Pill
            data-testid="pref-lib-copy"
            onClick={() => {
              navigator.clipboard?.writeText(url).catch(() => {});
              toast("Copied to clipboard");
            }}
          >
            Copy Link
          </Pill>
        </div>
        <div className="flex items-center gap-[10px]">
          <InfoPop testid="pref-lib-referral-info">
            By enabling this option, a special link will be listed at the bottom of your Link In Bio. When other Creators click this and signup for their own platform, you'll receive a significant commission into your wallet.
            <br />
            More details can be found{" "}
            <Link to={pathFor("wallet-referrals")} className="text-accent" data-testid="pref-lib-referral-here">here</Link>.
          </InfoPop>
          <span className="text-[16px] font-medium">Include My Referral Link</span>
          {/* 52: the switch track is accent-outlined even when off */}
          <button
            type="button"
            aria-pressed={lib.includeReferral}
            aria-label="Include My Referral Link"
            data-testid="pref-lib-referral"
            onClick={() => write("prefsB.setLinkInBioReferral", (d) => setLinkInBioReferral(d, !lib.includeReferral), "content.write")}
            className="relative h-[14px] w-[22px] rounded-full border border-accent"
          >
            <span className={`absolute top-[2px] h-[8px] w-[8px] rounded-full bg-accent transition-all ${lib.includeReferral ? "left-[11px]" : "left-[2px]"}`} />
          </button>
        </div>
      </div>

      <div className="mt-[17px] rounded-card bg-surface p-[28px]" data-testid="pref-lib-preview">
        <div className="flex h-[40px] items-center justify-between">
          <span className={`w-[260px] text-[18px] uppercase ${edit ? "font-bold" : ""}`}>Preview</span>
          <DeviceToggle device={device} setDevice={setDevice} />
          <div className="flex w-[260px] items-center justify-end gap-[8px]">
            {edit ? (
              <>
                <PlainButton
                  data-testid="pref-lib-discard"
                  onClick={() => {
                    setDraft(saved);
                    navigate(pathFor("pref-link-in-bio"));
                  }}
                >
                  Discard
                </PlainButton>
                <Pill data-testid="pref-lib-save" onClick={() => setConfirmSave(true)}>Save Changes</Pill>
              </>
            ) : (
              <Pill
                icon={<Pencil size={16} />}
                data-testid="pref-lib-edit"
                className="!px-[22px]"
                onClick={() => {
                  setDraft(saved);
                  navigate(pathFor("pref-link-in-bio-edit"));
                }}
              >
                Edit
              </Pill>
            )}
          </div>
        </div>

        {edit && (
          <div className="mt-[22px] flex items-center justify-between rounded-[8px] bg-bg p-[8px]" data-testid="pref-lib-toolbar">
            <ColorsThemes draft={draft} palettes={palettes} onDraft={setDraft} />
            <NewAction onPick={(kind, label) => setPending({ kind, label })} />
          </div>
        )}

        <Preview device={device} draft={shown} palettes={palettes} edit={edit} onDraft={setDraft} loading={loading} />
      </div>

      <AddActionModal pending={pending} onClose={() => setPending(null)} onAdd={(a) => setDraft((d) => ({ ...d, actions: [...d.actions, a] }))} />
      <ConfirmModal
        open={confirmSave}
        title="Publish Link In Bio"
        confirmLabel="Save Changes"
        testid="modal-pref-lib-save"
        onClose={() => setConfirmSave(false)}
        onConfirm={() => {
          const res = write("prefsB.saveLinkInBio", (d) => saveLinkInBio(d, draft), "content.write", "Link In Bio saved");
          setConfirmSave(false);
          if (res.ok) navigate(pathFor("pref-link-in-bio"));
        }}
      >
        {/* inferred confirm (Confirm tier: publishing to a public page) */}
        Your changes will be published to {url}.
      </ConfirmModal>
    </PrefPage>
  );
}
