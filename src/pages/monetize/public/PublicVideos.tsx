/**
 * Public › Videos (81, skeleton 81a, single tab 81b, player 81c/81d) and Video Series + Episode player (90, 90a–c).
 * Playback is simulated (no media files): a timer advances the clock over a neutral placeholder.
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Lock, Maximize, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { useData, useMockLoading } from "../../../store/store";
import { money, placeOrder, type Episode, type Portfolio, type VideoSeries } from "../../../store/slices/monetize";
import { useOutside } from "../../../platform/ui/controls";
import { ImageSlot } from "../../../platform/ui/surfaces";
import type { PageProps } from "../../types";
import { ConfirmModal, Pill, PublicHeader, PublicPage, RedCircle, ShareButton, Skel, useRun } from "../ui";

const seriesParam = (portfolioId: string, seriesId: string) => `PORTFOLIO-${portfolioId}-${seriesId}`;
const parseSeries = (p: string) => {
  const m = p.match(/^PORTFOLIO-(.+)-([^-]+)$/);
  return m ? { portfolioId: m[1], seriesId: m[2] } : null;
};

export function PublicVideosPage({ route, params }: PageProps) {
  const name = useData((d) => d.account.name);
  const p = useData((d) => d.monetize.portfolios.find((x) => x.id === params.portfolioId));
  const loading = useMockLoading(900);
  const [tab, setTab] = useState<"series" | "single">("series");
  const [watch, setWatch] = useState<Episode | null>(null);
  const { navigate } = useRouter();
  if (loading)
    return (
      <PublicPage routeId={route.id}>
        <PublicHeader crumbs={[{ label: name }, { label: p?.title ?? "Videos" }]} />
        <div className="mt-[28px] rounded-card bg-surface p-[16px] pb-[16px]" data-testid="public-videos-skeleton">
          <div className="h-[466px] rounded-card bg-[#232426]" />
          <Skel className="mt-[10px] h-[20px] w-[180px] rounded-[6px]" />
        </div>
        <div className="mt-[24px] rounded-card bg-surface p-[24px]">
          <Skel className="h-[16px] w-[160px] rounded-[6px]" />
        </div>
      </PublicPage>
    );
  if (!p)
    return (
      <PublicPage routeId={route.id}>
        <PublicHeader crumbs={[{ label: name }, { label: "Videos" }]} />
        <p className="mt-[40px] text-[18px] text-[#c8c8c8]">This portfolio is no longer available.</p>
      </PublicPage>
    );
  return (
    <PublicPage routeId={route.id}>
      <PublicHeader crumbs={[{ label: name }, { label: p.title }]} />
      <div className="relative mt-[28px] h-[483px] overflow-hidden rounded-card bg-[#2e2f30]" data-testid="public-videos-banner">
        {p.banner ? <img src={p.banner} alt="" className="h-full w-full object-cover" /> : <ImageSlot label={`${p.title} banner`} className="h-full w-full" />}
        <div className="absolute inset-x-0 bottom-0 flex h-[110px] items-end bg-gradient-to-t from-surface to-transparent px-[20px] pb-[20px] pt-[40px]">
          <h2 className="text-[30px] font-bold">{p.title}</h2>
        </div>
      </div>
      <section className="mt-[24px] rounded-card bg-surface p-[24px]">
        <div role="tablist" className="flex">
          {(
            [
              ["series", `Video Series (${p.series.length})`],
              ["single", `Single Videos (${p.singles.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              data-testid={`public-videos-tab-${id}`}
              onClick={() => setTab(id)}
              className={`h-[40px] border-b-2 px-[24px] text-[14px] uppercase ${tab === id ? "border-accent font-semibold text-accent" : "border-transparent font-bold text-white hover:text-accent"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-[24px]">
          {tab === "series" ? (
            <div className="flex flex-wrap gap-[24px]">
              {p.series.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  data-testid={`public-series-card-${s.id}`}
                  onClick={() => navigate(pathFor("public-video-series", { handle: params.handle, seriesId: seriesParam(p.id, s.id) }))}
                  className="h-[230px] w-[280px] rounded-[20px] bg-bg p-[4px] text-left hover:ring-1 hover:ring-accent"
                >
                  {s.cover ? <img src={s.cover} alt="" className="h-[160px] w-full rounded-[20px] object-cover" /> : <ImageSlot label={s.title} className="h-[160px] w-full" rounded="rounded-[20px]" />}
                  <h4 className="p-[12px] text-[16px] font-semibold">{s.title}</h4>
                </button>
              ))}
              {!p.series.length && <p className="py-[20px] text-[16px] text-[#c8c8c8]">No Video Series Yet</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-[12px]">
              {p.singles.map((v) => (
                <div key={v.id} data-testid={`public-single-${v.id}`} className="flex h-[61px] items-center gap-[24px] rounded-inner bg-bg px-[16px] py-[10px]">
                  <span className="h-[34px] w-[60px] shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-medium">{v.title}</h3>
                    <span className="text-[14px] text-[#c8c8c8]">{v.duration}</span>
                  </div>
                  <WatchButton onClick={() => setWatch(v)} testid={`public-single-watch-${v.id}`} />
                </div>
              ))}
              {!p.singles.length && <p className="py-[20px] text-[16px] text-[#c8c8c8]">No Single Videos Yet</p>}
            </div>
          )}
        </div>
      </section>
      {watch && <PlayerModal layout="portrait" list={[watch]} index={0} onClose={() => setWatch(null)} autoplay={false} />}
    </PublicPage>
  );
}

function WatchButton({ onClick, testid }: { onClick: () => void; testid: string }) {
  return (
    <button type="button" onClick={onClick} data-testid={testid} className="inline-flex h-[34px] w-[94px] items-center justify-center gap-[6px] rounded-[24px] bg-accent text-[14px] font-medium hover:brightness-110">
      <Play size={13} fill="currentColor" />
      Watch
    </button>
  );
}

export function PublicVideoSeriesPage({ route, params }: PageProps) {
  const name = useData((d) => d.account.name);
  const ids = parseSeries(params.seriesId);
  const found = useData((d) => {
    const p = d.monetize.portfolios.find((x) => x.id === ids?.portfolioId);
    return { p, s: p?.series.find((x) => x.id === ids?.seriesId) };
  });
  if (!found.p || !found.s)
    return (
      <PublicPage routeId={route.id}>
        <PublicHeader crumbs={[{ label: name }, { label: "Videos" }]} />
        <p className="mt-[40px] text-[18px] text-[#c8c8c8]">This video series is no longer available.</p>
      </PublicPage>
    );
  return <Series routeId={route.id} handle={params.handle} name={name} p={found.p} s={found.s} />;
}

function Series({ routeId, handle, name, p, s }: { routeId: string; handle: string; name: string; p: Portfolio; s: VideoSeries }) {
  const [play, setPlay] = useState<number | null>(null);
  const [buy, setBuy] = useState(false);
  const run = useRun();
  return (
    <PublicPage routeId={routeId}>
      <PublicHeader crumbs={[{ label: name, to: `/${handle}` }, { label: p.title, to: pathFor("public-videos", { handle, portfolioId: p.id }) }, { label: s.title }]} />
      <section className="mt-[28px] rounded-[32px] bg-surface p-[24px]" data-testid="public-series-header">
        <div className="flex gap-[24px]">
          {s.cover ? <img src={s.cover} alt="" className="h-[225px] w-[400px] rounded-tile object-cover" /> : <ImageSlot label={s.title} className="h-[225px] w-[400px] shrink-0" rounded="rounded-tile" />}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex justify-end gap-[12px]">
              <Pill data-testid="public-series-buy" icon={<Lock size={18} strokeWidth={2.5} />} className="w-[150px]" onClick={() => setBuy(true)}>
                Buy Series
              </Pill>
              <ShareButton testid="public-series-share" />
            </div>
            <div className="mt-auto">
              <h1 className="text-[30px] font-extrabold leading-[36px]">{s.title}</h1>
              <p className="mt-[14px] text-[14px] text-[#c8c8c8]">
                {s.episodes.length} Episode{s.episodes.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
        <h3 className="mt-[24px] text-[18px] font-semibold">Video Series Description</h3>
        <p className="mt-[14px] text-[16px]">{s.description}</p>
      </section>
      <section className="mt-[16px] flex flex-col gap-[16px] rounded-[32px] bg-surface p-[20px]">
        {s.episodes.map((ep, i) => (
          <div key={ep.id} data-testid={`public-episode-${ep.id}`} className="rounded-inner bg-bg px-[16px] pb-[20px] pt-[10px] transition-colors hover:bg-[#4a4b4d]">
            <div className="flex items-center">
              <span className="pr-[15px] text-[14px]">{i + 1}</span>
              <ImageSlot label={ep.title} className="h-[100px] w-[200px] shrink-0" />
              <div className="min-w-0 flex-1 pl-[16px]">
                <h3 className="text-[15px] font-medium">{ep.title}</h3>
                <p className="mt-[4px] text-[14px] text-[#c8c8c8]">{ep.duration}</p>
                {ep.releaseDate && <p className="mt-[2px] text-[14px] text-[#c8c8c8]">Release Date: {new Date(`${ep.releaseDate}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
              </div>
              <div className="flex items-center gap-[12px]">
                {ep.locked && (
                  <RedCircle label="Locked" size={38} data-testid={`public-episode-lock-${ep.id}`} onClick={() => setBuy(true)}>
                    <Lock size={16} strokeWidth={2.5} />
                  </RedCircle>
                )}
                <WatchButton onClick={() => setPlay(i)} testid={`public-episode-watch-${ep.id}`} />
              </div>
            </div>
            {ep.description && <p className="mt-[16px] pl-[20px] text-[14px]">{ep.description}</p>}
          </div>
        ))}
        {!s.episodes.length && <p className="py-[20px] text-center text-[16px] text-[#c8c8c8]">No Episodes Yet</p>}
      </section>
      {play != null && <PlayerModal layout="landscape" list={s.episodes} index={play} series={s.title} onClose={() => setPlay(null)} autoplay />}
      <ConfirmModal
        open={buy}
        title="Buy Series"
        confirmLabel="Place Order"
        testid="public-series-checkout"
        onClose={() => setBuy(false)}
        onConfirm={() => {
          if (run("monetize.buySeries", (d) => placeOrder(d, { label: `Video Series · ${s.title}`, quantity: 1, total: s.price }), undefined, "Order placed (simulated: no payment was taken)")) setBuy(false);
        }}
      >
        <p>
          Unlock all {s.episodes.length} episodes of <b>{s.title}</b>.
        </p>
        <p className="mt-[8px] text-[20px] font-bold">{money(s.price)}</p>
        <p className="mt-[8px] text-[13px] text-muted">This is a demo: no payment details are collected.</p>
      </ConfirmModal>
    </PublicPage>
  );
}

/* ------------------------------------------------------------------ player */

const SPEEDS = ["0.5x", "0.75x", "1x", "1.25x", "1.5x", "2x"];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Glyph({ d, label, onClick, disabled, testid, size = 26 }: { d: "prev" | "next" | "back15" | "fwd15"; label: string; onClick: () => void; disabled?: boolean; testid: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    prev: <path d="M11 6 3 12l8 6V6Zm10 0-8 6 8 6V6Z" fill="currentColor" />,
    next: <path d="m13 6 8 6-8 6V6ZM3 6l8 6-8 6V6Z" fill="currentColor" />,
    back15: (
      <>
        <path d="M12 4a8 8 0 1 1-7.4 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M3 3v6h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="12" y="15.5" fontSize="7.5" fontWeight="700" textAnchor="middle" fill="currentColor">15</text>
      </>
    ),
    fwd15: (
      <>
        <path d="M12 4a8 8 0 1 0 7.4 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M21 3v6h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="12" y="15.5" fontSize="7.5" fontWeight="700" textAnchor="middle" fill="currentColor">15</text>
      </>
    ),
  };
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} data-testid={testid} className="text-accent disabled:opacity-40">
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        {paths[d]}
      </svg>
    </button>
  );
}

/** Video player modal (`app-video-player-modal`): portrait (single video, 81c) or landscape (episode, 90b). */
function PlayerModal({ layout, list, index, series, onClose, autoplay }: { layout: "portrait" | "landscape"; list: Episode[]; index: number; series?: string; onClose: () => void; autoplay: boolean }) {
  const [i, setI] = useState(index);
  const ep = list[i];
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [speed, setSpeed] = useState("1x");
  const [speedOpen, setSpeedOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLDivElement>(null);
  useOutside(speedRef, () => setSpeedOpen(false), speedOpen);

  useEffect(() => {
    setLoading(true);
    setT(0);
    setPlaying(false);
    const id = setTimeout(() => {
      setLoading(false);
      if (autoplay) setPlaying(true);
    }, 700);
    return () => clearTimeout(id);
  }, [i, autoplay]);
  useEffect(() => {
    if (!playing) return;
    const rate = parseFloat(speed);
    const id = setInterval(() => setT((x) => (x + 0.25 * rate >= ep.seconds ? (setPlaying(false), ep.seconds) : x + 0.25 * rate)), 250);
    return () => clearInterval(id);
  }, [playing, speed, ep.seconds]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && !speedOpen && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose, speedOpen]);

  const total = loading ? 0 : ep.seconds;
  const controls = (
    <div className="w-full">
      <div className="flex items-center justify-center gap-[18px]">
        <Glyph d="prev" label="Previous" disabled={i === 0} onClick={() => setI(i - 1)} testid="player-prev" />
        <Glyph d="back15" label="Rewind 15 seconds" onClick={() => setT((x) => Math.max(0, x - 15))} testid="player-back15" />
        <button type="button" aria-label={playing ? "Pause" : "Play"} data-testid="player-play" onClick={() => !loading && setPlaying((p) => !p)} className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-accent">
          {playing ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-[3px]" />}
        </button>
        <Glyph d="fwd15" label="Forward 15 seconds" onClick={() => setT((x) => Math.min(ep.seconds, x + 15))} testid="player-fwd15" />
        <Glyph d="next" label="Next" disabled={i >= list.length - 1} onClick={() => setI(i + 1)} testid="player-next" />
      </div>
      <div className="mt-[20px] flex items-center gap-[14px]">
        <span className="w-[30px] text-[14px] font-medium">{clock(t)}</span>
        <input
          type="range"
          min={0}
          max={total || 1}
          step={0.1}
          value={t}
          onChange={(e) => setT(Number(e.target.value))}
          aria-label="Seek"
          data-testid="player-seek"
          className="h-[2px] flex-1 cursor-pointer appearance-none bg-[#555] accent-accent [&::-webkit-slider-thumb]:h-[12px] [&::-webkit-slider-thumb]:w-[12px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
          style={{ background: `linear-gradient(to right, rgb(var(--configThemeColorRgb)) ${total ? (t / total) * 100 : 0}%, #555 0)` }}
        />
        <span className="w-[30px] text-[14px] font-medium">{clock(total)}</span>
        <div ref={speedRef} className="relative">
          <button type="button" aria-haspopup="listbox" aria-expanded={speedOpen} data-testid="player-speed" onClick={() => setSpeedOpen((o) => !o)} className="flex h-[32px] w-[50px] items-center justify-center gap-[2px] rounded-[4px] bg-accent text-[14px]">
            {speed}
            <ChevronDown size={14} />
          </button>
          {speedOpen && (
            <ul role="listbox" className="absolute bottom-[38px] left-1/2 w-[68px] -translate-x-1/2 rounded-[4px] border border-accent bg-bg py-[4px]" data-testid="player-speed-menu">
              {SPEEDS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={s === speed}
                    onClick={() => {
                      setSpeed(s);
                      setSpeedOpen(false);
                    }}
                    className={`h-[28px] w-full text-center text-[14px] ${s === speed ? "bg-accent" : "hover:bg-white/10"}`}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" aria-label={muted ? "Unmute" : "Mute"} data-testid="player-mute" onClick={() => setMuted((m) => !m)} className="text-accent">
          {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
        </button>
        <button type="button" aria-label="Fullscreen" data-testid="player-fullscreen" onClick={() => boxRef.current?.requestFullscreen?.().catch(() => {})} className="text-accent">
          <Maximize size={20} />
        </button>
      </div>
    </div>
  );

  const video = (cls: string) => (
    <div className={`relative overflow-hidden rounded-[20px] bg-[#303234] ${cls}`} data-testid="player-video">
      {loading ? (
        <div className="flex h-full w-full items-center justify-center" role="status" aria-label="Loading video">
          <span className="h-[36px] w-[36px] animate-spin rounded-full border-[3px] border-white/20 border-t-white motion-reduce:animate-none" />
        </div>
      ) : (
        <ImageSlot label={ep.title} className="h-full w-full" />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70" onMouseDown={(e) => e.target === e.currentTarget && onClose()} data-testid="modal-video-player">
      <div ref={boxRef} role="dialog" aria-modal="true" aria-label={ep.title} className={`relative w-[983px] rounded-[20px] bg-surface p-[20px] ${layout === "portrait" ? "mt-[47px] h-[711px]" : "mt-[11px]"}`}>
        <button type="button" aria-label="Close" data-testid="player-close" onClick={onClose} className="absolute -right-[14px] -top-[14px] flex h-[28px] w-[28px] items-center justify-center rounded-full bg-accent">
          <X size={16} strokeWidth={3} />
        </button>
        {layout === "portrait" ? (
          <div className="flex h-full gap-[20px]">
            {video("h-[671px] w-[360px] shrink-0")}
            <div className="flex min-w-0 flex-1 flex-col p-[20px] pr-[0px] pt-[20px]">
              <div className="flex items-start justify-between">
                <h2 className="text-[20px] font-bold">{ep.title}</h2>
                <ShareButton size={30} testid="player-share" />
              </div>
              <div className="mt-auto">{controls}</div>
            </div>
          </div>
        ) : (
          <>
            {video("h-[530px] w-full")}
            <div className="mt-[20px] flex items-start justify-between">
              <div>
                {series && <span className="text-[16px] font-bold text-soft">{series}</span>}
                <h2 className="mt-[14px] text-[20px] font-bold">{ep.title}</h2>
                {ep.description && <p className="mt-[16px] text-[14px]">{ep.description}</p>}
              </div>
              <div className="flex flex-col items-end gap-[14px]">
                <ShareButton size={30} testid="player-share" />
                {ep.releaseDate && <span className="text-[14px]">Release Date: {new Date(`${ep.releaseDate}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
              </div>
            </div>
            <div className="mt-[24px]">{controls}</div>
          </>
        )}
      </div>
    </div>
  );
}
