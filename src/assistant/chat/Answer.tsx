/**
 * A model-written answer: light markdown (paragraphs, lists, **bold**, _italic_, `code`) rendered as
 * React text (never as HTML), a typing caret while streaming, and an optional "Listen" control.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Square, Volume2 } from "lucide-react";

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<b key={m.index}>{t.slice(2, -2)}</b>);
    else if (t.startsWith("`")) out.push(<code key={m.index} className="rounded bg-bg px-1 font-mono text-[12px]">{t.slice(1, -1)}</code>);
    else out.push(<i key={m.index}>{t.slice(1, -1)}</i>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter((l) => l.trim());
        if (lines.length && lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
          const ordered = /^\s*\d/.test(lines[0]);
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag key={i} className={`${ordered ? "list-decimal" : "list-disc"} flex flex-col gap-1 pl-5`}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {inline(l.replace(/^#+\s*/, ""))}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function Answer({ text, streaming }: { text: string; streaming?: boolean }) {
  if (streaming && !text)
    return (
      <span className="inline-flex items-center gap-1 py-1" role="status" aria-label="Assistant is thinking">
        {[0, 1, 2].map((i) => (
          <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-soft" style={{ animationDelay: `${i * 0.16}s` }} />
        ))}
      </span>
    );
  return (
    <div aria-live={streaming ? "off" : undefined}>
      <Markdown text={text} />
      {streaming && <span aria-hidden className="typing-caret ml-0.5 inline-block h-[14px] w-[2px] translate-y-[2px] bg-accent" />}
    </div>
  );
}

/* ---------------- Listen (text-to-speech, on request only) ---------------- */

const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;
const plainForSpeech = (t: string) => t.replace(/[*_`#]/g, "").replace(/^\s*([-•]|\d+[.)])\s+/gm, "");

export function ListenButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => void (speaking && window.speechSynthesis.cancel()), [speaking]);
  if (!canSpeak() || !text) return null;
  const toggle = () => {
    const s = window.speechSynthesis;
    if (speaking) {
      s.cancel();
      setSpeaking(false);
      return;
    }
    s.cancel();
    const u = new SpeechSynthesisUtterance(plainForSpeech(text));
    u.lang = navigator.language || "en-US";
    u.onend = u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    s.speak(u);
  };
  return (
    <button
      onClick={toggle}
      aria-label={speaking ? "Stop reading aloud" : "Listen to response"}
      className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-soft hover:text-white"
    >
      {speaking ? <Square size={12} /> : <Volume2 size={14} />}
      {speaking ? "Stop" : "Listen"}
    </button>
  );
}
