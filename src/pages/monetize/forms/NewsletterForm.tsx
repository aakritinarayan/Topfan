/**
 * INFERRED (not captured): New / Edit Newsletter and Newsletter Recipients.
 * Save as Draft = Draft tier (content.write). Send Now / Schedule = Confirm tier (content.write).
 * "Groups" audience reads d.prefsB.groups (empty by default → links to Preferences › Groups).
 */
import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Link, useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { useData } from "../../../store/store";
import {
  audienceSize, money, saveNewsletterDraft, scheduleNewsletter, sendNewsletter, type Newsletter, type NewsletterInput,
} from "../../../store/slices/monetize";
import type { PageProps } from "../../types";
import { ChipChoice, ConfirmModal, Field, FilePick, FormPage, Pill, TableCard, TextArea, TextInput, td, th, useRun } from "../ui";
import { Missing } from "./PlanForm";

const LOCKS: { id: Newsletter["lock"]; label: string }[] = [
  { id: "Free", label: "Free" },
  { id: "Subscribers", label: "Subscribers Only" },
  { id: "Paid", label: "Pay to Unlock" },
];
const AUDIENCES: { id: Newsletter["audience"]; label: string }[] = [
  { id: "all", label: "All Recipients" },
  { id: "plans", label: "Subscription Plans" },
  { id: "groups", label: "Groups" },
];

export function NewsletterFormPage({ route, params }: PageProps) {
  const n = useData((d) => d.monetize.newsletters.find((x) => x.id === params.newsletterId));
  if (route.id === "monetize-newsletter-edit" && !n) return <Missing routeId={route.id} what="Newsletter" back="monetize-newsletters" />;
  return <NewsletterForm routeId={route.id} n={n ?? null} key={n?.id ?? "new"} />;
}

function NewsletterForm({ routeId, n }: { routeId: string; n: Newsletter | null }) {
  const plans = useData((d) => d.monetize.plans);
  const groups = useData((d) => d.prefsB.groups.filter((g) => g.active));
  const data = useData((d) => d);
  const { navigate } = useRouter();
  const run = useRun();
  const [f, setF] = useState<NewsletterInput & { imageName?: string }>({
    title: n?.title ?? "",
    body: n?.body ?? "",
    lock: n?.lock ?? "Free",
    price: n?.price,
    audience: n?.audience ?? "all",
    planIds: n?.planIds ?? [],
    groupIds: n?.groupIds ?? [],
    image: n?.image ?? null,
  });
  const [priceText, setPriceText] = useState(n?.price ? String(n.price) : "");
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState<"send" | "schedule" | null>(null);
  const [when, setWhen] = useState("");
  const [schedTried, setSchedTried] = useState(false);
  const back = pathFor("monetize-newsletters");
  const sent = n?.status === "Sent";

  const input: NewsletterInput = { title: f.title.trim(), body: f.body, lock: f.lock, price: f.lock === "Paid" ? Number(priceText) : undefined, audience: f.audience, planIds: f.planIds, groupIds: f.groupIds, image: f.image };
  const size = audienceSize(data, input);
  const errors = {
    title: f.title.trim() ? "" : "Newsletter Title is required",
    body: f.body.trim() ? "" : "Content is required",
    price: f.lock === "Paid" && !(Number(priceText) > 0) ? "Enter a price" : "",
    audience: f.audience === "plans" && !f.planIds.length ? "Select at least one plan" : f.audience === "groups" && !f.groupIds.length ? "Select at least one group" : "",
  };
  const valid = !Object.values(errors).some(Boolean);

  const saveDraft = () => {
    // A draft only needs a title (matches the untitled draft row in 14b, which the product allows).
    if (run("monetize.saveNewsletterDraft", (d) => void saveNewsletterDraft(d, input, n?.id), "content.write", sent ? "Newsletter updated" : "Saved as draft")) navigate(back);
  };
  const ask = (k: "send" | "schedule") => {
    setTried(true);
    if (!valid) return;
    if (k === "schedule" && !when) return setSchedTried(true);
    setConfirm(k);
  };
  const doIt = () => {
    const ok =
      confirm === "send"
        ? run("monetize.sendNewsletter", (d) => void sendNewsletter(d, input, n?.id), "content.write", `Newsletter sent to ${size} recipient${size === 1 ? "" : "s"}`)
        : run("monetize.scheduleNewsletter", (d) => void scheduleNewsletter(d, input, new Date(when).toISOString(), n?.id), "content.write", "Newsletter scheduled");
    if (ok) navigate(back);
    else setConfirm(null);
  };

  const toggleId = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <FormPage
      routeId={routeId}
      title={n ? "Edit Newsletter" : "New Newsletter"}
      backTo={back}
      footer={
        <>
          <button type="button" onClick={() => navigate(back)} data-testid="monetize-newsletter-cancel" className="mr-auto h-[40px] px-[16px] text-[14px] font-black uppercase hover:text-accent">
            Cancel
          </button>
          <Pill data-testid="monetize-newsletter-save-draft" onClick={saveDraft}>
            {sent ? "Save" : "Save As Draft"}
          </Pill>
          {!sent && (
            <>
              <Pill data-testid="monetize-newsletter-schedule" onClick={() => ask("schedule")}>
                Schedule
              </Pill>
              <Pill data-testid="monetize-newsletter-send" onClick={() => ask("send")}>
                Send Now
              </Pill>
            </>
          )}
        </>
      }
    >
      {sent && <p className="rounded-inner bg-bg px-[20px] py-[14px] text-[14px] text-soft">This newsletter was already sent to {n?.sent} recipients. Changes only affect how it appears on your profile.</p>}
      <Field label="Newsletter Title" required error={tried ? errors.title : undefined} htmlFor="nl-title">
        <TextInput id="nl-title" value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Enter Title" data-testid="monetize-newsletter-title" invalid={tried && !!errors.title} />
      </Field>
      <Field label="Cover Image">
        <FilePick accept="image/*" testid="monetize-newsletter-image" value={f.imageName} onChange={(name, file) => setF({ ...f, imageName: name, image: URL.createObjectURL(file) })} />
      </Field>
      <Field label="Content" required error={tried ? errors.body : undefined} htmlFor="nl-body">
        <TextArea id="nl-body" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Write your newsletter…" data-testid="monetize-newsletter-body" className="min-h-[220px]" invalid={tried && !!errors.body} />
      </Field>
      <Field label="Who Can Read It" required error={tried ? errors.price : undefined}>
        <ChipChoice options={LOCKS.map((l) => l.label)} value={[LOCKS.find((l) => l.id === f.lock)!.label]} onToggle={(v) => setF({ ...f, lock: LOCKS.find((l) => l.label === v)!.id })} testid="monetize-newsletter-lock" />
        {f.lock === "Paid" && (
          <label className="mt-[12px] flex h-[55px] w-[200px] items-center rounded-pill bg-bg px-[24px] text-[14px] font-black">
            $
            <input aria-label="Unlock price" data-testid="monetize-newsletter-price" inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" className="ml-[4px] w-full bg-transparent outline-none" />
          </label>
        )}
      </Field>
      <Field label="Send To" required error={tried ? errors.audience : undefined}>
        <ChipChoice
          options={AUDIENCES.map((a) => a.label)}
          value={[AUDIENCES.find((a) => a.id === f.audience)!.label]}
          onToggle={(v) => setF({ ...f, audience: AUDIENCES.find((a) => a.label === v)!.id })}
          testid="monetize-newsletter-audience"
        />
        {f.audience === "plans" && (
          <div className="mt-[14px]">
            <ChipChoice multi options={plans.map((p) => p.name)} value={plans.filter((p) => f.planIds.includes(p.id)).map((p) => p.name)} onToggle={(v) => setF({ ...f, planIds: toggleId(f.planIds, plans.find((p) => p.name === v)!.id) })} testid="monetize-newsletter-plan" />
          </div>
        )}
        {f.audience === "groups" && (
          <div className="mt-[14px]" data-testid="monetize-newsletter-groups">
            {groups.length ? (
              <ChipChoice multi options={groups.map((g) => g.name)} value={groups.filter((g) => f.groupIds.includes(g.id)).map((g) => g.name)} onToggle={(v) => setF({ ...f, groupIds: toggleId(f.groupIds, groups.find((g) => g.name === v)!.id) })} testid="monetize-newsletter-group" />
            ) : (
              <p className="rounded-inner bg-bg px-[20px] py-[14px] text-[14px] text-soft">
                You haven't created any Groups yet.{" "}
                <Link to={pathFor("pref-groups-add")} className="font-bold text-accent hover:underline" data-testid="monetize-newsletter-create-group">
                  Create a Group
                </Link>{" "}
                in Edit Preferences › Groups, then come back to send to it.
              </p>
            )}
          </div>
        )}
        <p className="mt-[12px] text-[13px] text-muted" data-testid="monetize-newsletter-audience-size">
          {size} recipient{size === 1 ? "" : "s"}
        </p>
      </Field>
      {!sent && (
        <Field label="Schedule For" info="Only needed when you click Schedule." error={schedTried && !when ? "Pick a date and time to schedule" : undefined}>
          <TextInput type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} data-testid="monetize-newsletter-when" className="w-[300px] [color-scheme:dark]" invalid={schedTried && !when} />
        </Field>
      )}

      <ConfirmModal
        open={!!confirm}
        title={confirm === "send" ? "Send Newsletter" : "Schedule Newsletter"}
        confirmLabel={confirm === "send" ? "Send Now" : "Schedule"}
        testid="monetize-newsletter-confirm"
        onClose={() => setConfirm(null)}
        onConfirm={doIt}
      >
        <p>
          <b>{input.title}</b> will be {confirm === "send" ? "emailed now" : `emailed on ${when ? new Date(when).toLocaleString("en-US") : ""}`} to <b>{size}</b> recipient{size === 1 ? "" : "s"}.
        </p>
        <p className="mt-[8px] text-[14px] text-muted">
          {f.lock === "Free" ? "Everyone can read it." : f.lock === "Subscribers" ? "Only subscribers can read it." : `Fans pay ${money(Number(priceText) || 0)} to unlock it.`} This can't be undone.
        </p>
      </ConfirmModal>
    </FormPage>
  );
}

/** INFERRED: VIEW NEWSLETTER RECIPIENTS (57). */
export function RecipientsPage({ route }: PageProps) {
  const recipients = useData((d) => d.monetize.recipients);
  const [q, setQ] = useState("");
  const { navigate } = useRouter();
  const rows = useMemo(() => recipients.filter((r) => `${r.name} ${r.email}`.toLowerCase().includes(q.trim().toLowerCase())), [recipients, q]);
  return (
    <div data-testid={`page-${route.id}`} className="max-w-[939px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[20px]">
          <button type="button" aria-label="Back" data-testid="monetize-recipients-back" onClick={() => navigate(pathFor("monetize-newsletters"))} className="hover:text-accent">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[24px] font-bold">Newsletter Recipients ({recipients.length})</h1>
        </div>
        <label className="flex h-[40px] w-[300px] items-center gap-[12px] rounded-pill bg-surface px-[16px]">
          <Search size={18} className="text-accent" strokeWidth={3} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Recipients" aria-label="Search Recipients" data-testid="monetize-recipients-search" className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted" />
        </label>
      </div>
      <TableCard className="mt-[26px]">
        <table className="w-full" data-testid="monetize-recipients-table">
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Email</th>
              <th className={th}>Source</th>
              <th className={th}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={`${td} !py-[14px]`}>{r.name}</td>
                <td className={td}>{r.email}</td>
                <td className={td}>{r.source}</td>
                <td className={td}>{new Date(`${r.joinedAt}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className={`${td} py-[40px] text-center text-[16px] text-[#c8c8c8]`}>
                  No Recipients Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
