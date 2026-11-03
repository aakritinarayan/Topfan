/**
 * INFERRED (not captured): Add / Edit Experience, Course, Downloadable, External Merchandise, External NFT.
 * Known Add Experience fields (build brief): Type of Experience*, Enter Title*, Description*, plus an
 * unlabeled Disable/Enable control (assumed to publish/unpublish: inferred, see NOTES open questions).
 * Create = content.write. Changing an existing item's price = Confirm + finance.write.
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { act, getData, useData } from "../../../store/store";
import { itemById, linkSaved, syncFromScreen } from "../../../store/slices/content";
import { addProduct, money, setProductPrice, updateProduct, type Product, type ProductKind } from "../../../store/slices/monetize";
import { Select, Toggle } from "../../../platform/ui/controls";
import type { PageProps } from "../../types";
import { ConfirmModal, Field, FilePick, FormPage, Pill, TextArea, TextInput, useRun } from "../ui";
import { Missing } from "./PlanForm";
import { ExperienceForm } from "./ExperienceForm";

const ROUTE_KIND: Record<string, ProductKind> = {
  "monetize-experience-add": "experience", "monetize-experience-edit": "experience",
  "monetize-course-add": "course", "monetize-course-edit": "course",
  "monetize-downloadable-add": "downloadable", "monetize-downloadable-edit": "downloadable",
  "monetize-merch-add": "merchandise", "monetize-merch-edit": "merchandise",
  "monetize-nft-add": "nft", "monetize-nft-edit": "nft",
};
const TAB: Record<ProductKind, string> = {
  experience: "monetize-experience", course: "monetize-courses", downloadable: "monetize-downloadable", merchandise: "monetize-merchandise", nft: "monetize-nfts",
};
const TITLES: Record<ProductKind, [string, string]> = {
  experience: ["Create Experience", "Edit Experience"],
  course: ["Add Course", "Edit Course"],
  downloadable: ["Add Downloadable", "Edit Downloadable"],
  merchandise: ["Add External Merchandise", "Edit Merchandise"],
  nft: ["Add External NFT", "Edit External NFT"],
};
/** Stored experience type values (labels live in ExperienceForm's EXPERIENCE_TYPE_OPTIONS). */
export const EXPERIENCE_TYPES = ["1:1 Video Call", "Personalized Video", "Social Media Interaction", "In Person Session", "Other"];

export function ProductFormPage({ route, params, query }: PageProps) {
  const kind = ROUTE_KIND[route.id];
  const p = useData((d) => d.monetize.products.find((x) => x.id === params.productId && x.kind === kind));
  if (route.id.endsWith("-edit") && !p) return <Missing routeId={route.id} what="Item" back={TAB[kind]} />;
  // inferred (assistant hand-off): ?work=<id> opens the experience the assistant prepared (saved disabled until the creator enables it).
  const workId = kind === "experience" && !p ? query.get("work") ?? undefined : undefined;
  // Experiences use the reference layout (forms/ExperienceForm.tsx); same ?work= adapter, testids and write paths.
  if (kind === "experience") return <ExperienceForm routeId={route.id} p={p ?? null} workId={workId} key={`${p?.id ?? "new"}-${workId ?? ""}`} />;
  return <ProductForm routeId={route.id} kind={kind} p={p ?? null} workId={workId} key={`${p?.id ?? "new"}-${workId ?? ""}`} />;
}

type Dur = { label: string; price: string };

function ProductForm({ routeId, kind, p, workId }: { routeId: string; kind: ProductKind; p: Product | null; workId?: string }) {
  const { navigate } = useRouter();
  const run = useRun();
  const shopify = useData((d) => d.monetize.shopify.connected);
  const work = workId ? itemById(getData(), workId) : null;
  const we = work?.experience;
  const [f, setF] = useState({
    title: p?.title ?? we?.title ?? "",
    description: p?.description ?? we?.description ?? "",
    price: p?.price != null ? String(p.price) : we?.price != null ? String(we.price) : "",
    experienceType: p?.experienceType ?? we?.experienceType ?? (null as string | null),
    externalUrl: p?.externalUrl ?? "",
    fileName: p?.fileName ?? "",
    imageName: we && work?.media ? work.media.label : "",
    image: p?.image ?? (we ? work?.media?.key ?? null : null),
    locked: p?.locked ?? false,
    // Prepared by the assistant: starts disabled, so nothing goes live until the creator enables it.
    published: p?.published ?? (we ? false : true),
    options: p?.options?.map((o) => `${o.name}: ${o.values.join(", ")}`).join("\n") ?? "",
  });
  const [durs, setDurs] = useState<Dur[]>(p?.durations?.map((d) => ({ label: d.label, price: String(d.price) })) ?? [{ label: "15 Minutes", price: "" }]);
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const back = pathFor(TAB[kind]);
  const isCall = kind === "experience" && f.experienceType === "1:1 Video Call";
  const external = kind === "merchandise" || kind === "nft";

  const priceNum = isCall ? Math.min(...durs.map((d) => Number(d.price) || Infinity)) : Number(f.price);
  const durations = isCall ? durs.map((d) => ({ label: d.label.trim(), price: Number(d.price) })) : undefined;
  const errors = {
    experienceType: kind === "experience" && !f.experienceType ? "Type of Experience is required" : "",
    title: f.title.trim() ? "" : `${kind === "nft" ? "NFT Name" : kind === "merchandise" ? "Product Name" : "Title"} is required`,
    description: f.description.trim() || external ? "" : "Description is required",
    price: isCall ? (durs.some((d) => !d.label.trim() || !(Number(d.price) > 0)) ? "Enter a label and price for each option" : "") : !(Number(f.price) > 0) ? "Price is required" : "",
    externalUrl: external && !/^https?:\/\/\S+\.\S+/.test(f.externalUrl.trim()) ? "Enter a valid link (https://…)" : "",
    fileName: kind === "downloadable" && !f.fileName ? "Upload the file fans will download" : "",
  };
  const valid = !Object.values(errors).some(Boolean);
  const options = f.options
    .split("\n")
    .map((l) => l.split(":"))
    .filter((x) => x.length === 2 && x[0].trim() && x[1].trim())
    .map(([name, vals]) => ({ name: name.trim(), values: vals.split(",").map((v) => v.trim().toUpperCase()).filter(Boolean) }));

  const details = {
    title: f.title.trim(),
    description: f.description.trim(),
    experienceType: kind === "experience" ? f.experienceType ?? undefined : undefined,
    externalUrl: external ? f.externalUrl.trim() : undefined,
    fileName: kind === "downloadable" ? f.fileName : undefined,
    image: f.image,
    locked: f.locked,
    published: f.published,
    options: kind === "merchandise" && options.length ? options : p?.options,
  };
  // Keep the assistant's copy in step with what the creator types here.
  useEffect(() => {
    if (!workId || !we) return;
    const t = setTimeout(() => {
      const cur = itemById(getData(), workId)?.experience;
      const price = Number(f.price) > 0 ? Number(f.price) : null;
      if (cur && (cur.title !== f.title || cur.description !== f.description || (price && cur.price !== price)))
        act("content.syncExperience", (d) => syncFromScreen(d, workId, { title: f.title, description: f.description, price }), { need: "content.write" });
    }, 600);
    return () => clearTimeout(t);
  }, [f.title, f.description, f.price]);
  const priceChanged = !!p && (p.price !== priceNum || JSON.stringify(p.durations ?? null) !== JSON.stringify(durations ?? p.durations ?? null));

  const save = () => {
    setTried(true);
    if (!valid) return;
    if (!p) {
      const ok = run(
        `monetize.add${kind[0].toUpperCase()}${kind.slice(1)}`,
        (d) => {
          const id = addProduct(d, { kind, ...details, price: priceNum, durations, external, source: external ? "external" : "native", collection: kind === "merchandise" ? "Automated Collection" : undefined });
          if (workId && we) linkSaved(d, workId, { productId: id }, details.published ? "active" : "saved");
        },
        "content.write",
        `${details.title} added to your Store`,
      );
      if (ok) navigate(back);
      return;
    }
    if (priceChanged) return setConfirm(true);
    if (run("monetize.updateProduct", (d) => updateProduct(d, p.id, details), "content.write", "Changes saved")) navigate(back);
  };
  const confirmPrice = () => {
    if (!p) return;
    if (!run("monetize.setProductPrice", (d) => setProductPrice(d, p.id, priceNum, durations), "finance.write")) return setConfirm(false);
    if (run("monetize.updateProduct", (d) => updateProduct(d, p.id, details), "content.write", "Changes and new price saved")) navigate(back);
  };

  return (
    <FormPage
      routeId={routeId}
      title={TITLES[kind][p ? 1 : 0]}
      backTo={back}
      footer={
        <>
          <button type="button" onClick={() => navigate(back)} data-testid="monetize-product-cancel" className="h-[40px] px-[16px] text-[14px] font-black uppercase hover:text-accent">
            Cancel
          </button>
          <Pill data-testid="monetize-product-save" onClick={save}>
            {p ? "Update" : "Save"}
          </Pill>
        </>
      }
    >
      {kind === "experience" && (
        <div className="flex items-center justify-end gap-[12px] text-[14px]" data-testid="monetize-product-enable">
          {/* inferred: the unlabeled Disable/Enable control is assumed to publish/unpublish this experience */}
          <span className={f.published ? "text-muted" : "font-bold"}>Disable</span>
          <span className="scale-[1.2]">
            <Toggle on={f.published} onChange={() => setF({ ...f, published: !f.published })} label="Enable experience" />
          </span>
          <span className={f.published ? "font-bold" : "text-muted"}>Enable</span>
        </div>
      )}
      {kind === "merchandise" && shopify && <p className="rounded-inner bg-bg px-[20px] py-[14px] text-[14px] text-soft">Products from your connected Shopify store are added with RE-SYNC MERCH FROM SHOPIFY. Use this form for merchandise sold on another website.</p>}
      {kind === "experience" && (
        <Field label="Type of Experience" required error={tried ? errors.experienceType : undefined}>
          <div data-testid="monetize-product-type">
            <Select value={f.experienceType} options={EXPERIENCE_TYPES} placeholder="Select Type" onChange={(v) => setF({ ...f, experienceType: v })} invalid={tried && !!errors.experienceType} />
          </div>
        </Field>
      )}
      <Field label={kind === "experience" ? "Enter Title" : kind === "nft" ? "NFT Name" : kind === "merchandise" ? "Product Name" : "Title"} required error={tried ? errors.title : undefined} htmlFor="pr-title">
        <TextInput id="pr-title" value={f.title} maxLength={80} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Enter Title" data-testid="monetize-product-title" invalid={tried && !!errors.title} />
      </Field>
      <Field label="Description" required={!external} error={tried ? errors.description : undefined} htmlFor="pr-desc">
        <TextArea id="pr-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Enter Description" data-testid="monetize-product-description" invalid={tried && !!errors.description} />
      </Field>
      {isCall ? (
        <Field label="Call Options" required info="Fans choose one of these options when they book a call." error={tried ? errors.price : undefined}>
          <div className="flex flex-col gap-[10px]" data-testid="monetize-product-durations">
            {durs.map((d, i) => (
              <div key={i} className="flex items-center gap-[12px]">
                <TextInput value={d.label} onChange={(e) => setDurs(durs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="e.g. 30 Minutes" aria-label="Option label" className="!w-[260px]" />
                <label className="flex h-[55px] w-[180px] items-center rounded-pill bg-bg px-[24px] text-[14px] font-black">
                  $
                  <input aria-label="Option price" inputMode="decimal" value={d.price} onChange={(e) => setDurs(durs.map((x, j) => (j === i ? { ...x, price: e.target.value.replace(/[^0-9.]/g, "") } : x)))} placeholder="0.00" className="ml-[4px] w-full bg-transparent outline-none" />
                </label>
                {durs.length > 1 && (
                  <button type="button" aria-label="Remove option" onClick={() => setDurs(durs.filter((_, j) => j !== i))} className="hover:text-accent">
                    <X size={20} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" data-testid="monetize-product-add-duration" onClick={() => setDurs([...durs, { label: "", price: "" }])} className="self-start text-[14px] font-bold uppercase text-accent">
              + Add Option
            </button>
          </div>
        </Field>
      ) : (
        <Field label="Price" required error={tried ? errors.price : undefined}>
          <label className="flex h-[55px] w-[220px] items-center rounded-pill bg-bg px-[24px] text-[14px] font-black">
            $
            <input aria-label="Price" data-testid="monetize-product-price" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="0.00" className="ml-[4px] w-full bg-transparent outline-none" />
          </label>
        </Field>
      )}
      {external && (
        <Field label={kind === "nft" ? "NFT Marketplace Link" : "External Product Link"} required error={tried ? errors.externalUrl : undefined} htmlFor="pr-url">
          <TextInput id="pr-url" value={f.externalUrl} onChange={(e) => setF({ ...f, externalUrl: e.target.value })} placeholder="https://" data-testid="monetize-product-url" invalid={tried && !!errors.externalUrl} />
        </Field>
      )}
      {kind === "merchandise" && (
        <Field label="Options" info="One option per line, e.g. “Color: Red, Blue”. Fans pick these on the product page.">
          <TextArea value={f.options} onChange={(e) => setF({ ...f, options: e.target.value })} placeholder={"Color: Spectrum, Cosmic\nBoard Size: 154, 158"} data-testid="monetize-product-options" className="!min-h-[90px]" />
        </Field>
      )}
      {kind === "downloadable" && (
        <Field label="File" required error={tried ? errors.fileName : undefined}>
          <FilePick testid="monetize-product-file" value={f.fileName} onChange={(name) => setF({ ...f, fileName: name })} />
        </Field>
      )}
      <Field label={kind === "course" ? "Course Cover Image" : "Cover Image"}>
        <FilePick accept="image/*" testid="monetize-product-image" value={f.imageName} onChange={(name, file) => setF({ ...f, imageName: name, image: URL.createObjectURL(file) })} />
      </Field>
      <label className="flex items-center gap-[14px] text-[16px]" data-testid="monetize-product-lock">
        <span className="scale-[1.2]">
          <Toggle on={f.locked} onChange={() => setF({ ...f, locked: !f.locked })} label="Subscribers only" />
        </span>
        Lock for subscribers only
      </label>
      {kind === "course" && (
        <label className="flex items-center gap-[14px] text-[16px]" data-testid="monetize-product-publish">
          <span className="scale-[1.2]">
            <Toggle on={f.published} onChange={() => setF({ ...f, published: !f.published })} label="Published" />
          </span>
          Published
        </label>
      )}

      <ConfirmModal open={confirm} title="Change Price" confirmLabel="Change Price" testid="monetize-product-price" onClose={() => setConfirm(false)} onConfirm={confirmPrice}>
        <p>
          <b>{p?.title}</b>: {p?.price != null ? money(p.price) : "—"} → <b>{money(priceNum)}</b>
          {isCall && durations ? ` (${durations.map((d) => `${d.label} ${money(d.price)}`).join(", ")})` : ""}
        </p>
        <p className="mt-[8px] text-[14px] text-muted">Fans will see the new price on your Store right away.</p>
      </ConfirmModal>
    </FormPage>
  );
}
