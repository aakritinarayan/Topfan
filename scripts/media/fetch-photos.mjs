/**
 * Sources demo photos from Wikimedia Commons (license-filtered), crops them to the slot's aspect ratio
 * with attention-based cropping, and writes optimized WebP to public/assets/. Credits go to
 * scripts/media/credits.json. Run: node scripts/media/fetch-photos.mjs [key-prefix ...] [--force]
 * Picks are overridable in scripts/media/picks.json ({ key: index | "File:Name.jpg" }).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PHOTOS } from "./manifest.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const OUT = path.join(ROOT, "public/assets");
const CREDITS = path.join(ROOT, "scripts/media/credits.json");
const PICKS = path.join(ROOT, "scripts/media/picks.json");
const UA = "TopFanPOC-demo-media/1.0 (local prototype; https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)";
const OK = /^(cc0|public domain|pd|cc by(-sa)? (2\.0|2\.5|3\.0|4\.0))/i;

const credits = fs.existsSync(CREDITS) ? JSON.parse(fs.readFileSync(CREDITS, "utf8")) : {};
const picks = fs.existsSync(PICKS) ? JSON.parse(fs.readFileSync(PICKS, "utf8")) : {};
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const force = process.argv.includes("--force");
const strip = (h = "") => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({ format: "json", origin: "*", ...params }).forEach(([k, v]) => u.searchParams.set(k, v));
  for (let i = 0; i < 4; i++) {
    const r = await fetch(u, { headers: { "User-Agent": UA } });
    if (r.ok) return r.json();
    await sleep(1500 * (i + 1));
  }
  throw new Error(`Commons API failed for ${params.gsrsearch ?? params.titles}`);
}

const info = (p) => {
  const ii = p.imageinfo?.[0];
  if (!ii) return null;
  const m = ii.extmetadata ?? {};
  return {
    title: p.title, url: ii.url, thumb: ii.thumburl ?? ii.url, width: ii.width, height: ii.height, mime: ii.mime,
    license: strip(m.LicenseShortName?.value), author: strip(m.Artist?.value).slice(0, 120), page: ii.descriptionurl,
  };
};

async function candidates(q, minW) {
  const j = await api({ action: "query", generator: "search", gsrsearch: `${q} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "30", prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "2000" });
  return Object.values(j.query?.pages ?? {})
    .sort((a, b) => a.index - b.index)
    .map(info)
    .filter((x) => x && /jpeg|png/.test(x.mime) && OK.test(x.license) && x.width >= minW && x.width / x.height < 3 && x.height / x.width < 2.2);
}

async function byTitle(title) {
  const j = await api({ action: "query", titles: title, prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "2000" });
  return info(Object.values(j.query.pages)[0]);
}

fs.mkdirSync(OUT, { recursive: true });
const todo = PHOTOS.filter((p) => !args.length || args.some((a) => p.key.startsWith(a)));
for (const p of todo) {
  const file = path.join(OUT, `${p.key}.webp`);
  if (!force && fs.existsSync(file) && credits[p.key]) continue;
  try {
    const pick = picks[p.key];
    const c = typeof pick === "string" ? await byTitle(pick) : (await candidates(p.q, Math.min(p.w, 1000)))[pick ?? 0];
    if (!c) {
      console.log("NONE ", p.key, `(${p.q})`);
      continue;
    }
    const r = await fetch(c.thumb, { headers: { "User-Agent": UA } });
    if (!r.ok) throw new Error(`download ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await sharp(buf).rotate().resize(p.w, p.h, { fit: "cover", position: sharp.strategy.attention }).webp({ quality: 74, effort: 5 }).toFile(file);
    credits[p.key] = { file: `assets/${p.key}.webp`, source: c.page, title: c.title.replace(/^File:/, ""), author: c.author, license: c.license, width: p.w, height: p.h, alt: p.alt, query: p.q };
    fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 1));
    console.log("ok   ", p.key.padEnd(40), c.license.padEnd(14), c.title.slice(5, 70));
    await sleep(300);
  } catch (e) {
    console.log("FAIL ", p.key, e.message);
  }
}
