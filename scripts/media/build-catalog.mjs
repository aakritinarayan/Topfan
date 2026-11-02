/** Writes src/media/assets.json (what the app needs per asset key) from scripts/media/credits.json. */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const credits = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/media/credits.json"), "utf8"));
const out = {};
for (const [key, c] of Object.entries(credits).sort(([a], [b]) => a.localeCompare(b))) {
  if (!fs.existsSync(path.join(ROOT, "public", c.file))) continue;
  out[key] = { src: `/${c.file}`, alt: c.alt ?? "", w: c.width, h: c.height, ...(c.poster ? { poster: `/${c.poster}`, duration: c.duration } : {}) };
}
fs.writeFileSync(path.join(ROOT, "src/media/assets.json"), JSON.stringify(out, null, 1) + "\n");
console.log(Object.keys(out).length, "assets in src/media/assets.json");
