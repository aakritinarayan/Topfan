import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Serves /api/chat (server/chat.ts) from the dev server: the same handler Vercel runs as api/chat.ts.
 * Secrets are read from .env.local into process.env on the server only; Vite exposes just VITE_* vars to the browser.
 */
function chatApi(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), "");
  for (const k of ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL"]) if (env[k] && !process.env[k]) process.env[k] = env[k];
  return {
    name: "topfan-chat-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/chat", async (req, res) => {
        try {
          const { handleChat } = await server.ssrLoadModule("/server/chat.ts");
          await handleChat(req, res);
        } catch (err) {
          console.error("[api/chat]", err);
          if (!res.headersSent) res.statusCode = 500;
          res.end(JSON.stringify({ type: "error", code: "server", message: "Something went wrong on our side." }) + "\n");
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), chatApi(mode)],
}));
