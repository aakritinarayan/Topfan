/**
 * Original artwork for the assistant's SIMULATED image generation (AI-Assisted Content demo).
 * No image service is connected: these pre-made illustrations stand in for generated options and are
 * labelled "Simulated" wherever they appear. No people, no logos, no third-party rights.
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
const RED = "#bc1111";

/** Layered mountain ridge as a polyline path across the width. */
const ridge = (w, h, base, amp, seed, steps = 9) => {
  let d = `M 0 ${h} L 0 ${base}`;
  for (let i = 1; i <= steps; i++) {
    const x = (w / steps) * i;
    const y = base - amp * Math.abs(Math.sin(seed + i * 1.7)) * (i % 2 ? 1 : 0.55);
    d += ` L ${x.toFixed(0)} ${y.toFixed(0)}`;
  }
  return `${d} L ${w} ${h} Z`;
};

function cinematic(w, h, { dark = false, space = false } = {}) {
  const sky = dark ? ["#05060a", "#14070a"] : ["#0b0d14", "#3a0d12"];
  const sx = space ? w * 0.78 : w * 0.62;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
    <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${RED}" stop-opacity="${dark ? 0.55 : 0.9}"/><stop offset="1" stop-color="${RED}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <circle cx="${sx}" cy="${h * 0.42}" r="${h * 0.36}" fill="url(#sun)"/>
  <circle cx="${sx}" cy="${h * 0.42}" r="${h * 0.09}" fill="${RED}" opacity="${dark ? 0.6 : 0.95}"/>
  <path d="${ridge(w, h, h * 0.62, h * 0.28, 1)}" fill="${dark ? "#0d0e12" : "#1a1c22"}"/>
  <path d="${ridge(w, h, h * 0.74, h * 0.2, 4)}" fill="${dark ? "#08090c" : "#111318"}"/>
  <path d="M ${w * (space ? 0.55 : 0.3)} ${h} Q ${w * (space ? 0.72 : 0.5)} ${h * 0.7} ${w * (space ? 0.95 : 0.78)} ${h * 0.78} L ${w * (space ? 0.95 : 0.78)} ${h} Z" fill="#f2f2f2" opacity="${dark ? 0.08 : 0.14}"/>
  <path d="M ${w * (space ? 0.62 : 0.4)} ${h * 0.86} Q ${w * (space ? 0.74 : 0.55)} ${h * 0.74} ${w * (space ? 0.88 : 0.7)} ${h * 0.8}" stroke="${RED}" stroke-width="${h * 0.012}" fill="none" stroke-linecap="round" opacity="0.9"/>
</svg>`;
}

function minimal(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#191a1c"/>
  <path d="M ${w * 0.08} ${h * 0.78} L ${w * 0.36} ${h * 0.3} L ${w * 0.52} ${h * 0.56} L ${w * 0.66} ${h * 0.38} L ${w * 0.92} ${h * 0.78} Z" fill="none" stroke="#f2f2f2" stroke-width="${h * 0.01}" stroke-linejoin="round" opacity="0.85"/>
  <path d="M ${w * 0.3} ${h * 0.4} L ${w * 0.36} ${h * 0.3} L ${w * 0.42} ${h * 0.4}" fill="#f2f2f2" opacity="0.85"/>
  <circle cx="${w * 0.74} " cy="${h * 0.24}" r="${h * 0.07}" fill="${RED}"/>
  <rect x="${w * 0.08}" y="${h * 0.84}" width="${w * 0.84}" height="${h * 0.012}" fill="${RED}"/>
</svg>`;
}

const items = [
  ["generated/training-cinematic", cinematic(1600, 1000), 1600, 1000, "Original illustration: mountain ridges at dusk with a red sun and a snowboard line (simulated AI image)"],
  ["generated/training-minimal", minimal(1600, 1000), 1600, 1000, "Original illustration: minimal line mountains with a red sun (simulated AI image)"],
  ["generated/training-dark", cinematic(1600, 1000, { dark: true }), 1600, 1000, "Original illustration: darker mountain ridges with a dim red sun (simulated AI image)"],
  ["generated/training-wide", cinematic(1920, 900, { space: true }), 1920, 900, "Original illustration: wide mountain scene with open space on the left for text (simulated AI image)"],
];

for (const [key, svg, w, h, alt] of items) {
  const file = path.join(OUT, `${key}.webp`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(svg)).resize(w, h).webp({ quality: 84 }).toFile(file);
  credits[key] = { file: `assets/${key}.webp`, source: "original (scripts/media/generate-ai-visuals.mjs)", author: "TopFan POC", license: "Original demo artwork", width: w, height: h, alt };
  catalog[key] = { src: `/assets/${key}.webp`, alt, w, h };
}
fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 1) + "\n");
fs.writeFileSync(CATALOG, JSON.stringify(catalog, null, 1) + "\n");
console.log(`wrote ${items.length} visuals`);
