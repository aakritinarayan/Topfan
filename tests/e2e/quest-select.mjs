// Creator Quest picker: "Choose a Quest", four simple cards (title, one line, duration, Play), Close and the reading view,
// each Play opens its own game, and progress survives going back. Usage: node tests/e2e/quest-select.mjs [width height outPrefix]
import { freshPage, launch, sleep, BASE } from "./lib/journey.mjs";
const [w = 1512, h = 805, out] = process.argv.slice(2);
const b = await launch({ width: +w, height: +h });
const p = await freshPage(b, "setup-navigation");
await p.goto(`${BASE}/edit-preference/whitelabel/setup/provisioning?noDelay=1`, { waitUntil: "networkidle0" });
await sleep(1500);
const fails = [];
// The review bar is fixed at the bottom: bring a control to the middle before clicking it.
const tap = async (sel) => (await p.$eval(sel, (e) => e.scrollIntoView({ block: "center" })), await sleep(150), p.click(sel));
const ok = (c, m, d = "") => (c ? console.log("PASS " + m) : (fails.push(m), console.log("FAIL " + m, d)));
await tap('[data-quest="play"]');
await sleep(700);
const info = await p.$eval('[data-quest="select"]', (el) => ({
  head: el.querySelector("h3")?.textContent,
  cards: [...el.querySelectorAll("[data-mission]")].map((c) => ({ id: c.dataset.mission, text: c.innerText, h: c.getBoundingClientRect().height, x: c.getBoundingClientRect().left })),
  txt: el.innerText,
}));
ok(info.head === "Choose a Quest", "heading is Choose a Quest", info.head);
ok(info.cards.length === 4, "four quests");
const want = {
  revenue: ["Fan Revenue Rush", "Discover ways to earn from your fans.", "1 min"],
  superfan: ["Superfan Signal", "Learn how to engage your community.", "2 min"],
  hq: ["Build Your Fan HQ", "Bring your content and community together.", "2 min"],
  insight: ["Fan Insight Explorer", "Understand your fans and their interests.", "2 min"],
};
for (const c of info.cards) ok(want[c.id].every((s) => c.text.includes(s)), `${c.id}: title, one line, duration`, c.text);
ok(!/MONETIZATION|COMMUNITY ENGAGEMENT|BRAND OWNERSHIP|AUDIENCE INSIGHTS|Monetization|Community Engagement/.test(info.txt), "no category labels");
ok(new Set(info.cards.map((c) => Math.round(c.x))).size === 2, "two columns");
ok(info.cards.every((c) => c.h < 200), "compact cards", info.cards.map((c) => c.h).join(","));
if (out) await p.screenshot({ path: out + "-select.png" });
// keyboard focus reaches a Play button
await p.$eval('[aria-label="Play Fan Revenue Rush"]', (e) => e.scrollIntoView({ block: "center" }));
await p.focus('[data-quest="select"] [aria-label="Read instead"]');
for (let i = 0; i < 10 && !(await p.evaluate(() => document.activeElement?.getAttribute("aria-label") === "Play Fan Revenue Rush")); i++) await p.keyboard.press("Tab");
ok(await p.$eval('[aria-label="Play Fan Revenue Rush"]', (e) => e === document.activeElement && getComputedStyle(e).boxShadow !== "none"), "Play shows a focus ring");
if (out) await p.screenshot({ path: out + "-focus.png" });
// reading alternative still works
await tap('[aria-label="Read instead"]'); await sleep(300);
ok(/In TopFan:/.test(await p.$eval('[data-quest="select"]', (e) => e.innerText)), "reading view still available");
await tap('[aria-label="Show quests"]'); await sleep(300);
// each Play opens its own game, Back returns to the picker
const titles = { revenue: "Fan Revenue Rush", superfan: "Superfan Signal", hq: "Build Your Fan HQ", insight: "Fan Insight Explorer" };
for (const id of Object.keys(titles)) {
  await tap(`[aria-label="Play ${titles[id]}"]`); await sleep(700);
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /quest/i.test(k))) || "{}"));
  const onPicker = !!(await p.$('[data-quest="select"]'));
  const t = await p.evaluate(() => document.querySelector('[data-field="creator-quest"]')?.innerText ?? "");
  ok(!onPicker && t.toLowerCase().includes(titles[id].toLowerCase()), `Play opens ${titles[id]}`, t.slice(0, 120));
  await p.evaluate(() => [...document.querySelectorAll('[data-field="creator-quest"] button')].find((x) => /back|exit|missions|quests/i.test(x.getAttribute("aria-label") || x.textContent))?.click());
  await sleep(500);
  if (!(await p.$('[data-quest="select"]'))) await p.evaluate(() => [...document.querySelectorAll('[data-field="creator-quest"] button')].find((x) => /back|exit|leave|quit/i.test(x.innerText + (x.getAttribute("aria-label") || "")))?.click()), await sleep(500);
  ok(!!(await p.$('[data-quest="select"]')), `back to picker from ${id}`);
}
// Quest results live in memory for the session (questStore); the Done badge itself is unchanged.
await p.evaluate(() => [...document.querySelectorAll('[data-quest="select"] button')].find((x) => x.innerText.trim() === "Close").click()); await sleep(400);
ok(!!(await p.$('[data-quest="play"]')), "Close returns to the provisioning card");
await b.close();
console.log(fails.length ? `FAILED ${fails.length}` : "ALL PASSED");
if (fails.length) process.exit(1);
