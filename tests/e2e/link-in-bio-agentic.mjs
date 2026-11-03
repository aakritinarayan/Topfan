// Demo 2 agentic Link in Bio, the additions on top of link-in-bio.mjs: Flow A's intro step, compact
// review rows (rank, availability, full destination), native action types in the ORIGINAL editor,
// natural-language phrases, social icons, bio/colour suggestions, ended events, offerings that change
// after a proposal, Save for later / Continue, and Demo 1 separation.
// Usage: node tests/e2e/link-in-bio-agentic.mjs   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const vp = (process.argv.find((a) => a.startsWith("--viewport=")) ?? "").split("=")[1];
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: vp ? { width: +vp.split("x")[0], height: +vp.split("x")[1] } : { width: 1512, height: 805 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 500)); if (!ok) fails++; };
const KEY = "topfan-mock-v1:ai-content";
const SITE = "https://fans.ajwhite.com/ajwhite";

async function fresh(demo = "ai-content", q = "") {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(String(e)));
  p.on("console", (m) => m.type() === "error" && !/favicon/.test(m.text()) && p.errors.push(m.text()));
  await p.evaluateOnNewDocument(() => localStorage.setItem("tf-no-delay", "1"));
  await p.goto(`${BASE}/demo/${demo}?resetMock=1&noDelay=1${q}`, { waitUntil: "networkidle0" });
  await sleep(1200);
  await openPanel(p);
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
  return p;
}
const go = async (p, path) => { await p.goto(`${BASE}${path}`, { waitUntil: "networkidle0" }); await sleep(1100); await openPanel(p); await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click()); };
const path = (p) => new URL(p.url()).pathname;
const openPanel = async (p) => { if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(700); } };
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
const db = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), KEY);
const lib = async (p, key = KEY) => (await p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), key))?.prefsB.linkInBio.actions;
const lastBio = async (p) => (await db(p)).content.items.filter((x) => x.kind === "bio").at(-1);
/** The newest proposal's rows in the panel. */
const rows = (p) => p.evaluate(() => { const r = [...document.querySelectorAll('[data-testid="bio-review"]')].at(-1); return r ? [...r.querySelectorAll('[data-testid="bio-link"]')].map((x) => ({ key: x.dataset.key, include: x.dataset.include === "true", text: x.innerText, title: x.querySelector('[data-testid="bio-link-title"]')?.value })) : []; });
const row = (p, key, sel) => p.evaluateHandle((k, s) => [...document.querySelectorAll('[data-testid="bio-review"]')].at(-1)?.querySelector(`[data-key="${k}"] ${s}`), key, sel);
const save = async (p) => {
  await p.waitForSelector('[data-testid="pref-lib-save"]', { timeout: 5000 });
  await p.$eval('[data-testid="pref-lib-save"]', (x) => x.click());
  await p.waitForSelector('[data-testid="modal-pref-lib-save-confirm"]', { timeout: 5000 });
  await p.$eval('[data-testid="modal-pref-lib-save-confirm"]', (x) => x.click());
  await sleep(1000);
};
const cards = (p) => p.$$eval('[data-testid^="pref-lib-action-"]', (x) => x.filter((e) => /^pref-lib-action-[^-]+(-[^-]+)*$/.test(e.dataset.testid) && !/delete|drag/.test(e.dataset.testid)).map((e) => e.innerText.split("\n")[0].trim()));

const draftCards = (p) => p.$$eval('[data-testid^="pref-lib-action-"]', (x) => x.filter((e) => /^pref-lib-action-[^-]+(-[^-]+)*$/.test(e.dataset.testid) && !/delete|drag|move/.test(e.dataset.testid)).map((e) => ({ id: e.dataset.testid.slice(16), text: e.innerText })));
/** Rewrite the Demo 2 mock store, then reload. */
const mutate = async (p, fn) => {
  const body = typeof fn === "string" ? fn : `(${fn})(d)`;
  await p.evaluate((k, f) => { const d = JSON.parse(localStorage.getItem(k)); new Function("d", f)(d); localStorage.setItem(k, JSON.stringify(d)); }, KEY, body);
  await p.reload({ waitUntil: "networkidle0" });
  await sleep(1200);
  await openPanel(p);
};

/* ---- Flow A: intro → Prepare my links → review rows → native action types ---- */
{
  const p = await fresh();
  let r = await ask(p, "Help me set up my Link in Bio");
  check("A: intro first, nothing prepared yet", /I'll check what's already available in your TopFan account/.test(r) && !(await p.$('[data-testid="bio-review"]')), r);
  const self = await tap(p, /^i'll do it myself$/, 1300);
  check("A: I'll do it myself opens the original editor, nothing prepared", path(p) === "/edit-preference/link-in-bio/add-link-in-bio" && !(await db(p)).content.items.some((x) => x.kind === "bio"), path(p));
  r = await ask(p, "Help me set up my Link in Bio");
  r = (await tap(p, /^prepare my links$/, 1300)).r;
  check("A: review copy", /I found a few links worth featuring\. I've placed your main offerings first, followed by your social profiles\./.test(r), r);
  const rk = await p.$$eval('[data-testid="bio-review"]:last-of-type [data-testid="bio-link-rank"]', (x) => x.map((e) => e.innerText));
  check("A: selected rows numbered by priority", rk[0] === "1." && rk.length >= 2, rk.join(","));
  const st = await p.$$eval('[data-testid="bio-link-status"]', (x) => x.map((e) => e.innerText));
  check("A: availability status per row", st.includes("Live") && st.some((s) => /format checked/.test(s)), st.join(","));
  const dest = await p.$('[data-testid="bio-link-dest"]');
  await dest.click();
  await sleep(200);
  const full = await dest.evaluate((x) => x.innerText);
  check("A: destination can be inspected in full", /https:\/\/fans\.ajwhite\.com\/ajwhite\/store\/exp-park\/book/.test(full), full);
  // Include the course, if offered, to see its native type too.
  await tap(p, /^add selected links$/, 1500);
  const x = await lastBio(p);
  await openPanel(p);
  await save(p);
  const saved = await lib(p);
  const booking = saved.find((a) => /exp-park\/book/.test(a.url ?? ""));
  const member = saved.find((a) => a.url === SITE);
  check("A: experience booking saved as a Specific Store Item (with price)", booking?.kind === "store-item" && booking.price > 0 && booking.title === "Book My Training Session", JSON.stringify(booking));
  check("A: membership page saved as an External Action Item", member?.kind === "external", JSON.stringify(member));
  check("A: no invented action types", saved.every((a) => ["welcome-video", "store-item", "fundraiser", "general", "feed", "portfolio", "event", "external"].includes(a.kind)));
  check("A: proposal saved", (await lastBio(p)).status === "saved" && x.bio.links.length > 0);
  check("A: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ---- Phrases from anywhere in Demo 2 ---- */
{
  const p = await fresh();
  const cases = [
    ["Put my training session at the top", "promote", /training session/],
    ["Help fans find my memberships", "goal", /membership/i],
    ["Add my latest post", "goal", /latest public post/i],
    ["Improve my link names", "improve", /improvements/],
    ["Remove duplicates", "check", /checked your links|duplicate/i],
    ["Are any links outdated?", "check", /checked your links/],
    ["Check my Link in Bio", "check", /checked your links/],
    ["Promote my new course", "goal", /course/i],
  ];
  for (const [q, mode, re] of cases) {
    const r = await ask(p, q, 900);
    const x = await lastBio(p);
    check(`phrase "${q}" → ${mode}`, x?.bio?.mode === mode && re.test(r) && x.goal === q || (x?.bio?.mode === mode && re.test(r)), `${x?.bio?.mode} | ${r.slice(0, 200)}`);
    await tap(p, /^not now$/, 400);
  }
  const r = await ask(p, "Help me set up my Link in Bio");
  check("phrase: set up asks before preparing", /Prepare my links/i.test(r));
  check("phrases: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ---- Social profiles: icons restored first; buttons when icons are all there ---- */
{
  const p = await fresh();
  let r = await ask(p, "Add my social profiles");
  let x = await lastBio(p);
  check("socials: icons all showing → offered as buttons", x?.bio?.mode === "socials" && /already show as icons/.test(r) && x.bio.links.every((l) => !l.key.startsWith("icon-")), r);
  await tap(p, /^not now$/, 400);
  await mutate(p, (d) => { d.prefsB.linkInBio.socials = { x: d.prefsB.linkInBio.socials.x }; });
  r = await ask(p, "Add my social profiles");
  x = await lastBio(p);
  check("socials: missing icons proposed for Social Media Links", x.bio.links.some((l) => l.key === "icon-instagram") && /aren't showing as icons/.test(r), r);
  await tap(p, /^add selected links$/, 1500);
  await openPanel(p);
  await save(p);
  const s = (await db(p)).prefsB.linkInBio.socials;
  check("socials: saved into Social Media Links (not as extra buttons)", !!s.instagram && !!s.facebook && !!s.website && !(await lib(p)).some((a) => /^ba-.*icon-/.test(a.id)), JSON.stringify(s));
  check("socials: read back as saved", (await lastBio(p)).bio.result?.missing.length === 0, JSON.stringify((await lastBio(p)).bio.result));
  await p.browserContext().close();
}

/* ---- Bio and colour suggestions (reuse the creator's own data; editor draft; creator saves) ---- */
{
  const p = await fresh();
  await mutate(p, (d) => { d.prefsB.linkInBio.palette = 3; d.prefsB.linkInBio.bio = "hi"; });
  let r = await ask(p, "Suggest a short bio and matching colors for my Link in Bio");
  const x = await lastBio(p);
  check("style: bio from profile + brand palette proposed", x?.bio?.mode === "style" && !!x.bio.profile.bio && x.bio.profile.palette === 0, JSON.stringify(x?.bio));
  check("style: says nothing else changes", /won't change anything else/.test(r), r);
  await tap(p, /^try it in the editor$/, 1500);
  const draftBio = await p.evaluate(() => document.body.innerText);
  check("style: editor draft shows the suggested bio", draftBio.includes(x.bio.profile.bio.slice(0, 30)), "");
  check("style: nothing saved before Save Changes", (await db(p)).prefsB.linkInBio.palette === 3);
  await openPanel(p);
  await save(p);
  const l = (await db(p)).prefsB.linkInBio;
  check("style: saved via Save Changes", l.palette === 0 && l.bio === x.bio.profile.bio, JSON.stringify({ p: l.palette, b: l.bio }));
  r = await ask(p, "Suggest colors for my Link in Bio");
  check("style: already on brand colours → says so", /already uses your website's brand colours/.test(r), r);
  check("style: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ---- Ended event: replace with the upcoming one (native Event Ticketing item) ---- */
{
  const p = await fresh();
  const ev = (id, title, date, past) => ({ id, title, date, past, location: "Copper Ridge Base Lodge", description: "", image: null, time: "6:00 PM", timeZone: "US/Mountain", tzAbbr: "MST", ctas: [], maxPerPerson: 4, tickets: [{ id: id + "-t", name: "General", price: 25, quantity: 50, sold: 0 }], source: "creator" });
  await mutate(p, `d.monetize.events = [${JSON.stringify(ev("ev-old", "Fall Rail Jam", "2026-10-01T18:00:00Z", true))}, ${JSON.stringify(ev("ev-new", "Winter Opener Meetup", "2026-12-12T18:00:00Z", false))}];
    d.prefsB.linkInBio.actions.push({ id: "ba-oldev", kind: "event", title: "Rail Jam Tickets", url: "https://fans.ajwhite.com/dashboard/event-listing/ajwhite/ticket-purchase/ev-old" });`);
  const r = await ask(p, "Remove old event links");
  const x = await lastBio(p);
  const rep = x?.bio?.links.find((l) => l.existingId === "ba-oldev");
  check("event: ended event found", /Your previous event has ended\. Would you like to replace its link with your upcoming event\?/.test(r), r);
  check("event: replace with the upcoming event", rep?.op === "replace" && rep.refId === "ev-new", JSON.stringify(rep));
  await tap(p, /^apply these changes$/, 1500);
  await openPanel(p);
  await save(p);
  const a = (await lib(p)).find((y) => y.id === "ba-oldev");
  check("event: saved as a Specific Event Ticketing item", a?.kind === "event" && /ev-new/.test(a.url) && a.price === 25, JSON.stringify(a));
  await p.browserContext().close();
}

/* ---- An offering changes after the proposal; Save for later / Continue ---- */
{
  const p = await fresh();
  let r = await ask(p, "Promote my training session");
  const id = (await lastBio(p)).id;
  await tap(p, /^save for later$/, 500);
  check("pause: saved for later", (await lastBio(p)).status === "paused");
  await p.reload({ waitUntil: "networkidle0" });
  await sleep(1200);
  await openPanel(p);
  r = await ask(p, "Continue my Link in Bio");
  check("resume: same update shown after refresh, resumed", (await lastBio(p)).id === id && (await lastBio(p)).status === "draft" && /Link in Bio update/.test(r), r);
  await p.evaluate((k) => { const d = JSON.parse(localStorage.getItem(k)); d.monetize.products.find((x) => x.id === "exp-park").published = false; localStorage.setItem(k, JSON.stringify(d)); }, KEY);
  await p.reload({ waitUntil: "networkidle0" });
  await sleep(1200);
  await openPanel(p);
  await ask(p, "Continue my Link in Bio");
  const t = await tap(p, /^update my link in bio$/, 1200);
  check("changed offering: re-checked and left out before the editor", /isn't live any more/.test(t.r) && path(p) !== "/edit-preference/link-in-bio/add-link-in-bio", t.r);
  check("changed offering: nothing saved", !(await lib(p)).some((a) => /exp-park/.test(a.url ?? "") && a.id.startsWith("ba-")));
  await p.browserContext().close();
}

/* ---- Restricted content isn't linked publicly ---- */
{
  const p = await fresh();
  await mutate(p, (d) => { for (const x of d.social.posts) x.locked = true; });
  const r = await ask(p, "Add my latest post");
  check("locked posts: refuses to link", /don't have a public post to feature/.test(r) && !(await p.$('[data-testid="bio-review"]')), r);
  await p.browserContext().close();
}

/* ---- Scenario E: a week that promotes the experience, then the experience changes ---- */
{
  const p = await fresh();
  await ask(p, "Plan my week and help promote my upcoming experience", 1200);
  let items = (await db(p)).content.items;
  const w = items.find((x) => x.kind === "week");
  const kids = items.filter((x) => x.parentId === w?.id);
  const has = (k, re) => kids.some((x) => x.kind === k && (!re || re.test(x.label)));
  check("week: announcement, members-only post, newsletter, experience and Link in Bio as connected tasks", has("post", /announcement/i) && has("post", /members/i) && has("newsletter") && has("experience") && has("bio") && kids.length === 5, kids.map((x) => x.label).join(" | "));
  const exp = kids.find((x) => x.kind === "experience");
  const bio = kids.find((x) => x.kind === "bio");
  check("week: Link in Bio update depends on the experience, no invented URL", bio.deps.includes(exp.id) && bio.bio.links[0].url === null && bio.status === "needs-input");
  const r = await ask(p, "Rename the experience to Sunrise Park Session", 900);
  items = (await db(p)).content.items;
  const flagged = items.filter((x) => x.deps.includes(exp.id) && x.flags.some((f) => /renamed/.test(f))).map((x) => x.kind);
  check("week: rename flags dependents for review (not auto-edited)", ["post", "newsletter", "bio"].every((k) => flagged.includes(k)) && /marked/.test(r) && /didn't change/.test(r), `${flagged} | ${r.slice(0, 200)}`);
  await ask(p, "Move the experience to Sunday", 900);
  check("week: date change flags the Link in Bio update", (await db(p)).content.items.find((x) => x.id === bio.id).flags.some((f) => /moved to Sunday/.test(f)));
  const c = await ask(p, "Continue my Link in Bio", 900);
  check("week: resume opens the Link in Bio task", /waiting for the experience/.test(c), c);
  check("week: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ---- Demo 1: same page, no Demo 2 workflows ---- */
{
  const p = await fresh("setup-navigation");
  const r = await ask(p, "Add my social profiles");
  check("D1: no Link in Bio proposal", !(await p.$('[data-testid="bio-review"]')), r);
  await go(p, "/edit-preference/link-in-bio");
  check("D1: original Link in Bio page renders", !!(await p.$('[data-testid^="pref-lib-"]')));
  check("D1: Demo 2 work items not leaked", !(await p.evaluate(() => JSON.parse(localStorage.getItem("topfan-mock-v1:setup-navigation") || "null")?.content?.items?.some((x) => x.kind === "bio"))));
  await p.browserContext().close();
}

await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
