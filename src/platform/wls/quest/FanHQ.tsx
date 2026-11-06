/**
 * Mission 3 · Build Your Fan HQ (Brand Ownership). A small puzzle-platformer: activate each creator
 * activity, which lights a rail to the central hub; when all are linked, steps rise to the hub.
 * The hub is an illustration, not the creator's actual site design.
 */
import { useEffect } from "react";
import { PHYS, drawGround, drawMascot, drawPlatform, drawRock, drawToken, hitsRock, jump, makeRock, newBody, react, rng, stepBody, type Body, type IconName, type Plat, type Rock } from "./engine";
import { GameFrame, GameOverlay, useGame, type GameDef } from "./useGame";
import { drawFx, fxCollect, fxHit, fxMilestone, fxToast, fxWin, newFx, shakeOffset, stepFx, type Fx } from "./fx";
import type { MissionProps } from "./CreatorQuest";

const LW = 1500;
type Act = "content" | "community" | "experiences" | "store";
export const ACTS: Record<Act, { label: string; icon: IconName }> = {
  content: { label: "Content", icon: "play" },
  community: { label: "Community", icon: "chat" },
  experiences: { label: "Fan experiences", icon: "ticket" },
  store: { label: "Store", icon: "bag" },
};
const BASE: (Plat & { act?: Act })[] = [
  { x: 190, w: 130, h: 82, act: "content" },
  { x: 30, w: 120, h: 170, act: "community" },
  { x: 1180, w: 130, h: 82, act: "experiences" },
];
/** Appears once Fan experiences is active (a small "unlock" puzzle). */
const STORE: Plat & { act: Act } = { x: 1350, w: 120, h: 170, act: "store" };
const STEPS: Plat[] = [
  { x: 500, w: 95, h: 85 },
  { x: 615, w: 80, h: 168 },
];
const HUB: Plat = { x: 700, w: 130, h: 250, id: "hub" };
const HUB_X = HUB.x + HUB.w / 2;

interface S {
  t: number;
  body: Body;
  cam: number;
  active: Partial<Record<Act, number>>;
  storeAt: number;
  stepsAt: number;
  hubAt: number;
  rocks: { x: number; rock: Rock; hitT: number }[];
  stumbles: number;
  near: Act | null;
  msg: { text: string; t: number } | null;
  events: string[];
  fx: Fx;
}

function init(seed: number): S {
  const R = rng(seed * 104729 + 7);
  return {
    t: 0,
    body: newBody(470),
    cam: 0,
    active: {},
    storeAt: 0,
    stepsAt: 0,
    hubAt: 0,
    rocks: [380, 960, 1080].map((x) => ({ x: x + R.range(-20, 20), rock: makeRock(0, R.range(30, 40), R.range(13, 18), R.next), hitT: -9 })),
    stumbles: 0,
    near: null,
    msg: null,
    events: [],
    fx: newFx(),
  };
}

const platsOf = (s: S): Plat[] => [...BASE, ...(s.storeAt ? [STORE] : []), ...(s.stepsAt ? STEPS : []), HUB];
const count = (s: S) => Object.keys(s.active).length;
export const hqScore = (s: Pick<S, "active" | "hubAt" | "stumbles">) => Math.max(0, Object.keys(s.active).length * 100 + (s.hubAt ? 200 : 0) - s.stumbles * 10);

const CELEBRATE_S = 1.4;

const def: GameDef<S, { n: number; near: Act | null; msg: string | null; hub: boolean; state: string; score: number; store: boolean; steps: boolean; toast: Fx["toast"]; pop: number }> = {
  init,
  step(s, dt, input, env) {
    s.t += dt;
    s.fx.reduced = env.reduced;
    stepFx(s.fx, dt);
    const b = s.body;
    if (!s.hubAt && input.jump) jump(b);
    stepBody(b, dt, { move: s.hubAt ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0), platforms: platsOf(s), minX: 0, maxX: LW, reduced: env.reduced });
    for (const r of s.rocks) {
      // 1s of protection per rock after a bump, so one stumble never counts twice.
      if (s.t - r.hitT > 1 && hitsRock(b, r.x, 0, r.rock)) {
        r.hitT = s.t;
        s.stumbles += 1;
        react(b, "hit");
        fxHit(s.fx, r.x + r.rock.w / 2, r.rock.h * 0.6, 10);
        b.vx = -b.face * 120;
      }
    }
    const danger = s.rocks.find((r) => s.t - r.hitT > 1 && b.grounded && Math.sign(r.x + r.rock.w / 2 - b.x) === Math.sign(b.vx) && Math.abs(r.x + r.rock.w / 2 - b.x) < 70 && Math.abs(b.vx) > 60);
    if (danger && b.y < 4) react(b, "alert");
    const here = [...BASE, ...(s.storeAt ? [STORE] : [])].find((p) => p.act && b.grounded && b.on === p);
    s.near = here?.act ?? null;
    if (input.interact && here?.act) {
      const act = here.act;
      if (s.active[act]) s.msg = { text: `${ACTS[act].label} is already linked to your hub.`, t: s.t };
      else {
        s.active[act] = s.t;
        react(b, "interact");
        fxCollect(s.fx, here.x + here.w / 2, here.h + 26, 100, ACTS[act].icon);
        s.events.push(`token_collected:${ACTS[act].label} linked`);
        s.msg = { text: `${ACTS[act].label} linked to your hub.`, t: s.t };
        if (act === "experiences" && !s.storeAt) {
          s.storeAt = s.t;
          s.msg = { text: "Fan experiences linked. A path to your Store appeared.", t: s.t };
          fxToast(s.fx, "New path unlocked!");
        }
        if (count(s) === 4) {
          s.stepsAt = s.t;
          s.events.push("checkpoint_reached:All activities linked; path to the hub opened");
          s.msg = { text: "Everything is linked. Climb to your fan HQ.", t: s.t };
          react(b, "yay");
          fxMilestone(s.fx, b.x, b.y, "Path to your HQ opened!");
        }
      }
    }
    if (!s.hubAt && b.grounded && b.on === HUB) {
      s.hubAt = s.t;
      b.celebrate = true;
      react(b, "yay");
      fxWin(s.fx, b.x, b.y);
      fxCollect(s.fx, b.x + 40, b.y + 30, 200, "star");
      s.events.push("decision_made:Reached the fan HQ");
    }
    if (s.hubAt && b.grounded && b.crouch <= 0 && s.t - s.hubAt < 1.6) jump(b);
    if (s.msg && s.t - s.msg.t > 3) s.msg = null;
    // Camera follows smoothly.
    const W = env.W;
    const want = Math.max(0, Math.min(LW - W, b.x - W / 2));
    s.cam += (want - s.cam) * Math.min(1, dt * (env.reduced ? 20 : 5));
  },
  draw(ctx, s, W, H, c) {
    const ground = H - 40;
    const X = (x: number) => x - s.cam;
    const Y = (h: number) => ground - h;
    const [kx, ky] = shakeOffset(s.fx);
    ctx.save();
    ctx.translate(kx, ky);
    drawGround(ctx, W, H, ground, s.cam);

    // Rails: each linked activity draws a dashed rail to the hub, filling in over 0.8s.
    const hubY = Y(HUB.h) - 30;
    for (const p of [...BASE, STORE]) {
      const at = s.active[p.act!];
      const cx = X(p.x + p.w / 2);
      const cy = Y(p.h) - 26;
      ctx.save();
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo((cx + X(HUB_X)) / 2, Math.min(cy, hubY) - 60, X(HUB_X), hubY);
      ctx.stroke();
      if (at) {
        const k = Math.min(1, (s.t - at) / 0.8);
        ctx.strokeStyle = `rgba(${c.accentRgb},0.85)`;
        ctx.shadowColor = `rgba(${c.accentRgb},0.7)`;
        ctx.shadowBlur = 6;
        ctx.setLineDash([]);
        ctx.beginPath();
        const N = 30;
        for (let i = 0; i <= N * k; i++) {
          const u = i / N;
          const mx = (cx + X(HUB_X)) / 2;
          const my = Math.min(cy, hubY) - 60;
          const px = (1 - u) * (1 - u) * cx + 2 * (1 - u) * u * mx + u * u * X(HUB_X);
          const py = (1 - u) * (1 - u) * cy + 2 * (1 - u) * u * my + u * u * hubY;
          if (i) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const r of s.rocks) drawRock(ctx, X(r.x), ground, r.rock, c);
    for (const p of BASE) drawPlatform(ctx, X(p.x), Y(p.h), p.w, c, s.active[p.act!] ? 1 : 0);
    if (s.storeAt) {
      const k = Math.min(1, (s.t - s.storeAt) / 0.6);
      ctx.save();
      ctx.globalAlpha = k;
      drawPlatform(ctx, X(STORE.x), Y(STORE.h) + (1 - k) * 20, STORE.w, c, s.active.store ? 1 : 0);
      ctx.restore();
    }
    if (s.stepsAt) {
      STEPS.forEach((p, i) => {
        const k = Math.min(1, Math.max(0, (s.t - s.stepsAt - i * 0.25) / 0.5));
        ctx.save();
        ctx.globalAlpha = k;
        drawPlatform(ctx, X(p.x), Y(p.h) + (1 - k) * 16, p.w, c, 0.5);
        ctx.restore();
      });
    }
    drawPlatform(ctx, X(HUB.x), Y(HUB.h), HUB.w, c, s.hubAt ? 1 : 0);

    // Activity beacons.
    for (const p of [...BASE, ...(s.storeAt ? [STORE] : [])]) {
      const on = !!s.active[p.act!];
      drawToken(ctx, X(p.x + p.w / 2), Y(p.h) - 26, ACTS[p.act!].icon, c, { r: 11, filled: on, glow: s.near === p.act ? 1 : 0 });
      ctx.save();
      ctx.fillStyle = on ? "#fff" : "rgba(255,255,255,0.55)";
      ctx.font = "600 10px Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(ACTS[p.act!].label.toUpperCase(), X(p.x + p.w / 2), Y(p.h) - 44);
      ctx.restore();
    }

    // Hub: a ring that fills as activities link; restrained red glow once reached.
    const n = count(s);
    ctx.save();
    const hx = X(HUB_X);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.arc(hx, hubY, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = c.accent;
    if (s.hubAt) {
      ctx.shadowColor = `rgba(${c.accentRgb},0.8)`;
      ctx.shadowBlur = 18 + 6 * Math.sin(s.t * 3);
    }
    ctx.beginPath();
    ctx.arc(hx, hubY, 20, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * n) / 4);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = s.hubAt ? "#fff" : "rgba(255,255,255,0.5)";
    ctx.font = "700 9px Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FAN HQ", hx, hubY + 3);
    ctx.restore();

    const b = s.body;
    drawMascot(ctx, X(b.x), Y(b.y), b, c, { lean: (b.vx / PHYS.MAX_VX) * 0.5 });
    if (s.near && !s.active[s.near]) {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "500 11px Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("E · link to hub", X(b.x), Y(b.y) - PHYS.SIZE - 12);
      ctx.restore();
    }
    ctx.restore();
    drawFx(ctx, s.fx, X, Y, W, c);
  },
  ui: (s) => ({
    n: count(s),
    near: s.near,
    msg: s.msg?.text ?? null,
    hub: !!s.hubAt && s.t - s.hubAt > CELEBRATE_S,
    state: s.body.state,
    score: hqScore(s),
    store: !!s.storeAt,
    steps: !!s.stepsAt,
    toast: s.fx.toast,
    pop: s.fx.scorePop,
  }),
};

export function FanHQ({ run, onComplete, onExit, onEvent, setStage }: MissionProps) {
  const game = useGame(def, run);
  const { ui } = game;
  useEffect(() => {
    for (const e of game.state.current.events.splice(0)) {
      const [type, detail] = e.split(/:(.*)/);
      onEvent(type as "token_collected", detail);
    }
  });
  useEffect(() => {
    setStage(ui.hub ? "Stage 4 · fan HQ active" : ui.steps ? "Stage 3 · reaching the fan HQ" : ui.n ? "Stage 2 · activating connections" : "Stage 1 · scattered creator world");
  }, [ui.n, ui.hub, ui.steps, setStage]);
  useEffect(() => game.focus(), [game]);

  return (
    <GameFrame
      game={game}
      title="Build Your Fan HQ"
      controls="platform"
      hint="←/→ or A/D to move, Space to jump, E to link an activity. Explore left and right."
      intro="Link all four activities to your hub (press E on each), then climb to your fan HQ. Mind the rocks."
      toast={ui.toast}
      pop={ui.pop}
      score={ui.score}
      height={380}
      mascotState={game.paused ? "paused" : ui.state}
      onExit={onExit}
      onRestart={() => game.restart(run + 1 + Math.floor(Math.random() * 1000))}
      hud={
        <span aria-label={`Linked ${ui.n} of 4`}>
          Linked <span className="text-white">{ui.n}/4</span>
        </span>
      }
    >
      {ui.msg && !ui.hub && (
        <div role="status" className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[12px] text-white">
          {ui.msg}
        </div>
      )}
      {ui.hub && (
        <GameOverlay label="Your fan HQ">
          <p className="text-[15px] font-bold">One home for your fans</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[2px] text-muted">Illustration · not your site design</p>
          <div className="mx-auto mt-4 grid w-[260px] grid-cols-3 grid-rows-3 place-items-center gap-1 text-[11px] font-bold">
            <span className="col-start-2 rounded-full border border-line px-2.5 py-1">Content</span>
            <span className="col-start-1 row-start-2 rounded-full border border-line px-2.5 py-1">Community</span>
            <span className="col-start-2 row-start-2 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-center text-[10px] leading-3">
              Your
              <br />
              fan HQ
            </span>
            <span className="col-start-3 row-start-2 rounded-full border border-line px-2.5 py-1">Store</span>
            <span className="col-start-2 row-start-3 rounded-full border border-line px-2.5 py-1">Experiences</span>
          </div>
          <p className="mt-4 text-[13px] leading-[19px] text-soft">Your posts, community, experiences and store, together under your own domain.</p>
          <button
            onClick={() =>
              onComplete({
                score: ui.score,
                achievement: "Fan HQ Builder",
                outcome: "Linked content, community, experiences and store to one hub",
                objectives: ["4 of 4 activities linked", "Reached your fan HQ"],
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
