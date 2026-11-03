/**
 * Public › Store (83, filter 83a, kebab 83b, info 83c), Product Detail (85) and 1:1 booking (inferred).
 * No spec exists for Store / Product: see NOTES.md › "Store and Product Detail spec".
 */
import { useRef, useState } from "react";
import { Check, EllipsisVertical, Lock, Menu, Star } from "lucide-react";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { useData } from "../../../store/store";
import {
  KIND_LABEL, money, moveProduct, placeOrder, requestBooking, storeItems, toggleFeatured, type Product, type ProductKind,
} from "../../../store/slices/monetize";
import { ImageSlot } from "../../../platform/ui/surfaces";
import { useOutside } from "../../../platform/ui/controls";
import type { PageProps } from "../../types";
import { ConfirmModal, Pill, productMediaKind, PublicHeader, PublicPage, RedCircle, ShareButton, Stepper, TextArea, TextInput, useRun } from "../ui";

const FILTERS: { id: "all" | ProductKind; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "course", label: "COURSES" },
  { id: "experience", label: "EXPERIENCES" },
  { id: "merchandise", label: "MERCHANDISE" },
  { id: "nft", label: "NFTS" },
  { id: "downloadable", label: "DOWNLOADABLES" },
];

const STORE_INFO =
  "To add items to your Store go to Monetize. To feature a Store item on your profile click the 3-dot icon on the respective item. You can drag items to set the order that fans will see in your store.";

/** Store cards show a price only for courses, NFTs and external merchandise (83). */
const storePrice = (p: Product) => (p.price != null && (p.kind === "course" || p.kind === "nft" || p.external) ? money(p.price) : null);

export function PublicStorePage({ route, params }: PageProps) {
  const name = useData((d) => d.account.name);
  const isCreator = useData((d) => d.account.session.fanView === "creator");
  const items = useData(storeItems);
  const [filter, setFilter] = useState<"all" | ProductKind>("all");
  const [drag, setDrag] = useState<string | null>(null);
  const run = useRun();
  // 83a: the filtered view lists merchandise in creation order
  const list = filter === "all" ? items : items.filter((p) => p.kind === filter).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const moveTo = (id: string, target: string) => {
    const ids = items.map((p) => p.id);
    const from = ids.indexOf(id);
    const to = ids.indexOf(target);
    if (from < 0 || to < 0 || from === to) return;
    run("monetize.reorderStore", (d) => {
      for (let k = 0; k < Math.abs(to - from); k++) moveProduct(d, id, to > from ? 1 : -1);
    }, "content.write");
  };
  return (
    <PublicPage routeId={route.id}>
      <div className="-ml-[8px]">
        <StoreHeader title={`${name}’s Store`} info={STORE_INFO} />
      </div>
      <div role="tablist" className="mt-[18px] flex flex-wrap gap-[8px]">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            data-testid={`public-store-filter-${f.id}`}
            onClick={() => setFilter(f.id)}
            className={`h-[40px] rounded-pill px-[30px] text-[14px] uppercase ${filter === f.id ? "bg-accent font-black" : "bg-surface font-normal hover:brightness-125"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="mt-[30px] grid grid-cols-3 gap-x-[24px] gap-y-[24px]" data-testid="public-store-grid">
        {list.map((p, i) => (
          <StoreCard
            key={p.id}
            p={p}
            handle={params.handle}
            full={filter === "all"}
            creator={isCreator}
            dragging={drag === p.id}
            onDragStart={() => setDrag(p.id)}
            onDrop={() => drag && moveTo(drag, p.id)}
            onDragEnd={() => setDrag(null)}
            onKeyMove={(dir) => {
              const j = i + dir;
              if (j >= 0 && j < list.length) moveTo(p.id, list[j].id);
            }}
          />
        ))}
      </div>
      {!list.length && <p className="py-[60px] text-center text-[18px] text-[#c8c8c8]">No Items Found {/* inferred */}</p>}
    </PublicPage>
  );
}

/** Store header with the dark info popover (83c): ← · avatar · "AJ White’s Store" · red dot. */
function StoreHeader({ title, info }: { title: string; info: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useOutside(ref, () => setOpen(false), open);
  return (
    <div className="relative flex items-center">
      <PublicHeader avatar crumbs={[{ label: title }]} />
      <span ref={ref} className="relative ml-[12px]">
        <button type="button" aria-label="Store info" data-testid="public-store-info" onClick={() => setOpen((o) => !o)} onMouseEnter={() => setOpen(true)} className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-accent text-[10px] font-black">
          i
        </button>
        {open && (
          <span role="tooltip" className="absolute -left-[270px] top-[24px] z-30 w-[280px] rounded-[6px] border border-white/10 bg-[#1f2022] px-[20px] py-[12px] text-[12px] leading-[19px] text-white shadow-lg">
            {info}
          </span>
        )}
      </span>
    </div>
  );
}

function StoreCard({
  p, handle, full, creator, dragging, onDragStart, onDrop, onDragEnd, onKeyMove,
}: {
  p: Product; handle: string; full: boolean; creator: boolean; dragging: boolean;
  onDragStart: () => void; onDrop: () => void; onDragEnd: () => void; onKeyMove: (dir: -1 | 1) => void;
}) {
  const { navigate } = useRouter();
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setMenu(false), menu);
  const run = useRun();
  const price = storePrice(p);
  const canDrag = full && creator;
  return (
    <div
      data-testid={`public-store-card-${p.id}`}
      draggable={canDrag}
      onDragStart={onDragStart}
      onDragOver={(e) => canDrag && e.preventDefault()}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`relative h-[305px] overflow-hidden rounded-card border-[5px] border-[#e9e9e9] bg-placeholder-img ${dragging ? "opacity-50" : ""}`}
    >
      <button type="button" aria-label={`Open ${p.title}`} onClick={() => navigate(pathFor("public-product", { handle, productId: p.id }))} className="absolute inset-0">
        <ImageSlot src={p.image} kind={productMediaKind(p.kind)} label={p.title} className="h-full w-full" />
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
      {full && <span className="absolute left-[10px] top-[12px] rounded-pill bg-accent px-[10px] py-[8px] text-[13px] leading-none">{KIND_LABEL[p.kind].badge}</span>}
      <div className="absolute right-[12px] top-[12px] flex gap-[10px]" ref={ref}>
        {p.locked && (
          <RedCircle label="Locked" size={34} badge>
            <Lock size={16} strokeWidth={2.5} />
          </RedCircle>
        )}
        {full && creator && (
          <>
            {p.featured ? (
              <RedCircle label="Featured on profile (click to remove)" size={34} data-testid={`public-store-star-${p.id}`} onClick={() => setMenu((m) => !m)}>
                <Star size={16} fill="currentColor" />
              </RedCircle>
            ) : (
              <RedCircle label="More options" size={34} data-testid={`public-store-kebab-${p.id}`} onClick={() => setMenu((m) => !m)}>
                <EllipsisVertical size={18} strokeWidth={3} />
              </RedCircle>
            )}
            {menu && (
              <div role="menu" className="absolute right-0 top-[40px] z-20 whitespace-nowrap rounded-[6px] bg-[#1f2022] py-[4px] shadow-lg">
                <button
                  type="button"
                  role="menuitem"
                  data-testid={`public-store-feature-${p.id}`}
                  onClick={() => {
                    setMenu(false);
                    run("monetize.toggleFeatured", (d) => toggleFeatured(d, p.id), "content.write", p.featured ? "Removed from your profile" : "Featured on your profile");
                  }}
                  className="px-[20px] py-[8px] text-[16px] hover:text-accent"
                >
                  {p.featured ? "Remove from Profile" /* inferred */ : "Feature on Profile"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-[10px] px-[20px] pb-[20px]">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[20px] font-bold capitalize leading-[24px]">{p.title.toLowerCase()}</h3>
          {price && (
            <p className="mt-[6px] text-[14px]">
              {price}
              {p.external && (
                <>
                  {" | "}
                  <span className="text-accent">External</span>
                </>
              )}
            </p>
          )}
        </div>
        {canDrag && (
          <button
            type="button"
            aria-label={`Reorder ${p.title} (drag, or use arrow keys)`}
            data-testid={`public-store-drag-${p.id}`}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowUp") onKeyMove(-1);
              if (e.key === "ArrowRight" || e.key === "ArrowDown") onKeyMove(1);
            }}
            className="pointer-events-auto flex h-[34px] w-[34px] shrink-0 cursor-grab items-center justify-center rounded-full bg-[#3a3c3e]/90"
          >
            <Menu size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ product detail (85) */

export function PublicProductPage({ route, params }: PageProps) {
  const name = useData((d) => d.account.name);
  const p = useData((d) => d.monetize.products.find((x) => x.id === params.productId && x.published));
  const { navigate } = useRouter();
  const storePath = pathFor("public-store", { handle: params.handle });
  if (!p)
    return (
      <PublicPage routeId={route.id}>
        <PublicHeader avatar size="sm" crumbs={[{ label: `${name}’s Store`, to: storePath }]} />
        <p className="mt-[40px] text-[18px] text-[#c8c8c8]">This item is no longer available.</p>
        <Pill className="mt-[20px]" onClick={() => navigate(storePath)}>
          Back to Store
        </Pill>
      </PublicPage>
    );
  return <Product routeId={route.id} p={p} name={name} handle={params.handle} storePath={storePath} key={p.id} />;
}

function Product({ routeId, p, name, handle, storePath }: { routeId: string; p: Product; name: string; handle: string; storePath: string }) {
  const { navigate } = useRouter();
  const run = useRun();
  const [opts, setOpts] = useState<Record<string, string>>(() => Object.fromEntries((p.options ?? []).map((o) => [o.name, o.values[0]])));
  const [qty, setQty] = useState(1);
  const [buy, setBuy] = useState(false);
  const isCall = !!p.durations?.length;
  const physical = p.kind === "merchandise";
  const total = (p.price ?? 0) * (physical ? qty : 1);
  return (
    <PublicPage routeId={routeId}>
      <div className="-ml-[8px]">
        <PublicHeader avatar size="sm" crumbs={[{ label: `${name}’s Store`, to: storePath }, { label: KIND_LABEL[p.kind].plural }, { label: p.title }]} />
      </div>
      <div className="mt-[30px] flex items-start gap-[56px]">
        <div className="ml-[24px] h-[450px] w-[334px] shrink-0 bg-[#f0f0f0]" data-testid="public-product-image">
          {/* Merch packshots sit whole on the light panel (85); photos/covers fill it. */}
          <ImageSlot src={p.image} kind={productMediaKind(p.kind)} fit={p.kind === "merchandise" ? "contain" : "cover"} label={p.title} className={`h-full w-full ${p.kind === "merchandise" ? "!bg-transparent" : ""}`} eager />
        </div>
        <section className="min-w-0 flex-1 rounded-card bg-surface px-[30px] pb-[30px] pt-[30px]" data-testid="public-product-card">
          <div className="flex items-start justify-between gap-[12px]">
            <h1 className="text-[24px] font-bold leading-[30px]">{p.title}</h1>
            <ShareButton testid="public-product-share" />
          </div>
          <p className="-mt-[12px] pr-[40px] text-[16px] leading-[21px]">{p.description}</p>
          {isCall ? (
            <>
              {/* from the Home "Exclusive experience" card: Choose an Option Below */}
              <p className="mt-[30px] text-[16px] font-bold">Choose an Option Below:</p>
              <ul className="mt-[12px] flex flex-col gap-[8px]">
                {p.durations!.map((o) => (
                  <li key={o.label} className="flex h-[45px] items-center justify-between rounded-[8px] bg-bg px-[16px] text-[14px]">
                    <span>{o.label}</span>
                    <span className="font-bold">{money(o.price)}</span>
                  </li>
                ))}
              </ul>
              <Pill className="mt-[30px] w-[200px]" data-testid="public-product-schedule" onClick={() => navigate(pathFor("public-booking", { handle, productId: p.id }))}>
                Schedule
              </Pill>
            </>
          ) : (
            <>
              {p.price != null && (
                <>
                  <p className="mt-[30px] text-[16px] font-bold">Current Price</p>
                  <p className="mt-[12px] text-[20px] font-bold">
                    {money(p.price)}
                    {p.external && <span className="ml-[8px] text-[14px] font-normal text-accent">External</span>}
                  </p>
                </>
              )}
              {(p.options ?? []).map((o) => (
                <div key={o.name} className="mt-[30px]">
                  <p className="text-[16px] font-bold">{o.name}</p>
                  <div className="mt-[12px] flex flex-wrap gap-[8px]" role="radiogroup" aria-label={o.name}>
                    {o.values.map((v) => {
                      const on = opts[o.name] === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          data-testid={`public-product-opt-${o.name.toLowerCase().replace(/\W+/g, "-")}-${v.toLowerCase()}`}
                          onClick={() => setOpts({ ...opts, [o.name]: v })}
                          className={`h-[40px] rounded-pill border px-[20px] text-[14px] font-black uppercase ${on ? "border-accent bg-accent" : "border-white hover:border-accent"}`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {physical && !p.external && (
                <div className="mt-[30px]">
                  <Stepper value={qty} max={10} onChange={setQty} testid="public-product-qty" />
                </div>
              )}
              <Pill className="mt-[30px] w-[200px]" data-testid="public-product-buy" onClick={() => setBuy(true)}>
                Buy Now
              </Pill>
            </>
          )}
        </section>
      </div>
      <ConfirmModal
        open={buy}
        title={p.external ? "Continue to External Store" : "Checkout"}
        confirmLabel={p.external ? "Continue" : "Place Order"}
        testid="public-product-checkout"
        onClose={() => setBuy(false)}
        onConfirm={() => {
          const label = `${p.title}${Object.values(opts).length ? ` (${Object.values(opts).join(" / ")})` : ""}`;
          if (run("monetize.placeOrder", (d) => placeOrder(d, { productId: p.id, label, quantity: physical ? qty : 1, total }), undefined, p.external ? "In the live product this opens the seller's site (disabled in this demo)" : "Order placed (simulated: no payment was taken)")) setBuy(false);
        }}
      >
        <p>
          {physical ? `${qty} × ` : ""}
          <b>{p.title}</b>
          {Object.values(opts).length ? ` · ${Object.entries(opts).map(([k, v]) => `${k}: ${v}`).join(" · ")}` : ""}
        </p>
        <p className="mt-[8px] text-[20px] font-bold">{money(total)}</p>
        <p className="mt-[8px] text-[13px] text-muted">{p.external ? "This item is sold on another website." : "This is a demo: no payment details are collected."}</p>
      </ConfirmModal>
    </PublicPage>
  );
}

/* ------------------------------------------------------------------ 1:1 booking (inferred) */

const SLOTS = ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM"];

export function PublicBookingPage({ route, params }: PageProps) {
  const name = useData((d) => d.account.name);
  const p = useData((d) => d.monetize.products.find((x) => x.id === params.productId && x.published));
  const storePath = pathFor("public-store", { handle: params.handle });
  if (!p || !p.durations?.length)
    return (
      <PublicPage routeId={route.id}>
        <PublicHeader avatar size="sm" crumbs={[{ label: `${name}’s Store`, to: storePath }]} />
        <p className="mt-[40px] text-[18px] text-[#c8c8c8]">This experience can't be booked right now.</p>
      </PublicPage>
    );
  return <Booking routeId={route.id} p={p} name={name} handle={params.handle} storePath={storePath} key={p.id} />;
}

function Booking({ routeId, p, name, handle, storePath }: { routeId: string; p: Product; name: string; handle: string; storePath: string }) {
  const run = useRun();
  const [opt, setOpt] = useState(p.durations![0].label);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const o = p.durations!.find((x) => x.label === opt)!;
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const valid = !!date && date >= minDate && !!slot;
  return (
    <PublicPage routeId={routeId}>
      <div className="-ml-[8px]">
        <PublicHeader
          avatar
          size="sm"
          crumbs={[{ label: `${name}’s Store`, to: storePath }, { label: "Experiences" }, { label: p.title, to: pathFor("public-product", { handle, productId: p.id }) }, { label: "Book" }]}
        />
      </div>
      <div className="mt-[16px] flex items-start gap-[16px]">
        <section className="w-1/2 rounded-[24px] bg-surface p-[24px]">
          <div className="flex items-start justify-between">
            <ImageSlot src={p.image} kind={productMediaKind(p.kind)} label={p.title} className="h-[300px] w-[300px]" rounded="rounded-inner" eager />
            <ShareButton testid="public-booking-share" />
          </div>
          <h2 className="mt-[30px] text-[24px] font-bold">{p.title}</h2>
          <p className="mt-[12px] text-[14px] leading-[20px] text-date">{p.description}</p>
        </section>
        <section className="w-1/2 rounded-[24px] bg-surface p-[24px]" data-testid="public-booking-form">
          {done ? (
            <div className="py-[40px] text-center" data-testid="public-booking-done">
              <span className="mx-auto flex h-[80px] w-[80px] items-center justify-center rounded-full bg-accent/20 text-accent">
                <Check size={40} strokeWidth={3} />
              </span>
              <h2 className="mt-[20px] text-[24px] font-bold">Request Sent!</h2>
              <p className="mt-[10px] text-[14px] text-soft">
                {name} will confirm your {o.label.toLowerCase()} call on {new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {slot}.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-[24px] font-bold">Book a Call</h2>
              <p className="mt-[12px] text-[16px]">Choose an Option Below:</p>
              <div className="mt-[12px] flex flex-col gap-[10px]" role="radiogroup" aria-label="Call length">
                {p.durations!.map((d) => {
                  const on = d.label === opt;
                  return (
                    <button
                      key={d.label}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      data-testid={`public-booking-opt-${d.label.toLowerCase().replace(/\W+/g, "-")}`}
                      onClick={() => setOpt(d.label)}
                      className={`flex h-[50px] items-center justify-between rounded-inner bg-bg px-[16px] text-[14px] ${on ? "border border-accent" : "border border-transparent"}`}
                    >
                      <span className="flex items-center gap-[10px]">
                        <span className={`flex h-[20px] w-[20px] items-center justify-center rounded-full border border-accent ${on ? "bg-accent" : ""}`}>{on && <Check size={12} strokeWidth={3} />}</span>
                        {d.label}
                      </span>
                      <span className="font-bold">{money(d.price)}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-[24px] text-[16px]">Preferred Date *</p>
              <TextInput type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} data-testid="public-booking-date" aria-label="Preferred date" className="mt-[10px] [color-scheme:dark]" invalid={tried && (!date || date < minDate)} />
              <p className="mt-[20px] text-[16px]">Preferred Time (MST) *</p>
              <div className="mt-[10px] flex flex-wrap gap-[8px]">
                {SLOTS.map((s) => (
                  <button key={s} type="button" aria-pressed={slot === s} data-testid={`public-booking-slot-${s.replace(/\W+/g, "")}`} onClick={() => setSlot(s)} className={`h-[36px] rounded-pill border px-[14px] text-[13px] font-bold ${slot === s ? "border-accent bg-accent" : "border-white/60 hover:border-accent"}`}>
                    {s}
                  </button>
                ))}
              </div>
              {tried && !valid && <p className="mt-[8px] text-[13px] text-danger">Choose a future date and a time</p>}
              <p className="mt-[20px] text-[16px]">Anything you'd like to cover?</p>
              <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" className="mt-[10px] !min-h-[90px]" data-testid="public-booking-note" />
              <Pill
                className="mt-[24px] w-full"
                data-testid="public-booking-submit"
                onClick={() => {
                  setTried(true);
                  if (valid) setConfirm(true);
                }}
              >
                Request Booking · {money(o.price)}
              </Pill>
            </>
          )}
        </section>
      </div>
      <ConfirmModal
        open={confirm}
        title="Confirm Booking"
        confirmLabel="Request Booking"
        testid="public-booking-confirm"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          if (run("monetize.requestBooking", (d) => requestBooking(d, { productId: p.id, option: o.label, price: o.price, date, time: slot!, note }), undefined)) {
            setConfirm(false);
            setDone(true);
          }
        }}
      >
        <p>
          {o.label} call with {name} on <b>{date && new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</b> at <b>{slot}</b> MST.
        </p>
        <p className="mt-[8px] text-[20px] font-bold">{money(o.price)}</p>
        <p className="mt-[8px] text-[13px] text-muted">This is a demo: no payment details are collected.</p>
      </ConfirmModal>
    </PublicPage>
  );
}
