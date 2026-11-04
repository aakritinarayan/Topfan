/**
 * Monetize › Subscriptions › Create New Plan (/monetize/subscription/create) and Update Plan (card pencil).
 * Built from the aj-white-subscriptions reference pack (CLAUDE_CODE_PROMPT.md §6–§10, screenshots 07–26).
 * Mock only: saving changes the mock store. Creating a plan = content.write; changing an existing plan's
 * prices = Confirm + finance.write (consequential, so the creator approves it first).
 */
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { useData } from "../../../store/store";
import { DM_LINE, addPlan, dmLine, money, updatePlanDetails, updatePlanPrices, type Product } from "../../../store/slices/monetize";
import type { DmCount, PlanInclude, SubscriptionPlan } from "../../../store/model";
import type { PageProps } from "../../types";
import { durationLabel } from "../tabs/Subscriptions";
import { ConfirmModal, MonetizeFrame, Pill, TableCard, td, th, useRun } from "../ui";
import { ImageSlot } from "../../../platform/ui/surfaces";
import { BENEFIT_OPTIONS, BenefitsSelect, Circle, CoinButton, CurrencyModal, DateField, DmPriceModal, Info, NoYes, ScrollStyle, inputCls, scrollCls } from "./plan/parts";

/* ------------------------------------------------------------ packages */

type TierKey = "1" | "3" | "6" | "12" | "season" | "lifetime";
const TIERS: { key: TierKey; label: string; months?: 1 | 3 | 6 | 12 }[] = [
  { key: "1", label: "1 Month", months: 1 },
  // Copy quirk kept: "3 Month" here, "3 Months" on the list.
  { key: "3", label: "3 Month", months: 3 },
  { key: "6", label: "6 Month", months: 6 },
  { key: "12", label: "12 Month", months: 12 },
  { key: "season", label: "Season Pass" },
  { key: "lifetime", label: "Lifetime" },
];
const DEFAULT_DISCOUNT: Partial<Record<TierKey, number>> = { "3": 10, "6": 20, "12": 30 };
const DM_COUNTS: DmCount[] = ["Zero", "5", "10", "25", "50", "100", "Unlimited"];

type ExpPick = { productId: string; perMonth: string; option: string };
interface Tier {
  on: boolean;
  open: boolean;
  discount: string;
  price: string;
  trial: string;
  endDate: string;
  expOn: boolean;
  merchOn: boolean;
  exps: ExpPick[];
  merch: string[];
  currency?: Record<string, string>;
}
const blank = (on = false): Tier => ({ on, open: false, discount: "", price: "", trial: "", endDate: "", expOn: false, merchOn: false, exps: [], merch: [] });
const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
const fix2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

const EXP_INFO =
  "Select optional free Experiences and respective Options to include in this subscription plan duration. You can also select how many times a Subscriber can redeem the Experience per month (e.g., Two 30 min coaching sessions per month). Subscriber will receive new codes to redeem this Experience each month, so long as they are an active subscriber, but they must use codes within the month or it expires. For example, if a fan pre-pays for 3 months of a subscription, they will receive new codes for 3 months.";
const MERCH_INFO =
  "Select optional Merchandise to include in this subscription plan duration. Subscriber will receive a code to redeem one free item from selected merchandise items. Subscriber still pays for Shipping & Taxes. Important: A new code is provided upon renewal of the term, so if you only want yearly subscribers to receive a free item, don't enable this for 1, 3, and 6 month terms.";
// TODO(not captured): the info texts for Direct Messages and the Monetize header popover position on this form.
const DM_INFO = "How many direct messages a subscriber on this plan can send you each month for free. After that, each message costs the price below.";

const TYPE_LABEL: Record<string, string> = {
  "1:1 Video Call": "One to One Call / Video Conferencing",
  "In Person Session": "In-Person Meetup",
  "Personalized Video": "Personalized Video",
  "Social Media Interaction": "Social Media Follow or Post",
  Other: "Custom Experience",
};
/** Experience options the pack did not expand (§7): mock values, used only when the product has none of its own. */
const MOCK_OPTIONS: Record<string, { label: string; price: number }[]> = {
  "exp-social": [{ label: "Comment on a Post", price: 100 }, { label: "Follow on Social Media", price: 100 }],
  "exp-park": [{ label: "1 Hour", price: 250 }, { label: "2 Hours", price: 400 }],
};
/** Reference order (Hometown Hero, Rewind, Custom X there; this app's equivalents here), then anything else. */
const MERCH_ORDER = ["merch-hero", "merch-throwback", "merch-spectrum"];
const rank = (id: string) => (MERCH_ORDER.includes(id) ? MERCH_ORDER.indexOf(id) : MERCH_ORDER.length);
const optionsOf = (p: Product) => p.durations ?? p.experienceOptions ?? MOCK_OPTIONS[p.id] ?? [{ label: p.title, price: p.price ?? 0 }];

/* ------------------------------------------------------------ page */

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

function initialTiers(plan: SubscriptionPlan | null): Record<TierKey, Tier> {
  const out = Object.fromEntries(TIERS.map((t) => [t.key, blank(!plan && t.key === "1")])) as Record<TierKey, Tier>;
  if (!plan) return out;
  for (const p of plan.prices) {
    out[String(p.months) as TierKey] = { ...blank(true), price: fix2(p.amount), discount: p.discountPct ? String(p.discountPct) : "", trial: p.freeTrialDays ? String(p.freeTrialDays) : "" };
  }
  for (const x of plan.extraTiers ?? []) out[x.kind] = { ...blank(true), price: fix2(x.amount), endDate: x.endDate ?? "", trial: x.freeTrialDays ? String(x.freeTrialDays) : "" };
  for (const [k, inc] of Object.entries(plan.includes ?? {})) {
    const t = out[k as TierKey];
    if (!t) continue;
    t.exps = (inc.experiences ?? []).map((e) => ({ productId: e.productId, perMonth: String(e.perMonth), option: e.option }));
    t.merch = inc.merchIds ?? [];
    t.expOn = !!t.exps.length;
    t.merchOn = !!t.merch.length;
  }
  return out;
}

function PlanForm({ routeId, plan }: { routeId: string; plan: SubscriptionPlan | null }) {
  const { navigate } = useRouter();
  const run = useRun();
  const products = useData((d) => d.monetize.products);
  const experiences = useMemo(() => products.filter((p) => p.kind === "experience" && p.published).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [products]);
  const merch = useMemo(() => products.filter((p) => p.kind === "merchandise" && p.published && p.source === "shopify").sort((a, b) => rank(a.id) - rank(b.id)), [products]);

  const [name, setName] = useState(plan?.name ?? "");
  const [nameTouched, setNameTouched] = useState(false);
  const [tiers, setTiers] = useState(() => initialTiers(plan));
  const [dm, setDm] = useState<DmCount | null>(plan?.dmCount ?? (plan ? dmFromBenefits(plan.benefits) : null));
  const [dmPrice, setDmPrice] = useState(plan?.dmPrice ?? 1);
  const [dmModal, setDmModal] = useState(false);
  const startBenefits = (plan?.benefits ?? []).filter((b) => !DM_LINE.test(b));
  const [benefitOptions, setBenefitOptions] = useState(() => [...BENEFIT_OPTIONS, ...startBenefits.filter((b) => !BENEFIT_OPTIONS.includes(b))]);
  const [benefits, setBenefits] = useState<string[]>(startBenefits);
  const [currencyFor, setCurrencyFor] = useState<TierKey | null>(null);
  const [confirm, setConfirm] = useState(false);
  const back = pathFor("monetize-subscription");

  const set = (k: TierKey, patch: Partial<Tier>) => setTiers((all) => ({ ...all, [k]: { ...all[k], ...patch } }));

  /** Observed: a 1 Month price fills 3/6/12 Month at 10/20/30% off and checks them. Season Pass and Lifetime are left alone. */
  const setMonthly = (v: string) =>
    setTiers((all) => {
      const next = { ...all, "1": { ...all["1"], price: v } };
      const p = num(v);
      // TODO(not captured): the rules when 1 Month is unchecked, the price is cleared, or a longer tier was edited by hand.
      if (!all["1"].on || !(p > 0)) return next;
      for (const t of TIERS) {
        if (!t.months || t.months === 1) continue;
        const d = num(all[t.key].discount) >= 0 ? num(all[t.key].discount) : DEFAULT_DISCOUNT[t.key]!;
        next[t.key] = { ...all[t.key], on: true, discount: String(d), price: fix2(p * t.months * (1 - d / 100)) };
      }
      return next;
    });
  /** TODO(not captured): editing a discount was not exercised; it recalculates the total with the same formula. */
  const setDiscount = (k: TierKey, v: string) => {
    const t = TIERS.find((x) => x.key === k)!;
    const p = num(tiers["1"].price);
    const d = num(v);
    set(k, { discount: v, ...(p > 0 && d >= 0 && d < 100 ? { price: fix2(p * t.months! * (1 - d / 100)) } : {}) });
  };

  const active = TIERS.filter((t) => tiers[t.key].on).length;
  const priced = (k: TierKey) => num(tiers[k].price) > 0;
  const includeOk = TIERS.every((t) => {
    const x = tiers[t.key];
    return (!x.expOn || (x.exps.length > 0 && x.exps.every((e) => num(e.perMonth) >= 1 && !!e.option))) && (!x.merchOn || x.merch.length > 0);
  });
  // Observed minimum was not isolated (§9). Implemented: name, one checked package with a price, one benefit, Yes toggles need a pick.
  // Also: a checked Season Pass with a price needs its Plan End Date*.
  const valid =
    !!name.trim() &&
    TIERS.some((t) => tiers[t.key].on && priced(t.key)) &&
    benefits.length > 0 &&
    includeOk &&
    !(tiers.season.on && priced("season") && !tiers.season.endDate);

  const build = () => {
    const live = TIERS.filter((t) => tiers[t.key].on && priced(t.key));
    const prices: SubscriptionPlan["prices"] = live
      .filter((t) => t.months)
      .map((t) => {
        const x = tiers[t.key];
        const d = num(x.discount);
        const trial = num(x.trial);
        return { amount: Math.round(num(x.price) * 100) / 100, months: t.months!, ...(t.months! > 1 && d > 0 ? { discountPct: d } : {}), ...(trial > 0 ? { freeTrialDays: trial } : {}) };
      });
    const extraTiers = live
      .filter((t) => !t.months)
      .map((t) => {
        const x = tiers[t.key];
        const trial = num(x.trial);
        return { kind: t.key as "season" | "lifetime", amount: Math.round(num(x.price) * 100) / 100, ...(t.key === "season" ? { endDate: x.endDate } : {}), ...(trial > 0 ? { freeTrialDays: trial } : {}) };
      });
    const includes: Record<string, PlanInclude> = {};
    for (const t of live) {
      const x = tiers[t.key];
      const inc: PlanInclude = {};
      if (x.expOn) inc.experiences = x.exps.map((e) => ({ productId: e.productId, perMonth: num(e.perMonth), option: e.option }));
      if (x.merchOn) inc.merchIds = x.merch;
      if (inc.experiences || inc.merchIds) includes[t.key] = inc;
    }
    const dmBullet = dmLine(dm);
    return {
      name: name.trim(),
      prices,
      extraTiers,
      includes,
      dmCount: dm,
      dmPrice,
      benefits: dmBullet ? [...benefits, dmBullet] : benefits,
    };
  };

  const save = () => {
    if (!valid) return;
    const p = build();
    // TODO(not captured): a successful Create Plan / Update Plan (destination and any success toast). Never submitted on the live site.
    if (!plan) {
      if (run("monetize.addPlan", (d) => void addPlan(d, p), "content.write", `${p.name} created`)) navigate(back);
      return;
    }
    const pricesChanged = JSON.stringify(plan.prices) !== JSON.stringify(p.prices) || JSON.stringify(plan.extraTiers ?? []) !== JSON.stringify(p.extraTiers);
    if (pricesChanged) return setConfirm(true);
    const { prices: _prices, ...details } = p;
    if (run("monetize.updatePlan", (d) => updatePlanDetails(d, plan.id, details), "content.write", "Plan updated")) navigate(back);
  };
  const confirmPrices = () => {
    if (!plan) return;
    const { prices, ...details } = build();
    if (!run("monetize.updatePlanPrices", (d) => updatePlanPrices(d, plan.id, prices), "finance.write")) return setConfirm(false);
    if (run("monetize.updatePlan", (d) => updatePlanDetails(d, plan.id, details), "content.write", "Plan and prices updated")) navigate(back);
  };
  const confirmRows = confirm ? build() : null;

  return (
    <MonetizeFrame routeId={routeId} active="monetize-subscription">
      <ScrollStyle />
      <div className="-mt-[7px] flex h-[42px] items-center gap-[16px]">
        <button type="button" aria-label="Back" data-testid="monetize-form-back" onClick={() => navigate(back)} className="text-white hover:text-accent">
          <ArrowLeft size={26} />
        </button>
        <h1 data-testid="plan-form-title" className="text-[24px] font-bold">
          {plan ? "Update Plan" : "Create New Plan"}
        </h1>
      </div>

      <div className="mb-[20px] mt-[10px] rounded-[30px] bg-surface px-[30px] pb-[40px] pt-[10px]" data-testid="plan-form">
        {/* A. Name */}
        <label htmlFor="plan-name" className="mt-[20px] block text-[16px]">
          Name *
        </label>
        <input
          id="plan-name"
          data-testid="monetize-plan-name"
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setNameTouched(true)}
          placeholder="Enter plan name that is displayed to Users"
          className={`${inputCls} mt-[16px] bg-bg`}
        />
        {nameTouched && !name.trim() && (
          <p data-testid="plan-name-error" className="ml-[2px] mt-[8px] text-[12px] font-medium text-accent">
            * Name is required
          </p>
        )}

        {/* B. Duration Packages */}
        <div className="mb-[15px] mt-[16px] flex items-center gap-[12px]">
          <span className="text-[16px] font-bold">Duration Packages *</span>
          <span data-testid="plan-active-count" className="rounded-[20px] bg-accent px-[12px] py-[4px] text-[12px] font-semibold">
            {active} Active
          </span>
        </div>
        {TIERS.map((t) => (
          <TierCard
            key={t.key}
            def={t}
            tier={tiers[t.key]}
            set={(patch) => set(t.key, patch)}
            onMonthly={setMonthly}
            onDiscount={(v) => setDiscount(t.key, v)}
            onCurrency={() => setCurrencyFor(t.key)}
            experiences={experiences}
            merch={merch}
          />
        ))}

        {/* C. Direct Messages */}
        <p className="mt-[49px] flex items-center text-[16px]">
          Number of Free Direct Messages per Month Included In Plan
          <Info text={DM_INFO} testid="plan-dm-info" />
        </p>
        <div role="radiogroup" aria-label="Free direct messages per month" className="mt-[16px] flex flex-wrap gap-[8px]">
          {DM_COUNTS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={dm === c}
              data-testid={`plan-dm-${c.toLowerCase()}`}
              onClick={() => setDm(c)}
              className={`h-[49px] rounded-pill border border-accent px-[30px] text-[14px] font-black ${dm === c ? "bg-accent" : ""}`}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="mt-[16px] flex items-center gap-[8px] text-[14px]">
          Price to Send You an Individual Direct Message: <span data-testid="plan-dm-price-value">{money(dmPrice)}</span>
          <button type="button" aria-label="Edit price per direct message" data-testid="plan-dm-price-edit" onClick={() => setDmModal(true)} className="hover:text-accent">
            <Pencil size={18} fill="currentColor" strokeWidth={1.5} />
          </button>
        </p>

        {/* D. Plan Benefits */}
        <p className="mb-[16px] mt-[22px] text-[16px]">Plan Benefits*</p>
        <BenefitsSelect options={benefitOptions} value={benefits} onChange={setBenefits} onOptions={setBenefitOptions} />
      </div>

      <div className="mb-[40px] flex items-center gap-[12px]">
        <Pill data-testid="monetize-plan-save" disabled={!valid} onClick={save} className="min-w-[136px]">
          {plan ? "Update Plan" : "Create Plan"}
        </Pill>
        <button type="button" data-testid="monetize-plan-cancel" onClick={() => navigate(back)} className="h-[40px] px-[16px] text-[14px] font-black uppercase hover:text-accent">
          Cancel
        </button>
      </div>

      <CurrencyModal
        open={!!currencyFor}
        base={currencyFor ? num(tiers[currencyFor].price) || 0 : 0}
        value={currencyFor ? tiers[currencyFor].currency : undefined}
        onClose={() => setCurrencyFor(null)}
        onSave={(v) => {
          if (currencyFor) set(currencyFor, { currency: v });
          setCurrencyFor(null);
        }}
      />
      <DmPriceModal open={dmModal} value={dmPrice} onClose={() => setDmModal(false)} onSave={(v) => (setDmPrice(v), setDmModal(false))} />

      <ConfirmModal open={confirm} title="Change Plan Prices" confirmLabel="Change Prices" testid="monetize-plan-prices" onClose={() => setConfirm(false)} onConfirm={confirmPrices}>
        <p>
          You're changing the prices of <b>{plan?.name}</b>:
        </p>
        <ul className="mt-[12px] text-[14px]">
          {confirmRows?.prices.map((p) => {
            const old = plan?.prices.find((x) => x.months === p.months);
            return (
              <li key={p.months}>
                {durationLabel(p)}: {old ? money(old.amount) : "—"} → <b>{money(p.amount)}</b>
              </li>
            );
          })}
          {confirmRows?.extraTiers.map((x) => {
            const old = plan?.extraTiers?.find((o) => o.kind === x.kind);
            return (
              <li key={x.kind}>
                {x.kind === "season" ? "Season Pass" : "Lifetime"}: {old ? money(old.amount) : "—"} → <b>{money(x.amount)}</b>
              </li>
            );
          })}
        </ul>
        <p className="mt-[12px] text-[14px] text-muted">New prices apply to new subscribers and at existing subscribers' next renewal.</p>
      </ConfirmModal>
    </MonetizeFrame>
  );
}

const dmFromBenefits = (benefits: string[]): DmCount | null => {
  const m = benefits.map((b) => DM_LINE.exec(b)).find(Boolean);
  return m && (DM_COUNTS as string[]).includes(m[1]) ? (m[1] as DmCount) : null;
};

/* ------------------------------------------------------------ one package */

function TierCard({
  def,
  tier,
  set,
  onMonthly,
  onDiscount,
  onCurrency,
  experiences,
  merch,
}: {
  def: (typeof TIERS)[number];
  tier: Tier;
  set: (patch: Partial<Tier>) => void;
  onMonthly: (v: string) => void;
  onDiscount: (v: string) => void;
  onCurrency: () => void;
  experiences: Product[];
  merch: Product[];
}) {
  const id = `plan-tier-${def.key}`;
  const chips = [
    num(tier.price) > 0 ? money(num(tier.price)) : null,
    tier.expOn && tier.exps.length ? `${tier.exps.length} Experience${tier.exps.length === 1 ? "" : "s"}` : null,
    tier.merchOn && tier.merch.length ? `${tier.merch.length} Merchandise` : null,
  ].filter(Boolean) as string[];
  const label = "text-[16px] leading-[20px]";
  return (
    <div data-testid={id} data-on={tier.on ? "true" : "false"} data-open={tier.open ? "true" : "false"} className={`mb-[12px] rounded-[16px] border bg-bg transition-[border-color] duration-200 ${tier.on ? "border-accent/45" : "border-transparent"}`}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={tier.open}
        data-testid={`${id}-header`}
        onClick={() => set({ open: !tier.open })}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && (e.preventDefault(), set({ open: !tier.open }))}
        className="flex h-[62px] cursor-pointer select-none items-center justify-between px-[20px]"
      >
        <span className="flex items-center gap-[14px]">
          <Circle
            on={tier.on}
            label={`${def.label} active`}
            testid={`${id}-check`}
            onClick={(e) => {
              e.stopPropagation();
              set({ on: !tier.on });
            }}
          />
          <span className="text-[16px] font-bold">{def.label}</span>
        </span>
        <span className="flex items-center gap-[12px]">
          {tier.on && <span className="rounded-[20px] bg-accent/75 px-[14px] py-[5px] text-[12px] font-semibold uppercase">Active</span>}
          {tier.open ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
        </span>
      </div>

      {!tier.open && chips.length > 0 && (
        <div data-testid={`${id}-chips`} className="flex flex-wrap gap-[8px] px-[20px] pb-[16px]">
          {chips.map((c) => (
            <span key={c} className="rounded-[16px] bg-accent/75 px-[18px] py-[8px] text-[12px] font-medium leading-none">
              {c}
            </span>
          ))}
        </div>
      )}

      {tier.open && (
        <div className="border-t border-bg px-[20px] pb-[20px]">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_auto] items-end gap-[12px] border-t border-surface pt-[16px]">
            <div>
              {def.months && def.months > 1 && (
                <>
                  <span className={label}>Duration Discount from 1 Month Price</span>
                  <input aria-label={`${def.label} discount`} data-testid={`${id}-discount`} inputMode="decimal" value={tier.discount} onChange={(e) => onDiscount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 10" className={`${inputCls} mt-[16px] bg-surface`} />
                </>
              )}
              {def.key === "season" && (
                <>
                  <span className={label}>Plan End Date*</span>
                  <DateField value={tier.endDate} onChange={(v) => set({ endDate: v })} testid={`${id}-date`} />
                </>
              )}
            </div>
            <div>
              <span className={`${label} whitespace-nowrap`}>Total Price for Duration *</span>
              <div className="relative mt-[16px]">
                <input
                  aria-label={`${def.label} total price`}
                  data-testid={`${id}-price`}
                  inputMode="decimal"
                  maxLength={def.key === "1" ? 6 : undefined}
                  value={tier.price}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, "");
                    if (def.key === "1") onMonthly(v);
                    else set({ price: v });
                  }}
                  placeholder={def.key === "1" ? "Enter price" : "e.g. $232"}
                  className={`${inputCls} bg-surface pr-[50px]`}
                />
                <CoinButton disabled={!tier.price} onClick={onCurrency} testid={`${id}-currency`} />
              </div>
            </div>
            <div>
              <span className={`${label} whitespace-nowrap`}>Optional Free Trial Period</span>
              {/* TODO(not captured): range validation for price and trial days. */}
              <input aria-label={`${def.label} free trial days`} data-testid={`${id}-trial`} type="number" min={0} value={tier.trial} onChange={(e) => set({ trial: e.target.value })} placeholder="Enter Number Of Days" className={`${inputCls} mt-[16px] bg-surface [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`} />
            </div>
            <span />
          </div>

          <IncludeRow
            first
            title="Include Free Experiences (Per Month) in Plan Duration"
            info={EXP_INFO}
            yes={tier.expOn}
            onYes={(v) => set({ expOn: v })}
            testid={`${id}-exp`}
          >
            <p className="mb-[16px] text-[16px] font-semibold">Select Experiences &amp; Options *</p>
            <div className="flex flex-col gap-[12px]">
              {experiences.map((p) => {
                const pick = tier.exps.find((e) => e.productId === p.id);
                const opts = optionsOf(p);
                const toggle = () => set({ exps: pick ? tier.exps.filter((e) => e !== pick) : [...tier.exps, { productId: p.id, perMonth: "1", option: opts[0].label }] });
                const edit = (patch: Partial<ExpPick>) => set({ exps: tier.exps.map((e) => (e === pick ? { ...e, ...patch } : e)) });
                return (
                  <div key={p.id} data-testid={`${id}-exp-${p.id}`} className={`rounded-[16px] border bg-bg ${pick ? "border-accent/45" : "border-transparent"}`}>
                    <button type="button" role="checkbox" aria-checked={!!pick} data-testid={`${id}-exp-${p.id}-pick`} onClick={toggle} className="flex w-full items-center gap-[16px] p-[20px] text-left">
                      <Circle on={!!pick} label={p.title} />
                      <span>
                        <span className="block text-[15px] font-semibold">{p.title}</span>
                        {/* Copy quirk kept: "1 duration options" is not singularised. */}
                        <span className="block text-[13px]">
                          {TYPE_LABEL[p.experienceType ?? ""] ?? p.experienceType} · {opts.length} duration options
                        </span>
                      </span>
                    </button>
                    {pick && (
                      <>
                        <div className="border-t border-white/[.08] px-[20px] py-[16px]">
                          <label className="text-[16px]">
                            Number of Included Free Experiences Each Month*
                            <input
                              data-testid={`${id}-exp-${p.id}-count`}
                              type="number"
                              min={1}
                              value={pick.perMonth}
                              onChange={(e) => edit({ perMonth: e.target.value })}
                              placeholder="Enter Times a Fan Can Avail Free"
                              className={`${inputCls} mt-[16px] bg-surface [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
                            />
                          </label>
                        </div>
                        <div className="border-t border-white/[.08] px-[20px] pb-[20px] pt-[16px]">
                          <p className="text-[14px] font-semibold">Select which Experience Options Fan can Redeem for Free *</p>
                          <div role="radiogroup" aria-label={`${p.title} options`} className="mt-[12px] grid grid-cols-2 gap-[12px]">
                            {opts.map((o) => {
                              const on = pick.option === o.label;
                              return (
                                <button
                                  key={o.label}
                                  type="button"
                                  role="radio"
                                  aria-checked={on}
                                  data-testid={`${id}-exp-${p.id}-opt`}
                                  onClick={() => edit({ option: o.label })}
                                  className={`flex h-[76px] items-center gap-[12px] rounded-[12px] border bg-surface px-[16px] text-left ${on ? "border-accent/45" : "border-transparent"}`}
                                >
                                  <span className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-accent" : "border-white/40"}`}>{on && <span className="h-[10px] w-[10px] rounded-full bg-accent" />}</span>
                                  <span>
                                    <span className="block text-[15px] font-semibold">{o.label}</span>
                                    <span className="block text-[13px]">Regular Price: {money(o.price)}</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </IncludeRow>

          <IncludeRow title="Include One Free Merchandise Item Per Duration Term" info={MERCH_INFO} yes={tier.merchOn} onYes={(v) => set({ merchOn: v })} testid={`${id}-merch`}>
            <p className="mb-[16px] text-[16px] font-semibold">Select Redeemable Merchandise Items. Fan can choose only one item per term. *</p>
            <div className="flex flex-col gap-[12px]">
              {merch.map((p) => {
                const on = tier.merch.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    data-testid={`${id}-merch-${p.id}`}
                    onClick={() => set({ merch: on ? tier.merch.filter((x) => x !== p.id) : [...tier.merch, p.id] })}
                    className={`flex h-[86px] items-center gap-[16px] rounded-[16px] border bg-bg px-[20px] text-left ${on ? "border-accent/45" : "border-transparent"}`}
                  >
                    <Circle on={on} label={p.title} />
                    <ImageSlot src={p.image} label={p.title} kind="product" className="h-[44px] w-[44px] shrink-0" rounded="rounded-[8px]" />
                    <span>
                      <span className="block text-[15px] font-semibold">{p.title}</span>
                      <span className="block text-[13px]">
                        {money(p.price ?? 0)} | <span className="text-accent">Shopify</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </IncludeRow>
        </div>
      )}
    </div>
  );
}

function IncludeRow({ title, info, yes, onYes, testid, first, children }: { title: string; info: string; yes: boolean; onYes: (v: boolean) => void; testid: string; first?: boolean; children: React.ReactNode }) {
  return (
    <div data-testid={testid} className={`rounded-[20px] bg-surface p-[20px] ${first ? "mt-[24px]" : "mt-[16px]"}`}>
      <div className="flex items-center justify-between gap-[16px]">
        <span className="flex items-center text-[16px] font-semibold">
          {title}
          <Info text={info} testid={`${testid}-info`} />
        </span>
        <NoYes yes={yes} onChange={onYes} testid={`${testid}-toggle`} label={title} />
      </div>
      {yes && (
        <div className={`${scrollCls} mt-[20px] max-h-[325px] border-t border-bg pr-[8px] pt-[20px]`} data-testid={`${testid}-list`}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ View Subscribers page (old route) */

/** INFERRED: the old View Subscribers page. The list now opens the Subscribers modal (§5); this route stays so older links work. */
export function SubscribersPage({ route, params }: PageProps) {
  const plan = useData((d) => d.monetize.plans.find((p) => p.id === params.planId));
  const subs = useData((d) => d.monetize.subscribers.filter((s) => s.planId === params.planId));
  const { navigate } = useRouter();
  if (!plan) return <Missing routeId={route.id} what="Plan" back="monetize-subscription" />;
  return (
    <div data-testid={`page-${route.id}`} className="max-w-[939px]">
      <div className="flex items-center gap-[20px]">
        <button type="button" aria-label="Back" data-testid="monetize-subscribers-back" onClick={() => navigate(pathFor("monetize-subscription"))} className="hover:text-accent">
          <ArrowLeft size={24} />
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
