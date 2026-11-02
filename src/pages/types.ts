import type { ComponentType } from "react";
import type { RouteDef } from "../app/routes/types";

export interface PageProps {
  route: RouteDef;
  params: Record<string, string>;
  query: URLSearchParams;
}
/** Route id → page component. Each area exports one of these from its index.tsx. */
export type PageMap = Record<string, ComponentType<PageProps>>;
