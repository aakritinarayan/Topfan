/**
 * AI-Assisted Content & Monetization (Demo 2). The creator says what they want; the assistant prepares
 * linked work items (slices/content.ts) and hands each one to the EXISTING screen that saves, sends,
 * publishes or activates it: New Post, New Newsletter, Add Experience. Requests are routed here by
 * deterministic rules (the model never invents routes or actions); every change goes through act().
 *
 * Nothing here publishes, sends, schedules or activates. Image "generation" is simulated with original
 * pre-made artwork and says so. The post Lock offers Individual Purchase (price), Loyalty Points and Lock
 * with NFT (a contract address the creator pastes); it has no tier option, so tier requests on posts are
 * explained, never faked; newsletters do support specific plans.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAssistant } from "../../state/assistantStore";
import { useRouter } from "../../app/router";
import { pathFor, resolve } from "../../app/routeCatalog";
import { markAssistantNavigation } from "../../app/agent-context/workflow-state";
import { act, delaysOff, getData, onStoreEvent, useData, type AppData } from "../../store/store";
import { mediaSrc } from "../../media";
import { openAutopilot } from "./autopilotView";
import { bioFlows } from "./BioFlows";
import { proposePromote } from "../../store/slices/bio";
import { inScope } from "../../app/demo";
import {
  approveReady,
  attachMedia,
  audienceAsk,
  cancelItem, renameExperience,
  childrenOf,
  clearFlags,
  createAnnouncement,
  createExperience,
  createNewsletter,
  createPost,
  createTeaser,
  createWeek,
  DAY_NAMES,
  focus,
  GENERATED,
  imageBrief,
  itemById,
  libraryMedia,
  libraryOf,
  lockModes,
  mediaProblem,
  NFT_CONTRACT_RE,
  moveTo,
  planByName,
  recentPosts,
  rejectMedia,
  revalidatePlans,
  setExperiencePrice,
  setLocked,
  setLockNft,
  setLockPoints,
  setNewsletterAudience,
  setPaused,
  setPublic,
  shorten,
  TYPE_LABEL,
  wantsEvent,
  weekSummary,
  type AudienceAsk,
  type WorkItem,
  type WorkMedia,
  type WorkStatus,
} from "../../store/slices/content";

/* ---------------- entry points (welcome chips, page guide, chat) ---------------- */

type Api = {
  post: (goal?: string) => void;
  plan: () => void;
  newsletter: (goal?: string) => void;
  experience: (goal?: string) => void;
  week: (goal?: string) => void;
  media: () => void;
  audience: () => void;
  recipients: () => void;
  requiredDetails: () => void;
  membership: () => void;
  plans: () => void;
  performance: () => void;
  show: (id: string) => void;
  bioSetup: () => void;
  bioPromote: () => void;
  bioImprove: () => void;
};
let api: Api | null = null;
/** Content actions while the assistant is available (null outside the AI-Assisted Content demo). */
export const contentActions = () => api;
let handler: ((text: string) => boolean) | null = null;
/** Typed or spoken content requests. Returns true when handled here. */
export const handleContentRequest = (text: string) => !!handler?.(text);

/** The latest unfinished work item, for "Continue …". */
export function unfinishedWork(d: AppData) {
  const open: WorkStatus[] = ["draft", "needs-input", "review", "blocked", "paused", "approved"];
  const f = itemById(d, d.content.focusId);
  const top = f?.parentId ? itemById(d, f.parentId) : f;
  return top && open.includes(top.status) ? top : null;
}

export const CREATE_HEADING = "What would you like to create?";
export const CREATE_LINE = "Tell me what you have in mind. I can help plan, prepare and organize it for your fans.";
export const CREATE_ACTIONS = [
  { id: "post", label: "Create a post" },
  { id: "plan", label: "Plan my content" },
  { id: "newsletter", label: "Create a newsletter" },
  { id: "experience", label: "Plan a fan experience" },
  { id: "week", label: "Plan my entire week" },
] as const;

/* ---------------- labels ---------------- */

const STATUS: Record<WorkStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  "needs-input": "Needs your input",
  review: "Needs review",
  blocked: "Blocked",
  saved: "Saved in TopFan",
  published: "Published",
  sent: "Sent",
  active: "Active",
  paused: "Paused",
  cancelled: "Removed",
  failed: "Failed",
};
const KIND: Record<WorkItem["kind"], string> = { post: "Post", newsletter: "Newsletter", experience: "Experience", week: "Week", bio: "Link in Bio" };
const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }) : "");
const money = (n: number) => `$${n.toFixed(2).replace(/\.00$/, "")}`;
const DAY_RE = /\b(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(day|nesday|sday|urday)?\b/;
const dayOf = (w: string) => ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(w.slice(0, 3));
const shortContract = (c: string) => `${c.slice(0, 6)}…${c.slice(-4)}`;
/** One Lock option in plain words (the four access models stay distinct). */
const lockLine = (x: NonNullable<WorkItem["post"]>) =>
  lockModes(x)
    .map((m) =>
      m === "purchase"
        ? `Individual Purchase, pay to unlock${x.price ? ` (${money(x.price)})` : " (price not set)"}`
        : m === "points"
          ? `Loyalty Points, unlock with ${x.points ? `${x.points} points` : "points (amount not set)"}`
          : `NFT holders only${x.contract ? ` (contract ${shortContract(x.contract)})` : " (contract address not set)"}`,
    )
    .join(" or ");
const audienceLine = (d: AppData, x: WorkItem) => {
  if (x.post) return x.post.locked ? `Locked: ${lockLine(x.post)}` : "Public";
  if (x.newsletter) {
    const n = x.newsletter;
    const plans = n.planIds.map((id) => d.monetize.plans.find((p) => p.id === id)?.name).filter(Boolean);
    return n.audience === "plans" ? `Subscribers of ${plans.join(", ") || "no plan selected"}` : `All recipients (${d.monetize.recipients.length})`;
  }
  if (x.experience) return "Anyone can book (you can switch on Subscribers only)";
  return "";
};

/* ---------------- the assistant ---------------- */

export function ContentAgent() {
  const a = useAssistant();
  const { path, navigate } = useRouter();
  const live = useRef({ a, path, navigate });
  live.current = { a, path, navigate };
  /** Waiting for a number from the creator (a price). */
  const pending = useRef<{ id: string; field: "experience-price" | "lock-price" | "lock-points" | "lock-nft" } | null>(null);

  const d = () => getData();
  const say = (m: Parameters<typeof a.say>[0]) => live.current.a.say(m);
  const run = (label: string, fn: (d: AppData) => void) => {
    const r = act(label, fn, { need: "content.write" });
    if (!r.ok) say({ status: "problem", text: r.reason });
    return r.ok;
  };
  const focused = () => itemById(d(), d().content.focusId);
  const open = (x: WorkItem, target?: string) => {
    if (x.kind === "bio") return bio.toEditor(x.id);
    const route = x.kind === "post" ? "newpost" : x.kind === "newsletter" ? "monetize-newsletter-new" : "monetize-experience-add";
    // Already saved in TopFan: open the saved record instead of creating another.
    const url =
      x.kind === "newsletter" && x.ref?.newsletterId
        ? pathFor("monetize-newsletter-edit", { newsletterId: x.ref.newsletterId })
        : x.kind === "experience" && x.ref?.productId
          ? pathFor("monetize-experience-edit", { productId: x.ref.productId })
          : `${pathFor(route)}?work=${x.id}`;
    markAssistantNavigation();
    live.current.navigate(url);
    if (target) setTimeout(() => live.current.a.highlight(target), 600);
  };
  const go = (routeId: string, target?: string) => {
    markAssistantNavigation();
    live.current.navigate(pathFor(routeId));
    if (target) setTimeout(() => live.current.a.highlight(target), 600);
  };

  /* ---- Smart Link in Bio (BioFlows.tsx) ---- */
  const bio = bioFlows({
    say,
    run,
    d,
    go: (url, target) => {
      markAssistantNavigation();
      live.current.navigate(url);
      if (target) setTimeout(() => live.current.a.highlight(target), 700);
    },
  });
  const bioRef = useRef(bio);
  bioRef.current = bio;

  /* ---- B: a post ---- */
  const post = (goal = "Create a post") => {
    let id = "";
    if (!run("content.post", (x) => void (id = createPost(x, goal)))) return;
    const x = itemById(d(), id)!;
    const why =
      x.post!.type === "poll" ? "A poll fits a question for fans." : x.post!.type === "images" ? "An Images post fits an update with a photo." : x.post!.type === "article" ? "An Article fits longer writing." : x.post!.locked ? "A locked post fits something for paying fans." : "";
    say({
      text: <>Here's a draft from your training notes. {why}</>,
      plain: `Draft post (${x.post!.type}): ${x.post!.text}`,
      body: <WorkCard id={id} />,
      actions: [
        { label: "Open in New Post", variant: "primary", onClick: () => open(itemById(d(), id)!, x.post!.locked ? lockTarget(itemById(d(), id)!) : undefined) },
        { label: x.media ? "Change image" : "Add an image", variant: "outline", onClick: () => (run("content.focus", (y) => focus(y, id)), mediaChoice()) },
        { label: "Change audience", variant: "outline", onClick: () => (run("content.focus", (y) => focus(y, id)), audienceChoice()) },
      ],
    });
    // "…for Gold members": check the plan exists and say what the post Lock can and can't do.
    const ask = audienceAsk(goal);
    if (ask?.kind === "plan") audience(ask);
  };

  /* ---- C: media ---- */
  const mediaChoice = () => {
    const x = focused();
    if (!x || x.kind === "week") return say({ text: "Which post is the image for? Ask me to create a post first, then add an image." });
    say({
      text: `What should the image be? ${x.mediaNeed ? `This one needs ${x.mediaNeed.toLowerCase()}.` : ""}`,
      choice: {
        instant: true,
        options: [
          { value: "library", label: "Use one of my photos", recommended: libraryOf(d()).length > 0 },
          { value: "generate", label: "Generate an original image" },
          { value: "upload", label: "Upload my own image" },
        ],
        onPick: (v) => (v === "library" ? showLibrary() : v === "generate" ? generate() : upload()),
      },
    });
  };
  const showLibrary = () => {
    const x = focused()!;
    const lib = libraryOf(d()).filter((m) => !x.rejectedMedia?.includes(m.src));
    if (!lib.length) return say({ text: "There are no approved photos in your library yet. I can generate an original image instead, or you can upload one.", actions: [{ label: "Generate an original image", variant: "outline", onClick: generate }] });
    say({ text: "Your approved photos:", body: <MediaPick options={lib.map((m) => libraryMedia(d(), m.id)!).filter(Boolean)} onPick={use} /> });
  };
  const use = (m: WorkMedia) => {
    const x = focused();
    if (!x) return;
    const problem = mediaProblem(x, m);
    if (problem) return say({ status: "problem", text: `${problem} Pick another one.` });
    if (!run("content.media", (y) => attachMedia(y, x.id, m))) return;
    say({
      status: "done",
      text: `Attached to your ${x.label.toLowerCase()}${m.origin === "generated" ? " (marked as an AI-generated image, simulated)" : ""}.`,
      actions: [
        { label: x.kind === "post" ? "Open in New Post" : `Open in ${x.kind === "newsletter" ? "New Newsletter" : "Add Experience"}`, variant: "primary", onClick: () => open(itemById(d(), x.id)!) },
        { label: "Remove it", variant: "text", onClick: () => (run("content.media", (y) => rejectMedia(y, x.id)), say({ text: "Removed. I won't suggest that image for this again." })) },
      ],
    });
  };
  /** Simulated: two original pre-made directions, never a claim that a service generated them. */
  const generate = (kind: "training" | "revisions" = "training", only?: number) => {
    const x = focused();
    if (!x) return;
    const brief = imageBrief(d(), x);
    const options = GENERATED[kind].filter((_, i) => only == null || i === only).map((g) => ({ key: g.key, label: g.label, origin: "generated" as const, brief, direction: g.direction, w: g.w, h: g.h }));
    const label = "Preparing image options…";
    say({ text: "Image brief from your post and branding:", body: <Draftish label="Brief (you don't need to edit it)" value={brief} /> });
    live.current.a.setMood("generating");
    live.current.a.run(label, delaysOff() ? 200 : 1600, () => {
      live.current.a.setMood("idle");
      say({
        text: `${options.length > 1 ? "Two directions" : "Here's the revision"}. Pick one to attach. Simulated: these are pre-made sample photos, not generated live and not photos of you.`,
        details: "No image service is connected in this demo, so nothing was generated live.",
        body: <MediaPick options={options} onPick={use} simulated />,
      });
    });
  };
  const upload = () => {
    const x = focused();
    if (!x) return;
    say({ text: "Choose your image on the page. I'll keep everything else as it is." });
    open(x, x.kind === "post" ? "newpost-upload" : x.kind === "newsletter" ? "monetize-newsletter-image" : "monetize-product-image");
  };
  const revise = (t: string) => {
    const x = focused();
    if (!x?.media) return say({ text: "There's no image on this yet. Want me to add one?", actions: [{ label: "Add an image", variant: "outline", onClick: mediaChoice }] });
    if (x.media.origin !== "generated") return say({ text: "That's one of your photos, so I can't edit it here. I can generate an original image in that style instead.", actions: [{ label: "Generate an original image", variant: "outline", onClick: () => generate() }] });
    if (/darker|moodier/.test(t)) return generate("revisions", 0);
    if (/wider|space for text|room for text|wide/.test(t)) return generate("revisions", 1);
    if (/minimal|simpler|cleaner/.test(t)) return generate("training", 1);
    if (/cinematic|dramatic/.test(t)) return generate("training", 0);
    say({ text: "That kind of edit (like removing the background) isn't available in this demo. I can make it darker, wider with space for text, more minimal, or more cinematic." });
  };

  /* ---- D: audience (the existing Lock) ---- */
  const audienceChoice = () => {
    const x = focused();
    if (!x?.post && !x?.newsletter) return say({ text: "Which item is this for? Ask me to create a post or a newsletter first." });
    if (x.newsletter)
      return say({
        text: "Who should get this newsletter?",
        choice: {
          instant: true,
          options: [{ value: "all", label: "All recipients", recommended: true }, { value: "subs", label: "Subscribers only" }, ...d().monetize.plans.filter((p) => p.active).map((p) => ({ value: `plan:${p.name.split(" ")[0]}`, label: `${p.name} only` }))],
          onPick: (v) => audience(v === "all" ? { kind: "public" } : v === "subs" ? { kind: "subscribers" } : { kind: "plan", plan: v.slice(5) }),
        },
      });
    say({
      text: "Who should see this post? Public is best for reaching new fans. Lock lets fans unlock it by paying a price you set, by spending loyalty points, or by holding an NFT you name.",
      choice: {
        instant: true,
        options: [
          { value: "public", label: "Everyone (public)", recommended: !x.post!.locked },
          { value: "locked", label: "Lock it (pay to unlock)", recommended: x.post!.locked && lockModes(x.post!).includes("purchase") },
          { value: "points", label: "Unlock with loyalty points" },
          { value: "nft", label: "NFT holders only" },
        ],
        onPick: (v) => audience(v === "public" ? { kind: "public" } : v === "points" ? { kind: "points" } : v === "nft" ? { kind: "nft" } : { kind: "locked" }),
      },
    });
  };
  const audience = (ask: AudienceAsk) => {
    const x = focused();
    if (!x) return;
    if (x.newsletter) {
      if (!run("content.audience", (y) => setNewsletterAudience(y, x.id, ask))) {
        if (ask.kind === "plan") missingPlan(ask.plan);
        return;
      }
      const y = itemById(d(), x.id)!;
      return say({ status: "done", text: `This newsletter will go to: ${audienceLine(d(), y)}. Nothing is sent until you send it from Newsletters.` });
    }
    if (!x.post) return;
    if (ask.kind === "public") {
      if (!x.post.locked) return say({ text: "It's already public." });
      // Broadening access is the creator's call.
      return say({
        text: "Make this post public? Everyone will be able to see it, including what was locked.",
        actions: [
          { label: "Make it public", variant: "primary", onClick: () => (run("content.audience", (y) => setPublic(y, x.id)), say({ status: "done", text: "It's public now. Nothing is published until you do it in New Post." })) },
          { label: "Keep it locked", variant: "outline", onClick: () => say({ text: "Okay, it stays locked." }) },
        ],
      });
    }
    if (ask.kind === "plan") {
      const plan = planByName(d(), ask.plan);
      if (!plan) return missingPlan(ask.plan);
      // The post Lock can't target a plan: say so, never fake it.
      return say({
        text: (
          <>
            You have a <b>{plan.name}</b> ({plan.subscribers} subscribers), but a post's Lock in TopFan is pay to unlock (Individual Purchase), loyalty points or NFT ownership: it can't limit a post to one membership. Here's what works:
          </>
        ),
        plain: `${plan.name} exists, but post Lock is pay-to-unlock, loyalty points or NFT; tier-only posts aren't supported.`,
        actions: [
          { label: "Lock it with an unlock price", variant: "primary", onClick: () => lockIt(x.id) },
          { label: `Send it as a ${plan.name.split(" ")[0]}-only newsletter`, variant: "outline", onClick: () => newsletter(`Newsletter for ${plan.name}`, { fromId: x.id, ask }) },
          { label: "Keep it as a draft", variant: "text", onClick: () => say({ text: "Okay. It stays a draft, public until you choose otherwise." }) },
        ],
      });
    }
    if (ask.kind === "points") return lockPoints(x.id);
    if (ask.kind === "nft") return lockNft(x.id);
    lockIt(x.id, ask.kind === "subscribers");
  };
  /** Where New Post should point the creator for this item's Lock. */
  const lockTarget = (x: WorkItem) => (x.post && lockModes(x.post)[0] === "points" ? "newpost-lock-points" : x.post && lockModes(x.post)[0] === "nft" ? "newpost-lock-nft-input" : "newpost-lock-price");
  const lockPoints = (id: string) => {
    const cur = itemById(d(), id)?.post;
    if (!run("content.lockPoints", (y) => setLockPoints(y, id, cur?.lockBy?.[0] === "points" ? cur.points ?? null : null))) return;
    pending.current = { id, field: "lock-points" };
    say({
      text: (
        <>
          I've set this post's Lock to <b>Loyalty Points</b>: fans spend their loyalty points to unlock it (no payment). How many points should it take? Nothing changes on your page until you save or publish it in New Post.
        </>
      ),
      plain: "Post Lock set to Loyalty Points. Asked for the points.",
      body: <WorkCard id={id} />,
      actions: [{ label: "Set it in New Post", variant: "outline", onClick: () => open(itemById(d(), id)!, "newpost-lock-points") }],
    });
  };
  const lockNft = (id: string) => {
    const cur = itemById(d(), id)?.post;
    if (!run("content.lockNft", (y) => setLockNft(y, id, cur?.lockBy?.[0] === "nft" ? cur.contract ?? null : null))) return;
    pending.current = { id, field: "lock-nft" };
    say({
      text: (
        <>
          I've set this post's Lock to <b>Lock with NFT</b>: only fans holding an NFT from the contract you name can unlock it. Paste the NFT contract address (it starts with 0x). I won't guess one, and nothing changes on your page until you save or publish it in New Post.
        </>
      ),
      plain: "Post Lock set to Lock with NFT. Asked for the contract address.",
      body: <WorkCard id={id} />,
      actions: [{ label: "Set it in New Post", variant: "outline", onClick: () => open(itemById(d(), id)!, "newpost-lock-nft-input") }],
    });
  };
  const missingPlan = (name: string) =>
    say({
      status: "problem",
      text: `I couldn't find a ${name.charAt(0).toUpperCase() + name.slice(1)} membership in your current plans.`,
      choice: {
        instant: true,
        options: [
          ...d().monetize.plans.filter((p) => p.active).map((p) => ({ value: `plan:${p.name.split(" ")[0]}`, label: `Use ${p.name}` })),
          { value: "setup", label: "Set up that membership" },
          { value: "keep", label: "Keep this as a draft" },
        ],
        onPick: (v) => (v === "setup" ? go("monetize-subscription", "monetize-add-plan") : v === "keep" ? say({ text: "Okay, it stays a draft." }) : audience({ kind: "plan", plan: v.slice(5) })),
      },
    });
  const lockIt = (id: string, fromSubscribers = false) => {
    if (!run("content.lock", (y) => setLocked(y, id, itemById(y, id)?.post?.price ?? null))) return;
    pending.current = { id, field: "lock-price" };
    say({
      text: (
        <>
          {fromSubscribers ? "TopFan's post Lock works by price, loyalty points or NFT, not by membership. " : ""}I've set this post's Lock to <b>Individual Purchase</b>: fans pay once to unlock it. What unlock price would you like? You can also set it in New Post. Nothing changes on your page until you save or publish it there.
        </>
      ),
      plain: "Post Lock set to Individual Purchase (pay to unlock). Asked for the price.",
      body: <WorkCard id={id} />,
      actions: [
        { label: "Set it in New Post", variant: "outline", onClick: () => open(itemById(d(), id)!, "newpost-lock-price") },
        { label: "Prepare a public teaser", variant: "outline", onClick: () => teaser(id) },
      ],
    });
  };
  const teaser = (id: string) => {
    let tid = "";
    if (!run("content.teaser", (y) => void (tid = createTeaser(y, id)))) return;
    say({
      text: "Here's a separate public teaser. It mentions the topic only, nothing from the locked post itself, and points fans to unlock it. It needs its own review before posting.",
      body: <WorkCard id={tid} />,
      actions: [{ label: "Open teaser in New Post", variant: "primary", onClick: () => open(itemById(d(), tid)!) }],
    });
  };

  /* ---- E: newsletters ---- */
  const newsletter = (goal = "Create a newsletter", opts: { fromId?: string; ask?: AudienceAsk } = {}) => {
    const g = goal.toLowerCase();
    const from = opts.fromId ?? (/\b(this|that|it|my (latest|last|new) post)\b/.test(g) && /turn|make|convert|repurpose|from/.test(g) ? focused()?.kind === "post" ? focused()!.id : undefined : undefined);
    if (/\b(this|that) post\b/.test(g) && !from && !recentPosts(d(), 1).length) return say({ text: "Which post? I couldn't find one to start from." });
    let id = "";
    if (!run("content.newsletter", (y) => void (id = createNewsletter(y, goal, { fromId: from })))) return;
    const ask = opts.ask ?? (/\bsubscriber|members\b/.test(g) ? audienceAsk(goal) : /\b(gold|silver|bronze)\b/.test(g) ? audienceAsk(goal) : null);
    if (ask) run("content.audience", (y) => setNewsletterAudience(y, id, ask));
    const x = itemById(d(), id)!;
    const blocked = x.status === "blocked";
    say({
      text: blocked ? "Your newsletter draft is ready, but email sending needs verification. You can save the draft now or fix that setup." : `Here's a newsletter draft from ${from ? "your post" : "your latest posts"}.`,
      body: <WorkCard id={id} />,
      actions: [
        { label: blocked ? "Open and save the draft" : "Open in New Newsletter", variant: "primary", onClick: () => open(itemById(d(), id)!, "monetize-newsletter-save-draft") },
        ...(blocked ? [{ label: "Review email setup", variant: "outline" as const, onClick: () => go("pref-outbound-emails") }] : []),
        { label: "Make it shorter", variant: "text", onClick: () => (run("content.shorten", (y) => void shorten(y, id)), say({ text: "Shorter now.", body: <WorkCard id={id} /> })) },
      ],
    });
  };
  const recipients = () => {
    const x = d();
    say({
      text: "Who you can send newsletters to:",
      body: (
        <ul className="list-disc pl-5 text-[13px]">
          <li>All recipients: {x.monetize.recipients.length}</li>
          {x.monetize.plans.map((p) => (
            <li key={p.id}>
              {p.name} subscribers: {x.monetize.subscribers.filter((s) => s.planId === p.id).length}
            </li>
          ))}
          <li>Groups: {x.prefsB.groups.length ? x.prefsB.groups.length : "none yet"}</li>
          {x.prefsB.outboundEmail.status !== "verified" && <li>Email sending isn't verified yet, so newsletters can be saved as drafts but not sent.</li>}
        </ul>
      ),
    });
  };

  /* ---- F: experiences ---- */
  const experience = (goal = "Plan a fan experience") => {
    if (wantsEvent(goal))
      return say({
        text: "Should fans buy tickets for a set date (Events & Ticketing), or book a time with you (Experience)?",
        choice: { instant: true, options: [{ value: "exp", label: "Book a time with me", recommended: true }, { value: "event", label: "Tickets for a set date" }], onPick: (v) => (v === "event" ? (go("monetize-event-calendar", "monetize-event-add"), say({ text: "Events & Ticketing is where dated, ticketed sessions live. Add the event there." })) : makeExperience(goal.replace(/ticket\w*/gi, ""))) },
      });
    makeExperience(goal);
  };
  const makeExperience = (goal: string) => {
    let id = "";
    if (!run("content.experience", (y) => void (id = createExperience(y, goal)))) return;
    const x = itemById(d(), id)!;
    pending.current = { id, field: "experience-price" };
    say({
      text: <>Here's an experience draft. What price per session would you like? (You decide; I won't set one.) There's no date or capacity to fill in: fans request a booking and you confirm it.</>,
      plain: `Experience draft: ${x.experience!.title}. Asked for the price.`,
      body: <WorkCard id={id} />,
      details: `${x.experience!.similarTo ? `You already offer "${x.experience!.similarTo}", a similar format. ` : ""}TopFan Experiences have no date or capacity fields: fans request a booking and you confirm it in Wallet › Fulfillment Requests.`,
    });
  };
  const afterPrice = (id: string) => {
    const x = itemById(d(), id)!;
    say({
      status: "done",
      text: `Price set: ${money(x.experience!.price!)}. Ready to open in Add Experience. It starts disabled, so nothing goes live until you enable it and save.`,
      actions: [
        { label: "Open in Add Experience", variant: "primary", onClick: () => open(itemById(d(), id)!, "monetize-product-save") },
        { label: "Prepare an announcement post", variant: "outline", onClick: () => announce(id) },
      ],
    });
  };
  const announce = (id: string) => {
    let pid = "";
    if (!run("content.announce", (y) => void (pid = createAnnouncement(y, id)))) return;
    const x = itemById(d(), pid)!;
    say({
      text: x.needs.length ? "Here's the announcement. The booking link only works once the experience is saved and enabled, so I've marked that." : "Here's the announcement, linked to your experience.",
      body: <WorkCard id={pid} />,
      actions: [{ label: "Open in New Post", variant: "primary", onClick: () => open(itemById(d(), pid)!) }],
    });
  };
  const requiredDetails = () =>
    say({ text: "To create an experience, TopFan needs: Type of Experience, Title, Description and a Price (or call options with prices for a 1:1 Video Call). A cover image is optional, and you can make it Subscribers only." });

  /* ---- G: the week ---- */
  const week = (goal = "Plan my entire week") => {
    let id = "";
    if (!run("content.week", (y) => void (id = createWeek(y, goal)))) return;
    // "…and promote it in my Link in Bio": a linked update that waits for the same experience to go live.
    if (/\b(promote|link ?in ?bio)\b/i.test(goal))
      run("content.weekBio", (y) => {
        const exp = childrenOf(y, id).find((x) => x.kind === "experience");
        if (!exp) return;
        if (/\bpromote\b/i.test(goal)) createAnnouncement(y, exp.id);
        const b = itemById(y, proposePromote(y, goal, { workId: exp.id }))!;
        b.parentId = id;
        y.content.focusId = id;
      });
    showWeek(id, "Your week is prepared.");
  };
  const showWeek = (id: string, text: string) => {
    const s = weekSummary(d(), id);
    say({
      text,
      plain: `${text} ${s.posts} posts, ${s.newsletters} newsletter, ${s.experiences} experience. ${s.ready} ready, ${s.input} need input, ${s.review} need review.`,
      body: <WeekCard id={id} onOpen={(x) => open(x)} onShow={(x) => showItem(x.id)} onApprove={() => approve(id)} />,
      details: "Approving marks drafts as reviewed. Nothing is posted, sent or activated until you do it on each screen.",
    });
  };
  const approve = (id: string) => {
    let ids: string[] = [];
    run("content.approve", (y) => void (ids = approveReady(y, id)));
    say({ status: "done", text: ids.length ? `Approved ${ids.length}. Nothing has been posted: open each one to save or publish it.` : "Nothing is ready to approve yet: the others need your input or a review first." });
  };
  const showItem = (id: string) => {
    const x = itemById(d(), id);
    if (!x) return;
    run("content.focus", (y) => focus(y, id));
    if (x.kind === "week") return showWeek(id, "Here's your week.");
    if (x.kind === "bio") return bio.show(id, x.status === "needs-input" ? "Your Link in Bio update is waiting for the experience to be saved and enabled." : x.bio?.step === "saved" ? "Your Link in Bio update (saved):" : "Your Link in Bio update:");
    const needsPrice = x.needs.some((n) => /price/i.test(n));
    if (needsPrice) pending.current = { id, field: x.kind === "experience" ? "experience-price" : "lock-price" };
    if (x.needs.some((n) => /loyalty points/i.test(n))) pending.current = { id, field: "lock-points" };
    if (x.needs.some((n) => /contract address/i.test(n))) pending.current = { id, field: "lock-nft" };
    say({
      text: x.flags.length ? `${x.label}: ${x.flags[0]}` : needsPrice ? `${x.label}: what price would you like?` : `${x.label}:`,
      body: <WorkCard id={id} />,
      actions: [
        { label: `Open in ${x.kind === "post" ? "New Post" : x.kind === "newsletter" ? "New Newsletter" : "Add Experience"}`, variant: "primary", onClick: () => open(itemById(d(), id)!) },
        ...(x.flags.length ? [{ label: "Looks fine now", variant: "outline" as const, onClick: () => (run("content.clear", (y) => clearFlags(y, id)), say({ text: "Marked as reviewed." })) }] : []),
      ],
    });
  };
  const currentWeek = () => {
    const f = focused();
    const w = f?.kind === "week" ? f : f?.parentId ? itemById(d(), f.parentId) : [...d().content.items].reverse().find((x) => x.kind === "week" && x.status !== "cancelled");
    return w ?? null;
  };
  const childBy = (w: WorkItem, t: string) => {
    const kids = childrenOf(d(), w.id).filter((x) => x.status !== "cancelled");
    const dm = t.match(DAY_RE);
    if (dm) {
      const day = dayOf(dm[1]);
      const byDay = kids.find((x) => x.day === day);
      if (byDay) return byDay;
    }
    if (/newsletter/.test(t)) return kids.find((x) => x.kind === "newsletter");
    if (/experience|session/.test(t)) return kids.find((x) => x.kind === "experience");
    if (/exclusive|members|locked/.test(t)) return kids.find((x) => x.post?.locked);
    if (/public|training update/.test(t)) return kids.find((x) => x.kind === "post" && !x.post?.locked);
    if (/post/.test(t)) return kids.find((x) => x.kind === "post");
    return null;
  };
  const weekEdit = (t: string, original = t): boolean => {
    const w = currentWeek();
    if (!w) return false;
    if (/\b(pause) (this|my|the) (plan|week)\b/.test(t)) return run("content.pause", (y) => setPaused(y, w.id, true)), say({ text: "Your week is paused. Everything prepared stays as it is." }), true;
    if (/\b(continue|resume|back to|show) (my|the) week\b/.test(t)) return w.status === "paused" && run("content.resume", (y) => setPaused(y, w.id, false)), showWeek(w.id, "Here's your week."), true;
    const mv = t.match(/\bmove (.+?) to (\w+)/);
    if (mv && DAY_RE.test(mv[2])) {
      const x = childBy(w, mv[1]);
      if (!x) return say({ text: "I couldn't tell which item to move. Try \"Move the newsletter to Thursday\"." }), true;
      const day = dayOf(mv[2]);
      if (!run("content.move", (y) => moveTo(y, x.id, day))) return true;
      const flagged = childrenOf(d(), w.id).filter((y) => y.deps.includes(x.id) && y.flags.length);
      say({ status: "done", text: `Moved the ${x.label.toLowerCase()} to ${DAY_NAMES[day]}. Everything else stays as it is.${flagged.length ? ` I flagged the ${flagged.map((y) => y.label.toLowerCase()).join(" and ")} because it mentions it.` : ""}`, body: <WeekCard id={w.id} onOpen={(y) => open(y)} onShow={(y) => showItem(y.id)} onApprove={() => approve(w.id)} /> });
      return true;
    }
    const rn = original.match(/\b(?:rename|retitle) (?:the |my )?(?:experience|session)(?: to| as)? (.+)$|\bchange (?:the |my )?(?:experience|session) (?:title|name) to (.+)$/i);
    if (rn) {
      const x = childrenOf(d(), w.id).find((y) => y.kind === "experience" && y.status !== "cancelled");
      if (!x) return false;
      const title = rn[1] ?? rn[2];
      if (!run("content.renameExperience", (y) => renameExperience(y, x.id, title))) return true;
      const flagged = childrenOf(d(), w.id).filter((y) => y.deps.includes(x.id) && y.flags.length);
      say({ status: "done", text: `Renamed the experience to "${itemById(d(), x.id)!.experience!.title}".${flagged.length ? ` I marked the ${flagged.map((y) => y.label.toLowerCase()).join(", ")} for review because ${flagged.length === 1 ? "it mentions" : "they mention"} it. I didn't change ${flagged.length === 1 ? "it" : "them"} myself.` : ""}`, body: <WeekCard id={w.id} onOpen={(y) => open(y)} onShow={(y) => showItem(y.id)} onApprove={() => approve(w.id)} /> });
      return true;
    }
    if (/\b(remove|cancel|drop|delete) (the |my )?(experience|session|newsletter|.*post)\b/.test(t)) {
      const x = childBy(w, t);
      if (!x) return false;
      if (["published", "sent", "active"].includes(x.status)) return say({ text: `The ${x.label.toLowerCase()} is already live, so I won't remove it from here. Change it on its own page.` }), true;
      run("content.cancel", (y) => cancelItem(y, x.id));
      const flagged = childrenOf(d(), w.id).filter((y) => y.deps.includes(x.id) && y.flags.length);
      say({ status: "done", text: `Removed the ${x.label.toLowerCase()}. The rest of your week is unchanged.${flagged.length ? ` The ${flagged.map((y) => y.label.toLowerCase()).join(" and ")} mentioned it, so it's marked for review.` : ""}` });
      return true;
    }
    if (/\b(silver|bronze|gold)\b/.test(t) && /\b(exclusive|members|locked) post\b/.test(t)) {
      const x = childBy(w, "exclusive");
      if (x) run("content.focus", (y) => focus(y, x.id));
      audience(audienceAsk(t) ?? { kind: "locked" });
      return true;
    }
    if (/\b(shorter|trim)\b/.test(t) && /newsletter|post|experience/.test(t)) {
      const x = childBy(w, t);
      if (!x) return false;
      run("content.shorten", (y) => void shorten(y, x.id));
      say({ status: "done", text: `Shorter now. Only the ${x.label.toLowerCase()} changed.`, body: <WorkCard id={x.id} /> });
      return true;
    }
    if (/\b(another|different) (image|photo)\b/.test(t)) {
      const x = childBy(w, t) ?? childrenOf(d(), w.id).find((y) => y.media);
      if (!x) return false;
      run("content.focus", (y) => focus(y, x.id));
      run("content.media", (y) => rejectMedia(y, x.id));
      showLibrary();
      return true;
    }
    if (/\bapprove\b/.test(t)) return approve(w.id), true;
    return false;
  };

  /* ---- continuity ---- */
  const continueTask = (t: string) => {
    const items = d().content.items.filter((x) => !["cancelled", "published", "sent", "active"].includes(x.status));
    const pick = /link|bio/.test(t) ? items.filter((x) => x.kind === "bio") : /newsletter/.test(t) ? items.filter((x) => x.kind === "newsletter") : /experience|session/.test(t) ? items.filter((x) => x.kind === "experience") : /gold|locked|exclusive|members/.test(t) ? items.filter((x) => x.post?.locked) : /post/.test(t) ? items.filter((x) => x.kind === "post") : items.filter((x) => x.kind === "week");
    const x = pick[pick.length - 1];
    if (!x) return say({ text: "I couldn't find one in progress. Want to start a new one?" }), true;
    showItem(x.id);
    return true;
  };

  /* ---- the router ---- */
  const route = (raw: string) => {
    if (!inScope("content")) return false;
    const t = raw.toLowerCase().replace(/[’']/g, "'").trim();
    // A price the assistant asked for.
    const p = pending.current;
    if (p?.field === "lock-points") {
      const pts = t.match(/^(\d+(?:\.\d+)?)\s*(loyalty\s+)?(points?|pts)?\.?$/);
      if (pts) {
        if (!run("content.lockPoints", (y) => setLockPoints(y, p.id, Number(pts[1])))) return true;
        pending.current = null;
        const n = Number(pts[1]);
        say({ status: "done", text: `Loyalty Points set: fans unlock it with ${n} point${n === 1 ? "" : "s"}. It's prefilled when you open the post in New Post; it only applies once you save or publish it there.`, body: <WorkCard id={p.id} />, actions: [{ label: "Open in New Post", variant: "primary", onClick: () => open(itemById(d(), p.id)!, "newpost-lock") }] });
        return true;
      }
    }
    if (p?.field === "lock-nft") {
      const raw0 = raw.trim().replace(/[.,;]$/, "");
      const addr = raw0.match(/\b0x[0-9a-zA-Z]+\b/)?.[0] ?? (/^\S{16,}$/.test(raw0) ? raw0 : null);
      if (addr) {
        if (!NFT_CONTRACT_RE.test(addr)) return say({ status: "problem", text: "That doesn't look like an NFT contract address. It should be 0x followed by 40 characters (0–9, a–f). Paste it again, or set it in New Post." }), true;
        if (!run("content.lockNft", (y) => setLockNft(y, p.id, addr))) return true;
        pending.current = null;
        say({ status: "done", text: `NFT contract added: only holders of ${shortContract(addr)} can unlock it. I only checked the format, not the contract itself. It's prefilled when you open the post in New Post; it only applies once you save or publish it there.`, body: <WorkCard id={p.id} />, actions: [{ label: "Open in New Post", variant: "primary", onClick: () => open(itemById(d(), p.id)!, "newpost-lock") }] });
        return true;
      }
    }
    const num = t.match(/^\$?\s*(\d+(?:\.\d{1,2})?)\s*(dollars|usd|\$)?(\s+(per|a|each)\s+\w+)?\.?$/);
    if (p && (p.field === "experience-price" || p.field === "lock-price") && (num || /^free\b/.test(t))) {
      const price = num ? Number(num[1]) : 0;
      const ok = run(p.field === "experience-price" ? "content.price" : "content.lockPrice", (y) => (p.field === "experience-price" ? setExperiencePrice(y, p.id, price) : setLocked(y, p.id, price)));
      if (!ok) return true;
      pending.current = null;
      if (p.field === "experience-price") afterPrice(p.id);
      else say({ status: "done", text: `Unlock price set to ${money(price)}. It's applied when you open the post in New Post; nothing is published until you do.`, body: <WorkCard id={p.id} />, actions: [{ label: "Open in New Post", variant: "primary", onClick: () => open(itemById(d(), p.id)!) }] });
      return true;
    }
    if (/^(continue|resume) (my|the) (newsletter|experience|session|post|week|gold post|locked post|link ?in ?bio|.*post)\b/.test(t) && !/\bweek\b/.test(t)) return continueTask(t);
    if (weekEdit(t, raw)) return true;
    if (bio.route(t)) return true;
    if (/\b(don't|do not) want to plan (this|it) every week|plan (this|it) every week|every week automatically|on autopilot|keep (doing|preparing) this/.test(t)) {
      openAutopilot({ screen: "prefs" });
      say({ text: `I can keep preparing a weekly batch for you: ${d().autopilot.strategy.frequency} posts a week from your approved sources, and you only review what needs you. Nothing posts on its own. Adjust it here, or prepare next week's batch (simulated) to see it work.` });
      return true;
    }
    // The flagship: a compound week (several kinds of work, or the whole week),
    // checked before single-item edits: "…an exclusive post for members…" is part of a plan, not a Lock request.
    const kinds = [/\bposts?|content|update\b/, /\bnewsletter\b/, /\bexperience|session\b/, /\bexclusive|members\b/, /\blink ?in ?bio\b/].filter((r) => r.test(t)).length;
    const promoteWeek = /\bplan\b.*\bweek\b/.test(t) && /\b(promote|link ?in ?bio)\b/.test(t) && /\b(experience|session|offering|event)\b/.test(t);
    if (/\b(entire|whole|full) week\b|\bbusy this week\b|plan my whole week|around these activities/.test(t) || promoteWeek || (/\bplan|prepare|organi[sz]e\b/.test(t) && kinds >= 3)) return week(raw), true;
    if (/\bteaser\b/.test(t)) {
      const x = focused();
      if (!x?.post?.locked) return say({ text: "A teaser is for a locked post. Lock a post first, then I'll prepare a public teaser for it." }), true;
      return teaser(x.id), true;
    }
    if (/\b(announce|announcement)\b/.test(t) && !/newsletter/.test(t)) {
      const exp = [...d().content.items].reverse().find((x) => x.kind === "experience" && x.status !== "cancelled");
      if (exp) return announce(exp.id), true;
    }
    if (/\b(darker|lighter|wider|more minimal|minimal|cinematic|remove the background|space for text|change the background)\b/.test(t) && focused()?.media) return revise(t), true;
    if (/\b(generate|create|make|need|add|use)\b.*\b(image|photo|picture|visual|cover)\b|\b(image|photo|visual) for (this|my|the)\b/.test(t) && focused()) {
      if (/\bgenerate|original|new image\b/.test(t)) return generate(), true;
      if (/\bmy photos?|one of my\b/.test(t)) return showLibrary(), true;
      if (/\bupload\b/.test(t)) return upload(), true;
      return mediaChoice(), true;
    }
    const ask = audienceAsk(t);
    if (ask && focused() && /\b(make|only|exclusive|share|lock|unlock|audience|visible|reward|public|available|holders?|let)\b/.test(t) && !/\b(create|write|prepare|draft) (a|an|my)\b/.test(t)) return audience(ask), true;
    if (/\b(shorter|trim it|cut it down)\b/.test(t) && focused()) {
      const x = focused()!;
      run("content.shorten", (y) => void shorten(y, x.id));
      say({ status: "done", text: "Shorter now.", body: <WorkCard id={x.id} /> });
      return true;
    }
    // Page guidance phrases, typed.
    if (/\b(recipient|who (can|will) (get|receive))\b/.test(t) && /newsletter|recipient/.test(t)) return recipients(), true;
    if (/\b(existing|my) (membership )?plans\b/.test(t) && /\b(review|show|list|what are)\b/.test(t)) return actions.plans(), true;
    if (/\bmembership access\b|\bhow does (lock|access) work\b/.test(t)) return actions.membership(), true;
    if (/\bperformance\b|\bwhat (did|does) best\b/.test(t)) return actions.performance(), true;
    if (/\brequired details\b/.test(t)) return requiredDetails(), true;
    if (/\bnewsletter\b/.test(t)) return newsletter(raw), true;
    if (/\b(experience|(training|fan|paid|coaching|private|group) session|coaching|one[- ]on[- ]one|1:1|fan interaction|meet[- ]and[- ]greet|host a)\b/.test(t) && !/\bpost\b/.test(t)) return experience(raw), true;
    if (/\b(create|write|make|prepare|draft|help me (create|write|make))\b.*\b(post|poll|reel|article|update|caption)\b|\bwrite something for\b|^create a post$/.test(t)) return post(raw), true;
    return false;
  };

  const actions: Api = {
    post: (g) => post(g),
    plan: () => openAutopilot({ screen: "plan", step: "intro" }),
    newsletter: (g) => newsletter(g),
    experience: (g) => experience(g),
    week: (g) => week(g),
    media: () => (focused() ? mediaChoice() : say({ text: "Let's start with the post. What's it about?", actions: [{ label: "A training update", variant: "outline", onClick: () => post("Training update") }] })),
    audience: () => (focused() ? audienceChoice() : say({ text: "Posts can be public, or locked so fans pay a price you set to unlock them. Start a post and I'll set it up.", actions: [{ label: "Create a post", variant: "outline", onClick: () => post() }] })),
    recipients,
    requiredDetails,
    membership: () =>
      say({
        text: "How access works: posts are public or locked (fans pay a price you set to unlock). Newsletters can go to everyone, to all subscribers, or to specific plans like Gold. Your plans' benefits are listed on each plan.",
      }),
    plans: () =>
      say({
        text: "Your membership plans:",
        body: (
          <ul className="list-disc pl-5 text-[13px]">
            {d().monetize.plans.map((p) => (
              <li key={p.id}>
                {p.name}: {money(p.prices[0].amount)}/month · {p.subscribers} subscribers
              </li>
            ))}
          </ul>
        ),
      }),
    performance: () => {
      const top = [...d().social.posts].filter((p) => p.status === "published").sort((a, b) => b.views - a.views).slice(0, 3);
      say({ text: "Your most-viewed posts (from your Feed's own numbers):", body: <ul className="list-disc pl-5 text-[13px]">{top.map((p) => <li key={p.id}>{p.text.slice(0, 60)} · {p.views} views, {p.comments} comments</li>)}</ul> });
    },
    show: showItem,
    bioSetup: () => bio.setupIntro(),
    bioPromote: () => bio.promote(),
    bioImprove: () => bio.improve(),
  };
  // Registered on every render (StrictMode mounts twice; the latest closures win), cleared on unmount.
  api = actions;
  handler = route;
  useEffect(() => {
    api = actions;
    handler = route;
    return () => void ((api = null), (handler = null));
  });

  /* ---- read-back: what the original screens did ---- */
  useEffect(
    () =>
      onStoreEvent((e) => {
        if (!e.ok && e.label === "monetize.sendNewsletter")
          say({ status: "problem", text: "That newsletter wasn't sent: email sending isn't verified yet. Your draft is still there.", actions: [{ label: "Review email setup", variant: "outline", onClick: () => go("pref-outbound-emails") }] });
        if (e.ok && /^monetize\.(updatePlan|deletePlan|addPlan)/.test(e.label)) act("content.revalidate", revalidatePlans);
        // Link in Bio: what Save Changes actually saved, or why it didn't.
        if (e.label === "prefsB.saveLinkInBio") {
          const x = [...d().content.items].reverse().find((y) => y.kind === "bio" && y.bio?.step !== "review");
          if (!e.ok) say({ status: "problem", text: `${e.reason} Try Save Changes again when you're ready.`, actions: [{ label: "Try again", variant: "outline", onClick: () => live.current.a.highlight("pref-lib-save") }] });
          else if (x?.bio?.step === "saved" && Date.now() - new Date(x.updatedAt).getTime() < 5000) bioRef.current.saved(x);
        }
        // Flow 4: offer Link in Bio for what the creator just finished, on its own screen.
        if (e.ok) {
          const m = d().monetize.products;
          const newest = (k: string) => m.filter((p) => p.kind === k).at(-1);
          const linkedBio = (productId?: string) => d().content.items.find((y) => y.kind === "bio" && y.bio?.links.some((l) => l.refId === productId) && y.status !== "cancelled");
          if (e.label === "monetize.addExperience") {
            const p = newest("experience");
            const waiting = p && linkedBio(p.id);
            if (waiting) bioRef.current.show(waiting.id, "Your experience is live, so the Link in Bio update you planned has its booking link now.");
            else if (p?.published) bioRef.current.offer("experience", p.id);
          }
          if (e.label === "monetize.addCourse" && newest("course")?.published) bioRef.current.offer("course", newest("course")!.id);
          if (e.label === "monetize.addPlan") bioRef.current.offer("membership");
          if (e.label === "monetize.saveNewsletterDraft") bioRef.current.offer("newsletter");
          if (e.label === "social.publishPost") {
            const w = [...d().content.items].reverse().find((y) => y.kind === "post" && y.status === "published" && y.ref?.postId);
            if (w && !w.post?.locked) bioRef.current.offer("post", w.ref!.postId);
          }
        }
      }),
    [],
  );

  // On the original screen with a prepared item: one short line (not on every navigation).
  const shown = useRef<string | null>(null);
  useEffect(() => {
    const work = new URLSearchParams(window.location.search).get("work");
    if (!work || shown.current === work) return;
    const x = itemById(d(), work);
    if (!x) return;
    shown.current = work;
    const where = resolve(path).route.id;
    if (where === "pref-link-in-bio-edit" && x.kind === "bio") return void live.current.a.highlight("pref-lib-save");
    if (!["newpost", "monetize-newsletter-new", "monetize-experience-add"].includes(where)) return;
    say({
      text: x.kind === "post" ? `Your ${x.label.toLowerCase()} is filled in. Edit anything; publishing is your click.` : x.kind === "newsletter" ? "Your newsletter is filled in. Save it as a draft; sending needs verified email." : "Your experience is filled in and set to Disable. Enable it and save when you're ready.",
    });
  }, [path]);

  return null;
}

/* ---------------- panel pieces ---------------- */

const Pill = ({ children, tone = "soft" }: { children: ReactNode; tone?: "soft" | "warn" | "ok" }) => (
  <span className={`rounded-pill px-2 py-0.5 text-[11px] ${tone === "warn" ? "bg-accent/15 text-accent" : tone === "ok" ? "bg-white/10 text-white" : "bg-bg text-soft"}`}>{children}</span>
);
const tone = (s: WorkStatus) => (["needs-input", "review", "blocked", "failed"].includes(s) ? "warn" : ["approved", "saved", "published", "sent", "active"].includes(s) ? "ok" : "soft");

/** One work item, compact and live (reads the store). */
export function WorkCard({ id }: { id: string }) {
  const x = useData((d) => itemById(d, id));
  const data = useData((d) => d);
  if (!x) return null;
  const body = x.post ? (x.post.type === "poll" ? `${x.post.text}\n${(x.post.pollOptions ?? []).map((o) => `• ${o}`).join("\n")}` : x.post.text) : x.newsletter ? x.newsletter.body : x.experience?.description ?? "";
  const title = x.post?.title ?? x.newsletter?.title ?? x.experience?.title;
  return (
    <div data-testid="content-card" data-kind={x.kind} data-status={x.status} className="mt-1 rounded-inner bg-bg px-3 py-2.5 text-[13px]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-bold">{x.kind === "post" ? `${TYPE_LABEL[x.post!.type] ?? x.post!.type} post` : KIND[x.kind]}</span>
        <Pill>Draft</Pill>
        {x.status !== "draft" && <Pill tone={tone(x.status)}>{STATUS[x.status]}</Pill>}
        {x.editedByCreator && <Pill>Edited by you</Pill>}
      </div>
      {title && <p className="mt-1.5 font-bold">{title}</p>}
      <p className="mt-1 line-clamp-4 whitespace-pre-line">{body}</p>
      {x.experience && <p className="mt-1 text-soft">{x.experience.experienceType} · {x.experience.price != null ? money(x.experience.price) : "Price: you decide"}</p>}
      {x.media ? (
        <figure className="mt-2 overflow-hidden rounded-tile" data-testid="content-card-media">
          <img src={mediaSrc(x.media.key) ?? ""} alt={x.media.label} className="h-24 w-full object-cover" />
          <figcaption className="py-1 text-[11px] text-soft">{x.media.origin === "generated" ? "AI image (simulated)" : x.media.origin === "library" ? `Your photo: ${x.media.label}` : x.media.label}</figcaption>
        </figure>
      ) : (
        x.mediaNeed && <p className="mt-1.5 text-[12px] text-soft">Image: {x.mediaNeed.toLowerCase()} (not chosen yet)</p>
      )}
      <p className="mt-1.5 text-[12px] text-soft" data-testid="content-card-audience">
        Audience: {audienceLine(data, x)}
        {x.suggestedAt ? ` · Suggested: ${fmtTime(x.suggestedAt)}` : ""}
      </p>
      <p className="mt-0.5 text-[11px] text-soft">From: {x.sources.map((s) => s.label).join(" · ") || "Your request"}</p>
      {[...x.needs, ...x.flags].map((n) => (
        <p key={n} className="mt-1 text-[12px] text-accent">
          {n}
        </p>
      ))}
    </div>
  );
}

/** The week: counts, then one row per item with its status (compact, not a calendar). */
function WeekCard({ id, onOpen, onShow, onApprove }: { id: string; onOpen: (x: WorkItem) => void; onShow: (x: WorkItem) => void; onApprove: () => void }) {
  const kids = useData((d) => childrenOf(d, id));
  const s = useData((d) => weekSummary(d, id));
  const w = useData((d) => itemById(d, id));
  if (!w) return null;
  const order = (x: WorkItem) => ((x.day ?? 7) + 6) % 7;
  return (
    <div data-testid="content-week" data-status={w.status} className="mt-1 rounded-inner bg-bg px-3 py-2.5 text-[13px]">
      <p className="text-soft" data-testid="content-week-counts">
        {s.posts} post{s.posts === 1 ? "" : "s"} · {s.newsletters} newsletter · {s.experiences} experience{s.links ? ` · ${s.links} Link in Bio update` : ""} — {s.ready} ready, {s.input} need input, {s.review} need review{s.approved ? `, ${s.approved} approved` : ""}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {[...kids].sort((a, b) => order(a) - order(b)).map((x) => (
          <li key={x.id} data-testid="content-week-item" data-kind={x.kind} data-status={x.status} className={`flex items-center gap-2 ${x.status === "cancelled" ? "opacity-50" : ""}`}>
            <span className="w-9 shrink-0 text-[11px] font-bold uppercase text-soft">{x.day != null ? DAY_NAMES[x.day].slice(0, 3) : ""}</span>
            <button className="min-w-0 flex-1 truncate text-left hover:text-accent" onClick={() => onShow(x)}>
              {x.label}
            </button>
            <Pill tone={tone(x.status)}>{x.flags.length && x.status !== "blocked" ? "Needs review" : STATUS[x.status]}</Pill>
            {x.status !== "cancelled" && (
              <button className="text-[12px] font-bold text-accent" onClick={() => onOpen(x)} aria-label={`Open ${x.label}`}>
                Open
              </button>
            )}
          </li>
        ))}
      </ul>
      {s.ready > 0 && (
        <button data-testid="content-week-approve" onClick={onApprove} className="mt-2.5 h-[30px] rounded-full border border-accent px-3 text-[12px] font-black uppercase tracking-caps text-accent hover:bg-accent-tint">
          Approve {s.ready} ready
        </button>
      )}
    </div>
  );
}

function MediaPick({ options, onPick, simulated }: { options: WorkMedia[]; onPick: (m: WorkMedia) => void; simulated?: boolean }) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="mt-1 grid grid-cols-2 gap-2" data-testid="content-media-pick">
      {options.map((m) => (
        <button key={m.key} disabled={!!picked} onClick={() => (setPicked(m.key), onPick(m))} className={`overflow-hidden rounded-tile border text-left ${picked === m.key ? "border-accent" : "border-line hover:border-accent"} disabled:cursor-default`} data-testid="content-media-option">
          <img src={mediaSrc(m.key) ?? ""} alt={m.label} className="h-20 w-full object-cover" />
          <span className="block px-2 py-1 text-[11px]">
            {m.direction ?? m.label}
            {simulated && <span className="text-soft"> · simulated</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

function Draftish({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-1 rounded-inner bg-bg px-3 py-2">
      <p className="text-[11px] text-soft">{label}</p>
      <p className="mt-0.5 text-[12px]">{value}</p>
    </div>
  );
}
