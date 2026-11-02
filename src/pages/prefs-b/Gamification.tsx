/**
 * Preferences › Gamification (56): EARN POINTS / BUY POINTS / BADGES sub-tabs (router links).
 * Each tab edits a local draft; DISCARD resets it, SAVE CHANGES (disabled until something changes) writes it.
 * inferred: the earn-points warning modal copy (the bundle only names app-earn-points-warning-modal).
 */
import { useMemo, useState, type ReactNode } from "react";
import {
  Badge as BadgeIcon, BadgeCheck, CircleDollarSign, CircleHelp, Crown, Flag, Gavel, HandHeart, Heart, Lightbulb, Rocket, Star, ThumbsUp, Trophy,
} from "lucide-react";
import { useRouter } from "../../app/router";
import { pathFor } from "../../app/routeCatalog";
import { Toggle } from "../../platform/ui/controls";
import { useData } from "../../store/store";
import {
  saveBadges, saveBuyPoints, saveEarnPoints, type Badge, type GamificationState,
} from "../../store/slices/prefsB";
import type { PageProps } from "../types";
import { ConfirmModal, EnableToggle, InfoPop, PrefPage, StatusSwitch, useWrite, Pill, PlainButton } from "./ui";

const TABS = [
  { id: "pref-gamification", label: "Earn Points", tid: "earn" },
  { id: "pref-gamification-buy", label: "Buy Points", tid: "buy" },
  { id: "pref-gamification-badges", label: "Badges", tid: "badges" },
];

function Shell({ route, children }: { route: PageProps["route"]; children: ReactNode }) {
  const { navigate } = useRouter();
  return (
    <PrefPage id={route.id}>
      <h4 className="flex items-center gap-[8px] text-[24px] font-bold">
        Gamification
        <InfoPop testid="pref-gamification-info">
          If you enable Gamification fans can earn Points and earn graphical Badges that display next to their names, for earning a set number of points in a 30-day period. Points can be earned by completing various activities that you enable in the Earn Points section. You can choose to lock your content by points. Points can be purchased as well in the Buy Points section.
        </InfoPop>
      </h4>
      <nav className="mt-[24px] flex gap-[8px]" aria-label="Gamification">
        {TABS.map((t) => {
          const active = t.id === route.id;
          return (
            <a
              key={t.id}
              href={pathFor(t.id)}
              data-testid={`pref-gamification-tab-${t.tid}`}
              aria-current={active ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                navigate(pathFor(t.id));
              }}
              className={`inline-flex h-[40px] items-center rounded-pill px-[25px] text-[14px] font-black uppercase tracking-caps text-white ${active ? "bg-accent" : "bg-surface hover:brightness-125"}`}
            >
              {t.label}
            </a>
          );
        })}
      </nav>
      {children}
    </PrefPage>
  );
}

function Footer({ dirty, onDiscard, onSave, tid }: { dirty: boolean; onDiscard: () => void; onSave: () => void; tid: string }) {
  return (
    <div className="mt-[24px] flex items-center gap-[8px]">
      <PlainButton onClick={onDiscard} data-testid={`pref-gamification-${tid}-discard`} className="px-[20px]">
        Discard
      </PlainButton>
      <Pill disabled={!dirty} onClick={onSave} data-testid={`pref-gamification-${tid}-save`} className="px-[20px]">
        Save Changes
      </Pill>
    </div>
  );
}

function useDraft<T>(source: T) {
  const [draft, setDraft] = useState<T>(source);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(source), [draft, source]);
  return { draft, setDraft, dirty, reset: () => setDraft(source) };
}

const rowCls = "flex h-[64px] items-center rounded-[22px] bg-bg px-[16px] text-[14px]";

/* ------------------------------------------------------------------ EARN POINTS */

export function EarnPointsPage({ route }: PageProps) {
  const g = useData((d) => d.prefsB.gamification);
  const source = useMemo(
    () => ({ earnEnabled: g.earnEnabled, displayLeaderboard: g.displayLeaderboard, activities: g.activities }),
    [g.earnEnabled, g.displayLeaderboard, g.activities],
  );
  const { draft, setDraft, dirty, reset } = useDraft<Pick<GamificationState, "earnEnabled" | "displayLeaderboard" | "activities">>(source);
  const [warn, setWarn] = useState(false);
  const write = useWrite();

  return (
    <Shell route={route}>
      <div className="mt-[16px] flex items-center justify-between">
        <div className="flex h-[42px] items-center gap-[12px] rounded-pill bg-surface pl-[16px] pr-[16px] text-[14px]">
          Display Leaderboard
          <Toggle
            on={draft.displayLeaderboard}
            label="Display Leaderboard"
            onChange={() => setDraft({ ...draft, displayLeaderboard: !draft.displayLeaderboard })}
          />
        </div>
        <EnableToggle on={draft.earnEnabled} onChange={(v) => setDraft({ ...draft, earnEnabled: v })} testid="pref-gamification-earn-toggle" tone="surface" />
      </div>

      <div className="mt-[24px] rounded-inner bg-surface p-[24px]" data-testid="pref-gamification-earn-table">
        <div className="flex text-[14px] font-semibold">
          <span className="flex-1">Activity to Earn Points</span>
          <span className="w-[150px]">Points Earned</span>
          <span className="w-[110px] text-right">Status</span>
        </div>
        <div className="mt-[24px] flex flex-col gap-[16px]">
          {draft.activities.map((a, i) => (
            <div key={a.id} className={rowCls} data-testid={`pref-gamification-earn-row-${a.id}`}>
              <span className="min-w-[0px] flex-1 pr-[16px]">{a.label}</span>
              <input
                type="number"
                min={0}
                aria-label={`Points for ${a.label}`}
                data-testid={`pref-gamification-earn-points-${a.id}`}
                value={a.points}
                onChange={(e) => {
                  const activities = draft.activities.slice();
                  activities[i] = { ...a, points: Math.max(0, Number(e.target.value) || 0) };
                  setDraft({ ...draft, activities });
                }}
                className="h-[41px] w-[80px] rounded-pill bg-surface px-[12px] text-[14px] font-black text-white outline-none focus:ring-1 focus:ring-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="ml-[12px] w-[58px]">Points</span>
              <span className="flex w-[94px] justify-end">
                <StatusSwitch
                  on={a.active}
                  testid={`pref-gamification-earn-status-${a.id}`}
                  onChange={() => {
                    const activities = draft.activities.slice();
                    activities[i] = { ...a, active: !a.active };
                    setDraft({ ...draft, activities });
                  }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
      <Footer dirty={dirty} tid="earn" onDiscard={reset} onSave={() => setWarn(true)} />

      <ConfirmModal
        open={warn}
        title="Update Earn Points?"
        confirmLabel="Save Changes"
        testid="modal-pref-gamification-earn-warning"
        onClose={() => setWarn(false)}
        onConfirm={() => {
          if (write("prefsB.saveEarnPoints", (d) => saveEarnPoints(d, draft), "content.write", "Earn Points saved").ok) setWarn(false);
        }}
      >
        {/* inferred copy (app-earn-points-warning-modal was not captured) */}
        Changes apply to activity from now on. Points fans have already earned are not changed.
      </ConfirmModal>
    </Shell>
  );
}

/* ------------------------------------------------------------------ BUY POINTS */

function Coin() {
  return (
    <span aria-hidden className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[#f5b301] ring-2 ring-[#ffcf40]">
      <Star size={12} className="fill-[#e07b00] text-[#e07b00]" />
    </span>
  );
}

const fmtNum = (n: number) => n.toLocaleString("en-US");
const fmtUsd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export function BuyPointsPage({ route }: PageProps) {
  const g = useData((d) => d.prefsB.gamification);
  const source = useMemo(() => ({ buyEnabled: g.buyEnabled, bundles: g.bundles }), [g.buyEnabled, g.bundles]);
  const { draft, setDraft, dirty, reset } = useDraft<Pick<GamificationState, "buyEnabled" | "bundles">>(source);
  const write = useWrite();

  return (
    <Shell route={route}>
      <div className="mt-[16px] flex justify-end">
        <EnableToggle on={draft.buyEnabled} onChange={(v) => setDraft({ ...draft, buyEnabled: v })} testid="pref-gamification-buy-toggle" tone="surface" />
      </div>
      <div className="mt-[22px] rounded-inner bg-surface p-[24px]" data-testid="pref-gamification-buy-table">
        <div className="grid grid-cols-[minmax(0,385fr)_minmax(0,400fr)_auto] text-[14px] font-semibold">
          <span>Points Bundle</span>
          <span>Price</span>
          <span className="pr-[60px] text-right">Status</span>
        </div>
        <div className="mt-[24px] flex flex-col gap-[16px]">
          {draft.bundles.map((b, i) => (
            <div key={b.id} className={`${rowCls} grid grid-cols-[minmax(0,369fr)_minmax(0,400fr)_auto]`} data-testid={`pref-gamification-buy-row-${b.id}`}>
              <span className="flex items-center gap-[12px]">
                <Coin />
                {fmtNum(b.points)} Points
                {b.bonus > 0 && (
                  <span className="ml-[12px] rounded-full bg-accent px-[8px] py-[4px] text-[12px] font-medium">{fmtNum(b.bonus)} Bonus Points</span>
                )}
              </span>
              <span>{fmtUsd(b.price)}</span>
              <span className="flex justify-end">
                <StatusSwitch
                  on={b.active}
                  testid={`pref-gamification-buy-status-${b.id}`}
                  onChange={() => {
                    const bundles = draft.bundles.slice();
                    bundles[i] = { ...b, active: !b.active };
                    setDraft({ ...draft, bundles });
                  }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
      <Footer
        dirty={dirty}
        tid="buy"
        onDiscard={reset}
        onSave={() => write("prefsB.saveBuyPoints", (d) => saveBuyPoints(d, draft), "content.write", "Buy Points saved")}
      />
    </Shell>
  );
}

/* ------------------------------------------------------------------ BADGES */

function NewSeal() {
  return (
    <span className="relative inline-flex h-[28px] w-[28px] items-center justify-center">
      <BadgeIcon size={28} className="absolute fill-accent text-accent" />
      <span className="relative text-[7px] font-black text-bg">NEW</span>
    </span>
  );
}

const BADGE_ICONS: Record<string, ReactNode> = {
  "thumbs-up": <ThumbsUp size={26} className="fill-accent text-accent" />,
  trophy: <Trophy size={26} className="text-accent" strokeWidth={2.4} />,
  "crown-badge": (
    <span className="relative inline-flex h-[28px] w-[28px] items-center justify-center">
      <BadgeIcon size={28} className="absolute fill-accent text-accent" />
      <Crown size={12} className="relative text-bg" strokeWidth={3} />
    </span>
  ),
  gavel: <Gavel size={26} className="text-accent" strokeWidth={2.4} />,
  "check-seal": <BadgeCheck size={28} className="text-accent" strokeWidth={2.2} />,
  "new-seal": <NewSeal />,
  flag: <Flag size={26} className="fill-accent text-accent" />,
  lightbulb: <Lightbulb size={26} className="text-accent" strokeWidth={2.2} />,
  rocket: <Rocket size={26} className="fill-accent text-accent" />,
  question: <CircleHelp size={28} className="fill-accent text-bg" />,
  heart: <Heart size={28} className="fill-accent text-accent" />,
  "person-heart": <HandHeart size={28} className="text-accent" strokeWidth={2.2} />,
  dollar: <CircleDollarSign size={28} className="fill-accent text-bg" />,
};

export function BadgesPage({ route }: PageProps) {
  const badges = useData((d) => d.prefsB.gamification.badges);
  const { draft, setDraft, dirty, reset } = useDraft<Badge[]>(badges);
  const write = useWrite();
  const set = (i: number, patch: Partial<Badge>) => {
    const next = draft.slice();
    next[i] = { ...draft[i], ...patch };
    setDraft(next);
  };
  const cols = "grid grid-cols-[84px_minmax(0,344fr)_minmax(0,237fr)_minmax(110px,190fr)] items-center gap-x-[16px]";

  return (
    <Shell route={route}>
      <div className="mt-[16px] rounded-inner bg-surface p-[24px]" data-testid="pref-gamification-badges-table">
        <div className={`${cols} text-[14px] font-semibold`}>
          <span className="whitespace-nowrap">Badge Icon</span>
          <span className="flex items-center gap-[8px]">
            Badge Label
            <InfoPop testid="pref-gamification-badge-label-info" align="left">The label will display when a user hovers over the badge.</InfoPop>
          </span>
          <span className="flex items-center gap-[8px] whitespace-nowrap">
            Gamification Auto-Assign
            <InfoPop testid="pref-gamification-auto-assign-info" align="left">
              If you set a gamification auto-assign point value, a fan will earn this badge, if they gain this amount of points in a 30-day period. They can only have one auto-assigned badge at a time, so they can "up-level" to a new higher badge if they earn the needed amount of points. You can also manually assign badges in the Insights &amp; Fans &gt; Fan Relationship Management &gt; Fan Profile section.
            </InfoPop>
          </span>
          <span className="justify-self-end pr-[26px]">Status</span>
        </div>
        <div className="mt-[16px] flex flex-col gap-[16px]">
          {draft.map((b, i) => (
            <div key={b.id} className={cols} data-testid={`pref-gamification-badge-row-${b.id}`}>
              <span className="flex justify-center" aria-label={`${b.icon} badge icon`}>{BADGE_ICONS[b.icon]}</span>
              <input
                aria-label="Badge label"
                data-testid={`pref-gamification-badge-label-${b.id}`}
                placeholder="Unnamed"
                value={b.label}
                onChange={(e) => set(i, { label: e.target.value })}
                className="h-[55px] w-full rounded-pill bg-bg px-[24px] text-[14px] font-black text-white outline-none placeholder:font-bold placeholder:text-muted focus:ring-1 focus:ring-accent"
              />
              <span className="relative">
                <input
                  type="number"
                  min={0}
                  aria-label="Auto-assign points"
                  data-testid={`pref-gamification-badge-points-${b.id}`}
                  value={b.points ?? ""}
                  onChange={(e) => set(i, { points: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
                  className="h-[55px] w-full rounded-pill bg-bg pl-[24px] pr-[62px] text-[14px] font-black text-white outline-none focus:ring-1 focus:ring-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="pointer-events-none absolute right-[20px] top-1/2 -translate-y-1/2 text-[18px] font-semibold text-accent">Points</span>
              </span>
              <span className="flex justify-end">
                <StatusSwitch on={b.active} testid={`pref-gamification-badge-status-${b.id}`} onChange={() => set(i, { active: !b.active })} />
              </span>
            </div>
          ))}
        </div>
      </div>
      <Footer
        dirty={dirty}
        tid="badges"
        onDiscard={reset}
        onSave={() => write("prefsB.saveBadges", (d) => saveBadges(d, draft), "content.write", "Badges saved")}
      />
    </Shell>
  );
}
