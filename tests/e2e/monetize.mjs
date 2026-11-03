// Earning discovery → the right Monetize screen → its real setup flow. All 12 destinations, broad /
// specific / ambiguous / decide requests, already-on-page, voice, resume, and the suggestion swap.
// Usage: node tests/e2e/monetize.mjs   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1512, height: 805 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 400)); if (!ok) fails++; };

// Feature → [route path, guided task, the real control its setup step points at]
const DEST = {
  subscriptions: ["/monetize/subscription", "launch-subscription", "monetize-add-plan"],
  newsletters: ["/monetize/newsletters", "send-newsletter", "monetize-newsletter-new"],
  "vip-offers": ["/monetize/vip-offers", "vip-offer", "monetize-vip-add"],
  courses: ["/monetize/courses", "sell-course", "monetize-add-course"],
  experiences: ["/monetize/experience", "sell-experience", "monetize-add-experience"],
  downloadables: ["/monetize/downloadable", "sell-downloadable", "monetize-add-downloadable"],
  merchandise: ["/monetize/merchandise", "sell-merch", "monetize-merch-add"],
  portfolios: ["/monetize/portfolio", "create-portfolio", "monetize-portfolio-add"],
  nfts: ["/monetize/nfts", "list-nft", "monetize-nft-add"],
  events: ["/monetize/event-calendar", "event-tickets", "monetize-event-add"],
  advertisements: ["/monetize/advertisements", "brand-ads", "monetize-ads-cat-new-brands-to-review"],
  "discount-codes": ["/monetize/discount-codes", "discount-code", "monetize-discount-new"],
};

async function open(path = "/", { voice } = {}) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(String(e)));
  p.on("console", (m) => m.type() === "error" && p.errors.push(m.text()));
  if (voice)
    await p.evaluateOnNewDocument((said) => {
      // Test stub only: emits a fixed transcript when started. Not a microphone.
      window.SpeechRecognition = class {
        start() { setTimeout(() => this.onaudiostart?.(), 50); setTimeout(() => { const r = [{ transcript: said }]; r.isFinal = true; this.onresult?.({ resultIndex: 0, results: [r] }); }, 150); }
        stop() { setTimeout(() => this.onend?.(), 50); }
        abort() {}
      };
    }, voice);
  await p.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}resetMock=1&noDelay=1`, { waitUntil: "networkidle0" });
  await sleep(1000);
  if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(600); }
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
  return p;
}
const path = (p) => new URL(p.url()).pathname;
const replies = (p) => p.$$eval('[data-msg="assistant"]', (x) => x.map((m) => m.innerText));
async function ask(p, q) {
  const before = (await replies(p)).length;
  await p.waitForSelector('[data-testid="ai-input"]', { visible: true, timeout: 5000 });
  await p.click('[data-testid="ai-input"]', { clickCount: 3 });
  await p.keyboard.press("Backspace");
  await p.type('[data-testid="ai-input"]', q);
  await p.keyboard.press("Enter");
  await sleep(900);
  return (await replies(p)).slice(before).join("\n");
}
const tap = (p, re) =>
  p.evaluate((src) => {
    const x = [...document.querySelectorAll('[data-testid="ai-panel"] button')].reverse().find((b) => new RegExp(src, "i").test(b.innerText.trim()));
    x?.click();
    return x?.innerText.trim() ?? null;
  }, re.source);
const tasks = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("topfan-tasks-v1") || "null"));
const stepText = (p) => p.evaluate(() => document.querySelector('[data-testid="ai-task-step"]')?.innerText ?? "");
const lastOptions = (p) => p.$$eval('[data-testid="ai-earn-list"]', (ls) => [...(ls.pop()?.querySelectorAll('[data-testid^="ai-earn-option-"]') ?? [])].map((x) => x.dataset.testid.replace("ai-earn-option-", "")));
const clickOption = (p, id) => p.evaluate((id) => [...document.querySelectorAll(`[data-testid="ai-earn-option-${id}"]`)].pop()?.click(), id);

// 8 + all twelve destinations, one after another in the same session (also covers moving between features).
{
  const p = await open("/");
  const t = await ask(p, "What are my earning options?");
  const ids = await lastOptions(p);
  check("8: 'earning options' lists all 12 features", ids.length === 12 && Object.keys(DEST).every((k) => ids.includes(k)), JSON.stringify(ids));
  const groups = await p.$$eval('[data-testid="ai-earn-list"]', (ls) => [...ls.pop().querySelectorAll("h4")].map((h) => h.innerText.toLowerCase()));
  check("8: grouped into the four discovery groups", groups.length === 4 && /memberships/.test(groups[0]) && /events and brand/.test(groups[3]), JSON.stringify(groups));
  check("8: says which help sell rather than earn", /Portfolios and Discount Codes/.test(t) && (await p.$$eval('[data-testid="ai-earn-list"] li', (x) => x.filter((l) => /Helps sell/i.test(l.innerText)).length)) === 2);
  check("8: no navigation from discovery alone", path(p) === "/", path(p));

  for (const [id, [route, taskId, target]] of Object.entries(DEST)) {
    if (id !== "subscriptions") await ask(p, "What are my earning options?");
    await clickOption(p, id);
    await sleep(1300);
    const ts = await tasks(p);
    check(`${id}: opens ${route}`, path(p) === route, path(p));
    check(`${id}: guided task ${taskId} is active with the goal kept`, ts.active?.taskId === taskId && /^Earn from my fans/.test(ts.active?.goal ?? ""), JSON.stringify(ts.active && { t: ts.active.taskId, g: ts.active.goal }));
    check(`${id}: setup step points at a real control on this page`, !!(await p.$(`[data-testid="${target}"]`)) && /Step 2 of/.test(await stepText(p)), `${target} ${await stepText(p)}`);
    check(`${id}: chat kept`, (await replies(p)).length > 2);
  }
  check("paused list stays compact: three rows plus 'Show all'", (await p.$$('[data-testid="ai-task-paused"]')).length === 3 && /Show all 11/.test(await p.$eval('[data-testid="ai-paused-more"]', (x) => x.innerText)));
  check("message box stays visible with many paused tasks", await p.$eval('[data-testid="ai-input"]', (x) => { const r = x.getBoundingClientRect(); return r.height > 0 && r.bottom <= window.innerHeight; }));
  const ts = await tasks(p);
  check("6: moving between features pauses the previous ones, each with its own task", ts.paused.length === 11 && new Set(ts.paused.map((x) => x.taskId)).size === 11, JSON.stringify(ts.paused.map((x) => x.taskId)));

  // 5: resume two different monetization tasks consecutively.
  const resume = async (type) => { if (!(await p.$(`[data-testid="ai-task-paused"][data-task-type="${type}"]`))) { await p.click('[data-testid="ai-paused-more"]'); await sleep(300); } await p.evaluate((t) => document.querySelector(`[data-testid="ai-task-paused"][data-task-type="${t}"] [data-testid="ai-task-resume"]`)?.click(), type); await sleep(1100); };
  await resume("sell-course");
  check("5: resume Courses → Courses, its own step", path(p) === "/monetize/courses" && (await tasks(p)).active.taskId === "sell-course" && /Step 2 of 2/.test(await stepText(p)), `${path(p)} ${await stepText(p)}`);
  await resume("vip-offer");
  check("5: then resume VIP Offers → VIP Offers, its own step", path(p) === "/monetize/vip-offers" && (await tasks(p)).active.taskId === "vip-offer" && /Step 2 of 2/.test(await stepText(p)), `${path(p)} ${await stepText(p)}`);
  check("12 destinations: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

// 1: broad earning question → one question with the four groups + Explore all; nothing opens yet.
{
  const p = await open("/");
  const t = await ask(p, "How can I monetize my audience?");
  const chips = await p.$$eval('[data-testid="ai-panel"] button', (x) => x.map((b) => b.innerText.trim()));
  check("1: broad → one question", /What kind of earning fits you best\?/.test(t), t);
  check("1: offers the four groups and Explore all", ["Memberships and exclusive content", "Knowledge and personal experiences", "Products and creative work", "Events and brand opportunities", "Explore all earning options"].every((l) => chips.includes(l)), JSON.stringify(chips.slice(-6)));
  check("1: no navigation yet", path(p) === "/");
  await tap(p, /^Events and brand opportunities$/);
  await sleep(700);
  check("1: a group shows its three features", JSON.stringify(await lastOptions(p)) === JSON.stringify(["events", "advertisements", "discount-codes"]), JSON.stringify(await lastOptions(p)));
  await clickOption(p, "advertisements");
  await sleep(1200);
  check("1: Advertisements opens Advertisements (not Subscriptions)", path(p) === "/monetize/advertisements", path(p));

  // 4: ambiguous selling request → one helpful question.
  const t4 = await ask(p, "I want to start selling something.");
  check("4: ambiguous → one question about what to sell", /What would you like to sell\?/.test(t4) && path(p) === "/monetize/advertisements", t4);

  // Help me decide → one question → recommendation.
  const td = await ask(p, "Help me decide how to earn.");
  check("decide: asks what matters most", /What matters most/.test(td), td);
  await tap(p, /^Teach what I know$/);
  await sleep(700);
  check("decide: 'Teach what I know' → Courses, Experiences, Downloadables", JSON.stringify(await lastOptions(p)) === JSON.stringify(["courses", "experiences", "downloadables"]), JSON.stringify(await lastOptions(p)));

  // Recommendations for specific goals.
  for (const [q, ids] of [
    ["I want to teach my audience.", ["courses", "experiences", "downloadables"]],
    ["I want to offer exclusive experiences to my biggest fans.", ["vip-offers", "experiences"]],
    ["How can I make money from my videos?", ["subscriptions", "portfolios"]],
  ]) {
    await ask(p, q);
    check(`recommend: "${q}" → ${ids.join(", ")}`, JSON.stringify(await lastOptions(p)) === JSON.stringify(ids), JSON.stringify(await lastOptions(p)));
  }
  for (const [q, taskId, route, extra] of [
    ["I want monthly recurring income.", "launch-subscription", "/monetize/subscription"],
    ["I want to sell branded products.", "sell-merch", "/monetize/merchandise"],
    ["I want to organize an event.", "event-tickets", "/monetize/event-calendar"],
    ["I want to earn through brand collaborations.", "brand-ads", "/monetize/advertisements"],
    ["I want to offer personal coaching.", "sell-experience", "/monetize/experience"],
    ["I want to create offers to encourage more sales.", "discount-code", "/monetize/discount-codes", /don't earn money on their own/],
  ]) {
    const here = path(p);
    const r = await ask(p, q);
    const ts = await tasks(p);
    check(`specific: "${q}" → ${taskId}, no extra question`, ts.active?.taskId === taskId && !/\?$/.test(r.split("\n")[0]) && (!extra || extra.test(r)), `${ts.active?.taskId} | ${r.slice(0, 200)}`);
    if (here !== route) {
      check(`specific: "${q}" waits for a click`, path(p) === here, path(p));
      await p.click('[data-testid="ai-task-go"]'); // the task's own next-step button
      await sleep(1100);
    }
    check(`specific: "${q}" → ${route}`, path(p) === route, path(p));
  }
  check("broad/specific: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

// 2/3: specific request; already on that screen → no navigation; direct "Take me to" skips discovery.
{
  const p = await open("/monetize/merchandise");
  const hist = await p.evaluate(() => history.length);
  const t = await ask(p, "Can I sell merchandise?");
  check("3: already on Merchandise → says so, no navigation", path(p) === "/monetize/merchandise" && /right page/i.test(t) && (await p.evaluate(() => history.length)) === hist, `${path(p)} | ${t}`);
  check("3: guidance for the real control", /Step 2 of/.test(await stepText(p)), await stepText(p));
  const t2 = await ask(p, "Take me to VIP Offers");
  check("2: 'Take me to VIP Offers' goes straight there (no selector)", path(p) === "/monetize/vip-offers" && !/fits you best/.test(t2), `${path(p)} | ${t2}`);
  await ask(p, "Take me to Merchandise.");
  check("2: 'Take me to Merchandise.' goes straight there", path(p) === "/monetize/merchandise", path(p));
  check("2/3: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

// 7: voice request for a monetization feature: same intent path as typing.
{
  const p = await open("/", { voice: "I want to offer personal coaching" });
  await p.click('[aria-label="Speak your question"]');
  await sleep(500);
  await p.click('[aria-label="Stop and review"]');
  await sleep(400);
  const typed = await p.$eval('[data-testid="ai-input"]', (x) => x.value);
  check("7: transcript placed in the box for review", /offer personal coaching/i.test(typed), typed);
  await p.keyboard.press("Enter");
  await sleep(1000);
  check("7: voice → Experiences guided task", (await tasks(p)).active?.taskId === "sell-experience", JSON.stringify((await tasks(p)).active?.taskId));
  check("7: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

// Suggestions: "Start earning from fans" opens discovery; after creating an offering it becomes the next step.
{
  const p = await open("/");
  const sugg = await p.$('[data-testid="ai-suggestion-earn"]');
  check("suggestion: 'Start earning from fans' is offered", !!sugg);
  await sugg.click();
  await sleep(700);
  check("suggestion: opens earning discovery", /What kind of earning fits you best\?/.test((await replies(p)).pop()));
  await ask(p, "I want to create offers to encourage more sales.");
  await tap(p, /^Open Discount Codes$/);
  await sleep(1000);
  await p.click('[data-testid="monetize-discount-new"]');
  await sleep(500);
  await p.type('[data-testid="monetize-discount-code"]', "SPRING15");
  await p.type('[data-testid="monetize-discount-value"]', "15");
  await p.evaluate(() => [...document.querySelectorAll('[data-testid^="monetize-discount-applicable"] button, [data-testid^="monetize-discount-applicable"]')].find((x) => x.tagName === "BUTTON")?.click());
  await p.evaluate(() => {
    const el = document.querySelector('[data-testid="monetize-discount-end"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "2027-06-30");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await p.click('[data-testid="monetize-discount-save"]');
  await sleep(1000);
  const ts = await tasks(p);
  check("complete: creating the code on the page completes the task", !ts.active && ts.finished.some((f) => f.taskId === "discount-code" && f.status === "done"), JSON.stringify({ a: ts.active?.taskId, f: ts.finished }));
  await p.goto(`${BASE}/?noDelay=1`, { waitUntil: "networkidle0" });
  await sleep(1000);
  if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(600); }
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
  await p.evaluate(() => document.querySelector('[aria-label="New conversation"], [data-testid="ai-new-chat"]')?.click());
  await sleep(500);
  const labels = await p.$$eval('[data-testid^="ai-suggestion-"]', (x) => x.map((e) => e.dataset.testid));
  check("suggestion: after an offering, 'Start earning' is replaced by telling fans", labels.includes("ai-suggestion-announce") && !labels.includes("ai-suggestion-earn"), JSON.stringify(labels));
  check("suggestions: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await b.close();
process.exit(fails ? 1 : 0);
