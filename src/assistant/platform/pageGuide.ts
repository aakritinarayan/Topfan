/**
 * Contextual guidance for the page the creator is on: one short line about the page, and up to three
 * next actions chosen for the demo's purpose (Account Setup & Navigation: understand, find, set up;
 * AI-Assisted Content: write, prepare, review). Shared by both demo links; only the actions differ.
 * Each action reuses the assistant's existing behavior (explain, guided task, draft, Autopilot view):
 * nothing here changes data or starts another demo's workflow.
 */
import { resolve } from "../../app/routeCatalog";
import { inScope } from "../../app/demo";
import { featureById } from "../../app/agent-context/features";
import { getWorkflow, progressOf } from "../../app/agent-context/workflow-state";
import { taskById } from "../../app/agent-context/tasks";
import { roleCan } from "../../store/permissions";
import { getData } from "../../store/store";
import { openAutopilot } from "./autopilotView";
import { featureForRoute, type usePlatformAgent } from "./PlatformAgent";
import { coverActions } from "./CoverAssistant";
import { contentActions, unfinishedWork } from "./ContentAgent";

type Agent = ReturnType<typeof usePlatformAgent>;
export interface GuideItem {
  id: string;
  label: string;
  run: () => void;
}
type Def = { id: string; label: string; run: (g: Agent) => void; content?: boolean };

/* Placeholder drafts: only what the creator tells us is filled in; the rest stays in [brackets]. */
const MEMBER_UPDATE = "Members only: [what you're sharing with members first this week].\n\nThanks for being part of [plan name]. [One thing you'd like members to do next.]";
const ANNOUNCE = (what: string) => `New on my page: ${what}. [What fans get and who it's for.] [When it's available.] Details on my page.`;

const understand = (featureId: string, label?: string): Def => ({ id: `understand-${featureId}`, label: label ?? `Understand ${featureById(featureId)?.name ?? "this page"}`, run: (g) => g.explainFeature(featureId) });
const task = (id: string, label: string): Def => ({ id: `task-${id}`, label, run: (g) => void g.beginTask(id, { goal: label }) });
const exploreEarning: Def = { id: "earn-all", label: "Explore other earning options", run: (g) => g.showEarn({ kind: "all" }) };
const planWeek: Def = { id: "ap-plan", label: "Prepare this week's content", content: true, run: () => openAutopilot({ screen: "plan", step: "intro" }) };
const reviewDrafts = (label = "Review my prepared posts"): Def => ({ id: "ap-review", label, content: true, run: () => openAutopilot({ screen: "summary" }) });
const memberUpdate: Def = { id: "member-update", label: "Draft a member-only update", content: true, run: (g) => g.offerDraft("post-idea", MEMBER_UPDATE) };
/** Cover page help (Account Setup demo; see CoverAssistant). */
const cover = (id: "start" | "prepare" | "improveIntro" | "suggestColors" | "reviewMissing", label: string): Def => ({ id: `cover-${id}`, label, run: () => coverActions()?.[id]() });
/** AI-Assisted Content workflows (see ContentAgent); hidden when the content assistant isn't mounted. */
const ca = (id: string, label: string, fn: (c: NonNullable<ReturnType<typeof contentActions>>) => void): Def => ({ id: `ca-${id}`, label, content: true, run: () => { const c = contentActions(); if (c) fn(c); } });
const pageHelp: Def = { id: "page-help", label: "What can I do on this page?", run: (g) => void g.handle("What can I do on this page?") };

/** Per page: [Account Setup & Navigation actions, AI-Assisted Content actions]. */
const PAGES: Record<string, { featureId: string; intro?: string; contentIntro?: string; setup: Def[]; content: Def[] }> = {
  feed: {
    featureId: "feed",
    contentIntro: "Your posts and how fans are responding to them.",
    setup: [pageHelp, task("create-post", "Explore how to create a post"), task("white-label", "Customize my website")],
    content: [ca("post", "Create another post", (c) => c.post()), ca("repurpose", "Repurpose this content", (c) => c.newsletter("Turn my latest post into a newsletter")), ca("performance", "Review available performance information", (c) => c.performance()), planWeek, reviewDrafts()],
  },
  newpost: {
    featureId: "new-post",
    contentIntro: "Create a post for your fans. I can help write it, add a visual and choose who can see it.",
    setup: [understand("new-post", "Understand available post types"), task("create-post", "Walk me through creating a post"), understand("feed", "Learn where published posts appear")],
    content: [ca("write", "Help me write this post", (c) => c.post()), ca("visual", "Add a visual", (c) => c.media()), ca("audience", "Choose who can see this", (c) => c.audience()), reviewDrafts("Review my AI-generated drafts")],
  },
  "monetize-subscription": {
    featureId: "subscriptions",
    intro: "You can create and manage recurring membership plans for your fans.",
    contentIntro: "Membership plans give fans recurring access. Newsletters can go to specific plans; posts can be locked behind an unlock price.",
    setup: [understand("subscriptions", "Understand subscriptions"), task("launch-subscription", "Create a membership"), exploreEarning],
    content: [ca("membership", "Understand membership access", (c) => c.membership()), ca("plans", "Review existing plans", (c) => c.plans()), ca("exclusive", "Create exclusive content", (c) => c.post("Create an exclusive post for my members")), { id: "benefits", label: "Help write my membership benefits", content: true, run: (g) => g.offerDraft("plan-benefits") }],
  },
  "monetize-newsletters": {
    featureId: "newsletters",
    contentIntro: "Write newsletters for your fans and subscribers. I can draft one, or turn a post into one.",
    setup: [understand("newsletters"), task("send-newsletter", "Set up a newsletter"), exploreEarning],
    content: [ca("newsletter", "Draft a newsletter", (c) => c.newsletter()), ca("repurpose", "Repurpose an existing post", (c) => c.newsletter("Turn my latest post into a newsletter")), ca("recipients", "Review recipient options", (c) => c.recipients()), understand("newsletters", "Understand this page")],
  },
  "monetize-experience": {
    featureId: "experiences",
    contentIntro: "Paid experiences fans can book with you, like a video call or an in-person session.",
    setup: [understand("experiences"), task("sell-experience", "Set up an experience"), exploreEarning],
    content: [ca("experience", "Plan an experience", (c) => c.experience()), ca("description", "Help with the description", (c) => c.experience("Plan a fan experience")), ca("required", "Review required details", (c) => c.requiredDetails()), understand("experiences", "Understand this page")],
  },
  "monetize-courses": {
    featureId: "courses",
    setup: [understand("courses"), task("sell-course", "Set up a course"), exploreEarning],
    content: [{ id: "outline", label: "Draft a course outline", content: true, run: (g) => g.offerDraft("course-outline") }, { id: "announce-course", label: "Announce my course", content: true, run: (g) => g.offerDraft("post-idea", ANNOUNCE("[course title]")) }, understand("courses", "Understand this page")],
  },
  "wallet-balance": {
    featureId: "wallet-balance",
    setup: [understand("wallet-balance", "Understand my wallet"), { id: "earnings", label: "Where can I check my earnings?", run: (g) => void g.handle("Where can I check my earnings?") }, exploreEarning],
    content: [understand("wallet-balance", "Understand this page"), planWeek],
  },
  insights: {
    featureId: "insights",
    setup: [understand("insights"), { id: "earnings", label: "Check my earnings", run: (g) => g.navigateTo("earnings") }, task("vip-group", "Help me create a VIP group")],
    content: [understand("insights", "Understand this page"), planWeek, reviewDrafts()],
  },
  "pref-profile": {
    featureId: "profile",
    intro: "Manage your profile and website settings here. Each settings area is a tab above; I can guide you to the right one.",
    setup: [pageHelp, { id: "open-wls", label: "Open my website settings", run: (g) => g.navigateTo("white-label") }, understand("profile", "Understand profile settings")],
    content: [{ id: "open-lib", label: "Open my Link in Bio", content: true, run: (g) => g.navigateTo("link-in-bio") }, understand("profile", "Understand this page")],
  },
  "pref-whitelabel": {
    featureId: "white-label",
    setup: [cover("start", "Edit my cover page"), task("white-label", "Update logo and colors"), understand("white-label", "Review my website settings"), task("first-time-setup", "Connect my domain")],
    content: [understand("white-label", "Understand this page"), { id: "branding", label: "View existing branding settings", run: (g) => g.navigateTo("white-label", { topic: "colors" }) }],
  },
  "pref-whitelabel-cover": {
    featureId: "cover-page",
    intro: "This is the first page visitors see on your website: its search details, sections and sub-pages.",
    setup: [cover("prepare", "Prepare my cover page"), cover("improveIntro", "Help improve my introduction"), cover("suggestColors", "Suggest brand colors"), cover("reviewMissing", "Review missing information")],
    content: [understand("cover-page", "Understand this page")],
  },
  "pref-link-in-bio": {
    featureId: "link-in-bio",
    contentIntro: "Your Link in Bio brings your content, offerings, and social profiles together in one place. I can help you organize it.",
    setup: [understand("link-in-bio"), task("link-in-bio", "Set up my Link in Bio"), pageHelp],
    content: [ca("bio-setup", "Set up my links", (c) => c.bioSetup()), ca("bio-promote", "Promote an offering", (c) => c.bioPromote()), ca("bio-improve", "Improve existing links", (c) => c.bioImprove()), understand("link-in-bio", "Understand this page")],
  },
  "pref-groups": {
    featureId: "groups",
    setup: [understand("groups"), task("vip-group", "Help me create a VIP group"), pageHelp],
    content: [{ id: "group-welcome", label: "Write a group welcome post", content: true, run: (g) => g.offerDraft("group-welcome") }, memberUpdate, understand("groups", "Understand this page")],
  },
};

/** Wallet sub-pages share the wallet guidance. */
const pageKey = (routeId: string) => (routeId.startsWith("wallet-") ? "wallet-balance" : routeId === "pref-link-in-bio-edit" ? "pref-link-in-bio" : routeId);

/** "You're in Subscriptions. …" for the current page (null when the page isn't a known feature). */
export function pageIntro(path: string) {
  const route = resolve(path).route;
  const page = PAGES[pageKey(route.id)];
  const f = page ? featureById(page.featureId) : featureForRoute(route.id);
  if (!f) return { name: route.title, line: null };
  const intro = (!inScope("discovery") && page?.contentIntro) || page?.intro || f.description;
  return { name: f.name, line: `You're in ${f.name}. ${intro}` };
}

/**
 * Next actions for this page in this demo, the creator's unfinished task first. Actions the role
 * can't use, and anything belonging to the other demo, are left out.
 */
export function pageActions(path: string, g: Agent): GuideItem[] {
  const d = getData();
  const role = d.account.session.role;
  const w = getWorkflow();
  const out: GuideItem[] = [];
  const route = resolve(path).route;
  const t = w.active ?? w.paused[w.paused.length - 1];
  // "Continue …" isn't needed when the active task's next step is on this very page.
  const here = w.active && progressOf(w.active).step?.routeId === route.id;
  if (t && !here) {
    const def = taskById(t.taskId);
    if (def) out.push({ id: `resume-${def.id}`, label: def.resumeLabel ?? `Continue: ${def.name}`, run: () => (w.active ? g.goToStep() : g.taskControl("resume", t.id)) });
  }
  const content = !inScope("discovery");
  // AI-Assisted Content: the creator's unfinished post, newsletter, experience or week.
  const work = content && contentActions() ? unfinishedWork(d) : null;
  if (work) out.push({ id: `resume-work-${work.id}`, label: `Continue my ${work.kind === "week" ? "week" : work.label.toLowerCase()}`, run: () => contentActions()?.show(work.id) });
  const page = PAGES[pageKey(route.id)];
  const defs = page ? (content ? page.content : page.setup) : [featureForRoute(route.id) ? understand(featureForRoute(route.id)!.id, "Understand this page") : pageHelp];
  const doneSetup = d.account.whiteLabel.status === "active";
  for (const x of defs) {
    if (x.content && !roleCan(role, "content.write")) continue;
    if (x.id.startsWith("ap-") && !inScope("autopilot")) continue;
    if (x.id === "ap-review" && !(d.autopilot.batch && !d.autopilot.batch.dismissed && d.autopilot.batch.drafts.some((y) => y.status === "ready"))) continue;
    if (x.id === "task-first-time-setup" && (!inScope("setup") || doneSetup)) continue;
    if (x.id.startsWith("ca-") && !contentActions()) continue;
    if (x.id.startsWith("cover-") && (!inScope("setup") || !coverActions() || !roleCan(role, "account.admin"))) continue;
    if (x.id.startsWith("task-")) {
      const def = taskById(x.id.slice(5));
      if (!def || (def.need && !roleCan(role, def.need)) || out.some((o) => o.id === `resume-${def.id}`)) continue;
    }
    out.push({ id: x.id, label: x.label, run: () => x.run(g) });
  }
  // More (on request): the account-wide suggestions not already listed.
  for (const s of g.suggestions()) if (!out.some((o) => o.label === s.label || o.id.replace(/^resume-/, "") === s.id.replace(/^(resume|continue)-/, ""))) out.push(s);
  return out;
}
