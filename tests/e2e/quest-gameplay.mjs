// Creator Quest gameplay feedback, all four games: collecting (score once, token removed, +points, pop),
// obstacles (reaction, penalty once, recovery), milestones (toast), completion (achievement, score,
// objectives, saved), Next quest / Replay, champion, refresh, mute, keyboard, reduced motion, and
// provisioning finishing mid-game. Uses the dev-only window.__quest hook, so run against `npm run dev`.
// Usage: node tests/e2e/quest-gameplay.mjs [width height]
import { freshPage, launch, sleep, BASE } from "./lib/journey.mjs";
const [w = 1512, h = 805] = process.argv.slice(2);
const b = await launch({ width: +w, height: +h });
const p = await freshPage(b, "setup-navigation");
let fails = 0;
const pageErrors = [];
p.on("pageerror", (e) => pageErrors.push(e.message));
const ok = (c, m, d = "") => (c ? console.log("PASS " + m) : (fails++, console.log("FAIL " + m, d)));
const S = (fn, arg) => p.evaluate(fn, arg);
const st = () => S(() => window.__quest.state);
const frames = (ms = 120) => sleep(ms);
const click = (re) => S((src) => { const r = new RegExp(src, "i"); const x = [...document.querySelectorAll("button")].find((b) => r.test((b.getAttribute("aria-label") || "") + " " + b.innerText)); x?.scrollIntoView({ block: "center" }); x?.click(); return !!x; }, re.source);
const score = () => S(() => +document.querySelector("[data-quest-score]")?.textContent);
const toast = () => S(() => document.querySelector("[data-quest-toast]")?.textContent ?? "");
const mascot = () => S(() => document.querySelector("[data-mascot-state]")?.dataset.mascotState);

await p.goto(`${BASE}/edit-preference/whitelabel/setup/provisioning?noDelay=1`, { waitUntil: "networkidle0" });
await sleep(1500);
await click(/^ ?Play Creator Quest/);
await sleep(600);

/* ---------- 1. Fan Revenue Rush ---------- */
await click(/Play Fan Revenue Rush/);
await sleep(500);
ok(await S(() => !!document.querySelector("[data-quest-intro]")), "Revenue: short start instruction shown");
await sleep(1500); // ready → run
ok((await st()).phase === "run", "Revenue: running");
let s0 = await score();
// collectible: put one token on the mascot
await S(() => { const s = window.__quest.state; const t = s.tokens.find((t) => !t.got && t.x > s.body.x + 200); t.x = s.body.x; t.h = s.body.y + 15; window.__tk = t; });
await frames();
let r = await S(() => { const s = window.__quest.state; return { got: !!window.__tk.got, inv: s.inv, floats: s.fx.floats.map((f) => f.text), flies: s.fx.flies.length, parts: s.fx.parts.length, mood: s.body.mood, glow: s.body.glowT }; });
ok(r.got && r.floats.includes("+10") && r.parts > 0, "Revenue collect: token taken, +10 float, sparkle", JSON.stringify(r));
ok(r.mood === "collect" || r.glow > 0, "Revenue collect: mascot happy + glow", r.mood);
ok((await score()) === s0 + 10, "Revenue collect: score +10", `${s0} → ${await score()}`);
await frames(400);
ok((await score()) === s0 + 10, "Revenue collect: no double count");
// milestone at 5 offer ideas
await S(() => { const s = window.__quest.state; let n = s.inv.exclusive + s.inv.merch + s.inv.experience; for (const t of s.tokens) { if (n >= 5) break; if (!t.got && t.x > s.body.x + 200) { t.x = s.body.x + (5 - n) * 3; t.h = s.body.y + 15; n++; } } });
await frames(250);
ok(/5 offer ideas/.test(await toast()), "Revenue milestone: '5 offer ideas!' toast", await toast());
// obstacle
s0 = await score();
await S(() => { const s = window.__quest.state; s.body.y = 0; s.body.vy = 0; s.body.grounded = true; s.body.crouch = 0; const r = s.rocks.find((r) => !r.hit && r.x > s.body.x + 100); r.x = s.body.x - r.rock.w / 2; window.__rock = r; });
await frames(80);
r = await S(() => { const s = window.__quest.state; return { hits: s.hits, mood: s.body.mood, stumble: s.body.stumble, shake: s.fx.shake, floats: s.fx.floats.map((f) => f.text) }; });
ok(r.hits === 1 && r.mood === "hit" && r.stumble > 0, "Revenue hit: one hit, dizzy mascot, stumble", JSON.stringify(r));
ok(r.floats.includes("−5") && r.shake > 0, "Revenue hit: −5 float and a brief shake", JSON.stringify(r));
ok(/collision|recovering/.test(await mascot()), "Revenue hit: mascot state collision/recovering", await mascot());
ok((await score()) === s0 - 5, "Revenue hit: score −5");
await frames(900);
ok((await st()).hits === 1, "Revenue hit: no repeated damage");
ok(!/collision/.test(await mascot()), "Revenue hit: recovered", await mascot());
// checkpoint → decide → resolve → finish
await S(() => { const s = window.__quest.state; s.dist = 3300 - 90 - 1; s.body.y = 0; s.body.grounded = true; });
await frames(200);
ok(/Checkpoint reached/.test(await toast()), "Revenue: 'Checkpoint reached!' at the station", await toast());
await sleep(900);
const best = await S(() => ["Exclusive content", "Merchandise", "Fan experiences"][["exclusive", "merch", "experience"].indexOf(({ 0: "exclusive", 1: "merch", 2: "experience" })[window.__quest.state.scenario])]);
await click(new RegExp("^ ?" + best));
await frames(300);
ok((await st()).fx.parts.length > 20, "Revenue: matching offer triggers confetti");
await click(/Finish mission/);
await sleep(700);
let res = await S(() => document.querySelector('[data-quest="result"]')?.innerText ?? "");
ok(/Quest Complete!/.test(res) && /Revenue Explorer/.test(res), "Revenue result: Quest Complete! + Revenue Explorer", res.slice(0, 200));
ok(/Score \d+/.test(res) && /offer ideas collected/.test(res) && /Reached the fan request/.test(res), "Revenue result: score + objectives");
ok(/Creator Quest points/.test(res), "Revenue result: points labelled as Creator Quest points only");
ok(await S(() => Object.keys(JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith("topfan-quest-v1"))) || "{}").results || {}).includes("revenue")), "Revenue: progress saved");

/* ---------- 2. Superfan Signal (via Play next quest) ---------- */
await click(/Play next quest/);
await sleep(700);
ok(await S(() => document.querySelector("[data-quest-game]")?.dataset.questGame === "Superfan Signal"), "Next quest opens Superfan Signal");
// keyboard moves the mascot
await p.keyboard.down("ArrowRight"); await sleep(250); await p.keyboard.up("ArrowRight");
ok((await st()).body.x > 362, "Superfan: keyboard moves the mascot", (await st()).body.x);
const STN = { bts: [95, 78], live: [360, 238], updates: [625, 78] };
const deliver = (kind, at) => S(([kind, x, hh]) => { const s = window.__quest.state; s.carry = kind; Object.assign(s.body, { x, y: hh, vy: 0, vx: 0, grounded: true, on: null, crouch: 0 }); window.__quest.input.interact = true; }, [kind, ...STN[at]]);
// pickup (collision)
await S(() => { const s = window.__quest.state; Object.assign(s.body, { y: 0, grounded: true, on: null }); const g = s.signals[0]; g.x = s.body.x; g.h = s.body.y + 15; });
await frames();
r = await S(() => { const s = window.__quest.state; return { carry: s.carry, parts: s.fx.bursts, n: s.signals.length }; });
ok(!!r.carry && r.parts > 0, "Superfan: signal picked up with sparkle", JSON.stringify(r));
s0 = await score();
const kind = (await st()).carry;
await deliver(kind, kind);
await frames(200);
r = await st();
ok(r.made === 1 && (await score()) === s0 + 100, "Superfan: delivery +100", `${s0} → ${await score()}`);
ok(/Fan group connected/.test(await toast()), "Superfan: first group milestone toast", await toast());
// wrong group
const wrongAt = kind === "bts" ? "live" : "bts";
s0 = await score();
await deliver(kind, wrongAt);
await frames(120);
r = await st();
ok(r.wrong === 1 && r.body.mood === "sad" && (await score()) === s0 - 10, "Superfan: wrong group → sad mascot, −10", JSON.stringify({ wrong: r.wrong, mood: r.body.mood }));
for (const k of ["bts", "live", "updates", "bts", "live"]) { await deliver(k, k); await frames(150); if ((await st()).made === 3) ok(/Halfway/.test(await toast()), "Superfan: 'Halfway there!' at 3", await toast()); }
r = await st();
ok(r.made === 6 && r.body.celebrate, "Superfan: all 6 delivered, celebrating");
ok(!(await S(() => !!document.querySelector('[role="dialog"][aria-label="Community result"]'))), "Superfan: celebration plays before the result card");
await sleep(1600);
await click(/Finish mission/);
await sleep(600);
res = await S(() => document.querySelector('[data-quest="result"]')?.innerText ?? "");
ok(/Community Connector/.test(res) && /All 3 fan groups reached/.test(res), "Superfan result: Community Connector + objectives", res.slice(0, 160));
// Replay
await click(/^ ?Replay/);
await sleep(600);
r = await st();
ok(r.made === 0 && (await S(() => document.querySelector("[data-quest-game]")?.dataset.questGame)) === "Superfan Signal", "Replay restarts Superfan Signal fresh");
await click(/Back to missions/);
await sleep(500);

/* ---------- 3. Build Your Fan HQ ---------- */
await click(/Play Build Your Fan HQ/);
await sleep(700);
const land = (x, hh) => S(([x, hh]) => Object.assign(window.__quest.state.body, { x, y: hh + 6, vy: 0, vx: 0, grounded: false, on: null, crouch: 0 }), [x, hh]);
s0 = await score();
// rock
await S(() => { const s = window.__quest.state; const r = s.rocks[1]; Object.assign(s.body, { x: r.x + r.rock.w / 2, y: 0, vy: 0, grounded: true, on: null, face: 1 }); });
await frames(80);
r = await st();
ok(r.stumbles === 1 && r.body.mood === "hit" && r.fx.floats.some((f) => f.text === "−10"), "HQ rock: dizzy, −10", JSON.stringify({ st: r.stumbles, mood: r.body.mood }));
await S(() => { const s = window.__quest.state; const r = s.rocks[1]; Object.assign(s.body, { x: r.x + r.rock.w / 2, y: 0, vy: 0, vx: 0, grounded: true }); });
await frames(120);
ok((await st()).stumbles === 1, "HQ rock: protected from an instant second hit");
for (const [x, hh, name] of [[255, 82, "Content"], [90, 170, "Community"], [1245, 82, "Fan experiences"]]) {
  await land(x, hh); await frames(250);
  await S(() => (window.__quest.input.interact = true)); await frames(150);
  if (name === "Fan experiences") ok(/New path unlocked/.test(await toast()), "HQ: store path unlock toast", await toast());
}
s0 = await score();
await land(1410, 170); await frames(250);
await S(() => (window.__quest.input.interact = true)); await frames(150);
ok((await S(() => document.querySelectorAll("[data-quest-score]").length)) === 1, "HUD: exactly one score counter");
ok((await score()) === s0 + 100 && /Path to your HQ opened/.test(await toast()), "HQ: 4th link +100 and milestone", `${s0} → ${await score()} ${await toast()} ${JSON.stringify(await S(() => { const s = window.__quest.state; return { st: s.stumbles, hub: s.hubAt, n: Object.keys(s.active).length, x: s.body.x, rocks: s.rocks.map((r) => Math.round(r.x)) }; }))}`);
await land(765, 250); await frames(300);
r = await st();
ok(!!r.hubAt && r.fx.parts.length > 20, "HQ: reaching the hub → confetti");
await sleep(1600);
await click(/Finish mission/);
await sleep(600);
res = await S(() => document.querySelector('[data-quest="result"]')?.innerText ?? "");
ok(/Fan HQ Builder/.test(res) && /4 of 4 activities linked/.test(res), "HQ result: Fan HQ Builder + objectives", res.slice(0, 160));

/* ---------- 4. Fan Insight Explorer ---------- */
await click(/Play next quest/);
await sleep(700);
ok(await S(() => document.querySelector("[data-quest-game]")?.dataset.questGame === "Fan Insight Explorer"), "Next quest opens Fan Insight Explorer (the one left)");
for (let i = 0; i < 7; i++) {
  await S(() => { const s = window.__quest.state; const g = s.signals.find((g) => !g.got); Object.assign(s.body, { y: 0, grounded: true, on: null }); g.x = s.body.x; g.h = 15; });
  await frames(150);
  if (i === 4) ok(/Pattern unlocked/.test(await toast()), "Insight: 'Pattern unlocked!' at 5", await toast());
}
ok(/All signals found/.test(await toast()), "Insight: 'All signals found!' at 7", await toast());
ok((await st()).phase === "explore", "Insight: celebration before the pattern opens");
await sleep(1400);
await click(/Publish another detailed tutorial/);
await frames(300);
ok((await st()).fx.parts.length > 20, "Insight: evidence-based choice → confetti");
await click(/Finish mission/);
await sleep(600);
res = await S(() => document.querySelector('[data-quest="result"]')?.innerText ?? "");
ok(/Insight Hunter/.test(res) && /7 of 7 signals found/.test(res), "Insight result: Insight Hunter + objectives", res.slice(0, 160));
ok(/Creator Quest Champion/.test(res) && /Continue setup/i.test(res), "All four done: Creator Quest Champion + Continue setup");

/* ---------- picker, refresh, persistence ---------- */
await click(/Back to quests/);
await sleep(400);
let pick = await S(() => document.querySelector('[data-quest="select"]').innerText);
ok(/Creator Quest Champion/.test(pick) && ["Revenue Explorer", "Community Connector", "Fan HQ Builder", "Insight Hunter"].every((a) => pick.includes(a)) && /Best \d+/.test(pick), "Picker: champion strip, achievements and best scores");
await p.reload({ waitUntil: "networkidle0" });
await sleep(1500);
await click(/^ ?Play Creator Quest/);
await sleep(600);
pick = await S(() => document.querySelector('[data-quest="select"]')?.innerText ?? "");
ok(/Creator Quest Champion/.test(pick) && /Insight Hunter/.test(pick), "After refresh: achievements still shown");

/* ---------- mute, reduced motion, provisioning finishing mid-game ---------- */
await click(/Play Fan Revenue Rush/);
await sleep(400);
await click(/Mute sound/);
ok(await S(() => localStorage.getItem("topfan-quest-sound") === "off" && !!document.querySelector('[aria-label="Turn sound on"]')), "Mute: sound off and remembered");
await click(/Turn sound on/);
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await click(/Restart/);
await sleep(1700);
// the loop reads reduced motion at mount; re-enter the game to pick it up
await click(/Back to missions/); await sleep(300); await click(/Play Fan Revenue Rush/); await sleep(1700);
await S(() => { const s = window.__quest.state; const r = s.rocks.find((r) => r.x > s.body.x + 100); Object.assign(s.body, { y: 0, grounded: true }); r.x = s.body.x - r.rock.w / 2; });
await frames(60);
r = await st();
ok(r.fx.reduced && r.fx.parts.length <= 3 && r.fx.shake === 0, "Reduced motion: few particles, no shake", JSON.stringify({ n: r.fx.parts.length, shake: r.fx.shake }));
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await S(() => (window.__mark = window.__quest.state));
await click(/Simulate: finish provisioning/);
await sleep(1500);
ok(await S(() => window.__mark === window.__quest?.state && !!document.querySelector("[data-quest-game]")), "Provisioning finished mid-game: same game keeps running, not reset");
ok(await S(() => !!document.querySelector("[data-site-ready]")), "Provisioning finished mid-game: quiet 'website is ready' notice");
const overflow = await S(() => document.documentElement.scrollWidth > innerWidth + 1);
ok(!overflow, "No horizontal overflow");
ok(pageErrors.length === 0, "No page errors", pageErrors.join(" | "));

await b.close();
console.log(fails ? `FAILED ${fails}` : "ALL PASSED");
if (fails) process.exit(1);
