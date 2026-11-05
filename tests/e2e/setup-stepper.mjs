// Account Setup stepper in the assistant: numbered, connected stages driven by the real setup state.
// Every step, provisioning finishing in place, all complete, refresh, close (X) and reopen, and leaving and coming back.
import { freshPage, journey, launch, sleep, BASE } from "./lib/journey.mjs";
const b = await launch();
const p = await freshPage(b, "setup-navigation");
const j = journey(p);
const SP = process.env.SHOTS;
const go = async (path) => { await p.goto(`${BASE}${path}?noDelay=1`, { waitUntil: "networkidle0" }); await sleep(1200); };
const read = () =>
  p.evaluate(() => {
    const root = document.querySelector('[data-testid="setup-stepper"]');
    if (!root) return null;
    const lis = [...root.querySelectorAll("li[data-step-status]")];
    return {
      progress: root.querySelector('[data-testid="setup-progress"]')?.innerText.trim(),
      st: lis.map((l) => l.dataset.stepStatus).join(","),
      current: lis.findIndex((l) => l.getAttribute("aria-current") === "step"),
      owners: lis.map((l) => l.querySelectorAll("span.block")[1]?.innerText.trim()),
      // connector i must start at dot i's bottom edge and end at dot i+1's top edge, centred on both
      joins: lis.slice(0, -1).map((l, i) => {
        const line = l.querySelector("span.absolute").getBoundingClientRect();
        const a = l.querySelector("span.rounded-full").getBoundingClientRect();
        const c = lis[i + 1].querySelector("span.rounded-full").getBoundingClientRect();
        return Math.abs(line.top - a.bottom) < 1.5 && Math.abs(line.bottom - c.top) < 1.5 && Math.abs(line.left + line.width / 2 - (a.left + a.width / 2)) < 1;
      }),
    };
  });
const shot = async (n) => SP && (await (await p.$('[data-testid="setup-stepper"]'))?.screenshot({ path: `${SP}/stepper-${n}.png` }));
const expect = async (label, progress, st, cur) => {
  const r = await read();
  j.check(`${label}: ${progress}`, r && r.progress === progress && r.st === st && r.current === cur && r.joins.every(Boolean), JSON.stringify(r));
  return r;
};

await go("/edit-preference/whitelabel/setup/domain");
await j.openPanel();
let r = await expect("step 1 (domain)", "Step 1 of 4", "now,next,next,next", 0);
j.check("owners are quiet labels, not badges", JSON.stringify(r.owners) === JSON.stringify(["Your action", "Your action", "Handled by TopFan", "Handled by TopFan"]), JSON.stringify(r.owners));
await sleep(800);
await shot(1);
await go("/edit-preference/whitelabel/setup/dns");
await expect("step 2 (DNS): verification not done yet", "Step 2 of 4", "done,now,next,next", 1);
await shot(2);
await p.reload({ waitUntil: "networkidle0" });
await sleep(1200);
await j.openPanel();
await expect("refresh keeps step 2", "Step 2 of 4", "done,now,next,next", 1);
await go("/edit-preference/whitelabel/setup/provisioning");
await expect("step 3 (provisioning): not complete while it runs", "Step 3 of 4", "done,done,now,next", 2);
await shot(3);
// the X closes it to one slim row (progress still shown); the row reopens it
await p.click('[data-testid="setup-stepper-hide"]');
await sleep(300);
j.check("X closes to a slim row", !(await p.$('[data-testid="setup-stepper"]')) && /Step 3 of 4/.test(await j.text('[data-testid="setup-stepper-show"]')));
await p.click('[data-testid="setup-stepper-show"]');
await sleep(300);
j.check("row reopens it", (await p.$$('[data-testid="setup-stepper"] li')).length === 4);
// leave and come back: state resumes where it was
await go("/edit-preference/whitelabel/setup/dns");
await go("/edit-preference/whitelabel/setup/provisioning");
await expect("resume at provisioning", "Step 3 of 4", "done,done,now,next", 2);
// provisioning finishes in place
await p.evaluate(() => [...document.querySelectorAll("button")].find((x) => /^Simulate: finish provisioning$/.test(x.innerText.trim()))?.click());
await sleep(4000);
await expect("all complete", "4 of 4 complete", "done,done,done,done", -1);
await shot(4);
await p.reload({ waitUntil: "networkidle0" });
await sleep(1200);
await j.openPanel();
if (await p.$('[data-testid="setup-stepper"]')) await expect("refresh keeps complete", "4 of 4 complete", "done,done,done,done", -1);
j.check("no page errors", !p.errors.length, p.errors.join("\n"));
await b.close();
console.log(j.fails ? `${j.fails} FAILED` : "ALL PASSED");
process.exit(j.fails ? 1 : 0);
