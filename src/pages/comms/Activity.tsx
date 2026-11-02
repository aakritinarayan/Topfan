/**
 * Activity (notifications) — P12, screenshots 12-, 12a-, 12x-. Layout "bleed": content runs flush to the right edge.
 */
import { useState } from "react";
import { act, useData, useMockLoading } from "../../store/store";
import { followBack, markActivityRead, markAllActivityRead, type ActivityItem } from "../../store/slices/comms";
import { Avatar } from "../../platform/ui/surfaces";
import { Button } from "../../platform/ui/controls";
import type { PageProps } from "../types";
import { Bone, CountBadge, PillTab, money } from "./ui";

const longDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export function ActivityPage({ route }: PageProps) {
  const loading = useMockLoading(800);
  const [tab, setTab] = useState<"all" | "unread">("unread"); // spec: UNREAD active on load
  const items = useData((d) => d.comms.activity);
  const fans = useData((d) => d.comms.fans);
  const avatar = useData((d) => d.account.avatar);
  const unread = items.filter((a) => !a.read).length;
  const shown = tab === "unread" ? items.filter((a) => !a.read) : items;

  return (
    <div data-testid={`page-${route.id}`} className="pb-[24px]">
      <h4 className="mb-[22px] mt-[5px] text-[24px] font-bold leading-[30px]">Activity</h4>
      <div className="mb-[15px] flex items-start justify-between">
        <div role="tablist" className="mt-[7px] flex gap-[8px]">
          <PillTab testid="activity-tab-all" active={tab === "all"} onClick={() => setTab("all")}>
            All
          </PillTab>
          <PillTab
            testid="activity-tab-unread"
            active={tab === "unread"}
            onClick={() => setTab("unread")}
            badge={!loading && <CountBadge n={unread} className="absolute -right-[15px] -top-[7px]" />}
          >
            Unread
          </PillTab>
        </div>
        <Button data-testid="activity-mark-all-read" className="!px-[20px]" onClick={() => act("comms.markAllActivityRead", (d) => markAllActivityRead(d))}>
          Mark all as read
        </Button>
      </div>

      <div className="rounded-card bg-surface px-[30px] pb-[20px] pt-[10px]" data-testid="activity-list">
        {loading ? (
          <ActivitySkeleton />
        ) : shown.length === 0 ? (
          // inferred: empty state not captured
          <p className="py-[64px] text-center text-[16px] text-soft" data-testid="activity-empty">
            You have no unread activity.
          </p>
        ) : (
          shown.map((a, i) => (
            <ActivityRow key={a.id} a={a} name={fans.find((f) => f.id === a.actorId)?.name ?? ""} avatar={a.actorId ? null : avatar} last={i === shown.length - 1} />
          ))
        )}
      </div>
    </div>
  );
}

function ActivityRow({ a, name, avatar, last }: { a: ActivityItem; name: string; avatar: string | null; last: boolean }) {
  const text =
    a.kind === "tip-live" ? (
      <>
        <b>{name}</b> sent you a <b>tip</b> of {money(a.amount ?? 0)} in a livestream.
      </>
    ) : a.kind === "tip-post" ? (
      <>
        <b>{name}</b> sent you a <b>tip</b> of {money(a.amount ?? 0)} for post : "{a.postExcerpt} ...".
      </>
    ) : a.kind === "follow" ? (
      <>
        <b>{name}</b>
        {a.others ? ` and ${a.others} other` : ""} started following you.
      </>
    ) : (
      <>Your fans have been imported successfully</>
    );
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`activity-row-${a.id}`}
      // inferred: opening a notification marks it read (rows link to the post/profile in the source)
      onClick={() => !a.read && act("comms.markActivityRead", (d) => markActivityRead(d, a.id))}
      onKeyDown={(e) => e.key === "Enter" && !a.read && act("comms.markActivityRead", (d) => markActivityRead(d, a.id))}
      className={`flex h-[96px] cursor-pointer items-center gap-[16px] ${last ? "" : "border-b border-white/[.12]"}`}
    >
      <Avatar src={avatar} size={55} ring={2} />
      <div className="min-w-[0px] flex-1">
        <p className="truncate text-[15px] leading-[20px] text-white">{text}</p>
        <p className="mt-[4px] text-[13px] text-date">{longDate(a.date)}</p>
      </div>
      {a.kind === "follow" && (
        <Button
          data-testid={`activity-follow-${a.id}`}
          className="!h-[36px] w-[100px] !px-[0px] !text-[12px]"
          onClick={(e) => {
            e.stopPropagation();
            act("comms.followBack", (d) => followBack(d, a.id));
          }}
        >
          {a.followedBack ? "Following" : "Follow"}
        </Button>
      )}
      <span className="flex w-[33px] justify-end">
        {!a.read && <span aria-label="Unread" className="h-[12px] w-[12px] rounded-full bg-accent" />}
      </span>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div data-testid="activity-skeleton" className="pb-[10px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex h-[95px] items-center gap-[16px]">
          <Bone className="h-[55px] w-[55px] rounded-full" />
          <div className="flex-1">
            <Bone className="h-[18px] w-[530px] max-w-[70%] rounded" />
            <Bone className="mt-[5px] h-[14px] w-[318px] max-w-[45%] rounded" />
          </div>
          <Bone className="h-[45px] w-[45px] rounded-lg" />
        </div>
      ))}
    </div>
  );
}
