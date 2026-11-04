// Demo 2 creative generation: ideas → full draft (text + image) → refine → the original form prefilled.
// Test 1 post, Test 2 experience, Test 3 newsletter, Test 4 connected tasks, Test 5 demo separation,
// plus follow-ups (more ideas, use the second option, premium, another image, stronger CTA, type change),
// edits not overwritten, and refresh persistence.
// Usage: node tests/e2e/content-ideas.mjs   (dev server on :5173, or BASE_URL)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const KEY = "topfan-mock-v1:ai-content";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1512, height: 805 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 500)); if (!ok) fails++; };

async function fresh(demo = "ai-content") {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(String(e)));
  await p.evaluateOnNewDocument(() => localStorage.setItem("tf-no-delay", "1"));
  await p.goto(`${BASE}/demo/${demo}?resetMock=1&noDelay=1`, { waitUntil: "networkidle0" });
  await sleep(1200);
  await openPanel(p);
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
  return p;
}
const path = (p) => new URL(p.url()).pathname;
const openPanel = async (p) => { if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(700); } };
const replies = (p) => p.$$eval('[data-msg="assistant"]', (x) => x.map((m) => m.innerText));
async function ask(p, q, wait = 900) {
  const before = (await replies(p)).length;
  await p.waitForSelector('[data-testid="ai-input"]', { visible: true, timeout: 5000 });
  await p.$eval('[data-testid="ai-input"]', (x) => (x.focus(), x.select?.()));
  await p.keyboard.press("Backspace");
  await p.type('[data-testid="ai-input"]', q);
  await p.keyboard.press("Enter");
  await sleep(wait);
  return (await replies(p)).slice(before).join("\n");
}
const tap = async (p, re, wait = 900) => {
  const before = (await replies(p)).length;
  const hit = await p.evaluate((src) => {
    const x = [...document.querySelectorAll('[data-testid="ai-panel"] button')].reverse().find((b) => new RegExp(src, "i").test(b.innerText.trim()));
    x?.click();
    return x?.innerText.trim() ?? null;
  }, re.source);
  await sleep(wait);
  return { hit, r: (await replies(p)).slice(before).join("\n") };
};
const lastIdeas = (p) => p.evaluate(() => { const all = [...document.querySelectorAll('[data-testid="content-ideas"]')]; const g = all.at(-1); return g ? [...g.querySelectorAll('[data-testid="content-idea"]')].map((c) => ({ id: c.dataset.idea, text: c.innerText, img: c.querySelector("img")?.naturalWidth ?? 0 })) : []; });
const pickIdea = async (p, n, wait = 1100) => {
  const before = (await replies(p)).length;
  await p.evaluate((n) => { const g = [...document.querySelectorAll('[data-testid="content-ideas"]')].at(-1); g.querySelectorAll('[data-testid="content-idea-pick"]')[n].click(); }, n);
  await sleep(wait);
  return (await replies(p)).slice(before).join("\n");
};
const pickMedia = async (p, n = 0) => { await p.evaluate((n) => { const g = [...document.querySelectorAll('[data-testid="content-media-pick"]')].at(-1); g.querySelectorAll('[data-testid="content-media-option"]')[n].click(); }, n); await sleep(900); };
const db = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), KEY);
const items = async (p) => (await db(p)).content.items;
const back = async (p) => { await p.goto(`${BASE}/ajwhite`, { waitUntil: "networkidle0" }); await sleep(900); await openPanel(p); await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click()); };
const val = (p, sel) => p.$eval(sel, (x) => x.value ?? x.innerText).catch(() => null);

const p = await fresh();

/* ===== Test 1: a post ===== */
let r = await ask(p, "Help me create a post");
let list = await lastIdeas(p);
check("T1: broad request → 3–4 post ideas with images", list.length >= 3 && list.length <= 4 && list.every((i) => i.img > 0), JSON.stringify(list));
r = await ask(p, "Give me more ideas");
const list2 = await lastIdeas(p);
check("T1: more ideas are different concepts", list2.length >= 3 && list2.every((i) => !list.some((j) => j.id === i.id)), JSON.stringify(list2.map((i) => i.id)));
r = await ask(p, "Create a motivational post about my snowboarding journey", 1500);
let post = (await items(p)).filter((x) => x.kind === "post").at(-1);
check("T1: personalised caption from notes, with hashtags", /switch backside 540/.test(post?.post?.text) && /#snowboarding/.test(post?.post?.text) && post.post.type === "images", post?.post?.text);
check("T1: two image options shown with the copy", (await p.$$eval('[data-testid="content-media-pick"]', (g) => g.at(-1)?.querySelectorAll('[data-testid="content-media-option"]').length ?? 0)) === 2);
await pickMedia(p, 1);
post = (await items(p)).find((x) => x.id === post.id);
check("T1: picked image attached to the draft", !!post.media?.key, JSON.stringify(post.media));
const firstKey = post.media.key;
r = await ask(p, "Generate another image", 1300);
check("T1: another image → two different options", (await p.$$eval('[data-testid="content-media-pick"]', (g) => g.length)) >= 2, r.slice(0, 200));
await pickMedia(p, 0);
post = (await items(p)).find((x) => x.id === post.id);
check("T1: new image replaces the old one", post.media.key !== firstKey, `${firstKey} → ${post.media.key}`);
r = await ask(p, "Make the caption shorter");
post = (await items(p)).find((x) => x.id === post.id);
check("T1: caption shorter", /Shorter now/.test(r) && post.post.text.length < 260, post.post.text);
await tap(p, /^open in new post$/, 1500);
const npText = await val(p, '[data-testid="newpost-text"]');
const npImg = await p.$$eval('[data-testid="newpost-file-preview"] img', (x) => x.map((i) => i.naturalWidth));
check("T1: New Post opens prefilled with caption and the attached image", path(p) === "/dashboard/newpost" && npText?.startsWith(post.post.text.slice(0, 20)) && npImg.length === 1 && npImg[0] > 0, `${path(p)} | ${npText} | ${JSON.stringify(npImg)}`);
await p.click('[data-testid="newpost-text"]');
await p.keyboard.press("End");
await p.keyboard.type(" Thanks for riding along.");
await sleep(900);
await p.reload({ waitUntil: "networkidle0" });
await sleep(1000);
post = (await items(p)).find((x) => x.id === post.id);
check("T1: manual edit kept after refresh", post.editedByCreator && /Thanks for riding along/.test(post.post.text), post.post.text);
await back(p);
r = await ask(p, "Continue editing my previous draft");
check("T1: 'continue editing my previous draft' brings it back", /journey|Thanks for riding along/i.test(r), r.slice(0, 200));
r = await ask(p, "Make the caption shorter");
post = (await items(p)).find((x) => x.id === post.id);
check("T1: edited copy is not overwritten", /won't rewrite/.test(r) && /Thanks for riding along/.test(post.post.text), r.slice(0, 200));
check("T1: nothing published", !(await db(p)).social.posts.some((x) => /Thanks for riding along/.test(x.text)));

/* ===== Test 2: an experience ===== */
r = await ask(p, "Help me plan an experience");
list = await lastIdeas(p);
check("T2: 3–4 distinct experience concepts with images and types", list.length >= 3 && list.length <= 4 && new Set(list.map((i) => i.id)).size === list.length && list.every((i) => i.img > 0 && /Call|Video|Experience|Meetup|Social/i.test(i.text)), JSON.stringify(list.map((i) => i.text.split("\n").slice(0, 2))));
r = await ask(p, "Use the second option", 1200);
let exp = (await items(p)).filter((x) => x.kind === "experience").at(-1);
check("T2: 'use the second option' → full proposal with preview image, type and needs", exp?.experience?.experienceType === "Personalized Video" && /What we'll do/.test(exp.experience.description) && !!exp.media?.key && /price/i.test(r), `${exp?.experience?.experienceType} | ${r.slice(0, 200)}`);
const secondId = exp.id;
r = await pickIdea(p, 0);
exp = (await items(p)).filter((x) => x.kind === "experience").at(-1);
check("T2: picking another idea keeps the earlier draft", (await items(p)).some((x) => x.id === secondId) && exp.id !== secondId && exp.experience.experienceType === "1:1 Video Call" && exp.experience.duration === "30 Minutes", exp.experience.experienceType);
r = await ask(p, "Make it more premium");
exp = (await items(p)).find((x) => x.id === exp.id);
check("T2: more premium (no invented price)", /^Premium /.test(exp.experience.title) && exp.experience.price == null, exp.experience.title);
r = await ask(p, "Change the experience to an in-person meetup");
exp = (await items(p)).find((x) => x.id === exp.id);
check("T2: type change asks for the address", exp.experience.experienceType === "In Person Session" && exp.needs.some((n) => /address/.test(n)), JSON.stringify(exp.needs));
r = await ask(p, "Change it to a one-to-one call");
exp = (await items(p)).find((x) => x.id === exp.id);
check("T2: back to a one-to-one call", exp.experience.experienceType === "1:1 Video Call" && !exp.needs.some((n) => /address/.test(n)));
r = await ask(p, "free");
check("T2: free declined", /above \$0|price/i.test(r), r.slice(0, 160));
r = await ask(p, "60");
await tap(p, /^open in add experience$/, 1600);
const expTitle = await val(p, '[data-testid="monetize-product-title"]');
const expDesc = await val(p, '[data-testid="monetize-product-description"]');
const expBody = await p.evaluate(() => document.body.innerText);
const expImg = await p.$eval('[data-testid="monetize-product-image"] img', (x) => x.naturalWidth).catch(() => 0);
check("T2: Create Experiences form populated (title, description, type, duration, price, image)",
  path(p) === "/monetize/experience/create-experience" && expTitle === exp.experience.title && /What we'll do/.test(expDesc) && /One to One Call/.test(expBody) && /30 Minutes/.test(expBody) && expImg > 0,
  `${path(p)} | ${expTitle} | img ${expImg}`);
check("T2: starts Disabled (nothing goes live)", /Disable/.test(expBody) && !(await db(p)).monetize.products.some((x) => x.title === exp.experience.title));
await back(p);

/* ===== Test 4: connected tasks (from the experience) ===== */
r = await ask(p, "Create a post and newsletter to promote this", 1200);
const all = await items(p);
const ann = all.filter((x) => x.kind === "post").at(-1);
const nlp = all.filter((x) => x.kind === "newsletter").at(-1);
check("T4: post and newsletter both reference the same experience", ann?.link?.rel === "announces" && ann.link.id === exp.id && nlp?.deps.includes(exp.id) && new RegExp(exp.experience.title.slice(0, 15)).test(nlp.newsletter.body), `${JSON.stringify(ann?.link)} | ${nlp?.deps}`);
check("T4: nothing posted or sent", /Nothing is posted or sent/.test(r), r.slice(0, 200));

/* ===== Test 3: a newsletter ===== */
r = await ask(p, "Help me create a newsletter");
list = await lastIdeas(p);
check("T3: 3–4 newsletter topics with images", list.length >= 3 && list.length <= 4 && list.every((i) => i.img > 0), JSON.stringify(list.map((i) => i.id)));
r = await pickIdea(p, 1, 1200);
let nl = (await items(p)).filter((x) => x.kind === "newsletter").at(-1);
check("T3: full draft: subject, intro, sections, CTA and a cover image", nl?.newsletter?.sections?.length >= 2 && /^Hi everyone/.test(nl.newsletter.body) && !!nl.newsletter.cta && !!nl.media?.key, JSON.stringify(nl?.newsletter).slice(0, 300));
check("T3: email verification respected", /verification/i.test(r) && nl.flags.some((f) => /Email sending/.test(f)), r.slice(0, 200));
r = await ask(p, "Add a stronger CTA");
nl = (await items(p)).find((x) => x.id === nl.id);
check("T3: stronger CTA", /Book a session with me|Subscribe/.test(nl.newsletter.cta), nl.newsletter.cta);
{ const t = await p.evaluate(() => [...document.querySelectorAll('[data-msg="assistant"]')].at(-1)?.innerText ?? ""); check("T3: the CTA reply offers next steps (not a dead end)", /Added a stronger call to action/.test(t) && /Open in New Newsletter/i.test(t), t.slice(-200)); }
await tap(p, /^open in new newsletter$/, 1600);
const nlTitle = await val(p, '[data-testid="monetize-newsletter-title"]');
const nlBody = await p.$eval('[data-testid="monetize-newsletter-body"]', (x) => ({ h3: x.querySelectorAll("h3").length, text: x.innerText })).catch(() => null);
const nlImg = await p.$eval('[data-testid="monetize-newsletter-image"] img', (x) => x.naturalWidth).catch(() => 0);
check("T3: New Newsletter populated (subject, headed body, cover image)", /\/monetize\/newsletters\/add/.test(path(p)) && nlTitle === nl.newsletter.title && nlBody?.h3 >= 2 && nlImg > 0, `${path(p)} | ${nlTitle} | ${JSON.stringify(nlBody)?.slice(0, 120)} | ${nlImg}`);
check("T3: send is blocked until email is verified", !!(await p.$('[data-testid="monetize-newsletter-email-unverified"]')));
await p.evaluate(() => document.querySelector('[data-testid="monetize-newsletter-save-draft"]')?.click());
await sleep(1200);
nl = (await items(p)).find((x) => x.id === nl.id);
check("T3: saved as a draft, not sent", nl.status === "saved" && !(await db(p)).monetize.newsletters.some((n) => n.title === nl.newsletter.title && n.status === "Sent"), nl.status);

/* ===== refresh / pause-resume ===== */
await back(p);
await p.reload({ waitUntil: "networkidle0" });
await sleep(1000);
await openPanel(p);
r = await ask(p, "Help me plan an experience");
r = await ask(p, "Use the third option", 1200);
const third = (await items(p)).filter((x) => x.kind === "experience").at(-1);
check("T2: after a refresh, the idea list and 'use the third option' still work", third?.experience?.experienceType === "Other" && /Instructions for fans/.test(third.needs.join(" ")), third?.experience?.experienceType);
check("drafts kept across the session (2 experiences + 1 more, posts, newsletters)", (await items(p)).filter((x) => x.kind === "experience").length >= 3);
check("no page errors (Demo 2)", !p.errors.length, p.errors.join("\n"));

/* ===== Test 5: demo separation ===== */
const p1 = await fresh("setup-navigation");
const r1 = await ask(p1, "Help me create a post", 1000);
check("T5: Demo 1 doesn't start the Demo 2 idea workflow", !(await p1.$('[data-testid="content-ideas"]')), r1.slice(0, 200));
check("no page errors (Demo 1)", !p1.errors.length, p1.errors.join("\n"));

await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
