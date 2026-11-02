/**
 * Core pages: White Label Site (manage + cover editor, existing approved screens), the AI-assisted
 * White Label setup (onboarding), and the not-found fallback.
 */
import { PreferencesPage } from "../../platform/PreferencesPage";
import { ManageWls } from "../../platform/wls/ManageWls";
import { CoverPageEditor } from "../../platform/wls/CoverPageEditor";
import { DomainInfoStep } from "../../platform/wls/DomainInfoStep";
import { DnsRecordsStep } from "../../platform/wls/DnsRecordsStep";
import { ProvisioningStep } from "../../platform/wls/ProvisioningStep";
import { Link } from "../../app/router";
import type { PageMap } from "../types";

function NotFound() {
  return (
    <div data-testid="page-not-found" className="py-10">
      <h4 className="text-2xl font-bold">Page not found</h4>
      <p className="mt-2 text-sm text-muted">
        This page doesn't exist.{" "}
        <Link to="/" className="font-bold text-accent underline">
          Go to Home
        </Link>
      </p>
    </div>
  );
}

// One component reference for provisioning and complete, so the screen resolves in place (no remount).
const Provisioning = () => <ProvisioningStep />;

export const pages: PageMap = {
  "pref-whitelabel": () => (
    <PreferencesPage>
      <ManageWls />
    </PreferencesPage>
  ),
  "pref-whitelabel-cover": () => <CoverPageEditor />,
  "wls-setup-domain": () => <DomainInfoStep />,
  "wls-setup-dns": () => <DnsRecordsStep />,
  // Same component for provisioning and complete: completion is its resolved state (keeps one instance).
  "wls-setup-provisioning": Provisioning,
  "wls-setup-complete": Provisioning,
  "not-found": NotFound,
};
