// Plan My Week, end to end (brief "COMPLETE END-TO-END PLAN MY WEEK WORKFLOW", tests 1–9): intent → plan
// (no drafts) → edits → approve once → real drafts on the original screens → chat ↔ screen sync both ways →
// publish on the original screen → linked updates → resume after refresh → demo separation.
// Usage: node tests/e2e/plan-week.mjs   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1512, height: 860 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 500)); if (!ok) fails++; };
const KEY = "topfan-mock-v1:ai-content";

const ctx = await b.createBrowserContext();
const p = await ctx.newPage();
p.errors = [];
p.on("pageerror", (e) => p.errors.push(String(e)));
p.on("console", (m) => m.type() === "error" && !/favicon/.test(m.text()) && p.errors.push(m.text()));
await p.evaluateOnNewDocument(() => localStorage.setItem("tf-no-delay", "1"));
const openPanel = async () => { if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(700); } };
const path = () => new URL(p.url()).pathname;
const replies = () => p.$$eval('[data-msg="assistant"]', (x) => x.map((m) => m.innerText));
async function ask(q, wait = 900) {
  const before = (await replies()).length;
  await p.waitForSelector('[data-testid="ai-input"]', { visible: true, timeout: 5000 });
  await p.$eval('[data-testid="ai-input"]', (x) => (x.focus(), x.select?.()));
  await p.keyboard.press("Backspace");
  await p.type('[data-testid="ai-input"]', q);
  await p.keyboard.press("Enter");
  await sleep(wait);
  return (await replies()).slice(before).join("\n");
}
const tap = async (re, wait = 1000) => {
  const before = (await replies()).length;
  const hit = await p.evaluate((src) => {
    const x = [...document.querySelectorAll('[data-testid="ai-panel"] button')].reverse().find((b) => new RegExp(src, "i").test(b.innerText.trim()));
    x?.click();
    return x?.innerText.trim() ?? null;
  }, re.source);
  await sleep(wait);
  return { hit, r: (await replies()).slice(before).join("\n") };
};
const db = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), KEY);
const items = async () => (await db()).content.items;
const week = async () => (await items()).filter((x) => x.kind === "week" && x.plan).at(-1);
const kids = async () => { const w = await week(); return (await items()).filter((x) => x.parentId === w.id); };
const val = (id) => p.$eval(`[data-testid="${id}"]`, (x) => x.value).catch(() => null);
const rows = () => p.$$eval('[data-testid="ai-panel"] [data-testid="content-plan"]:last-of-type [data-testid="content-plan-row"]', (x) => x.map((r) => ({ kind: r.dataset.kind, day: +r.dataset.day, status: r.dataset.status, child: r.dataset.child, text: r.innerText })));
const lastPlanRows = () => p.evaluate(() => { const c = [...document.querySelectorAll('[data-testid="content-plan"]')].at(-1); return c ? [...c.querySelectorAll('[data-testid="content-plan-row"]')].map((r) => ({ kind: r.dataset.kind, day: +r.dataset.day, status: r.dataset.status, child: r.dataset.child, text: r.innerText })) : []; });
const live = async () => { const d = await db(); return { posts: d.social.posts.filter((x) => x.status === "published").length, sent: d.monetize.newsletters?.filter?.((x) => x.status === "Sent").length ?? 0 }; };

await p.goto(`${BASE}/demo/ai-content?resetMock=1&noDelay=1`, { waitUntil: "networkidle0" });
await sleep(1200);
await openPanel();
await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
const base = await live();

/* Entry screen */
await ask("Plan my week");
const intro = await p.$eval('[data-testid="ap-plan-intro"]', (x) => x.innerText).catch(() => "");
check("intro: 'Plan your week with AI', 4 steps, Plan my week / Back to chat", /Plan your week with AI/.test(intro) && /Plan your posts, newsletters, and experiences together/.test(intro) && /Tell AI your weekly goal/.test(intro) && /Review and publish/.test(intro) && /Plan my week/i.test(intro) && /Back to chat/i.test(intro) && !/Plan next week's posts|About 2 minutes/.test(intro), intro);
await p.click('[data-testid="ap-plan-cancel"]');
await sleep(400);
check("intro: Back to chat closes it", !(await p.$('[data-testid="ap-plan-intro"]')));

/* Test 1: complete weekly planning */
let r = await ask("Plan two posts, one newsletter, and one Experience next week", 1200);
let w = await week();
let rs = await lastPlanRows();
check("T1: plan proposed (2 posts, 1 newsletter, 1 experience)", w?.plan.stage === "proposed" && rs.filter((x) => x.kind === "post").length === 2 && rs.filter((x) => x.kind === "newsletter").length === 1 && rs.filter((x) => x.kind === "experience").length === 1, JSON.stringify(rs));
check("T1: no drafts exist before approval", (await kids()).length === 0 && rs.every((x) => x.status === "Planned" && !x.child), JSON.stringify(rs));
check("T1: rows show day, purpose, audience, suggested time", /Mon/i.test(rs[0].text) && /Public|Members/.test(rs.map((x) => x.text).join()) && /Suggested \d/.test(rs[0].text), rs[0]?.text);
check("T1: Approve plan & prepare drafts / Modify plan / Save for later", /approve plan & prepare drafts/i.test(r) && /modify plan/i.test(r) && /save for later/i.test(r), r);
check("T1: Wednesday is the members-only post", rs.some((x) => x.kind === "post" && x.day === 3 && /Members/.test(x.text)), JSON.stringify(rs));

// Modify (natural language): only the affected items change.
r = await ask("Make it three posts");
rs = await lastPlanRows();
check("T1 edit: 'Make it three posts' adds one post, rest unchanged", rs.filter((x) => x.kind === "post").length === 3 && rs.filter((x) => x.kind !== "post").length === 2, JSON.stringify(rs));
r = await ask("Make it two posts");
rs = await lastPlanRows();
check("T1 edit: back to two posts", rs.filter((x) => x.kind === "post").length === 2, JSON.stringify(rs));
const expBefore = rs.find((x) => x.kind === "experience").text;
r = await ask("Give me another Experience idea");
rs = await lastPlanRows();
check("T1 edit: another Experience idea (only the experience changed)", rs.find((x) => x.kind === "experience").text !== expBefore && /Only the experience changed/.test(r), r);
r = await ask("Move the Experience to Saturday");
r = await ask("Change Monday's post to members-only");
rs = await lastPlanRows();
check("T1 edit: Monday's post is members-only now", rs.some((x) => x.day === 1 && /Members/.test(x.text)), JSON.stringify(rs));
r = await ask("Make Monday's post public");
rs = await lastPlanRows();
check("T1 edit: Monday's post public again", rs.some((x) => x.day === 1 && /Public/.test(x.text)), JSON.stringify(rs));
r = await ask("Focus more on growing memberships");
check("T1 edit: memberships focus", /growing memberships/i.test(r), r);
check("T1: still no drafts after edits", (await kids()).length === 0);
await tap(/^modify plan$/);
const modTxt = (await replies()).at(-1);
check("T1: Modify plan offers the examples", /Make it two posts/i.test(modTxt) && /another Experience idea/i.test(modTxt), modTxt);

// Approve once → real drafts for every activity.
({ r } = await tap(/^approve plan & prepare drafts$/, 1400));
w = await week();
let k = await kids();
check("T1: approval prepares all four drafts", k.length === 4 && w.plan.stage === "prepared" && w.plan.activities.every((a) => a.childId), JSON.stringify(k.map((x) => [x.kind, x.status])));
check("T1: 'Your week is ready for review' + copy", /Your week is ready for review/.test(r) && /I've prepared your posts, newsletter, and experience/.test(r) && /A few details need your approval/.test(r), r);
rs = await lastPlanRows();
check("T1: statuses from real drafts (post ready, access review, newsletter prepared, experience needs details)", rs.some((x) => x.kind === "post" && /Ready/.test(x.status)) && rs.some((x) => /access review/.test(x.status)) && rs.some((x) => x.kind === "newsletter" && /Draft prepared/.test(x.status)) && rs.some((x) => x.kind === "experience" && /Needs price/.test(x.status)), JSON.stringify(rs.map((x) => x.status)));
const ctas = (await p.evaluate(() => [...[...document.querySelectorAll('[data-testid="content-plan"]')].at(-1).querySelectorAll('[data-testid="content-plan-cta"]')].map((x) => x.innerText.trim().toLowerCase()))).join("|");
check("T1: Review post / Review access / Review newsletter / Complete details", /review post/.test(ctas) && /review access/.test(ctas) && /review newsletter/.test(ctas) && /complete details/.test(ctas), ctas);
check("T1: every draft has a generated or library image attached", k.every((x) => x.media?.key), JSON.stringify(k.map((x) => x.media?.key)));
check("T1: locked post has the advisor's suggested unlock (needs approval)", k.some((x) => x.post?.locked && x.post.price === 5 && x.needs.some((n) => /Approve the suggested unlock/.test(n))), JSON.stringify(k.filter((x) => x.post).map((x) => x.post)));
check("T1: experience asks for price and availability (none invented)", k.some((x) => x.kind === "experience" && x.experience.price == null && x.needs.length >= 1), JSON.stringify(k.find((x) => x.kind === "experience")));
check("T1: nothing published or sent", JSON.stringify(await live()) === JSON.stringify(base), JSON.stringify(await live()));
const ids = k.map((x) => x.id).sort().join();
r = await ask("Prepare the remaining drafts");
check("T1: preparing again creates no duplicates", (await kids()).map((x) => x.id).sort().join() === ids, JSON.stringify((await kids()).length));

/* Test 2: chat → main screen */
r = await ask("Open Monday's post", 1600);
const mon = (await kids()).find((x) => x.kind === "post" && x.day === 1);
check("T2: opens the original New Post composer for Monday's draft", path() === "/dashboard/newpost" && p.url().includes(`work=${mon.id}`), p.url());
const text0 = await val("newpost-text");
check("T2: generated caption is in the form", !!text0 && text0 === mon.post.text, `${text0} | ${mon.post.text}`);
const files0 = await p.$eval('[data-testid="newpost-files"]', (x) => x.innerText).catch(() => "");
check("T2: image attached in the form", files0.trim().length > 0 && files0.includes(mon.media.label), files0);
const strip = await p.$$eval('[data-testid="week-strip-item"]', (x) => x.map((e) => e.dataset.status)).catch(() => []);
check("main screen: 'Your week' strip shows the same plan and statuses", strip.length === 4 && strip.includes("Ready for access review"), JSON.stringify(strip));
check("T2: correct post type (Images)", mon.post.type === "images" && !!(await p.$('[data-testid="newpost-files"]')));
await openPanel();
r = await ask("Make the caption shorter", 1300);
const monAfter = (await items()).find((x) => x.id === mon.id);
const text1 = await val("newpost-text");
check("T2: chat draft updated", monAfter.post.text.length < mon.post.text.length, monAfter.post.text);
check("T2: main form updated immediately", text1 === monAfter.post.text, `${text1} | ${monAfter.post.text}`);
const files1 = await p.$eval('[data-testid="newpost-files"]', (x) => x.innerText).catch(() => "");
check("T2: image unchanged", files1 === files0 && monAfter.media.key === mon.media.key, files1);

/* Test 3: main screen → chat */
await p.$eval('[data-testid="newpost-text"]', (x) => x.focus());
await p.keyboard.press("End");
await p.type('[data-testid="newpost-text"]', " Back on the hill Saturday.");
await sleep(1200);
let m3 = (await items()).find((x) => x.id === mon.id);
check("T3: manual edit reaches the shared draft", m3.editedByCreator && /Back on the hill Saturday\./.test(m3.post.text), m3.post.text);
r = await ask("Generate another image", 1400);
await sleep(400);
const pick = await p.$$('[data-testid="content-media-option"]');
if (pick.length) { await pick.at(-1).click(); await sleep(900); }
m3 = (await items()).find((x) => x.id === mon.id);
const files2 = await p.$eval('[data-testid="newpost-files"]', (x) => x.innerText).catch(() => "");
check("T3: new image reaches the form; caption with the manual edit kept", m3.media.key !== mon.media.key && /Back on the hill Saturday\./.test(await val("newpost-text")) && files2.includes(m3.media.label), `${mon.media.key} → ${m3.media.key} | files: ${files2} | text: ${await val("newpost-text")}`);

/* Test 4: newsletter */
r = await ask("Open Friday's newsletter", 1600);
const nl = (await kids()).find((x) => x.kind === "newsletter");
check("T4: opens the original Newsletter editor", path() === "/monetize/newsletters/add" && p.url().includes(`work=${nl.id}`), p.url());
check("T4: subject, body and cover populated", (await val("monetize-newsletter-title")) === nl.newsletter.title && (await p.evaluate(() => document.body.innerText)).includes("This Week on the Mountain") && !!(await p.$('[data-testid="monetize-newsletter-image"] img, img[src*="training-wide"]')), await val("monetize-newsletter-title"));
await p.$eval('[data-testid="monetize-newsletter-title"]', (x) => x.focus());
await p.keyboard.press("End");
await p.type('[data-testid="monetize-newsletter-title"]', " (Week 2)");
await sleep(1200);
await openPanel();
r = await ask("Make the newsletter shorter", 1300);
const nl2 = (await items()).find((x) => x.id === nl.id);
check("T4: AI read the manual title; edit kept after an AI change", /\(Week 2\)/.test(nl2.newsletter.title) && (await val("monetize-newsletter-title")).includes("(Week 2)") && nl2.newsletter.body.length < nl.newsletter.body.length, `${nl2.newsletter.title}`);

/* Test 5: experience */
r = await ask("Open Saturday's Experience", 1600);
const ex = (await kids()).find((x) => x.kind === "experience");
check("T5: opens the original Experience form", path() === "/monetize/experience/create-experience" && p.url().includes(`work=${ex.id}`), p.url());
check("T5: title, description, type and image appear", (await val("monetize-product-title")) === ex.experience.title && (await val("monetize-product-description")) === ex.experience.description, await val("monetize-product-title"));
check("T5: missing information identified", /price|availab/i.test(r), r);
await openPanel();
r = await ask("Change my Experience to a one-to-one call", 1300);
const ex2 = (await items()).find((x) => x.id === ex.id);
const typeTxt = await p.$eval('[data-testid="monetize-product-type"]', (x) => x.innerText).catch(() => "");
check("T5: type changes in chat and on the form", ex2.experience.experienceType === "1:1 Video Call" && /One to One Call/i.test(typeTxt), `${ex2.experience.experienceType} | ${typeTxt}`);

/* Test 6: publish on the original screen */
r = await ask("Open Monday's post", 1600);
await p.click('[data-testid="newpost-publish"]');
await sleep(500);
await p.click('[data-testid="modal-newpost-confirm-confirm"]');
await sleep(1200);
await openPanel();
k = await kids();
check("T6: Monday's task is published; others unchanged", k.find((x) => x.id === mon.id).status === "published" && k.filter((x) => x.id !== mon.id).every((x) => x.status !== "published"), JSON.stringify(k.map((x) => [x.day, x.status])));
r = await ask("What's left for me to review?", 1100);
check("T6: AI knows the result (published not listed as left)", /need/.test(r) && !/Monday's post \(/.test(r), r);
r = await ask("Open Friday's newsletter", 1600);
const strip6 = await p.$$eval('[data-testid="week-strip-item"]', (x) => x.map((e) => e.dataset.status)).catch(() => []);
check("T6: main-screen strip shows Published", strip6.includes("Published"), JSON.stringify(strip6));
await openPanel();
r = await ask("Show my weekly plan", 1100);
rs = await lastPlanRows();
check("T6: plan shows Published for Monday", rs.some((x) => x.day === 1 && x.kind === "post" && x.status === "Published"), JSON.stringify(rs.map((x) => [x.day, x.status])));

/* Test 7: linked updates */
r = await ask("Move my Experience to Sunday", 1100);
k = await kids();
const flagged = k.filter((x) => x.flags.some((f) => /moved to Sunday/.test(f)));
check("T7: dependents flagged (unpublished only)", flagged.length >= 1 && flagged.every((x) => x.status !== "published"), JSON.stringify(k.map((x) => [x.kind, x.status, x.flags])));
check("T7: published post not silently modified", (await items()).find((x) => x.id === mon.id).flags.length === 0);

/* Test 8: resume after refresh */
const before8 = (await kids()).map((x) => x.id).sort().join();
await p.goto(`${BASE}/insights`, { waitUntil: "networkidle0" });
await sleep(800);
await p.reload({ waitUntil: "networkidle0" });
await sleep(1200);
await openPanel();
r = await ask("Show my weekly plan", 1100);
check("T8: same plan resumes, same drafts, no duplicates", /Your week is ready for review/.test(r) && (await kids()).map((x) => x.id).sort().join() === before8, r);
r = await ask("Continue where I left off", 1100);
check("T8: 'Continue where I left off' shows the week", (await lastPlanRows()).length >= 4, r);

/* Partial failure + retry (only that task) */
r = await ask("I'm busy next week. Help me keep my fans engaged.", 1200);
const w2 = await week();
check("edge: broad goal → new balanced plan", w2.id !== w.id && w2.plan.activities.length >= 4, JSON.stringify(w2.plan.activities.map((a) => a.kind)));
await p.evaluate(() => localStorage.setItem("tf-test-fail-prep", "newsletter"));
({ r } = await tap(/^approve plan & prepare drafts$/, 1400));
let k2 = (await items()).filter((x) => x.parentId === w2.id);
check("edge: one failure keeps the other drafts", /couldn't prepare Friday's newsletter/i.test(r) && k2.length === w2.plan.activities.length - 1, r);
({ r } = await tap(/^retry friday's newsletter$/, 1200));
k2 = (await items()).filter((x) => x.parentId === w2.id);
check("edge: retry prepares only that one", k2.length === w2.plan.activities.length && k2.filter((x) => x.kind === "newsletter").length === 1, JSON.stringify(k2.map((x) => x.kind)));
check("nothing published or sent by the assistant (only the creator's publish)", (await live()).posts === base.posts + 1 && (await live()).sent === base.sent, JSON.stringify(await live()));

/* Test 9: demo separation */
const d1 = await ctx.newPage();
await d1.goto(`${BASE}/demo/setup-navigation?noDelay=1`, { waitUntil: "networkidle0" });
await sleep(1000);
const d1db = await d1.evaluate(() => JSON.parse(localStorage.getItem("topfan-mock-v1:setup-navigation") || "null"));
check("T9: Demo 1 has no Demo 2 weekly plans", !(d1db?.content?.items ?? []).some((x) => x.kind === "week"));
check("no page errors", !p.errors.length, p.errors.join("\n"));
await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
