/**
 * Route registry for the assistant: the app's own catalogue (src/app/routes/*), plus helpers to turn
 * a destination into a URL. Never invents a route: unknown ids throw.
 */
import { routeById, routes } from "../routeCatalog";
import type { AppData } from "../../store/store";

export { routes, routeById };

/** URL for a route id. Path params come from `params` or the account (handle); the rest become the query. */
export function urlFor(routeId: string, d: AppData, params: Record<string, string> = {}) {
  const r = routeById(routeId);
  if (!r) throw new Error(`Unknown route id: ${routeId}`);
  const all: Record<string, string> = { handle: d.account.handle, ...params };
  const used = new Set<string>();
  const path = r.pattern.replace(/:([A-Za-z]+)/g, (_, k: string) => {
    used.add(k);
    return encodeURIComponent(all[k] ?? "");
  });
  const q = new URLSearchParams(Object.entries(params).filter(([k]) => !used.has(k)));
  return q.size ? `${path}?${q}` : path;
}

/** Whether the destination has every path param it needs. */
export function canBuild(routeId: string, d: AppData, params: Record<string, string> = {}) {
  const r = routeById(routeId);
  if (!r) return false;
  const all: Record<string, string> = { handle: d.account.handle, ...params };
  return [...r.pattern.matchAll(/:([A-Za-z]+)/g)].every((m) => !!all[m[1]]);
}
