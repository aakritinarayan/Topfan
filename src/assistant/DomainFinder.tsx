/**
 * "I don't have a Domain Name": the assistant does the research and preparation, the creator decides.
 *
 * Offer → ask the name fans should remember → suggest names → check availability (domain service,
 * simulated here) → recommend one → GoDaddy price → hand off to GoDaddy's own site →
 * "Welcome back" → confirm what was bought → fill the TopFan form → continue to connection.
 *
 * Cards read the finder store, so they stay current and survive collapsing the panel.
 * Never asks for registrar passwords or payment details; never marks a domain as purchased by itself.
 */
import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, ExternalLink, Info, Loader2, RotateCcw } from "lucide-react";
import { ASSISTANT_REGISTRAR, creator } from "../config/demo";
import { useAssistant } from "../state/assistantStore";
import { usePlatform } from "../state/platformStore";
import { useDomainFinder, type CheckState } from "../state/domainFinderStore";
import {
  MAX_ROUNDS,
  checkAvailability,
  hasExistingSite,
  money,
  recommend,
  registrarById,
  slugOf,
  suggestDomains,
  type DomainCheck,
} from "../services/domainService";

const ROOT_DOMAIN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})*\.[a-z]{2,}$/i;
const isDone = (c: CheckState | undefined): c is DomainCheck => !!c && c.status !== "checking";

/** Open a registrar page in a new tab. Only the registrar's own public pages are used. */
export function openRegistrar(registrarId: string, domain: string | null) {
  const r = registrarById(registrarId);
  const url = domain && r.searchUrl ? r.searchUrl(domain) : r.homeUrl;
  window.open(url, "_blank", "noopener,noreferrer");
  return url;
}

/* ================================ flow ================================ */

export function DomainFinderDirector() {
  const a = useAssistant();
  const { state, patch } = usePlatform();
  const { finder, live, set } = useDomainFinder();
  const offerId = useRef<string | null>(null);
  const prevHasDomain = useRef(state.hasDomain);
  const platform = useRef(state);
  platform.current = state;

  /* ---- entry: the creator picked "I don't have a Domain Name" ---- */
  useEffect(() => {
    const was = prevHasDomain.current;
    prevHasDomain.current = state.hasDomain;
    if (state.screen !== "step1") return;
    const f = live.current;

    if (!state.hasDomain) {
      if (f.requested) {
        set({ requested: false });
        askBrand();
        return;
      }
      if (f.ideas.length) {
        // Came back to "no domain": the shortlist is still here.
        if (was) a.say({ text: "Your shortlist is still here.", body: <IdeaList round="all" flow={flow} /> });
        return;
      }
      if (offerId.current) return;
      offerId.current = a.suggest({
        text: (
          <>
            No domain yet? I can help you find one.
            <br />
            <br />
            I'll suggest a few names for your website, help check what's available, and show you where to purchase your favorite.
          </>
        ),
        actions: [
          { label: "Help me find a domain", variant: "primary", onClick: () => ((offerId.current = null), askBrand()) },
          { label: "I'll buy one myself", variant: "outline", onClick: () => ((offerId.current = null), buyMyself()) },
        ],
      });
      return;
    }

    // Switched to "I already have a Domain Name".
    if (was) return;
    if (offerId.current) {
      a.resolve(offerId.current, "Switched to my own domain");
      offerId.current = null;
    }
    if (f.ideas.length && !f.purchased) a.say({ text: "Switched to your own domain. Your shortlist is saved in case you need it." });
  }, [state.hasDomain, state.screen]);

  /* ---- started from a chat answer while "I don't have a Domain Name" was already selected ---- */
  useEffect(() => {
    // Read the live copy: the entry effect above may have just handled (and cleared) this request.
    if (!live.current.requested || state.hasDomain || state.screen !== "step1") return;
    set({ requested: false });
    if (offerId.current) {
      a.resolve(offerId.current, "Help me find a domain");
      offerId.current = null;
    }
    askBrand();
  }, [finder.requested]);

  /* ---- coming back from the registrar tab ---- */
  useEffect(() => {
    const onVis = () => {
      const h = live.current.handoff;
      if (!h || h.asked) return;
      if (document.hidden) set({ handoff: { ...h, away: true } });
      else if (h.away) askReturn();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function buyMyself() {
    a.say({
      text: (
        <>
          No problem. <b>Purchase Domain on Namecheap</b> on the left opens Namecheap.
          When you're back, I'll help you connect it. Your progress here is saved.
        </>
      ),
    });
    a.highlight("buy-domain");
  }

  function askBrand() {
    const f = live.current;
    a.say({
      text: "What name would you like your fans to remember?",
      body: <BrandAsk initial={f.brand || creator.name} onSubmit={generate} />,
    });
  }

  function generate(brand: string) {
    const f = live.current;
    const changed = slugOf(brand) !== slugOf(f.brand);
    a.userSays(brand);
    set(changed ? { brand, ideas: [], rounds: 0, selected: null } : { brand });
    if (!changed && f.rounds) {
      a.say({ text: "Here's your shortlist again.", body: <IdeaList round="all" flow={flow} /> });
      return;
    }
    a.setMood("thinking");
    a.run(
      `Thinking of names for ${brand}…`,
      1100,
      () => addRound(0),
      () => {
        a.setMood("idle");
        a.say({ text: "Stopped. Nothing was searched." });
      },
    );
  }

  function addRound(round: number) {
    const f = live.current;
    const ideas = suggestDomains(f.brand, round);
    if (!ideas.length) return outOfIdeas();
    set((s) => ({ ideas: [...s.ideas, ...ideas.map((i) => ({ ...i, round }))], rounds: round + 1 }));
    a.say({
      text:
        round === 0 ? (
          <>Here are a few ideas for {f.brand}. I'm checking which ones are available.</>
        ) : (
          "Here are a few more ideas. Checking them now."
        ),
      body: <IdeaList round={round} flow={flow} />,
    });
    void checkRound(round, ideas.map((i) => i.domain));
  }

  async function checkRound(round: number, domains: string[]) {
    a.setMood("checking");
    set((s) => ({ checks: { ...s.checks, ...Object.fromEntries(domains.map((d) => [d, { status: "checking" as const }])) } }));
    const results = await Promise.all(
      domains.map(async (d) => {
        const r = await checkAvailability(d);
        set((s) => ({ checks: { ...s.checks, [d]: r } }));
        return r;
      }),
    );
    const available = results.filter((r) => r.status === "available");
    if (!available.length) {
      a.setMood("thoughtful");
      if (round + 1 < MAX_ROUNDS) {
        a.say({ text: "These are all taken or couldn't be checked. Here are a few more ideas." });
        return addRound(round + 1);
      }
      return outOfIdeas();
    }
    a.setMood("happy");
    const all = Object.values(live.current.checks).filter(isDone);
    const rec = recommend(all, slugOf(live.current.brand));
    if (rec && available.some((r) => r.domain === rec.domain)) {
      const second = all.find((c) => c.status === "available" && c.domain !== rec.domain);
      a.say({
        text: (
          <>
            I'd recommend <b>{rec.domain}</b>. {rec.why}
            {second && round === 0 && (
              <>
                {" "}
                If you'd rather highlight your community, <b>{second.domain}</b> is another option.
              </>
            )}
          </>
        ),
        details:
          "Based on length, spelling, extension and renewal price. I haven't checked trademarks: if a name looks like another brand, check before you buy.",
      });
    }
  }

  function outOfIdeas() {
    a.setMood("thoughtful");
    a.say({
      text: "I couldn't find an available name from these ideas. Try a different name, or search directly at a registrar.",
      actions: [
        { label: "Try a different name", variant: "primary", onClick: askBrand },
        { label: "Search on GoDaddy", variant: "outline", onClick: () => openRegistrar(ASSISTANT_REGISTRAR, null) },
      ],
    });
  }

  async function retry(domain: string) {
    set((s) => ({ checks: { ...s.checks, [domain]: { status: "checking" } } }));
    a.setMood("checking");
    const r = await checkAvailability(domain);
    set((s) => ({ checks: { ...s.checks, [domain]: r } }));
    a.setMood(r.status === "available" ? "happy" : r.status === "taken" ? "thoughtful" : "idle");
  }

  function alternatives(domain: string) {
    const f = live.current;
    a.setMood("thoughtful");
    if (f.rounds < MAX_ROUNDS) {
      a.say({ text: <>{domain} is already taken, but I've found a few alternatives.</> });
      addRound(f.rounds);
    } else {
      a.say({ text: <>{domain} is already taken. Your other options are in the list above.</> });
    }
  }

  function select(domain: string) {
    set({ selected: domain });
    a.userSays(`I'll go with ${domain}`);
    a.setMood("happy");
    a.say({
      status: "confirm",
      text: "Great choice! Let's get this domain registered so we can connect it to your TopFan website.",
      body: <PurchaseSummary domain={domain} flow={flow} />,
    });
  }

  async function continuePurchase(domain: string) {
    const f = live.current;
    const reg = registrarById(f.registrarId);
    a.setMood("checking");
    set((s) => ({ checks: { ...s.checks, [domain]: { status: "checking" } } }));
    const r = await checkAvailability(domain, { recheck: true });
    set((s) => ({ checks: { ...s.checks, [domain]: r } }));
    if (r.status !== "available") {
      a.setMood("thoughtful");
      set({ selected: null });
      a.say({
        status: "problem",
        text: <>{domain} was just registered by someone else, so I didn't send you to checkout. Pick another name from your shortlist.</>,
        actions: [{ label: "Show my shortlist", variant: "primary", onClick: () => a.say({ body: <IdeaList round="all" flow={flow} /> }) }],
      });
      return;
    }
    openRegistrar(reg.id, domain);
    set({ handoff: { domain, registrarId: reg.id, at: Date.now(), away: false, asked: false } });
    a.setMood("happy", 1600);
    a.say({
      text: reg.searchUrl ? (
        <>
          I opened {reg.name}'s search for <b>{domain}</b> in a new tab. Your progress here is saved.
        </>
      ) : (
        <>
          I opened {reg.name} Registrar in a new tab. Sign in there, then search for <b>{domain}</b>. Your progress here is saved.
        </>
      ),
      body: (
        <p className="text-[12px] leading-[18px] text-soft">
          Sign in and pay only on {reg.name}'s site. I'll never ask for your password or card details.{" "}
          <button onClick={() => openRegistrar(reg.id, domain)} className="inline-flex items-center gap-1 font-bold text-accent underline">
            Open {reg.name} again <ExternalLink size={11} />
          </button>
        </p>
      ),
      actions: [{ label: `I'm back from ${reg.name}`, variant: "outline", onClick: askReturn }],
    });
  }

  function askReturn() {
    const h = live.current.handoff;
    if (!h || h.asked) return;
    set({ handoff: { ...h, asked: true, away: false } });
    a.setMood("idle");
    a.say({
      text: "Welcome back! Were you able to purchase your domain?",
      choice: {
        instant: true,
        options: [
          { value: "yes", label: "Yes, I purchased it", recommended: true },
          { value: "no", label: "Not yet" },
          { value: "other", label: "I chose a different domain" },
        ],
        onPick: (v) => {
          if (v === "yes") return askConfirm(live.current.handoff?.domain ?? "");
          if (v === "other") return askConfirm("");
          notYet();
        },
      },
    });
  }

  function notYet() {
    const h = live.current.handoff!;
    const reg = registrarById(h.registrarId);
    a.say({
      text: "No problem. Your shortlist and your choice are saved.",
      actions: [
        {
          label: `Reopen ${reg.name}`,
          variant: "primary",
          onClick: () => {
            openRegistrar(reg.id, h.domain);
            set({ handoff: { ...h, asked: false, away: false } });
            a.say({
              text: <>Opened {reg.name} again.</>,
              actions: [{ label: `I'm back from ${reg.name}`, variant: "outline", onClick: askReturn }],
            });
          },
        },
        {
          label: "Explore other names",
          variant: "outline",
          onClick: () =>
            live.current.ideas.length ? a.say({ text: "Here's your shortlist.", body: <IdeaList round="all" flow={flow} /> }) : askBrand(),
        },
      ],
    });
  }

  function askConfirm(prefill: string) {
    a.say({
      text: prefill ? "Great! Please confirm the domain you bought." : "Which domain did you buy?",
      body: <ConfirmDomain initial={prefill} onConfirm={confirmPurchased} />,
    });
  }

  /** The creator says they own it. That's their word, not verified ownership: DNS verification confirms it later. */
  function confirmPurchased(domain: string) {
    const d = domain.trim().toLowerCase();
    const h = live.current.handoff;
    set({ purchased: d });
    a.userSays(d);
    patch({ hasDomain: true, domainName: d, formErrors: {} });
    a.highlight("domain");
    // Likely where they bought it: the registrar we sent them to (they still confirm it).
    const reg = h ? registrarById(h.registrarId) : null;
    a.say({
      status: "done",
      text: (
        <>
          Filled in <b>{d}</b> on the left. Where is its DNS managed?{reg ? " Usually it's where you bought it." : ""}
        </>
      ),
      details: "You told me you bought this domain. TopFan confirms ownership when it verifies the DNS records in the next step.",
      choice: {
        instant: true,
        options: [
          ...(reg ? [{ value: reg.name, label: `At ${reg.name}`, recommended: true }] : []),
          { value: "unsure", label: "I'm not sure" },
          { value: "other", label: reg ? "Somewhere else" : "I'll pick it" },
        ],
        onPick: (v) => {
          if (v === "other") {
            a.say({ text: "Pick it from the Domain / DNS Provider list on the left." });
            a.highlight("provider");
            return nextStep(d);
          }
          if (v === "unsure") return lookUpDns(d, reg?.name ?? null);
          patch({ provider: v });
          a.highlight("provider");
          nextStep(d);
        },
      },
    });
  }

  function lookUpDns(d: string, guess: string | null) {
    a.setMood("checking");
    a.run(`Looking up where ${d}'s DNS is managed…`, 1200, () => {
      a.setMood("idle");
      if (!guess) {
        a.say({ text: `I couldn't find it in this demo. It's usually the company you bought ${d} from. Pick it from the Domain / DNS Provider list.` });
        a.highlight("provider");
        return nextStep(d);
      }
      a.say({
        text: (
          <>
            It looks like <b>{guess}</b> manages it. Want me to fill that in?
          </>
        ),
        details: "From the domain's public name-server records (simulated in this demo).",
        actions: [
          {
            label: "Fill it in",
            variant: "primary",
            onClick: () => {
              patch({ provider: guess });
              a.markDetected("provider");
              a.highlight("provider");
              nextStep(d);
            },
          },
          { label: "I'll pick it", variant: "text", onClick: () => (a.highlight("provider"), nextStep(d)) },
        ],
      });
    });
  }

  function nextStep(d: string) {
    a.say({ text: "Your domain is selected. Next, let's connect it to your TopFan website." });
    if (hasExistingSite(d)) {
      a.suggest({
        text: (
          <>
            {d} already shows a website. To keep it running, I'd give your fan site its own address, like <b>fans.{d}</b>. Want me to fill
            that in?
          </>
        ),
        actions: [
          {
            label: "Fill it in",
            variant: "primary",
            onClick: () => {
              patch({ urlPreference: "subdomain", subdomain: "fans" });
              a.highlight("subdomain");
            },
          },
          { label: `Use ${d}`, variant: "text", onClick: () => {} },
        ],
      });
    }
  }

  const flow: Flow = { select, retry, alternatives, continuePurchase, showAll: () => a.say({ body: <IdeaList round="all" flow={flow} /> }) };

  return null;
}

interface Flow {
  select: (d: string) => void;
  retry: (d: string) => void;
  alternatives: (d: string) => void;
  continuePurchase: (d: string) => void;
  showAll: () => void;
}

/* ================================ cards ================================ */

function SimTag() {
  return (
    <span
      title="Simulated in this prototype. In the product, availability and prices come from the registrar."
      className="inline-flex h-5 items-center rounded-full border border-line px-2 text-[10px] font-bold uppercase tracking-caps text-muted"
    >
      Simulated
    </span>
  );
}

function BrandAsk({ initial, onSubmit }: { initial: string; onSubmit: (v: string) => void }) {
  const [v, setV] = useState(initial);
  const [sent, setSent] = useState(false);
  const submit = () => {
    if (!v.trim() || sent) return;
    setSent(true);
    onSubmit(v.trim());
  };
  if (sent) return null;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-2"
    >
      <input
        aria-label="Name fans should remember"
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="h-9 min-w-0 flex-1 rounded-pill bg-bg px-4 text-[13px] text-white outline-none focus:ring-1 focus:ring-accent"
      />
      <button
        disabled={!v.trim()}
        className="h-9 shrink-0 rounded-pill bg-accent px-4 text-[12px] font-black uppercase tracking-caps hover:brightness-110 disabled:opacity-40"
      >
        Suggest names
      </button>
    </form>
  );
}

function IdeaList({ round, flow }: { round: number | "all"; flow: Flow }) {
  const { finder } = useDomainFinder();
  const ideas = finder.ideas.filter((i) => round === "all" || i.round === round);
  const all = Object.values(finder.checks).filter(isDone);
  const rec = recommend(all, slugOf(finder.brand));
  const settled = ideas.every((i) => isDone(finder.checks[i.domain]));
  // Most relevant first, once checks are in (never reshuffle while results are arriving).
  const rank = (d: string) => {
    const c = finder.checks[d];
    if (d === rec?.domain) return 0;
    if (isDone(c) && c.status === "available") return 1;
    if (isDone(c) && c.status === "error") return 2;
    return 3;
  };
  const shown = settled ? [...ideas].sort((x, y) => rank(x.domain) - rank(y.domain)) : ideas;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <SimTag />
      </div>
      {shown.map((i) => (
        <IdeaCard
          key={i.domain}
          domain={i.domain}
          reason={i.reason}
          check={finder.checks[i.domain]}
          recommended={i.domain === rec?.domain}
          selected={finder.selected === i.domain}
          flow={flow}
        />
      ))}
    </div>
  );
}

function IdeaCard({
  domain,
  reason,
  check,
  recommended,
  selected,
  flow,
}: {
  domain: string;
  reason: string;
  check: CheckState | undefined;
  recommended: boolean;
  selected: boolean;
  flow: Flow;
}) {
  const done = isDone(check);
  const status = done ? check.status : "checking";
  const tld = domain.split(".").slice(1).join(".");
  const pill = "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold";
  const link = "inline-flex items-center gap-1 text-[12px] font-bold hover:underline";
  return (
    <div className={`rounded-tile border bg-bg px-4 py-3.5 ${recommended && status === "available" ? "border-accent/50" : "border-line"}`} data-domain={domain}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-all text-[15px] font-bold leading-6" title={reason}>
            {domain}
          </p>
        </div>
        {status === "checking" && (
          <span className="flex h-6 shrink-0 items-center gap-1 text-[11px] text-muted">
            <Loader2 size={12} className="animate-spin" /> Checking
          </span>
        )}
        {status === "available" &&
          (recommended ? (
            <span className={`${pill} bg-accent/10 font-medium text-accent`}>Recommended</span>
          ) : (
            <span className={`${pill} border border-accent`}>
              <Check size={11} strokeWidth={3} /> Available
            </span>
          ))}
        {status === "taken" && <span className={`${pill} bg-surface-2 text-soft`}>Taken</span>}
        {status === "error" && <span className={`${pill} border border-line text-soft`}>Not confirmed</span>}
        {status === "unsupported" && <span className={`${pill} bg-surface-2 text-soft`}>Can't check</span>}
      </div>

      {status !== "checking" && <div className="mt-3 border-t border-line pt-3">
        {status === "available" && done && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] leading-[18px] text-soft">
              {check.best ? (
                <>
                  <b className="text-[13px] text-white">{money(check.best.first)}</b> first year · renews {money(check.best.renewal)}/yr
                  <br />
                  <span className="text-muted">at {registrarById(check.best.registrarId).name}</span>
                </>
              ) : (
                <span className="text-muted">Price not available. Check at the registrar.</span>
              )}
            </p>
            <button
              onClick={() => flow.select(domain)}
              disabled={selected}
              className="h-8 shrink-0 rounded-pill bg-accent px-5 text-[12px] font-black uppercase tracking-caps hover:brightness-110 disabled:opacity-50"
            >
              {selected ? "Selected" : "Select"}
            </button>
          </div>
        )}
        {status === "taken" && (
          <div className="flex items-center gap-2">
            <Info size={14} className="shrink-0 text-muted" aria-hidden />
            <p className="flex-1 text-[12px] text-soft">This name is already taken.</p>
            <button onClick={() => flow.alternatives(domain)} className={`${link} shrink-0 text-accent`}>
              See alternatives <ChevronRight size={13} />
            </button>
          </div>
        )}
        {status === "error" && (
          <>
            <div className="flex gap-2">
              <Info size={14} className="mt-0.5 shrink-0 text-muted" aria-hidden />
              <p className="text-[12px] leading-[17px] text-soft">I couldn't confirm availability right now. You can try again or check directly with a registrar.</p>
            </div>
            <div className="mt-2.5 flex items-center gap-3 pl-[22px]">
              <button onClick={() => flow.retry(domain)} className={`${link} text-accent`}>
                <RotateCcw size={12} /> Retry
              </button>
              <span className="h-3.5 w-px bg-line" aria-hidden />
              <button onClick={() => openRegistrar(ASSISTANT_REGISTRAR, domain)} className={`${link} text-white`}>
                Check on GoDaddy <ExternalLink size={11} />
              </button>
            </div>
          </>
        )}
        {status === "unsupported" && (
          <div className="flex items-center gap-2">
            <Info size={14} className="shrink-0 text-muted" aria-hidden />
            <p className="flex-1 text-[12px] text-soft">I can't check .{tld} names here. Try .com or .co, or search a registrar.</p>
            <button onClick={() => openRegistrar(ASSISTANT_REGISTRAR, domain)} className={`${link} shrink-0 text-accent`}>
              Search
            </button>
          </div>
        )}
      </div>}
    </div>
  );
}

function PurchaseSummary({ domain, flow }: { domain: string; flow: Flow }) {
  const { finder } = useDomainFinder();
  const check = finder.checks[domain];
  const prices = isDone(check) ? check.prices : [];
  const reg = registrarById(finder.registrarId);
  const price = prices.find((p) => p.registrarId === reg.id);
  const handedOff = finder.handoff?.domain === domain;
  const busy = check?.status === "checking";
  // Taken (or unconfirmed) on the last check: never present it as purchasable.
  if (isDone(check) && check.status !== "available") {
    return (
      <div className="rounded-tile bg-bg p-3 text-[12px]">
        <div className="flex items-center justify-between gap-2">
          <span className="break-all text-[14px] font-bold text-muted line-through">{domain}</span>
          <span className="h-5 shrink-0 rounded-full bg-surface-2 px-2 text-[10px] font-bold uppercase leading-5 tracking-caps text-muted">
            No longer available
          </span>
        </div>
        <button onClick={flow.showAll} className="mt-2 text-[12px] font-bold text-accent hover:underline">
          Choose a different name
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-tile bg-bg p-3 text-[12px]">
      <div className="flex items-center justify-between gap-2">
        <span className="break-all text-[14px] font-bold">{domain}</span>
        <SimTag />
      </div>
      <p className="mb-1.5 mt-3 font-bold text-soft">Where to buy</p>
      <div className="rounded-lg bg-surface px-3 py-2" data-testid="df-registrar">
        <span className="flex items-center justify-between gap-2">
          <b className="text-white">{reg.name}</b>
          <span className="text-soft">{price?.first != null ? `${money(price.first)} · ${money(price.renewal)}/yr` : "Price not available"}</span>
        </span>
        <span className="block text-[11px] text-muted">{reg.note}</span>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-soft">
        <dt className="text-muted">First year</dt>
        <dd>{money(price?.first ?? null)}</dd>
        <dt className="text-muted">Renews at</dt>
        <dd>{price?.renewal != null ? `${money(price.renewal)} per year` : "Not available"}</dd>
        <dt className="text-muted">Period</dt>
        <dd>1 year</dd>
        <dt className="text-muted">Extra costs</dt>
        <dd>None known. Taxes or optional add-ons may apply at checkout.</dd>
      </dl>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          onClick={() => flow.continuePurchase(domain)}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-pill bg-accent px-4 text-[12px] font-black uppercase tracking-caps hover:brightness-110 disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
          {handedOff ? "Open again" : "Continue to purchase"}
        </button>
        <button onClick={flow.showAll} className="whitespace-nowrap text-[12px] font-bold text-soft hover:underline">
          Choose a different name
        </button>
      </div>
      <p className="mt-2 text-[11px] text-muted">Opens {reg.name} in a new tab. You'll sign in and pay there, not here.</p>
    </div>
  );
}

function ConfirmDomain({ initial, onConfirm }: { initial: string; onConfirm: (d: string) => void }) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  if (sent) return null;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const d = v.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
        if (!ROOT_DOMAIN.test(d)) return setErr("Enter the domain like yourname.com");
        setSent(true);
        onConfirm(d);
      }}
    >
      <div className="flex items-center gap-2">
        <input
          aria-label="Domain you bought"
          placeholder="yourname.com"
          value={v}
          onChange={(e) => (setV(e.target.value), setErr(""))}
          className="h-9 min-w-0 flex-1 rounded-pill bg-bg px-4 text-[13px] text-white outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
        />
        <button className="h-9 shrink-0 rounded-pill bg-accent px-4 text-[12px] font-black uppercase tracking-caps hover:brightness-110">Confirm</button>
      </div>
      {err && <p className="mt-1.5 text-[12px] text-danger">{err}</p>}
    </form>
  );
}
