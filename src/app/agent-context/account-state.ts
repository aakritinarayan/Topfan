/**
 * Account health: a PURE function of the mock store. Nothing here is hard-coded state; every item is
 * derived from data the creator can also see on the matching screen (so the assistant never says
 * "3 refunds" unless Wallet › Refund Requests shows 3).
 *
 * Priority (brief §12.1): 1 critical/blocking, 2 pending operations, 3 unfinished work the creator
 * started, 4 setup, 5 growth, 6 optional discovery.
 */
import type { AppData } from "../../store/store";
import { roleCan, type Capability } from "../../store/permissions";
import { pendingRefunds } from "../../store/slices/money";
import { readyDrafts } from "../../store/slices/autopilot";
import { inScope } from "../demo";

export type Priority = 1 | 2 | 3 | 4 | 5 | 6;

export interface HealthItem {
  id: string;
  priority: Priority;
  /** Plain-language, one line. */
  title: string;
  /** Why it matters (short). */
  why: string;
  featureId: string;
  taskId?: string;
  count?: number;
  /** Who can act on it. Items the current role can't act on are hidden. */
  need?: Capability;
  /** Button label. */
  cta: string;
}

const days = (iso: string, now: number) => Math.round((now - new Date(iso).getTime()) / 86_400_000);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export interface AccountState {
  setup: {
    whiteLabel: AppData["account"]["whiteLabel"]["status"];
    outboundEmail: AppData["prefsB"]["outboundEmail"]["status"];
    payoutConnected: boolean;
    plans: number;
    publishedPosts: number;
  };
  failures: HealthItem[];
  pending: HealthItem[];
  unfinished: HealthItem[];
  /** Everything, sorted by priority (then by count). Not filtered by role. */
  items: HealthItem[];
}

export function getAccountState(d: AppData, now = Date.now()): AccountState {
  const items: HealthItem[] = [];
  const ob = d.prefsB.outboundEmail;

  /* 1 · critical / blocking */
  if (ob.status === "failed")
    items.push({
      id: "outbound-failed",
      priority: 1,
      title: "Your Outbound Email verification failed",
      why: `Emails and newsletters can't send from ${ob.domain} until it's verified. ${ob.errorDetail ?? ""}`.trim(),
      featureId: "outbound-emails",
      taskId: "fix-outbound-email",
      need: "account.admin",
      cta: "Fix it",
    });
  if (d.account.whiteLabel.status !== "active")
    items.push({ id: "wls-not-active", priority: 1, title: "Your White Label Site isn't live yet", why: "Fans can't reach your site on your own domain.", featureId: "white-label", taskId: "first-time-setup", need: "account.admin", cta: "Finish setup" });

  /* 2 · pending operations (oldest first) */
  const refunds = pendingRefunds(d);
  if (refunds.length) {
    const oldest = Math.max(...refunds.map((r) => days(r.date, now)));
    items.push({
      id: "refunds-pending",
      priority: 2,
      title: `${plural(refunds.length, "refund request")} waiting for review`,
      why: `The oldest has waited ${plural(oldest, "day")}. Nothing is refunded until you decide.`,
      featureId: "refunds",
      taskId: "review-refunds",
      count: refunds.length,
      need: "finance.read",
      cta: "Review refunds",
    });
  }
  const orders = d.money.fulfillmentRequests.filter((r) => r.status === "Pending");
  if (orders.length)
    items.push({
      id: "fulfillment-pending",
      priority: 2,
      title: `${plural(orders.length, "order")} waiting to be fulfilled`,
      why: "Fans already paid for these experiences and items.",
      featureId: "fulfillment",
      taskId: "fulfill-orders",
      count: orders.length,
      need: "content.write",
      cta: "Open requests",
    });
  const ads = d.monetize.adBrands.filter((a) => a.status === "new");
  if (ads.length)
    items.push({
      id: "ads-new",
      priority: 2,
      title: `${plural(ads.length, "new brand")} want to advertise with you`,
      why: ads.map((a) => a.name).join(" and ") + ".",
      featureId: "advertisements",
      count: ads.length,
      need: "content.write",
      cta: "Review brands",
    });

  /* 3 · unfinished work */
  const apReady = inScope("autopilot") && d.autopilot.batch && !d.autopilot.batch.dismissed ? readyDrafts(d).length : 0;
  if (apReady)
    items.push({ id: "autopilot-ready", priority: 3, title: `${plural(apReady, "prepared post")} ready for your review`, why: "Checked for repetition and accuracy. Nothing posts until you approve.", featureId: "new-post", need: "content.write", cta: "Review posts", count: apReady });
  const drafts = d.social.posts.filter((p) => p.status === "draft");
  if (drafts.length)
    items.push({ id: "post-drafts", priority: 3, title: `${plural(drafts.length, "post draft")} not published yet`, why: "Pick up where you left off.", featureId: "new-post", need: "content.write", cta: "Open New Post", count: drafts.length });

  /* 4 · setup */
  if (!d.money.payoutAccount.connected)
    items.push({ id: "payout-missing", priority: 4, title: "No payout account connected", why: "You'll need one before you can withdraw earnings.", featureId: "wallet-balance", taskId: "withdraw", need: "finance.write", cta: "Set up payouts" });
  if (!d.comms.automatedMessages.length)
    items.push({ id: "no-automated", priority: 4, title: "No automated welcome message", why: "New fans get nothing from you when they join.", featureId: "automated-messages", taskId: "welcome-message", need: "content.write", cta: "Draft one" });
  const activeTags = d.prefsB.topicTags.filter((t) => t.active).length;
  if (d.prefsB.topicTags.length > 0 && activeTags < 2)
    items.push({ id: "tags-under-2", priority: 4, title: `Only ${activeTags} active Topic Tag`, why: "Topic Tags show on your feed once at least 2 are active.", featureId: "topic-tags", taskId: "topic-tags", need: "content.write", cta: "Add a tag" });

  /* 5 · growth */
  const upcoming = d.monetize.events.filter((e) => !e.past && new Date(e.date).getTime() > now).sort((a, b) => +new Date(a.date) - +new Date(b.date));
  if (upcoming[0]) {
    const e = upcoming[0];
    const left = e.tickets.reduce((s, t) => s + Math.max(0, t.quantity - t.sold), 0);
    const inDays = Math.max(0, Math.ceil((new Date(e.date).getTime() - now) / 86_400_000));
    const when = inDays === 0 ? "today" : inDays === 1 ? "tomorrow" : `in ${inDays} days`;
    items.push({ id: "event-upcoming", priority: 5, title: `${e.title} is ${when}`, why: left ? `${left} tickets still available. A post or reminder newsletter could help.` : "Remind fans it's coming up.", featureId: "events", taskId: "create-post", need: "content.write", cta: "Promote it" });
  }
  const published = d.social.posts.filter((p) => p.status === "published");
  const last = published.map((p) => +new Date(p.createdAt)).sort((a, b) => b - a)[0];
  if (!published.length || (last && (now - last) / 86_400_000 > 14))
    items.push({
      id: "no-recent-posts",
      priority: 5,
      title: published.length ? "You haven't posted in over two weeks" : "You haven't posted yet",
      why: "Regular posts keep fans coming back.",
      featureId: "new-post",
      taskId: "create-post",
      need: "content.write",
      cta: "Get a post idea",
    });

  /* 6 · discovery */
  if (!d.prefsB.groups.length)
    items.push({ id: "no-groups", priority: 6, title: "Try a VIP group", why: "Groups let you share content with just your closest fans.", featureId: "groups", taskId: "vip-group", need: "content.write", cta: "Create a group" });
  const unread = d.comms.announcements.filter((a) => !a.read).length;
  if (unread) items.push({ id: "announcements", priority: 6, title: `${plural(unread, "new announcement")} from TopFan`, why: d.comms.announcements.find((a) => !a.read)?.title ?? "", featureId: "announcements", cta: "Read it", count: unread });

  items.sort((a, b) => a.priority - b.priority || (b.count ?? 0) - (a.count ?? 0));
  return {
    setup: {
      whiteLabel: d.account.whiteLabel.status,
      outboundEmail: ob.status,
      payoutConnected: d.money.payoutAccount.connected,
      plans: d.monetize.plans.length,
      publishedPosts: published.length,
    },
    failures: items.filter((i) => i.priority === 1),
    pending: items.filter((i) => i.priority === 2),
    unfinished: items.filter((i) => i.priority === 3),
    items,
  };
}

/** Items the current demo role may see and act on (delegates don't get owner-only or finance items they can't use). */
export function visibleItems(d: AppData, s = getAccountState(d)) {
  const role = d.account.session.role;
  return s.items.filter((i) => !i.need || roleCan(role, i.need));
}
