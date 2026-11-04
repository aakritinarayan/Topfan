/**
 * The weekly plan on the main screen (Demo 2): a slim, task-linked row above New Post, Add Newsletter and
 * Create Experiences when the open draft belongs to a plan. It reads the same plan and drafts as the
 * assistant, so a save or publish here shows in both at once. Each chip opens that draft's own screen.
 * Not a dashboard: it only appears while working on a planned draft.
 */
import { CalendarDays, FileText, Link2, Mail } from "lucide-react";
import { useRouter } from "../../app/router";
import { pathFor } from "../../app/routeCatalog";
import { markAssistantNavigation } from "../../app/agent-context/workflow-state";
import { useData } from "../../store/store";
import { DAY_NAMES, itemById, type WorkItem } from "../../store/slices/content";
import { activityStatus, sortedActivities } from "../../store/slices/weekPlan";

const ICON = { post: FileText, newsletter: Mail, experience: CalendarDays, bio: Link2 } as const;
const TONE = { ok: "text-white", warn: "text-accent", muted: "text-soft", bad: "text-accent" } as const;

/** Where a draft opens: its saved record once it exists, otherwise the empty form prefilled from the draft. */
export function workUrl(x: WorkItem) {
  if (x.kind === "bio") return pathFor("pref-link-in-bio");
  if (x.kind === "newsletter" && x.ref?.newsletterId) return pathFor("monetize-newsletter-edit", { newsletterId: x.ref.newsletterId });
  if (x.kind === "experience" && x.ref?.productId) return pathFor("monetize-experience-edit", { productId: x.ref.productId });
  return `${pathFor(x.kind === "post" ? "newpost" : x.kind === "newsletter" ? "monetize-newsletter-new" : "monetize-experience-add")}?work=${x.id}`;
}

export function WeekStrip({ workId }: { workId?: string | null }) {
  const { navigate } = useRouter();
  const data = useData((d) => d);
  const x = itemById(data, workId);
  const w = itemById(data, x?.parentId);
  if (!x || !w?.plan) return null;
  const acts = sortedActivities(w.plan).filter((a) => itemById(data, a.childId)?.status !== "cancelled");
  return (
    <nav aria-label="Your week" data-testid="week-strip" className="mb-[14px] flex flex-wrap items-center gap-x-[6px] gap-y-[6px] rounded-inner bg-surface px-[14px] py-[8px] text-[12px]">
      <span className="mr-[4px] font-bold">Your week</span>
      {acts.map((a) => {
        const c = itemById(data, a.childId);
        const st = activityStatus(data, a);
        const Icon = ICON[a.kind];
        const here = c?.id === x.id;
        return (
          <button
            key={a.key}
            data-testid="week-strip-item"
            data-status={st.label}
            data-child={c?.id ?? ""}
            disabled={!c || here}
            aria-current={here ? "page" : undefined}
            onClick={() => c && (markAssistantNavigation(), navigate(workUrl(c)))}
            className={`flex items-center gap-[5px] rounded-pill border px-[10px] py-[3px] ${here ? "border-accent" : "border-line hover:border-accent"} disabled:cursor-default`}
          >
            <span className="font-bold text-soft">{DAY_NAMES[a.day].slice(0, 3)}</span>
            <Icon size={12} className="text-soft" />
            <span className={TONE[st.tone]}>{st.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
