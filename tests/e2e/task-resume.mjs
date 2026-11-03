// Paused tasks: each Resume opens its own workflow with its own progress and input; cancel, complete,
// refresh and invalid stored tasks behave safely. Usage: node tests/e2e/task-resume.mjs (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1512, height: 805 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 400)); if (!ok) fails++; };

const p = await b.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
const path = () => new URL(p.url()).pathname;
const tasks = () => p.evaluate(() => JSON.parse(localStorage.getItem("topfan-tasks-v1") || "null"));
const replies = () => p.$$eval('[data-msg="assistant"]', (x) => x.map((m) => m.innerText));
const openPanel = async () => {
  if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(600); }
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
};
async function ask(q) {
  await p.click('[data-testid="ai-input"]', { clickCount: 3 });
  await p.keyboard.press("Backspace");
  await p.type('[data-testid="ai-input"]', q);
  await p.keyboard.press("Enter");
  await sleep(900);
}
const tap = (re) =>
  p.evaluate((src) => {
    const x = [...document.querySelectorAll('[data-testid="ai-panel"] button')].reverse().find((b) => new RegExp(src, "i").test(b.innerText.trim()));
    x?.click();
    return x?.innerText.trim() ?? null;
  }, re.source);
const click = async (id) => { await p.waitForSelector(`[data-testid="${id}"]`, { timeout: 4000 }); await p.click(`[data-testid="${id}"]`); await sleep(500); };
const stepText = () => p.evaluate(() => document.querySelector('[data-testid="ai-task-step"]')?.innerText ?? "");
const activeName = () => p.evaluate(() => document.querySelector('[data-testid="ai-task-card"] span')?.innerText ?? "");
const pausedTypes = () => p.$$eval('[data-testid="ai-task-paused"]', (x) => x.map((e) => e.dataset.taskType));
const resume = async (type) => { await p.evaluate((t) => document.querySelector(`[data-testid="ai-task-paused"][data-task-type="${t}"] [data-testid="ai-task-resume"]`)?.click(), type); await sleep(1100); };
const pause = async () => { await click("ai-task-pause"); };

await p.goto(`${BASE}/?resetMock=1&noDelay=1`, { waitUntil: "networkidle0" });
await sleep(1200);
await openPanel();

// 9. A new account has no paused tasks.
check("9: new account shows no paused tasks", !(await p.$('[data-testid="ai-paused-list"]')) && !(await tasks())?.paused?.length);

// Start three real tasks, each left at a different point.
// White Label: open the page (step 1 done), pause at step 2.
await click("ai-suggestion-customize");
await sleep(1000);
check("setup: branding task on White Label Site", path() === "/edit-preference/whitelabel" && /Step 2 of 3/.test(await stepText()), `${path()} ${await stepText()}`);
await pause();

// Outbound Email: restart the check on the page, pause at the domain step.
await ask("fix my email");
await click("ai-task-go");
await click("pref-outbound-setup-again");
await click("modal-pref-outbound-reset-confirm");
const emailStep = await stepText();
check("setup: email task moved on by a real action", /Step 3 of/.test(emailStep), emailStep);
await pause();

// VIP group: open Add New Group, type a name, don't submit; pause.
await ask("Create a VIP group");
if (!(await p.$('[data-testid="ai-task-card"]'))) await tap(/Open Groups/);
await sleep(800);
await click("ai-task-go");
if (path() !== "/edit-preference/groups/add") await click("ai-task-go");
check("setup: VIP group on Add New Group", path() === "/edit-preference/groups/add", path());
await p.type('[data-testid="pref-groups-title"]', "Inner Circle VIP");
await p.type('[data-testid="pref-groups-desc"]', "First access for my closest fans");
await pause();

const ts0 = await tasks();
check("three paused tasks, each with its own id", ts0.paused.length === 3 && new Set(ts0.paused.map((t) => t.id)).size === 3, JSON.stringify(ts0.paused.map((t) => [t.id, t.taskId])));
check("paused list is one compact section", (await p.$$('[data-testid="ai-paused-list"]')).length === 1 && (await pausedTypes()).length === 3);

// 1. Resume Outbound Email (not the most recently paused one).
await resume("fix-outbound-email");
check("1: Outbound Email resumes on Outbound Emails", path() === "/edit-preference/outbound-emails", path());
check("1: at its own step (3)", /Step 3 of/.test(await stepText()) && /Outbound/i.test(await activeName()), `${await activeName()} ${await stepText()}`);
check("1: White Label Site not opened", path() !== "/edit-preference/whitelabel");
await pause();

// 2. Resume VIP group: Groups form, typed input restored.
await resume("vip-group");
check("2: VIP group resumes on Add New Group", path() === "/edit-preference/groups/add", path());
check("2: at its own step (2)", /Step 2 of/.test(await stepText()) && /group/i.test(await activeName()), `${await activeName()} ${await stepText()}`);
const form = await p.evaluate(() => [document.querySelector('[data-testid="pref-groups-title"]')?.value, document.querySelector('[data-testid="pref-groups-desc"]')?.value]);
check("2: typed group name and description restored", form[0] === "Inner Circle VIP" && form[1] === "First access for my closest fans", JSON.stringify(form));
await pause();

// 3. Resume White Label Site: branding screen at step 2.
await resume("white-label");
check("3: White Label resumes on White Label Site", path() === "/edit-preference/whitelabel", path());
check("3: at its own step (2 of 3)", /Step 2 of 3/.test(await stepText()) && /White Label/i.test(await activeName()), `${await activeName()} ${await stepText()}`);

// 4/5. Consecutive resumes don't mix: resuming email while branding is active pauses branding at its step.
await resume("fix-outbound-email");
check("4: email resumes with its own step after branding", path() === "/edit-preference/outbound-emails" && /Step 3 of/.test(await stepText()), `${path()} ${await stepText()}`);
const ts1 = await tasks();
const wl = ts1.paused.find((t) => t.taskId === "white-label");
const vip = ts1.paused.find((t) => t.taskId === "vip-group");
check("5: branding was paused, not reset", !!wl && wl.visited.includes("pref-whitelabel"), JSON.stringify(wl));
check("5: VIP input untouched by other tasks", vip?.input?.title === "Inner Circle VIP", JSON.stringify(vip?.input));
// Progress in email doesn't move the others.
await p.evaluate(() => document.querySelector('[data-testid^="pref-outbound-domain-"]:not([data-testid$="custom"]):not([data-testid$="input"])')?.click());
await click("pref-outbound-setup-continue");
const phrase = await p.$eval('[data-testid="modal-pref-outbound-domain-input"]', (x) => x.placeholder);
await p.type('[data-testid="modal-pref-outbound-domain-input"]', phrase);
await click("modal-pref-outbound-domain-confirm");
check("5: email advanced to step 4 by the real action", /Step 4 of/.test(await stepText()), await stepText());
await pause();

// 6. Refresh: all three restore with their own state.
await p.goto(`${BASE}/?noDelay=1`, { waitUntil: "networkidle0" });
await sleep(1200);
await openPanel();
const types = await pausedTypes();
check("6: after refresh, all three paused tasks are listed", ["white-label", "fix-outbound-email", "vip-group"].every((t) => types.includes(t)), JSON.stringify(types));
await resume("fix-outbound-email");
check("6: email restores at step 4 after refresh", path() === "/edit-preference/outbound-emails" && /Step 4 of/.test(await stepText()), `${path()} ${await stepText()}`);
await pause();
await resume("vip-group");
check("6: VIP input restores after refresh", (await p.$eval('[data-testid="pref-groups-title"]', (x) => x.value)) === "Inner Circle VIP");

// 7. Complete: finish the VIP group's required steps on the page; it leaves the paused list.
await click("pref-groups-submit");
await sleep(600);
check("7: creating the group moves the task on (not by opening a page)", /Step 3 of/.test(await stepText()), await stepText());
// Finish the branding task by hand while it's paused: change a color and publish on the page.
await pause();
await p.goto(`${BASE}/edit-preference/whitelabel?noDelay=1`, { waitUntil: "networkidle0" });
await sleep(1000);
await openPanel();
const before = (await tasks()).paused.length;
const swatch = await p.$('[data-testid^="wls-preset-"]');
if (swatch) await swatch.click();
await sleep(300);
await p.evaluate(() => [...document.querySelectorAll("button")].find((x) => /update & publish/i.test(x.innerText))?.click());
await sleep(500);
await p.evaluate(() => [...document.querySelectorAll('[role="dialog"] button, [data-testid^="modal-"] button')].find((x) => /publish|confirm|yes/i.test(x.innerText))?.click());
await sleep(800);
const ts2 = await tasks();
check("7: branding completed on the page leaves the paused list", !ts2.paused.some((t) => t.taskId === "white-label") && ts2.finished.some((f) => f.taskId === "white-label" && f.status === "done") && ts2.paused.length === before - 1, JSON.stringify({ paused: ts2.paused.map((t) => t.taskId), finished: ts2.finished }));

// 8. Cancel. The VIP task has nothing unsaved now (the group was created), so it cancels directly.
await resume("vip-group");
await pause();
await p.evaluate(() => document.querySelector('[data-testid="ai-task-paused"][data-task-type="vip-group"] [data-testid="ai-task-paused-cancel"]')?.click());
await sleep(400);
let ts3 = await tasks();
check("8: cancelled task is no longer paused or offered", !ts3.paused.some((t) => t.taskId === "vip-group") && !(await pausedTypes()).includes("vip-group") && ts3.finished.some((f) => f.taskId === "vip-group" && f.status === "cancelled"), JSON.stringify(ts3.paused.map((t) => t.taskId)));
// A new VIP task with typed input: cancelling asks first; "Keep it" keeps it.
await ask("Create a VIP group");
if (!(await p.$('[data-testid="ai-task-card"]'))) await tap(/Open Groups/);
await sleep(800);
if (path() !== "/edit-preference/groups/add") await click("ai-task-go");
if (path() !== "/edit-preference/groups/add") await click("ai-task-go");
check("8: a cancelled task starts fresh (no old input)", (await p.$eval('[data-testid="pref-groups-title"]', (x) => x.value)) === "");
await p.type('[data-testid="pref-groups-title"]', "Front Row");
await pause();
const cancelVip = () => p.evaluate(() => document.querySelector('[data-testid="ai-task-paused"][data-task-type="vip-group"] [data-testid="ai-task-paused-cancel"]')?.click());
await cancelVip();
await sleep(300);
check("8: cancel with typed input asks first", !!(await p.$('[data-testid="ai-task-cancel-confirm"]')) && (await tasks()).paused.some((t) => t.taskId === "vip-group"));
await click("ai-task-cancel-no");
check("8: 'Keep it' keeps the task", (await pausedTypes()).includes("vip-group"));
await cancelVip();
await sleep(300);
await click("ai-task-cancel-yes");
ts3 = await tasks();
check("8: confirmed cancel removes it", !ts3.paused.some((t) => t.taskId === "vip-group") && !(await pausedTypes()).includes("vip-group"));

// 10. Invalid stored tasks: unknown workflow or broken entries are dropped on load; valid ones keep working;
// an old entry without an instance id gets one. Nothing else opens.
await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("topfan-tasks-v1"));
  s.paused.push({ id: "task-bogus", taskId: "no-such-task", startedAt: Date.now(), updatedAt: Date.now(), status: "paused", visited: [], base: {}, seenStep: 0 });
  s.paused.push({ id: "task-broken", taskId: "topic-tags", status: "paused" });
  const email = s.paused.find((t) => t.taskId === "fix-outbound-email");
  delete email.id;
  localStorage.setItem("topfan-tasks-v1", JSON.stringify(s));
});
await p.goto(`${BASE}/ajwhite?noDelay=1`, { waitUntil: "networkidle0" });
await sleep(1200);
await openPanel();
const t10 = await pausedTypes();
check("10: invalid stored tasks aren't listed", t10.length === 1 && t10[0] === "fix-outbound-email", JSON.stringify(t10));
check("10: loading them opened nothing", path() === "/ajwhite", path());
check("10: an old entry without an id gets one", !!(await p.$eval('[data-testid="ai-task-paused"]', (x) => x.dataset.taskId)));
await resume("fix-outbound-email");
check("10: the valid task still resumes its own workflow", path() === "/edit-preference/outbound-emails" && /Step 4 of/.test(await stepText()), `${path()} ${await stepText()}`);
// Corrupted storage: falls back to no tasks, no crash.
await p.evaluate(() => localStorage.setItem("topfan-tasks-v1", "{not json"));
await p.goto(`${BASE}/ajwhite?noDelay=1`, { waitUntil: "networkidle0" });
await sleep(1200);
await openPanel();
check("10: corrupted storage shows no tasks and no errors", !(await p.$('[data-testid="ai-paused-list"]')) && !(await p.$('[data-testid="ai-task-card"]')) && !!(await p.$('[data-testid="ai-panel"]')));

check("no page errors", !errs.length, errs.join("\n"));
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await b.close();
process.exit(fails ? 1 : 0);
