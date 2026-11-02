/**
 * Mission 1 · Fan Revenue Rush (Monetization). Launch Run's runner: jump rocks, collect offer tokens,
 * reach the station, read a (fictional) fan request, launch the matching offer.
 */
import { useEffect } from "react";
import { Lock, Tag, Ticket } from "lucide-react";
import { PHYS, drawGround, drawMascot, drawRock, drawToken, hitsRock, jump, makeRock, newBody, react, rng, stepBody, type Body, type IconName, type Rock } from "./engine";
import { GameFrame, GameOverlay, useGame, type GameDef } from "./useGame";
import type { MissionProps } from "./CreatorQuest";
import { spaceMotion } from "../SpaceBackdrop";

type Cat = "exclusive" | "merch" | "experience";
export const CATS: Record<Cat, { label: string; icon: IconName }> = {
  exclusive: { label: "Exclusive content", icon: "lock" },
  merch: { label: "Merchandise", icon: "tag" },
  experience: { label: "Fan experiences", icon: "ticket" },
};
const ORDER: Cat[] = ["exclusive", "merch", "experience"];

/** Curated, fictional fan requests (varied per play). */
export const SCENARIOS: { request: string; best: Cat; feature: string }[] = [
  { request: "Your fans are asking for more detailed behind-the-scenes videos.", best: "exclusive", feature: "Subscriptions or VIP Offers" },
  { request: "Fans keep asking where to get the hoodie from your last clip.", best: "merch", feature: "Merchandise" },
  { request: "Fans want to join you at your next training day on the mountain.", best: "experience", feature: "Experiences or Events & Ticketing" },
];

const PLAYER_X = 90;
const STATION_X = 3300;

interface S {
  scenario: number;
  phase: "ready" | "run" | "station" | "decide" | "resolve";
  t: number;
  body: Body;
  dist: number;
  speed: number;
  rocks: { x: number; rock: Rock; hit: boolean }[];
  tokens: { x: number; h: number; cat: Cat; got: number }[];
  inv: Record<Cat, number>;
  hits: number;
  choice: Cat | null;
  events: string[];
}

function init(seed: number): S {
  const R = rng(seed * 7919 + 13);
  const rocks: S["rocks"] = [];
  const tokens: S["tokens"] = [];
  let x = 700;
  let k = seed % 3;
  while (x < STATION_X - 400) {
    const rock = makeRock(0, R.range(30, 44), R.range(13, 21), R.next);
    rocks.push({ x, rock, hit: false });
    // Tokens: one arc over the rock (needs a jump) or a low row between rocks.
    const cat = ORDER[k++ % 3];
    if (R.next() < 0.55) {
      for (let i = -1; i <= 1; i++) tokens.push({ x: x + rock.w / 2 + i * 34, h: 62 + (i === 0 ? 22 : 8), cat, got: 0 });
    } else {
      const gap = R.range(170, 230);
      for (let i = 0; i < 2; i++) tokens.push({ x: x + gap + i * 36, h: 16, cat, got: 0 });
    }
    x += R.range(430, 600);
  }
  return {
    scenario: seed % SCENARIOS.length,
    phase: "ready",
    t: 0,
    body: newBody(PLAYER_X),
    dist: 0,
    speed: 0,
    rocks,
    tokens,
    inv: { exclusive: 0, merch: 0, experience: 0 },
    hits: 0,
    choice: null,
    events: [],
  };
}

export const scoreOf = (s: Pick<S, "inv" | "hits" | "choice" | "scenario">) => {
  const tokens = s.inv.exclusive + s.inv.merch + s.inv.experience;
  const fit = s.choice == null ? 0 : s.choice === SCENARIOS[s.scenario].best ? 50 : 15;
  return Math.max(0, tokens * 10 + fit - s.hits * 5);
};

const def: GameDef<S, { phase: S["phase"]; inv: S["inv"]; score: number; state: string; scenario: number; choice: Cat | null }> = {
  init,
  step(s, dt, input, env) {
    s.t += dt;
    const b = s.body;
    if (input.jump && (s.phase === "run" || s.phase === "ready")) {
      if (s.phase === "ready") s.phase = "run";
      jump(b);
    }
    if (s.phase === "ready" && s.t > 1.4) s.phase = "run";

    if (s.phase === "run") {
      const target = b.stumble > 0 ? 170 : Math.min(380, 300 + s.dist * 0.02);
      s.speed += (target - s.speed) * Math.min(1, dt * (b.stumble > 0 ? 8 : 2.5));
      // Slow to a stop at the station.
      const toStation = STATION_X - (s.dist + PLAYER_X);
      if (toStation < 220) s.speed = Math.min(s.speed, Math.max(0, toStation * 1.6));
      s.dist += s.speed * dt;
      if (toStation <= 2 && b.grounded) {
        s.phase = "station";
        s.t = 0;
        s.events.push("checkpoint_reached");
      }
    }
    if (s.phase === "station" && s.t > 0.7) s.phase = "decide";
    spaceMotion.rate = s.phase === "run" ? s.speed * 0.05 : 0;

    b.x = PLAYER_X + s.dist; // world position
    stepBody(b, dt, { auto: true, reduced: env.reduced, jumpV: s.phase === "resolve" ? 480 : undefined });
    if (s.phase !== "run") b.state = s.phase === "resolve" && b.celebrate ? "celebrating" : b.grounded ? (b.state === "landing" ? "landing" : "idle") : b.state;
    if (s.phase === "run" && b.state === "idle") b.state = "running";

    if (s.phase === "run") {
      for (const r of s.rocks) {
        if (!r.hit && hitsRock(b, r.x, 0, r.rock)) {
          r.hit = true;
          s.hits += 1;
          react(b, "hit");
        }
      }
      for (const tk of s.tokens) {
        if (tk.got) continue;
        const dx = tk.x - b.x;
        const dy = tk.h - (b.y + PHYS.SIZE / 2);
        if (dx * dx + dy * dy < 24 * 24) {
          tk.got = s.t + 0.0001;
          s.inv[tk.cat] += 1;
          react(b, "collect");
          s.events.push(`token_collected:${tk.cat}`);
        }
      }
    }
    // Celebrate after a good launch: two little hops.
    if (s.phase === "resolve" && b.celebrate && b.grounded && b.crouch <= 0 && s.t > 0.3 && Math.floor(s.t / 0.55) % 2 === 0 && s.t < 2.4) jump(b);
  },
  draw(ctx, s, W, H, c) {
    const ground = H - 40;
    drawGround(ctx, W, H, ground, s.dist);
    const sx = (x: number) => x - s.dist;
    for (const r of s.rocks) if (sx(r.x) > -60 && sx(r.x) < W + 60) drawRock(ctx, sx(r.x), ground, r.rock, c);
    for (const tk of s.tokens) {
      const x = sx(tk.x);
      if (x < -30 || x > W + 30) continue;
      if (tk.got) {
        // quick pop toward the inventory
        const a = Math.min(1, (s.t - tk.got) / 0.35);
        if (a >= 1 || s.t < tk.got) continue;
        drawToken(ctx, x + a * 30, ground - tk.h - a * 40, CATS[tk.cat].icon, c, { dim: a, r: 11 * (1 - a * 0.4) });
      } else {
        const bob = Math.sin(s.t * 3 + tk.x) * 2;
        drawToken(ctx, x, ground - tk.h + bob, CATS[tk.cat].icon, c);
      }
    }
    // Station: a slim antenna with a red beacon (where the fan request arrives).
    const st = sx(STATION_X + 40);
    if (st < W + 80) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(st, ground);
      ctx.lineTo(st, ground - 92);
      ctx.moveTo(st - 16, ground);
      ctx.lineTo(st, ground - 40);
      ctx.lineTo(st + 16, ground);
      ctx.stroke();
      const pulse = s.phase === "station" || s.phase === "decide" || s.phase === "resolve" ? 0.6 + 0.4 * Math.sin(s.t * 5) : 0.4;
      ctx.shadowColor = `rgba(${c.accentRgb},0.9)`;
      ctx.shadowBlur = 14 * pulse;
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.arc(st, ground - 98, 6, 0, Math.PI * 2);
      ctx.fill();
      if (s.phase !== "run" && s.phase !== "ready") {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(${c.accentRgb},${0.5 * pulse})`;
        for (const rr of [14, 24]) {
          ctx.beginPath();
          ctx.arc(st, ground - 98, rr + ((s.t * 18) % 10), -0.9, 0.9);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    const b = s.body;
    drawMascot(ctx, PLAYER_X, ground - b.y, b, c, { lean: s.phase === "run" ? Math.min(1, s.speed / 380) * 0.6 : 0 });
  },
  ui: (s) => ({ phase: s.phase, inv: s.inv, score: scoreOf(s), state: s.body.state, scenario: s.scenario, choice: s.choice }),
};

export function RevenueRush({ run, onComplete, onExit, onEvent, setStage }: MissionProps) {
  const game = useGame(def, run);
  const { ui } = game;
  const sc = SCENARIOS[ui.scenario];

  // Forward game events (collected in the loop) to the quest log.
  useEffect(() => {
    const s = game.state.current;
    if (!s.events.length) return;
    for (const e of s.events.splice(0)) {
      const [type, detail] = e.split(":");
      onEvent(type as "token_collected" | "checkpoint_reached", detail ? CATS[detail as Cat].label : "Station: fan request");
    }
  });
  useEffect(() => {
    setStage(
      ui.phase === "run" || ui.phase === "ready"
        ? "Stage 1 · collecting offer ideas"
        : ui.phase === "resolve"
          ? "Stage 3 · seeing how the offer lands"
          : "Stage 2 · reading the fan request",
    );
  }, [ui.phase, setStage]);
  useEffect(() => game.focus(), [game]);

  const choose = (cat: Cat) => {
    const s = game.state.current;
    s.choice = cat;
    s.phase = "resolve";
    s.t = 0;
    const match = cat === SCENARIOS[s.scenario].best;
    s.body.celebrate = match;
    react(s.body, match ? "yay" : "interact");
    onEvent("decision_made", `${CATS[cat].label} for "${SCENARIOS[s.scenario].request}" (${match ? "strong match" : "weaker match"})`);
  };
  const restart = () => game.restart(run + Math.floor(Math.random() * 1000) * 3);
  const match = ui.choice === sc.best;

  return (
    <GameFrame
      game={game}
      title="Fan Revenue Rush"
      controls="runner"
      hint="Space, ↑ or tap to jump. Collect offer ideas and hop over rocks."
      score={ui.score}
      scoreLabel="Opportunity"
      mascotState={game.paused ? "paused" : ui.state}
      onExit={onExit}
      onRestart={restart}
      hud={
        <span className="flex items-center gap-3" aria-label="Collected offers">
          {(
            [
              ["exclusive", Lock],
              ["merch", Tag],
              ["experience", Ticket],
            ] as const
          ).map(([k, I]) => (
            <span key={k} className="flex items-center gap-1" title={CATS[k].label} aria-label={`${CATS[k].label}: ${ui.inv[k]}`}>
              <I size={12} className="text-accent" />
              <span className="text-white">{ui.inv[k]}</span>
            </span>
          ))}
        </span>
      }
    >
      {ui.phase === "ready" && (
        <div className="pointer-events-none absolute inset-x-0 top-[34%] text-center text-[13px] text-soft">Collect offer ideas on the way. Space or tap to jump.</div>
      )}
      {ui.phase === "decide" && !game.paused && (
        <GameOverlay label="Fan request">
          <p className="text-[11px] font-bold uppercase tracking-[2px] text-muted">Fan signal · fictional</p>
          <p className="mt-2 text-[15px] font-bold leading-[21px]">“{sc.request}”</p>
          <p className="mt-3 text-[13px] text-soft">Which offer would you launch first?</p>
          <div className="mt-3 flex flex-col gap-2">
            {ORDER.map((k) => (
              <button
                key={k}
                onClick={() => choose(k)}
                className="flex min-h-[44px] items-center gap-3 rounded-pill border border-accent px-4 text-left text-[13px] font-bold hover:bg-accent-tint"
              >
                {k === "exclusive" ? <Lock size={15} /> : k === "merch" ? <Tag size={15} /> : <Ticket size={15} />}
                <span className="flex-1">{CATS[k].label}</span>
                <span className="text-[12px] font-normal text-soft">{ui.inv[k]} collected</span>
              </button>
            ))}
          </div>
        </GameOverlay>
      )}
      {ui.phase === "resolve" && ui.choice && (
        <GameOverlay label="How it landed">
          <p className="flex items-center gap-2 text-[15px] font-bold">
            {match ? "Strong match" : "Weaker match"}
            <span className="text-[11px] font-bold uppercase tracking-[2px] text-muted">simulated</span>
          </p>
          <div className="mt-3" aria-label={`Simulated fan interest: ${match ? "high" : "low"}`}>
            <div className="flex justify-between text-[12px] text-soft">
              <span>Simulated fan interest</span>
              <span className="font-bold text-white">{match ? "High" : "Low"}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg">
              <div className="quest-meter h-full rounded-full bg-accent" style={{ width: match ? "88%" : "34%" }} />
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-[19px] text-soft">
            {match
              ? `Fans asked for exactly this, so ${CATS[ui.choice].label.toLowerCase()} is the offer most likely to resonate.`
              : `${CATS[ui.choice].label} can work too, but these fans are asking for ${CATS[sc.best].label.toLowerCase()}. Start with what they request, then expand.`}
          </p>
          <p className="mt-2 text-[12px] text-muted">A game result, not a revenue estimate.</p>
          <button
            onClick={() =>
              onComplete({
                score: ui.score,
                achievement: match ? "Offer matched to fan demand" : "Offer launched",
                outcome: `${CATS[ui.choice!].label} for a fan request about ${CATS[sc.best].label.toLowerCase()} (${match ? "strong" : "weaker"} match)`,
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
