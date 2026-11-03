// Assistant GoDaddy DNS setup (simulated): connect → review → processing → success → Verify & Continue;
// cancel/back/retry, manual route, refresh mid-process, no duplicate writes, every error message.
// Usage: node tests/e2e/dns-setup.mjs   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const DNS = "/edit-preference/whitelabel/setup/dns";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1512, height: 805 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 400)); if (!ok) fails++; };

async function open(query = "") {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(String(e)));
  p.on("console", (m) => m.type() === "error" && p.errors.push(m.text()));
  await p.goto(`${BASE}${DNS}?resetMock=1&noDelay=1${query}`, { waitUntil: "networkidle0" });
  await sleep(2200);
  return p;
}
const path = (p) => new URL(p.url()).pathname;
const msgs = (p) => p.$$eval('[data-msg="assistant"]', (x) => x.map((m) => m.innerText));
const lastMsgs = async (p, n = 3) => (await msgs(p)).slice(-n).join("\n");
const tap = (p, re) =>
  p.evaluate((src) => {
    const x = [...document.querySelectorAll('[data-testid="ai-panel"] button')].reverse().find((b) => new RegExp(src, "i").test(b.innerText.trim()));
    x?.click();
    return x?.innerText.trim() ?? null;
  }, re.source);
const step = (p) => p.evaluate(() => document.querySelector('[data-testid="dns-setup"]')?.dataset.step ?? null);
const setup = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("topfan-setup-v1") || "null"));
const click = async (p, id, wait = 400) => { await p.waitForSelector(`[data-testid="${id}"]`, { timeout: 5000 }); await p.click(`[data-testid="${id}"]`); await sleep(wait); };
const modalText = (p) => p.evaluate(() => document.querySelector('[data-testid="dns-setup"]')?.innerText ?? "");

// Happy path
{
  const p = await open();
  const entry = await lastMsgs(p, 3);
  check("entry: exact title and body", /Want me to handle the DNS setup\?/.test(entry) && /These records connect your domain to your TopFan website\. I can help you add them without needing to configure everything manually\./.test(entry), entry);
  check("entry: Prepare it for me + Walk me through it", /PREPARE IT FOR ME/i.test(entry) && /WALK ME THROUGH IT/i.test(entry));

  await tap(p, /^prepare it for me$/);
  await sleep(500);
  let t = await modalText(p);
  check("connect: exact copy", (await step(p)) === "connect" && /Connect your GoDaddy account/.test(t) && /Sign in through GoDaddy to let TopFan prepare your domain's DNS records\. You'll review the changes before anything is added\./.test(t) && /Your password stays with GoDaddy\. TopFan only requests the access needed for this setup\./.test(t), t);
  check("connect: Simulated label, Continue to GoDaddy, Cancel", /SIMULATED/i.test(t) && /CONTINUE TO GODADDY/i.test(t) && /CANCEL/i.test(t));
  check("connect: no credential fields", !(await p.$('[data-testid="dns-setup"] input')));
  const overlay = await p.evaluate(() => getComputedStyle(document.querySelector('[data-testid="dns-setup"]').parentElement).backgroundColor);
  check("darker overlay (85% black)", /rgba\(0, 0, 0, 0\.85\)/.test(overlay), overlay);
  const box = await p.evaluate(() => { const r = document.querySelector('[data-testid="dns-setup"]').getBoundingClientRect(); return { dx: Math.abs(r.x + r.width / 2 - innerWidth / 2), dy: Math.abs(r.y + r.height / 2 - innerHeight / 2) }; });
  check("modal centered", box.dx < 2 && box.dy < 2, JSON.stringify(box));

  await click(p, "dns-continue", 200);
  check("authorizing: simulated, buttons disabled", (await step(p)) === "authorizing" && (await p.$eval('[data-testid="dns-continue"]', (x) => x.disabled)));
  await sleep(1400);
  t = await modalText(p);
  check("review: exact copy", (await step(p)) === "review" && /Review your DNS changes/.test(t) && /TopFan needs to add two DNS records to connect your domain\. Review them before approving\./.test(t) && /Only the displayed records are included in this request\. Existing unrelated records will not be changed\./.test(t), t);
  // The review shows exactly the records on the DNS page (not example values).
  const pageRecs = await p.$$eval('[data-field^="record"] input, [data-field^="record"] [data-copy-value], [data-field^="record"]', (x) => x.map((e) => (e.value ?? e.innerText).trim()));
  const rows = await p.$$eval('[data-testid="dns-review-record"]', (x) => x.map((r) => [...r.querySelectorAll("td")].map((d) => d.innerText.trim())));
  const domain = await p.$eval('[data-testid="dns-review-domain"]', (x) => x.innerText);
  const st = await setup(p);
  check("review: configured domain", domain === st.domainName, `${domain} vs ${st.domainName}`);
  check("review: two CNAME records, type/host/destination", rows.length === 2 && rows.every((r) => r[0] === "CNAME" && r[1] && r[2]), JSON.stringify(rows));
  check("review: same host and value as the DNS page", rows.every((r) => pageRecs.join(" ").includes(r[1]) && pageRecs.join(" ").includes(r[2])), JSON.stringify({ rows, pageRecs }));
  check("review: host follows the configured sub-domain", rows[0][1] === st.subdomain, `${rows[0][1]} vs ${st.subdomain}`);

  // Back goes to Connect; continue again.
  await click(p, "dns-back");
  check("review: Back → Connect", (await step(p)) === "connect");
  await click(p, "dns-continue", 1500);

  // Approve: processing, Approve disabled; extra clicks don't start another write.
  await click(p, "dns-approve", 100);
  await p.evaluate(() => { const x = document.querySelector('[data-testid="dns-approve"]'); x?.click(); x?.click(); });
  await sleep(300);
  t = await modalText(p);
  check("processing: exact copy + simulated note", (await step(p)) === "processing" && /Setting up your DNS records/.test(t) && /I'm preparing the two records needed to connect your domain to TopFan\./.test(t) && /Simulated setup\. No changes are being made to GoDaddy\./.test(t), t);
  check("processing: Approve disabled, no close control", (await p.$eval('[data-testid="dns-approve"]', (x) => x.disabled)) && !(await p.$('[data-testid="dns-setup"] [aria-label="Close"]')));
  await p.keyboard.press("Escape");
  await sleep(100);
  check("processing: Escape doesn't close", (await step(p)) === "processing");
  check("processing: state is 'processing' (not prepared, not verified)", (await setup(p)).dnsSetup === "processing" && !(await setup(p)).recordsVerified);
  await sleep(2700);
  t = await modalText(p);
  check("success: exact copy + Simulated label", (await step(p)) === "success" && /DNS setup prepared/.test(t) && /Your demo DNS configuration is ready\. Return to TopFan to verify the connection\./.test(t) && /SIMULATED/i.test(t), t);
  check("success: no claim that GoDaddy records were changed", !/records (were )?added at GoDaddy|added to GoDaddy|GoDaddy (was|has been) updated/i.test(t));
  const s1 = await setup(p);
  check("prepared, not yet verified", s1.dnsSetup === "prepared" && !s1.recordsVerified, JSON.stringify(s1));
  await sleep(2600);
  check("one approval → one setup (no second run)", (await setup(p)).dnsSetup === "prepared" && (await step(p)) === "success");

  const before = (await msgs(p)).length;
  await click(p, "dns-done", 600);
  const after = (await msgs(p)).slice(before).join("\n");
  check("done: modal closed, still on the DNS step", !(await p.$('[data-testid="dns-setup"]')) && path(p) === DNS, path(p));
  check("done: exact follow-up messages", /I've completed the simulated DNS setup\. The next step is to verify that your domain points to TopFan\./.test(after) && /Use Verify & Continue to check the connection\./.test(after), after);
  check("done: Verify & Continue kept on the page", /VERIFY & CONTINUE/i.test(await p.$eval('[data-field="verify"]', (x) => x.innerText)));

  // Prepare again: no second setup.
  // Prepare again (the earlier offer, if still clickable): no second setup.
  const again = await tap(p, /^prepare it for me$/);
  await sleep(500);
  check("no repeated setup: offer settled or says it's already prepared", !(await p.$('[data-testid="dns-setup"]')) && (again === null || /already prepared/.test(await lastMsgs(p, 1))), `${again} | ${await lastMsgs(p, 1)}`);

  // Refresh after prepared: kept.
  await p.goto(`${BASE}${DNS}?noDelay=1`, { waitUntil: "networkidle0" });
  await sleep(2000);
  check("refresh after prepared: state kept, next step offered", (await setup(p)).dnsSetup === "prepared" && /Use Verify & Continue to check the connection\./.test(await lastMsgs(p, 3)), await lastMsgs(p, 3));

  await p.click('[data-field="verify"]');
  await sleep(2600);
  check("verify: deterministic demo result → verified, provisioning", path(p) === "/edit-preference/whitelabel/setup/provisioning" && (await setup(p)).recordsVerified === true, path(p));
  check("verify: exact success copy", /Your domain is connected\. TopFan can continue setting up your website\./.test(await lastMsgs(p, 4)), await lastMsgs(p, 4));
  check("happy path: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

// Cancel, retry, Escape, manual route
{
  const p = await open();
  await tap(p, /^prepare it for me$/);
  await sleep(500);
  await click(p, "dns-cancel");
  check("cancel: closed, exact copy, nothing changed", !(await p.$('[data-testid="dns-setup"]')) && /Connection cancelled\. No changes have been made\./.test(await lastMsgs(p, 1)) && (await setup(p)).dnsSetup === "idle", await lastMsgs(p, 1));
  await tap(p, /^try again$/);
  await sleep(500);
  check("retry: opens Connect again", (await step(p)) === "connect");
  await p.keyboard.press("Escape");
  await sleep(300);
  check("Escape on Connect = Cancel", !(await p.$('[data-testid="dns-setup"]')) && /Connection cancelled/.test(await lastMsgs(p, 1)));
  await tap(p, /^walk me through it$/);
  await sleep(500);
  const g = await lastMsgs(p, 1);
  const st = await setup(p);
  check("manual route: step-by-step guide with the real records", /Add New Record/.test(g) && g.includes(st.subdomain), g.slice(0, 300));
  // After the walkthrough, the assisted setup is still one click (or one sentence) away.
  check("after walkthrough: Prepare it for me still offered", /PREPARE IT FOR ME/i.test(g), g.slice(-200));
  await tap(p, /^prepare it for me$/);
  await sleep(500);
  check("after walkthrough: Prepare it for me opens the setup", (await step(p)) === "connect");
  await click(p, "dns-cancel");
  await p.click('[data-testid="ai-input"]');
  await p.type('[data-testid="ai-input"]', "Actually, prepare it for me");
  await p.keyboard.press("Enter");
  await sleep(600);
  check("typed 'prepare it for me' opens the setup", (await step(p)) === "connect");
  await click(p, "dns-cancel");
  await p.type('[data-testid="ai-input"]', "walk me through it");
  await p.keyboard.press("Enter");
  await sleep(600);
  check("typed 'walk me through it' shows the guide", /Add New Record/.test(await lastMsgs(p, 1)));
  check("cancel/manual: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

// Refresh while processing: not corrupted; reported as unconfirmed with a retry.
{
  const p = await open();
  const domainBefore = (await setup(p)).domainName;
  await tap(p, /^prepare it for me$/);
  await sleep(500);
  await click(p, "dns-continue", 1500);
  await click(p, "dns-approve", 300);
  check("refresh test: processing saved", (await setup(p)).dnsSetup === "processing");
  await p.goto(`${BASE}${DNS}?noDelay=1`, { waitUntil: "networkidle0" });
  await sleep(2200);
  const s = await setup(p);
  check("refresh mid-process: same domain and step, not marked prepared or verified", path(p) === DNS && s.domainName === domainBefore && s.dnsSetup === "idle" && !s.recordsVerified, JSON.stringify(s));
  check("refresh mid-process: says it couldn't be confirmed", /We couldn't confirm that the required records were added\./.test(await lastMsgs(p, 3)), await lastMsgs(p, 3));
  await tap(p, /^try again$/);
  await sleep(500);
  check("refresh mid-process: Try again reopens the setup", (await step(p)) === "connect");
  check("refresh: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

// Error messages (deterministic demo outcomes)
for (const [fixture, where, re] of [
  ["connection-failure", "connect", /Couldn't connect to GoDaddy\. Please try again\./],
  ["domain-not-found", "connect", /We couldn't find this domain in the selected account\./],
  ["hosted-elsewhere", "connect", /This domain uses a different DNS provider\. Please select its actual DNS host to continue\./],
  ["conflict", "review", /A DNS record already exists for this hostname\. Review the conflict before continuing\./],
  ["update-failed", "approve", /We couldn't confirm that the required records were added\./],
]) {
  const p = await open(`&dnsFixture=${fixture}`);
  await tap(p, /^prepare it for me$/);
  await sleep(500);
  await click(p, "dns-continue", 1500);
  if (where !== "connect") await click(p, "dns-approve", where === "approve" ? 2800 : 300);
  const t = await modalText(p);
  check(`error ${fixture}: exact copy, Simulated label`, (await step(p)) === "error" && re.test(t) && /SIMULATED/i.test(t), t);
  check(`error ${fixture}: nothing marked prepared`, (await setup(p)).dnsSetup === "idle");
  check(`error ${fixture}: manual route offered`, !!(await p.$('[data-testid="dns-manual"]')));
  await p.browserContext().close();
}
{
  const p = await open("&dnsFixture=propagation-pending");
  await tap(p, /^prepare it for me$/);
  await sleep(500);
  await click(p, "dns-continue", 1500);
  await click(p, "dns-approve", 2800);
  await click(p, "dns-done", 500);
  await p.click('[data-field="verify"]');
  await sleep(2000);
  check("propagation pending: exact copy, still on DNS step", path(p) === DNS && /The DNS records aren't visible yet\. You can check again shortly\./.test(await lastMsgs(p, 1)), await lastMsgs(p, 1));
  await p.click('[data-field="verify"]');
  await sleep(2400);
  check("propagation pending: checking again succeeds", path(p) === "/edit-preference/whitelabel/setup/provisioning");
  await p.browserContext().close();
}

// Other providers: the assisted setup is GoDaddy only; the walkthrough stays.
{
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  await p.goto(`${BASE}/?noDelay=1`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.setItem("topfan-setup-v1", JSON.stringify({ provider: "Namecheap", domainName: "ajwhite.com", urlPreference: "subdomain", subdomain: "fans", hasDomain: true, dnsSetup: "idle" })));
  await p.goto(`${BASE}${DNS}?noDelay=1`, { waitUntil: "networkidle0" });
  await sleep(2200);
  const t = await lastMsgs(p, 3);
  check("other provider: no Prepare it for me, walkthrough offered", !/PREPARE IT FOR ME/i.test(t) && /WALK ME THROUGH IT/i.test(t), t);
  await ctx.close();
}

console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await b.close();
process.exit(fails ? 1 : 0);
