/**
 * White Label Site › Cover Page editor (P50f; 50f-part1…5). Full-width, no sidebar.
 */
import { useState } from "react";
import { ArrowLeft, Eye, Menu, Pencil, Plus, Trash2 } from "lucide-react";
import { coverSections, seo } from "../../config/demo";
import { usePlatform } from "../../state/platformStore";
import { Button, Input, Toggle } from "../ui/controls";
import { Modal } from "../ui/surfaces";
import { useToast } from "../ui/toast";
import { ConfirmModal } from "../../pages/prefs-b/ui";

/** The 47 layouts offered in the Add Section modal, in the captured order (50g). */
const LAYOUTS = [
  "Hero Layout 1", "Horizontal Side Image Section", "Vertical Side Image Section", "Image Slider", "Full Page Carousel", "Read More Text Section", "Free Form Layout", "Newsletter Layout",
  "Single Store Item Layout", "Store Items Grid Layout", "Creator Poster Cards", "Feature Creator Layout", "Image Bottom Layout", "Stats Cards",
  "Two Feature Cards", "Three Feature Cards", "Three Feature Cards With Tall Card", "Banner CTA Layout", "Image Card Grid", "Feature Listing Carousel", "Testimonial Carousel", "Image Marquee Layout", "Vertical Card Carousel",
  "Hero Layout With Side Image", "Image Above Text", "Image Above And Below Text", "Scroll-Driven Card Rail", "Vertical Card Snap Scroll Layout", "Image Cards Grid", "Feature List With Side Image", "Four Cards Grid", "6 Cards Grid", "2 Cards Grid", "Hero Layout 2", "Feature Cards Grid", "Showcase Carousel", "Cards Grid",
  "Event Tickets Grid Layout", "Event Tickets Banner Layout", "VIP Deals Banner Layout", "Feed Posts Grid Layout",
  "Portfolio Album Detail Layout", "Portfolio Description Split Layout", "Portfolio Vertical Card Layout", "Portfolio Horizontal Card Layout", "Portfolio Sidebar List Layout", "Portfolio Items Grid Layout",
];
/** Category chips (captured). Which layout belongs to which chip is inferred from the layout names. */
const CHIPS: [string, (l: string) => boolean][] = [
  ["All", () => true],
  ["Hero", (l) => /hero/i.test(l)],
  ["Image + Text", (l) => /image|read more|side image/i.test(l) && !/carousel|slider|marquee|grid/i.test(l)],
  ["Callouts", (l) => /feature|banner cta|creator/i.test(l) && !/carousel/i.test(l)],
  ["Carousel + Scroll", (l) => /carousel|slider|marquee|scroll|rail/i.test(l)],
  ["Stats", (l) => /stats/i.test(l)],
  ["Newsletter", (l) => /newsletter/i.test(l)],
  ["Store", (l) => /store/i.test(l)],
  ["Event Ticketing", (l) => /event/i.test(l)],
  ["VIP Deals", (l) => /vip/i.test(l)],
  ["Feed", (l) => /feed/i.test(l)],
  ["Portfolio", (l) => /portfolio/i.test(l)],
  ["Free Form", (l) => /free form/i.test(l)],
];
const descFor = (layout: string) => coverSections.find((c) => c.layout === layout)?.desc ?? "";

type Section = (typeof coverSections)[number];

export function CoverPageEditor() {
  const { go } = usePlatform();
  const toast = useToast();
  const [rows, setRows] = useState<Section[]>(coverSections);
  const [meta, setMeta] = useState({ title: seo.title, keywords: seo.keywords, description: seo.description });
  /** null = closed; -1 = adding; otherwise the row being edited. */
  const [editing, setEditing] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [subPages, setSubPages] = useState<{ name: string; slug: string }[]>([]);
  const [subOpen, setSubOpen] = useState(false);
  // The cover page is the public Home of the White Label Site: preview it in a new tab, like the live product.
  const preview = () => window.open("/", "_blank", "noopener");

  return (
    <>
      <button onClick={() => go("manage")} className="mt-1 flex items-center gap-3 text-xl font-bold uppercase hover:text-accent">
        <ArrowLeft size={18} /> Back to White Label Settings
      </button>

      <div className="mt-5 rounded-card bg-surface p-[30px]">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="mb-4 text-base">Cover Page SEO Title*</p>
            <Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          </div>
          <div data-field="cover-keywords">
            <p className="mb-4 text-base">Cover Page SEO Keywords (Separated by commas)*</p>
            <Input value={meta.keywords} onChange={(e) => setMeta({ ...meta, keywords: e.target.value })} />
          </div>
          <div className="col-span-2">
            <p className="mb-4 text-base">Cover Page SEO Description*</p>
            <textarea
              value={meta.description}
              onChange={(e) => setMeta({ ...meta, description: e.target.value })}
              className="h-[110px] w-full resize-y rounded-[28px] bg-bg px-6 py-[17px] text-sm font-black leading-[21px] text-white outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="mt-1 pr-2 text-right text-xs italic text-soft">{1000 - meta.description.length} Characters left</p>
          </div>
        </div>
      </div>

      <div className="mt-12 flex items-center justify-between">
        <h3 className="text-xl font-bold uppercase">Cover Page Sections</h3>
        <div className="flex gap-2">
          <Button onClick={preview}>Preview Cover Page</Button>
          <Button icon={<Plus size={18} />} onClick={() => setEditing(-1)}>
            Add Section
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-card bg-surface p-[30px]">
        <table className="w-full table-fixed text-left">
          <thead>
            <tr className="border-b border-[#3a3c3e] text-[13px] font-medium uppercase">
              <th className="w-[52px] pb-6" />
              <th className="pb-6 font-medium">Section Name</th>
              <th className="pb-6 font-medium">Layout Type</th>
              <th className="w-[22%] pb-6 font-medium">Visibility Status</th>
              <th className="w-[14%] pb-6 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} className="border-b border-[#3a3c3e] last:border-0" data-field={`section-${i}`}>
                <td className="py-5">
                  {!r.fixed && (
                    <span className="flex h-10 w-10 cursor-grab items-center justify-center rounded-full bg-surface-2">
                      <Menu size={18} />
                    </span>
                  )}
                </td>
                <td className="py-5 pr-6 text-sm">{r.name}</td>
                <td className="py-5 pr-6">
                  <p className="text-sm font-semibold">{r.layout}</p>
                  <p className="mt-1 text-sm font-medium text-soft">{r.desc}</p>
                </td>
                <td className="py-5">
                  {r.name !== "Header" && (
                    <span className="flex items-center gap-2.5">
                      <Toggle
                        on={r.visible}
                        label={`Toggle ${r.name}`}
                        onChange={() => setRows(rows.map((x, j) => (j === i ? { ...x, visible: !x.visible } : x)))}
                      />
                      <span className="text-sm font-semibold">{r.visible ? "Visible" : "Hidden"}</span>
                    </span>
                  )}
                </td>
                <td className="py-5">
                  <span className="flex gap-4">
                    <RowAction label={`Preview ${r.name}`} onClick={preview}><Eye size={14} /></RowAction>
                    <RowAction label={`Edit ${r.name}`} onClick={() => setEditing(i)}><Pencil size={13} /></RowAction>
                    {!r.fixed && <RowAction label={`Delete ${r.name}`} onClick={() => setDeleting(i)}><Trash2 size={13} /></RowAction>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-12 flex items-center justify-between">
        <h3 className="text-xl font-bold uppercase">Sub-Pages</h3>
        <Button icon={<Plus size={18} />} onClick={() => setSubOpen(true)}>
          Add Sub-Page
        </Button>
      </div>
      {subPages.length ? (
        <div className="mt-6 flex flex-col rounded-card bg-surface p-[30px]" data-testid="cover-subpages">
          {subPages.map((sp, i) => (
            <div key={sp.slug} className="flex items-center gap-4 border-b border-[#3a3c3e] py-4 last:border-0">
              <span className="flex-1 text-sm font-semibold">{sp.name}</span>
              <span className="text-sm text-soft">/{sp.slug}</span>
              <RowAction label={`Delete ${sp.name}`} onClick={() => setSubPages(subPages.filter((_, j) => j !== i))}>
                <Trash2 size={13} />
              </RowAction>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex h-[270px] items-center justify-center rounded-card bg-surface text-lg text-soft">No Sub-Pages Found</div>
      )}

      <div className="mt-10 flex justify-end">
        <Button onClick={() => toast("White Label site updated and published successfully")}>Update &amp; Publish</Button>
      </div>

      <SectionModal
        key={editing ?? "closed"}
        open={editing !== null}
        initial={editing !== null && editing >= 0 ? rows[editing] : null}
        onClose={() => setEditing(null)}
        onSave={(name, layout) => {
          if (editing === -1) {
            // New sections go above the footer, which stays last.
            const at = rows[rows.length - 1]?.fixed ? rows.length - 1 : rows.length;
            setRows([...rows.slice(0, at), { name, layout, desc: descFor(layout), visible: true }, ...rows.slice(at)]);
          }
          else if (editing !== null) setRows(rows.map((x, j) => (j === editing ? { ...x, name, layout, desc: descFor(layout) || x.desc } : x)));
          toast(editing === -1 ? "Section added" : "Section updated");
          setEditing(null);
        }}
      />
      <ConfirmModal
        open={deleting !== null}
        title="Delete Section"
        confirmLabel="Delete"
        testid="modal-cover-delete-section"
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          setRows(rows.filter((_, j) => j !== deleting));
          setDeleting(null);
          toast("Section deleted");
        }}
      >
        By clicking Delete below, the {deleting !== null ? rows[deleting]?.name : ""} section will be removed from your cover page.
      </ConfirmModal>
      <SubPageModal
        open={subOpen}
        onClose={() => setSubOpen(false)}
        taken={subPages.map((x) => x.slug)}
        onSave={(name, slug) => {
          setSubPages([...subPages, { name, slug }]);
          setSubOpen(false);
          toast("Sub-page added");
        }}
      />
    </>
  );
}

function RowAction({ label, children, onClick }: { label: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="flex h-7 w-7 items-center justify-center rounded-full bg-bg hover:text-accent">
      {children}
    </button>
  );
}

/** Add Section (50g) and Edit: name + layout; the button stays disabled until both are set. */
function SectionModal({ open, initial, onClose, onSave }: { open: boolean; initial: Section | null; onClose: () => void; onSave: (name: string, layout: string) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [layout, setLayout] = useState(initial?.layout ?? "");
  const [chip, setChip] = useState("All");
  const filter = CHIPS.find((c) => c[0] === chip)![1];
  const options = initial && !LAYOUTS.includes(initial.layout) ? [initial.layout, ...LAYOUTS] : LAYOUTS;
  const ok = name.trim().length > 0 && !!layout;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit Section" : "Add Section"}
      width={920}
      footer={
        <Button disabled={!ok} className={ok ? "" : "opacity-65"} onClick={() => ok && onSave(name.trim(), layout)} data-testid="cover-section-save">
          {initial ? "Save Section" : "Add Section"}
        </Button>
      }
    >
      <p className="text-base">Enter section name and select a layout</p>
      <p className="mb-3 mt-6 text-sm font-medium">Section Name *</p>
      <Input value={name} placeholder="Ex. Section 1 Name" onChange={(e) => setName(e.target.value)} data-testid="cover-section-name" />
      <p className="mb-3 mt-6 text-sm font-medium">Select Layout *</p>
      <div className="flex flex-wrap gap-2">
        {CHIPS.map(([c]) => (
          <button key={c} type="button" onClick={() => setChip(c)} className={`h-10 rounded-pill px-4 text-sm font-black uppercase ${chip === c ? "bg-accent" : "bg-bg"}`}>
            {c}
          </button>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-4">
        {options.filter(filter).map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={layout === l}
            onClick={() => setLayout(l)}
            className={`flex flex-col gap-2 rounded-lg border p-2 text-center ${layout === l ? "border-accent ring-1 ring-accent" : "border-white"}`}
          >
            {/* Grey wireframe thumbnail: image block, text bars, a button pill. */}
            <span className="flex h-[121px] flex-col justify-end gap-1.5 rounded bg-[#55585b] p-3" aria-hidden>
              <span className="h-2 w-3/4 rounded bg-white/80" />
              <span className="h-2 w-1/2 rounded bg-white/60" />
              <span className="mt-1 h-3 w-12 rounded-full bg-black" />
            </span>
            <span className="text-sm font-semibold">{l}</span>
            {descFor(l) && <span className="text-xs text-soft">{descFor(l)}</span>}
          </button>
        ))}
      </div>
    </Modal>
  );
}

function SubPageModal({ open, onClose, onSave, taken }: { open: boolean; onClose: () => void; onSave: (name: string, slug: string) => void; taken: string[] }) {
  const [name, setName] = useState("");
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const dup = taken.includes(slug);
  const ok = !!slug && !dup;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Sub-Page"
      footer={
        <Button disabled={!ok} className={ok ? "" : "opacity-65"} onClick={() => ok && (onSave(name.trim(), slug), setName(""))}>
          Add Sub-Page
        </Button>
      }
    >
      <p className="mb-3 text-sm font-medium">Sub-Page Name *</p>
      <Input value={name} placeholder="Ex. About Me" onChange={(e) => setName(e.target.value)} />
      <p className="mt-3 text-sm text-soft">{dup ? "A sub-page with this address already exists." : slug ? `Address: /${slug}` : "The page address is made from the name."}</p>
    </Modal>
  );
}
