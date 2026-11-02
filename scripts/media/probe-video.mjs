/** Review helper: frames at 8 points of Commons videos as one sheet. node probe-video.mjs out.png "File:A.webm" ... */
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import ffmpeg from "ffmpeg-static";
import sharp from "sharp";

const UA = "TopFanPOC-demo-media/1.0 (local prototype)";
const TMP = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../node_modules/.cache/topfan-media");
fs.mkdirSync(TMP, { recursive: true });
const [out, ...titles] = process.argv.slice(2);
const comps = [];
for (const [r, t] of titles.entries()) {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({ action: "query", format: "json", titles: t, prop: "videoinfo", viprop: "url|derivatives" }).forEach(([k, v]) => u.searchParams.set(k, v));
  const v = Object.values((await (await fetch(u, { headers: { "User-Agent": UA } })).json()).query.pages)[0].videoinfo[0];
  const d = (v.derivatives ?? []).filter((x) => /webm|mp4/.test(x.type) && (x.height ?? 0) <= 480).sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0];
  const src = path.join(TMP, `probe-${r}.src`);
  fs.writeFileSync(src, Buffer.from(await (await fetch(d?.src ?? v.url, { headers: { "User-Agent": UA } })).arrayBuffer()));
  const dur = Number(/Duration: (\d+):(\d+):([\d.]+)/.exec(spawnSync(ffmpeg, ["-i", src]).stderr.toString())?.slice(1).reduce((a, x, i) => a + Number(x) * [3600, 60, 1][i], 0) ?? 0) || null;
  console.log(r, t);
  for (let i = 0; i < 8; i++) {
    const png = path.join(TMP, `probe-${r}-${i}.png`);
    try {
      execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(((i + 0.5) / 8) * (dur ?? 60)), "-i", src, "-frames:v", "1", "-vf", "scale=200:-2", png]);
      comps.push({ input: await sharp(png).resize(200, 112, { fit: "cover" }).png().toBuffer(), left: i * 204, top: r * 132 + 18 });
    } catch {}
  }
  comps.push({ input: Buffer.from(`<svg width="816" height="18"><text x="2" y="13" font-size="12" font-family="Arial" fill="#fff">${r}: ${t.replace(/&/g, "&amp;").slice(0, 100)} (${Math.round(dur ?? 0)}s)</text></svg>`), left: 0, top: r * 132 });
}
await sharp({ create: { width: 1632, height: titles.length * 132, channels: 3, background: "#222" } }).composite(comps).png().toFile(out);
