/**
 * Content Autopilot inside the existing TopFan AI panel (review by exception).
 *
 * Screens (all in the panel, compact cards): A summary · held list · B draft detail · C rejection ·
 * E batch confirmation · F completion · preferences. Detailed editing hands off to the ORIGINAL New
 * Post composer (?autopilot=<id>); edits made there sync back (slices/autopilot.syncFromPosts).
 *
 * Decisions are always the creator's: inactivity never approves; approving never publishes; nothing
 * here publishes at all (publishing happens in New Post with its own confirmation). Every write goes
 * through act() with content.write, so delegate permissions apply.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clock, Image as ImageIcon, Pencil, X } from "lucide-react";
import { ImageSlot } from "../../platform/ui/surfaces";
import { VideoPlayer } from "../../platform/ui/media";
import { act, getData, onStoreEvent, useData } from "../../store/store";
import { roleCan } from "../../store/permissions";
import {
  HELD,
  REJECT_REASONS,
  STATUS_LABEL,
  applyRevision,
  approveAsset,
  approveBatch,
  approveDraft,
  approvedDrafts,
  confirmPreference,
  dismissBatch,
  draftById,
  heldDrafts,
  noteCorrection,
  preferenceFor,
  prepareBatch,
  readPublicationStatus,
  readyDrafts,
  rejectDraft,
  removePreference,
  reopenBatch,
  replaceIdea,
  saveApproved,
  setFrequency,
  setPaused,
  updateBrief,
  weekLabel,
  setSlot,
  setTimingRule,
  shortenDraft,
  skipDraft,
  syncFromPosts,
  timingWindows,
  unparkDraft,
  useBestTimes,
  markNotified,
  type APDraft,
  type DraftStatus,
  type MediaState,
  type RejectReason,
} from "../../store/slices/autopilot";
import { useAssistant } from "../../state/assistantStore";
import { useRouter } from "../../app/router";
import { normalizeText } from "../../app/agent-context/intent";
import { streamChat } from "../../services/chatService";
import { getAPView, onAPOpen, openAutopilot, setAPView, useAPView, type APView } from "./autopilotView";
import { PlanWeek } from "./PlanWeek";
import { btnOutline, btnPrimary, btnText, Card, fmtSlot, Header, run, TYPE_LABEL, TypeIcon } from "./apKit";

/* ------------------------------------------------------------------ small UI kit (panel styles) */


/** What the creator is told about a draft's media. */
const MEDIA_NOTE: Record<MediaState, string> = {
  attached: "Attached by you",
  suggested: "Suggested from your approved library",
  missing: "Missing: not in your media library",
  unapproved: "In your library, not approved for posting yet",
};

/** Compact media preview inside the draft card: the real file, or an honest gap. */
function DraftMedia({ x }: { x: APDraft }) {
  const m = x.media!;
  const state = m.state ?? "missing";
  const has = !!m.src && state !== "missing";
  return (
    <div className="mt-2" data-testid="ap-media-preview" data-state={state}>
      {has ? (
        <div className="relative">
          {x.type === "video" ? (
            <VideoPlayer video={m.src} label={m.need} className="aspect-video w-full" rounded="rounded-tile" />
          ) : (
            <ImageSlot src={m.src} label={m.need} className={`aspect-[4/3] w-full ${state === "unapproved" ? "opacity-50" : ""}`} rounded="rounded-tile" />
          )}
        </div>
      ) : (
        <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-tile border border-dashed border-line text-[12px] text-soft">
          <ImageIcon size={20} />
          No photo yet
        </div>
      )}
    </div>
  );
}

function StatusChip({ s }: { s: DraftStatus }) {
  const good = s === "ready" || s === "approved" || s === "saved" || s === "published";
  return (
    <span
      data-testid="ap-status"
      data-status={s}
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${s === "approved" || s === "saved" || s === "published" ? "bg-accent text-white" : good ? "border border-accent text-accent" : "border border-line text-soft"}`}
    >
      {STATUS_LABEL[s]}
    </span>
  );
}



/* ------------------------------------------------------------------ view root */

/** Shown in the panel instead of the conversation while a review screen is open. */
export function AutopilotView() {
  const v = useAPView();
  const batch = useData((d) => d.autopilot.batch);
  const canPost = useData((d) => roleCan(d.account.session.role, "content.write"));
  if (!v) return null;
  const close = () => setAPView(null);
  return (
    <div data-testid="ap-view" data-screen={v.screen} className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-[12px] text-soft">
        <span className="font-bold uppercase tracking-caps">Content Autopilot</span>
        <button onClick={close} data-testid="ap-close" className="flex items-center gap-1 hover:text-white">
          Back to chat <X size={13} />
        </button>
      </div>
      {!canPost && (
        <p className="rounded-inner border border-line px-3 py-2 text-[12px] text-soft" data-testid="ap-no-access">
          Your access doesn't include posting, so you can look but not approve or save.
        </p>
      )}
      {v.screen === "plan" ? <PlanWeek step={v.step} /> : !batch ? <NoBatch /> : <Screen v={v} />}
    </div>
  );
}

function NoBatch() {
  const paused = useData((d) => d.autopilot.paused);
  return (
    <Card testid="ap-empty">
      <p>{paused ? "Content preparation is paused, so there's nothing new to review." : "No content is prepared yet."}</p>
      <div className="mt-3 flex gap-2">
        {paused ? (
          <button className={btnOutline} onClick={() => run("resume", (d) => (setPaused(d, false), prepareBatch(d)))}>
            Resume preparation
          </button>
        ) : (
          <>
            <button className={btnPrimary} data-testid="ap-empty-plan" onClick={() => setAPView({ screen: "plan", step: "intro" })}>
              Plan my week
            </button>
            <button className={btnText} onClick={() => run("prepare", prepareBatch)}>
              Use my usual topics
            </button>
          </>
        )}
      </div>
    </Card>
  );
}

function Screen({ v }: { v: APView }) {
  switch (v.screen) {
    case "summary":
      return <Summary />;
    case "held":
      return <Held />;
    case "detail":
      return <Detail id={v.draftId} />;
    case "reject":
      return <Reject id={v.draftId} />;
    case "confirm":
      return <Confirm exclude={v.exclude ?? []} />;
    case "complete":
      return <Complete approved={v.approved} />;
    case "prefs":
      return <Prefs />;
    case "plan":
      return <PlanWeek step={v.step} />;
  }
}

/* ------------------------------------------------------------------ A · summary */

function Summary() {
  const batch = useData((d) => d.autopilot.batch)!;
  const ready = useData(readyDrafts);
  const held = useData(heldDrafts);
  const approved = useData(approvedDrafts);
  const paused = useData((d) => d.autopilot.paused);
  const prefs = useData((d) => d.autopilot.preferences.filter((p) => p.active).length);
  const done = batch.drafts.filter((x) => x.status === "saved" || x.status === "published").length;
  const top = held[0];
  return (
    <>
      <Card testid="ap-summary">
        <h3 className="text-[15px] font-bold">{batch.planWeekOf ? `Your posts for ${weekLabel(batch.planWeekOf)} are drafted.` : "Your weekly content is prepared."}</h3>
        <p className="mt-1 text-[13px] text-soft">
          {batch.planWeekOf
            ? "Drafted from the plan you approved and checked for repetition and facts. Here's what needs your review."
            : "I've prepared your posts and checked them for repetition, relevance, and consistency. Here's what needs your review."}
        </p>
        <div className="mt-3 flex gap-2 text-[12px]" data-testid="ap-counts">
          <span className="rounded-full bg-bg px-2.5 py-1">
            <b data-testid="ap-count-ready">{ready.length}</b> ready
          </span>
          <span className="rounded-full bg-bg px-2.5 py-1">
            <b data-testid="ap-count-held">{held.length}</b> on hold
          </span>
          <span className="rounded-full bg-bg px-2.5 py-1">
            <b data-testid="ap-count-approved">{approved.length + done}</b> approved
          </span>
        </div>
        <ul className="mt-3 flex flex-col gap-1.5">
          {batch.drafts.map((x) => (
            <li key={x.id}>
              <button onClick={() => setAPView({ screen: "detail", draftId: x.id })} data-testid={`ap-row-${x.idea}`} className="flex w-full items-center gap-2 rounded-tile bg-bg px-3 py-2 text-left hover:ring-1 hover:ring-accent/60">
                <span className="text-soft">
                  <TypeIcon t={x.type} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold">{x.title}</span>
                  <span className="block text-[11px] text-soft">
                    {TYPE_LABEL[x.type]} · {fmtSlot(x.slot.at)}
                  </span>
                </span>
                <StatusChip s={x.status} />
              </button>
            </li>
          ))}
        </ul>
        {batch.skipped.length > 0 && <p className="mt-2 text-[11px] text-muted">Skipped {batch.skipped.length === 1 ? "1 idea" : `${batch.skipped.length} ideas`} that repeated recent posts.</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {ready.length > 0 ? (
            <button className={btnPrimary} data-testid="ap-review-ready" onClick={() => setAPView({ screen: "detail", draftId: ready[0].id })}>
              {ready.length === 1 ? "Review ready post" : "Review ready posts"}
            </button>
          ) : approved.length > 0 ? (
            <button className={btnPrimary} data-testid="ap-to-complete" onClick={() => setAPView({ screen: "complete", approved: approved.map((x) => x.id) })}>
              Save approved drafts
            </button>
          ) : (
            top && (
              <p className="text-[13px]" data-testid="ap-blocker">
                Nothing is ready yet: <b>{top.title}</b> {top.holdReason ? `(${top.holdReason.toLowerCase()})` : ""}.
              </p>
            )
          )}
          {held.length > 0 && (
            <button className={btnText} data-testid="ap-view-held" onClick={() => setAPView({ screen: "held" })}>
              View held posts
            </button>
          )}
        </div>
      </Card>
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[12px] text-soft">
        <button className="hover:text-white" data-testid="ap-plan-link" onClick={() => setAPView({ screen: "plan", step: "intro" })}>
          Plan next week
        </button>
        <button className="hover:text-white" data-testid="ap-prefs" onClick={() => setAPView({ screen: "prefs" })}>
          Preferences{prefs ? ` (${prefs})` : ""}
        </button>
        <button className="hover:text-white" data-testid="ap-pause" onClick={() => run(paused ? "resume" : "pause", (d) => setPaused(d, !paused))}>
          {paused ? "Resume preparation" : "Pause preparation"}
        </button>
        <button className="hover:text-white" data-testid="ap-dismiss" onClick={() => (run("dismiss", dismissBatch), setAPView(null))}>
          Not now
        </button>
      </div>
    </>
  );
}

function Held() {
  const held = useData(heldDrafts);
  return (
    <Card testid="ap-held">
      <Header title="Held posts" onBack={() => setAPView({ screen: "summary" })} />
      {!held.length && <p className="text-[13px] text-soft">Nothing is on hold.</p>}
      <ul className="flex flex-col gap-2">
        {held.map((x) => (
          <li key={x.id}>
            <button onClick={() => setAPView({ screen: "detail", draftId: x.id })} className="w-full rounded-tile bg-bg px-3 py-2 text-left">
              <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{x.title}</span>
                <StatusChip s={x.status} />
              </span>
              {x.holdReason && <span className="mt-1 block text-[12px] text-soft">{x.holdReason}</span>}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted">Held posts never block the others, and nothing here is published.</p>
    </Card>
  );
}

/* ------------------------------------------------------------------ B · draft detail */

function Detail({ id }: { id: string }) {
  const x = useData((d) => draftById(d, id));
  const ready = useData(readyDrafts);
  const timingRule = useData((d) => d.autopilot.timingRule);
  const sources = useData((d) => d.autopilot.sources);
  const { navigate } = useRouter();
  if (!x) return <Card>That draft isn't in this batch any more.</Card>;
  const idx = ready.findIndex((r) => r.id === x.id);
  const next = () => {
    const rest = readyDrafts(getData());
    if (rest.length) setAPView({ screen: "detail", draftId: rest[0].id });
    else setAPView(approvedDrafts(getData()).length ? { screen: "confirm" } : { screen: "summary" });
  };
  const changeTime = () => {
    const w = timingWindows(getData());
    const i = w.findIndex((s) => s.at === x.slot.at);
    run("time", (d) => setSlot(d, x.id, w[(i + 1) % w.length]));
  };
  return (
    <Card testid="ap-detail">
      <Header title={x.title} onBack={() => setAPView({ screen: "summary" })} />
      <div className="flex items-center gap-2 text-[12px] text-soft">
        <TypeIcon t={x.type} /> {TYPE_LABEL[x.type]} post
        {idx >= 0 && <span className="ml-auto">{idx + 1} of {ready.length} ready</span>}
        <StatusChip s={x.status} />
      </div>
      <div className="mt-3 whitespace-pre-line rounded-tile bg-bg p-3 text-[13px]" data-testid="ap-draft-text">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-caps text-soft">{x.editedByCreator ? "Your edit" : "Draft"}</span>
        {x.text}
        {x.media && <DraftMedia x={x} />}
        {x.pollOptions && (
          <ul className="mt-2 flex flex-col gap-1">
            {x.pollOptions.map((o) => (
              <li key={o} className="rounded-full border border-line px-3 py-1 text-[12px]">
                {o}
              </li>
            ))}
          </ul>
        )}
      </div>
      <dl className="mt-3 flex flex-col gap-1.5 text-[12px]">
        {x.media && (
          <div className="flex gap-2">
            <dt className="w-[70px] shrink-0 text-soft">Media</dt>
            <dd data-testid="ap-media">
              {MEDIA_NOTE[x.media.state ?? "missing"]}
              <span className="block text-soft">"{x.media.need}"</span>
            </dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="w-[70px] shrink-0 text-soft">Source</dt>
          <dd>{x.sourceIds.length ? x.sourceIds.map((s) => sources.find((y) => y.id === s)?.label).join(", ") : "No specific source"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-[70px] shrink-0 text-soft">Suggested</dt>
          <dd className="min-w-0">
            <span className="font-bold" data-testid="ap-slot">{fmtSlot(x.slot.at)}</span>
            <span className="block text-soft" data-testid="ap-slot-basis">
              {x.slot.basis === "activity" ? "Suggested based on recent fan activity." : "Suggested time to test."} {x.slot.reason}
            </span>
            {!timingRule && ["ready", "approved"].includes(x.status) && (
              <button onClick={changeTime} data-testid="ap-change-time" className="mt-0.5 flex items-center gap-1 text-accent">
                <Clock size={12} /> Try another time
              </button>
            )}
            <span className="block text-[11px] text-muted">A proposed time only: regular posts can't be scheduled, so nothing posts automatically.</span>
          </dd>
        </div>
        {x.holdReason && HELD.includes(x.status) && (
          <div className="flex gap-2">
            <dt className="w-[70px] shrink-0 text-soft">On hold</dt>
            <dd data-testid="ap-hold-reason">{x.holdReason}</dd>
          </div>
        )}
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {x.status === "ready" && (
          <button className={btnPrimary} data-testid="ap-approve" onClick={() => (run("approve", (d) => approveDraft(d, x.id)), next())}>
            <span className="flex items-center gap-1.5">
              <Check size={14} /> Approve
            </span>
          </button>
        )}
        {(x.status === "ready" || x.status === "approved") && (
          <button className={btnOutline} data-testid="ap-not-right" onClick={() => setAPView({ screen: "reject", draftId: x.id })}>
            Not right
          </button>
        )}
        {x.status === "missing-asset" && (
          <button className={btnOutline} data-testid="ap-add-asset" onClick={() => run("asset", (d) => approveAsset(d, x.media?.assetId ?? "as-northpeak"))}>
            {x.media?.state === "unapproved" ? "Approve this photo (demo)" : "I've added the photo (demo)"}
          </button>
        )}
        {x.status === "on-hold" && x.rejections.length >= 2 && (
          <>
            <button className={btnOutline} data-testid="ap-replace" onClick={() => run("replace", (d) => void replaceIdea(d, x.id))}>
              Replace idea
            </button>
            <button className={btnText} data-testid="ap-skip" onClick={() => (run("skip", (d) => skipDraft(d, x.id)), next())}>
              Skip it
            </button>
          </>
        )}
        {x.status === "on-hold" && x.rejections.length < 2 && (
          <button className={btnOutline} data-testid="ap-unpark" onClick={() => run("unpark", (d) => unparkDraft(d, x.id))}>
            Bring it back
          </button>
        )}
        {!["published"].includes(x.status) && (
          <button className={btnText} data-testid="ap-edit" onClick={() => navigate(`/dashboard/newpost?autopilot=${x.id}`)}>
            <span className="flex items-center gap-1">
              <Pencil size={12} /> Edit in New Post
            </span>
          </button>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ C/D · rejection and recovery */

function Reject({ id }: { id: string }) {
  const x = useData((d) => draftById(d, id));
  const a = useAssistant();
  const [note, setNote] = useState("");
  const [future, setFuture] = useState(false);
  const [busy, setBusy] = useState(false);
  const [offer, setOffer] = useState<{ text: string; rule: { avoidTag?: string; tone?: "casual" } } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  if (!x) return <Card>That draft isn't in this batch any more.</Card>;

  const pick = async (reason: RejectReason) => {
    if (busy) return;
    setBusy(true);
    const message = await resolveRejection(x, reason, note);
    setBusy(false);
    a.logDecision(`Not right (${reason}): ${x.title}`);
    const pref = future ? preferenceFor(x, reason) : null;
    if (pref) {
      setOffer(pref);
      setResult(message);
      return;
    }
    afterReject(x.id, message);
  };

  if (offer)
    return (
      <Card testid="ap-pref-offer">
        <p className="text-[13px]">{result}</p>
        <p className="mt-3 text-[13px]">
          Save this for future content? <b>"{offer.text}"</b>
        </p>
        <p className="mt-1 text-[12px] text-soft">You can review or remove it any time in Preferences.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={btnPrimary} data-testid="ap-pref-save" onClick={() => (run("preference", (d) => confirmPreference(d, offer.text, offer.rule)), afterReject(x.id, `Saved: "${offer.text}".`))}>
            Save preference
          </button>
          <button className={btnText} data-testid="ap-pref-skip" onClick={() => afterReject(x.id, result ?? "")}>
            Just this post
          </button>
        </div>
      </Card>
    );

  return (
    <Card testid="ap-reject">
      <Header title="What's not right?" onBack={() => setAPView({ screen: "detail", draftId: x.id })} />
      <div className="flex flex-wrap gap-2">
        {REJECT_REASONS.map((r) => (
          <button key={r.id} disabled={busy} data-testid={`ap-reason-${r.id}`} onClick={() => pick(r.id)} className="rounded-full border border-line px-3 py-1.5 text-[12px] hover:border-accent disabled:opacity-50">
            {r.label}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything to add? (optional; you can also say it below)"
        data-testid="ap-reject-note"
        maxLength={500}
        className="mt-3 h-[64px] w-full resize-none rounded-tile bg-bg px-3 py-2 text-[13px] outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
      />
      <fieldset className="mt-2 flex flex-col gap-1 text-[12px]">
        <label className="flex items-center gap-2">
          <input type="radio" name="ap-scope" checked={!future} onChange={() => setFuture(false)} /> Apply to this post only
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="ap-scope" data-testid="ap-scope-future" checked={future} onChange={() => setFuture(true)} /> Suggest a preference for future content
        </label>
      </fieldset>
      {busy && <p className="mt-2 text-[12px] text-soft">Working on a better version…</p>}
    </Card>
  );
}

/** After a rejection: say what happened in one line and show the right next screen. */
function afterReject(id: string, message: string) {
  const x = draftById(getData(), id);
  pushNote(message);
  if (x && (x.status === "ready" || (x.status === "on-hold" && x.rejections.length >= 2) || x.status === "factual-issue")) setAPView({ screen: "detail", draftId: id });
  else {
    const rest = readyDrafts(getData());
    setAPView(rest.length ? { screen: "detail", draftId: rest[0].id } : { screen: "summary" });
  }
}

/* A one-line note channel to the conversation (registered by the director). */
let noteSink: ((t: string) => void) | null = null;
const pushNote = (t: string) => t && noteSink?.(t);

/** Model revision when connected (validated by runChecks), otherwise the deterministic library. */
let modelAvailable = false;
async function resolveRejection(x: APDraft, reason: RejectReason, note: string): Promise<string> {
  const canRevise = ["not-me", "generic", "similar", "other"].includes(reason) && x.rejections.length === 0;
  if (modelAvailable && canRevise) {
    const text = await reviseWithModel(x, reason, note).catch(() => null);
    if (text) {
      const st: { v: DraftStatus } = { v: "failed" };
      run("reject", (d) => {
        rejectDraft(d, x.id, reason, note, false);
        st.v = applyRevision(d, x.id, { text, sourceIds: x.sourceIds, claims: [] }, "model");
      });
      return st.v === "ready" ? "Here's a revised version. I checked it against your sources." : (draftById(getData(), x.id)?.holdReason ?? "Held.");
    }
  }
  let out = { message: "" };
  run("reject", (d) => {
    out = rejectDraft(d, x.id, reason, note);
  });
  return out.message;
}

async function reviseWithModel(x: APDraft, reason: RejectReason, note: string): Promise<string | null> {
  const d = getData();
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20_000);
  let text = "";
  try {
    await streamChat(
      {
        history: [],
        mode: "autopilot",
        message: `Revise this ${x.type} post. Reason it was rejected: ${REJECT_REASONS.find((r) => r.id === reason)!.label}.${note ? ` Creator's note: ${note}` : ""}`,
        context: {
          draft: x.text,
          approvedFacts: d.autopilot.sources.flatMap((s) => s.facts),
          voiceExamples: d.autopilot.strategy.voiceExamples,
          preferences: d.autopilot.preferences.filter((p) => p.active).map((p) => p.text),
          recentPosts: d.social.posts.slice(0, 5).map((p) => p.text),
        },
      },
      { text: (s) => (text += s), action: () => {} },
      ctl.signal,
    );
  } finally {
    clearTimeout(t);
  }
  text = text.trim().replace(/^"|"$/g, "");
  return text && text !== "CANNOT_REVISE" && text.length <= 600 ? text : null;
}

/* ------------------------------------------------------------------ E · batch confirmation */

function Confirm({ exclude }: { exclude: string[] }) {
  const approved = useData(approvedDrafts);
  const ready = useData(readyDrafts);
  const held = useData(heldDrafts);
  const timingRule = useData((d) => d.autopilot.timingRule);
  const include = ready.filter((x) => !exclude.includes(x.id));
  const toggle = (id: string) => setAPView({ screen: "confirm", exclude: exclude.includes(id) ? exclude.filter((e) => e !== id) : [...exclude, id] });
  const total = include.length + approved.length;
  return (
    <Card testid="ap-confirm">
      <Header title="Approve your posts" onBack={() => setAPView({ screen: "summary" })} />
      {total === 0 && <p className="text-[13px] text-soft">Nothing is selected.</p>}
      <ul className="flex flex-col gap-1.5">
        {approved.map((x) => (
          <li key={x.id} className="flex items-center gap-2 rounded-tile bg-bg px-3 py-2 text-[13px]">
            <Check size={14} className="text-accent" /> <span className="flex-1 truncate">{x.title}</span> <span className="text-[11px] text-soft">{fmtSlot(x.slot.at)}</span>
          </li>
        ))}
        {ready.map((x) => (
          <li key={x.id}>
            <label className="flex items-center gap-2 rounded-tile bg-bg px-3 py-2 text-[13px]">
              <input type="checkbox" checked={!exclude.includes(x.id)} onChange={() => toggle(x.id)} data-testid={`ap-include-${x.idea}`} />
              <span className="flex-1 truncate">{x.title}</span> <span className="text-[11px] text-soft">{fmtSlot(x.slot.at)}</span>
            </label>
          </li>
        ))}
      </ul>
      {held.length > 0 && (
        <p className="mt-2 text-[12px] text-soft" data-testid="ap-confirm-held">
          Not included: {held.map((x) => `${x.title} (${STATUS_LABEL[x.status].toLowerCase()})`).join(", ")}.
        </p>
      )}
      <label className="mt-3 flex items-center gap-2 text-[12px]">
        <input type="checkbox" data-testid="ap-timing-rule" checked={timingRule} onChange={(e) => run("timing", (d) => setTimingRule(d, e.target.checked))} />
        Use suggested times for future posts too (don't ask each time)
      </label>
      <p className="mt-2 text-[12px] text-muted">Approving doesn't publish anything. Next you can save them as TopFan drafts; you publish from New Post.</p>
      <div className="mt-3">
        <button
          className={btnPrimary}
          data-testid="ap-approve-batch"
          disabled={!include.length && !approved.length}
          onClick={() => {
            const ids = include.map((x) => x.id);
            const res = run("approveBatch", (d) => approveBatch(d, ids));
            if (!res.ok) return pushNote(res.reason);
            setAPView({ screen: "complete", approved: [...approved.map((x) => x.id), ...ids] });
          }}
        >
          {include.length ? `Approve ${include.length} ${include.length === 1 ? "draft" : "drafts"}` : "Continue"}
        </button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ F · completion */

function Complete({ approved }: { approved: string[] }) {
  const drafts = useData((d) => d.autopilot.batch?.drafts ?? []);
  const held = useData(heldDrafts);
  const { navigate, path, query } = useRouter();
  const mine = drafts.filter((x) => approved.includes(x.id));
  // Which saved draft is open in New Post (from the URL, so it stays right after navigating).
  const openId = path.startsWith("/dashboard/newpost") ? query.get("autopilot") : null;
  const [opened, setOpened] = useState<string[]>([]);
  const open = (id: string) => {
    setOpened((o) => (o.includes(id) ? o : [...o, id]));
    navigate(`/dashboard/newpost?autopilot=${id}`);
  };
  const current = mine.find((x) => x.id === openId);
  const toSave = mine.filter((x) => x.status === "approved" || x.status === "failed");
  const saved = mine.filter((x) => x.status === "saved");
  const published = mine.filter((x) => x.status === "published");
  const nextUp = saved.find((x) => x.id !== openId && !opened.includes(x.id));
  const save = () => {
    const ids = toSave.map((x) => x.id);
    if (failSaves()) {
      // Demo failure (developer flag tf-fail-save): mark as failed; retry reads the real status first.
      run("saveFailed", (d) => ids.forEach((id) => { const x = draftById(d, id); if (x) (x.status = "failed"), (x.holdReason = "Saving didn't finish. Retry checks first, so nothing is saved twice."); }));
      return;
    }
    const res = run("save", (d) => {
      ids.forEach((id) => {
        const x = draftById(d, id);
        if (x?.status === "failed") {
          // Check what actually happened before retrying (never save twice).
          x.status = readPublicationStatus(d, x) === "none" ? "approved" : x.status;
        }
      });
      saveApproved(d, ids);
    });
    if (!res.ok) pushNote(res.reason);
  };
  const heading = published.length && !toSave.length && !saved.length ? "Your posts are published." : saved.length && !toSave.length ? "Your approved drafts have been saved." : `Approved: ${mine.length} ${mine.length === 1 ? "draft" : "drafts"}.`;
  return (
    <Card testid="ap-complete">
      <h3 className="text-[15px] font-bold" data-testid="ap-complete-heading">
        {heading}
      </h3>
      <ul className="mt-3 flex flex-col gap-1.5">
        {mine.map((x) => (
          <li key={x.id} className="flex items-center gap-2 rounded-tile bg-bg px-3 py-2 text-[13px]">
            <span className="min-w-0 flex-1 truncate">{x.title}</span>
            <StatusChip s={x.status} />
            {x.status === "saved" &&
              (x.id === openId ? (
                <span className="text-[12px] font-bold text-white" data-testid={`ap-opened-${x.idea}`}>Open now</span>
              ) : (
                <button className="text-[12px] font-bold text-accent" data-testid={`ap-open-${x.idea}`} onClick={() => open(x.id)}>
                  {opened.includes(x.id) ? "Reopen" : "Open"}
                </button>
              ))}
          </li>
        ))}
      </ul>
      {held.length > 0 && <p className="mt-2 text-[12px] text-soft">Still on hold: {held.map((x) => x.title).join(", ")}.</p>}
      {toSave.length > 0 ? (
        <>
          <p className="mt-3 text-[12px] text-muted">Nothing is published. Regular posts can't be scheduled, so your suggested times stay in this plan.</p>
          <button className={`${btnPrimary} mt-3`} data-testid="ap-save" onClick={save}>
            {toSave.some((x) => x.status === "failed") ? "Retry saving" : `Save ${toSave.length} approved ${toSave.length === 1 ? "draft" : "drafts"}`}
          </button>
        </>
      ) : (
        saved.length > 0 && (
          <>
            <p className="mt-3 text-[12px] text-soft" data-testid="ap-complete-next">
              {current
                ? `"${current.title}" is open in New Post. Check it and add any changes; click Publish Now on the page when you're happy. I won't publish anything for you.`
                : "Next: open a draft in New Post when you want to publish it. I won't publish anything for you."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {nextUp && (
                <button className={btnPrimary} data-testid="ap-open-next" onClick={() => open(nextUp.id)}>
                  {current ? "Open next draft" : `Open "${nextUp.title}"`}
                </button>
              )}
              <button className={nextUp ? btnText : btnPrimary} data-testid="ap-done" onClick={() => setAPView(null)}>
                Back to chat
              </button>
            </div>
          </>
        )
      )}
    </Card>
  );
}

const failSaves = () => {
  try {
    return localStorage.getItem("tf-fail-save") === "1";
  } catch {
    return false;
  }
};

/* ------------------------------------------------------------------ preferences */

function Prefs() {
  const ap = useData((d) => d.autopilot);
  return (
    <Card testid="ap-prefs-view">
      <Header title="Content preferences" onBack={() => setAPView({ screen: "summary" })} />
      {ap.preferences.length === 0 && <p className="text-[13px] text-soft">No saved preferences. I only save one when you confirm it.</p>}
      <ul className="flex flex-col gap-1.5">
        {ap.preferences.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-tile bg-bg px-3 py-2 text-[13px]" data-testid="ap-pref">
            <span className="flex-1">{p.text}</span>
            <button className="text-[12px] text-soft hover:text-white" data-testid="ap-pref-remove" onClick={() => run("prefRemove", (d) => removePreference(d, p.id))}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 text-[12px]">
        <span className="text-soft">Posts per week: </span>
        {[2, 3, 4, 5].map((n) => (
          <button key={n} data-testid={`ap-freq-${n}`} onClick={() => run("frequency", (d) => setFrequency(d, n))} className={`ml-1 rounded-full px-2.5 py-0.5 ${ap.strategy.frequency === n ? "bg-accent" : "border border-line"}`}>
            {n}
          </button>
        ))}
      </div>
      <label className="mt-2 flex items-center gap-2 text-[12px]">
        <input type="checkbox" checked={ap.timingRule} onChange={(e) => run("timing", (d) => setTimingRule(d, e.target.checked))} /> Use suggested times automatically
      </label>
      <button className={`${btnOutline} mt-3`} data-testid="ap-next-batch" disabled={ap.paused} onClick={() => (run("prepare", prepareBatch), setAPView({ screen: "summary" }))}>
        Prepare next week (demo)
      </button>
    </Card>
  );
}

/* ------------------------------------------------------------------ notice (one per batch, persistent) */

/** A compact card above the conversation while a batch has posts waiting. "Not now" dismisses the batch. */
export function AutopilotNotice() {
  const batch = useData((d) => d.autopilot.batch);
  const ready = useData((d) => readyDrafts(d).length);
  const held = useData((d) => heldDrafts(d).length);
  if (!batch || batch.dismissed || ready + held === 0) return null;
  return (
    <div data-testid="ap-notice" className="flex items-center gap-3 rounded-[20px] bg-surface px-4 py-3 text-[13px]">
      <span className="min-w-0 flex-1">
        <b className="block">Your weekly content is prepared.</b>
        <span className="text-soft">
          {ready ? `${ready} ${ready === 1 ? "post is" : "posts are"} ready for review` : "Nothing is ready yet"}
          {held ? ` · ${held} on hold` : ""}
        </span>
      </span>
      <button className={btnOutline} data-testid="ap-notice-review" onClick={() => openAutopilot({ screen: "summary" })}>
        Review
      </button>
      <button aria-label="Not now" data-testid="ap-notice-dismiss" className="text-soft hover:text-white" onClick={() => run("dismiss", dismissBatch)}>
        <X size={16} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ director: prepare, notify once, sync */

export function AutopilotDirector({ active, connected }: { active: boolean; connected: boolean | null }) {
  const a = useAssistant();
  const live = useRef(a);
  live.current = a;
  modelAvailable = connected === true;

  useEffect(() => {
    noteSink = (t) => live.current.say({ text: t, plain: t });
    const off = onAPOpen(() => live.current.setOpen(true));
    return () => {
      noteSink = null;
      off();
    };
  }, []);

  // Prepare a batch the first time the creator is in the platform (skipped when paused or not allowed).
  useEffect(() => {
    if (!active) return;
    const d = getData();
    if (!d.autopilot.batch && d.autopilot.enabled && !d.autopilot.paused && roleCan(d.account.session.role, "content.write")) act("autopilot.prepare", prepareBatch, { need: "content.write" });
    // The notice itself is <AutopilotNotice/> (derived from stored state, so it survives reloads);
    // mark the batch once so it counts as one notification, never one per draft.
    const b = getData().autopilot.batch;
    if (b && !b.notified && !b.dismissed && readyDrafts(getData()).length > 0) act("autopilot.notified", markNotified);
  }, [active]);

  // Manual changes in New Post (or anywhere) sync back; the creator's version always wins.
  useEffect(
    () =>
      onStoreEvent((e) => {
        if (!e.ok || e.label.startsWith("autopilot.") || e.label.startsWith("dev.")) return;
        const b = getData().autopilot.batch;
        if (!b || !b.drafts.some((x) => x.postId || x.status !== "ready")) {
          if (!b) return;
        }
        let notes: string[] = [];
        act("autopilot.sync", (d) => {
          notes = syncFromPosts(d);
        });
        if (notes.length) {
          notes.forEach((n) => live.current.say({ text: n, plain: n }));
          const v = getAPView();
          if (!v) openAutopilot({ screen: "summary" });
        }
      }),
    [],
  );
  return null;
}

/* ------------------------------------------------------------------ contextual commands */

/**
 * Deterministic handling of Autopilot requests (typed or spoken). Runs before the model so review
 * interactions never wait on an LLM call. Returns true when handled.
 */
export function useAutopilotCommands() {
  const a = useAssistant();
  return useCallback((raw: string): boolean => {
    const t = normalizeText(raw);
    const has = (...p: string[]) => p.some((x) => t.includes(` ${x} `) || t.includes(` ${x}`));
    const d = getData();
    const v = getAPView();
    const current = v && "draftId" in v ? draftById(d, v.draftId) : (readyDrafts(d)[0] ?? null);
    const say = (text: string) => a.say({ text, plain: text });

    // Plan my week: typed or spoken lines on the "What's coming up" step go into the brief.
    const bare = raw.trim().toLowerCase().replace(/[.!]+$/, "");
    const proceed = ["next", "continue", "done", "that's it", "thats it", "nothing else"].includes(bare);
    if (v?.screen === "plan" && v.step === "happening" && d.autopilot.plan?.status === "draft" && raw.trim().length > 3 && !proceed && !has("plan my week", "stop for now")) {
      const line = raw.trim().replace(/\s+/g, " ").replace(/[.!]+$/, "");
      const items = d.autopilot.plan.brief.happening;
      if (!items.includes(line)) act("autopilot.planBrief", (x) => updateBrief(x, { happening: [...items, line].slice(0, 6) }), { need: "content.write" });
      say(`Added: "${line}". Anything else coming up? Or click Continue.`);
      return true;
    }
    if (has("plan my week", "plan next week", "plan my posts", "plan my content", "weekly plan", "plan the week", "plan this week", "plan my weekly posts", "plan posts for the week")) {
      openAutopilot({ screen: "plan", step: "intro" });
      return true;
    }
    if (v?.screen === "plan" && v.step === "happening" && proceed) {
      openAutopilot({ screen: "plan", step: "rhythm" });
      return true;
    }
    if (has("review my posts", "review posts", "what's ready", "what is ready", "content plan", "my drafts", "weekly content", "show my posts plan")) {
      if (d.autopilot.batch?.dismissed) act("autopilot.reopen", reopenBatch);
      openAutopilot({ screen: "summary" });
      return true;
    }
    if (has("pause content", "pause autopilot", "stop preparing", "pause preparation")) {
      act("autopilot.pause", (x) => setPaused(x, true), { need: "content.write" });
      say("Content preparation is paused. Anything already prepared stays unpublished until you review it.");
      return true;
    }
    if (has("resume content", "resume autopilot", "resume preparation", "start preparing")) {
      act("autopilot.resume", (x) => setPaused(x, false), { need: "content.write" });
      say("Content preparation is back on.");
      return true;
    }
    if (has("posting frequency", "post more often", "post less often", "posts per week", "how often i post")) {
      a.say({
        text: `You're set to ${d.autopilot.strategy.frequency} posts a week. How many would you like?`,
        choice: { instant: true, options: [2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} a week` })), onPick: (val) => (act("autopilot.frequency", (x) => setFrequency(x, Number(val)), { need: "content.write" }), say(`Done. I'll prepare ${val} posts a week from the next batch.`)) },
      });
      return true;
    }
    if (!d.autopilot.batch) return false;
    if (has("approve the good ones", "approve the remaining", "approve the rest", "approve all posts", "approve all drafts", "approve all the posts", "approve all the drafts", "approve them")) {
      openAutopilot({ screen: "confirm" });
      say("Here's exactly what would be approved. Nothing's approved until you tap the button.");
      return true;
    }
    if (has("use better times", "better times", "best times")) {
      act("autopilot.times", useBestTimes, { need: "content.write" });
      say("Updated the suggested times from your recent fan activity. They're proposals; nothing posts automatically.");
      return true;
    }
    if (has("stop for now", "close review", "done for now")) {
      setAPView(null);
      say("Okay. Everything stays as it is, and nothing gets published.");
      return true;
    }
    if (has("make my posts more personal", "more personal", "sound more like me")) {
      let n = 0;
      act("autopilot.personal", (x) => {
        for (const dr of readyDrafts(x)) if (dr.alternates?.voice && dr.revisions === 0) (applyRevision(x, dr.id, dr.alternates.voice, "library"), n++);
      }, { need: "content.write" });
      say(n ? `Rewrote ${n} ${n === 1 ? "post" : "posts"} closer to your own recent posts. I didn't add any personal details you haven't shared.` : "I don't have approved examples to make these more personal without inventing things. Edit any of them in New Post.");
      openAutopilot({ screen: "summary" });
      return true;
    }
    if (!current) return false;
    // On the rejection screen, a typed or spoken message is the creator's own explanation.
    if (v?.screen === "reject" && raw.trim().length > 3 && !has("skip", "approve", "stop for now")) {
      void resolveRejection(current, "other", raw.trim()).then((msg) => afterReject(current.id, msg));
      return true;
    }
    if (has("i don't like this", "dont like this", "don't like this", "not right")) {
      openAutopilot({ screen: "reject", draftId: current.id });
      return true;
    }
    if (has("skip this", "skip it")) {
      act("autopilot.skip", (x) => skipDraft(x, current.id), { need: "content.write" });
      say(`Skipped "${current.title}". The rest aren't affected.`);
      const rest = readyDrafts(getData());
      openAutopilot(rest.length ? { screen: "detail", draftId: rest[0].id } : { screen: "summary" });
      return true;
    }
    if (has("make it shorter", "shorter")) {
      act("autopilot.shorter", (x) => shortenDraft(x, current.id), { need: "content.write" });
      openAutopilot({ screen: "detail", draftId: current.id });
      return true;
    }
    if (has("try something different", "something different", "different idea")) {
      let msg = "";
      act("autopilot.reject", (x) => void (msg = rejectDraft(x, current.id, "other").message), { need: "content.write" });
      say(msg);
      openAutopilot({ screen: "detail", draftId: current.id });
      return true;
    }
    if (has("don't use this tone", "dont use this tone", "never post like this", "no more posts like this")) {
      const pref = current.tags.includes("motivational") ? { text: "Avoid generic motivational posts", rule: { avoidTag: "motivational" } } : { text: "Use a more casual tone", rule: { tone: "casual" as const } };
      a.say({
        status: "confirm",
        text: `Save this as a preference for future content? "${pref.text}"`,
        actions: [
          { label: "Save preference", variant: "primary", onClick: () => (act("autopilot.preference", (x) => confirmPreference(x, pref.text, pref.rule), { need: "content.write" }), say(`Saved. You can remove it in Preferences.`)) },
          { label: "Not now", variant: "text", onClick: () => {} },
        ],
      });
      return true;
    }
    return false;
  }, [a]);
}

/** For account health ("what needs my attention?"). */
export const autopilotReadyCount = () => {
  const b = getData().autopilot.batch;
  return b && !b.dismissed ? readyDrafts(getData()).length : 0;
};
export { noteCorrection };
