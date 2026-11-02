/** Period maths + derived Insights numbers, all computed from the money slice (so Wallet and Insights agree). */
import { EARNING_CATEGORIES, MONEY_TODAY, type DailyEngagement, type MoneyFan, type MoneyState } from "../../store/slices/money";

export const PERIODS = ["Today", "This Week", "Last Week", "This Month", "Last Month", "All Time", "Custom Dates"] as const;
export type Period = (typeof PERIODS)[number];
export type Range = { from: string | null; to: string | null };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};

/** Date range for a period, relative to MONEY_TODAY. Weeks start on Sunday (inferred). */
export function periodRange(p: Period, custom: Range = { from: null, to: null }): Range {
  const t = MONEY_TODAY;
  const dow = parse(t).getUTCDay();
  const weekStart = addDays(t, -dow);
  const [y, m] = t.split("-").map(Number);
  switch (p) {
    case "Today":
      return { from: t, to: t };
    case "This Week":
      return { from: weekStart, to: t };
    case "Last Week":
      return { from: addDays(weekStart, -7), to: addDays(weekStart, -1) };
    case "This Month":
      return { from: `${t.slice(0, 7)}-01`, to: t };
    case "Last Month": {
      const first = iso(new Date(Date.UTC(y, m - 2, 1)));
      return { from: first, to: addDays(`${t.slice(0, 7)}-01`, -1) };
    }
    case "All Time":
      return { from: null, to: null };
    case "Custom Dates":
      return custom;
  }
}

export const within = (date: string | null | undefined, r: Range) => !!date && (!r.from || date.slice(0, 10) >= r.from) && (!r.to || date.slice(0, 10) <= r.to);

/** Earning Metrics: count + gross per category within the range. */
export function earnings(m: MoneyState, r: Range) {
  const by = Object.fromEntries(EARNING_CATEGORIES.map((c) => [c.key, { count: 0, amount: 0 }])) as Record<string, { count: number; amount: number }>;
  for (const t of m.transactions) {
    if (!t.category || t.amount <= 0 || !within(t.date, r)) continue;
    by[t.category].count += 1;
    by[t.category].amount += t.gross ?? t.amount;
  }
  const total = Object.values(by).reduce((s, v) => ({ count: s.count + v.count, amount: s.amount + v.amount }), { count: 0, amount: 0 });
  return { by, total };
}

export function engagementTotals(days: DailyEngagement[], r: Range) {
  const inR = days.filter((d) => within(d.date, r));
  const sum = (k: keyof DailyEngagement) => inR.reduce((s, d) => s + (d[k] as number), 0);
  return {
    sum,
    trend: inR
      .filter((d) => d.engagements > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ date: d.date, value: d.engagements })),
  };
}

/** Top Supporters: fans ranked by gross spend in the range (from transactions). */
export function topSupporters(m: MoneyState, r: Range) {
  const spend = new Map<string, number>();
  for (const t of m.transactions) if (t.fan && t.amount > 0 && within(t.date, r)) spend.set(t.fan, (spend.get(t.fan) ?? 0) + (t.gross ?? t.amount));
  return [...spend.entries()]
    .map(([name, amount]) => ({ fan: m.fans.find((f) => f.name === name), name, amount }))
    .filter((x): x is { fan: MoneyFan; name: string; amount: number } => !!x.fan)
    .sort((a, b) => b.amount - a.amount);
}

export const mostEngaged = (m: MoneyState, r: Range) =>
  m.fans.filter((f) => f.engagement > 0 && within(f.lastEngagedAt, r)).sort((a, b) => b.engagement - a.engagement);

export const topRecruiters = (m: MoneyState, r: Range) => m.fans.filter((f) => f.recruited > 0 && within(f.recruitedAt, r)).sort((a, b) => b.recruited - a.recruited);
