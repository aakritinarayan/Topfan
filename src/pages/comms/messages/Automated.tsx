/**
 * SETUP AUTOMATED MESSAGES tab (13i empty state) and the Setup Automated Messages modal (13j, 13k).
 * SAVE is Confirm tier: an automated message sends by itself, so it needs explicit approval. Needs content.write.
 */
import { useRef, useState } from "react";
import { Bot, Camera, ChevronDown, Mic, Pencil, Tag, Trash2 } from "lucide-react";
import { act, useData } from "../../../store/store";
import {
  AUTOMATED_EVENT_TYPES,
  deleteAutomatedMessage,
  saveAutomatedMessage,
  toggleAutomatedMessage,
  updateAutomatedMessage,
  type CommsAutomatedMessage,
} from "../../../store/slices/comms";
import { Button, FieldError, TextButton, Toggle, useOutside } from "../../../platform/ui/controls";
import { useToast } from "../../../platform/ui/toast";
import { CommsModal, ConfirmModal, CountedTextarea } from "../ui";

export function AutomatedTab() {
  const list = useData((d) => d.comms.automatedMessages);
  const toast = useToast();
  const [editing, setEditing] = useState<CommsAutomatedMessage | "new" | null>(null);
  const [del, setDel] = useState<CommsAutomatedMessage | null>(null);
  return (
    <div data-testid="messages-automated">
      <div className="mt-[29px] flex h-[40px] items-center justify-between">
        <h2 className="text-[24px] font-bold">Automated Messages</h2>
        <Button data-testid="messages-automated-new" className="!font-normal !normal-case !tracking-normal" onClick={() => setEditing("new")}>
          + Setup New Message
        </Button>
      </div>
      {list.length === 0 ? (
        <div className="mt-[20px] flex h-[372px] flex-col items-center justify-center rounded-panel bg-surface" data-testid="messages-automated-empty">
          <span className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-accent/20">
            <Bot size={52} strokeWidth={1.6} className="text-accent" />
          </span>
          <p className="mt-[40px] text-[18px] text-soft">You have not setup any automated messages yet.</p>
        </div>
      ) : (
        // inferred: the populated list was not captured
        <ul className="mt-[20px] space-y-[12px]">
          {list.map((a) => (
            <li key={a.id} data-testid={`messages-automated-row-${a.id}`} className="flex items-start gap-[24px] rounded-panel bg-surface px-[24px] py-[20px]">
              <div className="min-w-[0px] flex-1">
                <p className="text-[16px] font-bold">{a.event}</p>
                <p className="mt-[8px] whitespace-pre-wrap text-[14px] text-soft">{a.text}</p>
                {(a.attachment || a.price) && (
                  <p className="mt-[8px] text-[12px] text-muted">
                    {a.attachment && <>Attachment: {a.attachment}</>}
                    {a.attachment && a.price ? " · " : ""}
                    {a.price ? <>Price: ${a.price.toFixed(2)}</> : null}
                  </p>
                )}
              </div>
              <span className="flex items-center gap-[8px] pt-[4px] text-[14px]">
                <Toggle
                  on={a.active}
                  label={a.active ? "Deactivate" : "Activate"}
                  onChange={() => {
                    const res = act("comms.toggleAutomatedMessage", (d) => toggleAutomatedMessage(d, a.id), { need: "content.write" });
                    if (!res.ok) toast(res.reason);
                  }}
                />
                {a.active ? "Active" : "Inactive"}
              </span>
              <button aria-label="Edit automated message" data-testid={`messages-automated-edit-${a.id}`} onClick={() => setEditing(a)} className="pt-[4px] hover:text-accent">
                <Pencil size={18} />
              </button>
              <button aria-label="Delete automated message" data-testid={`messages-automated-delete-${a.id}`} onClick={() => setDel(a)} className="pt-[4px] hover:text-accent">
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <SetupAutomatedModal key={editing === "new" ? "new" : editing?.id ?? "closed"} open={!!editing} existing={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      <ConfirmModal
        open={!!del}
        title="Delete Automated Message"
        confirmLabel="Delete"
        testid="modal-automated-delete"
        onCancel={() => setDel(null)}
        onConfirm={() => {
          if (!del) return;
          const res = act("comms.deleteAutomatedMessage", (d) => deleteAutomatedMessage(d, del.id), { need: "content.write" });
          setDel(null);
          toast(res.ok ? "Automated message deleted" : res.reason);
        }}
      >
        Fans will no longer receive the "{del?.event}" message.
      </ConfirmModal>
    </div>
  );
}

function SetupAutomatedModal({ open, existing, onClose }: { open: boolean; existing: CommsAutomatedMessage | null; onClose: () => void }) {
  const toast = useToast();
  const [event, setEvent] = useState<string | null>(existing?.event ?? null);
  const [text, setText] = useState(existing?.text ?? "");
  const [attachment, setAttachment] = useState<string | null>(existing?.attachment ?? null);
  const [price, setPrice] = useState<string>(existing?.price ? String(existing.price) : "");
  const [showPrice, setShowPrice] = useState(!!existing?.price);
  const [errors, setErrors] = useState<{ event?: string; text?: string }>({});
  const [confirm, setConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const save = () => {
    const e: typeof errors = {};
    if (!event) e.event = "Event Type is required";
    if (!text.trim()) e.text = "Automated Message Text is required";
    setErrors(e);
    if (!Object.keys(e).length) setConfirm(true);
  };
  const commit = () => {
    const input = { event: event!, text: text.trim(), attachment, price: showPrice && Number(price) > 0 ? Number(price) : null };
    const res = existing
      ? act("comms.updateAutomatedMessage", (d) => updateAutomatedMessage(d, existing.id, input), { need: "content.write" })
      : act("comms.saveAutomatedMessage", (d) => saveAutomatedMessage(d, input), { need: "content.write" });
    setConfirm(false);
    if (!res.ok) return toast(res.reason);
    toast("Automated message saved");
    onClose();
  };
  const icon = "flex h-[32px] w-[32px] items-center justify-center text-white hover:text-accent";

  return (
    <>
      <CommsModal open={open && !confirm} onClose={onClose} title="Setup Automated Messages" testid="modal-setup-automated" width={450} top={128} bodyClass="px-[20px] pb-[30px] pt-[25px]">
        <label className="mb-[16px] block text-[16px]">Event Type*</label>
        <EventSelect value={event} onChange={(v) => (setEvent(v), setErrors((x) => ({ ...x, event: undefined })))} invalid={!!errors.event} />
        <FieldError>{errors.event}</FieldError>
        <div className="mb-[16px] mt-[22px] flex items-center justify-between" ref={areaRef}>
          <label htmlFor="am-text" className="text-[16px]">
            Automated Message Text*
          </label>
          <button type="button" data-testid="messages-automated-insert-name" className="text-[14px] text-accent hover:brightness-125" onClick={() => setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}{First Name}`.slice(0, 1000))}>
            + Insert First Name
          </button>
        </div>
        <CountedTextarea
          id="am-text"
          testid="messages-automated-text"
          value={text}
          onChange={(v) => (setText(v), setErrors((x) => ({ ...x, text: undefined })))}
          placeholder="Enter the required messages text"
          className={`h-[110px] rounded-panel !px-[24px] !py-[18px] ${errors.text ? "ring-1 ring-danger" : ""}`}
        />
        <FieldError>{errors.text}</FieldError>
        <div className="mt-[22px] flex h-[50px] items-center gap-[4px] rounded-[25px] bg-bg px-[16px]">
          <button type="button" aria-label="Attach a photo or video" data-testid="messages-automated-camera" className={icon} onClick={() => fileRef.current?.click()}>
            <Camera size={22} className="fill-white text-bg" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setAttachment(f.name); // mock: name only
              e.target.value = "";
            }}
          />
          <button type="button" aria-label="Attach a voice note" data-testid="messages-automated-mic" className={icon} onClick={() => setAttachment("Voice note.m4a")}>
            <Mic size={20} className="fill-white" />
          </button>
          <button type="button" aria-label="Set a price" data-testid="messages-automated-price" className={`${icon} ${showPrice ? "" : "opacity-70"}`} onClick={() => setShowPrice((s) => !s)}>
            <Tag size={19} className="-scale-x-100" />
          </button>
          {showPrice && (
            <span className="ml-[8px] flex items-center gap-[4px] text-[14px]">
              $
              <input
                aria-label="Price"
                data-testid="messages-automated-price-input"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                className="w-[64px] rounded bg-surface px-[8px] py-[4px] text-[14px] outline-none"
              />
            </span>
          )}
          {attachment && (
            <span className="ml-auto flex max-w-[150px] items-center gap-[4px] truncate text-[12px] text-soft">
              <span className="truncate">{attachment}</span>
              <button aria-label="Remove attachment" className="text-accent" onClick={() => setAttachment(null)}>
                ✕
              </button>
            </span>
          )}
        </div>
        <div className="mt-[28px] flex items-center justify-end gap-[26px]">
          <TextButton data-testid="messages-automated-cancel" onClick={onClose} className="!px-[0px]">
            Cancel
          </TextButton>
          <Button data-testid="messages-automated-save" className="w-[95px]" onClick={save}>
            Save
          </Button>
        </div>
      </CommsModal>
      <ConfirmModal
        open={open && confirm}
        title={existing ? "Update Automated Message" : "Activate Automated Message"}
        confirmLabel={existing ? "Update" : "Activate"}
        testid="modal-automated-confirm"
        onCancel={() => setConfirm(false)}
        onConfirm={commit}
      >
        This message will be sent automatically to every fan when this happens: <b className="text-white">{event}</b>.
        <span className="mt-[12px] block rounded-inner bg-bg p-[12px] text-white">{text}</span>
      </ConfirmModal>
    </>
  );
}

/** ng-select look: #191a1c pill 56px; dropdown #272a2b r16, highlighted row accent (13k). */
function EventSelect({ value, onChange, invalid }: { value: string | null; onChange: (v: string) => void; invalid?: boolean }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-testid="messages-automated-event"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-[56px] w-full items-center justify-between rounded-pill bg-bg pl-[20px] pr-[24px] text-left text-[16px] font-medium ${invalid ? "ring-1 ring-danger" : ""}`}
      >
        <span>{value ?? "Select Event Type"}</span>
        <ChevronDown size={20} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul role="listbox" className="absolute left-[0px] right-[0px] top-[66px] z-30 rounded-inner bg-surface py-[20px] shadow-[0_4px_16px_rgba(0,0,0,.45)]">
          {AUTOMATED_EVENT_TYPES.map((o, i) => (
            <li key={o}>
              <button
                type="button"
                role="option"
                aria-selected={o === value}
                data-testid={`messages-automated-event-${i}`}
                onMouseEnter={() => setHi(i)}
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
                className={`flex h-[38.5px] w-full items-center px-[20px] text-left text-[14px] ${hi === i ? "bg-accent" : ""}`}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
