import { createContext, useCallback, useContext, useEffect, useReducer, type ReactNode } from "react";
import { useRouter } from "../app/router";
import { domain as demoDomain } from "../config/demo";

export type Screen = "step1" | "step2" | "provisioning" | "complete" | "manage" | "coverEditor" | "app";

/** White Label screens ↔ routes. Any other route is "app" (the rest of the platform). */
export const SCREEN_PATH: Record<Exclude<Screen, "app">, string> = {
  step1: "/edit-preference/whitelabel/setup/domain",
  step2: "/edit-preference/whitelabel/setup/dns",
  provisioning: "/edit-preference/whitelabel/setup/provisioning",
  complete: "/edit-preference/whitelabel/setup/complete",
  manage: "/edit-preference/whitelabel",
  coverEditor: "/edit-preference/whitelabel-cover-page",
};
export const screenForPath = (path: string): Screen =>
  ((Object.entries(SCREEN_PATH) as [Screen, string][]).find(([, p]) => p === path)?.[0] ?? "app");

export const screenOrder: { id: Screen; label: string }[] = [
  { id: "step1", label: "Step 1 · Domain" },
  { id: "step2", label: "Step 2 · DNS" },
  { id: "provisioning", label: "Provisioning" },
  { id: "complete", label: "Complete" },
  { id: "manage", label: "Manage site" },
  { id: "coverEditor", label: "Cover page editor" },
];

/** Account setup screens. Everything else is the creator dashboard (only after setup completes). */
export const onboardingScreens: Screen[] = ["step1", "step2", "provisioning", "complete"];
export const isOnboarding = (screen: Screen) => onboardingScreens.includes(screen);

export type UrlPreference = "root_domain" | "subdomain";

export interface PlatformState {
  screen: Screen;
  hasDomain: boolean;
  provider: string | null;
  domainName: string;
  urlPreference: UrlPreference;
  subdomain: string;
  verifyAttempts: number;
  /** Simulated: both DNS records exist and are correct at the provider. */
  recordsVerified: boolean;
  /** Step 1 validation errors from the last Save attempt (shared so the assistant can explain them). */
  formErrors: Record<string, string>;
  /** When provisioning started (ms). Kept here so the countdown never restarts when the page remounts. */
  provisionStartedAt: number | null;
  /** Provisioning really finished (simulated here; build_status in the product). Never set by Creator Quest. */
  provisionDone: boolean;
}

export const initialPlatformState: PlatformState = {
  screen: "step1",
  hasDomain: true,
  provider: null,
  domainName: "",
  urlPreference: "root_domain",
  subdomain: "",
  verifyAttempts: 0,
  recordsVerified: false,
  formErrors: {},
  provisionStartedAt: null,
  provisionDone: false,
};

/** Estimate shown to the creator (P50 copy: "can take up to 10 minutes"). Not a completion signal. */
export const PROVISION_ESTIMATE_S = 10 * 60;

const demoFilled: Partial<PlatformState> = {
  provider: demoDomain.provider,
  domainName: demoDomain.name,
  urlPreference: "subdomain",
  subdomain: demoDomain.recommendedSubdomain,
};

type Action =
  | { type: "go"; screen: Screen }
  | { type: "patch"; patch: Partial<PlatformState> }
  | { type: "reset" };

function reducer(state: PlatformState, action: Action): PlatformState {
  switch (action.type) {
    case "go": {
      const started =
        action.screen === "provisioning" && (!state.provisionStartedAt || (state.provisionDone && state.screen !== "provisioning"))
          ? { provisionStartedAt: Date.now(), provisionDone: false }
          : action.screen === "complete"
            ? { provisionDone: true }
            : {};
      // Jumping past Step 1 without filling it (review nav / presenter): use the demo domain.
      if (action.screen !== "step1" && !state.domainName) return { ...state, ...demoFilled, ...started, screen: action.screen };
      return { ...state, ...started, screen: action.screen };
    }
    case "patch":
      return { ...state, ...action.patch };
    case "reset":
      return initialPlatformState;
  }
}

interface Ctx {
  state: PlatformState;
  go: (screen: Screen) => void;
  patch: (patch: Partial<PlatformState>) => void;
  reset: () => void;
}

const PlatformContext = createContext<Ctx | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const { path, navigate } = useRouter();
  const [state, dispatch] = useReducer(reducer, initialPlatformState, (init) => {
    const legacy = new URLSearchParams(window.location.search).get("screen");
    const screen = legacy && legacy in SCREEN_PATH ? (legacy as Screen) : screenForPath(window.location.pathname.replace(/\/+$/, "") || "/");
    return screen === "step1" ? init : reducer(init, { type: "go", screen });
  });
  // Legacy deep links (?screen=provisioning) → the real route.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("screen") as Screen | null;
    if (q && q !== "app" && q in SCREEN_PATH) navigate(SCREEN_PATH[q as keyof typeof SCREEN_PATH], { replace: true });
  }, []);
  // The URL is the source of truth: entering a White Label route runs the same transition logic.
  useEffect(() => {
    const screen = screenForPath(path);
    dispatch({ type: "go", screen });
  }, [path]);
  const go = useCallback(
    (screen: Screen) => {
      if (screen === "app") return;
      navigate(SCREEN_PATH[screen]);
    },
    [navigate],
  );
  const patch = useCallback((p: Partial<PlatformState>) => dispatch({ type: "patch", patch: p }), []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  return <PlatformContext.Provider value={{ state, go, patch, reset }}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside PlatformProvider");
  return ctx;
}

/** Address fans will see, derived from the Step 1 form. */
export function siteAddress(s: PlatformState) {
  const d = s.domainName || "example.com";
  return s.urlPreference === "subdomain" ? `${s.subdomain || "sub-domain"}.${d}` : `www.${d}`;
}
