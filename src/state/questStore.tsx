/**
 * Creator Quest progress. Lives above the layouts so progress survives navigation; it never touches
 * provisioning or setup state. Game events are kept (last few) as context for the assistant.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MissionId } from "../platform/wls/quest/missions";
import { storageKey } from "../app/demo";

/** Completed quests, best scores and saved interests persist per browser; ?resetMock=1 clears them. */
const KEY = storageKey("topfan-quest-v1");
type Saved = { results: Partial<Record<MissionId, MissionResult>>; interests: MissionId[] };
function load(): Saved {
  const empty: Saved = { results: {}, interests: [] };
  try {
    if (new URLSearchParams(window.location.search).get("resetMock") === "1") {
      localStorage.removeItem(KEY);
      return empty;
    }
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Saved | null;
    if (!s || typeof s !== "object" || typeof s.results !== "object" || !Array.isArray(s.interests)) return empty;
    return { results: s.results ?? {}, interests: s.interests };
  } catch {
    return empty;
  }
}

export type QuestView = { kind: "closed" } | { kind: "select" } | { kind: "play"; id: MissionId; run: number } | { kind: "result"; id: MissionId };

export type QuestEventType = "quest_opened" | "mission_started" | "token_collected" | "checkpoint_reached" | "decision_made" | "mission_completed" | "mission_exited";
export interface QuestEvent {
  type: QuestEventType;
  mission?: MissionId;
  detail?: string;
  at: number;
}

export interface MissionResult {
  score: number;
  achievement: string;
  /** decision outcome, in words (for the result screen and the assistant) */
  outcome: string;
  /** objectives completed in this run, shown on the completion screen */
  objectives?: string[];
  /** this run's score (`score` is the best) */
  last?: number;
  at: number;
}

interface Ctx {
  view: QuestView;
  setView: (v: QuestView) => void;
  results: Partial<Record<MissionId, MissionResult>>;
  complete: (id: MissionId, r: Omit<MissionResult, "at">) => void;
  /** features the creator explicitly asked to explore after launch */
  interests: MissionId[];
  toggleInterest: (id: MissionId) => void;
  events: QuestEvent[];
  emit: (type: QuestEventType, mission?: MissionId, detail?: string) => void;
  /** the mission stage, for the assistant ("Stage 2 · fan request") */
  stage: string | null;
  setStage: (s: string | null) => void;
  reset: () => void;
}

const QuestContext = createContext<Ctx | null>(null);

export function QuestProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<QuestView>({ kind: "closed" });
  const [saved] = useState(load);
  const [results, setResults] = useState<Ctx["results"]>(saved.results);
  const [interests, setInterests] = useState<MissionId[]>(saved.interests);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ results, interests }));
    } catch {
      /* storage unavailable: progress lasts for this visit */
    }
  }, [results, interests]);
  const [events, setEvents] = useState<QuestEvent[]>([]);
  const [stage, setStage] = useState<string | null>(null);
  const lastCollect = useRef(0);

  const emit = useCallback((type: QuestEventType, mission?: MissionId, detail?: string) => {
    // token_collected can be frequent: keep at most one per 400ms in the log.
    if (type === "token_collected") {
      const now = Date.now();
      if (now - lastCollect.current < 400) return;
      lastCollect.current = now;
    }
    setEvents((es) => [...es.slice(-11), { type, mission, detail, at: Date.now() }]);
  }, []);
  const complete = useCallback((id: MissionId, r: Omit<MissionResult, "at">) => {
    // Best score is kept across replays; the latest run's outcome and objectives are shown.
    setResults((rs) => ({ ...rs, [id]: { ...r, score: Math.max(r.score, rs[id]?.score ?? 0), last: r.score, at: Date.now() } }));
  }, []);
  const toggleInterest = useCallback((id: MissionId) => setInterests((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id])), []);
  const reset = useCallback(() => {
    setView({ kind: "closed" });
    setResults({});
    setInterests([]);
    setEvents([]);
    setStage(null);
  }, []);

  const value = useMemo(
    () => ({ view, setView, results, complete, interests, toggleInterest, events, emit, stage, setStage, reset }),
    [view, results, complete, interests, toggleInterest, events, emit, stage, reset],
  );
  return <QuestContext.Provider value={value}>{children}</QuestContext.Provider>;
}

export function useQuest() {
  const ctx = useContext(QuestContext);
  if (!ctx) throw new Error("useQuest must be used inside QuestProvider");
  return ctx;
}
