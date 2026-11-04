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
  UserPlus, Video, Volume2, X, ChartColumnBig, SquareCode, Trash2, ShoppingBag, FolderOpen, Rss, Ticket,
} from "lucide-react";
import type { PageProps } from "../types";
import type { PostType } from "../../store/model";
import { getData, useAct, useData, type AppData } from "../../store/store";
import { draftById } from "../../store/slices/autopilot";
import { itemById, linkSaved, lockModes, syncFromScreen, type LockMode } from "../../store/slices/content";
import { publishPost, saveArticleDraft, type FundraiserLevel, type NewPostInput, type PostExtra } from "../../store/slices/social";
import { INTERESTS } from "../../store/slices/prefsA";
import { InfoIcon, Select } from "../../platform/ui/controls";
import { useToast } from "../../platform/ui/toast";
import { pathFor } from "../../app/routeCatalog";
import { DEMO_CREATORS } from "../../app/profiles";
import { creatorMedia, mediaSrc } from "../../media";
import { ConfirmDialog, RoundCheck, money, useGo } from "./shared";
import type { AiResult } from "../../services/articleGen";
import { AiDialog, CollabDialog, CustomGiftDialog, DatePopover, EmojiPanel, LockDialog, PickerDialog, Popover, TimeDialog, type LockDraft, type PickItem } from "./NewPostDialogs";

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
// Info tips (reference newpost-10…12): open on click, toggle, and close when another opens.
const OPT_INFO: Record<Opt, string> = {
  discovery: "If you enable this option, this specific post will be viewable to all TopFan users in the Discovery Feed, even though your account is private.",
  discoveryReel: "If you enable this option, this specific post will be viewable to all TopFan users in the Discovery Feed, even though your account is private.",
  signIn: "When you require Sign In to access the content, guest users who arrive on it from a shared link will also be required to create an account before being able to access the content.",
  sensitive: "It is your responsibility as a creator to determine if a piece of content could offend or upset others. If you check this option, users see a warning over the content and choose whether to view it.",
};
const INTERESTS_INFO = "Including interest tags related to your post from the list below or your own custom #tags will help you find new fans who share similar interests.";

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
  reel: { upload: { label: "Upload Reel", helper: "Reels should be 45 seconds or less and in vertical/portrait orientation", accept: "video/*" }, text: "Add a description…", footer: true, interests: true, opts: ["discoveryReel", "sensitive", "signIn"], preview: false, enableDefault: false },
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
  /** A Lock is saved on the post (Lock dialog › SAVE). */
  locked: boolean;
  /** The Lock dialog is open. */
  lockOpen: boolean;
  /** Lock options: Subscription (plans), Individual Purchase (price), Loyalty Points (points), Lock with NFT (contracts). */
  lock: { subscription: boolean; purchase: boolean; points: boolean; nft: boolean };
  /** Membership plans whose subscribers can unlock it (Lock › Subscription). */
  planIds: string[];
  price: string;
  points: string;
  nfts: string[];
  collabOpen: boolean;
  /** Tagged creator handles. */
  collaborators: string[];
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
  /** Contribution level rows, edited in place (Add Level appends one). */
  rows: LevelRow[];
  enabled: boolean;
  /** Media key for an attached file name (assistant hand-off from the approved library or a generated visual). */
  fileSrc: Record<string, string>;
}
interface LevelRow {
  title: string;
  amount: string;
  gift: { kind: "store" | "custom"; name: string; note?: string } | null;
}
const blankRow = (): LevelRow => ({ title: "", amount: "", gift: null });
const blank = (t: PostType, draft: { title: string; html: string }): Form => ({
  files: [], text: "", title: t === "article" ? draft.title : "", html: t === "article" ? draft.html : "", plain: "",
  locked: false, lockOpen: false, lock: { subscription: false, purchase: true, points: false, nft: false }, planIds: [], price: "", points: "", nfts: [],
  collabOpen: false, collaborators: [], interestsOpen: false, interests: [], topicTagIds: [], groupIds: [],
  opts: { discovery: true, discoveryReel: true, signIn: false, sensitive: false }, preview: null,
  question: "", date: "", time: "", options: ["", ""], cta: "", url: "", goal: "", allowBeyond: true, rows: [blankRow()],
  enabled: SPECS[t].enableDefault,
  fileSrc: {},
});

const card = "rounded-panel bg-surface";
const field = "w-full resize-none bg-transparent text-[18px] text-white outline-none placeholder:text-muted";
/** Lock options in effect on the form (empty when no Lock). */
const formModes = (f: Pick<Form, "locked" | "lockOpen" | "lock">): LockMode[] =>
  f.locked || f.lockOpen ? (["subscription", "purchase", "points", "nft"] as const).filter((k) => f.lock[k]) : [];
const lockSig = (locked: boolean, modes: LockMode[], price: number | null, points: number | null, contract: string | null, planIds: string[] = []) =>
  JSON.stringify(locked ? [[...modes].sort(), modes.includes("purchase") ? price : null, modes.includes("points") ? points : null, modes.includes("nft") ? contract : null, modes.includes("subscription") ? planIds : null] : null);
/** The Lock on the form, in the work item's terms. */
const formLock = (f: Form) => {
  const modes = formModes(f);
  return {
    locked: f.locked || f.lockOpen,
    modes,
    price: modes.includes("purchase") && f.price ? Number(f.price) : null,
    points: modes.includes("points") && f.points ? Number(f.points) : null,
    contract: modes.includes("nft") ? f.nfts[0] ?? null : null,
    planIds: modes.includes("subscription") ? f.planIds : [],
  };
};
/**
 * The assistant's Lock (Individual Purchase / Loyalty Points / NFT) prefills the Lock dialog; a Lock
 * still missing its price, points or contract opens the dialog so the creator sets it.
 */
function lockFromWork(wp: NonNullable<NonNullable<ReturnType<typeof itemById>>["post"]>, openDialog = false): Pick<Form, "locked" | "lockOpen" | "lock" | "planIds" | "price" | "points" | "nfts"> {
  const modes = lockModes(wp);
  const missing = modes.some((m) => (m === "purchase" ? wp.price == null : m === "points" ? wp.points == null : m === "nft" ? !wp.contract : !wp.planIds?.length));
  // ?lock=1: the assistant prepared this Lock for review, so the dialog opens with it for the creator to save.
  const review = openDialog && wp.locked;
  return {
    locked: wp.locked && !missing && !review,
    lockOpen: wp.locked && (missing || review),
    lock: modes.length ? { subscription: modes.includes("subscription"), purchase: modes.includes("purchase"), points: modes.includes("points"), nft: modes.includes("nft") } : { subscription: false, purchase: true, points: false, nft: false },
    planIds: wp.planIds ?? [],
    price: wp.price != null ? String(wp.price) : "",
    points: wp.points != null ? String(wp.points) : "",
    nfts: wp.contract ? [wp.contract] : [],
  };
}
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
  // inferred (assistant hand-off): ?work=<id> opens a post the assistant prepared (type, copy, media, Lock).
  // The creator's edits here are written back to it; saving or publishing links the post to it.
  const workId = !ap ? query.get("work") : null;
  const work = workId ? itemById(getData(), workId) : null;
  const wp = work?.post ?? null;
  const [type, setType] = useState<PostType | null>(ap ? ap.type : wp ? wp.type : assistText ? "text" : null);
  const draft = useData((d) => d.social.articleDraft);
  const [f, setF] = useState<Form>(() =>
    wp
      ? {
          ...blank(wp.type, draft),
          text: wp.type === "poll" ? "" : wp.text,
          title: wp.type === "article" ? wp.title ?? "" : "",
          html: wp.type === "article" ? wp.text : "",
          question: wp.type === "poll" ? wp.text : "",
          options: wp.pollOptions?.length ? [...wp.pollOptions] : ["", ""],
          ...lockFromWork(wp, query.get("lock") === "1"),
          files: work?.media ? [work.media.label] : [],
          fileSrc: work?.media ? { [work.media.label]: work.media.key } : {},
        }
      : ap
      ? { ...blank(ap.type, draft), text: ap.type === "poll" ? "" : ap.text, question: ap.type === "poll" ? ap.text : "", options: ap.pollOptions?.length ? [...ap.pollOptions] : ["", ""] }
      : assistText
        ? { ...blank("text", draft), text: assistText }
        : blank("video", draft),
  );
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const act = useAct();
  const pick = (t: PostType) => {
    setType(t);
    setF(blank(t, draft));
  };
  // The Lock as the work item and this screen last agreed on it. A Lock change made here is written
  // back; a Lock change the assistant makes while this screen is open is applied here (newest wins).
  const storeLock = useData((d) => {
    const p = workId ? itemById(d, workId)?.post : null;
    return p ? lockSig(p.locked, lockModes(p), p.price ?? null, p.points ?? null, p.contract ?? null, p.planIds ?? []) : "";
  });
  const known = useRef(storeLock);
  useEffect(() => {
    if (!workId || !wp || type !== wp.type || storeLock === known.current) return;
    known.current = storeLock;
    const cur = itemById(getData(), workId)?.post;
    if (cur) setF((x) => ({ ...x, ...lockFromWork(cur) }));
  }, [storeLock]);
  // Keep the assistant's copy of this post in step with what the creator types here.
  useEffect(() => {
    if (!workId || !wp || type !== wp.type) return;
    const t = setTimeout(() => {
      const text = type === "poll" ? f.question : type === "article" ? f.plain || f.html : f.text;
      const l = formLock(f);
      const sig = lockSig(l.locked, l.modes, l.price, l.points, l.contract, l.planIds);
      const lockChanged = sig !== known.current;
      const cur = itemById(getData(), workId)?.post;
      if (!cur) return;
      if (cur.text === text && (cur.title ?? "") === (type === "article" ? f.title : cur.title ?? "") && !lockChanged) return;
      known.current = sig;
      act(
        "content.syncPost",
        (d) => syncFromScreen(d, workId, { text, title: type === "article" ? f.title : undefined, ...(lockChanged ? { locked: l.locked, price: l.price, lockBy: l.modes, points: l.points, contract: l.contract, planIds: l.planIds } : {}) }),
        { need: "content.write" },
      );
    }, 600);
    return () => clearTimeout(t);
  }, [f.text, f.question, f.title, f.plain, f.html, f.price, f.points, f.nfts, f.planIds, f.lock, f.locked, f.lockOpen, type]);

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
      {/* Two rows of five, as captured (newpost-01); each row still wraps on narrow screens. */}
      <div className="mt-[22px] flex flex-col gap-y-[17px]" role="tablist" aria-label="Post type">
        {[TYPES.slice(0, 5), TYPES.slice(5)].map((row, r) => (
          <div key={r} className="flex flex-wrap gap-x-[8px] gap-y-[17px]">
            {row.map(({ id, label, icon: I }) => {
              const active = id === type;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={active}
                  data-testid={`newpost-type-${id}`}
                  onClick={() => pick(id)}
                  className={`flex h-[56px] items-center gap-[12px] rounded-pill border border-accent px-[24px] text-[14px] font-black uppercase tracking-caps ${active ? "bg-accent text-white" : "text-accent hover:bg-accent-tint"}`}
                >
                  <I size={24} strokeWidth={2.2} className={active ? "text-white" : "text-accent"} />
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {!type ? (
        <div data-testid="newpost-empty" className="mt-[25px] flex h-[330px] w-full max-w-[650px] flex-col items-center justify-center rounded-card bg-surface">
          <span className="flex h-[100px] w-[100px] items-center justify-center rounded-full bg-accent/25 text-accent">
            <SquarePlay size={40} strokeWidth={1.6} />
          </span>
          <p className="mt-[30px] text-[18px] text-[#d0d0d0]">To publish your content, choose a post type above</p>
        </div>
      ) : (
        <Composer key={type} type={type} f={f} set={set} apId={ap && ap.type === type ? ap.id : undefined} workId={wp && wp.type === type ? workId ?? undefined : undefined} />
      )}
    </div>
  );
}

/* ---------------- composer ---------------- */

type Setter = <K extends keyof Form>(k: K, v: Form[K]) => void;

function Composer({ type, f, set, apId, workId }: { type: PostType; f: Form; set: Setter; apId?: string; workId?: string }) {
  const [aiNote, setAiNote] = useState<string | null>(null);
  const spec = SPECS[type];
  const act = useAct();
  const toast = useToast();
  const go = useGo();
  const handle = useData((d) => d.account.handle);
  const savedAt = useData((d) => d.social.articleDraft.savedAt);
  const tags = useData((d) => d.prefsB.topicTags.filter((t) => t.active));
  const groups = useData((d) => d.prefsB.groups.filter((g) => g.active));
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
        // Empty level rows are ignored; a half-filled one (title without amount or the reverse) blocks publishing.
        return !!f.text.trim() && Number(f.goal) > 0 && pre && f.rows.every((r) => !r.title.trim() === !(Number(r.amount) > 0) && (r.title.trim() || !r.gift));
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
      collaborators: f.collaborators,
      featureEnabled: f.enabled,
      previewImage: f.preview,
      fileName: f.files[0] ?? null,
    };
    if (apId) extra.autopilotDraftId = apId;
    const modes = formModes({ ...f, lockOpen: false });
    if (modes.length) extra.lock = { purchase: modes.includes("purchase"), points: modes.includes("points") ? Number(f.points) : null, nftContracts: modes.includes("nft") ? f.nfts : [] };
    if (type === "images") extra.imageCount = f.files.length;
    if (type === "poll") {
      const endsAt = f.date ? `${f.date}T${f.time || "23:59"}:00` : null;
      extra.poll = { question: f.question.trim(), endsAt, options: f.options.filter((o) => o.trim()).map((label) => ({ label: label.trim(), votes: 0 })) };
    }
    if (type === "giveaway") extra.giveaway = { cta: f.cta.trim(), responses: 0 };
    if (type === "link") extra.link = { url: f.url.trim() };
    if (type === "fundraiser") {
      const levels: FundraiserLevel[] = f.rows
        .filter((r) => r.title.trim() && Number(r.amount) > 0)
        .map((r) => ({ title: r.title.trim(), amount: Number(r.amount), gift: r.gift?.name ?? null, ...(r.gift ? { giftKind: r.gift.kind } : {}), ...(r.gift?.note ? { giftNote: r.gift.note } : {}) }));
      extra.fundraiser = { raised: 0, goal: Number(f.goal), allowBeyond: f.allowBeyond, levels, contributions: 0 };
    }
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
      price: f.locked && f.lock.purchase && Number(f.price) > 0 ? Number(f.price) : undefined,
      ...(f.locked && f.lock.subscription && f.planIds.length ? { lockPlanIds: f.planIds } : {}),
      topicTagIds: f.topicTagIds,
      groupIds: f.groupIds,
      media: (type === "audio" && f.preview ? [f.preview] : names).map((n) => ({ kind: kind as "image" | "video" | "audio", placeholder: n, ...(f.fileSrc[n] ? { src: f.fileSrc[n] } : {}) })),
      extra,
    };
  };

  const doPublish = () => {
    const r = act("social.publishPost", (d) => void (replaceLinkedDraft(d, apId, workId), link(d, publishPost(d, build("published")), "published")), { need: "content.write" });
    if (!r.ok) return setErr(r.reason);
    setConfirm(false);
    toast("Post published");
    go("feed", { handle });
  };

  const footer = spec.footer ? <LockCollab f={f} set={set} workId={workId ?? null} /> : null;
  // The assistant's work item (if this post came from it) records the saved or published post.
  const link = (d: AppData, postId: string, status: "saved" | "published") => workId && linkSaved(d, workId, { postId }, status);

  return (
    <div data-testid={`newpost-composer-${type}`} className={`mt-[25px] ${spec.width === 800 ? "w-[800px]" : "w-full"}`}>
      <div className="space-y-[8px]">
        {spec.upload && <UploadCard up={spec.upload} files={f.files} fileSrc={f.fileSrc} onFiles={(v, src) => (set("files", v), src && set("fileSrc", { ...f.fileSrc, ...src }))} type={type} />}

        {type === "article" && (
          <>
            <div className={`${card} flex h-[67px] items-center px-[24px]`}>
              <input aria-label="Article title" data-testid="newpost-article-title" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Add Article Title here..." className="w-full bg-transparent text-[14px] font-bold outline-none placeholder:text-muted" />
            </div>
            <ArticleEditor
              html={f.html}
              onChange={(html, plain) => (set("html", html), set("plain", plain))}
              footer={footer}
              handle={handle}
              onGenerated={(r) => {
                if (r.title) set("title", r.title);
                if (r.cover) (set("fileSrc", { ...f.fileSrc, [r.cover.name]: r.cover.src }), set("preview", r.cover.name));
                setAiNote(r.note);
              }}
            />
            {aiNote && (
              <p role="status" data-testid="newpost-ai-note" className="mt-[10px] text-[13px] text-soft">
                {aiNote}
              </p>
            )}
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

      {type === "fundraiser" && <FundraiserCards f={f} set={set} />}

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

      {spec.preview && <PreviewUpload value={f.preview} src={f.preview ? mediaSrc(f.fileSrc[f.preview]) : null} onChange={(v, src) => (set("preview", v), src && set("fileSrc", { ...f.fileSrc, ...src }))} />}

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
                const r = act("social.saveDraftPost", (d) => void (replaceLinkedDraft(d, apId, workId), link(d, publishPost(d, build("draft")), "saved")), { need: "content.write" });
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

/**
 * Mock upload: nothing leaves the browser. Images are kept as a small local copy (so the preview, the
 * published post and a refresh still show them); video and audio play from this tab only (too large
 * to keep), and their name stays on the post.
 */
const PREVIEW_MAX = 1280;
async function localImage(file: File): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, PREVIEW_MAX / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    return c.toDataURL("image/jpeg", 0.82);
  } catch {
    return null; // e.g. HEIC/HEIF, which this browser can't decode: the file name still shows
  }
}
const tabOnly = new Map<string, string>(); // video/audio object URLs for this tab
export async function localMedia(files: File[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const x of files) {
    if (x.type.startsWith("image/")) {
      const u = await localImage(x);
      if (u) out[x.name] = u;
    } else if (x.type.startsWith("video/") || x.type.startsWith("audio/")) {
      const u = URL.createObjectURL(x);
      tabOnly.set(x.name, u);
    }
  }
  return out;
}

function MediaThumb({ name, src, onRemove }: { name: string; src: string | null; onRemove: () => void }) {
  const blob = tabOnly.get(name);
  const video = !src && blob && /\.(mp4|mov|m4v|webm)$/i.test(name);
  const audio = !src && blob && /\.(mp3|wav|m4a|aac|ogg)$/i.test(name);
  return (
    <li data-testid="newpost-file-preview" className={`relative flex flex-col overflow-hidden rounded-popover bg-bg ${audio ? "w-[300px]" : "w-[150px]"}`}>
      {src ? (
        <img src={src} alt={name} className="h-[110px] w-full object-cover" />
      ) : video ? (
        <video src={blob} controls muted playsInline preload="metadata" className="h-[110px] w-full bg-black object-contain" />
      ) : audio ? (
        <audio src={blob} controls preload="metadata" className="mx-[8px] mt-[10px] h-[36px] w-[calc(100%-16px)]" />
      ) : (
        <span className="flex h-[110px] w-full items-center justify-center px-[10px] text-center text-[11px] text-muted">Preview not available for this file type</span>
      )}
      <span className="flex items-center gap-[6px] px-[10px] py-[6px] text-[12px]">
        <span className="min-w-0 flex-1 truncate" title={name}>
          {name}
        </span>
        <button aria-label={`Remove ${name}`} onClick={onRemove} className="shrink-0 hover:text-accent">
          <X size={12} />
        </button>
      </span>
    </li>
  );
}

function UploadCard({ up, files, fileSrc, onFiles, type }: { up: Upload; files: string[]; fileSrc: Record<string, string>; onFiles: (v: string[], src?: Record<string, string>) => void; type: PostType }) {
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
        onChange={async (e) => {
          const picked = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (!picked.length) return;
          const chosen = up.multiple ? picked : picked.slice(0, 1);
          const names = chosen.map((x) => x.name);
          const src = await localMedia(chosen);
          onFiles(up.multiple ? [...files, ...names] : names, src);
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
        <ul className="mt-[14px] flex flex-wrap justify-center gap-[10px] px-[16px]" data-testid="newpost-files">
          {files.map((n, i) => (
            <MediaThumb key={`${n}-${i}`} name={n} src={mediaSrc(fileSrc[n])} onRemove={() => onFiles(files.filter((_, j) => j !== i))} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Lock button label: what the saved Lock asks of fans. */
function lockLabel(f: Form, planName: (id: string) => string) {
  if (!f.locked) return "Lock";
  const parts = [f.lock.subscription && f.planIds.length ? f.planIds.map(planName).join(", ") : null, f.lock.purchase && Number(f.price) > 0 ? money(Number(f.price)) : null, f.lock.points ? `${f.points} Points` : null, f.lock.nft ? "NFT" : null].filter(Boolean);
  return `Locked${parts.length ? ` · ${parts.join(" · ")}` : ""}`;
}

function LockCollab({ f, set, workId }: { f: Form; set: Setter; workId: string | null }) {
  const btn = "inline-flex h-[40px] items-center gap-[10px] rounded-md bg-accent px-[12px] text-[14px] font-medium hover:brightness-110";
  const own = useData((d) => d.account.handle);
  const creators = DEMO_CREATORS.filter((c) => c.handle !== own).map((c) => ({ ...c, avatar: creatorMedia(c.handle).avatar }));
  const plans = useData((d) => d.monetize.plans);
  const planName = (id: string) => plans.find((p) => p.id === id)?.name.replace(/ Plan$/, "") ?? id;
  const initial: LockDraft = { ...f.lock, planIds: f.planIds, price: f.price, pointsValue: f.points, nfts: f.nfts };
  // A first Lock starts with Individual Purchase on (reference newpost-04).
  if (!f.locked && !f.lockOpen) Object.assign(initial, { purchase: true });
  return (
    <div className="border-t border-white/[.08] px-[24px] py-[18px]">
      <div className="flex gap-[8px]">
        <button data-testid="newpost-lock" aria-haspopup="dialog" aria-expanded={f.lockOpen} onClick={() => set("lockOpen", !f.lockOpen)} className={btn}>
          <Tag size={20} className="-scale-x-100" />
          {lockLabel(f, planName)}
        </button>
        <button data-testid="newpost-collaborate" aria-haspopup="dialog" aria-expanded={f.collabOpen} onClick={() => set("collabOpen", !f.collabOpen)} className={btn}>
          <UserPlus size={20} />
          Collaborate
        </button>
      </div>
      {f.collaborators.length > 0 && (
        <p className="mt-[12px] text-[13px] text-soft" data-testid="newpost-collab-tagged">
          Tagged: {f.collaborators.map((h) => `@${h}`).join(", ")}
        </p>
      )}
      <LockDialog
        open={f.lockOpen}
        initial={initial}
        onCancel={() => set("lockOpen", false)}
        onSave={(v) => {
          const any = v.subscription || v.purchase || v.points || v.nft;
          set("lock", { subscription: v.subscription, purchase: v.purchase, points: v.points, nft: v.nft });
          set("planIds", v.subscription ? v.planIds : []);
          set("price", v.purchase ? v.price : "");
          set("points", v.points ? v.pointsValue : "");
          set("nfts", v.nft ? v.nfts : []);
          set("locked", any);
          set("lockOpen", false);
          // Tell the assistant what was saved (it confirms and offers a teaser when it prepared this Lock).
          if (workId) window.dispatchEvent(new CustomEvent("tf:lock-saved", { detail: { workId, lock: v } }));
        }}
      />
      <CollabDialog open={f.collabOpen} creators={creators} selected={f.collaborators} onClose={() => set("collabOpen", false)} onTag={(h) => (set("collaborators", h), set("collabOpen", false))} />
    </div>
  );
}

function InterestsRow({ f, set }: { f: Form; set: Setter }) {
  const toggle = () => set("interestsOpen", !f.interestsOpen);
  return (
    <div className={`${card} mt-[16px] rounded-tile`}>
      <div
        role="button"
        tabIndex={0}
        data-testid="newpost-interests"
        aria-expanded={f.interestsOpen}
        onClick={toggle}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle())}
        className="flex h-[56px] w-full cursor-pointer items-center justify-between px-[20px] text-left text-[14px] font-bold"
      >
        <span className="flex items-center">
          Select Interests
          {f.interests.length > 0 && <span className="ml-[8px] font-normal text-muted">({f.interests.length})</span>}
          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <InfoIcon text={INTERESTS_INFO} />
          </span>
        </span>
        {f.interestsOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
      </div>
      {f.interestsOpen && (
        // Expands in place inside the same card (newpost-08); the platform's own interest list.
        <div className="flex flex-wrap gap-x-[8px] gap-y-[14px] px-[16px] pb-[22px] pt-[6px]" data-testid="newpost-interests-panel">
          {INTERESTS.map((i) => {
            const on = f.interests.includes(i);
            return (
              <button key={i} aria-pressed={on} onClick={() => set("interests", on ? f.interests.filter((x) => x !== i) : [...f.interests, i])} className={`h-[42px] rounded-pill border border-accent px-[22px] text-[14px] font-bold ${on ? "bg-accent" : "hover:bg-accent-tint"}`}>
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

function PreviewUpload({ value, src, onChange }: { value: string | null; src: string | null; onChange: (v: string | null, src?: Record<string, string>) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-[30px]">
      <p className="flex items-center text-[16px]">
        Feed Preview Image*
        <InfoIcon text="This image is shown on the post card in the Feed." />
      </p>
      <input ref={ref} type="file" hidden accept="image/*" data-testid="newpost-preview-file" onChange={async (e) => {
          const x = e.target.files?.[0];
          e.target.value = "";
          if (x) onChange(x.name, await localMedia([x]));
        }}
      />
      <div className="mt-[18px] flex items-center gap-[12px]">
        <button data-testid="newpost-preview-upload" onClick={() => ref.current?.click()} className="flex h-[92px] w-[78px] flex-col items-center justify-center gap-[6px] rounded-tile border border-dashed border-accent text-[14px] text-accent hover:bg-accent-tint">
          <Plus size={22} strokeWidth={1.6} />
          Upload
        </button>
        {value && src && (
          <span data-testid="newpost-preview-thumb" className="relative h-[92px] w-[92px] overflow-hidden rounded-tile bg-surface">
            <img src={src} alt={value} title={value} className="h-full w-full object-cover" />
            <button aria-label="Remove preview image" onClick={() => onChange(null)} className="absolute right-[4px] top-[4px] flex h-[20px] w-[20px] items-center justify-center rounded-full bg-black/70 hover:text-accent">
              <X size={12} />
            </button>
          </span>
        )}
        {value && !src && (
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
  const [cal, setCal] = useState(false);
  const [clock, setClock] = useState(false);
  // Required-option messages show once an option was left empty or Add Another Option was used.
  const [touched, setTouched] = useState<number[]>([]);
  const pill = "relative flex h-[40px] flex-1 items-center justify-between rounded-[20px] bg-bg px-[20px] text-[14px]";
  const need = (i: number) => i < 2 && touched.includes(i) && !f.options[i].trim();
  return (
    <div className={card}>
      <div className="px-[24px] pb-[24px] pt-[25px]">
        <p className="text-[13px] uppercase">Question</p>
        <textarea aria-label="Poll question" data-testid="newpost-poll-question" value={f.question} onChange={(e) => set("question", e.target.value)} placeholder="What’s your poll question?" className="mt-[16px] h-[128px] w-full resize-none rounded-popover bg-bg px-[10px] py-[12px] text-[18px] outline-none placeholder:text-muted" />
        <p className="mt-[24px] text-[13px] uppercase">Poll Expiration</p>
        <div className="relative mt-[16px] flex gap-[24px]">
          <button type="button" data-testid="newpost-poll-date" aria-haspopup="dialog" aria-expanded={cal} onClick={() => setCal((c) => !c)} className={pill}>
            <span className={f.date ? "" : "text-white/80"}>{f.date ? new Date(`${f.date}T00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Select Date"}</span>
            <CalendarDays size={16} className="text-accent" />
          </button>
          <button type="button" data-testid="newpost-poll-time" aria-haspopup="dialog" onClick={() => setClock(true)} className={pill}>
            <span className={f.time ? "" : "text-white/80"}>{f.time ? new Date(`2000-01-01T${f.time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "Select Time"}</span>
            <Clock size={16} className="fill-accent text-bg" />
          </button>
          {cal && <DatePopover value={f.date} onPick={(v) => (set("date", v), setCal(false))} onClose={() => setCal(false)} />}
        </div>
        <TimeDialog open={clock} value={f.time} onPick={(v) => (set("time", v), setClock(false))} onClose={() => setClock(false)} />
        <p className="mt-[12px] text-right text-[12px]">Time Zone - {tz}</p>
        <div className="my-[24px] h-px bg-white/[.12]" />
        <p className="text-[13px] uppercase">Options</p>
        <div className="mt-[16px] space-y-[12px]">
          {f.options.map((o, i) => (
            <div key={i}>
              <div className="relative">
                <input
                  aria-label={`Option ${i + 1}`}
                  aria-invalid={need(i)}
                  data-testid={`newpost-poll-option-${i + 1}`}
                  value={o}
                  onBlur={() => !touched.includes(i) && setTouched([...touched, i])}
                  onChange={(e) => set("options", f.options.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={`Option ${i + 1}`}
                  className={`h-[40px] w-full rounded bg-bg px-[20px] text-[14px] outline-none placeholder:text-white/80 ${need(i) ? "ring-1 ring-danger" : ""}`}
                />
                {i >= 2 && (
                  <button aria-label={`Remove option ${i + 1}`} onClick={() => set("options", f.options.filter((_, j) => j !== i))} className="absolute right-[12px] top-1/2 -translate-y-1/2 text-muted hover:text-white">
                    <X size={14} />
                  </button>
                )}
              </div>
              {need(i) && <p className="mt-[4px] text-[12px] text-danger" data-testid={`newpost-poll-option-error-${i + 1}`}>* Option {i + 1} is required.</p>}
            </div>
          ))}
        </div>
        <div className="mt-[16px] text-right">
          {/* Always adds a row (the captured UI refused while options were empty); empty extra rows are ignored on publish. */}
          <button data-testid="newpost-poll-add-option" onClick={() => (set("options", [...f.options, ""]), setTouched([...new Set([...touched, 0, 1])]))} className="text-[14px] hover:text-accent">
            Add Another Option
          </button>
        </div>
      </div>
      {footer}
    </div>
  );
}

function FundraiserCards({ f, set }: { f: Form; set: Setter }) {
  const products = useData((d) => d.monetize.products);
  const [storeFor, setStoreFor] = useState<number | null>(null);
  const [customFor, setCustomFor] = useState<number | null>(null);
  const row = (i: number, patch: Partial<LevelRow>) => set("rows", f.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const tid = (base: string, i: number) => (i === 0 ? base : `${base}-${i + 1}`);
  const storeItems: PickItem[] = products.filter((p) => p.published).map((p) => ({ id: p.id, label: p.title, sub: p.price != null ? money(p.price) : p.kind, image: p.image ?? null }));
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
        <ul className="mt-[10px] space-y-[8px]" data-testid="newpost-fund-levels">
          {f.rows.map((r, i) => (
            <li key={i} className="flex items-end gap-[14px] px-[6px] pt-[20px]" data-testid={`newpost-fund-row-${i + 1}`}>
              <div className="w-[176px] shrink-0">
                <p className="mb-[14px] flex h-[22px] items-center text-[15px]">Contribution Level Title*</p>
                <input aria-label={`Contribution Level Title ${i + 1}`} data-testid={tid("newpost-fund-level-title", i)} value={r.title} onChange={(e) => row(i, { title: e.target.value })} placeholder="Ex. Silver, Gold, Platinum" className="h-[56px] w-full rounded-pill bg-bg px-[20px] text-[14px] font-bold outline-none placeholder:text-muted" />
              </div>
              <div className="w-[230px] shrink-0">
                <p className="mb-[14px] flex h-[22px] items-center text-[15px]">Contribution Amount*</p>
                <div className="flex h-[56px] items-center rounded-pill bg-bg pl-[20px] pr-[8px]">
                  <span className="mr-[8px] text-[14px] font-bold">$</span>
                  <input aria-label={`Contribution Amount ${i + 1}`} data-testid={tid("newpost-fund-level-amount", i)} inputMode="decimal" value={r.amount} onChange={(e) => row(i, { amount: e.target.value.replace(/[^\d.]/g, "") })} placeholder="Contribution Amount" className="w-full min-w-0 bg-transparent text-[14px] font-bold outline-none placeholder:text-muted" />
                  <span aria-hidden className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full bg-accent/60">
                    <Coins size={16} />
                  </span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-[14px] flex h-[22px] items-center text-[15px]">
                  Optional Gift
                  <InfoIcon text="You can give fans at this level a comped item from your Store, or add a custom gift that you fulfil yourself." />
                </p>
                <div data-testid={tid("newpost-fund-gift", i)}>
                  <Select
                    value={r.gift ? r.gift.name : null}
                    options={["Store Item", "Custom Gift"]}
                    onChange={(v) => (v === "Store Item" ? setStoreFor(i) : setCustomFor(i))}
                  />
                </div>
              </div>
              {f.rows.length > 1 && (
                <button aria-label={`Delete level ${i + 1}`} data-testid={`newpost-fund-delete-${i + 1}`} onClick={() => set("rows", f.rows.filter((_, j) => j !== i))} className="mb-[18px] shrink-0 text-white/80 hover:text-accent">
                  <Trash2 size={18} />
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-[30px] text-right">
          <button data-testid="newpost-fund-add-level" onClick={() => set("rows", [...f.rows, blankRow()])} className="pr-[8px] text-[14px] text-accent hover:brightness-125">
            Add Level
          </button>
        </div>
      </div>
      {/* Dismissing either dialog keeps the gift the row already had (the captured UI cleared it). */}
      <PickerDialog
        open={storeFor != null}
        title="Select Store Item"
        testid="newpost-gift-store"
        items={storeItems}
        empty="No Results Found"
        primary="Add Gift"
        initial={storeFor != null && f.rows[storeFor]?.gift?.kind === "store" ? storeItems.find((s) => s.label === f.rows[storeFor].gift!.name)?.id ?? null : null}
        onClose={() => setStoreFor(null)}
        onPick={(id) => (row(storeFor!, { gift: { kind: "store", name: storeItems.find((s) => s.id === id)!.label } }), setStoreFor(null))}
      />
      <CustomGiftDialog open={customFor != null} onClose={() => setCustomFor(null)} onCreate={(g) => (row(customFor!, { gift: { kind: "custom", name: g.name, note: g.note } }), setCustomFor(null))} />
    </>
  );
}

/* ---------------- article editor (Quill look; contentEditable + execCommand) ---------------- */

type Insert = "store" | "portfolio" | "feed" | "event";
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function ArticleEditor({ html, onChange, footer, handle, onGenerated }: { html: string; onChange: (html: string, plain: string) => void; footer: ReactNode; handle: string; onGenerated: (r: AiResult) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const range = useRef<Range | null>(null);
  const [panel, setPanel] = useState<"emoji" | "link" | "insert" | null>(null);
  const [ai, setAi] = useState(false);
  const [pick, setPick] = useState<Insert | null>(null);
  const [url, setUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileKind, setFileKind] = useState<"Image" | "Video" | "Audio">("Image");
  const data = useData((d) => ({ products: d.monetize.products, portfolios: d.monetize.portfolios, posts: d.social.posts, events: d.monetize.events }));
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) {
      ref.current.innerHTML = html;
      onChange(html, ref.current.innerText);
    }
  }, []);
  const keep = () => {
    const s = window.getSelection();
    if (s && s.rangeCount && ref.current?.contains(s.anchorNode)) range.current = s.getRangeAt(0).cloneRange();
  };
  const restore = () => {
    ref.current?.focus();
    const s = window.getSelection();
    if (range.current && s) (s.removeAllRanges(), s.addRange(range.current));
    else if (ref.current && s) {
      // No caret yet: write at the end.
      const r = document.createRange();
      r.selectNodeContents(ref.current);
      r.collapse(false);
      s.removeAllRanges();
      s.addRange(r);
    }
  };
  const exec = (cmd: string, arg?: string) => {
    restore();
    document.execCommand(cmd, false, arg);
    keep();
    if (ref.current) onChange(ref.current.innerHTML, ref.current.innerText);
  };
  const block = (tag: string) => exec("formatBlock", String(document.queryCommandValue("formatBlock")).toLowerCase() === tag ? "p" : tag);
  const media = (k: "Image" | "Video" | "Audio") => (setFileKind(k), fileRef.current?.click());
  // [icon, label, action, testid suffix when it differs from the label (kept from earlier builds)]
  const tools: [typeof Smile, string, () => void, string?][] = [
    [Smile, "Emoji", () => setPanel(panel === "emoji" ? null : "emoji")],
    [Bold, "Bold", () => exec("bold")],
    [Italic, "Italic", () => exec("italic")],
    [Underline, "Underline", () => exec("underline")],
    [ALargeSmall, "Text size", () => block("h3")],
    [ListOrdered, "Ordered list", () => exec("insertOrderedList")],
    [List, "Bullet list", () => exec("insertUnorderedList")],
    [Link2, "Link", () => (setUrl(""), setPanel(panel === "link" ? null : "link"))],
    [Code, "Code", () => block("pre")],
    [ImagePlus, "Image", () => media("Image")],
    [Video, "Video", () => media("Video")],
    [Volume2, "Audio", () => media("Audio")],
    [Minus, "Horizontal rule", () => exec("insertHorizontalRule")],
    [SquareChartGantt, "AI generated content", () => (setPanel(null), setAi(true)), "ai-image"],
    [SquareCode, "Insert", () => setPanel(panel === "insert" ? null : "insert"), "embed"],
  ];
  const link = (href: string, label: string) => exec("insertHTML", `<p><a href="${esc(href)}">${esc(label)}</a></p><p><br></p>`);
  const addLink = () => {
    let u = url.trim();
    if (!u) return;
    if (!/^(https?:|mailto:|\/)/i.test(u)) u = `https://${u}`;
    setPanel(null);
    const s = range.current;
    if (s && !s.collapsed) exec("createLink", u);
    else exec("insertHTML", `<a href="${esc(u)}">${esc(u)}</a>&nbsp;`);
  };
  const pickers: Record<Insert, { title: string; empty: string; placeholder?: string; pills?: string[]; items: PickItem[]; href: (id: string) => string }> = {
    store: {
      title: "Select Store Item",
      empty: "No Results Found",
      items: data.products.filter((p) => p.published).map((p) => ({ id: p.id, label: p.title, sub: p.price != null ? money(p.price) : p.kind, image: p.image ?? null })),
      href: (id) => pathFor("public-product", { handle, productId: id }),
    },
    portfolio: {
      title: "Select Portfolio Item",
      empty: "No portfolios found",
      items: data.portfolios.map((p) => ({ id: p.id, label: p.title, sub: `${p.type} portfolio`, image: p.banner ?? null })),
      href: (id) => pathFor("public-videos", { handle, portfolioId: id }),
    },
    feed: {
      title: "Select Post to Feature",
      empty: "No Results Found",
      pills: ["All"],
      items: data.posts.filter((p) => p.status === "published").map((p) => ({ id: p.id, label: p.title || p.text.slice(0, 70) || "Untitled post", sub: TYPES.find((t) => t.id === p.type)?.label, image: p.media?.[0]?.src ?? null })),
      href: (id) => pathFor("post-detail", { handle, postId: id }),
    },
    event: {
      title: "Select Event to Feature",
      empty: "No Events Found",
      placeholder: "Search events",
      items: data.events.filter((e) => !e.past).map((e) => ({ id: e.id, label: e.title, sub: `${new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${e.location}`, image: e.image ?? null })),
      href: (id) => pathFor("public-event-detail", { handle, eventId: id }),
    },
  };
  const INSERTS: [Insert, string, typeof Smile][] = [
    ["store", "Insert Store Items", ShoppingBag],
    ["portfolio", "Insert Portfolio Items", FolderOpen],
    ["feed", "Insert Feed Content", Rss],
    ["event", "Insert Event Tickets", Ticket],
  ];
  const cur = pick ? pickers[pick] : null;
  return (
    <div className={card}>
      <div className="relative flex h-[60px] items-center justify-between border-b border-white/[.06] px-[22px]">
        <div className="flex items-center gap-[8px]">
          {tools.map(([I, label, run, tid]) => (
            <button key={label} aria-label={label} title={label} data-testid={`newpost-editor-${tid ?? label.toLowerCase().replace(/\s+/g, "-")}`} onMouseDown={(e) => (e.preventDefault(), keep())} onClick={run} className="flex h-[24px] w-[24px] items-center justify-center hover:text-accent">
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
        {panel === "emoji" && <EmojiPanel onPick={(e) => exec("insertText", e)} onClose={() => setPanel(null)} />}
        {panel === "link" && (
          <Popover testid="newpost-editor-link-panel" onClose={() => setPanel(null)} className="left-[180px] top-[48px] flex w-[320px] items-center gap-[8px] p-[10px]">
            <input autoFocus aria-label="Link URL" data-testid="newpost-editor-link-url" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLink())} placeholder="https://" className="h-[34px] flex-1 rounded-pill bg-bg px-[14px] text-[13px] outline-none placeholder:text-muted" />
            <button data-testid="newpost-editor-link-add" disabled={!url.trim()} onClick={addLink} className="text-[13px] font-black uppercase text-accent disabled:opacity-50">
              Add
            </button>
          </Popover>
        )}
        {panel === "insert" && (
          <Popover testid="newpost-editor-insert-menu" onClose={() => setPanel(null)} className="left-[330px] top-[48px] w-[200px] py-[6px]">
            {INSERTS.map(([k, label, I]) => (
              <button key={k} role="menuitem" data-testid={`newpost-insert-${k}`} onClick={() => (setPanel(null), setPick(k))} className="flex w-full items-center gap-[10px] px-[14px] py-[8px] text-left text-[13px] hover:text-accent">
                <I size={15} />
                {label}
              </button>
            ))}
          </Popover>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        hidden
        data-testid="newpost-editor-file"
        accept={fileKind === "Image" ? "image/*" : fileKind === "Video" ? "video/*" : "audio/*"}
        onChange={(e) => {
          // Mock: only the file name goes into the article; nothing is uploaded.
          const n = e.target.files?.[0]?.name;
          if (n) exec("insertHTML", `<p><em>[${fileKind}: ${esc(n)}]</em></p><p><br></p>`);
          e.target.value = "";
        }}
      />
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label="Article body"
        data-testid="newpost-article-body"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Write some text..."
        onInput={(e) => (keep(), onChange(e.currentTarget.innerHTML, e.currentTarget.innerText))}
        onKeyUp={keep}
        onMouseUp={keep}
        className="min-h-[250px] px-[22px] py-[18px] text-[16px] outline-none empty:before:text-white empty:before:content-[attr(data-placeholder)] [&_a]:text-accent [&_a]:underline [&_h3]:mt-[14px] [&_h3]:text-[20px] [&_h3]:font-bold [&_p+p]:mt-[10px] [&_hr]:my-[10px] [&_hr]:border-white/20 [&_ol]:list-decimal [&_ol]:pl-[24px] [&_pre]:rounded [&_pre]:bg-bg [&_pre]:p-[8px] [&_ul]:list-disc [&_ul]:pl-[24px]"
      />
      {footer}
      <AiDialog
        open={ai}
        onClose={() => setAi(false)}
        onResult={(r) => {
          if (r.html) exec("insertHTML", r.html);
          onGenerated(r);
        }}
      />
      {cur && (
        <PickerDialog
          open
          title={cur.title}
          testid={`newpost-pick-${pick}`}
          items={cur.items}
          empty={cur.empty}
          placeholder={cur.placeholder}
          pills={cur.pills}
          primary="Feature"
          onClose={() => setPick(null)}
          onPick={(id) => {
            const it = cur.items.find((i) => i.id === id)!;
            setPick(null);
            link(cur.href(id), it.label);
          }}
        />
      )}
    </div>
  );
}


/** An Autopilot draft saved earlier is replaced (not duplicated) when the creator saves their edit. */
function replaceLinkedDraft(d: AppData, apId?: string, workId?: string) {
  if (apId) d.social.posts = d.social.posts.filter((p) => !(p.status === "draft" && p.extra?.autopilotDraftId === apId));
  // Saving the assistant's post again replaces its earlier saved draft instead of duplicating it.
  const prev = workId ? itemById(d, workId)?.ref?.postId : undefined;
  if (prev) d.social.posts = d.social.posts.filter((p) => !(p.status === "draft" && p.id === prev));
}
