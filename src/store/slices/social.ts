/**
 * Posts (feed, drafts), livestreams, public social pages (welcome modal, chat room, leaderboards).
 * Owned by the Social build. Expand freely: keep the exported names (SocialState, initialSocial).
 * Actions are plain functions that mutate a draft: act("label", (d) => myAction(d, …)).
 *
 * All seed data is fictional (creator: AJ White, US freestyle snowboarder). Captions are neutral and
 * written for this mock; media are placeholders rendered with ImageSlot.
 */
import type { AppData } from "../store";
import type { ID, Post, PostType } from "../model";

/* ---------------- per-type extras (stored in Post.extra) ---------------- */

export interface PollOption {
  label: string;
  votes: number;
}
export interface FundraiserLevel {
  title: string;
  amount: number;
  gift: string | null;
}
/** Shape of Post.extra used by this area. Every field is optional. */
export interface PostExtra {
  /** Set when the post came from (or was edited for) a Content Autopilot draft; links the two. */
  autopilotDraftId?: string;
  /** "welcome" = the creator's welcome video (no badge); "downloadable" = file post (badge "Downloadable"). */
  variant?: "welcome" | "downloadable";
  imageCount?: number;
  poll?: { question: string; options: PollOption[]; endsAt: string | null };
  fundraiser?: { raised: number; goal: number; allowBeyond: boolean; levels: FundraiserLevel[]; contributions: number };
  link?: { url: string };
  giveaway?: { cta: string; responses: number };
  file?: { title: string };
  audio?: { duration: number }; // seconds
  previewImage?: string | null; // file name of the Feed Preview Image (mock upload)
  fileName?: string | null; // main upload (mock: file name only)
  discovery?: boolean;
  requireSignIn?: boolean;
  sensitive?: boolean;
  interests?: string[];
  collaborators?: string[];
  /** Unlabeled DISABLE / ENABLE control on New Post (inferred meaning). */
  featureEnabled?: boolean;
}

export const extraOf = (p: Post) => (p.extra ?? {}) as PostExtra;

/* ---------------- area types ---------------- */

/** Featured store items shown in the Feed right rail and the Home merchandise grid (fictional). */
export interface ShowcaseItem {
  id: ID;
  title: string;
  description: string;
  price: number | null;
  kind: "downloadable" | "nft" | "merchandise" | "experience";
  /** Show in the Feed right rail. */
  rail: boolean;
  /** Show in the Home "Merchandise" grid. */
  home: boolean;
}

export interface ChatMessage {
  id: ID;
  author: string;
  text: string;
  at: string;
  mine: boolean;
}

export interface PostComment {
  id: ID;
  postId: ID;
  author: string;
  text: string;
  at: string;
}

export interface LeaderboardRow {
  id: ID;
  name: string;
  username: string;
  points: number;
}

export interface SocialState {
  /* --- cross-section contract (keep these fields; others read them) --- */
  posts: Post[];
  /* --- area fields --- */
  /** Post ids the signed-in viewer liked. */
  likedByMe: ID[];
  /** Pinned post (shown above "My Posts"). */
  pinnedPostId: ID | null;
  /** Article composer auto-saved draft (New Post › ARTICLE). */
  articleDraft: { title: string; html: string; savedAt: string };
  livestream: { status: "idle" | "live"; startedAt: string | null };
  showcase: ShowcaseItem[];
  chatRoom: ChatMessage[];
  /** Comments written in this mock (seeded counts live on Post.comments). */
  postComments: PostComment[];
  leaderboard: LeaderboardRow[];
  newsletterSignups: string[];
}

/* ---------------- seed ---------------- */

const base = { status: "published" as const, locked: false, topicTagIds: [], groupIds: [], tips: 0 };
const post = (p: Partial<Post> & { id: string; type: PostType; text: string; createdAt: string }): Post => ({
  ...base,
  likes: 0,
  comments: 0,
  views: 0,
  ...p,
});

const seedPosts: Post[] = [
  post({ id: "p-welcome", type: "video", text: "Hi everyone, welcome to my new fan community!", createdAt: "2026-01-04T17:00:00Z", likes: 2, comments: 3, views: 412, media: [{ kind: "video", placeholder: "Welcome video" }], extra: { variant: "welcome" } }),
  post({ id: "p-1", type: "images", text: "Back home after a long travel week. Thanks for all the messages, team USA!", createdAt: "2026-10-28T15:00:00Z", comments: 10, views: 980, media: [{ kind: "image", placeholder: "Opening ceremony" }, { kind: "image", placeholder: "On the hill" }, { kind: "image", placeholder: "Halfpipe run" }], extra: { imageCount: 3 } }),
  post({ id: "p-2", type: "images", text: "First turns of the season on a glacier trip. Snow was perfect.", createdAt: "2026-10-21T15:00:00Z", likes: 4, comments: 2, views: 640, media: [{ kind: "image", placeholder: "Glacier park" }] }),
  post({ id: "p-3", type: "fundraiser", text: "I'm raising money to cover travel and coaching for next season's qualifier events. Every bit helps!", createdAt: "2026-10-14T15:00:00Z", comments: 2, views: 512, media: [{ kind: "image", placeholder: "Fundraiser cover" }], extra: { fundraiser: { raised: 1250, goal: 25000, allowBeyond: true, contributions: 4, levels: [{ title: "Bronze", amount: 100, gift: null }, { title: "Silver", amount: 250, gift: null }, { title: "Gold", amount: 500, gift: null }] } } }),
  post({ id: "p-4", type: "images", text: "My quick guide to riding switch is ready #sports", createdAt: "2026-10-07T15:00:00Z", likes: 2, comments: 4, views: 377, locked: true, media: [{ kind: "image", placeholder: "Riding switch cover" }], extra: { variant: "downloadable", file: { title: "E-book: Riding Switch Basics" } } }),
  post({ id: "p-5", type: "video", text: "Throwback to my favorite run of last winter. #sports #snowboarding", createdAt: "2026-09-30T15:00:00Z", likes: 2, comments: 8, views: 1290, media: [{ kind: "video", placeholder: "Competition run" }] }),
  post({ id: "p-6", type: "images", text: "Getting BIG air in the park last weekend #snowboarding", createdAt: "2026-09-23T15:00:00Z", likes: 5, comments: 8, views: 860, media: [{ kind: "image", placeholder: "Big air" }] }),
  post({ id: "p-7", type: "giveaway", text: "Giving away 10 beanies to fans. To enter, tell me your favorite mountain to ride! You must be a subscriber to enter.", createdAt: "2026-09-16T15:00:00Z", likes: 1, comments: 1, views: 302, media: [{ kind: "image", placeholder: "Beanie giveaway" }], extra: { giveaway: { cta: "Submit Answer", responses: 1 } } }),
  post({ id: "p-8", type: "article", title: "Ready for new heights", text: "Ready for new heights: how I'm training this off-season #training #travel", createdAt: "2026-09-09T15:00:00Z", likes: 3, comments: 14, views: 744, media: [{ kind: "image", placeholder: "Article cover" }] }),
  post({ id: "p-9", type: "audio", text: "Listen to my chat on a snowboarding podcast about training and travel", createdAt: "2026-09-02T15:00:00Z", likes: 2, comments: 12, views: 410, media: [{ kind: "audio", placeholder: "Podcast cover" }], extra: { audio: { duration: 1001 } } }),
  post({ id: "p-10", type: "link", text: "Check out my new goggle collab", createdAt: "2026-08-26T15:00:00Z", likes: 1, comments: 2, views: 233, media: [{ kind: "image", placeholder: "Goggle collab" }], extra: { link: { url: "https://example.com/goggles" } } }),
  post({ id: "p-11", type: "poll", text: "Which board should I ride at the next contest? #sports #contest", createdAt: "2026-08-19T15:00:00Z", comments: 2, views: 518, media: [{ kind: "image", placeholder: "Two boards" }], extra: { poll: { question: "Which board should I ride at the next contest?", endsAt: "2026-03-21T15:30:00", options: [{ label: "Summit Twin", votes: 4 }, { label: "Park Classic", votes: 1 }] } } }),
  post({ id: "p-12", type: "images", text: "Some of my favorite photos from the #contest series!", createdAt: "2026-08-12T15:00:00Z", comments: 6, views: 655, media: [{ kind: "image", placeholder: "Photo 1" }, { kind: "image", placeholder: "Photo 2" }, { kind: "image", placeholder: "Photo 3" }, { kind: "image", placeholder: "Photo 4" }], extra: { imageCount: 4 } }),
  post({ id: "p-13", type: "text", text: "Thanks for an amazing season, everyone. More sessions coming soon!", createdAt: "2026-08-05T15:00:00Z", likes: 1, views: 190 }),
];

export const initialSocial: SocialState = {
  posts: seedPosts,
  likedByMe: ["p-welcome", "p-5", "p-6"],
  pinnedPostId: "p-welcome",
  articleDraft: { title: "", html: "", savedAt: "2026-08-18T09:22:00" },
  livestream: { status: "idle", startedAt: null },
  showcase: [
    { id: "s-ebook-switch", title: "E-book: Riding Switch Basics", description: "A short guide to riding switch with confidence.", price: null, kind: "downloadable", rail: true, home: false },
    { id: "s-pin", title: "Summit Collectible Pin", description: "Limited digital collectible.", price: 350, kind: "nft", rail: true, home: false },
    { id: "s-ebook-tune", title: "E-Book: Tune Your Board", description: "Step-by-step board tuning at home.", price: null, kind: "downloadable", rail: true, home: false },
    { id: "s-board-1", title: "Signature Series Board", description: "All Mountain / Powder Snowboard. A versatile board built for big days and deep snow.", price: 799.95, kind: "merchandise", rail: true, home: true },
    { id: "s-board-2", title: "Park Twin Board", description: "All Mountain / Park Snowboard. A true twin with plenty of pop for the park.", price: 529.95, kind: "merchandise", rail: false, home: true },
    { id: "s-board-3", title: "All-Mountain Classic", description: "All Mountain Snowboard. A poppy, versatile and fun board with twin flex.", price: 899.95, kind: "merchandise", rail: false, home: true },
    { id: "s-pack", title: "Backcountry Airbag Pack", description: "A light, tech-forward airbag pack for backcountry days.", price: 1399, kind: "merchandise", rail: false, home: true },
  ],
  chatRoom: [
    { id: "c1", author: "Riley Snow", text: "Hey everyone! Who's riding this weekend?", at: "2026-11-01T16:02:00Z", mine: false },
    { id: "c2", author: "Morgan Peak", text: "Me! First park day of the season.", at: "2026-11-01T16:05:00Z", mine: false },
    { id: "c3", author: "AJ White", text: "Have fun out there, and send clips!", at: "2026-11-01T16:09:00Z", mine: true },
  ],
  postComments: [],
  leaderboard: [
    { id: "l1", name: "Riley Snow", username: "rileysnow", points: 1240 },
    { id: "l2", name: "Morgan Peak", username: "morganpeak", points: 985 },
    { id: "l3", name: "Casey Drift", username: "caseydrift", points: 760 },
    { id: "l4", name: "Jordan Ridge", username: "jordanridge", points: 540 },
    { id: "l5", name: "Taylor Frost", username: "taylorfrost", points: 315 },
  ],
  newsletterSignups: [],
};

/* ---------------- selectors ---------------- */

/** Published posts, newest first. */
export const publishedPosts = (d: AppData) =>
  d.social.posts.filter((p) => p.status === "published").sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/* ---------------- actions (call inside act()) ---------------- */

export interface NewPostInput {
  type: PostType;
  text: string;
  title?: string;
  locked?: boolean;
  price?: number;
  topicTagIds?: ID[];
  groupIds?: ID[];
  media?: Post["media"];
  extra?: PostExtra;
  status?: "published" | "draft";
}

/** Publish (or save as draft) a new post; it appears at the top of the Feed. Returns the new id. */
export function publishPost(d: AppData, input: NewPostInput): ID {
  const id = `p-${Date.now().toString(36)}`;
  d.social.posts.unshift({
    id,
    type: input.type,
    title: input.title,
    text: input.text,
    createdAt: new Date().toISOString(),
    status: input.status ?? "published",
    locked: !!input.locked,
    price: input.price,
    topicTagIds: input.topicTagIds ?? [],
    groupIds: input.groupIds ?? [],
    likes: 0,
    comments: 0,
    tips: 0,
    views: 0,
    media: input.media,
    extra: input.extra as Record<string, unknown> | undefined,
  });
  if (input.type === "article" && input.status !== "draft") d.social.articleDraft = { title: "", html: "", savedAt: d.social.articleDraft.savedAt };
  return id;
}

/** Delete a post (and unpin it if it was pinned). */
export function deletePost(d: AppData, id: ID) {
  d.social.posts = d.social.posts.filter((p) => p.id !== id);
  d.social.likedByMe = d.social.likedByMe.filter((x) => x !== id);
  if (d.social.pinnedPostId === id) d.social.pinnedPostId = null;
}

/** Pin a post above "My Posts" (only one pinned post; pinning it again unpins). */
export function togglePin(d: AppData, id: ID) {
  d.social.pinnedPostId = d.social.pinnedPostId === id ? null : id;
}

/** Edit a post's caption (inferred: the Edit Post flow was not captured). */
export function editPostText(d: AppData, id: ID, text: string) {
  const p = d.social.posts.find((x) => x.id === id);
  if (p) p.text = text;
}

/** Like / unlike a post as the current viewer. */
export function toggleLike(d: AppData, id: ID) {
  const p = d.social.posts.find((x) => x.id === id);
  if (!p) return;
  const liked = d.social.likedByMe.includes(id);
  d.social.likedByMe = liked ? d.social.likedByMe.filter((x) => x !== id) : [...d.social.likedByMe, id];
  p.likes = Math.max(0, p.likes + (liked ? -1 : 1));
}

/** Vote in a poll (mock: adds one vote to the option). */
export function votePoll(d: AppData, id: ID, optionIndex: number) {
  const p = d.social.posts.find((x) => x.id === id);
  const poll = p && extraOf(p).poll;
  if (poll?.options[optionIndex]) poll.options[optionIndex].votes += 1;
}

/** Auto-save the Article composer draft. */
export function saveArticleDraft(d: AppData, title: string, html: string) {
  d.social.articleDraft = { title, html, savedAt: new Date().toISOString() };
}

/** Start an instant livestream (mock: no stream is started, only a flag). */
export function startLivestream(d: AppData) {
  d.social.livestream = { status: "live", startedAt: new Date().toISOString() };
}

/** End the mock livestream. */
export function endLivestream(d: AppData) {
  d.social.livestream = { status: "idle", startedAt: null };
}

/** Post a message in the public Chat Room. */
export function sendChatMessage(d: AppData, author: string, text: string, mine = true) {
  d.social.chatRoom.push({ id: `c-${Date.now().toString(36)}`, author, text, at: new Date().toISOString(), mine });
}

/** Add a comment to a post (mock). */
export function addComment(d: AppData, postId: ID, author: string, text: string) {
  d.social.postComments.push({ id: `pc-${Date.now().toString(36)}`, postId, author, text, at: new Date().toISOString() });
  const p = d.social.posts.find((x) => x.id === postId);
  if (p) p.comments += 1;
}

/** Home › newsletter block: record an email sign-up (mock, no email is sent). */
export function joinNewsletter(d: AppData, email: string) {
  if (!d.social.newsletterSignups.includes(email)) d.social.newsletterSignups.push(email);
}

/**
 * Dev-only mock auth: sets the demo session's fan view (no credentials are checked or stored).
 * Writes account.session.fanView, which the core slice declares for this purpose.
 */
export function setFanView(d: AppData, view: "creator" | "fan" | "logged-out") {
  d.account.session.fanView = view;
}

export type _Draft = AppData;
