// Monetize › Experiences and Newsletters against the creator-platform reference pack (experience-01…16,
// newsletter-01…14): list/empty states, create form fields and order, type dropdown + calendar dialog
// (honest, no OAuth), scheduling defaults and lists, address, custom instructions, option rows,
// restrictions with real plans, NFT contracts, image, CREATE; newsletter list, filter, recipients dialog +
// local CSV, preview, delete confirmation, duplicate, editor toolbar, SEE PREVIEW, pricing options,
// refused publish (unverified email), draft autosave, ?work= prefill. Layout at 1126×797 and 1512×805.
// Usage: node tests/e2e/monetize-ref.mjs   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const IMG = new URL("../../public/assets/generated/training-wide.webp", import.meta.url).pathname;
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1126, height: 797 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 400)); if (!ok) fails++; };
const path = (p) => new URL(p.url()).pathname;

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
const go = async (p, u) => { await p.goto(`${BASE}${u}`, { waitUntil: "networkidle0" }); await sleep(800); };
const db = (p) => p.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.startsWith("topfan-mock-v1")); return JSON.parse(localStorage.getItem(k) || "null"); });
const T = (id) => `[data-testid="${id}"]`;
// DOM click: the floating assistant launcher can sit over right-edge controls at 1126 wide.
const click = async (p, id) => { await p.$eval(T(id), (x) => x.click()); await sleep(250); };
const text = (p, sel = "body") => p.$eval(sel, (x) => x.innerText).catch(() => "");
const has = async (p, id) => !!(await p.$(T(id)));
const checked = (p, id) => p.$eval(T(id), (x) => x.getAttribute("aria-checked") === "true").catch(() => null);
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const pickOption = (p, label) => p.evaluate((l) => [...document.querySelectorAll('[role="option"]')].find((o) => o.innerText.trim() === l || o.innerText.trim().startsWith(l + " ") || o.innerText.trim().startsWith(l + "\n"))?.click(), label);
const options = (p) => p.$$eval('[role="option"]', (x) => x.map((o) => o.innerText.trim()));
const toasts = () => "";

/* ===== Experiences: list, empty state ===== */
{
  const p = await page();
  await go(p, "/monetize/experience");
  const exps = (await db(p)).monetize.products.filter((x) => x.kind === "experience");
  const cards = await p.$$eval('[data-testid^="monetize-card-"]', (x) => x.filter((c) => /^monetize-card-[^-]+-?[a-z-]*$/.test(c.dataset.testid) && !/delete|edit/.test(c.dataset.testid)).length);
  check("E1: populated list shows the mock account's experiences", exps.length >= 4 && cards === exps.length, `${cards}/${exps.length}`);
  check("E1: no empty state while experiences exist", !(await has(p, "monetize-experience-empty")));
  await p.evaluate(() => document.querySelector('[data-testid^="page-monetize"] [aria-label="More info"]').click());
  await sleep(200);
  check("E1: Monetize info tip uses the reference wording", /click the Store button on your Profile/.test(await text(p)));
  for (const e of exps) {
    await click(p, `monetize-card-delete-${e.id}`);
    await click(p, "monetize-delete-product-confirm");
  }
  check("E2: empty state after the last experience is deleted", (await text(p, T("monetize-experience-empty"))).includes("You have not setup any experiences yet."));
  await click(p, "monetize-add-experience");
  check("E2: CREATE EXPERIENCES opens /monetize/experience/create-experience", path(p) === "/monetize/experience/create-experience", path(p));
  check("E: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== Experience create form ===== */
{
  const p = await page();
  await go(p, "/monetize/experience/create-experience");
  check("F1: Monetize pills stay above the form", await has(p, "monetize-tab-experience") && (await p.$eval(T("monetize-tab-experience"), (x) => x.getAttribute("aria-current"))) === "page");
  check("F1: title 'Create Experiences' + DISABLE/ENABLE (ENABLE default)", /Create Experiences/.test(await text(p)) && (await p.$eval(T("monetize-product-enable-on"), (x) => x.getAttribute("aria-pressed"))) === "true");
  const order = await p.$eval(T("monetize-exp-card"), (c) => c.innerText);
  const idx = ["Type of Experience *", "Enter Title *", "Description *", "Experience Options *", "Restrict Ability to Purchase this Experience", "Experience Preview Image *"].map((l) => order.indexOf(l));
  check("F1: card fields in reference order", idx.every((v, i) => v >= 0 && (i === 0 || v > idx[i - 1])), JSON.stringify(idx));
  check("F1: placeholders", await p.$eval(T("monetize-product-title"), (x) => x.placeholder === "Write title here…") && (await p.$eval(T("monetize-product-description"), (x) => x.placeholder === "Please describe the experience…")));
  const cardBottom = await p.$eval(T("monetize-exp-card"), (x) => x.getBoundingClientRect().bottom);
  check("F1: CREATE sits below the card", (await p.$eval(T("monetize-product-save"), (x) => [x.innerText.trim(), x.getBoundingClientRect().top]))[1] > cardBottom && (await text(p, T("monetize-product-save"))).toUpperCase() === "CREATE");
  // type dropdown
  await click(p, "monetize-product-type");
  const opts = await options(p);
  check("F2: Type of Experience has the 5 reference types", opts.length === 5 && /^One to One Call \/ Video Conferencing/.test(opts[0]) && /^In-Person Meetup/.test(opts[1]) && opts[2] === "Personalized Video" && opts[3] === "Social Media Follow or Post" && opts[4] === "Custom Experience", JSON.stringify(opts));
  check("F2: the two calendar types carry 'Calendar Scheduling'", opts.filter((o) => o.includes("Calendar Scheduling")).length === 2);
  await pickOption(p, "Personalized Video");
  await sleep(300);
  check("F2: Personalized Video → base form, no calendar dialog", !(await has(p, "modal-monetize-exp-calendar")) && (await has(p, "monetize-exp-options")) && !(await has(p, "monetize-exp-scheduling")));
  // option rows
  await click(p, "monetize-exp-add-option");
  check("F3: '+ Add Another Option' adds a row; both rows get a delete icon", (await p.$$(T("monetize-exp-option-row"))).length === 2 && (await p.$$(T("monetize-exp-option-delete"))).length === 2);
  await click(p, "monetize-exp-option-delete");
  check("F3: delete removes a row (last row has no delete)", (await p.$$(T("monetize-exp-option-row"))).length === 1 && !(await has(p, "monetize-exp-option-delete")));
  // restrictions
  await click(p, "monetize-exp-restrict-subscribers");
  const plans = (await db(p)).monetize.plans.filter((x) => x.active).map((x) => x.name);
  const subs = await text(p, T("monetize-exp-subs-options"));
  check("F4: Subscribers selector shows selected state", (await checked(p, "monetize-exp-restrict-subscribers")) === true);
  check("F4: 'Select Subscription Options' lists the real plans (no empty message)", /Select Subscription Options/.test(subs) && plans.every((n) => subs.includes(n)) && !/No active subscription found/.test(subs), subs);
  await click(p, "monetize-exp-restrict-nft");
  check("F4: NFT Holders selected; both reveals open side by side", (await checked(p, "monetize-exp-restrict-nft")) === true && (await has(p, "monetize-exp-subs-options")) && (await has(p, "monetize-exp-nft")));
  const nftTxt = await text(p, T("monetize-exp-restrict"));
  check("F4: label says 'Add NFT Contract Address' (not 'Contact')", /Add NFT Contract Address/.test(nftTxt) && !/Contact Address/.test(nftTxt));
  check("F4: contract placeholder + ADD", (await p.$eval(T("monetize-exp-nft-input"), (x) => x.placeholder)) === "Paste the NFT Contract ID here" && /ADD/i.test(await text(p, T("monetize-exp-nft-add"))));
  await p.evaluate(() => [...document.querySelectorAll('[data-testid="monetize-exp-restrict"] [aria-label="More info"]')].pop().click());
  await sleep(200);
  check("F4: NFT info tip explains where to find the address", /portfolio\.metamask\.io/.test(await text(p, T("monetize-exp-restrict"))));
  await p.type(T("monetize-exp-nft-input"), "not-an-address");
  await click(p, "monetize-exp-nft-add");
  check("F4: invalid contract address is rejected", /starts with 0x/.test(await text(p, T("monetize-exp-nft"))) && !(await has(p, "monetize-exp-nft-item")));
  await p.$eval(T("monetize-exp-nft-input"), (x) => (x.value = ""));
  await p.click(T("monetize-exp-nft-input"), { clickCount: 3 });
  await p.keyboard.press("Backspace");
  await p.type(T("monetize-exp-nft-input"), "0x81c960679bd68D0095ed3A6325FA9b26043eFE9a");
  await click(p, "monetize-exp-nft-add");
  check("F4: valid contract address is added", (await p.$$(T("monetize-exp-nft-item"))).length === 1);
  // custom
  await click(p, "monetize-product-type");
  await pickOption(p, "Custom Experience");
  await sleep(200);
  check("F5: Custom Experience adds 'Optional: Custom Experience Instructions'", /Optional: Custom Experience Instructions/.test(await text(p, T("monetize-exp-card"))) && (await has(p, "monetize-exp-custom")));
  // calendar types
  await click(p, "monetize-product-type");
  await pickOption(p, "One to One Call / Video Conferencing");
  await sleep(400);
  const dlg = await text(p, T("modal-monetize-exp-calendar"));
  check("F6: calendar type opens 'Link Your Calendar' with both buttons + note", /choose an available time/.test(dlg) && /Google Calendar/.test(dlg) && /Outlook Calendar/.test(dlg) && /Once linked, booked experiences/.test(dlg), dlg);
  const before = JSON.stringify((await db(p)).prefsA?.integrations ?? null);
  await click(p, "monetize-exp-cal-google-dialog");
  const note = await text(p, T("monetize-exp-cal-notice"));
  check("F6: Google Calendar does not pretend to connect", /isn't available in this demo/.test(note) && /nothing was connected/.test(note) && JSON.stringify((await db(p)).prefsA?.integrations ?? null) === before, note);
  await p.evaluate(() => document.querySelector('[data-testid="modal-monetize-exp-calendar"]').closest('[role="dialog"]').querySelector('[aria-label="Close"]').click());
  await sleep(400);
  check("F6: X closes the dialog; the form stays usable", !(await has(p, "modal-monetize-exp-calendar")) && (await has(p, "monetize-exp-scheduling")));
  const sched = await text(p, T("monetize-exp-scheduling"));
  check("F7: scheduling block text", /Calendar Scheduling/.test(sched) && /Link your Google or Outlook calendar to make Experience bookings and avoid calendar conflicts\./.test(sched) && /Meeting Duration Options/.test(sched));
  check("F7: experience options replaced by duration options", !(await has(p, "monetize-exp-options")) && (await has(p, "monetize-product-durations")));
  const days = await p.$$eval('[data-testid^="monetize-exp-day-"]', (x) => x.map((d) => `${d.innerText}:${d.getAttribute("aria-pressed")}`).join(","));
  check("F7: SUN…SAT pills, Mon–Fri on by default", days === "SUN:false,MON:true,TUE:true,WED:true,THU:true,FRI:true,SAT:false", days);
  await click(p, "monetize-exp-day-sat");
  check("F7: day pills toggle", (await p.$eval(T("monetize-exp-day-sat"), (x) => x.getAttribute("aria-pressed"))) === "true");
  check("F7: defaults 9:00 AM – 5:00 PM, 12 Hours, 15 Days", (await text(p, T("monetize-exp-from"))).includes("9:00 AM") && (await text(p, T("monetize-exp-to"))).includes("5:00 PM") && (await text(p, T("monetize-exp-min-notice"))).includes("12 Hours") && (await text(p, T("monetize-exp-max-advance"))).includes("15 Days"));
  const listOf = async (sel) => { await p.click(`${sel} button`); await sleep(200); const o = await options(p); await p.keyboard.press("Escape"); await p.click(`${sel} button`); await sleep(150); return o; };
  check("F7: Minimum Booking Notice values", (await listOf(T("monetize-exp-min-notice"))).join("|") === "1 Hour|2 Hours|4 Hours|6 Hours|12 Hours|24 Hours|48 Hours");
  check("F7: Maximum Advance Booking values", (await listOf(T("monetize-exp-max-advance"))).join("|") === "5 Days|7 Days|10 Days|15 Days|30 Days|60 Days|90 Days");
  check("F7: Meeting Duration values", (await listOf('[data-testid="monetize-exp-duration-row"]')).join("|") === "10 Minutes|15 Minutes|30 Minutes|45 Minutes|1 Hour|1.5 Hours|2 Hours");
  check("F7: Available From is a full time list", (await listOf(T("monetize-exp-from"))).length === 48);
  await click(p, "monetize-product-add-duration");
  check("F7: duration options: + Add Another Option", (await p.$$(T("monetize-exp-duration-row"))).length === 2);
  await click(p, "monetize-exp-option-delete");
  // in person
  await click(p, "monetize-product-type");
  await pickOption(p, "In-Person Meetup");
  await sleep(300);
  const addr = await text(p, T("monetize-exp-address"));
  check("F8: In-Person Meetup adds the 5 address fields after Meeting Duration", ["Street Address *", "Country *", "State *", "City *", "Postal Code *"].every((l) => addr.includes(l)) && (await p.evaluate(() => document.querySelector('[data-testid="monetize-exp-address"]').getBoundingClientRect().top > document.querySelector('[data-testid="monetize-product-durations"]').getBoundingClientRect().top)));
  // validation then create
  const n0 = (await db(p)).monetize.products.length;
  await click(p, "monetize-product-save");
  check("F9: empty CREATE shows errors and creates nothing", (await has(p, "monetize-exp-invalid")) && (await db(p)).monetize.products.length === n0 && /Experience Preview Image is required/.test(await text(p)));
  await p.type(T("monetize-product-title"), "Ride a Park Lap With Me");
  await p.type(T("monetize-product-description"), "A one-hour park session with tips on rails and jumps.");
  await p.$eval('[data-testid="monetize-exp-duration-row"] button', (x) => x.click());
  await sleep(200);
  await pickOption(p, "1 Hour");
  await sleep(200);
  await p.type(T("monetize-product-price"), "120");
  for (const [k, v] of [["street", "1 Example Way"], ["country", "United States"], ["state", "Colorado"], ["city", "Copper Ridge"], ["postal", "80000"]]) await p.type(T(`monetize-exp-${k}`), v);
  await click(p, "monetize-exp-plan-gold-plan");
  await (await p.$(T("monetize-product-image-input"))).uploadFile(IMG);
  await sleep(400);
  check("F10: preview image shows in the upload tile", !!(await p.$(`${T("monetize-product-image")} img`)));
  await click(p, "monetize-product-save");
  await sleep(600);
  const made = (await db(p)).monetize.products.find((x) => x.title === "Ride a Park Lap With Me");
  check("F10: CREATE saves the experience with schedule, address, durations and restrictions", made && made.experienceType === "In Person Session" && made.price === 120 && made.durations?.[0]?.label === "1 Hour" && made.schedule?.days.includes("SAT") && made.schedule.minNotice === "12 Hours" && made.address?.city === "Copper Ridge" && made.locked && made.restrict?.planIds.includes("gold") && made.restrict?.nftContracts.length === 1 && made.published, JSON.stringify(made));
  check("F10: back on the Experiences list, card shown", path(p) === "/monetize/experience" && (await has(p, `monetize-card-${made?.id}`)));
  // edit shows saved values
  await go(p, `/monetize/experience/edit-experience/${made.id}`);
  check("F11: edit restores type, address and schedule", (await text(p, T("monetize-product-type"))).includes("In-Person Meetup") && (await p.$eval(T("monetize-exp-city"), (x) => x.value)) === "Copper Ridge" && (await p.$eval(T("monetize-exp-day-sat"), (x) => x.getAttribute("aria-pressed"))) === "true");
  check("F: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== Experience: restricted to subscribers with no plans → honest empty message ===== */
{
  const p = await page();
  await p.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.startsWith("topfan-mock-v1")); const d = JSON.parse(localStorage.getItem(k)); d.monetize.plans = []; localStorage.setItem(k, JSON.stringify(d)); });
  await go(p, "/monetize/experience/create-experience");
  await click(p, "monetize-exp-restrict-subscribers");
  check("F12: 'No active subscription found.' only when there are no plans", /No active subscription found\./.test(await text(p, T("monetize-exp-subs-options"))));
  await p.browserContext().close();
}

/* ===== Newsletters list ===== */
{
  const p = await page();
  await go(p, "/monetize/newsletters");
  const d = await db(p);
  check("N1: header row: title + Display Newsletters on Profile Page", /Newsletters/.test(await text(p)) && /Display Newsletters on Profile Page/.test(await text(p, T("monetize-newsletters-display"))));
  check("N1: VIEW NEWSLETTER RECIPIENTS (count from store) + NEW NEWSLETTER", (await text(p, T("monetize-newsletter-recipients"))).includes(`(${d.monetize.recipients.length})`) && /NEW NEWSLETTER/i.test(await text(p, T("monetize-newsletter-new"))));
  const heads = await p.$$eval(`${T("monetize-newsletters-table")} th`, (x) => x.map((h) => h.innerText.trim().toUpperCase()).join("|"));
  check("N1: table columns", heads === "NEWSLETTER TITLE|STATUS|PREVIEW|SENT|OPENED|UNLOCKED|ACTION", heads);
  const nl3 = d.monetize.newsletters.find((x) => x.id === "nl3");
  check("N1: SENT/OPENED come from the store", (await text(p, T("monetize-newsletter-row-nl3"))).includes(String(nl3.sent)) && (await text(p, T("monetize-newsletter-row-nl3"))).includes(String(nl3.opened)));
  const tbl = await p.$eval(T("monetize-newsletters-table"), (x) => x.parentElement.scrollWidth - x.parentElement.clientWidth);
  check("N1: table fits at 1126 (no hidden ACTION column)", tbl <= 0, tbl);
  await click(p, "monetize-newsletters-filter");
  check("N2: filter options All, Sent, Draft, Scheduled", (await options(p)).join("|") === "All|Sent|Draft|Scheduled");
  await pickOption(p, "Draft");
  await sleep(200);
  const rows = await p.$$eval('[data-testid^="monetize-newsletter-row-"]', (x) => x.map((r) => r.innerText));
  check("N2: Draft filter shows only drafts", rows.length === d.monetize.newsletters.filter((x) => x.status === "Draft").length && rows.every((r) => /Draft/.test(r)));
  await click(p, "monetize-newsletters-filter");
  await pickOption(p, "All");
  // recipients
  await p.evaluate(() => {
    window.__csv = null;
    const orig = URL.createObjectURL;
    URL.createObjectURL = (blob) => { blob.text?.().then((t) => (window.__csv = t)); return orig(blob); };
    HTMLAnchorElement.prototype.click = function () { window.__dl = this.download; };
  });
  await click(p, "monetize-newsletter-recipients");
  const rd = await text(p, T("modal-monetize-newsletter-recipients"));
  check("N3: recipients dialog: title with count, columns, CLOSE", rd.includes(`Newsletter Recipients (${d.monetize.recipients.length})`) && /RECIPIENT NAME/i.test(rd) && /EMAIL/i.test(rd) && /STATUS/i.test(rd) && /DATE JOINED/i.test(rd) && /CLOSE/i.test(rd));
  check("N3: recipients are fictional mock people (@example.com)", d.monetize.recipients.every((r) => r.email.endsWith("@example.com")) && rd.includes(d.monetize.recipients[0].name));
  await click(p, "monetize-recipients-csv");
  await sleep(300);
  const csv = await p.evaluate(() => window.__csv);
  check("N3: DOWNLOAD CSV builds a local CSV from mock recipients", (await p.evaluate(() => window.__dl)) === "newsletter-recipients.csv" && csv?.split("\n").length === d.monetize.recipients.length + 1 && csv.startsWith("Recipient Name,Email,Status,Date Joined"), csv?.slice(0, 120));
  await click(p, "monetize-recipients-close");
  check("N3: CLOSE closes the dialog", !(await has(p, "modal-monetize-newsletter-recipients")));
  // preview
  await click(p, "monetize-newsletter-preview-nl2");
  check("N4: preview dialog: NEWSLETTER PREVIEW, Last Saved on, body", /Last Saved on:/.test(await text(p, T("modal-monetize-newsletter-preview"))) && (await text(p, T("modal-monetize-newsletter-preview"))).includes("How a niche winter pastime"));
  await p.keyboard.press("Escape");
  await sleep(300);
  // delete with confirmation; duplicate
  await click(p, "monetize-newsletter-delete-nl2");
  check("N5: delete asks for confirmation", await has(p, "modal-monetize-delete-newsletter"));
  await click(p, "monetize-delete-newsletter-cancel");
  check("N5: cancel keeps it", (await db(p)).monetize.newsletters.some((x) => x.id === "nl2"));
  await click(p, "monetize-newsletter-delete-nl2");
  await click(p, "monetize-delete-newsletter-confirm");
  check("N5: confirm deletes it", !(await db(p)).monetize.newsletters.some((x) => x.id === "nl2"));
  const c0 = (await db(p)).monetize.newsletters.length;
  await click(p, "monetize-newsletter-duplicate-nl3");
  const dup = (await db(p)).monetize.newsletters;
  check("N5: duplicate adds a Draft copy with zero counts", dup.length === c0 + 1 && dup.filter((x) => x.title === nl3.title && x.status === "Draft" && x.sent === 0).length === 1);
  check("N: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== Newsletter add / edit ===== */
{
  const p = await page();
  await go(p, "/monetize/newsletters");
  await click(p, "monetize-newsletter-new");
  check("A1: + NEW NEWSLETTER opens /monetize/newsletters/add", path(p) === "/monetize/newsletters/add", path(p));
  check("A1: Monetize pills + 'Add Newsletter' + DISABLE/ENABLE", (await has(p, "monetize-tab-newsletters")) && /Add Newsletter/.test(await text(p)) && (await has(p, "monetize-newsletter-enable")));
  check("A1: title placeholder", (await p.$eval(T("monetize-newsletter-title"), (x) => x.placeholder)) === "Add Newsletter Title here...");
  check("A1: no 'Draft Auto-Saved' on Add", !(await has(p, "monetize-newsletter-autosaved")));
  const tools = await p.$$eval('[data-testid^="monetize-newsletter-tool-"]', (x) => x.map((t) => t.getAttribute("aria-label")));
  check("A2: Article-style toolbar + UNDO/REDO", ["Emoji", "Bold", "Italic", "Underline", "Text size", "Ordered list", "Bullet list", "Link", "Code", "Image", "Video", "Audio", "Divider"].every((t) => tools.includes(t)) && (await has(p, "monetize-newsletter-undo")) && (await has(p, "monetize-newsletter-redo")), tools.join(","));
  await p.type(T("monetize-newsletter-title"), "Spring Camp Notes");
  await p.click(T("monetize-newsletter-body"));
  await p.keyboard.type("Big news from camp this week");
  await p.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.querySelector('[data-testid="monetize-newsletter-body"]')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  await click(p, "monetize-newsletter-tool-bold");
  check("A2: Bold works on the selection", /<b>|font-weight/.test(await p.$eval(T("monetize-newsletter-body"), (x) => x.innerHTML)));
  await click(p, "monetize-newsletter-tool-emoji");
  check("A2: Emoji opens a picker", await has(p, "monetize-newsletter-emoji-pop"));
  await p.keyboard.press("Escape");
  await click(p, "monetize-newsletter-see-preview");
  check("A3: SEE PREVIEW shows the current body", (await text(p, T("modal-monetize-newsletter-see-preview"))).includes("Big news from camp"));
  await p.keyboard.press("Escape");
  await sleep(300);
  // interests, image tip
  await click(p, "monetize-newsletter-interest-sports");
  check("A4: Select Interests chips toggle", (await p.$eval(T("monetize-newsletter-interest-sports"), (x) => x.getAttribute("aria-checked"))) === "true");
  await p.evaluate(() => [...document.querySelectorAll('[aria-label="More info"]')].find((x) => x.parentElement.parentElement.innerText.includes("Newsletter Preview Image"))?.click());
  check("A4: image info tip (450 × 200 px)", /greater than\s+450 pixels and height of image should be greater than 200 pixels/.test(await text(p)));
  // pricing
  const pr = await text(p, T("monetize-newsletter-lock"));
  check("A5: pricing card with 4 options", /Optional: Set Pricing Options for Newsletter/.test(pr) && ["Select Which Subscribers Can Access Newsletter For Free", "Allow NFT Holders To Access Newsletter For Free", "Individual Purchase Price", "Loyalty Points"].every((l) => pr.includes(l)));
  await click(p, "monetize-newsletter-opt-free-subs-check");
  check("A5: subscribers option selected + lists real plans", (await checked(p, "monetize-newsletter-opt-free-subs-check")) === true && (await has(p, "monetize-newsletter-free-plan-gold-plan")) && !/You haven't created any subscriptions yet/.test(await text(p, T("monetize-newsletter-lock"))));
  await click(p, "monetize-newsletter-free-plan-gold-plan");
  await click(p, "monetize-newsletter-opt-free-nft-check");
  await click(p, "monetize-newsletter-free-nft-add");
  check("A5: 'Add Another NFT ID' adds a row with a delete icon", (await p.$$(T("monetize-newsletter-free-nft-row"))).length === 2 && (await p.$$(T("monetize-newsletter-free-nft-delete"))).length === 1);
  await click(p, "monetize-newsletter-free-nft-delete");
  check("A5: delete removes the row", (await p.$$(T("monetize-newsletter-free-nft-row"))).length === 1);
  await click(p, "monetize-newsletter-opt-free-nft-check");
  await click(p, "monetize-newsletter-opt-price-check");
  check("A5: no purchase restriction before a price is set", !(await has(p, "monetize-newsletter-buy-restrict")));
  await p.type(T("monetize-newsletter-price"), "4");
  check("A5: price set → 'Restrict Ability to Individually Purchase Newsletter to:'", /Restrict Ability to Individually Purchase Newsletter to:/.test(await text(p, T("monetize-newsletter-buy-restrict"))));
  await click(p, "monetize-newsletter-opt-points-check");
  check("A5: Loyalty Points reveals a Points input", await has(p, "monetize-newsletter-points"));
  await click(p, "monetize-newsletter-opt-points-check");
  // publish: refused because outbound email isn't verified
  check("A6: chevron + PUBLISH NOW", (await has(p, "monetize-newsletter-more")) && /PUBLISH NOW/i.test(await text(p, T("monetize-newsletter-send"))));
  await (await p.$(T("monetize-newsletter-image-input"))).uploadFile(IMG);
  await sleep(500);
  check("A6: preview image accepted (>450×200)", !!(await p.$(`${T("monetize-newsletter-image")} img`)));
  const verified = (await db(p)).prefsB.outboundEmail.status === "verified";
  check("A6: unverified email is explained before publishing", verified || (await has(p, "monetize-newsletter-email-unverified")));
  await click(p, "monetize-newsletter-send");
  check("A6: PUBLISH NOW asks who to send to", (await has(p, "modal-monetize-newsletter-confirm")) && (await has(p, "monetize-newsletter-audience-all-recipients")));
  const before = (await db(p)).monetize.newsletters.length;
  await click(p, "monetize-newsletter-confirm-confirm");
  await sleep(400);
  const after = (await db(p)).monetize.newsletters;
  check("A6: send is refused by the store (nothing saved or Sent), user stays on the form", verified || (after.length === before && !after.some((x) => x.title === "Spring Camp Notes") && path(p) === "/monetize/newsletters/add"));
  check("A6: refusal is shown, not a success", verified || /isn't verified/.test(await text(p)));
  await click(p, "monetize-newsletter-more");
  check("A7: chevron menu: Schedule + Save as Draft", (await has(p, "monetize-newsletter-schedule")) && (await has(p, "monetize-newsletter-menu-draft")));
  await click(p, "monetize-newsletter-menu-draft");
  await sleep(400);
  const saved = (await db(p)).monetize.newsletters.find((x) => x.title === "Spring Camp Notes");
  check("A7: Save as Draft stores pricing, interests and rich body", saved && saved.status === "Draft" && saved.lock === "Paid" && saved.price === 4 && saved.freePlanIds?.length > 0 && saved.interests?.includes("Sports") && /Big news/.test(saved.body) && /<b>|font-weight/.test(saved.bodyHtml) && path(p) === "/monetize/newsletters", JSON.stringify(saved)?.slice(0, 300));
  // edit + autosave
  await go(p, `/monetize/newsletters/edit/${saved.id}`);
  check("A8: Edit Newsletter at /monetize/newsletters/edit/{id}, values restored", /Edit Newsletter/.test(await text(p)) && (await p.$eval(T("monetize-newsletter-title"), (x) => x.value)) === "Spring Camp Notes" && (await checked(p, "monetize-newsletter-opt-price-check")) === true && (await p.$eval(T("monetize-newsletter-price"), (x) => x.value)) === "4");
  check("A8: 'Draft Auto-Saved: {date}' on Edit", /Draft Auto-Saved: \w{3} \d{2} \d{4}/.test(await text(p, T("monetize-newsletter-autosaved"))));
  const u0 = (await db(p)).monetize.newsletters.find((x) => x.id === saved.id).updatedAt;
  await sleep(1600);
  check("A8: no autosave without a change", (await db(p)).monetize.newsletters.find((x) => x.id === saved.id).updatedAt === u0);
  await p.type(T("monetize-newsletter-title"), "!");
  await sleep(1800);
  const auto = (await db(p)).monetize.newsletters.find((x) => x.id === saved.id);
  check("A8: draft autosaves after a change", auto.title === "Spring Camp Notes!" && auto.updatedAt !== u0 && auto.status === "Draft");
  check("A: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== Layout: 1126×797 and 1512×805, no horizontal overflow ===== */
{
  const p = await page();
  for (const [w, h] of [[1126, 797], [1512, 805]]) {
    await p.setViewport({ width: w, height: h });
    for (const u of ["/monetize/experience", "/monetize/experience/create-experience", "/monetize/newsletters", "/monetize/newsletters/add", "/monetize/newsletters/edit/nl3"]) {
      await go(p, u);
      if (u.endsWith("create-experience")) {
        await click(p, "monetize-product-type");
        await pickOption(p, "In-Person Meetup");
        await sleep(300);
        await p.keyboard.press("Escape");
        await sleep(300);
        await click(p, "monetize-exp-restrict-subscribers");
        await click(p, "monetize-exp-restrict-nft");
      }
      const o = await overflow(p);
      check(`L: ${u} fits at ${w}×${h}`, o <= 0, o);
    }
  }
  check("L: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
