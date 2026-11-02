/**
 * Demo media catalog. Every image/video the demo shows is a local file under public/assets/,
 * referenced from the mock store by asset KEY (e.g. "merchandise/spectrum-x"), never by scattered URLs.
 * Sources and licenses: docs/media-coverage.md (generated from scripts/media/credits.json).
 *
 * - mediaSrc(keyOrPath): resolves a key (or passes through a path/blob/data URL the creator added).
 * - FALLBACK[kind]: a content-type fallback shown when a file fails to load (never an unrelated photo).
 * - reportMediaError(): failures are recorded (window.__mediaErrors + console.warn) so they can be tested.
 */
import catalog from "./assets.json";

export type MediaKind = "image" | "video" | "course" | "product" | "event" | "audio" | "ebook" | "avatar";
export interface AssetInfo {
  src: string;
  alt: string;
  w: number;
  h: number;
  poster?: string;
  duration?: number;
}

const ASSETS = catalog as Record<string, AssetInfo>;
export const asset = (key: string | null | undefined): AssetInfo | null => (key ? (ASSETS[key] ?? null) : null);
export const hasAsset = (key: string) => key in ASSETS;

const isPath = (s: string) => /^(\/|https?:|data:|blob:)/.test(s);
/** Key or path → URL. Unknown keys return null (the caller shows its intended empty state). */
export function mediaSrc(v: string | null | undefined): string | null {
  if (!v) return null;
  if (isPath(v)) return v;
  return ASSETS[v]?.src ?? null;
}
export const mediaAlt = (v: string | null | undefined, fallback = "") => (v && ASSETS[v]?.alt) || fallback;
export const posterOf = (v: string | null | undefined) => (v ? (ASSETS[v]?.poster ?? null) : null);

export const FALLBACK: Record<MediaKind, string> = {
  image: "/assets/illustrations/fallback-image.svg",
  video: "/assets/illustrations/fallback-video.svg",
  course: "/assets/illustrations/fallback-course.svg",
  product: "/assets/illustrations/fallback-product.svg",
  event: "/assets/illustrations/fallback-event.svg",
  audio: "/assets/illustrations/fallback-audio.svg",
  ebook: "/assets/illustrations/fallback-ebook.svg",
  avatar: "/assets/illustrations/fallback-avatar.svg",
};

declare global {
  interface Window {
    __mediaErrors?: { src: string; kind: MediaKind; at: string }[];
  }
}
export function reportMediaError(src: string, kind: MediaKind) {
  if (typeof window === "undefined") return;
  (window.__mediaErrors ??= []).push({ src, kind, at: new Date().toISOString() });
  console.warn(`[media] failed to load ${kind}: ${src}`);
}

/** Stable illustrated avatar for a fan/person id (24 original illustrations; never a real photo). */
export function personAvatar(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `creators/fans/fan-${String((h % 24) + 1).padStart(2, "0")}`;
}

/** Creator identity media by handle (demo profiles). Unknown handles fall back to illustrations. */
export function creatorMedia(handle: string) {
  const a = `creators/${handle}/avatar`, c = `creators/${handle}/cover`;
  return { avatar: hasAsset(a) ? a : personAvatar(handle), cover: hasAsset(c) ? c : null };
}
