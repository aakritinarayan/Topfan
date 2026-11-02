/**
 * Images supplied by the designer (not sourced or generated here). Originals live in scripts/media/supplied/;
 * this crops them to their slot and records them in credits.json. Run: node scripts/media/supplied.mjs
 * fetch-photos.mjs doesn't manage these keys, so a refetch never overwrites them.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const CREDITS = path.join(ROOT, "scripts/media/credits.json");
const credits = JSON.parse(fs.readFileSync(CREDITS, "utf8"));

const SUPPLIED = [
  // Head-and-shoulders square from the 736×1104 portrait, above the chest logo.
  { key: "creators/ajwhite/avatar", src: "ajwhite-profile.png", crop: { left: 152, top: 6, width: 440, height: 440 }, w: 800, h: 800, alt: "AJ White" },
];

for (const s of SUPPLIED) {
  const file = path.join(ROOT, "public/assets", `${s.key}.webp`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(path.join(ROOT, "scripts/media/supplied", s.src)).extract(s.crop).resize(s.w, s.h).webp({ quality: 82 }).toFile(file);
  credits[s.key] = { file: `assets/${s.key}.webp`, source: `supplied by the designer (scripts/media/supplied/${s.src})`, author: "Supplied by the designer", license: "Supplied for this prototype; usage confirmed by the designer", width: s.w, height: s.h, alt: s.alt };
}
fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 1));
console.log(`placed ${SUPPLIED.length} supplied image(s)`);
