/**
 * Creator Quest feedback ("juice") shared by all four missions: particles, floating points, a token that
 * flies to the score, milestone toasts and short optional sounds. Positions are world coordinates
 * (x, height above ground); each mission maps them to the screen when drawing. Purely cosmetic: scoring
 * and progress stay in the missions. Points are Creator Quest points only, never wallet or loyalty points.
 */
import { drawToken, type Colors, type IconName } from "./engine";

type PartKind = "spark" | "impact" | "confetti" | "star";
interface Part {
  kind: PartKind;
  x: number;
  h: number;
  vx: number;
  vh: number;
  life: number;
  max: number;
  size: number;
  spin: number;
  rot: number;
  white: boolean;
}
interface Float {
  x: number;
  h: number;
  text: string;
  good: boolean;
  t: number;
}
interface Fly {
  x: number;
  h: number;
  icon: IconName;
  t: number;
}

export interface Fx {
  t: number;
  parts: Part[];
  floats: Float[];
  flies: Fly[];
  /** short message for milestones ("Checkpoint reached!"); the frame shows it */
  toast: { text: string; id: number } | null;
  toastT: number;
  /** bumps when the score should pop */
  scorePop: number;
  /** screen shake left (seconds) */
  shake: number;
  reduced: boolean;
  /** total bursts spawned (tests and the assistant can tell feedback fired) */
  bursts: number;
}

export const newFx = (): Fx => ({ t: 0, parts: [], floats: [], flies: [], toast: null, toastT: 0, scorePop: 0, shake: 0, reduced: false, bursts: 0 });

let toastId = 0;

function burst(fx: Fx, kind: PartKind, x: number, h: number, n: number, speed: number) {
  fx.bursts += 1;
  const count = fx.reduced ? Math.min(3, n) : n;
  for (let i = 0; i < count; i++) {
    const a = kind === "confetti" ? Math.PI * (0.25 + Math.random() * 0.5) : Math.random() * Math.PI * 2;
    const v = speed * (0.5 + Math.random() * 0.6);
    const max = kind === "confetti" ? 1.4 + Math.random() * 0.5 : kind === "impact" ? 0.35 : 0.55;
    fx.parts.push({
      kind,
      x,
      h,
      vx: Math.cos(a) * v * (kind === "confetti" ? 0.8 : 1),
      vh: Math.sin(a) * v,
      life: max,
      max,
      size: kind === "confetti" ? 3 + Math.random() * 2 : kind === "impact" ? 2 + Math.random() * 1.5 : 1.6 + Math.random() * 1.4,
      spin: (Math.random() - 0.5) * 12,
      rot: Math.random() * Math.PI,
      white: Math.random() < (kind === "impact" ? 0.8 : 0.35),
    });
  }
}

/** A valid pickup: sparkle, "+N", the token flies to the score, the score pops. */
export function fxCollect(fx: Fx, x: number, h: number, points: number, icon: IconName) {
  burst(fx, "spark", x, h, 8, 140);
  if (points) {
    fx.floats.push({ x, h: h + 10, text: `+${points}`, good: true, t: fx.t });
    fx.flies.push({ x, h, icon, t: fx.t });
    fx.scorePop += 1;
  }
  sfx("collect");
}

/** A short toast without the sparkle burst (e.g. a path unlocking off-screen). */
export function fxToast(fx: Fx, text: string) {
  fx.toast = { text, id: ++toastId };
  fx.toastT = 1.8;
}

/** Bumping into an obstacle: small impact dust, a gentle shake, the penalty as a float. */
export function fxHit(fx: Fx, x: number, h: number, penalty: number) {
  burst(fx, "impact", x, h, 9, 170);
  if (penalty) fx.floats.push({ x, h: h + 24, text: `−${penalty}`, good: false, t: fx.t });
  if (!fx.reduced) fx.shake = 0.22;
  sfx("hit");
}

/** A wrong choice (not an obstacle): a soft puff and a quieter cue. */
export function fxMiss(fx: Fx, x: number, h: number, penalty: number) {
  burst(fx, "impact", x, h, 5, 90);
  if (penalty) fx.floats.push({ x, h: h + 18, text: `−${penalty}`, good: false, t: fx.t });
  sfx("miss");
}

/** Milestone: sparkle burst around the mascot plus a short toast. */
export function fxMilestone(fx: Fx, x: number, h: number, text: string, points = 0) {
  burst(fx, "star", x, h + 20, 14, 190);
  if (points) fx.floats.push({ x, h: h + 34, text: `+${points}`, good: true, t: fx.t });
  fx.toast = { text, id: ++toastId };
  fx.toastT = 1.8;
  fx.scorePop += 1;
  sfx("milestone");
}

/** Quest won: confetti from above the mascot. */
export function fxWin(fx: Fx, x: number, h: number, sound = true) {
  burst(fx, "confetti", x - 60, h + 10, 22, 420);
  burst(fx, "confetti", x + 60, h + 10, 22, 420);
  burst(fx, "star", x, h + 30, 12, 220);
  if (sound) sfx("win");
}

export function stepFx(fx: Fx, dt: number) {
  fx.t += dt;
  for (const p of fx.parts) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.h += p.vh * dt;
    p.vh -= (p.kind === "confetti" ? 520 : p.kind === "impact" ? 700 : 260) * dt;
    if (p.kind === "confetti") p.vx *= Math.exp(-1.6 * dt);
    p.rot += p.spin * dt;
  }
  fx.parts = fx.parts.filter((p) => p.life > 0);
  fx.floats = fx.floats.filter((f) => fx.t - f.t < 0.9);
  fx.flies = fx.flies.filter((f) => fx.t - f.t < 0.45);
  fx.shake = Math.max(0, fx.shake - dt);
  if (fx.toastT > 0) {
    fx.toastT -= dt;
    if (fx.toastT <= 0) fx.toast = null;
  }
}

/** Camera offset for the shake (apply with ctx.translate before drawing the world). */
export const shakeOffset = (fx: Fx) => (fx.shake > 0 ? [Math.sin(fx.t * 90) * 3 * (fx.shake / 0.22), Math.cos(fx.t * 70) * 2 * (fx.shake / 0.22)] : [0, 0]);

/** Draws particles, floats and flying tokens. X/Y map world → screen; the score sits at (W − 60, 14). */
export function drawFx(ctx: CanvasRenderingContext2D, fx: Fx, X: (x: number) => number, Y: (h: number) => number, W: number, c: Colors) {
  ctx.save();
  for (const p of fx.parts) {
    const a = Math.max(0, p.life / p.max);
    const x = X(p.x);
    const y = Y(p.h);
    ctx.globalAlpha = p.kind === "confetti" ? Math.min(1, a * 2) : a;
    ctx.fillStyle = p.white ? "#fff" : c.accent;
    if (p.kind === "confetti") {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.size / 2, -p.size, p.size, p.size * 2);
      ctx.restore();
    } else if (p.kind === "star") {
      const s = p.size * 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s * 0.3, y - s * 0.3);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x + s * 0.3, y + s * 0.3);
      ctx.lineTo(x, y + s);
      ctx.lineTo(x - s * 0.3, y + s * 0.3);
      ctx.lineTo(x - s, y);
      ctx.lineTo(x - s * 0.3, y - s * 0.3);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Tokens flying to the score (ease-in, shrinking).
  for (const f of fx.flies) {
    const u = Math.min(1, (fx.t - f.t) / 0.45);
    const e = u * u;
    const sx = X(f.x);
    const sy = Y(f.h);
    const tx = W - 60;
    const ty = 14;
    drawToken(ctx, sx + (tx - sx) * e, sy + (ty - sy) * e - Math.sin(u * Math.PI) * 30, f.icon, c, { r: 10 * (1 - e * 0.5), dim: e * 0.6 });
  }
  // "+10" floats: rise and fade.
  ctx.font = "800 13px Roboto, sans-serif";
  ctx.textAlign = "center";
  for (const f of fx.floats) {
    const u = (fx.t - f.t) / 0.9;
    ctx.globalAlpha = Math.max(0, 1 - u * u);
    ctx.fillStyle = f.good ? "#fff" : "rgba(255,255,255,0.7)";
    ctx.shadowColor = f.good ? `rgba(${c.accentRgb},0.9)` : "transparent";
    ctx.shadowBlur = f.good ? 8 : 0;
    ctx.fillText(f.text, X(f.x), Y(f.h) - u * 26);
  }
  ctx.restore();
}

/* ---------------- sound (optional, quiet, synthesised; nothing is downloaded) ---------------- */

const SOUND_KEY = "topfan-quest-sound";
export const soundOn = () => {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
};
export const setSoundOn = (on: boolean) => {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    /* private mode: stays on for this page */
  }
};

let audio: AudioContext | null = null;
let lastHit = 0;
function tone(freq: number, at: number, dur: number, type: OscillatorType, vol: number, slide = 0) {
  const a = audio!;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(a.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}

export function sfx(kind: "collect" | "hit" | "miss" | "milestone" | "win") {
  if (!soundOn()) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const t = audio.currentTime + 0.005;
    if (kind === "collect") {
      tone(880, t, 0.09, "sine", 0.05);
      tone(1320, t + 0.06, 0.12, "sine", 0.045);
    } else if (kind === "hit") {
      if (performance.now() - lastHit < 250) return;
      lastHit = performance.now();
      tone(170, t, 0.18, "triangle", 0.09, -90);
    } else if (kind === "miss") {
      tone(392, t, 0.1, "sine", 0.04);
      tone(311, t + 0.09, 0.14, "sine", 0.04);
    } else if (kind === "milestone") {
      [659, 784, 988].forEach((f, i) => tone(f, t + i * 0.08, 0.16, "sine", 0.05));
    } else {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.09, i === 4 ? 0.45 : 0.18, "sine", 0.055));
    }
  } catch {
    /* no audio available: silent */
  }
}
