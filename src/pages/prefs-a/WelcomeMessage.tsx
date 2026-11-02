/**
 * Preferences › Welcome Message (/edit-preference/edit-welcome-message) — spec 31, shots 31-*, 31a.
 */
import { useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import type { PageProps } from "../types";
import { PreferencesPage } from "../../platform/PreferencesPage";
import { Button } from "../../platform/ui/controls";
import { VideoPlayer } from "../../platform/ui/media";
import { useData, useMockLoading } from "../../store/store";
import { updateWelcomeMessage } from "../../store/slices/prefsA";
import { welcomeVideoOf } from "../../store/slices/social";
import { SegToggle, Skel, useRun } from "./ui";

const MAX = 200;

export function WelcomeMessage({ route }: PageProps) {
  const loading = useMockLoading(1000);
  const saved = useData((d) => d.prefsA.welcomeMessage);
  const savedFile = useData((d) => d.prefsA.welcomeVideoFileName);
  const welcomeVideo = useData(welcomeVideoOf);
  const run = useRun();
  const [enabled, setEnabled] = useState(saved.enabled);
  const [hasVideo, setHasVideo] = useState(saved.hasVideo);
  const [fileName, setFileName] = useState<string | null>(savedFile);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [text, setText] = useState(saved.text);
  const fileIn = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEnabled(saved.enabled);
    setHasVideo(saved.hasVideo);
    setText(saved.text);
  }, [saved]);
  useEffect(() => () => void (videoUrl && URL.revokeObjectURL(videoUrl)), [videoUrl]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setVideoUrl(URL.createObjectURL(f)); // local preview only, never uploaded
    setFileName(f.name);
    setHasVideo(true);
    e.target.value = "";
  };

  return (
    <PreferencesPage>
      <div data-testid={`page-${route.id}`}>
        {loading ? (
          <div data-testid="pref-welcome-skeleton" aria-busy="true">
            <Skel className="h-5 w-[250px]" />
            <Skel className="mt-3 h-3 w-full" />
            <Skel className="mt-2 h-3 w-[80%]" />
            <Skel className="mt-5 aspect-[16/9] w-full rounded-panel" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="text-2xl font-bold">Add a Profile Welcome Video</div>
              <SegToggle enabled={enabled} onChange={setEnabled} testid="pref-welcome-toggle" />
            </div>
            <p className="mb-5 mt-2.5 text-sm leading-[22.4px]">
              Add a short 1-3 minute video to welcome fans to your TopFan site. This is where you can explain the benefits of becoming a Subscriber, and mention
              the other exclusive things you are offering including content, merchandise, experiences, downloadables, chat room and courses.
            </p>

            <div className="rounded-panel bg-surface p-2.5" data-testid="pref-welcome-video-card">
              {hasVideo ? (
                <div className="relative">
                  {videoUrl ? (
                    <video src={videoUrl} controls className="aspect-[16/9] w-full rounded-[15px] bg-black object-cover" data-testid="pref-welcome-video" />
                  ) : (
                    <div className="relative" data-testid="pref-welcome-video">
                      <VideoPlayer video={welcomeVideo} label="Welcome video" rounded="rounded-[15px]" className="aspect-[16/9] w-full" />
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label="Remove welcome video"
                    data-testid="pref-welcome-remove-video"
                    onClick={() => {
                      setHasVideo(false);
                      setVideoUrl(null);
                      setFileName(null);
                    }}
                    className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                </div>
              ) : (
                // inferred: empty state (the video was never removed in the capture)
                <button
                  type="button"
                  data-testid="pref-welcome-upload"
                  onClick={() => fileIn.current?.click()}
                  className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-3 rounded-[15px] border border-dashed border-accent/70 bg-bg text-sm"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                    <Upload size={20} />
                  </span>
                  <span className="font-black uppercase tracking-caps">Upload Welcome Video</span>
                  <span className="text-muted">MP4 or MOV, 1-3 minutes</span>
                </button>
              )}
              <input ref={fileIn} type="file" accept="video/*" hidden onChange={pick} data-testid="pref-welcome-file" />
            </div>

            <div className="mt-5 rounded-panel bg-surface p-6">
              <textarea
                value={text}
                maxLength={MAX}
                onChange={(e) => setText(e.target.value.slice(0, MAX))}
                placeholder="Enter Welcome Message"
                aria-label="Welcome message"
                data-testid="pref-welcome-text"
                className="block h-[70px] w-full rounded-pill bg-surface px-3 pb-2 text-lg text-white outline-none placeholder:text-muted"
              />
              <p className="mt-1 text-right text-xs italic" data-testid="pref-welcome-counter">
                {MAX - text.length} Characters left
              </p>
            </div>

            <div className="mt-5 rounded-tile bg-surface p-4 text-sm leading-[22.4px]">
              <b>Note:</b> Your Welcome Video will show at the top of your feed to anyone who doesn’t already follow you. Once they follow you, your Welcome Video
              will still be accessible from your profile. You can update your Welcome Video at anytime to highlight what’s new in your offering.
            </div>

            <Button
              className="mt-[31px] w-[190px]"
              data-testid="pref-welcome-update"
              onClick={() =>
                run(
                  "prefs.updateWelcomeMessage",
                  (d) => updateWelcomeMessage(d, { enabled, hasVideo, text, videoFileName: hasVideo ? fileName : null }),
                  "content.write",
                  "Welcome message updated", // inferred: toast copy
                )
              }
            >
              Update
            </Button>
          </>
        )}
      </div>
    </PreferencesPage>
  );
}
