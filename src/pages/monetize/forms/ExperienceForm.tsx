/**
 * Create / Edit Experience, rebuilt from the reference screen pack (experience-02 … experience-16).
 * Layout: Monetize pills, back arrow + title + DISABLE/ENABLE, one card, CREATE below the card.
 *
 * Decisions (reference section 8):
 * - DISABLE / ENABLE keeps this prototype's meaning: Disabled experiences are saved but not on the Store.
 * - Google / Outlook Calendar: no OAuth in this demo. The buttons say so and change nothing.
 * - Experience types are shown with the reference labels but stored with the existing values
 *   ("1:1 Video Call", "In Person Session", …) because other areas (bio links, assistant) read them.
 * - Create = content.write. Changing an existing item's prices = Confirm + finance.write.
 */
import { useEffect, useState } from "react";
import { CalendarClock, Info, Plus, Trash2 } from "lucide-react";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { act, getData, useData } from "../../../store/store";
import { itemById, linkSaved, syncFromScreen } from "../../../store/slices/content";
import { addProduct, money, setProductPrice, updateProduct, type ExperienceSchedule, type Product } from "../../../store/slices/monetize";
import { InfoIcon, Select } from "../../../platform/ui/controls";
import { Modal } from "../../../platform/ui/surfaces";
import {
  ChipChoice, ConfirmModal, MoneyInput, MonetizeFrame, NFT_TIP, NftContracts, Pill, RefFormHeader, RoundCheck, TagSelect, TextArea, TextInput, UploadTile, useRun,
} from "../ui";

/** Reference labels → stored values (kept for compatibility with bio links, the assistant and seed data). */
export const EXPERIENCE_TYPE_OPTIONS = [
  { value: "1:1 Video Call", label: "One to One Call / Video Conferencing", tag: "Calendar Scheduling" },
  { value: "In Person Session", label: "In-Person Meetup", tag: "Calendar Scheduling" },
  { value: "Personalized Video", label: "Personalized Video" },
  { value: "Social Media Interaction", label: "Social Media Follow or Post" },
  { value: "Other", label: "Custom Experience" },
];
const SCHEDULED = new Set(["1:1 Video Call", "In Person Session"]);
export const isScheduledType = (t?: string | null) => !!t && SCHEDULED.has(t);

export const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
export const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  return `${h % 12 === 0 ? 12 : h % 12}:${i % 2 ? "30" : "00"} ${h < 12 ? "AM" : "PM"}`;
});
export const DURATIONS = ["10 Minutes", "15 Minutes", "30 Minutes", "45 Minutes", "1 Hour", "1.5 Hours", "2 Hours"];
export const MIN_NOTICE = ["1 Hour", "2 Hours", "4 Hours", "6 Hours", "12 Hours", "24 Hours", "48 Hours"];
export const MAX_ADVANCE = ["5 Days", "7 Days", "10 Days", "15 Days", "30 Days", "60 Days", "90 Days"];
export const DEFAULT_SCHEDULE: ExperienceSchedule = { days: ["MON", "TUE", "WED", "THU", "FRI"], from: "9:00 AM", to: "5:00 PM", minNotice: "12 Hours", maxAdvance: "15 Days" };

type Row = { label: string; price: string };
type Addr = NonNullable<Product["address"]>;
const EMPTY_ADDR: Addr = { street: "", country: "", state: "", city: "", postal: "" };
const ADDR_FIELDS: [keyof Addr, string][] = [["street", "Street Address"], ["country", "Country"], ["state", "State"], ["city", "City"], ["postal", "Postal Code"]];
const CAL_NOTICE = (which: string) => `Connecting ${which} isn't available in this demo, so nothing was connected. You can still set your availability below and create the experience.`;

const Label = ({ children, info, htmlFor }: { children: React.ReactNode; info?: string; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="mb-[12px] flex items-center text-[16px] text-white">
    {children}
    {info && <InfoIcon text={info} />}
  </label>
);
const Err = ({ show, children }: { show: boolean; children: string }) => (show && children ? <p className="mt-[8px] pl-[24px] text-[13px] font-medium text-danger">{children}</p> : null);

export function ExperienceForm({ routeId, p, workId }: { routeId: string; p: Product | null; workId?: string }) {
  const { navigate } = useRouter();
  const run = useRun();
  const plans = useData((d) => d.monetize.plans.filter((x) => x.active));
  const back = pathFor("monetize-experience");

  // Assistant hand-off (?work=<id>): validated before it is applied. Starts Disabled so nothing goes live.
  const work = workId ? itemById(getData(), workId) : null;
  const we = work?.experience;
  const workType = we && EXPERIENCE_TYPE_OPTIONS.some((o) => o.value === we.experienceType) ? we.experienceType : null;
  const workPrice = we && typeof we.price === "number" && we.price > 0 ? String(we.price) : "";

  const [type, setType] = useState<string | null>(p?.experienceType ?? workType);
  const [title, setTitle] = useState(p?.title ?? (we?.title ?? "").slice(0, 80));
  const [description, setDescription] = useState(p?.description ?? we?.description ?? "");
  const legacyPrice = p?.price != null ? String(p.price) : workPrice;
  const [rows, setRows] = useState<Row[]>(
    p?.experienceOptions?.map((o) => ({ label: o.label, price: String(o.price) })) ?? [{ label: "", price: isScheduledType(p?.experienceType ?? workType) ? "" : legacyPrice }],
  );
  const [durs, setDurs] = useState<Row[]>(
    p?.durations?.map((o) => ({ label: DURATIONS.includes(o.label) ? o.label : "", price: String(o.price) })) ?? [{ label: we?.duration && DURATIONS.includes(we.duration) ? we.duration : "", price: isScheduledType(p?.experienceType ?? workType) ? legacyPrice : "" }],
  );
  const [sched, setSched] = useState<ExperienceSchedule>(p?.schedule ?? DEFAULT_SCHEDULE);
  const [addr, setAddr] = useState<Addr>(p?.address ?? EMPTY_ADDR);
  const [custom, setCustom] = useState(p?.customInstructions ?? "");
  const [subsOn, setSubsOn] = useState(p ? !!p.restrict?.planIds.length || p.locked : false);
  const [planIds, setPlanIds] = useState<string[]>(p?.restrict?.planIds ?? (p?.locked ? plans.map((x) => x.id) : []));
  const [nftOn, setNftOn] = useState(!!p?.restrict?.nftContracts.length);
  const [nfts, setNfts] = useState<string[]>(p?.restrict?.nftContracts ?? []);
  const [image, setImage] = useState<string | null>(p?.image ?? (we ? work?.media?.key ?? null : null));
  const [imageName, setImageName] = useState(we && work?.media ? work.media.label : "");
  const [published, setPublished] = useState(p?.published ?? (we ? false : true));
  const [calOpen, setCalOpen] = useState(false);
  const [calNotice, setCalNotice] = useState("");
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const scheduled = isScheduledType(type);
  const inPerson = type === "In Person Session";
  const isCustom = type === "Other";
  const priceRows = scheduled ? durs : rows;
  const nums = priceRows.map((r) => Number(r.price));
  const priceNum = nums.length && nums.every((n) => n > 0) ? Math.min(...nums) : NaN;

  const errors = {
    type: type ? "" : "Type of Experience is required",
    title: title.trim() ? "" : "Title is required",
    description: description.trim() ? "" : "Description is required",
    options: scheduled
      ? durs.some((r) => !r.label || !(Number(r.price) > 0)) ? "Choose a duration and enter a price for each option" : new Set(durs.map((r) => r.label)).size !== durs.length ? "Each duration can only be listed once" : ""
      : rows.some((r) => !r.label.trim() || !(Number(r.price) > 0)) ? "Enter a description and a price for each option" : "",
    days: scheduled && !sched.days.length ? "Choose at least one day" : "",
    hours: scheduled && TIMES.indexOf(sched.from) >= TIMES.indexOf(sched.to) ? "Available To must be later than Available From" : "",
    address: inPerson && ADDR_FIELDS.some(([k]) => !addr[k].trim()) ? "Fill in every address field" : "",
    subs: subsOn && !planIds.length ? (plans.length ? "Choose at least one subscription" : "You have no active subscriptions. Unselect Subscribers or create a plan first.") : "",
    nft: nftOn && !nfts.length ? "Add at least one NFT contract address" : "",
    image: image ? "" : "Experience Preview Image is required",
  };
  const valid = !Object.values(errors).some(Boolean);

  const durations = scheduled ? durs.map((r) => ({ label: r.label, price: Number(r.price) })) : undefined;
  const experienceOptions = scheduled ? undefined : rows.map((r) => ({ label: r.label.trim(), price: Number(r.price) }));
  const details = {
    title: title.trim(),
    description: description.trim(),
    experienceType: type ?? undefined,
    image,
    locked: subsOn,
    published,
    experienceOptions,
    schedule: scheduled ? sched : undefined,
    address: inPerson ? { ...addr } : undefined,
    customInstructions: isCustom && custom.trim() ? custom.trim() : undefined,
    restrict: subsOn || nftOn ? { planIds: subsOn ? planIds : [], nftContracts: nftOn ? nfts : [] } : undefined,
  };

  // Keep the assistant's copy in step with what the creator types here.
  useEffect(() => {
    if (!workId || !we) return;
    const t = setTimeout(() => {
      const cur = itemById(getData(), workId)?.experience;
      const price = Number(priceRows[0]?.price) > 0 ? Number(priceRows[0].price) : null;
      if (cur && (cur.title !== title || cur.description !== description || (price && cur.price !== price)))
        act("content.syncExperience", (d) => syncFromScreen(d, workId, { title, description, price }), { need: "content.write" });
    }, 600);
    return () => clearTimeout(t);
  }, [title, description, priceRows[0]?.price]);

  const pricesOf = (x: { label: string; price: number }[] | undefined) => JSON.stringify(x?.map((o) => [o.label, o.price]) ?? null);
  const priceChanged =
    !!p && (p.price !== priceNum || (scheduled ? pricesOf(p.durations) !== pricesOf(durations) : !!p.durations?.length || (!!p.experienceOptions && pricesOf(p.experienceOptions) !== pricesOf(experienceOptions))));

  const save = () => {
    setTried(true);
    if (!valid) return;
    if (!p) {
      const ok = run(
        "monetize.addExperience",
        (d) => {
          const id = addProduct(d, { kind: "experience", ...details, price: priceNum, durations, external: false, source: "native" });
          if (workId && we) linkSaved(d, workId, { productId: id }, details.published ? "active" : "saved");
        },
        "content.write",
        `${details.title} added to your Store`,
      );
      if (ok) navigate(back);
      return;
    }
    if (priceChanged) return setConfirm(true);
    if (run("monetize.updateProduct", (d) => updateProduct(d, p.id, { ...details, durations }), "content.write", "Changes saved")) navigate(back);
  };
  const confirmPrice = () => {
    if (!p) return;
    if (!run("monetize.setProductPrice", (d) => setProductPrice(d, p.id, priceNum, durations), "finance.write")) return setConfirm(false);
    if (run("monetize.updateProduct", (d) => updateProduct(d, p.id, { ...details, durations }), "content.write", "Changes and new price saved")) navigate(back);
  };

  const pickType = (v: string) => {
    if (isScheduledType(v) && !isScheduledType(type)) setCalOpen(true);
    // carry a single typed price across when switching between option styles
    if (isScheduledType(v) !== isScheduledType(type)) {
      if (isScheduledType(v) && durs.length === 1 && !durs[0].price && rows[0]?.price) setDurs([{ ...durs[0], price: rows[0].price }]);
      if (!isScheduledType(v) && rows.length === 1 && !rows[0].price && durs[0]?.price) setRows([{ ...rows[0], price: durs[0].price }]);
    }
    setType(v);
  };
  const calButtons = (where: string) => (
    <div className="flex flex-wrap gap-[12px]">
      {(["Google Calendar", "Outlook Calendar"] as const).map((c) => (
        <Pill key={c} data-testid={`monetize-exp-cal-${c.split(" ")[0].toLowerCase()}${where}`} onClick={() => setCalNotice(CAL_NOTICE(c))} icon={<CalendarClock size={18} />}>
          <span className="normal-case tracking-normal">{c}</span>
        </Pill>
      ))}
    </div>
  );
  const notice = calNotice && (
    <p role="status" data-testid="monetize-exp-cal-notice" className="mt-[12px] flex items-start gap-[8px] rounded-[12px] bg-bg px-[16px] py-[10px] text-[13px] leading-[19px] text-soft">
      <Info size={16} className="mt-[1px] shrink-0 text-accent" />
      {calNotice}
    </p>
  );

  const rowsEditor = (list: Row[], set: (r: Row[]) => void, durationsMode: boolean) => (
    <div className="flex flex-col gap-[14px]" data-testid={durationsMode ? "monetize-product-durations" : "monetize-exp-options"}>
      {list.map((r, i) => (
        <div key={i} className="flex items-center gap-[16px]" data-testid={durationsMode ? "monetize-exp-duration-row" : "monetize-exp-option-row"}>
          <div className="min-w-0 flex-1">
            {durationsMode ? (
              <Select value={r.label || null} options={DURATIONS} placeholder="Select Duration" onChange={(v) => set(list.map((x, j) => (j === i ? { ...x, label: v } : x)))} invalid={tried && !r.label} />
            ) : (
              <TextInput value={r.label} maxLength={80} aria-label="Option Description" placeholder="Option Description" onChange={(e) => set(list.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} invalid={tried && !r.label.trim()} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <MoneyInput value={r.price} label="Option Price" testid={i === 0 ? "monetize-product-price" : undefined} onChange={(v) => set(list.map((x, j) => (j === i ? { ...x, price: v } : x)))} invalid={tried && !(Number(r.price) > 0)} />
          </div>
          {list.length > 1 && (
            <button type="button" aria-label="Delete option" data-testid="monetize-exp-option-delete" onClick={() => set(list.filter((_, j) => j !== i))} className="shrink-0 text-white hover:text-accent">
              <Trash2 size={20} />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        data-testid={durationsMode ? "monetize-product-add-duration" : "monetize-exp-add-option"}
        onClick={() => set([...list, { label: "", price: "" }])}
        className="flex items-center gap-[4px] self-end text-[14px] text-white hover:text-accent"
      >
        <Plus size={16} strokeWidth={2.5} />
        Add Another Option
      </button>
      <Err show={tried}>{errors.options}</Err>
    </div>
  );

  return (
    <MonetizeFrame routeId={routeId} active="monetize-experience">
      <RefFormHeader title={p ? "Edit Experience" : "Create Experiences"} backTo={back} enabled={published} onEnabled={setPublished} what="experience" testid="monetize-product-enable" />
      {!published && <p className="mt-[10px] text-right text-[13px] text-muted" data-testid="monetize-exp-disabled-note">Disabled: saved, but not shown on your Store until you enable it.</p>}
      <div className="mt-[20px] flex flex-col gap-[22px] rounded-card bg-surface p-[30px]" data-testid="monetize-exp-card">
        <div>
          <Label>Type of Experience *</Label>
          <TagSelect value={type} options={EXPERIENCE_TYPE_OPTIONS} onChange={pickType} testid="monetize-product-type" label="Type of Experience" invalid={tried && !!errors.type} />
          <Err show={tried}>{errors.type}</Err>
        </div>
        <div>
          <Label htmlFor="exp-title">Enter Title *</Label>
          <TextInput id="exp-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Write title here…" data-testid="monetize-product-title" invalid={tried && !!errors.title} />
          <Err show={tried}>{errors.title}</Err>
        </div>
        <div>
          <Label htmlFor="exp-desc">Description *</Label>
          <TextArea id="exp-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Please describe the experience…" data-testid="monetize-product-description" className="!min-h-[118px]" invalid={tried && !!errors.description} />
          <Err show={tried}>{errors.description}</Err>
        </div>

        {isCustom && (
          <div>
            <Label htmlFor="exp-custom">Optional: Custom Experience Instructions</Label>
            <TextArea id="exp-custom" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Tell fans what they need to send you after purchase…" data-testid="monetize-exp-custom" className="!min-h-[90px]" />
          </div>
        )}

        {scheduled ? (
          <div className="flex flex-col gap-[22px]" data-testid="monetize-exp-scheduling">
            <div>
              <Label info="Fans can only book inside the days and hours you set below. Calendar linking isn't available in this demo, so bookings aren't checked against an external calendar.">
                <span className="font-bold">Calendar Scheduling</span>
              </Label>
              <div className="rounded-[14px] border border-accent p-[16px]">
                <p className="mb-[14px] text-[14px] text-soft">Link your Google or Outlook calendar to make Experience bookings and avoid calendar conflicts.</p>
                {calButtons("")}
                {!calOpen && notice}
              </div>
            </div>
            <div className="grid grid-cols-7 gap-[10px] max-[1200px]:grid-cols-6" role="group" aria-label="Available days" data-testid="monetize-exp-days">
              {DAYS.map((day) => {
                const on = sched.days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    data-testid={`monetize-exp-day-${day.toLowerCase()}`}
                    onClick={() => setSched({ ...sched, days: on ? sched.days.filter((x) => x !== day) : DAYS.filter((x) => x === day || sched.days.includes(x)) })}
                    className={`h-[40px] rounded-pill border border-accent text-[14px] font-black ${on ? "bg-accent text-white" : "text-white hover:bg-accent-tint"}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <Err show={tried}>{errors.days}</Err>
            <div className="grid grid-cols-2 gap-[24px]">
              <div data-testid="monetize-exp-from">
                <Label>Available From</Label>
                <Select value={sched.from} options={TIMES} onChange={(v) => setSched({ ...sched, from: v })} />
              </div>
              <div data-testid="monetize-exp-to">
                <Label>Available To</Label>
                <Select value={sched.to} options={TIMES} onChange={(v) => setSched({ ...sched, to: v })} invalid={tried && !!errors.hours} />
              </div>
            </div>
            <Err show={tried}>{errors.hours}</Err>
            <div>
              <Label>
                <span className="font-bold">Meeting Duration Options</span>
              </Label>
              {rowsEditor(durs, setDurs, true)}
            </div>
            {inPerson && (
              <div className="grid grid-cols-2 gap-[18px]" data-testid="monetize-exp-address">
                {ADDR_FIELDS.map(([k, l]) => (
                  <div key={k} className={k === "street" ? "col-span-2" : ""}>
                    <Label htmlFor={`exp-${k}`}>{l} *</Label>
                    <TextInput id={`exp-${k}`} value={addr[k]} maxLength={k === "postal" ? 12 : 120} onChange={(e) => setAddr({ ...addr, [k]: e.target.value })} placeholder={l} data-testid={`monetize-exp-${k}`} invalid={tried && !addr[k].trim()} />
                  </div>
                ))}
                <div className="col-span-2 -mt-[10px]">
                  <Err show={tried}>{errors.address}</Err>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-[24px]">
              <div data-testid="monetize-exp-min-notice">
                <Label>Minimum Booking Notice</Label>
                <Select value={sched.minNotice} options={MIN_NOTICE} onChange={(v) => setSched({ ...sched, minNotice: v })} />
              </div>
              <div data-testid="monetize-exp-max-advance">
                <Label>Maximum Advance Booking</Label>
                <Select value={sched.maxAdvance} options={MAX_ADVANCE} onChange={(v) => setSched({ ...sched, maxAdvance: v })} />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <Label>Experience Options *</Label>
            {rowsEditor(rows, setRows, false)}
          </div>
        )}

        <div data-testid="monetize-exp-restrict">
          <p className="mb-[14px] text-[16px]">Restrict Ability to Purchase this Experience</p>
          <div className="grid grid-cols-2 gap-[24px]">
            <div data-testid="monetize-product-lock">
              <RoundCheck on={subsOn} onClick={() => setSubsOn(!subsOn)} label="Subscribers" testid="monetize-exp-restrict-subscribers">
                Subscribers
              </RoundCheck>
              {subsOn && (
                <div className="mt-[16px]" data-testid="monetize-exp-subs-options">
                  <p className="mb-[12px] text-[16px]">Select Subscription Options</p>
                  {plans.length ? (
                    <ChipChoice multi options={plans.map((x) => x.name)} value={plans.filter((x) => planIds.includes(x.id)).map((x) => x.name)} onToggle={(v) => { const id = plans.find((x) => x.name === v)!.id; setPlanIds(planIds.includes(id) ? planIds.filter((x) => x !== id) : [...planIds, id]); }} testid="monetize-exp-plan" />
                  ) : (
                    <p className="text-[16px] font-bold" data-testid="monetize-exp-no-plans">No active subscription found.</p>
                  )}
                  <Err show={tried}>{errors.subs}</Err>
                </div>
              )}
            </div>
            <div>
              <RoundCheck on={nftOn} onClick={() => setNftOn(!nftOn)} label="NFT Holders" testid="monetize-exp-restrict-nft">
                NFT Holders
              </RoundCheck>
              {nftOn && (
                <div className="mt-[16px]">
                  <p className="mb-[12px] flex items-center justify-between text-[16px]">
                    Add NFT Contract Address
                    <InfoIcon text={NFT_TIP} />
                  </p>
                  <NftContracts value={nfts} onChange={setNfts} testid="monetize-exp-nft" />
                  <Err show={tried}>{errors.nft}</Err>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <Label>Experience Preview Image *</Label>
          <UploadTile
            src={image}
            name={imageName}
            testid="monetize-product-image"
            onPick={(name, file) => {
              setImageName(name);
              setImage(URL.createObjectURL(file));
            }}
          />
          <Err show={tried}>{errors.image}</Err>
        </div>
      </div>

      <div className="mt-[20px] flex items-center gap-[12px]">
        <Pill data-testid="monetize-product-save" onClick={save}>
          {p ? "Update" : "Create"}
        </Pill>
        <button type="button" onClick={() => navigate(back)} data-testid="monetize-product-cancel" className="h-[40px] px-[16px] text-[14px] font-black uppercase hover:text-accent">
          Cancel
        </button>
        {tried && !valid && <span className="text-[13px] font-medium text-danger" data-testid="monetize-exp-invalid">Fill in the highlighted fields.</span>}
      </div>

      <Modal open={calOpen} onClose={() => setCalOpen(false)} title="Link Your Calendar" width={560} divider={false}>
        <div data-testid="modal-monetize-exp-calendar" className="flex flex-col items-center text-center">
          <CalendarClock size={56} className="text-accent" />
          <p className="mt-[16px] text-[15px] leading-[22px]">
            This will allow fans to choose an available time on your calendar. You'll be able to set your specific availability (days and times) for the fulfillment of experiences.
          </p>
          <div className="mt-[20px]">{calButtons("-dialog")}</div>
          {notice}
          <p className="mt-[18px] flex items-start gap-[8px] rounded-[12px] bg-accent/20 px-[16px] py-[12px] text-left text-[13px] leading-[19px]">
            <Info size={16} className="mt-[1px] shrink-0" />
            Once linked, booked experiences will automatically show on your calendar along with video meeting details.
          </p>
        </div>
      </Modal>

      <ConfirmModal open={confirm} title="Change Price" confirmLabel="Change Price" testid="monetize-product-price" onClose={() => setConfirm(false)} onConfirm={confirmPrice}>
        <p>
          <b>{p?.title}</b>: {p?.price != null ? money(p.price) : "—"} → <b>{money(priceNum)}</b>
          {` (${(durations ?? experienceOptions ?? []).map((d) => `${d.label} ${money(d.price)}`).join(", ")})`}
        </p>
        <p className="mt-[8px] text-[14px] text-muted">Fans will see the new price on your Store right away.</p>
      </ConfirmModal>
    </MonetizeFrame>
  );
}
