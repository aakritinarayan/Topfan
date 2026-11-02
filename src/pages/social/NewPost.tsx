/**
 * New Post — composer (spec 18-new-post.md, screenshots 18-*, 18a–18j). Post type does not change the URL.
 * PUBLISH NOW is Confirm tier (explicit confirm step) and needs "content.write".
 * Topic Tags / Groups selectors read Preferences B: both are empty by default, and the source shows
 * no selector then, so they only appear once tags (≥2 active) or groups exist (inferred placement).
 */
import { useAssistant } from "../../state/assistantStore";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ALargeSmall, Bold, CalendarDays, ChevronDown, ChevronRight, Clapperboard, Clock, Code, Coins, Gift, HandHeart, Headphones, Image as ImageIcon,
  ImagePlus, Italic, Link2, List, ListOrdered, Minus, Newspaper, Plus, Redo2, Smile, SquareChartGantt, SquarePlay, Tag, Type, Underline, Undo2,
  UserPlus, Video, Volume2, X, ChartColumnBig, SquareCode,
} from "lucide-react";
import type { PageProps } from "../types";
import type { PostType } from "../../store/model";
import { getData, useAct, useData, type AppData } from "../../store/store";
import { draftById } from "../../store/slices/autopilot";
import { publishPost, saveArticleDraft, type FundraiserLevel, type NewPostInput, type PostExtra } from "../../store/slices/social";
import { INTERESTS } from "../../store/slices/prefsA";
import { InfoIcon, Select } from "../../platform/ui/controls";
import { useToast } from "../../platform/ui/toast";
import { ConfirmDialog, RoundCheck, money, useGo } from "./shared";

type Icon = typeof SquarePlay;
const TYPES: { id: PostType; label: string; icon: Icon }[] = [
  { id: "video", label: "Video", icon: SquarePlay },
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "article", label: "Article", icon: Newspaper },
  { id: "audio", label: "Audio", icon: Headphones },
  { id: "reel", label: "Reel", icon: Clapperboard },
  { id: "poll", label: "Poll", icon: ChartColumnBig },
  { id: "giveaway", label: "Giveaways", icon: Gift },
  { id: "link", label: "Link", icon: Link2 },
  { id: "fundraiser", label: "Fundraiser", icon: HandHeart },
  { id: "text", label: "Text", icon: Type },
];

type Opt = "discovery" | "discoveryReel" | "signIn" | "sensitive";
const OPT_LABEL: Record<Opt, string> = {
  discovery: "Make post available to be included in Discovery Feed to find new Fans.",
  discoveryReel: "Available to be included in Discovery Feed to find new Fans",
  signIn: "Require account Sign In to access this post's content",
  sensitive: "This content could be considered sensitive by others.",
};
// inferred: info popover copy was not captured
const OPT_INFO: Record<Opt, string> = {
  discovery: "Discovery Feed posts can be shown to people who don't follow you yet.",
  discoveryReel: "Discovery Feed posts can be shown to people who don't follow you yet.",
  signIn: "Only signed-in fans can open this post.",
  sensitive: "Fans see a warning before the content is shown.",
};

interface Upload {
  label: string;
  helper: string;
  accept: string;
  multiple?: boolean;
}
interface Spec {
  upload?: Upload;
  /** Main textarea placeholder (Video, Images, Audio, Reel, Link, Text, Giveaway, Fundraiser). */
  text?: string;
  textHeight?: number;
  footer: boolean; // Lock / Collaborate under the main text card
  interests: boolean;
  opts: Opt[];
  preview: boolean;
  enableDefault: boolean;
  width?: number;
}
const IMG = "Any JPG, JPEG, PNG, HEIC, HEIF, WEBP, AVIF or GIF";
const SPECS: Record<PostType, Spec> = {
  video: { upload: { label: "Upload Video", helper: "Any MP4 or MOV up to 10GB", accept: "video/mp4,video/quicktime" }, text: "Add a description…", footer: true, interests: true, opts: ["discovery", "signIn", "sensitive"], preview: false, enableDefault: true },
  images: { upload: { label: "Upload Images", helper: IMG, accept: "image/*", multiple: true }, text: "Add a description…", footer: true, interests: true, opts: ["discovery", "signIn", "sensitive"], preview: false, enableDefault: true },
  article: { footer: true, interests: true, opts: ["discovery", "signIn", "sensitive"], preview: true, enableDefault: false },
  audio: { upload: { label: "Upload Audio File", helper: "Any mp3 or wav up to 200MB", accept: "audio/mpeg,audio/wav" }, text: "Add a description…", textHeight: 212, footer: true, interests: true, opts: ["signIn", "sensitive"], preview: true, enableDefault: false },
  reel: { upload: { label: "Upload Reel", helper: "Reels should be 45 seconds or less and in vertical/portrait orientation", accept: "video/*" }, text: "Add a description", footer: true, interests: false, opts: ["discoveryReel", "sensitive", "signIn"], preview: false, enableDefault: false },
  poll: { upload: { label: "Upload Poll Image", helper: `${IMG} up to 5MB`, accept: "image/*" }, footer: true, interests: true, opts: ["sensitive"], preview: false, enableDefault: false },
  giveaway: { text: "Write the details of your giveaway and what you want people to submit to enter (e.g., Guess my favorite flavor of ice cream)", footer: true, interests: true, opts: ["sensitive"], preview: true, enableDefault: false },
  link: { text: "Add a description…", footer: true, interests: true, opts: ["signIn", "sensitive"], preview: true, enableDefault: false },
  fundraiser: { text: "Write the details of your fundraiser (e.g., what is the cause and goals).", footer: false, interests: false, opts: ["sensitive"], preview: true, enableDefault: false, width: 800 },
  text: { text: "Add a description…", textHeight: 212, footer: false, interests: true, opts: ["sensitive"], preview: false, enableDefault: false },
};

interface Form {
  files: string[];
  text: string;
  title: string;
  html: string;
  plain: string;
  locked: boolean;
  lockOpen: boolean;
  price: string;
  collabOpen: boolean;
  collaborators: string;
  interestsOpen: boolean;
  interests: string[];
  topicTagIds: string[];
  groupIds: string[];
  opts: Record<Opt, boolean>;
  preview: string | null;
  question: string;
  date: string;
  time: string;
  options: string[];
  cta: string;
  url: string;
  goal: string;
  allowBeyond: boolean;
  levels: FundraiserLevel[];
  level: { title: string; amount: string; gift: string | null };
  enabled: boolean;
}
const blank = (t: PostType, draft: { title: string; html: string }): Form => ({
  files: [], text: "", title: t === "article" ? draft.title : "", html: t === "article" ? draft.html : "", plain: "",
  locked: false, lockOpen: false, price: "", collabOpen: false, collaborators: "", interestsOpen: false, interests: [], topicTagIds: [], groupIds: [],
  opts: { discovery: true, discoveryReel: true, signIn: false, sensitive: false }, preview: null,
  question: "", date: "", time: "", options: ["", ""], cta: "", url: "", goal: "", allowBeyond: true, levels: [], level: { title: "", amount: "", gift: null },
  enabled: SPECS[t].enableDefault,
});

const card = "rounded-panel bg-surface";
const field = "w-full resize-none bg-transparent text-[18px] text-white outline-none placeholder:text-muted";
const fmtSaved = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};

export function NewPostPage({ route, query }: PageProps) {
  // inferred (assistant hand-off): ?autopilot=<draftId> opens this composer prefilled with a Content
  // Autopilot draft. The UI is unchanged; whatever the creator saves or publishes is linked back.
  const apId = query.get("autopilot");
  const ap = apId ? draftById(getData(), apId) : null;
  // inferred (assistant hand-off): ?prefill=assistant opens a Text post with the draft kept from setup.
  const kept = useAssistant().draftPost;
  const assistText = !ap && query.get("prefill") === "assistant" ? kept : null;
  const [type, setType] = useState<PostType | null>(ap ? ap.type : assistText ? "text" : null);
  const draft = useData((d) => d.social.articleDraft);
  const [f, setF] = useState<Form>(() =>
    ap
      ? { ...blank(ap.type, draft), text: ap.type === "poll" ? "" : ap.text, question: ap.type === "poll" ? ap.text : "", options: ap.pollOptions?.length ? [...ap.pollOptions] : ["", ""] }
      : assistText
        ? { ...blank("text", draft), text: assistText }
        : blank("video", draft),
  );
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const pick = (t: PostType) => {
    setType(t);
    setF(blank(t, draft));
  };

  return (
    <div data-testid={`page-${route.id}`} className="pb-[40px]">
      <div className="flex h-[38px] items-center justify-between">
        <h4 className="text-[24px] font-bold">New Post</h4>
        {type && (
          // inferred behaviour: unlabeled DISABLE / ENABLE control (open question in NOTES.md)
          <div className="flex h-[38px] w-[177px] rounded-pill bg-surface text-[14px] font-black uppercase tracking-caps" role="group" aria-label="Enable or disable this post type">
            {(["Disable", "Enable"] as const).map((l) => {
              const on = (l === "Enable") === f.enabled;
              return (
                <button key={l} data-testid={`newpost-${l.toLowerCase()}`} aria-pressed={on} onClick={() => set("enabled", l === "Enable")} className={`flex-1 rounded-pill text-[14px] font-black uppercase tracking-caps ${on ? "bg-accent" : ""}`}>
                  {l}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <p className={`${type ? "mt-[40px]" : "mt-[37px]"} text-[16px] font-medium`}>Choose Post Type</p>
      <div className="mt-[22px] flex flex-wrap gap-x-[8px] gap-y-[17px]" role="tablist" aria-label="Post type">
        {TYPES.map(({ id, label, icon: I }) => {
          const active = id === type;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              data-testid={`newpost-type-${id}`}
              onClick={() => pick(id)}
              className={`flex h-[56px] items-center gap-[14px] rounded-pill border border-accent px-[30px] text-[14px] font-black uppercase tracking-caps ${active ? "bg-accent text-white" : "text-accent hover:bg-accent-tint"}`}
            >
              <I size={24} strokeWidth={2.2} className={active ? "text-white" : "text-accent"} />
              {label}
            </button>
          );
        })}
      </div>
      {!type ? (
        <div data-testid="newpost-empty" className="mt-[25px] flex h-[330px] w-[650px] flex-col items-center justify-center rounded-card bg-surface">
          <span className="flex h-[100px] w-[100px] items-center justify-center rounded-full bg-accent/25 text-accent">
            <SquarePlay size={40} strokeWidth={1.6} />
          </span>
          <p className="mt-[30px] text-[18px] text-[#d0d0d0]">To publish your content, choose a post type above</p>
        </div>
      ) : (
        <Composer key={type} type={type} f={f} set={set} apId={ap && ap.type === type ? ap.id : undefined} />
      )}
    </div>
  );
}

/* ---------------- composer ---------------- */

type Setter = <K extends keyof Form>(k: K, v: Form[K]) => void;

function Composer({ type, f, set, apId }: { type: PostType; f: Form; set: Setter; apId?: string }) {
  const spec = SPECS[type];
  const act = useAct();
  const toast = useToast();
  const go = useGo();
  const handle = useData((d) => d.account.handle);
  const savedAt = useData((d) => d.social.articleDraft.savedAt);
  const tags = useData((d) => d.prefsB.topicTags.filter((t) => t.active));
  const groups = useData((d) => d.prefsB.groups.filter((g) => g.active));
  const gifts = useData((d) => d.social.showcase.map((s) => s.title));
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);

  // Article draft auto-save (Draft tier, no confirmation).
  useEffect(() => {
    if (type !== "article") return;
    const t = setTimeout(() => {
      if (!f.title && !f.html) return;
      act("social.saveArticleDraft", (d) => saveArticleDraft(d, f.title, f.html), { need: "content.write" });
    }, 900);
    return () => clearTimeout(t);
  }, [type, f.title, f.html]);

  const valid = (() => {
    const pre = !spec.preview || !!f.preview;
    switch (type) {
      case "video":
      case "images":
      case "reel":
        return f.files.length > 0;
      case "audio":
        return f.files.length > 0 && pre;
      case "article":
        return !!f.title.trim() && !!f.plain.trim() && pre;
      case "poll":
        return !!f.question.trim() && f.options.filter((o) => o.trim()).length >= 2;
      case "giveaway":
        return !!f.text.trim() && !!f.cta.trim() && pre;
      case "link":
        return !!f.url.trim() && pre;
      case "fundraiser":
        return !!f.text.trim() && Number(f.goal) > 0 && pre;
      case "text":
        return !!f.text.trim();
    }
  })();

  const build = (status: "published" | "draft"): NewPostInput => {
    const extra: PostExtra = {
      discovery: spec.opts.includes("discovery") ? f.opts.discovery : spec.opts.includes("discoveryReel") ? f.opts.discoveryReel : false,
      requireSignIn: f.opts.signIn,
      sensitive: f.opts.sensitive,
      interests: f.interests,
      collaborators: f.collaborators ? f.collaborators.split(",").map((s) => s.trim()).filter(Boolean) : [],
      featureEnabled: f.enabled,
      previewImage: f.preview,
      fileName: f.files[0] ?? null,
    };
    if (apId) extra.autopilotDraftId = apId;
    if (type === "images") extra.imageCount = f.files.length;
    if (type === "poll") {
      const endsAt = f.date ? `${f.date}T${f.time || "23:59"}:00` : null;
      extra.poll = { question: f.question.trim(), endsAt, options: f.options.filter((o) => o.trim()).map((label) => ({ label: label.trim(), votes: 0 })) };
    }
    if (type === "giveaway") extra.giveaway = { cta: f.cta.trim(), responses: 0 };
    if (type === "link") extra.link = { url: f.url.trim() };
    if (type === "fundraiser") extra.fundraiser = { raised: 0, goal: Number(f.goal), allowBeyond: f.allowBeyond, levels: f.levels, contributions: 0 };
    if (type === "audio") extra.audio = { duration: 0 };
    const kind = type === "audio" ? "audio" : type === "video" || type === "reel" ? "video" : "image";
    const names = type === "images" ? f.files : f.files.length ? [f.files[0]] : f.preview ? [f.preview] : [];
    const text = type === "poll" ? f.question.trim() : type === "article" ? f.title.trim() : f.text.trim();
    return {
      type,
      status,
      title: type === "article" ? f.title.trim() : undefined,
      text,
      locked: f.locked,
      price: f.locked && Number(f.price) > 0 ? Number(f.price) : undefined,
      topicTagIds: f.topicTagIds,
      groupIds: f.groupIds,
      media: (type === "audio" && f.preview ? [f.preview] : names).map((n) => ({ kind: kind as "image" | "video" | "audio", placeholder: n })),
      extra,
    };
  };

  const doPublish = () => {
    const r = act("social.publishPost", (d) => void (replaceLinkedDraft(d, apId), publishPost(d, build("published"))), { need: "content.write" });
    if (!r.ok) return setErr(r.reason);
    setConfirm(false);
    toast("Post published");
    go("feed", { handle });
  };

  const footer = spec.footer ? <LockCollab f={f} set={set} /> : null;

  return (
    <div data-testid={`newpost-composer-${type}`} className={`mt-[25px] ${spec.width === 800 ? "w-[800px]" : "w-full"}`}>
      <div className="space-y-[8px]">
        {spec.upload && <UploadCard up={spec.upload} files={f.files} onFiles={(v) => set("files", v)} type={type} />}

        {type === "article" && (
          <>
            <div className={`${card} flex h-[67px] items-center px-[24px]`}>
              <input aria-label="Article title" data-testid="newpost-article-title" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Add Article Title here..." className="w-full bg-transparent text-[14px] font-bold outline-none placeholder:text-muted" />
            </div>
            <ArticleEditor html={f.html} onChange={(html, plain) => (set("html", html), set("plain", plain))} footer={footer} />
          </>
        )}

        {type === "link" && (
          <div className={`${card} h-[160px] px-[24px] py-[30px]`}>
            <textarea aria-label="URL" data-testid="newpost-link-url" value={f.url} onChange={(e) => set("url", e.target.value)} placeholder="Enter URL" className={`${field} h-full`} />
          </div>
        )}

        {spec.text && (
          <div className={card}>
            <div className="px-[24px] py-[30px]" style={{ height: spec.textHeight ?? 160 }}>
              <textarea aria-label="Description" data-testid="newpost-text" value={f.text} onChange={(e) => set("text", e.target.value)} placeholder={spec.text} className={`${field} h-full leading-[22px]`} />
            </div>
            {footer}
          </div>
        )}

        {type === "poll" && <PollCard f={f} set={set} footer={footer} />}
      </div>

      {type === "giveaway" && (
        <div className={`${card} mt-[16px] px-[24px] pb-[24px] pt-[25px]`}>
          <p className="text-[16px]">CTA Button Text*</p>
          <input aria-label="CTA Button Text" data-testid="newpost-giveaway-cta" value={f.cta} onChange={(e) => set("cta", e.target.value)} placeholder="Submit Answer" className="mt-[16px] h-[55px] w-full rounded-pill bg-bg px-[24px] text-[14px] font-black outline-none placeholder:font-bold placeholder:text-muted" />
        </div>
      )}

      {type === "fundraiser" && <FundraiserCards f={f} set={set} gifts={gifts} />}

      {type === "article" && <p className="mt-[12px] text-[12px] text-muted" data-testid="newpost-draft-saved">Draft Auto-Saved: {fmtSaved(savedAt)}</p>}

      {spec.interests && <InterestsRow f={f} set={set} />}

      {/* Topic Tags / Groups (inferred placement; hidden while Preferences has none, as in the captures) */}
      {tags.length >= 2 && (
        <ChipPicker testid="newpost-topic-tags" title="Topic Tags" items={tags.map((t) => [t.id, t.name])} value={f.topicTagIds} onChange={(v) => set("topicTagIds", v)} />
      )}
      {groups.length > 0 && (
        <ChipPicker testid="newpost-groups" title="Groups" items={groups.map((g) => [g.id, g.name])} value={f.groupIds} onChange={(v) => set("groupIds", v)} />
      )}

      <div className="mt-[24px] space-y-[24px]">
        {spec.opts.map((o) => {
          const key: Opt = o;
          return (
            <div key={o} className={`${card} flex h-[78px] items-center gap-[16px] px-[21px]`}>
              <RoundCheck testid={`newpost-opt-${o}`} label={OPT_LABEL[o]} checked={f.opts[key]} onChange={() => set("opts", { ...f.opts, [key]: !f.opts[key] })} />
              <span className="flex items-center text-[16px]">
                {OPT_LABEL[o]}
                <InfoIcon text={OPT_INFO[o]} />
              </span>
            </div>
          );
        })}
      </div>

      {spec.preview && <PreviewUpload value={f.preview} onChange={(v) => set("preview", v)} />}

      {/* footer: publish options chevron + PUBLISH NOW, disabled until valid */}
      <div className="relative mt-[30px] flex items-center gap-[10px]">
        <button
          aria-label="Publish options"
          data-testid="newpost-publish-options"
          disabled={!valid}
          onClick={() => setMenu((m) => !m)}
          className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronDown size={22} strokeWidth={2.5} />
        </button>
        <button
          data-testid="newpost-publish"
          disabled={!valid}
          onClick={() => (setErr(null), setConfirm(true))}
          className="h-[40px] w-[156px] rounded-pill bg-accent text-[14px] font-black uppercase tracking-caps disabled:cursor-not-allowed disabled:opacity-50 disabled:[color:rgb(255_255_255/.6)]"
        >
          Publish Now
        </button>
        {menu && valid && (
          // inferred: the publish-options menu was never opened in the capture
          <div role="menu" className="absolute left-[0px] top-[54px] z-20 w-[200px] rounded-tile bg-surface py-[8px] shadow-lg">
            <button
              role="menuitem"
              data-testid="newpost-save-draft"
              className="block w-full px-[20px] py-[8px] text-left text-[15px] hover:text-accent"
              onClick={() => {
                setMenu(false);
                const r = act("social.saveDraftPost", (d) => void (replaceLinkedDraft(d, apId), publishPost(d, build("draft"))), { need: "content.write" });
                toast(r.ok ? "Saved as draft" : r.reason);
              }}
            >
              Save as Draft
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Publish Post"
        // inferred: the publish confirmation was not captured
        body={`Publish this ${TYPES.find((t) => t.id === type)!.label.toLowerCase()} post to your Feed now?`}
        confirmLabel="Publish"
        testid="modal-newpost-confirm"
        error={err}
        onConfirm={doPublish}
      />
    </div>
  );
}

/* ---------------- building blocks ---------------- */

function UploadCard({ up, files, onFiles, type }: { up: Upload; files: string[]; onFiles: (v: string[]) => void; type: PostType }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={`${card} flex min-h-[139px] flex-col items-center justify-center py-[22px]`}>
      <input
        ref={ref}
        type="file"
        hidden
        accept={up.accept}
        multiple={up.multiple}
        data-testid={`newpost-file-${type}`}
        onChange={(e) => {
          // Mock upload: only the file name is kept; nothing leaves the browser.
          const names = Array.from(e.target.files ?? []).map((x) => x.name);
          if (names.length) onFiles(up.multiple ? [...files, ...names] : names.slice(0, 1));
          e.target.value = "";
        }}
      />
      <button
        data-testid="newpost-upload"
        onClick={() => ref.current?.click()}
        className="flex h-[64px] w-[149px] flex-col items-center justify-center rounded-popover border border-dashed border-accent text-[14px] text-accent hover:bg-accent-tint"
      >
        <Plus size={22} strokeWidth={1.6} />
        {up.label}
      </button>
      <p className="mt-[13px] text-[12px] text-accent">{up.helper}</p>
      {files.length > 0 && (
        <ul className="mt-[12px] flex flex-wrap justify-center gap-[8px]" data-testid="newpost-files">
          {files.map((n, i) => (
            <li key={i} className="flex items-center gap-[8px] rounded-pill bg-bg px-[12px] py-[4px] text-[12px]">
              {n}
              <button aria-label={`Remove ${n}`} onClick={() => onFiles(files.filter((_, j) => j !== i))}>
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LockCollab({ f, set }: { f: Form; set: Setter }) {
  const btn = "inline-flex h-[40px] items-center gap-[10px] rounded-md bg-accent px-[12px] text-[14px] font-medium hover:brightness-110";
  return (
    <div className="border-t border-white/[.08] px-[24px] py-[18px]">
      <div className="flex gap-[8px]">
        <button data-testid="newpost-lock" aria-expanded={f.lockOpen} onClick={() => set("lockOpen", !f.lockOpen)} className={btn}>
          <Tag size={20} className="-scale-x-100" />
          {f.locked ? `Locked${Number(f.price) > 0 ? ` · ${money(Number(f.price))}` : ""}` : "Lock"}
        </button>
        <button data-testid="newpost-collaborate" aria-expanded={f.collabOpen} onClick={() => set("collabOpen", !f.collabOpen)} className={btn}>
          <UserPlus size={20} />
          Collaborate
        </button>
      </div>
      {f.lockOpen && (
        // inferred: Lock panel (price to unlock) was not captured
        <div className="mt-[16px] flex items-center gap-[12px]" data-testid="newpost-lock-panel">
          <div className="flex h-[44px] w-[220px] items-center rounded-pill bg-bg px-[20px]">
            <span className="mr-[4px] text-[14px] font-bold">$</span>
            <input aria-label="Unlock price" data-testid="newpost-lock-price" inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value.replace(/[^\d.]/g, ""))} placeholder="Unlock Price" className="w-full bg-transparent text-[14px] font-bold outline-none placeholder:text-muted" />
          </div>
          <button data-testid="newpost-lock-apply" onClick={() => (set("locked", !f.locked), set("lockOpen", false))} className="text-[14px] font-bold text-accent">
            {f.locked ? "Remove Lock" : "Lock Post"}
          </button>
        </div>
      )}
      {f.collabOpen && (
        // inferred: Collaborate panel was not captured
        <div className="mt-[16px]" data-testid="newpost-collab-panel">
          <input aria-label="Collaborators" data-testid="newpost-collab-input" value={f.collaborators} onChange={(e) => set("collaborators", e.target.value)} placeholder="Collaborator usernames, separated by commas" className="h-[44px] w-full rounded-pill bg-bg px-[20px] text-[14px] outline-none placeholder:text-muted" />
        </div>
      )}
    </div>
  );
}

function InterestsRow({ f, set }: { f: Form; set: Setter }) {
  return (
    <div className="mt-[16px]">
      <div
        role="button"
        tabIndex={0}
        data-testid="newpost-interests"
        aria-expanded={f.interestsOpen}
        onClick={() => set("interestsOpen", !f.interestsOpen)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), set("interestsOpen", !f.interestsOpen))}
        className={`${card} flex h-[56px] w-full cursor-pointer items-center justify-between rounded-tile px-[20px] text-left text-[14px] font-bold`}
      >
        <span className="flex items-center">
          Select Interests
          {f.interests.length > 0 && <span className="ml-[8px] font-normal text-muted">({f.interests.length})</span>}
          <span onClick={(e) => e.stopPropagation()}>
            <InfoIcon text="Interests help fans who follow these topics discover this post." />
          </span>
        </span>
        <ChevronRight size={20} className={f.interestsOpen ? "rotate-90" : ""} />
      </div>
      {f.interestsOpen && (
        // inferred: the interest picker was not opened in the capture
        <div className={`${card} mt-[8px] flex flex-wrap gap-[8px] p-[20px]`} data-testid="newpost-interests-panel">
          {INTERESTS.map((i) => {
            const on = f.interests.includes(i);
            return (
              <button key={i} onClick={() => set("interests", on ? f.interests.filter((x) => x !== i) : [...f.interests, i])} className={`h-[36px] rounded-pill border border-accent px-[16px] text-[13px] ${on ? "bg-accent font-bold" : ""}`}>
                {i}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChipPicker({ title, items, value, onChange, testid }: { title: string; items: [string, string][]; value: string[]; onChange: (v: string[]) => void; testid: string }) {
  return (
    <div className={`${card} mt-[16px] rounded-tile px-[20px] py-[16px]`} data-testid={testid}>
      <p className="text-[14px] font-bold">{title}</p>
      <div className="mt-[12px] flex flex-wrap gap-[8px]">
        {items.map(([id, name]) => {
          const on = value.includes(id);
          return (
            <button key={id} data-testid={`${testid}-${id}`} onClick={() => onChange(on ? value.filter((x) => x !== id) : [...value, id])} className={`h-[36px] rounded-pill border border-accent px-[16px] text-[13px] ${on ? "bg-accent font-bold" : ""}`}>
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PreviewUpload({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-[30px]">
      <p className="flex items-center text-[16px]">
        Feed Preview Image*
        <InfoIcon text="This image is shown on the post card in the Feed." />
      </p>
      <input ref={ref} type="file" hidden accept="image/*" data-testid="newpost-preview-file" onChange={(e) => (e.target.files?.[0] && onChange(e.target.files[0].name), (e.target.value = ""))} />
      <div className="mt-[18px] flex items-center gap-[12px]">
        <button data-testid="newpost-preview-upload" onClick={() => ref.current?.click()} className="flex h-[92px] w-[78px] flex-col items-center justify-center gap-[6px] rounded-tile border border-dashed border-accent text-[14px] text-accent hover:bg-accent-tint">
          <Plus size={22} strokeWidth={1.6} />
          Upload
        </button>
        {value && (
          <span className="flex items-center gap-[8px] rounded-pill bg-surface px-[12px] py-[4px] text-[12px]">
            {value}
            <button aria-label="Remove preview image" onClick={() => onChange(null)}>
              <X size={12} />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

function PollCard({ f, set, footer }: { f: Form; set: Setter; footer: ReactNode }) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const pill = "relative flex h-[40px] flex-1 items-center justify-between rounded-[20px] bg-bg px-[20px] text-[14px]";
  const open = (r: React.RefObject<HTMLInputElement | null>) => {
    try {
      r.current?.showPicker();
    } catch {
      r.current?.focus();
    }
  };
  return (
    <div className={card}>
      <div className="px-[24px] pb-[24px] pt-[25px]">
        <p className="text-[13px] uppercase">Question</p>
        <textarea aria-label="Poll question" data-testid="newpost-poll-question" value={f.question} onChange={(e) => set("question", e.target.value)} placeholder="What’s your poll question?" className="mt-[16px] h-[128px] w-full resize-none rounded-popover bg-bg px-[10px] py-[12px] text-[18px] outline-none placeholder:text-muted" />
        <p className="mt-[24px] text-[13px] uppercase">Poll Expiration</p>
        <div className="mt-[16px] flex gap-[24px]">
          <button type="button" data-testid="newpost-poll-date" onClick={() => open(dateRef)} className={pill}>
            <span className={f.date ? "" : "text-white/80"}>{f.date ? new Date(`${f.date}T00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Select Date"}</span>
            <CalendarDays size={16} className="text-accent" />
            <input ref={dateRef} type="date" aria-label="Poll end date" value={f.date} onChange={(e) => set("date", e.target.value)} className="pointer-events-none absolute inset-0 opacity-0" tabIndex={-1} />
          </button>
          <button type="button" data-testid="newpost-poll-time" onClick={() => open(timeRef)} className={pill}>
            <span className={f.time ? "" : "text-white/80"}>{f.time ? new Date(`2000-01-01T${f.time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "Select Time"}</span>
            <Clock size={16} className="fill-accent text-bg" />
            <input ref={timeRef} type="time" aria-label="Poll end time" value={f.time} onChange={(e) => set("time", e.target.value)} className="pointer-events-none absolute inset-0 opacity-0" tabIndex={-1} />
          </button>
        </div>
        <p className="mt-[12px] text-right text-[12px]">Time Zone - {tz}</p>
        <div className="my-[24px] h-px bg-white/[.12]" />
        <p className="text-[13px] uppercase">Options</p>
        <div className="mt-[16px] space-y-[12px]">
          {f.options.map((o, i) => (
            <div key={i} className="relative">
              <input
                aria-label={`Option ${i + 1}`}
                data-testid={`newpost-poll-option-${i + 1}`}
                value={o}
                onChange={(e) => set("options", f.options.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={`Option ${i + 1}`}
                className="h-[40px] w-full rounded bg-bg px-[20px] text-[14px] outline-none placeholder:text-white/80"
              />
              {i >= 2 && (
                <button aria-label={`Remove option ${i + 1}`} onClick={() => set("options", f.options.filter((_, j) => j !== i))} className="absolute right-[12px] top-1/2 -translate-y-1/2 text-muted hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-[16px] text-right">
          <button data-testid="newpost-poll-add-option" onClick={() => set("options", [...f.options, ""])} className="text-[14px] hover:text-accent">
            Add Another Option
          </button>
        </div>
      </div>
      {footer}
    </div>
  );
}

function FundraiserCards({ f, set, gifts }: { f: Form; set: Setter; gifts: string[] }) {
  const lv = f.level;
  const canAdd = !!lv.title.trim() && Number(lv.amount) > 0;
  return (
    <>
      <div className={`${card} mt-[24px] px-[22px] pb-[24px] pt-[25px]`}>
        <p className="text-[16px] uppercase">Fundraiser Financial Goal</p>
        <p className="mt-[4px] text-[13px] text-soft">Enter the goal amount for your fundraiser.</p>
        <div className="mt-[22px] flex h-[55px] items-center rounded-pill bg-bg px-[22px]">
          <span className="mr-[8px] text-[14px] font-bold">$</span>
          <input aria-label="Goal amount" data-testid="newpost-fund-goal" inputMode="decimal" value={f.goal} onChange={(e) => set("goal", e.target.value.replace(/[^\d.]/g, ""))} placeholder="Enter Goal Amount" className="w-full bg-transparent text-[14px] font-bold outline-none placeholder:text-muted" />
        </div>
        <label className="mt-[12px] flex items-center gap-[10px] text-[16px]">
          <RoundCheck testid="newpost-fund-beyond" label="Allow contributions beyond your fundraising goal." checked={f.allowBeyond} onChange={() => set("allowBeyond", !f.allowBeyond)} />
          Allow contributions beyond your fundraising goal.
        </label>
      </div>
      <div className={`${card} mt-[24px] px-[22px] pb-[24px] pt-[25px]`}>
        <p className="text-[16px] uppercase">Add Contribution Levels &amp; Gifts</p>
        <p className="mt-[4px] text-[13px] text-soft">You can now create tiers for your fundraisers and assign specific benefits to each tier.</p>
        {f.levels.length > 0 && (
          <ul className="mt-[20px] space-y-[8px]" data-testid="newpost-fund-levels">
            {f.levels.map((l, i) => (
              <li key={i} className="flex h-[50px] items-center justify-between rounded-popover bg-bg px-[16px] text-[14px]">
                <span>
                  {l.title} <b className="ml-[4px]">{money(l.amount)}</b>
                  {l.gift && <span className="ml-[8px] text-muted">· {l.gift}</span>}
                </span>
                <button aria-label={`Remove ${l.title}`} onClick={() => set("levels", f.levels.filter((_, j) => j !== i))}>
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-[30px] flex items-end gap-[16px] px-[10px]">
          <div className="w-[196px]">
            <p className="mb-[16px] text-[16px]">Contribution Level Title*</p>
            <input aria-label="Contribution Level Title" data-testid="newpost-fund-level-title" value={lv.title} onChange={(e) => set("level", { ...lv, title: e.target.value })} placeholder="Ex. Silver, Gold, Platinum" className="h-[56px] w-full rounded-pill bg-bg px-[24px] text-[14px] font-bold outline-none placeholder:text-muted" />
          </div>
          <div className="w-[276px]">
            <p className="mb-[16px] text-[16px]">Contribution Amount*</p>
            <div className="flex h-[56px] items-center rounded-pill bg-bg pl-[22px] pr-[8px]">
              <span className="mr-[8px] text-[14px] font-bold">$</span>
              <input aria-label="Contribution Amount" data-testid="newpost-fund-level-amount" inputMode="decimal" value={lv.amount} onChange={(e) => set("level", { ...lv, amount: e.target.value.replace(/[^\d.]/g, "") })} placeholder="Contribution Amount" className="w-full bg-transparent text-[14px] font-bold outline-none placeholder:text-muted" />
              <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full bg-accent/60">
                <Coins size={16} />
              </span>
            </div>
          </div>
          <div className="w-[196px]">
            <p className="mb-[16px] flex items-center text-[16px]">
              Optional Gift
              <InfoIcon text="A store item fans receive at this level." />
            </p>
            <Select value={lv.gift} options={gifts} onChange={(v) => set("level", { ...lv, gift: v })} />
          </div>
        </div>
        <div className="mt-[35px] text-right">
          <button
            data-testid="newpost-fund-add-level"
            disabled={!canAdd}
            onClick={() => {
              set("levels", [...f.levels, { title: lv.title.trim(), amount: Number(lv.amount), gift: lv.gift }]);
              set("level", { title: "", amount: "", gift: null });
            }}
            className="pr-[8px] text-[14px] text-accent disabled:cursor-not-allowed"
          >
            Add Level
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------------- article editor (Quill look; contentEditable + execCommand) ---------------- */

function ArticleEditor({ html, onChange, footer }: { html: string; onChange: (html: string, plain: string) => void; footer: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const toast = useToast();
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) {
      ref.current.innerHTML = html;
      onChange(html, ref.current.innerText);
    }
  }, []);
  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML, ref.current.innerText);
  };
  const soon = () => toast("Media embeds are not available in this demo"); // inferred
  const tools: [Icon, string, () => void][] = [
    [Smile, "Emoji", () => exec("insertText", "🙂")],
    [Bold, "Bold", () => exec("bold")],
    [Italic, "Italic", () => exec("italic")],
    [Underline, "Underline", () => exec("underline")],
    [ALargeSmall, "Text size", () => exec("fontSize", "5")],
    [ListOrdered, "Ordered list", () => exec("insertOrderedList")],
    [List, "Bullet list", () => exec("insertUnorderedList")],
    [Link2, "Link", () => exec("createLink", "https://example.com")],
    [Code, "Code", () => exec("formatBlock", "pre")],
    [ImagePlus, "Image", soon],
    [Video, "Video", soon],
    [Volume2, "Audio", soon],
    [Minus, "Horizontal rule", () => exec("insertHorizontalRule")],
    [SquareChartGantt, "AI image", soon],
    [SquareCode, "Embed", soon],
  ];
  return (
    <div className={card}>
      <div className="flex h-[60px] items-center justify-between border-b border-white/[.06] px-[22px]">
        <div className="flex items-center gap-[8px]">
          {tools.map(([I, label, run]) => (
            <button key={label} aria-label={label} title={label} data-testid={`newpost-editor-${label.toLowerCase().replace(/\s+/g, "-")}`} onMouseDown={(e) => e.preventDefault()} onClick={run} className="flex h-[24px] w-[24px] items-center justify-center hover:text-accent">
              <I size={17} strokeWidth={2.3} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-[12px] text-[14px] font-bold uppercase">
          <button data-testid="newpost-editor-undo" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("undo")} className="flex items-center gap-[4px] hover:text-accent">
            <Undo2 size={16} strokeWidth={2.5} />
            Undo
          </button>
          <button data-testid="newpost-editor-redo" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("redo")} className="flex items-center gap-[4px] hover:text-accent">
            <Redo2 size={16} strokeWidth={2.5} />
            Redo
          </button>
        </div>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label="Article body"
        data-testid="newpost-article-body"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Write some text..."
        onInput={(e) => onChange(e.currentTarget.innerHTML, e.currentTarget.innerText)}
        className="min-h-[250px] px-[22px] py-[18px] text-[16px] outline-none empty:before:text-white empty:before:content-[attr(data-placeholder)] [&_ol]:list-decimal [&_ol]:pl-[24px] [&_pre]:rounded [&_pre]:bg-bg [&_pre]:p-[8px] [&_ul]:list-disc [&_ul]:pl-[24px]"
      />
      {footer}
    </div>
  );
}

/** An Autopilot draft saved earlier is replaced (not duplicated) when the creator saves their edit. */
function replaceLinkedDraft(d: AppData, apId?: string) {
  if (!apId) return;
  d.social.posts = d.social.posts.filter((p) => !(p.status === "draft" && p.extra?.autopilotDraftId === apId));
}
