/**
 * The assistant's GoDaddy DNS setup (simulated): Connect → Review → Processing → Success, plus error
 * views. TopFan modal styling (surface, r30, red accent) on a darker overlay, always labelled
 * "Simulated". No credential fields: authorization is simulated and nothing is sent to GoDaddy.
 * Side effects (store state, chat messages) belong to the caller; this component only shows the steps.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, X } from "lucide-react";
import { Button, TextButton } from "../platform/ui/controls";
import { DNS_COPY, dnsFixture } from "./dnsCopy";

export type DnsRecord = { type: string; host: string; value: string };
type Step = "connect" | "authorizing" | "review" | "processing" | "success" | "error";
type ErrorKind = "connection" | "notFound" | "elsewhere" | "conflict" | "updateFailed";

const AUTH_MS = 1200;
const PROCESS_MS = 2500;

export function GoDaddySetup({
  open,
  startAt = "connect",
  domain,
  records,
  onCancel,
  onApprove,
  onPrepared,
  onFailed,
  onDone,
  onManual,
}: {
  open: boolean;
  /** "review" when retrying after an unconfirmed setup (already authorized in this session). */
  startAt?: "connect" | "review";
  domain: string;
  records: DnsRecord[];
  /** Closed before anything was approved. */
  onCancel: () => void;
  /** Approved: the caller marks the setup as in progress. */
  onApprove: () => void;
  /** The simulated setup finished. */
  onPrepared: () => void;
  /** The simulated setup couldn't be confirmed. */
  onFailed: () => void;
  /** "Back to TopFan" after success. */
  onDone: () => void;
  /** Switch to manual setup from an error. */
  onManual: () => void;
}) {
  const [step, setStep] = useState<Step>(startAt);
  const [error, setError] = useState<ErrorKind>("connection");
  // One approval per open: a second click (or Enter) while processing does nothing.
  const approved = useRef(false);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  useEffect(() => {
    if (!open) return;
    setStep(startAt);
    approved.current = false;
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [open, startAt]);

  const busy = step === "authorizing" || step === "processing";
  // Escape = Cancel, except while something is running.
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && !busy && step !== "success" && onCancel();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open, busy, step, onCancel]);

  const fail = (kind: ErrorKind) => {
    setError(kind);
    setStep("error");
  };

  const authorize = () => {
    setStep("authorizing");
    later(() => {
      if (dnsFixture === "connection-failure") return fail("connection");
      if (dnsFixture === "domain-not-found") return fail("notFound");
      if (dnsFixture === "hosted-elsewhere") return fail("elsewhere");
      setStep("review");
    }, AUTH_MS);
  };

  const approve = () => {
    if (approved.current) return;
    if (dnsFixture === "conflict") return fail("conflict");
    approved.current = true;
    setStep("processing");
    onApprove();
    later(() => {
      if (dnsFixture === "update-failed") {
        approved.current = false;
        onFailed();
        return fail("updateFailed");
      }
      onPrepared();
      setStep("success");
    }, PROCESS_MS);
  };

  const title =
    step === "connect" || step === "authorizing"
      ? DNS_COPY.connect.title
      : step === "review"
        ? DNS_COPY.review.title
        : step === "processing"
          ? DNS_COPY.processing.title
          : step === "success"
            ? DNS_COPY.success.title
            : error === "connection"
              ? "Couldn't connect"
              : error === "updateFailed"
                ? "Setup not confirmed"
                : error === "conflict"
                  ? "Conflicting DNS record"
                  : "Check your domain";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            data-testid="dns-setup"
            data-step={step}
            className="w-[560px] max-w-full rounded-card bg-surface"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-center gap-3 border-b border-line px-[30px] pb-5 pt-7">
              <h2 className="flex-1 text-xl font-bold" data-testid="dns-setup-title">
                {title}
              </h2>
              <span data-testid="dns-simulated" className="rounded-full border border-accent px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-caps text-accent">
                {DNS_COPY.simulated}
              </span>
              {!busy && step !== "success" && (
                <button aria-label="Close" onClick={onCancel} className="text-white hover:text-accent">
                  <X size={22} />
                </button>
              )}
            </div>

            <div className="px-[30px] py-6 text-[15px] leading-6">
              {(step === "connect" || step === "authorizing") && (
                <>
                  <p>{DNS_COPY.connect.body}</p>
                  <p className="mt-4 flex gap-2.5 rounded-inner bg-bg px-4 py-3 text-[13px] text-soft">
                    <Lock size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                    {DNS_COPY.connect.security}
                  </p>
                  {step === "authorizing" && <Progress label={DNS_COPY.connect.authorizing} />}
                </>
              )}

              {step === "review" && (
                <>
                  <p>{DNS_COPY.review.body}</p>
                  <p className="mt-4 text-[13px] text-soft">
                    Domain: <b className="text-white" data-testid="dns-review-domain">{domain}</b>
                  </p>
                  <table className="mt-2 w-full table-fixed overflow-hidden rounded-inner bg-bg text-left text-[13px]" data-testid="dns-review-records">
                    <thead>
                      <tr className="text-soft">
                        <th className="w-[72px] px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Hostname</th>
                        <th className="px-3 py-2 font-medium">Destination</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r, i) => (
                        <tr key={i} className="border-t border-line" data-testid="dns-review-record">
                          <td className="px-3 py-2.5 font-bold">{r.type}</td>
                          <td className="break-all px-3 py-2.5 font-mono text-[12px]">{r.host}</td>
                          <td className="break-all px-3 py-2.5 font-mono text-[12px]">{r.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-4 text-[13px] text-soft">{DNS_COPY.review.note}</p>
                </>
              )}

              {step === "processing" && (
                <>
                  <p>{DNS_COPY.processing.body}</p>
                  <Progress />
                  <p className="mt-3 text-[13px] text-soft" data-testid="dns-processing-note">
                    {DNS_COPY.processing.simulated}
                  </p>
                </>
              )}

              {step === "success" && <p>{DNS_COPY.success.body}</p>}

              {step === "error" && (
                <p data-testid="dns-error" role="alert">
                  {DNS_COPY.errors[error]}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-[30px] pb-7">
              {(step === "connect" || step === "authorizing") && (
                <>
                  <TextButton onClick={onCancel} disabled={step === "authorizing"} data-testid="dns-cancel">
                    {DNS_COPY.connect.secondary}
                  </TextButton>
                  <Button onClick={authorize} disabled={step === "authorizing"} data-testid="dns-continue">
                    {DNS_COPY.connect.primary}
                  </Button>
                </>
              )}
              {step === "review" && (
                <>
                  <TextButton onClick={() => setStep("connect")} data-testid="dns-back">
                    {DNS_COPY.review.secondary}
                  </TextButton>
                  <Button onClick={approve} data-testid="dns-approve">
                    {DNS_COPY.review.primary}
                  </Button>
                </>
              )}
              {step === "processing" && (
                <Button disabled data-testid="dns-approve">
                  {DNS_COPY.review.primary}
                </Button>
              )}
              {step === "success" && (
                <Button onClick={onDone} data-testid="dns-done">
                  {DNS_COPY.success.primary}
                </Button>
              )}
              {step === "error" && (
                <>
                  <TextButton onClick={onManual} data-testid="dns-manual">
                    {DNS_COPY.entry.walk}
                  </TextButton>
                  {error === "conflict" ? (
                    <Button onClick={() => setStep("review")} data-testid="dns-retry">
                      {DNS_COPY.review.secondary}
                    </Button>
                  ) : error === "elsewhere" || error === "notFound" ? (
                    <Button onClick={onCancel} data-testid="dns-retry">
                      Close
                    </Button>
                  ) : (
                    <Button onClick={error === "updateFailed" ? () => setStep("review") : authorize} data-testid="dns-retry">
                      Try again
                    </Button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Thin indeterminate bar in the accent (the panel's working style). */
function Progress({ label }: { label?: string }) {
  return (
    <div className="mt-5" aria-live="polite">
      {label && <p className="mb-2 text-[13px] text-soft">{label}</p>}
      <div className="h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={label ?? "Working"}>
        <motion.div className="h-full w-1/3 rounded-full bg-accent" animate={{ x: ["-100%", "300%"] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} />
      </div>
    </div>
  );
}
