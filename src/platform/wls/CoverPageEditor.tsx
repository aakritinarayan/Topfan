/**
 * White Label Site › Cover Page editor (P50f; 50f-part1…5). Full-width, no sidebar.
 */
import { useState } from "react";
import { ArrowLeft, Eye, Menu, Pencil, Plus, Trash2 } from "lucide-react";
import { coverSections, seo } from "../../config/demo";
import { usePlatform } from "../../state/platformStore";
import { Button, Input, Toggle } from "../ui/controls";
import { useToast } from "../ui/toast";

export function CoverPageEditor() {
  const { go } = usePlatform();
  const toast = useToast();
  const [rows, setRows] = useState(coverSections);
  const [meta, setMeta] = useState({ title: seo.title, keywords: seo.keywords, description: seo.description });

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
          <Button>Preview Cover Page</Button>
          <Button icon={<Plus size={18} />}>Add Section</Button>
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
                    <RowAction label="Preview"><Eye size={14} /></RowAction>
                    <RowAction label="Edit"><Pencil size={13} /></RowAction>
                    {!r.fixed && <RowAction label="Delete"><Trash2 size={13} /></RowAction>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-12 flex items-center justify-between">
        <h3 className="text-xl font-bold uppercase">Sub-Pages</h3>
        <Button icon={<Plus size={18} />}>Add Sub-Page</Button>
      </div>
      <div className="mt-6 flex h-[270px] items-center justify-center rounded-card bg-surface text-lg text-soft">No Sub-Pages Found</div>

      <div className="mt-10 flex justify-end">
        <Button onClick={() => toast("White Label site updated and published successfully")}>Update &amp; Publish</Button>
      </div>
    </>
  );
}

function RowAction({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button aria-label={label} className="flex h-7 w-7 items-center justify-center rounded-full bg-bg hover:text-accent">
      {children}
    </button>
  );
}
