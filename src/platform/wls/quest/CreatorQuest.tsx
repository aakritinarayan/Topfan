/**
 * Creator Quest: optional mascot-led mini-games on the provisioning page.
 * Selection → mission → result, all in place (no reload). Never reads or changes provisioning.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Check, Clock, Gamepad2, Play, RotateCcw, Trophy, X } from "lucide-react";
import { useQuest, type MissionResult, type QuestEventType } from "../../../state/questStore";
import { MISSIONS, missionById, type Mission, type MissionId } from "./missions";
import { drawGround, drawMascot, drawToken, newBody, readColors, type IconName } from "./engine";
import { RevenueRush } from "./RevenueRush";
import { SuperfanSignal } from "./SuperfanSignal";
import { FanHQ } from "./FanHQ";
import { InsightExplorer } from "./InsightExplorer";
import { reducedMotion } from "./useGame";
import { drawFx, fxWin, newFx, sfx, stepFx } from "./fx";

export interface MissionProps {
  run: number;
  onComplete: (r: Omit<MissionResult, "at">) => void;
  onExit: () => void;
  onEvent: (type: QuestEventType, detail?: string) => void;
  setStage: (s: string | null) => void;
}

const GAMES: Record<MissionId, (p: MissionProps) => React.ReactElement> = {
  revenue: RevenueRush,
  superfan: SuperfanSignal,
  hq: FanHQ,
  insight: InsightExplorer,
};

/** `compact`: the closed entry is the provisioning card's primary action; the games open full size. */
export function CreatorQuest({ compact }: { compact?: boolean } = {}) {
  const q = useQuest();
  const v = q.view;
  const open = () => {
    q.setView({ kind: "select" });
    q.emit("quest_opened");
  };

  if (v.kind === "closed" && compact)
    return (
      <div className="flex flex-col items-center" data-quest="entry">
        <p className="text-[13px] text-soft">Your site is getting ready. Explore TopFan while you wait.</p>
        <button
          onClick={open}
          data-quest="play"
          className="mt-4 inline-flex h-[52px] items-center gap-2.5 rounded-pill bg-accent px-8 text-[14px] font-black uppercase tracking-caps text-white shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition-[filter,transform] duration-200 hover:-translate-y-px hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-[3px] focus-visible:ring-offset-[#141517] active:translate-y-0"
        >
          <Gamepad2 size={20} strokeWidth={2.25} aria-hidden /> Play Creator Quest
        </button>
      </div>
    );

  if (v.kind === "closed")
    return (
      <div className="flex flex-col items-center text-center" data-quest="entry">
        <p className="text-[15px] font-bold">Explore TopFan while we prepare your site</p>
        <p className="mt-1.5 max-w-[460px] text-[13px] leading-[19px] text-soft">
          Discover ways to grow your fan community and build your creator business through quick interactive challenges.
        </p>
        <button
          onClick={() => {
            q.setView({ kind: "select" });
            q.emit("quest_opened");
          }}
          className="mt-4 inline-flex h-[44px] items-center gap-2 rounded-pill bg-accent px-5 text-[13px] font-black uppercase tracking-caps hover:brightness-110"
        >
          <Play size={14} className="fill-current" /> Play Creator Quest
        </button>
      </div>
    );

  if (v.kind === "select") return <MissionSelect />;

  if (v.kind === "result") return <MissionResultView id={v.id} />;

  const Game = GAMES[v.id];
  return (
    <div className="quest-enter">
      <Game
        key={`${v.id}-${v.run}`}
        run={v.run}
        onEvent={(type, detail) => q.emit(type, v.id, detail)}
        setStage={q.setStage}
        onExit={() => {
          q.emit("mission_exited", v.id);
          q.setStage(null);
          q.setView({ kind: "select" });
        }}
        onComplete={(r) => {
          q.complete(v.id, r);
          q.emit("mission_completed", v.id, `${r.achievement}. ${r.outcome}. Score ${r.score}.`);
          q.setStage(null);
          q.setView({ kind: "result", id: v.id });
        }}
      />
    </div>
  );
}

export function startMission(q: ReturnType<typeof useQuest>, id: MissionId) {
  q.emit("mission_started", id);
  q.setView({ kind: "play", id, run: Date.now() % 100000 });
}

/* ---------------- selection ---------------- */

function MissionSelect() {
  const q = useQuest();
  const [reading, setReading] = useState(false);
  return (
    <div className="quest-enter text-left" data-quest="select">
      <div className="flex items-center gap-1">
        <h3 className="flex-1 text-[16px] font-bold">Choose a Quest</h3>
        <button
          onClick={() => setReading((r) => !r)}
          aria-pressed={reading}
          aria-label={reading ? "Show quests" : "Read instead"}
          title={reading ? "Show quests" : "Read instead"}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent aria-pressed:text-white"
        >
          <BookOpen size={15} />
        </button>
        <button
          onClick={() => q.setView({ kind: "closed" })}
          className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] font-bold text-soft transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X size={14} strokeWidth={2.5} /> Close
        </button>
      </div>
      <QuestProgress />
      {reading ? (
        <ul className="mt-3 flex flex-col gap-2">
          {MISSIONS.map((m) => (
            <li key={m.id} className="rounded-[16px] border border-white/[0.06] bg-[#1b1c1e]/70 px-4 py-3">
              <p className="text-[13px] font-bold">
                {m.name} <span className="font-normal text-muted">· {m.topic}</span>
              </p>
              <p className="mt-1 text-[13px] leading-[19px] text-soft">{m.summary}</p>
              <p className="mt-1 text-[12px] text-muted">In TopFan: {m.feature.where}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {MISSIONS.map((m) => (
            <MissionCard key={m.id} m={m} done={!!q.results[m.id]} best={q.results[m.id]?.score} onPlay={() => startMission(q, m.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MissionCard({ m, done, best, onPlay }: { m: Mission; done: boolean; best?: number; onPlay: () => void }) {
  return (
    <div data-mission={m.id} className="flex flex-col rounded-[18px] border border-white/[0.06] bg-[#1b1c1e]/70 p-3 transition-colors hover:border-white/[0.14] focus-within:border-white/[0.14]">
      <MissionPreview id={m.id} />
      <div className="mt-2 flex items-center gap-2">
        <p className="flex-1 text-[14px] font-bold leading-5">{m.name}</p>
        {done && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white" aria-label="Completed">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent">
              <Check size={10} strokeWidth={3.5} />
            </span>
            Done
          </span>
        )}
      </div>
      <p className="mt-0.5 flex-1 text-[12px] leading-[17px] text-soft">{m.tagline}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        {best != null ? (
          <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-soft" data-achievement>
            <Trophy size={11} className="shrink-0 text-accent" aria-hidden />
            <span className="truncate">
              {m.achievement} · Best <span className="font-bold text-white">{best}</span>
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted">
            <Clock size={11} aria-hidden /> {m.duration}
          </span>
        )}
        <button
          onClick={onPlay}
          aria-label={`Play ${m.name}`}
          className="inline-flex h-[32px] items-center gap-1.5 rounded-pill bg-accent px-3.5 text-[11px] font-black uppercase tracking-caps transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1c1e]"
        >
          <Play size={10} className="fill-current" /> {done ? "Play again" : "Play"}
        </button>
      </div>
    </div>
  );
}

/** One token per quest: the thing the game is about. */
const PREVIEW: Record<MissionId, IconName> = {
  revenue: "tag",
  superfan: "chat",
  hq: "play",
  insight: "bars",
};

/** Tiny live preview in the game's own style: same mascot, ground and tokens. */
function MissionPreview({ id }: { id: MissionId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const c = readColors();
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const b = newBody(0);
    const p = PREVIEW[id];
    let raf = 0;
    const still = reducedMotion();
    const draw = (now: number) => {
      const t = now / 1000;
      ctx.clearRect(0, 0, W, H);
      const ground = H - 10;
      drawGround(ctx, W, H, ground, still ? 0 : t * 20);
      drawToken(ctx, W * 0.62, ground - 24 + (still ? 0 : Math.sin(t * 2) * 2), p, c, { r: 9 });
      b.sq = still ? 0 : Math.sin(t * 2.2) * 0.04;
      b.look = 0.6;
      b.blink = !still && t % 3.2 < 0.12 ? 1 : 0;
      drawMascot(ctx, W * 0.3, ground, b, c, { size: 22, glow: 6 });
      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [id]);
  return <canvas ref={ref} aria-hidden className="h-[56px] w-full" />;
}

/* ---------------- result ---------------- */

/** Picker header line: achievements earned so far, or the champion strip once all four are done. */
function QuestProgress() {
  const q = useQuest();
  const n = MISSIONS.filter((m) => q.results[m.id]).length;
  if (!n) return null;
  if (n === MISSIONS.length)
    return (
      <div data-quest-champion className="mt-3 flex items-center gap-3 rounded-[16px] border border-white/[0.06] bg-[#1b1c1e]/70 px-4 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
          <Trophy size={15} />
        </span>
        <span className="text-[13px]">
          <b>Creator Quest Champion</b> <span className="text-soft">· You've completed all four missions.</span>
        </span>
      </div>
    );
  return (
    <p className="mt-1 text-[12px] text-soft" data-quest-progress>
      {n} of {MISSIONS.length} achievements earned
    </p>
  );
}

const nextQuest = (id: MissionId, done: (m: MissionId) => boolean) => {
  const i = MISSIONS.findIndex((m) => m.id === id);
  const order = [...MISSIONS.slice(i + 1), ...MISSIONS.slice(0, i)];
  return (order.find((m) => !done(m.id)) ?? order[0]).id;
};

function MissionResultView({ id }: { id: MissionId }) {
  const q = useQuest();
  const m = missionById(id);
  const r = q.results[id];
  const saved = q.interests.includes(id);
  const allDone = MISSIONS.every((x) => q.results[x.id]);
  const next = missionById(nextQuest(id, (x) => !!q.results[x]));
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const c = readColors();
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const b = newBody(0);
    b.mood = "yay";
    const still = reducedMotion();
    const fx = newFx();
    fx.reduced = still;
    const ground = H - 12;
    fxWin(fx, W / 2, 20, false);
    sfx("milestone"); // the in-game win already played the bigger fanfare
    let raf = 0;
    let last = performance.now();
    const t0 = last;
    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      stepFx(fx, Math.min(0.033, (now - last) / 1000));
      last = now;
      ctx.clearRect(0, 0, W, H);
      // Victory: three joyful hops, then a calm breathing idle.
      const hop = !still && t < 1.95 ? Math.abs(Math.sin((t / 0.65) * Math.PI)) * 26 : 0;
      b.sq = still ? 0 : hop > 2 ? 0.08 : Math.sin(t * 2.2) * 0.035;
      b.look = 0;
      b.mood = t < 2.4 ? "yay" : "happy";
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(W / 2 - 40, ground, 80, 1);
      ctx.restore();
      drawMascot(ctx, W / 2, ground - hop, b, c, { size: 34 });
      drawFx(ctx, fx, (x) => x, (h) => ground - h, W, c);
      if (!still || fx.parts.length) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  const lastScore = r?.last ?? r?.score;
  return (
    <div className="quest-enter flex flex-col items-center text-center" data-quest="result">
      <canvas ref={ref} aria-hidden className="h-[110px] w-full max-w-[420px]" />
      <p className="text-[22px] font-bold" data-quest-complete>
        Quest Complete!
      </p>
      <div className="quest-badge mt-4 flex items-center gap-3 rounded-pill border border-white/[0.08] bg-[#1b1c1e]/80 py-2 pl-2 pr-5 text-left" data-achievement-unlocked>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent shadow-[0_0_20px_rgb(var(--configThemeColorRgb)/0.45)]">
          <Trophy size={18} />
        </span>
        <span>
          <span className="block text-[10px] font-bold uppercase tracking-[2px] text-muted">Achievement unlocked</span>
          <span className="block text-[15px] font-bold leading-5">{m.achievement}</span>
        </span>
      </div>
      <p className="mt-3 text-[14px] text-soft">{m.achievementLine}</p>
      {r && (
        <p className="mt-3 text-[13px] text-soft" data-final-score>
          Score <span className="text-[18px] font-bold text-white">{lastScore}</span>
          {r.score > (lastScore ?? 0) && <span className="text-muted"> · Best {r.score}</span>}
          <span className="text-muted"> · Creator Quest points</span>
        </p>
      )}
      {r?.objectives?.length ? (
        <ul className="mt-3 flex flex-col items-start gap-1 text-left text-[13px]" aria-label="Objectives completed">
          {r.objectives.map((o) => (
            <li key={o} className="flex items-center gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent">
                <Check size={10} strokeWidth={3.5} />
              </span>
              {o}
            </li>
          ))}
        </ul>
      ) : null}
      {allDone && (
        <div data-quest-champion className="mt-4 flex items-center gap-3 rounded-[16px] border border-accent/40 bg-accent-tint px-4 py-2.5 text-left">
          <Trophy size={18} className="shrink-0 text-accent" />
          <span className="text-[13px]">
            <b>Creator Quest Champion</b>
            <span className="block text-soft">You've completed all four missions.</span>
          </span>
        </div>
      )}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {allDone ? (
          <button onClick={() => q.setView({ kind: "closed" })} className="inline-flex h-[44px] items-center gap-1.5 rounded-pill bg-accent px-5 text-[12px] font-black uppercase tracking-caps hover:brightness-110">
            Continue setup <ArrowRight size={14} />
          </button>
        ) : (
          <button onClick={() => startMission(q, next.id)} aria-label={`Play next quest: ${next.name}`} className="inline-flex h-[44px] items-center gap-1.5 rounded-pill bg-accent px-5 text-[12px] font-black uppercase tracking-caps hover:brightness-110">
            <Play size={12} className="fill-current" /> Play next quest
          </button>
        )}
        <button onClick={() => startMission(q, id)} className="inline-flex h-[44px] items-center gap-1.5 rounded-pill border border-line px-4 text-[12px] font-black uppercase tracking-caps hover:border-accent">
          <RotateCcw size={13} /> Replay
        </button>
        <button onClick={() => q.setView({ kind: "select" })} className="inline-flex h-[44px] items-center gap-1.5 rounded-pill px-3 text-[12px] font-bold text-soft hover:text-white">
          Back to quests
        </button>
      </div>
      <button onClick={() => q.toggleInterest(id)} aria-pressed={saved} className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-white">
        {saved && <Check size={12} strokeWidth={3} className="text-accent" />}
        {saved ? `Saved: explore ${m.feature.label} after launch` : `Explore ${m.feature.label} after launch`}
      </button>
    </div>
  );
}
