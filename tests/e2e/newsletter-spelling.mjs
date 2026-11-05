// "news letter", "news-letter" and "News Letter" are read as "newsletter"; the chat still shows what was typed.
import { freshPage, journey, launch } from "./lib/journey.mjs";
const b = await launch();
const p = await freshPage(b, "ai-content");
const j = journey(p);
const t = (q, w = 2000) => j.say(q, w).then((r) => r.replace(/\s+/g, " ").slice(0, 160));
let r = await t("Help me create a news letter for my fans. Show me a few topic ideas.");
j.check("ideas", /Newsletter topics/.test(r), r);
r = await t("Use the second topic and prepare the full news letter with a cover image.");
j.check("draft", /full newsletter draft/.test(r), r);
r = await t("Plan my entire week with posts, a news-letter, and a fan experience.");
j.check("week", /plan for your week/.test(r), r);
r = await t("Move the News Letter to Thursday.");
j.check("move", /newsletter to Thursday/.test(r), r);
const shown = await p.$$eval('[data-msg="user"]', (x) => x.map((m) => m.innerText)).catch(() => []);
j.check("chat shows what was typed", shown.some((s) => /news letter/.test(s)), JSON.stringify(shown));
await b.close();
console.log(j.fails ? `${j.fails} FAILED` : "ALL PASSED");
process.exit(j.fails ? 1 : 0);
