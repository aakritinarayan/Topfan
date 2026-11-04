/**
 * Active task runtime (brief Part 11 / 14). One task at a time; paused tasks are kept so the creator
 * can resume later. Progress is re-checked on every store change and navigation, so steps the
 * creator completes by hand count exactly like steps done with the assistant.
 * Persisted per browser (localStorage); ?resetMock=1 clears it with the mock data.
 */
import { useSyncExternalStore } from "react";
import { getData, onStoreEvent } from "../../store/store";
import { onNavigate } from "../router";
import { resolve } from "../routeCatalog";
import { currentStep, metrics, taskById, type Metrics, type StepCtx, type TaskDef } from "./tasks";
import { storageKey } from "../demo";

export interface ActiveTask {
  /** Unique id of this task instance (Resume and Cancel act on exactly this one). */
  id: string;
  /** Which workflow it is (TaskDef id), e.g. "vip-group". */
  taskId: string;
  startedAt: number;
  status: "active" | "paused";
  visited: string[];
  base: Metrics;
  /** Step index the creator last saw (to announce progress once). */
  seenStep: number;
  /** Draft text prepared for this task, kept if the creator cancels or pauses. */
  draft?: string;
  /** The creator's goal in their own words (or the option they picked), kept as task context. */
  goal?: string;
  /** Last start, step change, pause or resume. Old tasks expire (TASK_TTL_MS). */
  updatedAt?: number;
  /** What the creator typed into this task's form so far (restored when they come back). */
  input?: Record<string, string>;
}

export interface WorkflowState {
  active: ActiveTask | null;
  paused: ActiveTask[];
  finished: { taskId: string; status: "done" | "cancelled" | "expired"; at: number }[];
  /** Tasks that expired since the creator last saw them (announced once, then cleared). */
  expired?: string[];
}

/** A task untouched for this long is cleared instead of resumed (its screens may have changed). */
export const TASK_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const KEY = storageKey("topfan-tasks-v1");
const newId = () => `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const empty: WorkflowState = { active: null, paused: [], finished: [] };

function load(): WorkflowState {
  try {
    if (new URLSearchParams(window.location.search).get("resetMock") === "1") {
      localStorage.removeItem(KEY);
      return empty;
    }
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as WorkflowState | null;
    if (!s || typeof s !== "object") return empty;
    // Drop anything unreadable (an old shape or a task that no longer exists), and expire old tasks.
    const now = Date.now();
    const valid = (t: ActiveTask | null | undefined): t is ActiveTask => !!t && typeof t === "object" && !!taskById(t.taskId) && Array.isArray(t.visited) && !!t.base;
    // Tasks saved before instance ids existed get one now.
    for (const t of [s.active, ...(Array.isArray(s.paused) ? s.paused : [])]) if (t && typeof t === "object" && !t.id) t.id = newId();
    const fresh = (t: ActiveTask) => now - (t.updatedAt ?? t.startedAt ?? 0) < TASK_TTL_MS;
    const all = [s.active, ...(Array.isArray(s.paused) ? s.paused : [])].filter(valid);
    const expired = all.filter((t) => !fresh(t)).map((t) => t.taskId);
    const keep = (t: ActiveTask | null | undefined) => (valid(t) && fresh(t) ? t : null);
    return {
      active: keep(s.active),
      paused: (Array.isArray(s.paused) ? s.paused : []).filter((t): t is ActiveTask => !!keep(t)),
      finished: [...(Array.isArray(s.finished) ? s.finished : []), ...expired.map((taskId) => ({ taskId, status: "expired" as const, at: now }))].slice(-20),
      expired: [...(s.expired ?? []), ...expired],
    };
  } catch {
    return empty;
  }
}

let state: WorkflowState = typeof window === "undefined" ? empty : load();
const subs = new Set<() => void>();
const progressSubs = new Set<(e: ProgressEvent) => void>();

export type ProgressEvent =
  | { type: "step"; task: TaskDef; index: number; manual: boolean }
  | { type: "complete"; task: TaskDef }
  | { type: "started" | "paused" | "resumed" | "cancelled"; task: TaskDef };

function set(next: WorkflowState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode */
  }
  subs.forEach((s) => s());
}
const emit = (e: ProgressEvent) => progressSubs.forEach((s) => s(e));

export const getWorkflow = () => state;
export const onProgress = (fn: (e: ProgressEvent) => void) => (progressSubs.add(fn), () => void progressSubs.delete(fn));
export const useWorkflow = () => useSyncExternalStore((fn) => (subs.add(fn), () => void subs.delete(fn)), getWorkflow);

export function stepCtx(t: ActiveTask): StepCtx {
  return { visited: t.visited, base: t.base, now: metrics(getData()) };
}

/** Where the active task stands right now. */
export function progressOf(t: ActiveTask) {
  const def = taskById(t.taskId)!;
  const c = stepCtx(t);
  const index = currentStep(def, c);
  const required = def.steps.filter((s) => !s.optional).length;
  const doneCount = def.steps.filter((s) => !s.optional && s.done(c)).length;
  return { def, index, step: def.steps[index] ?? null, complete: index >= def.steps.length, doneCount, required, ctx: c };
}

/** Optional steps left after the required ones are done (offered, never forced). */
export function optionalLeft(t: ActiveTask) {
  const def = taskById(t.taskId)!;
  const c = stepCtx(t);
  return def.steps.filter((s) => s.optional && !s.done(c));
}

export function startTask(taskId: string, goal?: string): TaskDef | null {
  const def = taskById(taskId);
  if (!def) return null;
  const here = resolve(window.location.pathname).route.id;
  const prev = state.active && state.active.taskId !== taskId ? { ...state.active, status: "paused" as const } : null;
  const resumed = state.paused.find((p) => p.taskId === taskId);
  const now = Date.now();
  const active: ActiveTask = resumed
    ? { ...resumed, status: "active", visited: [...new Set([...resumed.visited, here])], updatedAt: now, goal: goal ?? resumed.goal }
    : { id: newId(), taskId, startedAt: now, updatedAt: now, status: "active", visited: [here], base: metrics(getData()), seenStep: 0, goal };
  set({
    ...state,
    active,
    paused: [...state.paused.filter((p) => p.taskId !== taskId && p.taskId !== prev?.taskId), ...(prev ? [prev] : [])],
  });
  emit({ type: resumed ? "resumed" : "started", task: def });
  check(false);
  return def;
}

export function pauseTask() {
  const a = state.active;
  if (!a) return;
  set({ ...state, active: null, paused: [...state.paused.filter((p) => p.taskId !== a.taskId), { ...a, status: "paused", updatedAt: Date.now() }] });
  emit({ type: "paused", task: taskById(a.taskId)! });
}

/**
 * Resume exactly the paused task with this instance id. Without an id ("resume" said in chat) it
 * picks the most recently paused one. An id that isn't paused (or whose workflow no longer exists)
 * returns null: the caller shows a recovery message and never opens a different task instead.
 */
export function resumeTask(id?: string) {
  const p = id ? state.paused.find((x) => x.id === id) : state.paused[state.paused.length - 1];
  if (!p) return null;
  if (!taskById(p.taskId)) {
    set({ ...state, paused: state.paused.filter((x) => x.id !== p.id) });
    return null;
  }
  return startTask(p.taskId);
}

/** Cancel the active task, or a paused one by instance id. It's no longer offered for resuming. */
export function cancelTask(id?: string) {
  const t = id ? (state.active?.id === id ? state.active : state.paused.find((x) => x.id === id)) : state.active;
  if (!t) return;
  set({
    ...state,
    active: state.active?.id === t.id ? null : state.active,
    paused: state.paused.filter((x) => x.id !== t.id),
    finished: [...state.finished, { taskId: t.taskId, status: "cancelled" as const, at: Date.now() }].slice(-20),
  });
  emit({ type: "cancelled", task: taskById(t.taskId)! });
}

/** Does this task hold anything the creator typed (so cancelling would lose it)? */
/** A task named after what the creator asked for ("Create the Inner Circle group"), else its default name. */
const groupName = (t: ActiveTask) => (t.taskId === "vip-group" ? t.input?.title?.trim() || null : null);
export const taskName = (t: ActiveTask) => (groupName(t) ? `Create the ${groupName(t)} group` : taskById(t.taskId)?.name ?? "");
export const taskResumeLabel = (t: ActiveTask) => {
  const def = taskById(t.taskId);
  return groupName(t) ? `Continue setting up your ${groupName(t)} group` : def?.resumeLabel ?? `Continue: ${def?.name ?? ""}`;
};
export const hasUnsavedWork = (t: ActiveTask) => !!t.draft || Object.values(t.input ?? {}).some((v) => v.trim());

/** The active or paused task of this workflow, if any. */
export const taskOfType = (taskId: string) => (state.active?.taskId === taskId ? state.active : state.paused.find((x) => x.taskId === taskId)) ?? null;

/** Keep what the creator typed in a task's form with that task (cleared when the task ends). */
export function setTaskInput(taskId: string, input: Record<string, string>) {
  const t = taskOfType(taskId);
  if (!t) return;
  const next = { ...t, input: { ...t.input, ...input } };
  set({ ...state, active: state.active?.id === t.id ? next : state.active, paused: state.paused.map((x) => (x.id === t.id ? next : x)) });
}

/** Keep a draft with the task (survives pause/cancel, per brief §14). */
export function setTaskDraft(text: string) {
  if (state.active) set({ ...state, active: { ...state.active, draft: text } });
}

/** Step back: forget visits to the current step's page so it shows again. Never undoes data. */
export function backStep() {
  const a = state.active;
  if (!a) return;
  const p = progressOf(a);
  const prev = p.def.steps[Math.max(0, p.index - 1)];
  set({ ...state, active: { ...a, visited: a.visited.filter((v) => v !== prev.routeId), seenStep: Math.max(0, p.index - 1) } });
}

/** Re-evaluate after a change. `manual` = the creator did it on the page (not via the assistant). */
function check(manual: boolean) {
  // A paused task whose required steps were all done on the page is complete, not paused.
  const doneNow = state.paused.filter((t) => progressOf(t).complete);
  if (doneNow.length) {
    set({ ...state, paused: state.paused.filter((t) => !doneNow.includes(t)), finished: [...state.finished, ...doneNow.map((t) => ({ taskId: t.taskId, status: "done" as const, at: Date.now() }))].slice(-20) });
    doneNow.forEach((t) => emit({ type: "complete", task: taskById(t.taskId)! }));
  }
  const a = state.active;
  if (!a || a.status !== "active") return;
  const p = progressOf(a);
  if (p.complete) {
    set({ ...state, active: null, finished: [...state.finished, { taskId: a.taskId, status: "done" as const, at: Date.now() }].slice(-20) });
    emit({ type: "complete", task: p.def });
    return;
  }
  if (p.index > a.seenStep) {
    set({ ...state, active: { ...a, seenStep: p.index, updatedAt: Date.now() } });
    emit({ type: "step", task: p.def, index: p.index, manual });
  }
}

/** Expired tasks to mention once; reading them clears the list. */
export function takeExpired(): string[] {
  const e = state.expired ?? [];
  if (e.length) set({ ...state, expired: [] });
  return e;
}

/**
 * The task model in plain terms (for the model's context and the docs): goal, feature, route, steps
 * with verified done/pending, current step, status, last update. Done = checked against app data.
 */
export function taskSnapshot(t: ActiveTask) {
  const p = progressOf(t);
  return {
    id: t.id,
    taskId: t.taskId,
    taskType: t.taskId,
    title: p.def.name,
    targetRoute: p.step?.routeId ?? p.def.steps[0].routeId,
    workflowData: { goal: t.goal ?? null, draft: t.draft ?? null, input: t.input ?? {} },
    createdAt: new Date(t.startedAt).toISOString(),
    goal: t.goal ?? p.def.name,
    feature: p.def.name,
    route: p.step?.routeId ?? p.def.steps[0].routeId,
    steps: p.def.steps.map((s) => s.title),
    currentStep: p.step?.title ?? null,
    completedSteps: p.def.steps.filter((s) => s.done(p.ctx)).map((s) => s.title),
    pendingSteps: p.def.steps.filter((s) => !s.done(p.ctx) && !s.optional).map((s) => s.title),
    status: p.complete ? "complete" : t.status,
    lastUpdated: new Date(t.updatedAt ?? t.startedAt).toISOString(),
  };
}

/** The assistant is about to open a screen itself: the visit that follows isn't the creator's doing. */
let assistantNav = false;
export function markAssistantNavigation() {
  assistantNav = true;
}

/* Wire up once: navigation records visits; store writes re-check progress. */
if (typeof window !== "undefined") {
  onNavigate((loc) => {
    const byAssistant = assistantNav;
    assistantNav = false;
    const a = state.active;
    if (!a) return;
    const id = resolve(loc.path).route.id;
    if (!a.visited.includes(id)) set({ ...state, active: { ...a, visited: [...a.visited, id] } });
    check(!byAssistant);
  });
  onStoreEvent((e) => {
    if (e.ok) check(!e.label.startsWith("assistant:"));
  });
}

/** Developer reset (review bar). */
export function resetWorkflow() {
  set(empty);
}
