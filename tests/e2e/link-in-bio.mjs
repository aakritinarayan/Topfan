// Demo 2 Smart Link in Bio: scenarios A–E end to end through the assistant panel and the ORIGINAL
// Link In Bio editor (its own SAVE CHANGES + publish confirmation). Asserts on the saved mock store:
// proposed URLs are real destinations, edits/excludes are honoured, refresh keeps the work, refusals
// change nothing, and Demo 1's Link in Bio is untouched.
// Usage: node tests/e2e/link-in-bio.mjs [--viewport=1126x797]   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const vp = (process.argv.find((a) => a.startsWith("--viewport=")) ?? "").split("=")[1];
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: vp ? { width: +vp.split("x")[0], height: +vp.split("x")[1] } : { width: 1512, height: 805 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 500)); if (!ok) fails++; };
const KEY = "topfan-mock-v1:ai-content";
const SITE = "https://fans.ajwhite.com/ajwhite";

async function fresh(demo = "ai-content", q = "") {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(String(e)));
  p.on("console", (m) => m.type() === "error" && !/favicon/.test(m.text()) && p.errors.push(m.text()));
  await p.evaluateOnNewDocument(() => localStorage.setItem("tf-no-delay", "1"));
  await p.goto(`${BASE}/demo/${demo}?resetMock=1&noDelay=1${q}`, { waitUntil: "networkidle0" });
  await sleep(1200);
  await openPanel(p);
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
  return p;
}
const go = async (p, path) => { await p.goto(`${BASE}${path}`, { waitUntil: "networkidle0" }); await sleep(1100); await openPanel(p); await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click()); };
const path = (p) => new URL(p.url()).pathname;
const openPanel = async (p) => { if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(700); } };
const replies = (p) => p.$$eval('[data-msg="assistant"]', (x) => x.map((m) => m.innerText));
async function ask(p, q, wait = 700) {
  const before = (await replies(p)).length;
  await p.waitForSelector('[data-testid="ai-input"]', { visible: true, timeout: 5000 });
  await p.$eval('[data-testid="ai-input"]', (x) => (x.focus(), x.select?.()));
  await p.keyboard.press("Backspace");
  await p.type('[data-testid="ai-input"]', q);
  await p.keyboard.press("Enter");
  await sleep(wait);
  return (await replies(p)).slice(before).join("\n");
}
const tap = async (p, re, wait = 900) => {
  const before = (await replies(p)).length;
  const hit = await p.evaluate((src) => {
    const x = [...document.querySelectorAll('[data-testid="ai-panel"] button')].reverse().find((b) => new RegExp(src, "i").test(b.innerText.trim()));
    x?.click();
    return x?.innerText.trim() ?? null;
  }, re.source);
  await sleep(wait);
  return { hit, r: (await replies(p)).slice(before).join("\n") };
};
const db = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), KEY);
const lib = async (p, key = KEY) => (await p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), key))?.prefsB.linkInBio.actions;
const lastBio = async (p) => (await db(p)).content.items.filter((x) => x.kind === "bio").at(-1);
/** The newest proposal's rows in the panel. */
const rows = (p) => p.evaluate(() => { const r = [...document.querySelectorAll('[data-testid="bio-review"]')].at(-1); return r ? [...r.querySelectorAll('[data-testid="bio-link"]')].map((x) => ({ key: x.dataset.key, include: x.dataset.include === "true", text: x.innerText, title: x.querySelector('[data-testid="bio-link-title"]')?.value })) : []; });
const row = (p, key, sel) => p.evaluateHandle((k, s) => [...document.querySelectorAll('[data-testid="bio-review"]')].at(-1)?.querySelector(`[data-key="${k}"] ${s}`), key, sel);
const save = async (p) => {
  await p.waitForSelector('[data-testid="pref-lib-save"]', { timeout: 5000 });
  await p.$eval('[data-testid="pref-lib-save"]', (x) => x.click());
  await p.waitForSelector('[data-testid="modal-pref-lib-save-confirm"]', { timeout: 5000 });
  await p.$eval('[data-testid="modal-pref-lib-save-confirm"]', (x) => x.click());
  await sleep(1000);
};
const cards = (p) => p.$$eval('[data-testid^="pref-lib-action-"]', (x) => x.filter((e) => /^pref-lib-action-[^-]+(-[^-]+)*$/.test(e.dataset.testid) && !/delete|drag/.test(e.dataset.testid)).map((e) => e.innerText.split("\n")[0].trim()));

/* ===== A. Set up Link in Bio ===== */
{
  const p = await fresh();
  await go(p, "/edit-preference/link-in-bio");
  const intro = await p.$eval('[data-testid="ai-page-intro"]', (x) => x.innerText).catch(() => "");
  check("A: contextual intro", /Your Link in Bio brings your content, offerings, and social profiles together in one place\. I can help you organize it\./.test(intro), intro);
  const chips = await p.$$eval('[data-testid^="ai-suggestion-"]', (x) => x.filter((e) => e.tagName === "BUTTON" && !/more/.test(e.dataset.testid)).map((e) => e.innerText.trim()));
  check("A: three Link in Bio actions", chips.join("|") === "Set up my links|Promote an offering|Improve existing links", chips.join("|"));
  const before = await lib(p);
  let r = await ask(p, "Help me set up my Link in Bio");
  check("A: intro before anything is prepared", /I can bring your important links together so fans can easily find your content and offerings\. I'll check what's already available in your TopFan account\./.test(r) && !(await p.$('[data-testid="bio-review"]')), r);
  check("A: Prepare my links / I'll do it myself", /Prepare my links/i.test(r) && /I'll do it myself/i.test(r), r);
  r = (await tap(p, /^prepare my links$/, 1200)).r;
  check("A: spec response", /I found a few links worth featuring\. I've placed your main offerings first, followed by your social profiles\./.test(r), r);
  let rs = await rows(p);
  check("A: booking link first, real destination", rs[0]?.key === "exp-exp-park" && rs[0].include && rs[0].text.includes("fans.ajwhite.com/ajwhite/store/exp-park/book"), JSON.stringify(rs[0]));
  check("A: membership, store, website and Instagram-family sources", ["membership", "store", "website"].every((k) => rs.some((x) => x.key === k)), rs.map((x) => x.key).join(","));
  check("A: links already present are not re-proposed (course, Instagram)", !rs.some((x) => x.key === "course-course-learn" || x.key === "social-instagram") && /already in your Link in Bio/.test(r), rs.map((x) => x.key).join(","));
  check("A: simulated sources labelled", rs.some((x) => /simulated/i.test(x.text)), "");
  // Creator controls: exclude the website, rename the membership link, move the store up.
  await (await row(p, "website", 'input[type="checkbox"]')).click();
  await sleep(200);
  const t = await row(p, "membership", '[data-testid="bio-link-title"]');
  await t.evaluate((x) => (x.focus(), x.select()));
  await p.keyboard.type("Join My Crew");
  await p.keyboard.press("Tab");
  await sleep(300);
  await (await row(p, "store", 'button[aria-label^="Move"][aria-label$="up"]')).click();
  await sleep(300);
  let x = await lastBio(p);
  check("A: exclude/rename/reorder recorded on the proposal", !x.bio.links.find((l) => l.key === "website").include && x.bio.links.find((l) => l.key === "membership").title === "Join My Crew", JSON.stringify(x.bio.links.map((l) => [l.key, l.include, l.title])));
  check("A: nothing saved yet", JSON.stringify(await lib(p)) === JSON.stringify(before));
  await tap(p, /^add selected links$/, 1500);
  check("A: original Link In Bio editor opens", path(p) === "/edit-preference/link-in-bio/add-link-in-bio", path(p));
  let c = await cards(p);
  check("A: editor prefilled (draft only), booking first", c[0] === "Book My Training Session" && c.includes("Join My Crew") && !c.includes("Visit My Website"), c.join(" | "));
  await p.reload({ waitUntil: "networkidle0" });
  await sleep(1200);
  c = await cards(p);
  check("A: refresh keeps the prepared draft", c[0] === "Book My Training Session" && c.includes("Join My Crew"), c.join(" | "));
  await openPanel(p);
  await save(p);
  const after = await lib(p);
  check("A: saved through the real Save Changes", after[0].url === `${SITE}/store/exp-park/book` && after.some((a) => a.title === "Join My Crew" && a.url === SITE) && !after.some((a) => /ajwhite-riding/.test(a.url ?? "")), JSON.stringify(after.map((a) => [a.title, a.url])));
  check("A: existing links kept", before.every((a) => after.some((y) => y.id === a.id)));
  r = (await replies(p)).join("\n");
  check("A: accurate completion message", /Saved and published\. \d+ changes are live, and your Link in Bio now starts with "Book My Training Session"/.test(r), r.slice(-300));
  check("A: proposal marked saved", (await lastBio(p)).status === "saved");
  await go(p, "/edit-preference/link-in-bio");
  check("A: persists after reload (view page)", (await cards(p))[0] === "Book My Training Session", (await cards(p)).join(" | "));
  check("A: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== B. Promote an Experience ===== */
{
  const p = await fresh();
  let r = await ask(p, "I want to promote my upcoming training session");
  check("B: finds the published training session", /I found your training session\. I'd recommend featuring its booking link first so fans can find it easily\./.test(r), r);
  const rs = await rows(p);
  check("B: suggested CTA + valid booking URL", rs.length === 1 && rs[0].title === "Book My Training Session" && rs[0].text.includes("store/exp-park/book"), JSON.stringify(rs));
  check("B: primary CTA", /Update my Link in Bio/i.test(r), r);
  await tap(p, /^update my link in bio$/, 1500);
  await save(p);
  const a = await lib(p);
  check("B: booking link saved first", a[0].url === `${SITE}/store/exp-park/book` && a[0].title === "Book My Training Session", JSON.stringify(a[0]));
  r = await ask(p, "Promote my training session");
  check("B: already first → says so, nothing proposed", /already the first link/i.test(r), r);
  check("B: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== C. Improve existing links + relevance check ===== */
{
  const p = await fresh();
  let r = await ask(p, "Check if my links are still relevant");
  check("C: outdated offering detected (deterministic check)", /Summer Park Camp 2026/.test(r) && /no longer in your Store/i.test(r) && /aren't visited/i.test(r), r);
  r = await ask(p, "Make my links better");
  check("C: spec response", /I found a few improvements that could make your links clearer and easier to navigate\./.test(r), r);
  const rs = await rows(p);
  const k = Object.fromEntries(rs.map((x) => [x.key, x]));
  check("C: generic label → clear CTA", k["name-ba-d2-click"]?.title === "Explore My Snowboarding Course" && /Click Here/.test(k["name-ba-d2-click"].text), JSON.stringify(k["name-ba-d2-click"]));
  check("C: Instagram label improved", k["name-ba-d2-ig"]?.title === "Follow My Journey on Instagram", JSON.stringify(k["name-ba-d2-ig"]));
  check("C: duplicate proposed for removal (not silently deleted)", /Remove/.test(k["dup-ba-d2-ig2"]?.text ?? "") && /Same destination/.test(k["dup-ba-d2-ig2"].text), JSON.stringify(k["dup-ba-d2-ig2"]));
  check("C: removed offering → replace with live session", k["fix-ba-d2-camp"]?.title === "Book My Training Session" && /Replace/.test(k["fix-ba-d2-camp"].text), JSON.stringify(k["fix-ba-d2-camp"]));
  check("C: missing membership suggested", !!k.membership, rs.map((x) => x.key).join(","));
  check("C: no invented analytics", !/clicks|CTR|views|%/.test(r), r);
  // Approve individually: keep the duplicate.
  await (await row(p, "dup-ba-d2-ig2", 'input[type="checkbox"]')).click();
  await sleep(200);
  await tap(p, /^apply selected improvements$/, 1500);
  await save(p);
  const a = await lib(p);
  check("C: renames saved", a.some((x) => x.id === "ba-d2-click" && x.title === "Explore My Snowboarding Course") && a.some((x) => x.id === "ba-d2-ig" && x.title === "Follow My Journey on Instagram"), JSON.stringify(a.map((x) => x.title)));
  check("C: excluded duplicate kept", a.some((x) => x.id === "ba-d2-ig2"));
  check("C: outdated link replaced with the real booking URL", a.some((x) => x.id === "ba-d2-camp" && x.url === `${SITE}/store/exp-park/book`), JSON.stringify(a.find((x) => x.id === "ba-d2-camp")));
  check("C: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== D. Combined journey: experience → announcement → "Add this to my Link in Bio" ===== */
{
  const p = await fresh();
  await ask(p, "I want to host a paid training session for fans");
  await ask(p, "75");
  await tap(p, /^prepare an announcement post$/);
  const exp = (await db(p)).content.items.find((x) => x.kind === "experience");
  let r = await ask(p, "Add this to my Link in Bio");
  let x = await lastBio(p);
  check("D: 'this' resolves to the current experience", x.deps.includes(exp.id) && x.bio.links[0].refId === exp.id, JSON.stringify(x?.bio?.links));
  check("D: not live → pending, no invented URL, dependency explained", x.status === "needs-input" && x.bio.links[0].url === null && /isn't live yet/.test(r) && !/Update my Link in Bio/i.test(r), r);
  // The creator saves and enables the experience on its own screen.
  await go(p, `/monetize/experience/create-experience?work=${exp.id}`);
  await p.click('[aria-label="Enable experience"]').catch(() => {});
  await sleep(200);
  // The reference form needs a preview image, and calendar types need a duration and (in person) an address.
  await p.evaluate(() => document.querySelector('[data-testid="modal-monetize-exp-calendar"]')?.closest('[role="dialog"]')?.querySelector('[aria-label="Close"]')?.click());
  const upload = await p.$('[data-testid="monetize-product-image-input"]');
  await upload?.uploadFile(new URL("../../public/assets/generated/training-wide.webp", import.meta.url).pathname);
  if (await p.$('[data-testid="monetize-exp-duration-row"]')) {
    await p.click('[data-testid="monetize-exp-duration-row"] button');
    await p.evaluate(() => [...document.querySelectorAll('[role="option"]')].find((o) => o.innerText.trim() === "1 Hour")?.click());
  }
  for (const [k, v] of [["street", "1 Example Way"], ["country", "United States"], ["state", "Colorado"], ["city", "Copper Ridge"], ["postal", "80000"]])
    if (await p.$(`[data-testid="monetize-exp-${k}"]`)) await p.type(`[data-testid="monetize-exp-${k}"]`, v);
  await sleep(300);
  await p.click('[data-testid="monetize-product-save"]');
  await sleep(1200);
  const prod = (await db(p)).monetize.products.find((y) => y.title === exp.experience.title);
  x = await lastBio(p);
  check("D: once live, the same update gets the real booking link", prod?.published && x.bio.links[0].url === `${SITE}/store/${prod.id}/book` && x.status === "draft", JSON.stringify({ prod: prod?.id, link: x.bio.links[0] }));
  r = (await replies(p)).join("\n");
  check("D: assistant reports it's ready (no duplicate offer)", /has its booking link now/.test(r) && !/Would you like me to add your experience/.test(r), r.slice(-400));
  await tap(p, /^update my link in bio$/, 1500);
  await save(p);
  check("D: saved with the experience's real destination", (await lib(p))[0].url === `${SITE}/store/${prod.id}/book`);
  check("D: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== E. Weekly plan with Link in Bio promotion ===== */
{
  const p = await fresh();
  let r = await ask(p, "Plan a training post, a newsletter and a paid fan session this week, and promote the session in my Link in Bio", 1000);
  check("E: week prepared", /Your week is prepared\./.test(r), r);
  const counts = await p.$eval('[data-testid="content-week-counts"]', (x) => x.innerText).catch(() => "");
  check("E: Link in Bio update counted", /1 Link in Bio update/.test(counts), counts);
  const items = (await db(p)).content.items;
  const w = items.find((x) => x.kind === "week");
  const exp = items.find((x) => x.kind === "experience" && x.parentId === w.id);
  const bio = items.find((x) => x.kind === "bio");
  check("E: same experience referenced, pending (not done)", bio?.parentId === w.id && bio.deps.includes(exp.id) && bio.status === "needs-input", JSON.stringify(bio));
  r = await ask(p, "Approve the ready drafts");
  check("E: approval doesn't complete the pending update", (await lastBio(p)).status === "needs-input", r);
  r = await ask(p, "Remove the experience");
  check("E: experience removed → Link in Bio update flagged", (await lastBio(p)).flags.length > 0, JSON.stringify((await lastBio(p)).flags));
  r = await ask(p, "Continue my link in bio");
  check("E: continue resumes the Link in Bio task (not another)", /Link in Bio update/.test(r) && (await db(p)).content.focusId === bio.id, r);
  check("E: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== Errors: invalid URL refused at the service; simulated save failure + retry ===== */
{
  const p = await fresh("ai-content", "&bioFixture=save-fail");
  await ask(p, "Promote my training session");
  await tap(p, /^update my link in bio$/, 1500);
  const before = await lib(p);
  await save(p);
  check("ERR: simulated save failure changes nothing", JSON.stringify(await lib(p)) === JSON.stringify(before) && path(p).endsWith("add-link-in-bio"));
  const r = (await replies(p)).join("\n");
  check("ERR: failure reported honestly with a retry", /couldn't be saved/i.test(r) && /Try again/i.test(r), r.slice(-300));
  await save(p);
  check("ERR: retry succeeds", (await lib(p))[0].url === `${SITE}/store/exp-park/book`);
  // Invalid URL typed by hand in the original Add form.
  await go(p, "/edit-preference/link-in-bio/add-link-in-bio");
  await p.click('[data-testid="pref-lib-new-action"]');
  await sleep(200);
  await p.click('[data-testid="pref-lib-new-action-external"]');
  await sleep(300);
  await p.type('[data-testid="modal-pref-lib-action-title"]', "Broken");
  await p.type('[data-testid="modal-pref-lib-action-extra"]', "not a url");
  await p.click('[data-testid="modal-pref-lib-action-add"]');
  await sleep(300);
  const n = (await lib(p)).length;
  await save(p);
  check("ERR: invalid URL refused at the service layer", (await lib(p)).length === n && !(await lib(p)).some((a) => a.title === "Broken"));
  check("ERR: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== Demo 1 untouched ===== */
{
  const p = await fresh("setup-navigation");
  await go(p, "/edit-preference/link-in-bio");
  // Demo 1 only writes its storage after a change, so read the page itself.
  const c = await cards(p);
  check("D1: Link in Bio unchanged (3 original cards, no Demo 2 fixture links)", c.length === 3 && !c.some((x) => /Click Here|Summer Park Camp|^IG$/.test(x)), c.join(" | "));
  const chips = await p.$$eval('[data-testid^="ai-suggestion-"]', (x) => x.map((e) => e.innerText.trim()));
  check("D1: no Demo 2 Link in Bio workflows offered", !chips.some((c) => /Set up my links|Promote an offering|Improve existing links/.test(c)), chips.join("|"));
  const r = await ask(p, "Make my links better");
  check("D1: no Demo 2 proposal created", !(await p.$('[data-testid="bio-review"]')), r);
  await p.browserContext().close();
}

await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
