/**
 * Preferences › Delegation (53): MY DELEGATES list with status filter, Delegate Details, and Add New Delegate.
 * Captured: list (53), filter (53a), details (53b). inferred: Add New Delegate step 2 (access + revenue share),
 * the edit-access and remove flows behind the pencil / trash icons, ?id= in the details URL, CSV contents.
 * Risk tiers: granting Content = Confirm; granting Financial = Protected (typed confirmation). Owner-only (account.admin).
 * All people are fictional (the spec's names were replaced).
 */
import { useRef, useState } from "react";
import { ArrowLeft, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "../../app/router";
import { pathFor } from "../../app/routeCatalog";
import { FieldError, Radio, useOutside } from "../../platform/ui/controls";
import { Avatar, Modal, OutlinePill } from "../../platform/ui/surfaces";
import { useToast } from "../../platform/ui/toast";
import { useData } from "../../store/store";
import { personAvatar } from "../../media";
import type { Delegate } from "../../store/model";
import { addDelegate, removeDelegate, REVENUE_STREAMS, updateDelegateAccess } from "../../store/slices/prefsB";
import type { PageProps } from "../types";
import { ConfirmModal, PrefPage, ProtectedModal, useWrite, Pill, PlainButton, Field } from "./ui";

/* ------------------------------------------------------------------ shared */

const FILTERS = ["All", "Active", "Pending", "Removed", "Declined"] as const;
type Filter = (typeof FILTERS)[number];
/** The model has Active | Pending | Inactive; the product's filter says Removed / Declined. Inactive = Removed. */
const statusLabel = (s: Delegate["status"]) => (s === "Inactive" ? "Removed" : s);
const typeLabel = (d: Delegate) => (d.access.includes("Financial") ? "Financial, Content" : "Content");
const fullName = (d: Delegate) => `${d.firstName} ${d.lastName}`;

/** "Jan 2, 2026 | 11:52 PM IST" (the account shows IST; kept as a source quirk). */
function fmtSession(iso: string | undefined, sep = " | ") {
  if (!iso) return "—";
  const dt = new Date(iso);
  const tz = "Asia/Kolkata";
  const date = dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: tz });
  const time = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
  return `${date}${sep}${time} IST`;
}

/** ng-select pill (#272a2b or #191a1c, ~200x40) with an r20 panel; selected row = accent (53a). */
function PillSelect<T extends string>({ value, options, onChange, testid, tone = "surface", width = 200 }: { value: T; options: readonly T[]; onChange: (v: T) => void; testid: string; tone?: "surface" | "bg"; width?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  const fill = tone === "surface" ? "bg-surface" : "bg-bg";
  return (
    <div ref={ref} className="relative" style={{ width }}>
      <button
        type="button"
        data-testid={testid}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-[40px] w-full items-center justify-between rounded-pill ${fill} pl-[20px] pr-[22px] text-[14px] font-bold`}
      >
        {value}
        <ChevronDown size={20} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul role="listbox" className={`absolute left-[0px] right-[0px] top-[50px] z-30 rounded-panel ${fill} py-[18px] shadow-[0_4px_12px_rgba(0,0,0,.3)]`}>
          {options.map((o) => (
            <li key={o}>
              <button
                type="button"
                role="option"
                aria-selected={o === value}
                data-testid={`${testid}-option-${o.toLowerCase()}`}
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
                className={`flex h-[35px] w-full items-center px-[20px] text-left text-[15px] hover:bg-accent ${o === value ? "bg-accent" : ""}`}
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

/* ------------------------------------------------------------------ list */

export function DelegationPage({ route }: PageProps) {
  const { navigate } = useRouter();
  const delegates = useData((d) => d.prefsB.delegates);
  const sessions = useData((d) => d.prefsB.delegateLastSession);
  const avatars = useData((d) => d.prefsB.delegateAvatars);
  const [filter, setFilter] = useState<Filter>("All");
  const rows = delegates.filter((d) => filter === "All" || statusLabel(d.status) === filter);
  const cols = "grid grid-cols-[minmax(0,344fr)_minmax(0,172fr)_minmax(0,257fr)_66px] items-center";

  return (
    <PrefPage id={route.id}>
      <div role="tablist" aria-label="Delegation">
        <button role="tab" aria-selected data-testid="pref-delegation-tab-my-delegates" className="h-[42px] rounded-pill bg-accent px-[18px] text-[13px] font-black uppercase tracking-caps">
          My Delegates
        </button>
      </div>
      <div className="px-[20px]">
        <div className="mt-[35px] flex items-center justify-between">
          <div className="flex items-center gap-[12px]">
            <span className="text-[14px] font-medium uppercase">Filter By:</span>
            <PillSelect value={filter} options={FILTERS} onChange={setFilter} testid="pref-delegation-filter" />
          </div>
          <Pill icon={<Plus size={20} />} data-testid="pref-delegation-add" onClick={() => navigate(pathFor("pref-delegate-add"))}>
            Add New
          </Pill>
        </div>
        <p className="mt-[25px] text-[16px]">You have granted the following people access to your account:</p>
        <div className="mt-[25px] rounded-card bg-surface px-[30px] pb-[18px] pt-[30px]" data-testid="pref-delegation-table">
          <div className={`${cols} border-b border-surface-2 pb-[28px] text-[13px] font-medium uppercase`}>
            <span>Name / Email</span>
            <span>Type</span>
            <span>Status / Last Session</span>
            <span>Action</span>
          </div>
          {rows.length === 0 && <p className="py-[32px] text-center text-[16px] text-soft">No delegates found.</p>}
          {rows.map((d, i) => (
            <div key={d.id} data-testid={`pref-delegation-row-${d.id}`} className={`${cols} h-[81px] ${i < rows.length - 1 ? "border-b border-surface-2" : ""}`}>
              <span className="flex min-w-[0px] items-center gap-[8px]">
                <Avatar src={avatars?.[d.id] ?? personAvatar(d.id)} size={44} ring={2} />
                <span className="min-w-[0px]">
                  <span className="block truncate text-[14px] font-bold text-accent">{fullName(d)}</span>
                  <span className="block truncate text-[11px] text-soft">{d.email}</span>
                </span>
              </span>
              <span className="text-[14px]">{typeLabel(d)}</span>
              <span>
                <span className="block text-[16px] font-bold">{statusLabel(d.status)}</span>
                <span className="block text-[16px]">{fmtSession(sessions[d.id])}</span>
              </span>
              <button
                type="button"
                data-testid={`pref-delegation-details-${d.id}`}
                onClick={() => navigate(`${pathFor("pref-delegate-details")}?id=${d.id}`)}
                className="text-left text-[14px] text-accent hover:underline"
              >
                Details
              </button>
            </div>
          ))}
        </div>
      </div>
    </PrefPage>
  );
}

/* ------------------------------------------------------------------ access form (step 2 + edit) */

type AccessChoice = "Content" | "Financial, Content";
const toAccess = (c: AccessChoice): Delegate["access"] => (c === "Content" ? ["Content"] : ["Financial", "Content"]);

/** inferred: access type + per-stream revenue share, matching the Delegate Details layout. */
function AccessFields({ choice, setChoice, share, setShare }: { choice: AccessChoice; setChoice: (c: AccessChoice) => void; share: Record<string, number>; setShare: (s: Record<string, number>) => void }) {
  return (
    <>
      <p className="mb-[16px] text-[16px]">Access Type*</p>
      <div className="flex flex-col gap-[16px]" role="radiogroup" aria-label="Access Type">
        <span className="inline-flex w-fit" data-testid="pref-delegate-access-content">
          <Radio name="delegate-access" checked={choice === "Content"} onChange={() => setChoice("Content")}>Content</Radio>
        </span>
        <span className="inline-flex w-fit" data-testid="pref-delegate-access-financial">
          <Radio name="delegate-access" checked={choice === "Financial, Content"} onChange={() => setChoice("Financial, Content")}>Financial, Content</Radio>
        </span>
      </div>
      {choice === "Financial, Content" && (
        <>
          <p className="mb-[16px] mt-[30px] text-[16px] font-medium">Current Revenue Share Percentages</p>
          <div className="grid grid-cols-3 gap-x-[24px] gap-y-[16px] rounded-inner bg-bg p-[20px]">
            {REVENUE_STREAMS.map((s) => (
              <label key={s} className="block">
                <span className="mb-[8px] block text-[14px] font-bold">{s}</span>
                <span className="relative block">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    data-testid={`pref-delegate-share-${s.toLowerCase().replace(/\s+/g, "-")}`}
                    value={share[s] ?? 0}
                    onChange={(e) => setShare({ ...share, [s]: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                    className="h-[40px] w-full rounded-pill bg-surface pl-[16px] pr-[36px] text-[14px] font-black text-white outline-none focus:ring-1 focus:ring-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="pointer-events-none absolute right-[16px] top-1/2 -translate-y-1/2 text-[14px]">%</span>
                </span>
              </label>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ add delegate */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AddDelegatePage({ route }: PageProps) {
  const { navigate } = useRouter();
  const toast = useToast();
  const write = useWrite();
  const existing = useData((d) => d.prefsB.delegates);
  const [step, setStep] = useState<1 | 2>(1);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [choice, setChoice] = useState<AccessChoice>("Content");
  const [share, setShare] = useState<Record<string, number>>({});
  const [confirm, setConfirm] = useState<null | "content" | "financial">(null);

  const dup = existing.some((d) => d.email.toLowerCase() === email.trim().toLowerCase() && d.status !== "Inactive");
  const errs = {
    first: first.trim() ? null : "First Name is required",
    last: last.trim() ? null : "Last Name is required",
    email: !email.trim() ? "Email Address is required" : !EMAIL_RE.test(email.trim()) ? "Please enter a valid email address" : dup ? "This person is already a delegate" : null,
  };
  const step1Ok = !errs.first && !errs.last && !errs.email;

  const send = () => {
    const res = write(
      "prefsB.addDelegate",
      (d) => void addDelegate(d, { firstName: first, lastName: last, email, access: toAccess(choice), revenueShare: share }),
      "account.admin",
    );
    setConfirm(null);
    if (res.ok) {
      toast(`Invitation sent to ${email.trim()}`); // inferred copy
      navigate(pathFor("pref-delegation"));
    }
  };

  return (
    <PrefPage id={route.id}>
      <div className="flex items-center gap-[12px]">
        <button
          type="button"
          aria-label="Back"
          data-testid="pref-delegate-add-back"
          onClick={() => (step === 2 ? setStep(1) : navigate(pathFor("pref-delegation")))}
          className="hover:text-accent"
        >
          <ArrowLeft size={22} />
        </button>
        <h4 className="text-[24px] font-bold">Add New Delegate</h4>
      </div>
      <div className="mt-[30px] rounded-card bg-surface p-[30px]">
        <OutlinePill>Step {step} of 2</OutlinePill>
        {step === 1 ? (
          <form
            className="mt-[30px]"
            onSubmit={(e) => {
              e.preventDefault();
              setTouched(true);
              if (step1Ok) setStep(2);
            }}
          >
            <div className="grid grid-cols-2 gap-x-[24px] gap-y-[22px]">
              <div>
                <label htmlFor="dl-first" className="mb-[16px] block text-[16px]">First Name*</label>
                <Field id="dl-first" data-testid="pref-delegate-first-name" placeholder="Enter First Name" value={first} invalid={touched && !!errs.first} onChange={(e) => setFirst(e.target.value)} />
                <FieldError>{touched ? errs.first : null}</FieldError>
              </div>
              <div>
                <label htmlFor="dl-last" className="mb-[16px] block text-[16px]">Last Name*</label>
                <Field id="dl-last" data-testid="pref-delegate-last-name" placeholder="Enter Last Name" value={last} invalid={touched && !!errs.last} onChange={(e) => setLast(e.target.value)} />
                <FieldError>{touched ? errs.last : null}</FieldError>
              </div>
              <div className="col-span-2">
                <label htmlFor="dl-email" className="mb-[16px] block text-[16px]">Email Address*</label>
                <Field id="dl-email" type="email" data-testid="pref-delegate-email" placeholder="Enter Email Address" value={email} invalid={touched && !!errs.email} onChange={(e) => setEmail(e.target.value)} />
                <FieldError>{touched ? errs.email : null}</FieldError>
              </div>
            </div>
            <Pill type="submit" className="mt-[30px]" data-testid="pref-delegate-next">Next</Pill>
          </form>
        ) : (
          // inferred: step 2
          <div className="mt-[30px]" data-testid="pref-delegate-step2">
            <p className="mb-[24px] text-[16px]">
              Choose what <span className="font-bold">{first.trim()} {last.trim()}</span> ({email.trim()}) can access.
            </p>
            <AccessFields choice={choice} setChoice={setChoice} share={share} setShare={setShare} />
            <div className="mt-[30px] flex items-center gap-[8px]">
              <PlainButton onClick={() => setStep(1)} data-testid="pref-delegate-step2-back">Back</PlainButton>
              <Pill data-testid="pref-delegate-send" onClick={() => setConfirm(choice === "Content" ? "content" : "financial")}>Send Invite</Pill>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirm === "content"}
        title="Grant Content Access"
        confirmLabel="Grant Access"
        testid="modal-pref-delegate-grant-content"
        onClose={() => setConfirm(null)}
        onConfirm={send}
      >
        {first.trim()} {last.trim()} will be able to create and manage content, posts and messages on your account.
      </ConfirmModal>
      <ProtectedModal
        open={confirm === "financial"}
        title="Grant Financial Access"
        phrase={email.trim()}
        confirmLabel="Grant Access"
        testid="modal-pref-delegate-grant-financial"
        onClose={() => setConfirm(null)}
        onConfirm={send}
      >
        {first.trim()} {last.trim()} will be able to view earnings, process refunds and manage money on your account, plus content.
      </ProtectedModal>
    </PrefPage>
  );
}

/* ------------------------------------------------------------------ details */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function DelegateDetailsPage({ route, query }: PageProps) {
  const { navigate } = useRouter();
  const write = useWrite();
  const toast = useToast();
  const delegates = useData((d) => d.prefsB.delegates);
  const sessions = useData((d) => d.prefsB.delegateLastSession);
  const avatars = useData((d) => d.prefsB.delegateAvatars);
  const del = delegates.find((d) => d.id === query.get("id")) ?? delegates[0];
  const [year, setYear] = useState<"2026" | "2025">("2026");
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [choice, setChoice] = useState<AccessChoice>("Content");
  const [share, setShare] = useState<Record<string, number>>({});
  const [confirmGrant, setConfirmGrant] = useState<null | "content" | "financial">(null);
  const back = () => navigate(pathFor("pref-delegation"));

  if (!del) {
    return (
      <PrefPage id={route.id}>
        <p className="text-[16px] text-soft">Delegate not found.</p>
      </PrefPage>
    );
  }

  const openEdit = () => {
    setChoice(typeLabel(del) as AccessChoice);
    setShare(del.revenueShare);
    setEditOpen(true);
  };
  const saveAccess = () => {
    const res = write("prefsB.updateDelegateAccess", (d) => updateDelegateAccess(d, del.id, toAccess(choice), share), "account.admin", "Delegate access updated");
    setConfirmGrant(null);
    if (res.ok) setEditOpen(false);
  };

  const downloadCsv = () => {
    // Local file only (no network): month,amount for the selected year.
    const csv = ["Month,Revenue Share", ...MONTHS.map((m) => `${m},0.00`), `Total,0.00`].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${del.firstName}-${del.lastName}-revenue-share-${year}.csv`.toLowerCase();
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("CSV downloaded");
  };

  return (
    <PrefPage id={route.id}>
      <div className="mt-[22px] flex items-center justify-between">
        <div className="flex items-center gap-[20px]">
          <button type="button" aria-label="Back" data-testid="pref-delegate-details-back" onClick={back} className="hover:text-accent">
            <ArrowLeft size={22} />
          </button>
          <h4 className="text-[24px] font-bold">Delegate Details</h4>
        </div>
        <div className="flex items-center gap-[16px] pr-[8px]">
          <button type="button" aria-label="Edit delegate" data-testid="pref-delegate-edit" onClick={openEdit} className="hover:text-accent">
            <Pencil size={18} className="fill-white" />
          </button>
          <button type="button" aria-label="Remove delegate" data-testid="pref-delegate-remove" onClick={() => setRemoveOpen(true)} disabled={del.status === "Inactive"} className="hover:text-accent disabled:opacity-40">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="mt-[30px] rounded-card bg-surface p-[30px]" data-testid="pref-delegate-card">
        <div className="flex items-start gap-[30px] pt-[22px]">
          <Avatar src={avatars?.[del.id] ?? personAvatar(del.id)} size={104} ring={2} />
          <div className="min-w-[0px] flex-1 pt-[4px]">
            <div className="flex items-start justify-between gap-[16px]">
              <p className="flex items-baseline gap-[8px]">
                <span className="text-[22px] font-bold text-soft">{fullName(del)}</span>
                <span className="text-[13px] font-bold text-accent">{statusLabel(del.status)}</span>
              </p>
              <span className="pr-[48px] pt-[6px] text-[12px] text-accent">{fmtSession(sessions[del.id], " ")} (Last Session)</span>
            </div>
            <p className="mt-[6px] text-[11px] text-soft">{del.email}</p>
            <span className="mt-[16px] inline-flex h-[30px] items-center rounded-pill bg-bg px-[12px] text-[14px]">{typeLabel(del)}</span>
          </div>
        </div>

        <p className="mt-[40px] text-[16px] font-medium">Current Revenue Share Percentages</p>
        <div className="mt-[18px] grid grid-cols-3 gap-x-[24px] gap-y-[14px] rounded-inner bg-bg px-[20px] pb-[20px] pt-[36px]" data-testid="pref-delegate-revenue-share">
          {REVENUE_STREAMS.map((s) => (
            <div key={s}>
              <p className="text-[14px] font-bold text-soft">{s}</p>
              <p className="mt-[14px] text-[14px] text-soft">{del.revenueShare[s] ?? 0} %</p>
            </div>
          ))}
        </div>

        <div className="mt-[30px] flex flex-wrap items-center justify-between gap-[12px]">
          <p className="text-[16px] font-medium">Historical Revenue Share Amounts</p>
          <div className="flex items-center gap-[12px]">
            <PillSelect value={year} options={["2026", "2025"] as const} onChange={setYear} testid="pref-delegate-year" tone="bg" />
            <Pill data-testid="pref-delegate-download-csv" onClick={downloadCsv}>Download CSV</Pill>
          </div>
        </div>
        <div className="mt-[12px] rounded-inner bg-bg px-[20px] pb-[16px] pt-[18px]" data-testid="pref-delegate-history">
          <div className="flex justify-between text-[16px]">
            <span>{year} Total Revenue Share</span>
            <span>$0.00</span>
          </div>
          <div className="mt-[6px]">
            {MONTHS.map((m) => (
              <div key={m} className="flex h-[28.4px] items-center justify-between text-[14px]">
                <span className="text-soft">{m}</span>
                <span className="text-accent">$0.00</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* inferred: pencil → edit access */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Delegate Access" width={720}
        footer={
          <>
            <PlainButton onClick={() => setEditOpen(false)} data-testid="modal-pref-delegate-edit-cancel">Cancel</PlainButton>
            <Pill
              data-testid="modal-pref-delegate-edit-save"
              onClick={() => {
                const granting = choice === "Financial, Content" && !del.access.includes("Financial");
                setConfirmGrant(granting ? "financial" : "content");
              }}
            >
              Save
            </Pill>
          </>
        }
      >
        <div data-testid="modal-pref-delegate-edit">
          <AccessFields choice={choice} setChoice={setChoice} share={share} setShare={setShare} />
        </div>
      </Modal>
      <ConfirmModal open={confirmGrant === "content"} title="Update Delegate Access" confirmLabel="Confirm" testid="modal-pref-delegate-update-confirm" onClose={() => setConfirmGrant(null)} onConfirm={saveAccess}>
        {fullName(del)} will have {choice} access.
      </ConfirmModal>
      <ProtectedModal open={confirmGrant === "financial"} title="Grant Financial Access" phrase={del.email} confirmLabel="Grant Access" testid="modal-pref-delegate-grant-financial" onClose={() => setConfirmGrant(null)} onConfirm={saveAccess}>
        {fullName(del)} will be able to view earnings, process refunds and manage money on your account, plus content.
      </ProtectedModal>

      {/* inferred: trash → remove */}
      <ConfirmModal
        open={removeOpen}
        title="Remove Delegate"
        confirmLabel="Remove"
        testid="modal-pref-delegate-remove"
        onClose={() => setRemoveOpen(false)}
        onConfirm={() => {
          const res = write("prefsB.removeDelegate", (d) => removeDelegate(d, del.id), "account.admin", "Delegate removed");
          if (res.ok) {
            setRemoveOpen(false);
            back();
          }
        }}
      >
        Are you sure you want to remove {fullName(del)}? They will lose access to your account.
      </ConfirmModal>
    </PrefPage>
  );
}
