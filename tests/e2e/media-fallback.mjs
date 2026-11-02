// Media failure handling: block specific files and check the content-type fallback replaces them,
// keeps the slot size, and the failure is recorded (window.__mediaErrors). Dev server on :5173.
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1512, height: 805 } });
const p = await b.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : x); if (!ok) fails++; };
const BLOCK = [/merchandise\/spectrum-x\.webp/, /videos\/competition-run\.mp4/, /creators\/ajwhite\/avatar\.webp/];
await p.setRequestInterception(true);
p.on("request", (r) => (BLOCK.some((x) => x.test(r.url())) ? r.respond({ status: 404, body: "" }) : r.continue()));
await p.goto("http://localhost:5173/?noDelay=1&resetMock=1", { waitUntil: "networkidle0" });
const d = await p.evaluate(() => JSON.parse(localStorage.getItem("topfan-mock-v1")));

// Product image → product fallback, same box.
await p.goto(`http://localhost:5173/${d.account.handle}/store?noDelay=1`, { waitUntil: "networkidle0" });
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } });
await sleep(500);
const prod = await p.evaluate(() => [...document.images].filter((i) => i.dataset.media === "fallback").map((i) => ({ src: i.getAttribute("src"), w: i.getBoundingClientRect().width, h: i.getBoundingClientRect().height, ok: i.naturalWidth > 0 })));
check("product image falls back to the product illustration", prod.some((x) => /fallback-product\.svg/.test(x.src) && x.ok && x.w > 50 && x.h > 50), JSON.stringify(prod));
check("creator avatar falls back to the avatar illustration", (await p.evaluate(() => [...document.images].some((i) => /fallback-avatar\.svg/.test(i.getAttribute("src") ?? "")))));
const errs = await p.evaluate(() => window.__mediaErrors ?? []);
check("failures recorded", errs.some((e) => /spectrum-x/.test(e.src) && e.kind === "product"), JSON.stringify(errs));
check("no broken-image icons", await p.evaluate(() => [...document.images].every((i) => !i.complete || i.naturalWidth > 0)));

// Video → error state after play, slot kept.
await p.goto(`http://localhost:5173/${d.account.handle}?noDelay=1`, { waitUntil: "networkidle0" });
const btn = await p.$('[data-media="video"][aria-label*="Competition"], [data-media="video"]');
const box = await btn?.boundingBox();
// Find the competition-run player specifically if present.
const target = await p.evaluateHandle(() => [...document.querySelectorAll('[data-media="video"]')].find((e) => /competition-run/.test(e.querySelector("img")?.getAttribute("src") ?? "")) ?? null);
if (target.asElement()) {
  const tb = await target.asElement().boundingBox();
  await target.asElement().click();
  await sleep(1500);
  const st = await p.evaluate(() => [...document.querySelectorAll('[data-media="video-error"]')].map((e) => ({ w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height, text: e.textContent })));
  check("video error state shown in the same slot", st.length === 1 && Math.abs(st[0].w - tb.width) < 2 && Math.abs(st[0].h - tb.height) < 2 && /couldn't load/.test(st[0].text), JSON.stringify({ st, tb }));
  check("video failure recorded", (await p.evaluate(() => window.__mediaErrors ?? [])).some((e) => e.kind === "video"));
} else check("competition-run player present on feed", false, `first player box ${JSON.stringify(box)}`);

// A working video plays.
const ok = await p.evaluateHandle(() => [...document.querySelectorAll('[data-media="video"]')][0] ?? null);
if (ok.asElement()) {
  await ok.asElement().click();
  await sleep(2500);
  const v = await p.evaluate(() => { const x = document.querySelector("video"); return x ? { ready: x.readyState, err: !!x.error, paused: x.paused, muted: x.muted } : null; });
  check("demo clip plays (muted, controls)", !!v && v.ready >= 2 && !v.err && v.muted, JSON.stringify(v));
}
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await b.close();
process.exit(fails ? 1 : 0);
