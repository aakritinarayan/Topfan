import { createContext, useCallback, useContext, useReducer, type ReactNode } from "react";
import { domain as demoDomain } from "../config/demo";

export type Screen = "step1" | "step2" | "provisioning" | "complete" | "manage" | "coverEditor";

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
  const [state, dispatch] = useReducer(reducer, initialPlatformState, (init) => {
    const q = new URLSearchParams(window.location.search).get("screen") as Screen | null;
    return q && screenOrder.some((s) => s.id === q) ? reducer(init, { type: "go", screen: q }) : init;
  });
  const go = useCallback((screen: Screen) => {
    dispatch({ type: "go", screen });
    window.scrollTo({ top: 0 });
  }, []);
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
