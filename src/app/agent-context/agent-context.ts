/**
 * What the language model is told on each question while the creator is in the platform: the page
 * they're on (and its facts), their role, what needs attention, the active task, and a few candidate
 * features for their words. Small and permission-scoped: a delegate's context never contains data
 * their role can't open (brief §10.1, §16.6).
 */
import type { AppData } from "../../store/store";
import { roleCan, ROLE_LABEL } from "../../store/permissions";
import { resolve } from "../routeCatalog";
import { FEATURES } from "./features";
import { candidatesFor } from "./intent";
import { recommend } from "./recommendations";
import { TASKS, taskById } from "./tasks";
import { progressOf, taskSnapshot, type WorkflowState } from "./workflow-state";

/** Facts about the current page that a question like "why is it failing?" refers to. */
export function pageFacts(routeId: string, d: AppData): Record<string, unknown> | null {
  const role = d.account.session.role;
  const fin = roleCan(role, "finance.read");
  const owner = roleCan(role, "account.admin");
  switch (routeId) {
    case "pref-outbound-emails": {
      if (!owner) return { note: "Only the account owner can manage Outbound Emails." };
      const o = d.prefsB.outboundEmail;
      return {
        about: "Outbound Emails: sending emails/newsletters from the creator's own domain. Not related to White Label Site provisioning.",
        status: o.status,
        domain: o.domain,
        sender: o.senderEmail,
        steps: o.steps,
        lastChecked: o.lastCheckedAt,
        error: o.errorDetail,
        recordsToAdd: o.records.map((r) => `${r.type} ${r.host} → ${r.value} (example values)`),
      };
    }
    case "wallet-refunds":
      return fin ? { pending: d.money.refundRequests.filter((r) => r.status === "Pending").map((r) => ({ date: r.date, item: r.item, amount: r.amount, reason: r.reason })) } : null;
    case "wallet-fulfillment":
      return { pending: d.money.fulfillmentRequests.filter((r) => r.status === "Pending").map((r) => ({ date: r.date, item: r.item, type: r.type })) };
    case "wallet-balance":
    case "wallet-transactions":
      return fin ? { balance: d.money.balance, payoutAccountConnected: d.money.payoutAccount.connected, note: "Demo: no real money moves." } : null;
    case "monetize-subscription":
      return { plans: d.monetize.plans.map((p) => ({ name: p.name, monthly: p.prices.find((x) => x.months === 1)?.amount, options: p.prices.length, benefits: p.benefits.length, active: p.active })) };
    case "monetize-event-calendar":
      return { events: d.monetize.events.map((e) => ({ title: e.title, date: e.date, kind: e.kind, tickets: e.tickets.length })) };
    case "monetize-advertisements":
      return { brands: d.monetize.adBrands.map((a) => ({ name: a.name, status: a.status, offer: a.offer })) };
    case "pref-groups":
    case "pref-groups-add":
      return { groups: d.prefsB.groups.map((g) => g.name), note: "Fans are assigned to groups in Insights & Fans." };
    case "pref-topic-tags":
    case "pref-topic-tags-add":
      return { tags: d.prefsB.topicTags.map((t) => `${t.name}${t.active ? "" : " (inactive)"}`), rule: "At least 2 active tags are needed before tags show on the feed." };
    case "pref-delegation":
    case "pref-delegate-add":
    case "pref-delegate-details":
      return owner ? { delegates: d.prefsB.delegates.map((x) => ({ name: `${x.firstName} ${x.lastName[0]}.`, access: x.access.join(", "), status: x.status })) } : null;
    case "pref-whitelabel":
      return { status: d.account.whiteLabel.status, siteUrl: d.account.whiteLabel.siteUrl };
    case "messages":
      return { automatedMessages: d.comms.automatedMessages.length, unread: d.comms.unreadMessages };
    case "newpost":
      return { publishedPosts: d.social.posts.filter((p) => p.status === "published").length, drafts: d.social.posts.filter((p) => p.status === "draft").length, topicTags: d.prefsB.topicTags.length, groups: d.prefsB.groups.length };
    default:
      return null;
  }
}

export function buildPlatformContext(d: AppData, path: string, message: string, wf: WorkflowState, onScreen: string[]) {
  const { route } = resolve(path);
  const role = d.account.session.role;
  const allowed = (need?: Parameters<typeof roleCan>[1]) => !need || roleCan(role, need);
  const active = wf.active ? progressOf(wf.active) : null;
  return {
    creator: { name: d.account.name, handle: d.account.handle, category: d.account.creatorCategory },
    user: { role: ROLE_LABEL[role], canDo: { content: allowed("content.write"), money: allowed("finance.read"), accountSettings: allowed("account.admin") } },
    currentPage: {
      routeId: route.id,
      title: route.title,
      where: route.menu,
      features: FEATURES.filter((f) => f.routeId === route.id).map((f) => f.id),
      facts: pageFacts(route.id, d),
      activeTab: new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("tab"),
      highlightable: onScreen.slice(0, 40),
    },
    setup: { whiteLabelSite: d.account.whiteLabel.status, siteUrl: d.account.whiteLabel.siteUrl },
    needsAttention: recommend(d, { limit: 4 }).map((i) => ({ id: i.id, title: i.title, why: i.why, featureId: i.featureId, taskId: i.taskId })),
    // Task progress is verified against app data (never inferred from the conversation).
    activeTask: active
      ? {
          ...taskSnapshot(wf.active!),
          step: `${Math.min(active.index + 1, active.def.steps.length)} of ${active.def.steps.length}`,
          nextHappensOn: active.step?.routeId ?? null,
          approval: active.step?.approval ?? null,
          lastCompletedStep: [...active.def.steps].reverse().find((s) => s.done(active.ctx))?.title ?? null,
        }
      : null,
    pausedTasks: wf.paused.map((p) => ({ id: p.taskId, name: taskById(p.taskId)?.name, goal: p.goal ?? null })),
    candidateFeatures: candidatesFor(message, 6)
      .filter((f) => allowed(f.need))
      .map((f) => ({ id: f.id, name: f.name, where: f.where, about: f.description })),
    tasks: TASKS.filter((t) => allowed(t.need)).map((t) => `${t.id}: ${t.name}`),
    prototype: "Demo environment: all data is fictional; no real payments, DNS, emails, wallet or account changes.",
  };
}
