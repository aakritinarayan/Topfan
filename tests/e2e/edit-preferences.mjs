// Sidebar "Edit Preferences" shortcut: placement, styling (secondary, not a red CTA), navigation to the
// registered route, browser back/forward, hover, keyboard, other sidebar pages, narrow widths, the avatar
// menu entry still working, and Demo 1's assistant phrasings (Demo 2 unchanged).
// Usage: node tests/e2e/edit-preferences.mjs   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1512, height: 805 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 400)); if (!ok) fails++; };
const BTN = '[data-testid="nav-edit-preferences"]';
const path = (p) => new URL(p.url()).pathname;

async function page(demo) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(String(e)));
  await p.evaluateOnNewDocument(() => localStorage.setItem("tf-no-delay", "1"));
  if (demo) await p.goto(`${BASE}/demo/${demo}?resetMock=1&noDelay=1`, { waitUntil: "networkidle0" });
  else await p.goto(`${BASE}/ajwhite?resetMock=1&noDelay=1&demo=off`, { waitUntil: "networkidle0" });
  await sleep(900);
  return p;
}
const go = async (p, u) => { await p.goto(`${BASE}${u}`, { waitUntil: "networkidle0" }); await sleep(900); };
const box = (p, sel) => p.$eval(sel, (x) => { const r = x.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, w: r.width }; });
const replies = (p) => p.$$eval('[data-msg="assistant"]', (x) => x.map((m) => m.innerText));
async function ask(p, q) {
  if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(700); }
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
  const before = (await replies(p)).length;
  await p.$eval('[data-testid="ai-input"]', (x) => (x.focus(), x.select?.()));
  await p.keyboard.press("Backspace");
  await p.type('[data-testid="ai-input"]', q);
  await p.keyboard.press("Enter");
  await sleep(900);
  return (await replies(p)).slice(before).join("\n");
}

/* ---- Feed: placement, style, navigation, history, hover, keyboard ---- */
{
  const p = await page(null);
  await go(p, "/ajwhite");
  const btn = await p.$(BTN);
  check("button on the Feed sidebar", !!btn && (await p.$eval(BTN, (x) => x.innerText.trim())) === "Edit Preferences");
  const name = await p.evaluate(() => { const r = document.querySelector('[data-testid="sidebar"] .text-2xl').getBoundingClientRect(); return { bottom: r.bottom }; });
  const b1 = await box(p, BTN);
  const np = await box(p, '[data-testid="nav-new-post"]');
  check("below the name, above New Post", b1.top > name.bottom && b1.bottom < np.top, JSON.stringify({ name, b1, np }));
  check("breathing room before New Post (≥24px)", np.top - b1.bottom >= 24, np.top - b1.bottom);
  const style = await p.$eval(BTN, (x) => { const c = getComputedStyle(x); return { bg: c.backgroundColor, border: c.borderTopWidth, color: c.color, icon: !!x.querySelector("svg"), h: x.getBoundingClientRect().height }; });
  check("secondary style: no red fill, thin border, icon, compact", !/rgb\((1[5-9]\d|2\d\d), (0|1?\d), (0|1?\d)\)/.test(style.bg) && style.border === "1px" && style.icon && style.h <= 34, JSON.stringify(style));
  check("New Post and Livestream unchanged", !!(await p.$('[data-testid="nav-new-post"]')) && !!(await p.$('[data-testid="nav-livestream"]')) && np.w === 268, np.w);
  await p.hover(BTN);
  await sleep(250);
  const hovered = await p.$eval(BTN, (x) => getComputedStyle(x).color);
  check("hover state changes the label color", hovered !== style.color, `${style.color} → ${hovered}`);
  check("real link to the registered route", (await p.$eval(BTN, (x) => x.getAttribute("href"))) === "/edit-preference");
  await p.click(BTN);
  await sleep(800);
  check("click → Edit Preferences (Profile)", path(p) === "/edit-preference" && !!(await p.$('[data-testid="page-pref-profile"], [data-testid^="pref-"]')), path(p));
  check("current page marked", (await p.$eval(BTN, (x) => x.getAttribute("aria-current"))) === "page");
  await p.goBack({ waitUntil: "networkidle0" });
  await sleep(500);
  check("browser Back returns to the Feed", path(p) === "/ajwhite", path(p));
  await p.goForward({ waitUntil: "networkidle0" });
  await sleep(500);
  check("browser Forward returns to Preferences", path(p) === "/edit-preference", path(p));
  // Keyboard: Tab to it and press Enter.
  await go(p, "/ajwhite");
  await p.$eval('[data-testid="sidebar"]', (x) => x.querySelector("img, div")?.closest("aside")?.focus?.());
  let focused = false;
  for (let i = 0; i < 40 && !focused; i++) {
    await p.keyboard.press("Tab");
    focused = await p.evaluate(() => document.activeElement?.dataset?.testid === "nav-edit-preferences");
  }
  const ring = await p.evaluate(() => getComputedStyle(document.activeElement).boxShadow);
  check("reachable with Tab, visible focus ring", focused && ring !== "none", ring);
  await p.keyboard.press("Enter");
  await sleep(800);
  check("Enter opens Edit Preferences", path(p) === "/edit-preference", path(p));
  // Avatar menu entry still works.
  await go(p, "/ajwhite");
  await p.click('[data-testid="header-avatar"]');
  await sleep(250);
  await p.click('[data-testid="menu-avatar-preferences"]');
  await sleep(800);
  check("avatar menu Edit Preferences still works", path(p) === "/edit-preference", path(p));
  // Other pages with the creator sidebar.
  for (const u of ["/insights", "/monetize/subscription", "/wallet/current-balance", "/dashboard/newpost"]) {
    await go(p, u);
    const ok = !!(await p.$(BTN));
    if (ok) { await p.click(BTN); await sleep(700); }
    check(`works from ${u}`, ok && path(p) === "/edit-preference", path(p));
  }
  // Narrow desktop widths: no overlap, no horizontal overflow in the sidebar.
  for (const w of [1126, 1024]) {
    await p.setViewport({ width: w, height: 797 });
    await go(p, "/ajwhite");
    const s = await p.$eval('[data-testid="sidebar"]', (x) => x.scrollWidth - x.clientWidth);
    const bb = await box(p, BTN);
    const n2 = await box(p, '[data-testid="nav-new-post"]');
    check(`${w}px: fits, no overlap`, s === 0 && bb.bottom < n2.top && bb.w < 268, JSON.stringify({ s, bb }));
  }
  check("no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ---- Demo 1: the assistant goes to the same destination ---- */
{
  const p = await page("setup-navigation");
  for (const q of ["Where can I edit my preferences?", "I want to change my website settings.", "Help me customize my profile."]) {
    await go(p, "/ajwhite");
    const r = await ask(p, q);
    const hit = await p.evaluate(() => { const x = [...document.querySelectorAll('[data-testid="ai-panel"] button')].reverse().find((b) => /^open edit preferences$/i.test(b.innerText.trim())); x?.click(); return !!x; });
    await sleep(900);
    check(`D1 "${q}" → Edit Preferences`, hit && /left sidebar/.test(r) && path(p) === "/edit-preference", `${r} | ${path(p)}`);
  }
  await go(p, "/ajwhite");
  const r = await ask(p, "I want to change my website settings.");
  check("D1 website settings also offers White Label Site", /Open White Label Site/i.test(r), r);
  check("D1 'I want to change my settings.' still asks which settings", /Which settings/.test(await ask(p, "I want to change my settings.")));
  check("D1 no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ---- Demo 2: content workflows unchanged; the sidebar button is there too ---- */
{
  const p = await page("ai-content");
  check("D2 sidebar button present", !!(await p.$(BTN)));
  const r = await ask(p, "Where can I edit my preferences?");
  check("D2 doesn't use the Demo 1 answer", !/is under your name in the left sidebar/.test(r), r);
  const r2 = await ask(p, "Create a post");
  check("D2 content workflow still works", !!(await p.$('[data-testid="content-card"]')), r2);
  await p.browserContext().close();
}

await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
