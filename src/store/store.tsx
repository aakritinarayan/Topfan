/**
 * One mock application store for the whole rebuild (all data fictional).
 *
 * - Read:   const plans = useData((d) => d.monetize.plans);
 * - Write:  const act = useAct();  act("monetize.addPlan", (d) => { d.monetize.plans.push(plan); }, { need: "content.write" });
 *           Writes run on a draft copy, are permission-checked against the current demo role, persisted to
 *           localStorage, and announced to listeners (the assistant uses this to notice completed steps).
 * - Reset:  add ?resetMock=1 to any URL (developer-only, no visible UI).
 * - Delays: simulated loading (skeletons) via useMockLoading(); ?noDelay=1 or localStorage "tf-no-delay" turns them off.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { fontStack, initialAccount, LOGO_FONTS, type AccountState } from "./slices/account";
import { initialPrefsA, type PrefsAState } from "./slices/prefsA";
import { initialPrefsB, type PrefsBState } from "./slices/prefsB";
import { initialMonetize, type MonetizeState } from "./slices/monetize";
import { initialMoney, type MoneyState } from "./slices/money";
import { initialComms, type CommsState } from "./slices/comms";
import { initialSocial, type SocialState } from "./slices/social";
import { initialAutopilot, type AutopilotState } from "./slices/autopilot";
import { can, type Capability } from "./permissions";

export interface AppData {
  account: AccountState;
  prefsA: PrefsAState;
  prefsB: PrefsBState;
  monetize: MonetizeState;
  money: MoneyState;
  comms: CommsState;
  social: SocialState;
  /** Content Autopilot (assistant-prepared drafts; see slices/autopilot.ts). */
  autopilot: AutopilotState;
}

export const initialData = (): AppData =>
  structuredClone({
    account: initialAccount,
    prefsA: initialPrefsA,
    prefsB: initialPrefsB,
    monetize: initialMonetize,
    money: initialMoney,
    comms: initialComms,
    social: initialSocial,
    autopilot: initialAutopilot(),
  });

const KEY = "topfan-mock-v1";

/** Bump when seed media changes so browsers holding older saved data get the new media fields once. */
const MEDIA_SEED = 1;
const MEDIA_FIELDS = new Set(["avatar", "fromAvatar", "creatorAvatar", "cover", "hero", "banner", "eventsCover", "image", "src", "video", "logo", "previewMedia"]);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Copy seed values into media fields that are empty (null/undefined) in saved data. Only media fields are touched;
 * records are matched by id (or by position for id-less lists such as a post's media items), and records the
 * creator added or removed are left alone.
 */
function backfillMedia(seed: unknown, saved: unknown): unknown {
  if (Array.isArray(seed) && Array.isArray(saved)) {
    const withIds = seed.some((x) => isObj(x) && "id" in x);
    const byId = new Map(seed.filter(isObj).map((x) => [x.id, x]));
    return saved.map((item, i) => {
      const match = withIds ? (isObj(item) ? byId.get(item.id) : undefined) : seed[i];
      return match === undefined ? item : backfillMedia(match, item);
    });
  }
  if (isObj(seed) && isObj(saved)) {
    const out: Record<string, unknown> = { ...saved };
    for (const [k, v] of Object.entries(seed)) {
      if (MEDIA_FIELDS.has(k) && (saved[k] === null || saved[k] === undefined) && v != null) out[k] = v;
      else if (k in saved && (Array.isArray(v) || isObj(v))) out[k] = backfillMedia(v, saved[k]);
    }
    return out;
  }
  return saved;
}

function load(): AppData {
  const fresh = initialData();
  try {
    if (new URLSearchParams(window.location.search).get("resetMock") === "1") {
      localStorage.removeItem(KEY);
      return fresh;
    }
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as Partial<AppData> & { mediaSeed?: number };
    // Shallow-merge per slice so new fields added during development get their defaults.
    const out = { ...fresh } as Record<string, unknown>;
    for (const k of Object.keys(fresh) as (keyof AppData)[]) out[k] = { ...fresh[k], ...(saved[k] ?? {}) };
    // Data saved before demo media existed: fill empty media fields once from the seed (records matched by id).
    if ((saved.mediaSeed ?? 0) < MEDIA_SEED) {
      for (const k of Object.keys(fresh) as (keyof AppData)[]) out[k] = backfillMedia(fresh[k], out[k]);
    }
    return out as unknown as AppData;
  } catch {
    return fresh;
  }
}

export interface StoreEvent {
  label: string;
  at: number;
  ok: boolean;
  reason?: string;
}

export type ActResult = { ok: true } | { ok: false; reason: string };

/* External store so any component (and non-React code like the assistant) can subscribe. */
let data: AppData = typeof window === "undefined" ? initialData() : load();
const subs = new Set<() => void>();
const eventSubs = new Set<(e: StoreEvent) => void>();
const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, mediaSeed: MEDIA_SEED }));
  } catch {
    /* storage full / private mode: keep working in memory */
  }
};

export const getData = () => data;
export const onStoreEvent = (fn: (e: StoreEvent) => void) => (eventSubs.add(fn), () => void eventSubs.delete(fn));

/**
 * The only way to change data. `need` is enforced here (the service layer), so a delegate role is
 * blocked no matter which UI or assistant path called it.
 */
export function act(label: string, fn: (draft: AppData) => void, opts: { need?: Capability } = {}): ActResult {
  if (opts.need && !can(data, opts.need)) {
    const reason = `Your role doesn't allow this (${opts.need}).`;
    eventSubs.forEach((s) => s({ label, at: Date.now(), ok: false, reason }));
    return { ok: false, reason };
  }
  const draft = structuredClone(data);
  fn(draft);
  data = draft;
  persist();
  subs.forEach((s) => s());
  eventSubs.forEach((s) => s({ label, at: Date.now(), ok: true }));
  return { ok: true };
}

export function resetData() {
  data = initialData();
  persist();
  subs.forEach((s) => s());
}

const subscribe = (fn: () => void) => (subs.add(fn), () => void subs.delete(fn));

const shallowEqual = (a: unknown, b: unknown) => {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  return ka.length === kb.length && ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
};

/**
 * Select data. Safe for selectors that build objects/arrays and for selectors that use props/state:
 * results are shallow-compared, so a component only re-renders when the selected values change.
 */
export function useData<T>(sel: (d: AppData) => T): T {
  const selRef = useRef(sel);
  selRef.current = sel;
  const cache = useRef<{ src: AppData; sel: (d: AppData) => T; v: T } | null>(null);
  // Cached per store version AND selector, so selectors that close over props/state stay current;
  // shallow-equal results keep their previous reference (no extra renders).
  const snap = () => {
    const c = cache.current;
    const s = selRef.current;
    if (c && c.src === data && c.sel === s) return c.v;
    const v = s(data);
    cache.current = { src: data, sel: s, v: c && shallowEqual(c.v, v) ? c.v : v };
    return cache.current.v;
  };
  return useSyncExternalStore(subscribe, snap);
}

export const useAct = () => act;

/* ---------------- simulated loading ---------------- */

export const delaysOff = () => {
  try {
    return new URLSearchParams(window.location.search).get("noDelay") === "1" || localStorage.getItem("tf-no-delay") === "1";
  } catch {
    return false;
  }
};

/** True for `ms` after mount (or after `key` changes): drive skeletons captured in the pack. */
export function useMockLoading(ms = 700, key?: unknown) {
  const [loading, setLoading] = useState(() => !delaysOff());
  useEffect(() => {
    if (delaysOff()) return setLoading(false);
    setLoading(true);
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [key]);
  return loading;
}

/* ---------------- white-label theme from the store ---------------- */

const hexToRgb = (h: string) => {
  const m = h.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}` : "188 17 17";
};

/**
 * "Desktop Preview of White Label Site" opens a new tab with ?wlsPreview=<json> carrying the unsaved
 * appearance (like the live product's preview params). That tab shows it; nothing is saved.
 */
export type AppearancePreview = Partial<AccountState["theme"]> & { font?: string; logoText?: string };
export function previewFromUrl(): AppearancePreview | null {
  try {
    const raw = new URLSearchParams(window.location.search).get("wlsPreview");
    if (!raw) return null;
    const v = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const k of ["bg", "secondaryBg", "accent", "text", "buttonText", "postText"]) if (typeof v[k] === "string" && /^#[0-9a-f]{6}$/i.test(v[k] as string)) out[k] = v[k] as string;
    if (typeof v.font === "string" && LOGO_FONTS.includes(v.font)) out.font = v.font;
    if (typeof v.logoText === "string" && v.logoText.trim().length <= 40) out.logoText = v.logoText.trim();
    return out;
  } catch {
    return null;
  }
}

/**
 * The logo being edited on White Label Site › Site Logo, before Update & Publish. The header logo
 * follows it live; it's in memory only and is cleared when the editor closes (unsaved = reverts).
 */
type LogoDraft = { text: string; font: string } | null;
let logoDraft: LogoDraft = null;
const draftSubs = new Set<() => void>();
export function setLogoDraft(d: LogoDraft) {
  if (d?.text === logoDraft?.text && d?.font === logoDraft?.font) return;
  logoDraft = d;
  draftSubs.forEach((s) => s());
}
export const useLogoDraft = () =>
  useSyncExternalStore(
    (fn) => (draftSubs.add(fn), () => void draftSubs.delete(fn)),
    () => logoDraft,
  );

/** Applies the creator's white-label colours and logo font to the CSS variables (the live product's mechanism). */
export function ThemeFromStore() {
  const saved = useData((d) => d.account.theme);
  const draftFont = useLogoDraft()?.font;
  const savedFont = useData((d) => d.account.logo?.font ?? "Rubik Dirt");
  useEffect(() => {
    const preview = previewFromUrl();
    const theme = { ...saved, ...preview };
    const r = document.documentElement.style;
    r.setProperty("--configBgColor", theme.bg);
    r.setProperty("--configSecondaryBgColor", theme.secondaryBg);
    r.setProperty("--configThemeColor", theme.accent);
    r.setProperty("--configThemeColorRgb", hexToRgb(theme.accent));
    r.setProperty("--configBgTextColor", theme.text);
    r.setProperty("--configButtonTextColor", theme.buttonText);
    r.setProperty("--configPostTextColor", theme.postText ?? theme.text);
    r.setProperty("--font-logo", fontStack(draftFont ?? preview?.font ?? savedFont));
  }, [saved, savedFont, draftFont]);
  return null;
}

/* Context kept for parity with other providers (and future server sync). */
const Ctx = createContext(true);
export function StoreProvider({ children }: { children: ReactNode }) {
  const v = useMemo(() => true, []);
  return (
    <Ctx.Provider value={v}>
      <ThemeFromStore />
      {children}
    </Ctx.Provider>
  );
}
export const useStoreReady = () => useContext(Ctx);
