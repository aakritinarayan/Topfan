/**
 * Review helper: for each "key=query" argument, shows the first license-OK Commons results as a
 * numbered contact sheet (one row per key). Pick by writing { key: index-or-"File:Title" } in picks.json.
 * Run: node scripts/media/contact-sheet.mjs out.png "posts/goggles=ski goggles" ...
 */
import fs from "node:fs";
import sharp from "sharp";

const UA = "TopFanPOC-demo-media/1.0 (local prototype)";
const OK = /^(cc0|public domain|pd|cc by(-sa)? (2\.0|2\.5|3\.0|4\.0))/i;
const strip = (h = "") => h.replace(/<[^>]+>/g, "").trim();
const [out, ...pairs] = process.argv.slice(2);
const N = 8, TW = 220, TH = 150, LH = 26;
const rows = [];
for (const pair of pairs) {
  const [key, q] = pair.split("=");
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({ action: "query", format: "json", generator: "search", gsrsearch: `${q} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "40", prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "300" }).forEach(([k, v]) => u.searchParams.set(k, v));
  let j = {};
  for (let i = 0; i < 5; i++) {
    const r = await fetch(u, { headers: { "User-Agent": UA } });
    if (r.ok) {
      j = await r.json();
      break;
    }
    await new Promise((res) => setTimeout(res, 3000 * (i + 1)));
  }
  await new Promise((res) => setTimeout(res, 800));
  const c = Object.values(j.query?.pages ?? {})
    .sort((a, b) => a.index - b.index)
    .map((p) => ({ t: p.title, ii: p.imageinfo?.[0] }))
    .filter((x) => x.ii && /jpeg|png/.test(x.ii.mime) && OK.test(strip(x.ii.extmetadata?.LicenseShortName?.value)) && x.ii.width >= 1000 && x.ii.width / x.ii.height < 3 && x.ii.height / x.ii.width < 2.2)
    .slice(0, N);
  console.log(`\n${key} (${q})`);
  c.forEach((x, i) => console.log(`  ${i}: ${x.t}`));
  const tiles = await Promise.all(
    c.map(async (x) => {
      try {
        const b = Buffer.from(await (await fetch(x.ii.thumburl, { headers: { "User-Agent": UA } })).arrayBuffer());
        return await sharp(b).resize(TW, TH, { fit: "cover" }).png().toBuffer();
      } catch {
        return null;
      }
    }),
  );
  rows.push({ key, tiles, titles: c.map((x) => x.t) });
}
const W = N * (TW + 6), H = rows.length * (TH + LH + 6);
const comps = [];
rows.forEach((r, y) => {
  const top = y * (TH + LH + 6);
  comps.push({ input: Buffer.from(`<svg width="${W}" height="${LH}"><text x="4" y="18" font-size="16" font-family="Arial" fill="#fff">${r.key}</text></svg>`), left: 0, top });
  r.tiles.forEach((t, i) => {
    if (!t) return;
    comps.push({ input: t, left: i * (TW + 6), top: top + LH });
    comps.push({ input: Buffer.from(`<svg width="28" height="22"><rect width="28" height="22" fill="#c00"/><text x="7" y="16" font-size="15" font-family="Arial" fill="#fff">${i}</text></svg>`), left: i * (TW + 6), top: top + LH });
  });
});
await sharp({ create: { width: W, height: H, channels: 3, background: "#222" } }).composite(comps).png().toFile(out);
fs.writeFileSync(`${out}.json`, JSON.stringify(Object.fromEntries(rows.map((r) => [r.key, r.titles])), null, 1));
