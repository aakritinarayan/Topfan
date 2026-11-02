/**
 * Domain discovery service. The UI only talks to this interface.
 *
 * In this prototype everything is answered from mocks in config/demo.ts (`simulated: true`).
 * In production `checkAvailability` / `getPrices` call a registrar API (e.g. Namecheap, GoDaddy)
 * from a TopFan backend; the assistant must never make up availability or prices itself.
 */
import { creatorNicheWord, mockAvailability, mockExistingSites, mockPrices, registrars, supportedTlds } from "../config/demo";

export type Availability = "available" | "taken" | "error" | "unsupported";

export interface Price {
  registrarId: string;
  /** null when this registrar has no price for the extension */
  first: number | null;
  renewal: number | null;
  period: "1 year";
  currency: "USD";
}

export interface DomainCheck {
  domain: string;
  status: Availability;
  /** Cheapest known first-year option, if any. */
  best: Price | null;
  prices: Price[];
  simulated: boolean;
  checkedAt: number;
}

export interface DomainIdea {
  domain: string;
  reason: string;
}

const tldOf = (d: string) => d.split(".").slice(1).join(".");
const flakyTried = new Set<string>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Stable pseudo-random for names that are not in the mock table. */
function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function getPrices(domain: string): Price[] {
  const tld = tldOf(domain);
  return registrars.map((r) => {
    const p = mockPrices[r.id]?.[tld] ?? null;
    return { registrarId: r.id, first: p?.first ?? null, renewal: p?.renewal ?? null, period: "1 year", currency: "USD" };
  });
}

/**
 * Check one name. `recheck` = the final check right before handing off to checkout.
 */
export async function checkAvailability(domain: string, opts: { recheck?: boolean } = {}): Promise<DomainCheck> {
  await sleep(450 + (hash(domain) % 5) * 120);
  const d = domain.toLowerCase();
  const base = { domain: d, simulated: true, checkedAt: Date.now() };
  if (!supportedTlds.includes(tldOf(d))) return { ...base, status: "unsupported", best: null, prices: [] };

  const mock = mockAvailability[d];
  let status: Availability;
  if (mock === "flaky" && !flakyTried.has(d)) {
    flakyTried.add(d);
    status = "error";
  } else if (mock === "goneAtCheckout") status = opts.recheck ? "taken" : "available";
  else if (mock === "taken") status = "taken";
  else if (mock) status = "available";
  else status = hash(d) % 3 === 0 ? "taken" : "available";

  const prices = status === "available" ? getPrices(d) : [];
  const priced = prices.filter((p) => p.first !== null).sort((a, b) => a.first! - b.first!);
  return { ...base, status, prices, best: priced[0] ?? null };
}

export const hasExistingSite = (domain: string) => mockExistingSites.includes(domain.toLowerCase());

/** Turn a name like "AJ White" into "ajwhite". */
export const slugOf = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "");

/**
 * Name ideas in rounds of three, from the creator's own name (and, in round 2, a word from their bio).
 * If the creator typed a full domain (e.g. "ajwhite.fans"), it is checked first as typed.
 */
export function suggestDomains(input: string, round: number): DomainIdea[] {
  const typed = input.trim().toLowerCase();
  const isDomain = /^[a-z0-9-]+\.[a-z.]{2,}$/.test(typed);
  const slug = slugOf(isDomain ? typed.split(".")[0] : typed);
  if (!slug) return [];
  const rounds: DomainIdea[][] = [
    [
      ...(isDomain ? [{ domain: typed, reason: "The name you asked for" }] : []),
      { domain: `${slug}.com`, reason: "Your name, short and easy to remember" },
      { domain: `${slug}fans.com`, reason: "Puts your fan community front and center" },
      { domain: `team${slug}.com`, reason: "Feels like a club fans can join" },
    ],
    [
      { domain: `${slug}.co`, reason: "Same name, short extension" },
      { domain: `${slug}${creatorNicheWord}.com`, reason: `Ties your name to what you do (${creatorNicheWord})` },
      { domain: `${slug}.club`, reason: "Fits a members' space" },
    ],
    [
      { domain: `${slug}.me`, reason: "Personal and short" },
      { domain: `the${slug}.com`, reason: "Your name with a simple twist" },
      { domain: `${slug}hq.com`, reason: "Reads like your official home base" },
    ],
  ];
  const seen = new Set<string>();
  return (rounds[round] ?? []).filter((i) => !seen.has(i.domain) && seen.add(i.domain)).slice(0, isDomain && round === 0 ? 4 : 3);
}

export const MAX_ROUNDS = 3;

/**
 * Pick the most suitable available name, with a short reason. Plain rules, not legal advice:
 * .com, short, no hyphens or digits, contains the name, lower renewal.
 */
export function recommend(checks: DomainCheck[], brandSlug: string): { domain: string; why: string } | null {
  const ok = checks.filter((c) => c.status === "available");
  if (!ok.length) return null;
  const score = (c: DomainCheck) => {
    const [label, tld] = [c.domain.split(".")[0], tldOf(c.domain)];
    let s = 0;
    if (tld === "com") s += 3;
    s -= label.length * 0.15;
    if (!/[-0-9]/.test(label)) s += 1;
    if (label === brandSlug) s += 2;
    if (c.best?.renewal != null) s -= c.best.renewal * 0.02;
    return s;
  };
  const best = [...ok].sort((a, b) => score(b) - score(a))[0];
  const label = best.domain.split(".")[0];
  const traits = [
    label.length <= 12 ? "short" : null,
    !/[-0-9]/.test(label) ? "easy to spell" : null,
    tldOf(best.domain) === "com" ? "a .com fans will guess" : null,
  ].filter(Boolean);
  return { domain: best.domain, why: traits.length ? `It's ${traits.join(", ")}.` : "It's the clearest of the available options." };
}

export const registrarById = (id: string) => registrars.find((r) => r.id === id)!;
export const money = (n: number | null) => (n == null ? "Not available" : `$${n.toFixed(2)}`);
