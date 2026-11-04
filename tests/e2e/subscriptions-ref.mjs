// Monetize › Subscriptions + Create New Plan / Update Plan against the aj-white-subscriptions reference pack
// (CLAUDE_CODE_PROMPT.md §13 acceptance checklist): fixed shell, inert tier rows, independent benefit accordions,
// Monetize popover, subscribers modal, Add New Plan → /create, back/Cancel with no prompt, circle vs header clicks,
// 1 Month auto-calculation, dim currency button + currency modal, Yes toggles, summary chips, Season Pass calendar,
// DM pills + DM price modal, benefits multi-select (chips, rows, edit, reorder, remove), validation, create, Update Plan.
// Usage: node tests/e2e/subscriptions-ref.mjs   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1126, height: 797 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 400)); if (!ok) fails++; };
const path = (p) => new URL(p.url()).pathname;
const T = (id) => `[data-testid="${id}"]`;

async function page() {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(String(e)));
  await p.evaluateOnNewDocument(() => localStorage.setItem("tf-no-delay", "1"));
  await p.goto(`${BASE}/ajwhite?resetMock=1&noDelay=1&demo=off`, { waitUntil: "networkidle0" });
  await sleep(800);
  return p;
}
const go = async (p, u) => { await p.goto(`${BASE}${u}`, { waitUntil: "networkidle0" }); await sleep(600); };
const db = (p) => p.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.startsWith("topfan-mock-v1")); return JSON.parse(localStorage.getItem(k) || "null"); });
// DOM click: the floating assistant launcher can sit over right-edge controls at 1126 wide.
const click = async (p, id) => { await p.$eval(T(id), (x) => x.click()); await sleep(200); };
const text = (p, sel = "body") => p.$eval(sel, (x) => x.innerText).catch(() => "");
const has = async (p, id) => !!(await p.$(T(id)));
const attr = (p, id, a) => p.$eval(T(id), (x, a) => x.getAttribute(a), a).catch(() => null);
const val = (p, id) => p.$eval(T(id), (x) => x.value).catch(() => null);
const type = async (p, id, v) => { await p.$eval(T(id), (x) => x.focus()); await p.keyboard.type(v); await sleep(150); };
const disabled = (p, id) => p.$eval(T(id), (x) => x.disabled).catch(() => null);

/* ===== List ===== */
{
  const p = await page();
  await go(p, "/monetize/subscription");
  const t = await text(p);
  check("L1: Gold/Silver/Bronze tiers from the pack", /\$25\.00\s*1 Month/.test(t) && /\$67\.50\s*3 Months \(10% OFF\)\s*1-Day Free Trial/i.test(t) && /\$48\.00\s*6 Months \(20% OFF\)/.test(t) && /\$42\.00\s*12 Months \(30% OFF\)/.test(t), t.slice(0, 600));
  check("L1: count chips one lower than the list (quirk kept)", (await text(p, T("monetize-plan-benefit-count-gold"))) === "6 benefits" && (await text(p, T("monetize-plan-benefit-count-silver"))) === "4 benefits" && (await text(p, T("monetize-plan-benefit-count-bronze"))) === "1 benefit");

  const header = await p.$eval("header", (h) => getComputedStyle(h).position).catch(() => "");
  await p.evaluate(() => window.scrollTo(0, 600)); await sleep(200);
  const headerTop = await p.$eval("header", (h) => h.getBoundingClientRect().top).catch(() => null);
  const side = await p.evaluate(() => { const a = [...document.querySelectorAll("aside, nav")].find((n) => /Monetize/.test(n.innerText) && /Wallet/.test(n.innerText)); return a ? getComputedStyle(a.closest("aside") ?? a).position : ""; });
  check("L2: header fixed while content scrolls", /fixed|sticky/.test(header) && headerTop === 0, `${header} ${headerTop}`);
  check("L2: sidebar does not scroll", /fixed|sticky/.test(side), side);
  await p.evaluate(() => window.scrollTo(0, 0));

  const before = path(p);
  await click(p, "monetize-plan-tier-gold-3");
  check("L3: tier rows do nothing on click (no chevron, default cursor)", path(p) === before && (await p.$eval(T("monetize-plan-tier-gold-3"), (x) => getComputedStyle(x).cursor)) === "default" && !(await p.$(`${T("monetize-plan-tier-gold-3")} svg`)));

  await click(p, "monetize-plan-benefits-gold");
  await click(p, "monetize-plan-benefits-silver");
  const gold = await text(p, T("monetize-plan-benefit-list-gold"));
  check("L4: benefits accordions open independently", (await has(p, "monetize-plan-benefit-list-gold")) && (await has(p, "monetize-plan-benefit-list-silver")) && !(await has(p, "monetize-plan-benefit-list-bronze")));
  check("L4: Gold list has 7 bullets incl. 5 Free Direct Messages", gold.split("\n").filter(Boolean).length === 7 && /5 Free Direct Messages Per Month/.test(gold), gold);
  await click(p, "monetize-plan-benefits-gold");
  check("L4: second click closes only that one", !(await has(p, "monetize-plan-benefit-list-gold")) && (await has(p, "monetize-plan-benefit-list-silver")));

  await p.evaluate(() => document.querySelector('[data-testid^="page-monetize"] [aria-label="More info"]').click()); await sleep(200);
  check("L5: Monetize info popover opens", /click the Store button on your Profile/.test(await text(p)));
  await p.mouse.click(700, 760); await sleep(200);
  check("L5: outside click closes it", !/click the Store button on your Profile/.test(await text(p)));

  await click(p, "monetize-plan-subscribers-gold");
  const m = await text(p, T("modal-plan-subscribers"));
  const rows = await p.$$(T("plan-subscriber-row"));
  check("L6: subscribers modal: title, subtitle, columns, 8 rows", /Gold Plan Subscribers/.test(m) && /8 Active Subscribers/.test(m) && /SUBSCRIBER\s+DURATION\s+START DATE\s+END DATE\s+AUTO-RENEWAL/i.test(m) && rows.length === 8, m.slice(0, 300));
  await click(p, "plan-subscribers-close"); await sleep(300);
  check("L6: modal closes", !(await has(p, "modal-plan-subscribers")));

  await click(p, "monetize-add-plan");
  check("L7: Add New Plan → /monetize/subscription/create", path(p) === "/monetize/subscription/create", path(p));
  await click(p, "monetize-form-back");
  check("L7: back arrow returns with no prompt", path(p) === "/monetize/subscription" && !(await p.$('[role="dialog"]')));
  await go(p, "/monetize/subscription/add-plan");
  check("L7: old /add-plan URL redirects to /create", path(p) === "/monetize/subscription/create", path(p));
  check("L: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== Create New Plan ===== */
{
  const p = await page();
  await go(p, "/monetize/subscription/create");
  const t = await text(p, T("plan-form"));
  check("C1: six packages in order", /1 Month[\s\S]*3 Month[\s\S]*6 Month[\s\S]*12 Month[\s\S]*Season Pass[\s\S]*Lifetime/.test(t), t.slice(0, 400));
  check("C1: only 1 Month checked, '1 Active', all collapsed", (await attr(p, "plan-tier-1", "data-on")) === "true" && (await attr(p, "plan-tier-3", "data-on")) === "false" && (await text(p, T("plan-active-count"))) === "1 Active" && !(await p.$('[data-open="true"]')));
  check("C1: quirk placeholder 'Select Benefits Select Benefits'", /Select Benefits Select Benefits/.test(t));
  check("C1: Name maxlength 50", (await attr(p, "monetize-plan-name", "maxlength")) === "50");

  // Name blur error
  await p.$eval(T("monetize-plan-name"), (x) => x.focus()); await p.$eval(T("monetize-plan-name"), (x) => x.blur()); await sleep(150);
  check("C2: empty name blur → '* Name is required'", (await text(p, T("plan-name-error"))) === "* Name is required");

  // Circle vs header
  await click(p, "plan-tier-3-check");
  check("C3: circle toggles ACTIVE + badge, no expand", (await attr(p, "plan-tier-3", "data-on")) === "true" && (await attr(p, "plan-tier-3", "data-open")) === "false" && (await text(p, T("plan-active-count"))) === "2 Active" && /ACTIVE/i.test(await text(p, T("plan-tier-3-header"))));
  await click(p, "plan-tier-3-check");
  await click(p, "plan-tier-3-header");
  check("C3: header expands without toggling", (await attr(p, "plan-tier-3", "data-open")) === "true" && (await attr(p, "plan-tier-3", "data-on")) === "false" && (await text(p, T("plan-active-count"))) === "1 Active");
  check("C3: 3 Month fields (discount 'e.g. 10', price 'e.g. $232', trial)", (await attr(p, "plan-tier-3-discount", "placeholder")) === "e.g. 10" && (await attr(p, "plan-tier-3-price", "placeholder")) === "e.g. $232" && (await attr(p, "plan-tier-3-trial", "placeholder")) === "Enter Number Of Days");
  await click(p, "plan-tier-1-header");
  check("C3: cards open independently", (await attr(p, "plan-tier-3", "data-open")) === "true" && (await attr(p, "plan-tier-1", "data-open")) === "true");
  await click(p, "plan-tier-3-header");

  // Currency button dim until price, auto-calc
  check("C4: currency button dim until a price exists", (await attr(p, "plan-tier-1-currency", "data-disabled")) === "true" && (await attr(p, "plan-tier-1-price", "maxlength")) === "6" && (await attr(p, "plan-tier-1-price", "placeholder")) === "Enter price");
  await click(p, "plan-tier-1-currency");
  check("C4: dim currency button does nothing", !(await has(p, "modal-plan-currency")));
  await type(p, "plan-tier-1-price", "20");
  const d = await db(p);
  void d;
  await click(p, "plan-tier-3-header"); await click(p, "plan-tier-6-header"); await click(p, "plan-tier-12-header");
  const calc = [await val(p, "plan-tier-3-discount"), await val(p, "plan-tier-3-price"), await val(p, "plan-tier-6-discount"), await val(p, "plan-tier-6-price"), await val(p, "plan-tier-12-discount"), await val(p, "plan-tier-12-price")].join(",");
  check("C5: 1 Month 20 → 10/54.00, 20/96.00, 30/168.00", calc === "10,54.00,20,96.00,30,168.00", calc);
  check("C5: 3/6/12 auto-checked, '4 Active', Season/Lifetime untouched", (await text(p, T("plan-active-count"))) === "4 Active" && (await attr(p, "plan-tier-season", "data-on")) === "false" && (await attr(p, "plan-tier-lifetime", "data-on")) === "false");
  await click(p, "plan-tier-3-header"); await click(p, "plan-tier-6-header"); await click(p, "plan-tier-12-header");
  check("C6: collapsed tiers show price chips", (await text(p, T("plan-tier-6-chips"))) === "$96.00", await text(p, T("plan-tier-6-chips")));

  check("C4: currency button active once a price exists", (await attr(p, "plan-tier-1-currency", "data-disabled")) === "false");
  await click(p, "plan-tier-1-currency");
  const cm = await text(p, T("modal-plan-currency"));
  check("C4: currency modal: title, base price, table", /Item Currency Adjustments/.test(cm) && /Base Price: \$20\.00 USD/.test(cm) && (await has(p, "plan-currency-row-GEL")) && /BASE CURRENCY/i.test(cm), cm.slice(0, 300));
  check("C4: captured values (EUR 18.00, CNY settles $20.03)", (await val(p, "plan-currency-input-EUR")) === "18.00" && /\$20\.03/.test(await text(p, T("plan-currency-row-CNY"))));
  await click(p, "plan-currency-info");
  check("C4: popover keeps 'coutry/currency' (quirk)", /coutry\/currency/.test(await text(p, T("plan-currency-info-popover"))));
  await click(p, "plan-currency-save"); await sleep(250);
  check("C4: Save and Close closes", !(await has(p, "modal-plan-currency")));

  // Include toggles
  await type(p, "plan-tier-1-trial", "3");
  check("C7: toggles default No", (await attr(p, "plan-tier-1-exp-toggle-no", "aria-checked")) === "true" && !(await has(p, "plan-tier-1-exp-list")));
  await click(p, "plan-tier-1-exp-toggle-yes");
  const el = await text(p, T("plan-tier-1-exp-list"));
  check("C7: Yes reveals the scrollable experience list", /Select Experiences & Options \*/.test(el) && /Live Video Call with Me[\s\S]*One to One Call \/ Video Conferencing · 3 duration options/.test(el) && (await p.$eval(T("plan-tier-1-exp-list"), (x) => getComputedStyle(x).maxHeight)) === "325px", el.slice(0, 300));
  check("C7: '1 duration options' not singularised (quirk)", /1 duration options/.test(el));
  check("C9: Create Plan disabled while a Yes toggle has no pick", await disabled(p, "monetize-plan-save"));
  await click(p, "plan-tier-1-exp-exp-video-call-pick");
  const opts = await p.$$eval(T("plan-tier-1-exp-exp-video-call-opt"), (x) => x.map((o) => `${o.innerText.replace(/\s+/g, " ").trim()}|${o.getAttribute("aria-checked")}`));
  check("C7: selecting reveals count (default 1) + option radios, first selected", (await val(p, "plan-tier-1-exp-exp-video-call-count")) === "1" && opts.length === 3 && /15 Minutes Regular Price: \$100\.00\|true/.test(opts[0]) && /30 Minutes Regular Price: \$150\.00\|false/.test(opts[1]), opts.join(" / "));
  await click(p, "plan-tier-1-merch-toggle-yes");
  const ml = await text(p, T("plan-tier-1-merch-list"));
  check("C7: merch list with price | Shopify", /Fan can choose only one item per term/.test(ml) && /Home Mountain Hero\s*\$799\.95 \| Shopify/.test(ml), ml.slice(0, 300));
  await click(p, "plan-tier-1-merch-merch-hero");
  await click(p, "plan-tier-1-header");
  check("C6: summary chips $20.00 · 1 Experience · 1 Merchandise", (await text(p, T("plan-tier-1-chips"))).replace(/\s+/g, " ") === "$20.00 1 Experience 1 Merchandise", await text(p, T("plan-tier-1-chips")));

  // Season pass date picker
  await click(p, "plan-tier-season-header");
  await click(p, "plan-tier-season-date");
  const now = new Date();
  const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  check("C8: calendar: today disabled, tomorrow enabled", (await disabled(p, `plan-tier-season-date-day-${iso(now)}`)) === true && (await disabled(p, `plan-tier-season-date-day-${iso(tomorrow)}`)) === false);
  await click(p, `plan-tier-season-date-day-${iso(tomorrow)}`);
  check("C8: picking a date fills the field and closes", !(await has(p, "plan-tier-season-date-calendar")) && !/Select Date/.test(await text(p, T("plan-tier-season-date"))));
  await click(p, "plan-tier-season-header");

  // DM pills + modal
  await click(p, "plan-dm-10");
  check("C10: DM pills single-select", (await attr(p, "plan-dm-10", "aria-checked")) === "true" && (await attr(p, "plan-dm-5", "aria-checked")) === "false");
  await click(p, "plan-dm-price-edit");
  check("C10: DM price modal: $1 default, minimum note", (await attr(p, "plan-dm-price-1", "aria-pressed")) === "true" && /Minimum Amount: \$1\.00/.test(await text(p, T("modal-plan-dm-price"))));
  await type(p, "plan-dm-price-custom", "0.5");
  check("C10: custom under $1 blocks Update", await disabled(p, "plan-dm-price-update"));
  await click(p, "plan-dm-price-5");
  await click(p, "plan-dm-price-update"); await sleep(250);
  check("C10: Update sets the price", (await text(p, T("plan-dm-price-value"))) === "$5.00");

  // Benefits
  await click(p, "plan-benefits-trigger");
  const bo = await p.$$eval(T("plan-benefits-option"), (x) => x.map((o) => o.innerText.trim()));
  check("C11: benefits panel lists the six options + Add New Benefit", bo.join("|") === "Exclusive Photos|Exclusive Videos|Exclusive Podcasts|All E-Courses are FREE|Money Saving VIP Offers from my Partners|Chat Room Access" && (await has(p, "plan-benefits-add-new")), bo.join("|"));
  await p.$$eval(T("plan-benefits-option"), (x) => (x[0].click(), x[1].click(), x[5].click())); await sleep(200);
  const chips = await p.$$eval(T("plan-benefit-chip"), (x) => x.map((c) => c.innerText.trim()));
  const rows = () => p.$$eval(T("plan-benefit-row"), (x) => x.map((c) => c.innerText.trim()));
  check("C11: chips and rows stay in sync", chips.join("|") === "Exclusive Photos|Exclusive Videos|Chat Room Access" && (await rows()).join("|") === chips.join("|"), `${chips} / ${await rows()}`);
  await type(p, "plan-benefits-search", "pod");
  check("C11: search filters", (await p.$$eval(T("plan-benefits-option"), (x) => x.map((o) => o.innerText.trim()))).join() === "Exclusive Podcasts");
  await click(p, "plan-benefits-add-new");
  check("C11: Add Benefit modal, button dim when empty", (await has(p, "modal-plan-benefit")) && (await disabled(p, "plan-benefit-save")));
  await type(p, "plan-benefit-name", "Monthly Live Q&A");
  await click(p, "plan-benefit-save"); await sleep(250);
  check("C11: new benefit added and selected", (await rows()).at(-1) === "Monthly Live Q&A");
  await p.mouse.click(700, 120); await sleep(200);
  check("C11: outside click closes the panel", !(await has(p, "plan-benefits-panel")));
  await p.$$eval(T("plan-benefit-row-edit"), (x) => x[0].click()); await sleep(250);
  check("C11: pencil opens 'Add Benefit' prefilled (quirk)", /Add Benefit/.test(await text(p, T("modal-plan-benefit"))) && (await val(p, "plan-benefit-name")) === "Exclusive Photos" && !(await disabled(p, "plan-benefit-save")));
  await p.$eval(T("plan-benefit-name"), (x) => x.select()); await p.keyboard.type("Exclusive Photo Drops");
  await click(p, "plan-benefit-save"); await sleep(250);
  check("C11: edit renames row and chip", (await rows())[0] === "Exclusive Photo Drops" && (await p.$$eval(T("plan-benefit-chip"), (x) => x[0].innerText.trim())) === "Exclusive Photo Drops");
  await p.$$eval(T("plan-benefit-row-drag"), (x) => x[0].focus()); await p.keyboard.press("ArrowDown"); await sleep(150);
  check("C11: reorder via the handle", (await rows()).slice(0, 2).join("|") === "Exclusive Videos|Exclusive Photo Drops", (await rows()).join("|"));
  await p.$$eval(T("plan-benefit-row-remove"), (x) => x[2].click()); await sleep(150);
  check("C11: × removes the row", (await rows()).join("|") === "Exclusive Videos|Exclusive Photo Drops|Monthly Live Q&A", (await rows()).join("|"));

  check("C9: Create Plan disabled with empty name", await disabled(p, "monetize-plan-save"));
  await type(p, "monetize-plan-name", "Platinum Plan");
  check("C9: enabled once valid", (await disabled(p, "monetize-plan-save")) === false);
  await click(p, "monetize-plan-save"); await sleep(300);
  const plat = (await db(p)).monetize.plans.find((x) => x.name === "Platinum Plan");
  check("C12: create saves to the mock store and returns to the list", path(p) === "/monetize/subscription" && plat && plat.prices.map((x) => `${x.months}:${x.amount}:${x.discountPct ?? 0}`).join() === "1:20:0,3:54:10,6:96:20,12:168:30" && plat.prices[0].freeTrialDays === 3 && plat.dmCount === "10" && plat.dmPrice === 5 && plat.benefits.at(-1) === "10 Free Direct Messages Per Month" && plat.includes?.["1"]?.experiences?.[0]?.option === "15 Minutes" && plat.includes?.["1"]?.merchIds?.[0] === "merch-hero", JSON.stringify(plat));
  check("C12: new card shows '3 benefits'", (await text(p, T(`monetize-plan-benefit-count-${plat?.id}`))) === "3 benefits");

  // Cancel discards with no prompt
  await click(p, "monetize-add-plan");
  await type(p, "monetize-plan-name", "Throwaway");
  await click(p, "monetize-plan-cancel");
  check("C13: Cancel returns immediately and discards", path(p) === "/monetize/subscription" && !(await db(p)).monetize.plans.some((x) => x.name === "Throwaway") && !(await p.$('[role="dialog"]')));
  check("C: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== Update Plan ===== */
{
  const p = await page();
  await go(p, "/monetize/subscription");
  await click(p, "monetize-plan-edit-gold");
  check("U1: pencil opens Update Plan prefilled", (await text(p, T("plan-form-title"))) === "Update Plan" && (await val(p, "monetize-plan-name")) === "Gold Plan" && (await text(p, T("plan-active-count"))) === "4 Active", path(p));
  check("U1: collapsed price chips $25.00 / $67.50", (await text(p, T("plan-tier-1-chips"))) === "$25.00" && (await text(p, T("plan-tier-3-chips"))) === "$67.50");
  check("U1: DM 5 selected, benefits prefilled without the DM line", (await attr(p, "plan-dm-5", "aria-checked")) === "true" && (await p.$$(T("plan-benefit-row"))).length === 6);
  check("U1: submit label 'Update Plan', enabled", (await text(p, T("monetize-plan-save"))) === "UPDATE PLAN" || (await text(p, T("monetize-plan-save"))) === "Update Plan");
  await p.$$eval(T("plan-benefit-row-remove"), (x) => x[5].click()); await sleep(150);
  await click(p, "monetize-plan-save"); await sleep(300);
  const g = (await db(p)).monetize.plans.find((x) => x.id === "gold");
  check("U2: details-only update saves without a price confirm", path(p) === "/monetize/subscription" && g.benefits.length === 6 && !g.benefits.includes("Chat Room Access") && g.benefits.at(-1) === "5 Free Direct Messages Per Month" && g.prices.length === 4, JSON.stringify(g));
  await click(p, "monetize-plan-edit-gold");
  await click(p, "plan-tier-1-header");
  await p.$eval(T("plan-tier-1-price"), (x) => x.select()); await p.keyboard.type("30"); await sleep(150);
  await click(p, "monetize-plan-save");
  check("U3: changing prices asks for confirmation first", (await has(p, "modal-monetize-plan-prices")) && (await db(p)).monetize.plans.find((x) => x.id === "gold").prices[0].amount === 25);
  await click(p, "monetize-plan-prices-confirm"); await sleep(300);
  const g2 = (await db(p)).monetize.plans.find((x) => x.id === "gold");
  check("U3: confirmed prices saved (3 Month recalculated 81.00)", g2.prices[0].amount === 30 && g2.prices[1].amount === 81, JSON.stringify(g2.prices));
  check("U: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

await b.close();
console.log(fails ? `== subscriptions-ref: ${fails} FAILED` : "== subscriptions-ref: ALL PASSED");
process.exit(fails ? 1 : 0);
