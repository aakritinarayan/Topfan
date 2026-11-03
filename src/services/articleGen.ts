/**
 * New Post › Article › "Insert AI Generated Content". Reuses the app's existing generation paths
 * instead of a separate AI system:
 * - Text: the /api/chat model proxy in "article" mode (server/chat.ts; the key stays on the server),
 *   grounded in the same approved facts Content Autopilot uses. When no model is configured or it
 *   fails, the draft is prepared from the creator's own notes (as the Demo 2 content assistant does),
 *   with [brackets] for anything only the creator knows. The result always says which path ran.
 * - Images: the demo's simulated visuals (original artwork, not photos of the creator), labelled.
 * Nothing is saved or published here: the editor's draft changes, and PUBLISH NOW stays the creator's.
 */
import { getData } from "../store/store";
import { GENERATED } from "../store/slices/content";
import { mediaSrc } from "../media";
import { ChatError, getChatStatus, streamChat } from "./chatService";

export const AI_TYPES = ["Full Article Text", "Full Article Text with Images", "Specific Text Snippet", "Single Image"] as const;
export type AiType = (typeof AI_TYPES)[number];

export interface AiImage {
  name: string;
  src: string;
  alt: string;
}
export interface AiResult {
  /** "model" = written by the connected AI model · "notes" = prepared from the creator's notes. */
  source: "model" | "notes";
  title?: string;
  /** Editor HTML to insert at the caret (text and/or images). */
  html: string;
  cover?: AiImage;
  /** One plain sentence for the creator: what was inserted and how it was made. */
  note: string;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const SIM = "Simulated AI visual: original artwork, not a photo of you";

function visuals(): AiImage[] {
  return GENERATED.training
    .map((g) => ({ name: `${g.label} (simulated).webp`, src: mediaSrc(g.key) ?? "", alt: `${g.label}. ${SIM}` }))
    .filter((x) => x.src);
}
const figure = (img: AiImage) => `<p><img src="${esc(img.src)}" alt="${esc(img.alt)}" style="width:100%;max-height:340px;object-fit:cover;border-radius:12px"></p><p><em>${esc(SIM)}.</em></p>`;

/** Plain text (paragraphs, "## " subheadings) → editor HTML. */
function toHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => (b.startsWith("## ") ? `<h3>${esc(b.slice(3))}</h3>` : `<p>${esc(b).replace(/\n/g, "<br>")}</p>`))
    .join("");
}

/** Short title from the creator's own description (no invented claims). */
function titleFrom(prompt: string): string {
  const t = prompt.replace(/^(write|create|generate|make|draft)\s+(me\s+)?(an?\s+)?(article|post|piece)?\s*(about|on)?\s*/i, "").replace(/[.!?].*$/s, "").trim();
  const words = t.split(/\s+/).slice(0, 9).join(" ");
  return words ? cap(words).slice(0, 70) : "How I'm training this season";
}

/** Draft from the creator's notes (the same approved facts the content assistant uses). */
function fromNotes(type: AiType, prompt: string): string {
  const facts = getData().autopilot.sources;
  const f = (id: string, i: number) => facts.find((s) => s.id === id)?.facts[i] ?? "";
  const about = prompt.trim().replace(/\s+/g, " ").slice(0, 160);
  if (type === "Specific Text Snippet")
    return `${cap(f("src-notes", 1))}, and I'm ${f("src-notes", 0)}. [Add the part about: ${about}]`;
  return [
    `${cap(f("src-notes", 1))}, and I'm ${f("src-notes", 0)}. ${cap(f("src-notes", 2))}, so there's a lot to share.`,
    `## What I'm working on`,
    `Right now it's the ${f("src-tricks", 0)}, with the ${f("src-tricks", 1)} and ${f("src-tricks", 2)} next on my list. [What a typical session looks like for you.]`,
    `## ${titleFrom(prompt)}`,
    `[${titleFrom(prompt)}: the details only you know.]`,
    `## You asked`,
    `A lot of you have asked about ${f("src-qa", 1).replace(/^fans asked about /, "")}. [Your answer in your own words.]`,
  ].join("\n\n");
}

async function fromModel(type: AiType, prompt: string, wantTitle: boolean, signal: AbortSignal): Promise<string | null> {
  const d = getData();
  let text = "";
  await streamChat(
    {
      history: [],
      mode: "article",
      message: prompt,
      context: {
        contentType: type === "Specific Text Snippet" ? "specific text snippet" : "full article",
        wantTitle,
        approvedFacts: d.autopilot.sources.flatMap((s) => s.facts),
        voiceExamples: d.autopilot.strategy.voiceExamples,
      },
    },
    { text: (s) => (text += s), action: () => {} },
    signal,
  );
  text = text.trim();
  return text && text !== "CANNOT_WRITE" ? text : null;
}

export async function generateArticle(req: { type: AiType; prompt: string; title: boolean; cover: boolean }, signal: AbortSignal): Promise<AiResult> {
  const wantsText = req.type !== "Single Image";
  const imgs = visuals();
  let source: AiResult["source"] = "notes";
  let why = "No AI model is connected to this prototype, so I prepared it from your notes";
  let body = "";
  let title: string | undefined;
  if (wantsText) {
    let text: string | null = null;
    if ((await getChatStatus()).configured) {
      try {
        text = await fromModel(req.type, req.prompt, req.title, signal);
        if (text) source = "model";
        else why = "The AI model couldn't write that without inventing details, so I prepared it from your notes";
      } catch (e) {
        if (e instanceof ChatError && e.code === "aborted") throw e;
        why = `The AI model wasn't available (${e instanceof ChatError ? e.code : "error"}), so I prepared it from your notes`;
      }
    }
    if (text) {
      const m = /^TITLE:\s*(.+)$/m.exec(text);
      if (m) (title = m[1].trim().slice(0, 70)), (text = text.replace(m[0], "").trim());
    } else text = fromNotes(req.type, req.prompt);
    body = toHtml(text);
    if (req.title && !title) title = titleFrom(req.prompt);
  }
  // Images (simulated): inline for "with Images" / "Single Image"; the cover goes to Feed Preview Image.
  let html = body;
  if (req.type === "Single Image" && imgs[0]) html = figure(imgs[0]);
  if (req.type === "Full Article Text with Images" && imgs[0]) {
    const parts = body.split("</p>");
    html = parts.length > 2 ? [...parts.slice(0, 1), figure(imgs[0]).replace(/<\/p>$/, ""), ...parts.slice(1)].join("</p>") : body + figure(imgs[0]);
  }
  const cover = req.cover ? imgs[1] ?? imgs[0] : undefined;
  const bits = [wantsText && (source === "model" ? "Written by the AI model from your notes" : why), (req.type === "Single Image" || req.type === "Full Article Text with Images") && "the image is a simulated visual", cover && "the cover image (simulated) is set as the Feed Preview Image", title && "the title was filled in"].filter(Boolean) as string[];
  const note = `${cap(bits.join("; "))}. Review it before you publish; anything in [brackets] is for you to fill in.`;
  return { source, title, html, cover, note };
}
