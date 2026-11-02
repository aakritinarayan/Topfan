/** Monetize › VIP Offers (14i). */
import { useState } from "react";
import { Menu, Pencil, Tags, Trash2 } from "lucide-react";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { useData } from "../../../store/store";
import { deleteVipOffer, moveVipOffer, setVipActive, setVipSettings, type VipOffer } from "../../../store/slices/monetize";
import { Avatar } from "../../../platform/ui/surfaces";
import type { PageProps } from "../../types";
import {
  BlackCircle, ButtonLabelField, ConfirmModal, DisplayToggle, EmptyState, MarkButton, MonetizeFrame, Pill, PillTabs, TableCard, td, th, useRun,
} from "../ui";

export function VipOffersTab({ route }: PageProps) {
  const m = useData((d) => ({ label: d.monetize.vipLabel, display: d.monetize.vipDisplay, offers: d.monetize.vipOffers }));
  const [tab, setTab] = useState<"active" | "inactive">("active");
  const [del, setDel] = useState<VipOffer | null>(null);
  const [activate, setActivate] = useState<VipOffer | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const { navigate } = useRouter();
  const run = useRun();
  const list = m.offers.filter((o) => o.active === (tab === "active")).sort((a, b) => a.order - b.order);

  const moveTo = (id: string, targetId: string) => {
    const ids = list.map((o) => o.id);
    const from = ids.indexOf(id);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) return;
    run("monetize.reorderVipOffers", (d) => {
      for (let i = 0; i < Math.abs(to - from); i++) moveVipOffer(d, id, to > from ? 1 : -1);
    }, "content.write");
  };

  return (
    <MonetizeFrame routeId={route.id} active="monetize-vip-offers">
      <div className="flex h-[40px] items-center justify-between">
        <h2 className="text-[24px] font-bold">VIP Offers</h2>
        <div className="flex items-center gap-[68px]">
          <ButtonLabelField
            value={m.label}
            testid="monetize-vip-button-label"
            info="This is the label of the button fans see on your profile for your VIP offers."
            onSave={(v) => run("monetize.setVipLabel", (d) => setVipSettings(d, { vipLabel: v }), "content.write", "Button label updated")}
          />
          <DisplayToggle label="Display My VIP Offers" on={m.display} testid="monetize-vip-display" onChange={() => run("monetize.setVipDisplay", (d) => setVipSettings(d, { vipDisplay: !m.display }), "content.write")} />
        </div>
      </div>
      <div className="mt-[24px]">
        <PillTabs
          testid="monetize-vip-tab"
          gap={10}
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "active", label: "Active Offers" },
            { id: "inactive", label: "Inactive Offers" },
          ]}
        />
      </div>
      <div className="mt-[20px] flex h-[40px] items-center justify-between">
        <h3 className="text-[24px] font-bold" data-testid="monetize-vip-count">
          {list.length} {tab === "active" ? "Active" : "Inactive"} Offers
        </h3>
        {tab === "active" && (
          <Pill data-testid="monetize-vip-add" onClick={() => navigate(pathFor("monetize-vip-add"))}>
            Add New Offer
          </Pill>
        )}
      </div>
      {list.length ? (
        <TableCard className="mt-[16px]">
          <table className="w-full table-fixed" data-testid="monetize-vip-table">
            <thead>
              <tr>
                <th className={`${th} w-[50px]`} aria-label="Reorder" />
                <th className={`${th} w-[195px]`}>Offer Title</th>
                <th className={`${th} w-[102px]`}>Code Type</th>
                <th className={`${th} w-[86px]`}>Issued</th>
                <th className={`${th} w-[86px]`}>Left</th>
                <th className={`${th} w-[127px]`}>Lock Options</th>
                <th className={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o, i) => (
                <tr
                  key={o.id}
                  data-testid={`monetize-vip-row-${o.id}`}
                  draggable
                  onDragStart={() => setDrag(o.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => drag && moveTo(drag, o.id)}
                  onDragEnd={() => setDrag(null)}
                  className={drag === o.id ? "opacity-50" : ""}
                >
                  <td className={`${td} !py-[14px]`}>
                    <button
                      type="button"
                      aria-label={`Reorder ${o.title} (use arrow keys)`}
                      data-testid={`monetize-vip-drag-${o.id}`}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp" && i > 0) moveTo(o.id, list[i - 1].id);
                        if (e.key === "ArrowDown" && i < list.length - 1) moveTo(o.id, list[i + 1].id);
                      }}
                      className="flex h-[40px] w-[40px] cursor-grab items-center justify-center rounded-full bg-[#3a3c3e] text-white"
                    >
                      <Menu size={22} />
                    </button>
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-[6px]">
                      <Avatar src={o.logo} size={44} ring={2} />
                      <span className="line-clamp-2 text-[14px] font-bold leading-[17.5px]">{o.title}</span>
                    </div>
                  </td>
                  <td className={td}>{o.codeType}</td>
                  <td className={td}>{o.issued}</td>
                  <td className={td}>{o.left}</td>
                  <td className={td}>{o.lockOptions.join(", ")}</td>
                  <td className={td}>
                    <div className="flex flex-wrap items-center gap-[8px]">
                      <BlackCircle label="Edit" data-testid={`monetize-vip-edit-${o.id}`} onClick={() => navigate(pathFor("monetize-vip-edit", { offerId: o.id }))}>
                        <Pencil size={12} fill="currentColor" />
                      </BlackCircle>
                      <BlackCircle label="Delete" data-testid={`monetize-vip-delete-${o.id}`} onClick={() => setDel(o)}>
                        <Trash2 size={12} strokeWidth={2.5} />
                      </BlackCircle>
                      {o.active ? (
                        <MarkButton data-testid={`monetize-vip-deactivate-${o.id}`} onClick={() => run("monetize.setVipInactive", (d) => setVipActive(d, o.id, false), "content.write", "Offer marked as inactive")}>
                          Mark As Inactive
                        </MarkButton>
                      ) : (
                        <MarkButton data-testid={`monetize-vip-activate-${o.id}`} onClick={() => setActivate(o)}>
                          Mark As Active
                        </MarkButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      ) : (
        <div className="mt-[16px] rounded-card bg-surface py-[100px]">
          <EmptyState icon={<Tags size={44} fill="currentColor" stroke="var(--surface)" />} text={tab === "active" ? "No VIP Offers are Active" /* inferred */ : "No VIP Offers are Inactive"} />
        </div>
      )}

      <ConfirmModal
        open={!!activate}
        title="Publish Offer"
        confirmLabel="Mark As Active"
        testid="monetize-vip-activate"
        onClose={() => setActivate(null)}
        onConfirm={() => {
          if (activate && run("monetize.setVipActive", (d) => setVipActive(d, activate.id, true), "content.write", "Offer is now active")) setActivate(null);
        }}
      >
        <b>{activate?.title}</b> will be visible to fans on your VIP Deals page.
      </ConfirmModal>
      <ConfirmModal
        open={!!del}
        title="Delete Offer"
        confirmLabel="Delete"
        testid="monetize-delete-vip"
        onClose={() => setDel(null)}
        onConfirm={() => {
          if (del && run("monetize.deleteVipOffer", (d) => deleteVipOffer(d, del.id), "content.write", "Offer deleted")) setDel(null);
        }}
      >
        Are you sure you want to delete <b>{del?.title}</b>?
      </ConfirmModal>
    </MonetizeFrame>
  );
}
