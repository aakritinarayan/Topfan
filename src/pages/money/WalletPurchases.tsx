/**
 * 15d Wallet › My Purchases (the creator as a fan of other creators): 13 inner tabs, each a route
 * (/wallet/my-purchases = Subscription Plans, /wallet/my-purchases/:category for the rest). 15x = table skeleton.
 */
import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Gift, Newspaper, Ticket, Trash2, Briefcase, Crown } from "lucide-react";
import type { PageProps } from "../types";
import { useRouter } from "../../app/router";
import { pathFor } from "../../app/routeCatalog";
import { act, useData, useMockLoading } from "../../store/store";
import { cancelAutoRenewal, removePurchasedPlan, renewPlan, type PurchaseCategory, type PurchasedPlan, type PurchaseRow } from "../../store/slices/money";
import { Avatar, ImageSlot, Modal, NoticeBox } from "../../platform/ui/surfaces";
import { useToast } from "../../platform/ui/toast";
import { WalletLayout } from "./WalletLayout";
import { Btn, EmptyState, fmtDate, InlineError, OutlineBtn, TableCard, TableSkeleton, TabPill, Td, TextBtn, Th, usd } from "./ui";

const INNER: { slug: PurchaseCategory | null; label: string }[] = [
  { slug: null, label: "Subscription Plans" },
  { slug: "newsletter", label: "Newsletter" },
  { slug: "merchandise", label: "Merchandise Orders" },
  { slug: "courses", label: "Courses" },
  { slug: "experiences", label: "Experiences" },
  { slug: "tips", label: "Tips" },
  { slug: "content", label: "Feed Content" },
  { slug: "messages", label: "Direct Messages" },
  { slug: "vip-offers", label: "VIP Offers" },
  { slug: "downloadables", label: "Downloadables" },
  { slug: "livestreams", label: "Livestreams" },
  { slug: "portfolio", label: "Portfolios" },
  { slug: "tickets", label: "Tickets" },
];

export function WalletPurchases({ route, params }: PageProps) {
  const { navigate } = useRouter();
  const cat = (params.category ?? null) as PurchaseCategory | null;
  const known = cat === null || INNER.some((i) => i.slug === cat);
  useEffect(() => {
    if (!known) navigate(pathFor("wallet-purchases"), { replace: true });
  }, [known, navigate]);
  const loading = useMockLoading(900, cat);

  return (
    <WalletLayout routeId={route.id} active="wallet-purchases">
      <div className="-mt-[9px] border-t border-surface-2 pt-[20px]">
        <nav aria-label="My Purchases" className="flex flex-wrap gap-x-[8px] gap-y-[16px]">
          {INNER.map((t) => {
            const to = t.slug ? pathFor("wallet-purchases-category", { category: t.slug }) : pathFor("wallet-purchases");
            return (
              <TabPill key={t.label} href={to} active={t.slug === cat} onClick={() => navigate(to)} testid={`wallet-purchases-tab-${t.slug ?? "subscriptions"}`}>
                {t.label}
              </TabPill>
            );
          })}
        </nav>
        <div className="mt-[16px]">{known && (cat === null ? <SubscriptionPlans /> : loading ? <TableSkeleton /> : <CategoryTable cat={cat} />)}</div>
      </div>
    </WalletLayout>
  );
}

/* ---------------- Subscription Plans ---------------- */

function SubscriptionPlans() {
  const plans = useData((d) => d.money.purchasedPlans);
  const [modal, setModal] = useState<null | { kind: "details" | "renew" | "cancel" | "remove"; plan: PurchasedPlan }>(null);
  if (plans.length === 0) return <EmptyState icon={Crown} text="No Subscription Plans Found" testid="wallet-purchases-plans-empty" />;
  return (
    <div className="flex flex-col gap-[16px]" data-testid="wallet-purchases-plans">
      {plans.map((p) => (
        <PlanCard key={p.id} plan={p} onAction={(kind) => setModal({ kind, plan: p })} />
      ))}
      {modal && <PlanModal kind={modal.kind} plan={modal.plan} onClose={() => setModal(null)} />}
    </div>
  );
}

function StatusChip({ tone, children }: { tone: "expired" | "active" | "refund"; children: ReactNode }) {
  const cls =
    tone === "expired"
      ? "border border-danger bg-[rgba(210,0,107,0.15)] text-danger"
      : tone === "active"
        ? "border border-accent bg-accent/10 text-white"
        : "bg-[#4d4a1f] text-[#f2e600]";
  return (
    <span className={`inline-flex h-[30px] items-center gap-[6px] rounded-pill px-[16px] text-[12px] font-bold uppercase tracking-caps ${cls}`}>
      {tone !== "refund" && <span className={`h-[8px] w-[8px] rounded-full ${tone === "expired" ? "bg-danger" : "bg-accent"}`} />}
      {children}
    </span>
  );
}

function PlanCard({ plan: p, onAction }: { plan: PurchasedPlan; onAction: (k: "details" | "renew" | "cancel" | "remove") => void }) {
  const [more, setMore] = useState(false);
  const [code, setCode] = useState(false);
  const shown = more ? p.benefits : p.benefits.slice(0, 3);
  return (
    <article data-testid={`wallet-plan-${p.id}`} className="rounded-card bg-surface">
      <header className="flex items-center gap-[16px] border-b border-surface-2 px-[24px] py-[22px]">
        <Avatar size={48} ring={0} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[24px] font-bold leading-[28px] text-accent">{p.creator}</h3>
          <span className="mt-[2px] inline-flex h-[26px] items-center rounded-pill border border-accent px-[10px] text-[14px] text-soft">{p.plan}</span>
        </div>
        <button type="button" data-testid={`wallet-plan-details-${p.id}`} onClick={() => onAction("details")} className="h-[32px] rounded-pill bg-accent px-[14px] text-[14px] font-medium hover:brightness-110">
          View Details
        </button>
        {p.status === "expired" && (
          <button
            type="button"
            aria-label="Remove plan"
            data-testid={`wallet-plan-remove-${p.id}`}
            onClick={() => onAction("remove")}
            className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-accent hover:brightness-110"
          >
            <Trash2 size={15} />
          </button>
        )}
      </header>
      <div className="px-[24px] pb-[20px] pt-[20px]">
        <div className="flex min-h-[66px] items-center rounded-tile border-l-4 border-accent bg-bg py-[10px] pl-[24px] pr-[20px]">
          <span className="text-[28px] font-bold">{usd(p.price)}</span>
          <span className="ml-[10px] flex flex-col items-start gap-[2px]">
            <span className="inline-flex h-[24px] items-center rounded-pill border border-accent px-[10px] text-[12px]">
              {p.months} {p.months === 1 ? "Month" : "Months"}
            </span>
            {p.discountPct ? <span className="rounded-[3px] bg-accent px-[6px] text-[9px] font-bold uppercase leading-[14px]">{p.discountPct}% OFF</span> : null}
          </span>
          <span className="ml-auto flex gap-[8px]">
            {p.status === "expired" ? <StatusChip tone="expired">Expired</StatusChip> : <StatusChip tone="active">Active Plan</StatusChip>}
            {p.refundRequested && <StatusChip tone="refund">Refund Requested</StatusChip>}
          </span>
        </div>
        {p.status === "active" && p.nextRenewal && (
          <span className="mt-[12px] inline-flex h-[32px] items-center gap-[8px] rounded-pill border border-surface-2 bg-bg px-[16px] text-[13px] text-soft">
            <span className="h-[8px] w-[8px] rounded-full bg-accent" />
            Next Auto-Renewal on <b className="ml-[4px] text-white">{fmtDate(p.nextRenewal)}</b>
          </span>
        )}
        <ul className="mt-[12px] flex flex-wrap items-baseline gap-x-[24px] gap-y-[6px]">
          {shown.map((b) => (
            <li key={b} className="flex items-center gap-[8px] text-[14px] text-soft">
              <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-accent" />
              {b}
            </li>
          ))}
          {p.benefits.length > 3 && !more && (
            <li>
              <button type="button" data-testid={`wallet-plan-more-${p.id}`} onClick={() => setMore(true)} className="text-[12px] font-medium text-accent">
                View more features
              </button>
            </li>
          )}
        </ul>
      </div>
      {p.included?.length ? (
        <div className="border-t border-surface-2 px-[24px] pb-[28px] pt-[16px]">
          <p className="text-[12px] font-bold uppercase tracking-caps text-soft/80">Included Experiences &amp; Merchandise</p>
          {p.included.map((it) => (
            <div key={it.name} className="mt-[12px] rounded-tile border border-accent/60 bg-bg px-[16px] py-[12px]">
              <div className="flex items-center gap-[12px]">
                <span className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-surface">
                  <Gift size={18} />
                </span>
                <div className="flex-1">
                  <p className="text-[14px] font-bold">{it.name}</p>
                  <p className="text-[11px] text-soft">{it.frequency}</p>
                </div>
                <button type="button" data-testid={`wallet-plan-code-${p.id}`} onClick={() => setCode((c) => !c)} className="flex items-center gap-[6px] text-[13px]">
                  {code ? "Hide Code" : "Show Code"}
                  <ChevronDown size={18} className={code ? "rotate-180" : ""} />
                </button>
              </div>
              {code && (
                <p className="mt-[12px] rounded-popover bg-surface px-[12px] py-[8px] font-mono text-[14px]" data-testid={`wallet-plan-code-value-${p.id}`}>
                  {it.code} <span className="text-muted">(demo code)</span>
                </p>
              )}
            </div>
          ))}
        </div>
      ) : null}
      <footer className="flex justify-end gap-[10px] border-t border-surface-2 px-[24px] py-[20px]">
        {p.status === "active" ? (
          p.autoRenew && (
            <OutlineBtn data-testid={`wallet-plan-cancel-${p.id}`} onClick={() => onAction("cancel")} className="!border-accent !text-white">
              Cancel Auto-Renewal
            </OutlineBtn>
          )
        ) : (
          <OutlineBtn data-testid={`wallet-plan-renew-${p.id}`} onClick={() => onAction("renew")} className="!text-white">
            Renew
          </OutlineBtn>
        )}
        <SelectNewPlan id={p.id} />
      </footer>
    </article>
  );
}

function SelectNewPlan({ id }: { id: string }) {
  const toast = useToast();
  return (
    <Btn data-testid={`wallet-plan-select-${id}`} onClick={() => toast("Opens this creator's plans on their fan site (not part of this demo)")}>
      Select New Plan
    </Btn>
  );
}

function PlanModal({ kind, plan, onClose }: { kind: "details" | "renew" | "cancel" | "remove"; plan: PurchasedPlan; onClose: () => void }) {
  const toast = useToast();
  const card = useData((d) => d.money.savedCards[0]);
  const [err, setErr] = useState<string | null>(null);
  if (kind === "details")
    return (
      <Modal open onClose={onClose} title={plan.plan}>
        <dl data-testid="modal-wallet-plan-details" className="grid grid-cols-[150px_1fr] gap-y-[12px] text-[14px]">
          <dt className="text-muted">Creator</dt>
          <dd className="text-accent">{plan.creator}</dd>
          <dt className="text-muted">Price</dt>
          <dd>
            {usd(plan.price)} / {plan.months} {plan.months === 1 ? "Month" : "Months"}
            {plan.discountPct ? ` (${plan.discountPct}% OFF)` : ""}
          </dd>
          <dt className="text-muted">Status</dt>
          <dd>{plan.status === "active" ? "Active Plan" : "Expired"}</dd>
          <dt className="text-muted">Benefits</dt>
          <dd>
            <ul className="list-disc pl-[16px]">
              {plan.benefits.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </dd>
        </dl>
      </Modal>
    );
  const cfg = {
    renew: {
      title: "Renew Plan",
      body: (
        <>
          Renew <b>{plan.plan}</b> from {plan.creator} for <b>{usd(plan.price)}</b> using {card ? `the card ending in ${card.last4}` : "your saved card"}?
          <NoticeBox className="mt-[16px]">Demo: no real payment is made.</NoticeBox>
        </>
      ),
      cta: "Renew",
      run: () => act("money.renewPlan", (d) => renewPlan(d, plan.id), { need: "finance.write" }),
      done: "Plan renewed",
    },
    cancel: {
      title: "Cancel Auto-Renewal",
      body: (
        <>
          Turn off auto-renewal for <b>{plan.plan}</b>? You keep access until {fmtDate(plan.nextRenewal)}.
        </>
      ),
      cta: "Cancel Auto-Renewal",
      run: () => act("money.cancelAutoRenewal", (d) => cancelAutoRenewal(d, plan.id), { need: "finance.write" }),
      done: "Auto-renewal canceled",
    },
    remove: {
      title: "Remove Plan",
      body: (
        <>
          Remove <b>{plan.plan}</b> from your purchases list?
        </>
      ),
      cta: "Remove",
      run: () => act("money.removePurchasedPlan", (d) => removePurchasedPlan(d, plan.id), { need: "finance.write" }),
      done: "Plan removed",
    },
  }[kind];
  return (
    <Modal
      open
      onClose={onClose}
      title={cfg.title}
      footer={
        <>
          <TextBtn onClick={onClose}>Cancel</TextBtn>
          <Btn
            data-testid={`wallet-plan-${kind}-confirm`}
            onClick={() => {
              const res = cfg.run();
              if (!res.ok) return setErr(res.reason);
              toast(cfg.done);
              onClose();
            }}
          >
            {cfg.cta}
          </Btn>
        </>
      }
    >
      <div data-testid={`modal-wallet-plan-${kind}`} className="text-[16px] leading-[24px]">
        {cfg.body}
        <InlineError>{err}</InlineError>
      </div>
    </Modal>
  );
}

/* ---------------- category tables ---------------- */

const COLS: Record<Exclude<PurchaseCategory, "newsletter" | "vip-offers" | "portfolio" | "tickets">, [string, string, string]> = {
  merchandise: ["Product Name", "Purchased From", "Date"],
  courses: ["Course Details", "Purchased From", "Enrolled Date"],
  experiences: ["Experience Detail", "Purchased From", "Date"],
  tips: ["Tip Sent To", "Type", "Date"],
  content: ["Content Detail", "Purchased From", "Date"],
  // inferred: header labels for these three were not captured; they follow the same pattern.
  messages: ["Message Detail", "Purchased From", "Date"],
  downloadables: ["Downloadable Detail", "Purchased From", "Date"],
  livestreams: ["Livestream Detail", "Purchased From", "Date"],
};

const EMPTY: Partial<Record<PurchaseCategory, { text: string; icon: typeof Newspaper }>> = {
  newsletter: { text: "No Newsletters Found", icon: Newspaper },
  "vip-offers": { text: "No VIP Offer Purchases Found", icon: Crown },
  portfolio: { text: "No Portfolio Purchases Found", icon: Briefcase },
  tickets: { text: "No Ticket Purchases Found", icon: Ticket },
};

function StatusPill({ s }: { s: string }) {
  return <span className="mt-[6px] inline-flex h-[28px] items-center rounded-[14px] bg-accent px-[16px] text-[14px] font-medium">{s}</span>;
}

function CategoryTable({ cat }: { cat: PurchaseCategory }) {
  const rows = useData((d) => d.money.purchases[cat]);
  const [view, setView] = useState<PurchaseRow | null>(null);
  if (rows.length === 0) {
    const e = EMPTY[cat] ?? { text: "No Purchases Found", icon: Newspaper };
    return (
      <>
        {cat === "tickets" && <h5 className="mb-[16px] mt-[8px] text-[18px] font-bold uppercase">Tickets</h5>}
        <EmptyState icon={e.icon} text={e.text} className="!rounded-[20px]" testid={`wallet-purchases-empty-${cat}`} />
      </>
    );
  }
  const cols = COLS[cat as keyof typeof COLS];
  const isTips = cat === "tips";
  return (
    <>
      <TableCard testid={`wallet-purchases-table-${cat}`}>
        <thead>
          <tr>
            <Th w="38%">{cols[0]}</Th>
            <Th w="19%">{cols[1]}</Th>
            <Th w="10%">Details</Th>
            <Th w="15%">{cols[2]}</Th>
            <Th>{isTips ? "Tip Amount" : "Price"}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-testid={`wallet-purchase-row-${r.id}`}>
              <Td className="!py-[20px]">
                {isTips ? (
                  <div className="flex items-center gap-[12px]">
                    <Avatar size={44} ring={2} />
                    <span className="font-bold text-accent">{r.title}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-[16px]">
                    {(cat === "merchandise" || cat === "experiences" || cat === "content" || cat === "courses") && (
                      <ImageSlot label={r.title} className="h-[80px] w-[80px] shrink-0" rounded="rounded-tile" />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold leading-[20px]">{r.title}</p>
                      {r.subtitle && <p className="mt-[2px] text-[13px] text-soft">{r.subtitle}</p>}
                      {r.status && <StatusPill s={r.status} />}
                    </div>
                  </div>
                )}
              </Td>
              <Td>
                {isTips ? (
                  r.subtitle
                ) : (
                  <div className="flex items-center gap-[10px]">
                    <Avatar size={44} ring={2} />
                    <span className="text-[13px] font-bold leading-[16px] text-accent">{r.from}</span>
                  </div>
                )}
              </Td>
              <Td>
                <button type="button" data-testid={`wallet-purchase-view-${r.id}`} onClick={() => setView(r)} className="text-accent hover:underline">
                  View
                </button>
              </Td>
              <Td>{fmtDate(r.date)}</Td>
              {/* Source bug reproduced: some rows render no price. */}
              <Td>{r.price == null ? "" : usd(r.price, r.currency)}</Td>
            </tr>
          ))}
        </tbody>
      </TableCard>
      <Modal open={!!view} onClose={() => setView(null)} title="Purchase Details">
        {view && (
          <dl data-testid="modal-wallet-purchase" className="grid grid-cols-[150px_1fr] gap-y-[12px] text-[14px]">
            <dt className="text-muted">Item</dt>
            <dd>{view.title}</dd>
            {view.subtitle && (
              <>
                <dt className="text-muted">Type</dt>
                <dd>{view.subtitle}</dd>
              </>
            )}
            <dt className="text-muted">Purchased From</dt>
            <dd className="text-accent">{view.from}</dd>
            <dt className="text-muted">Date</dt>
            <dd>{fmtDate(view.date)}</dd>
            {view.status && (
              <>
                <dt className="text-muted">Status</dt>
                <dd>{view.status}</dd>
              </>
            )}
            <dt className="text-muted">Price</dt>
            <dd>{view.price == null ? "—" : usd(view.price, view.currency)}</dd>
          </dl>
        )}
      </Modal>
    </>
  );
}
