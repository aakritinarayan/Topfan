/**
 * Video slot for demo clips (src/media). Before playing: poster + the existing round play button +
 * duration. Click → the real file with native controls (muted clips; never autoplays on load).
 * Loading and error states keep the slot's size; a key without a video file renders an honest
 * "Preview" poster with no play button.
 */
import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { FALLBACK, asset, mediaSrc, posterOf, reportMediaError } from "../../media";

const fmt = (s?: number) => (s ? `0:${String(Math.round(s)).padStart(2, "0")}` : null);

export function VideoPlayer({ video, poster, label, className = "", rounded = "", recorded }: { video?: string | null; poster?: string | null; label: string; className?: string; rounded?: string; recorded?: boolean }) {
  const info = asset(video);
  const src = info && /\.mp4$/.test(info.src) ? info.src : null;
  const still = mediaSrc(poster) ?? posterOf(video) ?? null;
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const box = `relative overflow-hidden bg-placeholder-img ${rounded} ${className}`;
  if (!src)
    return (
      <div className={box} data-media="video-preview">
        {still ? <img src={still} alt={label} loading="lazy" className="h-full w-full object-cover" /> : <img src={FALLBACK.video} alt="" className="h-full w-full object-cover" />}
        <span className="absolute bottom-[10px] left-[10px] rounded-full bg-black/70 px-[10px] py-[3px] text-[12px] font-bold">Preview</span>
      </div>
    );
  if (state === "error")
    return (
      <div className={box} data-media="video-error">
        <img src={FALLBACK.video} alt="" className="h-full w-full object-cover" />
        <span className="absolute inset-x-0 bottom-[12px] text-center text-[13px] text-white/80">This video couldn't load.</span>
      </div>
    );
  if (state === "idle")
    return (
      <button type="button" className={`${box} block text-left`} aria-label={`Play video: ${label}`} data-media="video" onClick={() => setState("loading")}>
        {still && <img src={still} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-black/45">
            <Play size={26} className="ml-[4px] fill-white" />
          </span>
        </span>
        {recorded && <span className="absolute left-[10px] top-[10px] rounded-full bg-black/70 px-[10px] py-[3px] text-[12px] font-bold">Recorded preview</span>}
        {fmt(info?.duration) && <span className="absolute bottom-[10px] right-[10px] rounded-full bg-black/70 px-[8px] py-[2px] text-[12px] font-bold tabular-nums">{fmt(info?.duration)}</span>}
      </button>
    );
  return (
    <div className={box} data-media="video-playing">
      <video
        src={src}
        poster={still ?? undefined}
        controls
        autoPlay
        muted
        playsInline
        preload="metadata"
        aria-label={label}
        className="h-full w-full bg-black object-cover"
        onPlaying={() => setState("playing")}
        onWaiting={() => setState("loading")}
        onError={() => (reportMediaError(src, "video"), setState("error"))}
      />
      {state === "loading" && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-white/80" />
        </span>
      )}
      {recorded && <span className="pointer-events-none absolute left-[10px] top-[10px] rounded-full bg-black/70 px-[10px] py-[3px] text-[12px] font-bold">Recorded preview</span>}
    </div>
  );
}
