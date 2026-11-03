// Deployment smoke test for the production build (dist/ served like vercel.json: scripts/serve-dist.mjs).
// Both shareable demo links in fresh sessions, deep links + refresh, Back/Forward, asset loading (no
// failed requests), /api/chat, assistant panel and header, voice unsupported/denied, persistence,
// per-demo isolation and reset, and three viewport sizes.
// Usage: npm run build && node scripts/serve-dist.mjs &  then  BASE_URL=http://localhost:4173 node tests/e2e/prod-smoke.mjs
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:4173";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 500)); if (!ok) fails++; };
const DEMOS = { "setup-navigation": "/edit-preference/whitelabel/setup/domain", "ai-content": "/ajwhite" };

async function session({ width = 1512, height = 805, init, mobile = false } = {}) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width, height, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 3 : 1 });
  if (mobile) await p.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1");
  p.errors = [];
  p.bad = [];
  p.on("pageerror", (e) => p.errors.push(String(e)));
  p.on("requestfailed", (r) => !/favicon/.test(r.url()) && p.bad.push(`${r.failure()?.errorText} ${r.url()}`));
  p.on("response", (r) => r.status() >= 400 && p.bad.push(`${r.status()} ${r.url()}`));
  await p.evaluateOnNewDocument(() => localStorage.setItem("tf-no-delay", "1"));
  if (init) await p.evaluateOnNewDocument(init);
  p.ctx = ctx;
  return p;
}
const path = (p) => new URL(p.url()).pathname;
const text = (p) => p.evaluate(() => document.body.innerText);
const openPanel = async (p) => { if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(800); } };
const replies = (p) => p.$$eval('[data-msg="assistant"]', (x) => x.map((m) => m.innerText));
async function ask(p, q, wait = 1000) {
  const before = (await replies(p)).length;
  await p.waitForSelector('[data-testid="ai-input"]', { visible: true, timeout: 5000 });
  await p.click('[data-testid="ai-input"]', { clickCount: 3 });
  await p.keyboard.press("Backspace");
  await p.type('[data-testid="ai-input"]', q);
  await p.keyboard.press("Enter");
  await sleep(wait);
  return (await replies(p)).slice(before).join("\n");
}
// Images that are in the DOM but failed to decode (broken src).
const brokenImgs = (p) => p.$$eval("img", (xs) => xs.filter((i) => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith("data:")).map((i) => i.src));

/* 1. API function */
{
  const r = await fetch(`${BASE}/api/chat`);
  const j = await r.json().catch(() => null);
  check("/api/chat GET answers JSON (not the SPA fallback)", r.ok && j && typeof j.configured === "boolean", `${r.status} ${JSON.stringify(j)}`);
  console.log(`  (/api/chat configured: ${j?.configured})`);
}

/* 2. Each shareable link in a fresh session */
for (const [id, start] of Object.entries(DEMOS)) {
  const p = await session();
  await p.goto(`${BASE}/demo/${id}`, { waitUntil: "networkidle0" });
  await sleep(1800);
  check(`${id}: /demo/${id} opens on its starting screen`, path(p) === start, path(p));
  check(`${id}: TopFan UI rendered`, (await text(p)).trim().length > 50);
  check(`${id}: no failed requests (assets, fonts, media)`, !p.bad.length, p.bad.join("\n"));
  check(`${id}: no broken images`, !(await brokenImgs(p)).length, (await brokenImgs(p)).join("\n"));
  await openPanel(p);
  check(`${id}: AI panel opens`, !!(await p.$('[data-testid="ai-panel"]')));
  const header = await p.$eval('[data-testid="ai-panel"]', (x) => x.querySelector("div")?.parentElement?.innerHTML ?? "");
  check(`${id}: AI header has no bell / pause control`, !(await p.$('[data-testid="ai-panel"] [aria-label="Pause suggestions"], [data-testid="ai-panel"] [aria-label="Resume suggestions"]')) && !/lucide-bell/.test(header));
  await p.reload({ waitUntil: "networkidle0" });
  await sleep(1200);
  check(`${id}: refresh stays in the demo on the same screen`, path(p) === start && (await p.evaluate(() => sessionStorage.getItem("tf-demo"))) === id, path(p));
  check(`${id}: no page errors`, !p.errors.length, p.errors.join("\n"));
  await p.ctx.close();
}

/* 3. Deep links, refresh, Back/Forward (Demo 2 session) */
{
  const p = await session();
  await p.goto(`${BASE}/demo/ai-content`, { waitUntil: "networkidle0" });
  await sleep(1200);
  const deep = ["/dashboard/newpost", "/monetize/newsletters", "/monetize/experience", "/monetize/experience/create-experience", "/edit-preference/link-in-bio", "/edit-preference/link-in-bio/add-link-in-bio", "/edit-preference/whitelabel"];
  for (const d of deep) {
    await p.goto(`${BASE}${d}`, { waitUntil: "networkidle0" });
    await sleep(700);
    await p.reload({ waitUntil: "networkidle0" });
    await sleep(700);
    const t = await text(p);
    check(`deep link + refresh ${d}`, path(p) === d && !/Page not found/i.test(t) && t.trim().length > 50, `${path(p)} ${t.slice(0, 120)}`);
  }
  await p.goto(`${BASE}/monetize/experience/add-experience`, { waitUntil: "networkidle0" });
  await sleep(700);
  check("old /add-experience link redirects to /create-experience", path(p) === "/monetize/experience/create-experience", path(p));
  await p.goto(`${BASE}/monetize/newsletters`, { waitUntil: "networkidle0" });
  await sleep(600);
  await p.goto(`${BASE}/edit-preference/link-in-bio`, { waitUntil: "networkidle0" });
  await sleep(600);
  await p.goBack({ waitUntil: "networkidle0" });
  await sleep(600);
  check("Back returns to the previous screen", path(p) === "/monetize/newsletters", path(p));
  await p.goForward({ waitUntil: "networkidle0" });
  await sleep(600);
  check("Forward returns again", path(p) === "/edit-preference/link-in-bio", path(p));
  check("no failed requests on deep links", !p.bad.length, p.bad.join("\n"));
  check("no page errors on deep links", !p.errors.length, p.errors.join("\n"));
  await p.ctx.close();
}

/* 4. Persistence, isolation and reset (both demos in one browser profile, separate tabs) */
{
  const ctx = await b.createBrowserContext();
  const p2 = await ctx.newPage();
  await p2.evaluateOnNewDocument(() => localStorage.setItem("tf-no-delay", "1"));
  await p2.setViewport({ width: 1512, height: 805 });
  await p2.goto(`${BASE}/demo/ai-content?resetMock=1`, { waitUntil: "networkidle0" });
  await sleep(1500);
  await openPanel(p2);
  const r = await ask(p2, "Create a training update post for this week", 1300);
  check("Demo 2: assistant prepares a post draft", /Draft/i.test(r), r.slice(0, 200));
  const k2 = "topfan-mock-v1:ai-content", k1 = "topfan-mock-v1:setup-navigation";
  const count = (p, k) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null")?.content?.items?.length ?? 0, k);
  const n = await count(p2, k2);
  await p2.reload({ waitUntil: "networkidle0" });
  await sleep(1200);
  check("Demo 2: draft persists after refresh", n > 0 && (await count(p2, k2)) === n, n);

  const p1 = await ctx.newPage();
  await p1.setViewport({ width: 1512, height: 805 });
  await p1.goto(`${BASE}/demo/setup-navigation`, { waitUntil: "networkidle0" });
  await sleep(1500);
  check("Demo 1 tab stays Demo 1 while Demo 2 is open", path(p1) === DEMOS["setup-navigation"] && (await p1.evaluate(() => sessionStorage.getItem("tf-demo"))) === "setup-navigation", path(p1));
  check("Demo 1 doesn't see Demo 2's draft", (await count(p1, k1)) === 0);
  await openPanel(p1);
  const t1 = await p1.$eval('[data-testid="ai-panel"]', (x) => x.innerText);
  check("Demo 1 panel shows no Demo 2 conversation", !/training update post/i.test(t1), t1.slice(0, 200));
  await p1.goto(`${BASE}/demo/setup-navigation?resetMock=1`, { waitUntil: "networkidle0" });
  await sleep(1200);
  check("Resetting Demo 1 leaves Demo 2's data", (await count(p1, k2)) === n, await count(p1, k2));
  await p2.goto(`${BASE}/demo/ai-content?resetMock=1`, { waitUntil: "networkidle0" });
  await sleep(1200);
  check("Resetting Demo 2 clears its drafts", (await count(p2, k2)) === 0, await count(p2, k2));
  await ctx.close();
}

/* 5. Voice: unsupported browser, and microphone permission denied */
{
  const p = await session({ init: () => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; } });
  await p.goto(`${BASE}/demo/ai-content`, { waitUntil: "networkidle0" });
  await sleep(1200);
  await openPanel(p);
  const dis = await p.$('[data-testid="ai-panel"] button[aria-label="Voice input isn\'t supported in this browser"]');
  check("no speech recognition: mic disabled with a typed fallback", !!dis);
  const r = await ask(p, "Take me to newsletters", 1000);
  check("…and typing still works", path(p) === "/monetize/newsletters" || /newsletter/i.test(r), `${path(p)} ${r.slice(0, 120)}`);
  check("…no page errors", !p.errors.length, p.errors.join("\n"));
  await p.ctx.close();
}
{
  const p = await session({
    init: () => {
      // Test stub: a recognizer whose microphone permission is denied. Not a real microphone.
      window.SpeechRecognition = class { start() { setTimeout(() => (this.onerror?.({ error: "not-allowed" }), this.onend?.()), 80); } stop() {} abort() {} };
    },
  });
  await p.goto(`${BASE}/demo/setup-navigation`, { waitUntil: "networkidle0" });
  await sleep(1200);
  await openPanel(p);
  await p.evaluate(() => [...document.querySelectorAll('[data-testid="ai-panel"] button')].find((x) => /voice|mic|speak/i.test(x.getAttribute("aria-label") || ""))?.click());
  await sleep(800);
  const t = await p.$eval('[data-testid="ai-panel"]', (x) => x.innerText);
  check("mic denied: explains and offers typing", /Microphone access is blocked/i.test(t), t.slice(-300));
  check("…input still usable", !!(await p.$('[data-testid="ai-input"]:not([disabled])')));
  check("…no page errors", !p.errors.length, p.errors.join("\n"));
  await p.ctx.close();
}

/* 6. Viewports */
for (const [w, h] of [[1512, 805], [1126, 797], [390, 844]]) {
  for (const id of Object.keys(DEMOS)) {
    const p = await session({ width: w, height: h, mobile: w < 600 });
    await p.goto(`${BASE}/demo/${id}`, { waitUntil: "networkidle0" });
    await sleep(1300);
    await openPanel(p);
    const panel = await p.$eval('[data-testid="ai-panel"]', (x) => { const r = x.getBoundingClientRect(); return { w: r.width, right: r.right, vw: innerWidth }; }).catch(() => null);
    if (w < 600) await p.screenshot({ path: `${process.env.SHOTS ?? "/tmp"}/mobile-${id}.png` }).catch(() => {});
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`${w}×${h} ${id}: loads, AI panel opens within the viewport`, !!panel && panel.right <= panel.vw + 1 && !p.errors.length, JSON.stringify(panel) + p.errors.join(" "));
    if (overflow > 1) console.log(`  note: ${w}×${h} ${id}: page is ${overflow}px wider than the viewport (desktop-first layout)`);
    await p.ctx.close();
  }
}

await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
