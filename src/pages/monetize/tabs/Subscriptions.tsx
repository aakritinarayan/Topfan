/** Monetize › Subscriptions (14, 14a). */
import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { useData } from "../../../store/store";
import { benefitCountLabel, deletePlan, money } from "../../../store/slices/monetize";
import type { SubscriptionPlan } from "../../../store/model";
import type { PageProps } from "../../types";
import { ConfirmModal, MonetizeFrame, OutlinePill, Pill, useRun } from "../ui";

export const durationLabel = (p: SubscriptionPlan["prices"][number]) =>
  p.months === 1 ? "1 Month" : `${p.months} Months${p.discountPct ? ` (${p.discountPct}% OFF)` : ""}`;

export function SubscriptionsTab({ route }: PageProps) {
  const plans = useData((d) => d.monetize.plans);
  const { navigate } = useRouter();
  const [del, setDel] = useState<SubscriptionPlan | null>(null);
  const run = useRun();
  return (
    <MonetizeFrame routeId={route.id} active="monetize-subscription">
      <div className="flex justify-end">
        <Pill data-testid="monetize-add-plan" onClick={() => navigate(pathFor("monetize-plan-add"))}>
          Add New Plan
        </Pill>
      </div>
      <div className="mt-[16px] flex flex-col gap-[16px]">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} onEdit={() => navigate(pathFor("monetize-plan-edit", { planId: p.id }))} onDelete={() => setDel(p)} />
        ))}
      </div>
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
        {/* inferred copy */}
        Are you sure you want to delete <b>{del?.name}</b>? {del && del.subscribers > 0 ? `Its ${del.subscribers} active subscribers keep access until their current period ends.` : ""}
      </ConfirmModal>
    </MonetizeFrame>
  );
}

function PlanCard({ plan, onEdit, onDelete }: { plan: SubscriptionPlan; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const { navigate } = useRouter();
  return (
    <section data-testid={`monetize-plan-${plan.id}`} className="rounded-card bg-surface px-[30px] pb-[24px] pt-[20px]">
      <div className="flex h-[52px] items-center justify-between">
        <h4 className="text-[24px] font-medium">{plan.name}</h4>
        <div className="flex items-center gap-[18px]">
          <button type="button" aria-label={`Edit ${plan.name}`} data-testid={`monetize-plan-edit-${plan.id}`} onClick={onEdit} className="text-white hover:text-accent">
            <Pencil size={20} fill="currentColor" strokeWidth={1.5} />
          </button>
          <button type="button" aria-label={`Delete ${plan.name}`} data-testid={`monetize-plan-delete-${plan.id}`} onClick={onDelete} className="text-white hover:text-accent">
            <Trash2 size={21} strokeWidth={2.4} />
          </button>
        </div>
      </div>
      <div className="mt-[10px] flex flex-col gap-[12px]">
        {plan.prices.map((t) => (
          <div key={t.months} className="flex h-[61px] items-center gap-[12px] rounded-inner bg-bg px-[21px]">
            <span className="text-[18px] font-bold">{money(t.amount)}</span>
            <span className="rounded-[18px] border border-accent px-[10px] py-[3px] text-[12px] font-medium">{durationLabel(t)}</span>
            {!!t.freeTrialDays && (
              <span className="rounded-[14px] bg-[rgba(176,163,8,.2)] px-[16px] py-[5px] text-[12px] font-medium uppercase">{t.freeTrialDays}-Day Free Trial</span>
            )}
          </div>
        ))}
        <div className={`rounded-inner bg-bg ${open ? "border border-accent/70" : "border border-transparent"}`}>
          <button
            type="button"
            aria-expanded={open}
            data-testid={`monetize-plan-benefits-${plan.id}`}
            onClick={() => setOpen((o) => !o)}
            className="flex h-[59px] w-full items-center gap-[12px] px-[20px] text-left"
          >
            <span className="text-[18px] font-bold">Plan Benefits</span>
            <span className="rounded-[18px] border border-accent px-[10px] py-[3px] text-[12px] font-medium">{benefitCountLabel(plan.benefits.length)}</span>
            <span className="ml-auto">{open ? <ChevronUp size={26} /> : <ChevronDown size={26} />}</span>
          </button>
          {open && (
            <ul className="border-t border-white/[.12] px-[28px] pb-[20px] pt-[10px]">
              {plan.benefits.map((b) => (
                <li key={b} className="flex h-[36px] items-center gap-[20px] text-[16px] text-[#d0d0d0]">
                  <span className="h-[6px] w-[6px] rounded-full bg-white" />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-[16px] flex justify-end">
        <OutlinePill data-testid={`monetize-plan-subscribers-${plan.id}`} className="h-[29px] px-[12px]" onClick={() => navigate(pathFor("monetize-subscribers", { planId: plan.id }))}>
          {plan.subscribers} Active Subscribers
        </OutlinePill>
      </div>
    </section>
  );
}
