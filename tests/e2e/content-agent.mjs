// Demo 2 (AI-Assisted Content): the 7 deterministic scenarios and the cross-feature checks, end to end
// through the assistant panel and the ORIGINAL screens (New Post, New Newsletter, Add Experience).
// Asserts on the mock store (topfan-mock-v1:ai-content): nothing is published, sent or activated
// unless the creator clicks it on the original screen; refused actions change nothing.
// Usage: node tests/e2e/content-agent.mjs [--viewport=1126x797|mobile]   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const vp = (process.argv.find((a) => a.startsWith("--viewport=")) ?? "").split("=")[1];
const viewport = vp === "mobile" ? { width: 390, height: 844, isMobile: true, hasTouch: true } : vp ? { width: +vp.split("x")[0], height: +vp.split("x")[1] } : { width: 1512, height: 805 };
if (vp === "mobile") {
  // The recreated TopFan screens are desktop layouts (see docs/DEMO_READINESS.md: Mobile not supported);
  // the assistant panel keeps its desktop width, which the 1126×797 run already covers.
  console.log("SKIP mobile: TopFan screens are desktop-only in this prototype (documented limitation)");
  process.exit(0);
}
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: viewport });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 500)); if (!ok) fails++; };
const KEY = "topfan-mock-v1:ai-content";

async function fresh() {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(String(e)));
  p.on("console", (m) => m.type() === "error" && !/favicon/.test(m.text()) && p.errors.push(m.text()));
  // In-app navigation drops ?noDelay, so the flag lives in localStorage for the whole run.
  await p.evaluateOnNewDocument(() => localStorage.setItem("tf-no-delay", "1"));
  await p.goto(`${BASE}/demo/ai-content?resetMock=1&noDelay=1`, { waitUntil: "networkidle0" });
  await sleep(1300);
  await openPanel(p);
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
  return p;
}
const go = async (p, path) => { await p.goto(`${BASE}${path}`, { waitUntil: "networkidle0" }); await sleep(1100); await openPanel(p); };
const path = (p) => new URL(p.url()).pathname;
const openPanel = async (p) => {
  if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(700); }
};
const replies = (p) => p.$$eval('[data-msg="assistant"]', (x) => x.map((m) => m.innerText));
async function ask(p, q, wait = 700) {
  const before = (await replies(p)).length;
  await p.waitForSelector('[data-testid="ai-input"]', { visible: true, timeout: 5000 });
  await p.$eval('[data-testid="ai-input"]', (x) => (x.focus(), x.select?.()));
  await p.keyboard.press("Backspace");
  await p.type('[data-testid="ai-input"]', q);
  await p.keyboard.press("Enter");
  await sleep(wait);
  return (await replies(p)).slice(before).join("\n");
}
/** Click the newest panel button whose text matches. */
const tap = async (p, re, wait = 600) => {
  const before = (await replies(p)).length;
  const hit = await p.evaluate((src) => {
    const x = [...document.querySelectorAll('[data-testid="ai-panel"] button')].reverse().find((b) => new RegExp(src, "i").test(b.innerText.trim()));
    x?.click();
    return x?.innerText.trim() ?? null;
  }, re.source);
  await sleep(wait);
  return { hit, r: (await replies(p)).slice(before).join("\n") };
};
const db = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), KEY);
const items = async (p) => (await db(p)).content.items;
const last = async (p, kind) => (await items(p)).filter((x) => x.kind === kind).at(-1);
const val = (p, id) => p.$eval(`[data-testid="${id}"]`, (x) => x.value ?? x.innerText).catch(() => null);
const nothingLive = async (p) => {
  const d = await db(p);
  return { posts: d.social.posts.filter((x) => x.status === "published").length, sent: d.monetize.newsletters.filter((x) => x.status === "sent").length, products: d.monetize.products.length };
};

/* ===== 1. Welcome, then a post with an image (B + C) ===== */
{
  const p = await fresh();
  const w = await p.$eval('[data-testid="ai-welcome"]', (x) => x.innerText).catch(() => "");
  check("S1: welcome heading and copy", /What would you like to create\?/.test(w) && /help plan, prepare and organize it for your fans/.test(w), w);
  await p.click('[data-testid="ai-more-suggestions"]').catch(() => {});
  await sleep(300);
  const all = await p.$$eval('[data-testid^="ai-suggestion-create-"]', (x) => x.map((e) => e.innerText.trim()));
  check("S1: all five ideas after More ideas", all.join("|") === "Create a post|Plan my content|Create a newsletter|Plan a fan experience|Plan my entire week", all.join("|"));
  const base = await nothingLive(p);

  let r = await ask(p, "Create a training update post for this week");
  let x = await last(p, "post");
  check("S1: post type inferred (Images) from training notes", x?.post?.type === "images" && /switch backside 540/i.test(x.post.text), JSON.stringify(x?.post));
  check("S1: card shows Draft and sources", /Draft/.test(r) && /From:/.test(r) && /notes/i.test(r), r);
  check("S1: no invented facts (no results, sponsors, stats)", !/\b(won|sponsor|record|\d+%|placed|podium)\b/i.test(x.post.text), x.post.text);

  ({ r } = await tap(p, /^add an image$/));
  check("S1: three image choices", /Use one of my photos/i.test(r) && /Generate an original image/i.test(r) && /Upload my own image/i.test(r), r);
  ({ r } = await tap(p, /^generate an original image$/, 1200));
  check("S1: image choices shown as generated, no simulated copy", /Choose an image/i.test(r) && !/simulated|pre-made|not photos of you/i.test(r), r);
  const opts = await p.$$('[data-testid="content-media-option"]');
  check("S1: two directions", opts.length >= 2, opts.length);
  await opts.at(-2).click();
  await sleep(600);
  x = await last(p, "post");
  check("S1: generated image attached and marked", x.media?.origin === "generated" && x.media.key.startsWith("generated/"), JSON.stringify(x.media));
  r = await ask(p, "Make it darker", 1300);
  const rev = await p.$$('[data-testid="content-media-option"]');
  await rev.at(-1).click();
  await sleep(600);
  x = await last(p, "post");
  check("S1: revision (darker) replaces the image", x.media?.key === "generated/training-dark", JSON.stringify(x.media));

  ({ r } = await tap(p, /^open in new post$/, 1500));
  check("S1: opens the ORIGINAL New Post composer", path(p) === "/dashboard/newpost", path(p));
  check("S1: composer prefilled with the draft", (await val(p, "newpost-text"))?.includes("switch backside 540"), await val(p, "newpost-text"));
  const files = await p.$eval('[data-testid="newpost-files"]', (x) => x.innerText).catch(() => "");
  check("S1: image carried into the composer (file list)", /illustration|darker|\.webp/i.test(files), files);
  await p.$eval('[data-testid="newpost-text"]', (x) => x.focus());
  await p.keyboard.press("End");
  await p.type('[data-testid="newpost-text"]', " See you on the hill.");
  await sleep(1100);
  x = await last(p, "post");
  check("S1: edits on the page sync back (Edited by you)", x.editedByCreator && /See you on the hill\./.test(x.post.text), JSON.stringify(x.post));
  check("S1: nothing published by the assistant", JSON.stringify(await nothingLive(p)) === JSON.stringify(base), JSON.stringify(await nothingLive(p)));
  await p.click('[data-testid="newpost-publish"]');
  await sleep(400);
  await p.click('[data-testid="modal-newpost-confirm-confirm"]');
  await sleep(900);
  x = await last(p, "post");
  check("S1: creator's Publish click is what publishes (linked)", x.status === "published" && !!x.ref?.postId && (await nothingLive(p)).posts === base.posts + 1, JSON.stringify({ s: x.status, ref: x.ref }));
  check("S1: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== 2. Gold-only exclusive post (D): honest Lock, missing plan, teaser ===== */
{
  const p = await fresh();
  let r = await ask(p, "Create an exclusive post for my Gold members");
  let x = await last(p, "post");
  check("S2: locked draft, price left to the creator", x.post.locked && x.post.price == null && x.status === "needs-input", JSON.stringify(x));
  check("S2: Gold plan found, tier limit explained (not faked)", /Gold Plan/.test(r) && /pay to unlock/i.test(r) && /can't limit a post to one membership/i.test(r), r);
  check("S2: options offered", /Lock it with an unlock price/i.test(r) && /Gold-only newsletter/i.test(r), r);
  r = await ask(p, "Make it only for Platinum members");
  check("S2: missing plan → exact message", /I couldn't find a Platinum membership in your current plans\./.test(r), r);
  check("S2: alternatives incl. set up that membership", /Use Gold Plan/i.test(r) && /Set up that membership/i.test(r), r);
  ({ r } = await tap(p, /^Use Gold Plan$/));
  ({ r } = await tap(p, /^lock it with an unlock price$/));
  check("S2: asks the unlock price", /What unlock price/i.test(r), r);
  r = await ask(p, "0");
  check("S2: zero price refused at the service", /price|more than/i.test(r) && (await last(p, "post")).post.price == null, r);
  r = await ask(p, "12");
  x = await last(p, "post");
  check("S2: price 12 applied to the draft only", x.post.price === 12 && /nothing is published/i.test(r), JSON.stringify(x.post));
  r = await ask(p, "Prepare a public teaser");
  const t = (await items(p)).find((y) => y.link?.rel === "teaser-of");
  check("S2: separate public teaser, linked, no locked text leaked", t && !t.post.locked && !t.post.text.includes(x.post.text.slice(0, 40)), JSON.stringify(t?.post));
  r = await ask(p, "Make the exclusive post public");
  check("S2: broadening visibility needs confirmation", /Make this post public\?/i.test(r) && (await items(p)).find((y) => y.id === x.id).post.locked, r);
  await tap(p, /^keep it locked$/);
  check("S2: stays locked", (await items(p)).find((y) => y.id === x.id).post.locked);
  await tap(p, /^open in new post$/, 1500);
  check("S2: composer has Lock on with the price", path(p) === "/dashboard/newpost" && (await p.evaluate(() => document.body.innerText)).includes("12"), path(p));
  check("S2: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== 3. Newsletter (E): repurpose, recipients, outbound email blocker ===== */
{
  const p = await fresh();
  await ask(p, "Create a training update post");
  let r = await ask(p, "Turn this post into a newsletter");
  let n = await last(p, "newsletter");
  check("S3: repurposes the post", n.link?.rel === "repurposes", JSON.stringify(n.link));
  check("S3: blocked by unverified email, exact copy", n.status === "blocked" && /Your newsletter draft is ready, but email sending needs verification\. You can save the draft now or fix that setup\./.test(r), r);
  check("S3: Save draft / Review email setup / Continue editing", /save the draft/i.test(r) && /Review email setup/i.test(r), r);
  r = await ask(p, "Send it only to Gold subscribers");
  n = await last(p, "newsletter");
  const gold = (await db(p)).monetize.plans.find((x) => /Gold/.test(x.name));
  check("S3: newsletter audience = Gold plan (supported)", n.newsletter.audience === "plans" && n.newsletter.planIds.join() === gold.id, JSON.stringify(n.newsletter));
  await tap(p, /^open and save the draft$/, 1500);
  check("S3: ORIGINAL New Newsletter, prefilled", path(p) === "/monetize/newsletters/add" && (await val(p, "monetize-newsletter-body"))?.length > 40, path(p));
  const sentBefore = (await nothingLive(p)).sent;
  await p.click('[data-testid="monetize-newsletter-send"]').catch(() => {});
  await sleep(500);
  await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => /^(send|send now|confirm)$/i.test(b.innerText.trim()) && !b.closest('[data-testid="ai-panel"]'))?.click());
  await sleep(800);
  check("S3: send refused at the service layer (nothing sent)", (await nothingLive(p)).sent === sentBefore);
  const rr = (await replies(p)).join("\n");
  check("S3: refusal is reported, not a fake success", /wasn't sent|isn't verified/i.test(rr + (await p.evaluate(() => document.body.innerText))), rr.slice(-300));
  await go(p, "/monetize/newsletters/add?work=" + n.id);
  await p.click('[data-testid="monetize-newsletter-save-draft"]');
  await sleep(900);
  n = (await items(p)).find((x) => x.id === n.id);
  check("S3: saved as a draft in TopFan (Saved, not Sent)", n.status === "saved" && !!n.ref?.newsletterId, JSON.stringify({ s: n.status, ref: n.ref }));
  check("S3: no page errors", !p.errors.filter((e) => !/Email sending/.test(e)).length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== 4. Experience (F): event vs experience, price, Add Experience, announcement ===== */
{
  const p = await fresh();
  let r = await ask(p, "I want to sell tickets for a fan session");
  check("S4: asks Experience vs Event", /Events & Ticketing/i.test(r) && /Book a time with me/i.test(r), r);
  ({ r } = await tap(p, /^book a time with me$/));
  let e = await last(p, "experience");
  check("S4: experience draft, price not invented", e && e.experience.price == null && /what price/i.test(r), JSON.stringify(e?.experience));
  check("S4: no date/capacity invented; booking path explained", /no date or capacity/i.test(r) && /request a booking/i.test(r), r);
  r = await ask(p, "free");
  check("S4: free price refused with an explanation", (await last(p, "experience")).experience.price == null && /free|price/i.test(r), r);
  r = await ask(p, "$75");
  e = await last(p, "experience");
  check("S4: price captured", e.experience.price === 75 && /starts disabled/i.test(r), r);
  ({ r } = await tap(p, /^prepare an announcement post$/));
  const ann = (await items(p)).find((x) => x.link?.rel === "announces");
  check("S4: announcement linked, booking link flagged until live", ann && ann.needs.some((n) => /link|live|saved/i.test(n)), JSON.stringify(ann?.needs));
  await tap(p, /^open in add experience$/, 1500).catch(() => {});
  if (path(p) !== "/monetize/experience/create-experience") await go(p, "/monetize/experience/create-experience?work=" + e.id);
  const body = await p.evaluate(() => [...document.querySelectorAll("input, textarea")].map((x) => x.value).join(" | "));
  check("S4: ORIGINAL Add Experience, prefilled", path(p) === "/monetize/experience/create-experience" && body.includes(e.experience.title) && body.includes("75"), body.slice(0, 300));
  check("S4: nothing activated by the assistant", (await db(p)).monetize.products.length === (await nothingLive(p)).products && !(await last(p, "experience")).ref, JSON.stringify((await last(p, "experience")).ref));
  check("S4: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== 5. Plan my entire week (G): parent + children, edits, approval ≠ publish ===== */
{
  const p = await fresh();
  const base = await nothingLive(p);
  let r = await ask(p, "I'm busy this week. Plan a training post, an exclusive post for members, a newsletter and a paid fan session.", 900);
  check("S5: compact overview", /Your week is prepared\./.test(r), r);
  const w = await last(p, "week");
  let kids = (await items(p)).filter((x) => x.parentId === w.id);
  const kinds = kids.map((x) => `${x.day}:${x.kind}${x.post?.locked ? "-locked" : ""}`).sort().join(",");
  check("S5: Mon public post, Wed members-only post, Fri newsletter, weekend experience", kinds === "1:post,3:post-locked,5:newsletter,6:experience", kinds);
  const counts = await p.$eval('[data-testid="content-week-counts"]', (x) => x.innerText).catch(() => "");
  check("S5: counts shown", /2 posts · 1 newsletter · 1 experience/.test(counts), counts);
  check("S5: suggested times are suggestions only", kids.every((x) => !x.suggestedAt || x.status !== "published"), "");
  r = await ask(p, "Move the newsletter to Thursday");
  kids = (await items(p)).filter((x) => x.parentId === w.id);
  check("S5: only the newsletter moved", kids.find((x) => x.kind === "newsletter").day === 4 && kids.find((x) => x.kind === "experience").day === 6, r);
  r = await ask(p, "Make the newsletter shorter");
  check("S5: newsletter shortened", /Only the/i.test(r), r);
  r = await ask(p, "Make the exclusive post for Silver members");
  check("S5: tier on a post explained honestly", /Silver Plan/.test(r) && /pay to unlock/i.test(r), r);
  r = await ask(p, "Remove the experience");
  kids = (await items(p)).filter((x) => x.parentId === w.id);
  check("S5: experience removed, dependent newsletter flagged", kids.find((x) => x.kind === "experience").status === "cancelled" && kids.find((x) => x.kind === "newsletter").flags.length > 0, r);
  r = await ask(p, "Approve the ready drafts");
  kids = (await items(p)).filter((x) => x.parentId === w.id);
  check("S5: approval marks reviewed, publishes nothing", kids.some((x) => x.status === "approved") && /Nothing has been posted|Nothing is ready/i.test(r) && JSON.stringify(await nothingLive(p)) === JSON.stringify(base), r);
  r = await ask(p, "Pause this week");
  check("S5: pause", (await last(p, "week")).status === "paused", r);
  r = await ask(p, "Continue my week");
  check("S5: continue shows the same week", /Here's your week\./.test(r) && (await last(p, "week")).id === w.id, r);
  await p.setViewport({ width: 1126, height: 797 });
  await sleep(400);
  const overflow = await p.evaluate(() => { const c = document.querySelector('[data-testid="content-week"]'); return c ? c.scrollWidth - c.clientWidth : -1; });
  check("S5: week card fits at 1126×797", overflow === 0, overflow);
  check("S5: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== 6. Continuity: the right task resumes after navigation ===== */
{
  const p = await fresh();
  await ask(p, "Create a newsletter");
  const n = await last(p, "newsletter");
  await ask(p, "Plan a fan experience");
  await go(p, "/insights");
  let r = await ask(p, "Continue my newsletter");
  check("S6: continue resumes the newsletter (not the experience)", /newsletter/i.test(r) && (await db(p)).content.focusId === n.id, r);
  await go(p, "/ajwhite");
  const c = await p.$$eval('[data-testid^="ai-suggestion-"]', (x) => x.map((e) => e.innerText.trim())).catch(() => []);
  check("S6: Feed welcome offers Continue first", /^Continue my /.test(c[0] ?? ""), c.join("|"));
  check("S6: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== 7. Autopilot continuity + page guidance + guards ===== */
{
  const p = await fresh();
  let r = await ask(p, "I don't want to plan this every week");
  const screen = await p.$eval('[data-testid="ap-view"]', (x) => x.dataset.screen).catch(() => null);
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
  await sleep(400);
  const said = (await replies(p)).join("\n");
  check("S7: hands off to Content Autopilot preferences", screen === "prefs" && /Nothing posts on its own/i.test(said), `${screen} ${said.slice(-300)}`);
  const guide = { "/dashboard/newpost": ["Help me write this post", "Add a visual", "Choose who can see this"], "/monetize/newsletters": ["Draft a newsletter", "Repurpose an existing post", "Review recipient options"], "/monetize/experience": ["Plan an experience", "Help with the description", "Review required details"], "/monetize/subscription": ["Understand membership access", "Review existing plans", "Create exclusive content"] };
  for (const [url, want] of Object.entries(guide)) {
    await go(p, url);
    await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
    const c = await p.$$eval('[data-testid^="ai-suggestion-"], [data-testid^="ai-context-"]', (x) => x.filter((e) => e.tagName === "BUTTON" && !/more/.test(e.dataset.testid)).map((e) => e.innerText.trim()));
    check(`S7 guide ${url}`, want.every((l) => c.includes(l)), c.join("|"));
  }
  r = await ask(p, "Review recipient options");
  check("S7: recipients from real mock counts, email caveat", /All recipients: \d+/.test(r) && /isn't verified/i.test(r), r);
  r = await ask(p, "Set up my domain DNS");
  check("S7: no DNS/setup in Demo 2", /That workflow is available in the Account Setup & Navigation demo\./.test(r), r);
  await ask(p, "Create a newsletter");
  check("S7: work exists before reset", (await items(p)).length > 0);
  await p.goto(`${BASE}/demo/ai-content?resetMock=1`, { waitUntil: "networkidle0" });
  await sleep(1200);
  check("S7: Demo 2 reset clears prepared work (mock store only)", (await items(p)).length === 0);
  check("S7: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
