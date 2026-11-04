/**
 * Preferences › Link In Bio (52). View: /edit-preference/link-in-bio. Edit: /edit-preference/link-in-bio/add-link-in-bio.
 * Captured: header, URL row, referral switch + popovers, desktop/mobile preview, edit toolbar, NEW ACTION menu,
 * Colors & Themes popover, trash/drag handles. inferred: the add-action modal fields, custom palette editor,
 * theme effect on the preview, camera uploads (local object URLs only), the social-row pencil target, skeleton.
 * Saving publishes the public page, so SAVE CHANGES asks for confirmation (Confirm tier).
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import {
  ArrowLeft, Camera, Check, ChevronDown, ChevronUp, Disc3, Ghost, Globe, Hand, Link2, Menu, Monitor, Music, Pencil, Pipette, Search, ShoppingBag, Smartphone, Trash2, X, Zap,
} from "lucide-react";
import { Link, useRouter } from "../../app/router";
import { pathFor } from "../../app/routeCatalog";
import { FieldError, Radio, useOutside } from "../../platform/ui/controls";
import { Avatar, ImageSlot, Modal } from "../../platform/ui/surfaces";
import { useToast } from "../../platform/ui/toast";
import { creator as demoCreator } from "../../config/demo";
import { act, getData, useData, useMockLoading } from "../../store/store";
import { itemById, publicBase } from "../../store/slices/content";
import { applyBio, applySocials, bioSaved, markInEditor, sameUrl, validUrl } from "../../store/slices/bio";
import { welcomeVideoOf } from "../../store/slices/social";
import { VideoPlayer } from "../../platform/ui/media";
import {
  LIB_DEFAULT_SOCIALS, LIB_NEW_ACTIONS, LIB_PALETTES, LIB_SOCIALS, LIB_THEMES, makeBioAction, saveLinkInBio, setLinkInBioEnabled, setLinkInBioReferral,
  type BioAction, type LibSocialKey, type LinkInBioState,
} from "../../store/slices/prefsB";
import type { PageProps } from "../types";
import { ConfirmModal, EnableToggle, InfoPop, PrefPage, useWrite, Pill, PlainButton, Field } from "./ui";

type Socials = Partial<Record<LibSocialKey, string>>;
type Draft = Pick<LinkInBioState, "palette" | "customPalette" | "theme" | "actions"> & { bio: string; socials: Socials };
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

/** Brand marks are not in the icon set: simple glyphs stand in (as before). */
const SOCIAL_GLYPH: Record<LibSocialKey, (size: number) => ReactNode> = {
  x: (z) => <span style={{ fontSize: z }} className="font-bold leading-none">X</span>,
  facebook: (z) => <span style={{ fontSize: z + 1 }} className="font-bold leading-none">f</span>,
  instagram: (z) => <Camera size={z} />,
  tiktok: (z) => <Music size={z} />,
  snapchat: (z) => <Ghost size={z} />,
  linkedin: (z) => <span style={{ fontSize: z - 1 }} className="font-bold leading-none">in</span>,
  spotify: (z) => <Disc3 size={z} />,
  website: (z) => <Globe size={z} />,
};

function BioCard({ c, edit, cover, avatar, onCover, onAvatar, name, bio, onBio, socials, onSocials }: { c: PV; edit: boolean; cover: string | null; avatar: string | null; onCover: () => void; onAvatar: () => void; name: string; bio: string; onBio: (v: string) => void; socials: Socials; onSocials: () => void }) {
  const filled = LIB_SOCIALS.filter((s) => socials[s.key]);
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
        <div className="relative rounded-full p-[3px]" style={{ background: c.bg }}>
          <div className="h-[92px] w-[92px] overflow-hidden rounded-full">
            <ImageSlot src={avatar} label="Avatar" className="h-full w-full" rounded="rounded-full" />
          </div>
          {edit && (
            <button type="button" aria-label="Change profile photo" data-testid="pref-lib-avatar-camera" onClick={onAvatar} className="absolute bottom-[-6px] left-1/2 flex h-[24px] w-[24px] -translate-x-1/2 items-center justify-center rounded-full" style={{ background: c.bg, color: c.btn }}>
              <Camera size={13} />
            </button>
          )}
        </div>
        <p className="mt-[12px] text-[18px] font-bold">{name}</p>
      </div>
      {edit ? (
        <textarea
          aria-label="Bio"
          data-testid="pref-lib-bio-text"
          value={bio}
          maxLength={300}
          rows={3}
          placeholder="Write a short bio"
          onChange={(e) => onBio(e.target.value)}
          className="mt-[16px] block w-full resize-none rounded-[6px] border bg-transparent px-[10px] py-[8px] text-[14px] leading-[21px] tracking-[.2px] outline-none focus:border-2"
          style={{ borderColor: c.btn, color: c.postText }}
        />
      ) : (
        <p className="mt-[16px] min-h-[40px] rounded-[6px] border px-[10px] py-[8px] text-[14px] leading-[21px] tracking-[.2px]" style={{ borderColor: c.btn }} data-testid="pref-lib-bio-text-view">{bio}</p>
      )}
      <div className="relative mt-[16px] flex min-h-[30px] items-center justify-center gap-[18px] px-[40px]" style={{ color: c.btn }} data-testid="pref-lib-social-row">
        {filled.map((s) => (
          <span key={s.key} role="img" aria-label={`${s.label}: ${socials[s.key]}`} title={socials[s.key]} data-testid={`pref-lib-social-${s.key}`} className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] border" style={{ borderColor: c.btn }}>
            {SOCIAL_GLYPH[s.key](11)}
          </span>
        ))}
        {edit && (
          <button type="button" aria-label="Edit social links" data-testid="pref-lib-social-edit" onClick={onSocials} className="absolute right-[4px] flex h-[30px] w-[30px] items-center justify-center rounded-full bg-surface-2">
            <Pencil size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Social Media Links (17): one row per network, "Add URL", X clears a filled row; SAVE LINKS updates the editor draft. */
function SocialLinksModal({ open, value, onClose, onSave }: { open: boolean; value: Socials; onClose: () => void; onSave: (v: Socials) => void }) {
  const [v, setV] = useState<Socials>(value);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) (setV(value), setTouched(false));
  }, [open]);
  const bad = LIB_SOCIALS.filter((s) => v[s.key]?.trim() && !validUrl(v[s.key]!.trim()));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Social Media Links"
      footer={
        <>
          <PlainButton onClick={onClose} data-testid="modal-pref-lib-social-cancel">Cancel</PlainButton>
          <Pill
            data-testid="modal-pref-lib-social-save"
            onClick={() => {
              setTouched(true);
              if (bad.length) return;
              onSave(Object.fromEntries(LIB_SOCIALS.filter((s) => v[s.key]?.trim()).map((s) => [s.key, v[s.key]!.trim()])) as Socials);
            }}
          >
            Save Links
          </Pill>
        </>
      }
    >
      <div className="flex flex-col gap-[10px]" data-testid="modal-pref-lib-social">
        {LIB_SOCIALS.map((s) => {
          const val = v[s.key] ?? "";
          const invalid = touched && bad.some((x) => x.key === s.key);
          return (
            <div key={s.key}>
              <div className={`flex h-[52px] items-center overflow-hidden rounded-pill bg-bg ${invalid ? "ring-1 ring-danger" : ""}`}>
                <label htmlFor={`lib-social-${s.key}`} className="flex h-full w-[160px] shrink-0 items-center gap-[10px] border-r border-line pl-[18px] text-[15px] font-bold">
                  <span className="flex w-[20px] justify-center">{SOCIAL_GLYPH[s.key](16)}</span>
                  {s.label}
                </label>
                <input
                  id={`lib-social-${s.key}`}
                  type="url"
                  data-testid={`modal-pref-lib-social-${s.key}`}
                  placeholder="Add URL"
                  value={val}
                  onChange={(e) => setV({ ...v, [s.key]: e.target.value })}
                  className="h-full min-w-[0px] flex-1 bg-transparent px-[18px] text-[14px] text-white outline-none placeholder:text-muted"
                />
                {val && (
                  <button type="button" aria-label={`Clear ${s.label}`} data-testid={`modal-pref-lib-social-clear-${s.key}`} onClick={() => setV({ ...v, [s.key]: "" })} className="mr-[16px] text-white hover:text-accent">
                    <X size={16} />
                  </button>
                )}
              </div>
              {invalid && <FieldError>Enter a full web address, like https://example.com</FieldError>}
            </div>
          );
        })}
        <p className="mt-[4px] text-[12px] text-muted">Prefilled from the links you gave during setup (simulated). Links are never visited.</p>
      </div>
    </Modal>
  );
}

/** "instagram.com/ajwhite" from a full URL, for cards without a description. */
function linkLabel(url?: string) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return url;
  }
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
      <div className="flex flex-wrap gap-[16px] rounded-[10px] border-2 p-[16px]" style={box}>
        <ImageSlot src={a.image} kind="product" label={a.title} className="h-[132px] w-[110px] shrink-0" rounded="rounded-[14px]" />
        <div className="min-w-0 flex-1 basis-[200px] rounded-[6px] p-[16px]" style={{ background: c.post, color: c.postText }}>
          <p className="text-[16px] font-bold">{a.title}</p>
          {a.text && <p className="mt-[2px] text-[12px] leading-[18px]">{a.text}</p>}
          <p className="mt-[16px] text-[12px] font-bold">Current Price</p>
          <p className="mt-[8px] text-[20px] font-semibold">${(a.price ?? 0).toFixed(2)}</p>
          <div className="mt-[16px] inline-flex h-[44px] items-center gap-[4px] rounded-full px-[4px]" style={{ background: c.bg }}>
            <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-[36px] w-[36px] disabled:opacity-50 items-center justify-center rounded-full text-[12px]" style={{ background: c.btn, color: c.btnText }}>–</button>
            <span className="w-[36px] text-center text-[14px] font-bold">{qty}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => q + 1)} className="flex h-[36px] w-[36px] items-center justify-center rounded-full text-[12px]" style={{ background: c.btn, color: c.btnText }}>+</button>
          </div>
          <div className="mt-[20px]">
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
  // general / feed / portfolio / event / external (inferred card). Never an empty card: without a description it
  // says where the link goes, and it shows the linked item's image when there is one.
  const where = a.text || linkLabel(a.url);
  return (
    <div className="flex gap-[16px] rounded-[10px] border-2 p-[20px]" style={box}>
      {a.image && <ImageSlot src={a.image} kind="product" label={a.title} className="h-[88px] w-[88px] shrink-0" rounded="rounded-[10px]" />}
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-bold">{a.title}</p>
        {where && <p className="mt-[6px] break-words text-[14px] leading-[21px] opacity-80">{where}</p>}
        {a.price != null && <p className="mt-[12px] text-[18px] font-semibold">${a.price.toFixed(2)}</p>}
        <span className={`${pill} mt-[16px]`} style={{ background: c.btn, color: c.btnText }}>
          {a.kind === "event" ? "Get Tickets" : a.kind === "external" ? "Visit" : "View"}
        </span>
      </div>
    </div>
  );
}

function Preview({ device, draft, palettes, edit, onDraft, loading, referral }: { device: Device; draft: Draft; palettes: string[][]; edit: boolean; onDraft: (d: Draft) => void; loading: boolean; referral: boolean }) {
  const c = pv(draft.palette === -1 ? draft.customPalette : palettes[draft.palette] ?? palettes[0]);
  const name = useData((d) => d.account.name);
  const identity = useData((d) => ({ avatar: d.account.avatar, cover: d.account.cover }));
  const [cover, setCover] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<"cover" | "avatar">("cover");
  const dragFrom = useRef<number | null>(null);
  const toast = useToast();
  const [socialsOpen, setSocialsOpen] = useState(false);
  const pick = (t: "cover" | "avatar") => {
    target.current = t;
    fileRef.current?.click();
  };
  const bg: CSSProperties = { background: draft.theme ? `${THEME_BG[draft.theme]}, ${c.bg}` : c.bg, color: c.text };

  const bio = (
    <BioCard c={c} edit={edit} cover={cover ?? identity.cover} avatar={avatar ?? identity.avatar} onCover={() => pick("cover")} onAvatar={() => pick("avatar")} name={name} bio={draft.bio} onBio={(bio) => onDraft({ ...draft, bio })} socials={draft.socials} onSocials={() => setSocialsOpen(true)} />
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
        // Reorder: up/down buttons (or drag the handle, or Alt+Arrow on it). Remove: trash. All edit the draft only.
        <div className="flex w-[28px] shrink-0 flex-col items-center gap-[10px] text-accent" data-testid={`pref-lib-controls-${a.id}`}>
          <button type="button" aria-label={`Move ${a.title} up`} data-testid={`pref-lib-move-up-${a.id}`} disabled={i === 0} onClick={() => move(i, i - 1)} className="disabled:opacity-30">
            <ChevronUp size={18} />
          </button>
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
          <button type="button" aria-label={`Move ${a.title} down`} data-testid={`pref-lib-move-down-${a.id}`} disabled={i === draft.actions.length - 1} onClick={() => move(i, i + 1)} className="disabled:opacity-30">
            <ChevronDown size={18} />
          </button>
        </div>
      )}
    </div>
  ));

  const footer = (
    <div className="flex flex-col items-center gap-[8px] pb-[20px] pt-[16px] text-[14px]" style={{ color: c.btn }} data-testid="pref-lib-footer">
      {/* Referral tip (12): the special link shows at the bottom only while "Include My Referral Link" is on. */}
      {referral && <a href="#" onClick={(e) => (e.preventDefault(), toast("Preview only: on your live page this link takes fans to TopFan's site."))} data-testid="pref-lib-get-platform">Get Your Own Platform</a>}
      <span className="flex items-center gap-[6px] text-[13px] font-medium tracking-[.5px] opacity-90" data-testid="pref-lib-powered-by">
        <span style={{ color: c.text }} className="opacity-80">Powered By</span>
        <span className="flex items-center gap-[3px]"><Zap size={13} />TOP<b>FAN</b></span>
      </span>
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
      <SocialLinksModal open={socialsOpen} value={draft.socials} onClose={() => setSocialsOpen(false)} onSave={(socials) => (onDraft({ ...draft, socials }), setSocialsOpen(false))} />
      <style>{`.lib-scroll{scrollbar-width:thin;scrollbar-color:${c.btn} transparent}.lib-scroll::-webkit-scrollbar{width:2px}.lib-scroll::-webkit-scrollbar-thumb{background:${c.btn}}`}</style>
    </>
  );
}

/* ------------------------------------------------------------------ edit toolbar pieces */

function ColorsThemes({ draft, palettes, onDraft }: { draft: Draft; palettes: string[][]; onDraft: (d: Draft) => void }) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => (setOpen(false), setCustomOpen(false)), open);
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
          {customOpen ? (
            <CustomPalette
              initial={draft.customPalette}
              onClose={() => setCustomOpen(false)}
              onSave={(customPalette) => (onDraft({ ...draft, customPalette, palette: -1 }), setCustomOpen(false))}
            />
          ) : (
          <>
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
              <button type="button" aria-label="Edit custom palette" data-testid="pref-lib-palette-custom-edit" onClick={() => setCustomOpen(true)} className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-surface-2">
                <Pencil size={15} />
              </button>
            </div>
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
          </>
          )}
        </div>
      )}
    </div>
  );
}

const CUSTOM_ROWS = ["Background Color", "Background Text Color", "Card Background Color", "Card Text Color", "Button Color", "Button Text Color"];
const HEX = /^#[0-9a-f]{6}$/i;

/** Create a Custom Color Palette (15): replaces the panel; six rows of swatch + hex + picker; back arrow = cancel. */
function CustomPalette({ initial, onClose, onSave }: { initial: string[]; onClose: () => void; onSave: (p: string[]) => void }) {
  const [hex, setHex] = useState<string[]>(() => initial.map((x) => x.toUpperCase()));
  const valid = hex.every((h) => HEX.test(h));
  return (
    <div data-testid="pref-lib-custom-panel">
      <div className="flex items-center gap-[12px]">
        <button type="button" aria-label="Back to Colors & Themes" data-testid="pref-lib-custom-back" onClick={onClose} className="text-white hover:text-accent">
          <ArrowLeft size={20} />
        </button>
        <h5 className="text-[18px] font-semibold">Create a Custom Color Palette</h5>
      </div>
      <div className="mt-[16px] flex flex-col gap-[12px] rounded-inner bg-bg p-[16px]">
        {CUSTOM_ROWS.map((label, i) => {
          const ok = HEX.test(hex[i]);
          return (
            <div key={label} className="flex items-center justify-between gap-[8px]">
              <label htmlFor={`lib-hex-${i}`} className="text-[13px] font-medium leading-[16px]">{label}</label>
              <div className={`flex h-[40px] shrink-0 items-center gap-[8px] rounded-[6px] bg-surface px-[8px] ${ok ? "" : "ring-1 ring-danger"}`}>
                <span className="h-[20px] w-[30px] rounded-[4px] border border-line" style={{ background: ok ? hex[i] : "transparent" }} aria-hidden />
                <input
                  id={`lib-hex-${i}`}
                  data-testid={`pref-lib-custom-hex-${i}`}
                  value={hex[i]}
                  maxLength={7}
                  aria-invalid={!ok}
                  onChange={(e) => setHex(hex.map((h, j) => (j === i ? e.target.value.toUpperCase() : h)))}
                  className="w-[70px] bg-transparent text-[13px] font-bold text-white outline-none"
                />
                <label className="relative flex h-[24px] w-[24px] cursor-pointer items-center justify-center text-accent" title={`Pick ${label}`}>
                  <Pipette size={16} />
                  <input
                    type="color"
                    aria-label={`Pick ${label}`}
                    data-testid={`pref-lib-custom-picker-${i}`}
                    value={ok ? hex[i].toLowerCase() : "#000000"}
                    onChange={(e) => setHex(hex.map((h, j) => (j === i ? e.target.value.toUpperCase() : h)))}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
      {!valid && <FieldError>Use a 6-digit hex colour, like #FFFFFF.</FieldError>}
      <div className="mt-[16px] flex items-center justify-end gap-[8px]">
        <PlainButton onClick={onClose} data-testid="pref-lib-custom-cancel">Cancel</PlainButton>
        <Pill data-testid="pref-lib-custom-save" disabled={!valid} onClick={() => valid && onSave(hex.map((h) => h.toLowerCase()))} className="!px-[16px] !text-[12px]">Save Custom Colors</Pill>
      </div>
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

type PickKind = "store-item" | "feed" | "portfolio" | "event";
interface PickRow { id: string; title: string; sub: string; group?: string; action: () => BioAction; url?: string }

/** Rows for the four pickers, built only from the mock store (published / public items). */
function usePickRows(kind: PickKind | null): PickRow[] {
  return useData((d) => {
    if (!kind) return [];
    const base = publicBase(d);
    const h = d.account.handle;
    const at = (path: string) => (base ? `${base}/${path}` : undefined);
    if (kind === "store-item")
      return d.monetize.products.filter((p) => p.published).map((p) => {
        const url = p.external ? p.externalUrl : at(`${h}/store/${p.id}`);
        return { id: p.id, title: p.title, sub: `${p.kind[0].toUpperCase()}${p.kind.slice(1)}${p.price != null ? ` · $${p.price.toFixed(2)}` : ""}`, url, action: () => makeBioAction("store-item", p.title, { text: p.description, price: p.price ?? undefined, image: p.image ?? null, url }) };
      });
    if (kind === "feed")
      // Locked posts are left out: fans would only see the unlock screen.
      return d.social.posts
        .filter((p) => p.status === "published" && !p.locked && (p.extra as { variant?: string } | undefined)?.variant !== "welcome")
        .sort((x, y) => y.createdAt.localeCompare(x.createdAt))
        .map((p) => {
          const title = p.title?.trim() || (p.text.length > 60 ? `${p.text.slice(0, 57)}…` : p.text) || "Post";
          const url = at(`${h}/post/${p.id}`);
          return { id: p.id, title, sub: `${p.type[0].toUpperCase()}${p.type.slice(1)} post · ${p.createdAt.slice(0, 10)}`, group: p.type, url, action: () => makeBioAction("feed", title, { text: p.title ? p.text.slice(0, 140) : undefined, url, image: p.media?.find((m) => m.kind === "image")?.src ?? null }) };
        });
    if (kind === "portfolio")
      return d.monetize.portfolios.map((p) => {
        const url = at(`dashboard/portfolio/${h}/banner-view/${p.id}`);
        const n = p.series.length + p.singles.length;
        return { id: p.id, title: p.title, sub: `${p.type} portfolio · ${n} item${n === 1 ? "" : "s"}`, url, action: () => makeBioAction("portfolio", p.title, { text: `${p.type} portfolio · ${n} item${n === 1 ? "" : "s"}`, url, image: p.banner ?? null }) };
      });
    return d.monetize.events.filter((e) => !e.past).map((e) => {
      const url = at(`dashboard/event-listing/${h}/ticket-purchase/${e.id}`);
      const from = e.tickets.length ? Math.min(...e.tickets.map((t) => t.price)) : undefined;
      return { id: e.id, title: e.title, sub: `${e.date.slice(0, 10)} · ${e.location}`, url, action: () => makeBioAction("event", e.title, { text: e.location, price: from, url, image: e.image ?? null }) };
    });
  });
}

const PICKER: Record<PickKind, { title: string; search: string; empty: string; multi: boolean }> = {
  "store-item": { title: "Add a Specific Store Item Button", search: "Search", empty: "No Results Found", multi: false },
  feed: { title: "Add Specific Feed Content Items", search: "Search", empty: "No Results Found", multi: true },
  portfolio: { title: "Add a Specific Portfolio Item", search: "Search", empty: "No portfolios found", multi: false },
  event: { title: "Add a Specific Event Ticketing Item", search: "Search events", empty: "No Events Found", multi: false },
};

/** NEW ACTION dialogs (06–11). Each adds cards to the editor draft only; SAVE CHANGES publishes. */
function AddActionModal({ pending, onClose, onAdd, existing }: { pending: { kind: BioAction["kind"]; label: string } | null; onClose: () => void; onAdd: (a: BioAction[]) => void; existing: BioAction[] }) {
  const kind = pending?.kind ?? null;
  const pickKind = kind && kind in PICKER ? (kind as PickKind) : null;
  const rows = usePickRows(pickKind);
  const chatUrl = useData((d) => (publicBase(d) ? `${publicBase(d)}/${d.account.handle}/chat-room` : undefined));
  const [title, setTitle] = useState("");
  const [extra, setExtra] = useState("");
  const [touched, setTouched] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [picked, setPicked] = useState<string[]>([]);
  const [chat, setChat] = useState(false);
  useEffect(() => {
    setTitle(""), setExtra(""), setTouched(false), setQ(""), setFilter("all"), setPicked([]), setChat(false);
  }, [pending]);
  const added = (url?: string) => !!url && existing.some((a) => sameUrl(a.url, url));
  const chatAdded = added(chatUrl) || existing.some((a) => a.kind === "general" && a.title === "Join My Chatroom");

  const titleErr = title.trim() ? null : "Action button title is required";
  const urlErr = !extra.trim() ? "External URL is required" : validUrl(extra.trim()) ? null : "Enter a full web address, like https://example.com";
  const cancel = <PlainButton onClick={onClose} data-testid="modal-pref-lib-action-cancel">Cancel</PlainButton>;

  if (kind === "external" || kind === "general") {
    const external = kind === "external";
    return (
      <Modal
        open={!!pending}
        onClose={onClose}
        width={external ? 450 : 620}
        title={external ? "Add an External Action Button" : "Add General Action Buttons"}
        footer={
          <>
            {cancel}
            <Pill
              data-testid="modal-pref-lib-action-add"
              disabled={!external && (!chat || chatAdded)}
              onClick={() => {
                if (external) {
                  setTouched(true);
                  if (titleErr || urlErr) return;
                  onAdd([makeBioAction("external", title.trim(), { url: extra.trim() })]);
                } else if (chat && !chatAdded) onAdd([makeBioAction("general", "Join My Chatroom", { url: chatUrl })]);
                onClose();
              }}
            >
              Save Actions
            </Pill>
          </>
        }
      >
        {external ? (
          <div data-testid="modal-pref-lib-action" className="flex flex-col gap-[16px]">
            <div>
              <label htmlFor="lib-a-title" className="mb-[12px] block text-[16px]">Action Button Title*</label>
              <Field id="lib-a-title" data-testid="modal-pref-lib-action-title" placeholder="Enter action label" value={title} invalid={touched && !!titleErr} onChange={(e) => setTitle(e.target.value)} />
              <FieldError>{touched ? titleErr : null}</FieldError>
            </div>
            <div>
              <label htmlFor="lib-a-extra" className="mb-[12px] block text-[16px]">External URL*</label>
              <Field id="lib-a-extra" data-testid="modal-pref-lib-action-extra" type="url" placeholder="Enter action URL" value={extra} invalid={touched && !!urlErr} onChange={(e) => setExtra(e.target.value)} />
              <FieldError>{touched ? urlErr : null}</FieldError>
            </div>
          </div>
        ) : (
          <div data-testid="modal-pref-lib-general">
            <Radio name="lib-general" checked={chat || chatAdded} onChange={() => setChat(true)}>
              <span data-testid="modal-pref-lib-general-chatroom">Join My Chatroom</span>
            </Radio>
            {chatAdded && <p className="mt-[8px] pl-[34px] text-[13px] text-muted">Already on your page.</p>}
          </div>
        )}
      </Modal>
    );
  }

  const cfg = pickKind ? PICKER[pickKind] : null;
  const groups = [...new Set(rows.map((r) => r.group).filter(Boolean))] as string[];
  const shown = rows.filter((r) => (filter === "all" || r.group === filter) && r.title.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id: string) => setPicked((p) => (cfg?.multi ? (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]) : [id]));
  return (
    <Modal
      open={!!pending && !!cfg}
      onClose={onClose}
      width={720}
      title={cfg?.title ?? ""}
      footer={
        <Pill
          data-testid="modal-pref-lib-action-add"
          disabled={!picked.length}
          onClick={() => {
            onAdd(rows.filter((r) => picked.includes(r.id)).map((r) => r.action()));
            onClose();
          }}
        >
          Add
        </Pill>
      }
    >
      <div data-testid={`modal-pref-lib-picker-${pickKind}`}>
        {pickKind === "feed" && (
          <div className="mb-[14px] flex flex-wrap gap-[8px]" role="group" aria-label="Filter by post type">
            {["all", ...groups].map((g) => (
              <button key={g} type="button" aria-pressed={filter === g} data-testid={`modal-pref-lib-filter-${g}`} onClick={() => setFilter(g)} className={`h-[32px] rounded-pill px-[14px] text-[12px] font-black uppercase ${filter === g ? "bg-accent" : "bg-bg"}`}>
                {g}
              </button>
            ))}
          </div>
        )}
        <div className="flex h-[40px] items-center gap-[10px] rounded-pill bg-bg px-[14px]">
          <Search size={16} className="text-accent" />
          <input aria-label={cfg?.search} data-testid="modal-pref-lib-search" placeholder={cfg?.search} value={q} onChange={(e) => setQ(e.target.value)} className="h-full flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted" />
        </div>
        {shown.length ? (
          <ul className="mt-[14px] flex max-h-[340px] flex-col gap-[8px] overflow-y-auto pr-[4px]">
            {shown.map((r) => {
              const on = picked.includes(r.id);
              const dup = added(r.url);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    role={cfg?.multi ? "checkbox" : "radio"}
                    aria-checked={on}
                    disabled={dup}
                    data-testid={`modal-pref-lib-pick-${r.id}`}
                    onClick={() => toggle(r.id)}
                    className={`flex w-full items-center gap-[12px] rounded-[10px] bg-bg px-[14px] py-[10px] text-left disabled:opacity-50 ${on ? "ring-1 ring-accent" : ""}`}
                  >
                    <span className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center ${cfg?.multi ? "rounded-[4px]" : "rounded-full"} ${on ? "bg-accent" : "border border-accent"}`}>{on && <Check size={13} strokeWidth={3} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold">{r.title}</span>
                      <span className="block truncate text-[12px] text-muted">{dup ? "Already on your page" : r.sub}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center py-[36px]" data-testid="modal-pref-lib-empty">
            <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-accent-tint text-accent"><ShoppingBag size={24} /></span>
            <p className="mt-[10px] text-[14px]">{cfg?.empty}</p>
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
  const { navigate, query } = useRouter();
  const toast = useToast();
  // Prepared by the assistant (Demo 2): its Link in Bio proposal, applied to this editor's draft only.
  const workId = edit ? query.get("work") : null;
  const write = useWrite();
  const lib = useData((d) => d.prefsB.linkInBio);
  const handle = useData((d) => d.account.handle);
  const domain = useData((d) => d.account.whiteLabel.domain);
  const palettes = usePalettes();
  const loading = useMockLoading(700);
  const [device, setDevice] = useState<Device>("desktop");
  const saved: Draft = useMemo(() => ({ palette: lib.palette, customPalette: lib.customPalette, theme: lib.theme, actions: lib.actions, bio: lib.bio ?? demoCreator.bio, socials: lib.socials ?? LIB_DEFAULT_SOCIALS }), [lib]);
  // Never saved yet → the view shows "Create Your Link in Bio" (02). Older saves without the flag count as created.
  const created = lib.created !== false;
  const [draft, setDraft] = useState<Draft>(saved);
  // The view and edit routes share this component (state survives the switch), so apply on arrival.
  useEffect(() => {
    const w = itemById(getData(), workId);
    if (!w?.bio || w.bio.step === "saved") return;
    const pr = w.bio.profile;
    setDraft({
      ...saved,
      actions: applyBio(getData(), saved.actions, w),
      socials: applySocials(saved.socials, w),
      ...(pr?.include.bio && pr.bio ? { bio: pr.bio } : {}),
      ...(pr?.include.palette && pr.palette != null ? { palette: pr.palette } : {}),
    });
    act("content.bioInEditor", (d) => markInEditor(d, w.id), { need: "content.write" });
  }, [workId]);
  const [pending, setPending] = useState<{ kind: BioAction["kind"]; label: string } | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  // A TopFan AI proposal under review: the preview follows the links ticked there. Nothing is saved until the creator saves.
  const reviewKey = useData((d) => {
    const x = d.content.items.find((y) => y.kind === "bio" && y.bio?.step === "review" && !["paused", "cancelled", "saved", "needs-input"].includes(y.status));
    return x ? `${x.id}|${x.updatedAt}|${x.bio!.links.map((l) => `${l.key}:${l.include ? 1 : 0}`).join(",")}` : "";
  });
  const live = useMemo(() => {
    const x = reviewKey ? itemById(getData(), reviewKey.split("|")[0]) : undefined;
    return x ? { ...saved, actions: applyBio(getData(), saved.actions, x), socials: applySocials(saved.socials, x) } : null;
  }, [reviewKey, saved]);
  const shown = edit ? draft : live ?? saved;
  const url = `https://www.${domain}/bio/${handle}`;

  return (
    <PrefPage id={route.id}>
      <div className="-mt-[10px] flex items-center justify-between">
        <h4 className="flex items-center gap-[8px] text-[24px] font-bold">
          Link In Bio
          <InfoPop testid="pref-lib-info">
            A great way to generate more revenue and build your own fan database, is to link to your personal TopFan page from your other social media profiles. You can use your White Label Site URL or create a simplified Link In Bio page using our free generator.
          </InfoPop>
        </h4>
        {(edit || created) && <EnableToggle
          on={lib.enabled}
          testid="pref-lib-enable"
          tone="surface"
          onChange={(v) => v !== lib.enabled && write("prefsB.setLinkInBioEnabled", (d) => setLinkInBioEnabled(d, v), "content.write")}
        />}
      </div>

      {!edit && !created ? (
        <div className="mt-[27px] flex flex-col items-center rounded-card bg-surface px-[28px] py-[120px]" data-testid="pref-lib-empty">
          <span className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-accent-tint">
            <span className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-accent text-white"><Link2 size={26} /></span>
          </span>
          <p className="mt-[36px] text-[18px] text-soft">Create Your Link in Bio</p>
          <Pill
            className="mt-[20px]"
            data-testid="pref-lib-get-started"
            onClick={() => {
              setDraft(saved);
              navigate(pathFor("pref-link-in-bio-edit"));
            }}
          >
            Get Started
          </Pill>
        </div>
      ) : (
      <>

      <div className="mt-[27px] flex flex-wrap items-center justify-between gap-[12px]">
        <div className="flex items-center gap-[12px]">
          <input readOnly value={url} aria-label="Link In Bio URL" data-testid="pref-lib-url" className="h-[40px] w-[312px] rounded-[50px] bg-surface px-[24px] text-[16px] text-muted outline-none" />
          <Pill
            data-testid="pref-lib-copy"
            onClick={() => {
              const fail = () => toast("Couldn't copy the link. Select the address and copy it yourself.");
              try {
                if (!navigator.clipboard) return fail();
                navigator.clipboard.writeText(url).then(() => toast("Copied to clipboard"), fail);
              } catch {
                fail();
              }
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

        {!edit && live && (
          <p className="mt-[16px] rounded-[8px] bg-bg px-[16px] py-[10px] text-[14px] text-soft" data-testid="pref-lib-live-note">
            Showing the links you've selected in TopFan AI. Nothing is saved until you add them and save.
          </p>
        )}
        <Preview device={device} draft={shown} palettes={palettes} edit={edit} onDraft={setDraft} loading={loading} referral={lib.includeReferral} />
      </div>
      </>
      )}

      <AddActionModal pending={pending} existing={draft.actions} onClose={() => setPending(null)} onAdd={(a) => setDraft((d) => ({ ...d, actions: [...d.actions, ...a] }))} />
      <ConfirmModal
        open={confirmSave}
        title="Publish Link In Bio"
        confirmLabel="Save Changes"
        testid="modal-pref-lib-save"
        onClose={() => setConfirmSave(false)}
        onConfirm={() => {
          const res = write("prefsB.saveLinkInBio", (d) => (saveLinkInBio(d, draft), workId && bioSaved(d, workId)), "content.write", "Link In Bio saved");
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
