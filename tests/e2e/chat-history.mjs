// "See older chats": older messages load in batches above the one being read, which stays exactly in place;
// scrolling up keeps loading; the start is marked; new replies don't yank a reader down; sending does.
// Both demos. Usage: node tests/e2e/chat-history.mjs   (BASE_URL=… for Vercel)
import { freshPage, journey, launch, sleep } from "./lib/journey.mjs";
const b = await launch();
let fails = 0;

async function run(demo, prompts, label) {
  const p = await freshPage(b, demo);
  const j = journey(p);
  if (demo === "setup-navigation") await p.goto(`${new URL(p.url()).origin}/ajwhite?noDelay=1`, { waitUntil: "networkidle0" }), await sleep(1200);
  await j.openPanel();
  for (const q of prompts) await j.say(q, 1500);
  // Open another page from the browser (not the assistant): the chat starts fresh and older chats fold.
  await sleep(1000);
  await p.evaluate(() => (window.history.pushState({}, "", "/edit-preference/profile"), window.dispatchEvent(new PopStateEvent("popstate"))));
  await sleep(1500);
  const sc = '[data-testid="ai-scroller"]';
  const total = await p.$$eval("[data-mid]", (x) => x.length);
  j.check(`${label}: older chats folded behind the button`, !!(await p.$('[data-testid="ai-older-toggle"]')), total);
  // Marks the first thing in view (message or welcome card) so its position can be compared after loading.
  const geo = () =>
    p.$eval(sc, (el) => {
      const box = el.getBoundingClientRect();
      const ms = [...el.querySelectorAll("[data-mid]")];
      const items = [...ms, ...[...el.children].filter((c) => !c.matches('[data-testid^="ai-older"]'))].filter((x) => x.offsetHeight > 0 && x.getBoundingClientRect().bottom > box.top + 1);
      const first = items.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
      document.querySelectorAll("[data-t-anchor]").forEach((x) => x.removeAttribute("data-t-anchor"));
      first?.setAttribute("data-t-anchor", "1");
      return { top: el.scrollTop, count: ms.length, ids: ms.map((m) => m.dataset.mid), firstY: first ? first.getBoundingClientRect().top - box.top : null };
    });
  const anchorY = () => p.$eval(sc, (el) => document.querySelector("[data-t-anchor]").getBoundingClientRect().top - el.getBoundingClientRect().top);
  // 1) one batch: the message being read stays at the same spot
  await p.$eval(sc, (el) => (el.scrollTop = 0));
  await sleep(300);
  let before = await geo();
  await p.click('[data-testid="ai-older-toggle"]');
  await sleep(900);
  const y = await anchorY();
  let after = await geo();
  // Kept in place, or as close as the panel allows when the content below is shorter than the view (scrolled to the end).
  const atEnd = await p.$eval(sc, (el) => el.scrollHeight - el.scrollTop - el.clientHeight < 2);
  j.check(`${label}: one batch loads above, reading position kept (Δ ${(y - before.firstY).toFixed(1)}px${atEnd ? ", scrolled as far as possible" : ""})`, after.count > before.count && after.top > 0 && (Math.abs(y - before.firstY) <= 2 || (atEnd && y >= before.firstY)), JSON.stringify({ before, after, y }));
  j.check(`${label}: no duplicates, order kept`, new Set(after.ids).size === after.ids.length && before.ids.every((id, i) => after.ids.slice(after.count - before.count)[i] === id), JSON.stringify([before.ids, after.ids]));
  // 2) scrolling up keeps loading until the very first message, then the start is marked
  for (let i = 0; i < 12 && (await p.$('[data-testid="ai-older-toggle"]')); i++) {
    // Mark the first visible item, then scroll to the very top (which loads the next batch) and record where it sits
    // at that instant; after the batch renders it must be in exactly the same place.
    await p.$eval(sc, (el) => (el.scrollTop = 40));
    await sleep(200);
    const g = await geo();
    const baseY = await p.$eval(sc, (el) => ((el.scrollTop = 0), document.querySelector("[data-t-anchor]").getBoundingClientRect().top - el.getBoundingClientRect().top));
    await sleep(800);
    const y2 = await anchorY();
    const g2 = await p.$eval(sc, (el) => ({ count: el.querySelectorAll("[data-mid]").length, top: el.scrollTop, end: el.scrollHeight - el.scrollTop - el.clientHeight < 2 }));
    if (g2.count > g.count) j.check(`${label}: scroll-up batch ${i + 1}: more history above, item being read stays put (Δ ${(y2 - baseY).toFixed(1)}px)`, Math.abs(y2 - baseY) <= 2 || (g2.end && y2 >= baseY), JSON.stringify({ baseY, y2, g2 }));
  }
  const all = await geo();
  j.check(`${label}: whole history reachable`, all.count >= total, `${all.count}/${total}`);
  j.check(`${label}: "Start of your conversation" shown`, !!(await p.$('[data-testid="ai-older-start"]')) && !(await p.$('[data-testid="ai-older-toggle"]')));
  // 4) sending a message brings the reader to the latest message
  await j.say("What still needs my attention?", 1800);
  const end = await p.$eval(sc, (el) => el.scrollHeight - el.scrollTop - el.clientHeight);
  j.check(`${label}: sending scrolls to the latest message`, end < 6, end);
  j.check(`${label}: input stays fixed below the conversation`, await p.evaluate(() => { const i = document.querySelector('[data-testid="ai-input"]').getBoundingClientRect(); const s = document.querySelector('[data-testid="ai-scroller"]').getBoundingClientRect(); return i.top >= s.bottom - 1; }));
  j.check(`${label}: no page errors`, !p.errors.length, p.errors.join("\n"));
  fails += j.fails;
  await p.browserContext().close();
}

await run("ai-content", [
  "Help me create a post about my snowboarding journey.",
  "Generate an image for this post.",
  "Make the caption shorter.",
  "Help me create a newsletter for my fans. Show me a few topic ideas.",
  "Use the second topic and prepare the full newsletter with a cover image.",
  "Help me plan an experience for my fans. Show me some ideas.",
  "Use the first experience idea and prepare the full description and cover image.",
  "Plan my entire week with posts, a newsletter, and a fan experience.",
], "Demo 2");
await run("setup-navigation", [
  "Help me customize my website branding and logo.",
  "I want to change my account settings.",
  "Take me to my wallet.",
  "I want to start earning money from my fans. What options do I have?",
  "I want to earn through brand collaborations. What should I focus on?",
  "Where can I see my fans and identify my most engaged supporters?",
  "What needs my attention?",
  "How do I set up a subscription?",
], "Demo 1");
// A reply that arrives on its own (provisioning finishes) must not pull a reader of older messages down.
{
  const p = await freshPage(b, "setup-navigation");
  const j = journey(p);
  await p.goto(`${new URL(p.url()).origin}/edit-preference/whitelabel/setup/provisioning?noDelay=1`, { waitUntil: "networkidle0" });
  await sleep(1500);
  await j.openPanel();
  for (const q of ["How long does provisioning take?", "What is a CNAME record?", "Can I leave this page?", "What is Creator Quest?"]) await j.say(q, 1200);
  const sc = '[data-testid="ai-scroller"]';
  await p.$eval(sc, (el) => (el.scrollTop = 30));
  await sleep(400);
  const n0 = await p.$$eval("[data-mid]", (x) => x.length);
  const t0 = await p.$eval(sc, (el) => el.scrollTop);
  await p.evaluate(() => [...document.querySelectorAll("button")].find((x) => /^Simulate: finish provisioning$/.test(x.innerText.trim()))?.click());
  await sleep(6500);
  const n1 = await p.$$eval("[data-mid]", (x) => x.length);
  const arrived = await p.$$eval("[data-msg=assistant]", (x) => /Your site is ready/.test(x.at(-1)?.innerText ?? ""));
  const t1 = await p.$eval(sc, (el) => el.scrollTop);
  j.check(`Demo 1: a new reply while reading history leaves the reader in place (top ${t0}→${t1})`, arrived && Math.abs(t1 - t0) <= 2, `${n0}→${n1}`);
  await p.$eval(sc, (el) => (el.scrollTop = el.scrollHeight));
  await sleep(300);
  await j.say("Thanks", 1500);
  j.check("Demo 1: at the bottom, new messages keep following", (await p.$eval(sc, (el) => el.scrollHeight - el.scrollTop - el.clientHeight)) < 6);
  fails += j.fails;
}
await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
