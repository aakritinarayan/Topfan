// The presentation's typed phrases (docs/demo-run-sheet.md), checked end to end. Runs against whatever
// answers: the live model when ANTHROPIC_API_KEY is set, otherwise the labeled demo mode.
// Usage: node tests/e2e/demo-script.mjs [1512|1126]   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const W = Number(process.argv[2]) || 1512, H = W === 1126 ? 797 : 805;
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: W, height: H } });
const p = await b.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : x); if (!ok) fails++; };
const errors = [];
p.on("pageerror", (e) => errors.push(String(e)));

const live = await (await fetch(`${BASE}/api/chat`)).json().then((s) => s.configured).catch(() => false);
console.log(live ? "Answering: live model" : "Answering: demo mode (no API key)");
const wait = live ? 12000 : 1500;

await p.goto(`${BASE}/?resetMock=1`, { waitUntil: "networkidle0" });
await sleep(1200);
if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(600); }
const panel = () => p.evaluate(() => document.querySelector('[data-testid="ai-panel"]').innerText);
const path = () => new URL(p.url()).pathname;
const replies = () => p.$$eval('[data-msg="assistant"]', (x) => x.map((m) => m.innerText));
const ask = async (q) => {
  const before = (await replies()).length;
  await p.click('[data-testid="ai-input"]', { clickCount: 3 });
  await p.keyboard.press("Backspace");
  await p.type('[data-testid="ai-input"]', q);
  await p.keyboard.press("Enter");
  await sleep(wait);
  return (await replies()).slice(before).join("\n");
};
const tap = (re) => p.evaluate((src) => { const x = [...document.querySelectorAll('[data-testid="ai-panel"] button')].reverse().find((b) => new RegExp(src, "i").test(b.innerText.trim())); x?.click(); return !!x; }, re.source);

let t = await ask("Where do I set what fans pay to message me?");
check("pay-to-message → offers Preferences › Monetization", /Monetization/.test(t) && (await tap(/^Open Monetization$/)), t);
await sleep(1000);
check("…and opens it", path() === "/edit-preference/monetization", path());

t = await ask("Take me to my wallet");
check("'my wallet' asks which one", /NFT/i.test(t) && /earning|withdraw/i.test(t), t);

t = await ask("I want to change my website logo.");
check("logo → offers Open White Label Site", /White Label Site/.test(t) && (await tap(/^Open White Label Site$/)), t);
await sleep(1000);
check("…and opens it", path() === "/edit-preference/whitelabel", path());

t = await ask("I want to start earning from my fans, but I don't know where to start.");
check("'start earning' asks one question", /fits you best\?/.test(t), t);
await tap(/^Memberships and exclusive content$/);
await sleep(wait);
await p.evaluate(() => [...document.querySelectorAll('[data-testid="ai-earn-option-subscriptions"]')].pop()?.click());
await sleep(1200);
t = (await replies()).slice(-2).join("\n");
check("membership → guided task on the plans page", path() === "/monetize/subscription" && !!(await p.$('[data-testid="ai-task-card"]')), `${path()} ${t}`);
check("no 'I saw that' for the assistant's own navigation", !/I saw that/.test(t), t);

t = await ask("What should I focus on?");
check("focus → Outbound Email first", /Outbound Email/i.test(t), t);

t = await ask("Create a group called Inner Circle");
check("named group → Add Group form, prefilled, nothing created yet", path() === "/edit-preference/groups/add" && /Inner Circle/.test(t) && (await p.$eval('[data-testid="pref-groups-title"]', (x) => x.value)) === "Inner Circle", t);
await p.click('[data-testid="pref-groups-submit"]');
await sleep(1200);
const groups = await p.evaluate(() => JSON.parse(localStorage.getItem("topfan-mock-v1")).prefsB.groups.map((g) => g.name));
check("Save creates exactly one group", groups.filter((g) => g === "Inner Circle").length === 1, `${path()} ${groups}`);

t = await ask("Create a group called Inner Circle");
check("asking again doesn't duplicate it", /already have/i.test(t), t);

await ask("Review my posts");
t = await panel(); // Autopilot replaces the chat view
check("'Review my posts' opens Content Autopilot", /4 ready/.test(t) && /REVIEW READY POSTS/i.test(t), t);
await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
await ask("Plan my week");
check("'Plan my week' opens planning", !!(await p.$('[data-testid="ap-plan-intro"]')));
await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());

// A Content delegate asks the same pricing question: told who can, not taken there.
await p.evaluate(() => { const d = JSON.parse(localStorage.getItem("topfan-mock-v1")); d.account.session.role = "content"; localStorage.setItem("topfan-mock-v1", JSON.stringify(d)); });
await p.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await sleep(1200);
if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(600); }
await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
t = await ask("Where do I set what fans pay to message me?");
t = await panel(); // the greeting is replaced, so read the whole panel
check("delegate: explains the owner can, stays put", /isn't included in your access/.test(t) && /account owner/i.test(t) && path() === "/", `${path()} ${t.slice(-300)}`);

check("no page errors", errors.length === 0, errors.join("\n"));
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await b.close();
process.exit(fails ? 1 : 0);
