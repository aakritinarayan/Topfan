/** Public › Competitions (82, skeleton 82a, view-more 82b, past empty 82c) and Event detail (88). */
import { useState } from "react";
import { CalendarDays, Check, MapPin } from "lucide-react";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { useData, useMockLoading } from "../../../store/store";
import { isPastEvent, money, placeOrder, selectEvents, toMEvent, type MEvent } from "../../../store/slices/monetize";
import { ImageSlot } from "../../../platform/ui/surfaces";
import type { PageProps } from "../../types";
import { CalendarStar, ConfirmModal, DateBadge, EmptyState, Pill, PublicHeader, PublicPage, ShareButton, Skel, Stepper, useRun } from "../ui";

export function PublicEventsPage({ route, params }: PageProps) {
  const m = useData((d) => ({ name: d.account.name, label: d.monetize.eventsLabel, title: d.monetize.eventsBannerTitle, cover: d.monetize.eventsCover ?? null, events: selectEvents(d) }));
  const loading = useMockLoading(900);
  const [tab, setTab] = useState<"active" | "past">("active");
  const list = m.events.filter((e) => (tab === "past" ? isPastEvent(e) : !isPastEvent(e)));
  if (loading)
    return (
      <PublicPage routeId={route.id}>
        <div className="flex items-center gap-[10px]" data-testid="public-events-skeleton">
          <Skel className="h-[24px] w-[24px] rounded-[3px]" />
          <Skel className="h-[32px] w-[32px] rounded-full" />
          <Skel className="h-[24px] w-[280px] rounded-[4px]" />
        </div>
        <div className="mt-[30px] overflow-hidden rounded-card bg-surface">
          <div className="h-[483px] rounded-card bg-[#232426]" />
          <div className="flex items-center gap-[20px] p-[30px]">
            <Skel className="h-[80px] w-[80px] rounded-full" />
            <div className="flex flex-col gap-[8px]">
              <Skel className="h-[14px] w-[200px] rounded-[4px]" />
              <Skel className="h-[14px] w-[260px] rounded-[4px]" />
              <Skel className="h-[14px] w-[120px] rounded-[4px]" />
            </div>
          </div>
        </div>
      </PublicPage>
    );
  return (
    <PublicPage routeId={route.id}>
      <PublicHeader avatar crumbs={[{ label: `${m.name}'s ${m.label}` }]} />
      <section className="mt-[30px] overflow-hidden rounded-card bg-surface" data-testid="public-events-card">
        <div className="relative h-[400px]">
          <ImageSlot src={m.cover} kind="event" label="Events banner" className="h-full w-full" eager />
          <div className="absolute inset-x-0 bottom-0 h-[200px] bg-gradient-to-t from-surface to-transparent" />
          <h2 className="absolute inset-x-0 top-[300px] text-center text-[30px] font-bold">{m.title}</h2>
          <p className="absolute bottom-[10px] left-[30px] text-[24px] font-bold" data-testid="public-events-count">
            {list.length} Events
          </p>
        </div>
        <div role="tablist" className="flex gap-[10px] px-[30px] pb-[33px] pt-[37px]">
          {(
            [
              ["active", "Active Events"],
              ["past", "Past Events"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              data-testid={`public-events-tab-${id}`}
              onClick={() => setTab(id)}
              className={`h-[40px] rounded-pill px-[28px] text-[14px] uppercase tracking-caps ${tab === id ? "bg-accent font-black" : "font-bold hover:text-accent"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="border-t border-[#3a3d3f]">
          {list.length ? (
            list.map((e, i) => <PublicEventRow key={e.id} e={e} first={i === 0} handle={params.handle} />)
          ) : (
            <EmptyState className="h-[370px]" icon={<CalendarStar />} text={tab === "past" ? "No Past Events" : "No Active Events" /* inferred */} />
          )}
        </div>
      </section>
    </PublicPage>
  );
}

function PublicEventRow({ e, first, handle }: { e: MEvent; first: boolean; handle: string }) {
  const [more, setMore] = useState(false);
  const { navigate } = useRouter();
  const detail = () => navigate(pathFor("public-event-detail", { handle, eventId: e.id }));
  return (
    <div data-testid={`public-event-row-${e.id}`} className={`mx-[12px] flex gap-[30px] px-[18px] py-[30px] ${first ? "" : "border-t border-[#3a3d3f]"}`}>
      <DateBadge iso={e.date} monthSize={18} />
      <div className="min-w-0 flex-1">
        <h3 className="text-[24px] font-bold leading-[28px]">{e.title}</h3>
        <p className="mt-[8px] flex items-center gap-[6px] text-[16px]">
          {e.location}
          <MapPin size={18} className="text-accent" fill="currentColor" stroke="var(--surface)" aria-label="Location" />
        </p>
        <p className="mt-[2px] text-[16px]">
          {e.time} {e.tzAbbr}
        </p>
        {more && <p className="mt-[6px] text-[14px]">{e.description}</p>}
        <div className="mt-[10px] flex gap-[16px] text-[14px] uppercase text-accent">
          {e.description && (
            <button type="button" data-testid={`public-event-more-${e.id}`} onClick={() => setMore((v) => !v)} className="uppercase hover:underline">
              {more ? "View Less" : "View More"}
            </button>
          )}
          <button type="button" data-testid={`public-event-details-${e.id}`} onClick={detail} className="uppercase hover:underline">
            View Details
          </button>
        </div>
      </div>
      <div className="flex w-[150px] shrink-0 flex-col gap-[8px]">
        {e.ctas.map((c) => (
          <button
            key={c}
            type="button"
            data-testid={`public-event-cta-${c === "TICKETS" ? "tickets" : "meet"}-${e.id}`}
            onClick={detail}
            className="h-[39px] rounded-pill border border-accent text-[12px] font-extrabold uppercase hover:bg-accent-tint"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

const fullDate = (e: MEvent) =>
  `${new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Denver" })} at ${e.time} ${e.timeZone}`;

export function PublicEventDetailPage({ route, params }: PageProps) {
  const raw = useData((d) => d.monetize.events.find((x) => x.id === params.eventId));
  const m = useData((d) => ({ name: d.account.name, label: d.monetize.eventsLabel }));
  const e = raw ? toMEvent(raw) : null;
  const { navigate } = useRouter();
  const listPath = pathFor("public-events", { handle: params.handle });
  if (!e)
    return (
      <PublicPage routeId={route.id}>
        <PublicHeader avatar size="sm" crumbs={[{ label: m.name }, { label: m.label, to: listPath }]} />
        <p className="mt-[40px] text-[18px] text-[#c8c8c8]">This event is no longer available.</p>
        <Pill className="mt-[20px]" onClick={() => navigate(listPath)}>
          See All Events
        </Pill>
      </PublicPage>
    );
  return <EventDetail routeId={route.id} e={e} name={m.name} label={m.label} listPath={listPath} key={e.id} />;
}

function EventDetail({ routeId, e, name, label, listPath }: { routeId: string; e: MEvent; name: string; label: string; listPath: string }) {
  const [sel, setSel] = useState(e.tickets[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const [buy, setBuy] = useState(false);
  const run = useRun();
  const t = e.tickets.find((x) => x.id === sel);
  const remaining = (x: (typeof e.tickets)[number]) => Math.max(0, x.quantity - x.sold);
  const max = t ? Math.min(e.maxPerPerson, remaining(t)) : 1;
  return (
    <PublicPage routeId={routeId}>
      <PublicHeader avatar size="sm" crumbs={[{ label: name }, { label, to: listPath }, { label: e.title }]} />
      <div className="mt-[16px] flex items-start gap-[16px]">
        <section className="w-1/2 rounded-[24px] bg-surface p-[24px]" data-testid="public-event-info">
          <div className="flex items-start justify-between">
            <ImageSlot src={e.image} kind="event" label={e.title} className="h-[300px] w-[300px]" rounded="rounded-inner" eager />
            <ShareButton testid="public-event-share" />
          </div>
          <h2 className="mt-[30px] text-[24px] font-bold uppercase">{e.title}</h2>
          <p className="mt-[16px] flex items-center gap-[8px] text-[16px]">
            <CalendarDays size={16} className="text-accent" />
            {fullDate(e)}
          </p>
          <p className="mt-[12px] flex items-center gap-[8px] text-[16px]">
            <MapPin size={16} className="text-accent" />
            {e.location}
          </p>
          {e.description && <p className="mt-[20px] text-[14px] text-date">{e.description}</p>}
        </section>
        <section className="w-1/2 rounded-[24px] bg-surface p-[24px]" data-testid="public-event-tickets">
          <h2 className="text-[24px] font-bold">Select Tickets</h2>
          <p className="mt-[12px] text-[16px]">Ticket Levels</p>
          {e.tickets.length ? (
            <>
              <div className="mt-[12px] flex flex-col gap-[12px]" role="radiogroup" aria-label="Ticket Levels">
                {e.tickets.map((x) => {
                  const on = x.id === sel;
                  return (
                    <button
                      key={x.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      data-testid={`public-ticket-${x.id}`}
                      disabled={remaining(x) === 0}
                      onClick={() => {
                        setSel(x.id);
                        setQty(1);
                      }}
                      className={`relative flex h-[134px] flex-col rounded-inner bg-bg p-[16px] text-left disabled:opacity-50 ${on ? "border border-accent" : "border border-transparent"}`}
                    >
                      <span className="self-start rounded-[30px] border border-accent bg-surface px-[12px] py-[4px] text-[14px] font-medium">{x.name}</span>
                      <span className={`absolute right-[16px] top-[16px] flex h-[22px] w-[22px] items-center justify-center rounded-full border border-accent ${on ? "bg-accent" : ""}`}>{on && <Check size={13} strokeWidth={3} />}</span>
                      <span className="mt-[12px] text-[14px]">{x.perk}</span>
                      <span className="mt-auto flex items-end justify-between">
                        <span className="text-[24px] font-bold">{money(x.price)}</span>
                        <span className="text-[12px]">{remaining(x) ? `Only ${remaining(x)} Tickets Remaining` : "Sold Out"}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-[24px] text-[16px]">Number Of Tickets *</p>
              <div className="mt-[12px]">
                <Stepper value={qty} max={Math.max(1, max)} onChange={setQty} testid="public-ticket-qty" />
              </div>
              <p className="mt-[10px] text-[12px]">Maximum {e.maxPerPerson} Tickets Per Person</p>
              <Pill className="mt-[24px] w-full" disabled={!t || remaining(t) === 0} data-testid="public-buy-tickets" onClick={() => setBuy(true)}>
                Buy Tickets
              </Pill>
            </>
          ) : (
            // inferred: no native ticket levels yet
            <p className="mt-[20px] rounded-inner bg-bg p-[20px] text-[14px] text-[#c8c8c8]">Tickets are not on sale yet. Check back soon!</p>
          )}
        </section>
      </div>
      <ConfirmModal
        open={buy}
        title="Checkout"
        confirmLabel="Place Order"
        testid="public-ticket-checkout"
        onClose={() => setBuy(false)}
        onConfirm={() => {
          if (t && run("monetize.buyTickets", (d) => placeOrder(d, { eventId: e.id, label: `${e.title} · ${t.name}`, quantity: qty, total: t.price * qty }, t.id), undefined, "Order placed (simulated: no payment was taken)")) setBuy(false);
        }}
      >
        {t && (
          <>
            <p>
              {qty} × {t.name} for <b>{e.title}</b>
            </p>
            <p className="mt-[8px] text-[20px] font-bold">{money(t.price * qty)}</p>
            <p className="mt-[8px] text-[13px] text-muted">This is a demo: no payment details are collected.</p>
          </>
        )}
      </ConfirmModal>
    </PublicPage>
  );
}
