/**
 * Writes JSON/markdown copies of the agent-context catalogues to docs/agent-context/.
 * Loads the TypeScript sources through Vite (no build step):  npm run export:agent-context
 */
import { createServer } from "vite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = join(process.cwd(), "docs/agent-context");
mkdirSync(out, { recursive: true });
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error" });
try {
  const load = (p) => server.ssrLoadModule(p);
  const { routes } = await load("/src/app/routeCatalog.ts");
  const { FEATURES, AMBIGUITIES, GOALS } = await load("/src/app/agent-context/features.ts");
  const { TASKS } = await load("/src/app/agent-context/tasks.ts");
  const { ACTIONS } = await load("/src/app/agent-context/actions.ts");
  const { TIERS, ROLE_NOTES, capabilitiesOf } = await load("/src/app/agent-context/permissions.ts");
  const { getAccountState } = await load("/src/app/agent-context/account-state.ts");
  const { recommend } = await load("/src/app/agent-context/recommendations.ts");
  const { platformKnowledge } = await load("/src/app/agent-context/knowledge.ts");
  const { initialData } = await load("/src/store/store.tsx");

  const write = (name, data) => writeFileSync(join(out, name), typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n");
  write("routes.json", routes);
  write("features.json", { goals: GOALS, features: FEATURES, ambiguities: AMBIGUITIES });
  write(
    "tasks.json",
    TASKS.map((t) => ({
      ...t,
      dependsOn: t.dependsOn?.map((x) => ({ taskId: x.taskId, note: x.note })),
      steps: t.steps.map(({ done, ...s }) => ({ ...s, completionCheck: done.toString().replace(/\s+/g, " ") })),
    })),
  );
  write("actions.json", ACTIONS);
  write("permissions.json", { tiers: TIERS, roles: Object.fromEntries(["creator", "content", "financial"].map((r) => [r, { capabilities: capabilitiesOf(r), note: ROLE_NOTES[r] }])) });
  const d = initialData();
  const now = new Date("2026-11-02T12:00:00Z").getTime();
  write("account-state.example.json", { note: "getAccountState(initialData()) — derived from the mock store, never hard-coded.", ...getAccountState(d, now) });
  write("recommendations.example.json", { note: "recommend(initialData()) for the owner role.", items: recommend(d) });
  write("knowledge.md", platformKnowledge() + "\n");
  console.log(`agent-context exported to ${out}`);
} finally {
  await server.close();
}
