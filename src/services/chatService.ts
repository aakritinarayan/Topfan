/**
 * Talks to /api/chat (server/chat.ts). The browser never sees the model API key.
 */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ProposedAction {
  name: string;
  input: Record<string, unknown>;
}

export type ChatErrorCode =
  | "not_configured"
  | "auth"
  | "busy"
  | "timeout"
  | "network"
  | "unavailable"
  | "bad_request"
  | "refusal"
  | "server"
  | "aborted";

export class ChatError extends Error {
  constructor(
    public code: ChatErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export async function getChatStatus(): Promise<{ configured: boolean }> {
  try {
    const r = await fetch("/api/chat", { method: "GET" });
    if (!r.ok) return { configured: false };
    return await r.json();
  } catch {
    return { configured: false };
  }
}

const FIRST_BYTE_MS = 25_000;
const IDLE_MS = 30_000;

/**
 * Stream one answer. Resolves when the answer is complete; throws ChatError otherwise.
 * `signal` cancels (Stop button, reset).
 */
export async function streamChat(
  req: { history: ChatTurn[]; message: string; context: unknown },
  on: { text: (t: string) => void; action: (a: ProposedAction) => void },
  signal: AbortSignal,
): Promise<void> {
  const ctl = new AbortController();
  let timedOut = false;
  let watchdog = setTimeout(() => ((timedOut = true), ctl.abort()), FIRST_BYTE_MS);
  const kick = () => {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => ((timedOut = true), ctl.abort()), IDLE_MS);
  };
  const onAbort = () => ctl.abort();
  signal.addEventListener("abort", onAbort);

  try {
    let res: Response;
    try {
      res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        signal: ctl.signal,
      });
    } catch {
      throw abortedOr(signal, timedOut, new ChatError("network", "Couldn't reach the assistant."));
    }
    if (!res.body) throw new ChatError("server", "Something went wrong on our side.");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let finished = false;
    for (;;) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch {
        throw abortedOr(signal, timedOut, new ChatError("network", "The connection dropped."));
      }
      if (chunk.done) break;
      kick();
      buf += decoder.decode(chunk.value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let ev: { type: string; text?: string; name?: string; input?: Record<string, unknown>; code?: ChatErrorCode; message?: string };
        try {
          ev = JSON.parse(line);
        } catch {
          continue;
        }
        if (ev.type === "text" && ev.text) on.text(ev.text);
        else if (ev.type === "action" && ev.name) on.action({ name: ev.name, input: ev.input ?? {} });
        else if (ev.type === "error") throw new ChatError(ev.code ?? "server", ev.message ?? "Something went wrong.");
        else if (ev.type === "done") finished = true;
      }
    }
    if (!finished) {
      if (!res.ok) throw new ChatError(res.status === 503 ? "not_configured" : "server", "The assistant isn't available.");
      throw new ChatError("network", "The answer was cut off.");
    }
  } finally {
    clearTimeout(watchdog);
    signal.removeEventListener("abort", onAbort);
  }
}

function abortedOr(signal: AbortSignal, timedOut: boolean, err: ChatError) {
  if (signal.aborted) return new ChatError("aborted", "Stopped.");
  if (timedOut) return new ChatError("timeout", "The answer took too long.");
  return err;
}
