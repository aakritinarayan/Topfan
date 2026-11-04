/**
 * Plan my week (Demo 2): Creator intent → a proposed plan (no drafts yet) → the creator edits and approves it
 * once → real drafts are prepared (the same work items New Post, New Newsletter and Add Experience open) →
 * the creator reviews and publishes on those screens.
 *
 * Approving the plan only authorizes preparing drafts: nothing is published, sent, scheduled or activated.
 * The plan lives on the week work item (kind "week"); each activity points at its draft by id (childId),
 * so chat, plan and screens read one shared record.
 */
import type { AppData } from "../store";
import type { ID } from "../model";
import { Refused } from "../refused";
import { proposePromote } from "./bio";
import {
  attachMedia,
  cancelItem,
  childrenOf,
  createExperience,
  createNewsletter,
  createPost,
  DAY_NAMES,
  GENERATED,
  itemById,
  libraryMedia,
  moveTo,
  nid,
  now,
  setLockCombo,
  monetizeAdvice,
  touch,
  type PlanActivity,
  type WeekPlan,
  type WorkItem,
} from "./content";

export const KIND_LABEL: Record<PlanActivity["kind"], string> = { post: "Post", newsletter: "Newsletter", experience: "Experience", bio: "Link in Bio" };

/** Experience ideas the creator can cycle through ("Give me another Experience idea"). Types are TopFan's own. */
export const EXP_IDEAS = [
  { title: "One-to-One Snowboarding Coaching", expType: "In Person Session", purpose: "Earn from a session fans can book" },
  { title: "Riding Technique Video Call", expType: "1:1 Video Call", purpose: "Coach fans wherever they ride" },
  { title: "Personal Shout-out Video", expType: "Personalized Video", purpose: "A quick personal video fans can order" },
  { title: "Small-Group Training Session", expType: "In Person Session", purpose: "Ride with a few fans at once" },
];

const WORDS: Record<string, number> = { a: 1, an: 1, one: 1, single: 1, two: 2, couple: 2, three: 3, four: 4, five: 5 };
const num = (w: string) => WORDS[w] ?? (Number(w) || 0);
const POST_DAYS = [1, 3, 2, 4, 0];

/** What the creator asked for: counts per kind (null = "propose something balanced"). */
export function parseWeekAsk(goal: string) {
  const g = goal.toLowerCase().replace(/[’']/g, "'");
  const count = (re: RegExp) => {
    const m = g.match(re);
    return m ? num(m[1]) : null;
  };
  const N = "(a|an|one|single|two|couple|three|four|five|\\d)";
  // "a training post, an exclusive post…": every counted mention adds up.
  const postHits = [...g.matchAll(new RegExp(`\\b${N}( of)? (\\w+ )?posts?\\b`, "g"))];
  let posts: number | null = postHits.length ? postHits.reduce((n, m) => n + num(m[1]), 0) : null;
  let newsletters = count(new RegExp(`\\b${N} (\\w+ )?newsletters?\\b`));
  let experiences = count(new RegExp(`\\b${N} (\\w+ )?(fan )?(experiences?|sessions?)\\b`));
  const only = /\b(only|just)\b/.test(g);
  const mentions = { post: /\bposts?\b/.test(g), newsletter: /\bnewsletters?\b/.test(g), experience: /\b(fan )?(experiences?|sessions?)\b/.test(g) };
  const specific = posts != null || newsletters != null || experiences != null || (only && (mentions.post || mentions.newsletter || mentions.experience));
  if (specific) {
    // Named kinds without a number get one (posts get two); kinds not named are left out.
    posts ??= mentions.post ? (only && !mentions.newsletter && !mentions.experience ? 3 : 2) : 0;
    newsletters ??= mentions.newsletter ? 1 : 0;
    experiences ??= mentions.experience ? 1 : 0;
  } else {
    // A broad goal: a balanced week (public post, members-only post, newsletter, experience).
    posts = 2;
    newsletters = /\bno newsletter/.test(g) ? 0 : 1;
    experiences = /\bno (experience|session)/.test(g) ? 0 : 1;
  }
  return {
    posts: Math.min(posts, 5),
    newsletters: Math.min(newsletters, 1),
    experiences: Math.min(experiences, 1),
    exclusive: !/\bno (exclusive|members)/.test(g) && (!specific || /\b(exclusive|members|premium|paid)\b/.test(g) || posts >= 2),
    promote: /\b(promote|link ?in ?bio)\b/.test(g),
    memberships: /\b(grow|growing|more) (my )?(members|memberships|subscribers)\b/.test(g),
  };
}

/** Monday of next week (ISO date): the week being planned. */
function nextMonday() {
  const at = new Date();
  at.setDate(at.getDate() + (((8 - at.getDay()) % 7) || 7));
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
}

const postActivity = (i: number, locked: boolean, promote: boolean): PlanActivity => ({
  key: nid("pa"),
  kind: "post",
  day: POST_DAYS[i % POST_DAYS.length],
  title: locked ? "Advanced technique breakdown" : i === 0 ? (promote ? "Session announcement" : "Training update") : "Behind the scenes",
  purpose: locked ? "Give members something they can't get anywhere else" : i === 0 ? (promote ? "Tell fans about the session" : "Keep fans up to date") : "Stay in touch between updates",
  locked,
  topic: locked ? "exclusive" : i === 0 ? "training" : "behind",
});

/** Propose a week (a plan only: no drafts are created until the creator approves it). Returns the week id. */
export function proposeWeek(d: AppData, goal: string): ID {
  const ask = parseWeekAsk(goal);
  const acts: PlanActivity[] = [];
  for (let i = 0; i < ask.posts; i++) acts.push(postActivity(i, ask.exclusive && i === 1, ask.promote && ask.experiences > 0));
  if (ask.newsletters) acts.push({ key: nid("pa"), kind: "newsletter", day: 5, title: "This Week on the Mountain", purpose: "Round up the week for your subscribers" });
  if (ask.experiences) acts.push({ key: nid("pa"), kind: "experience", day: 6, ...EXP_IDEAS[0] });
  if (ask.promote && ask.experiences) acts.push({ key: nid("pa"), kind: "bio", day: 6, title: "Feature the booking link", purpose: "Once the experience is live, add its booking link" });
  if (!acts.length) throw new Refused("Tell me what to plan: posts, a newsletter or an experience.");
  const id = nid("w-week");
  const plan: WeekPlan = { stage: "proposed", weekOf: nextMonday(), activities: acts, expIdea: 0 };
  d.content.items.push({ id, kind: "week", goal, label: "Your week", status: "draft", needs: [], flags: [], sources: [], deps: [], plan, updatedAt: now() });
  if (ask.memberships) focusMemberships(d, id);
  d.content.focusId = id;
  return id;
}

export const planOf = (d: AppData, id: ID) => itemById(d, id)?.plan ?? null;
const live = (p: WeekPlan) => p.activities;
const order = (a: PlanActivity) => (a.day + 6) % 7;
export const sortedActivities = (p: WeekPlan) => [...live(p)].sort((a, b) => order(a) - order(b));

/** Audience in plain words, for the plan rows. */
export function audienceOf(a: PlanActivity) {
  if (a.kind === "post") return a.locked ? "Members (Lock)" : "Public";
  if (a.kind === "newsletter") return "All subscribers";
  if (a.kind === "experience") return "Fans who book";
  return "Your Link in Bio";
}

/** Readiness of one activity, from its real draft (never claimed before it exists). */
export function activityStatus(d: AppData, a: PlanActivity): { label: string; tone: "ok" | "warn" | "muted" | "bad"; cta: string | null } {
  if (a.error) return { label: "Couldn't prepare", tone: "bad", cta: "Retry" };
  const x = itemById(d, a.childId);
  if (!x) return { label: "Planned", tone: "muted", cta: null };
  if (x.status === "cancelled") return { label: "Removed", tone: "muted", cta: null };
  if (x.status === "published") return { label: "Published", tone: "ok", cta: null };
  if (x.status === "sent") return { label: "Sent", tone: "ok", cta: null };
  if (x.status === "active") return { label: "Active", tone: "ok", cta: null };
  if (x.status === "saved") return { label: x.kind === "experience" ? "Saved (not active)" : "Saved as draft", tone: "ok", cta: x.kind === "post" ? "Review post" : x.kind === "newsletter" ? "Review newsletter" : "Review experience" };
  if (x.kind === "bio") return { label: x.status === "needs-input" ? "Waits for the experience" : "Ready for review", tone: x.status === "needs-input" ? "muted" : "warn", cta: x.status === "needs-input" ? null : "Review links" };
  if (x.flags.length && x.status !== "blocked") return { label: "Needs a look", tone: "warn", cta: x.kind === "post" ? "Review post" : x.kind === "newsletter" ? "Review newsletter" : "Complete details" };
  if (x.kind === "post" && x.post?.locked && x.needs.length) return { label: "Ready for access review", tone: "warn", cta: "Review access" };
  if (x.kind === "experience") return x.needs.length ? { label: `Needs ${x.needs.map((n) => (/price/i.test(n) ? "price" : /availab|days and hours/i.test(n) ? "availability" : "details")).join(" and ")}`, tone: "warn", cta: "Complete details" } : { label: "Ready for review", tone: "ok", cta: "Review experience" };
  if (x.kind === "newsletter") return { label: x.status === "blocked" ? "Draft prepared (email needs verifying)" : "Draft prepared", tone: x.status === "blocked" ? "warn" : "ok", cta: "Review newsletter" };
  if (x.needs.length) return { label: "Needs your input", tone: "warn", cta: "Review post" };
  return { label: x.status === "approved" ? "Approved" : "Ready", tone: "ok", cta: "Review post" };
}

/* ------------------------------------------------------------------ plan edits (before or after approval) */

function weekOrThrow(d: AppData, id: ID) {
  const w = itemById(d, id);
  if (!w?.plan) throw new Refused("I couldn't find that weekly plan.");
  return w as WorkItem & { plan: WeekPlan };
}

/** "Make it two posts": add or remove posts (only planned ones are removed; prepared drafts are cancelled, never deleted). */
export function setPostCount(d: AppData, id: ID, n: number) {
  const w = weekOrThrow(d, id);
  const posts = w.plan.activities.filter((a) => a.kind === "post" && !isGone(d, a));
  if (n < 1 || n > 5) throw new Refused("Pick between one and five posts.");
  if (n > posts.length) {
    const exp = w.plan.activities.some((a) => a.kind === "experience");
    for (let i = posts.length; i < n; i++) {
      const a = postActivity(i, false, false);
      // A free day that no other post uses.
      a.day = POST_DAYS.find((day) => !w.plan.activities.some((b) => b.kind === "post" && b.day === day && !isGone(d, b))) ?? a.day;
      if (exp && i === 0) a.title = "Session announcement";
      w.plan.activities.push(a);
    }
  } else for (const a of posts.slice(n).reverse()) removeActivity(d, id, a.key);
  touch(w);
}

const isGone = (d: AppData, a: PlanActivity) => itemById(d, a.childId)?.status === "cancelled";

/** Remove one activity: a planned one disappears; a prepared draft is cancelled (dependents are flagged). */
export function removeActivity(d: AppData, id: ID, key: ID) {
  const w = weekOrThrow(d, id);
  const a = w.plan.activities.find((x) => x.key === key);
  if (!a) return;
  const x = itemById(d, a.childId);
  if (x && ["published", "sent", "active"].includes(x.status)) throw new Refused(`The ${x.label.toLowerCase()} is already live, so I won't remove it from here. Change it on its own page.`);
  if (x) cancelItem(d, x.id);
  else w.plan.activities = w.plan.activities.filter((y) => y.key !== key);
  touch(w);
}

/** Move one activity to another day (a prepared draft moves with it; linked drafts are flagged). */
export function moveActivity(d: AppData, id: ID, key: ID, day: number) {
  const w = weekOrThrow(d, id);
  const a = w.plan.activities.find((x) => x.key === key);
  if (!a) return;
  if (a.childId) moveTo(d, a.childId, day);
  a.day = day;
  touch(w);
}

/** "Change Wednesday's post to members-only" (before preparing; afterwards the Lock is set on the draft). */
export function setActivityLocked(d: AppData, id: ID, key: ID, locked: boolean) {
  const w = weekOrThrow(d, id);
  const a = w.plan.activities.find((x) => x.key === key);
  if (!a || a.kind !== "post") throw new Refused("Only posts can be members-only.");
  a.locked = locked;
  a.topic = locked ? "exclusive" : "training";
  a.title = locked ? "Advanced technique breakdown" : "Training update";
  a.purpose = locked ? "Give members something they can't get anywhere else" : "Keep fans up to date";
  touch(w);
}

/** "Give me another Experience idea": the next idea (only while it's still a plan). */
export function nextExperienceIdea(d: AppData, id: ID) {
  const w = weekOrThrow(d, id);
  const a = w.plan.activities.find((x) => x.kind === "experience");
  if (!a) throw new Refused("There's no experience in this plan. Ask me to add one.");
  if (a.childId) throw new Refused("That experience is already prepared. Change its type or title instead, or remove it and add a new one.");
  w.plan.expIdea = (w.plan.expIdea + 1) % EXP_IDEAS.length;
  Object.assign(a, EXP_IDEAS[w.plan.expIdea]);
  touch(w);
}

/** Add an activity kind that isn't in the plan yet. */
export function addActivity(d: AppData, id: ID, kind: "newsletter" | "experience") {
  const w = weekOrThrow(d, id);
  if (w.plan.activities.some((a) => a.kind === kind && !isGone(d, a))) throw new Refused(`There's already ${kind === "newsletter" ? "a newsletter" : "an experience"} in this plan.`);
  w.plan.activities.push(kind === "newsletter" ? { key: nid("pa"), kind, day: 5, title: "This Week on the Mountain", purpose: "Round up the week for your subscribers" } : { key: nid("pa"), kind, day: 6, ...EXP_IDEAS[w.plan.expIdea] });
  touch(w);
}

/** "Focus more on growing memberships": public posts and the newsletter point fans at a membership; one post is members-only. */
export function focusMemberships(d: AppData, id: ID) {
  const w = weekOrThrow(d, id);
  w.plan.focus = "memberships";
  const posts = w.plan.activities.filter((a) => a.kind === "post" && !a.childId);
  if (posts.length && !posts.some((a) => a.locked)) setActivityLocked(d, id, posts[posts.length > 1 ? 1 : 0].key, true);
  for (const a of w.plan.activities) {
    if (a.childId) continue;
    if (a.kind === "post" && !a.locked) Object.assign(a, { membershipCta: true, purpose: "Show fans what members get, and invite them to join" });
    if (a.kind === "newsletter") a.purpose = "Round up the week and invite readers to join a membership";
  }
  touch(w);
}

/* ------------------------------------------------------------------ approve once → prepare the drafts */

const MEDIA_FOR: Record<PlanActivity["kind"], string | null> = { post: "generated/training-cinematic", newsletter: "generated/training-wide", experience: "generated/training-minimal", bio: null };
const generated = (key: string) => {
  const g = [...GENERATED.training, ...GENERATED.revisions].find((x) => x.key === key)!;
  return { key: g.key, label: "AI-generated image", origin: "generated" as const, direction: g.direction, brief: g.label, w: g.w, h: g.h };
};

/** Test hook (browser tests only): the next preparation of this kind fails, to show a partial failure and a single retry. */
function failForTest(kind: PlanActivity["kind"]) {
  try {
    if (localStorage.getItem("tf-test-fail-prep") !== kind) return false;
    localStorage.removeItem("tf-test-fail-prep");
    return true;
  } catch {
    return false;
  }
}

/** Prepare one activity's draft (idempotent: an activity with a draft is left as it is). */
function prepareActivity(d: AppData, w: WorkItem & { plan: WeekPlan }, a: PlanActivity) {
  if (itemById(d, a.childId)) return;
  if (failForTest(a.kind)) throw new Refused("The image service didn't respond for this one.");
  const exp = w.plan.activities.find((x) => x.kind === "experience");
  let cid: ID;
  if (a.kind === "post") {
    cid = createPost(d, a.title, { topic: a.locked ? "exclusive" : a.topic, parentId: w.id, day: a.day, link: a.title === "Session announcement" && exp?.childId ? { rel: "announces", id: exp.childId } : undefined });
    const x = itemById(d, cid)!;
    x.label = a.title;
    if (a.title === "Session announcement" && exp?.childId) {
      const e = itemById(d, exp.childId)!;
      x.post!.text = `New: ${e.experience!.title}. ${e.experience!.description.split(". ")[0]}. Book it on my page once it's live.`;
      x.deps = [e.id];
      x.sources = [{ label: `Your experience draft: ${e.experience!.title}`, ref: e.id }];
    }
    if (a.membershipCta && !x.post!.locked) x.post!.text = `${x.post!.text} Want the full breakdowns? Join a membership on my page.`;
    // The public post gets a library photo; the others a generated image (both attached to the real draft).
    const media = !x.post!.locked && libraryMedia(d, "as-park") && a.day === 1 ? libraryMedia(d, "as-park")! : generated(MEDIA_FOR.post!);
    attachMedia(d, cid, media);
    if (x.post!.locked) {
      // The advisor's starting suggestion (an example, not a market price): the creator approves it in Lock.
      const adv = monetizeAdvice(d, cid);
      setLockCombo(d, cid, { purchase: adv.price });
      x.needs = [`Approve the suggested unlock settings (${adv.pricedPosts ? "$" + adv.price : "$" + adv.price + ", an example"}) in Lock.`];
      x.status = "needs-input";
    }
  } else if (a.kind === "newsletter") {
    cid = createNewsletter(d, a.title, { parentId: w.id, day: a.day, mentionsId: exp?.childId });
    const x = itemById(d, cid)!;
    x.newsletter!.title = a.title;
    x.label = a.title;
    if (w.plan.focus === "memberships") x.newsletter!.body = x.newsletter!.body.replace(/See everything on my page\.$/, "Want more? Join a membership on my page for members-only breakdowns.");
    attachMedia(d, cid, generated(MEDIA_FOR.newsletter!));
  } else if (a.kind === "experience") {
    cid = createExperience(d, a.title, { parentId: w.id, day: a.day });
    const x = itemById(d, cid)!;
    Object.assign(x.experience!, { title: a.title, experienceType: a.expType ?? "In Person Session" });
    x.label = a.title;
    attachMedia(d, cid, generated(MEDIA_FOR.experience!));
    // Price and availability are the creator's decisions (never invented).
    x.needs = ["Price per session (you decide)", ...(["1:1 Video Call", "In Person Session"].includes(x.experience!.experienceType) ? ["Available days and hours (you set them on the form)"] : [])];
    x.status = "needs-input";
    // Drafts prepared earlier that mention the session now depend on it.
    for (const b of w.plan.activities) {
      const y = itemById(d, b.childId);
      if (y && y.kind !== "experience" && /session|experience/i.test(b.title + (y.newsletter?.body ?? "")) && !y.deps.includes(cid)) y.deps.push(cid);
    }
  } else {
    if (!exp?.childId) throw new Refused("The Link in Bio update needs the experience first.");
    cid = proposePromote(d, "Feature my experience in my Link in Bio", { workId: exp.childId });
    itemById(d, cid)!.parentId = w.id;
  }
  a.childId = cid;
  a.error = undefined;
}

/**
 * The creator approved the plan (or asked for "the remaining drafts"): prepare every activity without a draft.
 * Experiences first, so posts and newsletters that promote them can point at the same draft. A failure
 * keeps every other draft and marks only that activity for a retry.
 */
export function preparePlan(d: AppData, id: ID, only?: ID): { made: ID[]; failed: ID[] } {
  const w = weekOrThrow(d, id);
  const made: ID[] = [];
  const failed: ID[] = [];
  const rank = (a: PlanActivity) => (a.kind === "experience" ? 0 : a.kind === "bio" ? 3 : 1);
  for (const a of [...w.plan.activities].sort((x, y) => rank(x) - rank(y))) {
    if (only && a.key !== only) continue;
    if (itemById(d, a.childId)) continue;
    try {
      prepareActivity(d, w, a);
      made.push(a.key);
    } catch (e) {
      a.error = e instanceof Error ? e.message : "Something went wrong.";
      failed.push(a.key);
    }
  }
  w.plan.stage = "prepared";
  touch(w);
  d.content.focusId = id;
  return { made, failed };
}

/** Resolve "Monday's post", "Friday's newsletter", "the experience", "Wednesday's image" to one activity. */
export function findActivity(d: AppData, id: ID, t: string): PlanActivity | null {
  const p = planOf(d, id);
  if (!p) return null;
  const acts = p.activities.filter((a) => !isGone(d, a));
  const dm = t.match(/\b(sun|mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?)(day)?\b/);
  const day = dm ? ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].findIndex((x) => dm[1].startsWith(x)) : -1;
  const kind: PlanActivity["kind"] | null = /newsletter/.test(t) ? "newsletter" : /experience|session|coaching|call/.test(t) ? "experience" : /link ?in ?bio|booking link/.test(t) ? "bio" : /\bpost\b/.test(t) ? "post" : null;
  const hits = acts.filter((a) => (day < 0 || a.day === day) && (!kind || a.kind === kind));
  // "the exclusive post" / "the public post" without a day: the one that matches.
  if (day < 0 && kind === "post" && /\b(exclusive|members|locked)\b/.test(t)) return hits.find((a) => a.locked) ?? hits[0] ?? null;
  if (day < 0 && kind === "post" && /\b(public|training update)\b/.test(t)) return hits.find((a) => !a.locked) ?? hits[0] ?? null;
  if (hits.length) return hits[0];
  if (/members|exclusive|locked/.test(t)) return acts.find((a) => a.locked) ?? null;
  return null;
}

export const dayName = (a: PlanActivity) => DAY_NAMES[a.day];
export const activityName = (a: PlanActivity) => `${DAY_NAMES[a.day]}'s ${a.kind === "bio" ? "Link in Bio update" : a.kind === "post" && a.locked ? "members-only post" : KIND_LABEL[a.kind].toLowerCase()}`;
export const childrenOfWeek = childrenOf;
