// Content Autopilot › Plan my week, end to end: brief → plan → approve → drafts → review → saved.
// Usage: node tests/e2e/plan-week.mjs [1512|1126]   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const W = Number(process.argv[2]) || 1512, H = W === 1126 ? 797 : 805;
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: W, height: H } });
const p = await b.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 400)); if (!ok) fails++; };
const $ = (s) => p.$(`[data-testid="${s}"]`);
const click = async (s) => { const e = await $(s); if (!e) throw new Error("missing " + s); await e.click(); await sleep(350); };
const text = (s) => p.evaluate((s) => document.querySelector(`[data-testid="${s}"]`)?.innerText ?? "", s);
const screen = () => p.evaluate(() => { const v = document.querySelector('[data-testid="ap-view"]'); return v?.dataset.screen ?? null; });
const ap = () => p.evaluate(() => JSON.parse(localStorage.getItem("topfan-mock-v1")).autopilot);
const ask = async (q) => { await p.click('[data-testid="ai-input"]', { clickCount: 3 }); await p.keyboard.press("Backspace"); await p.type('[data-testid="ai-input"]', q); await p.keyboard.press("Enter"); await sleep(700); };

await p.goto(`${BASE}/?resetMock=1&noDelay=1`, { waitUntil: "networkidle0" });
await sleep(1200);
if (!(await $("ai-panel"))) await click("ai-launcher");
await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());

await ask("Plan my week");
check("'Plan my week' opens the planning intro", (await screen()) === "plan" && !!(await $("ap-plan-intro")), await screen());
check("intro says nothing is published without you", /Nothing is published without you/.test(await text("ap-plan-intro")));
check("intro warns about this week's waiting drafts", !!(await $("ap-plan-waiting")));
await click("ap-plan-start");
check("step 1 of 5: what's coming up", /Step 1 of 5/.test(await text("ap-plan")) && /What's coming up next week/.test(await text("ap-plan")));

// Typed into the card
await p.type('[data-testid="ap-plan-line"]', "Competing at the Copper Ridge rail jam on Saturday");
await click("ap-plan-add");
// Typed (or spoken) into the panel's message box
await ask("Filming a new edit with the crew on Wednesday");
const brief = (await ap()).plan.brief.happening;
check("both lines are in the brief, word for word", brief.length === 2 && brief[0].startsWith("Competing at the Copper Ridge") && brief[1].startsWith("Filming a new edit"), JSON.stringify(brief));
await ask("next");
check("'next' moves on (not added as a line)", /Step 2 of 5/.test(await text("ap-plan")) && (await ap()).plan.brief.happening.length === 2);

// Step 2: days
const before = (await ap()).plan.brief.days.length;
check("suggested days are pre-selected", before >= 1, before);
check("rhythm explains the suggestion", /suggested/i.test(await text("ap-plan-rhythm")));
const sun = await $("ap-plan-day-sun");
const sunOn = await p.evaluate((e) => e.getAttribute("aria-pressed") === "true", sun);
await sun.click(); await sleep(250);
check("toggling a day changes the post count", (await ap()).plan.brief.days.length === before + (sunOn ? -1 : 1));
await click("ap-plan-next");

// Step 3: topics (coming-up is auto-selected because there's something coming up)
check("step 3: 'What's coming up' topic is on", await p.evaluate(() => document.querySelector('[data-testid="ap-plan-topic-coming-up"]')?.getAttribute("aria-pressed") === "true"));
await click("ap-plan-next");

// Step 4: media
const assets = await p.$$('[data-testid^="ap-plan-asset-"]');
check("step 4: library files shown with thumbnails", assets.length >= 2 && (await p.$$eval('[data-testid^="ap-plan-asset-"] img', (x) => x.filter((i) => i.complete && i.naturalWidth > 0).length)) >= 2);
// Add a photo and a video from the device (local only). Each is picked and goes first in the plan.
const file = await p.$('[data-testid="ap-plan-media-file"]');
await file.uploadFile(new URL("../../public/assets/posts/contest-1.webp", import.meta.url).pathname); await sleep(1500);
await file.uploadFile(new URL("../../public/assets/videos/big-air.mp4", import.meta.url).pathname); await sleep(3000);
const addedAssets = (await ap()).assets.filter((a) => a.added);
check("added photo and video join the library, picked", addedAssets.length === 2 && addedAssets.every((a) => a.approved && a.poster?.startsWith("data:image/")) && (await ap()).plan.brief.assetIds.filter((id) => addedAssets.some((a) => a.id === id)).length === 2, JSON.stringify(addedAssets.map((a) => [a.label, a.kind])));
check("added files show thumbnails", (await p.$$eval('[data-testid^="ap-plan-asset-"] img', (x) => x.filter((i) => i.complete && i.naturalWidth > 0).length)) === assets.length + 2);
// Generate an image: an AI-generated visual joins the library, picked for the week.
await click("ap-plan-generate-media"); await sleep(600);
const gen = (await ap()).assets.filter((a) => a.src?.startsWith("generated/"));
check("generate an image: added and picked", gen.length === 1 && (await ap()).plan.brief.assetIds.includes(gen[0].id) && !!(await p.$(`[data-testid="ap-plan-asset-${gen[0].id}"] img`)), JSON.stringify(gen));
await click("ap-plan-next");

// Step 5: plan
const slots = await p.$$('[data-testid="ap-plan-slot"]');
const plan = (await ap()).plan;
check("plan shows one post per chosen day", slots.length === plan.slots.length && slots.length > 0 && slots.length <= plan.brief.days.length, `${slots.length} / ${plan.brief.days.length}`);
const dayOf = (idea) => { const s = plan.slots.find((x) => x.idea === idea); return s && new Date(s.at).getDay(); };
check("a line that names a day lands on that day (Sat, Wed)", dayOf("brief-0") === 6 && dayOf("brief-1") === 3, JSON.stringify(plan.slots.map((s) => [s.idea, new Date(s.at).getDay()])));
check("Saturday was added because it was mentioned", plan.brief.days.includes(6));
check("every slot names its source", (await text("ap-plan-slots")).split("From:").length - 1 === slots.length);
check("files the creator added are in the plan", ["New photos", "New clip"].every((t) => plan.slots.some((s) => s.title === t)), JSON.stringify(plan.slots.map((s) => s.title)));
const i0 = plan.slots.findIndex((x) => x.pillar !== "coming-up");
const t0 = plan.slots[i0]?.title;
await p.evaluate((i) => document.querySelectorAll('[data-testid="ap-plan-slot"]')[i]?.querySelector('[title="Try another idea"]')?.click(), i0);
await sleep(300);
check("Try another idea swaps a post", (await ap()).plan.slots[i0]?.title !== t0, t0);
const n0 = (await ap()).plan.slots.length;
// Remove a post that isn't from the brief.
await p.evaluate(() => [...document.querySelectorAll('[data-testid="ap-plan-slot"]')].filter((x) => !/Your weekly brief|New photos|New clip/.test(x.innerText)).pop().querySelector('[title="Remove"]').click());
await sleep(300);
check("Remove takes a post out", (await ap()).plan.slots.length === n0 - 1);
check("nothing drafted or published before approval", (await ap()).plan.status === "draft");
await click("ap-plan-approve");
check("approved: next steps listed", /Your week is planned/.test(await text("ap-plan")) && (await ap()).plan.status === "approved");
check("brief became an approved source", (await ap()).sources.some((s) => s.id === "src-brief" && s.facts.length === 2));

await click("ap-plan-prepare");
check("drafts are prepared and the summary opens", (await screen()) === "summary");
const sum = await text("ap-summary");
check("summary says the week's posts are drafted", /are drafted/.test(sum), sum);
const batch = (await ap()).batch;
check("one draft per planned post", batch.drafts.length === n0 - 1, `${batch.drafts.length} vs ${n0 - 1}`);
const briefDraft = batch.drafts.find((x) => x.idea === "brief-0");
check("brief draft uses only the creator's words and passes the checks", briefDraft?.status === "ready" && /Copper Ridge rail jam on Saturday/.test(briefDraft.text), JSON.stringify(briefDraft && { s: briefDraft.status, r: briefDraft.holdReason, t: briefDraft.text }));
check("nothing published", batch.drafts.every((x) => x.status !== "published"));
check("added clip draft has the file and its still", batch.drafts.some((x) => x.title === "New clip" && x.status === "ready" && x.media?.src?.startsWith("blob:") && x.media?.poster?.startsWith("data:image/")));

// Review → approve → save, via the existing flow
await ask("Approve the good ones");
await click("ap-approve-batch");
await click("ap-save");
check("approved drafts saved as TopFan drafts", /saved/.test(await text("ap-complete-heading")));
await click("ap-open-next");
check("Open next draft opens New Post", new URL(p.url()).pathname === "/dashboard/newpost");
check("no console or page errors", !errs.length, errs.join("\n"));
await p.screenshot({ path: "/tmp/plan-week-end.png" });
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await b.close();
process.exit(fails ? 1 : 0);
