/**
 * Setup wizard Step 1 "Domain Information" (P50 bundle copy; flow from OB 16-16-25…16-24-40).
 */
import { useState } from "react";
import { dnsProviders } from "../../config/demo";
import { usePlatform } from "../../state/platformStore";
import { Button, FieldError, Input, Label, Radio, Select } from "../ui/controls";
import { Card, InnerBox, OutlinePill } from "../ui/surfaces";
import { DetectedTag } from "../../assistant/AssistantPanel";
import { openRegistrar } from "../../assistant/DomainFinder";
import { useDomainFinder } from "../../state/domainFinderStore";

const ROOT_DOMAIN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})*\.[a-z]{2,}$/i;
const SUBDOMAIN = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/i;

export function WizardFrame({ step, children }: { step?: string; children: React.ReactNode }) {
  return (
    <>
      <h3 className="mb-6 text-[27.5px] font-medium">Setup Your White Label Site Domain</h3>
      <Card>
        {step && <OutlinePill className="mb-6">{step}</OutlinePill>}
        {children}
      </Card>
    </>
  );
}

export function DomainInfoStep() {
  const { state, patch, go } = usePlatform();
  const finder = useDomainFinder();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const domain = state.domainName.trim();
  const shownDomain = domain || "example.com";

  const submit = () => {
    const e: Record<string, string> = {};
    if (!state.provider) e.provider = "Please select a DNS provider";
    if (!domain) e.domain = "Domain name is required";
    else if (!ROOT_DOMAIN.test(domain)) e.domain = "Please enter a valid root domain name (e.g., example.com)";
    if (state.urlPreference === "subdomain") {
      if (!state.subdomain.trim()) e.subdomain = "Subdomain name is required";
      else if (!SUBDOMAIN.test(state.subdomain.trim())) e.subdomain = "Please enter a valid subdomain name";
    }
    setErrors(e);
    patch({ formErrors: e });
    if (Object.keys(e).length) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      go("step2");
    }, 1200);
  };

  return (
    <WizardFrame step="Step 1 of 3">
      <h4 className="text-lg font-bold">Domain Information</h4>
      <div className="mt-5 flex flex-wrap gap-8">
        <Radio name="hasDomain" checked={state.hasDomain} onChange={() => patch({ hasDomain: true })}>
          I already have a Domain Name
        </Radio>
        <Radio name="hasDomain" checked={!state.hasDomain} onChange={() => patch({ hasDomain: false })}>
          I don't have a Domain Name
        </Radio>
      </div>

      {state.hasDomain ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div data-field="provider">
              <div className="flex items-start">
                <Label required htmlFor="provider">Domain / DNS Provider</Label>
                <DetectedTag field="provider" />
              </div>
              <Select
                id="provider"
                value={state.provider}
                placeholder="Select Provider"
                options={dnsProviders}
                invalid={!!errors.provider}
                onChange={(provider) => patch({ provider })}
              />
              <FieldError>{errors.provider}</FieldError>
            </div>
            <div data-field="domain">
              <Label required info="Enter your domain without http:// or https://" htmlFor="domain">
                Domain Name
              </Label>
              <Input
                id="domain"
                placeholder="Enter domain"
                value={state.domainName}
                invalid={!!errors.domain}
                onChange={(e) => patch({ domainName: e.target.value.trim().toLowerCase() })}
              />
              <FieldError>{errors.domain}</FieldError>
            </div>
          </div>

          {domain && (
            <div className="mt-8" data-field="urlPreference">
              <h4 className="text-lg font-bold">White Label Site URL Preference</h4>
              <p className="mt-1 text-sm text-muted">How would you like your White Label website address to look to fans?</p>
              <div className="mt-5 flex flex-col gap-5">
                <Radio name="urlPref" checked={state.urlPreference === "root_domain"} onChange={() => patch({ urlPreference: "root_domain" })}>
                  {shownDomain} &amp; www.{shownDomain}
                </Radio>
                <Radio name="urlPref" checked={state.urlPreference === "subdomain"} onChange={() => patch({ urlPreference: "subdomain" })}>
                  sub-domain.{shownDomain}
                </Radio>
              </div>
              {state.urlPreference === "subdomain" && (
                <div className="mt-6" data-field="subdomain">
                  <Label required htmlFor="subdomain">Sub-domain Name</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-full max-w-[420px]">
                      <Input
                        id="subdomain"
                        placeholder="Enter sub-domain"
                        value={state.subdomain}
                        invalid={!!errors.subdomain}
                        onChange={(e) => patch({ subdomain: e.target.value.trim().toLowerCase() })}
                      />
                    </div>
                    <span className="text-sm font-bold">.{shownDomain}</span>
                  </div>
                  <FieldError>{errors.subdomain}</FieldError>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center gap-4">
            <Button data-field="save" onClick={submit} disabled={saving}>
              {saving ? "Saving…" : "Save & Continue"}
            </Button>
            <span className="text-sm">Note: This can take up to 60 seconds.</span>
          </div>
        </>
      ) : (
        <InnerBox className="mt-6">
          <h4 className="text-lg font-bold">No domain? No problem.</h4>
          <p className="mt-4 text-sm">To continue, you'll need an active domain.</p>
          <p className="mt-3 text-sm">We recommend Namecheap, which is fully compatible with our tool and offers quick, reliable domain setup.</p>
          <p className="mt-5 text-sm">Follow these steps to get your domain on Namecheap:</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
            <li>Click the button below to open Namecheap's domain page.</li>
            <li>Search for your preferred domain name.</li>
            <li>Choose an available domain and proceed to checkout.</li>
            <li>Complete the payment and finish the domain setup on Namecheap.</li>
            <li>Return here and enter your new domain to move forward with the onboarding.</li>
          </ol>
          <span data-field="buy-domain" className="mt-6 inline-block rounded-pill">
            <Button
              onClick={() => {
                // Opens Namecheap (new tab); the assistant asks how it went when the creator comes back.
                openRegistrar("namecheap", null);
                finder.set({ handoff: { domain: null, registrarId: "namecheap", at: Date.now(), away: false, asked: false } });
              }}
            >
              Purchase Domain on Namecheap
            </Button>
          </span>
        </InnerBox>
      )}
    </WizardFrame>
  );
}
