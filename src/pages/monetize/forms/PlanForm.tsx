/**
 * INFERRED (not captured): Add Plan / Edit Plan, and View Subscribers.
 * Fields follow what the plan card shows (name, 1/3/6/12-month prices with % OFF, free trials, benefits).
 * Creating a plan = content.write. Changing an existing plan's prices = Confirm + finance.write.
 */
import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { useData } from "../../../store/store";
import { addPlan, money, updatePlanDetails, updatePlanPrices } from "../../../store/slices/monetize";
import type { SubscriptionPlan } from "../../../store/model";
import type { PageProps } from "../../types";
import { durationLabel } from "../tabs/Subscriptions";
import { Checkbox, ConfirmModal, Field, FormPage, MiniSelect, Pill, TableCard, TextInput, td, th, useRun } from "../ui";

const MONTHS = [1, 3, 6, 12] as const;
type Tier = { on: boolean; amount: string; trial: string };
const TRIALS = ["No Free Trial", "1 Day", "3 Days", "7 Days", "14 Days", "30 Days"];
const trialDays = (t: string) => (t === "No Free Trial" ? 0 : parseInt(t, 10));

export function PlanFormPage({ route, params }: PageProps) {
  const plan = useData((d) => d.monetize.plans.find((p) => p.id === params.planId));
  if (route.id === "monetize-plan-edit" && !plan) return <Missing routeId={route.id} what="Plan" back="monetize-subscription" />;
  return <PlanForm routeId={route.id} plan={plan ?? null} key={plan?.id ?? "new"} />;
}

export function Missing({ routeId, what, back }: { routeId: string; what: string; back: string }) {
  const { navigate } = useRouter();
  return (
    <div data-testid={`page-${routeId}`} className="py-[40px]">
      <h1 className="text-[24px] font-bold">{what} not found</h1>
      <p className="mt-[8px] text-[14px] text-muted">It may have been deleted.</p>
      <Pill className="mt-[20px]" onClick={() => navigate(pathFor(back))}>
        Back
      </Pill>
    </div>
  );
}

function PlanForm({ routeId, plan }: { routeId: string; plan: SubscriptionPlan | null }) {
  const { navigate } = useRouter();
  const run = useRun();
  const [name, setName] = useState(plan?.name ?? "");
  const [tiers, setTiers] = useState<Record<number, Tier>>(() =>
    Object.fromEntries(
      MONTHS.map((m) => {
        const p = plan?.prices.find((x) => x.months === m);
        return [m, { on: m === 1 || !!p, amount: p ? String(p.amount) : "", trial: p?.freeTrialDays ? `${p.freeTrialDays} Day${p.freeTrialDays > 1 ? "s" : ""}` : "No Free Trial" }];
      }),
    ),
  );
  const [benefits, setBenefits] = useState<string[]>(plan?.benefits ?? []);
  const [benefit, setBenefit] = useState("");
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const monthly = Number(tiers[1].amount);
  const prices: SubscriptionPlan["prices"] = MONTHS.filter((m) => tiers[m].on).map((m) => {
    const amount = Math.round(Number(tiers[m].amount) * 100) / 100;
    const pct = m > 1 && monthly > 0 ? Math.round((1 - amount / (monthly * m)) * 100) : 0;
    const t = trialDays(tiers[m].trial);
    return { amount, months: m, ...(pct > 0 ? { discountPct: pct } : {}), ...(t ? { freeTrialDays: t } : {}) };
  });
  const errors = {
    name: name.trim() ? "" : "Plan Name is required",
    prices: MONTHS.some((m) => tiers[m].on && !(Number(tiers[m].amount) > 0)) ? "Enter a price for each selected duration" : "",
    benefits: benefits.length ? "" : "Add at least one benefit",
  };
  const valid = !Object.values(errors).some(Boolean);
  const pricesChanged = !!plan && JSON.stringify(plan.prices) !== JSON.stringify(prices);
  const back = pathFor("monetize-subscription");

  const save = () => {
    setTried(true);
    if (!valid) return;
    if (!plan) {
      if (run("monetize.addPlan", (d) => void addPlan(d, { name: name.trim(), prices, benefits }), "content.write", `${name.trim()} created`)) navigate(back);
      return;
    }
    if (pricesChanged) return setConfirm(true);
    if (run("monetize.updatePlan", (d) => updatePlanDetails(d, plan.id, { name: name.trim(), benefits }), "content.write", "Plan updated")) navigate(back);
  };
  const confirmPrices = () => {
    if (!plan) return;
    if (!run("monetize.updatePlanPrices", (d) => updatePlanPrices(d, plan.id, prices), "finance.write")) return setConfirm(false);
    if (run("monetize.updatePlan", (d) => updatePlanDetails(d, plan.id, { name: name.trim(), benefits }), "content.write", "Plan and prices updated")) navigate(back);
  };

  const addBenefit = () => {
    const b = benefit.trim();
    if (b && !benefits.includes(b)) setBenefits([...benefits, b]);
    setBenefit("");
  };

  return (
    <FormPage
      routeId={routeId}
      title={plan ? "Edit Plan" : "Add New Plan"}
      backTo={back}
      footer={
        <>
          <button type="button" data-testid="monetize-plan-cancel" onClick={() => navigate(back)} className="h-[40px] px-[16px] text-[14px] font-black uppercase hover:text-accent">
            Cancel
          </button>
          <Pill data-testid="monetize-plan-save" onClick={save}>
            {plan ? "Update Plan" : "Save Plan"}
          </Pill>
        </>
      }
    >
      <Field label="Plan Name" required error={tried ? errors.name : undefined} htmlFor="plan-name">
        <TextInput id="plan-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gold Plan" data-testid="monetize-plan-name" invalid={tried && !!errors.name} />
      </Field>
      <Field label="Pricing" required info="Set a monthly price, then optional 3, 6 and 12 month prices. The % OFF is worked out from the monthly price." error={tried ? errors.prices : undefined}>
        <div className="flex flex-col gap-[12px]">
          {MONTHS.map((m) => {
            const t = tiers[m];
            const shown = prices.find((p) => p.months === m);
            return (
              <div key={m} className="flex items-center gap-[16px] rounded-inner bg-bg px-[20px] py-[10px]" data-testid={`monetize-plan-tier-${m}`}>
                <span className="w-[130px]">
                  {m === 1 ? (
                    <span className="text-[16px] font-bold">1 Month</span>
                  ) : (
                    <Checkbox checked={t.on} onChange={() => setTiers({ ...tiers, [m]: { ...t, on: !t.on } })} label={`${m} Months`} testid={`monetize-plan-tier-${m}-on`}>
                      <span className="text-[16px] font-bold">{m} Months</span>
                    </Checkbox>
                  )}
                </span>
                <label className="flex h-[40px] w-[150px] items-center rounded-pill bg-surface px-[16px] text-[14px] font-bold">
                  $
                  <input
                    aria-label={`${m} month price`}
                    data-testid={`monetize-plan-price-${m}`}
                    disabled={!t.on}
                    inputMode="decimal"
                    value={t.amount}
                    onChange={(e) => setTiers({ ...tiers, [m]: { ...t, amount: e.target.value.replace(/[^0-9.]/g, "") } })}
                    className="ml-[4px] w-full bg-transparent outline-none disabled:opacity-50"
                    placeholder="0.00"
                  />
                </label>
                <span className="w-[170px] text-[12px]">
                  {t.on && shown && shown.amount > 0 && <span className="rounded-[18px] border border-accent px-[10px] py-[3px]">{durationLabel(shown)}</span>}
                </span>
                <MiniSelect label={`${m} month free trial`} testid={`monetize-plan-trial-${m}`} value={t.trial} options={TRIALS} onChange={(v) => setTiers({ ...tiers, [m]: { ...t, trial: v } })} width={170} className="text-[13px] font-bold" />
              </div>
            );
          })}
        </div>
      </Field>
      <Field label="Plan Benefits" required error={tried ? errors.benefits : undefined}>
        <div className="flex gap-[12px]">
          <TextInput value={benefit} onChange={(e) => setBenefit(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addBenefit()} placeholder="e.g. Exclusive Videos" data-testid="monetize-plan-benefit-input" aria-label="New benefit" />
          <Pill className="!h-[55px]" data-testid="monetize-plan-benefit-add" onClick={addBenefit} disabled={!benefit.trim()}>
            Add
          </Pill>
        </div>
        <ul className="mt-[12px] flex flex-col gap-[8px]">
          {benefits.map((b) => (
            <li key={b} className="flex h-[44px] items-center justify-between rounded-inner bg-bg px-[20px] text-[15px] text-[#d0d0d0]">
              {b}
              <button type="button" aria-label={`Remove ${b}`} onClick={() => setBenefits(benefits.filter((x) => x !== b))} className="hover:text-accent">
                <X size={18} />
              </button>
            </li>
          ))}
        </ul>
      </Field>

      <ConfirmModal open={confirm} title="Change Plan Prices" confirmLabel="Change Prices" testid="monetize-plan-prices" onClose={() => setConfirm(false)} onConfirm={confirmPrices}>
        <p>You're changing the prices of <b>{plan?.name}</b>:</p>
        <ul className="mt-[12px] text-[14px]">
          {prices.map((p) => {
            const old = plan?.prices.find((x) => x.months === p.months);
            return (
              <li key={p.months}>
                {durationLabel(p)}: {old ? money(old.amount) : "—"} → <b>{money(p.amount)}</b>
              </li>
            );
          })}
        </ul>
        <p className="mt-[12px] text-[14px] text-muted">New prices apply to new subscribers and at existing subscribers' next renewal.</p>
      </ConfirmModal>
    </FormPage>
  );
}

/** INFERRED: View Subscribers (from the "N ACTIVE SUBSCRIBERS" pill). */
export function SubscribersPage({ route, params }: PageProps) {
  const plan = useData((d) => d.monetize.plans.find((p) => p.id === params.planId));
  const subs = useData((d) => d.monetize.subscribers.filter((s) => s.planId === params.planId));
  const { navigate } = useRouter();
  if (!plan) return <Missing routeId={route.id} what="Plan" back="monetize-subscription" />;
  return (
    <div data-testid={`page-${route.id}`} className="max-w-[939px]">
      <div className="flex items-center gap-[20px]">
        <button type="button" aria-label="Back" data-testid="monetize-subscribers-back" onClick={() => navigate(pathFor("monetize-subscription"))} className="hover:text-accent">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[24px] font-bold">
          {plan.name} Subscribers ({plan.subscribers})
        </h1>
      </div>
      <TableCard className="mt-[26px]">
        <table className="w-full" data-testid="monetize-subscribers-table">
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Username</th>
              <th className={th}>Plan Duration</th>
              <th className={th}>Subscribed Since</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id}>
                <td className={td}>{s.name}</td>
                <td className={td}>@{s.username}</td>
                <td className={td}>{s.months === 1 ? "1 Month" : `${s.months} Months`}</td>
                <td className={td}>{new Date(`${s.since}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
              </tr>
            ))}
            {!subs.length && (
              <tr>
                <td colSpan={4} className={`${td} py-[40px] text-center text-[16px] text-[#c8c8c8]`}>
                  No Active Subscribers
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
