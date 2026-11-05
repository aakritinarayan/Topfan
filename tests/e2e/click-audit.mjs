// Click audit: on every route, click every visible control (buttons, links, tabs, clickable cards)
// and report the ones that do nothing: no navigation, no DOM change, no new tab, no clipboard write,
// no focus or scroll change, no native form validation. Controls revealed by a click (menus, tabs,
// modals) are tested too, up to MAX_DEPTH clicks deep. Disabled controls are skipped (intentional).
// Each test runs in a fresh page with fresh mock data, in parallel isolated browser contexts.
// Usage: node tests/e2e/click-audit.mjs [--json out.json] [--only routeId,routeId] [--workers 6]
import fs from "node:fs";
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const jsonOut = arg("--json", null), only = arg("--only", null)?.split(","), WORKERS = Number(arg("--workers", 6));
const MAX_DEPTH = 2, PER_SIG = 2, BASE = process.env.BASE_URL || "http://localhost:5173";
const routes = JSON.parse(fs.readFileSync(new URL("../../docs/agent-context/routes.json", import.meta.url)));
const list = (Array.isArray(routes) ? routes : routes.routes).filter((r) => !only || only.includes(r.id));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });

/* ---------- params (same as media-audit) ---------- */
const boot = await (await b.createBrowserContext()).newPage();
await boot.goto(`${BASE}/?noDelay=1&resetMock=1`, { waitUntil: "networkidle0" });
const d = await boot.evaluate(() => JSON.parse(localStorage.getItem("topfan-mock-v1")));
await boot.browserContext().close();
const m = d.monetize, prod = (k) => m.products.find((x) => x.kind === k)?.id, port = m.portfolios[0];
const P = { handle: d.account.handle, planId: m.plans[0]?.id, newsletterId: m.newsletters[0]?.id, eventId: m.events[0]?.id, offerId: m.vipOffers[0]?.id, portfolioId: port?.id, seriesId: port && `PORTFOLIO-${port.id}-${port.series[0]?.id}`, category: "tips", postId: d.social.posts[0]?.id };
const productFor = (id) => ({ "monetize-experience-edit": prod("experience"), "monetize-course-edit": prod("course"), "monetize-downloadable-edit": prod("downloadable"), "monetize-merch-edit": prod("merchandise"), "monetize-nft-edit": prod("nft"), "public-booking": prod("experience") })[id] ?? prod("merchandise");
const pathOf = (r) => r.pattern.replace(/:(\w+)/g, (_, k) => (k === "productId" ? productFor(r.id) : P[k]) ?? "missing");

/* ---------- in-page helpers ---------- */
const PAGE_JS = () => {
  const SEM = 'button, a[href], [role=button], [role=tab], [role=menuitem], [role=link], [role=checkbox], [role=radio], [role=switch], [role=option], input[type=checkbox], input[type=radio], input[type=submit], select, summary';
  const skip = (e) => e.closest('[data-testid="ai-panel"], [data-testid="ai-launcher"], [data-review-bar], [aria-hidden="true"]');
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05; };
  const disabled = (e) => e.disabled || e.getAttribute("aria-disabled") === "true" || !!e.closest("fieldset[disabled]");
  const label = (e) => (e.getAttribute("aria-label") || e.innerText || e.value || e.getAttribute("title") || e.querySelector("img")?.alt || "").trim().replace(/\s+/g, " ").slice(0, 60);
  const sig = (e) => [e.tagName.toLowerCase(), e.getAttribute("role") ?? "", label(e), e.getAttribute("href") ?? "", e.dataset.testid ?? ""].join("|");
  window.__clickables = () => {
    const sem = [...document.querySelectorAll(SEM)];
    // Clickable cards: topmost cursor:pointer elements that aren't inside a semantic control.
    const ptr = [...document.querySelectorAll("div, li, span, img, svg, label, article, section, td, tr, p, h2, h3, h4")].filter((e) => {
      if (e.closest(SEM)) return false;
      if (getComputedStyle(e).cursor !== "pointer") return false;
      const p = e.parentElement;
      return !p || getComputedStyle(p).cursor !== "pointer";
    });
    const seen = new Map();
    return [...sem, ...ptr].filter((e) => !skip(e) && vis(e)).map((e) => {
      const s = sig(e); const n = seen.get(s) ?? 0; seen.set(s, n + 1);
      return { sig: s, occ: n, label: label(e), disabled: disabled(e), shell: !!e.closest("nav, aside, header"), html: e.outerHTML.slice(0, 160) };
    });
  };
  window.__find = (s, occ) => {
    const all = [...document.querySelectorAll("*")];
    let n = 0;
    for (const e of all) if (!skip(e) && vis(e) && sig(e) === s) { if (n === occ) return e; n++; }
    return null;
  };
  // Effects we can't see in the DOM.
  window.__fx = [];
  const wo = window.open; window.open = (...a) => (window.__fx.push("window.open"), wo.apply(window, a));
  if (navigator.clipboard) { const w = navigator.clipboard.writeText.bind(navigator.clipboard); navigator.clipboard.writeText = (t) => (window.__fx.push("clipboard"), w(t).catch(() => {})); }
  document.addEventListener("click", (ev) => { const a = ev.target.closest?.("a[download]"); if (a) window.__fx.push("download"); }, true);
  const ip = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () { if (this.type === "file") { window.__fx.push("file-picker"); return; } return ip.call(this); };
};

async function clickBy(p, s, occ) {
  return p.evaluate((s, occ) => { const e = window.__find(s, occ); if (!e) return false; e.scrollIntoView({ block: "center" }); e.click(); return true; }, s, occ);
}

async function open(ctx, path) {
  const p = await ctx.newPage();
  await p.setViewport({ width: 1512, height: 805 });
  await p.evaluateOnNewDocument(PAGE_JS);
  p.on("dialog", (dl) => { p.__dialog = true; dl.accept().catch(() => {}); });
  p.on("pageerror", (e) => (p.__errors ??= []).push(String(e).slice(0, 200)));
  await p.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}noDelay=1&resetMock=1`, { waitUntil: "networkidle0", timeout: 20000 }).catch(() => {});
  // Collapse the assistant so it doesn't cover the page; it's audited separately.
  await p.evaluate(() => document.querySelector('[data-testid="ai-collapse"]')?.click());
  await sleep(350);
  return p;
}

/* ---------- one test: replay prefix, click target, observe ---------- */
async function test(ctx, task) {
  const p = await open(ctx, task.path);
  try {
    for (const step of task.prefix) { if (!(await clickBy(p, step.sig, step.occ))) return { ...task, result: "prefix-missing" }; await sleep(500); }
    const before = await p.evaluate(() => window.__clickables().map((c) => `${c.sig}#${c.occ}`));
    // Baseline: which nodes change on their own (animations, carousels)?
    await p.evaluate(() => { window.__noisy = new Set(); window.__bo = new MutationObserver((ms) => ms.forEach((x) => window.__noisy.add(x.target))); window.__bo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); });
    await sleep(400);
    const url0 = p.url();
    const ok = await p.evaluate((s, occ) => {
      window.__bo.disconnect();
      const e = window.__find(s, occ);
      if (!e) return false;
      e.scrollIntoView({ block: "center" });
      window.__state = { scroll: [scrollX, scrollY, ...[...document.querySelectorAll("*")].filter((x) => x.scrollTop > 0).map((x) => x.scrollTop)].join(","), focus: null, n: 0, form: e.form ?? e.closest("form") };
      window.__mo = new MutationObserver((ms) => { for (const x of ms) { let t = x.target, noisy = false; while (t) { if (window.__noisy.has(t)) { noisy = true; break; } t = t.parentNode; } if (!noisy) window.__state.n++; } });
      window.__mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
      window.__state.focus = document.activeElement;
      e.click();
      return true;
    }, task.sig, task.occ);
    if (!ok) return { ...task, result: "target-missing" };
    const newTab = new Promise((r) => { const h = (t) => t.opener?.() && r(true); b.once("targetcreated", h); setTimeout(() => (b.off("targetcreated", h), r(false)), 900); });
    await sleep(900);
    const tab = await newTab;
    const fx = await p.evaluate(() => {
      const s = window.__state; const f = [];
      if (s.n) f.push(`dom:${s.n}`);
      if (document.activeElement !== s.focus && document.activeElement !== document.body && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) f.push("focus");
      const sc = [scrollX, scrollY, ...[...document.querySelectorAll("*")].filter((x) => x.scrollTop > 0).map((x) => x.scrollTop)].join(",");
      if (sc !== s.scroll) f.push("scroll");
      if (s.form && typeof s.form.checkValidity === "function" && !s.form.checkValidity()) f.push("native-validation");
      return [...f, ...window.__fx];
    }).catch(() => ["navigated-away"]);
    if (p.url() !== url0) fx.push("url");
    if (tab) fx.push("new-tab");
    if (p.__dialog) fx.push("dialog");
    // Controls revealed by this click become new targets (one level deeper).
    let revealed = [];
    if (fx.length && task.prefix.length + 1 < MAX_DEPTH + 1 && p.url() === url0) {
      const after = await p.evaluate(() => window.__clickables()).catch(() => []);
      const was = new Set(before);
      revealed = after.filter((c) => !was.has(`${c.sig}#${c.occ}`) && !c.disabled && c.occ < PER_SIG);
    }
    return { ...task, result: fx.length ? "ok" : "dead", fx, errors: p.__errors ?? [], revealed };
  } finally {
    await p.close().catch(() => {});
  }
}

/* ---------- queue ---------- */
const queue = [], results = [], shellDone = new Set();
for (const r of list) {
  const path = pathOf(r);
  const ctx = await b.createBrowserContext();
  const p = await open(ctx, path);
  const cs = await p.evaluate(() => window.__clickables()).catch(() => []);
  await ctx.close();
  for (const c of cs) {
    if (c.disabled || c.occ >= PER_SIG) continue;
    if (c.shell) { if (shellDone.has(c.sig)) continue; shellDone.add(c.sig); }
    queue.push({ route: r.id, path, prefix: [], sig: c.sig, occ: c.occ, label: c.label, html: c.html });
  }
}
console.log(`${list.length} routes, ${queue.length} controls to click`);
const seenChain = new Set(queue.map((t) => `${t.route}>${t.sig}#${t.occ}`));
let done = 0;
async function worker() {
  while (queue.length) {
    const task = queue.shift();
    const ctx = await b.createBrowserContext();
    let res;
    try { res = await test(ctx, task); } catch (e) { res = { ...task, result: "crash", fx: [String(e).slice(0, 120)] }; }
    await ctx.close().catch(() => {});
    results.push(res);
    for (const c of res.revealed ?? []) {
      const prefix = [...task.prefix, { sig: task.sig, occ: task.occ, label: task.label }];
      const key = `${task.route}>${c.sig}#${c.occ}`;
      if (seenChain.has(key)) continue;
      seenChain.add(key);
      queue.push({ route: task.route, path: task.path, prefix, sig: c.sig, occ: c.occ, label: c.label, html: c.html });
    }
    if (++done % 50 === 0) console.log(`${done} clicked, ${queue.length} queued, ${results.filter((r) => r.result === "dead").length} dead`);
    if (res.result === "dead") console.log(`DEAD  ${res.route}  ${res.prefix.map((x) => x.label).join(" > ")}${res.prefix.length ? " > " : ""}"${res.label}"`);
    if (res.errors?.length) console.log(`ERROR ${res.route} "${res.label}": ${res.errors[0]}`);
  }
}
await Promise.all(Array.from({ length: WORKERS }, worker));
const dead = results.filter((r) => r.result === "dead");
const errs = results.filter((r) => r.errors?.length);
console.log(`\n${results.length} controls clicked: ${dead.length} dead, ${errs.length} with page errors, ${results.filter((r) => /missing|crash/.test(r.result)).length} not re-found`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results.map(({ revealed, ...r }) => r), null, 1));
await b.close();
process.exit(dead.length || errs.length ? 1 : 0);
