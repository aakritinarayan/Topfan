/**
 * Mission 4 · Fan Insight Explorer (Audience Insights). Explore, find hidden signals (they glow as
 * you get close), read the pattern, choose what to make next. Every number is fictional game data.
 */
import { useEffect, useState } from "react";
import { PHYS, drawGround, drawMascot, drawPlatform, drawToken, jump, newBody, react, stepBody, type Body, type IconName, type Plat } from "./engine";
import { GameFrame, GameOverlay, useGame, type GameDef } from "./useGame";
import type { MissionProps } from "./CreatorQuest";

const LW = 1600;
type Topic = "tutorial" | "live" | "merch";
export const TOPICS: Record<Topic, { label: string; icon: IconName }> = {
  tutorial: { label: "Tutorial videos", icon: "play" },
  live: { label: "Live Q&A sessions", icon: "live" },
  merch: { label: "Merchandise", icon: "tag" },
};
const PLATS: Plat[] = [
  { x: 380, w: 110, h: 92 },
  { x: 700, w: 90, h: 92 },
  { x: 800, w: 110, h: 180 },
  { x: 1180, w: 110, h: 88 },
  { x: 1350, w: 90, h: 90 },
  { x: 1440, w: 110, h: 172 },
];
const SPOTS: [number, number][] = [
  [250, 16],
  [435, 120],
  [620, 16],
  [855, 208],
  [1040, 16],
  [1235, 116],
  [1495, 200],
];
/** Fictional sampled interactions per signal: tutorial 65, live 25, merch 10 (of 100). */
const DATA: { topic: Topic; n: number }[] = [
  { topic: "tutorial", n: 20 },
  { topic: "live", n: 13 },
  { topic: "tutorial", n: 15 },
  { topic: "merch", n: 10 },
  { topic: "tutorial", n: 18 },
  { topic: "live", n: 12 },
  { topic: "tutorial", n: 12 },
];
export const NEED = 5;

export const ACTIONS = [
  { id: "tutorial", label: "Publish another detailed tutorial", fits: true, why: "It matches the pattern: most sampled interactions were with tutorial videos." },
  { id: "merch", label: "Launch an unrelated merchandise campaign", fits: false, why: "Merchandise drew the fewest sampled interactions, so it's the weakest fit for what fans engage with right now." },
  { id: "event", label: "Organize an unrelated event", fits: false, why: "Nothing in these signals points to demand for an event. Live Q&A is the closest, and still well behind tutorials." },
] as const;

interface Sig {
  x: number;
  h: number;
  topic: Topic;
  n: number;
  got: number;
}
interface S {
  t: number;
  body: Body;
  cam: number;
  signals: Sig[];
  last: Sig | null;
  phase: "explore" | "review" | "decided";
  choice: string | null;
  events: string[];
}

function init(seed: number): S {
  const rot = seed % DATA.length;
  return {
    t: 0,
    body: newBody(90),
    cam: 0,
    signals: SPOTS.map(([x, h], i) => ({ x, h, ...DATA[(i + rot) % DATA.length], got: 0 })),
    last: null,
    phase: "explore",
    choice: null,
    events: [],
  };
}

const got = (s: S) => s.signals.filter((g) => g.got);
export const insightScore = (s: Pick<S, "signals" | "choice">) =>
  s.signals.filter((g) => g.got).length * 40 + (s.choice ? (ACTIONS.find((a) => a.id === s.choice)!.fits ? 120 : 30) : 0);

const def: GameDef<S, { n: number; phase: S["phase"]; last: string | null; totals: Record<Topic, number>; state: string; score: number; choice: string | null }> = {
  init,
  step(s, dt, input, env) {
    s.t += dt;
    const b = s.body;
    const free = s.phase === "explore";
    if (free && input.jump) jump(b);
    stepBody(b, dt, { move: free ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0, platforms: PLATS, minX: 0, maxX: LW, reduced: env.reduced });
    if (free) {
      for (const g of s.signals) {
        if (g.got) continue;
        if (Math.hypot(g.x - b.x, g.h - (b.y + PHYS.SIZE / 2)) < 24) {
          g.got = s.t;
          s.last = g;
          react(b, "collect");
          s.events.push(`token_collected:${g.n} sampled interactions with ${TOPICS[g.topic].label.toLowerCase()} (game data)`);
          if (got(s).length === s.signals.length) {
            s.phase = "review";
            s.events.push("checkpoint_reached:All signals found; reviewing the pattern");
          }
        }
      }
    }
    if (s.phase === "decided" && b.celebrate && b.grounded && b.crouch <= 0 && s.t % 1.2 < 0.6) jump(b);
    const want = Math.max(0, Math.min(LW - env.W, b.x - env.W / 2));
    s.cam += (want - s.cam) * Math.min(1, dt * (env.reduced ? 20 : 5));
  },
  draw(ctx, s, W, H, c) {
    const ground = H - 40;
    const X = (x: number) => x - s.cam;
    const Y = (h: number) => ground - h;
    drawGround(ctx, W, H, ground, s.cam);
    for (const p of PLATS) drawPlatform(ctx, X(p.x), Y(p.h), p.w, c, 0);
    const b = s.body;
    for (const g of s.signals) {
      const x = X(g.x);
      const y = Y(g.h) + Math.sin(s.t * 2.5 + g.x) * 2;
      if (g.got) {
        const a = Math.min(1, (s.t - g.got) / 0.4);
        if (a < 1) drawToken(ctx, x, y - a * 20, TOPICS[g.topic].icon, c, { dim: a, r: 10 });
        continue;
      }
      // Hidden until you're close: a faint spark far away, the full signal nearby.
      const d = Math.hypot(g.x - b.x, g.h - b.y);
      const reveal = Math.max(0, Math.min(1, (170 - d) / 80));
      ctx.save();
      ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.2 * Math.sin(s.t * 3 + g.x)})`;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (reveal > 0) drawToken(ctx, x, y, TOPICS[g.topic].icon, c, { r: 10, dim: 1 - reveal, glow: reveal });
    }
    drawMascot(ctx, X(b.x), Y(b.y), b, c, { lean: (b.vx / PHYS.MAX_VX) * 0.5 });
  },
  ui: (s) => {
    const totals = { tutorial: 0, live: 0, merch: 0 };
    for (const g of got(s)) totals[g.topic] += g.n;
    return {
      n: got(s).length,
      phase: s.phase,
      last: s.last ? `+${s.last.n} interactions · ${TOPICS[s.last.topic].label}` : null,
      totals,
      state: s.body.state,
      score: insightScore(s),
      choice: s.choice,
    };
  },
};

export function InsightExplorer({ run, onComplete, onExit, onEvent, setStage }: MissionProps) {
  const game = useGame(def, run);
  const { ui } = game;
  const [lastShown, setLastShown] = useState<string | null>(null);
  useEffect(() => {
    for (const e of game.state.current.events.splice(0)) {
      const [type, detail] = e.split(/:(.*)/);
      onEvent(type as "token_collected", detail);
    }
  });
  useEffect(() => {
    if (!ui.last) return;
    setLastShown(ui.last);
    const t = setTimeout(() => setLastShown(null), 2200);
    return () => clearTimeout(t);
  }, [ui.last, ui.n]);
  useEffect(() => {
    setStage(ui.phase === "decided" ? "Stage 5 · decision explained" : ui.phase === "review" ? "Stage 3–4 · reading the pattern and deciding" : ui.n ? "Stage 2 · collecting evidence" : "Stage 1 · exploring");
  }, [ui.phase, ui.n, setStage]);
  useEffect(() => game.focus(), [game]);

  const total = ui.totals.tutorial + ui.totals.live + ui.totals.merch || 1;
  const pct = (t: Topic) => Math.round((ui.totals[t] / total) * 100);
  const decide = (id: string) => {
    const s = game.state.current;
    s.choice = id;
    s.phase = "decided";
    const a = ACTIONS.find((x) => x.id === id)!;
    s.body.celebrate = a.fits;
    react(s.body, a.fits ? "yay" : "interact");
    onEvent("decision_made", `${a.label} (${a.fits ? "fits the evidence" : "doesn't fit the evidence"})`);
  };
  const chosen = ACTIONS.find((a) => a.id === ui.choice);

  return (
    <GameFrame
      game={game}
      title="Fan Insight Explorer"
      controls="platform"
      hint={`←/→ or A/D to move, Space to jump. Get close to find hidden signals (${NEED}+ to review the pattern).`}
      score={ui.score}
      height={380}
      mascotState={game.paused ? "paused" : ui.state}
      onExit={onExit}
      onRestart={() => game.restart(run + 1 + Math.floor(Math.random() * 1000))}
      hud={
        <span aria-label={`Signals found ${ui.n} of 7`}>
          Signals <span className="text-white">{ui.n}/7</span>
        </span>
      }
    >
      {ui.phase === "explore" && ui.n >= NEED && (
        <button
          onClick={() => {
            game.state.current.phase = "review";
            onEvent("checkpoint_reached", `Reviewing the pattern with ${ui.n} signals`);
          }}
          className="absolute right-3 top-12 h-[40px] rounded-pill bg-accent px-4 text-[12px] font-black uppercase tracking-caps hover:brightness-110"
        >
          Review the pattern
        </button>
      )}
      {lastShown && ui.phase === "explore" && (
        <div role="status" className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[12px] text-white">
          {lastShown} <span className="text-muted">· game data</span>
        </div>
      )}
      {ui.phase !== "explore" && (
        <GameOverlay label="Fan interest pattern">
          <p className="text-[15px] font-bold">What fans engaged with</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[2px] text-muted">Game data · fictional · {ui.n} signals sampled</p>
          <div className="mt-3 flex flex-col gap-2">
            {(Object.keys(TOPICS) as Topic[]).map((t) => (
              <div key={t} className="text-[12px]">
                <div className="flex justify-between">
                  <span className="text-soft">{TOPICS[t].label}</span>
                  <span className="font-bold">{pct(t)}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg">
                  <div className="quest-meter h-full rounded-full bg-accent" style={{ width: `${pct(t)}%`, opacity: t === "tutorial" ? 1 : 0.55 }} />
                </div>
              </div>
            ))}
          </div>
          {!chosen ? (
            <>
              <p className="mt-4 text-[13px] text-soft">What would you make next?</p>
              <div className="mt-2 flex flex-col gap-2">
                {ACTIONS.map((a) => (
                  <button key={a.id} onClick={() => decide(a.id)} className="min-h-[44px] rounded-pill border border-accent px-4 text-left text-[13px] font-bold hover:bg-accent-tint">
                    {a.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="mt-4 text-[14px] font-bold">{chosen.fits ? "Fits the evidence" : "Doesn't fit the evidence"}</p>
              <p className="mt-1 text-[13px] leading-[19px] text-soft">{chosen.why}</p>
              <button
                onClick={() =>
                  onComplete({ score: ui.score, achievement: chosen.fits ? "Decision backed by evidence" : "Pattern reviewed", outcome: `${chosen.label} (${chosen.fits ? "fits" : "doesn't fit"} the game data)` })
                }
                className="mt-4 h-[44px] rounded-pill bg-accent px-5 text-[13px] font-black uppercase tracking-caps hover:brightness-110"
              >
                Finish mission
              </button>
            </>
          )}
        </GameOverlay>
      )}
    </GameFrame>
  );
}
