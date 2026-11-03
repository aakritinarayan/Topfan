/**
 * Goal workflows (brief Part 11 + md §6.2). Each task is a short list of steps through the EXISTING
 * screens. A step is done when the store or the creator's navigation shows it, so work done by hand
 * counts the same as work done with the assistant. Checks compare against a baseline taken when the
 * task started (existing items don't count as "created").
 */
import type { AppData } from "../../store/store";
import type { Capability } from "../../store/permissions";

/* ---------------- metrics: what the checks look at ---------------- */

const at = (d: unknown, path: string): unknown => path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), d);
const list = (d: AppData, ...paths: string[]) => {
  for (const p of paths) {
    const v = at(d, p);
    if (Array.isArray(v)) return v as Record<string, unknown>[];
  }
  return [] as Record<string, unknown>[];
};
const hash = (v: unknown) => JSON.stringify(v ?? null);
const kind = (d: AppData, k: string) => d.monetize.products.filter((p) => p.kind === k).length;

/** Numbers and fingerprints the task checks compare. Paths follow the slice owners' NOTES. */
export function metrics(d: AppData) {
  const posts = d.social.posts;
  const pending = <T extends { status: string }>(xs: T[]) => xs.filter((x) => x.status === "Pending").length;
  return {
    posts: posts.filter((p) => p.status === "published").length,
    drafts: posts.filter((p) => p.status === "draft").length,
    groupPosts: posts.filter((p) => p.groupIds.length > 0).length,
    plans: d.monetize.plans.length,
    plansHash: hash(d.monetize.plans),
    // Products share one list (monetize.products), told apart by kind.
    courses: kind(d, "course"),
    downloadables: kind(d, "downloadable"),
    merch: kind(d, "merchandise"),
    experiences: kind(d, "experience"),
    nfts: kind(d, "nft"),
    vipOffers: d.monetize.vipOffers.length,
    portfolios: d.monetize.portfolios.length,
    discountCodes: d.monetize.discountCodes.length,
    adBrandsToReview: d.monetize.adBrands.filter((b) => b.status === "new").length,
    adPrefsHash: hash([d.monetize.ads.enabled, d.monetize.ads.autoEnableNew, d.monetize.ads.catalog.map((b) => b.enabled)]),
    events: d.monetize.events.length,
    livestreams: d.monetize.events.filter((e) => e.kind === "livestream").length + list(d, "social.livestreams").length,
    newslettersSent: list(d, "monetize.newsletters").filter((n) => n.status === "Sent" || n.status === "sent" || n.sentAt).length,
    groups: d.prefsB.groups.length,
    fansInGroups: d.money.fans.filter((f) => f.groupIds.length > 0).length,
    activeTags: d.prefsB.topicTags.filter((t) => t.active).length,
    delegates: d.prefsB.delegates.length,
    linkInBioHash: hash(at(d, "prefsB.linkInBio")),
    gamificationHash: hash(at(d, "prefsB.gamification")),
    outbound: d.prefsB.outboundEmail.status,
    outboundRecordsAdded: Boolean(at(d, "prefsB.outboundFlow.recordsAdded")),
    outboundPhase: String(at(d, "prefsB.outboundFlow.phase") ?? "status"),
    refundsPending: d.money.refundRequests.filter((r) => r.status === "Pending" && !(r as { adminOutcome?: unknown }).adminOutcome).length,
    fulfillmentPending: pending(d.money.fulfillmentRequests),
    payoutConnected: d.money.payoutAccount.connected,
    withdrawals: d.money.transactions.filter((t) => /withdraw/i.test(t.type)).length,
    segments: d.money.segments.length,
    automated: d.comms.automatedMessages.length,
    welcomeHash: hash(d.prefsA.welcomeMessage),
    whiteLabel: d.account.whiteLabel.status,
    brandingHash: hash([d.account.theme, d.account.avatar, d.account.whiteLabel.lastPublishedAt]),
    accountStatus: String(at(d, "prefsA.accountStatus") ?? "active"),
    // Older saved data may predate the cover slice.
    coverMetaHash: hash(d.cover?.meta),
    coverApplied: Boolean(d.cover?.applied),
    coverPublishedAt: d.cover?.publishedAt ?? null,
  };
}
export type Metrics = ReturnType<typeof metrics>;

/* ---------------- task definitions ---------------- */

export interface StepCtx {
  /** Route ids opened since the task started. */
  visited: string[];
  /** Metrics when the task started. */
  base: Metrics;
  now: Metrics;
}

export interface TaskStep {
  id: string;
  /** Short, plain instruction ("Choose your price and benefits"). */
  title: string;
  /** Where it happens (existing route). */
  routeId: string;
  params?: Record<string, string>;
  /** Button label in the task card. */
  cta: string;
  /** One-line help shown under the step. */
  hint?: string;
  /** Element to point at once there (data-testid / data-field). */
  target?: string;
  done: (c: StepCtx) => boolean;
  /** This step's action needs approval in the original UI (we never skip it). */
  approval?: "confirm" | "protected";
  optional?: boolean;
}

export interface TaskDef {
  id: string;
  name: string;
  /** One sentence: why this helps. */
  summary: string;
  /** Phrases that start it (normalized, lowercase). */
  triggers: string[];
  /** The "continue" suggestion, in the creator's terms (default: "Continue: <name>"). */
  resumeLabel?: string;
  featureIds: string[];
  need?: Capability;
  /** Soft prerequisites: other tasks/conditions worth mentioning first. */
  dependsOn?: { taskId: string; when: (m: Metrics) => boolean; note: string }[];
  steps: TaskStep[];
  /** Offered when the task ends. */
  next?: { label: string; taskId?: string; featureId?: string };
  /** Optional draft the assistant can prepare (Draft tier: text only, never published by the assistant). */
  draft?: "plan-benefits" | "post-idea" | "welcome-message" | "event-promo" | "newsletter" | "course-outline" | "group-welcome" | "fan-segment";
}

const visit = (id: string) => (c: StepCtx) => c.visited.includes(id);
const grew = (k: keyof Metrics) => (c: StepCtx) => (c.now[k] as number) > (c.base[k] as number);
const changed = (k: keyof Metrics) => (c: StepCtx) => c.now[k] !== c.base[k];

export const TASKS: TaskDef[] = [
  {
    id: "launch-subscription",
    resumeLabel: "Continue setting up your subscription",
    name: "Launch a paid subscription",
    summary: "Fans pay monthly for your exclusive content.",
    triggers: ["start earning", "earn money", "make money", "exclusive content", "paid subscription", "launch a subscription", "subscription", "membership", "paid membership", "monthly plan", "get paid by fans", "monetize my content"],
    featureIds: ["subscriptions"],
    need: "content.write",
    draft: "plan-benefits",
    steps: [
      { id: "open", title: "Open your subscription plans", routeId: "monetize-subscription", cta: "Open Subscriptions", done: visit("monetize-subscription") },
      { id: "plan", title: "Add a plan or update one: price and benefits", routeId: "monetize-subscription", cta: "Edit my plans", hint: "Your Gold, Silver and Bronze plans are already there; you can edit one instead of starting over.", target: "monetize-add-plan", done: changed("plansHash"), approval: "confirm" },
      { id: "announce", title: "Tell your fans (optional)", routeId: "newpost", cta: "Write a post", done: grew("posts"), optional: true, approval: "confirm" },
    ],
    next: { label: "Create a post for subscribers", taskId: "create-post" },
  },
  {
    id: "create-post",
    resumeLabel: "Continue your post",
    name: "Create a post",
    summary: "Share something with your fans.",
    triggers: ["create a post", "new post", "make a post", "write a post", "post something", "what should i post", "upload a video", "share a photo", "publish a post"],
    featureIds: ["new-post"],
    need: "content.write",
    draft: "post-idea",
    steps: [
      { id: "open", title: "Open New Post", routeId: "newpost", cta: "Open New Post", done: visit("newpost") },
      { id: "publish", title: "Choose a type, add your content, and publish", routeId: "newpost", cta: "Back to my post", hint: "You can lock it for subscribers in the post options.", done: grew("posts"), approval: "confirm" },
    ],
    next: { label: "See it on your feed", featureId: "feed" },
  },
  {
    id: "sell-course",
    resumeLabel: "Continue setting up your course",
    name: "Sell a course",
    summary: "Package what you know into lessons fans can buy.",
    triggers: ["sell a course", "create a course", "make a course", "teach", "online course", "course"],
    featureIds: ["courses"],
    need: "content.write",
    draft: "course-outline",
    steps: [
      { id: "open", title: "Open Courses", routeId: "monetize-courses", cta: "Open Courses", done: visit("monetize-courses") },
      { id: "create", title: "Add your course: details, lessons and price", routeId: "monetize-courses", cta: "Add a course", target: "monetize-add-course", done: grew("courses"), approval: "confirm" },
    ],
    next: { label: "Announce it in a post", taskId: "create-post" },
  },
  {
    id: "sell-downloadable",
    resumeLabel: "Continue setting up your downloadable",
    name: "Sell a downloadable",
    summary: "Sell a file fans can download, like a guide or preset.",
    triggers: ["sell a downloadable", "downloadable", "sell a pdf", "ebook", "digital product", "digital download", "sell a file", "sell presets"],
    featureIds: ["downloadables"],
    need: "content.write",
    steps: [
      { id: "open", title: "Open Downloadables", routeId: "monetize-downloadable", cta: "Open Downloadables", done: visit("monetize-downloadable") },
      { id: "create", title: "Add the file, a title and a price", routeId: "monetize-downloadable", cta: "Add a downloadable", target: "monetize-add-downloadable", done: grew("downloadables"), approval: "confirm" },
    ],
  },
  {
    id: "sell-merch",
    resumeLabel: "Continue adding your merchandise",
    name: "Sell merchandise",
    summary: "Add merch through Shopify or an external store link.",
    triggers: ["sell merch", "sell merchandise", "merch", "merchandise", "hoodies", "t shirts", "sell products", "shopify"],
    featureIds: ["merchandise"],
    need: "content.write",
    steps: [
      { id: "open", title: "Open Merchandise", routeId: "monetize-merchandise", cta: "Open Merchandise", done: visit("monetize-merchandise") },
      { id: "create", title: "Add an item (Shopify or an external link)", routeId: "monetize-merchandise", cta: "Add merchandise", hint: "In this demo Shopify isn't really connected.", target: "monetize-merch-add", done: grew("merch"), approval: "confirm" },
      { id: "store", title: "Check your public store", routeId: "public-store", cta: "View my store", done: visit("public-store"), optional: true },
    ],
  },
  {
    id: "event-tickets",
    resumeLabel: "Continue setting up your event",
    name: "Create an event and sell tickets",
    summary: "Set up an event with tickets and share its page.",
    triggers: ["sell tickets", "create an event", "event", "tickets", "ticket sales", "concert", "meetup", "competition", "host an event"],
    featureIds: ["events", "public-events"],
    need: "content.write",
    draft: "event-promo",
    steps: [
      { id: "open", title: "Open Events & Ticketing", routeId: "monetize-event-calendar", cta: "Open Events & Ticketing", done: visit("monetize-event-calendar") },
      { id: "create", title: "Add the event and its tickets", routeId: "monetize-event-calendar", cta: "Add an event", target: "monetize-event-add", done: grew("events"), approval: "confirm" },
      { id: "public", title: "Check the public event page", routeId: "public-events", cta: "View event page", done: (c) => c.visited.includes("public-events") || c.visited.includes("public-event-detail"), optional: true },
    ],
    next: { label: "Tell fans in a post", taskId: "create-post" },
  },
  {
    id: "schedule-livestream",
    resumeLabel: "Continue scheduling your livestream",
    name: "Schedule a livestream",
    summary: "Livestreams are scheduled as events; you can also go live right away.",
    triggers: ["schedule a livestream", "schedule a live", "plan a livestream", "go live later", "livestream next"],
    featureIds: ["livestream", "events"],
    need: "content.write",
    steps: [
      { id: "open", title: "Open Events & Ticketing", routeId: "monetize-event-calendar", cta: "Open Events & Ticketing", done: visit("monetize-event-calendar") },
      { id: "create", title: "Add the livestream as an event", routeId: "monetize-event-calendar", cta: "Add an event", target: "monetize-event-add", done: (c) => grew("livestreams")(c) || grew("events")(c), approval: "confirm" },
    ],
  },
  {
    id: "vip-group",
    resumeLabel: "Continue setting up your VIP group",
    name: "Create a VIP group",
    summary: "A group for your closest fans, with content only they can see.",
    triggers: ["vip group", "vip club", "create a group", "private group", "inner circle", "exclusive group", "vip community", "paid community", "close friends"],
    featureIds: ["groups", "insights", "subscriptions"],
    need: "content.write",
    draft: "group-welcome",
    steps: [
      { id: "open", title: "Open Groups", routeId: "pref-groups", cta: "Open Groups", done: visit("pref-groups") },
      { id: "create", title: "Create the group", routeId: "pref-groups-add", cta: "Add a group", target: "pref-groups-add", done: grew("groups") },
      { id: "assign", title: "Add fans to it in Insights & Fans", routeId: "insights", params: { tab: "fan-relationship-management" }, cta: "Open my fans", hint: "In the fan list, use the Groups column to add fans.", target: "insights-fans-table", done: grew("fansInGroups") },
      { id: "restrict", title: "Share something only the group can see (optional)", routeId: "newpost", cta: "Write a group post", done: grew("groupPosts"), optional: true, approval: "confirm" },
    ],
  },
  {
    id: "fix-outbound-email",
    resumeLabel: "Continue fixing your email",
    name: "Fix Outbound Email verification",
    summary: "So newsletters and emails send from your own domain.",
    triggers: ["fix email", "fix my email", "email not working", "email failing", "why is my email", "outbound email", "outbound emails", "email verification", "connect my email", "verify my email", "sender domain"],
    featureIds: ["outbound-emails"],
    need: "account.admin",
    steps: [
      { id: "open", title: "Open Outbound Emails", routeId: "pref-outbound-emails", cta: "Open Outbound Emails", done: visit("pref-outbound-emails") },
      // Matches the page's own flow from "Verification Failed": Setup Again → domain → records → Verify → Recheck Status.
      { id: "restart", title: "Click Setup Again and confirm the reset", routeId: "pref-outbound-emails", cta: "Show me Setup Again", hint: "Your domain stays the same; this just restarts the check.", target: "pref-outbound-setup-again", done: (c) => c.now.outbound !== "failed" || c.now.outboundPhase !== "status", approval: "confirm" },
      { id: "domain", title: "Choose your sending domain and click Continue", routeId: "pref-outbound-emails", cta: "Show me the domain choice", target: "pref-outbound-setup-continue", done: (c) => c.now.outboundPhase === "records" || c.now.outbound === "pending" || c.now.outbound === "verified" },
      { id: "records", title: "Add the records at your domain provider, then tick that you've added them", routeId: "pref-outbound-emails", cta: "Show the records", hint: "Copy each Host and Value into your provider's DNS settings. I can't change DNS for you.", target: "pref-outbound-records-added", done: (c) => c.now.outboundRecordsAdded || c.now.outbound === "pending" || c.now.outbound === "verified", approval: "protected" },
      { id: "verify", title: "Click Verify Outbound Email Settings", routeId: "pref-outbound-emails", cta: "Go to Verify", target: "pref-outbound-verify", done: (c) => c.now.outbound === "pending" || c.now.outbound === "verified" },
      { id: "recheck", title: "Click Recheck Status", routeId: "pref-outbound-emails", cta: "Show Recheck Status", hint: "In this demo the check finishes on its own in a couple of seconds, and passes when you've ticked that the records were added.", target: "pref-outbound-recheck", done: (c) => c.now.outbound === "verified" },
    ],
    next: { label: "Send a newsletter", taskId: "send-newsletter" },
  },
  {
    id: "send-newsletter",
    resumeLabel: "Continue your newsletter",
    name: "Send a newsletter",
    summary: "Email your fans an update.",
    triggers: ["send a newsletter", "newsletter", "email my fans", "email blast", "write a newsletter"],
    featureIds: ["newsletters"],
    need: "content.write",
    draft: "newsletter",
    dependsOn: [{ taskId: "fix-outbound-email", when: (m) => m.outbound !== "verified", note: "Your Outbound Emails verification failed, so newsletters can't send from your own domain yet." }],
    steps: [
      { id: "open", title: "Open Newsletters", routeId: "monetize-newsletters", cta: "Open Newsletters", done: visit("monetize-newsletters") },
      { id: "send", title: "Write it, choose recipients, and send", routeId: "monetize-newsletters", cta: "New newsletter", target: "monetize-newsletter-new", done: grew("newslettersSent"), approval: "confirm" },
    ],
  },
  {
    id: "white-label",
    resumeLabel: "Continue customizing your website",
    name: "Brand your White Label Site",
    summary: "Your logo, colors and domain.",
    triggers: ["white label", "my website", "change my logo", "change my website design", "brand my site", "custom domain", "set up my website", "website colors", "my domain", "website logo", "site logo", "my logo", "change the logo", "update my branding", "website branding", "change my branding"],
    featureIds: ["white-label", "cover-page"],
    need: "account.admin",
    steps: [
      { id: "open", title: "Open White Label Site", routeId: "pref-whitelabel", cta: "Open White Label Site", done: visit("pref-whitelabel") },
      { id: "brand", title: "Update your logo and colors, then click Update & Publish", routeId: "pref-whitelabel", cta: "Customize appearance", target: "logo", done: changed("brandingHash"), approval: "confirm" },
      { id: "cover", title: "Edit the cover page (optional)", routeId: "pref-whitelabel-cover", cta: "Open cover page", done: visit("pref-whitelabel-cover"), optional: true },
    ],
  },
  {
    id: "cover-page",
    resumeLabel: "Continue editing my cover page",
    name: "Edit your cover page",
    summary: "It's the first thing visitors see on your website.",
    triggers: ["edit my cover page", "prepare my cover page", "edit the cover page", "edit cover page", "fill my cover page", "fill in my cover page", "set up my cover page", "update my cover page", "customize my cover page", "my cover page"],
    featureIds: ["cover-page"],
    need: "account.admin",
    steps: [
      { id: "open", title: "Open White Label Site", routeId: "pref-whitelabel", cta: "Open White Label Site", target: "edit-cover", done: (c) => c.visited.includes("pref-whitelabel") || c.visited.includes("pref-whitelabel-cover") },
      { id: "editor", title: "Click Edit Cover Page", routeId: "pref-whitelabel-cover", cta: "Open the Cover Page editor", done: visit("pref-whitelabel-cover") },
      { id: "fill", title: "Fill in the fields (I can prepare them for you)", routeId: "pref-whitelabel-cover", cta: "Back to the editor", target: "cover-title", done: (c) => c.now.coverApplied || c.now.coverMetaHash !== c.base.coverMetaHash },
      { id: "publish", title: "Review everything, then click Update & Publish", routeId: "pref-whitelabel-cover", cta: "Review and publish", target: "cover-publish", done: changed("coverPublishedAt"), approval: "confirm" },
    ],
    next: { label: "Customize my branding", taskId: "white-label" },
  },
  {
    id: "link-in-bio",
    resumeLabel: "Continue editing your Link in Bio",
    name: "Edit your Link in Bio",
    summary: "One link for all your places.",
    triggers: ["link in bio", "linktree", "bio link", "edit my links"],
    featureIds: ["link-in-bio"],
    need: "content.write",
    steps: [
      { id: "open", title: "Open Link In Bio", routeId: "pref-link-in-bio", cta: "Open Link In Bio", done: visit("pref-link-in-bio") },
      { id: "edit", title: "Add or edit your links", routeId: "pref-link-in-bio-edit", cta: "Edit links", done: changed("linkInBioHash") },
    ],
  },
  {
    id: "topic-tags",
    resumeLabel: "Continue setting up Topic Tags",
    name: "Set up Topic Tags",
    summary: "Fans can filter your feed by topic once at least 2 tags are active.",
    triggers: ["topic tags", "set up tags", "add tags", "filter my feed", "tags"],
    featureIds: ["topic-tags"],
    need: "content.write",
    steps: [
      { id: "open", title: "Open Topic Tags", routeId: "pref-topic-tags", cta: "Open Topic Tags", done: visit("pref-topic-tags") },
      { id: "two", title: "Add at least 2 active tags", routeId: "pref-topic-tags-add", cta: "Add a tag", done: (c) => c.now.activeTags >= 2 },
    ],
  },
  {
    id: "gamification",
    resumeLabel: "Continue setting up gamification",
    name: "Set up gamification",
    summary: "Points, badges and a leaderboard for your fans.",
    triggers: ["gamification", "points", "badges", "leaderboard", "reward fans", "fan rewards"],
    featureIds: ["gamification"],
    need: "content.write",
    steps: [
      { id: "open", title: "Open Gamification", routeId: "pref-gamification", cta: "Open Gamification", done: visit("pref-gamification") },
      { id: "edit", title: "Set how fans earn points", routeId: "pref-gamification", cta: "Earn points settings", done: changed("gamificationHash") },
    ],
  },
  {
    id: "add-delegate",
    resumeLabel: "Continue adding your team member",
    name: "Add a team member",
    summary: "Give someone Content, or Financial and Content, access.",
    triggers: ["add a team member", "add a delegate", "delegate", "give access", "add my manager", "add an editor", "team member", "add someone to my team"],
    featureIds: ["delegation"],
    need: "account.admin",
    steps: [
      { id: "open", title: "Open Delegation", routeId: "pref-delegation", cta: "Open Delegation", done: visit("pref-delegation") },
      { id: "add", title: "Add them and choose their access", routeId: "pref-delegate-add", cta: "Add a delegate", hint: "Financial access needs a stronger confirmation.", done: grew("delegates"), approval: "protected" },
    ],
  },
  {
    id: "review-refunds",
    name: "Review refund requests",
    summary: "Fans are waiting on a decision.",
    triggers: ["refund", "refunds", "refund requests", "review refunds", "where are my refunds", "money back"],
    featureIds: ["refunds"],
    need: "finance.read",
    steps: [
      { id: "open", title: "Open Refund Requests", routeId: "wallet-refunds", cta: "Open Refund Requests", done: visit("wallet-refunds") },
      { id: "decide", title: "Approve or decline each request", routeId: "wallet-refunds", cta: "Back to requests", hint: "Nothing is refunded until you approve it.", done: (c) => c.now.refundsPending < c.base.refundsPending || c.now.refundsPending === 0, approval: "confirm" },
    ],
  },
  {
    id: "fulfill-orders",
    name: "Fulfill waiting orders",
    summary: "Experiences and merch fans already paid for.",
    triggers: ["fulfillment", "fulfill", "orders", "pending orders", "fulfil", "shoutout requests"],
    featureIds: ["fulfillment"],
    need: "content.write",
    steps: [
      { id: "open", title: "Open My Fulfillment Requests", routeId: "wallet-fulfillment", cta: "Open requests", done: visit("wallet-fulfillment") },
      { id: "done", title: "Fulfill the oldest request first", routeId: "wallet-fulfillment", cta: "Back to requests", done: (c) => c.now.fulfillmentPending < c.base.fulfillmentPending },
    ],
  },
  {
    id: "withdraw",
    name: "Withdraw earnings",
    summary: "Move your balance to your payout account (demo only: no real transfer).",
    triggers: ["withdraw", "withdrawal", "cash out", "get my money", "transfer to my bank", "payout", "get paid"],
    featureIds: ["wallet-balance"],
    need: "finance.write",
    steps: [
      { id: "open", title: "Open Current Balance", routeId: "wallet-balance", cta: "Open my balance", done: visit("wallet-balance") },
      { id: "payout", title: "Connect a payout account", routeId: "wallet-balance", cta: "Connect payout", target: "wallet-connect-payout", done: (c) => c.now.payoutConnected, approval: "protected" },
      { id: "withdraw", title: "Withdraw", routeId: "wallet-balance", cta: "Withdraw", target: "wallet-withdraw", done: grew("withdrawals"), approval: "protected" },
    ],
  },
  {
    id: "fan-segment",
    name: "Create a fan segment",
    summary: "Find a set of fans to reach out to.",
    triggers: ["fan segment", "segment", "segmentation", "target fans", "reach out to fans", "top fans", "best fans"],
    featureIds: ["segments"],
    need: "content.write",
    draft: "fan-segment",
    steps: [
      { id: "open", title: "Open Segmentation & Outreach", routeId: "insights", params: { tab: "fan-relationship-management", sub: "segmentation" }, cta: "Open segmentation", done: visit("insights") },
      { id: "create", title: "Choose criteria and save the segment", routeId: "insights", params: { tab: "fan-relationship-management", sub: "segmentation" }, cta: "Back to segments", done: grew("segments") },
    ],
  },
  {
    id: "welcome-message",
    name: "Prepare a welcome message",
    summary: "Greet new fans automatically.",
    triggers: ["welcome message", "welcome new fans", "automated message", "auto message", "welcome dm", "greet new fans"],
    featureIds: ["automated-messages", "welcome-message"],
    need: "content.write",
    draft: "welcome-message",
    steps: [
      { id: "open", title: "Open Automated Messages", routeId: "messages", params: { tab: "automated" }, cta: "Open Messages", done: visit("messages") },
      { id: "create", title: "Add the message and turn it on", routeId: "messages", params: { tab: "automated" }, cta: "Back to Messages", target: "messages-automated-add", done: grew("automated"), approval: "confirm" },
    ],
  },
  {
    id: "pause-delete",
    name: "Pause or delete your account",
    summary: "Explains the difference; you do it yourself in Privacy, with a strong confirmation.",
    triggers: ["pause my account", "delete my account", "close my account", "deactivate", "take a break", "delete account", "pause account"],
    featureIds: ["privacy"],
    need: "account.admin",
    steps: [{ id: "open", title: "Open Privacy, Password & Integrations", routeId: "pref-privacy", cta: "Open Privacy", hint: "Pausing hides your page until you come back. Deleting is permanent. Both ask you to confirm on the page.", target: "pref-privacy-pause", done: visit("pref-privacy"), approval: "protected" }],
  },
  {
    id: "first-time-setup",
    name: "Set up your White Label Site",
    summary: "Connect your own domain (the guided setup).",
    triggers: ["first time setup", "connect my domain", "set up white label", "set up my domain", "onboarding"],
    featureIds: ["white-label"],
    need: "account.admin",
    steps: [
      { id: "domain", title: "Domain information", routeId: "wls-setup-domain", cta: "Open setup", done: (c) => c.visited.includes("wls-setup-dns") || c.now.whiteLabel === "active" },
      { id: "dns", title: "Add the DNS records and verify", routeId: "wls-setup-dns", cta: "Open DNS step", done: (c) => c.visited.includes("wls-setup-provisioning") || c.now.whiteLabel === "active" },
      { id: "done", title: "TopFan sets up your site", routeId: "wls-setup-provisioning", cta: "Open setup", done: (c) => c.visited.includes("wls-setup-complete") || c.now.whiteLabel === "active" },
    ],
  },
  {
    id: "sell-experience",
    resumeLabel: "Continue setting up your experience",
    name: "Offer an experience",
    summary: "Sell personal time with you: shoutouts, personalized videos, video calls or 1:1 sessions.",
    triggers: ["sell an experience", "offer an experience", "add an experience", "personal coaching", "offer coaching", "coaching sessions", "one on one session", "1 1 session", "sell video calls", "sell shoutouts", "meet and greet"],
    featureIds: ["experiences"],
    need: "content.write",
    steps: [
      { id: "open", title: "Open Experiences", routeId: "monetize-experience", cta: "Open Experiences", done: visit("monetize-experience") },
      { id: "create", title: "Add the experience: type of experience, title, description and price", routeId: "monetize-experience", cta: "Add an experience", hint: "For a 1:1 Video Call you can set a price for each call length.", target: "monetize-add-experience", done: grew("experiences"), approval: "confirm" },
    ],
    next: { label: "Announce it in a post", taskId: "create-post" },
  },
  {
    id: "list-nft",
    resumeLabel: "Continue adding your NFT",
    name: "List an NFT",
    summary: "Show an NFT you sell elsewhere on your TopFan store.",
    triggers: ["list an nft", "add an nft", "sell an nft", "sell nfts", "add external nft"],
    featureIds: ["nfts"],
    need: "content.write",
    steps: [
      { id: "open", title: "Open NFTs", routeId: "monetize-nfts", cta: "Open NFTs", done: visit("monetize-nfts") },
      { id: "create", title: "Click Add External NFTs and fill in its details", routeId: "monetize-nfts", cta: "Add an NFT", hint: "TopFan lists NFTs sold elsewhere. Your MetaMask connection is in Preferences › NFT Wallet.", target: "monetize-nft-add", done: grew("nfts"), approval: "confirm" },
    ],
  },
  {
    id: "vip-offer",
    resumeLabel: "Continue setting up your VIP offer",
    name: "Create a VIP offer",
    summary: "A special deal or perk for your fans, free or unlocked with a purchase or subscription.",
    triggers: ["create a vip offer", "add a vip offer", "vip offer", "vip deal", "exclusive deal", "special offer for fans", "perk for my fans"],
    featureIds: ["vip-offers"],
    need: "content.write",
    steps: [
      { id: "open", title: "Open VIP Offers", routeId: "monetize-vip-offers", cta: "Open VIP Offers", done: visit("monetize-vip-offers") },
      { id: "create", title: "Add the offer: title, description, code, lock options and end date", routeId: "monetize-vip-offers", cta: "Add an offer", hint: "Lock options decide who can unlock it: free, an individual purchase, or a subscription.", target: "monetize-vip-add", done: grew("vipOffers"), approval: "confirm" },
    ],
    next: { label: "Announce it in a post", taskId: "create-post" },
  },
  {
    id: "create-portfolio",
    resumeLabel: "Continue your portfolio",
    name: "Create a portfolio",
    summary: "Group your videos or photos into a portfolio fans can browse.",
    triggers: ["create a portfolio", "add a portfolio", "new portfolio", "showcase my work", "video series", "make money from my videos", "earn from my videos", "monetize my videos"],
    featureIds: ["portfolios"],
    need: "content.write",
    steps: [
      { id: "open", title: "Open Portfolios", routeId: "monetize-portfolio", cta: "Open Portfolios", done: visit("monetize-portfolio") },
      { id: "create", title: "Add a portfolio: title, type (video or photo) and a banner", routeId: "monetize-portfolio", cta: "Add a portfolio", hint: "Then add series and episodes to it.", target: "monetize-portfolio-add", done: grew("portfolios"), approval: "confirm" },
    ],
  },
  {
    id: "discount-code",
    resumeLabel: "Continue your discount code",
    name: "Create a discount code",
    summary: "A code that takes money off your plans or products, to encourage more sales.",
    triggers: ["create a discount code", "add a discount code", "discount code", "promo code", "coupon", "run a sale", "encourage more sales", "offers to encourage"],
    featureIds: ["discount-codes"],
    need: "content.write",
    steps: [
      { id: "open", title: "Open Discount Codes", routeId: "monetize-discount-codes", cta: "Open Discount Codes", done: visit("monetize-discount-codes") },
      { id: "create", title: "Add a code: coupon code, what it applies to, discount type, amount and end date", routeId: "monetize-discount-codes", cta: "Add a code", target: "monetize-discount-new", done: grew("discountCodes"), approval: "confirm" },
    ],
    next: { label: "Tell fans in a post", taskId: "create-post" },
  },
  {
    id: "brand-ads",
    resumeLabel: "Continue reviewing brands",
    name: "Earn from brand ads",
    summary: "Brands pay to advertise with you. You choose which ones appear.",
    triggers: ["brand collaborations", "collaborate with brands", "work with brands", "brand deals", "brand partnerships", "sponsorships", "get sponsors", "earn from ads", "earn from advertising", "review brands"],
    featureIds: ["advertisements"],
    need: "content.write",
    steps: [
      { id: "open", title: "Open Advertisements", routeId: "monetize-advertisements", cta: "Open Advertisements", done: visit("monetize-advertisements") },
      { id: "review", title: "Open New Brands to Review and approve or decline each brand, or choose brands and click Save", routeId: "monetize-advertisements", cta: "Review brands", hint: "Nothing is shown to fans until you approve or enable a brand.", target: "monetize-ads-cat-new-brands-to-review", done: (c) => c.now.adBrandsToReview < c.base.adBrandsToReview || c.now.adPrefsHash !== c.base.adPrefsHash, approval: "confirm" },
    ],
  },
];

export const taskById = (id: string) => TASKS.find((t) => t.id === id);

/** Index of the first unfinished required step (or steps.length when all required steps are done). */
export function currentStep(t: TaskDef, c: StepCtx) {
  const i = t.steps.findIndex((s) => !s.optional && !s.done(c));
  return i < 0 ? t.steps.length : i;
}
