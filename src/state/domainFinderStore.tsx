/**
 * Domain discovery progress. Separate from the chat so the shortlist, the chosen name and the
 * registrar handoff survive collapsing the panel, leaving the tab, and switching form options.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { DomainCheck, DomainIdea } from "../services/domainService";

export type CheckState = { status: "checking" } | DomainCheck;

export interface Handoff {
  /** null when the creator went to buy on their own (no name chosen here) */
  domain: string | null;
  registrarId: string;
  at: number;
  /** the creator left the tab after the handoff (so coming back = "returned") */
  away: boolean;
  /** "Welcome back" already asked for this handoff */
  asked: boolean;
}

export interface FinderState {
  /** the name the creator wants fans to remember */
  brand: string;
  /** rounds of ideas shown so far; each idea remembers its round */
  ideas: (DomainIdea & { round: number })[];
  rounds: number;
  checks: Record<string, CheckState>;
  selected: string | null;
  registrarId: string;
  handoff: Handoff | null;
  /** creator confirmed they bought this name (not verified ownership) */
  purchased: string | null;
  /** the creator already asked for help finding a name (skip the offer, ask straight away) */
  requested: boolean;
}

const initial: FinderState = {
  brand: "",
  ideas: [],
  rounds: 0,
  checks: {},
  selected: null,
  registrarId: "namecheap",
  handoff: null,
  purchased: null,
  requested: false,
};

interface Ctx {
  finder: FinderState;
  /** always-fresh state for async flows */
  live: React.MutableRefObject<FinderState>;
  set: (patch: Partial<FinderState> | ((s: FinderState) => Partial<FinderState>)) => void;
  reset: () => void;
}

const FinderContext = createContext<Ctx | null>(null);

export function DomainFinderProvider({ children }: { children: ReactNode }) {
  const [finder, setFinder] = useState<FinderState>(initial);
  const live = useRef(finder);
  const set = useCallback((patch: Partial<FinderState> | ((s: FinderState) => Partial<FinderState>)) => {
    // Apply immediately to the live copy so async flows read their own writes, then render.
    const s = live.current;
    const next = { ...s, ...(typeof patch === "function" ? patch(s) : patch) };
    live.current = next;
    setFinder(next);
  }, []);
  const reset = useCallback(() => {
    live.current = initial;
    setFinder(initial);
  }, []);
  const value = useMemo(() => ({ finder, live, set, reset }), [finder, set, reset]);
  return <FinderContext.Provider value={value}>{children}</FinderContext.Provider>;
}

export function useDomainFinder() {
  const ctx = useContext(FinderContext);
  if (!ctx) throw new Error("useDomainFinder must be used inside DomainFinderProvider");
  return ctx;
}
