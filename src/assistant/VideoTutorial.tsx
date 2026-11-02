/**
 * Provider video tutorial: a compact card in the assistant panel that opens a player overlay.
 * Playback starts only from the creator's click. The video uses example DNS values, so the card and
 * the player say to copy the real values from Step 2.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Play, X } from "lucide-react";

export interface Tutorial {
  title: string;
  src: string;
  poster: string;
  duration: string;
}

export const GODADDY_TUTORIAL: Tutorial = {
  title: "Connect a GoDaddy domain to TopFan",
  src: "/videos/godaddy-dns-tutorial.mp4",
  poster: "/videos/godaddy-dns-tutorial.jpg",
  duration: "0:42",
};

const VALUES_NOTE = "The video uses example values. Copy your own Host and Value from Step 2.";

export function VideoTutorialCard({ tutorial }: { tutorial: Tutorial }) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={opener}
        onClick={() => setOpen(true)}
        data-testid="video-tutorial-card"
        aria-label={`Play video: ${tutorial.title}, ${tutorial.duration}`}
        className="group mt-3 block w-full overflow-hidden rounded-[14px] border border-line bg-bg text-left transition-colors hover:border-accent/70"
      >
        <span className="relative block aspect-video w-full overflow-hidden">
          <img src={tutorial.poster} alt="" className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent shadow-[0_6px_20px_rgba(0,0,0,0.45)] transition-transform group-hover:scale-105">
              <Play size={18} className="ml-0.5 fill-current" />
            </span>
          </span>
          <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold tabular-nums">{tutorial.duration}</span>
        </span>
        <span className="block px-3 py-2.5">
          <span className="block text-[13px] font-bold">{tutorial.title}</span>
          <span className="mt-0.5 block text-[12px] text-muted">Video walkthrough · example values</span>
        </span>
      </button>
      <VideoOverlay
        tutorial={tutorial}
        open={open}
        onClose={() => {
          setOpen(false);
          opener.current?.focus();
        }}
      />
    </>
  );
}

function VideoOverlay({ tutorial, open, onClose }: { tutorial: Tutorial; open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
  const video = useRef<HTMLVideoElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFailed(false);
    close.current?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Keep focus inside the dialog (close button + native video controls).
      if (e.key === "Tab") {
        const els = [close.current, video.current].filter(Boolean) as HTMLElement[];
        const i = els.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        els[(i + (e.shiftKey ? els.length - 1 : 1)) % els.length]?.focus();
      }
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={tutorial.title}
            data-testid="video-overlay"
            className="w-full max-w-[960px]"
            initial={reduce ? false : { y: 12, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] as const }}
          >
            <div className="mb-3 flex items-center gap-3">
              <h2 className="flex-1 text-[15px] font-bold">{tutorial.title}</h2>
              <button ref={close} onClick={onClose} aria-label="Close video" className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10">
                <X size={22} />
              </button>
            </div>
            <div className="overflow-hidden rounded-[16px] bg-black shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
              {failed ? (
                <div className="flex aspect-video items-center justify-center px-6 text-center text-[14px] text-soft">
                  The video couldn't load. The written steps in the assistant panel cover the same thing.
                </div>
              ) : (
                <video
                  ref={video}
                  src={tutorial.src}
                  poster={tutorial.poster}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  onError={() => setFailed(true)}
                  className="block aspect-video w-full"
                />
              )}
            </div>
            <p className="mt-3 text-[13px] text-soft">{VALUES_NOTE}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
