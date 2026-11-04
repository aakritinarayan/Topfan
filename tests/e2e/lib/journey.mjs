// Shared helpers for the presenter-script journeys (exact prompts typed into the real app).
import puppeteer from "../../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
export const BASE = process.env.BASE_URL || "http://localhost:5173";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch(viewport = { width: 1512, height: 805 }) {
  return puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: viewport });
}

export function journey(p) {
  const j = {
    fails: 0,
    log: [],
    check(n, ok, x = "") {
      console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 600));
      if (!ok) j.fails++;
      return ok;
    },
    path: () => new URL(p.url()).pathname,
    url: () => p.url(),
    replies: () => p.$$eval('[data-msg="assistant"]', (x) => x.map((m) => m.innerText)),
    async openPanel() {
      if (!(await p.$('[data-testid="ai-panel"]'))) {
        await p.click('[data-testid="ai-launcher"]');
        await sleep(700);
      }
    },
    async closeAutopilot() {
      await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
    },
    /** Type an exact prompt; returns the new assistant text. */
    async say(q, wait = 1100) {
      await j.openPanel();
      const before = (await j.replies()).length;
      await p.waitForSelector('[data-testid="ai-input"]', { visible: true, timeout: 6000 });
      await p.$eval('[data-testid="ai-input"]', (x) => (x.focus(), x.select?.()));
      await p.keyboard.press("Backspace");
      await p.type('[data-testid="ai-input"]', q);
      await p.keyboard.press("Enter");
      await sleep(wait);
      const r = (await j.replies()).slice(before).join("\n");
      j.log.push({ say: q, reply: r.replace(/\s+/g, " ").slice(0, 400), path: j.path() });
      return r;
    },
    /** Click the newest assistant button whose label matches. */
    async tap(re, wait = 1100) {
      const before = (await j.replies()).length;
      const hit = await p.evaluate((src) => {
        const x = [...document.querySelectorAll('[data-testid="ai-panel"] button')].reverse().find((b) => new RegExp(src, "i").test(b.innerText.trim()) && !b.disabled);
        x?.click();
        return x?.innerText.trim() ?? null;
      }, re.source);
      await sleep(wait);
      const r = (await j.replies()).slice(before).join("\n");
      j.log.push({ tap: hit ?? `(missing ${re})`, reply: r.replace(/\s+/g, " ").slice(0, 400), path: j.path() });
      return { hit, r };
    },
    buttons: () => p.evaluate(() => { const m = [...document.querySelectorAll('[data-msg="assistant"]')].at(-1); return m ? [...m.querySelectorAll("button")].map((b) => b.innerText.trim()).filter(Boolean) : []; }),
    async click(id, wait = 500) {
      await p.waitForSelector(`[data-testid="${id}"]`, { timeout: 6000 });
      await p.click(`[data-testid="${id}"]`);
      await sleep(wait);
    },
    val: (id) => p.$eval(`[data-testid="${id}"]`, (x) => x.value).catch(() => null),
    text: (sel) => p.$eval(sel, (x) => x.innerText).catch(() => ""),
    body: () => p.evaluate(() => document.body.innerText),
    store: (key) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), key),
  };
  return j;
}

export async function freshPage(b, demo, { voice } = {}) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(String(e)));
  p.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && p.errors.push(m.text()));
  p.on("requestfailed", (r) => !/favicon|google|fonts/.test(r.url()) && p.errors.push(`request failed: ${r.url()}`));
  await p.evaluateOnNewDocument((said) => {
    localStorage.setItem("tf-no-delay", "1");
    if (said)
      window.SpeechRecognition = class {
        start() { setTimeout(() => this.onaudiostart?.(), 50); setTimeout(() => { const r = [{ transcript: said }]; r.isFinal = true; this.onresult?.({ resultIndex: 0, results: [r] }); }, 150); }
        stop() { setTimeout(() => this.onend?.(), 50); }
        abort() {}
      };
  }, voice ?? null);
  await p.goto(`${BASE}/demo/${demo}?resetMock=1&noDelay=1`, { waitUntil: "networkidle0" });
  await sleep(1500);
  return p;
}
