/**
 * Deterministic understanding of everyday requests: which feature a phrase points at, whether the
 * creator wants to go somewhere, start a goal, or hear what needs attention.
 *
 * Used (1) as demo mode when no language model is connected, and (2) to give the model a short list
 * of candidate features instead of the whole registry. Pure functions: no React, no store writes.
 */
import { AMBIGUITIES, FEATURES, featureById, type Feature } from "./features";
import { TASKS, type TaskDef } from "./tasks";

export const normalizeText = (s: string) =>
  ` ${s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9:' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;

const has = (text: string, phrase: string) => text.includes(` ${phrase} `);

/** Words that say "the plural/sing. form" without a stemmer: tickets→ticket etc. */
const variants = (p: string) => [p, p.endsWith("s") ? p.slice(0, -1) : `${p}s`];

export interface FeatureMatch {
  feature: Feature;
  score: number;
  /** The phrase that matched best. */
  via: string;
}

export function matchFeatures(raw: string): FeatureMatch[] {
  const text = normalizeText(raw);
  const out: FeatureMatch[] = [];
  for (const f of FEATURES) {
    let best = 0;
    let via = "";
    for (const syn of [f.name.toLowerCase(), ...f.synonyms]) {
      for (const v of variants(syn)) {
        if (!has(text, v)) continue;
        const words = v.split(" ").length;
        const score = 10 + words * 6 + (syn === f.name.toLowerCase() ? 4 : 0);
        if (score > best) {
          best = score;
          via = v;
        }
      }
    }
    if (best) out.push({ feature: f, score: best, via });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Generic words that, on their own, don't say which of the similar features is meant. */
const GENERIC: Record<string, string[]> = {
  wallet: ["wallet", "my wallet"],
  monetize: ["monetize", "monetise"],
  support: ["support", "help"],
  notifications: ["notifications", "alerts"],
  site: ["my site", "my page"],
  gamification: ["game", "games", "points"],
};

export interface Clarify {
  group: string;
  question: string;
  options: { featureId: string; label: string }[];
}

/**
 * Should we ask before choosing? Yes when the best match came from a generic word and the group has
 * look-alikes, or when two look-alikes scored the same. Financial look-alikes always ask.
 */
export function ambiguityFor(matches: FeatureMatch[]): Clarify | null {
  const top = matches[0];
  if (!top?.feature.ambiguity) return null;
  const group = top.feature.ambiguity;
  const amb = AMBIGUITIES[group];
  if (!amb) return null;
  const generic = (GENERIC[group] ?? []).includes(top.via);
  const tie = matches.some((m) => m !== top && m.feature.ambiguity === group && m.score >= top.score);
  if (!generic && !tie) return null;
  return { group, question: amb.question, options: amb.options };
}

export type Intent =
  | { kind: "health" }
  | { kind: "next" }
  | { kind: "task"; task: TaskDef }
  | { kind: "navigate"; feature: Feature; matches: FeatureMatch[] }
  | { kind: "clarify"; clarify: Clarify }
  | { kind: "explain"; feature: Feature }
  | { kind: "control"; control: "pause" | "resume" | "cancel" | "back" | "status" }
  | { kind: "page-help" }
  | { kind: "smalltalk"; reply: "greeting" | "thanks" }
  | { kind: "unknown" };

const HEALTH = [
  "what needs my attention", "needs my attention", "what should i focus", "focus on today", "what should i do today", "anything i should", "any problems",
  "anything wrong", "what's wrong", "what is wrong", "account health", "to do list", "todo", "what's pending", "what is pending", "catch me up",
];
const NEXT = ["what should i do next", "what's next", "what is next", "what now", "next step", "what do i do next", "where do i start", "where should i start", "how do i start", "get started"];
const NAV = ["where", "open", "go to", "take me", "show me", "show", "find", "navigate", "bring me", "jump to", "get to", "settings for", "change", "edit", "manage", "see my", "view"];
const EXPLAIN = ["what is", "what's", "what are", "explain", "what does", "tell me about", "difference between", "how does"];
const PAGE_HELP = ["can you help with this", "help with this", "help me with this", "i don't understand", "i dont understand", "what is this page", "what can i do here", "what do i do here", "explain this page", "how do i fix it", "how do i fix this", "why is it failing", "what does this mean", "help me here", "what's this"];

/** Does the phrase start or advance one of the goal workflows? */
export function matchTask(raw: string): TaskDef | null {
  const text = normalizeText(raw);
  let best: { t: TaskDef; score: number } | null = null;
  for (const t of TASKS) {
    for (const trig of t.triggers) {
      if (!has(text, trig)) continue;
      const score = trig.split(" ").length;
      if (!best || score > best.score) best = { t, score };
    }
  }
  return best?.t ?? null;
}

export function classify(raw: string, ctx: { hasActiveTask: boolean }): Intent {
  const text = normalizeText(raw);
  const any = (list: string[]) => list.some((p) => has(text, p) || text.includes(` ${p}`));

  if (/^ (hi|hello|hey|yo|good (morning|afternoon|evening)) ?$/.test(text)) return { kind: "smalltalk", reply: "greeting" };
  if (/^ (thanks|thank you|thx|great|perfect|ok thanks|cool) ?$/.test(text)) return { kind: "smalltalk", reply: "thanks" };

  if (ctx.hasActiveTask) {
    if (any(["pause", "later", "not now", "stop for now"])) return { kind: "control", control: "pause" };
    if (any(["cancel", "stop this", "never mind", "nevermind", "forget it"])) return { kind: "control", control: "cancel" };
    if (any(["go back", "previous step", "back a step"])) return { kind: "control", control: "back" };
    if (any(["where was i", "where am i", "what step", "progress"])) return { kind: "control", control: "status" };
  }
  if (any(["resume", "continue where", "pick up where", "carry on", "continue my task"])) return { kind: "control", control: "resume" };

  if (any(HEALTH)) return { kind: "health" };
  if (any(NEXT)) return { kind: "next" };
  if (any(PAGE_HELP) || /^ (help|help me|\?) $/.test(text)) return { kind: "page-help" };

  const matches = matchFeatures(raw);
  const navWord = any(NAV);
  const explainWord = any(EXPLAIN);
  const task = matchTask(raw);
  // "I want to…", "help me…", "how do I…" are goals: a workflow beats a plain destination.
  const goalWord = any(["i want", "i'd like", "i would like", "help me", "how do i", "how can i", "can you", "i need to", "let's", "lets", "start", "set up", "setup", "create", "launch", "sell", "fix", "add", "send", "make", "review", "withdraw"]);
  if (task && (goalWord || !matches.length)) return { kind: "task", task };

  if (matches.length) {
    const clarify = ambiguityFor(matches);
    if (clarify) return { kind: "clarify", clarify };
    if (explainWord && !navWord) return { kind: "explain", feature: matches[0].feature };
    return { kind: "navigate", feature: matches[0].feature, matches };
  }
  if (task) return { kind: "task", task };
  return { kind: "unknown" };
}

/** Up to n candidate features for the language model (keeps the prompt small and grounded). */
export const candidatesFor = (raw: string, n = 5) => matchFeatures(raw).slice(0, n).map((m) => m.feature);

export { featureById };
