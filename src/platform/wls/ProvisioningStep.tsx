/**
 * Provisioning and its resolved state, Site Activated (OB 16-42-29 / 17-13-38; P50 bundle copy), as one continuous screen.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DomainDetailsModal } from "./ManageWls";
import { Check, ChevronDown, Copy, Hourglass } from "lucide-react";
import { CreatorQuest } from "./quest/CreatorQuest";
import { useQuest } from "../../state/questStore";
import { PROVISION_ESTIMATE_S, siteAddress, usePlatform } from "../../state/platformStore";
import { Button, OutlineButton } from "../ui/controls";
import { OutlinePill } from "../ui/surfaces";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const TRACKER = [
  { short: "Domain submitted", full: "Domain submitted successfully" },
  { short: "DNS configured", full: "DNS CNAME records configured" },
  { short: "Provisioning", full: "White Label Site Provisioning" },
  { short: "Site activated", full: "Site Activated" },
];

/**
 * Quiet dot stepper (tertiary to the timer and the mascot). `current` = index of the in-progress step;
 * earlier steps are done, and current === length means all done. Display only: dots are not clickable.
 */
export function Tracker({ current }: { current: number }) {
  const n = TRACKER.length;
  const shown = Math.min(current, n - 1);
  const all = current >= n; // final state: every node completed (red = completed)
  return (
    <div className="flex flex-col items-center">
      <ol aria-label={all ? "Provisioning progress: all steps completed" : "Provisioning progress"} className="relative flex h-6 w-[340px] items-center justify-between">
        {/* 1px rail between dot centers (24px cells). Segments end exactly at each dot or at the active ring's edge. */}
        {TRACKER.slice(1).map((_, i) => {
          const from = i === current ? 12 : 4.5;
          const to = i + 1 === current ? 12 : 4.5;
          return (
            <span
              key={i}
              aria-hidden
              className={`absolute top-1/2 h-px -translate-y-1/2 transition-colors duration-700 ${all ? "bg-accent/60" : i < current ? "bg-muted opacity-60" : "bg-line"}`}
              style={{
                left: `calc(12px + (100% - 24px) * ${i / (n - 1)} + ${from}px)`,
                width: `calc((100% - 24px) / ${n - 1} - ${from + to}px)`,
              }}
            />
          );
        })}
        {TRACKER.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const state = done ? "completed" : active ? "in progress" : "upcoming";
          return (
            <li
              key={step.full}
              title={step.full}
              aria-label={`Step ${i + 1} of ${n}: ${step.full}, ${state}`}
              aria-current={active ? "step" : undefined}
              className="relative flex h-6 w-6 items-center justify-center"
            >
              {active && (
                <span aria-hidden className="stepper-ring absolute inset-0 rounded-full border border-accent" />
              )}
              <span
                aria-hidden
                className={`relative h-[9px] w-[9px] rounded-full transition-colors duration-700 ${all ? "bg-accent" : done ? "bg-muted" : active ? "bg-accent" : "bg-white/20"}`}
              />
            </li>
          );
        })}
      </ol>
      <p aria-hidden className="mt-4 text-[13px] text-soft">
        {TRACKER[shown].short}
      </p>
      <p aria-hidden className="mt-1 text-[11px] font-bold uppercase tracking-[2px] text-muted">
        {all ? `Step ${n} of ${n} · All steps completed` : `Step ${shown + 1} of ${n}`}
      </p>
    </div>
  );
}

/** Re-render once a second; time itself always comes from the stored start timestamp. */
function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/** Copy the site address with a visible + announced confirmation. */
function CopyUrl({ url }: { url: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 2400);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <>
      <OutlineButton
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setState("copied");
          } catch {
            setState("failed");
          }
        }}
        icon={state === "copied" ? <Check size={15} strokeWidth={3} /> : <Copy size={14} />}
        className="!h-[40px] !px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        data-copy-url
      >
        {state === "copied" ? "Copied" : "Copy URL"}
      </OutlineButton>
      <span role="status" className="sr-only">
        {state === "copied" ? "Website address copied" : state === "failed" ? "Couldn't copy. Select the address to copy it." : ""}
      </span>
      {state === "failed" && <span className="w-full text-[12px] text-soft">Couldn't copy. Select the address to copy it.</span>}
    </>
  );
}

/**
 * Provisioning and its completed state are one screen: the same space, orbit, pill and tracker.
 * When the real status flips to done, the orbit slows and resolves into a check, the copy changes and
 * the site address appears. Opening "complete" directly renders the resolved state without replaying.
 */
export function ProvisioningStep() {
  const { state, go, patch } = usePlatform();
  // Simulated status. In the product this comes from polling build_status, never from the countdown or the games.
  const done = state.provisionDone || state.screen === "complete";
  const quest = useQuest();
  const questOpen = quest.view.kind !== "closed";
  const playing = quest.view.kind === "play";
  const reduce = useReducedMotion();
  const now = useNow(!done);
  const started = state.provisionStartedAt ?? now;
  const elapsed = Math.max(0, Math.floor((now - started) / 1000));
  const left = PROVISION_ESTIMATE_S - elapsed;
  const overrun = left <= 0;
  const url = `https://${siteAddress(state)}`;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);

  /* Resolution timeline: 0 provisioning · 1 orbit slows, timer leaves · 2 ring + check, new copy · 3 address + tracker · 4 actions. */
  const [stage, setStage] = useState(done ? 4 : 0);
  const animate = useRef(!done); // false when the page opened already complete
  useEffect(() => {
    if (!done) {
      animate.current = true;
      setStage(0);
      return;
    }
    if (stage === 4) return;
    if (reduce || !animate.current) return setStage(4);
    setStage(1);
    const ts = [setTimeout(() => setStage(2), 1100), setTimeout(() => setStage(3), 1800), setTimeout(() => setStage(4), 2300)];
    return () => ts.forEach(clearTimeout);
  }, [done]);

  // Ready while Creator Quest is open: never yank the creator out of a game. Keep the game as it is,
  // show a quiet notice, and move on only when they choose to.
  // Derived in render (not only in an effect) so the game is never unmounted for even one frame.
  const [heldFlag, setHeld] = useState(false);
  const held = state.screen === "provisioning" && state.provisionDone && (heldFlag || questOpen);
  useEffect(() => {
    if (!state.provisionDone || state.screen !== "provisioning") return;
    if (questOpen || heldFlag) setHeld(true);
    else go("complete");
  }, [state.provisionDone]);
  const leaveGame = () => {
    setHeld(false);
    quest.setView({ kind: "closed" });
    go("complete");
  };
  const showQuest = !done || held;
  const resolved = stage >= 2;
  const fade = (delay = 0) =>
    reduce || !animate.current
      ? { initial: false as const }
      : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 }, transition: { duration: 0.4, delay, ease: EASE_OUT } };

  return (
    <>
      <h3 className="mb-6 text-[27.5px] font-medium">Setup Your White Label Site Domain</h3>
      {/* No surface card: provisioning and completion sit directly in the space backdrop. */}
      <div className="flex flex-col items-center px-10 pb-10 pt-4 text-center" data-provisioning={resolved ? "complete" : "in-progress"}>
        {/* A — status + headline (one pill, one heading: the copy resolves in place) */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={resolved ? "pill-done" : "pill"} {...fade()}>
            <OutlinePill className="gap-2 tracking-[1.5px]">
              {resolved && <Check size={15} strokeWidth={3} className="text-accent" />}
              {resolved ? "White Label Site Activated" : "White Label Site Provisioning In Process"}
            </OutlinePill>
          </motion.div>
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={resolved ? "head-done" : "head"} {...fade(0.05)}>
            <h2 className="mt-5 text-[26px] font-bold">{resolved ? "Your website is ready!" : "Your White Label Site is Being Provisioned"}</h2>
            <p className="mt-2 text-[15px] text-soft">
              {resolved ? (
                "Your TopFan website has been configured successfully."
              ) : (
                <>
                  Provisioning can take up to <span className="font-bold text-white">10 minutes</span> to complete globally.
                </>
              )}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* B — the same orbit: countdown while provisioning, check when activated */}
        <div
          className="mt-4 flex items-start justify-center overflow-visible transition-[height] duration-500 ease-out"
          style={{ height: showQuest && questOpen ? 190 : 256 }}
        >
          <div
            className="origin-top transition-transform duration-500 ease-out"
            style={{ transform: `scale(${showQuest && questOpen ? 0.74 : 1})` }}
          >
            <OrbitLoader left={left} overrun={overrun} complete={stage >= 1} animate={animate.current && !reduce} dim={playing && !done} />
          </div>
        </div>

        {/* Website ready while playing: quiet notice, the creator decides when to leave the game. */}
        {held && (
          <div
            role="status"
            data-site-ready
            className="sticky top-4 z-20 mt-4 flex w-full max-w-[760px] items-center gap-3 rounded-pill border border-accent bg-[#1b1c1e]/95 py-2 pl-4 pr-2 text-left shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent">
              <Check size={12} strokeWidth={3.5} />
            </span>
            <span className="min-w-0 flex-1 text-[13px]">
              <b>Your website is ready</b> <span className="text-soft">at {siteAddress(state)}. Finish your game, or continue when you're ready.</span>
            </span>
            <button
              onClick={leaveGame}
              className="h-9 shrink-0 rounded-pill bg-accent px-4 text-[12px] font-black uppercase tracking-caps hover:brightness-110"
            >
              Continue to my site
            </button>
          </div>
        )}

        {/* C — the result: the live address, then what to do with it */}
        {done && !held && stage >= 3 && (
          <motion.div key="result" {...fade()} className="mt-2 flex w-full max-w-[640px] flex-col items-center" data-site-url>
            <p className="text-[11px] font-bold uppercase tracking-[2px] text-muted">Your website address</p>
            <div className="mt-2 flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <span className="min-w-0 break-all text-[24px] font-bold leading-8 text-white" data-url>
                {url}
              </span>
              <CopyUrl url={url} />
            </div>
          </motion.div>
        )}
        {done && !held && stage >= 4 && (
          <motion.div key="actions" {...fade(0.05)} className="flex w-full max-w-[640px] flex-col items-center">
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
              <Button onClick={() => go("manage")} className="!h-[44px] px-7">
                Go to my site
              </Button>
              <button onClick={() => setDetailsOpen(true)} className="h-[44px] px-2 text-[13px] font-bold text-soft underline-offset-4 hover:text-white hover:underline">
                View domain details
              </button>
            </div>
            <p className="mt-4 text-[13px] text-soft">
              Next, personalize your logo and colors in{" "}
              <button onClick={() => go("manage")} className="font-bold text-white underline underline-offset-2 hover:text-accent">
                White Label Site preferences
              </button>
              .
            </p>
          </motion.div>
        )}

        {/* D — optional Creator Quest (never affects provisioning) */}
        {showQuest && (
          <div className="mt-6 w-full max-w-[760px]" data-field="creator-quest">
            <CreatorQuest />
          </div>
        )}

        {/* E — milestones: the same tracker reaches 4 of 4 */}
        <div className={`${done && !held ? "mt-10" : "mt-12"} w-full max-w-[760px]`}>
          <Tracker current={stage >= 3 || (held && resolved) ? TRACKER.length : 2} />
        </div>

        {/* F — supporting information */}
        {!done ? (
          <>
            <p className="mt-9 text-sm text-soft">You don't need to stay on this page - You can safely navigate away and explore other features.</p>
            <p className="mt-2 text-sm text-soft">
              While you wait, we recommend downloading and reviewing our{" "}
              <a href="#" onClick={(e) => e.preventDefault()} className="font-bold text-accent underline">
                Onboarding Guide.
              </a>
            </p>
          </>
        ) : (
          !held &&
          stage >= 4 && (
            <motion.div key="change" {...fade(0.1)} className="mt-9 flex w-full max-w-[640px] flex-col items-center">
              <button
                onClick={() => setChangeOpen((o) => !o)}
                aria-expanded={changeOpen}
                aria-controls="change-domain"
                className="inline-flex min-h-[40px] items-center gap-1.5 text-[13px] text-muted hover:text-white"
              >
                Need to change your domain later?
                <ChevronDown size={15} className={`transition-transform duration-300 ${changeOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {changeOpen && (
                  <motion.div
                    id="change-domain"
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: EASE_OUT }}
                    className="overflow-hidden"
                  >
                    <p className="mt-2 max-w-[560px] text-[13px] leading-5 text-soft">
                      To change your website's DNS / URL address, open{" "}
                      <button onClick={() => setDetailsOpen(true)} className="font-bold text-white underline underline-offset-2">
                        View domain details
                      </button>{" "}
                      and use delete at the bottom. If you delete your domain settings, your content and cover pages will remain intact, but you'll
                      need to set up your domain name and white label site color and logo preferences again.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        )}

        {/* Review-only shortcuts; the real screen polls build_status every minute. */}
        {!done && (
          <div className="mt-7 flex gap-5 text-xs text-muted">
            <button
              disabled={overrun}
              onClick={() => patch({ provisionStartedAt: Date.now() - PROVISION_ESTIMATE_S * 1000 })}
              className="underline hover:text-white disabled:no-underline disabled:opacity-50"
            >
              Simulate: estimate runs over
            </button>
            <button onClick={() => patch({ provisionDone: true })} className="underline hover:text-white">
              Simulate: finish provisioning
            </button>
          </div>
        )}
      </div>
      <DomainDetailsModal open={detailsOpen} onClose={() => setDetailsOpen(false)} />
    </>
  );
}

/**
 * Ambient countdown (after a radial loader reference, in the platform red). The orbit and glow are
 * decorative: their position never encodes progress. The time label itself stays still.
 */
function OrbitLoader({ left, overrun, complete, animate, dim }: { left: number; overrun: boolean; complete: boolean; animate: boolean; dim: boolean }) {
  // On completion the spinning arc eases to a stop and fades while the full ring draws in.
  const spin = useRef<SVGGElement>(null);
  const [spinning, setSpinning] = useState(!complete);
  useEffect(() => {
    if (!complete) return setSpinning(true);
    if (!animate) return setSpinning(false);
    const anims = spin.current?.getAnimations?.() ?? [];
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 1000);
      // 4x speed-up first reads as "arriving", then a smooth ease to rest
      const rate = k < 0.25 ? 1 + k * 12 : 4 * Math.pow(1 - (k - 0.25) / 0.75, 2);
      anims.forEach((a) => (a.playbackRate = Math.max(0.0001, rate)));
      if (k < 1) raf = requestAnimationFrame(tick);
      else setSpinning(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [complete]);

  const mm = String(Math.floor(Math.max(0, left) / 60)).padStart(2, "0");
  const ss = String(Math.max(0, left) % 60).padStart(2, "0");
  const minutes = Math.ceil(Math.max(0, left) / 60);
  const announce = complete
    ? "Provisioning complete. Your website is ready."
    : overrun
      ? "Taking a little longer than expected. Still checking the status."
      : `About ${minutes} minute${minutes === 1 ? "" : "s"} remaining.`;

  const S = 256;
  const R = 121;
  const C = S / 2;
  const SEGMENTS = 14;
  const SPAN = 80; // degrees of lit arc trailing the indicator
  const arc = (a0: number, a1: number) => {
    const p = (a: number) => [C + R * Math.cos(((a - 90) * Math.PI) / 180), C + R * Math.sin(((a - 90) * Math.PI) / 180)];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return `M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}`;
  };

  return (
    <div className="relative" style={{ width: S, height: S }}>
      {/* soft breathing glow */}
      <div
        aria-hidden
        className={`orbit-glow pointer-events-none absolute -inset-20 rounded-full transition-opacity duration-1000 ${complete ? "opacity-60" : dim ? "opacity-45" : "opacity-100"}`}
        style={{ background: "radial-gradient(circle, rgb(var(--configThemeColorRgb) / 0.2) 0%, rgb(var(--configThemeColorRgb) / 0.07) 38%, rgb(var(--configThemeColorRgb) / 0.02) 55%, transparent 70%)" }}
      />
      <svg aria-hidden viewBox={`0 0 ${S} ${S}`} className="absolute inset-0 h-full w-full overflow-visible">
        <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
        {complete && (
          <motion.circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2.5}
            style={{ rotate: -90, transformOrigin: `${C}px ${C}px` }}
            initial={animate ? { pathLength: 0, opacity: 0.6 } : false}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.45, ease: [0.45, 0, 0.2, 1] as const }}
            data-orbit-complete
          />
        )}
        {spinning && (
          <g
            ref={spin}
            className="orbit-spin transition-opacity duration-700"
            style={{ transformOrigin: `${C}px ${C}px`, opacity: complete ? 0 : 1, transitionDelay: complete ? "300ms" : "0ms" }}
          >
            <path d={arc(-SPAN, 0)} fill="none" stroke="var(--accent)" strokeWidth={8} opacity={0.18} style={{ filter: "blur(6px)" }} />
            {Array.from({ length: SEGMENTS }).map((_, i) => (
              <path
                key={i}
                d={arc(-((i + 1) * SPAN) / SEGMENTS, -(i * SPAN) / SEGMENTS + 0.6)}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2.5}
                opacity={Math.pow(1 - i / SEGMENTS, 1.6)}
              />
            ))}
            <circle cx={C} cy={C - R} r={9} fill="var(--accent)" opacity={0.35} style={{ filter: "blur(4px)" }} />
            <circle cx={C} cy={C - R} r={3.5} fill="#fff" />
          </g>
        )}
      </svg>

      {/* dark core: stationary time, or the success check */}
      <div
        className="absolute rounded-full bg-black/55"
        style={{ inset: 36, boxShadow: "0 0 56px rgb(var(--configThemeColorRgb) / 0.2), inset 0 0 0 1px rgba(255,255,255,0.05)" }}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={complete ? "check" : overrun ? "overrun" : "time"}
            aria-hidden
            className="absolute inset-0 flex flex-col items-center justify-center px-6"
            exit={{ opacity: 0, scale: 0.96, transition: { duration: animate ? 0.4 : 0 } }}
          >
            {complete ? (
              <motion.span
                data-orbit-check
                initial={animate ? { opacity: 0, scale: 0.6 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={animate ? { type: "spring", stiffness: 260, damping: 18, delay: 1.05 } : { duration: 0 }}
              >
                <Check size={52} strokeWidth={2} className="text-accent" />
              </motion.span>
            ) : overrun ? (
              <>
                <Hourglass size={30} strokeWidth={1.75} className="text-soft" />
                <span className="mt-3 text-[18px] font-medium leading-6">Taking a little longer than expected</span>
                <span className="mt-1.5 text-[13px] text-muted">Still checking the status</span>
              </>
            ) : (
              <span className="text-[52px] font-light leading-none tracking-[1px] tabular-nums">
                {mm}:{ss}
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div role="status" className="sr-only">
        {announce}
      </div>
    </div>
  );
}
