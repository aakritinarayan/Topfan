// Route integrity for both demos:
// 1. every route id / feature id the code refers to (pathFor("…"), navigateTo("…"), feature.routeId,
//    task step routeId) exists in the live registries;
// 2. every registered route opens in Demo 1 and Demo 2 without page errors or "Page not found"
//    (params filled from the demo's own mock data; routes needing data that doesn't exist are skipped);
// 3. the old Experience URL redirects to /monetize/experience/create-experience, keeping ?work=.
// Usage: node tests/e2e/routes-verify.mjs   (dev server on :5173)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1126, height: 797 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 500)); if (!ok) fails++; };

/* ---- 1. static references vs live registries ---- */
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f)) files.push(p); } };
walk("src");
const refs = { route: new Set(), feature: new Set() };
for (const f of files) {
  const s = readFileSync(f, "utf8");
  for (const m of s.matchAll(/\bpathFor\(\s*"([a-z0-9-]+)"/g)) refs.route.add(`${m[1]}  (${f})`);
  for (const m of s.matchAll(/\bnavigateTo\(\s*"([a-z0-9-]+)"/g)) refs.feature.add(`${m[1]}  (${f})`);
  for (const m of s.matchAll(/\brouteId:\s*"([a-z0-9-]+)"/g)) refs.route.add(`${m[1]}  (${f})`);
}
const p0 = await b.newPage();
await p0.goto(`${BASE}/ajwhite?demo=off`, { waitUntil: "networkidle0" });
const reg = await p0.evaluate(async () => {
  const r = await import("/src/app/routeCatalog.ts");
  const f = await import("/src/app/agent-context/features.ts");
  return { routes: r.routes.map((x) => ({ id: x.id, pattern: x.pattern, redirect: x.redirect ?? null })), features: f.FEATURES.map((x) => x.id) };
});
const routeIds = new Set(reg.routes.map((r) => r.id));
const featureIds = new Set(reg.features);
const badRoutes = [...refs.route].filter((x) => !routeIds.has(x.split(" ")[0]));
const badFeatures = [...refs.feature].filter((x) => !featureIds.has(x.split(" ")[0]));
check(`all ${refs.route.size} route-id references exist`, !badRoutes.length, badRoutes.join("\n"));
check(`all ${refs.feature.size} assistant navigateTo targets are features`, !badFeatures.length, badFeatures.join("\n"));
await p0.close();

/* ---- 2. every route opens in both demos ---- */
async function sweep(demo) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.evaluateOnNewDocument(() => localStorage.setItem("tf-no-delay", "1"));
  await p.goto(`${BASE}/demo/${demo}?resetMock=1&noDelay=1`, { waitUntil: "networkidle0" });
  await sleep(1200);
  const d = await p.evaluate(async () => JSON.parse(JSON.stringify((await import("/src/store/store.tsx")).getData())));
  const first = (xs, pred = () => true) => xs?.find(pred)?.id;
  const sample = {
    handle: d.account.handle,
    productId: first(d.monetize.products),
    eventId: first(d.monetize.events),
    planId: first(d.monetize.plans),
    offerId: first(d.monetize.vipOffers ?? d.monetize.vip ?? []),
    seriesId: d.monetize.portfolios?.[0]?.series?.[0]?.id,
    portfolioId: first(d.monetize.portfolios),
    newsletterId: first(d.monetize.newsletters),
    postId: first(d.social.posts),
    category: "experiences",
  };
  let opened = 0;
  const skipped = [];
  const broken = [];
  for (const r of reg.routes) {
    if (r.id === "not-found") continue;
    const keys = [...r.pattern.matchAll(/:([A-Za-z]+)/g)].map((m) => m[1]);
    if (keys.some((k) => !sample[k])) { skipped.push(r.id); continue; }
    const path = r.pattern.replace(/:([A-Za-z]+)/g, (_, k) => encodeURIComponent(sample[k]));
    const before = errors.length;
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle0" }).catch(() => {});
    await sleep(450);
    const body = await p.evaluate(() => document.body.innerText);
    const ok = errors.length === before && !/Page not found/i.test(body) && body.trim().length > 20;
    if (ok) opened++;
    else broken.push(`${r.id} ${path}: ${errors.slice(before).join(" | ").slice(0, 160) || (/Page not found/i.test(body) ? "Page not found" : "blank")}`);
  }
  check(`${demo}: ${opened} routes open without errors`, !broken.length, broken.join("\n"));
  if (skipped.length) console.log(`  (${demo}: skipped ${skipped.length} routes whose sample data doesn't exist: ${skipped.join(", ")})`);
  await ctx.close();
}
await sweep("setup-navigation");
await sweep("ai-content");

/* ---- 3. old Experience URL ---- */
{
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  await p.evaluateOnNewDocument(() => localStorage.setItem("tf-no-delay", "1"));
  await p.goto(`${BASE}/demo/ai-content?resetMock=1&noDelay=1`, { waitUntil: "networkidle0" });
  await sleep(800);
  await p.goto(`${BASE}/monetize/experience/add-experience?work=w-test`, { waitUntil: "networkidle0" });
  await sleep(800);
  const u = new URL(p.url());
  check("old /add-experience URL redirects to /create-experience, keeping ?work=", u.pathname === "/monetize/experience/create-experience" && u.searchParams.get("work") === "w-test", p.url());
  check("…and the Create Experiences form renders", /Create Experiences/.test(await p.evaluate(() => document.body.innerText)));
  await ctx.close();
}

await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
