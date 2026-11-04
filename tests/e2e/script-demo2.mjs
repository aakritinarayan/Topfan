// Demo 2 presenter script (docs/TOPFAN_EXACT_DEMO_PROMPTS.md): the 22 prompts typed word for word, plus the variations.
// Usage: node tests/e2e/script-demo2.mjs [--record] [--viewport=1126x797]   (BASE_URL=… for Vercel)
import { freshPage, journey, launch, sleep } from "./lib/journey.mjs";
const RECORD = process.argv.includes("--record");
const vpArg = (process.argv.find((a) => a.startsWith("--viewport=")) ?? "").split("=")[1];
const b = await launch(vpArg ? { width: +vpArg.split("x")[0], height: +vpArg.split("x")[1] } : undefined);
const p = await freshPage(b, "ai-content");
const j = journey(p);
const DB = "topfan-mock-v1:ai-content";
const step = async (n, prompt, wait = 1600) => {
  const r = await j.say(prompt, wait);
  const s = { n, prompt, path: j.path(), url: j.url(), reply: r.replace(/\s+/g, " ").trim(), buttons: await j.buttons() };
  if (RECORD) console.log(`\n### P${n}: ${prompt}\n  url: ${s.url}\n  reply: ${s.reply.slice(0, 800)}\n  buttons: ${JSON.stringify(s.buttons)}`);
  return s;
};
const PROMPTS = [
  "Help me create a post about my snowboarding journey.",
  "Generate an image for this post.",
  "Make the image more cinematic.",
  "Make the caption shorter.",
  "I want to monetize this post. What do you recommend?",
  "Let fans unlock it for $5, or use loyalty points if supported.",
  "Create a public teaser for this exclusive post.",
  "Help me create a newsletter for my fans. Show me a few topic ideas.",
  "Use the second topic and prepare the full newsletter with a cover image.",
  "Help me plan an experience for my fans. Show me some ideas.",
  "Use the first experience idea and prepare the full description and cover image.",
  "Help me promote my training experience through Link in Bio.",
  "Plan my entire week with posts, a newsletter, and a fan experience.",
  "Show me the weekly plan before preparing the drafts.",
  "Move the newsletter to Thursday and make one post exclusive.",
  "Approve this plan and prepare all the drafts.",
  "Open Monday's post.",
  "Make the caption shorter and update it in the post editor.",
  "Open my newsletter draft.",
  "What still needs my approval before I publish everything?",
  "Save the remaining drafts and let me continue later.",
  "Continue my weekly plan.",
];
const S = [];
const has = (x, re) => re.test(x.reply);
const btn = (x, re) => x.buttons.some((b) => re.test(b));
const store = () => j.store(DB);
const focusItem = async () => { const d = await store(); return d.content.items.find((x) => x.id === d.content.focusId); };
const C = {
  1: (x) => j.check("P1: post draft from your own training notes, image choices offered", has(x, /draft from your training notes/) && has(x, /AI-generated image: /), x.reply),
  2: (x) => j.check("P2: image style choices", btn(x, /^Cinematic$/)),
  3: async (x) => j.check("P3: cinematic version attached", has(x, /new version/) && !!(await focusItem())?.media, x.reply),
  4: async (x) => { const f = await focusItem(); j.check("P4: caption shorter, placeholder kept whole", has(x, /Shorter now/) && !/^\]/.test(f.post.text) && f.post.text.split(/[.!?]\]?\s/).length <= 3, f.post.text); },
  5: (x) => j.check("P5: recommends a $5 unlock, points and member options, no NFT invented", has(x, /\$5 one-time unlock/) && has(x, /loyalty points/) && has(x, /won't suggest one/) && btn(x, /^APPLY SUGGESTION$/), x.reply),
  6: async (x) => { const f = await focusItem(); j.check("P6: Lock = $5 purchase OR loyalty points, nothing published", f.post.locked && /\$5/.test(x.reply) && /loyalty points/.test(x.reply) && /Nothing is published/.test(x.reply) && f.status !== "published", x.reply); },
  7: (x) => j.check("P7: separate public teaser, topic only", has(x, /separate public teaser/) && has(x, /Audience: Public/), x.reply),
  8: (x) => j.check("P8: newsletter topic ideas (not a draft yet)", has(x, /Newsletter topics/) && x.buttons.filter((b) => /^Use this topic$/.test(b)).length >= 3, x.reply),
  9: async (x) => { const f = await focusItem(); j.check("P9: second topic → full newsletter with a cover image", f.kind === "newsletter" && /3 Tricks I'm Working On/.test(f.label + f.newsletter.subject + x.reply) && !!f.media && has(x, /cover image/), x.reply); },
  10: (x) => j.check("P10: experience ideas", has(x, /Experience ideas/) && x.buttons.filter((b) => /^Explore idea$/.test(b)).length >= 3, x.reply),
  11: async (x) => { const f = await focusItem(); j.check("P11: first idea → full description + cover image, price left to you", f.kind === "experience" && /1:1 Riding Technique Coaching Call/.test(x.reply) && !!f.media && has(x, /won't set one/), x.reply); },
  12: (x) => j.check("P12: Link in Bio recommendation on the Link in Bio page", x.path === "/edit-preference/link-in-bio" && btn(x, /^UPDATE MY LINK IN BIO$/), x.reply),
  13: async (x) => { const d = await store(); const w = d.content.items.find((y) => y.kind === "week" && y.plan); j.check("P13: plan first: Mon post, Wed members post, Fri newsletter, Sat experience; nothing created", has(x, /Nothing is created until you approve it/) && /MON[\s\S]*WED[\s\S]*FRI[\s\S]*SAT/.test(x.reply) && !!w && w.plan.activities.every((a) => !a.childId), x.reply); },
  14: (x) => j.check("P14: shows the plan, still not prepared", has(x, /Nothing is created until you approve it/) && btn(x, /^APPROVE PLAN & PREPARE DRAFTS$/), x.reply),
  15: (x) => j.check("P15: newsletter → Thursday; one post exclusive", has(x, /Moved Friday's newsletter to Thursday/) && has(x, /exclusive/) && /THU[\s\S]*This Week on the Mountain/.test(x.reply), x.reply),
  16: async (x) => { const d = await store(); const kids = d.content.items.filter((y) => y.parentId && d.content.items.find((w) => w.id === y.parentId)?.plan); j.check("P16: drafts prepared, nothing published", has(x, /Your week is ready for review/) && kids.length >= 4 && kids.every((y) => !["published", "sent"].includes(y.status)), JSON.stringify(kids.map((y) => [y.kind, y.status]))); },
  17: async (x) => { const v = await p.$eval("textarea", (t) => t.value).catch(() => ""); j.check("P17: Monday's post opens in New Post, filled in", x.path === "/dashboard/newpost" && /work=/.test(x.url) && /switch backside 540/.test(v), v); },
  18: async (x) => { await sleep(500); const v = await p.$eval("textarea", (t) => t.value).catch(() => ""); j.check("P18: shorter caption updated in the open editor", has(x, /Shorter now/) && !/What should I film first/.test(v) && /switch backside 540/.test(v), v); },
  19: (x) => j.check("P19: newsletter draft opens in Add Newsletter", x.path === "/monetize/newsletters/add" && has(x, /Thursday's newsletter/), x.url),
  20: (x) => j.check("P20: what needs approval: access, newsletter email, experience price", has(x, /need you/) && has(x, /access review/) && has(x, /email needs verifying/) && has(x, /price and availability/), x.reply),
  21: async (x) => { const d = await store(); const w = d.content.items.find((y) => y.kind === "week" && y.plan); j.check("P21: saved for later, nothing published", has(x, /Saved/) && has(x, /nothing is published/) && w.status === "paused", w?.status); },
  22: async (x) => { const d = await store(); const w = d.content.items.find((y) => y.kind === "week" && y.plan); j.check("P22: continue → the same week, resumed", has(x, /Your week is ready for review|WEEK OF/) && w.status !== "paused", w?.status); },
};
// What the presenter clicks after a prompt (by prompt number).
const AFTER = { 2: /^Cinematic$/ };
for (let i = 0; i < PROMPTS.length; i++) {
  const x = await step(i + 1, PROMPTS[i], 2200);
  S.push(x);
  if (AFTER[i + 1]) { const r = await j.tap(AFTER[i + 1], 2200); if (RECORD) console.log(`  tap ${r.hit}: ${r.r.replace(/\s+/g, " ").slice(0, 400)}`); }
  await C[i + 1]?.(x);
}
let v = await step("V", "Give me more ideas.");
j.check("V: more ideas → a new round", has(v, /different ones/) && btn(v, /^Explore idea$/), v.reply);
v = await step("V", "Use the fourth option.");
const fourth = v.reply.match(/Draft Needs your input (.+?) A /)?.[1];
j.check("V: fourth option → its full proposal", !!fourth && has(v, /full proposal/), v.reply);
v = await step("V", "Use the last idea.");
j.check("V: last idea (= fourth of four)", has(v, /full proposal/) && v.reply.includes(fourth), v.reply);
v = await step("V", "Make it shorter.");
j.check("V: shorter", has(v, /Shorter now/), v.reply);
v = await step("V", "Change the image.");
j.check("V: change the image → image choices", has(v, /Choose an image/), v.reply);
v = await step("V", "Use this for my newsletter.");
j.check("V: use this for my newsletter → newsletter draft", has(v, /newsletter/i) && !has(v, /not sure I understood/), v.reply);
v = await step("V", "Go back to the previous draft.");
j.check("V: previous draft reopens", !has(v, /not sure I understood/) && has(v, /Draft/), v.reply);
v = await step("V", "What was I working on?");
j.check("V: what was I working on → unfinished list", has(v, /unfinished/) && btn(v, /^YOUR WEEKLY PLAN$/i), v.reply);
v = await step("V", "Show me my unfinished tasks.");
j.check("V: unfinished tasks", has(v, /unfinished/), v.reply);
j.check("no page errors", !p.errors.length, p.errors.join("\n"));
await b.close();
console.log(j.fails ? `${j.fails} FAILED` : "ALL PASSED");
process.exit(j.fails ? 1 : 0);
