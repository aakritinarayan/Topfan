/**
 * Edit Cover Page with the assistant (Account Setup & Navigation demo, after the site is live).
 *
 * In the existing Cover Page editor the assistant offers to prepare the fields from what TopFan
 * already knows (profile, account setup) plus the creator's website and authorized social profiles.
 * Those outside sources are a labelled, simulated fixture (config/coverSources.ts): nothing is fetched.
 *
 * The creator decides everything: the draft goes into the editor only on "Review in Cover Page Editor"
 * (never over fields they typed in, with Undo), colors and images are separate yes/no decisions, and
 * publishing happens only through the editor's own Update & Publish button.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAssistant } from "../../state/assistantStore";
import { useRouter } from "../../app/router";
import { resolve } from "../../app/routeCatalog";
import { markAssistantNavigation } from "../../app/agent-context/workflow-state";
import { urlFor } from "../../app/agent-context/routes";
import { act, delaysOff, getData, onStoreEvent } from "../../store/store";
import { mediaSrc } from "../../media";
import { SOURCE_LABEL, socialFixture } from "../../config/coverSources";
import {
  applyDraft,
  COVER_FIELD_LABEL,
  decideImage,
  missingRequired,
  prepareCoverDraft,
  saveDraft,
  setColorStatus,
  setPendingTheme,
  suggestField,
  undoApply,
  type CoverDraft,
  type CoverField,
} from "../../store/slices/cover";
import { usePlatformAgent } from "./PlatformAgent";

const EDITOR = "pref-whitelabel-cover";
const WLS = "pref-whitelabel";

/* ---------------- entry points used by the page guide and the chat ---------------- */

type Api = { start: () => void; prepare: () => void; improveIntro: () => void; suggestColors: () => void; reviewMissing: () => void };
let api: Api | null = null;
/** Cover-page actions while the assistant is available (null in the AI-Assisted Content demo). */
export const coverActions = () => api;

const EDIT_RE = /\b(edit|update|customi[sz]e|set ?up|change|work on|open) (my |the )?cover( page)?\b/;
const PREPARE_RE = /\b(prepare|fill( in| out)?|draft|write|build) (my |the )?cover( page)?\b|\bprefill\b/;
const INTRO_RE = /\b(improve|rewrite|polish|better) (my |the )?(intro|introduction|description|seo description)\b/;
const COLORS_RE = /\b(suggest|pick|choose|find) (my |some )?(brand )?colou?rs\b/;
const MISSING_RE = /\bmissing (info|information|fields?)\b|\bwhat s missing\b/;

/** Typed requests about the cover page. Returns true when handled here. */
export function handleCoverRequest(text: string): boolean {
  if (!api) return false;
  const t = text.toLowerCase().replace(/[’']/g, " ");
  if (PREPARE_RE.test(t)) return api.prepare(), true;
  if (EDIT_RE.test(t)) return api.start(), true;
  const onEditor = resolve(window.location.pathname).route.id === EDITOR;
  if (!onEditor) return false;
  if (INTRO_RE.test(t)) return api.improveIntro(), true;
  if (COLORS_RE.test(t)) return api.suggestColors(), true;
  if (MISSING_RE.test(t)) return api.reviewMissing(), true;
  return false;
}

/* ---------------- the post-setup next steps (Account Setup demo) ---------------- */

export interface NextAction {
  id: string;
  label: string;
  run: () => void;
}
/** In priority order; the panel shows three and keeps the rest under "More suggestions". */
export function postSetupActions(agent: ReturnType<typeof usePlatformAgent>): NextAction[] {
  return [
    { id: "cover", label: "Edit my cover page", run: () => api?.start() },
    { id: "branding", label: "Customize my branding", run: () => void agent.beginTask("white-label", { goal: "Customize my branding" }) },
    { id: "link-in-bio", label: "Set up Link in Bio", run: () => void agent.beginTask("link-in-bio", { goal: "Set up Link in Bio" }) },
    { id: "earn", label: "Start earning from fans", run: () => agent.showEarn({ kind: "broad", question: "What kind of earning fits you best?" }) },
    { id: "post", label: "Explore creating a post", run: () => void agent.beginTask("create-post", { goal: "Explore creating a post" }) },
  ];
}
export const POST_SETUP_HEADING = "Your site is ready. Let's make it yours.";
export const POST_SETUP_LINE = "Start by customizing your website, or explore what else you can do on TopFan.";

/** The post-setup actions as chips: three, then "More suggestions". */
export function PostSetupActions({ prefix = "ai-next-" }: { prefix?: string }) {
  const agent = usePlatformAgent();
  const [more, setMore] = useState(false);
  const items = postSetupActions(agent);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {(more ? items : items.slice(0, 3)).map((s) => (
          <button key={s.id} data-testid={`${prefix}${s.id}`} onClick={() => agent.pickSuggestion(s)} className="rounded-full border border-line px-3 py-1.5 text-left text-[12px] hover:border-accent">
            {s.label}
          </button>
        ))}
      </div>
      {!more && (
        <button data-testid={`${prefix}more`} onClick={() => setMore(true)} className="self-start text-[12px] font-bold text-accent">
          More suggestions
        </button>
      )}
    </div>
  );
}

/* ---------------- the assistant ---------------- */

export function CoverAssistant() {
  const a = useAssistant();
  const agent = usePlatformAgent();
  const { path, navigate } = useRouter();
  const routeId = resolve(path).route.id;
  const live = useRef({ a, agent, routeId, navigate });
  live.current = { a, agent, routeId, navigate };
  /** Set by "Edit my cover page": open the editor once White Label Site is showing. */
  const openEditorNext = useRef(false);
  const lastRoute = useRef<string | null>(null);
  /** The decision message waiting for an answer (one at a time). */
  const pending = useRef<string | null>(null);

  const go = (routeId: string, target?: string) => {
    markAssistantNavigation();
    live.current.navigate(urlFor(routeId, getData()));
    if (target) setTimeout(() => live.current.a.highlight(target), 450);
  };
  const ask = (m: Parameters<typeof a.say>[0]) => {
    const { a } = live.current;
    if (pending.current) a.resolve(pending.current);
    pending.current = a.say(m);
    return pending.current;
  };
  const answered = (label?: string) => {
    if (pending.current) live.current.a.resolve(pending.current, label);
    pending.current = null;
  };

  /* ---- "Edit my cover page": White Label Site, then the existing Edit Cover Page editor ---- */
  const start = () => {
    const { routeId, agent } = live.current;
    if (routeId === EDITOR) return void (agent.beginTask("cover-page", { navigate: false, goal: "Edit my cover page" }), intro(true));
    openEditorNext.current = true;
    agent.beginTask("cover-page", { goal: "Edit my cover page" });
    if (routeId === WLS) openEditorSoon();
  };
  const openEditorSoon = () => {
    openEditorNext.current = false;
    live.current.a.highlight("edit-cover");
    setTimeout(() => go(EDITOR), delaysOff() ? 150 : 900);
  };

  /** First visit to the editor: what the assistant can do, and the creator's choice. */
  const intro = (force = false) => {
    const d = getData();
    if (d.cover.draft && !force) return draftWaiting(d.cover.draft);
    const show = () =>
      ask({
        text: "I can help prepare your cover page using the information you've already shared with TopFan, along with your existing website and authorized social profiles.",
        details: "Nothing in the editor changes until you review the draft. Publishing is always your click.",
        actions: [
          { label: "Prepare my cover page", variant: "primary", onClick: () => (answered("Prepare my cover page"), prepare()) },
          { label: "I'll fill it myself", variant: "outline", onClick: () => (answered("I'll fill it myself"), fillMyself()) },
        ],
      });
    if (force) show();
    else live.current.a.once("cover-intro", show);
  };
  const fillMyself = () =>
    live.current.a.say({
      text: "Sure. The fields are all yours. If you'd like a hand later, ask me to prepare your cover page, or pick a suggestion below.",
    });

  /** Back in the editor (navigation or refresh) with a draft that hasn't been reviewed yet. */
  const draftWaiting = (draft: CoverDraft) => {
    const d = getData();
    if (d.cover.applied || d.cover.publishedAt) return;
    if (draft.fields.every((f) => d.cover.meta[f.field] === f.value)) return;
    ask({
      text: "Your cover page draft is still ready. Nothing has been changed in the editor yet.",
      actions: [
        { label: "Review in Cover Page Editor", variant: "primary", onClick: () => (answered("Review in Cover Page Editor"), review()) },
        { label: "Show the draft again", variant: "outline", onClick: () => (answered(), summary(getData().cover.draft!)) },
      ],
    });
  };

  /* ---- prepare: read the sources, build the draft, show the summary (editor untouched) ---- */
  const prepare = () => {
    const { a, routeId } = live.current;
    if (a.working) return;
    if (routeId !== EDITOR) {
      live.current.agent.beginTask("cover-page", { navigate: false, goal: "Prepare my cover page" });
      go(EDITOR);
    }
    a.once("cover-intro", () => {}); // the offer is answered
    const skipped = socialFixture.filter((s) => s.access !== "authorized");
    a.say({
      text: "Preparing your draft from your TopFan profile, your account setup, your website and your authorized Instagram profile.",
      details: (
        <>
          Website and social data in this demo are simulated. {skipped.map((s) => SOURCE_LABEL[s.id]).join(" and ")}: links kept, nothing read
          from them.
        </>
      ),
    });
    a.setMood("generating");
    a.run(
      "Preparing your cover page draft…",
      delaysOff() ? 250 : 2200,
      () => {
        const draft = prepareCoverDraft(getData());
        act("cover.draft", (d) => saveDraft(d, draft));
        live.current.a.setMood("happy");
        summary(draft);
      },
      () => {
        live.current.a.setMood("idle");
        live.current.a.say({ text: "Stopped. Nothing was prepared or changed in your editor." });
      },
    );
  };

  const summary = (draft: CoverDraft) =>
    ask({
      text: (
        <>
          <b>Your cover page draft is ready.</b> I've prepared a draft using the information available from your TopFan profile and authorized sources.
        </>
      ),
      plain: `Cover page draft ready. ${draft.fields.map((f) => `${COVER_FIELD_LABEL[f.field]}: ${f.value}`).join(" · ")}`,
      body: <CoverSummary draft={draft} />,
      actions: [
        { label: "Review in Cover Page Editor", variant: "primary", onClick: () => (answered("Review in Cover Page Editor"), review()) },
        { label: "Not now", variant: "text", onClick: () => (answered("Not now"), live.current.a.say({ text: "Okay. Your draft is saved; nothing in the editor changed." })) },
      ],
    });

  /* ---- review: put the draft into the editor's own fields (never over the creator's edits) ---- */
  const review = () => {
    const { a, routeId } = live.current;
    if (routeId !== EDITOR) go(EDITOR);
    let res = { applied: [] as CoverField[], kept: [] as CoverField[] };
    act("cover.apply", (d) => void (res = applyDraft(d)), { need: "account.admin" });
    res.applied.forEach((f, i) => setTimeout(() => live.current.a.highlight(`cover-${f}`), 500 + i * 250));
    a.say({
      status: "done",
      text: res.applied.length
        ? `I filled in ${list(res.applied.map((f) => COVER_FIELD_LABEL[f]))} in the editor. Change anything you like; nothing is published until you click Update & Publish.`
        : "Every field already has your own text, so I didn't change anything.",
      details: res.kept.length ? `I kept your own ${list(res.kept.map((f) => COVER_FIELD_LABEL[f]))}.` : undefined,
      actions: res.applied.length ? [{ label: "Undo", variant: "outline", onClick: undo }] : undefined,
    });
    nextDecision();
  };

  const undo = () => {
    let restored: CoverField[] = [];
    act("cover.undo", (d) => void (restored = undoApply(d)));
    live.current.a.say({
      text: restored.length ? `Undone. ${list(restored.map((f) => COVER_FIELD_LABEL[f]))} ${restored.length > 1 ? "are" : "is"} back to what ${restored.length > 1 ? "they were" : "it was"}.` : "There's nothing left to undo: you've already changed those fields yourself.",
    });
  };

  /* ---- then one decision at a time: cover image, brand colors, then publishing (the creator's click) ---- */
  const nextDecision = () => {
    const draft = getData().cover.draft;
    if (!draft) return;
    if (draft.image?.status === "proposed") return imageDecision(draft);
    if (!draft.image && draft.unresolved.some((u) => u.startsWith("Would you like"))) return imageQuestion();
    if (draft.colors?.status === "proposed") return colorDecision(draft);
    finalStep();
  };

  const imageDecision = (draft: CoverDraft) => {
    const img = draft.image!;
    ask({
      text: "Use this image from your website as your cover-page hero image?",
      body: <Thumb src={img.key} alt={img.alt} source={SOURCE_LABEL[img.source]} />,
      actions: [
        { label: "Use this image", variant: "primary", onClick: () => (answered("Use this image"), act("cover.image", (d) => decideImage(d, true), { need: "account.admin" }), nextDecision()) },
        { label: "Keep current image", variant: "outline", onClick: () => (answered("Keep current image"), act("cover.image", (d) => decideImage(d, false)), nextDecision()) },
      ],
    });
  };

  /** No usable image: the one question worth asking. */
  const imageQuestion = () =>
    ask({
      text: "Would you like to upload a cover image or choose one from your existing media?",
      actions: [
        {
          label: "Choose from my media",
          variant: "primary",
          onClick: () => {
            answered("Choose from my media");
            const hero = getData().account.hero;
            const key = ["creators/ajwhite/mountain-wide", "creators/ajwhite/hero-3"].find((k) => k !== hero)!;
            act("cover.imageFromMedia", (d) => {
              if (!d.cover.draft) return;
              d.cover.draft.image = { key, alt: "From your TopFan media", source: "profile", status: "proposed" };
              d.cover.draft.unresolved = d.cover.draft.unresolved.filter((u) => !u.startsWith("Would you like"));
            });
            nextDecision();
          },
        },
        {
          label: "I'll upload one later",
          variant: "outline",
          onClick: () => {
            answered("I'll upload one later");
            act("cover.imageLater", (d) => {
              if (d.cover.draft) d.cover.draft.unresolved = d.cover.draft.unresolved.filter((u) => !u.startsWith("Would you like"));
            });
            live.current.a.say({ text: "Okay. Your current cover image stays as it is." });
            nextDecision();
          },
        },
      ],
    });

  const colorDecision = (draft: CoverDraft) => {
    const c = draft.colors!;
    ask({
      text: "Your website uses these brand colors. Use them for your buttons and accents?",
      body: <Palette c={c} />,
      details: "They go into White Label Site › Customize Appearance as unsaved changes, so you can preview them first.",
      actions: [
        {
          label: "Use these colors",
          variant: "primary",
          onClick: () => {
            answered("Use these colors");
            setPendingTheme({ accent: c.accent, buttonText: c.buttonText });
            act("cover.colors", (d) => setColorStatus(d, "accepted"));
            live.current.a.say({
              text: "They're ready in Customize Appearance. Preview them there, and click Update & Publish on that page if you like them.",
              actions: [{ label: "Open Customize Appearance", variant: "outline", onClick: () => go(WLS, "colors") }],
            });
            finalStep();
          },
        },
        {
          label: "Keep my current colors",
          variant: "outline",
          onClick: () => {
            answered("Keep my current colors");
            act("cover.colors", (d) => setColorStatus(d, "rejected"));
            live.current.a.say({ text: "Okay, your current colors stay as they are." });
            finalStep();
          },
        },
      ],
    });
  };

  const finalStep = () => {
    if (live.current.routeId !== EDITOR) return;
    live.current.a.say({ text: "When everything looks right, click Update & Publish at the bottom of the editor. I won't publish anything for you." });
    setTimeout(() => live.current.a.highlight("cover-publish"), 600);
  };

  /* ---- editor suggestions ---- */
  const ensureDraft = () => {
    const d = getData();
    if (d.cover.draft) return d.cover.draft;
    const draft = prepareCoverDraft(d);
    act("cover.draft", (x) => saveDraft(x, draft));
    return draft;
  };

  const improveIntro = () => {
    const d = getData();
    const bio = d.prefsA.profile.bio.trim().replace(/\.$/, "");
    const city = d.prefsA.profile.location.split(",").slice(0, 2).map((s) => s.trim()).join(", ");
    const [role, ...rest] = bio.split(". ");
    const value = `${d.account.name}: ${role.replace(/^US /, "")}${city ? ` based in ${city}` : ""}.${rest.length ? ` ${rest.join(". ")}.` : ""} Join to follow the season up close.`;
    ask({
      text: "Here's a clearer introduction for your Cover Page SEO Description, written from your TopFan bio and location.",
      plain: `Draft SEO Description: ${value}`,
      body: <DraftText label="Draft · written by AI from your TopFan profile" value={value} />,
      actions: [
        {
          label: "Use in SEO Description",
          variant: "primary",
          onClick: () => {
            answered("Use in SEO Description");
            act("cover.suggest", (x) => suggestField(x, "description", value), { need: "account.admin" });
            live.current.a.highlight("cover-description");
            live.current.a.say({ text: "Added to the SEO Description. Edit it as you like.", actions: [{ label: "Undo", variant: "outline", onClick: undo }] });
          },
        },
        { label: "Keep mine", variant: "outline", onClick: () => (answered("Keep mine"), live.current.a.say({ text: "Okay, your description stays as it is." })) },
      ],
    });
  };

  const suggestColors = () => {
    const draft = ensureDraft();
    if (!draft.colors) return void live.current.a.say({ text: "I don't have brand colors to suggest: there's no website to take them from. Your current colors stay as they are." });
    colorDecision({ ...draft, colors: { ...draft.colors, status: "proposed" } });
  };

  const reviewMissing = () => {
    const d = getData();
    const req = missingRequired(d);
    const draft = d.cover.draft;
    const items = [...req.map((f) => `${COVER_FIELD_LABEL[f]} is required.`), ...(draft?.unresolved ?? [])];
    live.current.a.say({
      text: items.length ? "Here's what still needs you:" : draft ? "Nothing is missing. Review the fields, then click Update & Publish when you're ready." : "All required fields are filled in. I can also prepare a draft from what TopFan already knows.",
      body: items.length ? <ul className="mt-1 list-disc pl-5 text-[13px]">{items.map((x) => <li key={x}>{x}</li>)}</ul> : undefined,
      actions: draft ? undefined : [{ label: "Prepare my cover page", variant: "outline", onClick: prepare }],
    });
  };

  api = { start, prepare, improveIntro, suggestColors, reviewMissing };
  useEffect(() => () => void (api = null), []);

  /* ---- navigation: open the editor after White Label Site; greet in the editor ---- */
  useEffect(() => {
    const prev = lastRoute.current;
    lastRoute.current = routeId;
    if (routeId === WLS && openEditorNext.current) return openEditorSoon();
    if (routeId === EDITOR && prev !== EDITOR) {
      // Give the page (and any task message) a beat to settle first. If this effect is torn down
      // before then (StrictMode re-run, quick navigation), the arrival hasn't been handled yet.
      let fired = false;
      const t = setTimeout(() => ((fired = true), intro()), delaysOff() ? 50 : 500);
      return () => {
        clearTimeout(t);
        if (!fired) lastRoute.current = prev;
      };
    }
    if (prev === EDITOR && routeId !== EDITOR && pending.current) answered();
  }, [routeId]);

  /* ---- publish results come from the editor's own button (never from the assistant) ---- */
  useEffect(
    () =>
      onStoreEvent((e) => {
        const { a, agent } = live.current;
        if (e.label === "cover.publish" && e.ok) {
          answered();
          a.setMood("happy");
          a.say({
            status: "done",
            text: "Your cover page is published.",
            actions: [
              { label: "Customize my branding", variant: "outline", onClick: () => void agent.beginTask("white-label", { goal: "Customize my branding" }) },
              { label: "Set up Link in Bio", variant: "outline", onClick: () => void agent.beginTask("link-in-bio", { goal: "Set up Link in Bio" }) },
            ],
          });
        }
        if (e.label === "cover.publishFailed") {
          // Check the real (mock) status before suggesting a retry, so nothing is published twice.
          const published = !!getData().cover.publishedAt;
          a.setMood("error");
          a.say({
            status: "problem",
            text: published
              ? "Publishing reported an error, but I checked and your cover page is published. No need to try again."
              : "Publishing didn't go through. I checked: your cover page wasn't published, so nothing changed on your live site. Your edits are still here.",
            actions: published ? undefined : [{ label: "Show me the button", variant: "outline", onClick: () => a.highlight("cover-publish") }],
          });
        }
      }),
    [],
  );

  return null;
}

/* ---------------- panel pieces ---------------- */

const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-3">
      <p className="text-[11px] font-bold uppercase tracking-caps text-soft">{title}</p>
      <div className="mt-1.5 flex flex-col gap-2">{children}</div>
    </div>
  );
}
const Tag = ({ children }: { children: ReactNode }) => <span className="rounded-pill bg-bg px-2 py-0.5 text-[11px] text-soft">{children}</span>;

function CoverSummary({ draft }: { draft: CoverDraft }) {
  const edited = getData().cover.edited;
  return (
    <div data-testid="cover-summary" className="text-[13px]">
      <Section title="Fields in your editor">
        {draft.fields.map((f) => (
          <div key={f.field} data-testid={`cover-summary-${f.field}`} className="rounded-inner bg-bg px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold">{COVER_FIELD_LABEL[f.field].replace("Cover Page ", "")}</span>
              <Tag>Draft</Tag>
              <Tag>{f.ai ? "Written by AI" : `From ${list(f.sources.map((s) => SOURCE_LABEL[s].replace(/^Your /, "")))}`}</Tag>
            </div>
            <p className="mt-1 line-clamp-3">{f.value}</p>
            {f.ai && <p className="mt-1 text-[11px] text-soft">Based on {list(f.sources.filter((s) => s !== "ai").map((s) => SOURCE_LABEL[s]))}.</p>}
            {edited.includes(f.field) && <p className="mt-1 text-[11px] text-soft">You've edited this field, so I'll keep yours.</p>}
          </div>
        ))}
      </Section>
      {draft.colors && (
        <Section title="Brand colors (suggestion)">
          <Palette c={draft.colors} />
        </Section>
      )}
      {draft.image && (
        <Section title="Cover image (suggestion)">
          <Thumb src={draft.image.key} alt={draft.image.alt} source={SOURCE_LABEL[draft.image.source]} />
        </Section>
      )}
      <Section title="Copy for your site (no field for it in this editor)">
        {draft.copy.map((c) => (
          <DraftText key={c.label} label={`Draft · ${c.label}`} value={c.text} />
        ))}
      </Section>
      <Section title="Sources">
        <ul className="flex flex-col gap-1" data-testid="cover-sources">
          {draft.sources.map((s) => (
            <li key={s.id}>
              <b>{SOURCE_LABEL[s.id]}</b> <span className="text-soft">· {s.note}</span>
            </li>
          ))}
        </ul>
      </Section>
      {draft.unresolved.length > 0 && (
        <Section title="Needs your input">
          <ul className="list-disc pl-5" data-testid="cover-unresolved">
            {draft.unresolved.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Palette({ c }: { c: NonNullable<CoverDraft["colors"]> }) {
  return (
    <div data-testid="cover-palette" className="rounded-inner bg-bg px-3 py-2 text-[12px]">
      <div className="flex items-center gap-3">
        <span className="flex h-8 items-center rounded-pill px-4 text-[12px] font-black uppercase" style={{ background: c.accent, color: c.buttonText }}>
          Button
        </span>
        <span className="text-soft">
          Accent {c.accent} · Button text {c.buttonText} · contrast {c.contrast}:1
        </span>
      </div>
      {c.left.map((l) => (
        <p key={l.hex} className="mt-1.5 flex items-center gap-1.5 text-soft">
          <span className="h-3 w-3 rounded-full" style={{ background: l.hex }} /> Left out {l.hex}: {l.why.toLowerCase()}.
        </p>
      ))}
    </div>
  );
}

function Thumb({ src, alt, source }: { src: string; alt: string; source: string }) {
  return (
    <figure data-testid="cover-image" className="overflow-hidden rounded-inner bg-bg">
      <img src={mediaSrc(src) ?? ""} alt={alt} className="h-28 w-full object-cover" />
      <figcaption className="px-3 py-1.5 text-[11px] text-soft">{source}</figcaption>
    </figure>
  );
}

function DraftText({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-inner bg-bg px-3 py-2">
      <p className="text-[11px] text-soft">{label}</p>
      <p className="mt-0.5 text-[13px]">{value}</p>
    </div>
  );
}
