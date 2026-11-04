// Demo 2 monetization advisor: recommend a Lock (grounded or clearly an example), apply it to the original
// Lock dialog, combinations, edits, Subscription plans, the saved confirmation + teaser, and Demo 1 untouched.
// Usage: node tests/e2e/monetize-advice.mjs   (dev server on :5173, or BASE_URL)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const KEY = "topfan-mock-v1:ai-content";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1512, height: 900 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 400)); if (!ok) fails++; };
const replies = (p) => p.$$eval('[data-msg="assistant"]', (x) => x.map((m) => m.innerText));
async function ask(p, q, wait = 1000) {
  const before = (await replies(p)).length;
  await p.waitForSelector('[data-testid="ai-input"]', { visible: true, timeout: 5000 });
  await p.$eval('[data-testid="ai-input"]', (x) => (x.focus(), x.select?.()));
  await p.keyboard.press("Backspace");
  await p.type('[data-testid="ai-input"]', q);
  await p.keyboard.press("Enter");
  await sleep(wait);
  return (await replies(p)).slice(before).join("\n");
}
const tap = async (p, re, wait = 1000) => {
  const before = (await replies(p)).length;
  const hit = await p.evaluate((src) => {
    const x = [...document.querySelectorAll('[data-testid="ai-panel"] button')].reverse().find((b) => new RegExp(src, "i").test(b.innerText.trim()));
    x?.click();
    return x?.innerText.trim() ?? null;
  }, re.source);
  await sleep(wait);
  return { hit, r: (await replies(p)).slice(before).join("\n") };
};
const db = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}"), KEY);
const post = async (p) => (await db(p)).content.items.filter((x) => x.kind === "post").at(-1);
const path = (p) => new URL(p.url()).pathname;
async function fresh() {
  const p = await b.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(String(e)));
  await p.evaluateOnNewDocument(() => localStorage.setItem("tf-no-delay", "1"));
  await p.goto(`${BASE}/demo/ai-content?resetMock=1`, { waitUntil: "networkidle0" });
  await sleep(1000);
  if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(700); }
  return p;
}

/* 1. The demo scenario */
let p = await fresh();
await ask(p, "Create a snowboarding tutorial post about riding switch", 1500);
let x = await post(p);
check("draft prepared", !!x?.post && !x.post.locked, JSON.stringify(x?.post));
let r = await ask(p, "I want to monetize this post. What do you recommend?", 1200);
check("recommends a one-time unlock with a price", /\$5 one-time unlock/.test(r), r);
check("price is clearly an example (no paid history)", /example starting price/.test(r) && !/optimi[sz]ed|market price|conversion|revenue/i.test(r), r);
check("one short reason", /teaches something specific/.test(r), r);
check("loyalty points from the creator's own rate", /500 loyalty points/.test(r) && /500-point bundle sells for \$5/.test(r), r);
check("membership access offered (Lock › Subscription)", /Gold, Silver, Bronze members/.test(r), r);
check("no NFT contract invented", /won't suggest one/.test(r) && !/0x[0-9a-f]{6}/i.test(r), r);
check("actions: Apply / Change price / Explore", /Apply suggestion/i.test(r) && /Change price/i.test(r) && /Explore other options/i.test(r), r);
check("nothing locked before approval", !(await post(p)).post.locked);

// Change price → $10, then apply.
await tap(p, /^change price$/, 600);
r = (await tap(p, /^\$10$/, 900)).r;
check("change price updates the recommendation", /\$10 one-time unlock/.test(r) && /1,000 loyalty points/.test(r), r);
r = (await tap(p, /^apply suggestion$/, 1800)).r;
x = await post(p);
check("applied: Individual Purchase $10", x.post.locked && x.post.lockBy.join() === "purchase" && x.post.price === 10, JSON.stringify(x.post));
check("the original Lock dialog opens prefilled", path(p) === "/dashboard/newpost" && !!(await p.$('[data-testid="newpost-lock-panel"]')) && (await p.$eval('[data-testid="newpost-lock-price"]', (e) => e.value)) === "10", path(p));
{ const w = await post(p); check("still a draft, nothing published", w.status !== "published" && !w.ref?.postId && !/(?<!Nothing )is published|has been published|is live/i.test(r), `${w.status} ${JSON.stringify(w.ref)}`); }
// The creator edits in the dialog (manual edit wins), then saves.
await p.$eval('[data-testid="newpost-lock-price"]', (e) => e.select());
await p.type('[data-testid="newpost-lock-price"]', "8");
const before = (await replies(p)).length;
await p.click('[data-testid="newpost-lock-apply"]');
await sleep(1400);
r = (await replies(p)).slice(before).join("\n");
check("AI confirms the saved Lock (with the creator's edit)", /Lock saved/.test(r) && /by paying \$8/.test(r) && /unpublished draft/.test(r), r);
check("offers a public teaser", /prepare a public teaser/i.test(r), r);
check("manual edit synced to the draft", (await post(p)).post.price === 8, JSON.stringify((await post(p)).post));
r = (await tap(p, /^prepare a public teaser$/, 1200)).r;
const items = (await db(p)).content.items.filter((y) => y.kind === "post");
check("teaser is a separate public draft", items.length >= 2 && !items.at(-1).post.locked && /teaser/i.test(r), r);
check("no page errors (1)", !p.errors.length, p.errors.join("\n"));
await p.close();

/* 2. Combinations, edits, members */
p = await fresh();
await ask(p, "Create a snowboarding tutorial post about riding switch", 1500);
r = await ask(p, "Let fans pay $5 or use loyalty points", 1200);
x = await post(p);
check("combo: price and points together", x.post.lockBy.sort().join() === "points,purchase" && x.post.price === 5 && x.post.points === 500, JSON.stringify(x.post));
check("combo: clear access summary", /by paying \$5 or with 500 loyalty points/.test(r), r);
r = await ask(p, "Change the price to $7", 1000);
x = await post(p);
check("edit: price changed, points kept", x.post.price === 7 && x.post.points === 500, JSON.stringify(x.post));
r = await ask(p, "Remove the loyalty points", 1000);
x = await post(p);
check("edit: one method removed", x.post.lockBy.join() === "purchase" && x.post.points == null, JSON.stringify(x.post));
r = await ask(p, "Can my subscribers access this?", 1000);
check("members: real plans via Lock › Subscription", /Lock › Subscription/.test(r) && /Gold, Silver, Bronze/.test(r), r);
r = await ask(p, "Make it only for Gold members", 1000);
x = await post(p);
check("tier: Gold Plan via Subscription", x.post.lockBy.join() === "subscription" && x.post.planIds.join() === "gold", JSON.stringify(x.post));
r = await ask(p, "Make it only for Platinum members", 1000);
check("tier that doesn't exist: not invented", /couldn't find a Platinum membership/.test(r), r);
r = await ask(p, "Reward my loyal fans", 1000);
check("loyalty: points recommended", /500 loyalty points/.test(r), r);
// Points threshold validation.
r = await ask(p, "Let fans unlock it with 2.5 points", 1000);
check("invalid points refused", /whole number/i.test(r), r);
// Persistence after refresh.
await p.reload({ waitUntil: "networkidle0" });
await sleep(800);
x = await post(p);
check("resumes after refresh (draft and Lock kept)", !!x?.post?.locked, JSON.stringify(x?.post));
check("no page errors (2)", !p.errors.length, p.errors.join("\n"));
await p.close();

/* 3. Dialog: Subscription option and validation */
p = await fresh();
await p.goto(`${BASE}/dashboard/newpost`, { waitUntil: "networkidle0" });
await p.evaluate(() => [...document.querySelectorAll("button")].find((x) => /^images$/i.test(x.innerText.trim()))?.click());
await sleep(400);
await p.click('[data-testid="newpost-lock"]'); await sleep(400);
const opts = await p.$$eval('[data-testid^="newpost-lock-opt-"]', (x) => x.map((e) => e.getAttribute("aria-label")));
check("dialog: four options as in TopFan", opts.join("|") === "Subscription|Individual Purchase|Loyalty Points|Lock with NFT", opts.join("|"));
await p.click('[data-testid="newpost-lock-opt-subscription"]'); await sleep(200);
const plans = await p.$$eval('[data-testid^="newpost-lock-plan-"]', (x) => x.map((e) => e.innerText.trim()));
check("dialog: real plans listed", plans.join("|") === "Gold Plan|Silver Plan|Bronze Plan", plans.join("|"));
await p.click('[data-testid="newpost-lock-opt-purchase"]'); await sleep(150);
await p.click('[data-testid="newpost-lock-apply"]'); await sleep(300);
check("dialog: Subscription needs a plan", /Choose at least one plan/.test(await p.$eval('[data-testid="newpost-lock-panel"]', (e) => e.innerText)));
await p.click('[data-testid="newpost-lock-plan-silver"]');
await p.click('[data-testid="newpost-lock-apply"]'); await sleep(300);
check("dialog: saved, label shows the plan", /Locked · Silver/.test(await p.$eval('[data-testid="newpost-lock"]', (e) => e.innerText)), await p.$eval('[data-testid="newpost-lock"]', (e) => e.innerText));
await p.close();

/* 4. Demo 1 unaffected */
p = await b.newPage();
await p.goto(`${BASE}/demo/setup-navigation?resetMock=1`, { waitUntil: "networkidle0" });
await sleep(800);
if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]').catch(() => {}); await sleep(600); }
r = await ask(p, "I want to monetize this post. What do you recommend?", 1200).catch(() => "");
check("Demo 1: no content advisor", !/one-time unlock/.test(r), r);
await p.close();

await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
