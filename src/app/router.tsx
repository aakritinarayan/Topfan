/**
 * Minimal history router (no new dependency): real URLs, deep links, browser back/forward.
 * Route patterns use `:param` segments, e.g. "/dashboard/event-listing/:handle".
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type AnchorHTMLAttributes, type ReactNode } from "react";

export interface Location {
  path: string;
  query: URLSearchParams;
}

interface RouterCtx extends Location {
  navigate: (to: string, opts?: { replace?: boolean; keepScroll?: boolean }) => void;
  back: () => void;
}

const Ctx = createContext<RouterCtx | null>(null);

const read = (): Location => ({ path: normalize(window.location.pathname), query: new URLSearchParams(window.location.search) });
export const normalize = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p) || "/";

/** Listeners outside React (e.g. the assistant's task tracker) can observe navigation. */
const listeners = new Set<(l: Location) => void>();
export const onNavigate = (fn: (l: Location) => void) => (listeners.add(fn), () => void listeners.delete(fn));

export function RouterProvider({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState<Location>(read);
  useEffect(() => {
    const pop = () => setLoc(read());
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => listeners.forEach((l) => l(loc)), [loc]);
  const navigate = useCallback((to: string, opts: { replace?: boolean; keepScroll?: boolean } = {}) => {
    const url = new URL(to, window.location.origin);
    const next = url.pathname + url.search + url.hash;
    if (next === window.location.pathname + window.location.search + window.location.hash) return;
    window.history[opts.replace ? "replaceState" : "pushState"]({}, "", next);
    setLoc(read());
    if (!opts.keepScroll) window.scrollTo({ top: 0 });
  }, []);
  const back = useCallback(() => window.history.back(), []);
  const value = useMemo(() => ({ ...loc, navigate, back }), [loc, navigate, back]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRouter() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRouter must be used inside RouterProvider");
  return c;
}

/** Match a pattern against a path. Returns params, or null. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = normalize(pattern).split("/");
  const b = normalize(path).split("/");
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(":")) {
      if (!b[i]) return null;
      params[a[i].slice(1)] = decodeURIComponent(b[i]);
    } else if (a[i] !== b[i]) return null;
  }
  return params;
}

/** Fill a pattern's params: build("/x/:id", { id: 3 }) → "/x/3". */
export function build(pattern: string, params: Record<string, string | number> = {}) {
  return pattern.replace(/:([A-Za-z]+)/g, (_, k) => encodeURIComponent(String(params[k] ?? `:${k}`)));
}

/** In-app link: a real <a href> (open in new tab works) that navigates without a reload. */
export function Link({ to, children, onClick, ...rest }: { to: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
