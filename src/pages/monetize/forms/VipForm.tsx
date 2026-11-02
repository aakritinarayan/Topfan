/**
 * INFERRED (not captured): Add / Edit VIP Offer. Fields mirror the VIP table (14i) and the Home
 * VIP Deals rows (title, description, end date, logo). Create = content.write; a price change on an
 * existing offer = Confirm + finance.write.
 */
import { useState } from "react";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { useData } from "../../../store/store";
import { addVipOffer, money, updateVipOffer, type VipOffer } from "../../../store/slices/monetize";
import type { PageProps } from "../../types";
import { ChipChoice, ConfirmModal, Field, FilePick, FormPage, Pill, TextArea, TextInput, useRun } from "../ui";
import { Missing } from "./PlanForm";

const LOCKS: VipOffer["lockOptions"] = ["Individual Purchase", "Subscription", "Free"];

export function VipFormPage({ route, params }: PageProps) {
  const o = useData((d) => d.monetize.vipOffers.find((x) => x.id === params.offerId));
  if (route.id === "monetize-vip-edit" && !o) return <Missing routeId={route.id} what="Offer" back="monetize-vip-offers" />;
  return <VipForm routeId={route.id} o={o ?? null} key={o?.id ?? "new"} />;
}

function VipForm({ routeId, o }: { routeId: string; o: VipOffer | null }) {
  const { navigate } = useRouter();
  const run = useRun();
  const [f, setF] = useState({
    title: o?.title ?? "",
    description: o?.description ?? "",
    codeType: o?.codeType ?? ("General Code" as VipOffer["codeType"]),
    code: o?.code ?? "",
    count: o && o.left !== "Unlimited" ? String(o.left) : "",
    lockOptions: o?.lockOptions ?? ([] as VipOffer["lockOptions"]),
    price: o?.price ? String(o.price) : "",
    endsAt: o?.endsAt ?? "",
    logo: o?.logo ?? null,
    logoName: "",
  });
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const back = pathFor("monetize-vip-offers");
  const needsPrice = f.lockOptions.includes("Individual Purchase");
  const errors = {
    title: f.title.trim() ? "" : "Offer Title is required",
    description: f.description.trim() ? "" : "Description is required",
    code: f.codeType === "General Code" ? (f.code.trim() ? "" : "Code is required") : Number(f.count) > 0 ? "" : "Number of codes is required",
    lockOptions: f.lockOptions.length ? "" : "Select at least one lock option",
    price: needsPrice && !(Number(f.price) > 0) ? "Price is required for Individual Purchase" : "",
    endsAt: f.endsAt ? "" : "End Date is required",
  };
  const valid = !Object.values(errors).some(Boolean);
  const input = {
    title: f.title.trim(),
    description: f.description.trim(),
    codeType: f.codeType,
    code: f.codeType === "General Code" ? f.code.trim() : "",
    left: f.codeType === "General Code" ? ("Unlimited" as const) : Number(f.count),
    lockOptions: f.lockOptions,
    price: needsPrice ? Number(f.price) : undefined,
    endsAt: f.endsAt,
    logo: f.logo,
  };
  const priceChanged = !!o && (o.price ?? 0) !== (input.price ?? 0);
  const save = () => {
    setTried(true);
    if (!valid) return;
    if (!o) {
      if (run("monetize.addVipOffer", (d) => void addVipOffer(d, input), "content.write", "VIP offer added")) navigate(back);
      return;
    }
    if (priceChanged) return setConfirm(true);
    if (run("monetize.updateVipOffer", (d) => updateVipOffer(d, o.id, input), "content.write", "Offer updated")) navigate(back);
  };
  return (
    <FormPage
      routeId={routeId}
      title={o ? "Edit Offer" : "Add New Offer"}
      backTo={back}
      footer={
        <>
          <button type="button" onClick={() => navigate(back)} className="h-[40px] px-[16px] text-[14px] font-black uppercase hover:text-accent">
            Cancel
          </button>
          <Pill data-testid="monetize-vip-save" onClick={save}>
            {o ? "Update Offer" : "Save Offer"}
          </Pill>
        </>
      }
    >
      <Field label="Offer Title" required error={tried ? errors.title : undefined} htmlFor="vip-title">
        <TextInput id="vip-title" value={f.title} maxLength={80} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. 10% Off at Ridgeline Boards" data-testid="monetize-vip-title" invalid={tried && !!errors.title} />
      </Field>
      <Field label="Description" required error={tried ? errors.description : undefined} htmlFor="vip-desc">
        <TextArea id="vip-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Tell fans about the deal" data-testid="monetize-vip-description" className="!min-h-[100px]" invalid={tried && !!errors.description} />
      </Field>
      <Field label="Brand Logo">
        <FilePick accept="image/*" testid="monetize-vip-logo" value={f.logoName} onChange={(name, file) => setF({ ...f, logoName: name, logo: URL.createObjectURL(file) })} />
      </Field>
      <Field label="Code Type" required>
        <ChipChoice options={["General Code", "Unique Codes"] as VipOffer["codeType"][]} value={[f.codeType]} onToggle={(v) => setF({ ...f, codeType: v })} testid="monetize-vip-code-type" />
      </Field>
      {f.codeType === "General Code" ? (
        <Field label="Code" required info="Every fan who unlocks the offer sees this same code." error={tried ? errors.code : undefined} htmlFor="vip-code">
          <TextInput id="vip-code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="e.g. AJRIDE10" data-testid="monetize-vip-code" className="!w-[300px]" invalid={tried && !!errors.code} />
        </Field>
      ) : (
        <Field label="Number of Codes" required info="Each fan gets one unique code until they run out." error={tried ? errors.code : undefined} htmlFor="vip-count">
          <TextInput id="vip-count" inputMode="numeric" value={f.count} onChange={(e) => setF({ ...f, count: e.target.value.replace(/\D/g, "") })} placeholder="100" data-testid="monetize-vip-count" className="!w-[200px]" invalid={tried && !!errors.code} />
        </Field>
      )}
      <Field label="Lock Options" required error={tried ? errors.lockOptions : undefined}>
        <ChipChoice
          multi
          options={LOCKS}
          value={f.lockOptions}
          testid="monetize-vip-lock"
          onToggle={(v) =>
            setF({
              ...f,
              // "Free" can't be combined with paid options
              lockOptions: v === "Free" ? (f.lockOptions.includes("Free") ? [] : ["Free"]) : f.lockOptions.includes(v) ? f.lockOptions.filter((x) => x !== v) : LOCKS.filter((x) => x !== "Free" && (x === v || f.lockOptions.includes(x))),
            })
          }
        />
      </Field>
      {needsPrice && (
        <Field label="Unlock Price" required error={tried ? errors.price : undefined}>
          <label className="flex h-[55px] w-[220px] items-center rounded-pill bg-bg px-[24px] text-[14px] font-black">
            $
            <input aria-label="Unlock price" data-testid="monetize-vip-price" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="0.00" className="ml-[4px] w-full bg-transparent outline-none" />
          </label>
        </Field>
      )}
      <Field label="End Date" required error={tried ? errors.endsAt : undefined} htmlFor="vip-end">
        <TextInput id="vip-end" type="date" value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} data-testid="monetize-vip-end" className="!w-[300px] [color-scheme:dark]" invalid={tried && !!errors.endsAt} />
      </Field>
      <ConfirmModal
        open={confirm}
        title="Change Price"
        confirmLabel="Change Price"
        testid="monetize-vip-price"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          if (!o) return;
          if (!run("monetize.setVipPrice", (d) => updateVipOffer(d, o.id, { price: input.price }), "finance.write")) return setConfirm(false);
          if (run("monetize.updateVipOffer", (d) => updateVipOffer(d, o.id, input), "content.write", "Offer and price updated")) navigate(back);
        }}
      >
        <b>{o?.title}</b>: {o?.price ? money(o.price) : "—"} → <b>{input.price ? money(input.price) : "—"}</b>
      </ConfirmModal>
    </FormPage>
  );
}
