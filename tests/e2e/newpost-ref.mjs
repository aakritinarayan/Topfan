// New Post against the reference screen pack (creator-platform-screens §4): the 10 types and the
// sections each one shows (table 4.2), click-to-open info tips, the Lock dialog (Individual Purchase,
// Loyalty Points, Lock with NFT), Collaborate, Interests, Poll (add option, date and clock pickers),
// Fundraiser levels and gifts (selection survives a dismissed dialog), the Article toolbar, AI dialog
// and Insert pickers, plus Demo 2's Lock phrases (four distinct access models, prefilled via ?work=).
// Usage: node tests/e2e/newpost-ref.mjs   (dev server on :5173)
import puppeteer from "../../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, defaultViewport: { width: 1126, height: 797 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : String(x).slice(0, 400)); if (!ok) fails++; };
const T = (id) => `[data-testid="${id}"]`;

async function page(demo) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(String(e)));
  await p.evaluateOnNewDocument(() => localStorage.setItem("tf-no-delay", "1"));
  if (demo) await p.goto(`${BASE}/demo/${demo}?resetMock=1&noDelay=1`, { waitUntil: "networkidle0" });
  else await p.goto(`${BASE}/ajwhite?resetMock=1&noDelay=1&demo=off`, { waitUntil: "networkidle0" });
  await sleep(900);
  return p;
}
const go = async (p, u) => { await p.goto(`${BASE}${u}`, { waitUntil: "networkidle0" }); await sleep(800); };
const has = (p, id) => p.$(T(id)).then(Boolean);
const click = async (p, id, wait = 250) => { await p.$eval(T(id), (e) => (e.scrollIntoView({ block: "center" }), e.click())); await sleep(wait); };
const text = (p, id) => p.$eval(T(id), (e) => e.innerText).catch(() => "");
const typeInto = async (p, id, v) => { await p.$eval(T(id), (e) => (e.scrollIntoView({ block: "center" }), e.focus())); await p.type(T(id), v); await sleep(150); };
const checked = (p, id) => p.$eval(T(id), (e) => e.getAttribute("aria-checked") === "true").catch(() => null);
const pickType = (p, t) => click(p, `newpost-type-${t}`, 300);

/* ===== 1. Types, rows, sections per table 4.2 ===== */
{
  const p = await page(null);
  await go(p, "/dashboard/newpost");
  check("empty state copy", /To publish your content, choose a post type above/.test(await text(p, "newpost-empty")));
  const tops = await p.$$eval('[role="tablist"] [role="tab"]', (x) => x.map((e) => [e.innerText.trim(), Math.round(e.getBoundingClientRect().top)]));
  check("10 type pills in order", tops.map((x) => x[0]).join(",") === "VIDEO,IMAGES,ARTICLE,AUDIO,REEL,POLL,GIVEAWAYS,LINK,FUNDRAISER,TEXT", tops.map((x) => x[0]).join(","));
  const rows = [...new Set(tops.map((x) => x[1]))];
  check("pills fit in two rows (5 + 5) at 1126", rows.length === 2 && tops.slice(0, 5).every((x) => x[1] === rows[0]) && tops.slice(5).every((x) => x[1] === rows[1]), JSON.stringify(tops));
  check("no horizontal overflow at 1126", (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  // [lock&collab, interests, discovery, signIn, sensitive, preview]
  const TABLE = {
    video: [1, 1, 1, 1, 1, 0], images: [1, 1, 1, 1, 1, 0], article: [1, 1, 1, 1, 1, 1], audio: [1, 1, 0, 1, 1, 1], reel: [1, 1, 1, 1, 1, 0],
    poll: [1, 1, 0, 0, 1, 0], giveaway: [1, 1, 0, 0, 1, 1], link: [1, 1, 0, 1, 1, 1], fundraiser: [0, 0, 0, 0, 1, 1], text: [0, 1, 0, 0, 1, 0],
  };
  for (const [t, want] of Object.entries(TABLE)) {
    await pickType(p, t);
    const got = [
      (await has(p, "newpost-lock")) && (await has(p, "newpost-collaborate")),
      await has(p, "newpost-interests"),
      (await has(p, "newpost-opt-discovery")) || (await has(p, "newpost-opt-discoveryReel")),
      await has(p, "newpost-opt-signIn"),
      await has(p, "newpost-opt-sensitive"),
      await has(p, "newpost-preview-upload"),
    ].map(Number);
    check(`${t}: sections match table 4.2`, got.join() === want.join(), `got ${got} want ${want}`);
    check(`${t}: chevron + PUBLISH NOW`, (await has(p, "newpost-publish-options")) && /publish now/i.test(await text(p, "newpost-publish")));
  }
  await pickType(p, "reel");
  const order = await p.$$eval('[data-testid^="newpost-opt-"]', (x) => x.map((e) => e.dataset.testid.replace("newpost-opt-", "")));
  check("reel: option order Discovery, Sensitive, Sign In", order.join() === "discoveryReel,sensitive,signIn", order.join());
  check("reel: placeholder 'Add a description…'", (await p.$eval(T("newpost-text"), (e) => e.placeholder)) === "Add a description…");
  check("reel: helper text", /45 seconds or less and in vertical\/portrait orientation/.test(await p.evaluate(() => document.body.innerText)));
  await pickType(p, "video");
  const body = await p.evaluate(() => document.body.innerText);
  check("video: upload label + helper", /Upload Video/.test(body) && /Any MP4 or MOV up to 10GB/.test(body));
  check("video: Discovery on, Sign In off, Sensitive off by default", (await checked(p, "newpost-opt-discovery")) && !(await checked(p, "newpost-opt-signIn")) && !(await checked(p, "newpost-opt-sensitive")));
  await pickType(p, "images");
  check("images: helper text", /Any JPG, JPEG, PNG, HEIC, HEIF, WEBP, AVIF or GIF/.test(await p.evaluate(() => document.body.innerText)));
  await pickType(p, "audio");
  check("audio: helper text", /Any mp3 or wav up to 200MB/.test(await p.evaluate(() => document.body.innerText)));

  /* ---- info tips: open on click, toggle, close the other ---- */
  await pickType(p, "video");
  const tip = (opt) => p.evaluate((o) => { const row = document.querySelector(`[data-testid="newpost-opt-${o}"]`).parentElement; row.querySelector('[aria-label="More info"]').click(); }, opt);
  const tipsOpen = () => p.$$eval("span.absolute.z-30", (x) => x.map((e) => e.innerText));
  check("tips closed initially", (await tipsOpen()).length === 0);
  await p.hover('[data-testid="newpost-opt-discovery"] + span [aria-label="More info"]').catch(() => {});
  await sleep(200);
  check("hover alone opens nothing", (await tipsOpen()).length === 0);
  await tip("discovery");
  await sleep(200);
  let open = await tipsOpen();
  check("click opens the Discovery tip", open.length === 1 && /Discovery Feed, even though your account is private/.test(open[0]), open);
  await tip("discovery");
  await sleep(200);
  check("click again closes it", (await tipsOpen()).length === 0);
  await tip("signIn");
  await sleep(200);
  await p.evaluate(() => document.querySelector('[data-testid="newpost-opt-sensitive"]').parentElement.querySelector('[aria-label="More info"]').dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
  await tip("sensitive");
  await sleep(200);
  open = await tipsOpen();
  check("opening another closes the first", open.length === 1 && /responsibility as a creator/.test(open[0]), open);
  await p.mouse.click(5, 790);
  await sleep(150);

  /* ---- interests accordion ---- */
  await click(p, "newpost-interests");
  const inside = await p.evaluate(() => { const panel = document.querySelector('[data-testid="newpost-interests-panel"]'); return !!panel && panel.parentElement.contains(document.querySelector('[data-testid="newpost-interests"]')); });
  check("interests expand in place, inside the same card", inside);
  const chips = await p.$$eval('[data-testid="newpost-interests-panel"] button', (x) => x.length);
  await p.$eval('[data-testid="newpost-interests-panel"] button', (e) => e.click());
  await sleep(150);
  check("interest chips multi-select", chips > 5 && /\(1\)/.test(await text(p, "newpost-interests")));

  /* ---- Lock dialog ---- */
  await click(p, "newpost-lock", 400);
  check("Lock dialog opens", await has(p, "newpost-lock-panel"));
  check("Lock title copy", /Choose any of the options below to lock this content:/.test(await text(p, "newpost-lock-panel")));
  check("Individual Purchase on by default, others off", (await checked(p, "newpost-lock-opt-purchase")) && !(await checked(p, "newpost-lock-opt-points")) && !(await checked(p, "newpost-lock-opt-nft")));
  check("price field shown", await has(p, "newpost-lock-price"));
  await click(p, "newpost-lock-opt-points");
  await click(p, "newpost-lock-opt-nft");
  const lt = await text(p, "newpost-lock-panel");
  check("multi-select: all three fields", (await has(p, "newpost-lock-price")) && (await has(p, "newpost-lock-points")) && (await has(p, "newpost-lock-nft-input")));
  check("Loyalty copy + Points suffix", /Allow users to unlock this content with loyalty points/.test(lt) && /\bPoints\b/.test(lt));
  check("NFT label says Contract (not Contact)", /Add NFT Contract Address/.test(lt) && !/Contact Address/.test(lt) && (await p.$eval(T("newpost-lock-nft-input"), (e) => e.placeholder)) === "Paste the NFT Contract ID here");
  check("CANCEL and SAVE", /cancel/i.test(await text(p, "newpost-lock-cancel")) && /save/i.test(await text(p, "newpost-lock-apply")));
  await click(p, "newpost-lock-apply");
  check("SAVE validates empty fields", /price above \$0/.test(await text(p, "newpost-lock-panel")) && /whole number of points/.test(await text(p, "newpost-lock-panel")) && /at least one NFT contract/.test(await text(p, "newpost-lock-panel")));
  await typeInto(p, "newpost-lock-nft-input", "0x123");
  await click(p, "newpost-lock-nft-add");
  check("bad contract refused", /0x followed by 40 characters/.test(await text(p, "newpost-lock-panel")) && !(await has(p, "newpost-lock-nft-list")));
  await p.$eval(T("newpost-lock-nft-input"), (e) => (e.value = ""));
  await p.$eval(T("newpost-lock-nft-input"), (e) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(e, ""); e.dispatchEvent(new Event("input", { bubbles: true })); });
  await typeInto(p, "newpost-lock-nft-input", "0x" + "ab".repeat(20));
  await click(p, "newpost-lock-nft-add");
  check("+ ADD adds the contract", /0xababab/.test(await text(p, "newpost-lock-nft-list")));
  await typeInto(p, "newpost-lock-price", "5");
  await typeInto(p, "newpost-lock-points", "100");
  await click(p, "newpost-lock-apply", 400);
  const lb = await text(p, "newpost-lock");
  check("SAVE applies: button shows the Lock", !(await has(p, "newpost-lock-panel")) && /Locked/.test(lb) && /\$5\.00/.test(lb) && /100 Points/.test(lb) && /NFT/.test(lb), lb);
  await click(p, "newpost-lock", 400);
  await click(p, "newpost-lock-opt-points");
  await click(p, "newpost-lock-cancel", 400);
  check("CANCEL discards changes", /100 Points/.test(await text(p, "newpost-lock")));

  /* ---- Collaborate ---- */
  await click(p, "newpost-collaborate", 400);
  const ct = await text(p, "newpost-collab-panel");
  check("Collaborate dialog: title, Tag Creator, Suggested", /Tag Collaborating Creators/.test(ct) && /Tag Creator:/.test(ct) && /Suggested/.test(ct) && /Rae Calder/.test(ct) && !/AJ White/.test(ct), ct);
  await typeInto(p, "newpost-collab-input", "kai");
  check("search filters suggestions", (await p.$$eval('[data-testid^="newpost-collab-"][role="checkbox"]', (x) => x.length)) === 1);
  await click(p, "newpost-collab-kaimorrow");
  await click(p, "newpost-collab-tag", 400);
  check("TAG tags the creator", /@kaimorrow/.test(await text(p, "newpost-collab-tagged")));

  /* ---- Poll ---- */
  await pickType(p, "poll");
  await click(p, "newpost-poll-add-option");
  check("Add Another Option adds a row even when empty", await has(p, "newpost-poll-option-3"));
  check("required messages shown for empty options", /Option 1 is required/.test(await p.evaluate(() => document.body.innerText)));
  await typeInto(p, "newpost-poll-question", "Which trick next?");
  await typeInto(p, "newpost-poll-option-1", "Backside 540");
  await typeInto(p, "newpost-poll-option-2", "Switch 360");
  check("publish enabled with 2 options (empty 3rd ignored)", !(await p.$eval(T("newpost-publish"), (e) => e.disabled)));
  await click(p, "newpost-poll-date", 300);
  check("date popover opens", await has(p, "newpost-poll-calendar"));
  const y = new Date(Date.now() - 86400000), tm = new Date(Date.now() + 2 * 86400000);
  const ds = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const pastDisabled = await p.$eval(T(`newpost-poll-day-${ds(y)}`), (e) => e.disabled).catch(() => true);
  check("past dates disabled", pastDisabled);
  if (!(await has(p, `newpost-poll-day-${ds(tm)}`))) await p.click('[aria-label="Next month"]');
  await click(p, `newpost-poll-day-${ds(tm)}`);
  check("date picked", !(await has(p, "newpost-poll-calendar")) && !/Select Date/.test(await text(p, "newpost-poll-date")));
  await click(p, "newpost-poll-time", 300);
  check("clock dialog opens", await has(p, "newpost-poll-clock"));
  await click(p, "newpost-poll-clock-h-3");
  await click(p, "newpost-poll-clock-m-30");
  await click(p, "newpost-poll-pm");
  await click(p, "newpost-poll-clock-ok");
  check("time picked 3:30 PM", /3:30\s?PM/.test(await text(p, "newpost-poll-time")), await text(p, "newpost-poll-time"));
  // Lock a poll with loyalty points only and publish it: the post records the Lock.
  await click(p, "newpost-lock", 400);
  await click(p, "newpost-lock-opt-purchase");
  await click(p, "newpost-lock-opt-points");
  await typeInto(p, "newpost-lock-points", "40");
  await click(p, "newpost-lock-apply", 400);
  await click(p, "newpost-publish", 400);
  await click(p, "modal-newpost-confirm-confirm", 900);
  const d = await p.evaluate(() => JSON.parse(localStorage.getItem("topfan-mock-v1")));
  const post = d.social.posts.find((x) => x.text === "Which trick next?");
  check("published poll keeps Lock (points only, no price)", post?.locked && post.price == null && post.extra?.lock?.points === 40 && post.extra.poll.options.length === 2 && /T15:30/.test(post.extra.poll.endsAt), JSON.stringify(post?.extra));

  /* ---- Fundraiser ---- */
  await go(p, "/dashboard/newpost");
  await pickType(p, "fundraiser");
  check("one level row, no delete icon", (await has(p, "newpost-fund-row-1")) && !(await has(p, "newpost-fund-delete-1")));
  await click(p, "newpost-fund-add-level");
  check("Add Level adds a row; every row gets a delete icon", (await has(p, "newpost-fund-row-2")) && (await has(p, "newpost-fund-delete-1")) && (await has(p, "newpost-fund-delete-2")));
  await click(p, "newpost-fund-delete-2");
  check("delete removes the row", !(await has(p, "newpost-fund-row-2")) && !(await has(p, "newpost-fund-delete-1")));
  const giftPick = async (row, label) => {
    await p.$eval(`${T(row)} button`, (e) => (e.scrollIntoView({ block: "center" }), e.click()));
    await sleep(200);
    await p.evaluate((l) => [...document.querySelectorAll('[role="option"]')].find((o) => o.innerText.trim() === l).click(), label);
    await sleep(400);
  };
  await giftPick("newpost-fund-gift", "Store Item");
  check("Store Item opens Select Store Item", /Select Store Item/.test(await text(p, "newpost-gift-store")));
  await p.$eval('[data-testid="newpost-gift-store-list"] [role="checkbox"]', (e) => e.click());
  await sleep(150);
  await click(p, "newpost-gift-store-confirm", 400);
  const gift1 = await text(p, "newpost-fund-gift");
  check("ADD GIFT sets the gift", gift1.trim().length > 2 && !/Store Item/.test(gift1), gift1);
  await giftPick("newpost-fund-gift", "Store Item");
  await click(p, "newpost-gift-store-close", 400);
  check("dismissing the dialog keeps the gift", (await text(p, "newpost-fund-gift")) === gift1, await text(p, "newpost-fund-gift"));
  await click(p, "newpost-fund-add-level");
  await giftPick("newpost-fund-gift-2", "Custom Gift");
  const cg = await text(p, "newpost-gift-custom");
  check("Custom Gift dialog fields", /Enter Custom Gift Name\*/.test(cg) && /Enter Gift Description\*/.test(cg) && /1000 Characters left/.test(cg) && /Upload Gift Image/.test(cg));
  await typeInto(p, "newpost-gift-name", "Signed sticker");
  await typeInto(p, "newpost-gift-note", "I mail you a signed sticker.");
  await click(p, "newpost-gift-create", 400);
  check("CREATE GIFT sets the row's gift", /Signed sticker/.test(await text(p, "newpost-fund-gift-2")));

  /* ---- Article toolbar, AI dialog, Insert pickers ---- */
  await pickType(p, "article");
  const tools = await p.$$eval('[data-testid^="newpost-editor-"]', (x) => x.map((e) => e.getAttribute("aria-label") || e.innerText.trim()));
  check("toolbar order", tools.slice(0, 15).join("|") === "Emoji|Bold|Italic|Underline|Text size|Ordered list|Bullet list|Link|Code|Image|Video|Audio|Horizontal rule|AI generated content|Insert", tools.join("|"));
  const html = () => p.$eval(T("newpost-article-body"), (e) => e.innerHTML);
  await p.click(T("newpost-article-body"));
  await p.keyboard.type("Hello world");
  const selAll = () => p.evaluate(() => { const e = document.querySelector('[data-testid="newpost-article-body"]'); const r = document.createRange(); r.selectNodeContents(e); const s = getSelection(); s.removeAllRanges(); s.addRange(r); e.dispatchEvent(new MouseEvent("mouseup", { bubbles: true })); });
  for (const [tool, re] of [["bold", /<b>|font-weight/], ["italic", /<i>|italic/], ["underline", /<u>|underline/]]) {
    await selAll();
    await click(p, `newpost-editor-${tool}`);
    check(`toolbar ${tool} formats the text`, re.test(await html()), await html());
  }
  await selAll();
  await click(p, "newpost-editor-text-size");
  check("Text size makes a heading", /<h3/.test(await html()), await html());
  await click(p, "newpost-editor-ordered-list");
  check("Numbered list", /<ol/.test(await html()));
  await click(p, "newpost-editor-horizontal-rule");
  check("Divider inserts a rule", /<hr/.test(await html()));
  await click(p, "newpost-editor-emoji", 300);
  check("Emoji opens a category-tabbed panel", (await has(p, "newpost-emoji-panel")) && (await p.$$eval('[data-testid^="newpost-emoji-tab-"]', (x) => x.length)) === 8);
  await click(p, "newpost-emoji-tab-1");
  await p.$eval(T("newpost-emoji"), (e) => e.click());
  await sleep(200);
  check("emoji inserted", /🐶/.test(await html()), await html());
  await p.keyboard.press("Escape");
  await click(p, "newpost-editor-link", 300);
  await typeInto(p, "newpost-editor-link-url", "example.org/tips");
  await click(p, "newpost-editor-link-add");
  check("Link inserts an anchor", /href="https:\/\/example\.org\/tips"/.test(await html()), await html());
  const before = await html();
  await click(p, "newpost-editor-undo");
  check("UNDO reverts", (await html()) !== before);
  await click(p, "newpost-editor-ai-image", 400);
  const ai = await text(p, "newpost-ai-dialog");
  check("AI dialog copy", /Insert AI Generated Content/.test(ai) && /Content Type/.test(ai) && /Full Article Text/.test(ai) && /Explain what content you would like generated:\*/.test(ai) && /5000 Characters left/.test(ai) && /Generate an Article Title/.test(ai) && /Generate a Cover Image/.test(ai));
  await p.$eval('[data-testid="newpost-ai-type"] button', (e) => e.click());
  await sleep(200);
  const types = await p.$$eval('[data-testid="newpost-ai-type"] [role="option"]', (x) => x.map((e) => e.innerText.trim()));
  check("Content Type options", types.join("|") === "Full Article Text|Full Article Text with Images|Specific Text Snippet|Single Image", types.join("|"));
  await p.evaluate(() => [...document.querySelectorAll('[data-testid="newpost-ai-type"] [role="option"]')][2].click());
  await typeInto(p, "newpost-ai-prompt", "abc");
  check("5000 counter counts down", /4997 Characters left/.test(await text(p, "newpost-ai-count")));
  await click(p, "newpost-ai-title");
  check("checkbox toggles", await checked(p, "newpost-ai-title"));
  await click(p, "newpost-ai-generate", 1200);
  check("GENERATE (snippet) inserts text from the creator's notes, dialog closes", !(await has(p, "newpost-ai-dialog")) && /switch backside 540/.test(await html()) && /\[Add the part about: abc\]/.test(await html()), await html());
  check("GENERATE says how it was made (no model connected here)", /No AI model is connected to this prototype, so I prepared it from your notes/.test(await text(p, "newpost-ai-note")) && /title was filled in/.test(await text(p, "newpost-ai-note")), await text(p, "newpost-ai-note"));
  check("Generate an Article Title fills the title", (await p.$eval(T("newpost-article-title"), (e) => e.value)).length > 0);
  // Full article with images + cover image.
  await click(p, "newpost-editor-ai-image", 400);
  await p.$eval('[data-testid="newpost-ai-type"] button', (e) => e.click());
  await sleep(200);
  await p.evaluate(() => [...document.querySelectorAll('[data-testid="newpost-ai-type"] [role="option"]')][1].click());
  await typeInto(p, "newpost-ai-prompt", "Write about my off-season training routine");
  await click(p, "newpost-ai-cover");
  await click(p, "newpost-ai-generate", 1200);
  const h = await html();
  check("GENERATE (with images) inserts subheadings, paragraphs and an AI-generated image", /<h3>/.test(h) && /<img [^>]*src="\/assets\/generated\//.test(h) && /AI-generated visual/.test(h), h.slice(0, 400));
  check("GENERATE cover image sets the Feed Preview Image", /cover image is set as the Feed Preview Image/.test(await p.evaluate(() => document.body.innerText)), "");
  check("generated content is a draft only (nothing published)", !(await p.evaluate(() => JSON.parse(localStorage.getItem("topfan-mock-v1") || "{}")?.social?.posts?.some((x) => /off-season training routine/i.test(x.text ?? "")))));
  await click(p, "newpost-editor-embed", 300);
  const menu = await text(p, "newpost-editor-insert-menu");
  check("Insert menu items", /Insert Store Items/.test(menu) && /Insert Portfolio Items/.test(menu) && /Insert Feed Content/.test(menu) && /Insert Event Tickets/.test(menu));
  const PICK = { store: ["Select Store Item", null], portfolio: ["Select Portfolio Item", null], feed: ["Select Post to Feature", null], event: ["Select Event to Feature", "No Events Found"] };
  for (const [k, [title, emptyMsg]] of Object.entries(PICK)) {
    if (!(await has(p, "newpost-editor-insert-menu"))) await click(p, "newpost-editor-embed", 300);
    await click(p, `newpost-insert-${k}`, 400);
    const t = await text(p, `newpost-pick-${k}`);
    check(`Insert ${k}: "${title}" with search + FEATURE`, t.includes(title) && (await has(p, `newpost-pick-${k}-search`)) && /feature/i.test(await text(p, `newpost-pick-${k}-confirm`)), t);
    if (k === "feed") check("Feed picker has the ALL pill", /\bALL\b/i.test(t));
    if (emptyMsg) check(`${k}: documented empty message`, t.includes(emptyMsg), t);
    else check(`${k}: lists real mock data`, (await p.$$eval(`[data-testid="newpost-pick-${k}-list"] li`, (x) => x.length)) > 0);
    if (k === "store") {
      await p.$eval('[data-testid="newpost-pick-store-list"] [role="checkbox"]', (e) => e.click());
      await click(p, "newpost-pick-store-confirm", 400);
      check("FEATURE inserts a link to the store item", /href="\/ajwhite\/store\/[^"]+"/.test(await html()), await html());
    } else await click(p, `newpost-pick-${k}-close`, 300);
  }
  check("no page errors (New Post)", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

/* ===== 2. Demo 2: the four Lock access models ===== */
{
  const KEY = "topfan-mock-v1:ai-content";
  const p = await page("ai-content");
  const replies = (p) => p.$$eval('[data-msg="assistant"]', (x) => x.map((m) => m.innerText));
  const openPanel = async () => { if (!(await p.$('[data-testid="ai-panel"]'))) { await p.click('[data-testid="ai-launcher"]'); await sleep(700); } };
  await openPanel();
  await p.evaluate(() => document.querySelector('[data-testid="ap-close"]')?.click());
  const ask = async (q, wait = 800) => {
    await openPanel();
    const n = (await replies(p)).length;
    await p.$eval('[data-testid="ai-input"]', (x) => (x.focus(), x.select?.()));
    await p.keyboard.press("Backspace");
    await p.type('[data-testid="ai-input"]', q);
    await p.keyboard.press("Enter");
    await sleep(wait);
    return (await replies(p)).slice(n).join("\n");
  };
  const tap = async (re, wait = 1400) => { await p.evaluate((src) => [...document.querySelectorAll('[data-testid="ai-panel"] button')].reverse().find((b) => new RegExp(src, "i").test(b.innerText.trim()))?.click(), re.source); await sleep(wait); };
  const db = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), KEY);
  const lastPost = async () => (await db()).content.items.filter((x) => x.kind === "post").at(-1);
  const card = () => p.$$eval('[data-testid="content-card-audience"]', (x) => x.at(-1)?.innerText ?? "");
  const published0 = (await db()).social.posts.filter((x) => x.status === "published").length;

  await ask("Create a training update post", 1000);
  let r = await ask("Lock this post");
  let x = await lastPost();
  check("D2 'Lock this post' → Individual Purchase, asks the price", /Individual Purchase/.test(r) && /What unlock price/i.test(r) && x.post.locked && x.post.lockBy.join() === "purchase" && x.post.price == null, r);
  check("D2 card shows the restriction", /Individual Purchase, pay to unlock \(price not set\)/.test(await card()), await card());
  r = await ask("Make this paid content");
  x = await lastPost();
  check("D2 'Make this paid content' → Individual Purchase", /Individual Purchase/.test(r) && /What unlock price/i.test(r) && x.post.lockBy.join() === "purchase", r);
  r = await ask("9");
  x = await lastPost();
  check("D2 price 9 set on the draft only", x.post.price === 9 && /nothing is published/i.test(r) && /\$9/.test(await card()), r);

  r = await ask("Let fans unlock this using loyalty points");
  x = await lastPost();
  check("D2 'loyalty points' → Loyalty Points, asks how many", /Loyalty Points/.test(r) && /How many points/i.test(r) && x.post.lockBy.join() === "points" && x.post.points == null && x.post.price == null, r);
  check("D2 points wording distinct from paid", !/pay to unlock/i.test(r.split("\n")[0]) && /no payment/i.test(r), r);
  r = await ask("250");
  x = await lastPost();
  check("D2 250 points set", x.post.points === 250 && /250 points/.test(await card()) && !/applied$/.test(r), await card());
  check("D2 never claims it's applied before saving", /only applies once you save or publish/i.test(r), r);
  await tap(/^open in new post$/);
  check("D2 opens New Post with ?work=", new URL(p.url()).pathname === "/dashboard/newpost" && new URL(p.url()).searchParams.get("work") === x.id);
  check("D2 Lock button shows 250 Points", /250 Points/.test(await text(p, "newpost-lock")), await text(p, "newpost-lock"));
  await click(p, "newpost-lock", 400);
  check("D2 Lock dialog prefilled: Loyalty Points 250", (await checked(p, "newpost-lock-opt-points")) && !(await checked(p, "newpost-lock-opt-purchase")) && (await p.$eval(T("newpost-lock-points"), (e) => e.value)) === "250");
  await click(p, "newpost-lock-cancel", 300);

  r = await ask("Make this available to eligible NFT holders");
  x = await lastPost();
  check("D2 NFT → asks for a contract, invents none", /Lock with NFT/.test(r) && /Paste the NFT contract address/i.test(r) && x.post.lockBy.join() === "nft" && x.post.contract == null && !/0x[0-9a-f]{40}/i.test(r), JSON.stringify(x.post) + r);
  r = await ask("0x1234");
  check("D2 malformed contract refused", /doesn't look like an NFT contract address/.test(r) && (await lastPost()).post.contract == null, r);
  const addr = "0x" + "a1b2c3d4e5".repeat(4);
  r = await ask(addr);
  x = await lastPost();
  check("D2 contract set (format check only)", x.post.contract === addr && /only checked the format/i.test(r) && /NFT holders only \(contract 0xa1b2…c3d4e5|NFT holders only \(contract 0xa1b2/.test(await card()), await card());
  await tap(/^open in new post$/);
  await click(p, "newpost-lock", 400);
  check("D2 Lock dialog prefilled: NFT contract", (await checked(p, "newpost-lock-opt-nft")) && /0xa1b2c3/.test(await text(p, "newpost-lock-nft-list")));
  await click(p, "newpost-lock-cancel", 300);

  r = await ask("Make this exclusive to Gold subscribers");
  x = await lastPost();
  check("D2 Gold: honest, Lock can't target a plan", /Gold Plan/.test(r) && /can't limit a post to one membership/i.test(r) && /Lock it with an unlock price/i.test(r) && /Gold-only newsletter/i.test(r), r);
  check("D2 Gold request changes nothing on the post", x.post.lockBy.join() === "nft" && x.post.contract === addr);
  check("D2 nothing published by the assistant", (await db()).social.posts.filter((y) => y.status === "published").length === published0 && x.status !== "published");
  check("no page errors (Demo 2)", !p.errors.length, p.errors.join("\n"));
  await p.browserContext().close();
}

await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
