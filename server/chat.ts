/**
 * POST /api/chat: the TopFan Assistant's only server component.
 *
 * Holds the Anthropic API key (ANTHROPIC_API_KEY, from the environment; never sent to the browser),
 * builds the grounded prompt, streams Claude's answer back as NDJSON lines:
 *   {"type":"text","text":"…"}                     answer text, as it is generated
 *   {"type":"action","name":"…","input":{…}}       a PROPOSED action; the app validates it and asks the creator
 *   {"type":"done"}                                 end of answer
 *   {"type":"error","code":"…","message":"…"}       nothing more will follow
 * GET /api/chat returns {"configured": boolean} so the UI can say when no model is connected.
 *
 * Tools are never executed here. The model can only propose; the browser shows an approval card.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dnsProviders, registrars } from "../src/config/demo.js";
import { TOPFAN_KNOWLEDGE } from "./knowledge.js";
import { FEATURES } from "../src/app/agent-context/features.js";
import { TASKS } from "../src/app/agent-context/tasks.js";
import { platformKnowledge } from "../src/app/agent-context/knowledge.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const MAX_TURNS = 30;
const MAX_CHARS = 4000;
const MAX_CONTEXT_CHARS = 20000;
const TIMEOUT_MS = 60_000;

export const FIELDS = ["provider", "domain", "urlPreference", "subdomain", "save", "buy-domain", "verify", "record1-host", "record1-value", "record2-host", "record2-value"];

const SYSTEM = `You are the TopFan Assistant, a companion inside TopFan's creator onboarding. You help one creator set up their White Label Site (their own domain for their TopFan site).

How you talk:
- Plain, warm and short: usually 1–4 sentences, US English. Use a short list only for steps. No headings. Use **bold** sparingly.
- Answer the question that was asked, using the creator's actual setup from <app_state>. Never re-ask something <app_state> already shows.
- Explain technical terms simply when they come up. Give the one next step.
- Latency-sensitive; begin your visible answer immediately.

Truthfulness:
- <app_state> is the live state of the app and always wins over older messages in the conversation. If they disagree, trust <app_state>.
- Only state TopFan facts that are in <topfan_knowledge>. If something isn't covered, say you're not sure and point to Resources › Creator Support or the Help Center & FAQ. Never invent TopFan features, settings, prices or timelines.
- Never claim real-time availability, prices, DNS results or account status beyond what <app_state> says. Values marked simulated are demo data; say so if the creator relies on them.
- This prototype cannot actually change DNS records, buy domains, connect accounts or publish anything. Don't pretend to have done something.
- Never ask for passwords, payment card details or registrar logins. Purchases and DNS edits happen on the registrar's own site.
- For questions unrelated to TopFan or setting up a website, answer briefly if harmless, then steer back to setup.

Actions (tools):
- You can propose an action with a tool. The app shows it to the creator, who approves or declines it. Nothing changes until they approve.
- Only propose an action when it clearly helps with what the creator asked, and only ones listed in <app_state>.availableActions. Don't propose an action that is already done.
- highlight_field just points at something on screen; use it when the creator asks where something is.
- After proposing, don't wait for a result; mention in one short sentence what you've suggested. Your turn ends there.`;

/* ------------------------------ autopilot revise mode ------------------------------ */

/** Content Autopilot: rewrite ONE rejected draft. Text only, no tools; the browser re-runs its
 * deterministic checks (facts, duplicates, length) and parks the draft if the revision fails them. */
const AUTOPILOT_SYSTEM = `You revise one social post draft for a creator on TopFan.
- Return only the revised post text. No quotes, no preface, no hashtags unless the original had them.
- Use only facts in <app_state>.approvedFacts. Never invent experiences, results, dates, places, numbers or quotes.
- Match the creator's voice from <app_state>.voiceExamples and follow <app_state>.preferences.
- Keep it under 400 characters and different from <app_state>.recentPosts.
- If you can't fix it without inventing facts, return exactly: CANNOT_REVISE`;

/* ------------------------------ article mode (New Post › Article › AI) ------------------------------ */

/** "Insert AI Generated Content" in the Article editor. Text only, no tools; the browser inserts the
 * result into the editor's draft, and nothing is published without the creator's own PUBLISH NOW. */
const ARTICLE_SYSTEM = `You write article text for a creator on TopFan, in their voice.
- Follow the creator's description in the user message. <app_state>.contentType says what to write: a full article (4–6 short paragraphs, a couple of "## " subheadings), or a specific text snippet (1–2 paragraphs).
- Use only facts in <app_state>.approvedFacts. Never invent results, sponsors, dates, places, prices, numbers, quotes or engagement figures. Where a detail is needed but unknown, write a short [bracketed placeholder] for the creator to fill in.
- Match the creator's voice from <app_state>.voiceExamples.
- If <app_state>.wantTitle is true, the first line is "TITLE: " followed by a title of at most 70 characters.
- Plain text only: paragraphs separated by a blank line, subheadings start with "## ". No HTML, no preface, no sign-off notes about what you did.
- If the description asks for something you can't write without inventing facts, return exactly: CANNOT_WRITE`;

/* ------------------------------ platform mode ------------------------------ */

const FEATURE_IDS = FEATURES.map((f) => f.id);
const TASK_IDS = TASKS.map((t) => t.id);
/** execute-with-approval actions (src/app/agent-context/actions.ts): the panel shows exactly what will change; it runs only after Approve. */
const APPROVAL_ACTIONS = ["group.add", "tag.add", "automated.add"];
// Same list as AUTOMATED_EVENT_TYPES in src/store/slices/comms.ts (not imported: that module pulls in browser media).
const AUTOMATED_EVENTS = ["Fan Registers", "Fan Purchases Subscription", "Fan Purchases Content Post", "Fan's Birthday"];
const DRAFT_KINDS = ["plan-benefits", "post-idea", "welcome-message", "event-promo", "newsletter", "course-outline", "group-welcome", "fan-segment"];

const PLATFORM_SYSTEM = `You are TopFan AI, the creator's companion inside the TopFan creator platform. You help one creator (or their delegate) get things done in TopFan's existing screens: find features, explain them, guide multi-step goals, prepare drafts, and point out what needs attention.

How you talk:
- Plain, warm and short: usually 1–3 sentences, US English. No headings. A short list only for steps. **Bold** sparingly.
- One question at a time, and only when you truly need the answer. Never ask for something <app_state> already shows.
- At most three suggestions at once; recommend one clear next step.
- Use the creator's words, then name the TopFan feature and where it is (e.g. "Preferences › White Label Site").
- Latency-sensitive; begin your visible answer immediately.

Truthfulness:
- <app_state> is live and always wins over earlier messages. currentPage tells you where the creator is; read their question in that context (on Outbound Emails, "why is it failing?" is about email-domain verification).
- Only state TopFan facts that are in <topfan_knowledge>. If something isn't covered, say you're not sure and suggest Resources › Creator Support or the Help Center & FAQ. Never invent features, settings, prices, numbers or timelines.
- Only mention account facts that appear in <app_state> (needsAttention, currentPage.facts, activeTask). Never invent counts, money, fans or results.
- This is a demo: all data is fictional and nothing real (payments, DNS, emails, wallets) happens. Don't claim you did something you didn't.
- Never ask for passwords, payment card or bank details, or registrar logins.
- Respect user.canDo: if the user's role can't do something, say the account owner can, and don't navigate there.
- If the request is ambiguous between similar features (Wallet vs NFT Wallet, Monetize vs Monetization, Customer Support vs Creator Support vs Help Center, Activity vs Notifications, Groups vs segments, White Label Site vs Link in Bio, Creator Quest vs Gamification), ask one short question unless the context makes it clear. Always ask for money-related ambiguity.
- For questions unrelated to TopFan, answer briefly if harmless, then offer to help with their page.

Actions (tools): the app validates every action; you can only propose.
- If currentPage is already the screen they want, don't navigate: help with the next thing on that page (use highlight_element if the control is in currentPage.highlightable).
- If an activeTask exists and the creator asks to continue, use task_control "resume"/"status" instead of starting over. Never treat a step as done unless activeTask shows it.
- navigate_to_feature opens an existing screen right away. Use it whenever the creator wants to go somewhere or asks where something is, and keep your text to one short sentence.
- show_goal_options: for a broad goal with no specific product ("I want to start earning from my fans", "help me engage my fans"), show the creator up to three ways to do it instead of picking a screen for them. Use it before start_task when the goal is broad.
- start_task starts a guided goal (one of <app_state>.tasks) when the creator states a goal that spans steps ("I want to start earning", "create a VIP group", "fix my email"). The app shows the steps; don't list them all.
- task_control pauses, resumes, cancels, steps back or reports the active task.
- show_attention shows what needs attention (for "what should I focus on?").
- prepare_draft writes a short Draft (post, plan benefits, welcome message…). Use [placeholders] for anything the creator hasn't told you. Drafts are never published by you.
- highlight_element points at something in currentPage.highlightable.
- propose_action asks the creator to approve one small change, shown exactly before it runs: create a group (group.add), add a Topic Tag (tag.add) or add an automated message (automated.add). Use it when the creator asks for one of these by name ("create a group called Inner Circle"); if they didn't give a name, ask for it in one short question. Don't use start_task for these when the creator already gave the details.
- You never publish, send, change prices, approve refunds, grant access, withdraw money, change passwords or DNS, or pause/delete accounts. For those, open the screen; the creator confirms on the page itself.`;

const platformTools: Anthropic.Beta.Messages.BetaTool[] = [
  {
    name: "navigate_to_feature",
    description: "Open an existing TopFan screen for a feature. Navigation only; changes nothing.",
    input_schema: {
      type: "object",
      properties: {
        featureId: { type: "string", enum: FEATURE_IDS },
        params: { type: "object", description: "optional query params, e.g. {tab: 'engagement'}", additionalProperties: { type: "string" } },
      },
      required: ["featureId"],
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
  {
    name: "start_task",
    description: "Start (or resume) a guided multi-step goal through the existing screens.",
    input_schema: { type: "object", properties: { taskId: { type: "string", enum: TASK_IDS } }, required: ["taskId"], additionalProperties: false },
    eager_input_streaming: true,
  },
  {
    name: "task_control",
    description: "Control the active guided task.",
    input_schema: { type: "object", properties: { action: { type: "string", enum: ["pause", "resume", "cancel", "back", "status"] } }, required: ["action"], additionalProperties: false },
    eager_input_streaming: true,
  },
  {
    name: "show_attention",
    description: "Show the creator the most important things that need attention, with buttons.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
    eager_input_streaming: true,
  },
  {
    name: "prepare_draft",
    description: "Show a short draft for the creator to copy and edit. Never published by the assistant.",
    input_schema: {
      type: "object",
      properties: { kind: { type: "string", enum: DRAFT_KINDS }, text: { type: "string", description: "the draft, under 1200 characters; [placeholders] for unknown facts" } },
      required: ["kind", "text"],
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
  {
    name: "show_goal_options",
    description: "Show up to three ways to reach a broad goal (earn from fans, engage fans) as choices; each leads to an existing TopFan screen.",
    input_schema: { type: "object", properties: { goal: { type: "string", enum: ["earn", "engage"] } }, required: ["goal"], additionalProperties: false },
    eager_input_streaming: true,
  },
  {
    name: "propose_action",
    description: "Ask the creator to approve one small change (shown exactly; runs only after they click Approve).",
    input_schema: {
      type: "object",
      properties: {
        actionId: { type: "string", enum: APPROVAL_ACTIONS },
        name: { type: "string", description: "group.add / tag.add: the name the creator gave" },
        description: { type: "string", description: "optional short description" },
        event: { type: "string", enum: AUTOMATED_EVENTS, description: "automated.add only" },
        text: { type: "string", description: "automated.add only: the message, [placeholders] for unknown facts" },
      },
      required: ["actionId"],
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
  {
    name: "highlight_element",
    description: "Briefly highlight a control on the current page (one of currentPage.highlightable). Changes nothing.",
    input_schema: { type: "object", properties: { target: { type: "string" } }, required: ["target"], additionalProperties: false },
    eager_input_streaming: true,
  },
];

const tools: Anthropic.Beta.Messages.BetaTool[] = [
  {
    name: "highlight_field",
    description: "Briefly highlight a field or button on the current screen so the creator can find it. Changes nothing.",
    input_schema: {
      type: "object",
      properties: { field: { type: "string", enum: FIELDS } },
      required: ["field"],
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
  {
    name: "propose_form_update",
    description:
      "Propose filling Step 1 (Domain Information) fields. The creator must approve before anything changes. Only include fields the creator stated or confirmed.",
    input_schema: {
      type: "object",
      properties: {
        hasDomain: { type: "boolean", description: "true = 'I already have a Domain Name'" },
        domainName: { type: "string", description: "root domain, e.g. example.com" },
        provider: { type: "string", enum: dnsProviders },
        urlPreference: { type: "string", enum: ["root_domain", "subdomain"] },
        subdomain: { type: "string", description: "e.g. fans" },
      },
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
  {
    name: "start_domain_finder",
    description: "Offer to start the guided domain search (suggest names, check availability, compare registrars). For creators without a domain.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
    eager_input_streaming: true,
  },
  {
    name: "open_registrar",
    description: "Offer to open a registrar's own website in a new tab so the creator can search for or buy a domain there.",
    input_schema: {
      type: "object",
      properties: {
        registrar: { type: "string", enum: registrars.map((r) => r.id) },
        domain: { type: "string", description: "optional domain to search for" },
      },
      required: ["registrar"],
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
];

/* ------------------------------ request ------------------------------ */

interface Turn {
  role: "user" | "assistant";
  content: string;
}
interface ChatRequest {
  history: Turn[];
  message: string;
  context: unknown;
  mode: "onboarding" | "platform" | "autopilot" | "article";
}

function parseRequest(raw: unknown): ChatRequest | string {
  if (!raw || typeof raw !== "object") return "Invalid request.";
  const r = raw as Record<string, unknown>;
  if (typeof r.message !== "string" || !r.message.trim()) return "Message is required.";
  if (r.message.length > MAX_CHARS) return "Message is too long.";
  const history = Array.isArray(r.history) ? r.history : [];
  const turns: Turn[] = [];
  for (const t of history.slice(-MAX_TURNS)) {
    if (!t || typeof t !== "object") continue;
    const { role, content } = t as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || !content.trim()) continue;
    turns.push({ role, content: content.slice(0, MAX_CHARS) });
  }
  const context = JSON.stringify(r.context ?? {});
  if (context.length > MAX_CONTEXT_CHARS) return "Context is too large.";
  return { history: turns, message: r.message.trim(), context: r.context ?? {}, mode: r.mode === "platform" || r.mode === "autopilot" || r.mode === "article" ? r.mode : "onboarding" };
}

/** Alternate roles strictly (merge neighbors) and start with a user turn, as the API requires. */
function toMessages(req: ChatRequest): Anthropic.Beta.Messages.BetaMessageParam[] {
  const out: Turn[] = [];
  for (const t of req.history) {
    const last = out[out.length - 1];
    if (last && last.role === t.role) last.content += `\n\n${t.content}`;
    else out.push({ ...t });
  }
  while (out.length && out[0].role !== "user") out.shift();
  const latest = `<app_state>\n${JSON.stringify(req.context, null, 1)}\n</app_state>\n\n${req.message}`;
  const last = out[out.length - 1];
  if (last && last.role === "user") last.content += `\n\n${latest}`;
  else out.push({ role: "user", content: latest });
  return out.map((t) => ({ role: t.role, content: t.content }));
}

/* ------------------------------ validation ------------------------------ */

const ROOT_DOMAIN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})*\.[a-z]{2,}$/i;
const SUBDOMAIN = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/i;

/** Server-side check of a proposed action. The browser checks again against the live state. */
export function validateAction(name: string, input: unknown, mode: ChatRequest["mode"] = "onboarding"): Record<string, unknown> | null {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  if (mode === "platform") {
    switch (name) {
      case "navigate_to_feature": {
        if (typeof i.featureId !== "string" || !FEATURE_IDS.includes(i.featureId)) return null;
        const params: Record<string, string> = {};
        if (i.params && typeof i.params === "object")
          for (const [k, v] of Object.entries(i.params as Record<string, unknown>)) if (/^[a-zA-Z]{1,20}$/.test(k) && typeof v === "string" && /^[\w-]{1,40}$/.test(v)) params[k] = v;
        return { featureId: i.featureId, ...(Object.keys(params).length ? { params } : {}) };
      }
      case "start_task":
        return typeof i.taskId === "string" && TASK_IDS.includes(i.taskId) ? { taskId: i.taskId } : null;
      case "task_control":
        return typeof i.action === "string" && ["pause", "resume", "cancel", "back", "status"].includes(i.action) ? { action: i.action } : null;
      case "show_attention":
        return {};
      case "prepare_draft":
        return typeof i.kind === "string" && DRAFT_KINDS.includes(i.kind) && typeof i.text === "string" && i.text.trim() && i.text.length <= 2000 ? { kind: i.kind, text: i.text.trim() } : null;
      case "show_goal_options":
        return i.goal === "earn" || i.goal === "engage" ? { goal: i.goal } : null;
      case "propose_action": {
        const s = (v: unknown, max: number) => (typeof v === "string" && v.trim() && v.trim().length <= max ? v.trim() : undefined);
        if (typeof i.actionId !== "string" || !APPROVAL_ACTIONS.includes(i.actionId)) return null;
        if (i.actionId === "automated.add")
          return typeof i.event === "string" && AUTOMATED_EVENTS.includes(i.event) && s(i.text, 1000) ? { actionId: i.actionId, event: i.event, text: s(i.text, 1000) } : null;
        const name = s(i.name, i.actionId === "group.add" ? 40 : 30);
        return name ? { actionId: i.actionId, name, ...(s(i.description, 200) ? { description: s(i.description, 200) } : {}) } : null;
      }
      case "highlight_element":
        return typeof i.target === "string" && /^[\w-]{1,80}$/.test(i.target) ? { target: i.target } : null;
    }
    return null;
  }
  switch (name) {
    case "highlight_field":
      return typeof i.field === "string" && FIELDS.includes(i.field) ? { field: i.field } : null;
    case "start_domain_finder":
      return {};
    case "open_registrar": {
      if (typeof i.registrar !== "string" || !registrars.some((r) => r.id === i.registrar)) return null;
      if (i.domain != null && (typeof i.domain !== "string" || !ROOT_DOMAIN.test(i.domain))) return { registrar: i.registrar };
      return { registrar: i.registrar, ...(i.domain ? { domain: String(i.domain).toLowerCase() } : {}) };
    }
    case "propose_form_update": {
      const out: Record<string, unknown> = {};
      if (typeof i.hasDomain === "boolean") out.hasDomain = i.hasDomain;
      if (typeof i.domainName === "string") {
        const d = i.domainName.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
        if (!ROOT_DOMAIN.test(d)) return null;
        out.domainName = d;
      }
      if (typeof i.provider === "string") {
        if (!dnsProviders.includes(i.provider)) return null;
        out.provider = i.provider;
      }
      if (i.urlPreference === "root_domain" || i.urlPreference === "subdomain") out.urlPreference = i.urlPreference;
      if (typeof i.subdomain === "string") {
        if (!SUBDOMAIN.test(i.subdomain)) return null;
        out.subdomain = i.subdomain.toLowerCase();
      }
      return Object.keys(out).length ? out : null;
    }
  }
  return null;
}

/* ------------------------------ handler ------------------------------ */

let client: Anthropic | null = null;
const configured = () => !!process.env.ANTHROPIC_API_KEY;

async function readBody(req: IncomingMessage & { body?: unknown }): Promise<unknown> {
  if (req.body !== undefined) return typeof req.body === "string" ? JSON.parse(req.body) : req.body; // Vercel pre-parses
  let data = "";
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 200_000) throw new Error("too large");
  }
  return JSON.parse(data || "{}");
}

function errorFor(err: unknown): { code: string; message: string } {
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError)
    return { code: "auth", message: "The assistant's AI connection isn't set up correctly." };
  if (err instanceof Anthropic.RateLimitError) return { code: "busy", message: "The assistant is busy right now." };
  if (err instanceof Anthropic.APIConnectionTimeoutError) return { code: "timeout", message: "The answer took too long." };
  if (err instanceof Anthropic.APIConnectionError) return { code: "network", message: "Couldn't reach the AI service." };
  if (err instanceof Anthropic.BadRequestError) return { code: "bad_request", message: "That request couldn't be handled." };
  if (err instanceof Anthropic.APIError) return { code: "unavailable", message: "The AI service is having trouble." };
  if (err instanceof Error && err.name === "AbortError") return { code: "timeout", message: "The answer took too long." };
  return { code: "server", message: "Something went wrong on our side." };
}

export async function handleChat(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ configured: configured(), model: configured() ? MODEL : null }));
    return;
  }
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end();
    return;
  }

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  const write = (o: object) => res.write(JSON.stringify(o) + "\n");
  const fail = (code: string, message: string, status = 200) => {
    res.statusCode = status;
    write({ type: "error", code, message });
    res.end();
  };

  if (!configured()) return fail("not_configured", "No AI model is connected to this prototype.", 503);

  let parsed: ChatRequest | string;
  try {
    parsed = parseRequest(await readBody(req));
  } catch {
    parsed = "Invalid request.";
  }
  if (typeof parsed === "string") return fail("bad_request", parsed, 400);

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  // Creator pressed Stop or left: stop generating (and paying) right away.
  res.on("close", () => abort.abort());

  try {
    client ??= new Anthropic({ maxRetries: 2, timeout: TIMEOUT_MS });
    const stream = client.beta.messages.stream(
      {
        model: MODEL,
        max_tokens: parsed.mode === "autopilot" ? 600 : parsed.mode === "article" ? 1800 : 2048,
        system: [
          { type: "text", text: parsed.mode === "autopilot" ? AUTOPILOT_SYSTEM : parsed.mode === "article" ? ARTICLE_SYSTEM : parsed.mode === "platform" ? PLATFORM_SYSTEM : SYSTEM },
          {
            type: "text",
            text: `<topfan_knowledge>\n${parsed.mode === "platform" ? `${platformKnowledge()}\n\n${TOPFAN_KNOWLEDGE}` : TOPFAN_KNOWLEDGE}\n</topfan_knowledge>`,
            cache_control: { type: "ephemeral" },
          },
        ],
        output_config: { effort: "low" },
        ...(parsed.mode === "autopilot" || parsed.mode === "article" ? {} : { tools: parsed.mode === "platform" ? platformTools : tools }),
        messages: toMessages(parsed),
        // On a safety decline, re-run on Anthropic's recommended fallback model instead of failing.
        fallbacks: "default",
        betas: ["server-side-fallback-2026-07-01"],
      },
      { signal: abort.signal },
    );
    res.statusCode = 200;
    stream.on("text", (text) => write({ type: "text", text }));
    const final = await stream.finalMessage();

    if (final.stop_reason === "refusal") {
      write({ type: "error", code: "refusal", message: "I can't help with that one, but I'm happy to help with your setup." });
      res.end();
      return;
    }
    // A tool call cut off by max_tokens may look valid but be incomplete: never forward it.
    if (final.stop_reason !== "max_tokens") {
      for (const block of final.content) {
        if (block.type !== "tool_use") continue;
        const input = validateAction(block.name, block.input, parsed.mode);
        if (input) write({ type: "action", name: block.name, input });
      }
    }
    write({ type: "done" });
    res.end();
  } catch (err) {
    if (res.writableEnded || res.destroyed) return;
    const e = errorFor(err);
    if (!(err instanceof Anthropic.APIError)) console.error("[api/chat]", err);
    fail(e.code, e.message);
  } finally {
    clearTimeout(timer);
  }
}
