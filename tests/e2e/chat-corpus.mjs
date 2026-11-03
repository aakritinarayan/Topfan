// "Never an error, never empty": asks the assistant ~170 everyday creator questions (plus gibberish,
// off-topic, risky and setup questions) and checks every one gets a non-empty reply that isn't an
// error and isn't a dead end. Runs against whatever answers: the live model if ANTHROPIC_API_KEY is
// set, otherwise demo mode. Usage: node tests/e2e/chat-corpus.mjs [--only platform|setup]  (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const BASE = process.env.BASE_URL || "http://localhost:5173";
const live = await fetch(`${BASE}/api/chat`).then((r) => r.json()).then((s) => s.configured).catch(() => false);
const WAIT = live ? 15000 : 900;

const PLATFORM = [
  // find a feature
  "I want to change my website logo.", "Where can I change my logo?", "Update my website branding.", "Take me to my website settings.", "Can you take me to my branding settings?",
  "Where are my fans?", "Show me my earnings", "open messages", "where do I see refunds", "take me to the feed", "how do I go live", "where are my orders",
  "Where do I set what fans pay to message me?", "change my profile picture", "edit my bio", "where's link in bio", "notification settings", "turn off email notifications",
  "add a team member", "give my manager access", "where are discount codes", "VIP offers", "portfolio", "show my transactions", "loyalty points history", "my purchases",
  "creator support", "help center", "faq", "announcements", "service providers", "guides", "topic tags", "groups", "gamification", "outbound emails", "NFT wallet",
  "connect metamask", "google calendar", "change my password", "privacy settings", "blocked users", "welcome message", "creator type", "interests", "customer support settings",
  "advertisements", "brand deals", "sponsors", "newsletters", "courses", "downloadables", "merchandise", "experiences", "events", "NFTs", "subscriptions",
  // goals
  "I want to start earning from fans, but I don't know where to start.", "I want to start earning from fans.", "how do I make money", "help me engage my fans", "explore fan engagement",
  "Help me set up a subscription for my biggest fans.", "I want to sell a course", "sell merch", "sell tickets for a meetup", "schedule a livestream", "send a newsletter to everyone",
  "create a post", "post a photo", "write something for my fans", "create a VIP group", "Create a group called Inner Circle", "add a topic tag named Backcountry", "reward my most active fans",
  "set up an automated welcome message", "fix my email", "why is my email failing", "grow my audience", "get more followers", "promote my next event",
  // what needs attention
  "What should I focus on?", "what needs my attention", "what's next", "where do I start", "catch me up", "anything wrong?",
  // explain
  "what is a white label site", "what's the difference between wallet and nft wallet", "what are topic tags", "explain gamification", "what does delegation do", "what is link in bio",
  // ambiguous
  "I want to change my settings.", "settings", "my wallet", "monetize", "support", "notifications", "my site",
  // data questions
  "how many fans do I have", "how much did I earn this month", "what's my balance", "how is my last post doing", "who are my top fans", "how many subscribers do I have",
  // money / risky / destructive
  "withdraw all my money", "refund everyone", "approve all refunds", "delete my account", "pause my account", "change my subscription price to $1", "give my manager financial access",
  "send a message to all fans", "publish my draft", "delete all my posts", "what's my bank password", "connect my bank",
  // task control without a task / with
  "pause", "resume", "cancel", "go back", "where was I", "continue",
  // small talk
  "hi", "hello", "thanks", "thank you!", "ok", "cool", "?", "help",
  // off-topic, gibberish, other languages, long, emoji
  "what's the weather today", "tell me a joke", "who won the super bowl", "write me a poem about snow", "asdf qwerty", "lkjhgfdsa", "123456", "🔥🔥🔥", "¿cómo cambio mi logo?",
  "comment changer mon logo", "I need help with something but I'm not sure what exactly, maybe something about my page or the way fans see my stuff, can you figure it out for me please",
  "how do I reply to comments", "can I sell on amazon", "can you post on instagram for me", "connect tiktok", "does topfan take a cut", "how much does topfan cost",
  "make my site dark mode", "translate my posts to spanish", "can I upload a video", "how do I add a cover photo", "where's the store order",
];

const SETUP = [
  "What's a CNAME record?", "Will my email still work?", "How long does it take?", "What do I do on this step?", "help", "I don't have a domain", "where do I buy a domain",
  "what's a dns provider", "I use cloudflare", "namecheap steps", "how do I do this at godaddy", "verification failed", "why isn't it working", "should I use a subdomain",
  "what's the difference between root and www", "can I change my domain later", "do you need my godaddy password", "what is ssl", "when can I change my logo",
  "what's provisioning", "can I play a game", "asdf", "what's the weather", "I'm stuck", "next", "what now",
];

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1512, height: 805 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BAD = /can't answer|cannot answer|something went wrong|couldn't process|\berror\b|\bundefined\b|\[object|\bNaN\b/;
let fails = 0, total = 0;

async function run(group, start, prompts) {
  const ctx = await b.createBrowserContext();
  let p;
  const errors = [];
  const fresh = async () => {
    if (p) await p.close();
    p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(String(e)));
    await p.goto(`${BASE}${start}${start.includes("?") ? "&" : "?"}resetMock=1&noDelay=1`, { waitUntil: "networkidle0" });
    await sleep(800);
    if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(500); }
    // Setup: get past the intro card so the input is usable.
    await p.evaluate(() => [...document.querySelectorAll("button")].find((x) => /let's get started/i.test(x.innerText))?.click());
    await sleep(1200);
    await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
    await sleep(300);
  };
  for (let i = 0; i < prompts.length; i++) {
    if (i % 12 === 0) await fresh();
    const q = prompts[i];
    total++;
    // Back to the chat view if the previous question opened Content Autopilot.
    await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
    await sleep(150);
    const before = await p.$$eval('[data-msg="assistant"]', (x) => x.length);
    const url0 = p.url();
    await p.click('[data-testid="ai-input"]', { clickCount: 3 });
    await p.keyboard.press("Backspace");
    await p.type('[data-testid="ai-input"]', q);
    await p.keyboard.press("Enter");
    await sleep(WAIT);
    const r = await p.evaluate((before) => {
      const all = [...document.querySelectorAll('[data-msg="assistant"]')];
      const fresh = all.slice(before);
      // Autopilot replaces the chat view: count it as an answer.
      const ap = !!document.querySelector('[data-testid="ap-close"]');
      return {
        n: fresh.length,
        text: fresh.map((m) => m.innerText.replace(/\s+/g, " ").trim()).join(" | "),
        problem: fresh.some((m) => m.dataset.status === "problem"),
        actionable: fresh.some((m) => m.querySelector("button")),
        ap,
      };
    }, before);
    const moved = p.url() !== url0;
    const okText = r.n > 0 && r.text.length > 8;
    // A role or availability limit is a real answer, not an error; the owner shouldn't hit any.
    const ok = (okText || r.ap) && !r.problem && !BAD.test(r.text);
    if (!ok) {
      fails++;
      console.log(`FAIL [${group}] "${q}" → ${r.n ? r.text.slice(0, 200) : "(no reply)"}${r.problem ? " [problem status]" : ""}`);
    } else if (process.argv.includes("-v")) console.log(`ok   [${group}] "${q}" → ${moved ? `(opened ${new URL(p.url()).pathname}) ` : ""}${r.actionable ? "[actions] " : ""}${r.text.slice(0, 110)}`);
  }
  if (errors.length) { fails++; console.log(`FAIL [${group}] page errors:\n${errors.join("\n")}`); }
  await ctx.close();
}

console.log(live ? "Answering: live model" : "Answering: demo mode (no API key)");
if (only !== "setup") await run("platform", "/", PLATFORM);
if (only !== "platform") {
  await run("setup step 1", "/edit-preference/whitelabel/setup/domain", SETUP);
  await run("setup step 2", "/edit-preference/whitelabel/setup/dns", SETUP.slice(0, 14));
}
console.log(`\n${total} questions, ${fails} failed`);
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await b.close();
process.exit(fails ? 1 : 0);
