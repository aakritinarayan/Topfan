/** Monetize › Events & Ticketing (14h) + Bandsintown Import Settings modal (inferred). */
import { useRef, useState } from "react";
import { MapPin, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { useData } from "../../../store/store";
import {
  deleteEvent, importBandsintown, isPastEvent, saveBandsintown, selectEvents, setEventsSettings, type MEvent,
} from "../../../store/slices/monetize";
import { Toggle } from "../../../platform/ui/controls";
import { ImageSlot, Modal } from "../../../platform/ui/surfaces";
import type { PageProps } from "../../types";
import {
  ButtonLabelField, CalendarStar, ConfirmModal, DateBadge, DisplayToggle, EmptyState, Field, MonetizeFrame, OutlinePill, Pill, PillTabs, RedCircle, TextInput, useHandle, useRun,
} from "../ui";

export function EventsTab({ route }: PageProps) {
  const m = useData((d) => ({ label: d.monetize.eventsLabel, title: d.monetize.eventsBannerTitle, display: d.monetize.eventsDisplay, events: selectEvents(d) }));
  const [tab, setTab] = useState<"active" | "past">("active");
  const [del, setDel] = useState<MEvent | null>(null);
  const [bit, setBit] = useState(false);
  const [editTitle, setEditTitle] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { navigate } = useRouter();
  const handle = useHandle();
  const run = useRun();
  const list = m.events.filter((e) => (tab === "past" ? isPastEvent(e) : !isPastEvent(e)));
  return (
    <MonetizeFrame routeId={route.id} active="monetize-event-calendar">
      <div className="flex h-[40px] items-center justify-between">
        <h2 className="text-[24px] font-bold">Events &amp; Ticketing</h2>
        <ButtonLabelField
          value={m.label}
          testid="monetize-events-button-label"
          info="This is the label of the button fans see on your profile for your events."
          onSave={(v) => run("monetize.setEventsLabel", (d) => setEventsSettings(d, { eventsLabel: v }), "content.write", "Button label updated")}
        />
        <DisplayToggle label="Display My Events" on={m.display} testid="monetize-events-display" onChange={() => run("monetize.setEventsDisplay", (d) => setEventsSettings(d, { eventsDisplay: !m.display }), "content.write")} />
      </div>

      <section className="mt-[24px] overflow-hidden rounded-card bg-surface" data-testid="monetize-events-card">
        <div className="relative h-[470px]">
          {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <ImageSlot label="Events cover" className="h-full w-full" />}
          <div className="absolute inset-x-0 bottom-0 h-[150px] bg-gradient-to-t from-surface to-transparent" />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setCover(URL.createObjectURL(e.target.files[0]))} />
          <RedCircle label="Change cover photo" className="absolute right-[24px] top-[30px]" data-testid="monetize-events-cover-edit" onClick={() => fileRef.current?.click()}>
            <Pencil size={16} fill="currentColor" strokeWidth={1.5} />
          </RedCircle>
          <div className="absolute inset-x-0 bottom-[12px] flex items-center justify-center gap-[14px]">
            <h3 className="text-[28px] font-bold">{m.title}</h3>
            <button type="button" aria-label="Edit title" data-testid="monetize-events-title-edit" onClick={() => setEditTitle(m.title)} className="mt-[6px] border-b-2 border-white pb-[1px] text-white hover:text-accent">
              <Pencil size={13} fill="currentColor" strokeWidth={1.5} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between px-[36px] pt-[30px]">
          <h3 className="text-[24px] font-bold" data-testid="monetize-events-count">
            {list.length} Events
          </h3>
          <div className="flex gap-[20px]">
            <Pill data-testid="monetize-events-bandsintown" icon={<RefreshCw size={18} strokeWidth={2.5} />} onClick={() => setBit(true)}>
              Bandsintown Import Settings
            </Pill>
            <Pill data-testid="monetize-event-add" icon={<Plus size={18} strokeWidth={2.5} />} onClick={() => navigate(pathFor("monetize-event-add"))}>
              Add Event
            </Pill>
          </div>
        </div>
        <div className="px-[30px] pb-[30px] pt-[16px]">
          <PillTabs
            testid="monetize-events-tab"
            variant="plain"
            gap={8}
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "active", label: "Active Events" },
              { id: "past", label: "Past Events" },
            ]}
          />
        </div>
        <div className="border-t border-white/[.12]">
          {list.length ? (
            list.map((e, i) => (
              <EventRow
                key={e.id}
                e={e}
                first={i === 0}
                onDelete={() => setDel(e)}
                onEdit={() => navigate(pathFor("monetize-event-edit", { eventId: e.id }))}
                onTickets={() => navigate(pathFor("monetize-event-tickets", { eventId: e.id }))}
                onPublic={() => navigate(pathFor("public-event-detail", { handle, eventId: e.id }))}
              />
            ))
          ) : (
            <EmptyState className="h-[400px]" icon={<CalendarStar />} text={tab === "past" ? "No Past Events" : "No Active Events" /* inferred: active-tab copy not captured */} />
          )}
        </div>
      </section>

      <ConfirmModal
        open={!!del}
        title="Delete Event"
        confirmLabel="Delete"
        testid="monetize-delete-event"
        onClose={() => setDel(null)}
        onConfirm={() => {
          if (del && run("monetize.deleteEvent", (d) => deleteEvent(d, del.id), "content.write", "Event deleted")) setDel(null);
        }}
      >
        Are you sure you want to delete <b>{del?.title}</b>? It will be removed from your public event listing.
      </ConfirmModal>

      <Modal open={editTitle != null} onClose={() => setEditTitle(null)} title="Edit Title">
        <div data-testid="modal-monetize-events-title">
          <TextInput value={editTitle ?? ""} onChange={(e) => setEditTitle(e.target.value)} data-testid="monetize-events-title-input" aria-label="Title" maxLength={40} />
          <div className="mt-[24px] flex justify-end gap-[12px]">
            <button type="button" className="h-[40px] px-[16px] text-[14px] font-black uppercase hover:text-accent" onClick={() => setEditTitle(null)}>
              Cancel
            </button>
            <Pill
              disabled={!editTitle?.trim()}
              data-testid="monetize-events-title-save"
              onClick={() => run("monetize.setEventsBannerTitle", (d) => setEventsSettings(d, { eventsBannerTitle: editTitle!.trim() }), "content.write", "Title updated") && setEditTitle(null)}
            >
              Save
            </Pill>
          </div>
        </div>
      </Modal>

      <BandsintownModal open={bit} onClose={() => setBit(false)} />
    </MonetizeFrame>
  );
}

const fmtTime = (e: MEvent) => `${e.time} ${e.tzAbbr}`;

function EventRow({ e, first, onDelete, onEdit, onTickets, onPublic }: { e: MEvent; first: boolean; onDelete: () => void; onEdit: () => void; onTickets: () => void; onPublic: () => void }) {
  const [more, setMore] = useState(false);
  return (
    <div data-testid={`monetize-event-row-${e.id}`} className={`mx-[12px] flex gap-[30px] px-[18px] py-[30px] ${first ? "" : "border-t border-white/[.12]"}`}>
      <DateBadge iso={e.date} />
      <div className="min-w-0 flex-1 pt-[2px]">
        <h4 className="text-[24px] font-bold leading-[28px]">{e.title}</h4>
        <p className="mt-[8px] flex items-center gap-[6px] text-[16px]">
          {e.location}
          <MapPin size={18} className="text-accent" fill="currentColor" stroke="var(--surface)" />
        </p>
        <p className="mt-[2px] text-[16px]">{fmtTime(e)}</p>
        {more && <p className="mt-[6px] text-[14px]">{e.description}</p>}
        {e.description && (
          <button type="button" data-testid={`monetize-event-more-${e.id}`} onClick={() => setMore((v) => !v)} className="mt-[10px] text-[13px] uppercase text-accent">
            {more ? "View Less" : "View More"}
          </button>
        )}
      </div>
      <div className="flex w-[188px] shrink-0 flex-col items-end gap-[8px]">
        <Pill className="w-[188px] !text-[12px]" data-testid={`monetize-event-tickets-${e.id}`} onClick={onTickets}>
          Manage Native Tickets
        </Pill>
        <OutlinePill className="h-[40px] w-[188px] !font-black" data-testid={`monetize-event-public-${e.id}`} onClick={onPublic}>
          Tickets
        </OutlinePill>
        <div className="mt-[10px] flex gap-[8px]">
          <RedCircle label="Delete event" data-testid={`monetize-event-delete-${e.id}`} onClick={onDelete}>
            <Trash2 size={18} strokeWidth={2.4} />
          </RedCircle>
          <RedCircle label="Edit event" data-testid={`monetize-event-edit-${e.id}`} onClick={onEdit}>
            <Pencil size={16} fill="currentColor" strokeWidth={1.5} />
          </RedCircle>
        </div>
      </div>
    </div>
  );
}

/** INFERRED: Bandsintown Import Settings (not captured). Connect = mock flag flip after an explicit click. */
function BandsintownModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const bit = useData((d) => d.monetize.bandsintown);
  const [artist, setArtist] = useState(bit.artist);
  const [auto, setAuto] = useState(bit.autoImport);
  const run = useRun();
  return (
    <Modal open={open} onClose={onClose} title="Bandsintown Import Settings">
      <div data-testid="modal-monetize-bandsintown" className="flex flex-col gap-[22px]">
        <p className="text-[14px] leading-[21px] text-soft">Import your upcoming tour dates from Bandsintown. Imported events appear in your event listing alongside events you add here.</p>
        <Field label="Bandsintown Artist Name" required htmlFor="bit-artist">
          <TextInput id="bit-artist" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist name" data-testid="monetize-bandsintown-artist" />
        </Field>
        <label className="flex items-center justify-between text-[16px]">
          Automatically import new events
          <span className="scale-[1.2]" data-testid="monetize-bandsintown-auto">
            <Toggle on={auto} onChange={() => setAuto((a) => !a)} label="Automatically import new events" />
          </span>
        </label>
        <p className="text-[13px] text-muted">
          Status: {bit.connected ? `Connected${bit.lastImportAt ? ` · last import ${new Date(bit.lastImportAt).toLocaleString("en-US")}` : ""}` : "Not connected"}
        </p>
        <div className="flex justify-end gap-[12px]">
          <button type="button" className="h-[40px] px-[16px] text-[14px] font-black uppercase hover:text-accent" onClick={onClose}>
            Cancel
          </button>
          {bit.connected && (
            <Pill data-testid="monetize-bandsintown-import" onClick={() => run("monetize.importBandsintown", importBandsintown, "content.write", "Events imported from Bandsintown (simulated)")}>
              Import Now
            </Pill>
          )}
          <Pill
            disabled={!artist.trim()}
            data-testid="monetize-bandsintown-save"
            onClick={() => {
              if (run("monetize.saveBandsintown", (d) => saveBandsintown(d, { artist: artist.trim(), autoImport: auto, connected: true }), "content.write", bit.connected ? "Settings saved" : "Bandsintown connected (simulated)")) onClose();
            }}
          >
            {bit.connected ? "Save" : "Connect & Save"}
          </Pill>
        </div>
      </div>
    </Modal>
  );
}
