/**
 * Fan Information modal (13e–13h, 13x loading): FAN INFO | PURCHASE HISTORY | ENGAGEMENT | FAN RECRUITMENT.
 * 920 wide, red round close overlapping the top-right corner. Every value is fictional.
 */
import { useState, type ReactNode } from "react";
import { BadgeCheck, Mail, Pencil, ShoppingBag, Sparkles, Trophy, UserCheck, X, Receipt } from "lucide-react";
import { act, useData, useMockLoading } from "../../../store/store";
import { saveFanNotes, type FanProfile } from "../../../store/slices/comms";
import { Avatar, ImageSlot } from "../../../platform/ui/surfaces";
import { Button, InfoIcon, TextButton } from "../../../platform/ui/controls";
import { useToast } from "../../../platform/ui/toast";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { Bone, SCROLL, thumbOf, useEscape } from "../ui";

type Tab = "info" | "purchases" | "engagement" | "recruitment";
const TABS: [Tab, string][] = [
  ["info", "Fan Info"],
  ["purchases", "Purchase History"],
  ["engagement", "Engagement"],
  ["recruitment", "Fan Recruitment"],
];

/** Placeholder profile for fans without seeded details (inferred: the source always has data). */
const emptyProfile: FanProfile = {
  location: "-", birthdate: "-", gender: "-", email: "-", phone: "-", shipping: ["-", ""],
  lifetimeSpend: "$0.00", lifetimeEngagement: "0 Engagements", lifetimeRecruitment: "0 Recruitments", registered: "-", lastSession: "-", lastEngagement: "-",
  statuses: ["Follower"], notes: "-", badge: "-", groups: "-", loyalty: "0 Points", purchases: [], engagement: [], recruits: [],
};

export function FanInfoModal({ fanId, onClose }: { fanId: string | null; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("info");
  // select whole collections: useData caches per store version, so prop-dependent selectors would go stale
  const fans = useData((d) => d.comms.fans);
  const profiles = useData((d) => d.comms.fanProfiles);
  const fan = fans.find((f) => f.id === fanId);
  const profile = (fanId && profiles[fanId]) || emptyProfile;
  const loading = useMockLoading(700, `${fanId}-${tab}`);
  useEscape(!!fanId, onClose);
  if (!fanId || !fan) return null;
  return (
    <div className="fixed inset-[0px] z-50 overflow-y-auto bg-black/70 px-[16px] pt-[24px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Fan Information" data-testid="modal-fan-info" className="relative mx-auto w-[920px] max-w-full rounded-card bg-surface">
        <button
          aria-label="Close"
          data-testid="modal-fan-info-close"
          onClick={onClose}
          className="absolute -right-[8px] -top-[8px] flex h-[28px] w-[28px] items-center justify-center rounded-full bg-accent text-white hover:brightness-110"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
        <div className="flex items-center justify-between px-[24px] pb-[19px] pt-[27px]">
          <div className="flex items-center gap-[9px]">
            <Avatar src={fan.avatar} size={52} ring={2} />
            <span className="text-[20px] font-bold">{fan.name}</span>
          </div>
          <div role="tablist" className="flex gap-[8px]">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                data-testid={`messages-faninfo-tab-${id}`}
                onClick={() => setTab(id)}
                className={`h-[42px] rounded-pill px-[16px] text-[14px] font-bold uppercase tracking-caps ${tab === id ? "bg-accent" : "bg-white/[.06] hover:brightness-125"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className={`${SCROLL} max-h-[calc(100vh-170px)] overflow-y-auto px-[24px] pb-[24px]`}>
          {loading ? <FanSkeleton tab={tab} /> : tab === "info" ? <InfoTab fanId={fanId} p={profile} name={fan.name} /> : tab === "purchases" ? <Purchases p={profile} /> : tab === "engagement" ? <Engagement p={profile} /> : <Recruitment p={profile} />}
        </div>
      </div>
    </div>
  );
}

const Block = ({ children, className = "" }: { children: ReactNode; className?: string }) => <div className={`rounded-panel bg-white/[.04] px-[24px] py-[30px] ${className}`}>{children}</div>;

function Field({ label, children, extra }: { label: ReactNode; children: ReactNode; extra?: ReactNode }) {
  return (
    <div>
      <p className="mb-[12px] flex items-center gap-[8px] text-[14px] text-soft">
        {label}
        {extra}
      </p>
      <div className="text-[14px] font-bold leading-[18px] text-white">{children}</div>
    </div>
  );
}

const statusIcon: Record<string, typeof UserCheck> = {
  Follower: UserCheck,
  Subscriber: BadgeCheck,
  "Newsletter Recipient": Mail,
  Purchaser: ShoppingBag,
  "Content Engager": Sparkles,
};

function InfoTab({ fanId, p, name }: { fanId: string; p: FanProfile; name: string }) {
  const toast = useToast();
  const { navigate } = useRouter();
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(p.notes);
  return (
    <div className="space-y-[16px]">
      <Block>
        <h3 className="mb-[30px] text-[18px] font-bold">Personal Information</h3>
        <div className="grid grid-cols-3 gap-x-[24px] gap-y-[32px]">
          <Field label="General Location">{p.location}</Field>
          <Field label="Birthdate">{p.birthdate}</Field>
          <Field label="Gender">{p.gender}</Field>
          <Field label="Email Address">{p.email}</Field>
          <Field label="Mobile Phone Number">
            {p.phone === "-" ? "-" : (
              <span className="flex items-center gap-[8px]">
                <span aria-hidden className="inline-block h-[14px] w-[20px] rounded-[2px] bg-[linear-gradient(#b22234_0_14%,#fff_14%_28%,#b22234_28%_42%,#fff_42%_57%,#b22234_57%_71%,#fff_71%_85%,#b22234_85%)]" />
                US &nbsp;{p.phone}
              </span>
            )}
          </Field>
          <Field label="Shipping Address">
            <span className="block leading-[28px]">{p.shipping[0]}</span>
            <span className="block leading-[28px]">{p.shipping[1]}</span>
          </Field>
        </div>
      </Block>
      <Block>
        <h3 className="mb-[30px] text-[18px] font-bold">Activity Summary</h3>
        <div className="grid grid-cols-3 gap-x-[24px] gap-y-[32px]">
          <Field label="Lifetime Spend">{p.lifetimeSpend}</Field>
          <Field label="Lifetime Engagement">{p.lifetimeEngagement}</Field>
          <Field label="Lifetime Fan Recruitment">{p.lifetimeRecruitment}</Field>
          <Field label="Registration Date">{p.registered}</Field>
          <Field label="Last Session" extra={<InfoIcon text="The last time this fan was active on your site, in your local time zone." />}>
            {p.lastSession}
          </Field>
          <Field label="Last Content Engagement" extra={<InfoIcon text="The last time this fan liked, commented on or otherwise engaged with your content." />}>
            {p.lastEngagement}
          </Field>
          <Field label="Fan Status">
            <ul className="space-y-[15px]">
              {p.statuses.map((s) => {
                const I = statusIcon[s] ?? UserCheck;
                return (
                  <li key={s} className="flex items-center gap-[8px] text-[16px]">
                    <I size={18} className="text-accent" />
                    {s}
                  </li>
                );
              })}
            </ul>
          </Field>
          <Field
            label="Fan Notes"
            extra={
              <button aria-label="Edit fan notes" data-testid="messages-faninfo-edit-notes" onClick={() => (setNotes(p.notes), setEditing(true))} className="text-white hover:text-accent">
                <Pencil size={16} />
              </button>
            }
          >
            {editing ? (
              <div>
                <textarea
                  data-testid="messages-faninfo-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-[80px] w-full resize-none rounded-inner bg-bg p-[12px] text-[14px] font-normal outline-none focus:ring-1 focus:ring-accent"
                />
                <div className="mt-[8px] flex justify-end gap-[4px]">
                  <TextButton className="!h-[32px] !px-[8px] !text-[12px]" onClick={() => setEditing(false)}>
                    Cancel
                  </TextButton>
                  <Button
                    className="!h-[32px] !px-[16px] !text-[12px]"
                    data-testid="messages-faninfo-save-notes"
                    onClick={() => {
                      const res = act("comms.saveFanNotes", (d) => saveFanNotes(d, fanId, notes), { need: "content.write" });
                      if (!res.ok) return toast(res.reason);
                      setEditing(false);
                      toast(`Notes saved for ${name}`);
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              p.notes
            )}
          </Field>
          <Field
            label="Badges"
            extra={
              // inferred: badges are managed in Preferences › Gamification
              <button aria-label="Edit badges" data-testid="messages-faninfo-edit-badges" onClick={() => navigate(pathFor("pref-gamification-badges"))} className="text-white hover:text-accent">
                <Pencil size={16} />
              </button>
            }
          >
            {p.badge === "-" ? "-" : (
              <span className="flex items-center justify-between">
                <span className="flex items-center gap-[8px] text-[16px]">
                  <Trophy size={18} className="text-accent" />
                  {p.badge}
                </span>
                <span className="rounded-full bg-black px-[10px] py-[4px] text-[11px] font-medium">Auto Assigned</span>
              </span>
            )}
          </Field>
          <Field
            label="Groups"
            extra={
              <button aria-label="Edit groups" data-testid="messages-faninfo-edit-groups" onClick={() => navigate(pathFor("pref-groups"))} className="text-white hover:text-accent">
                <Pencil size={16} />
              </button>
            }
          >
            {p.groups}
          </Field>
          <Field label="Loyalty Points">{p.loyalty}</Field>
        </div>
      </Block>
    </div>
  );
}

function Table({ cols, widths, children, empty }: { cols: string[]; widths: string; children: ReactNode; empty: boolean }) {
  return (
    <Block className="!px-[30px] !py-[0px]">
      <div className="grid h-[80px] items-center border-b border-white/20 text-[12px] font-medium uppercase" style={{ gridTemplateColumns: widths }}>
        {cols.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      {empty ? <p className="py-[40px] text-center text-[14px] text-muted">Nothing to show yet.</p> : children}
    </Block>
  );
}

function Purchases({ p }: { p: FanProfile }) {
  const w = "125px 166px 1fr 146px";
  return (
    <Table cols={["Date", "Type", "Item Details", "Transaction Amount"]} widths={w} empty={!p.purchases.length}>
      {p.purchases.map((r, i) => (
        <div key={i} className="grid h-[101px] items-center border-b border-white/20 text-[14px] last:border-0" style={{ gridTemplateColumns: w }}>
          <span>{r.date}</span>
          <span>{r.type}</span>
          <span className="flex items-center gap-[16px] font-bold">
            {r.thumb === "subscription" ? (
              <span className="flex h-[60px] w-[60px] items-center justify-center rounded-lg bg-bg">
                <Receipt size={22} className="text-accent" />
              </span>
            ) : (
              <ImageSlot src={thumbOf(r.image)} label={r.item} className="h-[60px] w-[60px]" rounded="rounded-lg" />
            )}
            {r.item}
          </span>
          <span>{r.amount}</span>
        </div>
      ))}
    </Table>
  );
}

function Engagement({ p }: { p: FanProfile }) {
  const w = "166px 1fr 188px";
  return (
    <Table cols={["Date", "Content", "Activity"]} widths={w} empty={!p.engagement.length}>
      {p.engagement.map((r, i) => (
        <div key={i} className="grid min-h-[101px] items-center border-b border-white/20 py-[20px] text-[14px] last:border-0" style={{ gridTemplateColumns: w }}>
          <span>{r.date}</span>
          <span className="flex items-center gap-[16px] pr-[16px]">
            <ImageSlot src={thumbOf(r.image)} label={r.type} className="h-[60px] w-[60px] shrink-0" rounded="rounded-lg" />
            <span className="font-bold leading-[20px]">
              <span className="block">{r.type}</span>
              <span className="mt-[4px] block">{r.caption}</span>
            </span>
          </span>
          <span>Engaged</span>
        </div>
      ))}
    </Table>
  );
}

function Recruitment({ p }: { p: FanProfile }) {
  const fans = useData((d) => d.comms.fans);
  const creator = useData((d) => ({ name: d.account.name, avatar: d.account.avatar }));
  const w = "1fr 1fr";
  return (
    <Table cols={["Date", "Recruit"]} widths={w} empty={!p.recruits.length}>
      {p.recruits.map((r, i) => (
        <div key={i} className="grid h-[81px] items-center border-b border-white/20 text-[14px] last:border-0" style={{ gridTemplateColumns: w }}>
          <span>{r.date}</span>
          <span className="flex items-center gap-[8px] font-bold">
            <Avatar src={r.fanId === "creator" ? creator.avatar : (fans.find((f) => f.id === r.fanId)?.avatar ?? null)} size={44} ring={2} />
            {r.fanId === "creator" ? creator.name : fans.find((f) => f.id === r.fanId)?.name}
          </span>
        </div>
      ))}
    </Table>
  );
}

function FanSkeleton({ tab }: { tab: Tab }) {
  return (
    <div data-testid="messages-faninfo-skeleton" className="space-y-[16px]">
      {tab === "info" ? (
        [0, 1].map((b) => (
          <Block key={b}>
            <Bone className="mb-[32px] h-[20px] w-[192px] rounded" />
            <div className="grid grid-cols-3 gap-x-[24px] gap-y-[32px]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <Bone className="mb-[12px] h-[14px] w-[112px] rounded" />
                  <Bone className="h-[16px] w-[192px] rounded" />
                </div>
              ))}
            </div>
          </Block>
        ))
      ) : (
        <Block>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex h-[90px] items-center gap-[32px]">
              <Bone className="h-[16px] w-[96px] rounded" />
              <Bone className="h-[60px] w-[60px] rounded-lg" />
              <Bone className="h-[16px] w-[256px] rounded" />
              <Bone className="ml-auto h-[16px] w-[80px] rounded" />
            </div>
          ))}
        </Block>
      )}
    </div>
  );
}
