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

export interface ActiveTask {
  taskId: string;
  startedAt: number;
  status: "active" | "paused";
  visited: string[];
  base: Metrics;
  /** Step index the creator last saw (to announce progress once). */
  seenStep: number;
  /** Draft text prepared for this task, kept if the creator cancels or pauses. */
  draft?: string;
}

export interface WorkflowState {
  active: ActiveTask | null;
  paused: ActiveTask[];
  finished: { taskId: string; status: "done" | "cancelled"; at: number }[];
}

const KEY = "topfan-tasks-v1";
const empty: WorkflowState = { active: null, paused: [], finished: [] };

function load(): WorkflowState {
  try {
    if (new URLSearchParams(window.location.search).get("resetMock") === "1") {
      localStorage.removeItem(KEY);
      return empty;
    }
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as WorkflowState | null;
    return s && typeof s === "object" ? { ...empty, ...s } : empty;
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

export function startTask(taskId: string): TaskDef | null {
  const def = taskById(taskId);
  if (!def) return null;
  const here = resolve(window.location.pathname).route.id;
  const prev = state.active && state.active.taskId !== taskId ? { ...state.active, status: "paused" as const } : null;
  const resumed = state.paused.find((p) => p.taskId === taskId);
  const active: ActiveTask = resumed
    ? { ...resumed, status: "active", visited: [...new Set([...resumed.visited, here])] }
    : { taskId, startedAt: Date.now(), status: "active", visited: [here], base: metrics(getData()), seenStep: 0 };
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
  set({ ...state, active: null, paused: [...state.paused.filter((p) => p.taskId !== a.taskId), { ...a, status: "paused" }] });
  emit({ type: "paused", task: taskById(a.taskId)! });
}

export function resumeTask(taskId?: string) {
  const p = taskId ? state.paused.find((x) => x.taskId === taskId) : state.paused[state.paused.length - 1];
  if (p) startTask(p.taskId);
  return p ? taskById(p.taskId)! : null;
}

export function cancelTask() {
  const a = state.active;
  if (!a) return;
  set({ ...state, active: null, finished: [...state.finished, { taskId: a.taskId, status: "cancelled" as const, at: Date.now() }].slice(-20) });
  emit({ type: "cancelled", task: taskById(a.taskId)! });
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
  const a = state.active;
  if (!a || a.status !== "active") return;
  const p = progressOf(a);
  if (p.complete) {
    set({ ...state, active: null, finished: [...state.finished, { taskId: a.taskId, status: "done" as const, at: Date.now() }].slice(-20) });
    emit({ type: "complete", task: p.def });
    return;
  }
  if (p.index > a.seenStep) {
    set({ ...state, active: { ...a, seenStep: p.index } });
    emit({ type: "step", task: p.def, index: p.index, manual });
  }
}

/* Wire up once: navigation records visits; store writes re-check progress. */
if (typeof window !== "undefined") {
  onNavigate((loc) => {
    const a = state.active;
    if (!a) return;
    const id = resolve(loc.path).route.id;
    if (!a.visited.includes(id)) set({ ...state, active: { ...a, visited: [...a.visited, id] } });
    check(true);
  });
  onStoreEvent((e) => {
    if (e.ok) check(!e.label.startsWith("assistant:"));
  });
}

/** Developer reset (review bar). */
export function resetWorkflow() {
  set(empty);
}
