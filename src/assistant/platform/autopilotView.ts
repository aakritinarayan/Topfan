/**
 * Which Content Autopilot screen the assistant panel shows. Persisted (per browser) so the review
 * survives closing the panel, navigating and refreshing. UI state only: drafts live in the store.
 */
import { useSyncExternalStore } from "react";

export type APView =
  | { screen: "summary" }
  | { screen: "held" }
  | { screen: "detail"; draftId: string }
  | { screen: "reject"; draftId: string }
  | { screen: "confirm"; exclude?: string[] }
  | { screen: "complete"; approved: string[] }
  | { screen: "prefs" };

const KEY = "topfan-autopilot-view-v1";
let view: APView | null = (() => {
  try {
    if (new URLSearchParams(window.location.search).get("resetMock") === "1") return null;
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
})();
const subs = new Set<() => void>();
const openers = new Set<() => void>();

export const getAPView = () => view;
export function setAPView(v: APView | null) {
  view = v;
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* private mode */
  }
  subs.forEach((s) => s());
  if (v) openers.forEach((o) => o());
}
/** The panel registers here so opening a view also expands the panel. */
export const onAPOpen = (fn: () => void) => (openers.add(fn), () => void openers.delete(fn));
export const useAPView = () => useSyncExternalStore((fn) => (subs.add(fn), () => void subs.delete(fn)), getAPView);
export const openAutopilot = (v: APView = { screen: "summary" }) => setAPView(v);
