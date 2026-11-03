/**
 * Assistant state. Lives above both layouts so the conversation, current task and any running
 * (approved) operation survive collapsing the panel and the move from account setup to the dashboard.
 * Everything here is simulated.
 */
import { inScope } from "../app/demo";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type MsgStatus = "done" | "confirm" | "problem";

export interface MsgAction {
  label: string;
  variant?: "primary" | "outline" | "text";
  onClick: () => void;
}

export interface MsgChoice {
  options: { value: string; label: string; recommended?: boolean }[];
  confirmLabel?: string;
  /** Quick replies: one tap picks, no confirm button. */
  instant?: boolean;
  onPick: (value: string, label: string) => void;
}

export interface Msg {
  id: string;
  from: "assistant" | "user";
  text?: ReactNode;
  body?: ReactNode;
  status?: MsgStatus;
  details?: ReactNode;
  actions?: MsgAction[];
  choice?: MsgChoice;
  /** Set once the creator has answered / acted; hides the controls. */
  resolved?: string | true;
  /** Proactive suggestion: shows a dismiss (X) control. */
  dismissible?: boolean;
  /** Plain-text version for the conversation history sent to the model (when `text` isn't a string). */
  plain?: string;
  /** Answer written by the language model (rendered as light markdown, can be read aloud). */
  llm?: boolean;
  /** Still streaming in. */
  streaming?: boolean;
}

/**
 * First-time introduction. "pending" until the creator starts, skips or bypasses it;
 * "played" / "skipped" record how it ended; "none" when setup was entered past Step 1.
 * Kept in this store (no storage in the prototype); in the product this is a per-creator flag.
 */
/** Mascot expression. "happy" / "thoughtful" fall back to idle on their own. */
export type Mood = "idle" | "thinking" | "checking" | "happy" | "thoughtful" | "listening" | "transcribing" | "generating" | "responding" | "error";

export type IntroState = "pending" | "played" | "skipped" | "none";

interface Working {
  label: string;
}

interface Ctx {
  messages: Msg[];
  say: (m: Omit<Msg, "id" | "from">) => string;
  userSays: (text: string) => void;
  resolve: (id: string, answer?: string) => void;
  /** Change a message in place (streaming answers, approval results). */
  update: (id: string, patch: Partial<Msg>) => void;
  /** Decisions the creator approved or declined, for the model's context. */
  decisions: string[];
  logDecision: (d: string) => void;
  once: (key: string, fn: () => void) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  unread: number;
  /** Proactive suggestion: skipped while suggestions are paused. Returns the message id, or null. */
  suggest: (m: Omit<Msg, "id" | "from" | "dismissible">) => string | null;
  dismiss: (id: string) => void;
  muted: boolean;
  setMuted: (v: boolean) => void;
  /** Simulated drafted content kept for the dashboard (e.g. a first post prepared during provisioning). */
  draftPost: string | null;
  setDraftPost: (v: string | null) => void;
  intro: IntroState;
  setIntro: (v: IntroState) => void;
  mood: Mood;
  /** Set the mascot's expression; `ms` returns it to idle afterwards. */
  setMood: (m: Mood, ms?: number) => void;
  working: Working | null;
  /** Run a simulated operation; it keeps running if the panel is collapsed. */
  run: (label: string, ms: number, onDone: () => void, onStop?: () => void) => void;
  stop: () => void;
  highlight: (field: string) => void;
  detected: string[];
  markDetected: (field: string, on?: boolean) => void;
  reset: () => void;
}

const AssistantContext = createContext<Ctx | null>(null);
let seq = 0;
const nextId = () => `m${++seq}`;

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [open, setOpenState] = useState(true);
  const [unread, setUnread] = useState(0);
  const [muted, setMutedState] = useState(false);
  const [draftPost, setDraftPost] = useState<string | null>(null);
  const [intro, setIntro] = useState<IntroState>(inScope("setup") ? "pending" : "none"); // the setup intro is Account Setup demo only
  const [mood, setMoodState] = useState<Mood>("idle");
  const moodTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const setMood = useCallback((m: Mood, ms?: number) => {
    clearTimeout(moodTimer.current);
    setMoodState(m);
    const back = ms ?? (m === "happy" || m === "thoughtful" || m === "error" ? 2400 : 0);
    if (back) moodTimer.current = setTimeout(() => setMoodState("idle"), back);
  }, []);
  const mutedRef = useRef(false);
  const [working, setWorking] = useState<Working | null>(null);
  const [detected, setDetected] = useState<string[]>([]);
  const seen = useRef(new Set<string>());
  const timer = useRef<{ t: ReturnType<typeof setTimeout>; onStop?: () => void } | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  const push = useCallback((m: Msg) => {
    setMessages((ms) => [...ms, m]);
    if (!openRef.current && m.from === "assistant") setUnread((u) => u + 1);
    return m.id;
  }, []);

  const say = useCallback((m: Omit<Msg, "id" | "from">) => push({ ...m, id: nextId(), from: "assistant" }), [push]);
  const suggest = useCallback(
    (m: Omit<Msg, "id" | "from" | "dismissible">) => (mutedRef.current ? null : push({ ...m, id: nextId(), from: "assistant", dismissible: true })),
    [push],
  );
  const dismiss = useCallback((id: string) => setMessages((ms) => ms.filter((m) => m.id !== id)), []);
  const setMuted = useCallback((v: boolean) => {
    mutedRef.current = v;
    setMutedState(v);
  }, []);
  const [decisions, setDecisions] = useState<string[]>([]);
  const logDecision = useCallback((d: string) => setDecisions((ds) => [...ds.slice(-19), d]), []);
  const update = useCallback(
    (id: string, patch: Partial<Msg>) => setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m))),
    [],
  );
  const userSays = useCallback((text: string) => void push({ id: nextId(), from: "user", text }), [push]);
  const resolve = useCallback(
    (id: string, answer?: string) => setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, resolved: answer ?? true } : m))),
    [],
  );
  const once = useCallback((key: string, fn: () => void) => {
    if (seen.current.has(key)) return;
    seen.current.add(key);
    fn();
  }, []);

  const setOpen = useCallback((v: boolean) => {
    setOpenState(v);
    if (v) setUnread(0);
  }, []);

  const stop = useCallback(() => {
    if (!timer.current) return;
    clearTimeout(timer.current.t);
    const onStop = timer.current.onStop;
    timer.current = null;
    setWorking(null);
    onStop?.();
  }, []);

  const run = useCallback((label: string, ms: number, onDone: () => void, onStop?: () => void) => {
    if (timer.current) clearTimeout(timer.current.t);
    setWorking({ label });
    timer.current = {
      onStop,
      t: setTimeout(() => {
        timer.current = null;
        setWorking(null);
        onDone();
      }, ms),
    };
  }, []);

  const highlight = useCallback((field: string) => {
    // Overlay only: briefly ring an existing field (data-field or data-testid) without changing it.
    // The page may still be rendering after a navigation: look for up to ~1.5s.
    const find = (tries: number) => {
      const el = document.querySelector<HTMLElement>(`[data-field="${CSS.escape(field)}"], [data-testid="${CSS.escape(field)}"]`);
      if (!el) {
        if (tries > 0) setTimeout(() => find(tries - 1), 150);
        return;
      }
      // Only scroll when needed: Chrome cancels concurrent smooth scrolls (e.g. the panel's own).
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("assist-highlight");
      void el.offsetWidth;
      el.classList.add("assist-highlight");
      setTimeout(() => el.classList.remove("assist-highlight"), 1800);
    };
    requestAnimationFrame(() => find(10));
  }, []);

  const markDetected = useCallback(
    (field: string, on = true) => setDetected((d) => (on ? [...new Set([...d, field])] : d.filter((x) => x !== field))),
    [],
  );

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current.t);
    timer.current = null;
    seen.current.clear();
    setMessages([]);
    setWorking(null);
    setMuted(false);
    setDraftPost(null);
    setIntro("pending");
    setMoodState("idle");
    setDetected([]);
    setDecisions([]);
    setUnread(0);
    setOpenState(true);
  }, [setMuted]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current.t);
  }, []);

  return (
    <AssistantContext.Provider
      value={{ messages, say, update, decisions, logDecision, suggest, dismiss, userSays, resolve, once, open, setOpen, unread, muted, setMuted, draftPost, setDraftPost, intro, setIntro, mood, setMood, working, run, stop, highlight, detected, markDetected, reset }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used inside AssistantProvider");
  return ctx;
}
