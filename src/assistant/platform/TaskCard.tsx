/**
 * Panel pieces for the platform (outside account setup):
 * - ActiveTaskCard: the compact summary of the goal in progress (brief §14 "Active task card").
 * - PausedTasks: one line per paused task with Resume.
 * - PlatformWelcome: empty-conversation state with up to 3 starting points.
 */
import { Pause, Play, X } from "lucide-react";
import { useData } from "../../store/store";
import { recommend } from "../../app/agent-context/recommendations";
import { taskById } from "../../app/agent-context/tasks";
import { cancelTask, pauseTask, progressOf, useWorkflow } from "../../app/agent-context/workflow-state";
import { usePlatformAgent } from "./PlatformAgent";

export function ActiveTaskCard() {
  const wf = useWorkflow();
  useData((d) => d); // re-check progress when data changes
  const agent = usePlatformAgent();
  if (!wf.active && !wf.paused.length) return null;
  const p = wf.active ? progressOf(wf.active) : null;
  return (
    <div className="flex flex-col gap-2">
      {p && (
        <section data-testid="ai-task-card" aria-label="Current task" className="rounded-inner bg-surface px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[13px] font-bold">{p.def.name}</span>
            <button onClick={pauseTask} aria-label="Pause task" title="Pause" data-testid="ai-task-pause" className="flex h-7 w-7 items-center justify-center rounded-full text-soft hover:bg-bg hover:text-white">
              <Pause size={14} />
            </button>
            <button onClick={cancelTask} aria-label="Cancel task" title="Cancel" data-testid="ai-task-cancel" className="flex h-7 w-7 items-center justify-center rounded-full text-soft hover:bg-bg hover:text-white">
              <X size={15} />
            </button>
          </div>
          <div className="mt-1 text-[12px] text-soft" data-testid="ai-task-step">
            Step {Math.min(p.index + 1, p.def.steps.length)} of {p.def.steps.length}
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
        </section>
      )}
      {wf.paused.map((t) => (
        <div key={t.taskId} data-testid="ai-task-paused" className="flex items-center gap-2 rounded-inner border border-line px-3 py-2 text-[12px]">
          <span className="flex-1 truncate text-soft">
            Paused: <span className="text-white">{taskById(t.taskId)?.name}</span>
          </span>
          <button onClick={() => agent.taskControl("resume")} className="flex items-center gap-1 font-bold text-accent" data-testid="ai-task-resume">
            <Play size={12} /> Resume
          </button>
        </div>
      ))}
    </div>
  );
}

const STARTERS = ["What needs my attention?", "I want to start earning", "Where do I change my logo?"];

export function PlatformWelcome({ onAsk }: { onAsk: (text: string) => void }) {
  const first = useData((d) => d.account.firstName);
  const items = useData((d) => recommend(d, { limit: 3 }));
  return (
    <div data-testid="ai-welcome" className="flex flex-col gap-3">
      <p className="text-[14px]">
        Hi {first}! Tell me what you want to do, and I'll find it and help you through it.
      </p>
      {items[0] && (
        <p className="text-[13px] text-soft">
          Heads up: <span className="text-white">{items[0].title}.</span>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {STARTERS.map((s) => (
          <button key={s} onClick={() => onAsk(s)} className="rounded-full border border-line px-3 py-1.5 text-left text-[12px] hover:border-accent">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
