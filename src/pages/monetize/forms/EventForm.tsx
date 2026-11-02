/**
 * INFERRED (not captured): Add / Edit Event and Manage Native Tickets.
 * Fields mirror what the event row (14h), public listing (82) and ticket page (88) display.
 * Create = content.write. Changing existing ticket prices = Confirm + finance.write.
 */
import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { useData } from "../../../store/store";
import { addEvent, money, toMEvent, uid, updateEvent, updateTicketLevels, type MEvent, type TicketLevel } from "../../../store/slices/monetize";
import { Select } from "../../../platform/ui/controls";
import type { PageProps } from "../../types";
import { Checkbox, ConfirmModal, Field, FilePick, FormPage, Pill, TextArea, TextInput, useRun } from "../ui";
import { Missing } from "./PlanForm";

export const ZONES: Record<string, { abbr: string; offset: string }> = {
  "US/Pacific": { abbr: "PST", offset: "-08:00" },
  "US/Mountain": { abbr: "MST", offset: "-07:00" },
  "US/Central": { abbr: "CST", offset: "-06:00" },
  "US/Eastern": { abbr: "EST", offset: "-05:00" },
};
const to12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const to24 = (t: string) => {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return "";
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
};
/** Local date (YYYY-MM-DD) of an event in its own zone. */
const localDate = (e: MEvent) => {
  const off = ZONES[e.timeZone]?.offset ?? "-07:00";
  const sign = off.startsWith("-") ? -1 : 1;
  const [oh, om] = off.slice(1).split(":").map(Number);
  return new Date(new Date(e.date).getTime() + sign * (oh * 60 + om) * 60000).toISOString().slice(0, 10);
};

type Lvl = { id: string; name: string; perk: string; price: string; quantity: string; sold: number };
const toLvl = (t: TicketLevel): Lvl => ({ id: t.id, name: t.name, perk: t.perk, price: String(t.price), quantity: String(t.quantity), sold: t.sold });
const fromLvl = (l: Lvl): TicketLevel => ({ id: l.id, name: l.name.trim(), perk: l.perk.trim(), price: Number(l.price), quantity: Number(l.quantity), sold: l.sold });
const lvlError = (ls: Lvl[]) => (ls.some((l) => !l.name.trim() || !(Number(l.price) > 0) || !(Number(l.quantity) > 0)) ? "Each ticket level needs a name, price and quantity" : "");

function LevelsEditor({ levels, setLevels, testid }: { levels: Lvl[]; setLevels: (l: Lvl[]) => void; testid: string }) {
  const set = (i: number, patch: Partial<Lvl>) => setLevels(levels.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div className="flex flex-col gap-[12px]" data-testid={testid}>
      {levels.map((l, i) => (
        <div key={l.id} className="grid grid-cols-[1fr_1.4fr_130px_110px_24px] items-center gap-[10px] rounded-inner bg-bg p-[12px]">
          <TextInput value={l.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Level name" aria-label="Ticket level name" className="!h-[44px] !bg-surface" />
          <TextInput value={l.perk} onChange={(e) => set(i, { perk: e.target.value })} placeholder="What's included" aria-label="What's included" className="!h-[44px] !bg-surface" />
          <label className="flex h-[44px] items-center rounded-pill bg-surface px-[16px] text-[14px] font-black">
            $
            <input inputMode="decimal" value={l.price} onChange={(e) => set(i, { price: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="0.00" aria-label="Ticket price" className="ml-[4px] w-full bg-transparent outline-none" />
          </label>
          <TextInput inputMode="numeric" value={l.quantity} onChange={(e) => set(i, { quantity: e.target.value.replace(/\D/g, "") })} placeholder="Qty" aria-label="Quantity" className="!h-[44px] !bg-surface !px-[16px]" />
          <button type="button" aria-label="Remove ticket level" disabled={l.sold > 0} title={l.sold > 0 ? "Tickets already sold" : "Remove"} onClick={() => setLevels(levels.filter((_, j) => j !== i))} className="hover:text-accent disabled:opacity-30">
            <X size={20} />
          </button>
          {l.sold > 0 && <span className="col-span-5 pl-[8px] text-[12px] text-muted">{l.sold} sold</span>}
        </div>
      ))}
      <button type="button" data-testid={`${testid}-add`} onClick={() => setLevels([...levels, { id: uid("tk"), name: "", perk: "", price: "", quantity: "", sold: 0 }])} className="self-start text-[14px] font-bold uppercase text-accent">
        + Add Ticket Level
      </button>
    </div>
  );
}

export function EventFormPage({ route, params }: PageProps) {
  const raw = useData((d) => d.monetize.events.find((x) => x.id === params.eventId));
  const e = raw ? toMEvent(raw) : null;
  if (route.id === "monetize-event-edit" && !e) return <Missing routeId={route.id} what="Event" back="monetize-event-calendar" />;
  return <EventForm routeId={route.id} e={e ?? null} key={e?.id ?? "new"} />;
}

function EventForm({ routeId, e }: { routeId: string; e: MEvent | null }) {
  const { navigate } = useRouter();
  const run = useRun();
  const [f, setF] = useState({
    title: e?.title ?? "",
    date: e ? localDate(e) : "",
    time: e ? to24(e.time) : "",
    timeZone: e?.timeZone ?? "US/Mountain",
    location: e?.location ?? "",
    description: e?.description ?? "",
    image: e?.image ?? null,
    imageName: "",
    ctas: e?.ctas ?? ["TICKETS"],
  });
  const [levels, setLevels] = useState<Lvl[]>([]);
  const [tried, setTried] = useState(false);
  const back = pathFor("monetize-event-calendar");
  const errors = {
    title: f.title.trim() ? "" : "Event Title is required",
    date: f.date ? "" : "Date is required",
    time: f.time ? "" : "Time is required",
    location: f.location.trim() ? "" : "Venue / Location is required",
    levels: lvlError(levels),
  };
  const valid = !Object.values(errors).some(Boolean);
  const save = () => {
    setTried(true);
    if (!valid) return;
    const z = ZONES[f.timeZone];
    const details = {
      title: f.title.trim(),
      date: new Date(`${f.date}T${f.time}:00${z.offset}`).toISOString(),
      time: to12(f.time),
      timeZone: f.timeZone,
      tzAbbr: z.abbr,
      location: f.location.trim(),
      description: f.description.trim(),
      image: f.image,
      ctas: f.ctas,
    };
    const ok = e
      ? run("monetize.updateEvent", (d) => updateEvent(d, e.id, details), "content.write", "Event updated")
      : run("monetize.addEvent", (d) => void addEvent(d, { ...details, kind: "event", maxPerPerson: 100, tickets: levels.map(fromLvl) }), "content.write", `${details.title} added to your events`);
    if (ok) navigate(back);
  };
  return (
    <FormPage
      routeId={routeId}
      title={e ? "Edit Event" : "Add Event"}
      backTo={back}
      footer={
        <>
          <button type="button" onClick={() => navigate(back)} data-testid="monetize-event-cancel" className="h-[40px] px-[16px] text-[14px] font-black uppercase hover:text-accent">
            Cancel
          </button>
          <Pill data-testid="monetize-event-save" onClick={save}>
            {e ? "Update Event" : "Save Event"}
          </Pill>
        </>
      }
    >
      <Field label="Event Title" required error={tried ? errors.title : undefined} htmlFor="ev-title">
        <TextInput id="ev-title" value={f.title} maxLength={60} onChange={(x) => setF({ ...f, title: x.target.value })} placeholder="Enter Title" data-testid="monetize-event-title" invalid={tried && !!errors.title} />
      </Field>
      <div className="grid grid-cols-3 gap-[16px]">
        <Field label="Date" required error={tried ? errors.date : undefined} htmlFor="ev-date">
          <TextInput id="ev-date" type="date" value={f.date} onChange={(x) => setF({ ...f, date: x.target.value })} data-testid="monetize-event-date" className="[color-scheme:dark]" invalid={tried && !!errors.date} />
        </Field>
        <Field label="Time" required error={tried ? errors.time : undefined} htmlFor="ev-time">
          <TextInput id="ev-time" type="time" value={f.time} onChange={(x) => setF({ ...f, time: x.target.value })} data-testid="monetize-event-time" className="[color-scheme:dark]" invalid={tried && !!errors.time} />
        </Field>
        <Field label="Time Zone" required>
          <div data-testid="monetize-event-zone">
            <Select value={f.timeZone} options={Object.keys(ZONES)} onChange={(v) => setF({ ...f, timeZone: v })} />
          </div>
        </Field>
      </div>
      <Field label="Venue / Location" required error={tried ? errors.location : undefined} htmlFor="ev-loc">
        <TextInput id="ev-loc" value={f.location} onChange={(x) => setF({ ...f, location: x.target.value })} placeholder="e.g. Copper Ridge Resort - Summit County, Colorado" data-testid="monetize-event-location" invalid={tried && !!errors.location} />
      </Field>
      <Field label="Description" htmlFor="ev-desc">
        <TextArea id="ev-desc" value={f.description} onChange={(x) => setF({ ...f, description: x.target.value })} placeholder="Shown when fans click VIEW MORE" data-testid="monetize-event-description" className="!min-h-[100px]" />
      </Field>
      <Field label="Event Image">
        <FilePick accept="image/*" testid="monetize-event-image" value={f.imageName} onChange={(name, file) => setF({ ...f, imageName: name, image: URL.createObjectURL(file) })} />
      </Field>
      <Field label="Buttons on Event Listing" info="The outline buttons fans see next to the event.">
        <div className="flex gap-[30px]">
          {["MEET & GREET", "TICKETS"].map((c) => (
            <Checkbox key={c} checked={f.ctas.includes(c)} onChange={() => setF({ ...f, ctas: f.ctas.includes(c) ? f.ctas.filter((x) => x !== c) : ["MEET & GREET", "TICKETS"].filter((x) => x === c || f.ctas.includes(x)) })} label={c} testid={`monetize-event-cta-${c === "TICKETS" ? "tickets" : "meet"}`}>
              <span className="text-[14px] font-bold">{c}</span>
            </Checkbox>
          ))}
        </div>
      </Field>
      {!e && (
        <Field label="Native Ticket Levels" info="Optional. You can add or change ticket levels later with MANAGE NATIVE TICKETS." error={tried ? errors.levels : undefined}>
          <LevelsEditor levels={levels} setLevels={setLevels} testid="monetize-event-levels" />
        </Field>
      )}
    </FormPage>
  );
}

export function ManageTicketsPage({ route, params }: PageProps) {
  const raw = useData((d) => d.monetize.events.find((x) => x.id === params.eventId));
  const e = raw ? toMEvent(raw) : null;
  if (!e) return <Missing routeId={route.id} what="Event" back="monetize-event-calendar" />;
  return <ManageTickets routeId={route.id} e={e} key={e.id} />;
}

function ManageTickets({ routeId, e }: { routeId: string; e: MEvent }) {
  const { navigate } = useRouter();
  const run = useRun();
  const [levels, setLevels] = useState<Lvl[]>(e.tickets.map(toLvl));
  const [max, setMax] = useState(String(e.maxPerPerson));
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const back = pathFor("monetize-event-calendar");
  const next = levels.map(fromLvl);
  const changedPrices = e.tickets.filter((t) => {
    const n = next.find((x) => x.id === t.id);
    return !n || n.price !== t.price;
  });
  const err = lvlError(levels) || (!(Number(max) > 0) ? "Maximum per person is required" : "");
  const commit = (need: "content.write" | "finance.write") => {
    if (run("monetize.updateTicketLevels", (d) => updateTicketLevels(d, e.id, next, Number(max)), need, "Tickets saved")) navigate(back);
    else setConfirm(false);
  };
  const save = () => {
    setTried(true);
    if (err) return;
    if (changedPrices.length) return setConfirm(true);
    commit("content.write");
  };
  return (
    <FormPage
      routeId={routeId}
      title="Manage Native Tickets"
      backTo={back}
      footer={
        <>
          <button type="button" onClick={() => navigate(back)} className="h-[40px] px-[16px] text-[14px] font-black uppercase hover:text-accent">
            Cancel
          </button>
          <Pill data-testid="monetize-tickets-save" onClick={save}>
            Save Tickets
          </Pill>
        </>
      }
    >
      <div className="rounded-inner bg-bg px-[20px] py-[14px]">
        <p className="text-[18px] font-bold">{e.title}</p>
        <p className="mt-[4px] text-[14px] text-soft">
          {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Denver" })} at {e.time} {e.timeZone} · {e.location}
        </p>
      </div>
      <Field label="Ticket Levels" required error={tried ? lvlError(levels) : undefined}>
        <LevelsEditor levels={levels} setLevels={setLevels} testid="monetize-tickets-levels" />
      </Field>
      <Field label="Maximum Tickets Per Person" required htmlFor="tk-max" error={tried && !(Number(max) > 0) ? "Maximum per person is required" : undefined}>
        <TextInput id="tk-max" inputMode="numeric" value={max} onChange={(x) => setMax(x.target.value.replace(/\D/g, ""))} className="!w-[200px]" data-testid="monetize-tickets-max" />
      </Field>
      <ConfirmModal open={confirm} title="Change Ticket Prices" confirmLabel="Change Prices" testid="monetize-tickets-prices" onClose={() => setConfirm(false)} onConfirm={() => commit("finance.write")}>
        <ul className="text-[15px]">
          {changedPrices.map((t) => {
            const n = next.find((x) => x.id === t.id);
            return (
              <li key={t.id}>
                {t.name}: {money(t.price)} → <b>{n ? money(n.price) : "removed"}</b>
              </li>
            );
          })}
        </ul>
        <p className="mt-[8px] text-[14px] text-muted">Fans who already bought tickets keep their price.</p>
      </ConfirmModal>
    </FormPage>
  );
}
