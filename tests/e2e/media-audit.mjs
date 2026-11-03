// Media audit: visits every route in docs/agent-context/routes.json (params filled from the mock store)
// and reports empty media frames, avatar fallbacks, broken images and videos without poster/source.
// Usage: node tests/e2e/media-audit.mjs [1512|1126] [--json out.json]   (dev server on :5173)
import fs from "node:fs";
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const W = Number(process.argv[2]) || 1512, H = W === 1126 ? 797 : 805;
const jsonOut = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
const routes = JSON.parse(fs.readFileSync(new URL("../../docs/agent-context/routes.json", import.meta.url)));
const list = Array.isArray(routes) ? routes : routes.routes;
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: W, height: H } });
const p = await b.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const failed = [];
p.on("requestfailed", (r) => /\.(png|jpe?g|webp|avif|svg|mp4|webm)(\?|$)/.test(r.url()) && failed.push(r.url()));
p.on("response", (r) => r.status() >= 400 && /\.(png|jpe?g|webp|avif|svg|mp4|webm)(\?|$)/.test(r.url()) && failed.push(`${r.status()} ${r.url()}`));
await p.goto(`${BASE}/?noDelay=1&resetMock=1`, { waitUntil: "networkidle0" });
// The default seed has no events (per spec); add the Bandsintown sample event (same data as the in-app import) so event detail is audited.
const d = await p.evaluate(() => {
  const d = JSON.parse(localStorage.getItem("topfan-mock-v1"));
  if (!d.monetize.events.length) d.monetize.events.push({ id: "audit-ev1", title: "Copper Ridge Rail Jam", date: "2027-01-16T20:00:00Z", time: "1:00 PM", timeZone: "US/Mountain", tzAbbr: "MST", location: "Copper Ridge Resort - Summit County, Colorado", description: "Imported from Bandsintown.", kind: "event", image: "events/poster", ctas: ["TICKETS"], maxPerPerson: 10, tickets: [], source: "bandsintown", past: false });
  localStorage.setItem("topfan-mock-v1", JSON.stringify(d));
  return d;
});
const m = d.monetize, prod = (k) => m.products.find((x) => x.kind === k)?.id;
const port = m.portfolios[0];
const P = {
  handle: d.account.handle, planId: m.plans[0]?.id, newsletterId: m.newsletters[0]?.id, eventId: m.events.find((e) => !e.past)?.id ?? m.events[0]?.id,
  offerId: m.vipOffers[0]?.id, portfolioId: port?.id, seriesId: port && `PORTFOLIO-${port.id}-${port.series[0]?.id}`, category: "tips", postId: d.social.posts[0]?.id,
};
const productFor = (id) => ({ "monetize-experience-edit": prod("experience"), "monetize-course-edit": prod("course"), "monetize-downloadable-edit": prod("downloadable"), "monetize-merch-edit": prod("merchandise"), "monetize-nft-edit": prod("nft"), "public-booking": prod("experience") })[id] ?? prod("merchandise");
const rows = [];
for (const r of list) {
  const path = r.pattern.replace(/:(\w+)/g, (_, k) => (k === "productId" ? productFor(r.id) : P[k]) ?? "missing");
  failed.length = 0;
  await p.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}noDelay=1`, { waitUntil: "networkidle0" }).catch(() => {});
  await sleep(300);
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
  await sleep(250);
  const res = await p.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
    const label = (e) => e.getAttribute("aria-label") || e.closest("[data-testid]")?.getAttribute("data-testid") || e.className.toString().slice(0, 40);
    const empty = [...document.querySelectorAll('[aria-label$=" placeholder"], [data-media-empty]')].filter(vis).map(label);
    const avatars = [...document.querySelectorAll(".bg-placeholder-img")].filter((e) => vis(e) && !e.querySelector("img,video") && e.querySelector("svg.lucide-user")).length;
    const broken = [...document.images].filter((i) => vis(i) && i.complete && i.naturalWidth === 0).map((i) => i.getAttribute("src"));
    const videos = [...document.querySelectorAll("video")].filter(vis);
    const noPoster = videos.filter((v) => !v.poster).length;
    const noSrc = videos.filter((v) => !v.currentSrc && !v.querySelector("source")).length;
    const stretched = [...document.images].filter((i) => { if (!vis(i) || !i.naturalWidth) return false; const s = getComputedStyle(i); if (s.objectFit === "cover" || s.objectFit === "contain") return false; const r = i.getBoundingClientRect(); return Math.abs(r.width / r.height - i.naturalWidth / i.naturalHeight) > 0.05; }).length;
    const overflow = document.documentElement.scrollWidth > window.innerWidth + 1;
    const slot = (e) => e.closest("[data-testid]")?.getAttribute("data-testid") ?? "";
    const media = [...document.images].filter(vis).map((i) => { const r = i.getBoundingClientRect(); return { src: (i.getAttribute("src") ?? "").replace(/^https?:\/\/[^/]+/, ""), alt: i.alt, slot: slot(i), box: `${Math.round(r.width)}x${Math.round(r.height)}`, fit: getComputedStyle(i).objectFit, fallback: i.dataset.media === "fallback" }; });
    const players = [...document.querySelectorAll('[data-media^="video"]')].filter(vis).map((e) => ({ state: e.dataset.media, label: e.getAttribute("aria-label") ?? "", poster: e.querySelector("img")?.getAttribute("src") ?? "" }));
    const counts = {};
    media.filter((m) => !/creators\/fans|avatar|illustrations/.test(m.src)).forEach((m) => (counts[m.src] = (counts[m.src] ?? 0) + 1));
    const repeated = Object.entries(counts).filter(([, n]) => n > 2).map(([k, n]) => `${k}×${n}`);
    return { empty, avatars, broken, images: [...document.images].filter(vis).length, videos: videos.length, noPoster, noSrc, stretched, overflow, media, players, repeated, fallbacks: media.filter((m) => m.fallback).length, route: document.querySelector("[data-route]")?.getAttribute("data-route") };
  });
  rows.push({ id: r.id, path, ...res, failed: [...failed] });
  const bad = res.empty.length + res.avatars + res.broken.length + res.noPoster + res.noSrc + res.stretched + res.fallbacks + failed.length;
  console.log(`${bad ? "ISSUE" : "ok   "} ${r.id.padEnd(30)} img=${res.images} vid=${res.videos} empty=${res.empty.length} avatarFallback=${res.avatars} broken=${res.broken.length} noPoster=${res.noPoster} stretched=${res.stretched} players=${res.players.length}${res.fallbacks ? " FALLBACK=" + res.fallbacks : ""}${res.repeated.length ? " repeated=" + res.repeated.join(",") : ""}${res.overflow ? " OVERFLOW" : ""}${failed.length ? " failed=" + failed.length : ""}`);
}
const issues = rows.filter((r) => r.empty.length || r.avatars || r.broken.length || r.noPoster || r.noSrc || r.stretched || r.fallbacks || r.failed.length);
console.log(`\n${rows.length} routes, ${issues.length} with media issues, ${rows.reduce((n, r) => n + r.empty.length, 0)} empty frames, ${rows.reduce((n, r) => n + r.avatars, 0)} avatar fallbacks`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 1));
await b.close();
process.exit(issues.length ? 1 : 0);
