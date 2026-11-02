/**
 * Mission 2 · Superfan Signal (Community Engagement). Free movement with Launch Run's jump: pick up
 * fan signals and carry each to the fan group that cares about it. Wrong stations just say so.
 */
import { useEffect } from "react";
import { PHYS, drawGround, drawMascot, drawPlatform, drawToken, jump, newBody, react, stepBody, type Body, type IconName, type Plat } from "./engine";
import { GameFrame, GameOverlay, useGame, type GameDef } from "./useGame";
import type { MissionProps } from "./CreatorQuest";

type Kind = "bts" | "live" | "updates";
export const KINDS: Record<Kind, { label: string; icon: IconName; feature: string }> = {
  bts: { label: "Behind-the-scenes", icon: "camera", feature: "Feed posts" },
  live: { label: "Live interactions", icon: "live", feature: "Livestream" },
  updates: { label: "Exclusive updates", icon: "mail", feature: "Newsletters" },
};

const LW = 720; // level width
const PLATS: Plat[] = [
  { x: 30, w: 130, h: 78, id: "p1" },
  { x: 195, w: 105, h: 160 },
  { x: 420, w: 105, h: 160 },
  { x: 560, w: 130, h: 78, id: "p4" },
  { x: 300, w: 120, h: 238, id: "p5" },
];
const STATIONS: { kind: Kind; x: number; h: number }[] = [
  { kind: "bts", x: 95, h: 78 },
  { kind: "live", x: 360, h: 238 },
  { kind: "updates", x: 625, h: 78 },
];
/** Spawn spots for signals (x, height). */
const SPOTS: [number, number][] = [
  [250, 14],
  [470, 14],
  [247, 186],
  [472, 186],
  [360, 14],
  [140, 14],
  [600, 14],
];
const SEQ: Kind[][] = [
  ["live", "bts", "updates", "bts", "updates", "live"],
  ["updates", "live", "bts", "live", "bts", "updates"],
  ["bts", "updates", "live", "updates", "live", "bts"],
];
const TOTAL = 6;

interface Sig {
  kind: Kind;
  x: number;
  h: number;
  born: number;
}
interface S {
  t: number;
  body: Body;
  queue: Kind[];
  spotI: number;
  signals: Sig[];
  carry: Kind | null;
  matches: Record<Kind, number>;
  made: number;
  wrong: number;
  shake: { kind: Kind; t: number } | null;
  near: Kind | null;
  msg: { text: string; t: number } | null;
  done: number; // time of completion, 0 = not done
  events: string[];
}

function spawn(s: S) {
  while (s.signals.length < 3 && s.queue.length) {
    const kind = s.queue.shift()!;
    const [x, h] = SPOTS[s.spotI++ % SPOTS.length];
    s.signals.push({ kind, x, h, born: s.t });
  }
}

function init(seed: number): S {
  const s: S = {
    t: 0,
    body: newBody(360),
    queue: [...SEQ[seed % SEQ.length]],
    spotI: seed % 3,
    signals: [],
    carry: null,
    matches: { bts: 0, live: 0, updates: 0 },
    made: 0,
    wrong: 0,
    shake: null,
    near: null,
    msg: null,
    done: 0,
    events: [],
  };
  spawn(s);
  return s;
}

export const superfanScore = (s: Pick<S, "made" | "wrong">) => Math.max(0, s.made * 100 - s.wrong * 10);

const def: GameDef<S, { made: number; wrong: number; carry: Kind | null; near: Kind | null; msg: string | null; done: boolean; state: string; score: number }> = {
  init,
  step(s, dt, input, env) {
    s.t += dt;
    const b = s.body;
    if (!s.done && input.jump) jump(b);
    stepBody(b, dt, { move: s.done ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0), platforms: PLATS, minX: 0, maxX: LW, reduced: env.reduced });

    // Pick up a signal by touching it (one at a time).
    if (!s.carry && !s.done) {
      const i = s.signals.findIndex((g) => Math.hypot(g.x - b.x, g.h - (b.y + PHYS.SIZE / 2)) < 24);
      if (i >= 0) {
        s.carry = s.signals[i].kind;
        s.signals.splice(i, 1);
        react(b, "collect");
        s.events.push(`token_collected:${KINDS[s.carry].label} signal`);
      }
    }
    // Near a station?
    const st = STATIONS.find((x) => Math.abs(x.x - b.x) < 46 && Math.abs(x.h - b.y) < 8 && b.grounded);
    s.near = st?.kind ?? null;
    if (input.interact && st && s.carry && !s.done) {
      if (st.kind === s.carry) {
        s.matches[st.kind] += 1;
        s.made += 1;
        s.carry = null;
        react(b, "interact");
        s.msg = { text: `Connected: ${KINDS[st.kind].label.toLowerCase()} fans`, t: s.t };
        s.events.push(`decision_made:Matched a ${KINDS[st.kind].label} signal (correct)`);
        spawn(s);
        if (s.made >= TOTAL) {
          s.done = s.t;
          b.celebrate = true;
          react(b, "yay");
        }
      } else {
        s.wrong += 1;
        s.shake = { kind: st.kind, t: s.t };
        s.msg = { text: `These fans want ${KINDS[st.kind].label.toLowerCase()}. Try another group.`, t: s.t };
        b.sqv -= 3;
        s.events.push(`decision_made:Tried a ${KINDS[s.carry].label} signal at the ${KINDS[st.kind].label} group (not a match)`);
      }
    } else if (input.interact && st && !s.carry && !s.done) {
      s.msg = { text: `Find a ${KINDS[st.kind].label.toLowerCase()} signal for this group.`, t: s.t };
    }
    if (s.msg && s.t - s.msg.t > 2.4) s.msg = null;
    // Celebration hops.
    if (s.done && b.grounded && b.crouch <= 0 && s.t - s.done < 2) jump(b);
  },
  draw(ctx, s, W, H, c) {
    const ground = H - 40;
    const ox = Math.round((W - LW) / 2);
    const X = (x: number) => ox + x;
    const Y = (h: number) => ground - h;
    drawGround(ctx, W, H, ground, 0);

    // Network: thin lines between groups that have connections, brighter as it grows.
    const active = STATIONS.filter((st) => s.matches[st.kind] > 0);
    ctx.save();
    for (let i = 0; i < active.length; i++)
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i];
        const z = active[j];
        ctx.strokeStyle = `rgba(${c.accentRgb},${0.18 + 0.1 * Math.min(s.matches[a.kind], s.matches[z.kind])})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(X(a.x), Y(a.h) - 34);
        ctx.quadraticCurveTo(X((a.x + z.x) / 2), Y(Math.max(a.h, z.h)) - 70, X(z.x), Y(z.h) - 34);
        ctx.stroke();
      }
    ctx.restore();

    for (const p of PLATS) drawPlatform(ctx, X(p.x), Y(p.h), p.w, c, STATIONS.some((st) => st.h === p.h && Math.abs(st.x - (p.x + p.w / 2)) < 10 && s.matches[st.kind] > 0) ? 1 : 0);

    // Stations: node + icon + fan dots that light up with each correct connection.
    for (const st of STATIONS) {
      const shake = s.shake && s.shake.kind === st.kind ? Math.max(0, 1 - (s.t - s.shake.t) / 0.4) : 0;
      const x = X(st.x) + Math.sin(s.t * 40) * 3 * shake;
      const y = Y(st.h) - 34;
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, Y(st.h));
      ctx.lineTo(x, y + 13);
      ctx.stroke();
      ctx.restore();
      drawToken(ctx, x, y, KINDS[st.kind].icon, c, { r: 13, filled: s.matches[st.kind] > 0, glow: s.near === st.kind ? 1 : 0 });
      const lit = s.matches[st.kind] * 2;
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI * 0.95 + (i / 3) * Math.PI * 0.9;
        const fx = x + Math.cos(a) * 30;
        const fy = y + Math.sin(a) * 22 - 4;
        ctx.save();
        if (i < lit) {
          ctx.strokeStyle = `rgba(${c.accentRgb},0.7)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(fx, fy);
          ctx.stroke();
        }
        ctx.fillStyle = i < lit ? "#fff" : "rgba(255,255,255,0.2)";
        ctx.beginPath();
        ctx.arc(fx, fy, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.fillStyle = s.matches[st.kind] > 0 ? "#fff" : "rgba(255,255,255,0.55)";
      ctx.font = "600 10px Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(KINDS[st.kind].label.toUpperCase(), x, y - 34);
      ctx.restore();
    }

    for (const g of s.signals) {
      const a = Math.min(1, (s.t - g.born) / 0.4);
      drawToken(ctx, X(g.x), Y(g.h) + Math.sin(s.t * 3 + g.x) * 2, KINDS[g.kind].icon, c, { r: 10 * (0.6 + a * 0.4), dim: 1 - a });
    }

    const b = s.body;
    drawMascot(ctx, X(b.x), Y(b.y), b, c, { lean: (b.vx / PHYS.MAX_VX) * 0.5 });
    if (s.carry) {
      const k = 0.5 + 0.5 * Math.sin(s.t * 4);
      drawToken(ctx, X(b.x), Y(b.y) - PHYS.SIZE - 16 - k * 2, KINDS[s.carry].icon, c, { r: 9, glow: k });
    }
    if (s.near && s.carry) {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "500 11px Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("E · connect", X(b.x), Y(b.y) - PHYS.SIZE - 34);
      ctx.restore();
    }
  },
  ui: (s) => ({ made: s.made, wrong: s.wrong, carry: s.carry, near: s.near, msg: s.msg?.text ?? null, done: !!s.done, state: s.body.state, score: superfanScore(s) }),
};

export function SuperfanSignal({ run, onComplete, onExit, onEvent, setStage }: MissionProps) {
  const game = useGame(def, run);
  const { ui } = game;
  useEffect(() => {
    const s = game.state.current;
    for (const e of s.events.splice(0)) {
      const [type, detail] = e.split(/:(.*)/);
      onEvent(type as "token_collected" | "decision_made", detail);
    }
  });
  useEffect(() => {
    setStage(ui.done ? "Stage 5 · community result" : ui.made === 0 ? (ui.carry ? "Stage 3 · matching signals" : "Stage 2 · collecting signals") : "Stage 4 · growing the network");
  }, [ui.made, ui.carry, ui.done, setStage]);
  useEffect(() => game.focus(), [game]);

  return (
    <GameFrame
      game={game}
      title="Superfan Signal"
      controls="platform"
      hint="←/→ or A/D to move, Space to jump, E to connect at a fan group."
      score={ui.score}
      mascotState={game.paused ? "paused" : ui.state}
      height={380}
      onExit={onExit}
      onRestart={() => game.restart(run + 1 + Math.floor(Math.random() * 1000) * 3)}
      hud={
        <span className="flex items-center gap-2" aria-label={`Engagement: ${ui.made} of ${TOTAL} connections`}>
          Engagement
          <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(ui.made / TOTAL) * 100}%` }} />
          </span>
          <span className="text-white">{ui.made}/{TOTAL}</span>
        </span>
      }
    >
      {ui.msg && (
        <div role="status" className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[12px] text-white">
          {ui.msg}
        </div>
      )}
      {ui.done && (
        <GameOverlay label="Community result">
          <p className="text-[15px] font-bold">Your fan network is active</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[2px] text-muted">Simulated result · game data</p>
          <ul className="mt-3 flex flex-col gap-1 text-[13px] text-soft">
            <li>Groups reached with what they care about: 3 of 3</li>
            <li>Relevant connections made: {ui.made}</li>
            <li>Mismatched tries: {ui.wrong}</li>
          </ul>
          <button
            onClick={() =>
              onComplete({
                score: ui.score,
                achievement: ui.wrong === 0 ? "Every signal matched first try" : "All fan groups connected",
                outcome: `${ui.made} relevant connections, ${ui.wrong} mismatched tries`,
              })
            }
            className="mt-4 h-[44px] rounded-pill bg-accent px-5 text-[13px] font-black uppercase tracking-caps hover:brightness-110"
          >
            Finish mission
          </button>
        </GameOverlay>
      )}
    </GameFrame>
  );
}
