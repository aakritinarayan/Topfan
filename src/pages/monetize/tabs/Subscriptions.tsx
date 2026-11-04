/**
 * Monetize › Subscriptions (/monetize/subscription). Measured from the aj-white-subscriptions reference pack
 * (CLAUDE_CODE_PROMPT.md §4–§5, screenshots 01–06). Tier rows are inert; each Plan Benefits accordion opens on its own.
 */
import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { useData } from "../../../store/store";
import { benefitCountLabel, deletePlan, money, type Subscriber } from "../../../store/slices/monetize";
import type { SubscriptionPlan } from "../../../store/model";
import { personAvatar } from "../../../media";
import { Avatar } from "../../../platform/ui/surfaces";
import type { PageProps } from "../../types";
import { ConfirmModal, MonetizeFrame, OutlinePill, Pill, useRun } from "../ui";
import { ScrollStyle, SubsModal, scrollCls } from "../forms/plan/parts";

export const durationLabel = (p: SubscriptionPlan["prices"][number]) =>
  p.months === 1 ? "1 Month" : `${p.months} Months${p.discountPct ? ` (${p.discountPct}% OFF)` : ""}`;

const chip = "rounded-[18px] border border-accent px-[10px] py-[3px] text-[12px] font-medium";

export function SubscriptionsTab({ route }: PageProps) {
  const plans = useData((d) => d.monetize.plans);
  const { navigate } = useRouter();
  const [del, setDel] = useState<SubscriptionPlan | null>(null);
  const [subsOf, setSubsOf] = useState<SubscriptionPlan | null>(null);
  const run = useRun();
  return (
    <MonetizeFrame routeId={route.id} active="monetize-subscription">
      <ScrollStyle />
      <div className="flex justify-end">
        <Pill data-testid="monetize-add-plan" onClick={() => navigate(pathFor("monetize-plan-add"))}>
          Add New Plan
        </Pill>
      </div>
      <div className="mt-[16px] flex flex-col gap-[16px] pb-[24px]">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} onEdit={() => navigate(pathFor("monetize-plan-edit", { planId: p.id }))} onDelete={() => setDel(p)} onSubscribers={() => setSubsOf(p)} />
        ))}
      </div>
      <SubscribersModal plan={subsOf} onClose={() => setSubsOf(null)} />
      {/* TODO(not captured): the live delete flow and its confirmation were never clicked (to protect live data). This confirm is inferred. */}
      <ConfirmModal
        open={!!del}
        title="Delete Plan"
        confirmLabel="Delete"
        testid="monetize-delete-plan"
        onClose={() => setDel(null)}
        onConfirm={() => {
          if (del && run("monetize.deletePlan", (d) => deletePlan(d, del.id), "content.write", `${del.name} deleted`)) setDel(null);
        }}
      >
        Are you sure you want to delete <b>{del?.name}</b>? {del && del.subscribers > 0 ? `Its ${del.subscribers} active subscribers keep access until their current period ends.` : ""}
      </ConfirmModal>
    </MonetizeFrame>
  );
}

function PlanCard({ plan, onEdit, onDelete, onSubscribers }: { plan: SubscriptionPlan; onEdit: () => void; onDelete: () => void; onSubscribers: () => void }) {
  const [open, setOpen] = useState(false);
  const rows = [
    ...plan.prices.map((t) => ({ key: String(t.months), amount: t.amount, label: durationLabel(t), trial: t.freeTrialDays })),
    // Season Pass / Lifetime rows were not captured on the list; shown the same way.
    ...(plan.extraTiers ?? []).map((x) => ({ key: x.kind, amount: x.amount, label: x.kind === "season" ? "Season Pass" : "Lifetime", trial: x.freeTrialDays })),
  ];
  return (
    <section data-testid={`monetize-plan-${plan.id}`} className="rounded-[30px] bg-surface px-[30px] pb-[24px] pt-[20px]">
      <div className="flex min-h-[40px] items-center justify-between">
        <h4 className="text-[23.778px] font-medium">{plan.name}</h4>
        <div className="flex items-center gap-[16px]">
          <button type="button" aria-label={`Edit ${plan.name}`} data-testid={`monetize-plan-edit-${plan.id}`} onClick={onEdit} className="text-white">
            <Pencil size={22} fill="currentColor" strokeWidth={1.5} />
          </button>
          <button type="button" aria-label={`Delete ${plan.name}`} data-testid={`monetize-plan-delete-${plan.id}`} onClick={onDelete} className="text-white">
            <Trash2 size={24} strokeWidth={2.2} />
          </button>
        </div>
      </div>
      <div className="mt-[16px] flex flex-col gap-[12px]">
        {rows.map((t) => (
          <div key={t.key} data-testid={`monetize-plan-tier-${plan.id}-${t.key}`} className="flex min-h-[61px] cursor-default items-center gap-[12px] overflow-hidden rounded-[16px] border border-transparent bg-bg px-[20px] py-[16px]">
            <span className="text-[18px] font-bold">{money(t.amount)}</span>
            <span className={chip}>{t.label}</span>
            {!!t.trial && <span className="flex h-[25px] items-center rounded-[14px] bg-[rgba(176,163,8,.2)] px-[16px] text-[12px] font-medium uppercase">{t.trial}-Day Free Trial</span>}
          </div>
        ))}
      </div>
      <div className={`mt-[12px] overflow-hidden rounded-[16px] border bg-bg transition-[border-color] duration-200 ${open ? "border-accent/45" : "border-transparent"}`}>
        <button
          type="button"
          aria-expanded={open}
          data-testid={`monetize-plan-benefits-${plan.id}`}
          onClick={() => setOpen((o) => !o)}
          className="flex h-[59px] w-full cursor-pointer select-none items-center gap-[12px] px-[20px] text-left"
        >
          <span className="text-[18px] font-bold">Plan Benefits</span>
          {/* Copy quirk kept: the chip leaves out the Direct Messages bullet, so it reads one lower than the list. */}
          <span className={chip} data-testid={`monetize-plan-benefit-count-${plan.id}`}>
            {benefitCountLabel(plan.benefits)}
          </span>
          <span className="ml-auto">{open ? <ChevronUp size={22} /> : <ChevronDown size={22} />}</span>
        </button>
        {open && (
          <div className="border-t border-surface px-[20px] pb-[20px]">
            <ul className="mt-[10px] list-none" data-testid={`monetize-plan-benefit-list-${plan.id}`}>
              {plan.benefits.map((b) => (
                <li key={b} className="flex h-[36px] items-center gap-[22px] py-[8px] text-[16px]">
                  <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-white" />
                  <span className="opacity-75">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="mt-[12px] flex justify-end">
        <OutlinePill data-testid={`monetize-plan-subscribers-${plan.id}`} className="h-[29px] px-[12px]" onClick={onSubscribers}>
          {plan.subscribers} Active Subscribers
        </OutlinePill>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Subscribers modal (§5) */

/** Fictional places for the optional location line (some subscribers have none). */
const PLACES = ["Boulder, Colorado", "", "Salt Lake City, Utah", "Bend, Oregon", "", "Burlington, Vermont", "Truckee, California", ""];
const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
function subRow(s: Subscriber, i: number) {
  // Active subscribers: show the current period (roll the start date forward from `since`).
  const start = new Date(`${s.since}T12:00:00Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + s.months);
  while (end.getTime() <= Date.now()) {
    start.setTime(end.getTime());
    end.setUTCMonth(end.getUTCMonth() + s.months);
  }
  return { start: fmt(start), end: fmt(end), duration: s.months === 1 ? "1 Month" : `${s.months} Months`, renew: i % 4 === 1 ? "No" : "Yes", place: PLACES[i % PLACES.length] };
}

function SubscribersModal({ plan, onClose }: { plan: SubscriptionPlan | null; onClose: () => void }) {
  const subs = useData((d) => (plan ? d.monetize.subscribers.filter((s) => s.planId === plan.id) : []));
  const col = "text-left text-[13px] font-medium uppercase";
  return (
    <SubsModal open={!!plan} onClose={onClose} width="min(1126px, 100vw)" testid="plan-subscribers" label={`${plan?.name ?? ""} Subscribers`}>
      <div className="flex items-start justify-between border-b border-bg px-[30px] pb-[16px] pt-[24px]">
        <div>
          <h2 className="text-[20px] font-bold capitalize">{plan?.name} Subscribers</h2>
          <p className="text-[14px]">{plan?.subscribers} Active Subscribers</p>
        </div>
        <button type="button" aria-label="Close" data-testid="plan-subscribers-close" onClick={onClose} className="text-white hover:text-accent">
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>
      <div className={`${scrollCls} mx-[30px] mb-[24px] h-[382px]`}>
        <table className="w-full table-fixed" data-testid="plan-subscribers-table">
          <thead>
            <tr className="h-[75px]">
              <th className={`${col} w-[30%]`}>Subscriber</th>
              <th className={`${col} w-[10%]`}>Duration</th>
              <th className={`${col} w-[20%]`}>Start Date</th>
              <th className={`${col} w-[20%]`}>End Date</th>
              <th className={`${col} w-[20%]`}>Auto-Renewal</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s, i) => {
              const r = subRow(s, i);
              return (
                <tr key={s.id} data-testid="plan-subscriber-row" className="h-[81px] border-b border-white/[.08] text-[14px]">
                  <td>
                    {/* TODO(not captured): where the name cell (pointer cursor) leads. */}
                    <div className="flex cursor-pointer items-center gap-[12px]">
                      <Avatar src={personAvatar(s.id)} size={40} ring={1} />
                      <span>
                        <span className="block font-bold">{s.name}</span>
                        {r.place && <span className="block">{r.place}</span>}
                      </span>
                    </div>
                  </td>
                  <td>{r.duration}</td>
                  <td>{r.start}</td>
                  <td>{r.end}</td>
                  <td>{r.renew}</td>
                </tr>
              );
            })}
            {!subs.length && (
              <tr>
                <td colSpan={5} className="py-[40px] text-center text-[16px]">
                  No Active Subscribers
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SubsModal>
  );
}
