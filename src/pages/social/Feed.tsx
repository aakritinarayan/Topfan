/**
 * Feed — creator profile / own feed (spec 11-feed.md, screenshots 11-*, 11a, 11b).
 * Three columns: (shell sidebar) · centre 524 (cards bleed to 548) · right rail 267.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Pencil, Settings, Share2 } from "lucide-react";
import type { PageProps } from "../types";
import { useData } from "../../store/store";
import { can } from "../../store/permissions";
import { publishedPosts } from "../../store/slices/social";
import { creator } from "../../config/demo";
import { openOverlay } from "../../app/ui";
import { Avatar, ImageSlot, VerifiedBadge } from "../../platform/ui/surfaces";
import { useOutside } from "../../platform/ui/controls";
import { useToast } from "../../platform/ui/toast";
import { CONTENT_FILTERS, PostCard, SocialModal, money, useGo } from "./shared";

const PAGE = 6;

export function FeedPage({ route, params }: PageProps) {
  const account = useData((d) => d.account);
  const canManage = useData((d) => d.account.session.fanView === "creator" && can(d, "content.write"));
  const posts = useData(publishedPosts);
  const pinnedId = useData((d) => d.social.pinnedPostId);
  const [filter, setFilter] = useState("All Content");
  const [shown, setShown] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);
  const go = useGo();

  const pinned = posts.find((p) => p.id === pinnedId) ?? null;
  const match = CONTENT_FILTERS.find((f) => f.label === filter)!.match;
  const list = useMemo(() => posts.filter((p) => p.id !== pinnedId && match(p)), [posts, pinnedId, match]);

  // Infinite scroll (spec: posts load as you scroll).
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setShown((n) => n + PAGE), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [list.length]);
  useEffect(() => setShown(PAGE), [filter]);

  // inferred: /:handle is a catch-all; any other handle is treated as an unknown page.
  if (params.handle !== account.handle) {
    return (
      <div data-testid={`page-${route.id}`} className="py-[40px]">
        <h4 className="text-[24px] font-bold">Page not found</h4>
        <p className="mt-[8px] text-[14px] text-muted">There's no creator page at /{params.handle}.</p>
      </div>
    );
  }

  return (
    <div data-testid={`page-${route.id}`} className="flex items-start gap-[25px]">
      <div className="w-[524px] shrink-0">
        <div className="-mx-[12px] w-[548px]">
          <ProfileCard canManage={canManage} />
          {pinned && (
            <div className="mt-[16px]">
              <PostCard post={pinned} canManage={canManage} />
            </div>
          )}
          <div className="mt-[25px] flex h-[50px] items-center justify-between">
            <div className="flex items-center gap-[12px]">
              <h5 className="text-[22px] font-bold">My Posts</h5>
              <button
                aria-label="Topic Tags settings"
                data-testid="feed-topic-tags-gear"
                onClick={() => go("pref-topic-tags")}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-accent"
              >
                <Settings size={17} strokeWidth={2.5} />
              </button>
            </div>
            <ContentFilter value={filter} onChange={setFilter} />
          </div>
          <div className="mb-[20px] mt-[20px] h-px bg-white/[.12]" />
          <div className="space-y-[16px]">
            {list.slice(0, shown).map((p) => (
              <PostCard key={p.id} post={p} canManage={canManage} />
            ))}
            {!list.length && (
              // inferred: empty filter state was not captured
              <p data-testid="feed-empty" className="rounded-[32px] bg-surface px-[24px] py-[40px] text-center text-[16px] text-muted">
                No posts yet.
              </p>
            )}
          </div>
          <div ref={sentinel} className="h-px" />
        </div>
      </div>
      <RightRail />
    </div>
  );
}

function ProfileCard({ canManage }: { canManage: boolean }) {
  const account = useData((d) => d.account);
  const profile = useData((d) => ({ location: d.prefsA.profile?.location ?? creator.location, bio: d.prefsA.profile?.bio ?? creator.bio }));
  const go = useGo();
  const toast = useToast();
  const [plansOpen, setPlansOpen] = useState(false);
  const chips: [string, () => void][] = [
    ["Welcome", () => openOverlay("welcome")],
    ["Store", () => go("public-store", { handle: account.handle })],
    ["Chat Room", () => go("chat-room", { handle: account.handle })],
    ["Leaderboards", () => go("leaderboards", { handle: account.handle })],
    ["Competitions", () => go("public-events", { handle: account.handle })],
    ["VIP Deals", () => go("public-store", { handle: account.handle })], // inferred target (VIP deal pages not captured)
    ["Videos", () => go("public-videos", { handle: account.handle, portfolioId: "competition-videos" })],
    ["Newsletters", () => go("public-store", { handle: account.handle })], // inferred target (newsletters list not captured)
  ];
  return (
    <section data-testid="feed-profile-card" className="overflow-hidden rounded-card bg-surface">
      <div className="relative h-[316px]">
        <ImageSlot label="Cover photo" className="absolute inset-x-0 top-[0px] h-[290px] w-full" />
        <div className="absolute inset-x-0 top-[150px] h-[166px] bg-gradient-to-b from-transparent via-surface/70 to-surface" />
        {canManage && (
          <button
            aria-label="Edit profile"
            data-testid="feed-edit-profile"
            onClick={() => go("pref-profile")}
            className="absolute right-[25px] top-[25px] flex h-[40px] w-[40px] items-center justify-center rounded-full bg-accent"
          >
            <Pencil size={18} className="fill-white" />
          </button>
        )}
        <div className="absolute left-[24px] top-[201px]">
          <Avatar src={account.avatar} size={100} ring={3} />
        </div>
        <div className="absolute left-[142px] top-[224px]">
          <div className="flex items-center gap-[6px]">
            <h1 className="text-[24px] font-bold">{account.name}</h1>
            {account.verified && <VerifiedBadge size={24} />}
          </div>
          <p className="mt-[8px] text-[16px] text-soft">{profile.location}</p>
        </div>
        <button
          aria-label="Share profile"
          data-testid="feed-share-profile"
          onClick={() => {
            navigator.clipboard?.writeText(`${window.location.origin}/${account.handle}`).catch(() => {});
            toast("Link copied"); // inferred
          }}
          className="absolute right-[24px] top-[233px] flex h-[40px] w-[40px] items-center justify-center rounded-full bg-accent"
        >
          <Share2 size={18} />
        </button>
      </div>
      <div className="flex flex-wrap gap-[10px] px-[24px]">
        {chips.map(([label, onClick]) => (
          <button
            key={label}
            data-testid={`feed-chip-${label.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={onClick}
            className="h-[41px] rounded-pill bg-accent px-[15px] pb-[8px] pt-[9px] text-[14px] font-black uppercase tracking-caps hover:brightness-110"
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-[27px] px-[24px] text-[16px] leading-[20px]">
        {profile.bio}{" "}
        <a href="https://www.example.com" target="_blank" rel="noreferrer noopener" className="text-accent">
          https://www.example.com
        </a>
      </p>
      <div className="px-[24px] pb-[48px] pt-[30px]">
        <button
          data-testid="feed-view-plans"
          onClick={() => setPlansOpen(true)}
          className="h-[40px] w-full rounded-pill bg-accent text-[14px] font-black uppercase tracking-caps hover:brightness-110"
        >
          View Subscription Plans
        </button>
      </div>
      <PlansModal open={plansOpen} onClose={() => setPlansOpen(false)} />
    </section>
  );
}

/** inferred: the plans list behind VIEW SUBSCRIPTION PLANS was not captured. Reads Monetize plans (read-only). */
function PlansModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const plans = useData((d) => d.monetize.plans.filter((p) => p.active));
  return (
    <SocialModal open={open} onClose={onClose} title="Subscription Plans" width={620} top={120} testid="modal-feed-plans">
      <div className="space-y-[12px]">
        {plans.map((p) => {
          const monthly = p.prices.find((x) => x.months === 1) ?? p.prices[0];
          return (
            <div key={p.id} data-testid={`feed-plan-${p.id}`} className="flex items-center justify-between rounded-inner bg-bg px-[24px] py-[20px]">
              <div>
                <p className="text-[16px] font-bold">{p.name}</p>
                {p.benefits.length > 0 && <p className="mt-[4px] text-[14px] text-muted">{p.benefits.slice(0, 3).join(" · ")}</p>}
              </div>
              {monthly && (
                <p className="text-[16px] font-bold">
                  {money(monthly.amount)}
                  <span className="text-[14px] font-normal text-muted"> / {monthly.months === 1 ? "month" : `${monthly.months} months`}</span>
                </p>
              )}
            </div>
          );
        })}
        {!plans.length && <p className="text-[14px] text-muted">No subscription plans yet.</p>}
      </div>
    </SocialModal>
  );
}

/** "All Content" select; its panel opens ABOVE the control (11a). */
function ContentFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  return (
    <div ref={ref} className="relative w-[170px]">
      <button
        data-testid="feed-content-filter"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-[50px] w-full items-center justify-between rounded-[25px] bg-surface pl-[20px] pr-[16px] text-[14px] font-bold"
      >
        {value}
        <ChevronDown size={22} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          data-testid="feed-content-filter-panel"
          className="absolute bottom-[55px] left-[0px] z-30 max-h-[255px] w-full overflow-y-auto rounded-panel bg-surface [scrollbar-color:var(--accent)_transparent] [&::-webkit-scrollbar-thumb]:bg-accent"
        >
          {CONTENT_FILTERS.map((f) => (
            <li key={f.label}>
              <button
                role="option"
                aria-selected={f.label === value}
                data-testid={`feed-filter-${f.label.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => {
                  onChange(f.label);
                  setOpen(false);
                }}
                className={`flex h-[35px] w-full items-center px-[20px] text-left text-[14px] ${f.label === value ? "bg-accent font-bold" : "hover:bg-accent-tint"}`}
              >
                {f.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- right rail ---------------- */

function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!target) return null;
  let s = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  return [d, h, m, s - m * 60].map((n) => String(n).padStart(2, "0"));
}

function RailTile({ title, sub, onClick, testid }: { title: string; sub?: string; onClick: () => void; testid: string }) {
  return (
    <button data-testid={testid} onClick={onClick} className="relative block h-[100px] w-[267px] overflow-hidden rounded-inner text-center">
      <span aria-hidden className="absolute inset-0 bg-placeholder-img" />
      <span className="absolute inset-0 bg-black/45" />
      <span className="relative flex h-full flex-col items-center justify-center px-[12px]">
        <span className="text-[18px] font-medium leading-[22px]">{title}</span>
        {sub && <span className="mt-[8px] text-[12px]">{sub}</span>}
      </span>
    </button>
  );
}

function RightRail() {
  const handle = useData((d) => d.account.handle);
  const next = useData((d) => {
    const now = new Date().toISOString();
    return d.monetize.events.filter((e) => !e.past && e.date > now).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  });
  const items = useData((d) => d.social.showcase.filter((s) => s.rail));
  const cd = useCountdown(next?.date ?? null);
  const go = useGo();
  return (
    <aside data-testid="feed-right-rail" className="w-[267px] shrink-0 space-y-[12px]">
      {next && cd && (
        <div data-testid="feed-rail-countdown" className="relative h-[162px] overflow-hidden rounded-inner">
          <span aria-hidden className="absolute inset-0 bg-placeholder-img" />
          <span className="absolute inset-0 bg-black/55" />
          <div className="relative px-[14px] pt-[16px]">
            <p className="text-[12px] font-bold">Upcoming Event In</p>
            <div className="mt-[4px] flex items-start text-[26px] font-bold leading-[30px]">
              {cd.map((v, i) => (
                <span key={i} className="flex items-start">
                  <span className="flex flex-col items-center">
                    {v}
                    <span className="text-[11px] font-normal leading-[16px]">{["Days", "Hrs", "Min", "Sec"][i]}</span>
                  </span>
                  {i < 3 && <span className="px-[2px]">:</span>}
                </span>
              ))}
            </div>
            <p className="mt-[8px] truncate text-[18px] font-bold leading-[22px]">{next.title}</p>
            <button data-testid="feed-rail-more-info" onClick={() => go("public-event-detail", { handle, eventId: next.id })} className="text-[13px] font-bold text-accent">
              More Info
            </button>
          </div>
        </div>
      )}
      {/* inferred target: the social-media tile's destination was not captured */}
      <RailTile testid="feed-rail-social" title="Comment or Follow on Social Media" onClick={() => go("public-store", { handle })} />
      {items.map((it) => (
        <RailTile key={it.id} testid={`feed-rail-item-${it.id}`} title={it.title} sub={it.price != null ? money(it.price) : undefined} onClick={() => go("public-product", { handle, productId: it.id })} />
      ))}
      <button
        data-testid="feed-more-store-items"
        onClick={() => go("public-store", { handle })}
        className="!mt-[22px] h-[40px] w-[267px] rounded-pill bg-accent text-[14px] font-black uppercase tracking-caps hover:brightness-110"
      >
        More Store Items
      </button>
    </aside>
  );
}
