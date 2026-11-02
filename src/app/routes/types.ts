/**
 * Route catalogue types. The catalogue is plain data (no components) so the assistant and the docs
 * export (docs/agent-context/routes.json) can use it. Components are mapped in src/app/pages.tsx.
 */
export type Layout =
  | "dashboard" // header + 268px sidebar + content column (REF › App shell)
  | "bleed" // Activity / Messages: sidebar snapped to x=0, full-bleed content
  | "narrow" // New Post: ~850px content area
  | "marketing" // public Home: no sidebar, marketing top nav (page renders its own nav)
  | "public" // public fan pages: creator header, page controls its own columns
  | "wide" // cover page editor: full width, 20px gutters
  | "onboarding"; // approved AI-assisted White Label setup (TopFan header + assistant)

/** How confident the screen is: captured = screenshots exist; spec-only = text spec only; inferred = built from patterns. */
export type Fidelity = "captured" | "spec-only" | "inferred" | "existing";

export type Section =
  | "home" | "feed" | "activity" | "messages" | "newpost" | "monetize" | "wallet" | "insights" | "resources"
  | "preferences" | "help" | "public" | "onboarding";

/** Who can open it. "financial"/"content" = delegate roles (see store/permissions.ts). */
export type Access = "public" | "creator" | "content" | "financial";

export interface RouteDef {
  id: string;
  pattern: string;
  title: string;
  section: Section;
  /** Where it lives in the original UI, in the product's own words. */
  menu: string;
  parent?: string;
  layout: Layout;
  access: Access[];
  status: Fidelity;
  /** Spec file in References/topfan-reference/pages (if any). */
  spec?: string;
  /** Screenshot filename prefixes that show this screen. */
  shots?: string[];
  /** Redirect target route id (e.g. /wallet → current balance). */
  redirect?: string;
  /** Short note: inferred route, open question… */
  note?: string;
}

/** Everyone who can run the creator business (owner always; delegates by grant). */
export const CREATOR: Access[] = ["creator", "content", "financial"];
export const OWNER: Access[] = ["creator"];
export const FINANCE: Access[] = ["creator", "financial"];
export const CONTENT: Access[] = ["creator", "content"];
export const ANYONE: Access[] = ["public", "creator", "content", "financial"];
