// Post-setup "Edit my cover page" with intelligent prefill (Account Setup & Navigation demo only).
// Journey: finish setup → priority actions → White Label Site → Edit Cover Page editor → prepare a draft
// from TopFan data + the simulated website/social fixture → review (dirty fields kept) → undo →
// image and color decisions → refresh → publish through the editor's own button. Plus fixtures
// (no website, unreachable site, no photo, publish failure) and Demo 2 isolation.
// Usage: node tests/e2e/cover-page.mjs   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1512, height: 805 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 500)); if (!ok) fails++; };
const KEY = "topfan-mock-v1:setup-navigation";
const EDITOR = "/edit-preference/whitelabel-cover-page";

async function page(url) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(String(e)));
  // Simulated delays off for the whole session (in-app navigation drops ?noDelay=1); F5 turns them back on.
  if (!/nodelays=keep/.test(url)) await p.evaluateOnNewDocument(() => localStorage.setItem("tf-no-delay", "1"));
  await p.goto(`${BASE}${url.replace(/[?&]nodelays=keep/, "")}`, { waitUntil: "networkidle0" });
  await sleep(1500);
  return p;
}
const path = (p) => new URL(p.url()).pathname;
const openPanel = async (p) => {
  if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(700); }
};
const replies = (p) => p.$$eval('[data-msg="assistant"]', (x) => x.map((m) => m.innerText));
async function ask(p, q, wait = 900) {
  const before = (await replies(p)).length;
  await p.waitForSelector('[data-testid="ai-input"]', { visible: true, timeout: 5000 });
  await p.click('[data-testid="ai-input"]', { clickCount: 3 });
  await p.keyboard.press("Backspace");
  await p.type('[data-testid="ai-input"]', q);
  await p.keyboard.press("Enter");
  await sleep(wait);
  return (await replies(p)).slice(before).join("\n");
}
const tap = (p, re) =>
  p.evaluate((src) => {
    const x = [...document.querySelectorAll('[data-testid="ai-panel"] button')].reverse().find((b) => new RegExp(src, "i").test(b.innerText.trim()));
    x?.click();
    return x?.innerText.trim() ?? null;
  }, re.source);
const click = async (p, id, wait = 400) => { await p.waitForSelector(`[data-testid="${id}"]`, { timeout: 5000 }); await p.click(`[data-testid="${id}"]`); await sleep(wait); };
const store = (p, key = KEY) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), key);
const panelText = (p) => p.evaluate(() => document.querySelector('[data-testid="ai-panel"]')?.innerText ?? "");
const val = (p, id) => p.$eval(`[data-testid="${id}"]`, (x) => x.value);
const chips = (p, prefix) => p.$$eval(`[data-testid^="${prefix}"]`, (x) => x.filter((e) => e.tagName === "BUTTON" && !/more$/.test(e.dataset.testid)).map((e) => e.innerText.trim()));
async function typeInto(p, id, text) {
  await p.$eval(`[data-testid="${id}"]`, (x) => (x.focus(), x.select()));
  await p.keyboard.press("Backspace");
  await p.type(`[data-testid="${id}"]`, text);
  await sleep(300);
}

/* ================= Demo 1 journey ================= */
{
  const p = await page("/demo/setup-navigation?resetMock=1&noDelay=1");
  // 1: finish website setup (simulated GoDaddy connection, verify, provisioning).
  await p.goto(`${BASE}/edit-preference/whitelabel/setup/dns?noDelay=1`, { waitUntil: "networkidle0" });
  await sleep(1300);
  await openPanel(p);
  await tap(p, /^prepare it for me$/);
  await sleep(500);
  await click(p, "dns-continue", 1500);
  await click(p, "dns-approve", 2900);
  await click(p, "dns-done", 600);
  await p.click('[data-field="verify"]');
  await sleep(2600);
  await p.evaluate(() => [...document.querySelectorAll("button")].find((x) => /Simulate: finish provisioning/.test(x.innerText))?.click());
  await sleep(3300);
  let t = await panelText(p);
  check("1: setup complete → 'Your site is ready. Let's make it yours.'", /Your site is ready\. Let's make it yours\./.test(t) && /Start by customizing your website, or explore what else you can do on TopFan\./.test(t), t.slice(-600));

  // 2: three priority actions, the rest under More suggestions.
  let c = await chips(p, "ai-next-");
  check("2: three priority actions shown", c.join("|") === "Edit my cover page|Customize my branding|Set up Link in Bio", c);
  await click(p, "ai-next-more", 300);
  c = await chips(p, "ai-next-");
  check("2: More suggestions adds earning and posts", c.includes("Start earning from fans") && c.includes("Explore creating a post"), c);

  // 3: Edit my cover page → White Label Site → the existing Edit Cover Page editor.
  const seen = [];
  const watch = setInterval(async () => { try { seen.push(path(p)); } catch {} }, 100);
  await click(p, "ai-next-cover", 2500);
  clearInterval(watch);
  check("3: passed through White Label Site", seen.includes("/edit-preference/whitelabel"), [...new Set(seen)]);
  check("3: opened the existing Cover Page editor", path(p) === EDITOR, path(p));
  check("3: cover-page task started", (await store(p, "topfan-tasks-v1:setup-navigation"))?.active?.taskId === "cover-page");

  // 4: the editor intro, nothing changed yet.
  t = await panelText(p);
  check("4: intro offers to prepare from TopFan data and authorized sources", /I can help prepare your cover page using the information you've already shared with TopFan, along with your existing website and authorized social profiles\./.test(t), t.slice(-500));
  check("4: 'Prepare my cover page' and 'I'll fill it myself'", /Prepare my cover page/i.test(t) && /I'll fill it myself/i.test(t));
  const before = await val(p, "cover-title");
  check("4: fields untouched before preparing", before === "Official Site of AJ White", before);

  // 5: the creator edits one field first (it must never be overwritten).
  await typeInto(p, "cover-title", "AJ White Riding");
  check("5: creator edit saved", (await store(p))?.cover?.edited?.includes("title"));

  // 6: prepare → summary with sources, AI-written vs source-derived, unresolved.
  await tap(p, /^prepare my cover page$/);
  await sleep(1200);
  t = await panelText(p);
  check("6: 'Your cover page draft is ready.'", /Your cover page draft is ready\./.test(t) && /I've prepared a draft using the information available from your TopFan profile and authorized sources\./.test(t), t.slice(-800));
  const sum = await p.$eval('[data-testid="cover-summary"]', (x) => x.innerText).catch(() => "");
  check("6: website source labelled simulated", /Your website \(simulated\)/.test(sum), sum);
  check("6: Instagram used as authorized (simulated)", /Instagram \(simulated, authorized\)/.test(sum), sum);
  check("6: Facebook and X links kept, nothing read", /facebook\.com\/ajwhite: link kept/i.test(sum) && /x\.com\/ajwhite: link kept; the account is private/i.test(sum), sum);
  check("6: AI-written text marked, source text marked", /Written by AI/.test(sum) && /From website \(simulated\)/.test(sum) && /Draft/.test(sum), sum);
  check("6: brand colors with contrast; decorative color left out", /contrast \d+(\.\d)?:1/.test(sum) && /Left out #f7c548/i.test(sum), sum);
  check("6: dirty field noted", /You've edited this field, so I'll keep yours/.test(sum), sum);
  check("6: no invented facts (no awards/achievements)", !/award|champion|medal|olympi|sponsor/i.test(sum), sum);
  check("6: editor not overwritten before review", (await val(p, "cover-keywords")) === "AJ White, Sports, Content Creator, Freestyle Skiing");

  // 7: Review in Cover Page Editor → fields filled, creator's title kept.
  await tap(p, /^review in cover page editor$/);
  await sleep(900);
  const kw = await val(p, "cover-keywords");
  const desc = await val(p, "cover-description");
  check("7: keywords filled from profile + website", /AJ White, freestyle snowboarding/.test(kw), kw);
  check("7: description filled", /^Official site of AJ White/.test(desc), desc);
  check("7: creator's title kept", (await val(p, "cover-title")) === "AJ White Riding", await val(p, "cover-title"));
  t = await panelText(p);
  check("7: says nothing is published until Update & Publish", /nothing is published until you click Update & Publish/.test(t), t.slice(-500));

  // 8: Undo restores the previous values.
  await tap(p, /^undo$/);
  await sleep(500);
  check("8: undo restored keywords", (await val(p, "cover-keywords")) === "AJ White, Sports, Content Creator, Freestyle Skiing");
  check("8: undo kept creator's title", (await val(p, "cover-title")) === "AJ White Riding");

  // 9: back to the draft, then image + colors decisions (one at a time).
  let r = await ask(p, "prepare my cover page", 1300);
  check("9: typed request prepares again", /Your cover page draft is ready/.test(r), r);
  await tap(p, /^review in cover page editor$/);
  await sleep(900);
  t = await panelText(p);
  check("9: image decision offered", /Use this image from your website/.test(t), t.slice(-400));
  check("9: one decision at a time (colors not yet asked)", !/Use them for your buttons/.test(t.split("Use this image from your website").pop()));
  await tap(p, /^use this image$/);
  await sleep(500);
  check("9: hero image updated in the mock store", (await store(p))?.account?.hero === "creators/ajwhite/hero-2");
  t = await panelText(p);
  check("9: color decision next", /Use them for your buttons and accents\?/.test(t), t.slice(-400));
  await tap(p, /^use these colors$/);
  await sleep(500);
  check("9: colors NOT saved to the account", (await store(p))?.account?.theme?.accent === "#bc1111");
  t = await panelText(p);
  check("9: publish is left to the creator", /I won't publish anything for you/.test(t), t.slice(-400));

  // 10: accepted colors appear in Customize Appearance as unsaved changes.
  await tap(p, /^open customize appearance$/);
  await sleep(1300);
  const colorsText = await p.$eval('[data-field="colors"]', (x) => x.innerText + [...x.querySelectorAll("input")].map((i) => i.value).join(" ")).catch(() => "");
  check("10: Customize Appearance shows #f26b1d unsaved", /#f26b1d/i.test(colorsText), colorsText.slice(0, 300));
  check("10: still not saved", (await store(p))?.account?.theme?.accent === "#bc1111");

  // 11: back to the editor via the page; guidance on the editor page.
  await p.click('[data-field="edit-cover"]');
  await sleep(1200);
  check("11: Edit Cover Page button opens the editor", path(p) === EDITOR, path(p));
  check("11: applied values kept across navigation", /^Official site of AJ White/.test(await val(p, "cover-description")));
  // Opened from the page: the chat starts fresh with the page's intro and chips (older chats one click away).
  check("11: older chats folded behind 'See older chats'", /See older chats/.test(await p.$eval('[data-testid="ai-older-toggle"]', (x) => x.innerText).catch(() => "")));
  c = await chips(p, "ai-suggestion-");
  check("11: editor guidance (max 3)", c.length === 3 && c[0] === "Prepare my cover page" && c.includes("Help improve my introduction") && c.includes("Suggest brand colors"), c);

  // 12: help improve my introduction → explicit "Use in SEO Description".
  await click(p, "ai-suggestion-cover-improveIntro", 600);
  t = await panelText(p);
  check("12: introduction draft from the profile", /Draft · written by AI from your TopFan profile/.test(t), t.slice(-400));
  await tap(p, /^use in seo description$/);
  await sleep(500);
  const d2 = await val(p, "cover-description");
  check("12: description replaced only on click", /^AJ White: freestyle snowboarder based in Breckenridge, Colorado/.test(d2), d2);

  // 13: refresh keeps the editor values (mock store).
  await p.reload({ waitUntil: "networkidle0" });
  await sleep(1500);
  check("13: refresh keeps the edited fields", (await val(p, "cover-title")) === "AJ White Riding" && (await val(p, "cover-description")) === d2);
  check("13: not published yet", !(await store(p))?.cover?.publishedAt);

  // 14: publish through the editor's own Update & Publish.
  await openPanel(p);
  await click(p, "cover-publish", 900);
  const s = await store(p);
  check("14: published (mock store)", !!s?.cover?.publishedAt && s.account.whiteLabel.lastPublishedAt === s.cover.publishedAt);
  t = await panelText(p);
  check("14: assistant confirms only after publish", /Your cover page is published\./.test(t), t.slice(-300));
  const tasks = await store(p, "topfan-tasks-v1:setup-navigation");
  check("14: task status done after publish", tasks?.finished?.some((f) => f.taskId === "cover-page" && f.status === "done") || !tasks?.active, JSON.stringify(tasks).slice(0, 300));

  // 15: no errors along the way.
  check("15: no page errors", p.errors.length === 0, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ================= Fixtures (outside the demo links) ================= */
async function fixture(name) {
  const p = await page(`${EDITOR}?resetMock=1&noDelay=1&coverFixture=${name}`);
  await openPanel(p);
  await sleep(600);
  return p;
}
{
  const p = await fixture("no-website");
  await tap(p, /^prepare my cover page$/);
  await sleep(1000);
  const sum = await p.$eval('[data-testid="cover-summary"]', (x) => x.innerText).catch(() => "");
  check("F1: no website → profile + Instagram, no website source", !/Your website \(simulated\) ·/.test(sum) && /No existing website was given/.test(sum), sum);
  check("F1: no colors suggested", !(await p.$('[data-testid="cover-palette"]')) && /No brand colors to suggest/.test(sum));
  check("F1: missing image → the one question", /upload a cover image or choose one from your existing media\?/.test(sum));
  await tap(p, /^review in cover page editor$/);
  await sleep(700);
  const t = await panelText(p);
  check("F1: asks the image question", /Would you like to upload a cover image or choose one from your existing media\?/.test(t), t.slice(-300));
  await p.browserContext().close();
}
{
  const p = await fixture("site-unreachable");
  await tap(p, /^prepare my cover page$/);
  await sleep(1000);
  const sum = await p.$eval('[data-testid="cover-summary"]', (x) => x.innerText).catch(() => "");
  check("F2: unreachable site said plainly, nothing taken from it", /couldn't access https:\/\/ajwhite-riding\.example \(simulated\)/.test(sum), sum);
  await p.browserContext().close();
}
{
  const p = await fixture("no-photo");
  await tap(p, /^prepare my cover page$/);
  await sleep(1000);
  check("F3: no image proposed", !(await p.$('[data-testid="cover-image"]')));
  await p.browserContext().close();
}
{
  const p = await fixture("publish-fail");
  await click(p, "cover-publish", 800);
  let s = await store(p, "topfan-mock-v1");
  let t = await panelText(p);
  check("F4: failed publish leaves it unpublished", !s?.cover?.publishedAt);
  check("F4: says it checked the actual status", /I checked: your cover page wasn't published/.test(t), t.slice(-300));
  await click(p, "cover-publish", 800);
  s = await store(p, "topfan-mock-v1");
  check("F4: retry by the creator publishes once", !!s?.cover?.publishedAt);
  await p.browserContext().close();
}
{
  // Interrupt: Stop during preparation changes nothing.
  const p = await page(`${EDITOR}?resetMock=1&nodelays=keep`);
  await openPanel(p);
  await sleep(600);
  await tap(p, /^prepare my cover page$/);
  await sleep(400);
  await p.evaluate(() => [...document.querySelectorAll('[data-testid="ai-panel"] button')].find((b) => /^stop$/i.test(b.innerText.trim()) || b.getAttribute("aria-label") === "Stop")?.click());
  await sleep(500);
  const t = await panelText(p);
  check("F5: stop → nothing prepared", /Stopped\. Nothing was prepared/.test(t) && !(await store(p, "topfan-mock-v1"))?.cover?.draft, t.slice(-300));
  await p.browserContext().close();
}

/* ================= Demo 2: no cover-page workflow ================= */
{
  const p = await page("/demo/ai-content?resetMock=1&noDelay=1");
  await openPanel(p);
  const r = await ask(p, "Edit my cover page", 900);
  check("D2-1: cross-demo reply", /available in the .*demo/i.test(r), r);
  await p.goto(`${BASE}${EDITOR}?noDelay=1`, { waitUntil: "networkidle0" });
  await sleep(1500);
  await openPanel(p);
  const t = await panelText(p);
  check("D2-2: no cover intro in Demo 2", !/I can help prepare your cover page/.test(t), t.slice(-300));
  const c = [...(await chips(p, "ai-suggestion-")), ...(await chips(p, "ai-context-"))];
  check("D2-3: no cover prefill suggestions", !c.some((x) => /Prepare my cover page|Suggest brand colors|Help improve my introduction|Edit my cover page/.test(x)), c);
  await p.browserContext().close();
}

await b.close();
console.log(fails ? `== cover-page: ${fails} FAILED` : "== cover-page: ALL PASSED");
process.exit(fails ? 1 : 0);
