/** 16b–16i Fan Relationship Management: Fan Management (4 lists) + Segmentation & Outreach. */
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Mail,
  Minus,
  MousePointerClick,
  Plus,
  Ribbon,
  ShoppingBag,
  Sparkles,
  Star,
  UserCheck,
  Users,
  UsersRound,
} from "lucide-react";
import { act, useData } from "../../store/store";
import { createSegment, setFanGroup, type FanStatusFlag, type MoneyFan } from "../../store/slices/money";
import { InfoIcon, Input, Radio } from "../../platform/ui/controls";
import { Avatar, Modal } from "../../platform/ui/surfaces";
import { useToast } from "../../platform/ui/toast";
import { PeriodControl, usePeriod } from "./Insights";
import { mostEngaged, topRecruiters, topSupporters } from "./insightsData";
import { Btn, downloadCsv, EmptyState, FieldLabel, fmtDate, InlineError, PillSelect, SearchPill, SortHead, TableCard, TabPill, Td, TextBtn, Th, usd } from "./ui";

const STATUS_FILTERS = ["Followers", "Subscribers", "Newsletter Recipients", "Purchasers", "Content Engagers", "Imported & Unregistered"];
const STATUS_FLAG: Record<string, FanStatusFlag | "imported"> = {
  Followers: "follower",
  Subscribers: "subscriber",
  "Newsletter Recipients": "newsletter",
  Purchasers: "purchaser",
  "Content Engagers": "engager",
  "Imported & Unregistered": "imported",
};
const STATUS_ICONS: { flag: FanStatusFlag; icon: typeof Mail; label: string }[] = [
  { flag: "subscriber", icon: Ribbon, label: "Subscriber" },
  { flag: "newsletter", icon: Mail, label: "Newsletter Recipient" },
  { flag: "follower", icon: UserCheck, label: "Follower" },
  { flag: "purchaser", icon: ShoppingBag, label: "Purchaser" },
  { flag: "engager", icon: MousePointerClick, label: "Content Engager" },
];

/** "2026-11-02T10:58" → "Nov 2, 2026 | 10:58 AM IST" (the capture's timezone label, reproduced). */
function fmtSession(s: string) {
  const [h, m] = s.slice(11, 16).split(":").map(Number);
  return `${fmtDate(s)} | ${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"} IST`;
}

export function FanRelationship({ query }: { query: URLSearchParams }) {
  const [sub, setSub] = useState<"fans" | "segments">(query.get("sub") === "segmentation" ? "segments" : "fans");
  return (
    <div data-testid="insights-frm">
      <div className="flex gap-[10px]">
        <TabPill bold active={sub === "fans"} onClick={() => setSub("fans")} testid="insights-frm-fan-management">
          Fan Management
        </TabPill>
        <TabPill bold active={sub === "segments"} onClick={() => setSub("segments")} testid="insights-frm-segmentation">
          Segmentation &amp; Outreach
        </TabPill>
      </div>
      <div className="mt-[29px]">{sub === "fans" ? <FanManagement initialStatus={query.get("status")} /> : <Segmentation />}</div>
    </div>
  );
}

/* ---------------- Fan Management ---------------- */

type List = "all" | "supporters" | "engaged" | "recruiters";
const CHIPS: { key: List; label: string; icon: typeof Users }[] = [
  { key: "all", label: "All Fans", icon: Users },
  { key: "supporters", label: "Top Supporters", icon: ArrowUp },
  { key: "engaged", label: "Most Engaged", icon: Sparkles },
  { key: "recruiters", label: "Top Recruiters", icon: UsersRound },
];

function FanManagement({ initialStatus }: { initialStatus: string | null }) {
  const money = useData((d) => d.money);
  // inferred: group assignment column, shown only once the creator has created a Group.
  const groups = useData((d) => d.prefsB.groups);
  const [list, setList] = useState<List>("all");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | null>(initialStatus && STATUS_FILTERS.includes(initialStatus) ? initialStatus : null);
  const [sort, setSort] = useState<{ k: "name" | "session"; dir: "asc" | "desc" }>({ k: "session", dir: "desc" });
  const [importOpen, setImportOpen] = useState(false);
  const p = usePeriod();
  const needle = q.trim().toLowerCase();
  const match = (f: MoneyFan) => !needle || f.name.toLowerCase().includes(needle);

  const allRows = useMemo(() => {
    const flag = status ? STATUS_FLAG[status] : null;
    return money.fans
      .filter((f) => match(f) && (!flag || (flag === "imported" ? !!f.imported : f.statuses.includes(flag))))
      .sort((a, b) => (sort.dir === "asc" ? 1 : -1) * (sort.k === "name" ? a.name.localeCompare(b.name) : a.lastSession.localeCompare(b.lastSession)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [money.fans, needle, status, sort]);

  const ranked = useMemo(() => {
    if (list === "supporters") return topSupporters(money, p.range).filter((x) => match(x.fan)).map((x) => ({ fan: x.fan, metric: usd(x.amount) }));
    if (list === "engaged") return mostEngaged(money, p.range).filter(match).map((f) => ({ fan: f, metric: String(f.engagement) }));
    if (list === "recruiters") return topRecruiters(money, p.range).filter(match).map((f) => ({ fan: f, metric: String(f.recruited) }));
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, money, p.range, needle]);

  const count = list === "all" ? allRows.length : ranked.length;
  const exportFans = () => {
    const rows = list === "all" ? allRows.map((f) => ({ fan: f, metric: "" })) : ranked;
    downloadCsv("fans.csv", [["Name", "Email", "Fan Status", "Location", "Last Session", list === "all" ? "" : "Metric"], ...rows.map(({ fan, metric }) => [fan.name, fan.email, fan.statuses.join(" / "), fan.location ?? "", fmtSession(fan.lastSession), metric])]);
  };

  return (
    <div data-testid="insights-fan-management">
      <div className="flex flex-wrap gap-x-[16px] gap-y-[12px]">
        {CHIPS.map((c) => (
          <TabPill key={c.key} active={list === c.key} onClick={() => setList(c.key)} testid={`insights-fans-chip-${c.key}`} icon={<ChipIcon icon={c.icon} />}>
            {c.label}
          </TabPill>
        ))}
        <button type="button" data-testid="insights-import-completed" onClick={() => setImportOpen(true)} className="-ml-[6px] h-[40px] rounded-pill bg-accent px-[20px] text-[14px] font-black uppercase tracking-caps">
          Import Completed
        </button>
      </div>

      <div className="mt-[20px] flex flex-wrap items-center gap-[16px]">
        <h4 className="mr-auto whitespace-nowrap text-[24px] font-bold" data-testid="insights-fans-count">
          List of Fans ({count})
        </h4>
        <SearchPill value={q} onChange={setQ} placeholder="Search By Name" testid="insights-fans-search" tone="search" />
        {list === "all" && <PillSelect value={status} placeholder="Filter By Status" options={STATUS_FILTERS} onChange={setStatus} width={260} testid="insights-fans-status" />}
        <Btn data-testid="insights-fans-export" onClick={exportFans}>
          Export Fans
        </Btn>
      </div>
      {list !== "all" && (
        <div className="mt-[20px]">
          <PeriodControl p={p} testid="insights-fans-period" />
        </div>
      )}

      {list === "all" ? (
        <TableCard className="mt-[25px]" testid="insights-fans-table">
          <thead>
            <tr>
              <Th w="27%">
                <SortHead label="Name" dir={sort.k === "name" ? sort.dir : null} onClick={() => setSort({ k: "name", dir: sort.k === "name" && sort.dir === "asc" ? "desc" : "asc" })} testid="insights-fans-sort-name" />
              </Th>
              <Th w="18%">
                <span className="inline-flex items-center">
                  Fan Status
                  <InfoIcon text="Icons show whether a fan is a Subscriber, Newsletter Recipient, Follower, Purchaser or Content Engager." />
                </span>
              </Th>
              <Th w="27%">General Location</Th>
              <Th>
                <SortHead
                  label="Last Session"
                  dir={sort.k === "session" ? sort.dir : null}
                  onClick={() => setSort({ k: "session", dir: sort.k === "session" && sort.dir === "desc" ? "asc" : "desc" })}
                  testid="insights-fans-sort-session"
                />
              </Th>
              {groups.length > 0 && <Th w="16%">Groups</Th>}
            </tr>
          </thead>
          <tbody>
            {allRows.map((f) => (
              <tr key={f.id} className="h-[81px]" data-testid={`insights-fan-row-${f.id}`}>
                <Td>
                  <FanName f={f} />
                </Td>
                <Td>
                  <span className="flex gap-[12px]">
                    {STATUS_ICONS.filter((s) => f.statuses.includes(s.flag)).map((s) => (
                      <s.icon key={s.flag} size={20} className="text-accent" strokeWidth={2.4} aria-label={s.label}>
                        <title>{s.label}</title>
                      </s.icon>
                    ))}
                  </span>
                </Td>
                <Td>
                  <LocationCell text={f.location ?? ""} />
                </Td>
                <Td className="whitespace-nowrap text-[16px]">{fmtSession(f.lastSession)}</Td>
                {groups.length > 0 && (
                  <Td>
                    <FanGroups fanId={f.id} groupIds={f.groupIds} groups={groups} />
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </TableCard>
      ) : ranked.length === 0 ? (
        <EmptyState
          icon={list === "recruiters" ? UsersRound : list === "engaged" ? Star : ArrowUp}
          text="No Matching Fans Found. Please Adjust Date Range."
          className="mt-[25px] h-[330px] !py-0"
          testid="insights-fans-empty"
        />
      ) : (
        <TableCard className="mt-[25px]" testid={`insights-fans-table-${list}`}>
          <thead>
            <tr>
              <Th w="7%" />
              <Th w="27%">Name</Th>
              <Th w="17%">{list === "supporters" ? "Amount Spent" : list === "engaged" ? "Engagements" : "Fans Recruited"}</Th>
              <Th w="26%">Location</Th>
              <Th>Last Session</Th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(({ fan, metric }, i) => (
              <tr key={fan.id} className="h-[81px]" data-testid={`insights-ranked-row-${fan.id}`}>
                <Td>
                  <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#f7d117] text-[14px] font-bold text-white">{i + 1}</span>
                </Td>
                <Td>
                  <FanName f={fan} />
                </Td>
                <Td>{metric}</Td>
                <Td>
                  <LocationCell text={fan.location ?? ""} />
                </Td>
                <Td className="whitespace-nowrap text-[16px]">{fmtSession(fan.lastSession)}</Td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import Completed">
        {/* inferred: the import status dialog was not captured */}
        <p data-testid="modal-insights-import" className="text-[16px] leading-[24px]">
          Your fan import finished. {money.fans.filter((f) => f.imported).length} imported contacts are listed under “Imported &amp; Unregistered”.
        </p>
      </Modal>
    </div>
  );
}

/** inferred: shows a fan's groups and adds/removes them (content.write, enforced in act). */
function FanGroups({ fanId, groupIds, groups }: { fanId: string; groupIds: string[]; groups: { id: string; name: string }[] }) {
  const toast = useToast();
  return (
    <select
      aria-label="Groups"
      data-testid={`insights-fan-group-${fanId}`}
      value=""
      onChange={(e) => {
        const g = e.target.value;
        if (!g) return;
        const on = !groupIds.includes(g);
        const res = act("money.setFanGroup", (d) => setFanGroup(d, fanId, g, on), { need: "content.write" });
        if (!res.ok) toast(res.reason);
      }}
      className="h-[36px] max-w-[180px] rounded-pill bg-bg px-[12px] text-[14px] text-white outline-none"
    >
      <option value="">{groupIds.length ? groups.filter((x) => groupIds.includes(x.id)).map((x) => x.name).join(", ") : "Add to group"}</option>
      {groups.map((x) => (
        <option key={x.id} value={x.id}>
          {groupIds.includes(x.id) ? `✓ ${x.name} (remove)` : x.name}
        </option>
      ))}
    </select>
  );
}

function ChipIcon({ icon: Icon }: { icon: typeof Users }) {
  return (
    <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white text-surface">
      <Icon size={14} strokeWidth={3} />
    </span>
  );
}

function FanName({ f }: { f: MoneyFan }) {
  return (
    <span className="flex items-center gap-[14px]">
      <Avatar src={f.avatar} size={44} ring={2} />
      <span className="text-[14px] font-bold">{f.name}</span>
    </span>
  );
}

/** Location with the dark hover tooltip showing the full text (16b). */
function LocationCell({ text }: { text: string }) {
  return (
    <span className="group relative block">
      <span className="line-clamp-2 leading-[24px]">{text}</span>
      <span role="tooltip" className="pointer-events-none absolute -top-[36px] left-0 z-20 hidden whitespace-nowrap rounded-[4px] bg-[#2f3133] px-[10px] py-[6px] text-[12px] shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}

/* ---------------- Segmentation & Outreach ---------------- */

const EMPTY_FORM = {
  minAge: "",
  maxAge: "",
  gender: "",
  location: "",
  radius: "",
  fanStatus: "",
  minSpend: "",
  maxSpend: "",
  lastEngagement: "",
  engagementRange: "",
  purchased: "Purchased",
  purchase: "",
  engaged: "Engaged",
  content: "",
};
type Form = typeof EMPTY_FORM;

function Segmentation() {
  const segments = useData((d) => d.money.segments);
  const posts = useData((d) => d.money.contentPosts);
  const toast = useToast();
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [openSec, setOpenSec] = useState<Record<string, boolean>>({ demo: true });
  const [saved, setSaved] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const input = (k: keyof Form, placeholder = "", numeric = false) => (
    <Input tone="surface" className="!h-[56px] !text-[14px]" data-testid={`insights-seg-${k}`} placeholder={placeholder} inputMode={numeric ? "numeric" : undefined} value={form[k]} onChange={(e) => set(k)(numeric ? e.target.value.replace(/[^0-9.]/g, "") : e.target.value)} />
  );

  return (
    <div data-testid="insights-segmentation">
      <PillSelect
        value={saved}
        placeholder="SAVED SEGMENTS"
        options={segments.map((s) => s.name)}
        onChange={(name) => {
          setSaved(name);
          const s = segments.find((x) => x.name === name);
          if (s) setForm({ ...EMPTY_FORM, ...s.criteria });
        }}
        width={225}
        testid="insights-saved-segments"
      />
      <section className="mt-[36px] rounded-card bg-surface px-[30px] pb-[30px] pt-[30px]">
        <h4 className="flex items-center text-[20px] font-bold">
          Create a New Fan Segment
          <InfoIcon text="Combine filters to build a group of fans you can message or target with offers." />
        </h4>
        <div className="mt-[30px] flex flex-col gap-[16px]">
          <Accordion id="demo" title="Demographics" info="Filter by age, gender and location." open={!!openSec.demo} onToggle={() => setOpenSec((o) => ({ ...o, demo: !o.demo }))}>
            <div className="grid grid-cols-3 gap-[24px]">
              <div>
                <FieldLabel>Min Age</FieldLabel>
                {input("minAge", "", true)}
              </div>
              <div>
                <FieldLabel>Max Age</FieldLabel>
                {input("maxAge", "", true)}
              </div>
              <div data-testid="insights-seg-gender">
                <FieldLabel>Gender</FieldLabel>
                <PillSelect size="lg" testid={`insights-seg-select-1`} value={form.gender || null} placeholder="Select Gender" options={["Male", "Female", "Other"]} onChange={set("gender")} />
              </div>
              <div className="col-span-2">
                <FieldLabel>Geographic Location</FieldLabel>
                {input("location")}
              </div>
              <div>
                <FieldLabel>Radius (miles)</FieldLabel>
                {input("radius", "", true)}
              </div>
            </div>
            <MapPlaceholder place={form.location} />
          </Accordion>
          <Accordion id="activity" title="General Activity" info="Filter by fan status, spend and recent activity." open={!!openSec.activity} onToggle={() => setOpenSec((o) => ({ ...o, activity: !o.activity }))}>
            <div className="grid grid-cols-3 gap-x-[24px] gap-y-[12px]">
              <div data-testid="insights-seg-fanStatus">
                <FieldLabel>Fan Status</FieldLabel>
                <PillSelect size="lg" testid={`insights-seg-select-2`} value={form.fanStatus || null} placeholder="Filter By Status" options={STATUS_FILTERS} onChange={set("fanStatus")} />
              </div>
              <div>
                <FieldLabel>Lifetime Min Spend</FieldLabel>
                {input("minSpend", "Min Spend", true)}
              </div>
              <div>
                <FieldLabel>Lifetime Max Spend</FieldLabel>
                {input("maxSpend", "Max Spend", true)}
              </div>
            </div>
            <div className="mt-[12px] grid grid-cols-2 gap-[24px]">
              <div data-testid="insights-seg-lastEngagement">
                <FieldLabel>Time Since Last Engagement</FieldLabel>
                {/* inferred options */}
                <PillSelect size="lg" testid={`insights-seg-select-3`} value={form.lastEngagement || null} placeholder="Select a Time Period" options={["Last 7 Days", "Last 30 Days", "Last 90 Days", "More than 90 Days"]} onChange={set("lastEngagement")} />
              </div>
              <div data-testid="insights-seg-engagementRange">
                <FieldLabel>Number of Content Engagements</FieldLabel>
                <PillSelect size="lg" testid={`insights-seg-select-4`} value={form.engagementRange || null} placeholder="Select a Range" options={["0", "1 - 5", "6 - 20", "21+"]} onChange={set("engagementRange")} />
              </div>
            </div>
          </Accordion>
          <Accordion id="purchase" title="Purchase History" info="Fans who did or didn't buy a product or plan." open={!!openSec.purchase} onToggle={() => setOpenSec((o) => ({ ...o, purchase: !o.purchase }))}>
            <RadioRow
              label={
                <>
                  Store &amp; Subscription Purchases
                  <InfoIcon text="Pick a plan or product from your store." />
                </>
              }
              name="seg-purchased"
              options={["Purchased", "Not Purchased"]}
              value={form.purchased}
              onChange={set("purchased")}
            />
            <div data-testid="insights-seg-purchase" className="mt-[12px]">
              <PillSelect size="lg" testid={`insights-seg-select-5`} value={form.purchase || null} placeholder="Select Purchase" options={["Gold Plan", "Silver Plan", "Bronze Plan", "E-Book: Tune a Snowboard", "How to Ride a Snowboard", "Live Video Call with Me", "Team AJ Hoodie"]} onChange={set("purchase")} />
            </div>
          </Accordion>
          <Accordion id="content" title="Content Engagement" info="Fans who did or didn't engage with a post." open={!!openSec.content} onToggle={() => setOpenSec((o) => ({ ...o, content: !o.content }))}>
            <RadioRow label="Content" name="seg-engaged" options={["Engaged", "Not Engaged"]} value={form.engaged} onChange={set("engaged")} />
            <div data-testid="insights-seg-content" className="mt-[12px]">
              <PillSelect size="lg" testid={`insights-seg-select-6`} value={form.content || null} placeholder="Select Content Item" options={posts.map((p) => p.title)} onChange={set("content")} />
            </div>
          </Accordion>
        </div>
        <div className="mt-[25px] flex justify-end gap-[12px] border-t border-surface-2 pt-[22px]">
          <TextBtn
            data-testid="insights-seg-reset"
            onClick={() => {
              setForm(EMPTY_FORM);
              setSaved(null);
            }}
          >
            Reset
          </TextBtn>
          <Btn data-testid="insights-seg-create" className="w-[176px]" onClick={() => setNaming(true)}>
            Create Segment
          </Btn>
        </div>
      </section>
      {naming && (
        <NameSegmentModal
          onClose={() => setNaming(false)}
          onSave={(name) => {
            const criteria = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
            const res = act("money.createSegment", (d) => createSegment(d, name, criteria), { need: "content.write" });
            if (!res.ok) return res.reason;
            toast(`Segment “${name}” saved`);
            setSaved(name);
            setNaming(false);
            return null;
          }}
        />
      )}
    </div>
  );
}

function Accordion({ id, title, info, open, onToggle, children }: { id: string; title: string; info: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="rounded-inner bg-bg" data-testid={`insights-seg-section-${id}`}>
      <div className="flex h-[59px] w-full cursor-pointer items-center justify-between px-[20px]" onClick={onToggle}>
        <span className="flex items-center text-[16px] font-bold">
          {title}
          <span onClick={(e) => e.stopPropagation()} className="ml-[8px]">
            <InfoIcon text={info} />
          </span>
        </span>
        <button
          type="button"
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
          data-testid={`insights-seg-toggle-${id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {open ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>
      {open && <div className="px-[20px] pb-[18px] pt-[14px]">{children}</div>}
    </div>
  );
}

/** Radio pair shown dimmed (as captured), right-aligned. */
function RadioRow({ label, name, options, value, onChange }: { label: ReactNode; name: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center text-[16px]">{label}</span>
      <span className="flex gap-[16px] opacity-55">
        {options.map((o) => (
          <Radio key={o} name={name} checked={value === o} onChange={() => onChange(o)}>
            <span className="text-soft">{o}</span>
          </Radio>
        ))}
      </span>
    </div>
  );
}

/** Neutral stand-in for the embedded map (no real map service is called). */
function MapPlaceholder({ place }: { place: string }) {
  const [zoom, setZoom] = useState(11);
  return (
    <div className="relative mt-[24px] h-[240px] overflow-hidden rounded-[20px] bg-[#dfe3e6]" data-testid="insights-seg-map" aria-label="Map preview (demo)">
      <svg width="100%" height="100%" className="absolute inset-0" aria-hidden>
        <defs>
          <pattern id="seg-grid" width={zoom * 6} height={zoom * 6} patternUnits="userSpaceOnUse">
            <path d={`M ${zoom * 6} 0 L 0 0 0 ${zoom * 6}`} fill="none" stroke="#c4cad0" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#seg-grid)" />
        <path d="M0 170 C 200 120, 380 210, 860 90" stroke="#a9b8c9" strokeWidth="6" fill="none" />
        <path d="M120 0 C 160 80, 260 160, 300 240" stroke="#f3d27a" strokeWidth="4" fill="none" />
        <rect x="560" y="0" width="300" height="70" fill="#b6dcef" />
      </svg>
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-accent">
        <svg width="26" height="36" viewBox="0 0 26 36" aria-hidden>
          <path d="M13 0C6 0 0 5.6 0 12.6 0 22 13 36 13 36s13-14 13-23.4C26 5.6 20 0 13 0z" className="fill-accent" />
          <circle cx="13" cy="12.5" r="4.5" fill="#7a0b0b" />
        </svg>
      </span>
      <span className="absolute bottom-[8px] left-[12px] rounded bg-white/80 px-[8px] py-[2px] text-[11px] text-black/70">{place ? `${place} · ` : ""}Map preview (demo)</span>
      <div className="absolute bottom-[16px] right-[12px] flex flex-col overflow-hidden rounded-[2px] bg-white shadow">
        <button type="button" aria-label="Zoom in" data-testid="insights-seg-map-zoom-in" onClick={() => setZoom((z) => Math.min(z + 1, 20))} className="flex h-[40px] w-[40px] items-center justify-center text-[#666]">
          <Plus size={20} />
        </button>
        <button type="button" aria-label="Zoom out" data-testid="insights-seg-map-zoom-out" onClick={() => setZoom((z) => Math.max(z - 1, 4))} className="flex h-[40px] w-[40px] items-center justify-center border-t border-[#e6e6e6] text-[#666]">
          <Minus size={20} />
        </button>
      </div>
    </div>
  );
}

/** inferred: naming step before saving (not captured). */
function NameSegmentModal({ onClose, onSave }: { onClose: () => void; onSave: (name: string) => string | null }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <Modal
      open
      onClose={onClose}
      title="Create Segment"
      footer={
        <>
          <TextBtn onClick={onClose}>Cancel</TextBtn>
          <Btn data-testid="insights-seg-save" disabled={!name.trim()} onClick={() => setErr(onSave(name.trim()))}>
            Save Segment
          </Btn>
        </>
      }
    >
      <div data-testid="modal-insights-create-segment">
        <FieldLabel htmlFor="seg-name">Segment Name</FieldLabel>
        <Input className="!text-[14px]" id="seg-name" data-testid="insights-seg-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Colorado subscribers" />
        <InlineError>{err}</InlineError>
      </div>
    </Modal>
  );
}
