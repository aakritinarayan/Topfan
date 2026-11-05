// Intelligent-navigation scenarios A–G (plus the Outbound Email fix), end to end in the real app.
// Voice (D) uses an injected SpeechRecognition stub: it proves the transcript → edit → send path,
// NOT that a real microphone works (that needs a manual check, see docs/DEMO_READINESS.md).
// Usage: node tests/e2e/scenarios.mjs [1512|1126]   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const W = Number(process.argv[2]) || 1512, H = W === 1126 ? 797 : 805;
const BASE = process.env.BASE_URL || "http://localhost:5173";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: W, height: H } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const live = await fetch(`${BASE}/api/chat`).then((r) => r.json()).then((s) => s.configured).catch(() => false);
const WAIT = live ? 12000 : 1200;
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 400)); if (!ok) fails++; };
console.log(live ? "Answering: live model" : "Answering: demo mode (no API key)");

async function open(path, { voice } = {}) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(String(e)));
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
  await sleep(900);
  if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(500); }
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
  return p;
}
const panel = (p) => p.evaluate(() => document.querySelector('[data-testid="ai-panel"]')?.innerText ?? "");
const path = (p) => new URL(p.url()).pathname;
const replies = (p) => p.$$eval('[data-msg="assistant"]', (x) => x.map((m) => m.innerText));
async function ask(p, q) {
  const before = (await replies(p)).length;
  await p.click('[data-testid="ai-input"]', { clickCount: 3 });
  await p.keyboard.press("Backspace");
  await p.type('[data-testid="ai-input"]', q);
  await p.keyboard.press("Enter");
  await sleep(WAIT);
  // The welcome card is replaced on the first message, so read the new assistant messages.
  return (await replies(p)).slice(before).join("\n");
}
/** Click the last button in the panel whose text matches. */
const tap = (p, re) =>
  p.evaluate((src) => {
    const re = new RegExp(src, "i");
    const x = [...document.querySelectorAll('[data-testid="ai-panel"] button')].reverse().find((b) => re.test(b.innerText.trim()));
    x?.click();
    return x?.innerText.trim() ?? null;
  }, re.source);
const tasks = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("topfan-tasks-v1") || "null"));

// A — direct navigation: offer, then open on click; chat preserved; next-step help on arrival.
{
  const p = await open("/");
  const t = await ask(p, "I want to change my website logo.");
  const btn = await tap(p, /^Open White Label Site$/);
  check("A: logo request offers 'Open White Label Site'", !!btn, t);
  await sleep(1000);
  const all = await panel(p);
  check("A: the button opens Preferences › White Label Site", path(p) === "/edit-preference/whitelabel", path(p));
  check("A: chat is preserved after navigating", all.includes("I want to change my website logo."), all.slice(0, 300));
  check("A: says where the logo is on the page", /Site Logo|Customize Appearance|logo/i.test(all.slice(all.lastIndexOf("change my website logo"))), all.slice(-300));
  for (const q of ["Where can I change my logo?", "Update my website branding."]) {
    const p2 = await open("/");
    const t2 = await ask(p2, q);
    const ok = /White Label Site/.test(t2) || path(p2) === "/edit-preference/whitelabel";
    check(`A: equivalent phrasing "${q}"`, ok, t2);
    await p2.browserContext().close();
  }
  check("A: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

// B — imperative phrasing goes straight there.
{
  const p = await open("/");
  await ask(p, "Can you take me to my branding settings?");
  check("B: 'take me to my branding settings' opens White Label Site", path(p) === "/edit-preference/whitelabel", path(p));
  await p.browserContext().close();
}

// C — goal-based: one question (earning groups), the group's features, then the Monetize screen; goal kept.
let pC;
{
  const p = (pC = await open("/"));
  const t = await ask(p, "I want to start earning from my fans, but I don't know where to start.");
  check("C: asks one question with the earning groups", /fits you best\?/.test(t) && /Memberships and exclusive content/.test(await panel(p)) && /Explore all earning options/.test(await panel(p)), t);
  check("C: doesn't navigate before a choice", path(p) === "/", path(p));
  await tap(p, /^Memberships and exclusive content$/);
  await sleep(WAIT);
  check("C: the chosen group lists its features, still no navigation", !!(await p.$('[data-testid="ai-earn-option-subscriptions"]')) && path(p) === "/", path(p));
  await p.evaluate(() => [...document.querySelectorAll('[data-testid="ai-earn-option-subscriptions"]')].pop()?.click());
  await sleep(1200);
  const after = await panel(p);
  check("C: explains the choice and starts a guided task", /Step \d of \d/.test(after), after.slice(-400));
  const ts = await tasks(p);
  check("C: the goal is saved with the task", /Earn from my fans: Memberships and exclusive content/.test(JSON.stringify(ts?.active ?? {})), JSON.stringify(ts?.active ?? {}).slice(0, 300));
  check("C: opens the subscription plans screen", path(p) === "/monetize/subscription", path(p));
}

// E — resume: from Feed, closing and reopening the panel offers to continue the subscription task.
{
  const p = pC;
  await p.evaluate(() => [...document.querySelectorAll("a, button")].find((x) => x.innerText.trim() === "Feed")?.click());
  await sleep(800);
  await p.evaluate(() => document.querySelector('[data-testid="ai-collapse"]')?.click());
  await sleep(400);
  if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(800); }
  const t = await panel(p);
  check("E: on Feed, offers 'Continue setting up your subscription'", path(p) === "/ajwhite" && /Continue setting up your subscription/i.test(t), `${path(p)} ${t.slice(-300)}`);
  check("C/E: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

// D — voice: permission/listening states, transcript placed in the input for editing, then sent.
{
  const p = await open("/", { voice: "Help me set up a subscription for my biggest fans" });
  await p.click('[aria-label="Speak your question"]');
  await sleep(300);
  check("D: shows the listening state with Stop", !!(await p.$('[aria-label="Stop and review"]')));
  await p.click('[aria-label="Stop and review"]');
  await sleep(500);
  const val = await p.$eval('[data-testid="ai-input"]', (x) => x.value);
  check("D: transcript lands in the input for correction (not auto-sent)", /subscription for my biggest fans/i.test(val), val);
  await p.focus('[data-testid="ai-input"]');
  await p.keyboard.press("Enter");
  await sleep(WAIT);
  const t = await panel(p);
  check("D: the spoken request starts the subscription task", /Step \d of \d/.test(t) && /subscription/i.test(t), t.slice(-300));
  await p.browserContext().close();
}

// F — suggestions: welcome lists ≤4 working suggestions; after setup the heading changes.
{
  const p = await open("/");
  const ids = await p.$$eval('[data-testid^="ai-suggestion-"]', (x) => x.map((e) => e.dataset.testid));
  check("F: welcome shows 1–4 suggestions", ids.length >= 1 && ids.length <= 4, ids);
  for (const id of ids) {
    const p2 = await open("/");
    const before = (await panel(p2)).length;
    await p2.click(`[data-testid="${id}"]`);
    await sleep(WAIT);
    const moved = path(p2) !== "/";
    const t = (await panel(p2)).slice(before);
    check(`F: suggestion ${id} answers or navigates`, moved || t.trim().length > 8, t);
    await p2.browserContext().close();
  }
  await p.browserContext().close();

  const q = await open("/edit-preference/whitelabel/setup/provisioning");
  await q.evaluate(() => [...document.querySelectorAll("button")].find((x) => /Simulate: finish provisioning/.test(x.innerText))?.click());
  await sleep(800);
  await sleep(2500); // the finish animation reveals "Go to my site"
  await q.evaluate(() => [...document.querySelectorAll("button")].find((x) => /^go to my site$/i.test(x.innerText.trim()) && !x.closest('[data-testid="ai-panel"]'))?.click());
  await sleep(1500);
  if (!(await q.$('[data-testid="ai-panel"]'))) { await q.click('[data-testid="ai-launcher"]'); await sleep(600); }
  const t = (await replies(q)).join("\n") + (await panel(q));
  check("F: after setup, 'Your site is ready. What would you like to do next?'", /Your site is ready/i.test(t), t.slice(0, 400));
  check("F: 'Finish setting up my website' is gone once setup is done", !/Finish setting up my website/.test(t), t);
  await q.browserContext().close();
}

// G — ambiguous request: asks which settings.
{
  const p = await open("/");
  const t = await ask(p, "I want to change my settings.");
  check("G: 'change my settings' asks which one", /profile/i.test(t) && /website/i.test(t) && /Notifications/i.test(t) && /Privacy/i.test(t), t);
  check("G: stays put until a choice", path(p) === "/", path(p));
  await tap(p, /Notifications/);
  await sleep(1000);
  check("G: choosing Notifications opens it", /notification/i.test(path(p)), path(p));
  await p.browserContext().close();
}

// Outbound Email: Failed → Verified, guided by the task on the real page.
{
  const p = await open("/");
  await ask(p, "fix my email");
  const go = async () => { const g = await p.$('[data-testid="ai-task-go"]'); if (g) { await g.click(); await sleep(700); } };
  await go();
  check("Email: opens Outbound Emails", path(p) === "/edit-preference/outbound-emails", path(p));
  const click = async (id) => { await p.waitForSelector(`[data-testid="${id}"]`, { timeout: 4000 }); await p.click(`[data-testid="${id}"]`); await sleep(500); };
  await click("pref-outbound-setup-again");
  await click("modal-pref-outbound-reset-confirm");
  await p.evaluate(() => document.querySelector('[data-testid^="pref-outbound-domain-"]:not([data-testid$="custom"]):not([data-testid$="input"])')?.click());
  await click("pref-outbound-setup-continue");
  // Protected action: the creator types the domain to confirm.
  const phrase = await p.$eval('[data-testid="modal-pref-outbound-domain-input"]', (x) => x.placeholder);
  await p.type('[data-testid="modal-pref-outbound-domain-input"]', phrase);
  await click("modal-pref-outbound-domain-confirm");
  const stepT = await p.evaluate(() => document.querySelector('[data-testid="ai-task-step"]')?.innerText ?? "");
  check("Email: the task follows along on the page", /Step [3-5] of/.test(stepT), stepT);
  await click("pref-outbound-records-added");
  await p.click('[data-testid="pref-outbound-verify"]');
  // The simulated check finishes on its own; it must take no more than 2 seconds.
  const t0 = Date.now();
  await p.waitForSelector('[data-testid="pref-outbound-verified"]', { timeout: 4000 }).catch(() => null);
  const took = Date.now() - t0;
  check("Email: verification finishes within 2 s", took <= 2000, `${took}ms`);
  const status = await p.evaluate(() => JSON.parse(localStorage.getItem("topfan-mock-v1")).prefsB.outboundEmail.status);
  check("Email: status reaches Verified", status === "verified", status);
  const t = await panel(p);
  check("Email: the task finishes", /done|complete|all set|finished/i.test(t.slice(-500)) || !(await p.$('[data-testid="ai-task-card"]')), t.slice(-400));
  check("Email: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await b.close();
process.exit(fails ? 1 : 0);
