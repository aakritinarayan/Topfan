/**
 * Panel pieces for the platform (outside account setup):
 * - ActiveTaskCard: the compact summary of the goal in progress (brief §14 "Active task card").
 * - Paused tasks: one compact list; each row resumes or cancels exactly its own task (by instance id).
 * - PlatformWelcome: empty-conversation state with ≈4 suggestions from the account and task state
 *   (demo links: the page intro and up to three actions for the demo, more on request).
 * - PageContextBar: demo links, conversation started: the page and its actions above the input.
 */
import { useEffect, useState } from "react";
import { useRouter } from "../../app/router";
import { demoId, inScope } from "../../app/demo";
import { pageActions, pageIntro } from "./pageGuide";
import { ChevronDown, Pause, Play, X } from "lucide-react";
import { getData, useData } from "../../store/store";
import { hasUnsavedWork, pauseTask, progressOf, taskName, useWorkflow, type ActiveTask } from "../../app/agent-context/workflow-state";
import { usePlatformAgent } from "./PlatformAgent";
import { usePlatform } from "../../state/platformStore";
import { resolve } from "../../app/routeCatalog";
import { POST_SETUP_HEADING, POST_SETUP_LINE, PostSetupActions } from "./CoverAssistant";
import { contentActions, CREATE_ACTIONS, CREATE_HEADING, CREATE_LINE, unfinishedWork } from "./ContentAgent";

const PAUSED_SHOWN = 3;

/** Tasks whose card the creator closed: it folds to one slim row they can reopen (per task instance). */
const hidden = new Set<string>();


export function ActiveTaskCard() {
  const wf = useWorkflow();
  useData((d) => d); // re-check progress when data changes
  const agent = usePlatformAgent();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [, rerender] = useState(0);
  if (!wf.active && !wf.paused.length) return null;
  const p = wf.active ? progressOf(wf.active) : null;
  const id = wf.active?.id ?? "";
  const folded = hidden.has(id);
  const setFolded = (v: boolean) => (v ? hidden.add(id) : hidden.delete(id), rerender((n) => n + 1));
  const stepLabel = p ? `Step ${Math.min(p.index + 1, p.def.steps.length)} of ${p.def.steps.length}` : "";
  return (
    <div className="flex flex-col gap-2">
      {confirm && confirm === wf.active?.id && <ConfirmCancel onYes={() => (setConfirm(null), agent.taskControl("cancel"))} onNo={() => setConfirm(null)} />}
      {p && folded && (
        <button
          onClick={() => setFolded(false)}
          data-testid="ai-task-show"
          aria-label={`Show task: ${taskName(wf.active!)}`}
          className="flex items-center gap-2 rounded-inner bg-surface px-4 py-2 text-left text-[12px] hover:bg-surface/80"
        >
          <span className="min-w-0 flex-1 truncate font-bold">{taskName(wf.active!)}</span>
          <span className="shrink-0 text-soft">{stepLabel}</span>
          <ChevronDown size={14} className="shrink-0 text-soft" />
        </button>
      )}
      {p && !folded && (
        <section data-testid="ai-task-card" aria-label="Current task" className="rounded-inner bg-surface px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[13px] font-bold">{taskName(wf.active!)}</span>
            <button onClick={pauseTask} aria-label="Pause task" title="Pause" data-testid="ai-task-pause" className="flex h-7 w-7 items-center justify-center rounded-full text-soft hover:bg-bg hover:text-white">
              <Pause size={14} />
            </button>
            <button onClick={() => setFolded(true)} aria-label="Close task card" title="Close (you can reopen it)" data-testid="ai-task-hide" className="flex h-7 w-7 items-center justify-center rounded-full text-soft hover:bg-bg hover:text-white">
              <X size={15} />
            </button>
          </div>
          <div className="mt-1 text-[12px] text-soft" data-testid="ai-task-step">
            {stepLabel}
          </div>
          <div className="mt-2 flex gap-1" aria-hidden>
            {p.def.steps.map((s, i) => (
              <span key={s.id} className={`h-1 flex-1 rounded-full ${s.done(p.ctx) ? "bg-accent" : i === p.index ? "bg-accent/40" : "bg-line"}`} />
            ))}
          </div>
          {p.step && (
            <>
              <p className="mt-2.5 text-[13px]">
                <span className="text-soft">Next: </span>
                {p.step.title}
              </p>
              <button
                onClick={agent.goToStep}
                data-testid="ai-task-go"
                className="mt-2.5 h-[34px] rounded-full border border-accent px-4 text-xs font-black uppercase tracking-caps text-accent hover:bg-accent-tint"
              >
                {p.step.cta}
              </button>
            </>
          )}
          <button
            onClick={() => (hasUnsavedWork(wf.active!) ? setConfirm(wf.active!.id) : agent.taskControl("cancel"))}
            data-testid="ai-task-cancel"
            className="ml-3 mt-2.5 text-[12px] text-soft underline-offset-2 hover:text-white hover:underline"
          >
            Cancel task
          </button>
        </section>
      )}
      {wf.paused.length > 0 && (
        <section aria-label="Paused tasks" data-testid="ai-paused-list" className="rounded-inner border border-line px-3 py-1.5">
          <h3 className="py-1 text-[11px] font-bold uppercase tracking-caps text-soft">Paused{wf.paused.length > 1 ? ` (${wf.paused.length})` : ""}</h3>
          <ul className="flex flex-col">
            {/* Most recent first; only three until the creator asks for the rest (keeps the chat visible). */}
            {[...wf.paused].reverse().slice(0, showAll ? undefined : PAUSED_SHOWN).map((t) => (
              <PausedRow
                key={t.id}
                t={t}
                confirming={confirm === t.id}
                onResume={() => agent.taskControl("resume", t.id)}
                onCancel={() => (hasUnsavedWork(t) ? setConfirm(t.id) : agent.taskControl("cancel", t.id))}
                onConfirm={(yes) => (setConfirm(null), yes && agent.taskControl("cancel", t.id))}
              />
            ))}
          </ul>
          {wf.paused.length > PAUSED_SHOWN && (
            <button onClick={() => setShowAll((v) => !v)} data-testid="ai-paused-more" className="py-1 text-[12px] font-bold text-soft hover:text-white">
              {showAll ? "Show fewer" : `Show all ${wf.paused.length}`}
            </button>
          )}
        </section>
      )}
    </div>
  );
}

function PausedRow({ t, confirming, onResume, onCancel, onConfirm }: { t: ActiveTask; confirming: boolean; onResume: () => void; onCancel: () => void; onConfirm: (yes: boolean) => void }) {
  const p = progressOf(t);
  const name = taskName(t);
  if (confirming) return <li className="py-1.5"><ConfirmCancel name={name} onYes={() => onConfirm(true)} onNo={() => onConfirm(false)} /></li>;
  return (
    <li data-testid="ai-task-paused" data-task-id={t.id} data-task-type={t.taskId} className="flex items-center gap-2 border-t border-line py-1.5 text-[12px] first:border-t-0">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-white">{name}</span>
        <span className="block text-[11px] text-soft">{p.step ? `Step ${p.index + 1} of ${p.def.steps.length}` : "Ready to finish"}</span>
      </span>
      <button onClick={onResume} aria-label={`Resume ${name}`} className="flex items-center gap-1 font-bold text-accent" data-testid="ai-task-resume">
        <Play size={12} /> Resume
      </button>
      <button onClick={onCancel} aria-label={`Cancel ${name}`} title="Cancel" data-testid="ai-task-paused-cancel" className="flex h-6 w-6 items-center justify-center rounded-full text-soft hover:bg-bg hover:text-white">
        <X size={13} />
      </button>
    </li>
  );
}

/** Cancelling would drop text the creator typed for this task: ask first. */
function ConfirmCancel({ name, onYes, onNo }: { name?: string; onYes: () => void; onNo: () => void }) {
  return (
    <div data-testid="ai-task-cancel-confirm" className="rounded-inner bg-surface px-3 py-2 text-[12px]">
      <p>Cancel {name ? <b>{name}</b> : "this task"}? What you typed for it will be discarded. Anything already saved on the page stays.</p>
      <div className="mt-2 flex gap-3">
        <button onClick={onYes} data-testid="ai-task-cancel-yes" className="font-bold text-accent">Cancel task</button>
        <button onClick={onNo} data-testid="ai-task-cancel-no" className="font-bold text-soft hover:text-white">Keep it</button>
      </div>
    </div>
  );
}

/** Empty conversation: a short welcome and ≈4 suggestions from the real account and task state. */
export function PlatformWelcome() {
  const first = useData((d) => d.account.firstName);
  useData((d) => d); // suggestions follow the data
  useWorkflow();
  const setupDone = usePlatform().state.provisionDone;
  const agent = usePlatformAgent();
  const { path } = useRouter();
  const [more, setMore] = useState(false);
  const coverPublished = useData((d) => !!d.cover?.publishedAt);
  const heading = setupDone && inScope("setup") ? POST_SETUP_HEADING : `Hi ${first}! What would you like to do next?`;
  // Right after setup (until the cover page is published): the priority next steps, outside the editor.
  if (setupDone && inScope("setup") && !coverPublished && resolve(path).route.id !== "pref-whitelabel-cover")
    return (
      <div data-testid="ai-welcome" className="flex flex-col gap-3">
        <p className="text-[14px]">{heading}</p>
        <p className="text-[13px] text-soft">{POST_SETUP_LINE}</p>
        <PostSetupActions prefix="ai-suggestion-" />
      </div>
    );
  // AI-Assisted Content, on the Feed (home): what would you like to create?
  if (demoId === "ai-content" && resolve(path).route.id === "feed") {
    // Looked up on click: the content assistant mounts alongside this panel.
    const c = { show: (id: string) => contentActions()?.show(id), plan: () => contentActions()?.plan(), post: () => contentActions()?.post(), newsletter: () => contentActions()?.newsletter(), experience: () => contentActions()?.experience(), week: () => contentActions()?.week() };
    const work = unfinishedWork(getData());
    const ideas = [
      ...(work ? [{ id: `resume-work-${work.id}`, label: `Continue my ${work.kind === "week" ? "week" : work.label.toLowerCase().replace(/^my\s+/, "")}`, run: () => c.show(work.id) }] : []),
      ...CREATE_ACTIONS.map((x) => ({ id: `create-${x.id}`, label: x.label, run: () => (x.id === "plan" ? c.plan() : c[x.id]()) })),
    ];
    return (
      <div data-testid="ai-welcome" className="flex flex-col gap-3">
        <p className="text-[14px]">{CREATE_HEADING}</p>
        <p className="text-[13px] text-soft" data-testid="ai-page-intro">
          {CREATE_LINE}
        </p>
        <Chips items={more ? ideas : ideas.slice(0, MAIN_SHOWN)} agent={agent} prefix="ai-suggestion-" />
        {!more && ideas.length > MAIN_SHOWN && (
          <button data-testid="ai-more-suggestions" onClick={() => setMore(true)} className="self-start text-[12px] font-bold text-accent">
            More ideas
          </button>
        )}
      </div>
    );
  }
  // Demo links: what this page is for, then up to three actions for this demo (more on request).
  if (demoId) {
    const intro = pageIntro(path);
    const items = pageActions(path, agent);
    return (
      <div data-testid="ai-welcome" className="flex flex-col gap-3">
        <p className="text-[14px]">{heading}</p>
        {intro.line && (
          <p className="text-[13px] text-soft" data-testid="ai-page-intro">
            {intro.line}
          </p>
        )}
        {intro.helps && (
          <p className="text-[13px] text-soft" data-testid="ai-page-helps">
            {intro.helps}
          </p>
        )}
        <Chips items={more ? items : items.slice(0, MAIN_SHOWN)} agent={agent} prefix="ai-suggestion-" />
        {!more && items.length > MAIN_SHOWN && (
          <button data-testid="ai-more-suggestions" onClick={() => setMore(true)} className="self-start text-[12px] font-bold text-accent">
            More suggestions
          </button>
        )}
      </div>
    );
  }
  const items = agent.suggestions();
  return (
    <div data-testid="ai-welcome" className="flex flex-col gap-3">
      <p className="text-[14px]">{heading}</p>
      <Chips items={items} agent={agent} prefix="ai-suggestion-" />
    </div>
  );
}

const MAIN_SHOWN = 3;

function Chips({ items, agent, prefix }: { items: { id: string; label: string; run: () => void }[]; agent: ReturnType<typeof usePlatformAgent>; prefix: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((s) => (
        <button key={s.id} data-testid={`${prefix}${s.id}`} onClick={() => agent.pickSuggestion(s)} className="rounded-full border border-line px-3 py-1.5 text-left text-[12px] hover:border-accent">
          {s.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Demo links, once the conversation has started: the current page and its next actions in one quiet
 * row above the input. It follows navigation without adding messages (no repeated page explanations).
 */
export function PageContextBar() {
  useData((d) => d);
  useWorkflow();
  const agent = usePlatformAgent();
  const { path } = useRouter();
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [path]);
  if (!demoId) return null;
  const intro = pageIntro(path);
  const items = pageActions(path, agent);
  if (!items.length) return null;
  return (
    <section aria-label="Suggestions for this page" data-testid="ai-context-bar" className="mx-5 mb-3 flex shrink-0 flex-col gap-2">
      <p className="text-[11px] font-bold uppercase tracking-caps text-soft" title={intro.line ?? undefined} data-testid="ai-context-page">
        {intro.name}
      </p>
      <Chips items={more ? items : items.slice(0, MAIN_SHOWN)} agent={agent} prefix="ai-context-" />
      {!more && items.length > MAIN_SHOWN && (
        <button data-testid="ai-context-more" onClick={() => setMore(true)} className="self-start text-[12px] font-bold text-accent">
          More suggestions
        </button>
      )}
    </section>
  );
}
