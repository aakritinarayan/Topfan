/** Simple SVG charts matching 16 (earnings donut with callouts + paginated legend) and 16a (engagement bars). */
import { useState } from "react";
import { fmtDateLong, usd } from "./ui";

export interface DonutDatum {
  key: string;
  label: string;
  color: string;
  value: number;
}

const W = 720;
const H = 500;
const CX = 370;
const CY = 247;
const R = 195;
const RING = 40;

const polar = (a: number, r: number) => [CX + r * Math.sin(a), CY - r * Math.cos(a)] as const;

function arc(a0: number, a1: number): string {
  // full ring needs two halves
  if (a1 - a0 >= Math.PI * 2 - 1e-6) return `${arc(0, Math.PI)} ${arc(Math.PI, Math.PI * 2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = polar(a0, R);
  const [x1, y1] = polar(a1, R);
  const [x2, y2] = polar(a1, R - RING);
  const [x3, y3] = polar(a0, R - RING);
  return `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${R - RING},${R - RING} 0 ${large} 0 ${x3},${y3} Z`;
}

/** Donut with callout labels: zero-value categories cluster at their (empty) angle, max 4 per side, like the capture. */
export function DonutChart({ data, total, centerLabel }: { data: DonutDatum[]; total: number; centerLabel: string }) {
  const sum = data.reduce((s, d) => s + d.value, 0);
  let acc = 0;
  const slices = data.map((d, i) => {
    const a0 = sum ? (acc / sum) * Math.PI * 2 : 0;
    acc += d.value;
    const a1 = sum ? (acc / sum) * Math.PI * 2 : 0;
    return { ...d, i, a0, a1, mid: (a0 + a1) / 2 };
  });
  const LR = R + 30;
  type Lab = { label: string; color: string; mid: number; y: number; zero: boolean; i: number; side: "L" | "R" };
  const labs: Lab[] = slices.map((s) => {
    const a = s.mid >= Math.PI * 2 - 1e-3 ? Math.PI * 2 - 1e-3 : s.mid;
    const side: "L" | "R" = Math.sin(a) > 0.001 || a < 0.002 ? "R" : "L";
    return { label: s.label, color: s.color, mid: a, y: CY - LR * Math.cos(a), zero: s.value === 0, i: s.i, side };
  });
  const placed: (Lab & { x: number })[] = [];
  for (const side of ["R", "L"] as const) {
    const group = labs
      .filter((l) => l.side === side)
      .sort((a, b) => Math.round(a.y / 8) - Math.round(b.y / 8) || Number(a.zero) - Number(b.zero) || a.i - b.i);
    let zeros = 0;
    const kept = group.filter((l) => !l.zero || ++zeros <= 4);
    let prev = -Infinity;
    for (const l of kept) {
      const y = Math.max(l.y, prev + 24);
      prev = y;
      const dy = Math.max(-LR, Math.min(LR, y - CY));
      const dx = Math.sqrt(Math.max(0, LR * LR - dy * dy));
      placed.push({ ...l, y, x: side === "R" ? CX + Math.max(dx, 14) : CX - Math.max(dx, 14) });
    }
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`${centerLabel} ${usd(total)}`} className="max-w-full">
      {sum === 0 ? (
        <circle cx={CX} cy={CY} r={R - RING / 2} fill="none" stroke="#3a3c3e" strokeWidth={RING} />
      ) : (
        slices
          .filter((s) => s.value > 0)
          .map((s) => <path key={s.key} d={arc(s.a0, s.a1)} fill={s.color} stroke="#fff" strokeWidth={1} data-testid={`insights-donut-${s.key}`} />)
      )}
      {placed.map((l) => {
        const [px, py] = polar(l.mid, R);
        const anchorX = l.side === "R" ? l.x - 4 : l.x + 4;
        return (
          <g key={l.label}>
            <path d={`M${px},${py} Q${px},${l.y} ${anchorX},${l.y}`} fill="none" stroke={l.color} strokeWidth={1} />
            <text x={l.x} y={l.y + 4} textAnchor={l.side === "R" ? "start" : "end"} fontSize={12} fontWeight={700} fill="#fff">
              {l.label}
            </text>
          </g>
        );
      })}
      <text x={CX} y={CY - 2} textAnchor="middle" fontSize={16} fill="#fff">
        {centerLabel}
      </text>
      <text x={CX} y={CY + 18} textAnchor="middle" fontSize={16} fill="#fff">
        {usd(total)}
      </text>
    </svg>
  );
}

/** Legend with "▲ 1/2 ▼" pagination (13 per page; the list box clips the last row, as captured). */
export function PagedLegend({ data, perPage = 13 }: { data: { label: string; color: string }[]; perPage?: number }) {
  const [page, setPage] = useState(0);
  const pages = Math.ceil(data.length / perPage);
  const items = data.slice(page * perPage, page * perPage + perPage);
  return (
    <div className="flex flex-col" data-testid="insights-donut-legend">
      <ul className="max-h-[432px] overflow-hidden">
        {items.map((d) => (
          <li key={d.label} className="flex h-[35px] items-center gap-[16px] text-[14px]">
            <span className="h-[16px] w-[20px] shrink-0" style={{ background: d.color }} />
            {d.label}
          </li>
        ))}
      </ul>
      <div className="mt-[4px] flex items-center gap-[2px] text-[12px]">
        <button type="button" aria-label="Previous legend page" data-testid="insights-legend-prev" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="text-accent disabled:opacity-60">
          ▲
        </button>
        <span>
          {page + 1}/{pages}
        </span>
        <button
          type="button"
          aria-label="Next legend page"
          data-testid="insights-legend-next"
          disabled={page >= pages - 1}
          onClick={() => setPage((p) => p + 1)}
          className="text-accent disabled:opacity-60"
        >
          ▼
        </button>
      </div>
    </div>
  );
}

/** 16a POST ENGAGEMENT TRENDS: accent bars per day, y axis in steps of 10. */
export function BarChart({ points }: { points: { date: string; value: number }[] }) {
  const w = 880;
  const h = 360;
  const left = 50;
  const top = 10;
  const bottom = 330;
  const max = Math.max(60, Math.ceil((Math.max(0, ...points.map((p) => p.value)) + 1) / 10) * 10);
  const steps = max / 10;
  const plotW = w - left - 20;
  const slot = points.length ? plotW / points.length : plotW;
  const bw = Math.min(170, slot * 0.4);
  const y = (v: number) => bottom - (v / max) * (bottom - top);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label="Post engagement trends" data-testid="insights-engagement-bars">
      {Array.from({ length: steps + 1 }, (_, i) => (
        <text key={i} x={left - 26} y={y(i * 10) + 5} textAnchor="end" fontSize={14} fill="#b0b0b0">
          {i * 10}
        </text>
      ))}
      {points.map((p, i) => {
        const cx = left + slot * i + slot / 2;
        return (
          <g key={p.date}>
            <rect x={cx - bw / 2} y={y(p.value)} width={bw} height={bottom - y(p.value)} className="fill-accent">
              <title>{`${fmtDateLong(p.date)}: ${p.value}`}</title>
            </rect>
            <text x={cx} y={bottom + 20} textAnchor="middle" fontSize={11} fill="#d0d0d0">
              {fmtDateLong(p.date)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
