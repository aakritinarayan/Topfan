/** Review helper: labeled grid of every asset under public/assets (or a prefix). node overview.mjs out.png [prefix] */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [out, prefix = ""] = process.argv.slice(2);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../public/assets");
const files = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.(webp|png|jpg|svg)$/.test(e.name) && files.push(path.join(d, e.name))));
walk(ROOT);
const list = files.map((f) => path.relative(ROOT, f)).filter((f) => f.startsWith(prefix) && !f.startsWith("mascot")).sort();
const C = 8, TW = 220, TH = 150, LH = 18;
const comps = [];
for (const [i, f] of list.entries()) {
  const x = (i % C) * (TW + 4), y = Math.floor(i / C) * (TH + LH + 4);
  comps.push({ input: await sharp(path.join(ROOT, f)).resize(TW, TH, { fit: "contain", background: "#111" }).png().toBuffer(), left: x, top: y + LH });
  comps.push({ input: Buffer.from(`<svg width="${TW}" height="${LH}"><text x="2" y="13" font-size="11" font-family="Arial" fill="#ddd">${f.replace(/\.\w+$/, "").slice(-36)}</text></svg>`), left: x, top: y });
}
await sharp({ create: { width: C * (TW + 4), height: Math.ceil(list.length / C) * (TH + LH + 4), channels: 3, background: "#222" } }).composite(comps).png().toFile(out);
console.log(list.length, "assets");
