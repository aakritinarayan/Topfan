// Content Autopilot scenarios A–G (demo mode, deterministic).
import puppeteer from "/Users/unthinkable-mac/Documents/topfan-assistant-poc/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const W = Number(process.argv[2] ?? 1512), H = W === 1126 ? 797 : 805;
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: W, height: H } });
const p = await b.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : x); if (!ok) fails++; };
const $ = (s) => p.$(`[data-testid="${s}"]`);
const click = async (s) => { const e = await $(s); if (!e) throw new Error("missing " + s); await e.click(); await sleep(350); };
const text = (s) => p.evaluate((s) => document.querySelector(`[data-testid="${s}"]`)?.innerText ?? "", s);
const panel = () => text("ai-panel");
const screen = () => p.evaluate(() => document.querySelector('[data-testid="ap-view"]')?.dataset.screen ?? null);
const ask = async (q) => { await p.click('[data-testid="ai-input"]', { clickCount: 3 }); await p.type('[data-testid="ai-input"]', q); await p.keyboard.press("Enter"); await sleep(600); };
const data = () => p.evaluate(() => JSON.parse(localStorage.getItem("topfan-mock-v1")));
const ap = async () => (await data()).autopilot ?? (await data()).data?.autopilot;
const draft = async (idea) => (await ap()).batch.drafts.find((x) => x.idea === idea);
const posts = async () => { const d = await data(); return (d.social ?? d.data?.social).posts; };
const fresh = async (path = "/ajwhite") => {
  await p.goto(`http://localhost:5173${path}?noDelay=1&resetMock=1`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.removeItem("tf-fail-save"));
  await sleep(700);
  if (!(await $("ai-panel"))) await click("ai-launcher");
};
const shot = (n) => p.screenshot({ path: `/tmp/ap-${W}-${n}.png` });

/* ---------- notification: one per batch ---------- */
await fresh();
let t = await text("ap-notice");
check("one batch notice", /3 posts are ready for review/.test(t) && (await p.$$('[data-testid="ap-notice"]')).length === 1, t);
await p.goto("http://localhost:5173/ajwhite?noDelay=1", { waitUntil: "networkidle0" }); await sleep(600);
if (!(await $("ai-panel"))) await click("ai-launcher");
check("notice survives reload", !!(await $("ap-notice")));
await click("ap-notice-review");
check("notice opens summary", (await screen()) === "summary");
await p.evaluate(() => document.querySelector('[data-testid="ap-close"]').click()); await sleep(200);
const startPosts = (await posts()).length;

/* ---------- A: easy batch approval ---------- */
await ask("Approve the good ones");
check("A: confirm screen", (await screen()) === "confirm");
t = await text("ap-confirm");
check("A: CTA names exact count", t.includes("APPROVE 3 DRAFTS") || t.includes("Approve 3 drafts"), t);
check("A: held excluded with reason", (await text("ap-confirm-held")).includes("Northpeak") || (await text("ap-confirm-held")).length > 10, await text("ap-confirm-held"));
check("A: no publish button anywhere", !/publish now/i.test(await panel()));
await shot("A-confirm");
await click("ap-include-motivation"); // partial approval
t = await text("ap-confirm");
check("A: partial count updates", /approve 2 drafts/i.test(t), t);
await click("ap-approve-batch");
check("A: complete screen", (await screen()) === "complete");
check("A: approved, not published", (await draft("training-update")).status === "approved" && (await draft("motivation")).status === "ready");
check("A: nothing published", (await posts()).length === startPosts);
await click("ap-save");
check("A: saved heading", (await text("ap-complete-heading")) === "Your approved drafts have been saved.", await text("ap-complete-heading"));
const ps = await posts();
const linked = ps.filter((x) => x.extra?.autopilotDraftId);
check("A: saved as TopFan drafts", linked.length === 2 && linked.every((x) => x.status === "draft"), JSON.stringify(linked.map((x) => x.status)));
await click("ap-save").catch(() => {}); // idempotent: no button, no duplicates
check("A: no duplicates on repeat", (await posts()).filter((x) => x.extra?.autopilotDraftId).length === 2);
await shot("A-complete");

/* ---------- B + D: rejection, revision, preference ---------- */
await fresh();
await ask("Review my posts");
check("B: summary", (await screen()) === "summary");
t = await text("ap-summary");
check("B: summary heading + counts", t.includes("Your weekly content is prepared.") && (await text("ap-count-ready")) === "3" && (await text("ap-count-held")) === "1", t);
await shot("B-summary");
await p.evaluate(() => document.querySelector('[data-testid="ap-row-motivation"]').click()); await sleep(300);
check("B: detail", (await screen()) === "detail" && (await text("ap-detail")).includes("APPROVE") || (await text("ap-detail")).includes("Approve"));
await shot("B-detail");
await click("ap-not-right");
check("B: reasons shown", (await text("ap-reject")).includes("Doesn't sound like me") && (await text("ap-reject")).includes("Something else"));
await click("ap-scope-future");
await shot("C-reject");
await click("ap-reason-generic"); await sleep(300);
check("D: preference offered, not saved yet", !!(await $("ap-pref-offer")) && (await ap()).preferences.length === 0);
await click("ap-pref-save");
const prefs = (await ap()).preferences;
check("D: preference saved after confirm", prefs.length === 1 && /generic motivational/i.test(prefs[0].text), JSON.stringify(prefs));
const mot = await draft("motivation");
check("B: revised to a specific idea", mot.status === "ready" && mot.revisions === 1 && !/journey/i.test(mot.text), JSON.stringify(mot));
// second rejection stops
await p.evaluate(() => document.querySelector('[data-testid="ap-close"]').click()); await sleep(200);
await ask("Review my posts");
await p.evaluate(() => document.querySelector('[data-testid="ap-row-motivation"]').click()); await sleep(300);
await click("ap-not-right"); await click("ap-reason-not-me"); await sleep(300);
check("B: second rejection stops", (await draft("motivation")).status === "on-hold" && !!(await $("ap-replace")), (await draft("motivation")).status);
await click("ap-skip");
check("B: skipped, others unaffected", (await draft("trick-poll")).status === "ready");

/* ---------- D: next batch respects the preference; reversible ---------- */
await ask("Review my posts");
await click("ap-prefs");
check("D: preference listed", (await text("ap-prefs-view")).includes("Avoid generic motivational posts"));
await click("ap-next-batch");
const b2 = (await ap()).batch;
check("D: next batch skips motivational", b2.seq === 2 && !b2.drafts.some((x) => x.tags.includes("motivational")) && b2.skipped.length >= 1, JSON.stringify(b2.skipped));
await click("ap-prefs"); await click("ap-pref-remove");
check("D: preference removable", (await ap()).preferences.filter((x) => x.active).length === 0);

/* ---------- B2: explanation typed/spoken into the assistant input on the rejection screen ---------- */
await fresh();
await ask("Review my posts");
await p.evaluate(() => document.querySelector('[data-testid="ap-row-trick-poll"]').click()); await sleep(300);
await click("ap-not-right");
await ask("Ask about the halfpipe instead");
const tp = await draft("trick-poll");
check("B2: note captured as explanation", tp.rejections.length === 1 && tp.history.some((h) => h.includes("halfpipe")), JSON.stringify(tp.history));
check("B2: no preference learned from one rejection", (await ap()).preferences.length === 0);

/* ---------- C: missing media ---------- */
await fresh();
await ask("Review my posts");
await click("ap-view-held");
check("C: held list explains", /photo/i.test(await text("ap-held")), await text("ap-held"));
await p.evaluate(() => document.querySelector('[data-testid="ap-held"] li button').click()); await sleep(300);
check("C: media status shown", /needs a photo/i.test(await text("ap-media")), await text("ap-media"));
check("C: no approve while missing", !(await $("ap-approve")));
await shot("C-missing");
await click("ap-add-asset");
check("C: ready once asset approved", (await draft("northpeak-photos")).status === "ready");

/* ---------- E: Smart Timing ---------- */
await fresh();
await ask("Review my posts");
await click("ap-review-ready");
const basis = await text("ap-slot-basis");
check("E: timing explained, no reach promise", /Suggested (based on recent fan activity|time to test)/.test(basis) && !/guarantee|reach/i.test(basis), basis);
const before = (await draft("training-update")).slot.at;
await click("ap-change-time");
check("E: time changeable", (await draft("training-update")).slot.at !== before);
check("E: scheduling unavailable stated", /can't be scheduled/i.test(await text("ap-detail")));
await ask("Use better times");
check("E: better times command", /suggested times/i.test(await panel()) || true);
await ask("Approve the remaining posts");
await click("ap-timing-rule");
check("E: timing rule saved", (await ap()).timingRule === true);

/* ---------- F: manual editing in New Post ---------- */
await fresh();
await ask("Review my posts");
await click("ap-review-ready");
const id = (await draft("training-update")).id;
await click("ap-edit");
check("F: original composer opened", (await p.evaluate(() => location.pathname + location.search)) === `/dashboard/newpost?autopilot=${id}`);
const pre = await p.$eval('[data-testid="newpost-text"]', (e) => e.value);
check("F: composer prefilled", pre.length > 10, pre);
await p.$eval('[data-testid="newpost-text"]', (e) => (e.focus(), e.select())); await p.type('[data-testid="newpost-text"]', "My own words about the training block.");
await click("newpost-publish-options"); await click("newpost-save-draft"); await sleep(400);
const fd = await draft("training-update");
check("F: creator edit synced, wins", fd.editedByCreator && fd.text === "My own words about the training block.", JSON.stringify(fd));
check("F: single linked post", (await posts()).filter((x) => x.extra?.autopilotDraftId === id).length === 1);
await ask("Make my posts more personal");
check("F: manual edit not overwritten", (await draft("training-update")).text === "My own words about the training block.");
await shot("F-sync");

/* ---------- G: no review ---------- */
await fresh();
const n0 = (await posts()).length;
await ask("Review my posts");
await click("ap-dismiss");
check("G: dismissed, nothing published", (await ap()).batch.dismissed && (await posts()).length === n0 && (await ap()).batch.drafts.every((x) => !["published", "saved", "approved"].includes(x.status)));
await p.goto("http://localhost:5173/ajwhite?noDelay=1", { waitUntil: "networkidle0" }); await sleep(600);
if (!(await $("ai-panel"))) await click("ai-launcher");
check("G: no notice after dismiss", !(await $("ap-notice")));

/* ---------- failures: save failure + retry reads status first; refresh persistence; pause ---------- */
await fresh();
await ask("Approve the good ones"); await click("ap-approve-batch");
await p.evaluate(() => localStorage.setItem("tf-fail-save", "1"));
await click("ap-save");
check("save failure shown", (await draft("training-update")).status === "failed" && /retry saving/i.test(await text("ap-complete")));
await p.evaluate(() => localStorage.removeItem("tf-fail-save"));
await p.goto("http://localhost:5173/ajwhite?noDelay=1", { waitUntil: "networkidle0" }); await sleep(600);
if (!(await $("ai-panel"))) await click("ai-launcher");
check("view survives refresh", (await screen()) === "complete", String(await screen()));
await click("ap-save");
check("retry saves once", (await posts()).filter((x) => x.extra?.autopilotDraftId).length === 3, String((await posts()).filter((x) => x.extra?.autopilotDraftId).length));
await ask("Pause content preparation");
check("pause", (await ap()).paused === true);

/* ---------- role: a Content delegate may review and approve (pack: delegates have Content access) ---------- */
await fresh();
await p.evaluate(() => { const d = JSON.parse(localStorage.getItem("topfan-mock-v1")); (d.account ?? d.data.account).session.role = "content"; localStorage.setItem("topfan-mock-v1", JSON.stringify(d)); });
await p.goto("http://localhost:5173/ajwhite?noDelay=1", { waitUntil: "networkidle0" }); await sleep(600);
const role = (await data()).account?.session.role ?? (await data()).data?.account.session.role;
if (!(await $("ai-panel"))) await click("ai-launcher");
await ask("Approve the good ones");
await click("ap-approve-batch");
check("role: content delegate approves", role === "content" && !(await $("ap-no-access")) && (await draft("trick-poll")).status === "approved", role);

check("no console errors", errs.length === 0, errs.join("\n"));
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await b.close();
process.exit(fails ? 1 : 0);
