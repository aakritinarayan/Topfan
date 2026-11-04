// Demo 1 presenter script (docs/TOPFAN_EXACT_DEMO_PROMPTS.md), typed word for word into the real app:
// onboarding (domain → GoDaddy → DNS → verify → provisioning → Creator Quest), then the ten navigation prompts.
// Usage: node tests/e2e/script-demo1.mjs [--record] [--viewport=1126x797]   (BASE_URL=… for Vercel)
import { freshPage, journey, launch, sleep } from "./lib/journey.mjs";
const RECORD = process.argv.includes("--record");
const vpArg = (process.argv.find((a) => a.startsWith("--viewport=")) ?? "").split("=")[1];
const b = await launch(vpArg ? { width: +vpArg.split("x")[0], height: +vpArg.split("x")[1] } : undefined);
const p = await freshPage(b, "setup-navigation", { voice: "Take me to my wallet" });
const j = journey(p);
const TASKS = "topfan-tasks-v1:setup-navigation";
const DB = "topfan-mock-v1:setup-navigation";
const go = async (path) => { await p.goto(`${new URL(p.url()).origin}${path}${path.includes("?") ? "&" : "?"}noDelay=1`, { waitUntil: "networkidle0" }); await sleep(1300); };

const clickText = async (re, wait = 2600, scope = "button") => {
  const ok = await p.evaluate((src, sc) => { const x = [...document.querySelectorAll(sc)].filter((b) => b.offsetParent && !b.disabled).reverse().find((b) => new RegExp(src, "i").test(b.innerText.trim())); x?.click(); return !!x; }, re.source, scope);
  await sleep(wait);
  return ok;
};
const panel = () => j.text('[data-testid="ai-panel"]');
const rec = async (label) => RECORD && console.log(`--- ${label} @ ${j.path()}\n${(await panel()).replace(/\n+/g, " | ").slice(-700)}`);

/* ---------- Onboarding ---------- */
await p.evaluate(() => { window.open = (u) => ((window.__opened = u), null); });
j.check("O1: demo opens on account setup (Step 1 · Domain)", j.path() === "/edit-preference/whitelabel/setup/domain", j.path());
j.check("O1: welcome card", await clickText(/^let's get started$/));
j.check("O1: AI asks whether you already have a domain", /Do you already have a domain name\?/.test(await panel()));
// Existing-domain path: every supported provider stays in the dropdown.
const providers = await p.evaluate(() => { const s = document.querySelector("select"); return s ? [...s.options].map((o) => o.textContent.trim()) : []; });
const provBtn = await p.evaluate(() => [...document.querySelectorAll("button")].some((b) => /^Select Provider$/.test(b.innerText.trim())));
j.check("O2: existing-domain provider dropdown on the page", providers.length > 2 || provBtn, JSON.stringify(providers));
j.check("O3: 'No, help me find one'", await clickText(/^No, help me find one$/));
j.check("O3: 'Suggest names' (name prefilled from the profile)", await clickText(/^Suggest names$/, 3200));
let t = await panel();
j.check("O3: ideas marked Simulated, one recommended, one taken", /SIMULATED/.test(t) && /Recommended/.test(t) && /Taken/.test(t), t.slice(-500));
j.check("O3: no invented prices", !/\$\d/.test(t) && /Price shown at checkout/.test(t), t.slice(-500));
j.check("O4: Select the recommended domain", await clickText(/^select$/));
t = await panel();
j.check("O4: GoDaddy is the purchase provider offered by the AI", /Where to buy[\s\S]*GoDaddy/.test(t) && !/Namecheap/.test(t), t.slice(-400));
j.check("O4: Continue to purchase → GoDaddy search in a new tab", (await clickText(/^continue to purchase$/)) && /godaddy\.com\/domainsearch/.test(await p.evaluate(() => window.__opened)), await p.evaluate(() => window.__opened));
j.check("O4: never asks for passwords or cards", /I'll never ask for your password or card details/.test(await panel()));
j.check("O5: I'm back from GoDaddy → Yes, I purchased it → Confirm", (await clickText(/^I'm back from GoDaddy$/)) && (await clickText(/^Yes, I purchased it$/)) && (await clickText(/^confirm$/)));
j.check("O5: At GoDaddy (DNS provider)", await clickText(/^At GoDaddy$/));
j.check("O5: form filled: Next step Save & Continue", /Next step: Save & Continue/.test(await panel()));
await rec("domain filled");
j.check("O6: Save & Continue → DNS step", (await clickText(/^save & continue$/, 2500)) && j.path() === "/edit-preference/whitelabel/setup/dns", j.path());
t = await panel();
j.check("O6: AI offers to handle the DNS setup", /Want me to handle the DNS setup\?/.test(t), t.slice(-300));
await j.tap(/^prepare it for me$/, 700);
j.check("O7: GoDaddy connect dialog (Simulated, no password fields)", !!(await p.$('[data-testid="dns-setup"]')) && !(await p.$('[data-testid="dns-setup"] input')) && /SIMULATED/i.test(await j.text('[data-testid="dns-setup"]')));
await j.click("dns-continue", 1600);
j.check("O7: review the two DNS records", /Review your DNS changes/.test(await j.text('[data-testid="dns-setup"]')));
await j.click("dns-approve", 3000);
t = await j.text('[data-testid="dns-setup"]');
j.check("O7: prepared (simulated), not claimed as applied at GoDaddy", /DNS setup prepared/.test(t) && !/added (to|at) GoDaddy/i.test(t), t);
await j.click("dns-done", 700);
j.check("O8: Verify & Continue → provisioning", (await p.click('[data-field="verify"]').then(() => sleep(2800)).then(() => true)) && j.path() === "/edit-preference/whitelabel/setup/provisioning", j.path());
j.check("O8: Creator Quest offered while the site is set up", !!(await p.$('[data-field="creator-quest"]')) || /Creator Quest/i.test(await j.body()));
await rec("provisioning");
await clickText(/Simulate: finish provisioning/, 3400);
await clickText(/^go to my site$/, 1800);
j.check("O9: website complete → creator platform", !j.path().startsWith("/edit-preference/whitelabel/setup"), j.path());
const setupDone = await j.store(TASKS);

/* ---------- The ten navigation prompts ---------- */
const P = [];
const step = async (n, prompt, wait = 1300) => {
  const r = await j.say(prompt, wait);
  const s = { n, prompt, path: j.path(), reply: r.replace(/\s+/g, " ").trim(), buttons: await j.buttons() };
  P.push(s);
  if (RECORD) console.log(`\n### P${n}: ${prompt}\n  path: ${s.path}\n  reply: ${s.reply.slice(0, 700)}\n  buttons: ${JSON.stringify(s.buttons)}`);
  return s;
};
await go("/ajwhite");
await j.openPanel();
const has = (s, re) => re.test(s.reply);
const btn = (s, re) => s.buttons.some((x) => re.test(x));
let s = await step(1, "Help me set up my cover page using what TopFan already knows about me.");
j.check("P1: cover page editor, offers to prepare it from what TopFan knows", s.path === "/edit-preference/whitelabel-cover-page" && btn(s, /^PREPARE MY COVER PAGE$/) && btn(s, /^I'LL FILL IT MYSELF$/), JSON.stringify(s));
s = await step(2, "Help me customize my website branding and logo.");
j.check("P2: branding task: logo, colors and domain", has(s, /Brand your White Label Site/) && btn(s, /^OPEN WHITE LABEL SITE$/), JSON.stringify(s));
s = await step(3, "I want to change my website logo.");
j.check("P3: opens White Label Site; next is Customize Appearance", s.path === "/edit-preference/whitelabel" && btn(s, /^CUSTOMIZE APPEARANCE$/), JSON.stringify(s));
s = await step(4, "I want to change my account settings.");
j.check("P4: asks which settings", has(s, /Which settings/) && ["My profile", "My website", "Notifications", "Privacy & password"].every((x) => s.buttons.includes(x)), JSON.stringify(s));
await j.tap(/^My profile$/, 1400);
j.check("P4: My profile opens a settings page", /^\/edit-preference/.test(j.path()), j.path());
s = await step(5, "Take me to my wallet.");
j.check("P5: asks earnings or NFT wallet", btn(s, /^Earnings & withdrawals$/) && btn(s, /^NFT wallet/), JSON.stringify(s));
await j.tap(/^Earnings & withdrawals$/, 1400);
const walletPath = j.path();
j.check("P5: Earnings & withdrawals opens the wallet page", walletPath !== s.path, walletPath);
s = await step(6, "I want to start earning money from my fans. What options do I have?");
j.check("P6: earning categories, no invented numbers", btn(s, /^Memberships and exclusive content$/) && btn(s, /^Explore all earning options$/i) && !/\$\d/.test(s.reply), JSON.stringify(s));
s = await step(7, "I want to earn through brand collaborations. What should I focus on?");
j.check("P7: brand guidance (Advertisements, Portfolios, audience), not account health", has(s, /Advertisements/) && has(s, /Portfolio/) && has(s, /Insights & Fans/) && !has(s, /Outbound Email|refund/i), JSON.stringify(s));
j.check("P7: no fabricated brand offers", has(s, /can't see or promise any brand offers/), s.reply);
const groupsBefore = (await j.store(DB))?.prefsB?.groups?.length ?? 0;
s = await step(8, "Create a group called Inner Circle.");
j.check("P8: original Add Group form, Inner Circle filled in", s.path === "/edit-preference/groups/add" && (await j.val("pref-groups-title")) === "Inner Circle", `${s.path} ${await j.val("pref-groups-title")}`);
j.check("P8: nothing created before Save", ((await j.store(DB))?.prefsB?.groups?.length ?? 0) === groupsBefore);
s = await step(9, "Where can I see my fans and identify my most engaged supporters?");
j.check("P9: points to Fan Relationship Management", has(s, /Fan Relationship Management/) && btn(s, /^OPEN FAN RELATIONSHIP MANAGEMENT$/), JSON.stringify(s));
await j.tap(/^OPEN FAN RELATIONSHIP MANAGEMENT$/, 1400);
j.check("P9: Insights › Fan Relationship Management opens", j.path() === "/insights" && /fan-relationship-management/.test(j.url()), j.url());
s = await step(10, "Let's continue setting up my Inner Circle group.", 1800);
j.check("P10: resumes the Inner Circle task, back on Add Group", has(s, /Inner Circle/) && j.path() === "/edit-preference/groups/add", JSON.stringify(s) + j.path());
j.check("P10: the name is still filled in", (await j.val("pref-groups-title")) === "Inner Circle", await j.val("pref-groups-title"));
await j.click("pref-groups-submit", 1600);
const groups = (await j.store(DB))?.prefsB?.groups ?? [];
j.check("P10: Save creates exactly one Inner Circle group", groups.length === groupsBefore + 1 && groups.filter((g) => g.name === "Inner Circle").length === 1, JSON.stringify(groups.map((g) => g.name)));
j.check("no page errors", !p.errors.length, p.errors.join("\n"));

if (RECORD) {
  console.log(JSON.stringify(j.log, null, 1));
}
await b.close();
console.log(j.fails ? `${j.fails} FAILED` : "ALL PASSED");
process.exit(j.fails ? 1 : 0);
