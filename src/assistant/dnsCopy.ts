/**
 * Microcopy for the assistant's GoDaddy DNS setup (simulated in this prototype) and its outcomes.
 * One place for every string so the panel, the modal and the tests stay in sync.
 */
export const DNS_COPY = {
  entry: {
    title: "Want me to handle the DNS setup?",
    body: "These records connect your domain to your TopFan website. I can help you add them without needing to configure everything manually.",
    prepare: "Prepare it for me",
    walk: "Walk me through it",
  },
  connect: {
    title: "Connect your GoDaddy account",
    body: "Sign in through GoDaddy to let TopFan prepare your domain's DNS records. You'll review the changes before anything is added.",
    security: "Your password stays with GoDaddy. TopFan only requests the access needed for this setup.",
    primary: "Continue to GoDaddy",
    secondary: "Cancel",
    authorizing: "Connecting to GoDaddy…",
  },
  review: {
    title: "Review your DNS changes",
    body: "TopFan needs to add two DNS records to connect your domain. Review them before approving.",
    note: "Only the displayed records are included in this request. Existing unrelated records will not be changed.",
    primary: "Approve & connect",
    secondary: "Back",
  },
  processing: {
    title: "Setting up your DNS records",
    body: "I'm preparing the two records needed to connect your domain to TopFan.",
    simulated: "Simulated setup. No changes are being made to GoDaddy.",
  },
  success: {
    title: "DNS setup prepared",
    body: "Your demo DNS configuration is ready. Return to TopFan to verify the connection.",
    primary: "Back to TopFan",
  },
  after: {
    done: "I've completed the simulated DNS setup. The next step is to verify that your domain points to TopFan.",
    next: "Use Verify & Continue to check the connection.",
    already: "Your DNS setup is already prepared, so there's nothing to add again. Use Verify & Continue to check the connection.",
  },
  errors: {
    cancelled: "Connection cancelled. No changes have been made.",
    connection: "Couldn't connect to GoDaddy. Please try again.",
    notFound: "We couldn't find this domain in the selected account.",
    elsewhere: "This domain uses a different DNS provider. Please select its actual DNS host to continue.",
    conflict: "A DNS record already exists for this hostname. Review the conflict before continuing.",
    updateFailed: "We couldn't confirm that the required records were added.",
    pending: "The DNS records aren't visible yet. You can check again shortly.",
  },
  verified: "Your domain is connected. TopFan can continue setting up your website.",
  simulated: "Simulated",
} as const;

/**
 * Demo outcomes on request (deterministic; for presenting and tests): ?dnsFixture=<id>.
 * Without it the simulated setup succeeds and verification passes once the setup is prepared.
 */
export type DnsFixture = "connection-failure" | "domain-not-found" | "hosted-elsewhere" | "conflict" | "update-failed" | "propagation-pending";
const FIXTURES: DnsFixture[] = ["connection-failure", "domain-not-found", "hosted-elsewhere", "conflict", "update-failed", "propagation-pending"];
export const dnsFixture: DnsFixture | null = (() => {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("dnsFixture");
  return FIXTURES.includes(v as DnsFixture) ? (v as DnsFixture) : null;
})();
