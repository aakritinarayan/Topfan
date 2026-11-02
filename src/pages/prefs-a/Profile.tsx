/**
 * Preferences › Profile (/edit-preference) — spec 30, shots 30-*, 30a–30e.
 * Personal data is fictional (see store/slices/prefsA.ts). Uploads stay local (file name + object URL).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CalendarDays, Camera, ChevronDown, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import type { PageProps } from "../types";
import { PreferencesPage } from "../../platform/PreferencesPage";
import { Button, FieldError, Input, Select, TextButton, useOutside } from "../../platform/ui/controls";
import { Avatar, ImageSlot, Modal } from "../../platform/ui/surfaces";
import { useData } from "../../store/store";
import { changeEmail, isEmail, updateProfile, type PrefProfile } from "../../store/slices/prefsA";
import { COUNTRIES, DIAL_PINNED, citiesFor, countryByIso, countryByName, flag, US_STATES } from "./data";
import { InfoPop, PasswordField, useRun } from "./ui";

const LEGAL_INFO = "Your Legal First and Last Name is not publicly displayed. If you need change your legal name, please contact Customer Support.";
const PHONE_INFO =
  "By providing your Mobile Phone Number, you will be able to receive SMS text messages from creators you interact with about their new content and special offers. You can opt out of text messages for individual creators in your Privacy & Password preferences.";
const CURRENCY_INFO = "If you need to change your Currency, please contact Customer Support.";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return y ? `${MONTHS[m - 1]} ${d}, ${y}` : "";
};

function Field({ label, required, info, htmlFor, children, className = "" }: { label: string; required?: boolean; info?: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-4 flex h-[19px] items-center text-base">
        {label}
        {required && " *"}
        {info && (
          <InfoPop testid={`pref-profile-info-${htmlFor}`} align="left" className="ml-2">
            {info}
          </InfoPop>
        )}
      </label>
      {children}
    </div>
  );
}

/** Wrapped platform Select with a test hook. */
function TSelect({ testid, ...p }: Parameters<typeof Select>[0] & { testid: string }) {
  return (
    <div data-testid={testid}>
      <Select {...p} />
    </div>
  );
}

export function Profile({ route }: PageProps) {
  const saved = useData((d) => d.prefsA.profile);
  const account = useData((d) => ({ name: d.account.name, avatar: d.account.avatar, cover: d.account.cover }));
  const run = useRun();
  const [f, setF] = useState<PrefProfile>(saved);
  const [displayName, setDisplayName] = useState(account.name);
  const [touched, setTouched] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const coverIn = useRef<HTMLInputElement>(null);
  const avatarIn = useRef<HTMLInputElement>(null);

  useEffect(() => setF(saved), [saved]);
  useEffect(() => () => [coverUrl, avatarUrl].forEach((u) => u && URL.revokeObjectURL(u)), [coverUrl, avatarUrl]);

  const set = <K extends keyof PrefProfile>(k: K, v: PrefProfile[K]) => setF((x) => ({ ...x, [k]: v }));
  const setShip = (k: keyof PrefProfile["shipping"], v: string) => setF((x) => ({ ...x, shipping: { ...x.shipping, [k]: v } }));

  const errors = {
    location: !f.location.trim() ? "General Location is required" : "",
    birthday: !f.birthday ? "Birthday is required" : "",
    displayName: !displayName.trim() ? "Publicly Displayed Name is required" : "",
  };
  const valid = !errors.location && !errors.birthday && !errors.displayName;

  const pick = (e: React.ChangeEvent<HTMLInputElement>, kind: "cover" | "avatar") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file); // local preview only, never uploaded
    if (kind === "cover") {
      setCoverUrl(url);
      set("coverFileName", file.name);
    } else {
      setAvatarUrl(url);
      set("avatarFileName", file.name);
    }
    e.target.value = "";
  };

  const save = () => {
    setTouched(true);
    if (!valid) return;
    run("prefs.updateProfile", (d) => updateProfile(d, { ...f, displayName }), "account.admin", "Profile updated successfully"); // inferred: toast copy
  };

  const states = f.shipping.country === "United States" ? US_STATES : [];
  const cities = useMemo(() => {
    const c = citiesFor(f.shipping.state);
    return c.includes(f.shipping.city) ? c : [f.shipping.city, ...c].filter(Boolean);
  }, [f.shipping.state, f.shipping.city]);

  return (
    <PreferencesPage>
      <div data-testid={`page-${route.id}`}>
        <div className="rounded-card bg-surface p-[30px] pt-0">
          {/* Cover banner bleeds to the card edges */}
          <div className="relative -mx-[30px]">
            <ImageSlot src={coverUrl ?? account.cover} label="Cover photo" rounded="rounded-card" className="aspect-[785/393] w-full" />
            <button
              type="button"
              aria-label="Upload cover photo"
              data-testid="pref-profile-cover-upload"
              onClick={() => coverIn.current?.click()}
              className="absolute bottom-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white hover:brightness-110"
            >
              <Camera size={18} />
            </button>
            <input ref={coverIn} type="file" accept="image/*" hidden onChange={(e) => pick(e, "cover")} data-testid="pref-profile-cover-file" />
            <div className="absolute -bottom-4 left-5">
              <Avatar src={avatarUrl ?? account.avatar} size={96} ring={4} />
              <button
                type="button"
                aria-label="Upload profile photo"
                data-testid="pref-profile-avatar-upload"
                onClick={() => avatarIn.current?.click()}
                className="absolute left-[62px] top-[56px] flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white hover:brightness-110"
              >
                <Camera size={18} />
              </button>
              <input ref={avatarIn} type="file" accept="image/*" hidden onChange={(e) => pick(e, "avatar")} data-testid="pref-profile-avatar-file" />
            </div>
          </div>

          <div className="mt-[35px] grid grid-cols-1 gap-x-[24px] gap-y-[20px] lg:grid-cols-2">
            <Field label="Legal First Name" required info={LEGAL_INFO} htmlFor="pf-first">
              <Input id="pf-first" value={f.legalFirstName} disabled readOnly data-testid="pref-profile-first-name" />
            </Field>
            <Field label="Legal Last Name" info={LEGAL_INFO} htmlFor="pf-last">
              <Input id="pf-last" value={f.legalLastName} disabled readOnly data-testid="pref-profile-last-name" />
            </Field>
            <Field label="Email Address" required htmlFor="pf-email">
              <div className="relative">
                <Input id="pf-email" value={f.email} readOnly data-testid="pref-profile-email" className="pr-14" />
                <button
                  type="button"
                  aria-label="Change email address"
                  data-testid="pref-profile-email-edit"
                  onClick={() => setEmailOpen(true)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-white hover:text-accent"
                >
                  <Pencil size={16} fill="currentColor" />
                </button>
              </div>
            </Field>
            <Field label="Mobile Phone Number" info={PHONE_INFO} htmlFor="pf-phone">
              <PhoneInput iso={f.phoneCountry} phone={f.phone} onIso={(v) => set("phoneCountry", v)} onPhone={(v) => set("phone", v)} />
            </Field>
            <Field label="General Location" required htmlFor="pf-location">
              <Input
                id="pf-location"
                value={f.location}
                onChange={(e) => set("location", e.target.value)}
                invalid={touched && !!errors.location}
                data-testid="pref-profile-location"
              />
              {touched && <FieldError>{errors.location}</FieldError>}
            </Field>
            <Field label="Currency" info={CURRENCY_INFO} htmlFor="pf-currency">
              <Input id="pf-currency" value={f.currency} disabled readOnly data-testid="pref-profile-currency" />
            </Field>
            <Field label="Birthday" required htmlFor="pf-birthday">
              <BirthdayInput value={f.birthday} onChange={(v) => set("birthday", v)} />
              {touched && <FieldError>{errors.birthday}</FieldError>}
            </Field>
            <Field label="Gender" htmlFor="pf-gender">
              <TSelect
                testid="pref-profile-gender"
                id="pf-gender"
                value={f.gender}
                options={["Male", "Female", "Other"]}
                onChange={(v) => set("gender", v as PrefProfile["gender"])}
              />
            </Field>
            <Field label="Publicly Displayed Name" required htmlFor="pf-display">
              <Input
                id="pf-display"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                invalid={touched && !!errors.displayName}
                data-testid="pref-profile-display-name"
              />
              {touched && <FieldError>{errors.displayName}</FieldError>}
            </Field>
            <div className="hidden lg:block" />
            <Field label="Bio" htmlFor="pf-bio" className="lg:col-span-2">
              <div className="rounded-panel bg-bg px-6 py-[17px]">
                <textarea
                  id="pf-bio"
                  value={f.bio}
                  onChange={(e) => set("bio", e.target.value)}
                  data-testid="pref-profile-bio"
                  className="block h-[126px] w-full resize-none bg-transparent text-sm font-black leading-[21px] text-white outline-none"
                />
              </div>
            </Field>
          </div>

          <h3 className="mb-[21px] mt-[40px] text-base font-medium uppercase">Shipping Address</h3>
          <div className="grid grid-cols-1 gap-x-[24px] gap-y-[20px] lg:grid-cols-2">
            <Field label="Country of Residence" htmlFor="pf-country">
              <CountrySelect value={f.shipping.country} onChange={(v) => setShip("country", v)} />
            </Field>
            <Field label="Address" htmlFor="pf-address">
              <Input id="pf-address" value={f.shipping.address} onChange={(e) => setShip("address", e.target.value)} data-testid="pref-profile-address" />
            </Field>
            <Field label="State / Province / District" htmlFor="pf-state">
              {states.length ? (
                <TSelect
                  testid="pref-profile-state"
                  id="pf-state"
                  value={f.shipping.state || null}
                  options={states}
                  onChange={(v) => setF((x) => ({ ...x, shipping: { ...x.shipping, state: v, city: "" } }))}
                />
              ) : (
                // inferred: free-text state outside the US
                <Input id="pf-state" value={f.shipping.state} onChange={(e) => setShip("state", e.target.value)} data-testid="pref-profile-state-text" />
              )}
            </Field>
            <Field label="City" htmlFor="pf-city">
              {states.length ? (
                <TSelect testid="pref-profile-city" id="pf-city" value={f.shipping.city || null} options={cities} onChange={(v) => setShip("city", v)} />
              ) : (
                <Input id="pf-city" value={f.shipping.city} onChange={(e) => setShip("city", e.target.value)} data-testid="pref-profile-city-text" />
              )}
            </Field>
            <Field label="Postal Code" htmlFor="pf-postal">
              <Input id="pf-postal" value={f.shipping.postalCode} onChange={(e) => setShip("postalCode", e.target.value)} data-testid="pref-profile-postal" />
            </Field>
          </div>
        </div>

        <Button className="mt-[34px]" data-testid="pref-profile-update" disabled={touched && !valid} onClick={save}>
          Update Profile
        </Button>

        <ChangeEmailModal open={emailOpen} onClose={() => setEmailOpen(false)} current={saved.email} />
      </div>
    </PreferencesPage>
  );
}

/* ---------------- phone (intl-tel-input look, 30b) ---------------- */

function PhoneInput({ iso, phone, onIso, onPhone }: { iso: string; phone: string; onIso: (v: string) => void; onPhone: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  // Source quirk reproduced: Escape does not close this list (only the toggle, a pick or an outside click).
  const close = useMemo(() => () => setOpen(false), []);
  useOutsideClickOnly(ref, close, open);
  const c = countryByIso(iso) ?? COUNTRIES[0];
  const filtered = COUNTRIES.filter((x) => `${x.name} +${x.dial}`.toLowerCase().includes(q.toLowerCase()));
  const pinned = q ? [] : DIAL_PINNED.map((i) => countryByIso(i)!).filter(Boolean);
  const row = (x: (typeof COUNTRIES)[number], key: string) => (
    <li key={key}>
      <button
        type="button"
        role="option"
        aria-selected={x.iso === iso}
        data-testid={`pref-profile-dial-${x.iso.toLowerCase()}`}
        onClick={() => {
          onIso(x.iso);
          setOpen(false);
          setQ("");
        }}
        className="flex w-full items-center gap-2 px-2.5 py-[5px] text-left text-base hover:bg-white/10"
      >
        <span className="w-5 text-center text-sm">{flag(x.iso)}</span>
        <span>{x.name}</span>
        <span className="ml-1.5 text-white/80">+{x.dial}</span>
      </button>
    </li>
  );
  return (
    <div ref={ref} className="relative">
      <div className="flex h-[55px] items-center rounded-pill bg-bg">
        <button
          type="button"
          aria-label={`Country code +${c.dial}`}
          aria-expanded={open}
          data-testid="pref-profile-dial-toggle"
          onClick={() => setOpen((o) => !o)}
          className="flex h-full w-[100px] shrink-0 items-center justify-center gap-1.5 border-r border-surface text-sm font-black"
        >
          <span className="text-sm">{flag(c.iso)}</span>+{c.dial}
          <ChevronDown size={16} className={open ? "rotate-180" : ""} />
        </button>
        <input
          id="pf-phone"
          type="tel"
          value={phone}
          onChange={(e) => onPhone(e.target.value)}
          data-testid="pref-profile-phone"
          className="h-full min-w-0 flex-1 bg-transparent pl-5 pr-2.5 text-sm font-black text-white outline-none"
        />
      </div>
      {open && (
        <div className="absolute left-0 top-[62px] z-30 w-[417px] max-w-[calc(100vw-32px)] bg-bg shadow-[0_4px_12px_rgba(0,0,0,.4)]" role="dialog" aria-label="Select country code">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Country"
            data-testid="pref-profile-dial-search"
            className="w-full border-b border-white/15 bg-transparent p-4 text-sm text-white outline-none placeholder:text-muted"
          />
          <ul role="listbox" className="max-h-[200px] overflow-y-auto py-1">
            {pinned.map((x) => row(x, `p-${x.iso}`))}
            {pinned.length > 0 && <li aria-hidden className="my-1 border-t border-white/15" />}
            {filtered.map((x) => row(x, x.iso))}
            {filtered.length === 0 && <li className="px-2.5 py-2 text-sm text-muted">No results found</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Like useOutside but ignores Escape (30b quirk). */
function useOutsideClickOnly(ref: React.RefObject<HTMLElement | null>, fn: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const down = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && fn();
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [active, fn, ref]);
}

/* ---------------- birthday (bs-datepicker, 30e) ---------------- */

function BirthdayInput({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useMemo(() => () => setOpen(false), []);
  useOutside(ref, close, open);
  return (
    <div ref={ref} className="relative">
      <button
        id="pf-birthday"
        type="button"
        data-testid="pref-profile-birthday"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-[55px] w-full items-center justify-between rounded-pill bg-bg px-6 text-left text-sm font-black"
      >
        <span>{fmtDate(value)}</span>
        <CalendarDays size={18} className="text-accent" />
      </button>
      {open && (
        <DatePicker
          value={value}
          onPick={(iso) => {
            onChange(iso);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

type View = "years" | "months" | "days";

function DatePicker({ value, onPick }: { value: string; onPick: (iso: string) => void }) {
  const [vy, vm, vd] = value ? value.split("-").map(Number) : [1996, 1, 1];
  const [view, setView] = useState<View>("years");
  const [start, setStart] = useState(vy - 7); // 30e: 1971–1986 with 1978 selected (row 2, col 4)
  const [year, setYear] = useState(vy);
  const [month, setMonth] = useState(vm);
  const label = view === "years" ? `${start} - ${start + 15}` : view === "months" ? `${year}` : `${MONTHS[month - 1]} ${year}`;
  const step = (dir: -1 | 1) => {
    if (view === "years") setStart((s) => s + 16 * dir);
    else if (view === "months") setYear((y) => y + dir);
    else {
      const m = month + dir;
      if (m < 1) (setMonth(12), setYear((y) => y - 1));
      else if (m > 12) (setMonth(1), setYear((y) => y + 1));
      else setMonth(m);
    }
  };
  const cell = (selected: boolean, red: boolean) =>
    `mx-auto flex h-[46px] w-[46px] items-center justify-center rounded-full text-[13px] ${selected ? "bg-accent text-white" : red ? "text-accent" : "text-white"} hover:ring-1 hover:ring-accent`;
  const daysIn = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  return (
    <div
      role="dialog"
      aria-label="Choose birthday"
      data-testid="pref-profile-datepicker"
      className="absolute bottom-[calc(100%+12px)] left-[30px] z-30 w-[290px] rounded-panel border border-accent bg-bg p-2.5 pb-4 shadow-lg"
    >
      <div className="flex h-10 items-center justify-between rounded-pill bg-accent px-1.5">
        <button type="button" aria-label="Previous" data-testid="pref-profile-datepicker-prev" onClick={() => step(-1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-bg">
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          data-testid="pref-profile-datepicker-label"
          onClick={() => setView(view === "days" ? "months" : "years")}
          className="h-7 rounded-pill bg-bg px-3 text-[13px] font-medium"
        >
          {label}
        </button>
        <button type="button" aria-label="Next" data-testid="pref-profile-datepicker-next" onClick={() => step(1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-bg">
          <ChevronRight size={16} />
        </button>
      </div>
      {view === "years" && (
        <div className="mt-2 grid grid-cols-4 gap-y-2">
          {Array.from({ length: 16 }, (_, i) => start + i).map((y, i) => (
            // Source quirk reproduced: every 4th column is drawn in red (weekend styling leaking into the year view).
            <button key={y} type="button" data-testid={`pref-profile-year-${y}`} onClick={() => (setYear(y), setView("months"))} className={cell(y === vy, i % 4 === 3)}>
              {y}
            </button>
          ))}
        </div>
      )}
      {view === "months" && (
        <div className="mt-2 grid grid-cols-3 gap-y-2">
          {MONTHS.map((m, i) => (
            <button key={m} type="button" data-testid={`pref-profile-month-${i + 1}`} onClick={() => (setMonth(i + 1), setView("days"))} className={`${cell(year === vy && i + 1 === vm, false)} w-[70px] rounded-pill`}>
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
      )}
      {view === "days" && (
        <div className="mt-2 grid grid-cols-7 text-center">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <span key={d} className="py-1 text-xs text-muted">
              {d}
            </span>
          ))}
          {Array.from({ length: firstDow }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {Array.from({ length: daysIn }, (_, i) => i + 1).map((d) => {
            const dow = (firstDow + d - 1) % 7;
            return (
              <button
                key={d}
                type="button"
                data-testid={`pref-profile-day-${d}`}
                onClick={() => onPick(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`)}
                className={`mx-auto my-0.5 flex h-8 w-8 items-center justify-center rounded-full text-[13px] ${
                  year === vy && month === vm && d === vd ? "bg-accent" : dow === 0 || dow === 6 ? "text-accent" : ""
                } hover:ring-1 hover:ring-accent`}
              >
                {d}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- country of residence (30c) ---------------- */

function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useMemo(() => () => setOpen(false), []);
  useOutside(ref, close, open);
  const sel = countryByName(value);
  const list = [...(sel ? [sel] : []), ...COUNTRIES.filter((c) => c.name !== value)];
  return (
    <div ref={ref} className="relative" data-testid="pref-profile-country">
      <button
        id="pf-country"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-14 w-full items-center justify-between rounded-pill bg-bg pl-6 pr-5 text-left text-sm ${open ? "ring-1 ring-accent" : ""}`}
      >
        <span className="flex items-center gap-2.5">
          {sel && <span className="text-base">{flag(sel.iso)}</span>}
          {value || <span className="font-bold text-muted">Select</span>}
        </span>
        <ChevronDown size={20} className={open ? "rotate-180" : ""} />
      </button>
      {open && (
        <ul role="listbox" className="absolute left-0 right-0 top-[66px] z-30 max-h-[260px] overflow-y-auto rounded-panel bg-bg py-2.5 pr-[5px] shadow-[0_4px_12px_rgba(0,0,0,.3)]">
          {list.map((c) => (
            <li key={c.iso}>
              <button
                type="button"
                role="option"
                aria-selected={c.name === value}
                data-testid={`pref-profile-country-${c.iso.toLowerCase()}`}
                onClick={() => (onChange(c.name), setOpen(false))}
                className={`flex h-[34px] w-full items-center gap-2.5 px-5 text-left text-sm hover:bg-accent ${c.name === value ? "bg-accent" : ""}`}
              >
                <span className="w-5 text-base">{c.name === value ? flag(c.iso) : ""}</span>
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- change email (inferred) ---------------- */

// inferred: the email pencil was not clicked in the capture. Re-entering the password guards the change;
// no verification email is sent (mock).
function ChangeEmailModal({ open, onClose, current }: { open: boolean; onClose: () => void; current: string }) {
  const run = useRun();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [touched, setTouched] = useState(false);
  const err = !isEmail(email) ? "Enter a valid email address" : email.trim() === current ? "This is already your email address" : "";
  const close = () => (setEmail(""), setPw(""), setTouched(false), onClose());
  return (
    <Modal
      open={open}
      onClose={close}
      title="Change Email Address"
      footer={
        <>
          <TextButton data-testid="pref-profile-email-cancel" onClick={close}>
            Cancel
          </TextButton>
          <Button
            data-testid="pref-profile-email-save"
            disabled={!pw.trim() || (touched && !!err)}
            onClick={() => {
              setTouched(true);
              if (err || !pw.trim()) return;
              if (run("prefs.changeEmail", (d) => changeEmail(d, email), "account.admin", "Email address updated")) close();
            }}
          >
            Update
          </Button>
        </>
      }
    >
      <div data-testid="modal-pref-change-email">
        <label htmlFor="pf-new-email" className="mb-4 block text-base">
          New Email Address *
        </label>
        <Input id="pf-new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={touched && !!err} data-testid="pref-profile-email-new" />
        {touched && <FieldError>{err}</FieldError>}
        <label htmlFor="pf-email-pw" className="mb-4 mt-6 block text-base">
          Enter Password *
        </label>
        <PasswordField id="pf-email-pw" value={pw} onChange={setPw} testid="pref-profile-email-password" />
      </div>
    </Modal>
  );
}
