/** Monetize › Portfolios (14j) + Add Portfolio modal; Discount Codes (14k) + New Discount Code modal (modals inferred). */
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { useData } from "../../../store/store";
import {
  addDiscountCode, addPortfolio, deleteDiscountCode, setDiscountActive, updateDiscountCode, type DiscountCode, type Portfolio,
} from "../../../store/slices/monetize";
import { ImageSlot, Modal } from "../../../platform/ui/surfaces";
import type { PageProps } from "../../types";
import {
  BlackCircle, ChipChoice, ConfirmModal, Field, FilePick, MarkButton, MonetizeFrame, Pill, PillTabs, SectionHeader, stillOf, TableCard, TextInput, td, th, useHandle, useRun,
} from "../ui";

/* ----------------------------------------------------------------- Portfolios */

export function PortfoliosTab({ route }: PageProps) {
  const portfolios = useData((d) => d.monetize.portfolios);
  const [add, setAdd] = useState(false);
  const { navigate } = useRouter();
  const handle = useHandle();
  return (
    <MonetizeFrame routeId={route.id} active="monetize-portfolio">
      <SectionHeader title="Portfolios">
        <Pill data-testid="monetize-portfolio-add" icon={<Plus size={18} strokeWidth={2.5} />} onClick={() => setAdd(true)}>
          Add Portfolio
        </Pill>
      </SectionHeader>
      <div className="mt-[24px] rounded-card bg-surface p-[24px]">
        <div className="grid grid-cols-3 gap-[16px]">
          {portfolios.map((p) => (
            <button
              key={p.id}
              type="button"
              data-testid={`monetize-portfolio-${p.id}`}
              onClick={() => navigate(pathFor("public-videos", { handle, portfolioId: p.id }))}
              className="relative h-[193px] w-[284px] rounded-inner bg-bg p-[4px] text-left hover:ring-1 hover:ring-accent"
            >
              <ImageSlot src={stillOf(p.banner)} label={p.title} className="h-[138px] w-full" rounded="rounded-tile" />
              <span className="absolute left-[8px] top-[12px] rounded-pill bg-surface/90 px-[8px] py-[3px] text-[12px] font-medium">{p.type}</span>
              <span className="mt-[16px] block px-[16px] text-[16px] font-bold">{p.title}</span>
            </button>
          ))}
          {!portfolios.length && <p className="col-span-3 py-[30px] text-center text-[16px] text-[#c8c8c8]">No Portfolios Yet</p>}
        </div>
      </div>
      <AddPortfolioModal open={add} onClose={() => setAdd(false)} />
    </MonetizeFrame>
  );
}

/** INFERRED: Add Portfolio (not captured). */
function AddPortfolioModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<Portfolio["type"]>("Video");
  const [banner, setBanner] = useState<{ name: string; url: string } | null>(null);
  const [tried, setTried] = useState(false);
  const run = useRun();
  const close = () => {
    setTitle("");
    setBanner(null);
    setTried(false);
    onClose();
  };
  return (
    <Modal open={open} onClose={close} title="Add Portfolio">
      <div data-testid="modal-monetize-add-portfolio" className="flex flex-col gap-[22px]">
        <Field label="Portfolio Title" required error={tried && !title.trim() ? "Portfolio Title is required" : undefined} htmlFor="pf-title">
          <TextInput id="pf-title" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Enter Title" data-testid="monetize-portfolio-title" invalid={tried && !title.trim()} />
        </Field>
        <Field label="Portfolio Type" required>
          <ChipChoice options={["Video", "Photo"] as Portfolio["type"][]} value={[type]} onToggle={setType} testid="monetize-portfolio-type" />
        </Field>
        <Field label="Banner Image">
          <FilePick
            accept="image/*"
            testid="monetize-portfolio-banner"
            value={banner?.name}
            onChange={(name, file) => setBanner({ name, url: URL.createObjectURL(file) })}
          />
        </Field>
        <div className="flex justify-end gap-[12px]">
          <button type="button" className="h-[40px] px-[16px] text-[14px] font-black uppercase hover:text-accent" onClick={close}>
            Cancel
          </button>
          <Pill
            data-testid="monetize-portfolio-save"
            onClick={() => {
              setTried(true);
              if (!title.trim()) return;
              if (run("monetize.addPortfolio", (d) => void addPortfolio(d, { title: title.trim(), type, banner: banner?.url || null }), "content.write", "Portfolio added")) close();
            }}
          >
            Save
          </Pill>
        </div>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------------- Discount Codes */

const fmtEnd = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();

export function DiscountCodesTab({ route }: PageProps) {
  const codes = useData((d) => d.monetize.discountCodes);
  const [tab, setTab] = useState<"active" | "inactive">("active");
  const [edit, setEdit] = useState<DiscountCode | "new" | null>(null);
  const [del, setDel] = useState<DiscountCode | null>(null);
  const run = useRun();
  const active = codes.filter((c) => c.active);
  const inactive = codes.filter((c) => !c.active);
  const list = tab === "active" ? active : inactive;
  return (
    <MonetizeFrame routeId={route.id} active="monetize-discount-codes">
      <SectionHeader title="Discount Codes">
        <Pill data-testid="monetize-discount-new" onClick={() => setEdit("new")}>
          + New Discount Code
        </Pill>
      </SectionHeader>
      <div className="mt-[24px]">
        <PillTabs
          testid="monetize-discount-tab"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "active", label: `Active Codes (${active.length})` },
            { id: "inactive", label: `Inactive Codes (${inactive.length})` },
          ]}
        />
      </div>
      <TableCard className="mt-[16px]">
        <table className="w-full table-fixed" data-testid="monetize-discount-table">
          <thead>
            <tr>
              <th className={`${th} w-[20%]`}>Coupon Code</th>
              <th className={`${th} w-[15%]`}>#Times Used</th>
              <th className={`${th} w-[26%]`}>Applicable For</th>
              <th className={`${th} w-[15%]`}>End Date</th>
              <th className={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} data-testid={`monetize-discount-row-${c.id}`}>
                <td className={`${td} !py-[30px]`}>{c.code}</td>
                <td className={td}>{c.used}</td>
                <td className={td}>
                  <span className="line-clamp-2 pr-[20px] leading-[24px]">{c.applicableFor.join(", ")}</span>
                </td>
                <td className={td}>{fmtEnd(c.endDate)}</td>
                <td className={td}>
                  <div className="flex flex-wrap items-center gap-[8px]">
                    <BlackCircle label="Edit" data-testid={`monetize-discount-edit-${c.id}`} onClick={() => setEdit(c)}>
                      <Pencil size={12} fill="currentColor" />
                    </BlackCircle>
                    <BlackCircle label="Delete" data-testid={`monetize-discount-delete-${c.id}`} onClick={() => setDel(c)}>
                      <Trash2 size={12} strokeWidth={2.5} />
                    </BlackCircle>
                    <MarkButton
                      data-testid={`monetize-discount-toggle-${c.id}`}
                      onClick={() => run("monetize.setDiscountActive", (d) => setDiscountActive(d, c.id, !c.active), "content.write", c.active ? "Code marked as inactive" : "Code marked as active")}
                    >
                      {c.active ? "Mark As Inactive" : "Mark As Active"}
                    </MarkButton>
                  </div>
                </td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={5} className={`${td} py-[40px] text-center text-[16px] text-[#c8c8c8]`}>
                  No Discount Codes Found {/* inferred */}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableCard>
      {edit && <DiscountModal code={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      <ConfirmModal
        open={!!del}
        title="Delete Discount Code"
        confirmLabel="Delete"
        testid="monetize-delete-discount"
        onClose={() => setDel(null)}
        onConfirm={() => {
          if (del && run("monetize.deleteDiscountCode", (d) => deleteDiscountCode(d, del.id), "content.write", "Discount code deleted")) setDel(null);
        }}
      >
        Are you sure you want to delete <b>{del?.code}</b>?
      </ConfirmModal>
    </MonetizeFrame>
  );
}

const APPLICABLE = ["Subscriptions", "Downloadables", "Merchandise", "Experience", "Course", "Newsletter"];

/** INFERRED: New / Edit Discount Code (not captured). */
function DiscountModal({ code, onClose }: { code: DiscountCode | null; onClose: () => void }) {
  const existing = useData((d) => d.monetize.discountCodes);
  const [f, setF] = useState({
    code: code?.code ?? "",
    discountType: code?.discountType ?? ("Percentage" as DiscountCode["discountType"]),
    value: code ? String(code.value) : "",
    applicableFor: code?.applicableFor ?? ([] as string[]),
    endDate: code?.endDate ?? "",
  });
  const [tried, setTried] = useState(false);
  const run = useRun();
  const val = Number(f.value);
  const errors = {
    code: !f.code.trim() ? "Coupon Code is required" : !/^[A-Za-z0-9_-]{3,20}$/.test(f.code.trim()) ? "Use 3–20 letters or numbers" : existing.some((c) => c.code.toLowerCase() === f.code.trim().toLowerCase() && c.id !== code?.id) ? "This code already exists" : "",
    value: !f.value || !(val > 0) ? "Discount is required" : f.discountType === "Percentage" && val > 100 ? "Maximum 100%" : "",
    applicableFor: f.applicableFor.length ? "" : "Select at least one",
    endDate: f.endDate ? "" : "End Date is required",
  };
  const ok = !Object.values(errors).some(Boolean);
  const save = () => {
    setTried(true);
    if (!ok) return;
    const input = { code: f.code.trim(), discountType: f.discountType, value: val, applicableFor: f.applicableFor, endDate: f.endDate };
    const done = code
      ? run("monetize.updateDiscountCode", (d) => updateDiscountCode(d, code.id, input), "content.write", "Discount code updated")
      : run("monetize.addDiscountCode", (d) => void addDiscountCode(d, input), "content.write", "Discount code created");
    if (done) onClose();
  };
  return (
    <Modal open onClose={onClose} title={code ? "Edit Discount Code" : "New Discount Code"}>
      <div data-testid="modal-monetize-discount" className="flex flex-col gap-[22px]">
        <Field label="Coupon Code" required error={tried ? errors.code : undefined} htmlFor="dc-code">
          <TextInput id="dc-code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="e.g. SAVE10" data-testid="monetize-discount-code" invalid={tried && !!errors.code} />
        </Field>
        <Field label="Discount Type" required>
          <ChipChoice options={["Percentage", "Fixed Amount"] as DiscountCode["discountType"][]} value={[f.discountType]} onToggle={(v) => setF({ ...f, discountType: v })} testid="monetize-discount-type" />
        </Field>
        <Field label={f.discountType === "Percentage" ? "Discount (%)" : "Discount ($)"} required error={tried ? errors.value : undefined} htmlFor="dc-value">
          <TextInput id="dc-value" inputMode="decimal" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="10" data-testid="monetize-discount-value" invalid={tried && !!errors.value} />
        </Field>
        <Field label="Applicable For" required error={tried ? errors.applicableFor : undefined}>
          <ChipChoice
            multi
            options={APPLICABLE}
            value={f.applicableFor}
            testid="monetize-discount-applicable"
            onToggle={(v) => setF({ ...f, applicableFor: f.applicableFor.includes(v) ? f.applicableFor.filter((x) => x !== v) : APPLICABLE.filter((x) => x === v || f.applicableFor.includes(x)) })}
          />
        </Field>
        <Field label="End Date" required error={tried ? errors.endDate : undefined} htmlFor="dc-end">
          <TextInput id="dc-end" type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} data-testid="monetize-discount-end" invalid={tried && !!errors.endDate} className="[color-scheme:dark]" />
        </Field>
        <div className="flex justify-end gap-[12px]">
          <button type="button" className="h-[40px] px-[16px] text-[14px] font-black uppercase hover:text-accent" onClick={onClose}>
            Cancel
          </button>
          <Pill data-testid="monetize-discount-save" onClick={save}>
            {code ? "Update" : "Create"}
          </Pill>
        </div>
      </div>
    </Modal>
  );
}
