// Floating mascot launcher: bottom-right placement, size and margins per viewport, a 44px+ target,
// keyboard access, open/close without losing the conversation. Dev server on :5173.
// Usage: node tests/e2e/launcher.mjs [--shots dir]
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const OUT = process.argv.includes("--shots") ? process.argv[process.argv.indexOf("--shots") + 1] : null;
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const p = await b.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : x); if (!ok) fails++; };
const errors = [];
p.on("pageerror", (e) => errors.push(String(e)));
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));

// Visible body of the mascot = SVG box inset by 7% (the body rect is x/y 7..93 of a 100 viewBox).
const measure = () =>
  p.evaluate(() => {
    const btn = document.querySelector('[data-testid="ai-launcher"]');
    if (!btn) return null;
    const s = btn.querySelector("svg").getBoundingClientRect();
    const i = s.width * 0.07;
    const r = btn.getBoundingClientRect();
    return {
      body: Math.round(s.width - 2 * i),
      right: Math.round(innerWidth - (s.right - i)),
      bottom: Math.round(innerHeight - (s.bottom - i)),
      target: [Math.round(r.width), Math.round(r.height)],
      label: btn.getAttribute("aria-label"),
      text: btn.textContent.trim(),
      inViewport: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
    };
  });

// Static geometry with reduced motion (no float offset); then a normal-motion pass for open/close.
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
for (const [w, h, body, gap] of [[1512, 805, 72, 28], [1126, 797, 66, 24], [390, 844, 58, 18]]) {
  await p.setViewport({ width: w, height: h });
  await p.goto(`${BASE}/ajwhite?noDelay=1&resetMock=1`, { waitUntil: "networkidle0" });
  await sleep(400);
  if (await p.$('[data-testid="ai-panel"]')) { await p.click('[data-testid="ai-collapse"]'); await sleep(400); }
  const m = await measure();
  check(`${w}: launcher present, no text`, !!m && m.text === "", JSON.stringify(m));
  if (!m) continue;
  check(`${w}: mascot body ${body}px`, Math.abs(m.body - body) <= 1, JSON.stringify(m));
  check(`${w}: ${gap}px from right and bottom`, Math.abs(m.right - gap) <= 1 && Math.abs(m.bottom - gap) <= 1, JSON.stringify(m));
  check(`${w}: target ≥44px and fully in view`, m.target[0] >= 44 && m.target[1] >= 44 && m.inViewport, JSON.stringify(m));
  check(`${w}: accessible label`, m.label === "Open TopFan AI Assistant", m.label);
  await p.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await sleep(200);
  const after = await measure();
  check(`${w}: stays anchored when scrolling`, after.right === m.right && after.bottom === m.bottom, JSON.stringify(after));
  if (OUT) await p.screenshot({ path: `${OUT}/launcher-${w}.png` });
}

// Open/close with motion on, preserving the conversation.
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await p.setViewport({ width: 1512, height: 805 });
await p.goto(`${BASE}/ajwhite?noDelay=1&resetMock=1`, { waitUntil: "networkidle0" });
await sleep(600);
if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(600); }
const msgs = () => p.evaluate(() => document.querySelector('[data-testid="ai-panel"]')?.innerText.length ?? 0);
const before = await msgs();
await p.click('[data-testid="ai-collapse"]');
await sleep(500);
check("collapse shows the mascot, no panel", !!(await p.$('[data-testid="ai-launcher"]')) && !(await p.$('[data-testid="ai-panel"]')));
check("no edge tab left (launcher not vertically centered)", await p.evaluate(() => { const r = document.querySelector('[data-testid="ai-launcher"]').getBoundingClientRect(); return r.bottom > innerHeight - 60; }));
await p.hover('[data-testid="ai-launcher"]');
await sleep(400);
if (OUT) await p.screenshot({ path: `${OUT}/launcher-hover.png` });
// Keyboard: focus and Enter.
await p.mouse.move(10, 10);
await p.keyboard.press("Shift"); // last input is the keyboard, so :focus-visible applies
await p.focus('[data-testid="ai-launcher"]');
await sleep(100);
const ring = await p.evaluate(() => getComputedStyle(document.activeElement).boxShadow);
check("visible focus ring", ring && ring !== "none", ring);
await p.keyboard.press("Enter");
await sleep(700);
check("Enter opens the panel", !!(await p.$('[data-testid="ai-panel"]')) && !(await p.$('[data-testid="ai-launcher"]')));
const op = await p.evaluate(() => { const a = document.querySelector('[data-testid="ai-panel"]'); const r = a.getBoundingClientRect(); return { o: getComputedStyle(a).opacity, right: Math.round(r.right), w: innerWidth }; });
check("panel settles fully inside the viewport", op.o === "1" && op.right <= op.w, JSON.stringify(op));
check("conversation preserved across close/open", (await msgs()) === before, `${before} vs ${await msgs()}`);
if (OUT) await p.screenshot({ path: `${OUT}/launcher-open.png` });

// Unread indicator only when there's something unread.
await p.click('[data-testid="ai-collapse"]');
await sleep(400);
check("no badge when nothing is unread", !(await p.$('[data-testid="ai-launcher-unread"]')));

check("no console errors", errors.length === 0, errors.join("\n"));
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await b.close();
process.exit(fails ? 1 : 0);
