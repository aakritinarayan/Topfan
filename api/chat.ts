// Vercel serverless function (Node runtime). Set ANTHROPIC_API_KEY in the Vercel project's environment variables.
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleChat } from "../server/chat.js";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handleChat(req, res);
}
