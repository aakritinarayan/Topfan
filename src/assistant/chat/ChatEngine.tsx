/**
 * Typed and spoken questions → the language model (via /api/chat) → a streamed answer in the panel.
 *
 * Lives above the panel so an answer keeps streaming while the panel is collapsed, and the
 * conversation survives step changes. Every request carries the app's live state (context.ts).
 *
 * The model can only PROPOSE actions. Each proposal is re-validated here against the current state;
 * anything that changes the form or opens another site waits for the creator's approval.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { dnsProviders } from "../../config/demo";
import { useAssistant } from "../../state/assistantStore";
import { usePlatform, type PlatformState } from "../../state/platformStore";
import { useDomainFinder } from "../../state/domainFinderStore";
import { useQuest } from "../../state/questStore";
import { registrarById } from "../../services/domainService";
import { ChatError, getChatStatus, streamChat, type ChatErrorCode, type ChatTurn, type ProposedAction } from "../../services/chatService";
import { openRegistrar } from "../DomainFinder";
import { HIGHLIGHTABLE, buildContext, historyOf } from "./context";

const ROOT_DOMAIN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})*\.[a-z]{2,}$/i;
const SUBDOMAIN = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/i;

export type ChatStatus = "idle" | "sending" | "streaming";

interface Ctx {
  /** null while checking; false = no model connected (answers are never faked). */
  connected: boolean | null;
  status: ChatStatus;
  ask: (text: string) => void;
  cancel: () => void;
}

const ChatContext = createContext<Ctx | null>(null);

const ERROR_COPY: Record<ChatErrorCode, string> = {
  not_configured:
    "I can't answer typed questions yet: no AI model is connected to this prototype. The cards and the form still work as usual.",
  auth: "I can't reach my AI service right now (its connection isn't set up correctly).",
  busy: "I'm getting a lot of questions right now. Give it a moment and try again.",
  timeout: "That took longer than it should. Want me to try again?",
  network: "I lost the connection while answering. Check your internet and try again.",
  unavailable: "My AI service is having trouble right now. Please try again in a moment.",
  bad_request: "I couldn't process that one. Could you rephrase it?",
  refusal: "I can't help with that one, but I'm happy to help with your setup.",
  server: "Something went wrong on our side. Please try again.",
  aborted: "Stopped.",
};

const FIELD_LABEL: Record<string, string> = {
  hasDomain: "Do you have a domain",
  domainName: "Domain Name",
  provider: "Domain / DNS Provider",
  urlPreference: "URL preference",
  subdomain: "Sub-domain Name",
};
const show = (k: string, v: unknown) =>
  k === "hasDomain" ? (v ? "I already have a Domain Name" : "I don't have a Domain Name") : k === "urlPreference" ? (v === "subdomain" ? "Sub-domain" : "Root domain & www") : String(v ?? "empty");

export function ChatProvider({ children }: { children: ReactNode }) {
  const a = useAssistant();
  const platform = usePlatform();
  const finder = useDomainFinder();
  const quest = useQuest();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [status, setStatus] = useState<ChatStatus>("idle");

  // Async callbacks always read the latest app state ("latest state wins").
  const live = useRef({ a, platform, finder, quest, messages: a.messages });
  live.current = { a, platform, finder, quest, messages: a.messages };
  const inflight = useRef<AbortController | null>(null);

  useEffect(() => {
    getChatStatus().then((s) => setConnected(s.configured));
  }, []);

  /* ---------------- proposed actions: validate, then ask ---------------- */

  const propose = useCallback((p: ProposedAction) => {
    const { a, platform, finder } = live.current;
    const s = platform.state;
    const input = p.input;

    if (p.name === "highlight_field") {
      // Pointing at something changes nothing: no approval needed.
      const f = String(input.field);
      if (HIGHLIGHTABLE.includes(f)) a.highlight(f);
      return;
    }

    if (p.name === "propose_form_update") {
      if (s.screen !== "step1") return;
      const changes = validFormPatch(input, s);
      if (!changes) return;
      const rows = Object.entries(changes);
      const summary = rows.map(([k, v]) => `${FIELD_LABEL[k]}: ${show(k, v)}`).join("; ");
      a.say({
        status: "confirm",
        text: "I can fill this in for you:",
        plain: `Proposed filling Step 1: ${summary}.`,
        body: (
          <dl className="flex flex-col gap-1.5 rounded-tile bg-bg p-3 text-[13px]">
            {rows.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="shrink-0 text-soft">{FIELD_LABEL[k]}</dt>
                <dd className="min-w-0 break-words font-bold">{show(k, v)}</dd>
              </div>
            ))}
          </dl>
        ),
        actions: [
          {
            label: "Fill in the form",
            variant: "primary",
            onClick: () => {
              const { a, platform } = live.current;
              // Re-check against the state at approval time.
              const now = platform.state.screen === "step1" ? validFormPatch(changes, platform.state) : null;
              if (!now) {
                a.say({ text: "The form has changed since I suggested that, so I left it as it is." });
                return;
              }
              platform.patch({ ...now, formErrors: {} });
              Object.keys(now).forEach((k) => a.markDetected(k === "domainName" ? "domain" : k));
              a.logDecision(`Approved filling Step 1: ${summary}`);
              a.say({ status: "done", text: "Filled in. Take a look, and change anything you like.", plain: "Filled in the Step 1 fields." });
              const first = Object.keys(now)[0];
              a.highlight(first === "domainName" ? "domain" : first === "hasDomain" ? "save" : first);
            },
          },
          { label: "Not now", variant: "text", onClick: () => live.current.a.logDecision(`Declined filling Step 1: ${summary}`) },
        ],
      });
      return;
    }

    if (p.name === "start_domain_finder") {
      if (s.screen !== "step1" || finder.live.current.purchased) return;
      a.say({
        text: "Want me to help you find a domain? I'll suggest a few names and check what's available.",
        actions: [
          {
            label: "Help me find a domain",
            variant: "primary",
            onClick: () => {
              const { finder, platform, a } = live.current;
              a.logDecision("Started the guided domain search");
              finder.set({ requested: true });
              platform.patch({ hasDomain: false });
            },
          },
          { label: "Not now", variant: "text", onClick: () => live.current.a.logDecision("Declined the guided domain search") },
        ],
      });
      return;
    }

    if (p.name === "open_registrar") {
      const id = String(input.registrar);
      const reg = registrarById(id);
      if (!reg) return;
      const dom = typeof input.domain === "string" && ROOT_DOMAIN.test(input.domain) ? input.domain.toLowerCase() : null;
      a.say({
        text: dom ? `Want to open ${reg.name} to look at ${dom}? It opens in a new tab.` : `Want to open ${reg.name}? It opens in a new tab.`,
        details: "You'll search and pay on the registrar's own site. I never ask for your passwords or payment details.",
        actions: [
          {
            label: `Open ${reg.name}`,
            variant: "primary",
            onClick: () => {
              const { finder, a } = live.current;
              openRegistrar(id, dom);
              finder.set({ handoff: { domain: dom, registrarId: id, at: Date.now(), away: false, asked: false } });
              a.logDecision(`Opened ${reg.name}${dom ? ` for ${dom}` : ""}`);
            },
          },
          { label: "Not now", variant: "text", onClick: () => live.current.a.logDecision(`Declined opening ${reg.name}`) },
        ],
      });
    }
    // Anything else is ignored: the model can't invent new capabilities.
  }, []);

  /* ---------------- asking ---------------- */

  const runAsk = useCallback(
    async (text: string, replyId: string, history: ChatTurn[]) => {
      const { a, platform, finder, quest } = live.current;
      inflight.current?.abort();
      const ctl = new AbortController();
      inflight.current = ctl;

      const context = buildContext(platform.state, finder.live.current, a.decisions, quest);
      let answer = "";
      let frame = 0;
      const actions: ProposedAction[] = [];
      setStatus("sending");
      a.setMood("generating");

      try {
        await streamChat(
          { history, message: text, context },
          {
            text: (t) => {
              if (!answer) {
                setStatus("streaming");
                live.current.a.setMood("responding");
              }
              answer += t;
              if (!frame)
                frame = requestAnimationFrame(() => {
                  frame = 0;
                  live.current.a.update(replyId, { text: answer, plain: answer });
                });
            },
            action: (p) => actions.push(p),
          },
          ctl.signal,
        );
        cancelAnimationFrame(frame);
        live.current.a.update(replyId, { text: answer || "Here's what I can do.", plain: answer, streaming: false });
        live.current.a.setMood("idle");
        actions.forEach(propose);
      } catch (err) {
        cancelAnimationFrame(frame);
        const e = err instanceof ChatError ? err : new ChatError("server", "");
        const { a } = live.current;
        if (e.code === "aborted") {
          a.update(replyId, { text: answer ? `${answer}\n\n_(Stopped)_` : "Stopped.", plain: answer || "", streaming: false });
          a.setMood("idle");
        } else {
          if (e.code === "not_configured") setConnected(false);
          a.update(replyId, {
            llm: false,
            streaming: false,
            status: "problem",
            text: answer ? `${answer}\n\n${ERROR_COPY[e.code]}` : ERROR_COPY[e.code],
            plain: answer,
            details: e.code === "not_configured" ? "Add ANTHROPIC_API_KEY to the server environment (.env.local) and restart the server." : undefined,
            actions:
              e.code === "not_configured" || e.code === "refusal" || e.code === "bad_request"
                ? undefined
                : [{ label: "Try again", variant: "outline", onClick: () => retry(text) }],
          });
          a.setMood("error");
        }
      } finally {
        if (inflight.current === ctl) {
          inflight.current = null;
          setStatus("idle");
        }
      }
    },
    [propose],
  );

  const retry = useCallback(
    (text: string) => {
      // History up to (not including) the question being retried.
      const turns = historyOf(live.current.messages);
      let cut = turns.length;
      for (let i = turns.length - 1; i >= 0; i--)
        if (turns[i].role === "user" && turns[i].content === text) {
          cut = i;
          break;
        }
      const id = live.current.a.say({ text: "", llm: true, streaming: true });
      void runAsk(text, id, turns.slice(0, cut));
    },
    [runAsk],
  );

  const ask = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      const { a, messages } = live.current;
      const history = historyOf(messages);
      a.userSays(text);
      if (connected === false) {
        a.say({ status: "problem", text: ERROR_COPY.not_configured, details: "Add ANTHROPIC_API_KEY to the server environment (.env.local) and restart the server." });
        // Check again in case the server was configured since.
        getChatStatus().then((s) => setConnected(s.configured));
        return;
      }
      const id = a.say({ text: "", llm: true, streaming: true });
      void runAsk(text, id, history);
    },
    [connected, runAsk],
  );

  const cancel = useCallback(() => inflight.current?.abort(), []);

  // Reset (review bar) clears the conversation: stop any answer in progress.
  useEffect(() => {
    if (a.messages.length === 0) inflight.current?.abort();
  }, [a.messages.length]);

  const value = useMemo(() => ({ connected, status, ask, cancel }), [connected, status, ask, cancel]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/** Keep only valid, actually-different Step 1 values. */
function validFormPatch(input: Record<string, unknown>, s: PlatformState): Partial<PlatformState> | null {
  const out: Partial<PlatformState> = {};
  if (typeof input.hasDomain === "boolean" && input.hasDomain !== s.hasDomain) out.hasDomain = input.hasDomain;
  if (typeof input.domainName === "string" && ROOT_DOMAIN.test(input.domainName) && input.domainName !== s.domainName)
    out.domainName = input.domainName.toLowerCase();
  if (typeof input.provider === "string" && dnsProviders.includes(input.provider) && input.provider !== s.provider) out.provider = input.provider;
  if ((input.urlPreference === "root_domain" || input.urlPreference === "subdomain") && input.urlPreference !== s.urlPreference)
    out.urlPreference = input.urlPreference;
  if (typeof input.subdomain === "string" && SUBDOMAIN.test(input.subdomain) && input.subdomain !== s.subdomain) out.subdomain = input.subdomain.toLowerCase();
  // Domain fields only make sense with "I already have a Domain Name".
  const hasDomainAfter = out.hasDomain ?? s.hasDomain;
  if (!hasDomainAfter) {
    delete out.domainName;
    delete out.provider;
    delete out.urlPreference;
    delete out.subdomain;
  }
  return Object.keys(out).length ? out : null;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside ChatProvider");
  return ctx;
}
