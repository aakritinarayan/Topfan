/**
 * Page-level space backdrop for the provisioning screen (one canvas, sticky to the viewport).
 * Deliberately composed, not random: a faint moon top-left, a tiny ringed planet top-right, a large
 * rim-lit planet low on the right edge, a dark-red haze and a faint nebula wisp. Stars are sparse and
 * dimmed in the center column (heading, timer, stepper). Decorative only (aria-hidden, no pointer events).
 */
import { useEffect, useRef } from "react";

/**
 * Shared, render-free motion channel. Launch Run sets `rate` (px/s of parallax) while it is being
 * played; the backdrop adds a slow ambient drift on top and keeps `env` itself.
 */
export const spaceMotion = { rate: 0 };

const AMBIENT_RATE = 9; // px/s, very slow drift when nobody is playing

/** Stars in normalized coordinates, two depth layers. Generated once. */
const STARS = Array.from({ length: 110 }, () => {
  const x = Math.random();
  const center = x > 0.28 && x < 0.72; // keep the content column quiet
  return {
    x,
    y: Math.random(),
    r: Math.random() < 0.12 ? 1.1 : 0.7,
    a: (0.1 + Math.random() * 0.35) * (center ? 0.35 : 1),
    layer: Math.random() < 0.5 ? 0.4 : 0.8,
    tw: Math.random() * Math.PI * 2, // twinkle phase
  };
});

export function SpaceBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const cs = getComputedStyle(document.documentElement);
    const rgb = (cs.getPropertyValue("--configThemeColorRgb").trim() || "188 17 17").split(/\s+/).join(",");
    const red = (a: number) => `rgba(${rgb},${a})`;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let raf = 0;
    let last = performance.now();
    let env = 0;
    let t = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const wrap = (x: number, span: number) => ((x % span) + span) % span;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced) {
        env += (AMBIENT_RATE + spaceMotion.rate) * dt;
        t += dt;
      }
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      ctx.clearRect(0, 0, W, H);

      // Base: near-black with a touch of charcoal toward the bottom.
      let g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0b0b0d");
      g.addColorStop(1, "#121113");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Dark-red atmosphere high in the center, breathing and drifting very slowly.
      const hx = W * 0.5 + Math.sin(t / 40) * W * 0.04;
      const hr = Math.max(W, H) * (0.42 + Math.sin(t / 23) * 0.02);
      g = ctx.createRadialGradient(hx, H * 0.18, 0, hx, H * 0.18, hr);
      g.addColorStop(0, red(0.1));
      g.addColorStop(0.5, red(0.035));
      g.addColorStop(1, red(0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Nebula wisp, lower left.
      ctx.save();
      ctx.translate(W * 0.14 - ((env * 0.02) % 40), H * 0.66);
      ctx.rotate(-0.5);
      ctx.scale(2.6, 0.6);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, H * 0.2);
      g.addColorStop(0, red(0.09));
      g.addColorStop(1, red(0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, H * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Stars (slow drift, gentle twinkle).
      const span = W + 40;
      for (const s of STARS) {
        const x = wrap(s.x * span - env * s.layer * 0.15, span) - 20;
        const a = s.a * (0.8 + 0.2 * Math.sin(t * 0.6 + s.tw));
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath();
        ctx.arc(x, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Faint moon, upper left (lit from the left).
      const mx = W * 0.08 - ((env * 0.01) % 30);
      const my = H * 0.24;
      g = ctx.createRadialGradient(mx - 5, my - 4, 1, mx, my, 15);
      g.addColorStop(0, "rgba(120,112,116,0.4)");
      g.addColorStop(1, "rgba(28,25,27,0.8)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(mx, my, 14, 0, Math.PI * 2);
      ctx.fill();

      // Tiny ringed planet, upper right.
      const rx = W * 0.88 - ((env * 0.015) % 40);
      const ry = H * 0.13;
      ctx.fillStyle = "rgba(118,80,88,0.55)";
      ctx.beginPath();
      ctx.arc(rx, ry, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(190,170,178,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(rx, ry + 1, 13, 3, -0.25, 0, Math.PI * 2);
      ctx.stroke();

      // Large planet partly visible on the right edge, with a soft red rim.
      const R = Math.max(170, H * 0.27);
      const px = W + R * 0.5 - Math.min(20, env * 0.004);
      const py = H * 0.74;
      g = ctx.createRadialGradient(px - R * 0.55, py - R * 0.55, R * 0.1, px, py, R);
      g.addColorStop(0, "#251719");
      g.addColorStop(0.6, "#140e10");
      g.addColorStop(1, "#0d0a0b");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.shadowColor = red(0.7);
      ctx.shadowBlur = 18;
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = red(0.18);
      ctx.beginPath();
      ctx.arc(px, py, R, Math.PI * 0.85, Math.PI * 1.65);
      ctx.stroke();
      ctx.strokeStyle = red(0.45);
      ctx.beginPath();
      ctx.arc(px, py, R, Math.PI * 1.05, Math.PI * 1.35);
      ctx.stroke();
      ctx.restore();

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      spaceMotion.rate = 0;
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <canvas ref={ref} className="sticky top-0 block h-screen w-full" />
    </div>
  );
}
