/**
 * Global UI overlays that open over any page without a URL change (Livestream modal, auth modals,
 * Welcome modal). Pages and the assistant both open them through here.
 */
import { useSyncExternalStore } from "react";

export type Overlay = "livestream" | "sign-in" | "join" | "welcome" | null;
let current: Overlay = null;
const subs = new Set<() => void>();
export const openOverlay = (o: Overlay) => {
  current = o;
  subs.forEach((s) => s());
};
export const closeOverlay = () => openOverlay(null);
export const useOverlay = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => current,
  );
