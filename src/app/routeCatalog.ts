/**
 * Every screen in the rebuild: one catalogue for routing, the assistant and docs/agent-context.
 * Specific routes are matched before parameter routes; the Feed catch-all /:handle comes last.
 */
import { match, normalize } from "./router";
import { coreRoutes } from "./routes/core";
import { prefsARoutes } from "./routes/prefsA";
import { prefsBRoutes } from "./routes/prefsB";
import { monetizeRoutes } from "./routes/monetize";
import { moneyRoutes } from "./routes/money";
import { commsRoutes } from "./routes/comms";
import { socialRoutes } from "./routes/social";
import type { RouteDef } from "./routes/types";

export type { RouteDef } from "./routes/types";

export const routes: RouteDef[] = [...coreRoutes, ...prefsARoutes, ...prefsBRoutes, ...monetizeRoutes, ...moneyRoutes, ...commsRoutes, ...socialRoutes];

export const routeById = (id: string) => routes.find((r) => r.id === id);

const specificity = (r: RouteDef) => {
  const segs = normalize(r.pattern).split("/");
  // more static segments first; the bare "/:handle" catch-all last
  return segs.filter((s) => s && !s.startsWith(":")).length * 100 + segs.length;
};
const ordered = [...routes].filter((r) => r.id !== "not-found").sort((a, b) => specificity(b) - specificity(a));

export function resolve(path: string): { route: RouteDef; params: Record<string, string> } {
  for (const r of ordered) {
    const params = match(r.pattern, path);
    if (params) return { route: r, params };
  }
  return { route: routeById("not-found")!, params: {} };
}

/** Path for a route id (params filled), e.g. pathFor("public-events", { handle: "ajwhite" }). */
export function pathFor(id: string, params: Record<string, string | number> = {}) {
  const r = routeById(id);
  if (!r) throw new Error(`Unknown route id: ${id}`);
  return r.pattern.replace(/:([A-Za-z]+)/g, (_, k) => encodeURIComponent(String(params[k])));
}
