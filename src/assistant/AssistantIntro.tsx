/**
 * First-time introduction (Step 1 only, once): a light glass card where the mascot says hello, then
 * the same mascot flies into the assistant panel's avatar slot and the panel comes alive.
 *
 * Never blocks the form: the overlay ignores pointer events, nothing is focused automatically, and
 * touching the form (or pressing Escape) simply dismisses the card and activates the assistant.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAssistant } from "../state/assistantStore";
import { usePlatform } from "../state/platformStore";
import { Button } from "../platform/ui/controls";
import { LiveMascot } from "./LiveMascot";

const CARD_MASCOT = 84;
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

interface Flight {
  left: number;
  top: number;
  /** start offset/scale of the visible mascot (it may be mid-float when clicked) */
  ox: number;
  oy: number;
  s0: number;
  dx: number;
  dy: number;
  scale: number;
}

/* One continuous timeline (seconds): a tiny anticipation, one eased glide, a soft settle. */
const T_PREP = 0.14;
const T_FLY = 1.0;
const T_SETTLE = 0.34;
const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const easeSpeed = (u: number) => (u < 0.5 ? 12 * u * u : 3 * Math.pow(-2 * u + 2, 2) / 2) / 3; // 0…1

/** Pose at time t: position on a gentle quadratic curve, size, and a subtle squash/stretch. */
function pose(f: Flight, t: number) {
  let x = f.ox;
  let y = f.oy;
  let sc = f.s0;
  let sx = 1;
  let sy = 1;
  if (t < T_PREP) {
    // settle out of the float into a slight squash, ready to lift
    const a = Math.sin((Math.PI / 2) * (t / T_PREP));
    sy = 1 - 0.035 * a;
    sx = 1 + 0.025 * a;
  } else if (t < T_PREP + T_FLY) {
    const u = (t - T_PREP) / T_FLY;
    const p = easeInOut(u);
    // control point: rise first, then glide across into the panel
    const cx = f.ox + (f.dx - f.ox) * 0.3;
    const cy = f.oy + (f.dy - f.oy) * 0.95;
    const q = 1 - p;
    x = q * q * f.ox + 2 * q * p * cx + p * p * f.dx;
    y = q * q * f.oy + 2 * q * p * cy + p * p * f.dy;
    sc = f.s0 + (f.scale - f.s0) * p;
    // release the take-off squash smoothly, stretch gently with speed
    const release = Math.max(0, 1 - u / 0.18);
    const stretch = 0.055 * easeSpeed(u);
    sy = 1 - 0.035 * release * release + stretch;
    sx = 1 + 0.025 * release * release - stretch * 0.6;
  } else {
    x = f.dx;
    y = f.dy;
    sc = f.scale;
    const tau = Math.min(T_SETTLE, t - T_PREP - T_FLY);
    const d = 0.05 * Math.exp(-9 * tau) * Math.sin((2 * Math.PI * tau) / 0.24);
    sy = 1 - d;
    sx = 1 + d * 0.7;
  }
  return `translate3d(${x}px, ${y}px, 0) scale(${sc * sx}, ${sc * sy})`;
}

export function AssistantIntro() {
  const { state } = usePlatform();
  const { intro, setIntro, open, setOpen } = useAssistant();
  const [flight, setFlight] = useState<Flight | null>(null);
  const [leaving, setLeaving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLDivElement>(null);

  const show = intro === "pending" && state.screen === "step1";

  // Entered setup past Step 1 (deep link / review nav): no introduction.
  useEffect(() => {
    if (intro === "pending" && state.screen !== "step1") setIntro("none");
  }, [intro, state.screen, setIntro]);

  // The panel is where the mascot is heading; make sure it is there.
  useEffect(() => {
    if (show && !open) setOpen(true);
  }, [show, open, setOpen]);

  // Interacting with anything outside the card (the form, the review bar…) dismisses it gracefully.
  // Focus and the click itself are left untouched.
  useEffect(() => {
    if (!show || flight) return;
    const onOutside = (e: Event) => {
      if (cardRef.current?.contains(e.target as Node)) return;
      setIntro("skipped");
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIntro("skipped");
    document.addEventListener("pointerdown", onOutside, true);
    document.addEventListener("focusin", onOutside, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onOutside, true);
      document.removeEventListener("focusin", onOutside, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [show, flight, setIntro]);

  const start = () => {
    const src = mascotRef.current?.getBoundingClientRect();
    const seen = mascotRef.current?.querySelector("svg")?.getBoundingClientRect();
    const dst = document.querySelector<HTMLElement>("[data-assistant-avatar]")?.getBoundingClientRect();
    if (reducedMotion() || !src || !dst) {
      // Reduced motion: a simple crossfade into the panel.
      setLeaving(true);
      setIntro("played");
      return;
    }
    const v = seen ?? src;
    setFlight({
      left: src.left,
      top: src.top,
      ox: v.left + v.width / 2 - (src.left + src.width / 2),
      oy: v.top + v.height / 2 - (src.top + src.height / 2),
      s0: v.width / src.width,
      dx: dst.left + dst.width / 2 - (src.left + src.width / 2),
      dy: dst.top + dst.height / 2 - (src.top + src.height / 2),
      scale: dst.width / src.width,
    });
  };

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            key="intro"
            className="pointer-events-none fixed inset-y-0 left-0 z-[60] flex items-center justify-center"
            style={{ right: open ? "clamp(340px,27vw,420px)" : 0 }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: leaving ? 0.35 : 0.15 } }}
          >
            {/* very light dim, never blocks the form */}
            <motion.div
              className="absolute inset-0 bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: flight ? 0 : 0.22 }}
              transition={{ duration: 0.4 }}
            />
            <motion.div
              ref={cardRef}
              role="dialog"
              aria-modal={false}
              aria-labelledby="assistant-intro-title"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              className="pointer-events-auto relative w-[min(400px,calc(100%-48px))]"
            >
              {/* glass surface fades on its own so the mascot can stay visible */}
              <motion.div
                aria-hidden
                className="absolute inset-0 rounded-panel border border-white/10 bg-[#1b1c1e]/70 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                animate={{ opacity: flight ? 0 : 1 }}
                transition={{ duration: 0.3 }}
              />
              <div className="relative flex flex-col items-center px-9 pb-7 pt-9 text-center">
                <div ref={mascotRef} style={{ width: CARD_MASCOT, height: CARD_MASCOT, visibility: flight ? "hidden" : "visible" }}>
                  <LiveMascot size={CARD_MASCOT} float />
                </div>
                <motion.div animate={{ opacity: flight ? 0 : 1, y: flight ? 4 : 0 }} transition={{ duration: 0.22 }}>
                  <h2 id="assistant-intro-title" className="mt-6 text-xl font-bold">
                    Hey! I'm your TopFan companion.
                  </h2>
                  <p className="mt-3 text-sm leading-[21px] text-soft">
                    I'll help you set up your website, take care of the tricky parts, and guide you whenever you need me. You're
                    always in control.
                  </p>
                  <div className="mt-7 flex justify-center">
                    <Button onClick={start}>Let's get started</Button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The same mascot travelling to the panel avatar: one rAF-driven transform, no keyframe seams. */}
      {flight && <Flyer flight={flight} onArrive={() => setIntro("played")} onDone={() => setFlight(null)} />}
    </>
  );
}

function Flyer({ flight, onArrive, onDone }: { flight: Flight; onArrive: () => void; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef({ onArrive, onDone });
  cb.current = { onArrive, onDone };

  useEffect(() => {
    const el = ref.current!;
    const total = T_PREP + T_FLY + T_SETTLE;
    let raf = 0;
    let t0 = 0;
    let done: ReturnType<typeof setTimeout> | undefined;
    el.style.transform = pose(flight, 0);
    const frame = (now: number) => {
      if (!t0) t0 = now;
      const t = Math.min(total, (now - t0) / 1000);
      el.style.transform = pose(flight, t);
      if (t < total) {
        raf = requestAnimationFrame(frame);
        return;
      }
      // At rest and pixel-aligned with the panel avatar: reveal the avatar underneath first,
      // then remove this copy a moment later, so there is never an empty frame.
      cb.current.onArrive();
      done = setTimeout(() => cb.current.onDone(), 120);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [flight]);

  return (
    <div
      ref={ref}
      aria-hidden
      data-intro-flight
      className="pointer-events-none fixed z-[70] will-change-transform"
      style={{ left: flight.left, top: flight.top, width: CARD_MASCOT, height: CARD_MASCOT, transformOrigin: "50% 50%" }}
    >
      <LiveMascot size={CARD_MASCOT} />
    </div>
  );
}
