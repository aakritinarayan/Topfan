/**
 * Demo video clips (muted MP4/H.264, faststart) + WebP posters in public/assets/videos/.
 * - `q` entries: a license-filtered Wikimedia Commons video, trimmed to ~8 s and cropped to the slot.
 * - `stills` entries: an original slow-pan sequence built from photos already in public/assets.
 * Run: node scripts/media/fetch-videos.mjs [--list] [key-prefix ...] [--force]
 * --list prints candidates (index: title, duration, license); choose in picks.json { key: index|"File:..." }.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import ffmpeg from "ffmpeg-static";
import sharp from "sharp";
import { VIDEOS } from "./manifest.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const OUT = path.join(ROOT, "public/assets");
const TMP = path.join(ROOT, "node_modules/.cache/topfan-media");
const CREDITS = path.join(ROOT, "scripts/media/credits.json");
const PICKS = path.join(ROOT, "scripts/media/picks.json");
const UA = "TopFanPOC-demo-media/1.0 (local prototype)";
const OK = /^(cc0|public domain|pd|cc by(-sa)? (2\.0|2\.5|3\.0|4\.0))/i;
const credits = JSON.parse(fs.readFileSync(CREDITS, "utf8"));
const picks = fs.existsSync(PICKS) ? JSON.parse(fs.readFileSync(PICKS, "utf8")) : {};
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const list = process.argv.includes("--list"), force = process.argv.includes("--force");
const strip = (h = "") => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const run = (a) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...a]);
fs.mkdirSync(TMP, { recursive: true });

async function api(params) {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({ format: "json", ...params }).forEach(([k, v]) => u.searchParams.set(k, v));
  for (let i = 0; i < 5; i++) {
    const r = await fetch(u, { headers: { "User-Agent": UA } });
    if (r.ok) return r.json();
    await new Promise((res) => setTimeout(res, 3000 * (i + 1)));
  }
  throw new Error("Commons API failed");
}
const vinfo = (p) => {
  const v = p.videoinfo?.[0];
  if (!v) return null;
  const m = v.extmetadata ?? {};
  const d = (v.derivatives ?? []).filter((x) => /webm|mp4/.test(x.type) && (x.height ?? 0) <= 720).sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
  return { title: p.title, url: d[0]?.src ?? v.url, duration: v.duration, width: v.width, height: v.height, license: strip(m.LicenseShortName?.value), author: strip(m.Artist?.value).slice(0, 120), page: v.descriptionurl };
};
async function candidates(q) {
  const j = await api({ action: "query", generator: "search", gsrsearch: `${q} filetype:video`, gsrnamespace: "6", gsrlimit: "30", prop: "videoinfo", viprop: "url|size|mediatype|extmetadata|derivatives" });
  return Object.values(j.query?.pages ?? {}).sort((a, b) => a.index - b.index).map(vinfo).filter((x) => x && OK.test(x.license) && x.duration >= 6 && x.width >= 640);
}
async function byTitle(t) {
  const j = await api({ action: "query", titles: t, prop: "videoinfo", viprop: "url|size|mediatype|extmetadata|derivatives" });
  return vinfo(Object.values(j.query.pages)[0]);
}
const crop = (w, h) => `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1`;
const enc = ["-an", "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-maxrate", "1200k", "-bufsize", "2400k", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];

async function poster(key, mp4, at) {
  const png = path.join(TMP, `${key.replace(/\//g, "_")}.png`);
  run(["-ss", String(at), "-i", mp4, "-frames:v", "1", png]);
  await sharp(png).webp({ quality: 74 }).toFile(path.join(OUT, `${key}-poster.webp`));
}

for (const v of VIDEOS.filter((x) => !args.length || args.some((a) => x.key.startsWith(a)))) {
  const mp4 = path.join(OUT, `${v.key}.mp4`);
  if (!list && !force && fs.existsSync(mp4) && credits[v.key]) continue;
  fs.mkdirSync(path.dirname(mp4), { recursive: true });
  try {
    if (v.q) {
      if (list) {
        console.log(`\n${v.key} (${v.q})`);
        (await candidates(v.q)).slice(0, 12).forEach((c, i) => console.log(`  ${i}: ${c.title} · ${Math.round(c.duration)}s · ${c.width}x${c.height} · ${c.license}`));
        continue;
      }
      const pick = picks[v.key];
      const c = typeof pick === "string" ? await byTitle(pick) : (await candidates(v.q))[pick ?? 0];
      if (!c) { console.log("NONE ", v.key); continue; }
      const src = path.join(TMP, `${v.key.replace(/\//g, "_")}.src`);
      fs.writeFileSync(src, Buffer.from(await (await fetch(c.url, { headers: { "User-Agent": UA } })).arrayBuffer()));
      const len = Math.min(8, c.duration);
      const start = picks[`${v.key}#start`] ?? Math.max(0, Math.min(c.duration * 0.3, c.duration - len));
      run(["-ss", String(start), "-t", String(len), "-i", src, "-vf", `${crop(v.w, v.h)},fps=30`, ...enc, mp4]);
      credits[v.key] = { file: `assets/${v.key}.mp4`, poster: `assets/${v.key}-poster.webp`, source: c.page, title: c.title.replace(/^File:/, ""), author: c.author, license: c.license, width: v.w, height: v.h, duration: Math.round(len), alt: v.alt, kind: "video" };
    } else {
      if (list) continue;
      // Original slow-pan sequence from licensed stills (3 s each, 0.6 s crossfades).
      const seg = 3, fade = 0.6;
      // One frame per still: zoompan expands it to seg*30 frames (looping the input would multiply that).
      const inputs = v.stills.flatMap((s) => ["-i", path.join(OUT, `${s}.webp`)]);
      const parts = v.stills.map((_, i) => `[${i}:v]scale=${v.w * 2}:${v.h * 2}:force_original_aspect_ratio=increase,crop=${v.w * 2}:${v.h * 2},zoompan=z='min(zoom+0.0009,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${seg * 30}:s=${v.w}x${v.h}:fps=30,setsar=1[v${i}]`);
      let last = "v0", off = seg - fade;
      for (let i = 1; i < v.stills.length; i++) {
        parts.push(`[${last}][v${i}]xfade=transition=fade:duration=${fade}:offset=${off.toFixed(2)}[x${i}]`);
        last = `x${i}`;
        off += seg - fade;
      }
      run([...inputs, "-filter_complex", parts.join(";"), "-map", `[${last}]`, ...enc, mp4]);
      const len = v.stills.length * seg - (v.stills.length - 1) * fade;
      credits[v.key] = { file: `assets/${v.key}.mp4`, poster: `assets/${v.key}-poster.webp`, source: `original sequence from ${v.stills.map((s) => `assets/${s}.webp`).join(", ")}`, author: "TopFan POC (photos credited separately)", license: "Original sequence; see credits of the source photos", width: v.w, height: v.h, duration: Math.round(len), alt: v.alt, kind: "video" };
    }
    await poster(v.key, mp4, 1);
    fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 1));
    console.log("ok   ", v.key.padEnd(28), `${(fs.statSync(mp4).size / 1024).toFixed(0)} KB`, credits[v.key].license);
  } catch (e) {
    console.log("FAIL ", v.key, e.message.slice(0, 300));
  }
}
