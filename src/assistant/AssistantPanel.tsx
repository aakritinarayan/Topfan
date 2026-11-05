/**
 * Assistant overlay layer: right-hand panel (expanded) or an edge launcher (collapsed).
 * Built only from platform parts (DESIGN_NOTES §8). Collapsing never resets anything.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Check, ChevronDown, ChevronRight, CircleAlert, Loader2, Mic, RotateCcw, Square, X } from "lucide-react";
import { useAssistant, type Msg, type MsgStatus } from "../state/assistantStore";
import { isOnboarding, usePlatform, type PlatformState } from "../state/platformStore";
import { LiveMascot } from "./LiveMascot";
import { ActiveTaskCard, PageContextBar, PlatformWelcome } from "./platform/TaskCard";
import { useChat } from "./chat/ChatEngine";
import { AutopilotNotice, AutopilotView } from "./platform/Autopilot";
import { useAPView } from "./platform/autopilotView";
import { useVoice, type VoiceState } from "./chat/useVoice";
import { Answer, ListenButton } from "./chat/Answer";
import { useRouter } from "../app/router";
import { resolve } from "../app/routeCatalog";

/** Mascot avatar: the live red jelly (blinks, glances) with mood expressions; a small bob while working. */
export function Mascot({ size = 32 }: { size?: number }) {
  const { working, mood } = useAssistant();
  const busy = working || mood === "checking" || mood === "generating" || mood === "transcribing";
  return (
    <motion.span
      key={mood === "happy" ? "happy" : "base"}
      animate={
        mood === "happy"
          ? { y: [0, -4, 0, -1.5, 0], scaleY: [1, 1.05, 0.95, 1.02, 1] }
          : busy
            ? { y: [0, -1.5, 0] }
            : { y: 0, scaleY: 1 }
      }
      transition={mood === "happy" ? { duration: 0.75, ease: "easeOut" } : busy ? { repeat: Infinity, duration: 0.9, ease: "easeInOut" } : { duration: 0.2 }}
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, transformOrigin: "50% 100%" }}
    >
      <LiveMascot size={size} mood={mood} />
    </motion.span>
  );
}

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/**
 * Opening a page starts the chat fresh for it: older chats fold behind "See older chats" and the page's
 * intro and actions come first. Pages opened from the panel or by the assistant mid-task (a message just arrived)
 * don't fold.
 * Kept outside the component: the panel remounts when the page layout changes.
 */
const pageStart = { route: "", cut: 0, showOlder: false, msgs: 0, lastMsgAt: 0 };

export function AssistantPanel() {
  const { state } = usePlatform();
  const onboarding = isOnboarding(state.screen);
  const apView = useAPView();
  const { open, setOpen, messages, working, stop, intro, setMood } = useAssistant();
  const chat = useChat();
  const voice = useVoice();
  const input = useRef<HTMLInputElement>(null);
  // During the first-time intro the panel keeps its place but stays quiet until the mascot lands.
  const waiting = intro === "pending" && state.screen === "step1";
  const reveal = (delay: number) => ({
    initial: false as const,
    animate: { opacity: waiting ? 0 : 1, y: waiting ? 6 : 0 },
    transition: { duration: 0.35, delay: waiting ? 0 : delay },
  });
  const scroller = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");

  const routeId = resolve(useRouter().path).route.id;
  const [, rerender] = useState(0);
  // Declared before the route effect so a message sent just before the assistant navigates counts as recent.
  useEffect(() => {
    if (messages.length !== pageStart.msgs) (pageStart.msgs = messages.length), (pageStart.lastMsgAt = Date.now());
  }, [messages.length]);
  useEffect(() => {
    const prev = pageStart.route;
    if (prev === routeId) return;
    pageStart.route = routeId;
    if (!prev || onboarding || Date.now() - pageStart.lastMsgAt < 800 || messages.every((m) => m.dismissible)) return;
    pageStart.cut = messages.length;
    pageStart.showOlder = false;
    rerender((n) => n + 1);
  }, [routeId]);
  const cut = pageStart.cut <= messages.length ? pageStart.cut : 0;
  const recent = cut ? messages.slice(cut) : messages;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    // Chrome can cancel a smooth scroll when another one starts elsewhere; settle at the bottom regardless.
    const t = setTimeout(() => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight > 4) el.scrollTo({ top: el.scrollHeight });
    }, 700);
    return () => clearTimeout(t);
  }, [messages.length, working, open, chat.status]);

  // Mascot follows the voice input; the chat engine sets the answering moods.
  useEffect(() => {
    if (voice.state === "recording" || voice.state === "permission") setMood("listening");
    else if (voice.state === "transcribing") setMood("transcribing");
    else if (voice.state === "failed") setMood("error");
    else if (voice.state === "ready") setMood("idle");
  }, [voice.state, setMood]);

  // Transcript ready: put it in the input to review and edit. Nothing is sent automatically.
  useEffect(() => {
    if (voice.state !== "ready") return;
    setDraft((d) => (d.trim() ? `${d.trim()} ${voice.transcript}` : voice.transcript));
    requestAnimationFrame(() => input.current?.focus());
  }, [voice.state]);

  // Only an open from the floating mascot slides in; the intro landing and restores appear in place.
  const slideIn = useMemo(() => open && openedFromLauncher && !reducedMotion(), [open]);
  useEffect(() => {
    if (open) openedFromLauncher = false;
  }, [open]);

  // Collapsing the panel never leaves the microphone on.
  useEffect(() => {
    if (!open) voice.cancel();
  }, [open]);

  if (!open) return <Launcher />;

  const listening = voice.state === "permission" || voice.state === "recording" || voice.state === "transcribing";
  const answering = chat.status !== "idle";
  const send = () => {
    const t = draft.trim();
    if (!t || answering || listening) return;
    setDraft("");
    voice.clear();
    chat.ask(t);
  };

  return (
    // Floating card. From 1120px: a page-colored rail beside the page, holding the card 16px from the top, right and
    // bottom. Narrower screens can't fit both, so the card opens as a sheet over a dimmed page (tap outside to close).
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 p-3 min-[1120px]:sticky min-[1120px]:inset-auto min-[1120px]:top-0 min-[1120px]:z-30 min-[1120px]:h-screen min-[1120px]:shrink-0 min-[1120px]:bg-bg min-[1120px]:p-0 min-[1120px]:py-4 min-[1120px]:pr-4"
      data-testid="ai-panel-rail"
      // A page opened from inside the panel (an action, chip or link) is part of the conversation: don't fold it.
      onClickCapture={() => (pageStart.lastMsgAt = Date.now())}
      onClick={(e) => {
        if (e.target === e.currentTarget && !window.matchMedia("(min-width: 1120px)").matches) setOpen(false);
      }}
    >
    <motion.aside
      aria-label="TopFan AI"
      data-testid="ai-panel"
      className="relative flex h-full w-full max-w-[420px] flex-col min-[1120px]:w-[clamp(320px,27vw,420px)] rounded-[28px] border border-line bg-bg shadow-[0_18px_50px_rgba(0,0,0,.55),0_2px_8px_rgba(0,0,0,.35)]"
      initial={slideIn ? { opacity: 0, x: 24 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Collapse handle: centered on the panel's left edge. */}
      <button
        onClick={() => setOpen(false)}
        aria-label="Collapse assistant"
        title="Collapse"
        data-testid="ai-collapse"
        className="absolute left-0 top-1/2 z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg hover:brightness-90"
      >
        <ChevronRight size={18} strokeWidth={2.5} />
      </button>
      {/* Header — same height as the page header */}
      <div className="flex h-[75px] shrink-0 items-center gap-3 border-b border-line px-6">
        {/* Landing spot for the intro mascot (the flight itself does the settle). */}
        <motion.span
          data-assistant-avatar
          className="inline-flex"
          style={{ transformOrigin: "50% 100%" }}
          initial={false}
          animate={{ opacity: waiting ? 0 : 1 }}
          // Instant after the flight (the travelling mascot is exactly on top); a short fade otherwise.
          transition={{ duration: intro === "played" && !reducedMotion() ? 0 : 0.3 }}
        >
          <Mascot size={36} />
        </motion.span>
        <motion.div {...reveal(0.05)} className="flex flex-1 items-center gap-3" inert={waiting}>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-base font-bold leading-tight">TopFan AI</span>
            <span className="truncate text-[11px] text-soft">
              Your Creator Companion
              {chat.connected === false && !onboarding && (
                <span data-testid="ai-demo-mode" title="No AI model is connected: I can find features, guide tasks and show what needs attention." className="ml-2 rounded-full border border-line px-1.5 py-px text-[10px] font-bold uppercase tracking-caps text-white">
                  Demo mode
                </span>
              )}
            </span>
          </span>
        </motion.div>
      </div>

      <motion.div {...reveal(0.15)} className="flex shrink-0 flex-col gap-2 px-6 pb-1 pt-4" inert={waiting}>
        {onboarding ? (
          <Checklist state={state} />
        ) : (
          <>
            <ActiveTaskCard />
            {!apView && <AutopilotNotice />}
          </>
        )}
      </motion.div>

      {/* Conversation */}
      <motion.div {...reveal(0.25)} ref={scroller} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 pb-4 pt-5 [mask-image:linear-gradient(to_bottom,transparent_0,#000_20px)]" inert={waiting}>
        {!onboarding && apView ? (
          <AutopilotView />
        ) : (
          <>
            {!onboarding && messages.every((m) => m.dismissible) && <PlatformWelcome />}
            {cut > 0 && (
              <>
                <button
                  type="button"
                  data-testid="ai-older-toggle"
                  aria-expanded={pageStart.showOlder}
                  onClick={() => ((pageStart.showOlder = !pageStart.showOlder), rerender((n) => n + 1))}
                  className="flex items-center gap-1.5 self-center rounded-full border border-line px-3 py-1 text-[12px] text-soft hover:border-accent hover:text-white"
                >
                  <ChevronDown size={14} className={pageStart.showOlder ? "rotate-180" : ""} />
                  {pageStart.showOlder ? "Hide older chats" : "See older chats"}
                </button>
                <div className={pageStart.showOlder ? "flex flex-col gap-3" : "hidden"} data-testid="ai-older">
                  {messages.slice(0, cut).map((m) => (
                    <MessageView key={m.id} m={m} />
                  ))}
                </div>
                {!onboarding && <PlatformWelcome />}
              </>
            )}
            {recent.map((m) => (
              <MessageView key={m.id} m={m} />
            ))}
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {working && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-6 mb-3 flex shrink-0 items-center gap-3 rounded-pill bg-surface py-2 pl-4 pr-2"
          >
            <Loader2 size={16} className="shrink-0 animate-spin text-accent" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold">Assistant is working…</span>
              <span className="block truncate text-xs text-soft">{working.label}</span>
            </span>
            <button
              onClick={stop}
              className="h-8 shrink-0 rounded-full border border-accent px-4 text-xs font-black uppercase tracking-caps text-accent hover:bg-accent-tint"
            >
              Stop
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {answering && !working && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-6 mb-3 flex shrink-0 items-center gap-3 rounded-pill bg-surface py-2 pl-4 pr-2"
            role="status"
          >
            <Loader2 size={16} className="shrink-0 animate-spin text-accent" />
            <span className="min-w-0 flex-1 text-[13px] font-bold">{chat.status === "sending" ? "Thinking…" : "Answering…"}</span>
            <button
              onClick={chat.cancel}
              className="h-8 shrink-0 rounded-full border border-accent px-4 text-xs font-black uppercase tracking-caps text-accent hover:bg-accent-tint"
            >
              Stop
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!onboarding && !apView && !working && !answering && !recent.every((m) => m.dismissible) && <PageContextBar />}

      <VoiceStatus state={voice.state} error={voice.error} onCancel={voice.cancel} onRetry={voice.start} onStop={voice.stop} />

      {/* Chat input */}
      <motion.form
        {...reveal(0.3)}
        inert={waiting}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex shrink-0 items-center gap-2 border-t border-line px-6 pb-5 pt-4"
      >
        <input
          ref={input}
          value={listening ? voice.transcript : draft}
          readOnly={listening}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={listening ? "Listening…" : "Ask TopFan AI…"}
          aria-label="Message TopFan AI"
          data-testid="ai-input"
          maxLength={2000}
          className="h-11 min-w-0 flex-1 rounded-pill bg-surface px-5 text-sm text-white outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
        />
        <MicButton
          supported={voice.supported}
          state={voice.state}
          onStart={voice.start}
          onStop={voice.stop}
        />
        <button
          aria-label="Send"
          disabled={answering || listening || !draft.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent hover:brightness-110 disabled:opacity-65 disabled:hover:brightness-100"
        >
          <ArrowUp size={18} />
        </button>
      </motion.form>
    </motion.aside>
    </div>
  );
}

/* ---------- Voice input ---------- */

const VOICE_NOTICE =
  "Voice uses your browser's speech recognition. In Chrome, your audio is processed by Google to turn it into text. Nothing is recorded until you tap the mic, and TopFan doesn't keep the audio.";

function MicButton({ supported, state, onStart, onStop }: { supported: boolean; state: VoiceState; onStart: () => void; onStop: () => void }) {
  if (!supported)
    return (
      <button
        type="button"
        disabled
        aria-label="Voice input isn't supported in this browser"
        title="Voice input isn't supported in this browser. You can type instead."
        className="flex h-11 w-11 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-line text-muted"
      >
        <Mic size={18} />
      </button>
    );
  const live = state === "recording" || state === "permission";
  if (live || state === "transcribing")
    return (
      <button
        type="button"
        onClick={onStop}
        disabled={state === "transcribing"}
        aria-label="Stop and review"
        title="Stop and review"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white ${state === "recording" ? "mic-live" : ""}`}
      >
        {state === "transcribing" ? <Loader2 size={18} className="animate-spin" /> : <Square size={15} fill="currentColor" />}
      </button>
    );
  return (
    <button
      type="button"
      onClick={onStart}
      aria-label="Speak your question"
      aria-description={VOICE_NOTICE}
      title="Speak your question"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent text-white hover:bg-accent-tint"
    >
      <Mic size={18} />
    </button>
  );
}

function VoiceStatus({
  state,
  error,
  onCancel,
  onRetry,
  onStop,
}: {
  state: VoiceState;
  error: string | null;
  onCancel: () => void;
  onRetry: () => void;
  onStop: () => void;
}) {
  if (state === "idle") return null;
  const row = "mx-6 mb-3 shrink-0 rounded-inner bg-surface px-4 py-3 text-[12px] leading-[17px]";
  if (state === "failed")
    return (
      <div className={row} role="alert">
        <p className="text-danger">{error}</p>
        <div className="mt-2 flex gap-4">
          <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 font-bold text-accent">
            <RotateCcw size={13} /> Try again
          </button>
          <button type="button" onClick={onCancel} className="font-bold text-soft hover:text-white">
            Type instead
          </button>
        </div>
      </div>
    );
  if (state === "ready")
    return (
      <div className={`${row} flex items-center gap-3`} role="status">
        <span className="flex-1 text-soft">Here's what I heard. Edit it if needed, then send.</span>
        <button type="button" onClick={onRetry} className="inline-flex shrink-0 items-center gap-1 font-bold text-accent">
          <RotateCcw size={13} /> Re-record
        </button>
      </div>
    );
  return (
    <div className={row} role="status">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full bg-accent ${state === "recording" ? "mic-dot" : "opacity-50"}`} />
        <span className="flex-1 font-bold text-white">
          {state === "permission" ? "Waiting for microphone access…" : state === "recording" ? "Listening… tap stop when you're done" : "Transcribing…"}
        </span>
        {state === "recording" && (
          <button type="button" onClick={onStop} className="shrink-0 font-bold text-accent">
            Done
          </button>
        )}
        <button type="button" onClick={onCancel} className="shrink-0 font-bold text-soft hover:text-white">
          Cancel
        </button>
      </div>
      <p className="mt-2 text-[11px] text-muted">{VOICE_NOTICE}</p>
    </div>
  );
}

/** Launcher sizes by viewport: mascot body size and its distance from the right/bottom edges. */
function launcherMetrics(w: number) {
  return w < 768 ? { body: 58, gap: 18 } : w < 1280 ? { body: 66, gap: 24 } : { body: 72, gap: 28 };
}
function useViewportWidth() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return w;
}
/** Set when the creator opens the panel from the mascot, so only that open slides in (not the intro landing). */
let openedFromLauncher = false;

/**
 * Collapsed state: the red jelly mascot floating at the bottom-right corner. No tab, text or card.
 * The SVG body is 86% of its viewBox, so the SVG is sized up to make the visible body `body` px,
 * and the button adds padding for a 44px+ target and room for the glow.
 */
function Launcher() {
  const { setOpen, unread, mood } = useAssistant();
  const { body, gap } = launcherMetrics(useViewportWidth());
  const still = reducedMotion();
  const svg = Math.round(body / 0.86);
  const pad = 10;
  // Distance from the SVG edge to the visible body edge.
  const inset = Math.round(svg * 0.07);
  const offset = gap - inset - pad;
  const [squash, setSquash] = useState(false);
  const open = () => {
    if (squash) return;
    openedFromLauncher = true;
    if (still) return setOpen(true);
    setSquash(true);
    setTimeout(() => setOpen(true), 170);
  };
  return (
    <motion.button
      type="button"
      onClick={open}
      aria-label={unread > 0 ? `Open TopFan AI Assistant (${unread} new)` : "Open TopFan AI Assistant"}
      data-testid="ai-launcher"
      className="group fixed z-50 grid cursor-pointer place-items-center rounded-[26px] outline-none focus-visible:ring-2 focus-visible:ring-white"
      style={{
        right: `calc(${offset}px + env(safe-area-inset-right, 0px))`,
        bottom: `calc(${offset}px + env(safe-area-inset-bottom, 0px))`,
        width: svg + pad * 2,
        height: svg + pad * 2,
      }}
      initial={still ? false : { opacity: 0, scale: 0.7, y: 10 }}
      animate={squash ? { scaleX: [1, 1.12, 0.96], scaleY: [1, 0.86, 1.04], opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
      transition={squash ? { duration: 0.17, ease: "easeOut" } : { type: "spring", stiffness: 380, damping: 20 }}
      whileHover={still ? undefined : { scale: 1.05, rotate: -3, transition: { type: "spring", stiffness: 300, damping: 12 } }}
    >
      {/* Ambient halo: wide, low-opacity glow in the mascot color that fades into the page; a little brighter on hover/focus. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{ width: body * 1.9, height: body * 1.9, background: "radial-gradient(circle, rgba(var(--mascot-glow),0.30) 0%, rgba(var(--mascot-glow),0.12) 38%, rgba(var(--mascot-glow),0) 68%)" }}
      />
      {/* Floor shadow, which tightens as the mascot rises. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-1/2 rounded-full bg-black/50 blur-[5px]"
        style={{ width: body * 0.7, height: 8, bottom: pad - 6, x: "-50%" }}
        animate={still ? undefined : { scaleX: [1, 0.86, 1], opacity: [0.55, 0.35, 0.55] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Idle float (about 5px over 3.6s), breathing squash/stretch and a slight sway. */}
      <motion.span
        className="relative inline-flex"
        style={{ transformOrigin: "50% 100%" }}
        animate={still ? undefined : { y: [0, -5, 0], scaleY: [1, 1.025, 1], scaleX: [1, 0.985, 1], rotate: [-1, 1, -1] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <span style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))" }}>
          <LiveMascot size={svg} mood={mood} />
        </span>
        {unread > 0 && (
          <span
            data-testid="ai-launcher-unread"
            className="absolute flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold leading-none text-white ring-2 ring-[var(--bg)]"
            style={{ right: inset - 5, top: inset - 5 }}
          >
            {unread}
          </span>
        )}
      </motion.span>
    </motion.button>
  );
}

/* ---------- Checklist: account setup steps (platform pages show the active task card instead) ---------- */

type StepStatus = "done" | "now" | "next";

function onboardingSteps(s: PlatformState) {
  const order = ["step1", "step2", "provisioning", "complete"];
  // Provisioning can finish while the creator stays on the page (e.g. finishing a Creator Quest mission).
  const at = s.screen === "provisioning" && s.provisionDone ? 3 : order.indexOf(s.screen);
  const status = (i: number, doneAt: number): StepStatus => (at >= doneAt ? "done" : at === i ? "now" : "next");
  return [
    { label: "Add your domain details", owner: "Your action", status: status(0, 1) },
    { label: "Connect your domain", owner: "Your action", status: status(1, 2) },
    { label: "TopFan sets up your site", owner: "Handled by TopFan", status: status(2, 3) },
    { label: "Your site address is ready", owner: "Handled by TopFan", status: at >= 3 ? ("done" as const) : ("next" as const) },
  ];
}

/** Vertical stepper: numbered stages joined by one line; done = check, the active stage leads, the rest stay quiet. */
function Checklist({ state }: { state: PlatformState }) {
  const [expanded, setExpanded] = useState(true);
  const steps = onboardingSteps(state);
  const done = steps.filter((s) => s.status === "done").length;
  const current = steps.findIndex((s) => s.status !== "done");
  return (
    <div className="rounded-inner bg-surface px-4 py-3" data-testid="setup-stepper">
      <button onClick={() => setExpanded((e) => !e)} aria-expanded={expanded} className="flex w-full items-center gap-2 text-left">
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="flex-1 text-[13px] font-bold uppercase tracking-caps">Account setup</span>
        <span className="text-xs text-soft" data-testid="setup-progress">
          {current < 0 ? `${done} of ${steps.length} complete` : `Step ${current + 1} of ${steps.length}`}
        </span>
      </button>
      {expanded && (
        <ol className="mt-3" aria-label="Account setup steps">
          {steps.map((s, i) => (
            <li
              key={s.label}
              data-step-status={s.status}
              aria-current={s.status === "now" ? "step" : undefined}
              className={`relative flex gap-3 ${i < steps.length - 1 ? "pb-3" : ""}`}
            >
              {i < steps.length - 1 && (
                <span aria-hidden className={`absolute bottom-0 left-[10.5px] top-[22px] w-px ${s.status === "done" ? "bg-accent" : "bg-line"}`} />
              )}
              <StepDot status={s.status} n={i + 1} />
              <span className="min-w-0 flex-1">
                <span className={`block text-[13px] leading-[22px] ${s.status === "now" ? "font-bold text-white" : s.status === "done" ? "text-soft" : "text-muted"}`}>
                  {s.label}
                  <span className="sr-only">, {s.status === "done" ? "completed" : s.status === "now" ? "in progress" : "upcoming"}</span>
                </span>
                <span className="block text-[11px] leading-[14px] text-muted">{s.owner}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function StepDot({ status, n }: { status: StepStatus; n: number }) {
  const base = "relative z-[1] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold";
  if (status === "done")
    return (
      <span aria-hidden className={`${base} bg-accent`}>
        <Check size={12} strokeWidth={3.5} />
      </span>
    );
  if (status === "now")
    return (
      <span aria-hidden className={`${base} bg-accent text-white ring-[3px] ring-accent/25`}>
        {n}
      </span>
    );
  return (
    <span aria-hidden className={`${base} border border-line bg-surface text-muted`}>
      {n}
    </span>
  );
}

/* ---------- Messages ---------- */

export function StatusTag({ status }: { status: MsgStatus }) {
  if (status === "done")
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-white">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent">
          <Check size={10} strokeWidth={3.5} />
        </span>
        Done
      </span>
    );
  if (status === "confirm")
    return (
      <span className="inline-flex h-6 items-center rounded-full border border-accent px-2.5 text-[11px] font-bold uppercase tracking-caps">
        Please confirm
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-danger">
      <CircleAlert size={15} /> Needs attention
    </span>
  );
}

function MessageView({ m }: { m: Msg }) {
  const { resolve, userSays, dismiss } = useAssistant();
  if (m.from === "user")
    return (
      <motion.div data-msg="user" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <span className="max-w-[85%] rounded-[20px] rounded-br-md bg-accent px-4 py-2.5 text-sm">{m.text}</span>
      </motion.div>
    );
  return (
    <motion.div data-msg="assistant" data-status={m.status ?? ""} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="relative min-w-0 break-words rounded-[20px] bg-surface p-4 text-sm leading-5">
      {m.dismissible && !m.resolved && (
        <button
          onClick={() => dismiss(m.id)}
          aria-label="Dismiss suggestion"
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-soft hover:bg-bg hover:text-white"
        >
          <X size={15} />
        </button>
      )}
      {m.status && (
        <div className="mb-2">
          <StatusTag status={m.status} />
        </div>
      )}
      {m.llm ? (
        <>
          <Answer text={typeof m.text === "string" ? m.text : ""} streaming={m.streaming} />
          {!m.streaming && typeof m.text === "string" && <ListenButton text={m.text} />}
        </>
      ) : (
        m.text && <div className={`whitespace-pre-line ${m.dismissible && !m.resolved ? "pr-6" : ""}`}>{m.text}</div>
      )}
      {m.body && <div className="mt-3">{m.body}</div>}
      {m.details && <Details>{m.details}</Details>}
      {m.choice && !m.resolved && (
        <Choice
          choice={m.choice}
          onConfirm={(v, label) => {
            resolve(m.id, label);
            userSays(label);
            m.choice!.onPick(v, label);
          }}
        />
      )}
      {m.actions && !m.resolved && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {m.actions.map((a) => (
            <button
              key={a.label}
              onClick={() => {
                resolve(m.id, a.label);
                a.onClick();
              }}
              className={
                a.variant === "primary"
                  ? "h-9 rounded-pill bg-accent px-4 text-[13px] font-black uppercase tracking-caps hover:brightness-110"
                  : a.variant === "outline"
                    ? "h-9 rounded-full border border-accent px-4 text-[13px] font-black uppercase tracking-caps text-accent hover:bg-accent-tint"
                    : "h-9 px-2 text-[13px] font-bold text-soft underline-offset-2 hover:text-white hover:underline"
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function Details({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-[12px] font-bold text-soft hover:text-white">
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {open ? "Hide details" : "Show details"}
      </button>
      {open && <div className="mt-2 rounded-tile bg-bg p-3 text-[12px] leading-[18px] text-soft">{children}</div>}
    </div>
  );
}

function Choice({ choice, onConfirm }: { choice: NonNullable<Msg["choice"]>; onConfirm: (v: string, label: string) => void }) {
  const rec = choice.options.find((o) => o.recommended) ?? choice.options[0];
  const [sel, setSel] = useState(rec.value);
  const picked = choice.options.find((o) => o.value === sel)!;
  if (choice.instant)
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {choice.options.map((o) => (
          <button
            key={o.value}
            onClick={() => onConfirm(o.value, o.label)}
            className={`h-9 rounded-pill border border-accent px-4 text-[13px] font-bold ${o.recommended ? "bg-accent" : "hover:bg-accent-tint"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  return (
    <div className="mt-3">
      <div className="flex flex-col gap-2">
        {choice.options.map((o) => (
          <button
            key={o.value}
            onClick={() => setSel(o.value)}
            aria-pressed={sel === o.value}
            className={`flex min-h-9 items-center justify-between gap-2 rounded-pill border border-accent px-4 py-1.5 text-left text-[13px] font-bold ${
              sel === o.value ? "bg-accent" : "hover:bg-accent-tint"
            }`}
          >
            <span>{o.label}</span>
            {o.recommended && <span className="shrink-0 rounded-full bg-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-caps">Recommended</span>}
          </button>
        ))}
      </div>
      <button
        onClick={() => onConfirm(picked.value, picked.label)}
        className="mt-3 h-9 rounded-pill bg-accent px-4 text-[13px] font-black uppercase tracking-caps hover:brightness-110"
      >
        {choice.confirmLabel ?? "Continue"}
      </button>
    </div>
  );
}

/** "Detected" tag next to a field the assistant filled (overlay on the existing label row). */
export function DetectedTag({ field }: { field: string }) {
  const { detected } = useAssistant();
  if (!detected.includes(field)) return null;
  return (
    <span className="mb-4 ml-3 inline-flex h-6 items-center gap-1 rounded-full bg-bg px-2.5 text-[11px] font-bold uppercase tracking-caps">
      <span className="text-accent">✦</span> Detected
    </span>
  );
}

/** Small copy row used inside assistant messages. */
export function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-1.5 flex items-center gap-2 rounded-pill bg-bg py-1.5 pl-3 pr-1.5">
      <span className="shrink-0 text-[11px] text-soft">{label}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-[12px] font-bold">{value}</span>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(value).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="shrink-0 rounded-full px-2 text-[12px] font-semibold text-accent"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

