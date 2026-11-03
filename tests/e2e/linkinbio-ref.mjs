// Link In Bio vs the reference screen pack (linkinbio-01..19): Preferences pills, empty state + GET STARTED,
// info tips (click popovers, "White Label" spelling), builder rows, COPY LINK (clipboard + toast), referral toggle,
// device switch, Colors & Themes (12 palettes, custom palette editor, 12 themes), NEW ACTION's six dialogs with
// real mock-store rows or the documented empty message, added cards visible/removable/reorderable, inline bio,
// Social Media Links dialog, camera (local object URL), Powered By footer, SAVE CHANGES confirm + store readback,
// DISCARD semantics, and no card overflowing its border (mobile + desktop, edit icons showing) at 1126×797 and 1512×805.
// Usage: node tests/e2e/linkinbio-ref.mjs   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
const COVER = `${tmpdir()}/lib-cover.png`;
const BASE = process.env.BASE_URL || "http://localhost:5173";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1126, height: 797 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 400)); if (!ok) fails++; };
const EDIT = "/edit-preference/link-in-bio/add-link-in-bio";
const VIEW = "/edit-preference/link-in-bio";
const path = (p) => new URL(p.url()).pathname;
const $ = (p, s) => p.$(`[data-testid="${s}"]`);
const click = async (p, s, w = 300) => { await p.$eval(`[data-testid="${s}"]`, (x) => x.click()); await sleep(w); };
const text = (p, s) => p.$eval(`[data-testid="${s}"]`, (x) => x.innerText);
const dialogTitle = (p) => p.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].at(-1)?.getAttribute("aria-label") ?? null);
const lib = (p) => p.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.startsWith("topfan-mock-v1")); return k ? JSON.parse(localStorage.getItem(k)).prefsB.linkInBio : null; });
const cardIds = (p) => p.$$eval('[data-testid^="pref-lib-controls-"]', (x) => x.map((e) => e.dataset.testid.replace("pref-lib-controls-", "")));
const toasts = (p) => p.evaluate(() => document.body.innerText);
const overflowX = (p) => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);

async function fresh(q = "", vp = { width: 1126, height: 797 }) {
  const ctx = await b.createBrowserContext();
  await ctx.overridePermissions(BASE, ["clipboard-read", "clipboard-write", "clipboard-sanitized-write"]);
  const p = await ctx.newPage();
  await p.setViewport(vp);
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(String(e)));
  await p.evaluateOnNewDocument(() => localStorage.setItem("tf-no-delay", "1"));
  await p.goto(`${BASE}/ajwhite?resetMock=1&demo=off${q}`, { waitUntil: "networkidle0" });
  await sleep(800);
  return p;
}
const go = async (p, u) => { await p.goto(`${BASE}${u}`, { waitUntil: "networkidle0" }); await sleep(1000); };

/** Every action card's content stays inside its bordered box, and the edit icons stay inside the canvas. */
async function cardsContained(p) {
  return p.evaluate(() => {
    const bad = [];
    for (const ctl of document.querySelectorAll('[data-testid^="pref-lib-controls-"]')) {
      const row = ctl.parentElement;
      const card = row.firstElementChild.firstElementChild;
      const cr = card.getBoundingClientRect();
      for (const el of card.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (r.right > cr.right + 1 || r.left < cr.left - 1) { bad.push(`${row.dataset.testid}: <${el.tagName.toLowerCase()}> ${Math.round(r.left)}–${Math.round(r.right)} vs ${Math.round(cr.left)}–${Math.round(cr.right)}`); break; }
      }
      const canvas = row.closest('[data-testid^="pref-lib-canvas-"]').getBoundingClientRect();
      const k = ctl.getBoundingClientRect();
      if (k.right > canvas.right + 1 || k.left < cr.right - 1) bad.push(`${ctl.dataset.testid} outside canvas/overlapping card`);
    }
    return bad;
  });
}

/* ===== Empty state, info tip, GET STARTED, DISCARD back to empty ===== */
{
  const p = await fresh("&bioFixture=empty");
  await go(p, VIEW);
  const pills = await p.evaluate(() => document.body.innerText);
  check("01: Preferences pills incl. Link in Bio", ["PROFILE", "WHITE LABEL SITE", "OUTBOUND EMAILS", "LINK IN BIO", "DELEGATION", "GAMIFICATION"].every((x) => pills.includes(x)));
  check("02: empty state when never saved", !!(await $(p, "pref-lib-empty")) && /Create Your Link in Bio/.test(await text(p, "pref-lib-empty")) && !(await $(p, "pref-lib-preview")) && !(await $(p, "pref-lib-url")));
  check("02: no popover until clicked", !(await $(p, "pref-lib-info-popover")));
  await click(p, "pref-lib-info");
  const tip = await text(p, "pref-lib-info-popover");
  check("03: info tip opens on click, says White Label (not While)", /White Label Site URL/.test(tip) && !/While Label/.test(tip), tip);
  await click(p, "pref-lib-info");
  check("03: clicking again closes it", !(await $(p, "pref-lib-info-popover")));
  await click(p, "pref-lib-get-started", 800);
  check("02: GET STARTED → builder", path(p) === EDIT && !!(await $(p, "pref-lib-toolbar")), path(p));
  check("02: builder starts with no action cards", (await cardIds(p)).length === 0);
  await click(p, "pref-lib-discard", 800);
  check("DISCARD with nothing saved → empty state again", path(p) === VIEW && !!(await $(p, "pref-lib-empty")));
  // Save once → empty state never returns.
  await click(p, "pref-lib-get-started", 800);
  await click(p, "pref-lib-save");
  await click(p, "modal-pref-lib-save-confirm", 900);
  check("first save marks the page created (view, not empty)", path(p) === VIEW && !(await $(p, "pref-lib-empty")) && (await lib(p)).created === true);
  await go(p, EDIT);
  await click(p, "pref-lib-discard", 800);
  check("DISCARD after a save → saved view (not empty)", !(await $(p, "pref-lib-empty")) && !!(await $(p, "pref-lib-preview")));
  check("empty flow: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== Builder rows, copy link, referral, device switch, palettes, custom palette ===== */
{
  const p = await fresh();
  await go(p, EDIT);
  check("04: heading + DISABLE/ENABLE", !!(await $(p, "pref-lib-enable-disable")) && !!(await $(p, "pref-lib-enable-enable")));
  const url = await p.$eval('[data-testid="pref-lib-url"]', (x) => ({ v: x.value, ro: x.readOnly }));
  check("04: read-only /bio/{slug} URL", url.ro && /\/bio\/ajwhite$/.test(url.v), JSON.stringify(url));
  await p.click('[data-testid="pref-lib-copy"]');
  await sleep(500);
  const clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => null));
  check("COPY LINK writes the clipboard + toast", clip === url.v && /Copied to clipboard/.test(await toasts(p)), clip);
  await click(p, "pref-lib-referral-info");
  check("12: referral tip (click) with 'here' link", /commission/.test(await text(p, "pref-lib-referral-info-popover")) && !!(await $(p, "pref-lib-referral-here")));
  await click(p, "pref-lib-referral-info");
  check("footer: Powered By, no referral link while off", /Powered By/.test(await text(p, "pref-lib-footer")) && !(await $(p, "pref-lib-get-platform")));
  await click(p, "pref-lib-referral");
  check("referral toggle → mock state + link at page bottom", (await lib(p)).includeReferral === true && !!(await $(p, "pref-lib-get-platform")));
  check("04: PREVIEW bar: DISCARD, SAVE CHANGES, device switch", !!(await $(p, "pref-lib-discard")) && !!(await $(p, "pref-lib-save")) && !!(await $(p, "pref-lib-device-mobile")));
  check("16: desktop canvas by default", !!(await $(p, "pref-lib-canvas-desktop")));
  await click(p, "pref-lib-device-mobile");
  const mob = await p.$eval('[data-testid="pref-lib-canvas-mobile"]', (x) => { const r = x.getBoundingClientRect(), q = x.parentElement.getBoundingClientRect(); return { w: r.width, centred: Math.abs((r.left + r.right) / 2 - (q.left + q.right) / 2) < 4 }; });
  check("19: mobile = narrower, centred frame", mob.w <= 420 && mob.centred, JSON.stringify(mob));
  await click(p, "pref-lib-device-desktop");

  await click(p, "pref-lib-colors");
  const nPal = await p.$$eval('[data-testid^="pref-lib-palette-"]', (x) => x.filter((e) => /^pref-lib-palette-\d+$/.test(e.dataset.testid)).length);
  const nTheme = await p.$$eval('[data-testid^="pref-lib-theme-"]', (x) => x.length);
  const cols = await p.$eval('[data-testid="pref-lib-palette-0"]', (x) => getComputedStyle(x.parentElement).gridTemplateColumns.split(" ").length);
  check("13/14: 12 standard swatches in 3 columns, 12 themes", nPal === 12 && cols === 3 && nTheme === 12, `${nPal} ${cols} ${nTheme}`);
  await click(p, "pref-lib-palette-5");
  await click(p, "pref-lib-theme-space");
  await click(p, "pref-lib-palette-custom-edit");
  check("15: custom palette replaces the panel (6 rows, back arrow)", !!(await $(p, "pref-lib-custom-panel")) && (await p.$$('[data-testid^="pref-lib-custom-hex-"]')).length === 6 && !(await $(p, "pref-lib-palette-0")) && !!(await $(p, "pref-lib-custom-back")));
  await p.$eval('[data-testid="pref-lib-custom-hex-4"]', (x) => x.select());
  await p.type('[data-testid="pref-lib-custom-hex-4"]', "#12ZZ");
  check("15: invalid hex disables SAVE CUSTOM COLORS", await p.$eval('[data-testid="pref-lib-custom-save"]', (x) => x.disabled));
  await p.$eval('[data-testid="pref-lib-custom-hex-4"]', (x) => x.select());
  await p.type('[data-testid="pref-lib-custom-hex-4"]', "#123456");
  await click(p, "pref-lib-custom-cancel");
  check("15: CANCEL returns to the panel, nothing applied", !!(await $(p, "pref-lib-palette-0")) && (await p.$eval('[data-testid="pref-lib-palette-5"]', (x) => x.getAttribute("aria-pressed"))) === "true");
  await click(p, "pref-lib-palette-custom-edit");
  await p.$eval('[data-testid="pref-lib-custom-hex-4"]', (x) => x.select());
  await p.type('[data-testid="pref-lib-custom-hex-4"]', "#123456");
  await click(p, "pref-lib-custom-save");
  const btn = await p.$eval('[data-testid="pref-lib-bio-card"] [data-testid="pref-lib-social-row"]', (x) => getComputedStyle(x).color);
  check("15: SAVE CUSTOM COLORS applies the custom palette to the preview", btn === "rgb(18, 52, 86)" && (await p.$eval('[data-testid="pref-lib-palette-custom"]', (x) => x.getAttribute("aria-pressed"))) === "true", btn);
  check("builder: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== NEW ACTION dialogs, cards, reorder/remove, bio, socials, camera, save ===== */
{
  const p = await fresh();
  await go(p, EDIT);
  const before = await cardIds(p);
  await click(p, "pref-lib-new-action");
  const items = await p.$$eval('[data-testid="pref-lib-new-action-menu"] button', (x) => x.map((e) => e.innerText.trim()));
  check("05: NEW ACTION lists 6 items", items.length === 6 && items[0] === "+ Add a General Action Item" && items[5] === "+ Add an External Action Item", items.join("|"));
  const open = async (kind) => { await click(p, "pref-lib-new-action", 200); await click(p, `pref-lib-new-action-${kind}`, 400); };
  await click(p, "pref-lib-new-action", 200);

  await open("general");
  check("06: Add General Action Buttons with Join My Chatroom", (await dialogTitle(p)) === "Add General Action Buttons" && !!(await $(p, "modal-pref-lib-general-chatroom")));
  check("06: SAVE ACTIONS disabled until selected", await p.$eval('[data-testid="modal-pref-lib-action-add"]', (x) => x.disabled));
  await click(p, "modal-pref-lib-general-chatroom");
  await click(p, "modal-pref-lib-action-add", 400);

  await open("store-item");
  const storeRows = await p.$$eval('[data-testid^="modal-pref-lib-pick-"]', (x) => x.map((e) => e.innerText));
  check("07: store picker lists real store items", (await dialogTitle(p)) === "Add a Specific Store Item Button" && storeRows.some((r) => /Spectrum X/.test(r)), storeRows.join("|"));
  await p.type('[data-testid="modal-pref-lib-search"]', "zzzz");
  await sleep(200);
  check("07: search with no match → No Results Found", /No Results Found/.test(await text(p, "modal-pref-lib-empty")));
  await p.$eval('[data-testid="modal-pref-lib-search"]', (x) => x.select());
  await p.type('[data-testid="modal-pref-lib-search"]', "spectrum");
  await sleep(200);
  await click(p, "modal-pref-lib-pick-merch-spectrum");
  await click(p, "modal-pref-lib-action-add", 400);

  await open("feed");
  check("08: feed picker with ALL pill", (await dialogTitle(p)) === "Add Specific Feed Content Items" && (await p.$eval('[data-testid="modal-pref-lib-filter-all"]', (x) => x.getAttribute("aria-pressed"))) === "true");
  const feedIds = await p.$$eval('[data-testid^="modal-pref-lib-pick-"]', (x) => x.slice(0, 2).map((e) => e.dataset.testid));
  check("08: feed lists published posts (multi-select)", feedIds.length === 2, feedIds.join());
  for (const id of feedIds) await click(p, id, 150);
  await click(p, "modal-pref-lib-action-add", 400);

  await open("portfolio");
  check("09: portfolio picker lists portfolios", (await dialogTitle(p)) === "Add a Specific Portfolio Item" && /Videos/.test(await p.$eval('[role="dialog"]', (x) => x.innerText)));
  await click(p, "modal-pref-lib-pick-1760000000001");
  await click(p, "modal-pref-lib-action-add", 400);

  await open("event");
  const evText = await p.$eval('[role="dialog"]', (x) => x.innerText);
  check("10: event picker: Search events + No Events Found (no events in the store)", (await dialogTitle(p)) === "Add a Specific Event Ticketing Item" && /No Events Found/.test(evText) && (await p.$eval('[data-testid="modal-pref-lib-search"]', (x) => x.placeholder)) === "Search events", evText);
  await p.keyboard.press("Escape");
  await sleep(300);

  await open("external");
  check("11: external dialog fields", (await dialogTitle(p)) === "Add an External Action Button" && (await p.$eval('[data-testid="modal-pref-lib-action-title"]', (x) => x.placeholder)) === "Enter action label" && (await p.$eval('[data-testid="modal-pref-lib-action-extra"]', (x) => x.placeholder)) === "Enter action URL");
  await click(p, "modal-pref-lib-action-add");
  check("11: required fields validated", /required/i.test(await p.$eval('[role="dialog"]', (x) => x.innerText)));
  await p.type('[data-testid="modal-pref-lib-action-title"]', "My Shop");
  await p.type('[data-testid="modal-pref-lib-action-extra"]', "not a url");
  await click(p, "modal-pref-lib-action-add");
  check("11: invalid URL blocked in the dialog", !!(await dialogTitle(p)) && /full web address/.test(await p.$eval('[role="dialog"]', (x) => x.innerText)));
  await p.$eval('[data-testid="modal-pref-lib-action-extra"]', (x) => x.select());
  await p.type('[data-testid="modal-pref-lib-action-extra"]', "https://shop.example.com");
  await click(p, "modal-pref-lib-action-add", 400);

  let ids = await cardIds(p);
  check("8 gap: added cards visible in the preview (6 new)", ids.length === before.length + 6, `${before.length} → ${ids.length}`);
  const preview = await text(p, "pref-lib-preview");
  check("added card titles shown", ["Join My Chatroom", "Spectrum X", "Videos", "My Shop"].every((t) => preview.includes(t)), preview.slice(0, 300));
  const last = ids.at(-1);
  await click(p, `pref-lib-move-up-${last}`);
  ids = await cardIds(p);
  check("reorder: Move up", ids.at(-2) === last);
  check("reorder: first card's Move up disabled", await p.$eval(`[data-testid="pref-lib-move-up-${ids[0]}"]`, (x) => x.disabled));
  await click(p, `pref-lib-move-down-${last}`);
  check("reorder: Move down", (await cardIds(p)).at(-1) === last);
  await click(p, `pref-lib-action-delete-${ids[0]}`);
  check("remove: trash removes the card", !(await cardIds(p)).includes(ids[0]));

  // Inline bio
  await p.$eval('[data-testid="pref-lib-bio-text"]', (x) => x.select());
  await p.type('[data-testid="pref-lib-bio-text"]', "Rider. Coach. Park rat.");
  // Social links
  check("16: social row shows only filled links + pencil", (await p.$$('[data-testid="pref-lib-social-row"] [data-testid^="pref-lib-social-"]:not([data-testid="pref-lib-social-edit"])')).length === 4);
  await click(p, "pref-lib-social-edit", 400);
  const rows = await p.$$eval('[data-testid^="modal-pref-lib-social-"]', (x) => x.filter((e) => e.tagName === "INPUT").map((e) => [e.placeholder, e.value]));
  check("17: Social Media Links: 8 rows, Add URL, prefilled from setup", rows.length === 8 && rows.every((r) => r[0] === "Add URL") && rows[2][1] === "https://instagram.com/ajwhite", JSON.stringify(rows));
  await click(p, "modal-pref-lib-social-clear-facebook");
  check("17: X clears a row", (await p.$eval('[data-testid="modal-pref-lib-social-facebook"]', (x) => x.value)) === "");
  await p.type('[data-testid="modal-pref-lib-social-tiktok"]', "nope");
  await click(p, "modal-pref-lib-social-save");
  check("17: invalid URL keeps the dialog open with an error", !!(await $(p, "modal-pref-lib-social")) && /full web address/.test(await text(p, "modal-pref-lib-social")));
  await p.$eval('[data-testid="modal-pref-lib-social-tiktok"]', (x) => x.select());
  await p.type('[data-testid="modal-pref-lib-social-tiktok"]', "https://tiktok.example/ajwhite");
  await click(p, "modal-pref-lib-social-save", 400);
  check("17: SAVE LINKS updates the preview icons", !!(await $(p, "pref-lib-social-tiktok")) && !(await $(p, "pref-lib-social-facebook")));
  // Camera → local object URL
  writeFileSync(COVER, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
  const [chooser] = await Promise.all([p.waitForFileChooser({ timeout: 3000 }).catch(() => null), p.click('[data-testid="pref-lib-cover-camera"]')]);
  if (chooser) await chooser.accept([COVER]);
  await sleep(400);
  check("camera: file picker → local object URL preview", !!chooser && (await p.$eval('[data-testid="pref-lib-bio-card"]', (x) => [...x.querySelectorAll("img")].some((i) => i.src.startsWith("blob:")))));

  // No overflow: both devices, both widths, edit icons showing.
  for (const vp of [{ width: 1126, height: 797 }, { width: 1512, height: 805 }]) {
    await p.setViewport(vp);
    for (const dev of ["desktop", "mobile"]) {
      await click(p, `pref-lib-device-${dev}`, 400);
      const bad = await cardsContained(p);
      check(`cards inside their borders (${dev} @ ${vp.width})`, bad.length === 0, bad.join("\n"));
      check(`no horizontal page overflow (${dev} @ ${vp.width})`, !(await overflowX(p)));
    }
  }
  await p.setViewport({ width: 1126, height: 797 });

  const draftIds = await cardIds(p);
  await click(p, "pref-lib-save", 300);
  check("SAVE CHANGES asks to Publish Link In Bio", (await dialogTitle(p)) === "Publish Link In Bio");
  await click(p, "modal-pref-lib-save-confirm", 900);
  const s = await lib(p);
  check("saved through the store: actions, order, bio, socials", JSON.stringify(s.actions.map((a) => a.id)) === JSON.stringify(draftIds) && s.bio === "Rider. Coach. Park rat." && s.socials.tiktok && !s.socials.facebook && path(p) === VIEW, JSON.stringify({ bio: s.bio, socials: s.socials }));
  check("saved card URLs point at real destinations", s.actions.some((a) => /\/ajwhite\/store\/merch-spectrum$/.test(a.url ?? "")) && s.actions.some((a) => /\/chat-room$/.test(a.url ?? "")));
  check("view shows saved bio + no edit icons", /Rider\. Coach\. Park rat\./.test(await text(p, "pref-lib-bio-text-view")) && !(await p.$('[data-testid^="pref-lib-controls-"]')));

  // DISCARD reverts unsaved edits.
  await go(p, EDIT);
  await click(p, `pref-lib-action-delete-${draftIds[0]}`);
  await click(p, "pref-lib-discard", 800);
  await go(p, EDIT);
  check("DISCARD reverts the unsaved draft", (await cardIds(p)).length === draftIds.length);
  check("actions flow: no page errors", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== Refused save → error, no fake success ===== */
{
  const p = await fresh("&bioFixture=save-fail");
  await go(p, EDIT);
  const before = JSON.stringify(await lib(p));
  await p.$eval('[data-testid="pref-lib-bio-text"]', (x) => x.select());
  await p.type('[data-testid="pref-lib-bio-text"]', "Changed");
  await click(p, "pref-lib-save");
  await click(p, "modal-pref-lib-save-confirm", 800);
  const body = await toasts(p);
  check("refused save: error shown, nothing stored, still in editor", /couldn't be saved/i.test(body) && !/Link In Bio saved/.test(body) && path(p) === EDIT && JSON.stringify(await lib(p)) === before);
  await p.browserContext().close();
}

await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
