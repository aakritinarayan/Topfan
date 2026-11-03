// Serves the production build (dist/) the way vercel.json does, for testing before a deploy:
// existing files first, /api/chat → the same handler as api/chat.ts, every other path → index.html.
// Usage: npm run build && node scripts/serve-dist.mjs [port]   (default 4173)
// Then run any e2e suite against it: BASE_URL=http://localhost:4173 node tests/e2e/two-demos.mjs
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { createServer as createVite } from "vite";

const ROOT = join(process.cwd(), "dist");
const PORT = Number(process.argv[2] || 4173);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".mp4": "video/mp4", ".webm": "video/webm", ".woff": "font/woff", ".woff2": "font/woff2", ".json": "application/json", ".ico": "image/x-icon", ".vtt": "text/vtt" };

// Only to load server/chat.ts (TypeScript) for /api/chat; the page itself comes from dist/.
const vite = await createVite({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });

const fileFor = (url) => {
  const p = normalize(decodeURIComponent(new URL(url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  const f = join(ROOT, p);
  try {
    return f.startsWith(ROOT) && statSync(f).isFile() ? f : null;
  } catch {
    return null;
  }
};

createServer(async (req, res) => {
  if (req.url.startsWith("/api/chat")) {
    const { handleChat } = await vite.ssrLoadModule("/server/chat.ts");
    return handleChat(req, res);
  }
  const f = fileFor(req.url) ?? join(ROOT, "index.html");
  res.setHeader("Content-Type", TYPES[extname(f)] ?? "application/octet-stream");
  createReadStream(f).pipe(res);
}).listen(PORT, () => console.log(`dist/ on http://localhost:${PORT}`));
