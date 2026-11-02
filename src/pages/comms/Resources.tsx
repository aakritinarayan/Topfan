/**
 * Creator Resources (P17): ANNOUNCEMENTS (unread badge) | GUIDES | SERVICE PROVIDERS | CREATOR SUPPORT.
 * Tabs are router links. Opening an announcement marks it read, which also clears the sidebar badge.
 */
import { useRef, useState, type ReactNode } from "react";
import { ChevronDown, Heart, MessageCircle } from "lucide-react";
import { act, useData } from "../../store/store";
import { markAnnouncementRead, type ResourceAnnouncement, type ResourceGuide, type ServiceProvider } from "../../store/slices/comms";
import { useRouter, Link } from "../../app/router";
import { pathFor } from "../../app/routeCatalog";
import { useOutside } from "../../platform/ui/controls";
import type { PageProps } from "../types";
import { CommsModal, CountBadge, FaqItem, PillTab, SearchPill, useOpenSet } from "./ui";
import { SupportForm } from "./SupportForm";

const TABS: [string, string][] = [
  ["resources-announcements", "Announcements"],
  ["resources-guides", "Guides"],
  ["resources-providers", "Service Providers"],
  ["resources-support", "Creator Support"],
];

function ResourcesShell({ routeId, children }: { routeId: string; children: ReactNode }) {
  const { navigate } = useRouter();
  const unread = useData((d) => d.comms.announcements.filter((a) => !a.read).length);
  return (
    <div data-testid={`page-${routeId}`}>
      <h4 className="mb-[22px] mt-[5px] text-[24px] font-bold leading-[30px]">Creator Resources</h4>
      <div role="tablist" className="flex flex-wrap gap-[8px]">
        {TABS.map(([id, label]) => (
          <PillTab
            key={id}
            testid={`resources-tab-${id.replace("resources-", "")}`}
            active={routeId === id}
            inactiveWeight="font-normal"
            activeWeight="font-black"
            onClick={() => navigate(pathFor(id))}
            badge={id === "resources-announcements" ? <CountBadge n={unread} className="!h-[22px] !min-w-[22px] !text-[12px]" /> : undefined}
          >
            {label}
          </PillTab>
        ))}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ cards */

/** Illustration stand-in: tinted panel with a framed inner clip + bottom gradient (no pack images). */
function ResourceCard({
  title,
  tint,
  meta,
  ago,
  unread,
  onOpen,
  testid,
}: {
  title: string;
  tint: string;
  meta?: { likes: number; comments: number };
  ago: string;
  unread?: boolean;
  onOpen: () => void;
  testid: string;
}) {
  const showMeta = meta && (meta.likes > 0 || meta.comments > 0);
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={onOpen}
      className="group relative h-[310px] overflow-hidden rounded-card text-left transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
      style={{ background: tint }}
    >
      <span className="absolute inset-[4px] overflow-hidden rounded-[27px]" style={{ background: `linear-gradient(160deg, ${tint} 0%, color-mix(in srgb, ${tint} 55%, #000) 100%)` }}>
        <span className="absolute inset-x-[0px] bottom-[0px] h-[60%] bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
      </span>
      <span className="absolute inset-x-[25px] bottom-[26px]">
        <span className="block text-[20px] font-medium leading-[24px] text-white">{title}</span>
        {showMeta && (
          <span className="mt-[4px] flex gap-[24px] text-[13px] text-white">
            <span>
              {meta.likes} {meta.likes === 1 ? "Like" : "Likes"}
            </span>
            <span>
              {meta.comments} {meta.comments === 1 ? "Comment" : "Comments"}
            </span>
          </span>
        )}
        <span className="mt-[4px] flex items-center justify-between text-[13px] text-white">
          {ago}
          {unread && (
            <span className="flex items-center gap-[4px]" data-testid={`${testid}-unread`}>
              <span className="h-[10px] w-[10px] rounded-full bg-accent" /> Unread
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="mt-[16px] grid grid-cols-3 gap-[24px]">{children}</div>;
}

function SearchRow({ value, onChange, placeholder, testid }: { value: string; onChange: (v: string) => void; placeholder: string; testid: string }) {
  return (
    <div className="mt-[26px] flex justify-end">
      <SearchPill value={value} onChange={onChange} placeholder={placeholder} testid={testid} redIcon className="w-[252px] !rounded-[20px]" />
    </div>
  );
}

function DetailModal({ item, onClose }: { item: { title: string; body: string; likes: number; comments: number; ago: string; tint: string } | null; onClose: () => void }) {
  return (
    // inferred: the detail view was not captured
    <CommsModal open={!!item} onClose={onClose} title={item?.title ?? ""} testid="modal-resource-detail" width={620}>
      {item && (
        <>
          <div className="h-[200px] rounded-panel" style={{ background: `linear-gradient(160deg, ${item.tint}, color-mix(in srgb, ${item.tint} 55%, #000))` }} />
          <p className="mt-[20px] text-[14px] leading-[22px] text-soft">{item.body}</p>
          <div className="mt-[20px] flex items-center gap-[20px] text-[13px] text-white">
            <span className="flex items-center gap-[6px]">
              <Heart size={16} className="text-accent" /> {item.likes}
            </span>
            <span className="flex items-center gap-[6px]">
              <MessageCircle size={16} className="text-accent" /> {item.comments}
            </span>
            <span className="ml-auto text-muted">{item.ago}</span>
          </div>
        </>
      )}
    </CommsModal>
  );
}

/* ------------------------------------------------------------------ tabs */

export function AnnouncementsPage({ route }: PageProps) {
  const items = useData((d) => d.comms.announcements);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<ResourceAnnouncement | null>(null);
  const shown = items.filter((a) => a.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <ResourcesShell routeId={route.id}>
      <SearchRow value={q} onChange={setQ} placeholder="Search Announcements" testid="resources-search-announcements" />
      <Grid>
        {shown.map((a) => (
          <ResourceCard
            key={a.id}
            testid={`resources-announcement-${a.id}`}
            title={a.title}
            tint={a.tint ?? "#434344"}
            meta={{ likes: a.likes ?? 0, comments: a.comments ?? 0 }}
            ago={a.ago ?? ""}
            unread={!a.read}
            onOpen={() => {
              setOpen(a);
              if (!a.read) act("comms.markAnnouncementRead", (d) => markAnnouncementRead(d, a.id));
            }}
          />
        ))}
      </Grid>
      {shown.length === 0 && <p className="mt-[40px] text-center text-[14px] text-muted">No announcements found.</p>}
      <DetailModal item={open && { title: open.title, body: open.body, likes: open.likes ?? 0, comments: open.comments ?? 0, ago: open.ago ?? "", tint: open.tint ?? "#434344" }} onClose={() => setOpen(null)} />
    </ResourcesShell>
  );
}

export function GuidesPage({ route }: PageProps) {
  const items = useData((d) => d.comms.guides);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<ResourceGuide | null>(null);
  const shown = items.filter((a) => a.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <ResourcesShell routeId={route.id}>
      <SearchRow value={q} onChange={setQ} placeholder="Search Guides" testid="resources-search-guides" />
      <Grid>
        {shown.map((g) => (
          <ResourceCard key={g.id} testid={`resources-guide-${g.id}`} title={g.title} tint={g.tint} meta={{ likes: g.likes, comments: g.comments }} ago={g.ago} onOpen={() => setOpen(g)} />
        ))}
      </Grid>
      {shown.length === 0 && <p className="mt-[40px] text-center text-[14px] text-muted">No guides found.</p>}
      <DetailModal item={open} onClose={() => setOpen(null)} />
    </ResourcesShell>
  );
}

const PROVIDER_FILTERS = ["All Service Providers", "Merchandise", "Content Support", "Professional Services"];

export function ProvidersPage({ route }: PageProps) {
  const items = useData((d) => d.comms.providers);
  const [filter, setFilter] = useState(PROVIDER_FILTERS[0]);
  const [open, setOpen] = useState<ServiceProvider | null>(null);
  const shown = filter === PROVIDER_FILTERS[0] ? items : items.filter((p) => p.category === filter);
  return (
    <ResourcesShell routeId={route.id}>
      <div className="mt-[26px] flex justify-end">
        <FilterSelect value={filter} onChange={setFilter} />
      </div>
      <Grid>
        {shown.map((p) => (
          <button
            key={p.id}
            type="button"
            data-testid={`resources-provider-${p.id}`}
            onClick={() => setOpen(p)}
            className="relative h-[310px] overflow-hidden rounded-card text-left transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
            style={{ background: p.tint ?? "transparent" }}
          >
            <span
              className={`absolute overflow-hidden ${p.tint ? "inset-[4px] rounded-[27px]" : "inset-[0px] rounded-card"}`}
              style={{ background: p.tint ? `linear-gradient(160deg, ${p.tint}, color-mix(in srgb, ${p.tint} 50%, #000))` : "linear-gradient(180deg, #1d1f20, #121314)" }}
            >
              <span className="absolute inset-x-[0px] bottom-[0px] h-[60%] bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            </span>
            <span className="absolute left-[12px] top-[10px] rounded-[22px] bg-accent px-[10px] py-[7px] text-[13px] leading-[16px] text-white">{p.category}</span>
            <span className="absolute inset-x-[25px] bottom-[34px]">
              <span className="mb-[8px] block h-[44px] w-[44px] rounded-full border-2 border-accent bg-accent" aria-hidden />
              <span className="block text-[20px] font-medium leading-[24px]">{p.name}</span>
              <span className="mt-[6px] line-clamp-2 text-[14px] leading-[19px] text-white">{p.description}</span>
            </span>
          </button>
        ))}
      </Grid>
      {shown.length === 0 && <p className="mt-[40px] text-center text-[14px] text-muted">No service providers in this category yet.</p>}
      <CommsModal open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ""} testid="modal-provider-detail" width={620}>
        {open && (
          // inferred: provider detail not captured
          <>
            <span className="inline-block rounded-[22px] bg-accent px-[10px] py-[7px] text-[13px]">{open.category}</span>
            <p className="mt-[16px] text-[14px] leading-[22px] text-soft">{open.description}</p>
          </>
        )}
      </CommsModal>
    </ResourcesShell>
  );
}

function FilterSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  return (
    <div ref={ref} className="relative w-[290px]">
      <button
        type="button"
        data-testid="resources-provider-filter"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-[40px] w-full items-center justify-between rounded-pill bg-surface pl-[20px] pr-[22px] text-[14px] font-bold"
      >
        {value}
        <ChevronDown size={20} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul role="listbox" className="absolute left-[0px] right-[0px] top-[48px] z-30 rounded-inner bg-surface py-[10px] shadow-[0_4px_16px_rgba(0,0,0,.45)]">
          {PROVIDER_FILTERS.map((o) => (
            <li key={o}>
              <button
                type="button"
                role="option"
                aria-selected={o === value}
                data-testid={`resources-provider-filter-${o.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => (onChange(o), setOpen(false))}
                className={`flex h-[35px] w-full items-center px-[20px] text-left text-[14px] hover:bg-accent ${o === value ? "bg-accent font-bold" : ""}`}
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

/** Creator Support FAQ (P17c). Answer 1 is the product's copy; the others are inferred sample answers. */
const CREATOR_FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "What type of content can I post on TopFan?",
    a: (
      <>
        <p>The safety of Creators and Fans is our top priority.</p>
        <p>
          We do not allow content that contains any form of nudity (including sexually suggestive swimwear and underwear content), or promotes hate or violence. Creators must follow the{" "}
          <Link to="/terms-of-service" className="font-bold text-[#29c5e6] hover:underline">
            Terms of Service
          </Link>{" "}
          at all times.
        </p>
      </>
    ),
  },
  { q: "What is a delegate? How do I set one up?", a: <p>A delegate is a team member who can help manage your account with Content or Financial access. Add one under Preferences › Delegation. (Sample answer.)</p> },
  { q: "How do I download my fan data?", a: <p>Go to Insights & Fans and use the export option on your fan list to download a CSV file. (Sample answer.)</p> },
  { q: "How soon can I withdraw the money I have earned?", a: <p>Earnings become available in Wallet › Current Balance once the settlement period for each purchase has ended. (Sample answer.)</p> },
  { q: "Does TopFan have a Referral Program?", a: <p>Yes. Share your referral link from Wallet to earn a reward when another creator joins. (Sample answer.)</p> },
  { q: "How do I pause or delete my account?", a: <p>Go to Preferences › Privacy, Password & Integrations to pause or delete your account. (Sample answer.)</p> },
];

export function SupportPage({ route }: PageProps) {
  const [q, setQ] = useState("");
  const [open, toggle] = useOpenSet();
  const shown = CREATOR_FAQ.map((f, i) => ({ ...f, i })).filter((f) => f.q.toLowerCase().includes(q.toLowerCase()));
  return (
    <ResourcesShell routeId={route.id}>
      <div className="mt-[26px] flex items-center justify-between">
        <h3 className="text-[32px] font-medium leading-[40px]">FAQs</h3>
        <SearchPill value={q} onChange={setQ} placeholder="Search FAQs" testid="resources-search-faqs" redIcon height={50} className="w-[316px] !px-[18px]" bg="bg-surface" />
      </div>
      <div className="mt-[11px] space-y-[12px]">
        {shown.map((f) => (
          <FaqItem key={f.i} q={f.q} open={open.has(f.i)} onToggle={() => toggle(f.i)} testid={`resources-faq-${f.i}`}>
            {f.a}
          </FaqItem>
        ))}
        {shown.length === 0 && <p className="py-[24px] text-center text-[14px] text-muted">No FAQs match your search.</p>}
      </div>
      <div className="mt-[12px] rounded-card bg-surface px-[30px] pb-[24px] pt-[30px]">
        <SupportForm source="creator-support" />
      </div>
    </ResourcesShell>
  );
}
