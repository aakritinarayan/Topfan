/**
 * Shared game loop + input + HUD frame for Creator Quest missions (Launch Run's loop, generalised).
 * Each mission supplies init/step/draw; this owns rAF, DPR sizing, pause (incl. hidden tab), restart,
 * keyboard + touch input and a cheap React snapshot for overlays (updated only when it changes).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ChevronLeft, ChevronRight, ArrowUp, Hand, Pause, Play, RotateCcw, X } from "lucide-react";
import { readColors, type Colors } from "./engine";

export interface Input {
  left: boolean;
  right: boolean;
  /** edge-triggered: consumed by the mission's step */
  jump: boolean;
  interact: boolean;
}

export interface GameDef<S, U> {
  init: (seed: number) => S;
  step: (s: S, dt: number, input: Input, env: { W: number; H: number; reduced: boolean }) => void;
  draw: (ctx: CanvasRenderingContext2D, s: S, W: number, H: number, c: Colors, paused: boolean) => void;
  /** small serialisable view of the state for React overlays */
  ui: (s: S) => U;
}

export const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export function useGame<S, U>(def: GameDef<S, U>, seed: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const defRef = useRef(def);
  defRef.current = def;
  const state = useRef<S>(def.init(seed));
  const input = useRef<Input>({ left: false, right: false, jump: false, interact: false });
  const pausedRef = useRef(false);
  const [paused, setPausedState] = useState(false);
  const [ui, setUi] = useState<U>(() => def.ui(state.current));
  const uiKey = useRef("");

  const setPaused = useCallback((p: boolean) => {
    pausedRef.current = p;
    setPausedState(p);
    if (p) Object.assign(input.current, { left: false, right: false, jump: false, interact: false });
  }, []);

  const restart = useCallback(
    (nextSeed?: number) => {
      state.current = defRef.current.init(nextSeed ?? seed);
      uiKey.current = "";
      setPaused(false);
    },
    [seed, setPaused],
  );

  const focus = useCallback(() => wrapRef.current?.focus({ preventScroll: true }), []);

  // Keyboard. Never steals keys from text fields or from buttons outside the game.
  useEffect(() => {
    const isGameKey = (e: KeyboardEvent) =>
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key) || ["KeyA", "KeyD", "KeyW", "KeyE", "KeyP", "Space"].includes(e.code);
    const blocked = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true']")) return true;
      const inGame = !!t && !!wrapRef.current?.contains(t);
      return !inGame && !!t?.closest("button, a, [role='button']");
    };
    const down = (e: KeyboardEvent) => {
      if (blocked(e)) return;
      if (e.key === "Escape" || e.code === "KeyP") {
        setPaused(!pausedRef.current);
        return;
      }
      if (!isGameKey(e) && e.key !== "Enter") return;
      if (e.key === "Enter" && (e.target as HTMLElement)?.closest("button")) return;
      e.preventDefault();
      if (pausedRef.current) return;
      const i = input.current;
      if (e.key === "ArrowLeft" || e.code === "KeyA") i.left = true;
      if (e.key === "ArrowRight" || e.code === "KeyD") i.right = true;
      if ((e.code === "Space" || e.key === "ArrowUp" || e.code === "KeyW") && !e.repeat) i.jump = true;
      if ((e.code === "KeyE" || e.key === "Enter" || e.key === "ArrowDown") && !e.repeat) i.interact = true;
    };
    const up = (e: KeyboardEvent) => {
      const i = input.current;
      if (e.key === "ArrowLeft" || e.code === "KeyA") i.left = false;
      if (e.key === "ArrowRight" || e.code === "KeyD") i.right = false;
    };
    const blur = () => Object.assign(input.current, { left: false, right: false });
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [setPaused]);

  // Hidden tab: pause (no animation work in the background).
  useEffect(() => {
    const onVis = () => document.hidden && setPaused(true);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [setPaused]);

  // Main loop.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const colors = readColors();
    const reduced = reducedMotion();
    let raf = 0;
    let last = performance.now();
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
    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      const d = defRef.current;
      const s = state.current;
      if (!pausedRef.current) {
        d.step(s, dt, input.current, { W, H, reduced });
        input.current.jump = false;
        input.current.interact = false;
      }
      ctx.clearRect(0, 0, W, H);
      d.draw(ctx, s, W, H, colors, pausedRef.current);
      const u = d.ui(s);
      const k = JSON.stringify(u);
      if (k !== uiKey.current) {
        uiKey.current = k;
        setUi(u);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // Dev/test hook: lets automated playtests read state and drive the same inputs a player would.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __quest?: unknown };
    w.__quest = { get state() { return state.current; }, input: input.current };
    return () => void delete w.__quest;
  }, []);

  return { canvasRef, wrapRef, state, input, ui, paused, setPaused, restart, focus };
}

/* ---------------- frame: canvas + HUD + controls ---------------- */

export function GameFrame({
  game,
  title,
  controls,
  hint,
  score,
  scoreLabel = "Score",
  mascotState,
  onExit,
  onRestart,
  height = 340,
  children,
  hud,
}: {
  game: { canvasRef: RefObject<HTMLCanvasElement | null>; wrapRef: RefObject<HTMLDivElement | null>; input: RefObject<Input>; paused: boolean; setPaused: (p: boolean) => void; focus: () => void };
  title: string;
  controls: "runner" | "platform";
  hint: string;
  score: number;
  scoreLabel?: string;
  mascotState: string;
  onExit: () => void;
  onRestart: () => void;
  height?: number;
  children?: ReactNode;
  hud?: ReactNode;
}) {
  const press = (k: keyof Input, v: boolean) => {
    if (game.paused) return;
    const i = game.input.current!;
    if (k === "jump" || k === "interact") {
      if (v) i[k] = true;
    } else i[k] = v;
  };
  const hold = (k: keyof Input) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      press(k, true);
    },
    onPointerUp: () => press(k, false),
    onPointerCancel: () => press(k, false),
    onPointerLeave: () => k !== "jump" && k !== "interact" && press(k, false),
  });
  return (
    <div
      ref={game.wrapRef}
      tabIndex={-1}
      data-quest-game={title}
      data-mascot-state={mascotState}
      aria-label={`${title}. ${hint}`}
      className="relative w-full select-none outline-none"
    >
      <div className="relative w-full" style={{ height }}>
        <canvas
          ref={game.canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={(e) => {
            e.preventDefault();
            game.focus();
            if (controls === "runner") press("jump", true);
          }}
        />
        {/* HUD */}
        <div className="absolute left-2 top-2 flex items-center gap-1">
          {game.paused ? (
            <HudButton label="Resume" onClick={() => (game.setPaused(false), game.focus())}>
              <Play size={13} className="fill-current" />
            </HudButton>
          ) : (
            <HudButton label="Pause" onClick={() => (game.setPaused(true), game.focus())}>
              <Pause size={13} className="fill-current" />
            </HudButton>
          )}
          <HudButton label="Restart" onClick={() => (onRestart(), game.focus())}>
            <RotateCcw size={13} />
          </HudButton>
          <HudButton label="Back to missions" onClick={onExit}>
            <X size={14} />
          </HudButton>
          <span className="ml-2 text-[11px] font-bold uppercase tracking-[2px] text-muted">{title}</span>
        </div>
        <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-4 text-[11px] font-bold uppercase tracking-[2px] text-muted tabular-nums">
          {hud}
          <span>
            {scoreLabel} <span className="text-white" data-quest-score>{score}</span>
          </span>
        </div>
        {game.paused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/40">
            <span className="text-[15px] font-bold">Paused</span>
            <button onClick={() => (game.setPaused(false), game.focus())} className="h-[44px] rounded-pill bg-accent px-5 text-[13px] font-black uppercase tracking-caps">
              Resume
            </button>
          </div>
        )}
        {children}
      </div>
      {/* Visible instructions + touch controls (also usable with a mouse). */}
      <div className="mt-2 flex items-center gap-3">
        <p className="flex-1 text-left text-[12px] text-muted">{hint}</p>
        {controls === "platform" ? (
          <div className="flex gap-2" aria-label="On-screen controls">
            <TouchButton label="Move left" {...hold("left")}>
              <ChevronLeft size={20} />
            </TouchButton>
            <TouchButton label="Move right" {...hold("right")}>
              <ChevronRight size={20} />
            </TouchButton>
            <TouchButton label="Jump" {...hold("jump")}>
              <ArrowUp size={18} />
            </TouchButton>
            <TouchButton label="Interact" {...hold("interact")}>
              <Hand size={17} />
            </TouchButton>
          </div>
        ) : (
          <TouchButton label="Jump" {...hold("jump")}>
            <ArrowUp size={18} />
          </TouchButton>
        )}
      </div>
    </div>
  );
}

function HudButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-[40px] w-[40px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-white"
    >
      {children}
    </button>
  );
}

function TouchButton({ label, children, ...handlers }: { label: string; children: ReactNode } & React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...handlers}
      className="flex h-[44px] w-[44px] touch-none items-center justify-center rounded-full border border-line bg-surface/70 text-soft active:bg-accent active:text-white hover:border-accent hover:text-white"
    >
      {children}
    </button>
  );
}

/** Centered overlay card used for checkpoints/decisions inside the game area (compact, not covering the whole game). */
export function GameOverlay({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-bg/55 p-4" role="dialog" aria-label={label}>
      <div className="w-full max-w-[460px] rounded-[20px] border border-line bg-[#1b1c1e]/95 p-5 text-left shadow-[0_18px_50px_rgba(0,0,0,0.5)]">{children}</div>
    </div>
  );
}
