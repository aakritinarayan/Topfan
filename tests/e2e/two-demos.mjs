// The two demo links as two distinct stories over one app: Demo 1 (Account Setup & Navigation) and
// Demo 2 (AI-Assisted Content) journeys end to end, cross-demo requests, independent state, and the
// shared page guidance on 11 screens in both demos (right page, right demo's actions).
// Voice uses an injected SpeechRecognition stub (transcript path only, not a real microphone).
// Usage: node tests/e2e/two-demos.mjs   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1512, height: 805 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 400)); if (!ok) fails++; };

async function demo(id, { voice } = {}) {
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
  await p.goto(`${BASE}/demo/${id}?resetMock=1&noDelay=1`, { waitUntil: "networkidle0" });
  await sleep(1500);
  return p;
}
const go = async (p, path) => { await p.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}noDelay=1`, { waitUntil: "networkidle0" }); await sleep(1300); };
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
const store = (p, key) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), key);
const panelText = (p) => p.evaluate(() => document.querySelector('[data-testid="ai-panel"]')?.innerText ?? "");
const chips = (p, prefix = "ai-suggestion-") => p.$$eval(`[data-testid^="${prefix}"]`, (x) => x.filter((e) => e.tagName === "BUTTON" && !/more$/.test(e.dataset.testid)).map((e) => e.innerText.trim()));
const D1_ONLY = /Connect my domain|Customize my website|Explore other earning options|Finish setting up|Start earning from fans|Explore how to create a post/;
const D2_ONLY = /Prepare this week's content|Review my (prepared posts|AI-generated drafts)|Help me write a post|Draft a|membership benefits|content from my notes|group welcome|Announce/;
const SETUP_TALK = /Want me to handle the DNS setup|Do you already have a domain|DNS records|GoDaddy|Creator Quest/;
const AUTOPILOT_TALK = /Your weekly content is prepared|Content Autopilot|Smart Timing|prepared posts/;

/* ================= Demo 1: Account Setup & Navigation ================= */
{
  const p = await demo("setup-navigation", { voice: "Take me to Link in Bio" });
  check("D1-1: opens account setup", path(p) === "/edit-preference/whitelabel/setup/domain", path(p));
  await sleep(1500);
  const t0 = await panelText(p);
  check("D1-2: domain assistance offered", /Do you already have a domain name\?/.test(t0) || /get started/i.test(await p.evaluate(() => document.body.innerText)), t0.slice(0, 300));

  // 3: the simulated GoDaddy connection on the DNS step.
  await go(p, "/edit-preference/whitelabel/setup/dns");
  await openPanel(p);
  await tap(p, /^prepare it for me$/);
  await sleep(500);
  await click(p, "dns-continue", 1500);
  await click(p, "dns-approve", 2900);
  check("D1-3: simulated GoDaddy setup prepared", (await p.$eval('[data-testid="dns-setup"]', (x) => x.dataset.step)) === "success");
  await click(p, "dns-done", 600);
  // 4: verify & continue.
  await p.click('[data-field="verify"]');
  await sleep(2600);
  check("D1-4: verified, on to provisioning", path(p) === "/edit-preference/whitelabel/setup/provisioning", path(p));
  check("D1-5: Creator Quest offered while provisioning", !!(await p.$('[data-field="creator-quest"]')) || /Creator Quest/i.test(await p.evaluate(() => document.body.innerText)));
  // 5: provisioning completes.
  await p.evaluate(() => [...document.querySelectorAll("button")].find((x) => /Simulate: finish provisioning/.test(x.innerText))?.click());
  await sleep(3300);
  await p.evaluate(() => [...document.querySelectorAll("button")].find((x) => /^go to my site$/i.test(x.innerText.trim()) && !x.closest('[data-testid="ai-panel"]'))?.click());
  await sleep(1500);
  check("D1-6: website complete, in the creator platform", !path(p).startsWith("/edit-preference/whitelabel/setup"), path(p));

  // 7–8: typed navigation to White Label Site.
  await go(p, "/ajwhite");
  await openPanel(p);
  let r = await ask(p, "Where can I change my website logo?");
  check("D1-7: typed request understood", /Site Logo|White Label Site/.test(r), r);
  await tap(p, /^open white label site$/);
  await sleep(900);
  check("D1-8: navigated to White Label Site", path(p) === "/edit-preference/whitelabel", path(p));

  // 9: voice for another feature.
  await p.click('[aria-label="Speak your question"]');
  await sleep(500);
  await p.click('[aria-label="Stop and review"]');
  await sleep(400);
  await p.keyboard.press("Enter");
  await sleep(1200);
  check("D1-9: voice navigation to Link in Bio", path(p) === "/edit-preference/link-in-bio", path(p));

  // 10: monetization discovery.
  r = await ask(p, "I want to start earning money from my fans");
  check("D1-10: broad earning goal → categories", /fits you best|kind of earning/i.test(r), r);
  r = await ask(p, "Show me all the ways I can earn");
  check("D1-10: all 12 options", /all 12 ways to earn/i.test(r), r);

  // 11: resume an unfinished platform task.
  await ask(p, "Help me create a VIP group");
  check("D1-11: VIP group task started", (await store(p, "topfan-tasks-v1:setup-navigation"))?.active?.taskId === "vip-group");
  await click(p, "ai-task-pause");
  await go(p, "/insights");
  await openPanel(p);
  await p.evaluate(() => document.querySelector('[data-testid="ai-task-paused"][data-task-type="vip-group"] button')?.click());
  await sleep(800);
  check("D1-11: Resume opens the VIP group task", (await store(p, "topfan-tasks-v1:setup-navigation"))?.active?.taskId === "vip-group");

  // 12: no Content Autopilot anywhere in Demo 1.
  await go(p, "/ajwhite");
  await openPanel(p);
  check("D1-12: no Autopilot notice", !(await p.$('[data-testid="ap-notice"]')));
  r = await ask(p, "Plan my week");
  check("D1-12: Autopilot request → points to the content demo", /That workflow is available in the AI-Assisted Content demo\./.test(r) && !(await p.$('[data-testid="ap-view"]')), r);
  check("D1-12: no Autopilot batch prepared in Demo 1", !(await store(p, "topfan-mock-v1:setup-navigation"))?.autopilot?.batch);
  check("D1-12: Autopilot never mentioned proactively", !AUTOPILOT_TALK.test((await replies(p)).filter((x) => !/That workflow is available/.test(x)).join("\n")));
  check("D1-12: no Autopilot suggestion chips", !D2_ONLY.test((await chips(p, "ai-context-")).join("|")), (await chips(p, "ai-context-")).join("|"));
  check("D1: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ================= Demo 2: AI-Assisted Content ================= */
{
  const p = await demo("ai-content");
  check("D2-1: opens the creator's Feed", path(p) === "/ajwhite", path(p));
  await openPanel(p);
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
  check("D2-2: AI open with the prepared-content notice", !!(await p.$('[data-testid="ap-notice"]')));
  const welcome = await p.$eval('[data-testid="ai-welcome"]', (x) => x.innerText).catch(() => "");
  const c0 = await chips(p);
  check("D2-3: create welcome and content suggestions", /What would you like to create\?/.test(welcome) && c0.join("|") === "Create a post|Plan my content|Create a newsletter" && /More ideas/.test(welcome) && !D1_ONLY.test(c0.join("|")), `${welcome} | ${c0.join("|")}`);
  // 4–6: content help, New Post, a draft.
  let r = await ask(p, "Help me write a post");
  // A broad request shows ideas first; picking one prepares the full draft.
  const ideaCards = await p.$$('[data-testid="content-idea"]');
  await p.evaluate(() => document.querySelector('[data-testid="content-idea-pick"]')?.click());
  await sleep(1100);
  r = (await replies(p)).at(-1) ?? "";
  check("D2-4: content help (ideas, then a post draft card)", ideaCards.length >= 3 && !!(await p.$('[data-testid="content-card"][data-kind="post"]')) && /Draft/.test(r), r);
  await go(p, "/dashboard/newpost");
  check("D2-5: existing New Post composer", path(p) === "/dashboard/newpost" && !!(await p.$('[data-testid^="newpost-"]')));
  await openPanel(p);
  const before = (await replies(p)).length;
  await p.evaluate(() => [...document.querySelectorAll('[data-testid^="ai-context-"], [data-testid^="ai-suggestion-"]')].find((x) => x.innerText.trim() === "Help me write this post")?.click());
  await sleep(700);
  r = (await replies(p)).slice(before).join("\n");
  check("D2-6: draft prepared, marked Draft", /draft/i.test(r) && /\bpost\b/i.test(r) && !!(await p.$('[data-testid="content-card"]')), r);

  // 7–12: Content Autopilot.
  await ask(p, "Review my posts");
  check("D2-7: Content Autopilot review opens", (await p.$eval('[data-testid="ap-view"]', (x) => x.dataset.screen)) === "summary");
  await p.evaluate(() => document.querySelector('[data-testid="ap-row-motivation"]').click());
  await sleep(400);
  check("D2-8: draft detail", (await p.$eval('[data-testid="ap-view"]', (x) => x.dataset.screen)) === "detail");
  await click(p, "ap-not-right");
  await click(p, "ap-reason-not-me", 900);
  const ap = async () => (await store(p, "topfan-mock-v1:ai-content")).autopilot;
  const mot = async () => (await ap()).batch.drafts.find((x) => x.idea === "motivation");
  check("D2-9: one-tap rejection revises the draft once", (await mot()).revisions === 1, JSON.stringify(await mot()));
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
  await ask(p, "Review my posts");
  await p.evaluate(() => document.querySelector('[data-testid="ap-row-motivation"]').click());
  await sleep(300);
  await click(p, "ap-not-right");
  await click(p, "ap-reason-not-me", 900);
  check("D2-10: rejected again → parked on hold", (await mot()).status === "on-hold" && !!(await p.$('[data-testid="ap-skip"]')));
  await click(p, "ap-skip");
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
  await ask(p, "Review my posts");
  await click(p, "ap-review-ready");
  const basis = await p.$eval('[data-testid="ap-slot-basis"]', (x) => x.innerText).catch(() => "");
  check("D2-11: Smart Timing explained", /Suggested/.test(basis), basis);
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
  await ask(p, "Approve the good ones");
  await click(p, "ap-approve-batch", 500);
  check("D2-12: batch approved, nothing published", (await ap()).batch.drafts.some((x) => x.status === "approved") && !(await ap()).batch.drafts.some((x) => x.status === "published"));
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
  await ask(p, "Review my posts");
  await click(p, "ap-prefs");
  await click(p, "ap-next-batch", 600);
  check("D2-13: another simulated content cycle", (await ap()).batch.seq === 2, JSON.stringify((await ap()).batch.seq));
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());

  // 14: no DNS / onboarding.
  r = await ask(p, "Connect my domain through GoDaddy");
  check("D2-14: setup request → points to the setup demo", /That workflow is available in the Account Setup & Navigation demo\./.test(r) && /OPEN THE ACCOUNT SETUP/i.test(r), r);
  r = await ask(p, "I want to start earning money from my fans");
  check("D2-14: broad earning discovery → points to the setup demo", /That workflow is available in the Account Setup & Navigation demo\./.test(r), r);
  r = await ask(p, "Help me launch a course");
  check("D2-14: a specific content-related offer still gets help", !/That workflow is available/.test(r) && r.trim().length > 10, r);
  check("D2-14: no redirect happened", path(p) === "/dashboard/newpost", path(p));
  check("D2-14: no setup tasks in Demo 2", !JSON.stringify(await store(p, "topfan-tasks-v1:ai-content")).includes("first-time-setup"));
  await go(p, "/edit-preference/whitelabel/setup/dns");
  await sleep(1500);
  check("D2-14: setup page stays reachable but no DNS onboarding is started", !SETUP_TALK.test((await replies(p)).join("\n")) && !(await p.$('[data-testid="dns-setup"]')), (await replies(p)).join("\n").slice(0, 300));
  check("D2: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ================= Shared page guidance: 11 screens × 2 demos ================= */
const PAGES = [
  // Demo 2's Feed is the create welcome ("What would you like to create?").
  ["Feed", "/ajwhite", /You're in Feed\.|organize it for your fans/],
  ["New Post", "/dashboard/newpost", /You're in New Post\./],
  ["Subscriptions", "/monetize/subscription", /You're in Subscriptions\. (You can create and manage recurring membership plans for your fans|Membership plans give fans recurring access)\./],
  ["Newsletters", "/monetize/newsletters", /You're in Newsletters\./],
  ["Experiences", "/monetize/experience", /You're in Experiences\./],
  ["Courses", "/monetize/courses", /You're in Courses\./],
  ["Wallet", "/wallet/current-balance", /You're in Current Balance\./],
  ["Insights & Fans", "/insights", /You're in Insights & Fans\./],
  ["White Label Site", "/edit-preference/whitelabel", /You're in White Label Site\./],
  ["Link in Bio", "/edit-preference/link-in-bio", /You're in Link In Bio\./],
  ["Groups", "/edit-preference/groups", /You're in Groups\./],
];
for (const id of ["setup-navigation", "ai-content"]) {
  const tag = id === "setup-navigation" ? "D1" : "D2";
  const other = id === "setup-navigation" ? D2_ONLY : D1_ONLY;
  const p = await demo(id);
  for (const [name, url, re] of PAGES) {
    await go(p, url);
    await openPanel(p);
    await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
    const intro = await p.$eval('[data-testid="ai-page-intro"]', (x) => x.innerText).catch(() => "");
    const c = await chips(p);
    check(`${tag} ${name}: explains the page`, re.test(intro), intro);
    check(`${tag} ${name}: 1–3 actions, none from the other demo`, c.length >= 1 && c.length <= 3 && !other.test(c.join("|")), c.join(" | "));
  }
  // The first action on a few pages does something (answer, draft or page) without errors.
  for (const url of ["/monetize/subscription", "/edit-preference/groups", "/edit-preference/whitelabel"]) {
    await go(p, url);
    await openPanel(p);
    await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
    const n = (await replies(p)).length;
    const label = await p.evaluate(() => { const x = document.querySelector('[data-testid^="ai-suggestion-"]'); x?.click(); return x?.innerText; });
    await sleep(900);
    const said = (await replies(p)).slice(n).join("\n");
    check(`${tag} ${url}: "${label}" responds`, (said.trim().length > 10 || path(p) !== url) && !/That workflow is available/.test(said), said);
  }
  // Once the conversation has started, navigating (in-app: the page's own tab) updates the context
  // row without new messages. A full reload would start a new conversation, so it's not used here.
  await go(p, "/monetize/subscription");
  await openPanel(p);
  await ask(p, "What can I do on this page?");
  const n0 = (await replies(p)).length;
  await p.evaluate(() => [...document.querySelectorAll("main button, main a, button")].find((x) => x.innerText.trim() === "COURSES" && !x.closest('[data-testid="ai-panel"]'))?.click());
  await sleep(900);
  const page = await p.$eval('[data-testid="ai-context-page"]', (x) => x.innerText).catch(() => "");
  const cb = await chips(p, "ai-context-");
  check(`${tag}: context row follows navigation (Courses), max 3`, /courses/i.test(page) && cb.length >= 1 && cb.length <= 3 && !other.test(cb.join("|")), `${page} | ${cb.join("|")}`);
  check(`${tag}: navigating adds no messages`, (await replies(p)).length === n0, `${n0} → ${(await replies(p)).length}`);
  const more = await p.$('[data-testid="ai-context-more"]');
  if (more) {
    await more.click();
    await sleep(200);
    check(`${tag}: more suggestions only on request`, (await chips(p, "ai-context-")).length > cb.length);
  }
  check(`${tag} guidance: no page errors`, !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ================= Independence ================= */
{
  const ctx = await b.createBrowserContext();
  const p1 = await ctx.newPage();
  await p1.goto(`${BASE}/demo/setup-navigation?resetMock=1&noDelay=1`, { waitUntil: "networkidle0" });
  await sleep(1200);
  await go(p1, "/ajwhite");
  await openPanel(p1);
  await ask(p1, "Help me create a VIP group");
  await click(p1, "ai-task-pause");
  const p2 = await ctx.newPage();
  await p2.bringToFront();
  await p2.goto(`${BASE}/demo/ai-content?resetMock=1&noDelay=1`, { waitUntil: "networkidle0" });
  await sleep(1200);
  await openPanel(p2);
  await p2.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
  check("iso: Demo 1's paused task isn't in Demo 2", !(await p2.$('[data-testid="ai-task-paused"]')));
  check("iso: Demo 2 conversation starts empty", (await replies(p2)).length === 0 || !(await replies(p2)).join(" ").includes("VIP"));
  await ask(p2, "Approve the good ones");
  await click(p2, "ap-approve-batch");
  await p1.bringToFront();
  await p1.reload({ waitUntil: "networkidle0" });
  await sleep(1200);
  await openPanel(p1);
  check("iso: Demo 1 keeps its own paused task", (await p1.$$eval('[data-testid="ai-task-paused"]', (x) => x.map((e) => e.dataset.taskType))).includes("vip-group"));
  check("iso: Demo 2's approvals don't reach Demo 1", !(await store(p1, "topfan-mock-v1:setup-navigation"))?.autopilot?.batch);
  check("iso: no Autopilot notice in Demo 1", !(await p1.$('[data-testid="ap-notice"]')));
  await ctx.close();
}

console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await b.close();
process.exit(fails ? 1 : 0);
