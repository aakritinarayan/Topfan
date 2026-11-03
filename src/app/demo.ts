/**
 * Two demo entry links over the same app (same pages, routes, assistant and mascot):
 *   /demo/setup-navigation → account setup and finding your way around
 *   /demo/ai-content       → creating and managing content with the assistant (Content Autopilot)
 * Opening a link remembers the demo for this browser tab (sessionStorage) and swaps the address for
 * the demo's starting screen, so internal navigation and refresh use the normal TopFan routes.
 * Each demo keeps its own saved state (mock data, assistant tasks, Autopilot screen): storageKey()
 * suffixes the keys, so nothing done in one demo shows up in the other. Without a demo link the app
 * behaves exactly as before (unsuffixed keys).
 * Must run before the stores read localStorage: it's imported first in main.tsx.
 */
export type DemoId = "setup-navigation" | "ai-content";

/**
 * What the assistant may start proactively or on request in a demo (enforced in code, not prompts):
 * - setup:     website setup (domain, GoDaddy purchase hand-off, DNS, provisioning, Creator Quest)
 * - discovery: guided platform tasks and broad monetization discovery ("explore all earning options")
 * - content:   writing help, drafts and content-related monetization help
 * - autopilot: Content Autopilot (plans, draft batches, Smart Timing, review queue)
 * Shared in both (never gated): page awareness, explanations, text and voice input, opening a named
 * TopFan page, conversation and task controls, help and error recovery.
 */
export type DemoScope = "setup" | "discovery" | "content" | "autopilot";

export const DEMOS: Record<DemoId, { title: string; start: string; pitch: string; scope: DemoScope[] }> = {
  "setup-navigation": {
    title: "Account Setup & Navigation",
    start: "/edit-preference/whitelabel/setup/domain",
    pitch: "AI makes TopFan easier to understand, navigate, and use.",
    scope: ["setup", "discovery"],
  },
  // The creator's Feed (default demo creator): New Post, Monetize and the rest of the creator sidebar.
  "ai-content": {
    title: "AI-Assisted Content",
    start: "/ajwhite",
    pitch: "AI reduces the repetitive effort of creating and managing content.",
    scope: ["content", "autopilot"],
  },
};

const SESSION_KEY = "tf-demo";
const isDemo = (v: unknown): v is DemoId => typeof v === "string" && v in DEMOS;

function init(): DemoId | null {
  if (typeof window === "undefined") return null;
  const m = window.location.pathname.match(/^\/demo\/([a-z-]+)\/?$/);
  try {
    if (m && isDemo(m[1])) {
      sessionStorage.setItem(SESSION_KEY, m[1]);
      // Show the demo's starting screen; keep flags such as ?resetMock=1 or ?noDelay=1.
      window.history.replaceState(null, "", DEMOS[m[1]].start + window.location.search + window.location.hash);
      return m[1];
    }
    // ?demo=off leaves demo mode in this tab (back to the default app state).
    if (new URLSearchParams(window.location.search).get("demo") === "off") {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    const saved = sessionStorage.getItem(SESSION_KEY);
    return isDemo(saved) ? saved : null;
  } catch {
    return m && isDemo(m[1]) ? m[1] : null;
  }
}

export const demoId: DemoId | null = init();

/** The localStorage key for this demo (unchanged outside the demo links). */
export const storageKey = (base: string) => (demoId ? `${base}:${demoId}` : base);

/** Where Reset sends you: this demo's starting screen (or account setup, as before). */
export const resetPath = () => (demoId ? DEMOS[demoId].start : "/edit-preference/whitelabel/setup/domain");

/** Is this capability part of the current demo? Outside the demo links everything is on, as before. */
export const inScope = (c: DemoScope) => !demoId || DEMOS[demoId].scope.includes(c);

/** The demo that owns a capability (for "That workflow is available in…"). */
export const demoOwning = (c: DemoScope): DemoId => (DEMOS["setup-navigation"].scope.includes(c) ? "setup-navigation" : "ai-content");

/** The other demo's link, opened in a new tab so this demo's state and conversation stay as they are. */
export const openDemo = (id: DemoId) => window.open(`/demo/${id}`, "_blank", "noopener");
