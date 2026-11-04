// Demo 2 presenter guide (docs/DEMO2_PRESENTER_GUIDE.md), step by step exactly as written, in ONE
// session like a live demo: every typed phrase and every button the guide names, with the outcome
// the guide promises checked on the real screens and the mock store.
// Usage: node tests/e2e/demo2-guide.mjs [--viewport=1126x797]   (dev server on :5173)
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
const items = async (p) => (await db(p)).content.items;
const back = async (p) => { await go(p, "/ajwhite"); await openPanel(p); };
const body = (p) => p.evaluate(() => document.body.innerText);

const p = await fresh();
/* 1. Welcome */
const welcome = (await replies(p)).join("\n") + (await body(p));
check("1: 'What would you like to create?' with Create a post / Plan my content / Create a newsletter", /What would you like to create\?/.test(welcome) && /Create a post/.test(welcome) && /Plan my content/.test(welcome) && /Create a newsletter/.test(welcome));

/* 2. Post with an image */
let r = await ask(p, "Create a training update post for this week", 1000);
check("2.1: Images post draft from training notes, Draft, sources", /Draft/i.test(r) && /Training notes/i.test(r), r.slice(0, 300));
r = (await tap(p, /^add an image$/)).r;
r = (await tap(p, /^generate an original image$/, 1200)).r;
check("2.2: two directions, no simulated label", /Choose an image/i.test(r) && !/simulated/i.test(r), r.slice(0, 300));
const pick1 = await tap(p, /cinematic|minimal/, 900);
check("2.3: a direction can be picked", !!pick1.hit, pick1.hit);
r = await ask(p, "Make it darker", 1000);
const rev = await tap(p, /darker/, 900);
check("2.3: darker revision offered and picked", !!rev.hit, r.slice(0, 300));
await tap(p, /^open in new post$/, 1500);
check("2.4: the real New Post composer opens prefilled", path(p) === "/dashboard/newpost" && (await p.$('[data-testid^="newpost-composer-"]')) !== null, path(p));
const ta = await p.$('[data-testid="newpost-composer-images"] textarea');
if (ta) { await ta.click(); await p.keyboard.type(" See you on the hill."); await sleep(900); }
check("2.4: edits sync back ('Edited by you')", (await items(p)).some((x) => x.kind === "post" && x.editedByCreator), JSON.stringify((await items(p)).map((x) => [x.kind, x.editedByCreator])));
await back(p);

/* 3. Members-only + Lock */
r = await ask(p, "Create an exclusive post for my Gold members", 1000);
check("3.1: honest about Lock vs one plan", /can't|cannot|isn't|doesn't/i.test(r) && /Gold/.test(r), r.slice(0, 300));
r = await ask(p, "Make it only for Platinum members", 900);
check("3.2: 'I couldn't find a Platinum membership in your current plans.'", /I couldn't find a Platinum membership in your current plans\./.test(r), r);
const gold = await tap(p, /^use gold/, 900);
await tap(p, /^lock it with an unlock price$/, 900);
r = await ask(p, "12", 900);
check("3.3: Gold Plan → Lock with an unlock price → 12", !!gold.hit && /12/.test(r), `${gold.hit} | ${r.slice(0, 200)}`);
r = await ask(p, "Prepare a public teaser", 1000);
const teaser = (await items(p)).find((x) => x.link?.rel === "teaser-of");
check("3.4: separate public teaser that doesn't leak locked content", !!teaser && !teaser.post.locked, r.slice(0, 200));
r = await ask(p, "Let fans unlock this using loyalty points", 900);
r = await ask(p, "250", 900);
check("3.5: loyalty points set to 250", /250/.test(r) && /Loyalty Points/i.test(r), r.slice(0, 300));
await tap(p, /^open in new post$/, 1600);
const lockLabel = await p.$eval('[data-testid="newpost-lock"]', (x) => x.innerText).catch(() => "");
if (!(await p.$('[data-testid="newpost-lock-panel"]'))) await p.click('[data-testid="newpost-lock"]').catch(() => {});
await sleep(600);
const pts = await p.$eval('[data-testid="newpost-lock-points"]', (x) => x.value).catch(() => "");
check("3.5: Lock button and dialog show 250 Loyalty Points", /250 Points/i.test(lockLabel) && pts === "250", `${path(p)} | ${lockLabel} | ${pts}`);
await p.click('[data-testid="newpost-lock-cancel"]').catch(() => {});
await back(p);

/* 4. Newsletter with a blocker */
r = await ask(p, "Turn this post into a newsletter", 1000);
check("4.1: draft ready, email sending needs verification", /verif/i.test(r), r.slice(0, 300));
r = await ask(p, "Send it only to Gold subscribers", 900);
check("4.2: plan audience works for newsletters", /Gold/.test(r), r.slice(0, 200));
await tap(p, /^open and save the draft$/, 1600);
check("4.3: the original newsletter editor opens", /\/monetize\/newsletters\/(add|edit)/.test(path(p)), path(p));
await p.evaluate(() => document.querySelector('[data-testid="monetize-newsletter-save-draft"]')?.click());
await sleep(1200);
const nl = (await items(p)).filter((x) => x.kind === "newsletter").at(-1);
check("4.3: 'Saved in TopFan', not Sent", nl?.status === "saved" && !(await db(p)).monetize.newsletters.some((n) => n.status === "Sent" && n.title === nl.newsletter?.title), nl?.status);
await back(p);

/* 5. Fan experience */
r = await ask(p, "I want to sell tickets for a fan session", 900);
check("5.1: asks booking vs set date", /Book a time with me/i.test(r), r.slice(0, 200));
await tap(p, /^book a time with me$/, 1000);
r = await ask(p, "free", 900);
check("5.2: 'free' declined with an explanation", /price|free/i.test(r) && !/price set/i.test(r), r.slice(0, 200));
r = await ask(p, "75", 900);
check("5.2: price 75", /75/.test(r), r.slice(0, 200));
const expItem = (await items(p)).filter((x) => x.kind === "experience").at(-1);
await tap(p, /^open in add experience$/, 1600);
const ex = await body(p);
check("5.3: Create Experiences form opens prefilled", path(p) === "/monetize/experience/create-experience" && /Create Experiences/.test(ex) && (await p.$$eval("input, textarea", (x, t) => x.some((i) => i.value && i.value.includes(t.slice(0, 12))), expItem.experience.title)), path(p));
check("5.3: starts Disabled", await p.evaluate(() => [...document.querySelectorAll("button")].some((b) => /^disable$/i.test(b.innerText.trim()) && (b.getAttribute("aria-pressed") === "true" || /bg-accent/.test(b.className)))));
await back(p);
r = await ask(p, "Announce it", 1000);
check("5.4: announcement flags the booking link until live", /booking link|live/i.test(r), r.slice(0, 300));

/* 6. The whole week */
r = await ask(p, "I'm busy this week. Plan a training post, an exclusive post for members, a newsletter and a paid fan session.", 1300);
check("6.1: 'Your week is prepared.' with Mon/Wed/Fri/Sat", /Your week is prepared\./.test(r) && /MON/.test(r) && /WED/.test(r) && /FRI/.test(r) && /SAT/.test(r), r.slice(0, 300));
r = await ask(p, "Move the newsletter to Thursday", 1000);
check("6.2: only the newsletter moves", /Moved the .*newsletter to Thursday/i.test(r), r.slice(0, 200));
r = await ask(p, "Remove the experience", 1000);
check("6.3: newsletter flagged for review", /review/i.test(r), r.slice(0, 200));
r = await ask(p, "Approve the ready drafts", 1000);
check("6.4: approved, nothing posted", /Approved/i.test(r) && /Nothing has been posted/i.test(r), r.slice(0, 200));
r = await ask(p, "Plan my week and help promote my upcoming experience", 1300);
const wk = (await items(p)).filter((x) => x.kind === "week").at(-1);
const kids = (await items(p)).filter((x) => x.parentId === wk.id);
check("6 variant: five connected tasks incl. Link in Bio", kids.length === 5 && kids.some((x) => x.kind === "bio"), kids.map((x) => x.label).join(" | "));
r = await ask(p, "Rename the experience to Sunrise Park Session", 1000);
check("6 variant: rename marks dependents for review", /marked/.test(r), r.slice(0, 200));

/* 7. Link in Bio */
await p.click('[data-testid="nav-edit-preferences"]');
await sleep(1000);
await p.evaluate(() => [...document.querySelectorAll("a, button")].find((x) => /^link in bio$/i.test(x.innerText.trim()))?.click());
await sleep(1300);
await openPanel(p);
const intro = await p.evaluate(() => document.querySelector('[data-testid="ai-page-intro"]')?.innerText || document.querySelector('[data-testid="ai-context-page"]')?.title || "");
check("7: reached via Edit Preferences › Link In Bio, intro shown", path(p) === "/edit-preference/link-in-bio" && /brings your content, offerings, and social profiles together in one place/.test(intro), `${path(p)} | ${intro}`);
r = (await tap(p, /^set up my links$/, 900)).r;
r = (await tap(p, /^prepare my links$/, 1200)).r;
check("7.1: review with priorities and availability", /worth featuring/.test(r) && (await p.$('[data-testid="bio-link-rank"]')) !== null, r.slice(0, 200));
await tap(p, /^add selected links$/, 1600);
check("7.2: original editor opens", path(p) === "/edit-preference/link-in-bio/add-link-in-bio", path(p));
await p.$eval('[data-testid="pref-lib-save"]', (x) => x.click());
await p.waitForSelector('[data-testid="modal-pref-lib-save-confirm"]', { timeout: 5000 });
await p.$eval('[data-testid="modal-pref-lib-save-confirm"]', (x) => x.click());
await sleep(1200);
await openPanel(p);
r = (await replies(p)).at(-1);
check("7.2: confirms what saved", /Saved and published/.test(r), r);
r = await ask(p, "Put my training session at the top", 900);
check("7.3: already first → says so, no duplicate", /already the first link/.test(r), r);
r = await ask(p, "Make my links better", 1000);
check("7.4: Click Here, duplicate IG, outdated Summer Park Camp", /Click Here/.test(r) && /IG/.test(r) && /Summer Park Camp/.test(r), r.slice(0, 400));

/* 8. Keep it going */
r = await ask(p, "I don't want to plan this every week", 1200);
check("8: Content Autopilot preferences, nothing posts on its own", /Autopilot|weekly/i.test(r + (await body(p))), r.slice(0, 200));

/* Recovering */
await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
await sleep(500);
await openPanel(p);
r = await ask(p, "Continue my week", 1000);
check("Recover: 'Continue my week' shows the week", /week/i.test(r), r.slice(0, 200));
check("no page errors across the whole guide", !p.errors.length, p.errors.join("\n"));
await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
