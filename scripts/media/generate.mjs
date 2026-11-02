/**
 * Original demo artwork (no third-party rights): product renders for fictional brands, e-book and
 * podcast covers, NFT art, brand logos, illustrated fan avatars and per-type fallbacks.
 * Raster output is WebP; logos, avatars and fallbacks stay SVG (small, sharp at any size).
 * Run: node scripts/media/generate.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const OUT = path.join(ROOT, "public/assets");
const CREDITS = path.join(ROOT, "scripts/media/credits.json");
const credits = fs.existsSync(CREDITS) ? JSON.parse(fs.readFileSync(CREDITS, "utf8")) : {};
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

async function webp(key, svg, w, h, alt) {
  const file = path.join(OUT, `${key}.webp`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(svg)).resize(w, h).webp({ quality: 82 }).toFile(file);
  credits[key] = { file: `assets/${key}.webp`, source: "original (scripts/media/generate.mjs)", author: "TopFan POC", license: "Original demo artwork", width: w, height: h, alt };
}
function svgFile(key, svg, w, h, alt) {
  const file = path.join(OUT, `${key}.svg`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, svg);
  credits[key] = { file: `assets/${key}.svg`, source: "original (scripts/media/generate.mjs)", author: "TopFan POC", license: "Original demo artwork", width: w, height: h, alt };
}
async function photoBase(key, w, h, darken = 0.45) {
  const b = await sharp(path.join(OUT, `${key}.webp`)).resize(w, h, { fit: "cover", position: sharp.strategy.attention }).png().toBuffer();
  return `<image href="data:image/png;base64,${b.toString("base64")}" width="${w}" height="${h}"/><rect width="${w}" height="${h}" fill="#000" opacity="${darken}"/>`;
}

/* ------------------------------------------------------------------ snowboards */

const boardPath = (cx, cy, w, h) => {
  const l = cx - w / 2, r = cx + w / 2, t = cy - h / 2, b = cy + h / 2, n = w * 0.85, sc = w * 0.05;
  return `M ${l},${t + n} Q ${l},${t} ${cx},${t} Q ${r},${t} ${r},${t + n} Q ${r - sc},${cy} ${r},${b - n} Q ${r},${b} ${cx},${b} Q ${l},${b} ${l},${b - n} Q ${l + sc},${cy} ${l},${t + n} Z`;
};
const BOARDS = {
  "spectrum-x": { name: "SPECTRUM X", brand: "RIDGELINE", art: (id) => `<linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff3b3b"/><stop offset=".25" stop-color="#ffb000"/><stop offset=".5" stop-color="#2fd17a"/><stop offset=".75" stop-color="#2f8bff"/><stop offset="1" stop-color="#9b4dff"/></linearGradient>`, fill: (id) => `url(#g${id})`, deco: (x, y, w, h) => [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${x}" y="${y + i * h / 6}" width="${w}" height="${h / 30}" fill="#fff" opacity=".35"/>`).join(""), text: "#fff" },
  "home-mountain-hero": { name: "HOME MOUNTAIN HERO", brand: "RIDGELINE", fill: () => "#1f3b57", deco: (x, y, w, h) => `<circle cx="${x + w / 2}" cy="${y + h * 0.3}" r="${w * 0.28}" fill="#ffcf5a"/><path d="M ${x},${y + h * 0.62} L ${x + w * 0.35},${y + h * 0.42} L ${x + w * 0.6},${y + h * 0.56} L ${x + w},${y + h * 0.38} L ${x + w},${y + h} L ${x},${y + h} Z" fill="#e8eef5"/><path d="M ${x},${y + h * 0.78} L ${x + w * 0.5},${y + h * 0.6} L ${x + w},${y + h * 0.74} L ${x + w},${y + h} L ${x},${y + h} Z" fill="#9fb6cc"/>`, text: "#ffcf5a" },
  throwback: { name: "THROWBACK", brand: "RIDGELINE", fill: () => "#f4e6c8", deco: (x, y, w, h) => ["#ff6b35", "#f7b32b", "#2ec4b6", "#1b3a4b"].map((c, i) => `<rect x="${x}" y="${y + h * (0.32 + i * 0.07)}" width="${w}" height="${h * 0.05}" fill="${c}"/>`).join(""), text: "#1b3a4b" },
  "board-pro": { name: "RIDGELINE PRO", brand: "RIDGELINE", fill: () => "#141414", deco: (x, y, w, h) => `<polyline points="${Array.from({ length: 9 }, (_, i) => `${x + (i % 2 ? w * 0.8 : w * 0.2)},${y + h * (0.1 + i * 0.1)}`).join(" ")}" fill="none" stroke="#e01b24" stroke-width="${w * 0.07}" stroke-linejoin="round"/>`, text: "#fff" },
  "board-glide": { name: "HOMETOWN GLIDE", brand: "RIDGELINE", fill: () => "#efe9dd", deco: (x, y, w, h) => [0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M ${x},${y + h * (0.2 + i * 0.09)} q ${w / 4},-${w * 0.12} ${w / 2},0 t ${w / 2},0" fill="none" stroke="#3a7ca5" stroke-width="${w * 0.03}"/>`).join(""), text: "#3a7ca5" },
  "signature-series": { name: "AJ SIGNATURE SERIES", brand: "RIDGELINE", fill: () => "#f5f5f5", deco: (x, y, w, h) => `<rect x="${x}" y="${y + h * 0.5}" width="${w}" height="${h * 0.5}" fill="#111"/><text x="${x + w / 2}" y="${y + h * 0.46}" font-family="Snell Roundhand, Brush Script MT, cursive" font-size="${w * 0.42}" text-anchor="middle" fill="#c8102e">AJ</text>`, text: "#c8102e" },
  "park-twin": { name: "PARK TWIN", brand: "RIDGELINE", fill: () => "#ff4f9a", deco: (x, y, w, h) => Array.from({ length: 60 }, (_, i) => `<circle cx="${x + ((i * 37) % 100) / 100 * w}" cy="${y + ((i * 53) % 100) / 100 * h}" r="${w * (0.02 + ((i * 7) % 5) / 100)}" fill="#3b2bff" opacity=".7"/>`).join(""), text: "#fff" },
  "all-mountain-classic": { name: "ALL-MOUNTAIN CLASSIC", brand: "RIDGELINE", fill: () => "#9a6a3c", deco: (x, y, w, h) => Array.from({ length: 14 }, (_, i) => `<path d="M ${x + w * (0.05 + i * 0.07)},${y} q ${w * 0.03},${h / 2} 0,${h}" fill="none" stroke="#7a5230" stroke-width="${w * 0.015}"/>`).join(""), text: "#fff6e8" },
};
function boardSvg(ids, W = 800, H = 640) {
  const gap = W / (ids.length + 1);
  const parts = ids.map((id, i) => {
    const b = BOARDS[id], cx = gap * (i + 1), cy = H / 2, w = 120, h = 560, x = cx - w / 2, y = cy - h / 2;
    const tilt = ids.length === 1 ? -14 : i === 0 ? -10 : 10;
    return `<g transform="rotate(${tilt} ${cx} ${cy})">
      <path d="${boardPath(cx + 10, cy + 14, w, h)}" fill="#000" opacity=".18" filter="url(#blur)"/>
      <clipPath id="c${id}"><path d="${boardPath(cx, cy, w, h)}"/></clipPath>
      ${b.art ? `<defs>${b.art(id)}</defs>` : ""}
      <g clip-path="url(#c${id})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${b.fill(id)}"/>${b.deco(x, y, w, h)}
        <rect x="${x}" y="${y}" width="${w * 0.35}" height="${h}" fill="#fff" opacity=".08"/></g>
      <path d="${boardPath(cx, cy, w, h)}" fill="none" stroke="#1a1a1a" stroke-width="3"/>
      <text transform="translate(${cx + 8} ${cy}) rotate(-90)" font-family="${FONT}" font-weight="800" font-size="26" letter-spacing="3" text-anchor="middle" fill="${b.text}">${b.name}</text>
      <text x="${cx}" y="${y + 60}" font-family="${FONT}" font-weight="700" font-size="11" letter-spacing="2" text-anchor="middle" fill="${b.text}" opacity=".85">${b.brand}</text>
    </g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><radialGradient id="bg" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#f4f4f2"/><stop offset="1" stop-color="#cfcfcb"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="10"/></filter></defs><rect width="${W}" height="${H}" fill="url(#bg)"/>${parts.join("")}</svg>`;
}

/* ------------------------------------------------------------------ apparel and products */

const studio = (W, H, inner, bg = ["#f4f4f2", "#d4d4cf"]) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><radialGradient id="bg" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="12"/></filter></defs><rect width="${W}" height="${H}" fill="url(#bg)"/>${inner}</svg>`;
const hoodie = (color, print) =>
  studio(800, 640, `<g transform="translate(400 330)">
    <ellipse cx="0" cy="250" rx="230" ry="18" fill="#000" opacity=".15" filter="url(#blur)"/>
    <path d="M -95,-200 C -60,-250 60,-250 95,-200 L 190,-150 L 290,120 L 230,150 L 165,-10 L 165,240 L -165,240 L -165,-10 L -230,150 L -290,120 L -190,-150 Z" fill="${color}" stroke="#00000033" stroke-width="3"/>
    <path d="M -95,-200 C -80,-120 80,-120 95,-200 C 70,-160 -70,-160 -95,-200 Z" fill="#00000026"/>
    <path d="M -100,120 L 100,120 L 120,220 L -120,220 Z" fill="#00000018" stroke="#00000030" stroke-width="2"/>
    <line x1="-20" y1="-150" x2="-26" y2="-60" stroke="#f2f2f2" stroke-width="5"/><line x1="20" y1="-150" x2="26" y2="-60" stroke="#f2f2f2" stroke-width="5"/>
    <rect x="-165" y="225" width="330" height="18" fill="#00000022"/>
    ${print}</g>`);
const goggles = studio(800, 640, `<g transform="translate(400 330)">
  <ellipse cx="0" cy="170" rx="300" ry="20" fill="#000" opacity=".15" filter="url(#blur)"/>
  <path d="M -390,-10 C -300,-30 300,-30 390,-10 L 390,40 C 300,20 -300,20 -390,40 Z" fill="#1b1b1b"/>
  <text x="0" y="22" font-family="${FONT}" font-weight="800" font-size="22" letter-spacing="8" text-anchor="middle" fill="#fff">NORTHPEAK</text>
  <defs><linearGradient id="lens" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb347"/><stop offset=".5" stop-color="#ff5e62"/><stop offset="1" stop-color="#6a3cff"/></linearGradient></defs>
  <path d="M -250,-110 C -150,-150 150,-150 250,-110 C 280,-40 270,60 230,100 C 140,120 80,110 40,70 C 20,50 -20,50 -40,70 C -80,110 -140,120 -230,100 C -270,60 -280,-40 -250,-110 Z" fill="#111"/>
  <path d="M -230,-95 C -140,-128 140,-128 230,-95 C 255,-35 247,50 214,84 C 140,100 90,92 52,56 C 25,32 -25,32 -52,56 C -90,92 -140,100 -214,84 C -247,50 -255,-35 -230,-95 Z" fill="url(#lens)"/>
  <path d="M -200,-80 C -100,-105 0,-100 60,-90 L -150,40 C -190,30 -215,-20 -200,-80 Z" fill="#fff" opacity=".22"/></g>`);
const sodaCan = studio(800, 640, `<g transform="translate(400 320)">
  <ellipse cx="0" cy="250" rx="160" ry="16" fill="#000" opacity=".18" filter="url(#blur)"/>
  <defs><linearGradient id="can" x1="0" x2="1"><stop offset="0" stop-color="#0b6e4f"/><stop offset=".35" stop-color="#3fd5a0"/><stop offset=".6" stop-color="#14a37f"/><stop offset="1" stop-color="#075940"/></linearGradient><linearGradient id="lid" x1="0" x2="1"><stop offset="0" stop-color="#9aa"/><stop offset=".4" stop-color="#eee"/><stop offset="1" stop-color="#889"/></linearGradient></defs>
  <rect x="-110" y="-220" width="220" height="450" rx="26" fill="url(#can)"/>
  <ellipse cx="0" cy="-222" rx="110" ry="22" fill="url(#lid)"/><ellipse cx="0" cy="-222" rx="86" ry="15" fill="#bcc"/>
  <path d="M -80,-20 L -30,-90 L 0,-50 L 30,-100 L 80,-20 Z" fill="#fff"/><path d="M -30,-90 L -15,-68 L -38,-60 Z M 30,-100 L 45,-78 L 20,-72 Z" fill="#cdeee3"/>
  <text x="0" y="40" font-family="${FONT}" font-weight="900" font-size="44" text-anchor="middle" fill="#fff">SUMMIT</text>
  <text x="0" y="80" font-family="${FONT}" font-weight="600" font-size="26" letter-spacing="10" text-anchor="middle" fill="#e9fff6">SODA</text>
  <text x="0" y="150" font-family="${FONT}" font-size="16" letter-spacing="2" text-anchor="middle" fill="#e9fff6" opacity=".8">MOUNTAIN LIME</text>
  <rect x="-110" y="-220" width="60" height="450" rx="26" fill="#fff" opacity=".12"/></g>`);

/* ------------------------------------------------------------------ covers, NFTs */

async function ebook(key, photo, title, subtitle, alt) {
  const W = 720, H = 960;
  const lines = title.split("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${await photoBase(photo, W, H, 0.5)}
    <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="#fff" stroke-width="3" opacity=".8"/>
    <text x="80" y="130" font-family="${FONT}" font-weight="700" font-size="22" letter-spacing="6" fill="#ff3b3b">E-BOOK</text>
    ${lines.map((l, i) => `<text x="80" y="${560 + i * 78}" font-family="${FONT}" font-weight="900" font-size="72" fill="#fff">${esc(l)}</text>`).join("")}
    <text x="80" y="${600 + lines.length * 78}" font-family="${FONT}" font-size="28" fill="#eee">${esc(subtitle)}</text>
    <text x="80" y="${H - 90}" font-family="${FONT}" font-weight="800" font-size="26" letter-spacing="8" fill="#fff">AJ WHITE</text></svg>`;
  await webp(key, svg, W, H, alt);
}
const yeti = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1055"/><stop offset="1" stop-color="#d0569a"/></linearGradient></defs>
  <rect width="800" height="800" fill="url(#sky)"/>
  ${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 800}" cy="${(i * 61) % 420}" r="${1 + (i % 3)}" fill="#fff" opacity=".7"/>`).join("")}
  <path d="M 0,600 L 180,430 L 330,560 L 520,380 L 800,600 L 800,800 L 0,800 Z" fill="#f0f4ff"/><path d="M 0,680 L 260,560 L 560,700 L 800,620 L 800,800 L 0,800 Z" fill="#c9d6ff"/>
  <g transform="translate(400 470) rotate(-12)">
    <rect x="-210" y="150" width="420" height="40" rx="20" fill="#ff3b3b"/><rect x="-190" y="158" width="380" height="8" fill="#fff" opacity=".6"/>
    <path d="M -120,150 C -170,40 -150,-170 0,-190 C 150,-170 170,40 120,150 Z" fill="#fafafa"/>
    ${Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2; return `<path d="M ${Math.cos(a) * 130},${Math.sin(a) * 160 - 20} l ${Math.cos(a) * 26},${Math.sin(a) * 26} l ${Math.cos(a + 0.3) * -14},${Math.sin(a + 0.3) * -10} Z" fill="#fafafa"/>`; }).join("")}
    <ellipse cx="0" cy="-70" rx="78" ry="64" fill="#7fa7d9"/>
    <rect x="-70" y="-108" width="140" height="44" rx="22" fill="#1c1c1c"/><rect x="-62" y="-102" width="124" height="32" rx="16" fill="#ffb347"/><rect x="-58" y="-100" width="40" height="10" rx="5" fill="#fff" opacity=".6"/>
    <path d="M -34,-30 Q 0,-6 34,-30" fill="none" stroke="#1c1c1c" stroke-width="7" stroke-linecap="round"/>
    <path d="M -130,10 C -200,-20 -230,-80 -210,-120" fill="none" stroke="#fafafa" stroke-width="44" stroke-linecap="round"/>
    <path d="M 130,10 C 200,30 240,0 250,-50" fill="none" stroke="#fafafa" stroke-width="44" stroke-linecap="round"/>
  </g>
  <text x="40" y="760" font-family="${FONT}" font-weight="900" font-size="34" fill="#2b1055">BORED SNOWBOARDING YETI · 1/1</text></svg>`;
const pin = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#1d1f20"/>
  <defs><radialGradient id="gold" cx=".35" cy=".3"><stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="#d4a017"/><stop offset="1" stop-color="#8a6500"/></radialGradient></defs>
  <circle cx="400" cy="410" r="270" fill="#000" opacity=".4"/><circle cx="400" cy="400" r="270" fill="url(#gold)"/><circle cx="400" cy="400" r="236" fill="#123a5c"/>
  <path d="M 200,500 L 330,320 L 400,410 L 470,300 L 600,500 Z" fill="#f4f7fb"/><path d="M 330,320 L 360,362 L 312,372 Z M 470,300 L 500,345 L 450,350 Z" fill="#9fb6cc"/>
  <circle cx="540" cy="250" r="34" fill="#ffcf5a"/>
  <text x="400" y="580" font-family="${FONT}" font-weight="900" font-size="54" letter-spacing="6" text-anchor="middle" fill="#ffcf5a">SUMMIT</text></svg>`;
async function podcast() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">${await photoBase("posts/podcast", 800, 800, 0.55)}
    <rect x="0" y="520" width="800" height="280" fill="#c8102e" opacity=".92"/>
    <text x="50" y="610" font-family="${FONT}" font-weight="900" font-size="64" fill="#fff">THE FALL LINE</text>
    <text x="50" y="670" font-family="${FONT}" font-weight="600" font-size="30" letter-spacing="6" fill="#fff">PODCAST · EP. 112</text>
    <text x="50" y="740" font-family="${FONT}" font-size="26" fill="#ffe4e8">with guest AJ White</text></svg>`;
  await webp("posts/podcast-cover", svg, 800, 800, "The Fall Line podcast cover");
}

/* ------------------------------------------------------------------ logos (fictional brands) */

const logo = (mark, name, color, bg = "#ffffff") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="${bg}"/><g transform="translate(200 165)">${mark}</g><text x="200" y="320" font-family="${FONT}" font-weight="800" font-size="34" letter-spacing="2" text-anchor="middle" fill="${color}">${name}</text></svg>`;
const LOGOS = {
  northpeak: logo(`<path d="M -90,60 L -20,-60 L 20,0 L 45,-35 L 100,60 Z" fill="#14324a"/><path d="M -20,-60 L 0,-26 L -30,-14 Z" fill="#fff"/>`, "NORTHPEAK", "#14324a"),
  "glacier-hydration": logo(`<path d="M 0,-80 C 40,-20 70,10 70,45 C 70,85 38,110 0,110 C -38,110 -70,85 -70,45 C -70,10 -40,-20 0,-80 Z" fill="#2aa7df"/><path d="M -30,40 C -30,70 -10,85 10,85" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>`, "GLACIER", "#1576a8"),
  "ridgeline-boards": logo(`<polyline points="-100,40 -55,-20 -20,20 20,-50 60,10 100,-30" fill="none" stroke="#e01b24" stroke-width="18" stroke-linejoin="round" stroke-linecap="round"/>`, "RIDGELINE", "#141414"),
  "summit-soda": logo(`<circle r="80" fill="#14a37f"/><path d="M -55,35 L -15,-30 L 5,-5 L 25,-40 L 60,35 Z" fill="#fff"/>`, "SUMMIT SODA", "#0b6e4f"),
  "corner-mart": logo(`<rect x="-80" y="-70" width="160" height="130" rx="14" fill="#f7b32b"/><path d="M -80,-30 L 80,-30" stroke="#1b3a4b" stroke-width="12"/><rect x="-25" y="5" width="50" height="55" fill="#1b3a4b"/>`, "CORNER MART", "#1b3a4b"),
};

/* ------------------------------------------------------------------ illustrated fan avatars */

const SKIN = ["#f6d7c3", "#eac2a4", "#d9a47f", "#c68a5c", "#a46a43", "#7c4a2d", "#5a3420"];
const HAIR = ["#1d1a17", "#4a2e1f", "#8a5a32", "#c9a15b", "#b5462e", "#6b6b6b", "#2b2b45"];
const BG = ["#3b4a5a", "#5a3b4a", "#3b5a4a", "#4a4a5a", "#5a4a3b", "#2f4f5f", "#4f2f3f", "#3f4f2f"];
const TOP = ["#c8102e", "#2a6f97", "#3e8e41", "#e0a100", "#6c4ab6", "#d35d6e", "#1f1f1f", "#7a7a7a"];
function avatar(i) {
  const pick = (a, k) => a[(i * k + 3) % a.length];
  const skin = pick(SKIN, 5), hair = pick(HAIR, 3), bg = pick(BG, 7), top = pick(TOP, 11), style = i % 6;
  const hairShapes = [
    `<path d="M 62,92 C 60,50 140,50 138,92 C 132,72 68,72 62,92 Z" fill="${hair}"/>`,
    `<path d="M 58,100 C 52,40 148,40 142,100 L 146,150 L 130,150 L 132,92 C 120,74 80,74 68,92 L 70,150 L 54,150 Z" fill="${hair}"/>`,
    `<circle cx="100" cy="70" r="40" fill="${hair}"/><circle cx="70" cy="82" r="22" fill="${hair}"/><circle cx="130" cy="82" r="22" fill="${hair}"/>`,
    `<path d="M 60,95 C 58,58 142,58 140,95 C 128,80 74,80 60,95 Z" fill="${hair}"/><circle cx="100" cy="52" r="16" fill="${hair}"/>`,
    `<path d="M 60,92 C 62,48 138,48 140,92 Z" fill="${top}"/><rect x="56" y="84" width="88" height="14" rx="7" fill="${top}"/><circle cx="100" cy="48" r="9" fill="#fff"/>`,
    `<path d="M 64,90 C 64,62 136,62 136,90 C 120,82 80,82 64,90 Z" fill="${hair}"/>`,
  ];
  const glasses = i % 5 === 2 ? `<circle cx="86" cy="104" r="11" fill="none" stroke="#1d1d1d" stroke-width="3"/><circle cx="114" cy="104" r="11" fill="none" stroke="#1d1d1d" stroke-width="3"/><line x1="97" y1="104" x2="103" y2="104" stroke="#1d1d1d" stroke-width="3"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="${bg}"/>
    <path d="M 30,200 C 30,150 60,138 100,138 C 140,138 170,150 170,200 Z" fill="${top}"/>
    <rect x="88" y="120" width="24" height="26" rx="8" fill="${skin}"/>
    <ellipse cx="100" cy="100" rx="38" ry="42" fill="${skin}"/>
    ${hairShapes[style]}
    <circle cx="86" cy="104" r="3.5" fill="#2a1d14"/><circle cx="114" cy="104" r="3.5" fill="#2a1d14"/>
    <path d="M 89,122 Q 100,130 111,122" fill="none" stroke="#7a3b2e" stroke-width="3" stroke-linecap="round"/>${glasses}</svg>`;
}

/* ------------------------------------------------------------------ fallbacks */

const ICON = {
  image: `<rect x="-34" y="-26" width="68" height="52" rx="6" fill="none" stroke="#fff" stroke-width="5"/><circle cx="-12" cy="-8" r="7" fill="#fff"/><path d="M -30,22 L -6,0 L 8,12 L 18,4 L 32,22 Z" fill="#fff"/>`,
  video: `<rect x="-40" y="-26" width="80" height="52" rx="8" fill="none" stroke="#fff" stroke-width="5"/><path d="M -10,-14 L 16,0 L -10,14 Z" fill="#fff"/>`,
  course: `<path d="M -42,-6 L 0,-26 L 42,-6 L 0,14 Z" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><path d="M -24,4 L -24,22 C -10,32 10,32 24,22 L 24,4" fill="none" stroke="#fff" stroke-width="5"/>`,
  product: `<path d="M -30,-14 L 30,-14 L 36,30 L -36,30 Z" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><path d="M -14,-14 C -14,-38 14,-38 14,-14" fill="none" stroke="#fff" stroke-width="5"/>`,
  event: `<rect x="-34" y="-26" width="68" height="58" rx="6" fill="none" stroke="#fff" stroke-width="5"/><line x1="-34" y1="-8" x2="34" y2="-8" stroke="#fff" stroke-width="5"/><line x1="-16" y1="-36" x2="-16" y2="-18" stroke="#fff" stroke-width="5"/><line x1="16" y1="-36" x2="16" y2="-18" stroke="#fff" stroke-width="5"/>`,
  audio: `<path d="M -10,22 L -10,-26 L 26,-34 L 26,14" fill="none" stroke="#fff" stroke-width="5"/><circle cx="-20" cy="22" r="11" fill="#fff"/><circle cx="16" cy="14" r="11" fill="#fff"/>`,
  ebook: `<path d="M -32,-30 L 22,-30 L 32,-20 L 32,32 L -32,32 Z" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><line x1="-18" y1="-10" x2="18" y2="-10" stroke="#fff" stroke-width="5"/><line x1="-18" y1="6" x2="18" y2="6" stroke="#fff" stroke-width="5"/>`,
  avatar: `<circle cx="0" cy="-12" r="18" fill="none" stroke="#fff" stroke-width="5"/><path d="M -34,32 C -30,8 30,8 34,32" fill="none" stroke="#fff" stroke-width="5"/>`,
};
const fallback = (k) => `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34383a"/><stop offset="1" stop-color="#232526"/></linearGradient></defs><rect width="400" height="300" fill="url(#f)"/><g transform="translate(200 150)" opacity=".4">${ICON[k]}</g></svg>`;

/* ------------------------------------------------------------------ run */

for (const id of Object.keys(BOARDS)) await webp(`merchandise/${id}`, boardSvg([id]), 800, 640, `${BOARDS[id].name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())} snowboard`);
await webp("experiences/vip-boards", boardSvg(["board-pro", "board-glide"]), 800, 640, "Ridgeline snowboards");
await webp("merchandise/hoodie", hoodie("#8b8f94", `<text x="0" y="-40" font-family="${FONT}" font-weight="900" font-size="74" text-anchor="middle" fill="#c8102e">AJ</text><text x="0" y="0" font-family="${FONT}" font-weight="700" font-size="22" letter-spacing="8" text-anchor="middle" fill="#fff">TEAM</text>`), 800, 640, "Team AJ hoodie");
const tee = (color, long, print) =>
  studio(800, 640, `<g transform="translate(400 320)">
    <ellipse cx="0" cy="260" rx="220" ry="16" fill="#000" opacity=".15" filter="url(#blur)"/>
    <path d="M -70,-230 C -40,-200 40,-200 70,-230 L 170,-190 ${long ? "L 290,150 L 230,175 L 160,-40" : "L 250,-80 L 190,-20 L 160,-60"} L 160,240 L -160,240 L -160,${long ? "-40 L -230,175 L -290,150" : "-60 L -190,-20 L -250,-80"} L -170,-190 Z" fill="${color}" stroke="#00000033" stroke-width="3"/>
    <path d="M -70,-230 C -40,-200 40,-200 70,-230 C 50,-190 -50,-190 -70,-230 Z" fill="#00000030"/>
    ${print}</g>`);
// Stage curtain for the Home newsletter band: vertical velvet folds, darker toward the top and bottom.
const curtain = (() => {
  const W = 1600, H = 520;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const folds = [];
  for (let x = -10; x < W; ) {
    const w = 26 + rnd() * 30, peak = 0.35 + rnd() * 0.3, hi = ["#8f120d", "#a3160f", "#7c0e0a", "#b01a12"][Math.floor(rnd() * 4)];
    const id = `f${folds.length}`;
    folds.push(`<linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="#160101"/><stop offset="${peak}" stop-color="${hi}"/><stop offset="1" stop-color="#1d0201"/></linearGradient>
      <rect x="${x.toFixed(1)}" y="0" width="${(w + 1).toFixed(1)}" height="${H}" fill="url(#${id})"/>`);
    x += w;
  }
  const defs = folds.map((f) => f.split("\n")[0]).join("");
  const rects = folds.map((f) => f.split("\n")[1]).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}<linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset=".75" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient></defs>${rects}<rect width="${W}" height="${H}" fill="url(#v)"/></svg>`;
})();
await webp("backgrounds/curtain-red", curtain, 1600, 520, "Red stage curtain (illustration)");
await webp("merchandise/tee-open-road", tee("#2d3a4a", true, `<text x="0" y="-60" font-family="${FONT}" font-weight="900" font-size="40" letter-spacing="4" text-anchor="middle" fill="#f2e6c9">OPEN ROAD</text><text x="0" y="-20" font-family="${FONT}" font-weight="600" font-size="20" letter-spacing="8" text-anchor="middle" fill="#f2e6c9">TOUR 2024</text><path d="M -60,60 L 0,0 L 60,60 Z" fill="none" stroke="#f2e6c9" stroke-width="5"/>`), 800, 640, "Navy long-sleeve tour tee (illustration)");
await webp("merchandise/tee-late-night", tee("#1c1c1c", false, `<circle cx="0" cy="-50" r="48" fill="#f2c94c"/><circle cx="18" cy="-62" r="44" fill="#1c1c1c"/><text x="0" y="40" font-family="${FONT}" font-weight="900" font-size="34" letter-spacing="3" text-anchor="middle" fill="#fff">LATE NIGHT</text><text x="0" y="74" font-family="${FONT}" font-weight="600" font-size="20" letter-spacing="8" text-anchor="middle" fill="#f2c94c">ENCORE</text>`), 800, 640, "Black Late Night Encore T-shirt (illustration)");
await webp("merchandise/beanie-red", studio(800, 640, `<g transform="translate(400 360)"><ellipse cx="0" cy="150" rx="200" ry="16" fill="#000" opacity=".15" filter="url(#blur)"/><path d="M -170,120 C -170,-120 170,-120 170,120 Z" fill="#c8102e"/>${Array.from({ length: 13 }, (_, i) => `<line x1="${-150 + i * 25}" y1="-60" x2="${-150 + i * 25}" y2="120" stroke="#a00d25" stroke-width="5"/>`).join("")}<rect x="-180" y="70" width="360" height="80" rx="14" fill="#a00d25"/><circle cx="0" cy="-130" r="40" fill="#f2f2f2"/><text x="0" y="125" font-family="${FONT}" font-weight="900" font-size="34" letter-spacing="6" text-anchor="middle" fill="#fff">AJ</text></g>`), 800, 640, "Red AJ beanie");
await webp("experiences/vip-goggles", goggles, 800, 640, "Northpeak goggles");
await webp("experiences/vip-soda", sodaCan, 800, 640, "Summit Soda can");
await ebook("downloadables/ebook-switch", "posts/riding-switch", "How to\nRide Switch", "A handy manual for riding like a pro", "E-book cover: How to Ride Switch");
await ebook("downloadables/ebook-tune", "posts/two-boards", "Tune a\nSnowboard", "Competition-ready tuning secrets", "E-book cover: Tune a Snowboard");
await webp("posts/nft-yeti", yeti, 800, 800, "Bored Snowboarding Yeti digital artwork");
await webp("posts/nft-pin", pin, 800, 800, "Summit collectible pin artwork");
await podcast();
for (const [k, s] of Object.entries(LOGOS)) svgFile(`illustrations/brands/${k}`, s, 400, 400, `${k.replace(/-/g, " ")} logo (fictional brand)`);
for (let i = 1; i <= 24; i++) svgFile(`creators/fans/fan-${String(i).padStart(2, "0")}`, avatar(i), 200, 200, "Fan avatar (illustration)");
for (const k of Object.keys(ICON)) svgFile(`illustrations/fallback-${k}`, fallback(k), 400, 300, `${k} fallback`);
fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 1));
console.log("generated");
