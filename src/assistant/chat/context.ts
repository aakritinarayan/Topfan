/**
 * What the model is told about the creator's situation: built from the app's actual state at the
 * moment of asking (never inferred from chat history), plus the history as plain text.
 */
import { isValidElement, type ReactNode } from "react";
import { creator, domain as demoDomain } from "../../config/demo";
import { PROVISION_ESTIMATE_S, siteAddress, type PlatformState } from "../../state/platformStore";
import type { FinderState } from "../../state/domainFinderStore";
import type { Msg } from "../../state/assistantStore";
import type { ChatTurn } from "../../services/chatService";
import { MISSIONS, missionById } from "../../platform/wls/quest/missions";

export interface QuestSnapshot {
  view: { kind: string; id?: string };
  stage: string | null;
  events: { type: string; mission?: string; detail?: string }[];
  results: Record<string, { score: number; achievement: string; outcome: string } | undefined>;
  interests: string[];
}

function questContext(q: QuestSnapshot | undefined, s: PlatformState) {
  if (!q || (s.screen !== "provisioning" && !Object.keys(q.results).length && !q.interests.length)) return null;
  const current = q.view.id ? missionById(q.view.id as never) : null;
  return {
    about:
      "Creator Quest: optional mini-games on the provisioning page (the same red jelly mascot). Purely educational; all in-game numbers and fan requests are fictional game data. It never affects provisioning.",
    view: q.view.kind,
    currentMission: current ? { name: current.name, topic: current.topic, objective: current.objective, stage: q.stage } : null,
    missions: MISSIONS.map((m) => ({ name: m.name, topic: m.topic, objective: m.objective, takeaway: m.takeaway, relatedTopFanFeature: m.feature.where })),
    recentEvents: q.events.slice(-8).map((e) => `${e.type}${e.mission ? ` (${missionById(e.mission as never).name})` : ""}${e.detail ? `: ${e.detail}` : ""}`),
    completed: Object.entries(q.results).map(([id, r]) => `${missionById(id as never).name}: ${r!.achievement}, score ${r!.score}`),
    savedToExploreAfterLaunch: q.interests.map((id) => missionById(id as never).feature.label),
  };
}

/** Fields the model may point at (must match server/chat.ts FIELDS). */
export const HIGHLIGHTABLE = ["provider", "domain", "urlPreference", "subdomain", "save", "buy-domain", "verify", "record1-host", "record1-value", "record2-host", "record2-value"];

const STEP_NAMES: Record<PlatformState["screen"], string> = {
  step1: "Account setup › Step 1 of 3 · Domain Information",
  step2: "Account setup › Step 2 of 3 · Add DNS Records",
  provisioning: "Account setup › Provisioning (site being set up)",
  complete: "Account setup › Site activated (provisioning complete; website address shown)",
  manage: "Dashboard › Preferences › White Label Site (Manage)",
  coverEditor: "Dashboard › Preferences › White Label Site › Cover page editor",
  app: "Creator platform (see currentPage)",
};

export function recordsFor(s: PlatformState) {
  const host = s.urlPreference === "subdomain" ? s.subdomain || demoDomain.recommendedSubdomain : "www";
  return [
    { type: "CNAME", host, value: demoDomain.records[0].value },
    { type: "CNAME", host: demoDomain.records[1].host.replace(/\.fans$/, `.${host}`), value: demoDomain.records[1].value },
  ];
}

function dnsStage(s: PlatformState) {
  if (s.screen === "step1") return "not started (records appear in Step 2)";
  if (s.screen === "step2") {
    if (s.recordsVerified) return "records in place and verified";
    if (s.verifyAttempts > 0) return `not verified yet: ${s.verifyAttempts} verify attempt(s) failed (simulated)`;
    return "records shown; the creator hasn't clicked Verify yet";
  }
  return "verified";
}

function provisioning(s: PlatformState) {
  if (s.screen === "provisioning" && s.provisionDone) return { status: "complete (the creator can go to the site)", siteAddress: `https://${siteAddress(s)}` };
  if (s.screen === "provisioning") {
    const elapsed = s.provisionStartedAt ? Math.round((Date.now() - s.provisionStartedAt) / 1000) : 0;
    return {
      status: "in progress (TopFan hasn't reported completion yet)",
      elapsedSeconds: elapsed,
      estimateSeconds: PROVISION_ESTIMATE_S,
      overEstimate: elapsed > PROVISION_ESTIMATE_S,
    };
  }
  if (s.screen === "complete" || s.screen === "manage" || s.screen === "coverEditor") return { status: "complete", siteAddress: `https://${siteAddress(s)}` };
  return { status: "not started" };
}

/** Actions the app will accept right now; the model is told to propose only these. */
export function availableActions(s: PlatformState, f: FinderState) {
  const onScreen = HIGHLIGHTABLE.filter((k) => document.querySelector(`[data-field="${k}"]`));
  const out: Record<string, unknown> = {};
  if (onScreen.length) out.highlight_field = { fields: onScreen };
  if (s.screen === "step1") {
    out.propose_form_update = "fill or change Step 1 fields (creator approves first)";
    out.open_registrar = "open godaddy in a new tab (creator approves first); the assistant recommends GoDaddy only for buying a new domain";
    if (!f.purchased) out.start_domain_finder = "guided domain search for creators without a domain";
  }
  return out;
}

export function buildContext(s: PlatformState, f: FinderState, decisions: string[], quest?: QuestSnapshot) {
  const onboarding = ["step1", "step2", "provisioning", "complete"].includes(s.screen);
  return {
    creator: { name: creator.name },
    screen: STEP_NAMES[s.screen],
    form: {
      hasDomain: s.hasDomain ? "I already have a Domain Name" : "I don't have a Domain Name",
      domainName: s.domainName || null,
      dnsProvider: s.provider,
      urlPreference: s.urlPreference === "subdomain" ? "sub-domain" : "root domain & www",
      subdomain: s.urlPreference === "subdomain" ? s.subdomain || null : null,
      siteAddressFansWillSee: s.domainName ? siteAddress(s) : null,
      validationErrors: Object.keys(s.formErrors).length ? s.formErrors : null,
    },
    dns: {
      stage: dnsStage(s),
      records: s.screen === "step1" ? null : recordsFor(s),
      verificationResult: s.recordsVerified ? "passed" : s.verifyAttempts > 0 ? "failed (simulated)" : "not checked",
    },
    provisioning: provisioning(s),
    creatorQuest: questContext(quest, s),
    domainSearch: f.ideas.length || f.purchased || f.handoff
      ? {
          note: "availability and prices here are SIMULATED demo data, not live registrar results",
          nameFansShouldRemember: f.brand || null,
          checked: f.ideas.map((i) => {
            const c = f.checks[i.domain];
            return `${i.domain}: ${!c || c.status === "checking" ? "checking" : c.status}`;
          }),
          selected: f.selected,
          openedRegistrar: f.handoff ? { registrar: f.handoff.registrarId, domain: f.handoff.domain } : null,
          creatorSaysPurchased: f.purchased,
        }
      : null,
    approvedDecisions: decisions.length ? decisions : null,
    availableActions: availableActions(s, f),
    phase: onboarding ? "onboarding" : "dashboard",
    prototype: "Demo environment: DNS checks, provisioning and domain availability are simulated.",
  };
}

/** Best-effort plain text of a message's React content (for the model's history). */
export function toPlain(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toPlain).join("");
  if (isValidElement(node)) {
    const el = node as { type: unknown; props: { children?: ReactNode } };
    if (el.type === "br") return "\n";
    // Only plain DOM elements and fragments: components (cards) render live data we describe via app_state.
    if (typeof el.type === "string" || typeof el.type === "symbol") return toPlain(el.props.children);
    return "";
  }
  return "";
}

/** Conversation so far, as plain alternating turns. Choices the creator tapped count as their words. */
export function historyOf(messages: Msg[]): ChatTurn[] {
  const out: ChatTurn[] = [];
  for (const m of messages) {
    if (m.streaming) continue;
    const text = (m.plain ?? toPlain(m.text)).trim();
    if (!text) continue;
    out.push({ role: m.from === "user" ? "user" : "assistant", content: text.slice(0, 2000) });
  }
  return out.slice(-30);
}
