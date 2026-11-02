/**
 * Creator Quest shared engine: the Launch Run mascot, physics and drawing, generalised so every
 * mission uses the same character and feel. The Launch Run constants are unchanged (gravity, jump
 * velocity, jelly spring, take-off squash, landing compression); missions add horizontal momentum
 * and one-way platforms on top.
 *
 * Coordinates: x grows right (world px), y is height ABOVE the ground line (bottom of the mascot).
 * Everything is deterministic for a given seed; no network or model calls run in the loop.
 */

export const PHYS = {
  SIZE: 30,
  GRAVITY: 2300,
  JUMP_V: 700,
  SPRING_K: 420,
  SPRING_C: 15,
  /* added for free-moving missions */
  ACCEL: 1700,
  MAX_VX: 250,
  FRICTION: 9,
  AIR_CONTROL: 0.55,
};

export type Mood = "happy" | "jump" | "hit" | "yay" | "collect";

export type MascotState =
  | "idle"
  | "running"
  | "accelerating"
  | "jumping"
  | "falling"
  | "landing"
  | "collecting"
  | "interacting"
  | "celebrating"
  | "collision"
  | "recovering"
  | "paused";

export interface Plat {
  x: number;
  w: number;
  /** height of the top surface above the ground */
  h: number;
  id?: string;
}

export interface Body {
  x: number; // center
  y: number; // bottom, above ground
  vx: number;
  vy: number;
  grounded: boolean;
  on: Plat | null;
  crouch: number;
  sq: number;
  sqv: number;
  face: 1 | -1;
  blink: number;
  blinkIn: number;
  look: number;
  lookTarget: number;
  lookIn: number;
  mood: Mood;
  moodT: number;
  landT: number;
  stumble: number;
  interactT: number;
  celebrate: boolean;
  state: MascotState;
}

/* ---------------- seeded randomness (stable scenarios, testable) ---------------- */

export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, range: (lo: number, hi: number) => lo + next() * (hi - lo) };
}
const r = Math.random;

export function newBody(x: number, y = 0): Body {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    grounded: true,
    on: null,
    crouch: 0,
    sq: 0,
    sqv: 0,
    face: 1,
    blink: 0,
    blinkIn: 2 + r() * 2,
    look: 0,
    lookTarget: 0,
    lookIn: 1 + r() * 2,
    mood: "happy",
    moodT: 0,
    landT: 0,
    stumble: 0,
    interactT: 0,
    celebrate: false,
    state: "idle",
  };
}

/** Squash first, take off a moment later (Launch Run's anticipation). */
export function jump(b: Body) {
  if (!b.grounded || b.crouch > 0 || b.stumble > 0.2) return false;
  b.crouch = 0.06;
  b.sqv -= 3.5;
  return true;
}

export function react(b: Body, kind: "collect" | "hit" | "yay" | "interact") {
  if (kind === "collect") {
    b.mood = "collect";
    b.moodT = 0.4;
    b.sqv += 3.2;
  } else if (kind === "hit") {
    b.mood = "hit";
    b.moodT = 0.7;
    b.sqv -= 6;
    b.stumble = 0.55;
  } else if (kind === "yay") {
    b.mood = "yay";
    b.moodT = 0.9;
    b.sqv += 4;
  } else {
    b.interactT = 0.35;
    b.sqv -= 2.2;
    b.mood = "yay";
    b.moodT = 0.4;
  }
}

export interface StepOpts {
  /** −1 left, 0 none, +1 right (free-moving missions) */
  move?: number;
  /** auto-runner: the world scrolls; the mascot holds x */
  auto?: boolean;
  platforms?: Plat[];
  minX?: number;
  maxX?: number;
  reduced?: boolean;
  paused?: boolean;
  /** jump velocity override (finish hops) */
  jumpV?: number;
}

export function stepBody(b: Body, dt: number, o: StepOpts = {}) {
  if (o.paused) {
    b.state = "paused";
    return;
  }
  // Face: occasional blink, small eye shifts (Launch Run).
  b.blinkIn -= dt;
  if (b.blinkIn <= 0) {
    b.blink = 0.12;
    b.blinkIn = 2.2 + r() * 2.3;
  }
  b.blink = Math.max(0, b.blink - dt);
  b.lookIn -= dt;
  if (b.lookIn <= 0) {
    b.lookTarget = o.auto ? 0.2 + r() * 0.8 : Math.abs(b.vx) > 40 ? b.face * (0.5 + r() * 0.5) : r() * 2 - 1;
    b.lookIn = 1 + r() * 2;
  }
  b.look += (b.lookTarget - b.look) * Math.min(1, dt * 6);
  if (b.moodT > 0) {
    b.moodT -= dt;
    if (b.moodT <= 0) b.mood = b.celebrate ? "yay" : "happy";
  }
  b.landT = Math.max(0, b.landT - dt);
  b.interactT = Math.max(0, b.interactT - dt);
  b.stumble = Math.max(0, b.stumble - dt);

  // Jelly spring around a small pose target: stretch rising, slight squash falling.
  const target = b.grounded ? 0 : b.vy > 0 ? 0.06 : -0.04;
  const acc = -PHYS.SPRING_K * (b.sq - target) - PHYS.SPRING_C * b.sqv;
  b.sqv += acc * dt;
  b.sq += b.sqv * dt;
  if (o.reduced) b.sq *= 0.5;

  // Take-off after the short squash.
  if (b.crouch > 0) {
    b.crouch -= dt;
    if (b.crouch <= 0) {
      b.grounded = false;
      b.on = null;
      b.vy = o.jumpV ?? PHYS.JUMP_V;
      b.sqv += 8;
      b.mood = "jump";
      b.moodT = 0.5;
    }
  }

  // Horizontal momentum (free-moving missions).
  const prevVx = b.vx;
  if (!o.auto) {
    const move = b.stumble > 0.25 ? 0 : o.move ?? 0;
    const control = b.grounded ? 1 : PHYS.AIR_CONTROL;
    if (move) {
      b.face = move > 0 ? 1 : -1;
      b.vx += move * PHYS.ACCEL * control * dt;
      b.vx = Math.max(-PHYS.MAX_VX, Math.min(PHYS.MAX_VX, b.vx));
    } else if (b.grounded) {
      b.vx *= Math.exp(-PHYS.FRICTION * dt);
      if (Math.abs(b.vx) < 4) b.vx = 0;
    }
    b.x += b.vx * dt;
    const lo = (o.minX ?? -Infinity) + PHYS.SIZE / 2;
    const hi = (o.maxX ?? Infinity) - PHYS.SIZE / 2;
    if (b.x < lo || b.x > hi) {
      b.x = Math.max(lo, Math.min(hi, b.x));
      b.vx = 0;
    }
  }

  // Walking off a platform edge.
  if (b.grounded && b.on && Math.abs(b.x - (b.on.x + b.on.w / 2)) > b.on.w / 2 + PHYS.SIZE * 0.3) {
    b.grounded = false;
    b.on = null;
    b.vy = 0;
  }

  if (!b.grounded) {
    const prevY = b.y;
    b.vy -= PHYS.GRAVITY * dt;
    b.y += b.vy * dt;
    let land: number | null = null;
    let landOn: Plat | null = null;
    if (b.vy <= 0) {
      for (const p of o.platforms ?? []) {
        if (prevY >= p.h - 0.5 && b.y <= p.h && Math.abs(b.x - (p.x + p.w / 2)) <= p.w / 2 + PHYS.SIZE * 0.3) {
          if (land == null || p.h > land) {
            land = p.h;
            landOn = p;
          }
        }
      }
    }
    if (land == null && b.y <= 0) land = 0;
    if (land != null) {
      b.sqv -= Math.min(9, Math.abs(b.vy) / 85); // land: compress + wobble
      b.y = land;
      b.vy = 0;
      b.grounded = true;
      b.on = landOn;
      b.landT = 0.18;
    }
  }

  // Readable state for HUD, tests and the assistant.
  b.state = b.celebrate
    ? "celebrating"
    : b.stumble > 0.25
      ? "collision"
      : b.stumble > 0
        ? "recovering"
        : b.interactT > 0
          ? "interacting"
          : b.mood === "collect" && b.moodT > 0
            ? "collecting"
            : !b.grounded
              ? b.vy > 0
                ? "jumping"
                : "falling"
              : b.landT > 0
                ? "landing"
                : o.auto || Math.abs(b.vx) > 20
                  ? Math.abs(b.vx) > Math.abs(prevVx) + 0.5 || (o.auto && b.moodT < 0)
                    ? "accelerating"
                    : "running"
                  : "idle";
}

/* ---------------- drawing ---------------- */

export interface Colors {
  accent: string;
  accentRgb: string;
  muted: string;
}

export function readColors(): Colors {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
  return {
    accent: v("--accent", "#bc1111"),
    accentRgb: v("--configThemeColorRgb", "188 17 17").split(/\s+/).join(","),
    muted: v("--text-muted", "#9f9f9f"),
  };
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number) {
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/**
 * The red jelly mascot (Launch Run's drawing): squash/stretch, gloss, blinking, glances, moods.
 * `lean` (−1…1) tilts it forward while running.
 */
export function drawMascot(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottom: number,
  b: Pick<Body, "sq" | "look" | "blink" | "mood" | "face">,
  c: Colors,
  opts: { glow?: number; lean?: number; size?: number } = {},
) {
  const SIZE = opts.size ?? PHYS.SIZE;
  const sq = Math.max(-0.35, Math.min(0.35, b.sq));
  const lean = opts.lean ?? 0;
  const h = SIZE * (1 + sq) * (1 - Math.abs(lean) * 0.05);
  const wd = SIZE * (1 - sq * 0.6) * (1 + Math.abs(lean) * 0.07);
  const x = cx - wd / 2;
  const y = bottom - h;
  const rad = Math.min(wd, h) * 0.34;
  const k = SIZE / 30;

  ctx.save();
  if (lean) {
    ctx.translate(cx, bottom);
    ctx.transform(1, 0, -lean * 0.16, 1, 0, 0); // shear: lean into the run, feet stay planted
    ctx.translate(-cx, -bottom);
  }

  ctx.save();
  ctx.shadowColor = `rgba(${c.accentRgb},0.55)`;
  ctx.shadowBlur = opts.glow ?? 12;
  ctx.fillStyle = c.accent;
  roundRect(ctx, x, y, wd, h, rad);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.ellipse(x + wd * 0.3, y + h * 0.17, wd * 0.17, h * 0.07, -0.5, 0, Math.PI * 2);
  ctx.fill();

  const eyeY = y + h * 0.52;
  const eyeDX = wd * 0.23;
  const look = b.look * 1.6 * k;
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  ctx.lineCap = "round";
  ctx.lineWidth = 1.6 * k;
  const mood = b.mood;
  for (const side of [-1, 1]) {
    const ex = cx + side * eyeDX + look;
    if (mood === "hit") {
      ctx.beginPath();
      ctx.moveTo(ex - 2.5 * k * side, eyeY - 2.5 * k);
      ctx.lineTo(ex + 2 * k * side, eyeY);
      ctx.lineTo(ex - 2.5 * k * side, eyeY + 2.5 * k);
      ctx.stroke();
    } else if (mood === "yay") {
      ctx.beginPath();
      ctx.arc(ex, eyeY + 1.5 * k, 2.6 * k, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (b.blink > 0) {
      ctx.fillRect(ex - 2.4 * k, eyeY - 0.6 * k, 4.8 * k, 1.4 * k);
    } else {
      const big = mood === "collect" ? 1.15 : 1;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 2.3 * k * big, 3.1 * k * big, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const my = y + h * 0.7;
  const mx = cx + look * 0.6;
  ctx.beginPath();
  if (mood === "jump" || mood === "collect") {
    ctx.ellipse(mx, my, (mood === "collect" ? 1.8 : 2.2) * k, (mood === "collect" ? 2.1 : 2.6) * k, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === "hit") {
    ctx.arc(mx, my + 3.5 * k, 3.5 * k, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  } else {
    const big = (mood === "yay" ? 4.6 : 3.4) * k;
    ctx.arc(mx, my - big * 0.6, big, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

/** One rock in a formation: a soft, asymmetric dome sitting on a surface (Launch Run). */
export interface Rock {
  dx: number;
  w: number;
  h: number;
  skew: number;
  bumps: number[];
}

export function makeRock(dx: number, w: number, h: number, rand: () => number = Math.random): Rock {
  const lean = rand() < 0.5 ? -1 : 1;
  return { dx, w, h, skew: lean * (0.35 + rand() * 0.25), bumps: Array.from({ length: 9 }, () => rand() * 0.14 - 0.07) };
}

export function drawRock(ctx: CanvasRenderingContext2D, x: number, ground: number, k: Rock, c: Colors) {
  const n = k.bumps.length;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * i) / n;
    const s = 1 + (k.bumps[i % n] ?? 0);
    const lift = Math.sin(a);
    const px = x + k.w / 2 + Math.cos(a) * (k.w / 2) * s + k.skew * (k.w * 0.22) * lift * lift;
    const py = ground - Math.pow(lift, 1.25) * k.h * s;
    pts.push([px, Math.min(ground, py)]);
  }
  const outline = () => {
    ctx.beginPath();
    ctx.moveTo(x + k.w, ground);
    ctx.lineTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    }
    ctx.lineTo(pts[pts.length - 1][0], ground);
    ctx.closePath();
  };
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.ellipse(x + k.w / 2, ground + 0.5, k.w * 0.55, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  outline();
  const body = ctx.createLinearGradient(0, ground - k.h, 0, ground);
  body.addColorStop(0, "#77737a");
  body.addColorStop(0.55, "#4a474d");
  body.addColorStop(1, "#242226");
  ctx.fillStyle = body;
  ctx.fill();
  ctx.clip();
  let g = ctx.createRadialGradient(x + k.w * 0.32, ground - k.h * 0.85, 0, x + k.w * 0.32, ground - k.h * 0.85, k.w * 0.45);
  g.addColorStop(0, "rgba(255,255,255,0.32)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - 4, ground - k.h - 4, k.w + 8, k.h + 4);
  g = ctx.createRadialGradient(x + k.w * 1.05, ground - k.h * 0.3, 0, x + k.w * 1.05, ground - k.h * 0.3, k.w * 0.6);
  g.addColorStop(0, `rgba(${c.accentRgb},0.28)`);
  g.addColorStop(1, `rgba(${c.accentRgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - 4, ground - k.h - 4, k.w + 8, k.h + 4);
  ctx.restore();
}

/** Dome-profile collision against a rock (Launch Run: slightly shrunk so near-misses feel fair). */
export function hitsRock(b: Body, rockX: number, base: number, k: Rock) {
  const pad = 6;
  const left = b.x - PHYS.SIZE / 2;
  const samples = [left + pad, b.x, left + PHYS.SIZE - pad];
  const cx = rockX + k.w / 2 + k.skew * k.w * 0.11;
  const hw = (k.w / 2) * 0.82;
  return samples.some((px) => {
    const d = (px - cx) / hw;
    return Math.abs(d) < 1 && b.y - base < k.h * Math.sqrt(1 - d * d) - 3;
  });
}

/** Ground line with faded ends, a faint surface band and drifting specks/craters (Launch Run). */
export function drawGround(ctx: CanvasRenderingContext2D, W: number, H: number, ground: number, scroll: number) {
  const band = ctx.createLinearGradient(0, ground, 0, H);
  band.addColorStop(0, "rgba(255,255,255,0.045)");
  band.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.fillStyle = band;
  ctx.fillRect(0, ground, W, H - ground);
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const span = W + 120;
    const cx = ((((i * 173 + 40 - scroll) % span) + span) % span) - 60;
    ctx.beginPath();
    ctx.ellipse(cx, ground + 12 + (i % 3) * 4, 5 + (i % 2) * 4, 1.4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  const line = ctx.createLinearGradient(0, 0, W, 0);
  line.addColorStop(0, "rgba(255,255,255,0)");
  line.addColorStop(0.06, "rgba(255,255,255,0.42)");
  line.addColorStop(0.94, "rgba(255,255,255,0.42)");
  line.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = line;
  ctx.fillRect(0, ground, W, 1);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  const off = ((scroll % 40) + 40) % 40;
  for (let x = -off; x < W; x += 40) ctx.fillRect(x + 12, ground + 7, 6, 1);
  ctx.restore();
}

/** Floating platform: a thin rock ledge with a soft top highlight (same palette as the rocks). */
export function drawPlatform(ctx: CanvasRenderingContext2D, x: number, top: number, w: number, c: Colors, lit = 0) {
  ctx.save();
  const g = ctx.createLinearGradient(0, top, 0, top + 12);
  g.addColorStop(0, "#5c595f");
  g.addColorStop(1, "#262428");
  ctx.fillStyle = g;
  roundRect(ctx, x, top, w, 10, 5);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.22 + lit * 0.2})`;
  ctx.fillRect(x + 6, top, w - 12, 1);
  if (lit > 0) {
    ctx.shadowColor = `rgba(${c.accentRgb},${0.5 * lit})`;
    ctx.shadowBlur = 14;
    ctx.fillStyle = `rgba(${c.accentRgb},${0.55 * lit})`;
    ctx.fillRect(x + 8, top + 10, w - 16, 1.5);
  }
  ctx.restore();
}

/* ---------------- small line icons drawn in canvas (white on red/neutral) ---------------- */

export type IconName = "lock" | "tag" | "ticket" | "camera" | "live" | "mail" | "grid" | "chat" | "star" | "bag" | "play" | "bars";

export function drawIcon(ctx: CanvasRenderingContext2D, name: IconName, cx: number, cy: number, s = 1, color = "#fff") {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  switch (name) {
    case "lock":
      roundRect(ctx, -5, -1, 10, 7, 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -1, 3.3, Math.PI, 0);
      ctx.stroke();
      break;
    case "tag":
      ctx.moveTo(-6, -2);
      ctx.lineTo(-2, -6);
      ctx.lineTo(6, -6);
      ctx.lineTo(6, 2);
      ctx.lineTo(2, 6);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(3, -3, 1, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "ticket":
      ctx.moveTo(-6, -4);
      ctx.lineTo(6, -4);
      ctx.lineTo(6, -1.5);
      ctx.arc(6, 0, 1.5, -Math.PI / 2, Math.PI / 2, true);
      ctx.lineTo(6, 4);
      ctx.lineTo(-6, 4);
      ctx.lineTo(-6, 1.5);
      ctx.arc(-6, 0, 1.5, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      ctx.stroke();
      break;
    case "camera":
      roundRect(ctx, -6, -3.5, 9, 7, 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(3, -1);
      ctx.lineTo(6.5, -3);
      ctx.lineTo(6.5, 3);
      ctx.lineTo(3, 1);
      ctx.stroke();
      break;
    case "live":
      ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 4.2, -0.8, 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 4.2, Math.PI - 0.8, Math.PI + 0.8);
      ctx.stroke();
      break;
    case "mail":
      roundRect(ctx, -6, -4, 12, 8, 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-5.5, -3.5);
      ctx.lineTo(0, 0.5);
      ctx.lineTo(5.5, -3.5);
      ctx.stroke();
      break;
    case "grid":
      for (const [x, y] of [
        [-5, -5],
        [1, -5],
        [-5, 1],
        [1, 1],
      ])
        ctx.strokeRect(x, y, 4, 4);
      break;
    case "chat":
      roundRect(ctx, -6, -5, 12, 8, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-2, 3);
      ctx.lineTo(-4, 6);
      ctx.lineTo(1, 3);
      ctx.stroke();
      break;
    case "star":
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? 2.6 : 6;
        if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.stroke();
      break;
    case "bag":
      roundRect(ctx, -5.5, -2, 11, 8, 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -2, 3, Math.PI, 0);
      ctx.stroke();
      break;
    case "play":
      ctx.moveTo(-3, -5);
      ctx.lineTo(5, 0);
      ctx.lineTo(-3, 5);
      ctx.closePath();
      ctx.stroke();
      break;
    case "bars":
      ctx.moveTo(-5, 5);
      ctx.lineTo(-5, 0);
      ctx.moveTo(0, 5);
      ctx.lineTo(0, -5);
      ctx.moveTo(5, 5);
      ctx.lineTo(5, -2);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

/** Round token: thin red ring, dark fill, white icon; `glow` for highlighted ones. */
export function drawToken(ctx: CanvasRenderingContext2D, cx: number, cy: number, icon: IconName, c: Colors, o: { r?: number; glow?: number; dim?: number; filled?: boolean } = {}) {
  const rad = o.r ?? 11;
  ctx.save();
  ctx.globalAlpha = 1 - (o.dim ?? 0);
  ctx.shadowColor = `rgba(${c.accentRgb},0.6)`;
  ctx.shadowBlur = 8 + (o.glow ?? 0) * 12;
  ctx.fillStyle = o.filled ? c.accent : "#1b1c1e";
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = o.filled ? "rgba(255,255,255,0.5)" : c.accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawIcon(ctx, icon, cx, cy, rad / 11);
  ctx.restore();
}
