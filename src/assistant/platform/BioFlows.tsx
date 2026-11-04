/**
 * Smart Link in Bio (Demo 2): the panel side of slices/bio.ts. Each flow prepares a proposal (a "bio"
 * work item) and shows a compact list the creator can include/exclude, rename and reorder; the one
 * primary action opens the ORIGINAL Link In Bio editor with the changes applied to its draft, where
 * SAVE CHANGES (and its publish confirmation) is the creator's own click. Nothing is saved from here.
 */
import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { act, useData, type AppData } from "../../store/store";
import { cancelItem, itemById, setPaused, type WorkItem } from "../../store/slices/content";
import { findExperience, goalTarget, postCandidate, proposeGoal, proposeImprove, proposePromote, proposeSetup, proposeSocials, proposeStyle, renameLink, revalidatePlan, toggleLink, toggleStyle, moveLink, candidates, sameUrl } from "../../store/slices/bio";
import type { useAssistant } from "../../state/assistantStore";

type Say = ReturnType<typeof useAssistant>["say"];
export interface BioCtx {
  say: Say;
  run: (label: string, fn: (d: AppData) => void) => boolean;
  d: () => AppData;
  /** Open a URL in the app (assistant navigation). */
  go: (url: string, target?: string) => void;
}

export const EDITOR = "/edit-preference/link-in-bio/add-link-in-bio";
const CTA: Record<string, string> = { setup: "Add selected links", socials: "Add selected links", promote: "Update my Link in Bio", goal: "Update my Link in Bio", improve: "Apply selected improvements", check: "Apply these changes", style: "Try it in the editor" };

export function bioFlows(c: BioCtx) {
  const { say, run, d } = c;

  /** Open the original editor with this proposal applied (it is saved there, by the creator). */
  const toEditor = (id: string) => {
    const x = itemById(d(), id);
    if (!x?.bio) return;
    if (x.status === "needs-input") return say({ text: "This update is waiting for a public page, so there's nothing to add yet. I'll keep it ready." });
    // An offering may have changed since the proposal: re-check before anything reaches the editor.
    let dropped: string[] = [];
    run("content.bioRecheck", (y) => void (dropped = revalidatePlan(y, id)));
    const after = itemById(d(), id)!;
    const pr = after.bio!.profile;
    if (!after.bio!.links.some((l) => l.include) && !(pr && (pr.include.bio || pr.include.palette)))
      return say({ text: dropped.length ? `"${dropped.join('", "')}" isn't live any more, so I took it out and there's nothing left to add.` : "Nothing is selected. Tick at least one link." });
    if (dropped.length) say({ text: `"${dropped.join('", "')}" changed since I suggested it and isn't live any more, so I left it out.` });
    say({ text: "I've put the selected changes into your Link in Bio editor. Check the preview, then Save Changes when you're happy with it." });
    c.go(`${EDITOR}?work=${id}`, "pref-lib-save");
  };
  const show = (id: string, text: string, plain?: string) => {
    if (itemById(d(), id)?.status === "paused") run("content.resume", (y) => setPaused(y, id, false)); // resuming a saved-for-later update
    const x = itemById(d(), id)!;
    const pending = x.status === "needs-input";
    // Show the Link in Bio page so its preview can follow the selection while the creator reviews.
    if (!pending && x.bio!.step === "review" && !window.location.pathname.startsWith("/edit-preference/link-in-bio")) c.go("/edit-preference/link-in-bio", "pref-lib-preview");
    say({
      text,
      plain: plain ?? `${text} ${x.bio!.links.map((l) => l.title).join(", ")}`,
      body: <BioReview id={id} />,
      actions: pending
        ? []
        : [
            { label: CTA[x.bio!.mode], variant: "primary", onClick: () => toEditor(id) },
            { label: "Save for later", variant: "text", onClick: () => (run("content.pause", (y) => setPaused(y, id, true)), say({ text: "Saved for later. Say \"Continue my Link in Bio\" when you want to pick it up." })) },
            { label: "Not now", variant: "text", onClick: () => (run("content.cancel", (y) => cancelItem(y, id)), say({ text: "Okay. Nothing in your Link in Bio changed." })) },
          ],
    });
  };
  /** Run a proposal; a refusal (nothing to propose) is said plainly. */
  const propose = (label: string, fn: (y: AppData) => string) => {
    let id = "";
    return run(label, (y) => void (id = fn(y))) ? id : null;
  };

  /** Flow A, step 1: say what will happen; the creator chooses to have the links prepared. */
  const setupIntro = (goal = "Help me set up my Link in Bio") =>
    say({
      text: "I can bring your important links together so fans can easily find your content and offerings. I'll check what's already available in your TopFan account.",
      actions: [
        { label: "Prepare my links", variant: "primary", onClick: () => setup(goal) },
        { label: "I'll do it myself", variant: "text", onClick: () => (say({ text: "Sure. Use NEW ACTION in the editor to add links, then Save Changes. I'm here if you want suggestions." }), c.go(EDITOR, "pref-lib-new-action")) },
      ],
    });

  const setup = (goal = "Help me set up my Link in Bio") => {
    let already = 0;
    const id = propose("content.bioSetup", (y) => {
      const r = proposeSetup(y, goal);
      already = r.already;
      return r.id;
    });
    if (!id) return;
    const ls = itemById(d(), id)!.bio!.links;
    const social = ls.some((l) => /^(social|website)/.test(l.key));
    const offer = ls.some((l) => !/^(social|website)/.test(l.key));
    const lead = offer && social ? "I found a few links worth featuring. I've placed your main offerings first, followed by your social profiles." : offer ? "I found a few links worth featuring, with your main offerings first." : "I didn't find a published offering to feature yet, so these are your social profiles and website.";
    show(id, `${lead}${already ? ` (${already} ${already === 1 ? "is" : "are"} already in your Link in Bio.)` : ""}`);
  };

  const socials = (goal = "Add my social profiles") => {
    let icons = false;
    const id = propose("content.bioSocials", (y) => {
      const r = proposeSocials(y, goal);
      icons = r.icons;
      return r.id;
    });
    if (!id) return;
    show(id, icons ? "These profiles from your setup aren't showing as icons under your name. I'll add them back in Social Media Links." : `Your profiles already show as icons under your name. I can also add them as buttons; I've selected "${itemById(d(), id)!.bio!.links[0].title}". Tick any others you want.`);
  };

  /** "Suggest a bio" / "Suggest colours": reuse the creator's own profile bio and brand palette. */
  const style = (goal: string, want: { bio: boolean; palette: boolean }) => {
    const id = propose("content.bioStyle", (y) => proposeStyle(y, goal, want));
    if (!id) return;
    const p = itemById(d(), id)!.bio!.profile!;
    show(id, [p.bio && "Here's a shorter version of your profile bio.", p.palette != null && "Your Link in Bio isn't using your brand colours; I'd switch it to your website's palette."].filter(Boolean).join(" ") + " I won't change anything else.", `${p.bio ?? ""}`);
  };

  /** Feature an experience (or ask which one when it isn't clear). */
  const promote = (goal = "Promote an offering", target?: { workId?: string; productId?: string; key?: string }) => {
    const t = target ?? findExperience(d(), goal);
    if (t === "ambiguous" || !t) return pickOffering(goal);
    const id = propose("content.bioPromote", (y) => proposePromote(y, goal, t));
    if (!id) return;
    const x = itemById(d(), id)!;
    const l = x.bio!.links[0];
    if (x.status === "needs-input")
      return show(id, `${l.source.replace(/^Experience: /, "")} isn't live yet, so it has no booking link. I'll keep this as a pending Link in Bio update; it'll be ready once you save and enable the experience.`);
    const what = /course/i.test(l.source) ? "your course" : /Membership/i.test(l.source) ? "your membership" : /Experience/.test(l.source) ? (/training|park|in person/i.test(l.source + l.title) ? "your training session" : "that experience") : "it";
    show(id, l.op === "move" ? `I found ${what}. It's already in your Link in Bio; I'd move it to the top so fans see it first.` : `I found ${what}. I'd recommend featuring its booking link first so fans can find it easily.`.replace("its booking link", /Experience/.test(l.source) ? "its booking link" : "it"));
  };
  const pickOffering = (goal: string) => {
    const opts = candidates(d()).filter((x) => x.check === "verified" && ["booking", "course", "membership", "store"].includes(x.dest));
    if (!opts.length) return say({ text: "I couldn't find a published offering with a public page to promote yet." });
    say({
      text: "Which offering should I promote?",
      choice: { instant: true, options: opts.slice(0, 5).map((o, i) => ({ value: o.key, label: o.source.replace(/^(Experience|Course|Memberships): /, ""), recommended: i === 0 })), onPick: (key) => promote(goal, { key, productId: opts.find((o) => o.key === key)?.refId }) },
    });
  };

  const improve = (goal = "Make my links better") => {
    const id = propose("content.bioImprove", (y) => proposeImprove(y, goal));
    if (id) show(id, "I found a few improvements that could make your links clearer and easier to navigate.");
  };
  const check = (goal = "Check if my links are still relevant") => {
    const id = propose("content.bioCheck", (y) => proposeImprove(y, goal, "check"));
    if (!id) return;
    const x = itemById(d(), id)!;
    const lines = x.bio!.links.map((l) => (l.op === "replace" ? `"${l.from}": ${l.note}.` : `"${l.title}": ${l.note}.`));
    const ended = x.bio!.links.find((l) => l.op === "replace" && /has ended/.test(l.note ?? ""));
    show(id, ended ? `Your previous event has ended. Would you like to replace its link with your upcoming ${/Event/.test(ended.source) ? "event" : "session"}? Untick anything you'd rather keep.` : `I checked your links against your TopFan data (external sites aren't visited in this demo). ${lines.join(" ")}`);
  };
  const goalFor = (text: string) => {
    const g = goalTarget(d(), text);
    if (!g) return false;
    if ("none" in g) {
      say({ text: `${g.none} Want me to feature something you already offer instead?`, actions: [{ label: "Promote an offering", variant: "outline", onClick: () => pickOffering(text) }] });
      return true;
    }
    const id = propose("content.bioGoal", (y) => proposeGoal(y, text, g.key));
    if (id) show(id, `${g.why}. I'd put this link first (a goal-based suggestion; there's no Link in Bio click data to compare yet).`);
    return true;
  };

  /** "Add this to my Link in Bio": the item the conversation is about, or ask. */
  const addThis = (text: string) => {
    const f = itemById(d(), d().content.focusId);
    const exp = f?.kind === "experience" ? f : f?.link?.rel === "announces" ? itemById(d(), f.link.id) : null;
    if (exp) return promote(text, { workId: exp.id, productId: exp.ref?.productId });
    if (f?.kind === "post" && f.ref?.postId) {
      if (f.post?.locked) return say({ text: "That post is locked, so linking it would only show fans the unlock screen. I can link its public teaser instead, if you post one." });
      const pc = postCandidate(d(), f.ref.postId);
      if (pc) return goalFor("highlight my latest post");
    }
    if (f?.kind === "newsletter") return goalFor("grow my newsletter readership");
    const recent = [...d().content.items].reverse().filter((x) => x.kind === "experience" && x.status !== "cancelled");
    if (recent.length === 1) return promote(text, { workId: recent[0].id, productId: recent[0].ref?.productId });
    pickOffering(text);
  };

  /** After the creator finished something on its own screen (Flow 4). */
  const offer = (kind: "experience" | "course" | "membership" | "newsletter" | "post", ref?: string) => {
    const already = (url: string | null | undefined) => d().prefsB.linkInBio.actions.some((a) => sameUrl(a.url, url));
    const cand = (key: string) => candidates(d()).find((x) => x.key === key);
    if (kind === "experience" && ref && !already(cand(`exp-${ref}`)?.url))
      say({ text: "Would you like me to add your experience to Link in Bio so fans can book it easily?", dismissible: true, actions: [{ label: "Add to Link in Bio", variant: "primary", onClick: () => promote("Add my new experience to Link in Bio", { productId: ref }) }] });
    if (kind === "course" && ref && !already(cand(`course-${ref}`)?.url))
      say({ text: "Your course is now available. Would you like to feature it in Link in Bio?", dismissible: true, actions: [{ label: "Feature my course", variant: "primary", onClick: () => promote("Feature my course", { key: `course-${ref}`, productId: ref }) }] });
    if (kind === "membership" && !already(cand("membership")?.url))
      say({ text: "Would you like to highlight your membership so fans can subscribe?", dismissible: true, actions: [{ label: "Highlight my membership", variant: "primary", onClick: () => goalFor("I want more subscribers") }] });
    if (kind === "newsletter" && !already(cand("newsletters")?.url))
      say({ text: "TopFan has no separate newsletter signup form, but your public Newsletters page lists them. Would you like me to add a link to it?", dismissible: true, actions: [{ label: "Add my Newsletters page", variant: "outline", onClick: () => goalFor("grow my newsletter readership") }] });
    if (kind === "post" && ref && postCandidate(d(), ref) && !already(postCandidate(d(), ref)!.url))
      say({ text: "Your post is live. Want to feature it in Link in Bio while it's fresh?", dismissible: true, actions: [{ label: "Feature this post", variant: "outline", onClick: () => (run("content.bioGoal", (y) => void proposeGoal(y, "Feature my new post", `post-${ref}`)), show(d().content.focusId!, "I'd put your new post first while it's fresh.")) }] });
  };

  /** After SAVE CHANGES: report what actually landed (read back from the saved page). */
  const saved = (x: WorkItem) => {
    const r = x.bio?.result;
    if (!r) return;
    const first = d().prefsB.linkInBio.actions[0];
    say({
      status: r.missing.length ? undefined : "done",
      text: r.missing.length
        ? `Saved. ${r.applied} of ${r.applied + r.missing.length} changes are live; you changed or removed "${r.missing.join('", "')}" in the editor, so I left it as you saved it.`
        : `Saved and published. ${r.applied} change${r.applied === 1 ? "" : "s"} ${r.applied === 1 ? "is" : "are"} live, and your Link in Bio now starts with "${first?.title}".`,
    });
  };

  /** Deterministic routing for Link in Bio requests (returns true when handled). */
  const route = (t: string): boolean => {
    const lib = /\blink ?in ?bio\b|\bbio links?\b|\bmy links\b|\b(any|the|old|event|my) links\b|\blink names\b/.test(t);
    if (/\b(plan|planning)\b.*\bweek\b|\bweek\b.*\bplan\b/.test(t)) return false; // a week plan with a Link in Bio update is handled by the week flow
    if (/\bupdate my links\b.*\bweek\b/.test(t)) {
      const wk = [...d().content.items].reverse().find((x) => x.kind === "bio" && x.parentId && x.status !== "cancelled" && x.bio?.step !== "saved");
      return wk ? show(wk.id, "Here's the Link in Bio update from your week plan.") : improve(t), true;
    }
    if (/\bweek\b/.test(t)) return false;
    if (/\badd (this|it|that) to (my )?link ?in ?bio\b/.test(t)) return addThis(t), true;
    if (/\b(social (profiles?|links|media|accounts?)|my socials)\b/.test(t) && /\b(add|link|show|put)\b/.test(t)) return socials(t), true;
    if (/\b(suggest|write|shorten|improve|update) (a |my )?(short |shorter |new )?(profile )?bio(graphy)?\b/.test(t)) return style(t, { bio: true, palette: /colou?r|palette|theme/.test(t) }), true;
    if (/\b(colou?rs?|palette|theme)\b/.test(t) && /\blink ?in ?bio\b/.test(t) && /\b(suggest|match|pick|choose|change|brand)\b/.test(t)) return style(t, { bio: false, palette: true }), true;
    if (/\b(still relevant|outdated|out of date|broken|up to date|still work|old event|expired|duplicates?)\b/.test(t) && (lib || /\b(remove|check|any)\b/.test(t))) return check(t), true;
    if (/^check (my )?(link ?in ?bio|links)\b/.test(t)) return check(t), true;
    if (/\b(improve|better|clean ?up|fix|clearer)\b/.test(t) && lib) return improve(t), true;
    if (/\b(set ?up|organi[sz]e|create|build|prepare|help me with)\b/.test(t) && lib) return setupIntro(t), true;
    if (/\b(more subscribers|discover my courses?|newsletter readership|grow my newsletter|promote my upcoming event|highlight my latest|put my new experience first|find my memberships?|memberships? (first|at the top)|add my latest post|feature my latest post)\b/.test(t)) return goalFor(t) || (promote(t), true);
    const top = /\b(at the top|first|to the top)\b/.test(t) && /\b(put|move|make)\b/.test(t);
    if ((/\b(promote|feature)\b/.test(t) || top) && (lib || /\b(session|experience|course|membership|offering|call)\b/.test(t))) {
      if (/\bcourse\b/.test(t)) return goalFor("help fans discover my courses"), true;
      if (/\bmembership/.test(t)) return goalFor("I want more subscribers"), true;
      if (/\boffering\b/.test(t) && !/\b(session|experience|call)\b/.test(t)) return pickOffering(t), true;
      return promote(t), true;
    }
    return false;
  };

  return { setupIntro, socials, style, setup, promote, improve, check, goalFor, addThis, offer, saved, route, toEditor, show };
}

/* ---------------- the compact proposal list (live from the store) ---------------- */

const host = (u: string | null) => (u ? u.replace(/^https?:\/\//, "").replace(/\/$/, "") : "No public page yet");
const OP: Record<string, string> = { add: "", rename: "Rename", remove: "Remove", move: "Move to top", replace: "Replace" };
const STATUS: Record<string, string> = { verified: "Live", format: "External · format checked", pending: "Not live yet", invalid: "Not available" };

export function BioReview({ id }: { id: string }) {
  const x = useData((d) => itemById(d, id));
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  if (!x?.bio) return null;
  const locked = x.bio.step === "saved" || x.status === "cancelled";
  const doAct = (label: string, fn: (d: AppData) => void) => {
    const r = act(label, fn, { need: "content.write" });
    setErr(r.ok ? null : r.reason);
  };
  const links = x.bio.links;
  const pr = x.bio.profile;
  let rank = 0;
  return (
    <div data-testid="bio-review" data-status={x.status} data-step={x.bio.step} className="mt-1 flex flex-col gap-3 text-[13px]">
      {pr && (
        <ul className="flex flex-col gap-3">
          {pr.bio && (
            <li data-testid="bio-style-bio" className={`flex items-start gap-2.5 ${pr.include.bio ? "" : "opacity-60"}`}>
              <input type="checkbox" aria-label="Use this bio" checked={pr.include.bio} disabled={locked} onChange={(e) => doAct("content.bioStyle", (d) => toggleStyle(d, id, "bio", e.target.checked))} className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">Bio</p>
                <p className="text-[12px] leading-[18px]">{pr.bio}</p>
                <p className="text-[11px] text-soft">From your profile bio</p>
              </div>
            </li>
          )}
          {pr.palette != null && (
            <li data-testid="bio-style-palette" className={`flex items-start gap-2.5 ${pr.include.palette ? "" : "opacity-60"}`}>
              <input type="checkbox" aria-label="Use these colours" checked={pr.include.palette} disabled={locked} onChange={(e) => doAct("content.bioStyle", (d) => toggleStyle(d, id, "palette", e.target.checked))} className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">Colours</p>
                <p className="text-[11px] text-soft">{pr.paletteName} (Select Colors and Themes › first palette)</p>
              </div>
            </li>
          )}
        </ul>
      )}
      {links.length > 0 && (
        <ul className="flex flex-col gap-3">
          {links.map((l, i) => {
            const off = l.check === "pending" || (l.check === "invalid" && l.op !== "remove");
            const n = l.op !== "remove" && l.include && !l.key.startsWith("icon-") ? ++rank : null;
            return (
              <li key={l.key} data-testid="bio-link" data-key={l.key} data-include={l.include} className={`flex items-start gap-2.5 ${l.include ? "" : "opacity-60"}`}>
                <input
                  type="checkbox"
                  aria-label={`Include ${l.title}`}
                  checked={l.include}
                  disabled={locked || off}
                  onChange={(e) => doAct("content.bioToggle", (d) => toggleLink(d, id, l.key, e.target.checked))}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    {n != null && <span data-testid="bio-link-rank" className="shrink-0 text-[11px] font-bold text-soft">{n}.</span>}
                    {l.op === "remove" ? (
                      <p className="font-bold line-through decoration-white/40">{l.title}</p>
                    ) : (
                      <input
                        aria-label={`Title for ${l.title}`}
                        data-testid="bio-link-title"
                        defaultValue={l.title}
                        disabled={locked}
                        onBlur={(e) => e.target.value !== l.title && doAct("content.bioRename", (d) => renameLink(d, id, l.key, e.target.value))}
                        className="w-full min-w-0 bg-transparent font-bold outline-none focus:underline focus:decoration-accent"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    data-testid="bio-link-dest"
                    aria-expanded={open === l.key}
                    onClick={() => setOpen(open === l.key ? null : l.key)}
                    className={`block w-full text-left text-[11px] text-soft hover:text-white ${open === l.key ? "break-all" : "truncate"}`}
                    title={open === l.key ? undefined : "Show the full address"}
                  >
                    {OP[l.op] && <span className="text-accent">{OP[l.op]}{l.from && l.op !== "move" ? ` "${l.from}"` : ""} · </span>}
                    {open === l.key ? l.url ?? "No public page yet" : host(l.url)}
                  </button>
                  <p className={`text-[11px] ${l.check === "pending" || l.check === "invalid" ? "text-accent" : "text-soft"}`}>
                    <span data-testid="bio-link-status">{STATUS[l.check]}</span> · {l.op === "add" && l.check !== "pending" && l.check !== "invalid" ? l.source : l.note}
                  </p>
                </div>
                {!locked && links.length > 1 && l.op !== "remove" && (
                  <span className="flex shrink-0 flex-col">
                    <button aria-label={`Move ${l.title} up`} disabled={i === 0} onClick={() => doAct("content.bioMove", (d) => moveLink(d, id, l.key, -1))} className="text-soft hover:text-white disabled:opacity-30"><ArrowUp size={13} /></button>
                    <button aria-label={`Move ${l.title} down`} disabled={i === links.length - 1} onClick={() => doAct("content.bioMove", (d) => moveLink(d, id, l.key, 1))} className="text-soft hover:text-white disabled:opacity-30"><ArrowDown size={13} /></button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {err && <p className="text-[12px] text-accent">{err}</p>}
      {x.needs.map((n) => <p key={n} className="text-[12px] text-accent">{n}</p>)}
      {x.status === "paused" && <p className="text-[12px] text-soft">Saved for later.</p>}
      {x.bio.step === "saved" && <p className="text-[12px] text-soft">Saved in your Link in Bio.</p>}
    </div>
  );
}
