/**
 * TopFan Content Autopilot (review by exception). The assistant prepares a weekly batch of post
 * drafts from APPROVED sources, checks them, and asks the creator only about what needs a decision.
 *
 * Everything here is deterministic application logic: preparation, quality checks, statuses,
 * approvals and saving. A language model may suggest revision text, but it must pass the same
 * checks (runChecks) and can never approve, save or publish anything.
 *
 * Status words are exact: "approved" = editorially approved (nothing posted); "saved" = a TopFan draft
 * post exists; "published" = the post is live on the Feed (read back from social.posts). Regular
 * TopFan posts have no scheduling in the reference pack, so "scheduled" is never set in this demo.
 */
import type { AppData } from "../store";
import type { ID, PostType } from "../model";
import { publishPost } from "./social";

/* ------------------------------------------------------------------ media library (demo) */

/**
 * The default demo library is complete. Test fixtures for the exception paths (dev/test only):
 * ?apFixture=missing-asset (the shoot isn't in the library) · ?apFixture=unapproved-asset (not cleared).
 */
function seedAssets(): Asset[] {
  const fixture = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("apFixture");
  const lib: Asset[] = [
    { id: "as-northpeak", label: "Northpeak photo shoot", kind: "image", approved: fixture !== "unapproved-asset", src: "posts/northpeak-shoot" },
    { id: "as-park", label: "Park session photos", kind: "image", approved: true, src: "posts/big-air" },
    { id: "as-clips", label: "Season clips", kind: "video", approved: true, src: "videos/big-air" },
  ];
  return fixture === "missing-asset" ? lib.filter((a) => a.id !== "as-northpeak") : lib;
}

/* ------------------------------------------------------------------ types */

export type DraftStatus =
  | "ready"
  | "needs-info"
  | "missing-asset"
  | "factual-issue"
  | "duplicate"
  | "revising"
  | "on-hold"
  | "approved"
  | "saved"
  | "scheduled"
  | "published"
  | "failed";

export type RejectReason = "not-me" | "generic" | "similar" | "incorrect" | "not-relevant" | "other";

export const REJECT_REASONS: { id: RejectReason; label: string }[] = [
  { id: "not-me", label: "Doesn't sound like me" },
  { id: "generic", label: "Too generic" },
  { id: "similar", label: "Similar to an older post" },
  { id: "incorrect", label: "Incorrect information" },
  { id: "not-relevant", label: "Not relevant right now" },
  { id: "other", label: "Something else" },
];

/** Approved material the drafts may draw on (fictional demo data the creator approved). */
export interface Source {
  id: ID;
  label: string;
  kind: "notes" | "fan-questions" | "event" | "post" | "profile";
  /** Facts a draft may state. Anything else is an unsupported claim. */
  facts: string[];
}

/** An item in the creator's media library (approved = cleared by the creator for posting). */
export interface Asset {
  id: ID;
  label: string;
  kind: "image" | "video";
  approved: boolean;
  /** Media key (src/media) of the file. */
  src: string;
  /** Thumbnail for a file the creator added from their device (a still for videos). */
  poster?: string;
  /** The creator added it during planning (its name is a file name, so posts don't quote it). */
  added?: boolean;
}

/**
 * How a draft's media stands (the assistant must tell these apart):
 * attached = the creator attached it · suggested = picked by Autopilot from the approved library
 * missing = the required file isn't in the library · unapproved = it's there but not cleared yet.
 */
export type MediaState = "attached" | "suggested" | "missing" | "unapproved";

export interface Slot {
  at: string; // ISO
  basis: "activity" | "test";
  reason: string;
}

export interface APDraft {
  id: ID;
  /** Idea key (for duplicate checks and "replace idea"). */
  idea: string;
  type: Extract<PostType, "text" | "poll" | "images" | "video">;
  title: string;
  text: string;
  pollOptions?: string[];
  /** Required media, if any (resolved by runChecks; never fabricated). */
  media?: { need: string; assetId: string | null; state?: MediaState; src?: string | null; poster?: string | null };
  sourceIds: ID[];
  /** Factual statements in the text, each tied to an approved source fact (or null = unsupported). */
  claims: { text: string; sourceId: ID | null }[];
  tags: string[];
  slot: Slot;
  status: DraftStatus;
  /** Why it's held (plain language). */
  holdReason?: string;
  revisions: number;
  rejections: { reason: RejectReason; note?: string; at: string }[];
  /** The creator changed it in New Post (their version wins). */
  editedByCreator?: boolean;
  /** Linked TopFan post (draft or published). */
  postId?: ID;
  approvedAt?: string;
  /** Alternatives prepared from sources (used for bounded revision). */
  alternates?: Partial<Record<"voice" | "specific" | "angle", { text: string; sourceIds: ID[]; claims: APDraft["claims"]; pollOptions?: string[] }>>;
  history: string[];
}

export interface Preference {
  id: ID;
  text: string;
  rule: { avoidTag?: string; tone?: "casual" };
  confirmedAt: string;
  active: boolean;
}

export interface AutopilotState {
  enabled: boolean;
  paused: boolean;
  strategy: { frequency: number; pillars: string[]; voiceExamples: string[]; approvedAt: string };
  sources: Source[];
  assets: Asset[];
  preferences: Preference[];
  /** The creator approved "use suggested times" (don't ask per draft). */
  timingRule: boolean;
  batch: { id: ID; seq: number; createdAt: string; drafts: APDraft[]; skipped: { idea: string; why: string }[]; dismissed: boolean; notified: boolean; planWeekOf?: string } | null;
  /** "Plan my week": the creator's brief and the slots built from it (see planning below). */
  plan?: WeekPlan | null;
  log: { at: string; text: string }[];
}

/** Topics a week can mix. Each maps to ideas built only from approved sources. */
export type Pillar = "coming-up" | "training" | "fan-questions" | "poll" | "behind-scenes";
export const PILLARS: { id: Pillar; label: string; hint: string }[] = [
  { id: "coming-up", label: "What's coming up", hint: "From what you tell me about this week" },
  { id: "training", label: "Training and progress", hint: "From your training notes" },
  { id: "fan-questions", label: "Answering fan questions", hint: "From your fan questions inbox" },
  { id: "poll", label: "Polls for fans", hint: "Let fans pick what's next" },
  { id: "behind-scenes", label: "Behind the scenes", hint: "Photos and clips you choose" },
];

export interface WeekBrief {
  /** The creator's own lines about the week. They become an approved source, word for word. */
  happening: string[];
  /** Weekdays to post on (0 = Sunday). One post per day. */
  days: number[];
  pillars: Pillar[];
  /** Library files the creator allowed for this week. */
  assetIds: ID[];
  /** Words to leave out (ideas mentioning them are skipped). */
  avoid: string;
}
export interface PlanSlot {
  id: ID;
  at: string; // ISO, suggested
  pillar: Pillar;
  idea: string;
  title: string;
  type: APDraft["type"];
  basis: string;
}
export interface WeekPlan {
  weekOf: string; // ISO date of the Monday
  brief: WeekBrief;
  slots: PlanSlot[];
  status: "draft" | "approved" | "prepared";
  approvedAt?: string;
}

/* ------------------------------------------------------------------ demo seed (fictional) */

export const initialAutopilot = (): AutopilotState => ({
  enabled: true,
  paused: false,
  strategy: {
    frequency: 4,
    pillars: ["Training and progress", "Fan questions", "Behind the scenes"],
    voiceExamples: ["Back home after a long travel week. Thanks for all the messages, team USA!", "First turns of the season on a glacier trip. Snow was perfect."],
    approvedAt: "2026-10-20T12:00:00Z",
  },
  sources: [
    { id: "src-notes", label: "Training notes (Oct)", kind: "notes", facts: ["working on a switch backside 540", "back on snow this week", "filming new clips for the season"] },
    { id: "src-qa", label: "Fan questions inbox", kind: "fan-questions", facts: ["fans keep asking how to pick a first snowboard", "fans asked about off-season training"] },
    { id: "src-tricks", label: "Trick list", kind: "notes", facts: ["switch backside 540", "frontside 720", "cab 900"] },
    { id: "src-posts", label: "Your recent posts", kind: "post", facts: ["glacier trip", "travel week"] },
  ],
  assets: seedAssets(),
  preferences: [],
  timingRule: false,
  batch: null,
  plan: null,
  log: [],
});

/* ------------------------------------------------------------------ helpers */

const nid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;
const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 2));
export function similarity(a: string, b: string) {
  const A = words(a);
  const B = words(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  A.forEach((w) => B.has(w) && n++);
  return n / Math.min(A.size, B.size);
}
const log = (d: AppData, text: string) => {
  d.autopilot.log = [...d.autopilot.log, { at: new Date().toISOString(), text }].slice(-40);
};
export const draftById = (d: AppData, id: ID) => d.autopilot.batch?.drafts.find((x) => x.id === id) ?? null;

/** Drafts in the default approval batch. */
export const readyDrafts = (d: AppData) => d.autopilot.batch?.drafts.filter((x) => x.status === "ready") ?? [];
export const HELD: DraftStatus[] = ["needs-info", "missing-asset", "factual-issue", "duplicate", "revising", "on-hold", "failed"];
export const heldDrafts = (d: AppData) => d.autopilot.batch?.drafts.filter((x) => HELD.includes(x.status)) ?? [];
export const approvedDrafts = (d: AppData) => d.autopilot.batch?.drafts.filter((x) => x.status === "approved") ?? [];

export const STATUS_LABEL: Record<DraftStatus, string> = {
  ready: "Ready for review",
  "needs-info": "Needs information",
  "missing-asset": "Missing image",
  "factual-issue": "Fact to check",
  duplicate: "Too similar",
  revising: "Revising",
  "on-hold": "On hold",
  approved: "Approved",
  saved: "Saved as draft",
  scheduled: "Scheduled",
  published: "Published",
  failed: "Couldn't save",
};

/* ------------------------------------------------------------------ Smart Timing */

/**
 * Suggested windows from the creator's own post history (engagement by weekday/hour). With fewer than
 * 5 dated posts, the times are "to test". Never promises reach.
 */
export function timingWindows(d: AppData, now = new Date()) {
  const posts = d.social.posts.filter((p) => p.status === "published");
  const score = new Map<string, { day: number; hour: number; total: number; n: number }>();
  for (const p of posts) {
    const t = new Date(p.createdAt);
    const key = `${t.getDay()}-${t.getHours()}`;
    const s = score.get(key) ?? { day: t.getDay(), hour: t.getHours(), total: 0, n: 0 };
    s.total += p.likes + p.comments * 2 + p.views / 100;
    s.n += 1;
    score.set(key, s);
  }
  const enough = posts.length >= 5;
  const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const ranked = enough ? [...score.values()].sort((a, b) => b.total / b.n - a.total / a.n) : [];
  const hour = ranked[0]?.hour ?? 18;
  // Spread through the coming week: best day first, then every other day at the same hour.
  const startDay = ranked[0]?.day ?? 2;
  const out: Slot[] = [];
  for (let i = 0; out.length < 7; i++) {
    const day = (startDay + i * 2) % 7;
    const at = new Date(now);
    at.setHours(hour, 0, 0, 0);
    let add = (day - at.getDay() + 7) % 7;
    if (add === 0 && at <= now) add = 7;
    at.setDate(at.getDate() + add + (out.length >= 4 ? 7 : 0));
    if (out.some((s) => s.at === at.toISOString())) continue;
    out.push({
      at: at.toISOString(),
      basis: enough ? "activity" : "test",
      reason: !enough
        ? "There isn't enough history yet, so this is a time to try."
        : day === ranked[0].day
          ? `Your posts on ${DAY[day]}s around this time have had the most likes and comments.`
          : `Same time of day as your best-performing posts (${DAY[ranked[0].day]}s); ${DAY[day]} spreads your week out.`,
    });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

/* ------------------------------------------------------------------ candidates (demo library) */

type Candidate = Omit<APDraft, "id" | "slot" | "status" | "revisions" | "rejections" | "history">;

/** Candidate ideas per batch (demo). Real Autopilot would generate these from the same sources. */
function candidates(d: AppData, seq: number): Candidate[] {
  const last = d.social.posts.find((p) => p.status === "published" && p.type === "text");
  const base: Candidate[] = [
    {
      idea: "training-update",
      type: "text",
      title: "Training update",
      text: "Back on snow this week and working on a switch backside 540. Filming new clips for the season, so stay tuned.",
      sourceIds: ["src-notes"],
      claims: [
        { text: "back on snow this week", sourceId: "src-notes" },
        { text: "working on a switch backside 540", sourceId: "src-notes" },
      ],
      tags: ["training"],
      alternates: {
        voice: { text: "Back on snow this week! Working on a switch backside 540. Clips soon.", sourceIds: ["src-notes"], claims: [{ text: "back on snow this week", sourceId: "src-notes" }] },
      },
    },
    {
      idea: "trick-poll",
      type: "poll",
      title: "Which trick next?",
      text: "Which trick should I film next?",
      pollOptions: ["Switch backside 540", "Frontside 720", "Cab 900"],
      sourceIds: ["src-tricks"],
      claims: [],
      tags: ["poll", "fan-questions"],
    },
    {
      idea: "motivation",
      type: "text",
      title: "Monday motivation",
      text: "Never give up on your dreams! Every day is a new chance to be better than yesterday.",
      sourceIds: [],
      claims: [],
      tags: ["motivational", "generic"],
      alternates: {
        specific: {
          text: "A lot of you keep asking how to pick your first snowboard. I'll share my quick checklist this week. What kind of riding do you want to do?",
          sourceIds: ["src-qa"],
          claims: [{ text: "fans keep asking how to pick a first snowboard", sourceId: "src-qa" }],
        },
        voice: { text: "New week, back at it. What are you working on this week?", sourceIds: [], claims: [] },
      },
    },
    {
      idea: "northpeak-photos",
      type: "images",
      title: "Photos from the shoot",
      text: "Some favorite shots from the Northpeak photo shoot.",
      media: { need: "Northpeak photo shoot", assetId: null },
      sourceIds: ["src-notes"],
      claims: [],
      tags: ["behind-the-scenes"],
    },
  ];
  // A near-repeat of a recent post: the duplicate check discards it before review.
  if (last) base.push({ idea: "repeat-thanks", type: "text", title: "Thank you", text: `${last.text} Thank you all!`, sourceIds: ["src-posts"], claims: [], tags: ["thanks"] });
  if (seq > 1) {
    return [
      {
        idea: "offseason-qa",
        type: "text",
        title: "Your training questions",
        text: "You asked about off-season training, so I'm answering your top questions this week. Drop yours below.",
        sourceIds: ["src-qa"],
        claims: [{ text: "fans asked about off-season training", sourceId: "src-qa" }],
        tags: ["fan-questions"],
      },
      { idea: "trick-poll-2", type: "poll", title: "Next clip", text: "Which one do you want to see first?", pollOptions: ["Frontside 720", "Cab 900"], sourceIds: ["src-tricks"], claims: [], tags: ["poll"] },
      { idea: "motivation-2", type: "text", title: "Keep pushing", text: "Success is a journey, not a destination. Keep pushing every day!", sourceIds: [], claims: [], tags: ["motivational", "generic"] },
      { idea: "clips-coming", type: "video", title: "Clips coming", text: "Filming new clips for the season. First edit drops soon.", media: { need: "Season clips", assetId: null }, sourceIds: ["src-notes"], claims: [{ text: "filming new clips for the season", sourceId: "src-notes" }], tags: ["training"] },
    ];
  }
  return base;
}

/* ------------------------------------------------------------------ checks */

export interface CheckResult {
  status: DraftStatus;
  reason?: string;
}

/**
 * The application's own checks. A draft is "ready" only if every check passes. Model text gets
 * exactly the same checks.
 */
export function runChecks(d: AppData, x: Pick<APDraft, "text" | "claims" | "media" | "tags" | "id" | "idea">): CheckResult {
  const ap = d.autopilot;
  // Confirmed preferences (only explicit, confirmed ones).
  for (const p of ap.preferences.filter((p) => p.active))
    if (p.rule.avoidTag && x.tags.includes(p.rule.avoidTag)) return { status: "on-hold", reason: `Skipped because of your preference: "${p.text}"` };
  // Unsupported factual claims.
  const facts = new Set(ap.sources.flatMap((s) => s.facts.map((f) => `${s.id}|${f.toLowerCase()}`)));
  const bad = x.claims.find((c) => !c.sourceId || !facts.has(`${c.sourceId}|${c.text.toLowerCase()}`));
  if (bad) return { status: "factual-issue", reason: `"${bad.text}" isn't in your approved sources.` };
  // Numbers and dates must come from sources (a cheap guard against invented specifics).
  const allFacts = ap.sources.flatMap((s) => s.facts).join(" ").toLowerCase();
  const nums = x.text.match(/\b\d[\d,.]*\b/g) ?? [];
  const strayNum = nums.find((n) => !allFacts.includes(n.toLowerCase()));
  if (strayNum) return { status: "factual-issue", reason: `The number "${strayNum}" isn't in your approved sources.` };
  // Duplicates of published posts or other drafts in this batch.
  const others = [
    ...d.social.posts.filter((p) => p.status === "published").map((p) => p.text),
    ...(ap.batch?.drafts.filter((o) => o.id !== x.id && o.idea !== x.idea && !["on-hold", "duplicate"].includes(o.status)).map((o) => o.text) ?? []),
  ];
  if (others.some((t) => similarity(t, x.text) >= 0.7)) return { status: "duplicate", reason: "Too close to a recent post." };
  // Required media: only real library files; nothing is generated or substituted.
  if (x.media) {
    const asset = ap.assets.find((a) => a.label === x.media!.need);
    const m = x.media as NonNullable<APDraft["media"]>;
    if (!asset) {
      Object.assign(m, { assetId: null, state: "missing", src: null });
      return { status: "missing-asset", reason: `Needs a photo from "${m.need}". It isn't in your media library yet.` };
    }
    if (!asset.approved) {
      Object.assign(m, { assetId: asset.id, state: "unapproved", src: asset.src });
      return { status: "missing-asset", reason: `The photo from "${m.need}" hasn't been approved for posting yet.` };
    }
    Object.assign(m, { assetId: asset.id, state: m.state === "attached" ? "attached" : "suggested", src: asset.src, poster: asset.poster ?? null });
  }
  if (x.text.trim().length < 10 || x.text.length > 600) return { status: "needs-info", reason: "The text needs more detail." };
  return { status: "ready" };
}

/* ------------------------------------------------------------------ pipeline */

/**
 * Prepare a batch: read strategy + sources, build candidates, check them, discard repeats, revise or
 * hold weak ones, assign suggested times. Only eligible drafts and real exceptions are kept.
 */
export function prepareBatch(d: AppData) {
  const ap = d.autopilot;
  if (!ap.enabled || ap.paused) return;
  const seq = (ap.batch?.seq ?? 0) + 1;
  const slots = timingWindows(d);
  const drafts: APDraft[] = [];
  const skipped: { idea: string; why: string }[] = [];
  ap.batch = { id: nid("batch"), seq, createdAt: new Date().toISOString(), drafts, skipped, dismissed: false, notified: false };
  for (const c of candidates(d, seq)) {
    if (drafts.length >= ap.strategy.frequency) break;
    const draft: APDraft = { ...c, id: nid("dr"), slot: slots[drafts.length % slots.length], status: "ready", revisions: 0, rejections: [], history: ["Prepared from approved sources"] };
    const r = runChecks(d, draft);
    // Repeats and preference conflicts are discarded quietly (listed under "skipped").
    if (r.status === "duplicate" || (r.status === "on-hold" && r.reason?.startsWith("Skipped"))) {
      skipped.push({ idea: c.title, why: r.reason! });
      continue;
    }
    draft.status = r.status;
    draft.holdReason = r.reason;
    drafts.push(draft);
  }
  log(d, `Prepared batch ${seq}: ${drafts.filter((x) => x.status === "ready").length} ready, ${drafts.filter((x) => x.status !== "ready").length} held, ${skipped.length} skipped.`);
}

/* ------------------------------------------------------------------ creator decisions */

export function approveDraft(d: AppData, id: ID) {
  const x = draftById(d, id);
  if (!x || x.status !== "ready") return;
  x.status = "approved";
  x.approvedAt = new Date().toISOString();
  x.history.push("Approved by you");
}

/** Approve the given ready drafts together (never held ones). */
export function approveBatch(d: AppData, ids: ID[]) {
  for (const id of ids) approveDraft(d, id);
}

export function parkDraft(d: AppData, id: ID, reason: string) {
  const x = draftById(d, id);
  if (!x) return;
  x.status = "on-hold";
  x.holdReason = reason;
  x.history.push(`On hold: ${reason}`);
}

/** Bring a parked draft back if it passes the checks again. */
export function unparkDraft(d: AppData, id: ID) {
  const x = draftById(d, id);
  if (!x) return;
  const r = runChecks(d, x);
  x.status = r.status;
  x.holdReason = r.reason;
  x.history.push(r.status === "ready" ? "Back in review" : `Still held: ${r.reason}`);
}

/** Apply a revision (text from the library or a validated model suggestion). Returns the new status. */
export function applyRevision(d: AppData, id: ID, rev: { text: string; sourceIds: ID[]; claims: APDraft["claims"]; pollOptions?: string[] }, by: "library" | "model"): DraftStatus {
  const x = draftById(d, id);
  if (!x) return "failed";
  const r = runChecks(d, { ...x, text: rev.text, claims: rev.claims });
  x.revisions += 1;
  if (r.status !== "ready") {
    x.status = "on-hold";
    x.holdReason = `The revision didn't pass checks (${r.reason})`;
    x.history.push(`Revision held: ${r.reason}`);
    return x.status;
  }
  x.text = rev.text;
  x.sourceIds = rev.sourceIds;
  x.claims = rev.claims;
  if (rev.pollOptions) x.pollOptions = rev.pollOptions;
  x.tags = x.tags.filter((t) => t !== "generic" && t !== "motivational");
  x.status = "ready";
  x.holdReason = undefined;
  x.history.push(by === "model" ? "Revised (AI suggestion, checked)" : "Revised from your approved sources");
  return x.status;
}

/**
 * Record a rejection and resolve it (bounded: one automatic revision; a second rejection stops).
 * Returns what happened so the panel can say it in one line.
 */
export function rejectDraft(d: AppData, id: ID, reason: RejectReason, note?: string, resolve = true): { outcome: "revised" | "held" | "ask" | "stopped" | "recorded"; message: string } {
  const x = draftById(d, id);
  if (!x) return { outcome: "held", message: "That draft is gone." };
  x.rejections.push({ reason, note: note?.trim() || undefined, at: new Date().toISOString() });
  x.history.push(`Not right: ${REJECT_REASONS.find((r) => r.id === reason)!.label}${note ? ` (${note.trim()})` : ""}`);

  if (!resolve) return { outcome: "recorded", message: "" };
  if (x.rejections.length >= 2) {
    parkDraft(d, id, "You passed on this idea twice");
    return { outcome: "stopped", message: "I've stopped revising this one. Want me to replace the idea, or skip it?" };
  }
  const alt = x.alternates ?? {};
  switch (reason) {
    case "not-relevant":
      parkDraft(d, id, "Not relevant right now");
      return { outcome: "held", message: "Parked for now. It's not a rule for future posts." };
    case "incorrect":
      x.status = "factual-issue";
      x.holdReason = "You flagged incorrect information";
      return { outcome: "ask", message: "I've blocked it. What's incorrect? I'll only use what you confirm. Otherwise it stays on hold." };
    case "not-me": {
      if (!alt.voice) break;
      const s = applyRevision(d, id, alt.voice, "library");
      return s === "ready" ? { outcome: "revised", message: "Rewrote it closer to your recent posts." } : { outcome: "held", message: x.holdReason! };
    }
    case "generic": {
      if (!alt.specific) break;
      const s = applyRevision(d, id, alt.specific, "library");
      return s === "ready" ? { outcome: "revised", message: "Swapped it for a specific idea from your fan questions." } : { outcome: "held", message: x.holdReason! };
    }
    case "similar": {
      if (!alt.angle) break;
      const s = applyRevision(d, id, alt.angle, "library");
      return s === "ready" ? { outcome: "revised", message: "Tried a different angle." } : { outcome: "held", message: x.holdReason! };
    }
    case "other": {
      const pick = alt.specific ?? alt.angle ?? alt.voice;
      if (!pick) break;
      const s = applyRevision(d, id, pick, "library");
      return s === "ready" ? { outcome: "revised", message: "Thanks. Here's a different version." } : { outcome: "held", message: x.holdReason! };
    }
  }
  parkDraft(d, id, "No approved source for a better version");
  return { outcome: "held", message: "I don't have approved material for a better version, so I've parked it. Your other posts aren't affected." };
}

/** Swap a twice-rejected idea for an unused candidate, or skip it. */
export function replaceIdea(d: AppData, id: ID): boolean {
  const b = d.autopilot.batch;
  const x = draftById(d, id);
  if (!b || !x) return false;
  const used = new Set(b.drafts.map((o) => o.idea));
  const next = candidates(d, b.seq + 1).find((c) => !used.has(c.idea) && runChecks(d, { ...c, id: "tmp" }).status === "ready");
  if (!next) return false;
  Object.assign(x, { ...next, status: "ready" as const, holdReason: undefined, revisions: 0, rejections: [], history: [...x.history, `Replaced with "${next.title}"`] });
  return true;
}

export function skipDraft(d: AppData, id: ID) {
  parkDraft(d, id, "Skipped by you");
}

/** Make a ready draft shorter (first sentence), re-checked. */
export function shortenDraft(d: AppData, id: ID) {
  const x = draftById(d, id);
  if (!x) return;
  const first = x.text.split(/(?<=[.!?])\s+/)[0];
  if (first && first !== x.text) applyRevision(d, id, { text: first, sourceIds: x.sourceIds, claims: x.claims.filter((c) => first.toLowerCase().includes(c.text.toLowerCase().split(" ")[0])) }, "library");
}

/** Creator answered "what's incorrect?": noted; the draft stays blocked until they edit it themselves. */
export function noteCorrection(d: AppData, id: ID, note: string) {
  const x = draftById(d, id);
  if (!x) return;
  x.history.push(`Your correction: ${note}`);
  x.holdReason = "Waiting for your edit in New Post (I won't guess the correction)";
}

export function setSlot(d: AppData, id: ID, slot: Slot) {
  const x = draftById(d, id);
  if (x) x.slot = slot;
}

/** Re-assign suggested windows to every draft still in review. */
export function useBestTimes(d: AppData) {
  const slots = timingWindows(d);
  d.autopilot.batch?.drafts.filter((x) => ["ready", "approved"].includes(x.status)).forEach((x, i) => (x.slot = slots[i % slots.length]));
}

export function setTimingRule(d: AppData, on: boolean) {
  d.autopilot.timingRule = on;
}

/** Persistent preference: only ever called after the creator confirms it. */
export function confirmPreference(d: AppData, text: string, rule: Preference["rule"]) {
  if (d.autopilot.preferences.some((p) => p.active && p.text === text)) return;
  d.autopilot.preferences.push({ id: nid("pref"), text, rule, confirmedAt: new Date().toISOString(), active: true });
  log(d, `Preference saved: ${text}`);
}
export function removePreference(d: AppData, id: ID) {
  d.autopilot.preferences = d.autopilot.preferences.filter((p) => p.id !== id);
}

/** Which preference a rejection could suggest (never saved without confirmation). */
export function preferenceFor(x: APDraft, reason: RejectReason): { text: string; rule: Preference["rule"] } | null {
  if (reason === "generic" && x.tags.includes("motivational")) return { text: "Avoid generic motivational posts", rule: { avoidTag: "motivational" } };
  if (reason === "generic") return { text: "Avoid generic posts", rule: { avoidTag: "generic" } };
  if (reason === "not-me") return { text: "Use a more casual tone", rule: { tone: "casual" } };
  return null;
}

export function setPaused(d: AppData, paused: boolean) {
  d.autopilot.paused = paused;
  log(d, paused ? "Content preparation paused" : "Content preparation resumed");
}
export function setFrequency(d: AppData, perWeek: number) {
  d.autopilot.strategy.frequency = Math.max(1, Math.min(7, Math.round(perWeek)));
}
export function dismissBatch(d: AppData) {
  if (d.autopilot.batch) d.autopilot.batch.dismissed = true;
}
export function reopenBatch(d: AppData) {
  if (d.autopilot.batch) d.autopilot.batch.dismissed = false;
}
export function markNotified(d: AppData) {
  if (d.autopilot.batch) d.autopilot.batch.notified = true;
}

/** Demo: the creator adds (if missing) and approves a library file, so held posts can be re-checked. */
export function approveAsset(d: AppData, assetId: ID) {
  let a = d.autopilot.assets.find((x) => x.id === assetId);
  if (!a && assetId === "as-northpeak") d.autopilot.assets.push((a = { id: "as-northpeak", label: "Northpeak photo shoot", kind: "image", approved: true, src: "posts/northpeak-shoot" }));
  if (a) a.approved = true;
  d.autopilot.batch?.drafts.filter((x) => x.status === "missing-asset").forEach((x) => unparkDraft(d, x.id));
}

/**
 * The creator adds a photo or video from their device while planning. Choosing it is their approval to
 * use it, so it's added to the library as approved and picked for this week. Local only: never uploaded.
 */
export function addPlanAsset(d: AppData, file: { label: string; kind: Asset["kind"]; src: string; poster?: string }) {
  const p = d.autopilot.plan;
  if (!p || p.status !== "draft") return;
  const a: Asset = { id: nid("as"), approved: true, added: true, ...file };
  d.autopilot.assets.push(a);
  p.brief.assetIds = [...p.brief.assetIds, a.id];
  if (!p.brief.pillars.includes("behind-scenes")) p.brief.pillars = [...p.brief.pillars, "behind-scenes"];
}

/* ------------------------------------------------------------------ saving & status read-back */

/** Actual status of a draft's TopFan post (read back from the app; used before any retry). */
export function readPublicationStatus(d: AppData, x: APDraft): "none" | "draft" | "published" {
  const post = d.social.posts.find((p) => p.id === x.postId || (p.extra as { autopilotDraftId?: string } | undefined)?.autopilotDraftId === x.id);
  return !post ? "none" : post.status === "published" ? "published" : "draft";
}

/**
 * Save approved drafts as TopFan draft posts (idempotent: a draft whose post already exists is only
 * linked, never saved twice). Nothing is published.
 */
export function saveApproved(d: AppData, ids: ID[]) {
  for (const id of ids) {
    const x = draftById(d, id);
    if (!x || x.status !== "approved") continue;
    const existing = readPublicationStatus(d, x);
    if (existing !== "none") {
      x.postId = d.social.posts.find((p) => (p.extra as { autopilotDraftId?: string } | undefined)?.autopilotDraftId === x.id)?.id ?? x.postId;
      x.status = existing === "published" ? "published" : "saved";
      continue;
    }
    x.postId = publishPost(d, {
      type: x.type,
      title: x.type === "text" ? undefined : x.title,
      text: x.text,
      status: "draft",
      ...(x.media?.src ? { media: [{ kind: x.type === "video" ? ("video" as const) : ("image" as const), placeholder: x.media.need, src: x.type === "video" ? (x.media.poster ?? null) : x.media.src, video: x.type === "video" ? x.media.src : null }] } : {}),
      extra: { autopilotDraftId: x.id, ...(x.type === "poll" ? { poll: { question: x.text, options: (x.pollOptions ?? []).map((label) => ({ label, votes: 0 })), endsAt: null } } : {}) },
    });
    x.status = "saved";
    x.history.push("Saved as a TopFan draft (not published)");
  }
}

/**
 * Keep Autopilot in step with what the creator did in the original UI: their edits win, and a post
 * they published counts as published. Never overwrites a creator edit with an older AI version.
 */
export function syncFromPosts(d: AppData): string[] {
  const notes: string[] = [];
  for (const x of d.autopilot.batch?.drafts ?? []) {
    const post = d.social.posts.find((p) => (p.extra as { autopilotDraftId?: string } | undefined)?.autopilotDraftId === x.id);
    if (!post) {
      if (x.postId && (x.status === "saved" || x.status === "published")) {
        x.postId = undefined;
        x.status = "on-hold";
        x.holdReason = "You deleted it in TopFan";
        notes.push(`"${x.title}" was deleted in TopFan, so I've put it on hold.`);
      }
      continue;
    }
    if (x.postId !== post.id) x.postId = post.id;
    const text = post.type === "poll" ? (post.extra as { poll?: { question: string } })?.poll?.question ?? post.text : post.text;
    if (text && text !== x.text) {
      x.text = text;
      x.editedByCreator = true;
      x.history.push("Edited by you in New Post");
      notes.push(`I see your edits to "${x.title}". Your version is the one I'll keep.`);
    }
    const status: DraftStatus = post.status === "published" ? "published" : "saved";
    if (x.status !== status) {
      x.status = status;
      notes.push(status === "published" ? `"${x.title}" is published.` : `"${x.title}" is saved as a draft.`);
    }
  }
  return notes;
}

export type _Draft = AppData;

/* ------------------------------------------------------------------ plan my week */

/**
 * The creator plans a week in a few answers; Autopilot then drafts each post from that plan. The brief's
 * lines are stored as an approved source ("Your weekly brief"), so drafts can only state what the creator
 * said. Approving the plan authorizes drafting, never publishing (TopFan posts can't be scheduled here).
 */
const BRIEF_SOURCE = "src-brief";
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Monday of next week (local time). */
export function nextWeekStart(now = new Date()) {
  const m = new Date(now);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() + ((8 - m.getDay()) % 7 || 7));
  return m;
}

/** Suggested posting days and hour, from the creator's own activity (Smart Timing). */
export function suggestedRhythm(d: AppData) {
  const w = timingWindows(d);
  const hour = new Date(w[0].at).getHours();
  const days = [...new Set(w.map((s) => new Date(s.at).getDay()))].slice(0, d.autopilot.strategy.frequency);
  return { days: days.sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)), hour, basis: w[0].basis };
}

export function defaultBrief(d: AppData): WeekBrief {
  const ap = d.autopilot;
  return {
    happening: [],
    days: suggestedRhythm(d).days,
    pillars: ["training", "fan-questions", "poll", "behind-scenes"],
    assetIds: ap.assets.filter((a) => a.approved).map((a) => a.id),
    avoid: "",
  };
}

/** The weekday a brief line names, if any (0 = Sunday). */
export function namedDay(line: string): number | null {
  const m = line.toLowerCase().match(/\b(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(day|nesday|sday|rsday|urday)?\b/);
  if (!m) return null;
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(m[1].slice(0, 3));
}

/** Start (or continue) planning next week. */
export function startPlan(d: AppData) {
  const weekOf = nextWeekStart().toISOString();
  if (d.autopilot.plan?.status === "draft" && d.autopilot.plan.weekOf === weekOf) return;
  d.autopilot.plan = { weekOf, brief: defaultBrief(d), slots: [], status: "draft" };
}

export function updateBrief(d: AppData, patch: Partial<WeekBrief>) {
  const p = d.autopilot.plan;
  if (!p || p.status !== "draft") return;
  p.brief = { ...p.brief, ...patch };
  // "What's coming up" only makes sense with something coming up.
  if (patch.happening) {
    // A day the creator names ("on Saturday") becomes a posting day.
    for (const h of patch.happening) {
      const day = namedDay(h);
      if (day !== null && !p.brief.days.includes(day)) p.brief.days = [...p.brief.days, day];
    }
    const has = p.brief.happening.length > 0;
    if (has && !p.brief.pillars.includes("coming-up")) p.brief.pillars = ["coming-up", ...p.brief.pillars];
    if (!has) p.brief.pillars = p.brief.pillars.filter((x) => x !== "coming-up");
  }
}

/** Wording for files the creator added (no facts claimed; varied so several don't read as repeats). */
const ADDED_TEXT = {
  images: ["Fresh shots to share. Which one is your pick?", "Here are a few more photos. Tell me your favorite in the comments.", "More photos for you. Which one do you like most?"],
  video: ["Hit play and tell me what you think of this clip.", "Turn the sound up for this one. What should I film next?", "Quick clip for you. Want more like this?"],
};

/** Idea pool per pillar, built only from approved sources, the brief and allowed library files. */
function planIdeas(d: AppData, brief: WeekBrief): (Candidate & { pillar: Pillar; basis: string })[] {
  const ap = d.autopilot;
  const assets = ap.assets.filter((a) => a.approved && brief.assetIds.includes(a.id));
  const out: (Candidate & { pillar: Pillar; basis: string })[] = [];
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  if (brief.pillars.includes("coming-up"))
    brief.happening.forEach((h, i) =>
      out.push({
        pillar: "coming-up",
        basis: "Your weekly brief",
        idea: `brief-${i}`,
        type: "text",
        title: cap(h.length > 34 ? `${h.slice(0, 32).trim()}…` : h),
        text: `This week: ${h.replace(/[.!]+$/, "")}. I'll share how it goes.`,
        sourceIds: [BRIEF_SOURCE],
        claims: [{ text: h, sourceId: BRIEF_SOURCE }],
        tags: ["coming-up"],
      }),
    );
  if (brief.pillars.includes("training"))
    out.push(
      { pillar: "training", basis: "Training notes (Oct)", idea: "training-update", type: "text", title: "Training update", text: "Back on snow this week and working on a switch backside 540. Filming new clips for the season, so stay tuned.", sourceIds: ["src-notes"], claims: [{ text: "back on snow this week", sourceId: "src-notes" }, { text: "working on a switch backside 540", sourceId: "src-notes" }], tags: ["training"] },
    );
  if (brief.pillars.includes("fan-questions"))
    out.push(
      { pillar: "fan-questions", basis: "Fan questions inbox", idea: "first-board", type: "text", title: "Picking a first snowboard", text: "A lot of you keep asking how to pick your first snowboard. I'll share my quick checklist this week. What kind of riding do you want to do?", sourceIds: ["src-qa"], claims: [{ text: "fans keep asking how to pick a first snowboard", sourceId: "src-qa" }], tags: ["fan-questions"] },
      { pillar: "fan-questions", basis: "Fan questions inbox", idea: "offseason-qa", type: "text", title: "Your training questions", text: "You asked about off-season training, so I'm answering your top questions this week. Drop yours below.", sourceIds: ["src-qa"], claims: [{ text: "fans asked about off-season training", sourceId: "src-qa" }], tags: ["fan-questions"] },
    );
  if (brief.pillars.includes("poll"))
    out.push(
      { pillar: "poll", basis: "Trick list", idea: "trick-poll", type: "poll", title: "Which trick next?", text: "Which trick should I film next?", pollOptions: ["Switch backside 540", "Frontside 720", "Cab 900"], sourceIds: ["src-tricks"], claims: [], tags: ["poll"] },
    );
  if (brief.pillars.includes("behind-scenes")) {
    for (const a of assets)
      out.push(
        a.added
          ? a.kind === "image"
            ? { pillar: "behind-scenes", basis: a.label, idea: `photos-${a.id}`, type: "images", title: "New photos", text: ADDED_TEXT.images[assets.filter((o) => o.added && o.kind === "image").indexOf(a) % 3], media: { need: a.label, assetId: null }, sourceIds: [], claims: [], tags: ["behind-the-scenes"] }
            : { pillar: "behind-scenes", basis: a.label, idea: `clips-${a.id}`, type: "video", title: "New clip", text: ADDED_TEXT.video[assets.filter((o) => o.added && o.kind === "video").indexOf(a) % 3], media: { need: a.label, assetId: null }, sourceIds: [], claims: [], tags: ["behind-the-scenes"] }
          : a.kind === "image"
          ? { pillar: "behind-scenes", basis: a.label, idea: `photos-${a.id}`, type: "images", title: `Photos: ${a.label}`, text: `Some favorite shots from the ${a.label.charAt(0).toLowerCase()}${a.label.slice(1)}.`, media: { need: a.label, assetId: null }, sourceIds: [], claims: [], tags: ["behind-the-scenes"] }
          : { pillar: "behind-scenes", basis: a.label, idea: `clips-${a.id}`, type: "video", title: "Clips coming", text: "Filming new clips for the season. First edit drops soon.", media: { need: a.label, assetId: null }, sourceIds: ["src-notes"], claims: [{ text: "filming new clips for the season", sourceId: "src-notes" }], tags: ["behind-the-scenes"] },
      );
  }
  const avoid = brief.avoid.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  return out.filter((c) => !avoid.some((w) => `${c.title} ${c.text} ${c.tags.join(" ")}`.toLowerCase().includes(w)));
}

/** Build the week's slots: one per chosen day, coming-up items first, then the other topics in turn. */
export function buildPlan(d: AppData) {
  const p = d.autopilot.plan;
  if (!p) return;
  const ideas = planIdeas(d, p.brief);
  const byPillar = new Map<Pillar, typeof ideas>();
  ideas.forEach((c) => byPillar.set(c.pillar, [...(byPillar.get(c.pillar) ?? []), c]));
  // The creator's own input comes first: their lines, then files they just added for this week.
  const fresh = new Set(d.autopilot.assets.filter((a) => a.added).flatMap((a) => [`photos-${a.id}`, `clips-${a.id}`]));
  const order: typeof ideas = [...(byPillar.get("coming-up") ?? []), ...ideas.filter((c) => fresh.has(c.idea))];
  const rest = p.brief.pillars.filter((x) => x !== "coming-up");
  for (let round = 0; order.length < ideas.length; round++) {
    let added = false;
    for (const pl of rest) {
      const c = byPillar.get(pl)?.filter((x) => !fresh.has(x.idea))[round];
      if (c) (order.push(c), (added = true));
    }
    if (!added) break;
  }
  const { hour } = suggestedRhythm(d);
  const monday = new Date(p.weekOf);
  const days = [...p.brief.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  // Lines that name a day go on that day; everything else fills the remaining days in order.
  const placed = new Map<number, (typeof ideas)[number]>();
  const queue: typeof ideas = [];
  for (const c of order) {
    const day = c.pillar === "coming-up" ? namedDay(p.brief.happening[Number(c.idea.slice(6))] ?? "") : null;
    if (day !== null && days.includes(day) && !placed.has(day)) placed.set(day, c);
    else queue.push(c);
  }
  for (const day of days) if (!placed.has(day) && queue.length) placed.set(day, queue.shift()!);
  p.slots = days
    .filter((day) => placed.has(day))
    .map((day) => {
      const at = new Date(monday);
      at.setDate(monday.getDate() + ((day + 6) % 7));
      at.setHours(hour, 0, 0, 0);
      const c = placed.get(day)!;
      return { id: nid("slot"), at: at.toISOString(), pillar: c.pillar, idea: c.idea, title: c.title, type: c.type, basis: c.basis };
    });
}

/** Ideas not used in the plan yet (for "Try another idea"). */
export function spareIdeas(d: AppData) {
  const p = d.autopilot.plan;
  if (!p) return [];
  const used = new Set(p.slots.map((s) => s.idea));
  return planIdeas(d, p.brief).filter((c) => !used.has(c.idea));
}

export function swapSlot(d: AppData, slotId: ID) {
  const p = d.autopilot.plan;
  const s = p?.slots.find((x) => x.id === slotId);
  if (!p || !s) return false;
  const spare = spareIdeas(d);
  const next = spare.find((c) => c.pillar !== s.pillar) ?? spare[0];
  if (!next) return false;
  Object.assign(s, { pillar: next.pillar, idea: next.idea, title: next.title, type: next.type, basis: next.basis });
  return true;
}

export function removeSlot(d: AppData, slotId: ID) {
  const p = d.autopilot.plan;
  if (p) p.slots = p.slots.filter((x) => x.id !== slotId);
}

export function approvePlan(d: AppData) {
  const p = d.autopilot.plan;
  if (!p || !p.slots.length) return;
  p.status = "approved";
  p.approvedAt = new Date().toISOString();
  // The brief's lines become an approved source, word for word.
  const facts = p.brief.happening;
  d.autopilot.sources = [...d.autopilot.sources.filter((s) => s.id !== BRIEF_SOURCE), ...(facts.length ? [{ id: BRIEF_SOURCE, label: "Your weekly brief", kind: "notes" as const, facts }] : [])];
  log(d, `Week plan approved: ${p.slots.length} posts.`);
}

/**
 * Draft every planned post now (the live product would draft each one ahead of its day). Same checks as
 * any batch; drafts that fail are held, never filled in. Already-saved drafts stay as TopFan posts.
 */
export function prepareFromPlan(d: AppData) {
  const ap = d.autopilot;
  const p = ap.plan;
  if (!p || p.status !== "approved") return;
  const ideas = new Map(planIdeas(d, p.brief).map((c) => [c.idea, c]));
  const seq = (ap.batch?.seq ?? 0) + 1;
  const drafts: APDraft[] = [];
  ap.batch = { id: nid("batch"), seq, createdAt: new Date().toISOString(), drafts, skipped: [], dismissed: false, notified: true, planWeekOf: p.weekOf };
  for (const s of p.slots) {
    const c = ideas.get(s.idea);
    if (!c) continue;
    const { pillar: _p, basis: _b, ...cand } = c;
    void _p;
    void _b;
    const day = DAY_NAMES[new Date(s.at).getDay()];
    const draft: APDraft = { ...cand, id: nid("dr"), slot: { at: s.at, basis: "activity", reason: `From your week plan (${day}). The time is a suggestion; nothing posts automatically.` }, status: "ready", revisions: 0, rejections: [], history: ["Planned with you", "Drafted from your plan"] };
    const r = runChecks(d, draft);
    draft.status = r.status;
    draft.holdReason = r.reason;
    drafts.push(draft);
  }
  p.status = "prepared";
  log(d, `Drafted ${drafts.length} posts from the week plan.`);
}

export const weekLabel = (iso: string) => {
  const a = new Date(iso);
  const b = new Date(a);
  b.setDate(a.getDate() + 6);
  const f = (x: Date, withMonth: boolean) => x.toLocaleDateString("en-US", withMonth ? { month: "short", day: "numeric" } : { day: "numeric" });
  return `${f(a, true)}–${f(b, a.getMonth() !== b.getMonth())}`;
};
