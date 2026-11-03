/**
 * Live version of the approved red jelly mascot (public/assets/mascot.png): same rounded-square
 * body, glossy top-left highlight, bright rim and soft red glow, drawn as SVG so the face can blink
 * and glance. One component everywhere (welcome card, intro flight, panel avatar) so it is always
 * the same character.
 */
import { useEffect, useId, useState } from "react";
import { motion } from "framer-motion";
import type { Mood } from "../state/assistantStore";

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export function LiveMascot({
  size,
  float = false,
  glow = true,
  mood = "idle",
}: {
  size: number;
  float?: boolean;
  glow?: boolean;
  mood?: Mood;
}) {
  const id = useId().replace(/:/g, "");
  const [blink, setBlink] = useState(false);
  const [look, setLook] = useState(0);

  // Natural blinking and small glances, on independent random timers.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    let u: ReturnType<typeof setTimeout>;
    const blinkLoop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 130);
        blinkLoop();
      }, 2400 + Math.random() * 2600);
    };
    const lookLoop = () => {
      u = setTimeout(() => {
        setLook(Math.random() < 0.4 ? 0 : (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.6));
        lookLoop();
      }, 1800 + Math.random() * 2400);
    };
    blinkLoop();
    lookLoop();
    return () => {
      clearTimeout(t);
      clearTimeout(u);
    };
  }, []);

  const still = reducedMotion();
  // Conversation moods reuse the base expressions; "listening" has its own open-mouth face.
  const face =
    mood === "generating" ? "thinking" : mood === "transcribing" ? "checking" : mood === "error" ? "thoughtful" : mood === "responding" ? "idle" : mood;
  const svg = (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden
      className={`block overflow-visible ${face === "thinking" ? "mascot-think" : ""}`}
      style={glow ? { filter: `drop-shadow(0 0 ${Math.max(2, size * 0.08)}px rgba(var(--mascot-glow),0.55))` } : undefined}
    >
      <defs>
        <radialGradient id={`${id}b`} cx="50%" cy="55%" r="62%">
          <stop offset="0%" style={{ stopColor: "var(--mascot-1)" }} />
          <stop offset="62%" style={{ stopColor: "var(--mascot-2)" }} />
          <stop offset="100%" style={{ stopColor: "var(--mascot-3)" }} />
        </radialGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* body */}
      <rect x="7" y="7" width="86" height="86" rx="23" fill={`url(#${id}b)`} />
      {/* bright inner rim */}
      <rect x="8.2" y="8.2" width="83.6" height="83.6" rx="22" fill="none" style={{ stroke: "var(--mascot-rim)" }} strokeWidth="1.2" />
      {/* gloss */}
      <path d="M17 34 C17 22 24 15 38 14 C44 14 45 18 40 20 C30 23 24 28 22 36 C21 40 17 40 17 34 Z" fill={`url(#${id}g)`} />
      {/* face — expression follows the mood */}
      <g
        style={{
          transform: `translate(${face === "thinking" ? -1.4 : face === "thoughtful" ? -1 : look * 1.6}px, ${
            face === "thinking" ? -2.4 : face === "thoughtful" ? 1.4 : 0
          }px)`,
          transition: "transform 260ms ease-out",
        }}
      >
        {[32, 68].map((cx) =>
          face === "happy" ? (
            <path key={cx} d={`M${cx - 4.6} 51.5 Q${cx} 44.5 ${cx + 4.6} 51.5`} fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          ) : (
            <ellipse
              key={cx}
              cx={cx}
              cy="50"
              rx={face === "checking" || face === "listening" ? 5 : 4.6}
              ry={face === "checking" || face === "listening" ? 7.2 : 6.6}
              fill="#fff"
              style={{ transformOrigin: `${cx}px 50px`, transform: `scaleY(${blink ? 0.12 : 1})`, transition: "transform 70ms ease-in-out" }}
            />
          ),
        )}
        {face === "listening" ? (
          <ellipse cx="50" cy="60" rx="3.2" ry="3.6" fill="none" stroke="#fff" strokeWidth="2.4" />
        ) : (
        <path
          d={
            face === "happy"
              ? "M42.5 57.5 Q50 65 57.5 57.5"
              : face === "thoughtful"
                ? "M45 61 Q50 59 55 61"
                : face === "thinking"
                  ? "M46.5 60 L53.5 60"
                  : "M44 58.5 Q50 63.5 56 58.5"
          }
          fill="none"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        )}
      </g>
    </svg>
  );

  if (!float || still) return svg;
  return (
    <motion.div
      animate={{ y: [0, -4, 0], scaleY: [1, 1.025, 1], scaleX: [1, 0.985, 1] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: "50% 100%" }}
    >
      {svg}
    </motion.div>
  );
}
