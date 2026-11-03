/**
 * Compact earning options inside the panel: one row per Monetize feature (name, one line, whether it
 * earns directly or helps sell), each opening that feature's own screen and guided setup. Not a
 * second dashboard: no forms, no stats.
 */
import { ChevronRight } from "lucide-react";
import { featureById } from "../../app/agent-context/features";
import { EARN_OPTIONS } from "../../app/agent-context/earning";

export function EarnList({ groups, onOpen }: { groups: { id: string; label: string; ids: string[] }[]; onOpen: (featureId: string) => void }) {
  return (
    <div data-testid="ai-earn-list" className="mt-2 flex flex-col gap-2">
      {groups.map((g) => (
        <section key={g.id} aria-label={g.label || undefined}>
          {g.label && <h4 className="mb-1 text-[11px] font-bold uppercase tracking-caps text-soft">{g.label}</h4>}
          <ul className="overflow-hidden rounded-inner border border-line">
            {g.ids.map((id) => {
              const f = featureById(id);
              const o = EARN_OPTIONS[id];
              if (!f || !o) return null;
              return (
                <li key={id} className="border-t border-line first:border-t-0">
                  <button
                    data-testid={`ai-earn-option-${id}`}
                    onClick={() => onOpen(id)}
                    aria-label={`Open ${f.name}`}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-accent-tint"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[13px] font-bold">
                        {f.name}
                        <span className={`rounded-full px-1.5 py-px text-[10px] font-bold uppercase tracking-caps ${o.kind === "earns" ? "bg-accent/20 text-accent" : "border border-line text-soft"}`}>
                          {o.kind === "earns" ? "Earns" : "Helps sell"}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[12px] text-soft">{o.line}</span>
                    </span>
                    <ChevronRight size={16} className="mt-0.5 shrink-0 text-soft" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
