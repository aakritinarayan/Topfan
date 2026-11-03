/**
 * Voice input with the browser's built-in speech recognition (Web Speech API).
 *
 * - Never starts on its own: only from the mic button.
 * - We never receive, store or upload raw audio ourselves. The browser's speech service turns it into
 *   text (in Chrome that service is Google's, so audio leaves the device; the panel says so).
 * - The transcript is placed in the input for the creator to edit; nothing is sent automatically.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "idle" | "permission" | "recording" | "transcribing" | "ready" | "failed";

/* Minimal typings: the API is not in TypeScript's DOM lib. */
interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [i: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: (() => void) | null;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

const Ctor = (): RecognitionCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. You can allow it in your browser's site settings, or type instead.",
  "service-not-allowed": "Voice input isn't allowed in this browser. You can type instead.",
  "audio-capture": "I couldn't find a microphone. Check that one is connected, or type instead.",
  network: "Voice input needs an internet connection. You can type instead.",
  "no-speech": "I didn't catch anything. Want to try again?",
  "language-not-supported": "Voice input supports US English only here. You can type instead.",
};

export function useVoice() {
  const supported = typeof window !== "undefined" && !!Ctor();
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const finalText = useRef("");
  /** Everything heard so far, including words not finalized yet. */
  const heard = useRef("");
  const ended = useRef<"cancel" | "error" | null>(null);

  const start = useCallback(() => {
    const C = Ctor();
    if (!C) return;
    rec.current?.abort();
    const r = new C();
    // The assistant answers in US English, so listen in US English (not the browser's language).
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    finalText.current = "";
    heard.current = "";
    ended.current = null;
    setTranscript("");
    setError(null);
    // The browser may ask for microphone permission first; recording starts when audio does.
    setState("permission");
    r.onaudiostart = () => setState((s) => (s === "permission" ? "recording" : s));
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText.current += res[0].transcript;
        else interim += res[0].transcript;
      }
      heard.current = (finalText.current + interim).replace(/\s+/g, " ").trim();
      setTranscript(heard.current);
    };
    r.onerror = (e) => {
      if (e.error === "aborted") return;
      ended.current = "error";
      setError(ERRORS[e.error] ?? "Voice input stopped unexpectedly. Try again, or type instead.");
      setState("failed");
    };
    r.onend = () => {
      rec.current = null;
      if (ended.current) return;
      if (heard.current) {
        setTranscript(heard.current);
        setState("ready");
      } else {
        setError(ERRORS["no-speech"]);
        setState("failed");
      }
    };
    rec.current = r;
    try {
      r.start();
    } catch {
      setError("Voice input couldn't start. Try again, or type instead.");
      setState("failed");
    }
  }, []);

  /** Finish speaking: the last words are finalized, then the transcript is ready to edit. */
  const stop = useCallback(() => {
    if (!rec.current) return;
    setState("transcribing");
    rec.current.stop();
  }, []);

  /** Discard everything. */
  const cancel = useCallback(() => {
    ended.current = "cancel";
    rec.current?.abort();
    rec.current = null;
    finalText.current = "";
    setTranscript("");
    setError(null);
    setState("idle");
  }, []);

  /** Transcript was used (moved to the input / sent). */
  const clear = useCallback(() => {
    setTranscript("");
    setState("idle");
    setError(null);
  }, []);

  useEffect(() => () => rec.current?.abort(), []);

  return { supported, state, transcript, error, start, stop, cancel, clear };
}
