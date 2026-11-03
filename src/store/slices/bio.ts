/**
 * Smart Link in Bio (Demo 2). The assistant proposes Link in Bio changes as a work item (kind "bio");
 * the creator reviews them in the panel, then the ORIGINAL Link In Bio editor opens with the changes
 * applied to its draft (`?work=<id>`), and its own SAVE CHANGES (with its publish confirmation) saves.
 *
 * Destinations come only from data TopFan has: published Store items (experience booking pages,
 * courses), the creator's page (where fans subscribe), the Store and Newsletters pages, posts, and the
 * social links and website given during setup (a fictional fixture, labelled simulated). Internal links
 * are checked against the store data; external links are format-checked only (no network calls).
 * Nothing is invented: an offering without a public page stays a pending proposal.
 */
import type { AppData } from "../store";
import type { ID } from "../model";
import type { BioAction } from "./prefsB";
import { Refused } from "../refused";
import { socialFixture, websiteFixture } from "../../config/coverSources";
import { bookingUrl, itemById, nid, now, publicBase, recentPosts, touch, type BioLink, type BioPlan, type WorkItem } from "./content";
import { isPastEvent } from "./monetize";

/* ------------------------------------------------------------------ checks */

export const validUrl = (u: string) => {
  try {
    const x = new URL(u);
    return (x.protocol === "https:" || x.protocol === "http:") && /\.[a-z]{2,}$/i.test(x.hostname);
  } catch {
    return false;
  }
};
/** Same destination? (case, trailing slash and "www." don't matter) */
export const sameUrl = (a?: string | null, b?: string | null) => !!a && !!b && norm(a) === norm(b);
const norm = (u: string) => u.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");

/** Check a URL against TopFan's own data. External URLs are only format-checked. */
export function checkUrl(d: AppData, url: string | undefined | null): { check: BioLink["check"]; note: string; productId?: string } {
  if (!url) return { check: "pending", note: "No public page yet" };
  if (!validUrl(url)) return { check: "invalid", note: "This isn't a valid web address" };
  const base = publicBase(d);
  if (!base || !norm(url).startsWith(norm(base))) return { check: "format", note: "External link: address format checked; not visited in this demo" };
  const path = norm(url).slice(norm(base).length).replace(/^\//, "").split("/");
  const handle = d.account.handle.toLowerCase();
  // Public portfolio / event pages (added from the Link In Bio editor's NEW ACTION pickers).
  if (path[0] === "dashboard" && path[2] === handle && path[4]) {
    if (path[1] === "portfolio" && path[3] === "banner-view") {
      const pf = d.monetize.portfolios.find((x) => x.id.toLowerCase() === path[4]);
      return pf ? { check: "verified", note: `Your ${pf.title} portfolio page` } : { check: "invalid", note: "This portfolio no longer exists" };
    }
    if (path[1] === "event-listing" && path[3] === "ticket-purchase") {
      const ev = d.monetize.events.find((x) => x.id.toLowerCase() === path[4]);
      if (!ev) return { check: "invalid", note: "This event no longer exists" };
      return isPastEvent(ev) ? { check: "invalid", note: `${ev.title} has ended` } : { check: "verified", note: `Ticket page of ${ev.title}` };
    }
  }
  if (path[0] !== handle)return { check: "invalid", note: "This page isn't part of your TopFan site" };
  if (path.length === 1) return { check: "verified", note: "Your TopFan page" };
  if (path[1] === "store" && path[2]) {
    const p = d.monetize.products.find((x) => x.id.toLowerCase() === path[2]);
    if (!p) return { check: "invalid", note: "This offering is no longer in your Store" };
    if (!p.published) return { check: "invalid", note: `${p.title} is disabled, so fans can't open it` };
    if (path[3] === "book" && p.kind !== "experience") return { check: "invalid", note: "Only experiences have a booking page" };
    return { check: "verified", note: `${path[3] === "book" ? "Booking page" : "Store page"} of ${p.title} (checked: live in your Store)`, productId: p.id };
  }
  if (path[1] === "store" || path[1] === "newsletters") return { check: "verified", note: `Your public ${path[1] === "store" ? "Store" : "Newsletters"} page` };
  if (path[1] === "post" && path[2]) {
    const post = d.social.posts.find((x) => x.id.toLowerCase() === path[2]);
    if (!post || post.status !== "published") return { check: "invalid", note: "This post isn't published" };
    if (post.locked) return { check: "invalid", note: "This post is locked; linking it would only show the unlock screen" };
    return { check: "verified", note: "A public post on your Feed" };
  }
  return { check: "format", note: "A page on your site (not checked)" };
}

/* ------------------------------------------------------------------ candidates (what TopFan already has) */

type Cand = Omit<BioLink, "op" | "include"> & { dest: "booking" | "membership" | "course" | "store" | "newsletters" | "website" | "social" | "post" | "event"; weight: number };

const EXP_TITLE: Record<string, string> = {
  "In Person Session": "Book My Training Session",
  "1:1 Video Call": "Book a Video Call With Me",
  "Personalized Video": "Get a Personal Video From Me",
  "Social Media Interaction": "Get a Shout-Out From Me",
};
const SOCIAL_TITLE = { instagram: "Follow My Journey on Instagram", facebook: "Follow Me on Facebook", x: "Follow Me on X" } as const;

export function candidates(d: AppData): Cand[] {
  const base = publicBase(d);
  const h = d.account.handle;
  const out: Cand[] = [];
  const c = (x: Omit<Cand, "check" | "note"> & { note?: string }) => {
    const v = checkUrl(d, x.url);
    out.push({ ...x, check: v.check, note: x.note ?? v.note });
  };
  for (const p of d.monetize.products.filter((x) => x.published && x.kind === "experience"))
    c({ key: `exp-${p.id}`, title: EXP_TITLE[p.experienceType ?? ""] ?? `Book: ${p.title}`, url: bookingUrl(d, p.id), source: `Experience: ${p.title}`, refId: p.id, dest: "booking", weight: p.experienceType === "In Person Session" ? 10 : 4 });
  const plans = d.monetize.plans.filter((p) => p.active);
  if (plans.length && base) c({ key: "membership", title: "Become a Member", url: `${base}/${h}`, source: `Memberships: ${plans.map((p) => p.name).join(", ")}`, dest: "membership", weight: 9, note: "Your TopFan page, where fans subscribe" });
  for (const p of d.monetize.products.filter((x) => x.published && x.kind === "course"))
    c({ key: `course-${p.id}`, title: "Take My Snowboarding Course", url: base ? `${base}/${h}/store/${p.id}` : null, source: `Course: ${p.title}`, refId: p.id, dest: "course", weight: 8 });
  if (base && d.monetize.products.some((x) => x.published && x.kind === "merchandise")) c({ key: "store", title: "Shop My Boards", url: `${base}/${h}/store`, source: "Your Store (merchandise)", dest: "store", weight: 6 });
  for (const e of d.monetize.events.filter((x) => !isPastEvent(x)))
    c({ key: `event-${e.id}`, title: `Get Tickets: ${e.title}`, url: base ? `${base}/dashboard/event-listing/${h}/ticket-purchase/${e.id}` : null, source: `Event: ${e.title} (${e.date.slice(0, 10)})`, refId: e.id, dest: "event", weight: 7 });
  if (base) c({ key: "newsletters", title: "Read My Newsletters", url: `${base}/${h}/newsletters`, source: "Your public Newsletters page (TopFan has no separate signup form)", dest: "newsletters", weight: 3 });
  c({ key: "website", title: "Visit My Website", url: websiteFixture.url, source: "Website from your setup (simulated)", dest: "website", weight: 5 });
  for (const s of socialFixture) c({ key: `social-${s.id}`, title: SOCIAL_TITLE[s.id], url: s.url, source: `${s.id === "x" ? "X" : s.id[0].toUpperCase() + s.id.slice(1)} link from your setup (simulated)`, dest: "social", weight: s.id === "instagram" ? 7 : 2 });
  return out;
}

const existing = (d: AppData) => d.prefsB.linkInBio.actions;
const inBio = (d: AppData, url: string | null) => existing(d).find((a) => sameUrl(a.url, url));
const toLink = (x: Cand, op: BioLink["op"], include: boolean, extra: Partial<BioLink> = {}): BioLink => ({ key: x.key, title: x.title, url: x.url, source: x.source, refId: x.refId, check: x.check, op, include, note: x.note, ...extra });

function addItem(d: AppData, goal: string, bio: BioPlan, extra: Partial<WorkItem> = {}): ID {
  const id = nid("w-bio");
  d.content.items.push({ id, kind: "bio", goal, label: "Link in Bio update", status: "draft", needs: [], flags: [], sources: [], deps: [], bio, updatedAt: now(), ...extra });
  d.content.focusId = id;
  return id;
}

/* ------------------------------------------------------------------ proposals */

/** "Set up my links": what TopFan already has, most important first, minus what's already there. */
export function proposeSetup(d: AppData, goal: string): { id: ID; already: number } {
  const all = candidates(d).filter((x) => x.check !== "invalid");
  const already = all.filter((x) => inBio(d, x.url)).length;
  const fresh = all.filter((x) => !inBio(d, x.url)).sort((a, b) => b.weight - a.weight);
  // The strongest few are selected; the rest are offered unselected (one experience pre-selected).
  let exp = 0;
  const links = fresh.map((x, i) => toLink(x, "add", x.dest === "booking" ? exp++ === 0 : i < 6 && x.weight >= 5));
  if (!links.length) throw new Refused("Everything I can find is already in your Link in Bio. I can review the titles and order instead.");
  const id = addItem(d, goal, { mode: "setup", links, step: "review" });
  itemById(d, id)!.sources = [{ label: "Your Store, memberships, newsletters and pages" }, { label: "Social links and website from your setup (simulated)" }];
  return { id, already };
}

/**
 * "Add my social profiles". Profiles from setup missing from the Social Media Links icons are restored
 * there first (key `icon-<network>`); when every icon is already showing, they're offered as buttons.
 */
const SOCIAL_KEYS = ["instagram", "facebook", "x", "website"] as const;
export function proposeSocials(d: AppData, goal: string): { id: ID; icons: boolean } {
  const all = candidates(d).filter((x) => (x.dest === "social" || x.dest === "website") && x.check !== "invalid");
  if (!all.length) throw new Refused("I couldn't find any social profiles from your setup. You can add them with the pencil under your name in the Link in Bio preview.");
  const icons = d.prefsB.linkInBio.socials ?? {};
  const netOf = (x: Cand) => (x.dest === "website" ? "website" : x.key.replace(/^social-/, "")) as (typeof SOCIAL_KEYS)[number];
  const missing = all.filter((x) => !icons[netOf(x)]);
  if (missing.length) {
    const links = missing.map((x) => toLink(x, "add", true, { key: `icon-${netOf(x)}`, title: x.dest === "website" ? "Website" : x.title.replace(/^Follow (My Journey|Me) on /, ""), note: "Shown as an icon under your name (Social Media Links)" }));
    const id = addItem(d, goal, { mode: "socials", links, step: "review" });
    itemById(d, id)!.sources = [{ label: "Social links and website from your setup (simulated)" }];
    return { id, icons: true };
  }
  const fresh = all.filter((x) => !inBio(d, x.url)).sort((a, b) => b.weight - a.weight);
  if (!fresh.length) throw new Refused("Your social profiles are already shown as icons under your name, and as buttons on your Link in Bio.");
  const id = addItem(d, goal, { mode: "socials", links: fresh.map((x, i) => toLink(x, "add", i === 0)), step: "review" });
  itemById(d, id)!.sources = [{ label: "Social links and website from your setup (simulated)" }];
  return { id, icons: false };
}

/** The Social Media Links icons with a proposal's `icon-<network>` links applied (pure). */
export function applySocials<T extends Record<string, string | undefined>>(socials: T, x: WorkItem): T {
  const out: Record<string, string | undefined> = { ...socials };
  for (const l of x.bio?.links ?? []) if (l.include && l.url && l.key.startsWith("icon-")) out[l.key.slice(5)] = l.url;
  return out as T;
}

/** "Suggest a bio" / "Suggest colors": the creator's own profile bio and brand palette, for the editor's draft. */
export const PALETTE_BRAND = 0; // palette 0 follows the creator's white-label theme colours
export function proposeStyle(d: AppData, goal: string, want: { bio: boolean; palette: boolean }): ID {
  const lib = d.prefsB.linkInBio;
  const profileBio = (d.prefsA.profile.bio ?? "").trim();
  const short = profileBio.length > 160 ? `${profileBio.slice(0, 160).replace(/\s+\S*$/, "")}…` : profileBio;
  const bio = want.bio && short && short !== (lib.bio ?? "").trim() ? short : undefined;
  const palette = want.palette && lib.palette !== PALETTE_BRAND ? PALETTE_BRAND : undefined;
  if (!bio && palette == null) {
    if (want.bio && !short) throw new Refused("Your profile doesn't have a bio yet, so I have nothing of yours to reuse. Add one in Preferences › Profile and I'll shorten it for your Link in Bio.");
    throw new Refused(want.palette && !want.bio ? "Your Link in Bio already uses your website's brand colours." : "Your Link in Bio already uses your profile bio and brand colours.");
  }
  const id = addItem(d, goal, { mode: "style", links: [], step: "review", profile: { bio, palette, paletteName: palette != null ? "Your website's brand colours" : undefined, include: { bio: !!bio, palette: palette != null } } });
  itemById(d, id)!.sources = [{ label: "Your profile bio and website theme" }];
  return id;
}
export function toggleStyle(d: AppData, id: ID, part: "bio" | "palette", on: boolean) {
  const x = plan(d, id);
  if (!x.bio!.profile) return;
  x.bio!.profile.include[part] = on;
  touch(x);
}

/** Which experience does the creator mean? Work items (new) first, then the Store. */
export function findExperience(d: AppData, text: string): { workId?: ID; productId?: ID; title: string } | "ambiguous" | null {
  const t = text.toLowerCase();
  const work = [...d.content.items].reverse().filter((x) => x.kind === "experience" && x.status !== "cancelled");
  const newest = /\b(new|upcoming|this|latest|just)\b/.test(t) && work[0];
  if (newest) return { workId: newest.id, productId: newest.ref?.productId, title: newest.experience!.title };
  const exps = d.monetize.products.filter((x) => x.kind === "experience");
  const byWords = (title: string, type?: string) =>
    (/\b(training|park|in[- ]person|coaching|ride with)\b/.test(t) && type === "In Person Session") || (/\bvideo call|call\b/.test(t) && type === "1:1 Video Call") || (/\bpersonal(ized)? video|shout/.test(t) && type === "Personalized Video") || t.includes(title.toLowerCase().slice(0, 18));
  // "My training session" (not "new"/"upcoming"): a live one in the Store comes before a draft.
  const live = exps.filter((p) => p.published && byWords(p.title, p.experienceType));
  if (live.length === 1) return { productId: live[0].id, title: live[0].title };
  const w = work.find((x) => byWords(x.experience!.title, x.experience!.experienceType));
  if (w) return { workId: w.id, productId: w.ref?.productId, title: w.experience!.title };
  const hits = exps.filter((p) => byWords(p.title, p.experienceType));
  if (hits.length === 1) return { productId: hits[0].id, title: hits[0].title };
  if (hits.length > 1) return "ambiguous";
  return null;
}

/** Feature one offering first (experience, course, membership, store, newsletters, a post). */
export function proposePromote(d: AppData, goal: string, target: { key?: string; workId?: ID; productId?: ID }, mode: BioPlan["mode"] = "promote"): ID {
  const work = itemById(d, target.workId);
  const product = d.monetize.products.find((p) => p.id === (target.productId ?? work?.ref?.productId));
  let link: BioLink;
  const needs: string[] = [];
  if (work && (!product || !product.published)) {
    // Not live yet: keep it as a proposal, never a made-up link.
    link = { key: `exp-${work.id}`, title: EXP_TITLE[work.experience!.experienceType] ?? "Book My Session", url: null, source: `Experience: ${work.experience!.title}`, refId: work.id, check: "pending", op: "add", include: true, note: product ? "Saved but disabled: enable it to get a booking link" : "Not saved in TopFan yet, so there's no booking link" };
    needs.push("Waiting for the experience to be saved and enabled (no booking link yet).");
  } else {
    const key = target.key ?? (product ? `${product.kind === "course" ? "course" : "exp"}-${product.id}` : "");
    const c = candidates(d).find((x) => x.key === key);
    if (!c) throw new Refused("I couldn't find a public page for that, so I didn't add a link.");
    const there = inBio(d, c.url);
    const first = existing(d)[0];
    if (there && first?.id === there.id) throw new Refused(`"${there.title}" is already the first link in your Link in Bio.`);
    link = there ? toLink(c, "move", true, { existingId: there.id, from: there.title, note: `Already in your Link in Bio as "${there.title}": move it to the top` }) : toLink(c, "add", true);
  }
  const id = addItem(d, goal, { mode, links: [link], step: "review" }, { needs, status: needs.length ? "needs-input" : "draft", deps: work ? [work.id] : [] });
  itemById(d, id)!.sources = [{ label: link.source, ref: link.refId }];
  return id;
}

/** Generic labels → clearer calls to action (by destination). */
function betterTitle(d: AppData, a: BioAction): string | null {
  const t = a.title.trim().toLowerCase();
  const v = checkUrl(d, a.url);
  const p = d.monetize.products.find((x) => x.id === v.productId);
  if (/^(click here|tap here|here|link|my link|check this out)$/.test(t)) return p?.kind === "course" ? "Explore My Snowboarding Course" : p?.kind === "experience" ? EXP_TITLE[p.experienceType ?? ""] ?? null : p ? `Get ${p.title}` : null;
  if (/^(instagram|ig|insta)$/.test(t)) return SOCIAL_TITLE.instagram;
  if (/^(facebook|fb)$/.test(t)) return SOCIAL_TITLE.facebook;
  if (/^(membership|members|subscribe)$/.test(t)) return "Become a Member";
  if (/^(events?|tickets)$/.test(t)) return "Book My Next Live Session";
  if (/^(store|shop|merch)$/.test(t)) return "Shop My Boards";
  return null;
}

/** "Make my links better" / "Are my links still relevant?": only meaningful changes. */
export function proposeImprove(d: AppData, goal: string, mode: "improve" | "check" = "improve"): ID {
  const links: BioLink[] = [];
  const seen: BioAction[] = [];
  for (const a of existing(d)) {
    if (!a.url) continue;
    const v = checkUrl(d, a.url);
    const dup = seen.find((s) => sameUrl(s.url, a.url));
    seen.push(a);
    if (dup) {
      links.push({ key: `dup-${a.id}`, title: a.title, url: a.url, source: "Your Link in Bio", check: v.check, op: "remove", existingId: a.id, include: true, note: `Same destination as "${dup.title}": remove the duplicate` });
      continue;
    }
    if (v.check === "invalid") {
      // A removed or disabled offering: replace with the live one of the same kind when there is one.
      // Same kind first (an ended event → the next event), never a destination already used.
      const wasEvent = /ticket-purchase/.test(a.url);
      const live = /no longer in your store|disabled|has ended|no longer exists/i.test(v.note) && candidates(d).filter((c) => (c.dest === "booking" || c.dest === "event") && c.check === "verified" && !inBio(d, c.url) && !links.some((y) => sameUrl(y.url, c.url))).sort((x, y) => Number(wasEvent ? y.dest === "event" : y.dest === "booking") - Number(wasEvent ? x.dest === "event" : x.dest === "booking") || y.weight - x.weight)[0];
      links.push(
        live
          ? { key: `fix-${a.id}`, title: live.title, url: live.url, source: live.source, refId: live.refId, check: "verified", op: "replace", existingId: a.id, from: a.title, include: true, note: `${v.note}. Replace it with your ${live.source.replace(/^(Experience|Event): /, "")}` }
          : { key: `fix-${a.id}`, title: a.title, url: a.url, source: "Your Link in Bio", check: "invalid", op: "remove", existingId: a.id, include: false, note: `${v.note}. Remove it, or fix the address in the editor` },
      );
      continue;
    }
    if (mode === "check") continue;
    const better = betterTitle(d, a);
    if (better && better !== a.title) links.push({ key: `name-${a.id}`, title: better, url: a.url, source: "Your Link in Bio", check: v.check, op: "rename", existingId: a.id, from: a.title, include: true, note: "Clearer call to action" });
  }
  if (mode === "improve") {
    // An important offering that isn't featured yet.
    const m = candidates(d).find((c) => c.dest === "membership");
    if (m && !inBio(d, m.url)) links.push(toLink(m, "add", true, { note: "Your memberships aren't linked yet" }));
  }
  if (!links.length) throw new Refused(mode === "check" ? "All your links point to live pages, and there are no duplicates." : "Your links already look clear. Nothing worth changing.");
  const id = addItem(d, goal, { mode, links, step: "review" });
  itemById(d, id)!.sources = [{ label: "Your current Link in Bio" }, { label: "Your Store and memberships" }];
  return id;
}

/** "I want more subscribers" / "Help fans discover my courses" / "Highlight my latest content". */
export function goalTarget(d: AppData, text: string): { key: string; why: string } | { none: string } | null {
  const t = text.toLowerCase();
  const has = (k: string) => candidates(d).some((c) => c.key === k && c.check === "verified");
  if (/\bsubscri|member/.test(t)) return has("membership") ? { key: "membership", why: "More subscribers: lead with your membership" } : { none: "You don't have an active membership plan yet." };
  if (/\bcourse/.test(t)) {
    const c = candidates(d).find((x) => x.dest === "course");
    return c ? { key: c.key, why: "Help fans discover your course" } : { none: "You don't have a published course yet." };
  }
  if (/\bnewsletter|readers?hip/.test(t)) return has("newsletters") ? { key: "newsletters", why: "Grow readership: link your Newsletters page (TopFan has no separate signup form)" } : null;
  if (/\bevent\b|tickets?/.test(t)) return d.monetize.events.some((e) => new Date(e.date) > new Date()) ? null : { none: "You don't have an upcoming event in Events & Ticketing." };
  if (/\blatest (content|post)|new post|recent post/.test(t)) {
    const p = recentPosts(d, 5).find((x) => !x.locked);
    return p ? { key: `post-${p.id}`, why: "Highlight your latest public post" } : { none: "You don't have a public post to feature." };
  }
  return null;
}

/** A public post as a candidate (only public posts: locked material is never linked). */
export function postCandidate(d: AppData, postId: ID): Cand | null {
  const base = publicBase(d);
  const p = d.social.posts.find((x) => x.id === postId);
  if (!base || !p || p.status !== "published" || p.locked) return null;
  const url = `${base}/${d.account.handle}/post/${p.id}`;
  return { key: `post-${p.id}`, title: "See My Latest Post", url, source: `Post: "${p.text.slice(0, 40)}${p.text.length > 40 ? "…" : ""}"`, refId: p.id, check: "verified", note: "A public post on your Feed", dest: "post", weight: 1 };
}
export function proposeGoal(d: AppData, goal: string, key: string): ID {
  if (key.startsWith("post-")) {
    const c = postCandidate(d, key.slice(5));
    if (!c) throw new Refused("That post isn't public, so I won't link it.");
    const id = addItem(d, goal, { mode: "goal", links: [toLink(c, "add", true)], step: "review" });
    itemById(d, id)!.sources = [{ label: c.source, ref: c.refId }];
    return id;
  }
  return proposePromote(d, goal, { key }, "goal");
}

/* ------------------------------------------------------------------ creator edits to a proposal */

const plan = (d: AppData, id: ID) => {
  const x = itemById(d, id);
  if (!x?.bio) throw new Refused("I couldn't find that Link in Bio proposal.");
  if (x.bio.step === "saved") throw new Refused("Those changes are already saved. Ask me again to prepare new ones.");
  return x;
};
export function toggleLink(d: AppData, id: ID, key: string, include: boolean) {
  const x = plan(d, id);
  const l = x.bio!.links.find((y) => y.key === key);
  if (!l) return;
  if (include && (l.check === "pending" || l.check === "invalid") && l.op !== "remove") throw new Refused(l.check === "pending" ? "That one has no public page yet, so it can't be added." : "That address isn't valid, so it can't be added.");
  l.include = include;
  touch(x);
}
export function renameLink(d: AppData, id: ID, key: string, title: string) {
  const x = plan(d, id);
  const l = x.bio!.links.find((y) => y.key === key);
  if (!l || l.op === "remove") return;
  if (!title.trim()) throw new Refused("A link needs a title.");
  l.title = title.trim().slice(0, 60);
  touch(x);
}
export function moveLink(d: AppData, id: ID, key: string, by: -1 | 1) {
  const x = plan(d, id);
  const ls = x.bio!.links;
  const i = ls.findIndex((y) => y.key === key);
  const j = i + by;
  if (i < 0 || j < 0 || j >= ls.length) return;
  [ls[i], ls[j]] = [ls[j], ls[i]];
  touch(x);
}
/** "Keep it for now" on one flagged link. */
export function keepLink(d: AppData, id: ID, key: string) {
  toggleLink(d, id, key, false);
}

/* ------------------------------------------------------------------ apply (to the editor's draft) and read back */

const cardId = (workId: ID, key: string) => `ba-${workId.slice(-6)}-${key}`.slice(0, 40);

/**
 * The Link In Bio action type for a proposed link, using only the editor's own NEW ACTION types:
 * a Store item (experience booking, course) → Specific Store Item; a post → Specific Feed Content;
 * an event → Specific Event Ticketing; anything else (membership page, Store/Newsletters pages,
 * website, social profiles) → External Action Item with its public address.
 */
export function nativeAction(d: AppData, l: Pick<BioLink, "key" | "refId" | "title" | "url">): Omit<BioAction, "id"> {
  const base = { title: l.title, url: l.url! };
  const v = checkUrl(d, l.url);
  const p = d.monetize.products.find((x) => x.id === (v.productId ?? l.refId) && /\/store\//.test(l.url ?? ""));
  if (p) return { ...base, kind: "store-item", text: p.description, price: p.price ?? undefined, image: p.image ?? null };
  if (/\/post\/[^/]+$/.test(l.url ?? "")) return { ...base, kind: "feed" };
  const ev = /\/ticket-purchase\/([^/]+)$/.exec(l.url ?? "");
  if (ev) {
    const e = d.monetize.events.find((x) => x.id.toLowerCase() === ev[1].toLowerCase());
    return { ...base, kind: "event", text: e?.location, price: e?.tickets.length ? Math.min(...e.tickets.map((t) => t.price)) : undefined };
  }
  return { ...base, kind: "external" };
}

/**
 * Just before the editor opens: re-check every selected destination against current data (an offering
 * may have been disabled or removed since the proposal). Returns the titles that were dropped.
 */
export function revalidatePlan(d: AppData, id: ID): string[] {
  const x = itemById(d, id);
  if (!x?.bio) return [];
  const dropped: string[] = [];
  for (const l of x.bio.links) {
    if (!l.include || l.op === "remove" || l.op === "rename" || l.op === "move" || !l.url) continue;
    const v = checkUrl(d, l.url);
    if (v.check === "invalid") {
      l.check = "invalid";
      l.note = `${v.note} (changed since I suggested it)`;
      l.include = false;
      dropped.push(l.title);
    }
  }
  if (dropped.length) touch(x);
  return dropped;
}

/** The Link in Bio editor's draft with the selected changes applied (pure: nothing is saved here). */
export function applyBio(d: AppData, actions: BioAction[], x: WorkItem): BioAction[] {
  const sel = (x.bio?.links ?? []).filter((l) => l.include && l.url && l.check !== "invalid" && l.check !== "pending" || (l.include && l.op === "remove"));
  let out = actions.filter((a) => !sel.some((l) => l.op === "remove" && l.existingId === a.id));
  out = out.map((a) => {
    const l = sel.find((y) => y.existingId === a.id && (y.op === "rename" || y.op === "replace"));
    return l ? (l.op === "replace" ? { ...nativeAction(d, l), id: a.id } : { ...a, title: l.title }) : a;
  });
  // New and moved links go first, in the proposed order.
  const top: BioAction[] = [];
  for (const l of sel) {
    if (l.op === "move") {
      const a = out.find((y) => y.id === l.existingId);
      if (a) top.push({ ...a, title: l.title });
    }
    if (l.op === "add" && !l.key.startsWith("icon-") && !out.some((y) => sameUrl(y.url, l.url))) top.push({ ...nativeAction(d, l), id: cardId(x.id, l.key) });
  }
  return [...top, ...out.filter((a) => !top.some((t) => t.id === a.id))];
}

/** The editor opened with this proposal applied. */
export function markInEditor(d: AppData, id: ID) {
  const x = itemById(d, id);
  if (x?.bio && x.bio.step === "review") (x.bio.step = "in-editor"), touch(x);
}

/** After SAVE CHANGES: read the saved page back and record what actually landed. */
export function bioSaved(d: AppData, id: ID) {
  const x = itemById(d, id);
  if (!x?.bio) return;
  const saved = d.prefsB.linkInBio.actions;
  const missing: string[] = [];
  let applied = 0;
  for (const l of x.bio.links.filter((y) => y.include)) {
    const ok =
      l.op === "remove" ? !saved.some((a) => a.id === l.existingId)
      : l.op === "add" && l.key.startsWith("icon-") ? sameUrl((d.prefsB.linkInBio.socials as Record<string, string | undefined> | undefined)?.[l.key.slice(5)], l.url)
      : l.op === "add" ? saved.some((a) => sameUrl(a.url, l.url))
      : l.op === "move" ? saved[0]?.id === l.existingId || sameUrl(saved[0]?.url, l.url)
      : saved.some((a) => a.id === l.existingId && a.title === l.title);
    if (ok) applied++;
    else missing.push(l.title);
  }
  const pr = x.bio.profile;
  if (pr) {
    const lib = d.prefsB.linkInBio;
    if (pr.include.bio && pr.bio) (lib.bio ?? "").trim() === pr.bio ? applied++ : missing.push("your bio");
    if (pr.include.palette && pr.palette != null) lib.palette === pr.palette ? applied++ : missing.push(pr.paletteName ?? "the colour palette");
  }
  x.bio.step = "saved";
  x.bio.result = { applied, missing };
  x.status = "saved";
  touch(x);
}

/* ------------------------------------------------------------------ demo fixture (save failure on request) */

/** `?bioFixture=save-fail` (on any page load): the next Link in Bio save fails once, to show recovery. Session-only. */
const FAIL_KEY = "tf-bio-fail-pending";
try {
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("bioFixture") === "save-fail") sessionStorage.setItem(FAIL_KEY, "1");
} catch {
  /* storage unavailable: the fixture is simply off */
}
export function failOnceIfAsked() {
  let pending = false;
  try {
    pending = sessionStorage.getItem(FAIL_KEY) === "1";
    if (pending) sessionStorage.removeItem(FAIL_KEY);
  } catch {
    return;
  }
  if (pending) throw new Refused("Your Link in Bio couldn't be saved (simulated failure). Nothing changed; your edits are still in the editor.");
}
