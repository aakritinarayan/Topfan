/**
 * Sample visuals for the assistant's SIMULATED image generation (AI-Assisted Content demo).
 * No image service is connected: these stand in for generated options and are labelled "Simulated"
 * wherever they appear. They are graded crops of two licensed landscape photos already in the project
 * (no people, no logos); each output's credit names its source photo, author and licence.
 * Two directions (cinematic, minimal) and two revisions (darker; wider with space for text).
 * Run: node scripts/media/generate-ai-visuals.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const OUT = path.join(ROOT, "public/assets");
const CREDITS = path.join(ROOT, "scripts/media/credits.json");
const CATALOG = path.join(ROOT, "src/media/assets.json");
const credits = JSON.parse(fs.readFileSync(CREDITS, "utf8"));
const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));

const POWDER = "posts/nl-snow-report"; // powder slope, Kirkwood (CC BY 3.0)
const PEAKS = "posts/nl-welcome"; // mountains over Maligne Lake (CC BY-SA 4.0)

/** Full-frame overlay (vignette / tint / text space) as SVG. */
const overlay = (w, h, stops, dir = { x2: 0, y2: 1 }) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="v" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${stops.vignette ?? 0}"/></radialGradient>
    <linearGradient id="t" x1="0" y1="0" x2="${dir.x2}" y2="${dir.y2}">${stops.tint.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#t)"/>
  <rect width="${w}" height="${h}" fill="url(#v)"/>
</svg>`);

async function grade(src, w, h, { position = "centre", modulate, linear, tint, vignette, dir }) {
  const file = path.join(OUT, `${src}.webp`);
  let img = sharp(file).resize(w, h, { fit: "cover", position }).modulate(modulate);
  if (linear) img = img.linear(linear[0], linear[1]);
  const base = await img.toBuffer();
  return sharp(base).composite([{ input: overlay(w, h, { tint, vignette }, dir) }]).webp({ quality: 84 });
}

const items = [
  ["generated/training-cinematic", POWDER, 1600, 900, "Simulated AI image (sample photo): fresh powder slope with long shadows, warm cinematic grade",
    { modulate: { brightness: 0.82, saturation: 0.8 }, linear: [1.18, -18], vignette: 0.7, tint: [[0, "#1a0508", 0.55], [0.55, "#bc1111", 0.05], [1, "#120306", 0.6]] }],
  ["generated/training-minimal", PEAKS, 1600, 900, "Simulated AI image (sample photo): snowy peaks over a calm lake, soft and minimal",
    { position: "top", modulate: { brightness: 1.08, saturation: 0.25 }, linear: [0.92, 14], vignette: 0, tint: [[0, "#ffffff", 0.08], [1, "#ffffff", 0.04]] }],
  ["generated/training-dark", POWDER, 1600, 900, "Simulated AI image (sample photo): powder slope at dusk, darker grade",
    { modulate: { brightness: 0.55, saturation: 0.7 }, linear: [1.25, -22], vignette: 0.85, tint: [[0, "#05060a", 0.7], [0.6, "#bc1111", 0.04], [1, "#05060a", 0.75]] }],
  ["generated/training-wide", PEAKS, 1600, 700, "Simulated AI image (sample photo): wide mountain view with darker open space on the left for text",
    { position: "top", modulate: { brightness: 0.9, saturation: 0.75 }, linear: [1.1, -8], vignette: 0.35, dir: { x2: 1, y2: 0 }, tint: [[0, "#0b0c10", 0.85], [0.42, "#0b0c10", 0.35], [0.7, "#0b0c10", 0]] }],
];

for (const [key, src, w, h, alt, opts] of items) {
  const file = path.join(OUT, `${key}.webp`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await (await grade(src, w, h, opts)).toFile(file);
  const from = credits[src];
  credits[key] = { file: `assets/${key}.webp`, source: from.source, title: from.title, author: from.author, license: from.license, derived: `graded crop of ${src} (scripts/media/generate-ai-visuals.mjs)`, width: w, height: h, alt };
  catalog[key] = { src: `/assets/${key}.webp`, alt, w, h };
}
fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 1) + "\n");
fs.writeFileSync(CATALOG, JSON.stringify(catalog, null, 1) + "\n");
console.log(`wrote ${items.length} visuals`);
