/**
 * INFERRED public pages (not captured): Newsletters list, VIP Deals list, VIP Deal detail.
 * Built from captured patterns: list-page header (82/83), Home "VIP Deals" rows (10-home.md),
 * event-detail two-card layout (88). Copy that is not in the pack is marked inferred.
 */
import { useState } from "react";
import { CalendarDays, Copy, Lock } from "lucide-react";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { useData } from "../../../store/store";
import { money, placeOrder, type Newsletter, type VipOffer } from "../../../store/slices/monetize";
import { Avatar, ImageSlot, Modal } from "../../../platform/ui/surfaces";
import { useToast } from "../../../platform/ui/toast";
import type { PageProps } from "../../types";
import { ConfirmModal, Pill, PublicHeader, PublicPage, ShareButton, useRun } from "../ui";

const fmt = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/* ------------------------------------------------------------------ newsletters */

export function PublicNewslettersPage({ route }: PageProps) {
  const name = useData((d) => d.account.name);
  const on = useData((d) => d.monetize.newslettersOnProfile);
  const list = useData((d) => d.monetize.newsletters.filter((n) => n.status === "Sent"));
  const [read, setRead] = useState<Newsletter | null>(null);
  const [unlock, setUnlock] = useState<Newsletter | null>(null);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const run = useRun();
  const lockLabel = (n: Newsletter) => (n.lock === "Free" ? "Free" : n.lock === "Subscribers" ? "Subscribers Only" : `${money(n.price ?? 0)} to Unlock`);
  return (
    <PublicPage routeId={route.id}>
      <PublicHeader avatar crumbs={[{ label: `${name}'s Newsletters` }]} />
      <section className="mt-[30px] rounded-card bg-surface p-[30px]" data-testid="public-newsletters-list">
        {!on ? (
          <p className="py-[40px] text-center text-[18px] text-[#c8c8c8]">Newsletters are not available right now.</p>
        ) : list.length ? (
          <ul className="flex flex-col">
            {list.map((n, i) => {
              const open = n.lock === "Free" || unlocked.includes(n.id);
              return (
                <li key={n.id} data-testid={`public-newsletter-${n.id}`} className={`flex items-center gap-[16px] py-[18px] ${i ? "border-t border-white/[.12]" : ""}`}>
                  <Avatar src={n.image} size={56} ring={2} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[16px] font-bold leading-[20px]">{n.title}</h3>
                    <p className="mt-[6px] flex items-center gap-[10px] text-[13px] text-[#c8c8c8]">
                      {n.sentAt && fmt(n.sentAt)}
                      <span className="rounded-[14px] border border-accent px-[10px] py-[2px] text-[12px] text-white">{lockLabel(n)}</span>
                    </p>
                  </div>
                  {open ? (
                    <Pill data-testid={`public-newsletter-read-${n.id}`} onClick={() => setRead(n)}>
                      Read
                    </Pill>
                  ) : (
                    <Pill data-testid={`public-newsletter-unlock-${n.id}`} icon={<Lock size={16} strokeWidth={2.5} />} onClick={() => setUnlock(n)}>
                      Unlock
                    </Pill>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-[40px] text-center text-[18px] text-[#c8c8c8]">No Newsletters Yet</p>
        )}
      </section>
      <Modal open={!!read} onClose={() => setRead(null)} title={read?.title ?? ""} width={720}>
        <div data-testid="modal-public-newsletter">
          <p className="text-[13px] text-muted">{read?.sentAt && fmt(read.sentAt)}</p>
          <p className="mt-[14px] whitespace-pre-wrap text-[15px] leading-[23px]">{read?.body}</p>
        </div>
      </Modal>
      <ConfirmModal
        open={!!unlock}
        title="Unlock Newsletter"
        confirmLabel={unlock?.lock === "Subscribers" ? "Subscribe" : "Unlock"}
        testid="public-newsletter-checkout"
        onClose={() => setUnlock(null)}
        onConfirm={() => {
          if (!unlock) return;
          if (run("monetize.unlockNewsletter", (d) => placeOrder(d, { label: `Newsletter · ${unlock.title}`, quantity: 1, total: unlock.price ?? 0 }), undefined, "Unlocked (simulated: no payment was taken)")) {
            setUnlocked((u) => [...u, unlock.id]);
            setUnlock(null);
          }
        }}
      >
        {unlock?.lock === "Subscribers" ? "This newsletter is for subscribers. Subscribe to read it (simulated)." : `Unlock “${unlock?.title}” for ${money(unlock?.price ?? 0)} (simulated).`}
      </ConfirmModal>
    </PublicPage>
  );
}

/* ------------------------------------------------------------------ VIP deals */

export function PublicVipDealsPage({ route, params }: PageProps) {
  const m = useData((d) => ({ name: d.account.name, label: d.monetize.vipLabel, display: d.monetize.vipDisplay, offers: d.monetize.vipOffers.filter((o) => o.active).sort((a, b) => a.order - b.order) }));
  const { navigate } = useRouter();
  return (
    <PublicPage routeId={route.id}>
      <PublicHeader avatar crumbs={[{ label: `${m.name}'s ${m.label}` }]} />
      <section className="mt-[30px] rounded-card bg-surface p-[30px]" data-testid="public-vip-list">
        {!m.display || !m.offers.length ? (
          <p className="py-[40px] text-center text-[18px] text-[#c8c8c8]">No VIP Deals Right Now</p>
        ) : (
          <ul className="flex flex-col gap-[16px]">
            {m.offers.map((o) => (
              <li key={o.id} data-testid={`public-vip-${o.id}`} className="flex items-center gap-[20px] rounded-inner bg-bg p-[16px]">
                {o.logo ? <img src={o.logo} alt="" className="h-[88px] w-[88px] rounded-[8px] object-cover" /> : <ImageSlot label={o.title} className="h-[88px] w-[88px] shrink-0" rounded="rounded-[8px]" />}
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[16px] font-bold">{o.title}</h3>
                  <p className="mt-[6px] line-clamp-2 text-[12px] text-[#b0b0b0]">{o.description}</p>
                  <p className="mt-[8px] text-[11px] font-bold">Ends {fmt(o.endsAt)}</p>
                </div>
                <Pill data-testid={`public-vip-view-${o.id}`} onClick={() => navigate(pathFor("public-vip-deal", { handle: params.handle, offerId: o.id }))}>
                  View Deal
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PublicPage>
  );
}

export function PublicVipDealPage({ route, params }: PageProps) {
  const m = useData((d) => ({ name: d.account.name, label: d.monetize.vipLabel, o: d.monetize.vipOffers.find((x) => x.id === params.offerId && x.active) }));
  const listPath = pathFor("public-vip-deals", { handle: params.handle });
  if (!m.o)
    return (
      <PublicPage routeId={route.id}>
        <PublicHeader avatar size="sm" crumbs={[{ label: m.name }, { label: m.label, to: listPath }]} />
        <p className="mt-[40px] text-[18px] text-[#c8c8c8]">This deal is no longer available.</p>
      </PublicPage>
    );
  return <Deal routeId={route.id} o={m.o} name={m.name} label={m.label} listPath={listPath} key={m.o.id} />;
}

function Deal({ routeId, o, name, label, listPath }: { routeId: string; o: VipOffer; name: string; label: string; listPath: string }) {
  const [step, setStep] = useState<"locked" | "confirm" | "open">(o.lockOptions.includes("Free") ? "open" : "locked");
  const run = useRun();
  const toast = useToast();
  const [code] = useState(() => (o.codeType === "General Code" ? o.code : `${o.id.toUpperCase().slice(0, 4)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`));
  const [revealed, setRevealed] = useState(false);
  return (
    <PublicPage routeId={routeId}>
      <PublicHeader avatar size="sm" crumbs={[{ label: name }, { label, to: listPath }, { label: o.title }]} />
      <div className="mt-[16px] flex items-start gap-[16px]">
        <section className="w-1/2 rounded-[24px] bg-surface p-[24px]">
          <div className="flex items-start justify-between">
            {o.logo ? <img src={o.logo} alt="" className="h-[300px] w-[300px] rounded-inner object-cover" /> : <ImageSlot label={o.title} className="h-[300px] w-[300px]" rounded="rounded-inner" />}
            <ShareButton testid="public-vip-share" />
          </div>
          <h2 className="mt-[30px] text-[24px] font-bold">{o.title}</h2>
          <p className="mt-[16px] flex items-center gap-[8px] text-[16px]">
            <CalendarDays size={16} className="text-accent" />
            Ends {fmt(o.endsAt)}
          </p>
          <p className="mt-[20px] text-[14px] text-date">{o.description}</p>
        </section>
        <section className="w-1/2 rounded-[24px] bg-surface p-[24px]" data-testid="public-vip-unlock">
          <h2 className="text-[24px] font-bold">Get This Deal</h2>
          <p className="mt-[12px] text-[16px]">Available with: {o.lockOptions.join(", ")}</p>
          {step === "open" ? (
            revealed ? (
              <div className="mt-[24px] flex items-center gap-[12px]">
                <span className="flex h-[55px] flex-1 items-center rounded-pill bg-bg px-[24px] font-mono text-[18px] font-bold tracking-[2px]" data-testid="public-vip-code">
                  {code}
                </span>
                <Pill
                  onClick={() => {
                    navigator.clipboard?.writeText(code).catch(() => {});
                    toast("Copied to clipboard");
                  }}
                  icon={<Copy size={16} />}
                >
                  Copy
                </Pill>
              </div>
            ) : (
              <Pill className="mt-[24px] w-full" data-testid="public-vip-reveal" onClick={() => setRevealed(true)}>
                Get Code
              </Pill>
            )
          ) : (
            <Pill className="mt-[24px] w-full" data-testid="public-vip-buy" icon={<Lock size={16} strokeWidth={2.5} />} onClick={() => setStep("confirm")}>
              {o.lockOptions.includes("Individual Purchase") && o.price ? `Unlock for ${money(o.price)}` : "Subscribe to Unlock"}
            </Pill>
          )}
        </section>
      </div>
      <ConfirmModal
        open={step === "confirm"}
        title="Unlock Deal"
        confirmLabel="Unlock"
        testid="public-vip-checkout"
        onClose={() => setStep("locked")}
        onConfirm={() => {
          if (run("monetize.unlockVipDeal", (d) => placeOrder(d, { label: `VIP Deal · ${o.title}`, quantity: 1, total: o.price ?? 0 }), undefined, "Deal unlocked (simulated: no payment was taken)")) setStep("open");
        }}
      >
        Unlock <b>{o.title}</b>
        {o.price ? ` for ${money(o.price)}` : " with a subscription"}. This is a demo: no payment details are collected.
      </ConfirmModal>
    </PublicPage>
  );
}
