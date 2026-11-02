/**
 * 16 Insights & Fans. Tabs stay on /insights: default = Earning Metrics, ?tab=engagement, ?tab=fan-relationship-management.
 */
import { useMemo, useState } from "react";
import { FileSearch } from "lucide-react";
import type { PageProps } from "../types";
import { useRouter } from "../../app/router";
import { pathFor } from "../../app/routeCatalog";
import { useData } from "../../store/store";
import { can } from "../../store/permissions";
import { EARNING_CATEGORIES } from "../../store/slices/money";
import { InfoIcon } from "../../platform/ui/controls";
import { NoticeBox } from "../../platform/ui/surfaces";
import { BarChart, DonutChart, PagedLegend } from "./charts";
import { earnings, engagementTotals, periodRange, PERIODS, type Period, type Range } from "./insightsData";
import { FanRelationship } from "./InsightsFans";
import { Btn, DatePill, downloadCsv, fmtDate, PillSelect, SortHead, TableCard, TabPill, Td, Th, usd } from "./ui";

const TABS = [
  { key: "earning", label: "Earning Metrics", q: null },
  { key: "engagement", label: "Engagement Metrics", q: "engagement" },
  { key: "frm", label: "Fan Relationship Management", q: "fan-relationship-management" },
] as const;

export function Insights({ route, query }: PageProps) {
  const { navigate } = useRouter();
  const q = query.get("tab");
  const tab = q === "engagement" ? "engagement" : q === "fan-relationship-management" ? "frm" : "earning";
  return (
    <div data-testid={`page-${route.id}`}>
      <h4 className="text-[24px] font-bold uppercase">Insights &amp; Fans</h4>
      <div role="tablist" className="mt-[25px] flex flex-wrap gap-[10px]">
        {TABS.map((t) => (
          <TabPill
            key={t.key}
            bold
            active={tab === t.key}
            testid={`insights-tab-${t.key}`}
            onClick={() => navigate(t.q ? `${pathFor("insights")}?tab=${t.q}` : pathFor("insights"), { keepScroll: true })}
          >
            {t.label}
          </TabPill>
        ))}
      </div>
      <div className="mt-[29px]">
        {tab === "earning" && <EarningMetrics />}
        {tab === "engagement" && <EngagementMetrics />}
        {tab === "frm" && <FanRelationship query={query} />}
      </div>
    </div>
  );
}

/** Period select + optional custom date pills. */
export function usePeriod(initial: Period = "This Month") {
  const [period, setPeriod] = useState<Period>(initial);
  const [custom, setCustom] = useState<Range>({ from: null, to: null });
  const range = useMemo(() => periodRange(period, custom), [period, custom]);
  return { period, setPeriod, custom, setCustom, range };
}

export function PeriodControl({ p, testid }: { p: ReturnType<typeof usePeriod>; testid: string }) {
  return (
    <div className="flex items-center gap-[12px]">
      <PillSelect value={p.period} options={[...PERIODS]} onChange={(v) => p.setPeriod(v as Period)} width={150} testid={testid} panelWidth={180} />
      {p.period === "Custom Dates" && (
        <>
          <DatePill value={p.custom.from} onChange={(v) => p.setCustom({ ...p.custom, from: v })} placeholder="From Date" testid={`${testid}-from`} width={170} />
          <DatePill value={p.custom.to} onChange={(v) => p.setCustom({ ...p.custom, to: v })} placeholder="To Date" testid={`${testid}-to`} width={170} />
        </>
      )}
    </div>
  );
}

/* ---------------- 16 Earning Metrics ---------------- */

const EARNING_CARD_LABELS: Record<string, string> = {
  tips: "Tips",
  merchandise: "Merchandise",
  experiences: "Experiences",
  paidDms: "Paid Direct Messages",
  subscriptions: "Subscriptions",
  individual: "Individual Purchases",
  referrals: "Referrals",
  newsletters: "Newsletters",
  livestreams: "Livestreams",
  courses: "Courses",
  downloadables: "Downloadables",
  vipOffers: "VIP Offers",
  fundraisers: "Fundraisers",
  advertisements: "Advertisements",
  portfolios: "Portfolios",
  eventTickets: "Event Tickets",
  loyaltyPoints: "Loyalty Points",
};

function EarningMetrics() {
  const { navigate } = useRouter();
  const allowed = useData((d) => can(d, "finance.read"));
  const money = useData((d) => d.money);
  const p = usePeriod();
  const e = useMemo(() => earnings(money, p.range), [money, p.range]);
  if (!allowed)
    // inferred: delegate without Financial access.
    return <NoticeBox>Your role doesn't allow this (finance.read). Ask the account owner for Financial access to see earnings.</NoticeBox>;
  const cards = [...EARNING_CATEGORIES.map((c) => ({ key: c.key as string, label: EARNING_CARD_LABELS[c.key], ...e.by[c.key] })), { key: "total", label: "Total Earnings", ...e.total }];
  return (
    <div data-testid="insights-earning">
      <div className="flex items-center justify-between">
        <PeriodControl p={p} testid="insights-earning-period" />
        <Btn
          data-testid="insights-earning-csv"
          onClick={() => downloadCsv("earning-metrics.csv", [["Category", "Count", "Amount"], ...cards.map((c) => [c.label, c.count, usd(c.amount)])])}
        >
          Download CSV
        </Btn>
      </div>
      <div className="mt-[30px] grid grid-cols-3 gap-x-[24px] gap-y-[20px]">
        {cards.map((c) => (
          <div key={c.key} data-testid={`insights-earning-card-${c.key}`} className="min-h-[126px] rounded-[20px] bg-surface p-[20px]">
            <div className="flex items-start justify-between">
              <span className="text-[28px] font-medium leading-[36px]">{usd(c.amount)}</span>
              <FileSearch size={30} className="fill-accent text-surface" strokeWidth={1.6} />
            </div>
            <p className="mt-[10px] text-[16px] uppercase">
              {c.label} ({c.count})
            </p>
            {c.key === "subscriptions" && (
              <button
                type="button"
                data-testid="insights-view-subscribers"
                onClick={() => navigate(`${pathFor("insights")}?tab=fan-relationship-management&status=Subscribers`)}
                className="mt-[10px] text-[14px] uppercase text-accent hover:underline"
              >
                View Subscribers &gt;
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-[30px] flex rounded-[20px] bg-surface py-0 pl-[30px]" data-testid="insights-earning-donut">
        <div className="flex-1">
          <DonutChart
            data={EARNING_CATEGORIES.map((c) => ({ key: c.key, label: c.label, color: c.color, value: e.by[c.key].amount }))}
            total={e.total.amount}
            centerLabel="Total Earnings"
          />
        </div>
        <div className="w-[188px] shrink-0 pt-[22px]">
          <PagedLegend data={EARNING_CATEGORIES.map((c) => ({ label: c.label, color: c.color }))} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- 16a Engagement Metrics ---------------- */

const POST_TYPES = ["All Post Types", "Image", "Video", "Audio", "Article", "Reel", "Poll", "Giveaway", "Link", "Fundraiser", "Downloadable"];

function EngagementMetrics() {
  const days = useData((d) => d.money.engagementDaily);
  const posts = useData((d) => d.money.contentPosts);
  const p = usePeriod();
  const t = useMemo(() => engagementTotals(days, p.range), [days, p.range]);
  const [type, setType] = useState<string | null>(null);
  const [sort, setSort] = useState<{ k: "createdAt" | "engagements"; dir: "asc" | "desc" } | null>(null);
  const rows = useMemo(() => {
    const r = posts.filter((x) => !type || type === "All Post Types" || x.type === type);
    if (!sort) return r;
    return [...r].sort((a, b) => (sort.dir === "asc" ? 1 : -1) * (sort.k === "createdAt" ? a.createdAt.localeCompare(b.createdAt) : a.engagements - b.engagements));
  }, [posts, type, sort]);
  const toggle = (k: "createdAt" | "engagements") => setSort((s) => (s?.k === k ? { k, dir: s.dir === "asc" ? "desc" : "asc" } : { k, dir: "desc" }));

  const cards: { key: string; label: string; value: number; info?: string; icon?: boolean }[] = [
    { key: "new-followers", label: "New Followers", value: t.sum("newFollowers") },
    { key: "new-subscribers", label: "New Subscribers", value: t.sum("newSubscribers") },
    { key: "new-posts", label: "New Content Posts", value: t.sum("newPosts") },
    { key: "impressions", label: "Post Impressions", value: t.sum("impressions"), info: "How many times your posts were shown to fans." },
    { key: "engagements", label: "Post Engagements", value: t.sum("engagements"), info: "Likes, comments, shares, votes, unlocks and other interactions on your posts." },
    { key: "likes", label: "Post Likes", value: t.sum("likes") },
    { key: "comments", label: "Post Comments", value: t.sum("comments") },
    { key: "shares", label: "Post Shares", value: t.sum("shares") },
    { key: "visits-topfan", label: "Profile Visits on TopFans", value: t.sum("visitsTopfan") },
    { key: "visits-wls", label: "Profile Visits on White Label Site", value: t.sum("visitsWls") },
    { key: "dms-received", label: "DMs Received", value: t.sum("dmsReceived") },
    { key: "dms-sent", label: "DMs Sent", value: t.sum("dmsSent") },
    { key: "portfolio", label: "Portfolio Engagement", value: t.sum("portfolio"), icon: true },
  ];

  return (
    <div data-testid="insights-engagement">
      <PeriodControl p={p} testid="insights-engagement-period" />
      <div className="mt-[30px] grid grid-cols-4 gap-x-[24px] gap-y-[20px]">
        {cards.map((c) => (
          <div key={c.key} data-testid={`insights-engagement-card-${c.key}`} className="relative min-h-[120px] rounded-[20px] bg-surface p-[20px]">
            {c.icon && <FileSearch size={26} className="absolute right-[20px] top-[20px] fill-accent text-surface" strokeWidth={1.6} />}
            <span className="text-[28px] font-medium leading-[36px]">{c.value}</span>
            <p className="mt-[6px] flex items-center justify-between text-[16px] uppercase leading-[20px]">
              <span>{c.label}</span>
              {c.info && <InfoIcon text={c.info} />}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-[30px] rounded-[20px] bg-surface px-[30px] pb-[24px] pt-[30px]" data-testid="insights-engagement-trends">
        <h5 className="text-[16px] uppercase">Post Engagement Trends</h5>
        <div className="mt-[24px]">
          <BarChart points={t.trend} />
        </div>
        <div className="mt-[8px] flex items-center justify-center gap-[8px] text-[14px]">
          <span className="h-[12px] w-[12px] rounded-[3px] bg-accent" />
          White Label Site
        </div>
      </section>

      <div className="mt-[40px] flex items-center justify-between">
        <h4 className="text-[24px] font-bold">My Content Posts</h4>
        <div className="flex items-center gap-[26px]">
          <PillSelect value={type} placeholder="POST TYPE" options={POST_TYPES} onChange={setType} width={178} outline testid="insights-posts-type" />
          <Btn
            data-testid="insights-posts-csv"
            onClick={() =>
              downloadCsv("my-content-posts.csv", [
                ["Post Title", "Post Type", "Created On", "Imprs", "Engmts", "Likes", "Comments", "Shares"],
                ...rows.map((r) => [r.title, r.type, fmtDate(r.createdAt), r.impressions, r.engagements, r.likes, r.comments, r.shares]),
              ])
            }
          >
            Download CSV
          </Btn>
        </div>
      </div>
      <TableCard className="mt-[20px]" testid="insights-posts-table">
        <thead>
          <tr>
            <Th w="32%">Post Title</Th>
            <Th w="12%">Post Type</Th>
            <Th w="12.5%">
              <SortHead label="Created On" dir={sort?.k === "createdAt" ? sort.dir : null} onClick={() => toggle("createdAt")} testid="insights-posts-sort-created" />
            </Th>
            <Th w="6.5%">Imprs</Th>
            <Th w="11.5%">
              <SortHead label="Engmts" dir={sort?.k === "engagements" ? sort.dir : null} onClick={() => toggle("engagements")} testid="insights-posts-sort-engagements" />
            </Th>
            <Th w="4.5%">Likes</Th>
            <Th w="10%">Comments</Th>
            <Th>Shares</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="h-[89px]" data-testid={`insights-post-row-${r.id}`}>
              <Td>
                <span className="line-clamp-2 leading-[24px] text-accent">{r.title}</span>
              </Td>
              <Td className="pl-[10px]">{r.type}</Td>
              <Td className="pl-[10px]">{fmtDate(r.createdAt)}</Td>
              <Td className="pl-[16px]">{r.impressions}</Td>
              <Td className="pl-[12px]">{r.engagements}</Td>
              <Td className="pl-[10px]">{r.likes}</Td>
              <Td className="pl-[12px]">{r.comments}</Td>
              <Td className="pl-[10px]">{r.shares}</Td>
            </tr>
          ))}
        </tbody>
      </TableCard>
    </div>
  );
}
