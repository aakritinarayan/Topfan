/**
 * Context-aware assistant: a companion that follows the creator through setup.
 *
 * Every interaction follows: understand context → identify useful help → suggest or prepare →
 * ask for approval when needed → act → confirm the outcome.
 *
 * - No help-level setting: the assistant adapts to what the creator does.
 * - The creator can use the TopFan form directly; the assistant watches the form and never re-asks.
 * - Proactive suggestions are short, dismissible and skipped while suggestions are paused.
 *   Error explanations and confirmations always appear.
 * - Nothing external (DNS changes, publishing) happens without an explicit click.
 */
import { useEffect, useRef, useState } from "react";
import { GODADDY_TUTORIAL, VideoTutorialCard } from "./VideoTutorial";
import { creator, domain as demoDomain, draftWelcomePost, temporaryAddressNote } from "../config/demo";
import { useAssistant } from "../state/assistantStore";
import { useDomainFinder } from "../state/domainFinderStore";
import { useQuest } from "../state/questStore";
import { isOnboarding, siteAddress, usePlatform } from "../state/platformStore";
import { usePlatformAgent } from "./platform/PlatformAgent";
import { useRouter } from "../app/router";
import { useRecords } from "../platform/wls/DnsRecordsStep";
import { CopyLine } from "./AssistantPanel";
import { DraftCard } from "./Extras";
import { SimulatedConsent } from "./SimulatedConsent";

const ROOT_DOMAIN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})*\.[a-z]{2,}$/i;
const firstName = creator.name.split(" ")[0];

export function AssistantDirector() {
  const { state, patch, go } = usePlatform();
  const a = useAssistant();
  const agent = usePlatformAgent();
  const { navigate } = useRouter();
  const finder = useDomainFinder();
  const quest = useQuest();
  const records = useRecords();
  const [consentOpen, setConsentOpen] = useState(false);
  // Open suggestion cards, so they can be settled when the creator acts in the form instead.
  const cards = useRef<Record<string, string | null>>({});
  // Fresh state for async callbacks.
  const live = useRef(state);
  live.current = state;

  const onboarding = isOnboarding(state.screen);
  const provider = state.provider ?? demoDomain.provider;
  const domainName = state.domainName || demoDomain.name;
  const address = siteAddress(state);

  const settle = (key: string, answer?: string) => {
    const id = cards.current[key];
    if (id) a.resolve(id, answer);
    cards.current[key] = null;
  };

  const recordList = (
    <>
      {records.map((r, i) => (
        <div key={i} className={i ? "mt-2" : ""}>
          <p className="font-bold text-white">Record {i + 1} (CNAME)</p>
          <p className="break-all font-mono">
            {r.host} → {r.value}
          </p>
        </div>
      ))}
    </>
  );

  /* ================= Welcome ================= */
  // Waits for the first-time intro to finish (or be skipped). If the creator already met the mascot in
  // the intro card, the panel opens straight on the first question.
  useEffect(() => {
    if (!onboarding || (a.intro === "pending" && state.screen === "step1")) return;
    a.once("welcome", () => {
      if (a.intro === "none") {
        a.say({
          text: (
            <>
              Hi {firstName}, I'm your TopFan Assistant. I'll be right here while you set up your site.
              <br />
              <br />
              You can fill in the form yourself anytime and I'll keep up. Nothing changes without your OK.
            </>
          ),
        });
      }
      const s = live.current;
      if (s.screen === "step1" && !s.domainName && s.hasDomain) {
        cards.current.domainQ = a.say({
          text: "Let's get your website ready. Do you already have a domain name?",
          choice: {
            instant: true,
            options: [
              { value: "yes", label: "Yes, I have a domain", recommended: true },
              { value: "no", label: "No, help me find one" },
            ],
            onPick: (v) => {
              cards.current.domainQ = null;
              if (v === "yes") {
                patch({ hasDomain: true });
                a.say({ text: <>Great. Type it into <b>Domain Name</b> on the left, for example yourname.com.</> });
                a.highlight("domain");
              } else {
                finder.set({ requested: true });
                patch({ hasDomain: false });
              }
            },
          },
        });
      }
    });
  }, [onboarding, a.intro, state.screen]);

  // The creator answered in the form instead: settle the question, don't ask again.
  useEffect(() => {
    if (state.domainName || !state.hasDomain) settle("domainQ");
  }, [state.domainName, state.hasDomain]);

  /* ================= Step 1: domain ================= */
  // "I don't have a Domain Name" is handled by the domain finder (DomainFinder.tsx).

  // Provider: look it up, then offer to fill it in.
  useEffect(() => {
    if (state.screen !== "step1" || !state.hasDomain || state.provider || a.muted) return;
    const d = state.domainName;
    if (d && d === finder.live.current.purchased) return; // just bought: the finder asks where DNS is managed
    if (d === demoDomain.name) {
      a.once("detect", () =>
        a.run(`Looking up where ${d} is registered…`, 1200, () => {
          if (live.current.provider) return; // creator picked one meanwhile
          cards.current.provider = a.suggest({
            text: (
              <>
                I found a likely provider for {d}: <b>{demoDomain.provider}</b>. Want me to fill that in?
              </>
            ),
            details: "Found in the domain's public registration record (simulated in this demo).",
            actions: [
              { label: "Fill it in", variant: "primary", onClick: fillProvider },
              { label: "Not now", variant: "text", onClick: () => {} },
            ],
          });
        }),
      );
      return;
    }
    if (!ROOT_DOMAIN.test(d)) return;
    const t = setTimeout(
      () =>
        a.once(`no-detect-${d}`, () =>
          a.suggest({ text: `I couldn't find the provider for ${d} in this demo. Pick it from the Domain / DNS Provider list.` }),
        ),
      1400,
    );
    return () => clearTimeout(t);
  }, [state.screen, state.hasDomain, state.domainName, state.provider, a.muted]);

  function fillProvider() {
    cards.current.provider = null;
    patch({ provider: demoDomain.provider });
    a.markDetected("provider");
    a.highlight("provider");
    a.say({
      status: "done",
      text: <>{demoDomain.provider} is filled in.</>,
      actions: [
        {
          label: "Undo",
          variant: "text",
          onClick: () => {
            patch({ provider: null });
            a.markDetected("provider", false);
            a.say({ text: "Undone. You can pick your provider from the list." });
          },
        },
      ],
    });
  }

  // Creator chose a provider in the form: settle the offer.
  useEffect(() => {
    if (state.provider) settle("provider", state.provider);
  }, [state.provider]);

  // Address: recommend a sub-domain when the domain already handles email.
  useEffect(() => {
    if (state.screen !== "step1" || !state.hasDomain || !state.provider) return;
    if (state.domainName !== demoDomain.name || !demoDomain.hasEmail) return;
    if (state.urlPreference === "subdomain" || state.subdomain) return; // creator already chose
    const d = state.domainName;
    a.once("address", () => {
      cards.current.address = a.suggest({
        text: <>{d} already handles your email. To keep it working, I'd give your fan site its own address. Want me to set that up?</>,
        details: `${d} has email (MX) records. Using the main domain for TopFan means changing records your email relies on. A sub-domain only adds 2 new CNAME records and leaves email alone.`,
        choice: {
          confirmLabel: "Fill it in",
          options: [demoDomain.recommendedSubdomain, ...demoDomain.subdomainAlternatives].map((s, i) => ({
            value: s,
            label: `${s}.${d}`,
            recommended: i === 0,
          })),
          onPick: (v) => {
            cards.current.address = null;
            patch({ urlPreference: "subdomain", subdomain: v });
            a.highlight("subdomain");
            a.say({
              status: "confirm",
              text: (
                <>
                  Filled in <b>{v}.{d}</b>. Have a look, then click <b>Save &amp; Continue</b>.
                </>
              ),
            });
          },
        },
        actions: [
          {
            label: `Keep ${d}`,
            variant: "text",
            onClick: () => {
              cards.current.address = null;
              a.say({ text: `OK. Your site will use ${d} and www.${d}.` });
            },
          },
        ],
      });
    });
  }, [state.screen, state.hasDomain, state.provider, state.domainName, state.urlPreference, state.subdomain]);

  // Creator set the address in the form: settle the recommendation.
  useEffect(() => {
    if (state.urlPreference === "subdomain" || state.subdomain) settle("address", "Set in the form");
  }, [state.urlPreference, state.subdomain]);

  // Explain validation errors in plain words, with a fix where possible.
  useEffect(() => {
    const e = state.formErrors;
    const keys = Object.keys(e);
    if (state.screen !== "step1" || !keys.length) return;
    a.once(`errors-${JSON.stringify(e)}-${state.domainName}`, () => {
      const lines: string[] = [];
      if (e.provider) lines.push("Pick where you bought your domain from the Domain / DNS Provider list.");
      if (e.domain === "Domain name is required") lines.push("Enter your domain name, for example yourname.com.");
      else if (e.domain) lines.push("Enter just the domain, without https://, www or a slash. For example: yourname.com.");
      if (e.subdomain) lines.push("Enter a short name for your fan site address, for example fans.");
      const cleaned = state.domainName.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
      const canFix = !!e.domain && cleaned !== state.domainName && ROOT_DOMAIN.test(cleaned);
      a.say({
        status: "problem",
        text: keys.length === 1 ? "One thing needs a fix before you can continue:" : "A few things need a fix before you can continue:",
        body: (
          <ul className="list-disc space-y-1.5 pl-4 text-[13px]">
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ),
        actions: canFix
          ? [
              {
                label: `Change it to ${cleaned}`,
                variant: "primary",
                onClick: () => {
                  patch({ domainName: cleaned, formErrors: {} });
                  a.highlight("domain");
                  a.say({ status: "done", text: <>Changed it to <b>{cleaned}</b>.</> });
                },
              },
            ]
          : undefined,
      });
      a.highlight(e.provider ? "provider" : e.domain ? "domain" : "subdomain");
    });
  }, [state.formErrors]);

  // Next logical step: everything is filled in.
  useEffect(() => {
    if (state.screen !== "step1" || !state.hasDomain) return;
    const ready =
      !!state.provider && ROOT_DOMAIN.test(state.domainName) && (state.urlPreference === "root_domain" || !!state.subdomain);
    if (!ready || cards.current.address || cards.current.provider) return;
    const t = setTimeout(
      () =>
        a.once("ready-step1", () => {
          if (a.suggest({ text: <>Everything looks good. Next step: <b>Save &amp; Continue</b>.</> })) a.highlight("save");
        }),
      1800,
    );
    return () => clearTimeout(t);
  }, [state.screen, state.hasDomain, state.provider, state.domainName, state.urlPreference, state.subdomain]);

  /* ================= Step 2: DNS ================= */
  useEffect(() => {
    if (state.screen !== "step2" || state.recordsVerified) return;
    a.once("step2", () => {
      cards.current.step2 = a.suggest({
        text: (
          <>
            This part can get technical. Your domain needs 2 records so it points to your TopFan site. I can prepare the connection for
            you, or walk you through it.
          </>
        ),
        details: recordList,
        actions: [
          { label: "Prepare it for me", variant: "primary", onClick: prepareConnection },
          { label: "Walk me through it", variant: "outline", onClick: guideSteps },
        ],
      });
    });
  }, [state.screen]);

  // GoDaddy selected: offer the video walkthrough as a card (plays only when the creator opens it).
  useEffect(() => {
    if (state.screen !== "step2" || state.recordsVerified || state.provider !== "GoDaddy") return;
    a.once("godaddy-video", () =>
      a.say({
        text: "Prefer to watch? Here's a short video of adding the records at GoDaddy.",
        plain: "Offered a 42-second GoDaddy DNS video walkthrough (uses example values).",
        body: <VideoTutorialCard tutorial={GODADDY_TUTORIAL} />,
      }),
    );
  }, [state.screen, state.provider]);

  // Creator went ahead and verified on their own: settle the offer.
  useEffect(() => {
    if (state.verifyAttempts > 0) settle("step2");
  }, [state.verifyAttempts]);

  function prepareConnection() {
    cards.current.step2 = null;
    a.say({
      text: (
        <>
          I'll add 2 records in your {provider} account so your site works at <b>{address}</b>. You'll sign in at {provider} yourself. TopFan
          only adds 2 records and can't see your password.
        </>
      ),
    });
    setTimeout(() => setConsentOpen(true), 500);
  }

  function guideSteps() {
    cards.current.step2 = null;
    a.say({
      text: <>Here's how to add the 2 records at {provider}, one field at a time:</>,
      body: (
        <ol className="list-decimal space-y-2.5 pl-4 text-[13px]">
          <li>
            Sign in at {provider} and open <b>My Products</b>.
          </li>
          <li>
            Next to {domainName}, choose <b>DNS</b>.
          </li>
          <li>
            Click <b>Add New Record</b> and choose type <b>CNAME</b>.
          </li>
          <li>
            Fill in the first record, then save:
            <CopyLine label="Name" value={records[0].host} />
            <CopyLine label="Value" value={records[0].value} />
          </li>
          <li>
            Add a second CNAME record the same way:
            <CopyLine label="Name" value={records[1].host} />
            <CopyLine label="Value" value={records[1].value} />
          </li>
          <li>
            Come back here and click <b>Verify &amp; Continue</b>.
          </li>
        </ol>
      ),
      details: `${provider} adds “.${domainName}” to the name for you, so type only the part shown above.`,
    });
  }

  const connect = () => {
    setConsentOpen(false);
    a.userSays("Connect");
    a.run(
      `Adding 2 records at ${provider}…`,
      2500,
      () => {
        patch({ recordsVerified: true });
        a.say({
          status: "done",
          text: (
            <>
              2 records added at {provider}. Next step: <b>Verify &amp; Continue</b>.
            </>
          ),
          details: recordList,
          actions: [
            {
              label: "Undo",
              variant: "text",
              onClick: () => {
                patch({ recordsVerified: false });
                a.say({ text: `Undone. I removed the 2 records at ${provider} (simulated).` });
              },
            },
          ],
        });
        a.highlight("verify");
      },
      () => a.say({ text: `Stopped. Nothing was changed at ${provider}.` }),
    );
  };

  const cancelConnect = () => {
    setConsentOpen(false);
    a.say({
      text: `No problem. Nothing was changed at ${provider}.`,
      actions: [
        { label: "Try again", variant: "primary", onClick: () => setConsentOpen(true) },
        { label: "Walk me through it", variant: "text", onClick: guideSteps },
      ],
    });
  };

  // Verification failed: offer help (replaces the generic modal while the panel is open).
  useEffect(() => {
    if (state.screen !== "step2" || state.verifyAttempts === 0 || state.recordsVerified) return;
    a.once(`verify-fail-${state.verifyAttempts}`, () =>
      a.say({
        status: "problem",
        text: "Looks like one of the records needs attention. Want me to help fix it?",
        actions: [
          { label: "Help me fix it", variant: "primary", onClick: explainFix },
          {
            label: "I'll check it myself",
            variant: "text",
            onClick: () =>
              a.say({
                text: "OK. Changes at your provider can take up to 60 minutes to show up. Click Verify & Continue again whenever you're ready.",
              }),
          },
        ],
      }),
    );
  }, [state.screen, state.verifyAttempts, state.recordsVerified]);

  function explainFix() {
    const host2 = records[1].host;
    a.say({
      text: "Here's what I found:",
      body: (
        <ul className="space-y-2 text-[13px]">
          <li className="flex gap-2">
            <span className="text-accent">✓</span>
            <span>Record 1 found</span>
          </li>
          <li className="flex gap-2">
            <span className="text-danger">✗</span>
            <span className="min-w-0">
              Record 2 found, but the name looks like <b className="break-all">{`${host2}.${domainName}.${domainName}`}</b>. {provider} added
              your domain twice. In {provider}, change the name to just:
              <CopyLine label="Name" value={host2} />
            </span>
          </li>
        </ul>
      ),
      details: `Lookup for ${host2}.${domainName} returned nothing; ${host2}.${domainName}.${domainName} exists instead (simulated).`,
      actions: [
        {
          label: "Check again",
          variant: "primary",
          onClick: () =>
            a.run("Checking your records…", 1500, () => {
              patch({ recordsVerified: true });
              a.say({ status: "done", text: <>Both records found. Next step: <b>Verify &amp; Continue</b>.</> });
              a.highlight("verify");
            }),
        },
      ],
    });
  }

  /* ================= Provisioning ================= */
  const provisioningOffer = useRef<string | null>(null);
  useEffect(() => {
    if (state.screen !== "provisioning") return;
    a.once("provisioning", () => {
      a.say({
        status: "done",
        text: (
          <>
            Your domain is connected. Your website is being prepared at <b>{address}</b>. This can take up to 10 minutes.
            <br />
            <br />
            {temporaryAddressNote}
          </>
        ),
      });
      provisioningOffer.current = a.suggest({
        text: "Want to explore TopFan with a quick game, or prepare some content while we finish?",
        actions: [
          {
            label: "Play Creator Quest",
            variant: "outline",
            onClick: () => {
              if (quest.view.kind === "closed") {
                quest.setView({ kind: "select" });
                quest.emit("quest_opened");
              }
              a.highlight("creator-quest");
            },
          },
          { label: "Draft my first post", variant: "outline", onClick: draftPost },
        ],
      });
    });
  }, [state.screen]);

  function draftPost() {
    a.run("Drafting a welcome post from your profile…", 1500, () => {
      a.setDraftPost(draftWelcomePost);
      a.say({
        status: "confirm",
        text: "Here's a draft for your first post, based on your profile. Nothing is posted. I'll keep it for when your dashboard opens.",
        body: <DraftCard text={draftWelcomePost} />,
        actions: [
          { label: "Keep it", variant: "primary", onClick: () => a.say({ status: "done", text: "Saved as a draft." }) },
          {
            label: "Discard",
            variant: "text",
            onClick: () => {
              a.setDraftPost(null);
              a.say({ text: "Discarded." });
            },
          },
        ],
      });
    });
  }

  /* ================= Site activated (real status, even while a game holds the page) ================= */
  useEffect(() => {
    if (!state.provisionDone && state.screen !== "complete") return;
    if (!isOnboarding(state.screen)) return;
    // The "while we finish" offer is stale once the site is live.
    if (provisioningOffer.current) a.dismiss(provisioningOffer.current);
    a.once("complete", () =>
      // Not forced open: if the panel is collapsed this only adds an unread badge.
      a.say({
        status: "done",
        text: "Your website is ready! You can open it now, or I can help you personalize your branding and prepare your first content.",
        actions: [
          { label: "Go to my site", variant: "primary", onClick: () => go("manage") },
          ...(a.draftPost ? [] : [{ label: "Draft my first post", variant: "outline" as const, onClick: draftPost }]),
        ],
      }),
    );
  }, [state.screen, state.provisionDone]);

  // Platform pages: quiet by default (brief §12.3). Arriving straight from setup gets one short summary
  // of what needs attention; a direct visit starts with the panel collapsed.
  useEffect(() => {
    if (onboarding) return;
    if (a.messages.length > 0)
      a.once("dashboard", () => {
        if (a.draftPost)
          a.say({
            text: "Your drafted first post is still here. Nothing has been posted.",
            actions: [{ label: "Use my drafted post", variant: "primary", onClick: () => navigate("/dashboard/newpost?prefill=assistant") }],
          });
        agent.showAttention("You're all set up. One thing worth a look next:");
      });
    else a.once("platform-collapsed", () => a.setOpen(false));
  }, [onboarding]);

  return (
    <SimulatedConsent
      open={consentOpen}
      provider={provider}
      domain={domainName}
      records={records}
      onConnect={connect}
      onCancel={cancelConnect}
    />
  );
}
