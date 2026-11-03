// The two demo links: each opens its own starting screen, keeps its own state (isolated from the other
// and from the default app), survives refresh and internal navigation, and resets only itself.
// Usage: node tests/e2e/demo-links.mjs   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1512, height: 805 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 400)); if (!ok) fails++; };

// One browser profile for everything: all tabs share localStorage, like a presenter's Chrome.
const ctx = await b.createBrowserContext();
const errors = [];
async function tab(url) {
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(String(e)));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await p.bringToFront();
  await p.goto(`${BASE}${url}`, { waitUntil: "networkidle0" });
  await sleep(1300);
  return p;
}
const path = (p) => new URL(p.url()).pathname;
const store = (p, key) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), key);
const openPanel = async (p) => {
  await p.bringToFront(); // background tabs are throttled
  if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(700); }
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
};
async function ask(p, q) {
  await p.bringToFront();
  await p.waitForSelector('[data-testid="ai-input"]', { visible: true, timeout: 5000 });
  await p.click('[data-testid="ai-input"]', { clickCount: 3 });
  await p.keyboard.press("Backspace");
  await p.type('[data-testid="ai-input"]', q);
  await p.keyboard.press("Enter");
  await sleep(1000);
}
const mascotOk = async (p) => {
  // The mascot: the panel header avatar while open, the floating launcher when collapsed.
  const inPanel = await p.$$eval('[data-testid="ai-panel"] img, [data-testid="ai-panel"] svg', (x) => x.some((e) => e.getBoundingClientRect().width > 20));
  await p.click('[data-testid="ai-collapse"]');
  await sleep(600);
  const launcher = await p.$('[data-testid="ai-launcher"]');
  const vis = launcher && (await launcher.evaluate((e) => { const r = e.getBoundingClientRect(); return r.width > 30 && r.height > 30; }));
  await launcher?.click();
  await sleep(700);
  return inPanel && vis && !!(await p.$('[data-testid="ai-panel"]'));
};

// Demo 1
const d1 = await tab("/demo/setup-navigation?noDelay=1");
check("1: Demo 1 opens account setup (Domain step)", path(d1) === "/edit-preference/whitelabel/setup/domain", path(d1));
check("1: onboarding assistant is shown", /get started/i.test(await d1.evaluate(() => document.body.innerText)));
check("3: original TopFan UI (setup header + page)", !!(await d1.$('[data-field="domain"]')) || /Domain Name/i.test(await d1.evaluate(() => document.body.innerText)));
check("1: this tab is in Demo 1", (await d1.evaluate(() => sessionStorage.getItem("tf-demo"))) === "setup-navigation");
// Leave a paused navigation task in Demo 1.
await d1.goto(`${BASE}/ajwhite?noDelay=1`, { waitUntil: "networkidle0" });
await sleep(1000);
await openPanel(d1);
await ask(d1, "fix my email");
await d1.click('[data-testid="ai-task-pause"]');
await sleep(400);
const t1 = await store(d1, "topfan-tasks-v1:setup-navigation");
check("4: assistant works in Demo 1 (task started and paused)", t1?.paused?.some((t) => t.taskId === "fix-outbound-email"), JSON.stringify(t1));
check("5: mascot shows in Demo 1", await mascotOk(d1));

// Demo 2, in a second tab of the same browser
const d2 = await tab("/demo/ai-content?noDelay=1");
await openPanel(d2);
check("2: Demo 2 opens on the creator Feed with Content Autopilot", path(d2) === "/ajwhite" && /weekly content is prepared/i.test(await d2.evaluate(() => document.body.innerText)), path(d2));
check("2: this tab is in Demo 2", (await d2.evaluate(() => sessionStorage.getItem("tf-demo"))) === "ai-content");
check("6: Demo 1's paused task doesn't appear in Demo 2", !(await d2.$('[data-testid="ai-task-paused"]')));
await ask(d2, "Approve the good ones");
await d2.click('[data-testid="ap-approve-batch"]');
await sleep(500);
const ap2 = (await store(d2, "topfan-mock-v1:ai-content"))?.autopilot;
check("4: assistant works in Demo 2 (drafts approved)", ap2?.batch?.drafts.some((x) => x.status === "approved"));
const ap1 = (await store(d2, "topfan-mock-v1:setup-navigation"))?.autopilot;
check("6: Demo 2's approvals don't touch Demo 1", !ap1 || !ap1.batch?.drafts.some((x) => x.status === "approved"));
check("5: mascot shows in Demo 2", await mascotOk(d2));

// Internal navigation + refresh in Demo 2
await d2.bringToFront();
await d2.evaluate(() => [...document.querySelectorAll("a, button")].find((x) => x.innerText.trim() === "Monetize")?.click());
await sleep(900);
check("7: internal navigation (sidebar Monetize)", path(d2).startsWith("/monetize"), path(d2));
await d2.reload({ waitUntil: "networkidle0" });
await sleep(1200);
check("8: refresh keeps the page and Demo 2", path(d2).startsWith("/monetize") && (await d2.evaluate(() => sessionStorage.getItem("tf-demo"))) === "ai-content", path(d2));
await d2.goto(`${BASE}/?noDelay=1`, { waitUntil: "networkidle0" });
await sleep(1000);
const ap2b = (await store(d2, "topfan-mock-v1:ai-content"))?.autopilot;
check("8: Demo 2 state survives refresh", ap2b?.batch?.drafts.some((x) => x.status === "approved"));

// Refresh Demo 1: its task is still there; still no Autopilot approvals from Demo 2.
await d1.bringToFront();
await d1.reload({ waitUntil: "networkidle0" });
await sleep(1200);
await openPanel(d1);
check("8: refresh keeps Demo 1's paused task", (await d1.$$eval('[data-testid="ai-task-paused"]', (x) => x.map((e) => e.dataset.taskType))).includes("fix-outbound-email"));

// Reopening a demo link resumes that demo's state.
const d1b = await tab("/demo/setup-navigation?noDelay=1");
check("8: reopening the Demo 1 link resumes its state", (await store(d1b, "topfan-tasks-v1:setup-navigation"))?.paused?.length === 1 && path(d1b) === "/edit-preference/whitelabel/setup/domain");
await d1b.close();

// 9: the original entry URL is unchanged and unaffected by either demo.
const d0 = await tab("/?noDelay=1");
check("9: original URL still opens the app", path(d0) === "/" && !(await d0.evaluate(() => sessionStorage.getItem("tf-demo"))));
await openPanel(d0);
check("9: original app has no demo tasks", !(await d0.$('[data-testid="ai-task-paused"]')));
const ap0 = (await store(d0, "topfan-mock-v1"))?.autopilot;
check("9: original app has no demo approvals", !ap0 || !ap0.batch?.drafts.some((x) => x.status === "approved"));

// Reset in Demo 2 (review bar): back to Demo 2's start with clean Demo 2 data; Demo 1 untouched.
await d2.bringToFront();
await d2.keyboard.press("r");
await sleep(300);
await d2.click('[data-testid="review-reset"]');
await sleep(2500);
check("reset: Demo 2 restarts on its own start screen", path(d2) === "/ajwhite" && (await d2.evaluate(() => sessionStorage.getItem("tf-demo"))) === "ai-content", path(d2));
const ap2c = (await store(d2, "topfan-mock-v1:ai-content"))?.autopilot;
check("reset: Demo 2 data is clean", !ap2c?.batch?.drafts.some((x) => x.status === "approved"));
check("reset: Demo 1 untouched", (await store(d2, "topfan-tasks-v1:setup-navigation"))?.paused?.length === 1);

// ?demo=off leaves demo mode in a tab.
await d1.bringToFront();
await d1.goto(`${BASE}/?demo=off&noDelay=1`, { waitUntil: "networkidle0" });
check("?demo=off returns the tab to the default app", !(await d1.evaluate(() => sessionStorage.getItem("tf-demo"))));

check("no console or page errors", !errors.length, errors.join("\n"));
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await b.close();
process.exit(fails ? 1 : 0);
