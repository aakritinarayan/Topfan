/**
 * Preferences › Outbound Emails (51). Default (captured) state: VERIFICATION FAILED with both steps Failed.
 * The rest of the flow is built from the bundle copy in the spec; layout of those states is inferred:
 *   SETUP AGAIN → "Reset Email Configuration" (Confirm) → domain choice → (Protected: changes DNS, typed domain)
 *   → "Add DNS Records" → VERIFY OUTBOUND EMAIL SETTINGS → "Verifying Your Domain..." → RECHECK STATUS.
 * The check is simulated: no DNS lookup happens. It only passes if the creator ticked the mock
 * "I've added these records" box; otherwise it fails again.
 */
import { useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Loader } from "lucide-react";
import { CopyField, Radio } from "../../platform/ui/controls";
import { useToast } from "../../platform/ui/toast";
import { useData, useMockLoading } from "../../store/store";
import type { OutboundStepStatus } from "../../store/model";
import {
  deleteOutboundEmail, markOutboundRecordsAdded, OUTBOUND_RECORD_HELP, recheckOutboundEmail, resetOutboundEmail,
  setOutboundDomain, setOutboundPhase, startOutboundVerification,
} from "../../store/slices/prefsB";
import type { PageProps } from "../types";
import { ConfirmModal, PrefPage, ProtectedModal, useWrite, Pill, PlainButton, Field } from "./ui";

const FAIL_RED = "rgba(239,68,68,0.2)"; // status colour (not the theme accent)

/* ------------------------------------------------------------------ bits */

function StatusBadge({ kind, children }: { kind: "failed" | "progress" | "verified" | "none"; children: ReactNode }) {
  const bg = kind === "failed" ? FAIL_RED : kind === "verified" ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.12)";
  const Icon = kind === "verified" ? CircleCheck : CircleAlert;
  return (
    <span data-testid="pref-outbound-status-badge" style={{ background: bg }} className="inline-flex h-[31px] items-center gap-[8px] rounded-inner px-[16px] text-[12px] font-semibold uppercase text-white">
      <Icon size={14} />
      {children}
    </span>
  );
}

function Step({ title, text, status }: { title: string; text: string; status: OutboundStepStatus | "In Progress" }) {
  const failed = status === "Failed";
  const ok = status === "Verified";
  const tint = failed ? "rgba(239,68,68,0.1)" : ok ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)";
  const badge = failed ? FAIL_RED : ok ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.12)";
  return (
    <div className="flex h-[80px] items-center gap-[16px] rounded-inner bg-bg px-[20px]" data-testid={`pref-outbound-step-${title.split(" ")[0].toLowerCase()}`}>
      <span style={{ background: tint }} className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-inner">
        {ok ? <CircleCheck size={20} /> : status === "In Progress" ? <Loader size={20} className="motion-safe:animate-spin" /> : <CircleAlert size={20} />}
      </span>
      <div className="min-w-[0px] flex-1">
        <p className="text-[14px] font-semibold">{title}</p>
        <p className="mt-[2px] text-[12px]">{text}</p>
      </div>
      <span style={{ background: badge }} className="rounded-inner px-[12px] py-[6px] text-[11px] font-semibold">{status}</span>
    </div>
  );
}

function Heading({ title, badge }: { title: string; badge?: ReactNode }) {
  return (
    <div className="-mt-[8px] flex items-center justify-between">
      <h2 className="text-[24px] font-semibold">{title}</h2>
      {badge}
    </div>
  );
}

function Skeleton() {
  const bar = "rounded-[4px] bg-[#6b6b6d]";
  return (
    <div className="mt-[4px] rounded-[28px] bg-surface p-[30px]" data-testid="pref-outbound-skeleton" aria-busy="true" aria-label="Loading">
      <div className={`${bar} h-[18px] w-[200px]`} />
      <div className={`${bar} mt-[49px] h-[14px] w-[66%]`} />
      <div className={`${bar} mt-[34px] h-[14px] w-[66%]`} />
      <div className="mt-[34px] grid grid-cols-3 gap-[16px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[120px] rounded-tile bg-[#6b6b6d]" />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page */

export function OutboundEmailsPage({ route }: PageProps) {
  const loading = useMockLoading(1200);
  const o = useData((d) => d.prefsB.outboundEmail);
  const rawFlow = useData((d) => d.prefsB.outboundFlow);
  // A configuration that was reset but left on the status screen shows the domain choice.
  const flow = rawFlow.phase === "status" && o.status === "not-set-up" ? { ...rawFlow, phase: "setup" as const } : rawFlow;
  const wls = useData((d) => d.account.whiteLabel);
  const write = useWrite();
  const toast = useToast();
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [domainConfirm, setDomainConfirm] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const root = wls.domain;
  const [choice, setChoice] = useState<string>(o.domain || `mail.${root}`);
  const [custom, setCustom] = useState("");

  let body: ReactNode;
  if (loading) {
    body = <Skeleton />;
  } else if (wls.status !== "active") {
    body = (
      <>
        <Heading title="Outbound Email Address Preferences" badge={<StatusBadge kind="none">Not Verified</StatusBadge>} />
        <div className="mt-[24px] rounded-inner bg-surface p-[24px] text-[14px]" data-testid="pref-outbound-wls-missing">
          For setting custom bound emails, first setup and verify your White Labeled Site.
        </div>
      </>
    );
  } else if (flow.phase === "setup") {
    // inferred layout; copy from the bundle
    const options = [`mail.${root}`, `news.${root}`];
    const chosen = choice === "custom" ? `${custom.trim().toLowerCase().replace(/[^a-z0-9-]/g, "")}.${root}` : choice;
    const customOk = choice !== "custom" || /^[a-z0-9-]{1,30}$/.test(custom.trim().toLowerCase());
    body = (
      <>
        <Heading title="Outbound Email Address Preferences" badge={<StatusBadge kind="none">Not Verified</StatusBadge>} />
        <div className="mt-[24px] rounded-inner bg-surface p-[24px]" data-testid="pref-outbound-setup">
          <p className="text-[14px]">Choose the domain name you would like your outbound emails to originate from including newsletters and marketing emails:</p>
          <div className="mt-[20px] flex flex-col gap-[16px]">
            {options.map((op) => (
              <span key={op} className="inline-flex w-fit" data-testid={`pref-outbound-domain-${op.split(".")[0]}`}>
                <Radio name="outbound-domain" checked={choice === op} onChange={() => setChoice(op)}>{op}</Radio>
              </span>
            ))}
            <span className="flex items-center gap-[12px]" data-testid="pref-outbound-domain-custom">
              <Radio name="outbound-domain" checked={choice === "custom"} onChange={() => setChoice("custom")}>Other sub-domain:</Radio>
              <span className="flex items-center gap-[8px]">
                <Field
                  aria-label="Custom sub-domain"
                  data-testid="pref-outbound-domain-custom-input"
                  className="!h-[40px] w-[180px]"
                  placeholder="e.g. hello"
                  value={custom}
                  onFocus={() => setChoice("custom")}
                  onChange={(e) => setCustom(e.target.value)}
                />
                <span className="text-[14px]">.{root}</span>
              </span>
            </span>
          </div>
          <p className="mt-[24px] text-[14px]"><span className="font-bold">{chosen}</span> will provide the following benefits:</p>
          <ul className="mt-[8px] list-disc pl-[24px] text-[14px] leading-6">
            <li>Better deliverability</li>
            <li>Higher open rates</li>
            <li>Professional branding</li>
          </ul>
        </div>
        <div className="mt-[24px] flex items-center gap-[8px]">
          <Pill data-testid="pref-outbound-setup-continue" disabled={!customOk} onClick={() => setDomainConfirm(chosen)}>Continue</Pill>
          {rawFlow.phase === "setup" && o.records.length > 0 && (
            // inferred: return to the records already generated for the current domain
            <PlainButton data-testid="pref-outbound-setup-cancel" onClick={() => write("prefsB.setOutboundPhase", (d) => setOutboundPhase(d, o.status === "not-set-up" ? "records" : "status"), "account.admin")}>Cancel</PlainButton>
          )}
        </div>
      </>
    );
  } else if (flow.phase === "records") {
    const labelFor = (t: string) => (t === "MX" ? "MX Name" : t === "CNAME" ? "CNAME Name" : "TXT Name");
    const helpKeys = ["TXT:ses", "TXT:spf", "TXT:dmarc", "DKIM1", "DKIM2", "DKIM3", "MX"];
    body = (
      <>
        <Heading title="DNS Records for Custom Outbound Email Address" badge={<StatusBadge kind="none">Not Verified</StatusBadge>} />
        <div className="mt-[24px] rounded-inner bg-surface p-[24px]" data-testid="pref-outbound-records">
          <h3 className="text-[18px] font-semibold">Add DNS Records</h3>
          <p className="mt-[8px] text-[14px]">Add these records to your DNS with your provider. Once they are added, click on VERIFY OUTBOUND EMAIL SETTINGS.</p>
          <div className="mt-[24px] flex flex-col gap-[16px]">
            {o.records.map((r, i) => (
              <div key={r.host + i} className="rounded-inner bg-bg p-[20px]" data-testid={`pref-outbound-record-${i}`}>
                <p className="text-[12px] text-soft">{OUTBOUND_RECORD_HELP[helpKeys[i]] ?? ""}</p>
                <div className="mt-[12px] grid grid-cols-2 gap-[16px]">
                  <div>
                    <p className="mb-[8px] text-[14px] font-medium">{labelFor(r.type)}</p>
                    <CopyField value={r.host} />
                  </div>
                  <div>
                    <p className="mb-[8px] text-[14px] font-medium">Value</p>
                    <CopyField value={r.value} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* inferred: mock-only control that drives the simulated check */}
          <label className="mt-[24px] flex cursor-pointer items-center gap-[12px] text-[14px]" data-testid="pref-outbound-records-added">
            <input
              type="checkbox"
              className="h-[16px] w-[16px] accent-[var(--configThemeColor)]"
              checked={flow.recordsAdded}
              onChange={(e) => write("prefsB.markOutboundRecordsAdded", (d) => markOutboundRecordsAdded(d, e.target.checked), "account.admin")}
            />
            I've added these records at my DNS provider
          </label>
          <p className="mt-[8px] text-[12px] text-muted">Demo: verification here is simulated. No real DNS lookup is made.</p>
        </div>
        <div className="mt-[24px] flex items-center gap-[12px]">
          <Pill
            data-testid="pref-outbound-verify"
            onClick={() => write("prefsB.startOutboundVerification", (d) => startOutboundVerification(d), "account.admin", "Verification restarted. Please wait while we verify your DNS records.")}
          >
            Verify Outbound Email Settings
          </Pill>
          <Pill data-testid="pref-outbound-update-domain" onClick={() => write("prefsB.setOutboundPhase", (d) => setOutboundPhase(d, "setup"), "account.admin")}>
            Update Domain
          </Pill>
        </div>
      </>
    );
  } else if (o.status === "pending") {
    body = (
      <>
        <Heading title="Outbound Email Address Verification" badge={<StatusBadge kind="progress">Verification In Process</StatusBadge>} />
        <div className="mt-[24px] rounded-inner bg-surface p-[24px]" data-testid="pref-outbound-verifying">
          <h3 className="text-[18px] font-semibold">Verifying Your Domain...</h3>
          <p className="mt-[8px] text-[14px] leading-[21px]">
            The verification process may take anywhere from 30 minutes to 24 hours depending on your DNS provider. Emails will continue to be sent from <span className="font-bold">no-reply@topfan.com</span> in the meantime.
          </p>
          <div className="mt-[24px] flex flex-col gap-[16px]">
            <Step title="DNS Records Verification" text="Checking for DNS propagation..." status="In Progress" />
            <Step title="Outbound Email Services Configuration" text="Waiting for confirmation" status="In Progress" />
          </div>
        </div>
        <Pill
          className="mt-[24px]"
          data-testid="pref-outbound-recheck"
          disabled={checking}
          onClick={() => {
            setChecking(true);
            // Simulated check delay; never a real DNS query.
            setTimeout(() => {
              setChecking(false);
              let result: string | undefined;
              const res = write("prefsB.recheckOutboundEmail", (d) => void (result = recheckOutboundEmail(d)), "account.admin");
              if (res.ok) toast(result === "verified" ? "Domain Verified" : "Verification failed. Please check your DNS records.");
            }, 900);
          }}
        >
          {checking ? "Checking…" : "Recheck Status"}
        </Pill>
      </>
    );
  } else if (o.status === "verified") {
    body = (
      <>
        <Heading title="Outbound Email Address Verification" badge={<StatusBadge kind="verified">Verified</StatusBadge>} />
        <div className="mt-[24px] rounded-inner bg-surface p-[24px]" data-testid="pref-outbound-verified">
          <h3 className="text-[18px] font-semibold">Domain Verified</h3>
          <p className="mt-[8px] text-[14px]">Your newsletter and segmentation marketing emails will now be sent from <span className="font-bold">{o.senderEmail}</span></p>
          <div className="mt-[24px] grid grid-cols-2 gap-[16px]">
            <div className="rounded-inner bg-bg p-[20px]">
              <p className="text-[12px] font-semibold uppercase text-soft">Verified Domain</p>
              <p className="mt-[4px] text-[14px] font-bold">{o.domain}</p>
            </div>
            <div className="rounded-inner bg-bg p-[20px]">
              <p className="text-[12px] font-semibold uppercase text-soft">Sender Email</p>
              <p className="mt-[4px] text-[14px] font-bold">{o.senderEmail}</p>
            </div>
          </div>
        </div>
        <div className="mt-[24px] flex items-center gap-[8px]">
          <Pill data-testid="pref-outbound-setup-again" onClick={() => setResetOpen(true)}>Setup Again</Pill>
          <PlainButton data-testid="pref-outbound-delete" onClick={() => setDeleteOpen(true)}>Delete Configuration</PlainButton>
        </div>
      </>
    );
  } else {
    // failed (captured) — also used for "not-set-up" with phase=status, which shouldn't normally happen
    body = (
      <>
        <Heading title="Outbound Email Address Verification" badge={<StatusBadge kind="failed">Verification Failed</StatusBadge>} />
        <div className="mt-[24px] rounded-inner bg-surface p-[24px]" data-testid="pref-outbound-failed">
          <h3 className="text-[18px] font-semibold">We Couldn't Verify Your Domain</h3>
          <p className="mt-[8px] text-[14px] leading-[21px]">
            The verification process failed. This usually happens when DNS records are not properly configured or haven't propagated yet. Review the common issues below and try again.
          </p>
          <div className="mt-[24px] flex flex-col gap-[16px]">
            <Step title="DNS Records Verification" text="We couldn't detect the DNS records in your domain settings. Make sure all records are added correctly." status={o.steps[0]?.status ?? "Failed"} />
            <Step title="Outbound Email Services Configuration" text="Waiting for confirmation" status={o.steps[1]?.status ?? "Failed"} />
          </div>
        </div>
        <Pill className="mt-[24px] px-[20px]" data-testid="pref-outbound-setup-again" onClick={() => setResetOpen(true)}>
          Setup Again
        </Pill>
      </>
    );
  }

  return (
    <PrefPage id={route.id}>
      {body}
      <ConfirmModal
        open={resetOpen}
        title="Reset Email Configuration"
        confirmLabel="Reset"
        testid="modal-pref-outbound-reset"
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          if (write("prefsB.resetOutboundEmail", (d) => resetOutboundEmail(d), "account.admin").ok) setResetOpen(false);
        }}
      >
        You already have an email configuration in progress or verified. Are you sure you want to reset and start over? This will require you to update your DNS records again.
      </ConfirmModal>
      <ConfirmModal
        open={deleteOpen}
        title="Delete Email Configuration"
        confirmLabel="Delete"
        testid="modal-pref-outbound-delete"
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (write("prefsB.deleteOutboundEmail", (d) => deleteOutboundEmail(d), "account.admin", "Email configuration deleted successfully").ok) setDeleteOpen(false);
        }}
      >
        {/* inferred body copy */}
        Your emails will be sent from no-reply@topfan.com again. You can set up a custom sending domain at any time.
      </ConfirmModal>
      <ProtectedModal
        open={!!domainConfirm}
        title="Change Outbound Email Domain"
        phrase={domainConfirm ?? ""}
        confirmLabel="Continue"
        testid="modal-pref-outbound-domain"
        onClose={() => setDomainConfirm(null)}
        onConfirm={() => {
          const dom = domainConfirm!;
          if (write("prefsB.setOutboundDomain", (d) => setOutboundDomain(d, dom), "account.admin").ok) setDomainConfirm(null);
        }}
      >
        {/* inferred: changing DNS is a Protected action */}
        Outbound emails will be set up to send from <span className="font-bold">{domainConfirm}</span>. You will need to add new DNS records at your DNS provider.
      </ProtectedModal>
    </PrefPage>
  );
}
