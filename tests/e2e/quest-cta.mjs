import { freshPage, launch, sleep, BASE } from "./lib/journey.mjs";
const [w = 1512, h = 805, out = "/tmp/quest-cta"] = process.argv.slice(2);
// Play Creator Quest is the primary action: order, label, message, open/close, provisioning untouched.
const b = await launch({ width: +w, height: +h });
const p = await freshPage(b, "setup-navigation");
await p.goto(`${BASE}/edit-preference/whitelabel/setup/provisioning?noDelay=1`, { waitUntil: "networkidle0" });
await sleep(2000);
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
const geo = await p.evaluate(() => {
  const y = (el) => el && el.getBoundingClientRect().top;
  const h2 = [...document.querySelectorAll("h2")].find((e) => /Setting up your website/.test(e.textContent));
  const btn = document.querySelector('[data-quest="play"]');
  const tr = document.querySelector('ol[aria-label^="Provisioning progress"]');
  const guide = [...document.querySelectorAll("a")].find((a) => a.textContent.trim() === "Onboarding Guide");
  const r = btn?.getBoundingClientRect();
  return { h2: y(h2), btn: y(btn), tr: y(tr), guide: y(guide), bh: r?.height, label: btn?.textContent.trim(), bg: btn && getComputedStyle(btn).backgroundColor,
    msg: document.querySelector('[data-quest="entry"] p')?.textContent, wait: document.body.innerText.includes("While you wait"),
    steps: [...document.querySelectorAll('ol[aria-label^="Provisioning progress"] li')].map((l) => l.getAttribute("aria-label")).join("|") };
});
console.log(JSON.stringify(geo));
ok(geo.h2 < geo.btn && geo.btn < geo.tr, "order heading<button<stepper");
ok(geo.guide == null, "no Onboarding Guide link");
ok(geo.label === "Play Creator Quest", "label");
ok(geo.msg === "Your site is getting ready. Explore TopFan while you wait.", "message");
ok(!geo.wait, "old While you wait line gone");
ok(geo.bh >= 48, "comfortable height");
await p.screenshot({ path: out + "-top.png" });
// focus state
await p.focus('[data-quest="play"]'); await p.keyboard.press("Shift"); 
await p.click('[data-quest="play"]');
await sleep(600);
ok(await p.$('[data-quest="select"]'), "quest opened");
const stepsDuring = await p.evaluate(() => [...document.querySelectorAll('ol[aria-label^="Provisioning progress"] li')].map((l) => l.getAttribute("aria-label")).join("|"));
ok(stepsDuring === geo.steps, "provisioning progress unchanged while playing");
ok(new URL(p.url()).pathname.endsWith("/provisioning"), "still on provisioning");
await p.screenshot({ path: out + "-open.png" });
// close the quest and return
await p.evaluate(() => [...document.querySelectorAll('[data-quest="select"] button')].find((b) => /close|back|later/i.test(b.textContent))?.click());
await sleep(600);
ok(await p.$('[data-quest="play"]'), "back to entry after closing");
// finish provisioning while playing → held notice
await p.click('[data-quest="play"]'); await sleep(400);
await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => /Simulate: finish provisioning/.test(b.textContent))?.click());
await sleep(1500);
ok(await p.$("[data-site-ready]"), "site-ready notice while in quest");
await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => /Continue to my site/.test(b.textContent))?.click());
await sleep(2500);
const end = await p.evaluate(() => ({ prov: document.querySelector("[data-provisioning]")?.getAttribute("data-provisioning"), path: location.pathname, txt: document.body.innerText.includes("Your website is ready") }));
console.log(JSON.stringify(end));
ok(end.prov === "complete" || /manage|whitelabel/.test(end.path), "correct status after returning");
await b.close();
console.log(fails.length ? "FAIL " + fails.join("; ") : "PASS");
if (fails.length) process.exit(1);
