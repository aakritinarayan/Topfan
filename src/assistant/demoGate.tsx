/**
 * Keeps each demo link on its own story (see app/demo.ts). A request for a workflow that belongs to
 * the other demo gets one short answer and an explicit link; nothing switches, redirects or changes
 * state on its own. Opening the other demo uses a new tab, so this demo's conversation stays.
 */
import { DEMOS, demoOwning, inScope, openDemo, type DemoScope } from "../app/demo";
import { normalizeText } from "../app/agent-context/intent";
import type { useAssistant } from "../state/assistantStore";

type Say = ReturnType<typeof useAssistant>["say"];

/** Content Autopilot requests ("plan my week", "review my drafts", "Smart Timing"…). */
const AUTOPILOT =
  /\b(content autopilot|autopilot|smart timing|plan (my|next|this|the) week|weekly (plan|posts|content)|plan my (weekly )?(posts|content)|review my (ai |ai generated |prepared )?(drafts|posts)|prepared (drafts|posts)|draft (queue|batch)|content strategy|manage my (weekly )?posts|prepare (this|next) week s content|post for me every week)\b/;
/** Website setup requests (domain, DNS, provisioning, Creator Quest). */
const SETUP =
  /\b(dns|godaddy|go daddy|domain name|my domain|a domain|new domain|buy (a )?domain|find (me )?a domain|connect (my )?domain|provision\w*|creator quest|mini games?|website setup|site setup|set ?up my (website|site|white label)|white label setup|account setup|onboarding|(edit|prepare|fill( in)?|set ?up|update|customi[sz]e) (my |the )?cover page)\b/;

/** The capability a request asks for when this demo doesn't include it (null = fine here). */
export function otherDemoRequest(text: string): DemoScope | null {
  const t = normalizeText(text).replace(/'/g, " ");
  if (!inScope("autopilot") && AUTOPILOT.test(t)) return "autopilot";
  if (!inScope("setup") && SETUP.test(t)) return "setup";
  return null;
}

/** "That workflow is available in the … demo." with an explicit way to open it. */
export function sayOtherDemo(say: Say, c: DemoScope) {
  const id = demoOwning(c);
  const title = DEMOS[id].title;
  say({
    text: `That workflow is available in the ${title} demo.`,
    plain: `That workflow is available in the ${title} demo.`,
    actions: [{ label: `Open the ${title} demo`, variant: "outline", onClick: () => openDemo(id) }],
  });
}
