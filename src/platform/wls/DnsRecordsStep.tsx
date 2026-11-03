/**
 * Setup wizard Step 2 "Add DNS Records (GoDaddy)" + "Unable to Verify DNS Entries" modal
 * (copy from OB 16-25-27 / 16-33-44 and P50 bundle).
 */
import { useState } from "react";
import { domain as demoDomain } from "../../config/demo";
import { usePlatform } from "../../state/platformStore";
import { useAssistant } from "../../state/assistantStore";
import { Button, CopyField, TextButton } from "../ui/controls";
import { InnerBox, Modal } from "../ui/surfaces";
import { WizardFrame } from "./DomainInfoStep";
import { dnsFixture } from "../../assistant/dnsCopy";

/** Records for the entered host (sub-domain or "www"); values are the demo values. */
export function useRecords() {
  const { state } = usePlatform();
  const host = state.urlPreference === "subdomain" ? state.subdomain || demoDomain.recommendedSubdomain : "www";
  return [
    { host, value: demoDomain.records[0].value },
    { host: demoDomain.records[1].host.replace(/\.fans$/, `.${host}`), value: demoDomain.records[1].value },
  ];
}

export function GoDaddySteps() {
  return (
    <InnerBox>
      <h5 className="text-base font-semibold">Steps to setup your White Label Site on GoDaddy</h5>
      <h6 className="mt-4 text-sm font-semibold">Step 1: Connect domain to hosting or website</h6>
      <ul className="mt-2 space-y-2 pl-5 text-sm leading-[22px]">
        <li>In GoDaddy, go to your profile → My Products; you'll see both your domain and hosting/Website Builder listed.</li>
        <li>Use the "Set up" or "Attach domain" option on hosting/Website Builder, then select your domain; GoDaddy usually links DNS automatically for its own products.</li>
      </ul>
      <h6 className="mt-4 text-sm font-semibold">Step 2: After connecting Setup</h6>
      <ul className="mt-2 space-y-2 pl-5 text-sm leading-[22px]">
        <li>Install your CMS or builder (WordPress, Webflow, etc.) and publish a page; then check your domain in a browser after DNS updates.</li>
        <li>Turn on auto-renew for your domain to avoid losing it and keep WHOIS privacy/protection enabled if it's included.</li>
      </ul>
    </InnerBox>
  );
}

export function DnsRecordsStep() {
  const { state, patch, go } = usePlatform();
  const records = useRecords();
  const [verifying, setVerifying] = useState(false);
  const [failed, setFailed] = useState(false);
  const assistant = useAssistant();

  // Simulated check (deterministic demo result, no DNS lookup): passes once the records are in place
  // (the assistant's simulated setup was prepared, or the records were fixed). With ?dnsFixture=
  // propagation-pending the first check after the setup isn't visible yet. Without the assistant, the
  // first VERIFY fails like the real flow often does and the second succeeds.
  // While the assistant panel is open, it explains the failure instead of the generic modal.
  const verify = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      const attempts = state.verifyAttempts + 1;
      const prepared = state.dnsSetup === "prepared" || state.dnsSetup === "applied";
      const pending = prepared && dnsFixture === "propagation-pending" && attempts === 1;
      patch({ verifyAttempts: attempts });
      if (!pending && (state.recordsVerified || prepared || (attempts >= 2 && !assistant.open))) {
        patch({ recordsVerified: true });
        go("provisioning");
      } else if (!assistant.open) setFailed(true);
    }, 1500);
  };

  return (
    <WizardFrame step="Step 2 of 3">
      <h4 className="text-lg font-bold">Add DNS Records ({state.provider ?? "GoDaddy"})</h4>
      <p className="mt-5 text-sm">Add these records to your DNS with your provider. Once they are added, click on VERIFY.</p>
      {state.urlPreference === "subdomain" ? (
        <p className="mt-2 text-sm">The Host should be your subdomain name (e.g., "shop" for shop.example.com).</p>
      ) : (
        <p className="mt-2 text-sm">Note: If there is already a "www" CNAME record, you can edit it or delete and replace it.</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
        {records.map((r, i) => (
          <div key={i} className="contents">
            <div data-field={`record${i + 1}-host`}>
              <p className="mb-3 text-sm font-medium">CNAME Host #{i + 1}</p>
              <CopyField value={r.host} />
            </div>
            <div data-field={`record${i + 1}-value`}>
              <p className="mb-3 text-sm font-medium">Value #{i + 1}</p>
              <CopyField value={r.value} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <GoDaddySteps />
      </div>

      <div className="mt-8 flex items-center gap-4">
        <TextButton onClick={() => go("step1")}>Back</TextButton>
        <Button data-field="verify" onClick={verify} disabled={verifying}>
          {verifying ? "Verifying…" : "Verify & Continue"}
        </Button>
        <span className="text-sm">Note: This can take up to 60 seconds.</span>
      </div>

      <Modal
        open={failed}
        onClose={() => setFailed(false)}
        title="Unable to Verify DNS Entries"
        footer={<Button onClick={() => setFailed(false)}>Close</Button>}
      >
        <p className="text-base leading-6">
          We were unable to verify your DNS entries. Please double check the values match at your domain provider.
        </p>
        <p className="mt-6 text-base leading-6">
          Note: It is common for your domain provider to take up to 60 minutes to update records. So please return to this screen in a
          while and reclick the "Verify &amp; Continue" button.
        </p>
      </Modal>
    </WizardFrame>
  );
}
