// The presentation's typed phrases (docs/demo-run-sheet.md), checked end to end. Runs against whatever
// answers: the live model when ANTHROPIC_API_KEY is set, otherwise the labeled demo mode.
// Usage: node tests/e2e/demo-script.mjs [1512|1126]   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const W = Number(process.argv[2]) || 1512, H = W === 1126 ? 797 : 805;
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: W, height: H } });
const p = await b.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : x); if (!ok) fails++; };
const errors = [];
p.on("pageerror", (e) => errors.push(String(e)));

const live = await (await fetch("http://localhost:5173/api/chat")).json().then((s) => s.configured).catch(() => false);
console.log(live ? "Answering: live model" : "Answering: demo mode (no API key)");
const wait = live ? 12000 : 1500;

await p.goto("http://localhost:5173/?resetMock=1", { waitUntil: "networkidle0" });
await sleep(1200);
if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(600); }
const panel = () => p.evaluate(() => document.querySelector('[data-testid="ai-panel"]').innerText);
const path = () => new URL(p.url()).pathname;
const ask = async (q) => {
  const before = (await panel()).length;
  await p.click('[data-testid="ai-input"]', { clickCount: 3 });
  await p.type('[data-testid="ai-input"]', q);
  await p.keyboard.press("Enter");
  await sleep(wait);
  return (await panel()).slice(before);
};

let t = await ask("Where do I set what fans pay to message me?");
check("pay-to-message → Preferences › Monetization", path() === "/edit-preference/monetization", path());

t = await ask("Take me to my wallet");
check("'my wallet' asks which one", /NFT/i.test(t) && /earning|withdraw/i.test(t), t);

t = await ask("I want to start earning");
check("'start earning' starts a guided task", /Step \d of \d/.test(t) && path() === "/monetize/subscription", `${path()} ${t}`);
check("no 'I saw that' for the assistant's own navigation", !/I saw that/.test(t), t);

t = await ask("What should I focus on?");
check("focus → Outbound Email first", /Outbound Email/i.test(t), t);

t = await ask("Create a group called Inner Circle");
check("named group → approval card", !!(await p.$('[data-testid="ai-approval"]')) && /Inner Circle/.test(t), t);
await p.evaluate(() => [...document.querySelectorAll('[data-testid="ai-panel"] button')].reverse().find((x) => x.innerText.trim().toLowerCase() === "approve")?.click());
await sleep(1200);
const groups = await p.evaluate(() => JSON.parse(localStorage.getItem("topfan-mock-v1")).prefsB.groups.map((g) => g.name));
check("Approve creates exactly one group and opens Groups", groups.filter((g) => g === "Inner Circle").length === 1 && /groups/.test(path()), `${path()} ${groups}`);

t = await ask("Create a group called Inner Circle");
check("asking again doesn't duplicate it", /already have/i.test(t) && !(await p.$$eval('[data-testid="ai-approval"]', (x) => x.length > 1)), t);

await ask("Review my posts");
t = await panel(); // Autopilot replaces the chat view
check("'Review my posts' opens Content Autopilot", /4 ready/.test(t) && /REVIEW READY POSTS/i.test(t), t);

// A Content delegate asks the same pricing question: told who can, not taken there.
await p.evaluate(() => { const d = JSON.parse(localStorage.getItem("topfan-mock-v1")); d.account.session.role = "content"; localStorage.setItem("topfan-mock-v1", JSON.stringify(d)); });
await p.goto("http://localhost:5173/", { waitUntil: "networkidle0" });
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
