// Preferences › White Label Site (Manage): every control does something real. Dev server on :5173.
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1512, height: 805 } });
const p = await b.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : x); if (!ok) fails++; };
const errors = [];
p.on("pageerror", (e) => errors.push(String(e)));
const store = () => p.evaluate(() => JSON.parse(localStorage.getItem("topfan-mock-v1")).account);
const clickText = (t) => p.evaluate((t) => { const e = [...document.querySelectorAll("button")].find((x) => x.innerText.trim().toLowerCase() === t.toLowerCase()); e?.click(); return !!e; }, t);
await p.goto("http://localhost:5173/edit-preference/whitelabel?resetMock=1&noDelay=1", { waitUntil: "networkidle0" });
await sleep(800);
await p.evaluate(() => document.querySelector('[aria-label="Collapse assistant"]')?.click());

// Logo font carousel
const font = () => p.$eval('[data-testid="wls-logo-font"] [data-font]', (e) => e.dataset.font);
const f0 = await font();
await p.click('[aria-label="Next logo font"]'); await sleep(100);
const f1 = await font();
await p.click('[aria-label="Previous logo font"]'); await p.click('[aria-label="Previous logo font"]'); await sleep(100);
const f2 = await font();
check("logo font arrows cycle (wraps both ways)", f0 === "Rubik Dirt" && f1 === "Bebas Neue" && f2 === "Roboto", `${f0} ${f1} ${f2}`);
await p.click('[aria-label="Next logo font"]'); await p.click('[aria-label="Next logo font"]'); await sleep(100); // Bebas Neue
check("rendered in that font", await p.$eval('[data-testid="wls-logo-font"] [data-font]', (e) => getComputedStyle(e).fontFamily.includes("Bebas Neue")));

// Color picker → preview
await p.$eval('[data-testid="wls-color-accent"] input[type=color]', (e) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(e, "#1d6fd8"); e.dispatchEvent(new Event("input", { bubbles: true })); });
await sleep(150);
check("color row shows the new value", (await p.$eval('[data-testid="wls-color-accent"]', (e) => e.innerText)).includes("#1d6fd8"));
check("preview uses the unsaved color", (await p.$eval('[data-testid="wls-site-preview"]', (e) => e.style.getPropertyValue("--accent"))) === "#1d6fd8");
check("dashboard itself unchanged before publishing", (await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--configThemeColor").trim())) === "#bc1111");

// Palette presets
await p.evaluate(() => { const s = [...document.querySelectorAll("button, [role=combobox]")].find((x) => x.innerText.includes("Custom Color Palette")); s?.click(); });
await sleep(200);
await clickText("Standard Themes");
await sleep(200);
check("Standard Themes shows presets", !!(await p.$('[data-testid="wls-palette-presets"]')));
await clickText("Midnight"); await sleep(150);
check("preset applies to the rows", (await p.$eval('[data-testid="wls-color-bg"]', (e) => e.innerText)).includes("#0d1220"));

// Preview interactions
const slide = () => p.$eval('[data-testid="wls-site-preview"] img', (e) => e.getAttribute("src"));
const s0 = await slide();
await p.click('[aria-label="Next slide"]'); await sleep(200);
check("preview carousel arrows change the slide", (await slide()) !== s0);
await p.click('[data-testid="wls-site-preview"] [aria-label="Open menu"]'); await sleep(100);
check("preview menu opens", (await p.$eval('[data-testid="wls-site-preview"]', (e) => e.innerText)).includes("Competitions"));

// Desktop preview → new tab with the unsaved appearance
const tabP = new Promise((r) => b.once("targetcreated", (t) => r(t)));
await clickText("Desktop Preview of White Label Site");
const t = await tabP;
const tp = await t.page();
await sleep(1500);
const tv = await tp.evaluate(() => ({ url: location.href, accent: getComputedStyle(document.documentElement).getPropertyValue("--configThemeColor").trim(), font: getComputedStyle(document.documentElement).getPropertyValue("--font-logo") }));
check("desktop preview opens the site in a new tab with the unsaved look", /wlsPreview/.test(tv.url) && tv.accent === "#1d6fd8" && tv.font.includes("Bebas Neue"), JSON.stringify(tv));
await tp.close();
check("preview tab saved nothing", (await store()).theme.accent === "#bc1111");

// Update & Publish saves for real
await p.click('[data-testid="wls-update-publish"]'); await sleep(300);
const acc = await store();
check("publish saves colors and logo font", acc.theme.accent === "#1d6fd8" && acc.theme.bg === "#0d1220" && acc.logo?.font === "Bebas Neue", JSON.stringify({ t: acc.theme, l: acc.logo }));
check("publish restyles the app", (await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--configThemeColor").trim())) === "#1d6fd8");

// Cover page enable/disable is saved
await clickText("Disable"); await sleep(200);
check("Disable saves coverEnabled=false", (await store()).whiteLabel.coverEnabled === false);
await clickText("Enable"); await sleep(200);
check("Enable saves coverEnabled=true", (await store()).whiteLabel.coverEnabled === true);

// Delete domain → confirm (cancel keeps it)
await p.click('[aria-label="Delete domain"]'); await sleep(300);
check("delete opens the Remove White Label Site confirm", !!(await p.$('[data-testid="modal-wls-remove"]')));
await clickText("Cancel"); await sleep(300);
check("cancel keeps the site active", (await store()).whiteLabel.status === "active" && !(await p.$('[data-testid="modal-wls-remove"]')));

// Upload Logo Image → Select File opens a file picker
await p.evaluate(() => [...document.querySelectorAll("label, [role=radio], button")].find((x) => x.innerText.trim() === "Upload Logo Image")?.click());
await sleep(200);
const [chooser] = await Promise.all([p.waitForFileChooser({ timeout: 2000 }).catch(() => null), clickText("Select File")]);
check("Select File opens the file picker", !!chooser);
if (chooser) await chooser.cancel();

check("no page errors", errors.length === 0, errors.join("\n"));
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await b.close();
process.exit(fails ? 1 : 0);
