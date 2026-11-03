/**
 * Dev-only demo creator profiles (brief Part 15). Each starts from the default fictional account and
 * changes identity plus a few coherent facts, so account health and recommendations differ per
 * profile. All people and numbers are fictional. Applied via the review bar ("R").
 */
import { act, resetData } from "../store/store";
import type { EventItem, Post, SubscriptionPlan } from "../store/model";
import type { AppData } from "../store/store";
import { resetWorkflow } from "./agent-context/workflow-state";
import { creatorMedia } from "../media";

interface Profile {
  id: string;
  label: string;
  apply: (d: AppData) => void;
}

const soon = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const post = (id: string, type: Post["type"], text: string, daysAgo: number, extra: Partial<Post> = {}): Post => ({
  id, type, text, createdAt: ago(daysAgo), status: "published", locked: false, topicTagIds: [], groupIds: [], likes: 40 + daysAgo * 3, comments: 6, tips: 0, views: 400 + daysAgo * 20, ...extra,
});
const event = (id: string, title: string, inDays: number, kind: EventItem["kind"], location: string, price: number, qty: number, sold: number): EventItem => ({
  id, title, date: `${soon(inDays)}T19:00:00Z`, location, description: "", kind, source: "native", tickets: [{ name: "General Admission", price, quantity: qty, sold }],
});
const plan = (id: string, name: string, monthly: number, benefits: string[]): SubscriptionPlan => ({ id, name, prices: [{ amount: monthly, months: 1 }], benefits, subscribers: 0, active: true });

const identity = (d: AppData, name: string, handle: string, category: string, profileId: string) => {
  d.account.name = name;
  d.account.firstName = name.split(" ")[0];
  d.account.handle = handle;
  d.account.creatorCategory = category;
  d.account.session.profileId = profileId;
  // Identity media follows the profile everywhere (header, sidebar, feed cover, site preview).
  const m = creatorMedia(handle);
  d.account.avatar = m.avatar;
  if (handle !== "ajwhite") {
    d.account.cover = m.cover;
    d.account.hero = m.cover;
  }
  d.account.whiteLabel.domain = `${handle}.com`;
  d.account.whiteLabel.siteUrl = `https://fans.${handle}.com`;
};

/** The demo creators on the platform (name + handle), e.g. New Post's "Tag Collaborating Creators" list. */
export const DEMO_CREATORS: { name: string; handle: string }[] = [
  { name: "AJ White", handle: "ajwhite" },
  { name: "Rae Calder", handle: "raecalder" },
  { name: "Nina Oduya", handle: "ninaoduya" },
  { name: "Marco Reyes", handle: "marcoreyesfit" },
  { name: "Jules Brennan", handle: "julesbrennan" },
  { name: "Kai Morrow", handle: "kaimorrow" },
  { name: "Lena Whitfield", handle: "lenawhitfield" },
  { name: "North Ridge Collective", handle: "northridge" },
];

export const PROFILES: Profile[] = [
  { id: "athlete", label: "Athlete · AJ White", apply: (d) => identity(d, "AJ White", "ajwhite", "Athletes", "athlete") },
  {
    id: "musician",
    label: "Musician · Rae Calder",
    apply: (d) => {
      identity(d, "Rae Calder", "raecalder", "Musicians", "musician");
      d.monetize.events = [event("ev-m1", "Harbor Lights Live", 9, "event", "Portland, OR", 35, 300, 214)];
      d.social.posts = [post("pm1", "audio", "New demo from the studio. Tell me what you think!", 3, { media: [{ kind: "audio", placeholder: "Studio session", src: "creators/raecalder/studio" }] })];
    },
  },
  {
    id: "educator",
    label: "Educator · Dr. Nina Oduya",
    apply: (d) => {
      identity(d, "Nina Oduya", "ninaoduya", "Educators", "educator");
      d.monetize.plans = [plan("scholar", "Scholar Plan", 12, ["Weekly lessons", "Monthly live Q&A"])];
      d.social.posts = [post("pe1", "article", "Three study habits that actually stick.", 21, { media: [{ kind: "image", placeholder: "Study notes", src: "creators/ninaoduya/lesson" }] })];
    },
  },
  {
    id: "fitness",
    label: "Fitness · Marco Reyes",
    apply: (d) => {
      identity(d, "Marco Reyes", "marcoreyesfit", "Fitness", "fitness");
      d.social.posts = [post("pf1", "video", "15-minute mobility routine.", 2, { media: [{ kind: "video", placeholder: "Mobility routine", video: "videos/fitness-mobility" }] }), post("pf2", "reel", "Form check: the goblet squat.", 6, { media: [{ kind: "image", placeholder: "Workout", src: "creators/marcoreyesfit/workout" }] })];
      d.money.refundRequests = d.money.refundRequests.slice(0, 1);
    },
  },
  {
    id: "podcaster",
    label: "Podcaster · Jules Brennan",
    apply: (d) => {
      identity(d, "Jules Brennan", "julesbrennan", "Podcasters", "podcaster");
      d.monetize.plans = [plan("insider", "Insider", 6, ["Ad-free episodes", "Bonus episodes"])];
      d.social.posts = [post("pp1", "audio", "Episode 48: the long road home.", 5, { media: [{ kind: "audio", placeholder: "Podcast cover", src: "posts/podcast" }] })];
    },
  },
  {
    id: "gamer",
    label: "Streamer · Kai Morrow",
    apply: (d) => {
      identity(d, "Kai Morrow", "kaimorrow", "Gamers", "gamer");
      d.monetize.events = [event("ev-g1", "Friday Night Speedruns", 2, "livestream", "Online", 0, 1000, 0)];
      d.social.posts = [post("pg1", "video", "Clip of the week.", 1, { media: [{ kind: "video", placeholder: "Clip of the week", video: "videos/gaming-clip" }] })];
    },
  },
  {
    id: "artist",
    label: "Artist · Lena Whitfield",
    apply: (d) => {
      identity(d, "Lena Whitfield", "lenawhitfield", "Artists", "artist");
      d.social.posts = [];
    },
  },
  {
    id: "team",
    label: "Established team · North Ridge Collective",
    apply: (d) => {
      identity(d, "North Ridge Collective", "northridge", "Musicians", "team");
      d.prefsB.outboundEmail = { ...d.prefsB.outboundEmail, domain: "mail.northridge.com", senderEmail: "hello@mail.northridge.com", status: "verified", steps: d.prefsB.outboundEmail.steps.map((s) => ({ ...s, status: "Verified" as const })), errorDetail: null };
      d.money.payoutAccount = { connected: true, label: "Checking ••••4821 (demo)" };
      d.monetize.events = [event("ev-t1", "Ridge Fest Day 1", 21, "event", "Denver, CO", 55, 1200, 860)];
      d.social.posts = [post("pt1", "images", "Rehearsal photos are up.", 1, { media: [{ kind: "image", placeholder: "Rehearsal", src: "creators/northridge/rehearsal" }] })];
    },
  },
];

/** Reset to the default fictional account, then apply the profile. */
export function applyProfile(id: string) {
  const p = PROFILES.find((x) => x.id === id);
  if (!p) return;
  resetData();
  resetWorkflow();
  act(`dev.profile.${id}`, p.apply);
}
