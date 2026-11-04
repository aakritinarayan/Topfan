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
import { pathFor, resolve } from "../../app/routeCatalog";
import { openOverlay } from "../../app/ui";
import { act, getData } from "../../store/store";
import { addGroup, addTopicTag } from "../../store/slices/prefsB";
import { AUTOMATED_EVENT_TYPES, saveAutomatedMessage } from "../../store/slices/comms";
import { actionById } from "../../app/agent-context/actions";
import { roleCan, ROLE_LABEL } from "../../store/permissions";
import { FEATURES, featureById, type Feature } from "../../app/agent-context/features";
import { classify, GOALS, isImperativeNav, normalizeText, type Clarify, type GoalId, type GoalOption } from "../../app/agent-context/intent";
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
  setTaskInput,
  startTask,
  takeExpired,
  taskResumeLabel,
  taskName,
} from "../../app/agent-context/workflow-state";
import { isOnboarding, usePlatform } from "../../state/platformStore";
import type { HealthItem } from "../../app/agent-context/account-state";
import { CopyLine } from "../AssistantPanel";
import { DRAFT_LABEL, makeDraft, type DraftKind } from "./drafts";
import { DECIDE_OPTIONS, EARN_GROUPS, EARN_OPTIONS, type EarnIntent } from "../../app/agent-context/earning";
import { EarnList } from "./EarnList";
import { inScope } from "../../app/demo";
import { sayOtherDemo } from "../demoGate";

interface Ctx {
  /** Deterministic handling of a typed/spoken request (demo mode). Returns false if not understood. */
  handle: (text: string) => boolean;
  navigateTo: (featureId: string, opts?: { quiet?: boolean; params?: Record<string, string>; topic?: string }) => boolean;
  beginTask: (taskId: string, opts?: TaskOpts) => boolean;
  /** Never leaves the creator with nothing: closest features, or what I can help with. */
  fallback: (text: string, note?: string) => void;
  /** Suggested next actions from the real account and task state (≈4). */
  suggestions: () => Suggestion[];
  /** "Your site is ready. What would you like to do next?" with suggestions. */
  welcome: (heading?: string) => void;
  showGoal: (goal: GoalId) => void;
  showEarn: (e: EarnIntent) => void;
  /** "<Feature>: what it is" with an Open action. */
  explainFeature: (featureId: string) => void;
  /** Run a suggestion as if the creator said it. */
  pickSuggestion: (s: Suggestion) => void;
  /** `id` = the exact task instance (Resume/Cancel on a paused row). */
  taskControl: (c: "pause" | "resume" | "cancel" | "back" | "status", id?: string) => void;
  showAttention: (intro?: string) => void;
  showNext: () => void;
  offerDraft: (kind: DraftKind, text?: string) => void;
  /** Open the step's page and point at its control. */
  goToStep: () => void;
  /** Ask the creator to approve one of the execute-with-approval actions. */
  proposeAction: (actionId: string, input: Record<string, unknown>) => boolean;
  dismissed: React.MutableRefObject<string[]>;
}

interface TaskOpts {
  /** Open the step's screen right away (default). Otherwise offer it as the primary action. */
  navigate?: boolean;
  /** The creator's goal, kept with the task. */
  goal?: string;
  /** Replaces the task summary (e.g. the explanation for a chosen goal). */
  intro?: ReactNode;
  /** Primary action label (default: the step's CTA). */
  cta?: string;
}

export interface Suggestion {
  id: string;
  label: string;
  run: () => void;
}

/** What to say when the creator lands on a screen for a specific reason ("change my logo"). */
const TOPICS: { featureId: string; words: string[]; hint: string; target?: string }[] = [
  { featureId: "white-label", words: ["logo"], hint: "Your logo is in Customize Appearance › Site Logo. Change it there, then click Update & Publish.", target: "logo" },
  { featureId: "white-label", words: ["color", "colors", "colour", "theme", "branding", "appearance", "design", "look"], hint: "Colors and logo are in Customize Appearance. Make your changes, then click Update & Publish.", target: "colors" },
  { featureId: "white-label", words: ["seo", "gtm", "tag manager"], hint: "SEO and the Google Tag Manager ID are under Feed Page SEO Settings & GTM Tag.", target: "seo-keywords" },
];
const topicFor = (featureId: string, text?: string) => {
  if (!text) return null;
  const t = normalizeText(text);
  return TOPICS.find((x) => x.featureId === featureId && x.words.some((w) => t.includes(` ${w}`))) ?? null;
};

const STOP = new Set(
  "a an the my me i to of for in on and or is are do does how can could would what where when which who why with my your it this that want need like please get set up about from have has be into some any just more make use today now time day thing things stuff good best new see know tell show help there here their will should was were it's its whats what's how's where's you you're yours our out all also very really lot much many one two".split(" "),
);
const stem = (w: string) => w.replace(/(ings|ing|ers|er|ies|es|s|ed)$/, "");
/** Loose word overlap with the registry (name, synonyms, description) when no phrase matched. */
function closestFeatures(text: string, n = 3) {
  const words = normalizeText(text).split(" ").filter((w) => w.length > 2 && !STOP.has(w)).map(stem);
  if (!words.length) return [];
  return FEATURES.filter((f) => !f.overlay)
    .map((f) => {
      const hay = new Set(normalizeText([f.name, ...f.synonyms, f.description, f.where].join(" ")).split(" ").filter((w) => w.length > 2).map(stem));
      return { f, score: words.filter((w) => hay.has(w)).length };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.f);
}

const SETUP_PATH = "/edit-preference/whitelabel/setup/";

/** Suggestion labels for verified issues, in the creator's terms. */
const ISSUE_LABEL: Record<string, string> = {
  "outbound-failed": "Fix my email sending",
  "wls-not-active": "Finish setting up my website",
};

const C = createContext<Ctx | null>(null);

export function PlatformAgentProvider({ children }: { children: ReactNode }) {
  const a = useAssistant();
  const { navigate, path } = useRouter();
  const platform = usePlatform();
  const live = useRef({ a, navigate, path, platform });
  live.current = { a, navigate, path, platform };
  const setupReached = useRef(false);
  if (platform.state.screen === "step2" || platform.state.screen === "provisioning") setupReached.current = true;
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

  const navigateTo = useCallback((featureId: string, opts: { quiet?: boolean; params?: Record<string, string>; topic?: string } = {}) => {
    const f = featureById(featureId);
    if (!f) {
      live.current.a.say({ text: "I couldn't find that screen. Here's what I can help with instead.", plain: "Unknown screen." });
      showSuggestionsRef.current();
      return false;
    }
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
    const topic = topicFor(f.id, opts.topic);
    // Already there: no navigation, just help with the next thing on this page.
    const here = resolve(live.current.path).route.id === f.routeId && (!params.tab || new URLSearchParams(window.location.search).get("tab") === params.tab);
    if (here) {
      live.current.a.say({
        text: <>You're already on <b>{f.name}</b>. {topic?.hint ?? f.description}</>,
        plain: `Already on ${f.name}. ${topic?.hint ?? f.description}`,
      });
      if (topic?.target) live.current.a.highlight(topic.target);
      return true;
    }
    if (!canBuild(f.routeId, d, params)) {
      live.current.a.say({ status: "problem", text: <>I couldn't open <b>{f.name}</b> right now. You'll find it under {f.where}.</>, plain: `Couldn't open ${f.name}.` });
      return false;
    }
    go(urlFor(f.routeId, d, params), topic?.target);
    if (topic && !opts.quiet) live.current.a.say({ text: <>Here's <b>{f.name}</b>. {topic.hint}</>, plain: `Opened ${f.name}. ${topic.hint}` });
    else if (!opts.quiet) live.current.a.say({ text: <>Here's <b>{f.name}</b>. You'll find it under {f.where}.</>, plain: `Opened ${f.name} (${f.where}).` });
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

  const beginTask = useCallback((taskId: string, opts: TaskOpts = {}) => {
    const def = taskById(taskId);
    if (!def) return false;
    if ((taskId === "first-time-setup" || taskId === "cover-page") && !inScope("setup")) return sayOtherDemo(live.current.a.say, "setup"), true;
    const navigateNow = opts.navigate ?? true;
    if (blocked(def.need)) {
      noAccess(def.name);
      return false;
    }
    const m = metrics(getData());
    const warn = def.dependsOn?.find((x) => x.when(m));
    startTask(taskId, opts.goal);
    const w = getWorkflow();
    const p = w.active ? progressOf(w.active) : null;
    const { a } = live.current;
    const onStepPage = !!p?.step && resolve(live.current.path).route.id === p.step.routeId;
    // Offer the screen as one clear action unless we're opening it now (or it's already open).
    const primary = !navigateNow && p?.step && !onStepPage ? [{ label: opts.cta ?? p.step.cta, variant: "primary" as const, onClick: goToStep }] : [];
    a.say({
      text: (
        <>
          {opts.intro ?? (
            <>
              <b>{def.name}.</b> {def.summary}
            </>
          )}{" "}
          {p?.step ? (onStepPage ? `You're on the right page. Next: ${p.step.title}.` : stepLine(def, p.index)) : ""}
        </>
      ),
      plain: `Started: ${def.name}. ${p?.step ? stepLine(def, p.index) : ""}`,
      details: warn ? warn.note : undefined,
      actions: [
        ...primary,
        ...(warn ? [{ label: "Fix that first", variant: "outline" as const, onClick: () => beginTaskRef.current(warn.taskId) }] : []),
        ...(ASSISTS[def.id] ? [{ label: ASSISTS[def.id].label, variant: "outline" as const, onClick: () => proposeActionRef.current(ASSISTS[def.id].actionId, ASSISTS[def.id].input()) }] : []),
        ...(def.draft && !ASSISTS[def.id] ? [{ label: `Draft ${DRAFT_LABEL[def.draft].toLowerCase()}`, variant: "outline" as const, onClick: () => offerDraft(def.draft!) }] : []),
      ],
    });
    if (navigateNow || onStepPage) goToStep();
    return true;
  }, []);
  const proposeActionRef = useRef(proposeAction);
  proposeActionRef.current = proposeAction;
  /**
   * "Create a group called Inner Circle": the Create a VIP group task, named after the request, opens the
   * original Add Group form with the name filled in. Saving there is what creates it (nothing is claimed before).
   */
  const startNamedGroup = useCallback((name: string) => {
    const { a } = live.current;
    const exists = EXECUTORS["group.add"].exists!(getData(), { name });
    if (exists) {
      a.say({ text: exists, actions: [{ label: "Open Groups", variant: "primary", onClick: () => (markAssistantNavigation(), live.current.navigate(pathFor("pref-groups"))) }] });
      return;
    }
    if (blocked("content.write")) return void noAccess("Create a group");
    startTask("vip-group", `Create a group called ${name}`);
    setTaskInput("vip-group", { title: name });
    markAssistantNavigation();
    live.current.navigate(pathFor("pref-groups-add"));
    a.say({
      text: (
        <>
          I've opened <b>Add Group</b> with <b>{name}</b> filled in. Add a short description if you like, then click <b>Save</b>. The group is created only when you save.
        </>
      ),
      plain: `Opened Add Group with ${name} filled in. Click Save to create it.`,
    });
  }, []);
  const beginTaskRef = useRef(beginTask);
  beginTaskRef.current = beginTask;

  const taskControl = useCallback((c: "pause" | "resume" | "cancel" | "back" | "status", id?: string) => {
    const { a } = live.current;
    const w = getWorkflow();
    if (c === "resume") {
      const def = resumeTask(id);
      // Never fall back to a different task: say so and let the creator choose.
      if (!def)
        return void a.say(
          id
            ? { text: "I couldn't find that task anymore, so I haven't opened anything. Pick another paused task, or tell me what you'd like to do.", plain: "Paused task not found." }
            : { text: "There's no paused task to pick up." },
        );
      const p = getWorkflow().active ? progressOf(getWorkflow().active!) : null;
      a.say({ text: <>Picking up <b>{def.name}</b>. {p ? stepLine(def, p.index) : ""}</>, plain: `Resumed ${def.name}.` });
      goToStep();
      return;
    }
    if (c === "cancel" && id && id !== w.active?.id) {
      const t = w.paused.find((x) => x.id === id);
      if (!t) return;
      cancelTask(id);
      return void a.say({ text: <>Removed <b>{taskById(t.taskId)?.name}</b> from your paused tasks. Anything you already saved on the page stays as it is.</>, plain: `Cancelled ${taskById(t.taskId)?.name}.` });
    }
    if (!w.active) return void a.say({ text: "You don't have a task in progress." });
    const def = taskById(w.active.taskId)!;
    const name = taskName(w.active);
    if (c === "pause") {
      pauseTask();
      a.say({ text: <>Paused <b>{name}</b>. Your progress is saved; say "resume" any time.</>, plain: `Paused ${name}.` });
    } else if (c === "cancel") {
      cancelTask();
      a.say({ text: <>Stopped <b>{name}</b>. Anything you already saved on the page stays as it is.</>, plain: `Cancelled ${name}.` });
    } else if (c === "back") {
      backStep();
      const p = progressOf(getWorkflow().active!);
      a.say({ text: stepLine(def, p.index) || "You're at the first step." });
      goToStep();
    } else {
      const p = progressOf(w.active);
      a.say({ text: <><b>{name}</b>: {p.doneCount} of {p.required} steps done. {p.step ? `Next: ${p.step.title}.` : ""}</>, plain: `${name}: ${p.doneCount}/${p.required} done.`, actions: p.step?.cta ? [{ label: p.step.cta, variant: "primary", onClick: () => goToStep() }] : undefined });
      goToStep();
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

  const explainFeature = (id: string) => {
    const f = featureById(id);
    if (f) explain(f);
  };

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

  /* ---------------- broad goals: explain, offer up to three choices, then one next step ---------------- */

  const runOption = (goal: GoalId, o: GoalOption, which: "primary" | "secondary") => {
    const t = o[which]!;
    const goalText = `${goal === "earn" ? "Earn from my fans" : "Engage my fans"}: ${o.label}`;
    if (t.taskId) beginTaskRef.current(t.taskId, { navigate: true, goal: goalText, intro: o.explain });
    else if (t.featureId) navigateTo(t.featureId);
  };

  const showGoal = useCallback((goal: GoalId) => {
    if (goal === "earn") return showEarnRef.current({ kind: "broad", question: "What kind of earning fits you best?" });
    const g = GOALS[goal];
    live.current.a.say({
      text: <>{g.intro} {g.question}</>,
      plain: `${g.intro} ${g.question}`,
      choice: {
        instant: true,
        options: g.options.map((o) => ({ value: o.id, label: o.label })),
        onPick: (id) => {
          const o = g.options.find((x) => x.id === id);
          if (!o) return;
          // The choice is the creator's goal: keep it with the task (no navigation yet).
          if (o.primary.taskId) {
            beginTaskRef.current(o.primary.taskId, {
              navigate: false,
              goal: `Engage my fans: ${o.label}`,
              intro: o.explain,
              cta: o.primary.label,
            });
            if (o.secondary) live.current.a.say({ text: "Prefer the other option?", actions: [{ label: o.secondary.label, variant: "outline", onClick: () => runOption(goal, o, "secondary") }] });
            return;
          }
          live.current.a.say({
            text: o.explain,
            actions: [
              { label: o.primary.label, variant: "primary", onClick: () => runOption(goal, o, "primary") },
              ...(o.secondary ? [{ label: o.secondary.label, variant: "outline" as const, onClick: () => runOption(goal, o, "secondary") }] : []),
            ],
          });
        },
      },
    });
  }, []);

  /* ---------------- earning: discover, compare, recommend, then the feature's own guided task ---------------- */

  /** Open one Monetize feature through its guided task (verified route; chat and goal kept). */
  const startEarn = (featureId: string, goal: string) => {
    const o = EARN_OPTIONS[featureId];
    const f = featureById(featureId);
    if (!o || !f) return;
    if (blocked(f.need)) return noAccess(f.name);
    beginTaskRef.current(o.taskId, { navigate: true, goal, intro: <><b>{f.name}.</b> {o.line}</> });
  };
  const startEarnRef = useRef(startEarn);
  startEarnRef.current = startEarn;
  const earnList = (ids: string[], goal: string, grouped = false) => (
    <EarnList groups={grouped ? EARN_GROUPS : [{ id: "pick", label: "", ids }]} onOpen={(id) => startEarnRef.current(id, goal)} />
  );

  const showEarn = useCallback((e: EarnIntent) => {
    const { a } = live.current;
    if (!inScope("discovery")) {
      // Comparing all the ways to earn is the Account Setup & Navigation demo; here, one specific
      // option gets help with its content (a draft to start from) and the page to use it on.
      if (e.kind !== "recommend" || e.ids.length !== 1) return sayOtherDemo(a.say, "discovery");
      const f = featureById(e.ids[0])!;
      if (blocked(f.need)) return noAccess(f.name);
      const kind = CONTENT_DRAFT[e.ids[0]];
      a.say({
        text: <>{e.why}{kind ? " Want help with the content? I can draft a starting point you can edit." : ""}</>,
        plain: e.why,
        actions: [
          ...(kind ? [{ label: `Draft a ${DRAFT_LABEL[kind].toLowerCase()}`, variant: "primary" as const, onClick: () => offerDraft(kind) }] : []),
          { label: `Open ${f.name}`, variant: kind ? ("outline" as const) : ("primary" as const), onClick: () => navigateTo(f.id) },
        ],
      });
      return;
    }
    const all = { label: "Explore all earning options", variant: "outline" as const, onClick: () => showEarnRef.current({ kind: "all" }) };
    if (e.kind === "all") {
      a.say({
        text: <>Here are all 12 ways to earn on TopFan, grouped by what you'd offer. Most earn directly; Portfolios and Discount Codes help you show your work and sell more.</>,
        plain: "All 12 earning options: Subscriptions, Newsletters, VIP Offers, Courses, Experiences, Downloadables, Merchandise, Portfolios, NFTs, Events & Ticketing, Advertisements, Discount Codes.",
        body: earnList([], "Earn from my fans: explored all options", true),
      });
      return;
    }
    if (e.kind === "broad") {
      a.say({
        text: <>There are several ways to earn from your fans on TopFan. Most earn directly; a few help you sell more or show your work. {e.question}</>,
        plain: `Ways to earn. ${e.question}`,
        choice: {
          instant: true,
          options: [...EARN_GROUPS.map((g) => ({ value: g.id, label: g.label })), { value: "all", label: "Explore all earning options" }],
          onPick: (id, label) => {
            if (id === "all") return showEarnRef.current({ kind: "all" });
            const g = EARN_GROUPS.find((x) => x.id === id)!;
            live.current.a.say({ text: <>{g.label}: pick one to open it and I'll guide you through setting it up.</>, plain: `${g.label}: ${g.ids.join(", ")}`, body: earnList(g.ids, `Earn from my fans: ${label}`), actions: [all] });
          },
        },
      });
      return;
    }
    if (e.kind === "decide") {
      a.say({
        text: "Happy to help you choose. What matters most to you right now?",
        choice: {
          instant: true,
          options: DECIDE_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
          onPick: (id, label) => {
            const o = DECIDE_OPTIONS.find((x) => x.id === id)!;
            showEarnRef.current({ kind: "recommend", ids: o.ids, why: o.why, note: o.note, goal: `Earn from my fans: ${label}` });
          },
        },
      });
      return;
    }
    // A specific goal: one recommendation goes straight to its guided task (no extra question).
    const goal = e.goal ?? "Earn from my fans";
    if (e.ids.length === 1) {
      const o = EARN_OPTIONS[e.ids[0]];
      const f = featureById(e.ids[0])!;
      if (blocked(f.need)) return noAccess(f.name);
      beginTaskRef.current(o.taskId, { navigate: false, goal, intro: <>{e.why}{e.note ? ` ${e.note}` : ""}</> });
      a.say({ text: "Want to compare other ways to earn?", actions: [all] });
      return;
    }
    a.say({ text: <>{e.why}{e.note ? ` ${e.note}` : ""}{e.question ? ` ${e.question}` : ""}</>, plain: `${e.why} ${e.note ?? ""}`, body: earnList(e.ids, goal), actions: [all] });
  }, []);
  const showEarnRef = useRef(showEarn);
  showEarnRef.current = showEarn;

  /* ---------------- suggestions from the real account and task state ---------------- */

  /** Direct open: one sentence, one primary action (no navigation until the creator clicks). */
  const offerOpen = (featureId: string, topicText?: string) => {
    const f = featureById(featureId);
    if (!f) return false;
    // Same access rule as navigating: never offer a button to a screen this role can't use.
    if (blocked(f.need)) {
      noAccess(f.name);
      return true;
    }
    const topic = topicFor(f.id, topicText);
    if (resolve(live.current.path).route.id === f.routeId) return navigateTo(f.id, { topic: topicText });
    live.current.a.say({
      text: <>{topic ? <>That's in <b>{f.name}</b> ({f.where}). </> : <><b>{f.name}</b> is under {f.where}. </>}{topic ? "" : f.description}</>,
      plain: `${f.name} is under ${f.where}.`,
      actions: [{ label: `Open ${f.name}`, variant: "primary", onClick: () => navigateTo(f.id, { topic: topicText }) }],
    });
    return true;
  };

  const suggestions = useCallback((): Suggestion[] => {
    const d = getData();
    const w = getWorkflow();
    const ps = live.current.platform.state;
    const out: Suggestion[] = [];
    if (!inScope("discovery")) return contentSuggestions(d, w);
    const doneTasks = new Set(w.finished.filter((f) => f.status === "done").map((f) => f.taskId));
    if (w.active) {
      const def = taskById(w.active.taskId)!;
      out.push({ id: `continue-${def.id}`, label: taskResumeLabel(w.active), run: () => (taskControl("status"), goToStep()) });
    }
    const paused = w.paused[w.paused.length - 1];
    if (paused) {
      const def = taskById(paused.taskId)!;
      out.push({ id: `resume-${def.id}`, label: taskResumeLabel(paused), run: () => taskControl("resume", paused.id) });
    }
    // Account setup really started in this session (Step 2 or later reached) but not finished.
    if (inScope("setup") && setupReached.current && !ps.provisionDone && !isOnboarding(ps.screen)) {
      const step = ps.provisionStartedAt ? "provisioning" : ps.recordsVerified || ps.screen === "step2" ? "dns" : "domain";
      out.push({ id: "finish-setup", label: "Finish setting up my website", run: () => (markAssistantNavigation(), live.current.navigate(SETUP_PATH + step)) });
    }
    // The most important verified issue (not tips).
    const issue = recommend(d, { dismissed: dismissed.current, limit: 1 })[0];
    if (issue && issue.priority <= 1 && !out.some((x) => x.id.endsWith(issue.taskId ?? "-"))) out.push({ id: `issue-${issue.id}`, label: ISSUE_LABEL[issue.id] ?? issue.title, run: itemAction(issue) });
    const brandingActive = w.active?.taskId === "white-label" || w.paused.some((t) => t.taskId === "white-label");
    if (!brandingActive && !doneTasks.has("white-label")) out.push({ id: "customize", label: "Customize my website", run: () => beginTaskRef.current("white-label", { goal: "Customize my website" }) });
    const posts = metrics(d).posts;
    // Writing help is the content demo's story; here the post suggestion is about finding your way.
    const postLabel = inScope("content") ? (posts ? "Create a post" : "Create my first post") : "Explore how to create a post";
    out.push({ id: "post", label: postLabel, run: () => beginTaskRef.current("create-post", { goal: postLabel }) });
    // Once the creator has created an offering, the next step is telling fans, not "start earning".
    const earnTasks = new Set(Object.values(EARN_OPTIONS).map((o) => o.taskId));
    const offered = w.finished.some((f) => f.status === "done" && earnTasks.has(f.taskId));
    if (offered) out.push({ id: "announce", label: "Tell fans about my new offer", run: () => beginTaskRef.current("create-post", { goal: "Tell fans about my new offer" }) });
    else out.push({ id: "earn", label: "Start earning from fans", run: () => showEarnRef.current({ kind: "broad", question: "What kind of earning fits you best?" }) });
    out.push({ id: "engage", label: "Explore fan engagement", run: () => showGoal("engage") });
    const role = d.account.session.role;
    return out.filter((x) => {
      const t = x.id.startsWith("continue-") || x.id.startsWith("resume-") ? null : x.id === "customize" ? taskById("white-label") : x.id === "post" ? taskById("create-post") : null;
      return !t?.need || roleCan(role, t.need);
    }).slice(0, 4);
  }, []);

  /** AI-Assisted Content demo: continue a task, then content (Autopilot review/plan, writing help). */
  const contentSuggestions = (d: ReturnType<typeof getData>, w: ReturnType<typeof getWorkflow>): Suggestion[] => {
    const out: Suggestion[] = [];
    const t = w.active ?? w.paused[w.paused.length - 1];
    if (t) {
      const def = taskById(t.taskId)!;
      out.push({ id: `${w.active ? "continue" : "resume"}-${def.id}`, label: taskResumeLabel(t), run: () => (w.active ? (taskControl("status"), goToStep()) : taskControl("resume", t.id)) });
    }
    if (!roleCan(d.account.session.role, "content.write")) return out;
    const ready = d.autopilot.batch && !d.autopilot.batch.dismissed ? d.autopilot.batch.drafts.filter((x) => x.status === "ready").length : 0;
    if (ready) out.push({ id: "ap-review", label: "Review my prepared posts", run: () => openAutopilot({ screen: "summary" }) });
    out.push({ id: "ap-plan", label: "Prepare this week's content", run: () => openAutopilot({ screen: "plan", step: "intro" }) });
    out.push({ id: "write-post", label: "Help me write a post", run: () => beginTaskRef.current("create-post", { goal: "Help me write a post" }) });
    out.push({ id: "draft-newsletter", label: "Draft a newsletter", run: () => offerDraft("newsletter") });
    return out.slice(0, 4);
  };

  const pickSuggestion = (sg: Suggestion) => {
    live.current.a.userSays(sg.label);
    sg.run();
  };

  const showSuggestions = (text = "Here's what I can help with:") =>
    live.current.a.say({
      text,
      choice: { instant: true, options: suggestions().map((x) => ({ value: x.id, label: x.label })), onPick: (id) => suggestions().find((x) => x.id === id)?.run() },
    });
  const showSuggestionsRef = useRef(showSuggestions);
  showSuggestionsRef.current = showSuggestions;

  const welcome = useCallback((heading = "Your site is ready. What would you like to do next?") => showSuggestions(heading), []);

  /** Nothing matched: closest features if any word overlaps, otherwise what I can help with. Never empty. */
  const fallback = useCallback((text: string, note?: string) => {
    const close = closestFeatures(text);
    const { a } = live.current;
    if (close.length) {
      a.say({
        text: <>{note ? `${note} ` : ""}I'm not sure I understood. Is it one of these?</>,
        plain: `${note ?? ""} Not sure; closest: ${close.map((f) => f.name).join(", ")}.`.trim(),
        choice: { instant: true, options: close.map((f) => ({ value: f.id, label: `${f.name} (${f.where})` })), onPick: (id) => navigateTo(id) },
      });
      return;
    }
    showSuggestions(`${note ? `${note} ` : ""}I don't have an answer for that here. I can take you to any TopFan feature or help with a goal. For example:`);
  }, []);

  /* ---------------- demo-mode entry ---------------- */

  const handle = useCallback((text: string) => {
    const named = namedCreate(text);
    if (named?.actionId === "group.add") return startNamedGroup(named.name), true;
    if (named) return proposeActionRef.current(named.actionId, { name: named.name }) || true;
    const w = getWorkflow();
    const intent = classify(text, { hasActiveTask: !!w.active });
    const { a } = live.current;
    switch (intent.kind) {
      case "smalltalk":
        a.say({ text: intent.reply === "greeting" ? `Hi ${getData().account.firstName}! What would you like to do?` : "Anytime! Tell me if there's anything else." });
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
        return beginTask(intent.task.id, { navigate: isImperativeNav(text), goal: text.slice(0, 120) }) || true;
      }
      case "clarify":
        clarify(intent.clarify);
        return true;
      case "goal":
        showGoal(intent.goal);
        return true;
      case "earn":
        showEarn(intent.earn.kind === "recommend" ? { ...intent.earn, goal: `Earn from my fans: ${text.slice(0, 100)}` } : intent.earn);
        return true;
      case "explain":
        explain(intent.feature);
        return true;
      case "navigate":
        // "Take me to…" goes now; "I want to change my logo" gets one clear "Open …" action.
        if (isImperativeNav(text)) navigateTo(intent.feature.id, { topic: text });
        else offerOpen(intent.feature.id, text);
        return true;
      case "page-help":
        pageHelp();
        return true;
      default:
        return false;
    }
  }, []);

  /* ---------------- panel reopened: offer to continue, mention expired tasks ---------------- */

  const wasOpen = useRef(a.open);
  useEffect(() => {
    const opened = a.open && !wasOpen.current;
    wasOpen.current = a.open;
    if (!opened || isOnboarding(live.current.platform.state.screen) || !live.current.a.messages.length) return;
    const expired = takeExpired();
    if (expired.length) {
      const def = taskById(expired[0]);
      if (def) live.current.a.say({ text: <>Your <b>{def.name}</b> task was from a while ago, so I cleared it. Want to start it again?</>, actions: [{ label: "Start again", variant: "outline", onClick: () => beginTaskRef.current(def.id) }] });
    }
    const w = getWorkflow();
    const t = w.active ?? w.paused[w.paused.length - 1];
    if (!t) return;
    const p = progressOf(t);
    if (!p.step || resolve(live.current.path).route.id === p.step.routeId) return;
    const label = taskResumeLabel(t);
    const last = live.current.a.messages[live.current.a.messages.length - 1];
    if (last && (last.plain ?? "").startsWith(label)) return; // already offered
    live.current.a.say({
      text: <>{label}? Next: {p.step.title}.</>,
      plain: `${label}? Next: ${p.step.title}.`,
      actions: [{ label, variant: "primary", onClick: () => (w.active ? goToStep() : taskControl("resume", t.id)) }],
    });
  }, [a.open]);

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

  const value = useMemo(
    () => ({ handle, navigateTo, beginTask, taskControl, showAttention, showNext, offerDraft, goToStep, proposeAction, dismissed, fallback, suggestions, welcome, showGoal, showEarn, pickSuggestion, explainFeature }),
    [],
  );
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

/** Earning options whose content the assistant can draft (AI-Assisted Content demo). */
const CONTENT_DRAFT: Partial<Record<string, DraftKind>> = {
  subscriptions: "plan-benefits",
  "vip-offers": "plan-benefits",
  newsletters: "newsletter",
  courses: "course-outline",
  events: "event-promo",
  experiences: "post-idea",
  merchandise: "post-idea",
  downloadables: "post-idea",
};
