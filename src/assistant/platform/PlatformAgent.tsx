/**
 * TopFan AI across the platform: turns an understood request (from demo mode or a model proposal)
 * into something real in the ORIGINAL interface: open the right screen, start or continue a goal
 * task, show what needs attention, prepare a draft. Every request is validated here (feature/route
 * exists, role allows it, task state); the model never changes anything directly.
 *
 * Risk tiers: Navigate/Draft happen right away. Confirm/Protected actions are never done from chat:
 * the assistant opens the original screen and the page's own confirmation applies.
 */
import { openAutopilot } from "./autopilotView";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useAssistant } from "../../state/assistantStore";
import { useRouter } from "../../app/router";
import { resolve } from "../../app/routeCatalog";
import { openOverlay } from "../../app/ui";
import { act, getData } from "../../store/store";
import { addGroup, addTopicTag } from "../../store/slices/prefsB";
import { AUTOMATED_EVENT_TYPES, saveAutomatedMessage } from "../../store/slices/comms";
import { actionById } from "../../app/agent-context/actions";
import { roleCan, ROLE_LABEL } from "../../store/permissions";
import { FEATURES, featureById, type Feature } from "../../app/agent-context/features";
import { classify, type Clarify } from "../../app/agent-context/intent";
import { canBuild, urlFor } from "../../app/agent-context/routes";
import { recommend, topRecommendation } from "../../app/agent-context/recommendations";
import { metrics, taskById, type TaskDef } from "../../app/agent-context/tasks";
import { pageFacts } from "../../app/agent-context/agent-context";
import {
  backStep,
  cancelTask,
  getWorkflow,
  markAssistantNavigation,
  onProgress,
  optionalLeft,
  pauseTask,
  progressOf,
  resumeTask,
  setTaskDraft,
  startTask,
} from "../../app/agent-context/workflow-state";
import type { HealthItem } from "../../app/agent-context/account-state";
import { CopyLine } from "../AssistantPanel";
import { DRAFT_LABEL, makeDraft, type DraftKind } from "./drafts";

interface Ctx {
  /** Deterministic handling of a typed/spoken request (demo mode). Returns false if not understood. */
  handle: (text: string) => boolean;
  navigateTo: (featureId: string, opts?: { quiet?: boolean; params?: Record<string, string> }) => boolean;
  beginTask: (taskId: string) => boolean;
  taskControl: (c: "pause" | "resume" | "cancel" | "back" | "status") => void;
  showAttention: (intro?: string) => void;
  showNext: () => void;
  offerDraft: (kind: DraftKind, text?: string) => void;
  /** Open the step's page and point at its control. */
  goToStep: () => void;
  /** Ask the creator to approve one of the execute-with-approval actions. */
  proposeAction: (actionId: string, input: Record<string, unknown>) => boolean;
  dismissed: React.MutableRefObject<string[]>;
}

const C = createContext<Ctx | null>(null);

export function PlatformAgentProvider({ children }: { children: ReactNode }) {
  const a = useAssistant();
  const { navigate, path } = useRouter();
  const live = useRef({ a, navigate, path });
  live.current = { a, navigate, path };
  const dismissed = useRef<string[]>([]);

  const blocked = (need: Feature["need"] | TaskDef["need"]) => {
    const role = getData().account.session.role;
    return need && !roleCan(role, need) ? role : null;
  };
  const noAccess = (what: string) =>
    live.current.a.say({
      status: "problem",
      text: `${what} isn't included in your access (${ROLE_LABEL[getData().account.session.role]}). The account owner can do it, or change your access in Delegation.`,
    });

  const go = (url: string, target?: string) => {
    markAssistantNavigation();
    live.current.navigate(url);
    if (target) setTimeout(() => live.current.a.highlight(target), 450);
  };

  const navigateTo = useCallback((featureId: string, opts: { quiet?: boolean; params?: Record<string, string> } = {}) => {
    const f = featureById(featureId);
    if (!f) return false;
    if (blocked(f.need)) {
      noAccess(f.name);
      return false;
    }
    if (f.overlay) {
      openOverlay(f.overlay);
      if (!opts.quiet) live.current.a.say({ text: `Opened ${f.name}. To schedule one for later, add it as an event in Monetize › Events & Ticketing.` });
      return true;
    }
    const d = getData();
    const params = { ...f.params, ...opts.params };
    if (!canBuild(f.routeId, d, params)) return false;
    go(urlFor(f.routeId, d, params));
    if (!opts.quiet) live.current.a.say({ text: <>Here's <b>{f.name}</b>. You'll find it under {f.where}.</>, plain: `Opened ${f.name} (${f.where}).` });
    return true;
  }, []);

  /* ---------------- approved actions (Confirm tier, run only after Approve) ---------------- */

  const proposeAction = useCallback((actionId: string, input: Record<string, unknown>) => {
    const def = actionById(actionId);
    const ex = EXECUTORS[actionId];
    if (!def || def.assistant !== "execute-with-approval" || !ex) return false;
    const valid = ex.validate(input);
    if (!valid) return false;
    if (blocked(def.need)) {
      noAccess(def.label);
      return false;
    }
    const dup = ex.exists?.(getData(), valid);
    if (dup) {
      live.current.a.say({ text: dup, plain: dup });
      go(urlFor(featureById(def.featureId)!.routeId, getData()));
      return true;
    }
    const rows = ex.describe(valid);
    live.current.a.say({
      status: "confirm",
      text: `${def.label}? Here's exactly what I'll add:`,
      plain: `Proposed: ${def.label} (${rows.map(([k, v]) => `${k}: ${v}`).join("; ")}).`,
      body: (
        <dl className="flex flex-col gap-1.5 rounded-tile bg-bg p-3 text-[13px]" data-testid="ai-approval">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="shrink-0 text-soft">{k}</dt>
              <dd className="min-w-0 whitespace-pre-wrap break-words font-bold">{v}</dd>
            </div>
          ))}
        </dl>
      ),
      details: "You can edit or remove it on the page afterwards.",
      actions: [
        {
          label: "Approve",
          variant: "primary",
          onClick: () => {
            const res = act(`assistant:${actionId}`, (d) => ex.run(d, valid), { need: def.need });
            const { a } = live.current;
            if (!res.ok) {
              a.say({ status: "problem", text: res.reason });
              return;
            }
            a.logDecision(`Approved: ${def.label}`);
            a.say({ status: "done", text: ex.done(valid), plain: ex.done(valid) });
            go(urlFor(featureById(def.featureId)!.routeId, getData()), ex.target);
          },
        },
        { label: "Not now", variant: "text", onClick: () => live.current.a.logDecision(`Declined: ${def.label}`) },
      ],
    });
    return true;
  }, []);

  /* ---------------- tasks ---------------- */

  const stepLine = (def: TaskDef, index: number) => {
    const s = def.steps[index];
    return s ? `Step ${index + 1} of ${def.steps.length}: ${s.title}.` : "";
  };

  const goToStep = useCallback(() => {
    const w = getWorkflow();
    if (!w.active) return;
    const p = progressOf(w.active);
    const s = p.step ?? optionalLeft(w.active)[0];
    if (!s) return;
    const d = getData();
    if (!canBuild(s.routeId, d, s.params)) return;
    const url = urlFor(s.routeId, d, s.params);
    const here = resolve(live.current.path).route.id === s.routeId;
    if (here) {
      if (s.target) live.current.a.highlight(s.target);
    } else go(url, s.target);
  }, []);

  const offerDraft = useCallback((kind: DraftKind, text?: string) => {
    const body = text ?? makeDraft(kind, getData());
    setTaskDraft(body);
    live.current.a.say({
      text: <>Here's a draft {DRAFT_LABEL[kind].toLowerCase()} to start from. Edit anything; nothing is posted or saved until you do it on the page.</>,
      plain: `Draft ${DRAFT_LABEL[kind]}: ${body}`,
      body: <CopyLine label={`Draft · ${DRAFT_LABEL[kind]}`} value={body} />,
    });
  }, []);

  const beginTask = useCallback((taskId: string) => {
    const def = taskById(taskId);
    if (!def) return false;
    if (blocked(def.need)) {
      noAccess(def.name);
      return false;
    }
    const m = metrics(getData());
    const warn = def.dependsOn?.find((x) => x.when(m));
    startTask(taskId);
    const w = getWorkflow();
    const p = w.active ? progressOf(w.active) : null;
    const { a } = live.current;
    a.say({
      text: (
        <>
          <b>{def.name}.</b> {def.summary} {p?.step ? stepLine(def, p.index) : ""}
        </>
      ),
      plain: `Started: ${def.name}. ${p?.step ? stepLine(def, p.index) : ""}`,
      details: warn ? warn.note : undefined,
      actions: [
        ...(warn ? [{ label: "Fix that first", variant: "outline" as const, onClick: () => beginTaskRef.current(warn.taskId) }] : []),
        ...(ASSISTS[def.id] ? [{ label: ASSISTS[def.id].label, variant: "outline" as const, onClick: () => proposeActionRef.current(ASSISTS[def.id].actionId, ASSISTS[def.id].input()) }] : []),
        ...(def.draft && !ASSISTS[def.id] ? [{ label: `Draft ${DRAFT_LABEL[def.draft].toLowerCase()}`, variant: "outline" as const, onClick: () => offerDraft(def.draft!) }] : []),
      ],
    });
    goToStep();
    return true;
  }, []);
  const proposeActionRef = useRef(proposeAction);
  proposeActionRef.current = proposeAction;
  const beginTaskRef = useRef(beginTask);
  beginTaskRef.current = beginTask;

  const taskControl = useCallback((c: "pause" | "resume" | "cancel" | "back" | "status") => {
    const { a } = live.current;
    const w = getWorkflow();
    if (c === "resume") {
      const def = resumeTask();
      if (!def) return void a.say({ text: "There's no paused task to pick up." });
      const p = getWorkflow().active ? progressOf(getWorkflow().active!) : null;
      a.say({ text: <>Picking up <b>{def.name}</b>. {p ? stepLine(def, p.index) : ""}</>, plain: `Resumed ${def.name}.` });
      goToStep();
      return;
    }
    if (!w.active) return void a.say({ text: "You don't have a task in progress." });
    const def = taskById(w.active.taskId)!;
    if (c === "pause") {
      pauseTask();
      a.say({ text: <>Paused <b>{def.name}</b>. Your progress is saved; say "resume" any time.</>, plain: `Paused ${def.name}.` });
    } else if (c === "cancel") {
      cancelTask();
      a.say({ text: <>Stopped <b>{def.name}</b>. Anything you already saved on the page stays as it is.</>, plain: `Cancelled ${def.name}.` });
    } else if (c === "back") {
      backStep();
      const p = progressOf(getWorkflow().active!);
      a.say({ text: stepLine(def, p.index) || "You're at the first step." });
      goToStep();
    } else {
      const p = progressOf(w.active);
      a.say({ text: <><b>{def.name}</b>: {p.doneCount} of {p.required} steps done. {p.step ? `Next: ${p.step.title}.` : ""}</>, plain: `${def.name}: ${p.doneCount}/${p.required} done.` });
    }
  }, []);

  /* ---------------- attention / next ---------------- */

  const itemAction = (i: HealthItem) => () => {
    if (i.id === "autopilot-ready") return openAutopilot({ screen: "summary" });
    if (i.taskId) beginTaskRef.current(i.taskId);
    else navigateTo(i.featureId);
  };

  const showAttention = useCallback((intro?: string) => {
    const d = getData();
    const items = recommend(d, { dismissed: dismissed.current, limit: 3 });
    const { a } = live.current;
    if (!items.length) return void a.say({ status: "done", text: "Nothing needs your attention right now." });
    const [top, ...rest] = items;
    a.say({
      text: (
        <>
          {intro ? `${intro} ` : ""}
          <b>{top.title}.</b> {top.why}
        </>
      ),
      plain: `${intro ?? ""} ${top.title}. ${top.why}`.trim(),
      body: rest.length ? (
        <ul className="flex flex-col gap-1.5 text-[13px] text-soft">
          {rest.map((r) => (
            <li key={r.id}>· {r.title}</li>
          ))}
        </ul>
      ) : undefined,
      actions: [
        { label: top.cta, variant: "primary", onClick: itemAction(top) },
        ...rest.slice(0, 2).map((r) => ({ label: r.cta, variant: "outline" as const, onClick: itemAction(r) })),
      ],
    });
  }, []);

  const showNext = useCallback(() => {
    const w = getWorkflow();
    const { a } = live.current;
    if (w.active) {
      const p = progressOf(w.active);
      a.say({ text: <>You're in the middle of <b>{p.def.name}</b>. Next: {p.step?.title}.</>, plain: `Next in ${p.def.name}: ${p.step?.title}`, actions: [{ label: p.step?.cta ?? "Continue", variant: "primary", onClick: goToStep }] });
      return;
    }
    const top = topRecommendation(getData(), { dismissed: dismissed.current });
    if (!top) return void a.say({ text: "You're all caught up. Want an idea for your next post?", actions: [{ label: "Give me a post idea", variant: "outline", onClick: () => offerDraft("post-idea") }] });
    a.say({
      text: <><b>{top.title}.</b> {top.why}</>,
      plain: `${top.title}. ${top.why}`,
      actions: [
        { label: top.cta, variant: "primary", onClick: itemAction(top) },
        { label: "Something else", variant: "text", onClick: () => (dismissed.current.push(top.id), showNext()) },
      ],
    });
  }, []);

  /* ---------------- clarify / explain / page help ---------------- */

  const clarify = (c: Clarify) =>
    live.current.a.say({
      text: c.question,
      choice: {
        instant: true,
        options: c.options.map((o) => ({ value: o.featureId, label: o.label })),
        onPick: (v) => navigateTo(v),
      },
    });

  const explain = (f: Feature) =>
    live.current.a.say({
      text: <><b>{f.name}</b>: {f.description}</>,
      plain: `${f.name}: ${f.description}`,
      actions: [{ label: `Open ${f.name}`, variant: "outline", onClick: () => navigateTo(f.id, { quiet: true }) }],
    });

  const pageHelp = () => {
    const d = getData();
    const { a, path } = live.current;
    const route = resolve(path).route;
    const w = getWorkflow();
    if (route.id === "pref-outbound-emails") {
      const facts = pageFacts(route.id, d) as { status?: string; error?: string; domain?: string } | null;
      if (facts?.status === "failed") {
        a.say({
          text: (
            <>
              Your email domain <b>{facts.domain}</b> isn't verified. {facts.error} That usually means the records shown here haven't been added at your domain provider yet, or they haven't
              updated. Add them there, then verify again.
            </>
          ),
          plain: `Outbound Emails failed for ${facts.domain}: ${facts.error}`,
          actions: [{ label: "Walk me through it", variant: "primary", onClick: () => beginTaskRef.current("fix-outbound-email") }],
        });
        return;
      }
    }
    if (w.active) {
      const p = progressOf(w.active);
      a.say({ text: <>We're on <b>{p.def.name}</b>. {p.step ? `${p.step.title}.` : ""} {p.step?.hint ?? ""}</>, plain: `${p.def.name}: ${p.step?.title}`, actions: p.step ? [{ label: p.step.cta, variant: "primary", onClick: goToStep }] : undefined });
      return;
    }
    const here = featureForRoute(route.id);
    if (here) explain(here);
    else a.say({ text: <>This is <b>{route.title}</b> ({route.menu}). Tell me what you'd like to do and I'll take you there.</>, plain: `This is ${route.title}.` });
  };

  /* ---------------- demo-mode entry ---------------- */

  const handle = useCallback((text: string) => {
    const named = namedCreate(text);
    if (named) return proposeActionRef.current(named.actionId, { name: named.name }) || true;
    const w = getWorkflow();
    const intent = classify(text, { hasActiveTask: !!w.active });
    const { a } = live.current;
    switch (intent.kind) {
      case "smalltalk":
        a.say({ text: intent.reply === "greeting" ? `Hi ${getData().account.firstName}! What would you like to do?` : "Anytime." });
        return true;
      case "health":
        showAttention();
        return true;
      case "next":
        showNext();
        return true;
      case "control":
        taskControl(intent.control);
        return true;
      case "task": {
        if (w.active?.taskId === intent.task.id) {
          taskControl("status");
          goToStep();
          return true;
        }
        return beginTask(intent.task.id) || true;
      }
      case "clarify":
        clarify(intent.clarify);
        return true;
      case "explain":
        explain(intent.feature);
        return true;
      case "navigate":
        navigateTo(intent.feature.id);
        return true;
      case "page-help":
        pageHelp();
        return true;
      default:
        return false;
    }
  }, []);

  /* ---------------- task progress → short updates ---------------- */

  useEffect(
    () =>
      onProgress((e) => {
        const { a } = live.current;
        if (e.type === "step" && e.index > 0) {
          const s = e.task.steps[e.index];
          a.say({
            status: "done",
            text: <>{e.manual ? "Nice, I saw that. " : ""}Next: {s.title}.</>,
            plain: `Step done in ${e.task.name}. Next: ${s.title}.`,
            actions: [{ label: s.cta, variant: "outline", onClick: goToStep }],
          });
        } else if (e.type === "complete") {
          const extra = e.task.next;
          a.say({
            status: "done",
            text: <><b>{e.task.name}</b>: done.{extra ? ` Want to ${extra.label.toLowerCase()} next?` : ""}</>,
            plain: `${e.task.name}: done.`,
            actions: extra ? [{ label: extra.label, variant: "outline", onClick: () => (extra.taskId ? beginTaskRef.current(extra.taskId) : navigateTo(extra.featureId!)) }] : undefined,
          });
          a.setMood("happy");
        }
      }),
    [],
  );

  const value = useMemo(() => ({ handle, navigateTo, beginTask, taskControl, showAttention, showNext, offerDraft, goToStep, proposeAction, dismissed }), []);
  return <C.Provider value={value}>{children}</C.Provider>;
}

/** The main feature shown on a route (first registry entry for it). */
export const featureForRoute = (routeId: string) => FEATURES.find((f) => f.routeId === routeId && !f.params && !f.overlay) ?? null;

export function usePlatformAgent() {
  const c = useContext(C);
  if (!c) throw new Error("usePlatformAgent must be used inside PlatformAgentProvider");
  return c;
}

/** "create a group called Inner Circle", "add a topic tag named Backcountry": a named, approvable request. */
function namedCreate(text: string): { actionId: string; name: string } | null {
  const m = text.match(/\b(?:create|make|add|set up|start)\b.*?\b(group|topic tag|tag)\b.*?\b(?:called|named)\s+["“']?([^"”'.!?]{1,40}?)["”']?[.!?]*\s*$/i);
  if (!m) return null;
  return { actionId: /group/i.test(m[1]) ? "group.add" : "tag.add", name: m[2].trim() };
}

/* ---------------- executors for execute-with-approval actions ---------------- */

type Input = Record<string, unknown>;
interface Executor {
  validate: (i: Input) => Input | null;
  describe: (i: Input) => [string, string][];
  run: (d: ReturnType<typeof getData>, i: Input) => void;
  done: (i: Input) => string;
  /** A reason not to propose it (e.g. it already exists), said instead of the approval card. */
  exists?: (d: ReturnType<typeof getData>, i: Input) => string | null;
  target?: string;
}
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() && v.trim().length <= max ? v.trim() : null);

const EXECUTORS: Record<string, Executor> = {
  "group.add": {
    validate: (i) => (str(i.name, 40) ? { name: str(i.name, 40), description: str(i.description, 200) ?? "" } : null),
    describe: (i) => [["Group", String(i.name)], ...(i.description ? [["Description", String(i.description)] as [string, string]] : [])],
    run: (d, i) => void addGroup(d, { name: String(i.name), description: String(i.description || "") }),
    done: (i) => `Created the ${i.name} group. Next, add fans to it in Insights & Fans.`,
    exists: (d, i) => (d.prefsB.groups.some((g) => g.name.toLowerCase() === String(i.name).toLowerCase()) ? `You already have a group called ${i.name}. Here it is.` : null),
  },
  "tag.add": {
    validate: (i) => (str(i.name, 30) ? { name: str(i.name, 30), description: str(i.description, 200) ?? "" } : null),
    describe: (i) => [["Topic Tag", String(i.name)]],
    run: (d, i) => void addTopicTag(d, { name: String(i.name), description: String(i.description || "") }),
    done: (i) => `Added the ${i.name} tag.`,
    exists: (d, i) => (d.prefsB.topicTags.some((t) => t.name.toLowerCase() === String(i.name).toLowerCase()) ? `You already have a ${i.name} tag. Here it is.` : null),
  },
  "automated.add": {
    validate: (i) => (AUTOMATED_EVENT_TYPES.includes(String(i.event)) && str(i.text, 1000) ? { event: String(i.event), text: str(i.text, 1000) } : null),
    describe: (i) => [["When", String(i.event)], ["Message", String(i.text)]],
    run: (d, i) => saveAutomatedMessage(d, { event: String(i.event), text: String(i.text) }),
    done: () => "Added and turned on. New fans will get it automatically.",
  },
};

/** Things the assistant can offer to do inside a task (still asks for approval). */
const ASSISTS: Record<string, { label: string; actionId: string; input: () => Input }> = {
  "vip-group": { label: "Create the group for me", actionId: "group.add", input: () => ({ name: "VIP", description: "My closest fans get first access and exclusive posts." }) },
  "welcome-message": { label: "Add it for me", actionId: "automated.add", input: () => ({ event: "Fan Registers", text: makeDraft("welcome-message", getData()) }) },
};
