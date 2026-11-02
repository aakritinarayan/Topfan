/** Monetize › Newsletters (14b). */
import { useState } from "react";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { useData } from "../../../store/store";
import { deleteNewsletter, duplicateNewsletter, setNewslettersOnProfile, type Newsletter } from "../../../store/slices/monetize";
import { Avatar, Modal } from "../../../platform/ui/surfaces";
import type { PageProps } from "../../types";
import { BlackCircle, ConfirmModal, DisplayToggle, MiniSelect, MonetizeFrame, Pill, SectionHeader, StatusChip, TableCard, td, th, useRun } from "../ui";

const pct = (n: number, of: number) => (of ? `${n} (${Math.round((n / of) * 10000) / 100}%)` : String(n));

export function NewslettersTab({ route }: PageProps) {
  const list = useData((d) => d.monetize.newsletters);
  const onProfile = useData((d) => d.monetize.newslettersOnProfile);
  const recipients = useData((d) => d.monetize.recipients.length);
  const [filter, setFilter] = useState("All");
  const [preview, setPreview] = useState<Newsletter | null>(null);
  const [del, setDel] = useState<Newsletter | null>(null);
  const { navigate } = useRouter();
  const run = useRun();
  const rows = filter === "All" ? list : list.filter((n) => n.status === filter);
  return (
    <MonetizeFrame routeId={route.id} active="monetize-newsletters">
      <SectionHeader title="Newsletters">
        <DisplayToggle
          label="Display Newsletters on Profile Page"
          on={onProfile}
          testid="monetize-newsletters-display"
          onChange={() => run("monetize.setNewslettersOnProfile", (d) => setNewslettersOnProfile(d, !onProfile), "content.write")}
        />
      </SectionHeader>
      <div className="mt-[20px] flex items-center justify-between">
        <MiniSelect label="Filter by status" testid="monetize-newsletters-filter" value={filter} options={["All", "Sent", "Draft", "Scheduled"]} onChange={setFilter} />
        <div className="flex gap-[10px]">
          <Pill data-testid="monetize-newsletter-recipients" onClick={() => navigate(pathFor("monetize-newsletter-recipients"))}>
            View Newsletter Recipients ({recipients})
          </Pill>
          <Pill data-testid="monetize-newsletter-new" icon={<Plus size={18} strokeWidth={2.5} />} onClick={() => navigate(pathFor("monetize-newsletter-new"))}>
            New Newsletter
          </Pill>
        </div>
      </div>
      <TableCard className="mt-[24px]">
        <table className="w-full table-fixed" data-testid="monetize-newsletters-table">
          <thead>
            <tr>
              <th className={`${th} w-[200px]`}>Newsletter Title</th>
              <th className={`${th} w-[131px]`}>Status</th>
              <th className={`${th} w-[87px]`}>Preview</th>
              <th className={`${th} w-[88px]`}>Sent</th>
              <th className={`${th} w-[131px]`}>Opened</th>
              <th className={`${th} w-[131px]`}>Unlocked</th>
              <th className={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((n) => (
              <tr key={n.id} data-testid={`monetize-newsletter-row-${n.id}`}>
                <td className={td}>
                  <div className="flex items-center gap-[6px]">
                    <Avatar src={n.image} size={44} ring={2} />
                    <span className="line-clamp-4 text-[14px] leading-[17.5px]">{n.title}</span>
                  </div>
                </td>
                <td className={td}>
                  <StatusChip status={n.status} />
                </td>
                <td className={td}>
                  <button type="button" data-testid={`monetize-newsletter-preview-${n.id}`} onClick={() => setPreview(n)} className="text-accent hover:underline">
                    View
                  </button>
                </td>
                <td className={td}>
                  <button type="button" className="text-accent hover:underline" onClick={() => navigate(pathFor("monetize-newsletter-recipients"))}>
                    {n.sent}
                  </button>
                </td>
                <td className={td}>{pct(n.opened, n.sent)}</td>
                <td className={td}>{pct(n.unlocked, n.sent)}</td>
                <td className={td}>
                  <div className="flex gap-[8px]">
                    <BlackCircle label="Edit" data-testid={`monetize-newsletter-edit-${n.id}`} onClick={() => navigate(pathFor("monetize-newsletter-edit", { newsletterId: n.id }))}>
                      <Pencil size={12} fill="currentColor" />
                    </BlackCircle>
                    <BlackCircle label="Duplicate" data-testid={`monetize-newsletter-duplicate-${n.id}`} onClick={() => run("monetize.duplicateNewsletter", (d) => duplicateNewsletter(d, n.id), "content.write", "Newsletter duplicated")}>
                      <Copy size={12} strokeWidth={2.5} />
                    </BlackCircle>
                    <BlackCircle label="Delete" data-testid={`monetize-newsletter-delete-${n.id}`} onClick={() => setDel(n)}>
                      <Trash2 size={12} strokeWidth={2.5} />
                    </BlackCircle>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                {/* inferred empty row */}
                <td colSpan={7} className={`${td} py-[40px] text-center text-[16px] text-[#c8c8c8]`}>
                  No Newsletters Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableCard>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Newsletter Preview" width={720}>
        <div data-testid="modal-monetize-newsletter-preview">
          <h3 className="text-[20px] font-bold">{preview?.title || "(Untitled)"}</h3>
          <p className="mt-[6px] text-[13px] text-muted">
            {preview?.status}
            {preview?.sentAt ? ` · ${new Date(preview.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""} · {preview?.lock === "Free" ? "Free" : preview?.lock === "Subscribers" ? "Subscribers only" : "Pay to unlock"}
          </p>
          <p className="mt-[16px] whitespace-pre-wrap text-[15px] leading-[22px]">{preview?.body || "This newsletter has no content yet."}</p>
        </div>
      </Modal>
      <ConfirmModal
        open={!!del}
        title="Delete Newsletter"
        confirmLabel="Delete"
        testid="monetize-delete-newsletter"
        onClose={() => setDel(null)}
        onConfirm={() => {
          if (del && run("monetize.deleteNewsletter", (d) => deleteNewsletter(d, del.id), "content.write", "Newsletter deleted")) setDel(null);
        }}
      >
        Are you sure you want to delete this newsletter?
      </ConfirmModal>
    </MonetizeFrame>
  );
}
