// Saved demo data from before media existed (avatar null, posts without media src, no mediaSeed) gets the seed
// media once on load; after that, a creator clearing their avatar stays cleared. Dev server on :5173.
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1512, height: 805 } });
const p = await b.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : x); if (!ok) fails++; };
const base = "http://localhost:5173";
await p.goto(`${base}/?noDelay=1&resetMock=1`, { waitUntil: "networkidle0" });
await sleep(500);
// Build "old" saved data.
await p.evaluate(() => {
  const d = JSON.parse(localStorage.getItem("topfan-mock-v1"));
  delete d.mediaSeed;
  d.account.avatar = null;
  delete d.account.cover;
  d.account.bio = "Edited bio kept";
  for (const post of d.social.posts) post.media = (post.media ?? []).map(({ kind, placeholder }) => ({ kind, placeholder }));
  for (const prod of d.monetize.products) prod.image = null;
  localStorage.setItem("topfan-mock-v1", JSON.stringify(d));
});
const state = () => p.evaluate(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
  return {
    sidebarAvatar: [...document.images].filter(vis).filter((i) => /creators\/ajwhite\/avatar/.test(i.src)).length,
    placeholders: [...document.querySelectorAll('[aria-label$=" placeholder"]')].filter(vis).length,
    userIcons: [...document.querySelectorAll(".bg-placeholder-img")].filter((e) => vis(e) && !e.querySelector("img,video") && e.querySelector("svg.lucide-user")).length,
  };
});
await p.goto(`${base}/ajwhite?noDelay=1`, { waitUntil: "networkidle0" });
await sleep(700);
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
await sleep(400);
const s = await state();
check("old data: AJ avatar restored", s.sidebarAvatar >= 2, JSON.stringify(s));
check("old data: no placeholders or generic avatars on Feed", s.placeholders === 0 && s.userIcons === 0, JSON.stringify(s));
const d = await p.evaluate(() => JSON.parse(localStorage.getItem("topfan-mock-v1")));
check("creator edits kept", d.account.bio === "Edited bio kept", d.account.bio);
await p.goto(`${base}/ajwhite/store?noDelay=1`, { waitUntil: "networkidle0" });
await sleep(600);
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } });
await sleep(400);
const st = await state();
check("old data: store product images restored", st.placeholders === 0, JSON.stringify(st));

// After migration is recorded, a deliberately cleared avatar stays cleared.
await p.evaluate(() => {
  const d = JSON.parse(localStorage.getItem("topfan-mock-v1"));
  d.mediaSeed = 1;
  d.account.avatar = null;
  localStorage.setItem("topfan-mock-v1", JSON.stringify(d));
});
await p.goto(`${base}/ajwhite?noDelay=1`, { waitUntil: "networkidle0" });
await sleep(600);
check("migrated data: cleared avatar is respected", (await state()).sidebarAvatar === 0);
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await b.close();
process.exit(fails ? 1 : 0);
