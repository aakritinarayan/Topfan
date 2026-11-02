// Nested media states (Messages thread/tabs/modals, Insights lists, Wallet categories, refund detail, Fulfillment,
// Activity, Delegation): no placeholders, generic avatars, broken or stretched images, non-square avatars or media errors.
// Usage: node tests/e2e/media-nested.mjs [1512|1126] [--shots dir]   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const OUT = process.argv.includes("--shots") ? process.argv[process.argv.indexOf("--shots") + 1] : null;
let fails = 0;
const W = Number(process.argv[2]) || 1512, H = W === 1126 ? 797 : 805;
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: W, height: H } });
const p = await b.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const base = "http://localhost:5173";
await p.goto(`${base}/?noDelay=1&resetMock=1`, { waitUntil: "networkidle0" });
const check = async (name) => {
  await sleep(500);
  const r = await p.evaluate(async () => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
    const empty = [...document.querySelectorAll('[aria-label$=" placeholder"]')].filter(vis).map((e) => e.getAttribute("aria-label"));
    const avatars = [...document.querySelectorAll(".bg-placeholder-img")].filter((e) => vis(e) && !e.querySelector("img,video") && e.querySelector("svg.lucide-user")).length;
    const imgs = [...document.images].filter(vis);
    const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute("src"));
    const nonRound = imgs.filter((i) => /fans\/fan-|avatar/.test(i.src)).filter((i) => { const r = i.getBoundingClientRect(); return Math.abs(r.width - r.height) > 1; }).map((i) => i.src);
    const stretched = imgs.filter((i) => { if (!i.naturalWidth) return false; const s = getComputedStyle(i); if (s.objectFit === "cover" || s.objectFit === "contain") return false; const r = i.getBoundingClientRect(); return Math.abs(r.width / r.height - i.naturalWidth / i.naturalHeight) > 0.05; }).length;
    return { imgs: imgs.length, empty, avatars, broken, nonRound, stretched, errs: window.__mediaErrors?.length ?? 0 };
  });
  const bad = r.empty.length + r.avatars + r.broken.length + r.nonRound.length + r.stretched + r.errs;
  if (bad) fails++;
  console.log(bad ? "FAIL" : "PASS", name.padEnd(34), JSON.stringify(r));
  if (OUT) await p.screenshot({ path: `${OUT}/${W}-${name}.png` });
};
const go = async (path) => { await p.goto(`${base}${path}${path.includes("?") ? "&" : "?"}noDelay=1`, { waitUntil: "networkidle0" }); await sleep(600); };
const click = async (sel) => { await p.waitForSelector(sel, { timeout: 5000 }); await p.click(sel); await sleep(700); };

await go("/messages");
await check("messages-open-conv");
// scroll thread to the top until all messages are loaded
for (let i = 0; i < 6; i++) { await p.evaluate(() => { const t = document.querySelector('[data-testid="messages-thread"]'); t.scrollTop = 0; t.dispatchEvent(new Event("scroll")); }); await sleep(250); }
await p.evaluate(() => document.querySelector('[data-testid="messages-bubble-mm6"]')?.scrollIntoView({ block: "start" }));
await check("messages-thread-paid-store");
await p.evaluate(() => document.querySelector('[data-testid="messages-bubble-mm9"]')?.scrollIntoView({ block: "start" }));
await check("messages-thread-course");
await click('[data-testid="messages-fan-info"]');
await check("faninfo-info");
for (const t of ["purchases", "engagement", "recruitment"]) { await click(`[data-testid="messages-faninfo-tab-${t}"]`); await sleep(500); await check(`faninfo-${t}`); }
await p.keyboard.press("Escape"); await sleep(300);
await click('[data-testid="messages-sub-general"]'); await check("messages-general");
await click('[data-testid="messages-new"]'); await check("messages-new-modal");
await p.keyboard.press("Escape"); await sleep(300);
await click('[data-testid="messages-sub-lists"]'); await check("messages-lists");
await click('[data-testid="messages-new-list"]'); await check("messages-new-list-modal");
await p.keyboard.press("Escape"); await sleep(300);
await go("/insights?tab=fan-relationship-management");
await check("insights-frm-all");
for (const c of ["supporters", "engaged", "recruiters"]) { await click(`[data-testid="insights-fans-chip-${c}"]`); await check(`insights-frm-${c}`); }
await go("/insights?tab=fan-relationship-management&sub=segmentation"); await check("insights-segmentation");
await go("/insights?tab=engagement"); await check("insights-engagement");
for (const c of ["merchandise", "experiences", "courses", "content", "tips", "downloadables", "livestreams", "messages"]) { await go(`/wallet/my-purchases/${c}`); await check(`purchases-${c}`); }
await go("/wallet/my-purchases"); await check("purchases-plans");
await go("/wallet/refund-requests"); await check("refunds");
await p.evaluate(() => document.querySelector('[data-testid^="wallet-refund-open-"]')?.click()); await sleep(500); await check("refund-detail");
await go("/wallet/my-fulfillment-requests"); await check("fulfillment");
await go("/dashboard/activity"); await check("activity");
await go("/edit-preference/delegation/delegation-view"); await check("delegation");
await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
