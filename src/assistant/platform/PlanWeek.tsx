/**
 * Content Autopilot › Plan my week. The creator answers a few short questions (one per step, recommended
 * answers pre-selected), sees the week as a plan, and approves it. Approving lets Autopilot draft the
 * posts; every draft is still reviewed, and nothing is published by the assistant.
 */
import { useRef, useState } from "react";
import { Check, Play, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import { delaysOff, getData, useData } from "../../store/store";
import { ImageSlot } from "../../platform/ui/surfaces";
import { posterOf } from "../../media";
import {
  addPlanAsset,
  approvePlan,
  buildPlan,
  namedDay,
  PILLARS,
  prepareFromPlan,
  removeSlot,
  spareIdeas,
  startPlan,
  suggestedRhythm,
  swapSlot,
  updateBrief,
  weekLabel,
  type Pillar,
} from "../../store/slices/autopilot";
import { setAPView, type PlanStep } from "./autopilotView";
import { btnPrimary, btnText, Card, Header, run, TypeIcon } from "./apKit";

const STEPS: PlanStep[] = ["happening", "rhythm", "topics", "media", "review"];
const DAYS = [1, 2, 3, 4, 5, 6, 0];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const go = (step: PlanStep) => setAPView({ screen: "plan", step });
const hourLabel = (h: number) => new Date(2026, 0, 1, h).toLocaleTimeString("en-US", { hour: "numeric" });
const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-[12px] font-bold ${on ? "bg-accent text-white" : "border border-line text-soft hover:text-white"}`;

export function PlanWeek({ step }: { step: PlanStep }) {
  const plan = useData((d) => d.autopilot.plan ?? null);
  if (step === "intro" || !plan) return <Intro />;
  const n = STEPS.indexOf(step);
  const title = n >= 0 ? `Plan my week · Step ${n + 1} of ${STEPS.length}` : "Plan my week";
  const back = n > 0 ? () => go(STEPS[n - 1]) : n === 0 ? () => go("intro") : undefined;
  return (
    <Card testid="ap-plan">
      <Header title={title} onBack={step === "approved" ? undefined : back} />
      {step === "happening" && <Happening />}
      {step === "rhythm" && <Rhythm />}
      {step === "topics" && <Topics />}
      {step === "media" && <Media />}
      {step === "review" && <Review />}
      {step === "approved" && <Approved />}
    </Card>
  );
}

function Intro() {
  const weekOf = useData((d) => d.autopilot.plan?.weekOf);
  const waiting = useData((d) => d.autopilot.batch?.drafts.filter((x) => x.status === "ready" || x.status === "approved").length ?? 0);
  const resuming = useData((d) => d.autopilot.plan?.status === "draft" && (d.autopilot.plan.brief.happening.length > 0 || d.autopilot.plan.slots.length > 0));
  const start = () => (run("planStart", startPlan), go("happening"));
  return (
    <Card testid="ap-plan-intro">
      <h3 className="text-[15px] font-bold">Plan next week's posts</h3>
      <p className="mt-1 text-[13px] text-soft">
        Tell me what's coming up and how often you'd like to post. I'll plan the week, then draft each post for you to review. Nothing is published without you.
      </p>
      <ul className="mt-3 flex flex-col gap-1.5 text-[13px]">
        {["What's happening next week", "Which days to post", "What to post about", "Which photos and clips I can use"].map((t, i) => (
          <li key={t} className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-[11px] text-soft">{i + 1}</span>
            {t}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-muted">About 2 minutes{weekOf ? ` · Week of ${weekLabel(weekOf)}` : ""}</p>
      {waiting > 0 && (
        <p className="mt-2 rounded-inner border border-line px-3 py-2 text-[12px] text-soft" data-testid="ap-plan-waiting">
          You have {waiting} {waiting === 1 ? "draft" : "drafts"} from this week waiting. You can plan now; review them before preparing next week's drafts, or they'll be replaced.
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className={btnPrimary} data-testid="ap-plan-start" onClick={start}>
          {resuming ? "Continue planning" : "Start planning"}
        </button>
        {waiting > 0 && (
          <button className={btnText} data-testid="ap-plan-review-first" onClick={() => setAPView({ screen: "summary" })}>
            Review this week first
          </button>
        )}
        <button className={btnText} data-testid="ap-plan-cancel" onClick={() => setAPView(null)}>
          Not now
        </button>
      </div>
    </Card>
  );
}

/** Step 1: the creator's own words. These are the only new facts drafts may use. */
function Happening() {
  const items = useData((d) => d.autopilot.plan!.brief.happening);
  const [line, setLine] = useState("");
  const add = () => {
    const t = line.trim().replace(/\s+/g, " ");
    if (t.length < 3 || items.includes(t)) return;
    run("planBrief", (d) => updateBrief(d, { happening: [...items, t].slice(0, 6) }));
    setLine("");
  };
  return (
    <>
      <h4 className="text-[15px] font-bold">What's coming up next week?</h4>
      <p className="mt-1 text-[13px] text-soft">Competitions, trips, launches, filming days. One at a time, in your own words. I'll only use what you write.</p>
      <div className="mt-3 flex gap-2">
        <input
          value={line}
          onChange={(e) => setLine(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="For example: competing at the rail jam on Saturday"
          aria-label="What's coming up"
          data-testid="ap-plan-line"
          maxLength={120}
          className="h-10 min-w-0 flex-1 rounded-pill bg-bg px-4 text-[13px] outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
        />
        <button aria-label="Add" title="Add" data-testid="ap-plan-add" disabled={line.trim().length < 3} onClick={add} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent disabled:opacity-50">
          <Plus size={18} />
        </button>
      </div>
      {/* Starters stay available after each line, so adding the next one is as easy as the first. */}
      {items.length < 6 && (
        <div className="mt-2 flex flex-wrap gap-1.5" data-testid="ap-plan-starters">
          {["Competing at ", "Traveling to ", "Filming ", "Launching ", "Training "].map((s) => (
            <button key={s} className={chip(false)} onClick={() => (setLine(s), document.querySelector<HTMLInputElement>('[data-testid="ap-plan-line"]')?.focus())}>
              {s.trim()}…
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted">You can also type or speak it in the message box below.</p>
      {items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5" data-testid="ap-plan-lines">
          {items.map((t) => (
            <li key={t} className="flex items-center gap-2 rounded-tile bg-bg px-3 py-2 text-[13px]">
              <span className="min-w-0 flex-1">{t}</span>
              <button aria-label={`Remove ${t}`} className="text-soft hover:text-white" onClick={() => run("planBrief", (d) => updateBrief(d, { happening: items.filter((x) => x !== t) }))}>
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className={btnPrimary} data-testid="ap-plan-next" onClick={() => (line.trim().length >= 3 && add(), go("rhythm"))}>
          Continue
        </button>
        {!items.length && (
          <button className={btnText} data-testid="ap-plan-nothing" onClick={() => go("rhythm")}>
            Nothing special next week
          </button>
        )}
      </div>
    </>
  );
}

/** Step 2: which days (one post per day), suggested from the creator's own fan activity. */
function Rhythm() {
  const days = useData((d) => d.autopilot.plan!.brief.days);
  const rhythm = useData(suggestedRhythm);
  const happening = useData((d) => d.autopilot.plan!.brief.happening);
  const mentioned = [...new Set(happening.map(namedDay).filter((x): x is number => x !== null))];
  const expected = [...new Set([...rhythm.days, ...mentioned])];
  const suggested = [...expected].sort().join() === [...days].sort().join();
  const added = mentioned.filter((x) => !rhythm.days.includes(x));
  const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const toggle = (day: number) => run("planBrief", (d) => updateBrief(d, { days: days.includes(day) ? days.filter((x) => x !== day) : [...days, day] }));
  return (
    <>
      <h4 className="text-[15px] font-bold">Which days should you post?</h4>
      <p className="mt-1 text-[13px] text-soft">One post on each day you pick.</p>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Posting days">
        {DAYS.map((day) => (
          <button key={day} aria-pressed={days.includes(day)} data-testid={`ap-plan-day-${DAY_SHORT[day].toLowerCase()}`} className={chip(days.includes(day))} onClick={() => toggle(day)}>
            {DAY_SHORT[day]}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[13px]" data-testid="ap-plan-rhythm">
        <b>{days.length} {days.length === 1 ? "post" : "posts"}</b> next week, around {hourLabel(rhythm.hour)} (suggested).
      </p>
      <p className="mt-1 text-[12px] text-soft">
        {suggested
          ? `${rhythm.basis === "activity" ? "Suggested from when your fans have liked and commented on your past posts." : "There isn't enough history yet, so these are days to try."}${added.length ? ` ${added.map((x) => DAY_LONG[x]).join(" and ")} ${added.length === 1 ? "is" : "are"} added because you mentioned ${added.length === 1 ? "it" : "them"}.` : ""}`
          : "Your own pick."}{" "}
        {!suggested && (
          <button className="font-bold text-accent" onClick={() => run("planBrief", (d) => updateBrief(d, { days: expected }))}>
            Use suggested days
          </button>
        )}
      </p>
      <div className="mt-4">
        <button className={btnPrimary} data-testid="ap-plan-next" disabled={!days.length} onClick={() => go("topics")}>
          Continue
        </button>
      </div>
    </>
  );
}

/** Step 3: topics to mix, plus anything to leave out. */
function Topics() {
  const brief = useData((d) => d.autopilot.plan!.brief);
  const [avoid, setAvoid] = useState(brief.avoid);
  const shown = PILLARS.filter((p) => p.id !== "coming-up" || brief.happening.length > 0);
  const toggle = (id: Pillar) => run("planBrief", (d) => updateBrief(d, { pillars: brief.pillars.includes(id) ? brief.pillars.filter((x) => x !== id) : [...brief.pillars, id] }));
  return (
    <>
      <h4 className="text-[15px] font-bold">What should the posts be about?</h4>
      <p className="mt-1 text-[13px] text-soft">I'll mix these through the week.</p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {shown.map((p) => {
          const on = brief.pillars.includes(p.id);
          return (
            <li key={p.id}>
              <button aria-pressed={on} data-testid={`ap-plan-topic-${p.id}`} onClick={() => toggle(p.id)} className={`flex w-full items-center gap-3 rounded-tile px-3 py-2 text-left ${on ? "bg-bg ring-1 ring-accent" : "bg-bg"}`}>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${on ? "bg-accent" : "border border-line"}`}>{on && <Check size={12} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold">{p.label}</span>
                  <span className="block text-[11px] text-soft">{p.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <label className="mt-3 block text-[12px] font-bold" htmlFor="ap-plan-avoid">
        Anything to leave out? <span className="font-normal text-soft">(optional)</span>
      </label>
      <input
        id="ap-plan-avoid"
        value={avoid}
        onChange={(e) => setAvoid(e.target.value)}
        onBlur={() => run("planBrief", (d) => updateBrief(d, { avoid }))}
        placeholder="For example: polls"
        maxLength={80}
        data-testid="ap-plan-avoid"
        className="mt-1.5 h-10 w-full rounded-pill bg-bg px-4 text-[13px] outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
      />
      <p className="mt-1 text-[11px] text-muted">I'll skip ideas that mention these words.</p>
      <div className="mt-4">
        <button className={btnPrimary} data-testid="ap-plan-next" disabled={!brief.pillars.length} onClick={() => (run("planBrief", (d) => updateBrief(d, { avoid })), go("media"))}>
          Continue
        </button>
      </div>
    </>
  );
}

/** Step 4: only files the creator picks can appear in posts. */
function Media() {
  const assets = useData((d) => d.autopilot.assets);
  const picked = useData((d) => d.autopilot.plan!.brief.assetIds);
  const toggle = (id: string) => run("planBrief", (d) => updateBrief(d, { assetIds: picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id] }));
  return (
    <>
      <h4 className="text-[15px] font-bold">Which photos and clips can I use?</h4>
      <p className="mt-1 text-[13px] text-soft">Pick from your media library, add a new photo or video, or let me generate an image. I'll only use what you pick; the other posts are text or polls.</p>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {assets.map((a) => {
          const on = a.approved && picked.includes(a.id);
          return (
            <li key={a.id}>
              <button
                aria-pressed={on}
                disabled={!a.approved}
                data-testid={`ap-plan-asset-${a.id}`}
                onClick={() => toggle(a.id)}
                className={`relative w-full overflow-hidden rounded-tile bg-bg text-left disabled:opacity-60 ${on ? "ring-2 ring-accent" : ""}`}
              >
                <ImageSlot src={a.poster ?? (a.kind === "video" ? posterOf(a.src) : a.src)} label={a.label} className="aspect-[4/3] w-full" />
                {a.kind === "video" && (
                  <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60" aria-hidden>
                    <Play size={11} className="ml-px fill-white" />
                  </span>
                )}
                <span className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full ${on ? "bg-accent" : "border border-white/70 bg-black/40"}`}>{on && <Check size={12} />}</span>
                <span className="block px-2 py-1.5 text-[12px] font-bold">{a.label}</span>
                <span className="block px-2 pb-1.5 text-[11px] text-soft">{!a.approved ? "Not approved for posting yet" : a.kind === "video" ? "Video" : "Photos"}</span>
              </button>
            </li>
          );
        })}
        <li>
          <GenerateMedia />
        </li>
        <li>
          <AddMedia />
        </li>
      </ul>
      <div className="mt-4">
        <button className={btnPrimary} data-testid="ap-plan-next" onClick={() => (run("planBuild", buildPlan), go("review"))}>
          See my plan
        </button>
      </div>
    </>
  );
}

/** Step 5: the visible plan. Swap or remove any post, then approve. */
function Review() {
  const plan = useData((d) => d.autopilot.plan!);
  const spare = useData((d) => spareIdeas(d).length);
  const short = plan.brief.days.length - plan.slots.length;
  return (
    <>
      <h4 className="text-[15px] font-bold" data-testid="ap-plan-heading">
        Your plan for {weekLabel(plan.weekOf)}
      </h4>
      <p className="mt-1 text-[13px] text-soft">
        {plan.slots.length} {plan.slots.length === 1 ? "post" : "posts"}. Swap or remove anything before you approve.
      </p>
      <ul className="mt-3 flex flex-col gap-1.5" data-testid="ap-plan-slots">
        {plan.slots.map((s) => (
          <li key={s.id} className="flex items-center gap-2 rounded-tile bg-bg px-3 py-2" data-testid="ap-plan-slot">
            <span className="w-[38px] shrink-0 text-[12px] font-bold">{new Date(s.at).toLocaleDateString("en-US", { weekday: "short" })}</span>
            <span className="text-soft">
              <TypeIcon t={s.type} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold">{s.title}</span>
              <span className="block truncate text-[11px] text-soft">From: {s.basis}</span>
            </span>
            <button aria-label={`Try another idea for ${s.title}`} title="Try another idea" disabled={!spare} className="flex h-7 w-7 items-center justify-center rounded-full text-soft hover:bg-surface hover:text-white disabled:opacity-40" onClick={() => run("planSwap", (d) => void swapSlot(d, s.id))}>
              <RefreshCw size={13} />
            </button>
            <button aria-label={`Remove ${s.title}`} title="Remove" className="flex h-7 w-7 items-center justify-center rounded-full text-soft hover:bg-surface hover:text-white" onClick={() => run("planRemove", (d) => removeSlot(d, s.id))}>
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
      {!plan.slots.length && <p className="mt-2 text-[13px]">There's nothing in the plan. Go back and pick some topics or days.</p>}
      {short > 0 && plan.slots.length > 0 && (
        <p className="mt-2 text-[12px] text-soft" data-testid="ap-plan-short">
          I had ideas for {plan.slots.length} of your {plan.brief.days.length} days. Add what's coming up or pick more topics to fill the rest.
        </p>
      )}
      <p className="mt-3 text-[12px] text-muted">Times are suggestions. Approving lets me draft these posts for your review; nothing is published.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className={btnPrimary} data-testid="ap-plan-approve" disabled={!plan.slots.length} onClick={() => (run("planApprove", approvePlan), go("approved"))}>
          Approve plan
        </button>
        <button className={btnText} data-testid="ap-plan-edit" onClick={() => go("happening")}>
          Change answers
        </button>
      </div>
    </>
  );
}

/** After approval: what happens next, in order. */
function Approved() {
  const plan = useData((d) => d.autopilot.plan!);
  const prepared = plan.status === "prepared";
  const steps = [
    { t: "Plan approved", done: true },
    { t: "I draft each post the day before it's due", done: prepared },
    { t: "You review and approve the drafts", done: false },
    { t: "You publish from New Post when you're ready", done: false },
  ];
  return (
    <>
      <h4 className="text-[15px] font-bold" data-testid="ap-plan-approved">
        Your week is planned.
      </h4>
      <p className="mt-1 text-[13px] text-soft">
        {plan.slots.length} posts for {weekLabel(plan.weekOf)}. I'll let you know once when drafts are ready to review.
      </p>
      <ol className="mt-3 flex flex-col gap-2 text-[13px]">
        {steps.map((s) => (
          <li key={s.t} className="flex items-center gap-2">
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-accent" : "border border-line"}`}>{s.done && <Check size={12} />}</span>
            <span className={s.done ? "" : "text-soft"}>{s.t}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className={btnPrimary} data-testid="ap-plan-prepare" onClick={() => (run("planPrepare", prepareFromPlan), setAPView({ screen: "summary" }))}>
          Draft them now
        </button>
        <button className={btnText} data-testid="ap-plan-done" onClick={() => setAPView(null)}>
          Back to chat
        </button>
      </div>
      <p className="mt-2 text-[11px] text-muted">Demo: "Draft them now" skips the wait. In the product, each draft arrives the day before its post.</p>
    </>
  );
}

/** Read a file the creator picked into a local thumbnail (and, for video, a playable local URL). Never uploaded. */
function readLocal(file: File): Promise<{ kind: "image" | "video"; src: string; poster: string }> {
  const kind = file.type.startsWith("video/") ? "video" : "image";
  const url = URL.createObjectURL(file);
  // Draw a small still so the thumbnail survives a reload (the full file stays in this browser tab only).
  const still = (el: HTMLImageElement | HTMLVideoElement, w: number, h: number) => {
    const scale = Math.min(1, 640 / Math.max(w, h));
    const c = document.createElement("canvas");
    c.width = Math.round(w * scale);
    c.height = Math.round(h * scale);
    c.getContext("2d")!.drawImage(el, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
  };
  return new Promise((resolve, reject) => {
    if (kind === "image") {
      const img = new Image();
      img.onload = () => {
        const poster = still(img, img.naturalWidth, img.naturalHeight);
        URL.revokeObjectURL(url);
        resolve({ kind, src: poster, poster });
      };
      img.onerror = reject;
      img.src = url;
    } else {
      const v = document.createElement("video");
      v.muted = true;
      v.preload = "auto";
      v.onloadeddata = () => (v.currentTime = Math.min(1, (v.duration || 0) / 2));
      v.onseeked = () => resolve({ kind, src: url, poster: still(v, v.videoWidth, v.videoHeight) });
      v.onerror = reject;
      v.src = url;
    }
  });
}

/** AI-generated visuals for the week's posts (sample set), offered in turn so each tap gives a new one. */
const GENERATED = ["generated/training-cinematic", "generated/training-minimal", "generated/training-dark", "generated/training-wide"];

/** Generate an image for this week. It's picked as soon as it's ready. */
function GenerateMedia() {
  const [busy, setBusy] = useState(false);
  const make = () => {
    setBusy(true);
    setTimeout(() => {
      const used = getData().autopilot.assets.map((a) => a.src);
      const src = GENERATED.find((k) => !used.includes(k)) ?? GENERATED[used.filter((k) => GENERATED.includes(k)).length % GENERATED.length];
      run("planGenerateMedia", (d) => addPlanAsset(d, { label: "AI-generated image", kind: "image", src }));
      setBusy(false);
    }, delaysOff() ? 0 : 1400);
  };
  return (
    <button
      data-testid="ap-plan-generate-media"
      disabled={busy}
      onClick={make}
      className="flex h-full min-h-[150px] w-full flex-col items-center justify-center gap-1.5 rounded-tile border-2 border-dashed border-line px-3 text-center hover:border-accent"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
        <Sparkles size={16} className={busy ? "animate-pulse" : ""} />
      </span>
      <span className="text-[12px] font-bold">{busy ? "Creating your image…" : "Generate an image"}</span>
      <span className="text-[11px] text-soft">An original visual for this week's posts.</span>
    </button>
  );
}

/** Add a photo or video from the creator's device. It's picked for this week as soon as it's added. */
function AddMedia() {
  const ref = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "reading" | "failed">("idle");
  const pick = async (file: File) => {
    setState("reading");
    try {
      const f = await readLocal(file);
      const name = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 40);
      const label = name ? name[0].toUpperCase() + name.slice(1) : f.kind === "video" ? "New clip" : "New photo";
      run("planAddMedia", (d) => addPlanAsset(d, { label, ...f }));
      setState("idle");
    } catch {
      setState("failed");
    }
  };
  return (
    <>
      <button
        data-testid="ap-plan-add-media"
        disabled={state === "reading"}
        onClick={() => ref.current?.click()}
        className="flex h-full min-h-[150px] w-full flex-col items-center justify-center gap-1.5 rounded-tile border-2 border-dashed border-line px-3 text-center hover:border-accent"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
          <Plus size={16} />
        </span>
        <span className="text-[12px] font-bold">{state === "reading" ? "Adding…" : "Add photo or video"}</span>
        <span className="text-[11px] text-soft">{state === "failed" ? "That file couldn't be read. Try a JPG, PNG, MP4 or MOV." : "From this device. Nothing is uploaded in this demo."}</span>
      </button>
      <input
        ref={ref}
        type="file"
        hidden
        accept="image/*,video/mp4,video/quicktime,video/webm"
        data-testid="ap-plan-media-file"
        onChange={(e) => (e.target.files?.[0] && pick(e.target.files[0]), (e.target.value = ""))}
      />
    </>
  );
}
