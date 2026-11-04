/**
 * AI-Assisted Content (Demo 2): the assistant's work items. One model for every content task — a post,
 * a newsletter, an experience, and the weekly plan that links them (parent → children). The existing
 * screens stay the place where things are saved, sent, published or activated; a work item only holds
 * the prepared draft, its sources, media, audience and status, and links to the platform record once
 * the creator saves it there (New Post, New Newsletter, Add Experience read `?work=<id>` to prefill).
 *
 * Copy is deterministic and built only from approved sources (profile, training notes, trick list, fan
 * questions, recent posts, existing experiences). Anything the sources don't say is left in [brackets]
 * for the creator and the item is marked for review. Nothing here publishes, sends or activates.
 *
 * Status words are exact: "draft" prepared here · "approved" editorially approved by the creator (nothing saved or posted) · "needs-input" a business detail is missing (price…) ·
 * "review" something changed underneath and needs a look · "blocked" a platform prerequisite is
 * missing (email sending) · "saved" the platform record exists as a draft/disabled item · "published"
 * / "sent" / "active" read back from the platform · "cancelled" · "failed".
 */
import type { AppData } from "../store";
import type { ID, PostType } from "../model";
import { Refused } from "../refused";

export type WorkKind = "post" | "newsletter" | "experience" | "week" | "bio";
export type WorkStatus = "draft" | "approved" | "needs-input" | "review" | "blocked" | "saved" | "published" | "sent" | "active" | "paused" | "cancelled" | "failed";
export type MediaOrigin = "library" | "generated" | "upload";
/** The New Post Lock dialog's options. */
export type LockMode = "purchase" | "points" | "nft";

export interface WorkMedia {
  key: string;
  label: string;
  origin: MediaOrigin;
  /** Generated (simulated): the visual brief and direction it was made from. */
  brief?: string;
  direction?: string;
  w: number;
  h: number;
}
export interface WorkSource {
  label: string;
  /** Platform record it came from (post id, experience id…), when there is one. */
  ref?: string;
}

/** One proposed Link in Bio change (see slices/bio.ts). */
export interface BioLink {
  key: string;
  title: string;
  /** null = no public destination yet (pending); never invented. */
  url: string | null;
  /** Where it came from, in plain words. */
  source: string;
  /** Platform record (product, post) or work item it points to. */
  refId?: string;
  /** "verified" = checked against TopFan data · "format" = external URL, format checked only · "pending" · "invalid". */
  check: "verified" | "format" | "pending" | "invalid";
  op: "add" | "rename" | "remove" | "move" | "replace";
  /** The existing Link in Bio card it changes (rename / remove / move / replace). */
  existingId?: string;
  /** Its current title, for "Click Here → Explore My Course". */
  from?: string;
  include: boolean;
  /** Why (shown under the row). */
  note?: string;
}
export interface BioPlan {
  mode: "setup" | "promote" | "improve" | "check" | "goal" | "socials" | "style";
  links: BioLink[];
  /** "style" proposals: a profile bio and/or the palette for the Link in Bio page (applied to the editor draft only). */
  profile?: { bio?: string; palette?: number; paletteName?: string; include: { bio: boolean; palette: boolean } };
  /** "in-editor" once opened in the Link in Bio editor; "saved" once Save Changes went through. */
  step: "review" | "in-editor" | "saved";
  /** After saving: what actually landed (read back from the saved page). */
  result?: { applied: number; missing: string[] };
}

export interface WorkItem {
  id: ID;
  kind: WorkKind;
  parentId?: ID;
  /** The creator's words that started it. */
  goal: string;
  /** Short label for lists ("Training update"). */
  label: string;
  /** Weekday it's planned for (0 = Sunday) and a suggested time (ISO). A suggestion, never a schedule. */
  day?: number;
  suggestedAt?: string;
  status: WorkStatus;
  /**
   * locked + lockBy: how fans unlock it, exactly the New Post Lock dialog's options (Individual Purchase =
   * price, Loyalty Points = points, Lock with NFT = contract address). No lockBy on a locked post means
   * Individual Purchase (older items).
   */
  post?: { type: PostType; title?: string; text: string; pollOptions?: string[]; locked: boolean; price: number | null; lockBy?: LockMode[]; points?: number | null; contract?: string | null };
  newsletter?: { title: string; body: string; lock: "Free" | "Subscribers" | "Paid"; audience: "all" | "plans"; planIds: ID[] };
  experience?: { experienceType: string; title: string; description: string; price: number | null; similarTo?: string };
  bio?: BioPlan;
  media?: WorkMedia | null;
  /** What the media should show when none is chosen yet. */
  mediaNeed?: string;
  /** Media the creator turned down (never offered again for this item). */
  rejectedMedia?: string[];
  /** Missing details the creator must give (plain words). */
  needs: string[];
  /** Why it needs a look (dependency changed, unsupported access…). */
  flags: string[];
  sources: WorkSource[];
  /** Other work items this one depends on (newsletter → the post it reuses, announcement → experience). */
  deps: ID[];
  /** How it relates to another item. */
  link?: { rel: "teaser-of" | "announces" | "repurposes"; id: ID };
  /** The platform record once the creator saved it on the original screen. */
  ref?: { postId?: ID; newsletterId?: ID; productId?: ID };
  /** The creator changed it on the original screen; their version wins. */
  editedByCreator?: boolean;
  updatedAt: string;
  error?: string;
}

export interface ContentState {
  items: WorkItem[];
  /** The item the conversation is about ("make it shorter", "this post"). */
  focusId: ID | null;
}

export const initialContent = (): ContentState => ({ items: [], focusId: null });

/* ------------------------------------------------------------------ demo media */

/** Sample photos standing in for generated images (licensed landscapes, not photos of the creator). "Generated" here is simulated. */
export const GENERATED: Record<string, { label: string; direction: string; key: string; w: number; h: number; tone?: "dark" | "wide" | "minimal" | "space" }[]> = {
  training: [
    { label: "Training visual · cinematic", direction: "Cinematic", key: "generated/training-cinematic", w: 1600, h: 900 },
    { label: "Training visual · minimal", direction: "Minimal", key: "generated/training-minimal", w: 1600, h: 900 },
  ],
  revisions: [
    { label: "Training visual · darker", direction: "Darker", key: "generated/training-dark", w: 1600, h: 900, tone: "dark" },
    { label: "Training visual · wide with space for text", direction: "Wider, space for text", key: "generated/training-wide", w: 1600, h: 700, tone: "space" },
  ],
};

/** The creator's approved library (shared with Content Autopilot). */
export const libraryOf = (d: AppData) => d.autopilot.assets.filter((a) => a.approved && a.kind === "image");

const ASSET_SIZE: Record<string, [number, number]> = { "posts/big-air": [1600, 1067], "posts/northpeak-shoot": [1600, 1067] };

/* ------------------------------------------------------------------ helpers */

export const nid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;
export const now = () => new Date().toISOString();
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const itemById = (d: AppData, id: ID | null | undefined) => (id ? d.content.items.find((x) => x.id === id) ?? null : null);
export const childrenOf = (d: AppData, id: ID) => d.content.items.filter((x) => x.parentId === id);
const fact = (d: AppData, sourceId: string, i: number) => d.autopilot.sources.find((s) => s.id === sourceId)?.facts[i] ?? "";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const touch = (x: WorkItem) => void (x.updatedAt = now());

/* ------------------------------------------------------------------ public destinations */

/** The creator's live site (null until it's set up): every public link is built from it. */
export const publicBase = (d: AppData) => (d.account.whiteLabel.status === "active" ? d.account.whiteLabel.siteUrl.replace(/\/$/, "") : null);
/** Booking page of a published experience (TopFan's public "Book" screen). */
export const bookingUrl = (d: AppData, productId: ID) => {
  const base = publicBase(d);
  return base ? `${base}/${d.account.handle}/store/${productId}/book` : null;
};

/** Recent published posts (newest first), the welcome video left out. */
export const recentPosts = (d: AppData, n = 2) =>
  d.social.posts.filter((p) => p.status === "published" && (p.extra as { variant?: string } | undefined)?.variant !== "welcome").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, n);

/** Suggested time for a weekday, from Smart Timing (activity-based or "a time to try"). */
function slotFor(d: AppData, day: number): string {
  const hour = (() => {
    const posts = d.social.posts.filter((p) => p.status === "published");
    if (posts.length < 5) return 18;
    const best = new Map<number, number>();
    for (const p of posts) {
      const h = new Date(p.createdAt).getHours();
      best.set(h, (best.get(h) ?? 0) + p.likes + p.comments * 2 + p.views / 100);
    }
    return [...best.entries()].sort((a, b) => b[1] - a[1])[0][0];
  })();
  const at = new Date();
  at.setHours(hour, 0, 0, 0);
  at.setDate(at.getDate() + ((day - at.getDay() + 7) % 7 || 7));
  return at.toISOString();
}

/* ------------------------------------------------------------------ posts */

export type PostTopic = "training" | "poll" | "exclusive" | "behind" | "article" | "reel" | "teaser" | "announcement";

/** The post format for a goal, when the creator didn't name one. */
export function topicFor(goal: string): PostTopic {
  const g = goal.toLowerCase();
  if (/\bpoll|vote|ask (my )?fans|which .* should\b/.test(g)) return "poll";
  if (/\breel\b/.test(g)) return "reel";
  if (/\barticle|long(er)? (post|read)|write.* about my experience\b/.test(g)) return "article";
  if (/behind the scenes|bts\b/.test(g)) return "behind";
  if (/\bmember|exclusive|premium|gold|silver|bronze|subscriber|paying|lock/.test(g)) return "exclusive";
  return "training";
}

export const TYPE_LABEL: Partial<Record<PostType, string>> = { images: "Images", poll: "Poll", text: "Text", article: "Article", reel: "Reel", video: "Video" };

function postDraft(d: AppData, topic: PostTopic): Pick<WorkItem, "label" | "post" | "sources" | "mediaNeed" | "needs"> {
  const notes = { label: "Training notes (Oct)" };
  const tricks = { label: "Trick list" };
  switch (topic) {
    case "poll":
      return {
        label: "Fan poll",
        post: { type: "poll", text: "Which trick should I film first this season?", pollOptions: [fact(d, "src-tricks", 0), fact(d, "src-tricks", 1), fact(d, "src-tricks", 2)].map(cap), locked: false, price: null },
        sources: [tricks, notes],
        needs: [],
      };
    case "exclusive":
      return {
        label: "Members-only training breakdown",
        post: {
          // TopFan's Text post has no Lock, so a locked post starts as an Images post.
          type: "images",
          text: `For my supporters: a closer look at the ${fact(d, "src-notes", 0).replace(/^working on an? /, "")} I'm working on. [The 2–3 things you're focusing on: approach, setup, landing.] Thanks for backing the season.`,
          locked: true,
          price: null,
        },
        sources: [notes],
        needs: ["Fill in the [bracketed] training details. Only you know them."],
      };
    case "behind":
      return { label: "Behind the scenes", post: { type: "images", text: `${cap(fact(d, "src-notes", 2))}. Here's a look behind the scenes.`, locked: false, price: null }, sources: [notes], mediaNeed: "A photo from the shoot", needs: [] };
    case "article":
      return {
        label: "Training article",
        post: { type: "article", title: "How I'm training this season", text: `${cap(fact(d, "src-notes", 1))}, and I'm ${fact(d, "src-notes", 0)}. [What a typical session looks like.] [What you're aiming for this season.]`, locked: false, price: null },
        sources: [notes],
        mediaNeed: "A cover image",
        needs: ["Add the [bracketed] parts in your own words."],
      };
    case "reel":
      return { label: "Reel", post: { type: "reel", text: `${cap(fact(d, "src-notes", 2))}. First clip 👇`, locked: false, price: null }, sources: [notes], mediaNeed: "A vertical clip of 45 seconds or less", needs: ["Choose a vertical clip (45 s or less). None in your library fits yet."] };
    default:
      return {
        label: "Training update",
        post: { type: "images", text: `${cap(fact(d, "src-notes", 1))} and ${fact(d, "src-notes", 0)}. ${cap(fact(d, "src-notes", 2))} too, so more soon. What should I film first?`, locked: false, price: null },
        sources: [notes],
        mediaNeed: "A training photo",
        needs: [],
      };
  }
}

/** Prepare a post (nothing opens or saves). Returns its id. */
export function createPost(d: AppData, goal: string, opts: { topic?: PostTopic; parentId?: ID; day?: number; link?: WorkItem["link"] } = {}): ID {
  const topic = opts.topic ?? topicFor(goal);
  const p = postDraft(d, topic);
  const id = nid("w-post");
  const item: WorkItem = { id, kind: "post", goal, ...p, parentId: opts.parentId, day: opts.day, suggestedAt: opts.day != null ? slotFor(d, opts.day) : undefined, status: "draft", media: null, flags: [], deps: [], link: opts.link, updatedAt: now() };
  if (item.post!.locked) item.needs.push("An unlock price for the Lock (you set it in New Post).");
  if (item.needs.length) item.status = "needs-input";
  d.content.items.push(item);
  d.content.focusId = id;
  return id;
}

/** "Make it shorter": first sentence(s) only; brackets stay. */
export function shorten(d: AppData, id: ID): boolean {
  const x = itemById(d, id);
  if (!x) return false;
  const cut = (s: string, n: number) => (s.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [s]).slice(0, n).join("").trim();
  if (x.post) x.post.text = cut(x.post.text, 2);
  else if (x.newsletter) x.newsletter.body = x.newsletter.body.split("\n\n").slice(0, 2).join("\n\n");
  else if (x.experience) x.experience.description = cut(x.experience.description, 2);
  else return false;
  touch(x);
  return true;
}

/* ------------------------------------------------------------------ media */

export function attachMedia(d: AppData, id: ID, m: WorkMedia) {
  const x = itemById(d, id);
  if (!x) return;
  if (x.rejectedMedia?.includes(m.key)) throw new Refused("You turned that image down for this post, so I won't attach it.");
  x.media = m;
  // Images posts need a picture; a text post with an image becomes an Images post.
  if (x.post?.type === "text") x.post.type = "images";
  x.needs = x.needs.filter((n) => !/photo|image|clip/i.test(n));
  if (x.status === "needs-input" && !x.needs.length) x.status = "draft";
  touch(x);
}
export function rejectMedia(d: AppData, id: ID) {
  const x = itemById(d, id);
  if (!x?.media) return;
  x.rejectedMedia = [...(x.rejectedMedia ?? []), x.media.key];
  x.media = null;
  touch(x);
}
export function libraryMedia(d: AppData, assetId: ID): WorkMedia | null {
  const a = libraryOf(d).find((x) => x.id === assetId);
  if (!a) return null;
  const [w, h] = ASSET_SIZE[a.src] ?? [1600, 1067];
  return { key: a.src, label: a.label, origin: "library", w, h };
}
/** The image brief for a post, from its own text and the creator's branding (no long prompt needed). */
export function imageBrief(d: AppData, x: WorkItem) {
  const subject = x.post?.type === "poll" ? "a fan poll about tricks" : x.experience ? "a small-group snowboard training session" : x.link?.rel === "teaser-of" ? "a members-only training breakdown (no details shown)" : "snowboard training";
  return `Photo-style image for ${subject}: snowy mountain scenery, graded to the creator's red-and-dark look (${d.account.theme.accent}), 16:9, no people, no logos, room for a caption.`;
}

/** Media checks before attaching (ratio, size, type, rights). Returns a problem, or null. */
export function mediaProblem(x: WorkItem, m: Pick<WorkMedia, "w" | "h" | "origin">): string | null {
  const type = x.post?.type;
  if (type === "reel" && m.w >= m.h) return "Reels need a vertical (portrait) clip. This is a landscape image.";
  if (m.w < 1080) return "This image is too small for a sharp post (under 1080 px wide).";
  return null;
}

/* ------------------------------------------------------------------ audience (the existing Lock) */

/**
 * What the creator asked for, mapped to what TopFan supports. Posts: Public, or the New Post Lock, whose
 * options are Individual Purchase (a price), Loyalty Points (a points amount) and Lock with NFT (holders
 * of an NFT contract the creator pastes). The post Lock has no subscriber or tier option, so a tier
 * request can't be applied to a post; newsletters do support Subscribers Only and specific plans.
 */
export type AudienceAsk = { kind: "public" } | { kind: "locked" } | { kind: "points" } | { kind: "nft" } | { kind: "plan"; plan: string } | { kind: "subscribers" };
export function audienceAsk(text: string): AudienceAsk | null {
  const t = text.toLowerCase();
  const tier = t.match(/\b(gold|silver|bronze|platinum|vip)\b/);
  if (tier && /\b(member|plan|tier|subscriber|only|exclusive)/.test(t)) return { kind: "plan", plan: tier[1] };
  if (/\bnfts?\b|\bholders? of\b|\btoken[- ]gated\b/.test(t)) return { kind: "nft" };
  if (/\bloyalty\b|\b(with|using|for|spend) (their |my )?points\b/.test(t)) return { kind: "points" };
  if (/\bpublic|everyone|anyone\b/.test(t)) return { kind: "public" };
  if (/\bsubscriber|members?\b|paying fans|supporters/.test(t)) return { kind: "subscribers" };
  if (/\block|premium|pay to (unlock|see)|paid\b|individual purchase/.test(t)) return { kind: "locked" };
  return null;
}
export const planByName = (d: AppData, name: string) => d.monetize.plans.find((p) => p.name.toLowerCase().startsWith(name.toLowerCase()) && p.active) ?? null;

/** Loose format check for an NFT contract address the creator pasted (0x + 40 hex). Never invented. */
export const NFT_CONTRACT_RE = /^0x[0-9a-f]{40}$/i;
/** The Lock options in effect (older locked items without lockBy = Individual Purchase). */
export const lockModes = (post: NonNullable<WorkItem["post"]>): LockMode[] => (!post.locked ? [] : post.lockBy?.length ? post.lockBy : ["purchase"]);

const LOCK_NEEDS = /unlock price|loyalty points|contract address/i;
const NEED: Record<LockMode, string> = {
  purchase: "An unlock price for the Lock (you set it in New Post).",
  points: "The loyalty points fans spend to unlock it (you set them in New Post).",
  nft: "The NFT contract address (paste it; I won't guess one).",
};
/** Turn on the post Lock with one option; whatever detail is missing is listed for the creator. */
function lockWith(d: AppData, id: ID, mode: LockMode, patch: { price?: number | null; points?: number | null; contract?: string | null }) {
  const x = itemById(d, id);
  if (!x?.post) return;
  if (x.post.type === "text") x.post.type = "images"; // Text posts have no Lock in TopFan
  x.post.locked = true;
  x.post.lockBy = [mode];
  x.post.price = mode === "purchase" ? patch.price ?? null : null;
  x.post.points = mode === "points" ? patch.points ?? null : null;
  x.post.contract = mode === "nft" ? patch.contract ?? null : null;
  x.needs = x.needs.filter((n) => !LOCK_NEEDS.test(n));
  const missing = mode === "purchase" ? x.post.price == null : mode === "points" ? x.post.points == null : !x.post.contract;
  if (missing) x.needs.push(NEED[mode]);
  x.status = x.needs.length ? "needs-input" : "draft";
  touch(x);
}

/** Make a post public (removes the Lock and its price, points or contract). */
export function setPublic(d: AppData, id: ID) {
  const x = itemById(d, id);
  if (!x?.post) return;
  x.post.locked = false;
  x.post.price = null;
  x.post.lockBy = [];
  x.post.points = null;
  x.post.contract = null;
  x.needs = x.needs.filter((n) => !LOCK_NEEDS.test(n));
  x.flags = x.flags.filter((f) => !/access/i.test(f));
  if (x.status === "needs-input" && !x.needs.length) x.status = "draft";
  touch(x);
}
/** Lock › Individual Purchase (pay to unlock). The price is the creator's to set (in New Post or here). */
export function setLocked(d: AppData, id: ID, price: number | null) {
  if (price != null && !(price > 0)) throw new Refused("An unlock price has to be more than $0.");
  lockWith(d, id, "purchase", { price });
}
/** Lock › Loyalty Points: fans spend this many of their loyalty points to unlock it. */
export function setLockPoints(d: AppData, id: ID, points: number | null) {
  if (points != null && !(Number.isInteger(points) && points > 0)) throw new Refused("Loyalty points have to be a whole number above 0.");
  lockWith(d, id, "points", { points });
}
/** Lock › Lock with NFT: holders of the NFT contract the creator pasted. The format is checked loosely. */
export function setLockNft(d: AppData, id: ID, contract: string | null) {
  const c = contract?.trim() ?? null;
  if (c != null && !NFT_CONTRACT_RE.test(c)) throw new Refused("That doesn't look like an NFT contract address. It should be 0x followed by 40 characters (0–9, a–f).");
  lockWith(d, id, "nft", { contract: c });
}

/** Newsletter audience: everyone, all subscribers, or specific plans (validated against real plans). */
export function setNewsletterAudience(d: AppData, id: ID, ask: AudienceAsk) {
  const x = itemById(d, id);
  if (!x?.newsletter) return;
  if (ask.kind === "plan") {
    const plan = planByName(d, ask.plan);
    if (!plan) throw new Refused(`I couldn't find a ${cap(ask.plan)} membership in your current plans.`);
    Object.assign(x.newsletter, { lock: "Subscribers", audience: "plans", planIds: [plan.id] });
  } else if (ask.kind === "subscribers" || ask.kind === "locked") Object.assign(x.newsletter, { lock: "Subscribers", audience: "plans", planIds: d.monetize.plans.filter((p) => p.active).map((p) => p.id) });
  else Object.assign(x.newsletter, { lock: "Free", audience: "all", planIds: [] });
  touch(x);
}

/** Members-only post → a separate public teaser draft (no protected details, links to Subscriptions). */
export function createTeaser(d: AppData, lockedId: ID): ID {
  const src = itemById(d, lockedId)!;
  const id = createPost(d, "Public teaser", { topic: "teaser", parentId: src.parentId, day: src.day, link: { rel: "teaser-of", id: lockedId } });
  const t = itemById(d, id)!;
  t.label = "Public teaser";
  t.post = { type: "images", text: `New for my supporters this week: a training breakdown I don't share anywhere else. Unlock it on my page, or join a membership for more like it.`, locked: false, price: null };
  t.sources = [{ label: "Your members-only post (topic only, no details)", ref: lockedId }, { label: "Your membership plans" }];
  t.mediaNeed = "A public-safe image";
  t.deps = [lockedId];
  t.needs = [];
  t.status = "draft";
  d.content.focusId = lockedId;
  return id;
}

/* ------------------------------------------------------------------ newsletters */

/** Newsletter draft from a work item's post, or from the latest published posts. */
export function createNewsletter(d: AppData, goal: string, opts: { fromId?: ID; parentId?: ID; day?: number; mentionsId?: ID } = {}): ID {
  const from = itemById(d, opts.fromId);
  const posts = from ? [] : recentPosts(d, 2);
  const sections = from?.post ? [from.post.text] : posts.map((p) => p.text);
  const exp = itemById(d, opts.mentionsId);
  const intro = `Hi everyone, here's what's been happening this week.`;
  const body = [
    intro,
    ...sections.map((s, i) => `${from ? "On my page" : i === 0 ? "Latest" : "Earlier"}: ${s.replace(/\s*#\w+/g, "").trim()}`),
    ...(exp?.experience ? [`Coming up: ${exp.experience.title}. [Day and how to book, once it's live.]`] : []),
    `See everything on my page.`,
  ].join("\n\n");
  const id = nid("w-nl");
  const item: WorkItem = {
    id,
    kind: "newsletter",
    goal,
    label: from ? "Newsletter from your post" : "Weekly newsletter",
    parentId: opts.parentId,
    day: opts.day,
    suggestedAt: opts.day != null ? slotFor(d, opts.day) : undefined,
    status: "draft",
    newsletter: { title: from?.post ? `This week: ${from.label.toLowerCase()}` : "This week on the mountain", body, lock: "Free", audience: "all", planIds: [] },
    media: null,
    mediaNeed: "A cover image (optional)",
    needs: [],
    flags: [],
    sources: from ? [{ label: `Your post draft: ${from.label}`, ref: from.id }] : posts.map((p) => ({ label: `Your post: "${p.text.slice(0, 40)}${p.text.length > 40 ? "…" : ""}"`, ref: p.id })),
    deps: [...(from ? [from.id] : []), ...(exp ? [exp.id] : [])],
    link: from ? { rel: "repurposes", id: from.id } : undefined,
    updatedAt: now(),
  };
  checkEmail(d, item);
  d.content.items.push(item);
  d.content.focusId = id;
  return id;
}

/** Sending needs a verified sender: the draft is ready but blocked until then (saving still works). */
export function checkEmail(d: AppData, x: WorkItem) {
  const ok = d.prefsB.outboundEmail.status === "verified";
  x.flags = x.flags.filter((f) => !/email sending/i.test(f));
  if (!ok) {
    x.flags.push("Email sending needs verification before this can be sent.");
    if (x.status === "draft") x.status = "blocked";
  } else if (x.status === "blocked") x.status = "draft";
}

/* ------------------------------------------------------------------ experiences */

export const EXPERIENCE_FORMAT = (goal: string) => {
  const g = goal.toLowerCase();
  if (/\b(call|video call|1:1|one[- ]on[- ]one|coaching call|zoom)\b/.test(g)) return "1:1 Video Call";
  if (/\bpersonali[sz]ed video|shout ?out\b/.test(g)) return "Personalized Video";
  return "In Person Session";
};
/** Ticketed, fixed-date events are a different feature (Events & Ticketing). */
export const wantsEvent = (goal: string) => /\b(ticket|tickets|meet[- ]?up|concert|show|event on|fixed date|for \d+ (people|fans))\b/i.test(goal);

export function createExperience(d: AppData, goal: string, opts: { parentId?: ID; day?: number } = {}): ID {
  const type = EXPERIENCE_FORMAT(goal);
  const group = /\bgroup|small[- ]group\b/i.test(goal) || !!opts.parentId;
  const title = type === "1:1 Video Call" ? "1:1 Riding Technique Call" : group ? "Small-Group Training Session" : "Private Training Session";
  const similar = d.monetize.products.find((p) => p.kind === "experience" && p.experienceType === type);
  const description = `Ride with me and work on your technique. I'm ${fact(d, "src-notes", 0)} right now, so expect real coaching from what I'm practicing myself. [What participants should bring or know.]`;
  const id = nid("w-exp");
  d.content.items.push({
    id,
    kind: "experience",
    goal,
    label: title,
    parentId: opts.parentId,
    day: opts.day,
    status: "needs-input",
    experience: { experienceType: type, title, description, price: null, similarTo: similar?.title },
    media: null,
    mediaNeed: "A cover image",
    needs: ["Price per session (you decide)"],
    flags: [],
    sources: [{ label: "Training notes (Oct)" }, ...(similar ? [{ label: `Your existing experience: ${similar.title}`, ref: similar.id }] : [])],
    deps: [],
    updatedAt: now(),
  });
  d.content.focusId = id;
  return id;
}

export function setExperiencePrice(d: AppData, id: ID, price: number) {
  const x = itemById(d, id);
  if (!x?.experience) return;
  if (!(price > 0)) throw new Refused("Experiences in TopFan need a price above $0. For a free session, an Event or a post may fit better.");
  x.experience.price = Math.round(price * 100) / 100;
  x.needs = x.needs.filter((n) => !/price/i.test(n));
  if (x.status === "needs-input" && !x.needs.length) x.status = "draft";
  touch(x);
}

/** Announcement post for an experience (links to it; the booking link only exists once it's live). */
export function createAnnouncement(d: AppData, expId: ID): ID {
  const e = itemById(d, expId)!;
  const id = createPost(d, `Announce ${e.experience!.title}`, { topic: "announcement", parentId: e.parentId, day: e.day != null ? (e.day + 5) % 7 : undefined, link: { rel: "announces", id: expId } });
  const x = itemById(d, id)!;
  x.label = "Experience announcement";
  x.post = { type: "images", text: `New: ${e.experience!.title}. ${e.experience!.description.split(". ")[0]}. Book it on my page.`, locked: false, price: null };
  x.sources = [{ label: `Your experience draft: ${e.experience!.title}`, ref: expId }];
  x.mediaNeed = "A photo or visual for the session";
  x.deps = [expId];
  x.needs = e.ref?.productId ? [] : ["The booking link works once the experience is saved and enabled."];
  x.status = x.needs.length ? "needs-input" : "draft";
  return id;
}

/* ------------------------------------------------------------------ the week (parent + children) */

/** "Plan my week": a parent with linked children built from the creator's goal and sources. */
export function createWeek(d: AppData, goal: string): ID {
  const g = goal.toLowerCase();
  const id = nid("w-week");
  d.content.items.push({ id, kind: "week", goal, label: "Your week", status: "draft", needs: [], flags: [], sources: [], deps: [], updatedAt: now() });
  const wants = {
    exclusive: !/no (exclusive|members)/.test(g),
    newsletter: !/no newsletter/.test(g),
    experience: !/no (experience|session)/.test(g),
  };
  // A week built to promote the experience opens with its announcement instead (added with the experience).
  if (!/\bpromote\b/.test(g) || /no (experience|session)/.test(g)) createPost(d, "Training update", { topic: "training", parentId: id, day: 1 });
  const mon = d.content.items[d.content.items.length - 1];
  // Library photo suggested for the public post (approved media only).
  const lib = libraryMedia(d, "as-park");
  if (lib) attachMedia(d, mon.id, lib);
  if (wants.exclusive) createPost(d, "Members-only training breakdown", { topic: "exclusive", parentId: id, day: 3 });
  const exp = wants.experience ? createExperience(d, "Small-group training session", { parentId: id, day: 6 }) : undefined;
  if (wants.newsletter) createNewsletter(d, "Weekly fan update", { parentId: id, day: 5, mentionsId: exp });
  d.content.focusId = id;
  return id;
}

/** Counts for the week overview. */
export function weekSummary(d: AppData, id: ID) {
  const kids = childrenOf(d, id).filter((x) => x.status !== "cancelled");
  const n = (k: WorkKind) => kids.filter((x) => x.kind === k).length;
  return {
    posts: n("post"),
    newsletters: n("newsletter"),
    experiences: n("experience"),
    links: n("bio"),
    ready: kids.filter((x) => x.status === "draft" && !x.flags.length).length,
    approved: kids.filter((x) => x.status === "approved").length,
    input: kids.filter((x) => x.status === "needs-input").length,
    review: kids.filter((x) => x.status === "review" || x.status === "blocked" || x.flags.length).length,
    done: kids.filter((x) => ["saved", "published", "sent", "active"].includes(x.status)).length,
  };
}

/** Move an item to another day (only that item; linked items are told). */
export function moveTo(d: AppData, id: ID, day: number) {
  const x = itemById(d, id);
  if (!x) return;
  if (x.status === "published" || x.status === "sent") throw new Refused("That one is already out, so I can't move it.");
  x.day = day;
  if (x.kind !== "experience") x.suggestedAt = slotFor(d, day);
  touch(x);
  if (x.kind === "experience") flagDependents(d, id, `The experience moved to ${DAY_NAMES[day]}. Check any day you mention.`);
}

/** Something this item depends on changed: flag (never rewrite) unpublished dependents. */
export function flagDependents(d: AppData, id: ID, why: string) {
  for (const y of d.content.items) {
    if (!y.deps.includes(id) || ["published", "sent", "cancelled"].includes(y.status)) continue;
    if (!y.flags.includes(why)) y.flags.push(why);
    if (y.status === "draft" || y.status === "saved") y.status = "review";
    touch(y);
  }
}

/** Rename a prepared experience; everything that mentions or links it is flagged for review (never auto-edited). */
export function renameExperience(d: AppData, id: ID, title: string) {
  const x = itemById(d, id);
  if (!x?.experience) throw new Refused("I couldn't find that experience.");
  const t = title.trim().replace(/^["']|["'.]$/g, "").slice(0, 80);
  if (!t) throw new Refused("What should the new title be?");
  if (["published", "sent", "active"].includes(x.status)) throw new Refused(`${x.experience.title} is already live, so change its title on its own page in Experiences.`);
  const old = x.experience.title;
  if (old === t) return;
  x.experience.title = t;
  if (x.label === old) x.label = t;
  touch(x);
  flagDependents(d, id, `The experience was renamed from "${old}" to "${t}": check this still matches.`);
}

/** Cancel one item (unrelated items untouched; dependents flagged). */
export function cancelItem(d: AppData, id: ID) {
  const x = itemById(d, id);
  if (!x) return;
  x.status = "cancelled";
  touch(x);
  const what = x.kind === "experience" ? `${x.experience!.title} was removed, so don't call it upcoming.` : `${x.label} was removed.`;
  flagDependents(d, id, what);
}

/** The creator looked at a flag and it's fine now. */
export function clearFlags(d: AppData, id: ID) {
  const x = itemById(d, id);
  if (!x) return;
  x.flags = x.flags.filter((f) => /email sending/i.test(f));
  if (x.status === "review") x.status = x.ref ? "saved" : x.needs.length ? "needs-input" : "draft";
  if (x.kind === "newsletter") checkEmail(d, x);
  touch(x);
}

/** Editorial approval of the week's ready drafts (nothing is saved, sent, published or activated). */
export function approveReady(d: AppData, parentId: ID): ID[] {
  const ids: ID[] = [];
  for (const x of childrenOf(d, parentId)) {
    if (x.status !== "draft" || x.flags.length || x.needs.length) continue;
    x.status = "approved";
    touch(x);
    ids.push(x.id);
  }
  return ids;
}

export function setPaused(d: AppData, id: ID, paused: boolean) {
  const x = itemById(d, id);
  if (!x) return;
  x.status = paused ? "paused" : "draft";
  touch(x);
}

/** Membership plans changed: locked items that named a plan are revalidated. */
export function revalidatePlans(d: AppData) {
  for (const x of d.content.items) {
    if (!x.newsletter || x.newsletter.audience !== "plans") continue;
    const gone = x.newsletter.planIds.filter((id) => !d.monetize.plans.some((p) => p.id === id && p.active));
    if (gone.length) {
      x.newsletter.planIds = x.newsletter.planIds.filter((id) => !gone.includes(id));
      const why = "A membership plan it was going to had changed or was removed. Choose the audience again.";
      if (!x.flags.includes(why)) x.flags.push(why);
      x.status = "review";
      touch(x);
    }
  }
}

/* ------------------------------------------------------------------ the original screens (hand-off and read-back) */

export function focus(d: AppData, id: ID | null) {
  d.content.focusId = id;
}

/** The creator edited fields on the original screen: their text wins from now on. */
export function syncFromScreen(d: AppData, id: ID, patch: { text?: string; title?: string; body?: string; description?: string; price?: number | null; locked?: boolean; lockBy?: LockMode[]; points?: number | null; contract?: string | null }) {
  const x = itemById(d, id);
  if (!x) return;
  let changed = false;
  if (x.post) {
    if (patch.text != null && patch.text !== x.post.text) (x.post.text = patch.text), (changed = true);
    if (patch.title != null && patch.title !== (x.post.title ?? "")) (x.post.title = patch.title), (changed = true);
    if (patch.locked != null && patch.locked !== x.post.locked) (x.post.locked = patch.locked), (changed = true);
    if (patch.price !== undefined && patch.price !== x.post.price) {
      x.post.price = patch.price;
      changed = true;
      if (x.post.locked && patch.price && patch.price > 0) x.needs = x.needs.filter((n) => !/unlock price/i.test(n));
    }
    if (patch.lockBy && patch.lockBy.join() !== (x.post.lockBy ?? []).join()) (x.post.lockBy = [...patch.lockBy]), (changed = true);
    if (patch.points !== undefined && patch.points !== (x.post.points ?? null)) {
      x.post.points = patch.points;
      changed = true;
      if (patch.points && patch.points > 0) x.needs = x.needs.filter((n) => !/loyalty points/i.test(n));
    }
    if (patch.contract !== undefined && patch.contract !== (x.post.contract ?? null)) {
      x.post.contract = patch.contract;
      changed = true;
      if (patch.contract) x.needs = x.needs.filter((n) => !/contract address/i.test(n));
    }
    if (!x.post.locked) x.needs = x.needs.filter((n) => !LOCK_NEEDS.test(n));
  }
  if (x.newsletter) {
    if (patch.title != null && patch.title !== x.newsletter.title) (x.newsletter.title = patch.title), (changed = true);
    if (patch.body != null && patch.body !== x.newsletter.body) (x.newsletter.body = patch.body), (changed = true);
  }
  if (x.experience) {
    if (patch.title != null && patch.title !== x.experience.title) (x.experience.title = patch.title), (changed = true);
    if (patch.description != null && patch.description !== x.experience.description) (x.experience.description = patch.description), (changed = true);
    if (patch.price !== undefined && patch.price !== x.experience.price && patch.price) {
      x.experience.price = patch.price;
      x.needs = x.needs.filter((n) => !/price/i.test(n));
      changed = true;
    }
  }
  if (!changed) return;
  x.editedByCreator = true;
  if (x.status === "needs-input" && !x.needs.length) x.status = "draft";
  touch(x);
  if (x.kind === "experience") flagDependents(d, id, "The experience details changed. Check what the announcement says.");
}

/** The original screen saved / published / sent the record. Only these calls move status forward. */
export function linkSaved(d: AppData, id: ID, ref: WorkItem["ref"], status: Extract<WorkStatus, "saved" | "published" | "sent" | "active">) {
  const x = itemById(d, id);
  if (!x) return;
  x.ref = { ...x.ref, ...ref };
  x.status = status;
  x.needs = x.needs.filter((n) => !/once the experience is saved/i.test(n));
  touch(x);
  // An experience that now exists makes its announcement's booking link real.
  if (x.kind === "experience")
    for (const y of d.content.items) {
      if (y.link?.rel === "announces" && y.link.id === id) {
        y.needs = y.needs.filter((n) => !/booking link/i.test(n));
        if (y.status === "needs-input" && !y.needs.length) y.status = "draft";
      }
      // A pending Link in Bio update gets its real booking link once the experience is enabled.
      if (y.kind === "bio" && y.bio && y.status !== "cancelled")
        for (const l of y.bio.links) {
          if (l.refId !== id) continue;
          const url = status === "active" && ref?.productId ? bookingUrl(d, ref.productId) : null;
          if (url) {
            Object.assign(l, { url, refId: ref!.productId, check: "verified" as const, note: "Booking page of your experience (checked: enabled in your Store)" });
            y.needs = y.needs.filter((n) => !/booking link|enabled/i.test(n));
            if (y.status === "needs-input" && !y.needs.length) y.status = "draft";
          } else l.note = "Saved but disabled: enable it in Experiences to get a booking link";
          touch(y);
        }
    }
}
