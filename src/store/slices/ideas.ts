/**
 * Demo 2 creative ideas: 3–4 concepts for a post, an experience or a newsletter, built only from what
 * the creator already has in TopFan (approved notes, trick list, fan questions, recent posts, existing
 * offerings). Picking one prepares a complete draft (text + a cover image) as a content work item,
 * which the original New Post / Create Experiences / New Newsletter screens open prefilled.
 *
 * Nothing here invents news, dates, prices, bookings or achievements: unknowns stay in [brackets] or
 * are listed as "needs". Images are pre-made sample photos labelled "AI-generated image" (no image service is connected).
 */
import type { AppData } from "../store";
import { Refused } from "../refused";
import catalog from "../../media/assets.json";
import { checkEmail, createPost, itemById, nid, now, shorten, touch, type ID, type PostTopic, type WorkItem, type WorkMedia } from "./content";

export type IdeaKind = "post" | "experience" | "newsletter";
export interface Idea {
  id: string;
  kind: IdeaKind;
  title: string;
  /** One line for the card. */
  line: string;
  /** Experience type / post type / newsletter purpose, as a short tag. */
  tag: string;
  image: string;
}
interface ExperienceIdea extends Idea {
  type: string; // stored EXPERIENCE_TYPE_OPTIONS value
  benefit: string;
  steps: string[];
  duration?: string;
}
interface NewsletterIdea extends Idea {
  /** The creator's goal for it (shown to the creator, never to fans). */
  purpose: string;
  /** Fan-facing opening line. */
  intro: string;
  sections: { h: string; p: string }[];
  cta: string;
}
interface PostIdea extends Idea {
  topic: PostTopic;
}

const fact = (d: AppData, id: string, i: number) => d.autopilot.sources.find((s) => s.id === id)?.facts[i] ?? "";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const offer = (d: AppData, id: string) => d.monetize.products.find((p) => p.id === id && p.published);

/* ------------------------------------------------------------------ the concepts */

function experienceIdeas(d: AppData, round: number): ExperienceIdea[] {
  const trick = fact(d, "src-tricks", 0) || "your next trick";
  const rounds: ExperienceIdea[][] = [
    [
      { id: "exp-coach-call", kind: "experience", title: "1:1 Riding Technique Coaching Call", line: "A live call to work on one trick or habit together.", tag: "One to One Call", image: "experiences/video-call", type: "1:1 Video Call", duration: "30 Minutes",
        benefit: "Fans get coaching on their own riding, from what I'm practicing myself.", steps: ["Quick intro: what you're working on", `Breakdown of the technique (I'm on the ${trick} right now)`, "Two drills to practice next session", "Your questions"] },
      { id: "exp-video-review", kind: "experience", title: "Personalized Riding Technique Review", line: "Send a clip; get a recorded breakdown back.", tag: "Personalized Video", image: "experiences/personal-video", type: "Personalized Video",
        benefit: "Fans get specific feedback on their own clip without booking a time.", steps: ["You send a short clip of your riding", "I record a video with what to keep and what to change", "One drill to try next time"] },
      { id: "exp-bts-qa", kind: "experience", title: "Behind-the-Scenes Training Q&A", line: "Ask me anything about how I train and film.", tag: "Custom Experience", image: "generated/training-cinematic", type: "Other",
        benefit: "Fans see how a season of training and filming actually works.", steps: [`How I'm ${fact(d, "src-notes", 2) || "filming this season"}`, "What a training day looks like", "Your questions, answered"] },
      { id: "exp-park-session", kind: "experience", title: "In-Person Terrain Park Session", line: "Ride the park with me and work on your style.", tag: "In-Person Meetup", image: "experiences/park-session", type: "In Person Session", duration: "2 Hours",
        benefit: "Fans ride with me and get coaching on the spot.", steps: ["Warm-up laps together", "Feature-by-feature coaching", "Filming a few of your runs"] },
    ],
    [
      { id: "exp-trick-breakdown", kind: "experience", title: `${cap(trick)} Breakdown Call`, line: "A focused call on one trick, start to landing.", tag: "One to One Call", image: "generated/training-dark", type: "1:1 Video Call", duration: "15 Minutes",
        benefit: "Fans get a step-by-step plan for one trick.", steps: ["Approach and setup", "Rotation and spotting the landing", "Common mistakes and how to fix them"] },
      { id: "exp-first-board", kind: "experience", title: "Pick Your First Snowboard: Personal Advice", line: "Personal advice on choosing a first board.", tag: "Personalized Video", image: "posts/nl-new-ride", type: "Personalized Video",
        benefit: `It answers the question fans ask most (${fact(d, "src-qa", 0).replace(/^fans keep asking /, "") || "choosing a board"}).`, steps: ["You tell me your height, level and where you ride", "I record personal advice on board size, shape and flex", "What to look for in the shop"] },
      { id: "exp-social-feedback", kind: "experience", title: "Feedback on Your Riding Post", line: "I comment on your latest riding clip.", tag: "Social Media Follow or Post", image: "experiences/social", type: "Social Media Interaction",
        benefit: "A quick, affordable way for fans to get noticed and get a tip.", steps: ["You share the link to your post", "I watch it and leave a comment with one tip"] },
      { id: "exp-offseason-plan", kind: "experience", title: "Off-Season Training Plan Review", line: "A review of your off-season routine.", tag: "Custom Experience", image: "posts/offseason-training", type: "Other",
        benefit: `Fans asked about this (${fact(d, "src-qa", 1).replace(/^fans asked about /, "") || "off-season training"}).`, steps: ["You send your current routine", "I suggest what to add or change for riding", "[How you'll send it back: video or written notes]"] },
    ],
  ];
  return rounds[round % rounds.length];
}

function newsletterIdeas(d: AppData, round: number): NewsletterIdea[] {
  const recent = [...d.social.posts].filter((p) => p.status === "published").slice(0, 2).map((p) => p.text.replace(/\s*#\w+/g, "").trim());
  const tricks = (d.autopilot.sources.find((s) => s.id === "src-tricks")?.facts ?? []).map(cap);
  const call = offer(d, "exp-video-call");
  const rounds: NewsletterIdea[][] = [
    [
      { id: "nl-week", kind: "newsletter", title: "This Week on the Mountain", line: "A short recap of what you've been up to.", tag: "Weekly recap", image: "posts/nl-snow-report", purpose: "Keep fans close between posts.", intro: "Hi everyone, here's a quick look at my week on the mountain.",
        sections: [{ h: "On the mountain", p: `${cap(fact(d, "src-notes", 1))}, and I'm ${fact(d, "src-notes", 0)}.` }, ...(recent.length ? [{ h: "In case you missed it", p: recent.join(" ") }] : []), { h: "What's next", p: `${cap(fact(d, "src-notes", 2))}. [When fans can expect the first clips.]` }],
        cta: "See the latest on my page." },
      { id: "nl-tricks", kind: "newsletter", title: `${tricks.length} Tricks I'm Working On`, line: "Your current trick list, explained.", tag: "Riding tips", image: "generated/training-cinematic", purpose: "Share what you're learning and teach a little.", intro: "Hi everyone, here are the tricks I'm working on right now, and a tip for each.",
        sections: tricks.map((t) => ({ h: t, p: `[Where you are with the ${t.toLowerCase()} and one tip for fans trying it.]` })), cta: "Reply and tell me which one you want a breakdown of." },
      { id: "nl-bts", kind: "newsletter", title: "Behind the Scenes of My Training", line: "How a training and filming week really goes.", tag: "Behind the scenes", image: "generated/training-minimal", purpose: "Give subscribers something they don't see in the Feed.", intro: "Hi everyone, here's what a training and filming week really looks like.",
        sections: [{ h: "The plan this season", p: `${cap(fact(d, "src-notes", 2))}.` }, { h: "A typical day", p: "[Your training day in a few lines: warm-up, laps, filming, recovery.]" }, { h: "What I'm learning", p: `${cap(fact(d, "src-notes", 0))}. [What's clicking and what isn't yet.]` }],
        cta: "Thanks for following along." },
      { id: "nl-gear", kind: "newsletter", title: "My Gear and Riding Tips", line: "Your setup, and the first-board question fans ask.", tag: "Gear & tips", image: "posts/nl-new-ride", purpose: "Answer what fans keep asking.", intro: "Hi everyone, a lot of you ask about my setup, so here it is, with a few tips.",
        sections: [{ h: "What I'm riding", p: "[Your current board, bindings and boots. Only what you actually use.]" }, { h: "Picking a first board", p: `${cap(fact(d, "src-qa", 0))}. [Your short answer: size, shape, flex.]` }],
        cta: call ? `Want personal advice? Book a call with me: ${call.title}.` : "Reply with your questions." },
    ],
    [
      { id: "nl-qa", kind: "newsletter", title: "You Asked: Fan Q&A", line: "Answers to the questions in your inbox.", tag: "Fan Q&A", image: "posts/nl-welcome", purpose: "Turn fan questions into content.", intro: "Hi everyone, you asked, so here are my answers.",
        sections: (d.autopilot.sources.find((s) => s.id === "src-qa")?.facts ?? []).map((q) => ({ h: cap(q.replace(/^fans (keep asking|asked about) /, "")), p: "[Your answer in your own words.]" })), cta: "Keep the questions coming: just reply." },
      { id: "nl-offerings", kind: "newsletter", title: "Ways to Ride With Me", line: "Your live experiences, in one place.", tag: "Offerings", image: "experiences/park-session", purpose: "Promote what fans can already book.", intro: "Hi everyone, here are the ways you can ride with me right now.",
        sections: d.monetize.products.filter((p) => p.kind === "experience" && p.published).slice(0, 3).map((p) => ({ h: p.title, p: p.description })), cta: "See all experiences in my Store." },
      { id: "nl-season", kind: "newsletter", title: "Season Goals", line: "What you're aiming for this season.", tag: "Season update", image: "generated/training-wide", purpose: "Let fans follow your progress.", intro: "Hi everyone, here's what I'm aiming for this season.",
        sections: [{ h: "Where I'm starting", p: `${cap(fact(d, "src-notes", 1))}.` }, { h: "The goals", p: `${cap(fact(d, "src-notes", 0))}. [Your other goals for the season.]` }], cta: "Follow along on my page." },
    ],
  ];
  return rounds[round % rounds.length];
}

function postIdeas(_d: AppData, round: number): PostIdea[] {
  const rounds: PostIdea[][] = [
    [
      { id: "post-training", kind: "post", title: "Training update", line: "What you're working on this week.", tag: "Images post", image: "generated/training-cinematic", topic: "training" },
      { id: "post-journey", kind: "post", title: "My snowboarding journey", line: "A motivational post about how far you've come.", tag: "Images post", image: "generated/training-minimal", topic: "journey" },
      { id: "post-poll", kind: "post", title: "Fan poll: which trick next?", line: "Let fans vote on what you film first.", tag: "Poll", image: "posts/nl-snow-report", topic: "poll" },
      { id: "post-members", kind: "post", title: "Members-only breakdown", line: "A locked post for paying fans.", tag: "Locked post", image: "generated/training-dark", topic: "exclusive" },
    ],
    [
      { id: "post-qa", kind: "post", title: "Answering a fan question", line: "The first-board question fans keep asking.", tag: "Images post", image: "posts/nl-new-ride", topic: "qa" },
      { id: "post-behind", kind: "post", title: "Behind the scenes", line: "A look at filming this season.", tag: "Images post", image: "generated/training-wide", topic: "behind" },
      { id: "post-article", kind: "post", title: "How I'm training this season", line: "A longer read for fans who want detail.", tag: "Article", image: "posts/nl-welcome", topic: "article" },
    ],
  ];
  return rounds[round % rounds.length];
}

export function ideasFor(d: AppData, kind: IdeaKind, round: number): Idea[] {
  return kind === "experience" ? experienceIdeas(d, round) : kind === "newsletter" ? newsletterIdeas(d, round) : postIdeas(d, round);
}
const findIdea = (d: AppData, kind: IdeaKind, id: string) => [0, 1].flatMap((r) => ideasFor(d, kind, r)).find((x) => x.id === id) ?? null;

/** Show (or show more) ideas: remembered so "use the second option" works after a refresh. */
export function showIdeas(d: AppData, kind: IdeaKind, more = false): Idea[] {
  const cur = d.content.ideas;
  const round = more && cur?.kind === kind ? cur.round + 1 : 0;
  const list = ideasFor(d, kind, round);
  d.content.ideas = { kind, round, ids: list.map((x) => x.id), chosen: cur?.kind === kind ? cur.chosen : {} };
  return list;
}

/* ------------------------------------------------------------------ media */

type Cat = Record<string, { w: number; h: number; alt?: string }>;
const size = (key: string) => (catalog as Cat)[key] ?? { w: 1600, h: 900 };
export const sampleMedia = (key: string, label?: string): WorkMedia => ({ key, label: label ?? (catalog as Cat)[key]?.alt ?? "Sample image", origin: "generated", w: size(key).w, h: size(key).h });

/** One shared pool per content type, matched to that screen's needs (posts ≥1080 px wide; newsletters >450×200). */
const POOL: Record<IdeaKind, string[]> = {
  post: ["generated/training-cinematic", "generated/training-minimal", "generated/training-dark", "generated/training-wide", "posts/nl-snow-report", "posts/nl-welcome"],
  experience: ["experiences/video-call", "experiences/park-session", "experiences/personal-video", "generated/training-cinematic", "generated/training-minimal", "posts/nl-new-ride", "posts/offseason-training"],
  newsletter: ["posts/nl-snow-report", "generated/training-cinematic", "posts/nl-welcome", "generated/training-wide", "posts/nl-new-ride", "posts/nl-austria"],
};
const kindOf = (x: WorkItem): IdeaKind => (x.kind === "experience" ? "experience" : x.kind === "newsletter" ? "newsletter" : "post");

/** Two image options for an item: never its current image or ones it turned down; `round` gives different ones. */
export function imageOptions(x: WorkItem, round = 0): WorkMedia[] {
  const pool = POOL[kindOf(x)].filter((k) => k !== x.media?.key && !x.rejectedMedia?.includes(k));
  const start = (round * 2) % Math.max(pool.length, 1);
  return [...pool.slice(start), ...pool.slice(0, start)].slice(0, 2).map((k) => sampleMedia(k));
}

/* ------------------------------------------------------------------ drafts from an idea */

const blockedByEdits = (x: WorkItem) => {
  if (x.editedByCreator) throw new Refused("You've edited this on the page, so I won't rewrite it. I can prepare a new version alongside it instead.");
};

/** Prepare (or reopen) the draft for an idea. A different idea never replaces an earlier draft. */
export function draftFromIdea(d: AppData, kind: IdeaKind, ideaId: string): ID {
  const idea = findIdea(d, kind, ideaId);
  if (!idea) throw new Refused("That idea isn't in the list any more. Ask me for ideas again.");
  const chosen = d.content.ideas?.chosen ?? {};
  const prev = itemById(d, chosen[ideaId]);
  if (prev && prev.status !== "cancelled") return (d.content.focusId = prev.id);
  let id: ID;
  if (kind === "post") {
    id = createPost(d, idea.title, { topic: (idea as PostIdea).topic });
    const x = itemById(d, id)!;
    if (x.post!.type !== "poll") {
      x.media = sampleMedia(idea.image);
      x.needs = x.needs.filter((n) => !/photo|image/i.test(n));
    }
  } else if (kind === "experience") id = experienceDraft(d, idea as ExperienceIdea);
  else id = newsletterDraft(d, idea as NewsletterIdea);
  if (d.content.ideas) d.content.ideas.chosen = { ...chosen, [ideaId]: id };
  d.content.focusId = id;
  return id;
}

function experienceDraft(d: AppData, idea: ExperienceIdea): ID {
  const scheduled = idea.type === "1:1 Video Call" || idea.type === "In Person Session";
  const description = [`${idea.line} ${idea.benefit}`, `What we'll do:\n${idea.steps.map((s) => `• ${s}`).join("\n")}`, "[Anything fans should prepare or know before booking.]"].join("\n\n");
  const needs = ["Price (you decide; I won't set one)"];
  if (scheduled) needs.push("Your availability: the form starts with weekdays 9 AM–5 PM, so check it");
  if (idea.type === "In Person Session") needs.push("The meetup address (you enter it on the form)");
  if (idea.type === "Other") needs.push("Instructions for fans (what they send you or do after buying)");
  const similar = d.monetize.products.find((p) => p.kind === "experience" && p.experienceType === idea.type);
  const id = nid("w-exp");
  d.content.items.push({
    id,
    kind: "experience",
    goal: idea.title,
    label: idea.title,
    status: "needs-input",
    experience: { experienceType: idea.type, title: idea.title, description, price: null, duration: idea.duration, similarTo: similar?.title },
    media: sampleMedia(idea.image),
    needs,
    flags: [],
    sources: [{ label: "Training notes (Oct)" }, { label: "Fan questions inbox" }, ...(similar ? [{ label: `Your existing experience: ${similar.title}`, ref: similar.id }] : [])],
    deps: [],
    updatedAt: now(),
  });
  return id;
}

export const sectionsToHtml = (intro: string, sections: { h: string; p: string }[], cta: string) => {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return [`<p>${esc(intro)}</p>`, ...sections.map((s) => `<h3>${esc(s.h)}</h3><p>${esc(s.p)}</p>`), `<p><b>${esc(cta)}</b></p>`].join("");
};
const sectionsToText = (intro: string, sections: { h: string; p: string }[], cta: string) => [intro, ...sections.map((s) => `${s.h}\n${s.p}`), cta].join("\n\n");

function newsletterDraft(d: AppData, idea: NewsletterIdea): ID {
  const intro = idea.intro;
  const id = nid("w-nl");
  const item: WorkItem = {
    id,
    kind: "newsletter",
    goal: idea.title,
    label: idea.title,
    status: "draft",
    newsletter: { title: idea.title, body: sectionsToText(intro, idea.sections, idea.cta), html: sectionsToHtml(intro, idea.sections, idea.cta), sections: idea.sections, intro, cta: idea.cta, lock: "Free", audience: "all", planIds: [] },
    media: sampleMedia(idea.image),
    needs: idea.sections.some((s) => /\[/.test(s.p)) ? ["Fill in the [bracketed] parts. Only you know them."] : [],
    flags: [],
    sources: [{ label: "Training notes (Oct)" }, { label: "Trick list" }, { label: "Fan questions inbox" }, { label: "Your recent posts" }],
    deps: [],
    updatedAt: now(),
  };
  if (item.needs.length) item.status = "needs-input";
  checkEmail(d, item);
  d.content.items.push(item);
  return id;
}

/* ------------------------------------------------------------------ refinements */

/** "Make it more premium": a richer offer, still with no invented price or dates. */
export function premium(d: AppData, id: ID): string {
  const x = itemById(d, id);
  if (!x) throw new Refused("Which draft? Ask me for ideas first.");
  blockedByEdits(x);
  if (x.experience) {
    if (!/^Premium /.test(x.experience.title)) x.experience.title = `Premium ${x.experience.title}`.slice(0, 80);
    if (!/Includes a written summary/.test(x.experience.description)) x.experience.description = x.experience.description.replace(/\n\n\[/, "\n\nIncludes a written summary of what we covered and a follow-up check-in. [How long after the session.]\n\n[");
    x.label = x.experience.title;
  } else if (x.newsletter) {
    x.newsletter.title = x.newsletter.title.startsWith("Inside:") ? x.newsletter.title : `Inside: ${x.newsletter.title}`;
    x.label = x.newsletter.title;
  } else if (x.post) {
    x.post.text = x.post.text.replace(/\s*$/, "") + (/\bmembers\b/i.test(x.post.text) ? "" : " [A detail you'd only share with your supporters.]");
  }
  touch(x);
  return x.kind === "experience" ? "a premium version with a written summary and follow-up (you still set the price)" : x.kind === "newsletter" ? "a more exclusive title" : "a members-style detail to fill in";
}

/** "Add a stronger CTA". */
export function strongerCta(d: AppData, id: ID) {
  const x = itemById(d, id);
  if (!x) throw new Refused("Which draft? Ask me for ideas first.");
  blockedByEdits(x);
  const live = d.monetize.products.find((p) => p.kind === "experience" && p.published);
  const cta = x.experience ? "Book now: spots are confirmed one by one, so request yours early." : live ? `Book a session with me: ${live.title}, in my Store.` : "Subscribe so you don't miss the next one.";
  if (x.newsletter) {
    x.newsletter.cta = cta;
    x.newsletter.body = x.newsletter.body.split("\n\n").slice(0, -1).concat(cta).join("\n\n");
    if (x.newsletter.sections && x.newsletter.intro) x.newsletter.html = sectionsToHtml(x.newsletter.intro, x.newsletter.sections, cta);
  } else if (x.experience) {
    x.experience.description = x.experience.description.replace(/\n\n(Book now:[^\n]*)?$/, "") + `\n\n${cta}`;
  } else if (x.post) x.post.text = `${x.post.text.replace(/\s*(Link in my bio\.|Book[^.]*\.)$/, "")} ${live ? "Book a session with me: link in my bio." : "Link in my bio."}`;
  touch(x);
}

/** "Change the experience to a one-to-one call" (or another supported type). */
export function changeExperienceType(d: AppData, id: ID, type: string) {
  const x = itemById(d, id);
  if (!x?.experience) throw new Refused("There's no experience draft to change. Ask me for experience ideas first.");
  blockedByEdits(x);
  x.experience.experienceType = type;
  if (type === "1:1 Video Call") x.experience.duration = x.experience.duration ?? "30 Minutes";
  x.needs = x.needs.filter((n) => !/address|availability|Instructions/i.test(n));
  if (type === "1:1 Video Call" || type === "In Person Session") x.needs.push("Your availability: the form starts with weekdays 9 AM–5 PM, so check it");
  if (type === "In Person Session") x.needs.push("The meetup address (you enter it on the form)");
  if (type === "Other") x.needs.push("Instructions for fans (what they send you or do after buying)");
  touch(x);
}

/** "Make it shorter", keeping a headed newsletter's sections formatted for the editor. */
export function shortenDraft(d: AppData, id: ID) {
  const x = itemById(d, id);
  if (x) blockedByEdits(x);
  shorten(d, id);
  const n = x?.newsletter;
  if (n?.sections && n.intro) n.html = sectionsToHtml(n.intro, n.sections, n.cta ?? "");
}
