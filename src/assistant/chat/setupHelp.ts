/**
 * Account setup answers without the language model (demo mode, or when the model can't be reached).
 * Every fact comes from server/knowledge.ts (TopFan's setup copy and the prototype's own behavior);
 * nothing here is generated. Unknown questions get the current step's next action, never "I can't".
 */
import { normalizeText } from "../../app/agent-context/intent";
import { siteAddress, type PlatformState } from "../../state/platformStore";

export interface SetupAnswer {
  text: string;
  /** A field or button to point at (data-field / data-testid), if it's on screen. */
  highlight?: string;
}

const T = (text: string, highlight?: string): SetupAnswer => ({ text, highlight });

/** Follow-up questions offered under each answer. */
export const SETUP_STARTERS = ["What's a CNAME record?", "Will my email still work?", "How long does it take?", "What do I do on this step?"];

const TOPICS: { words: string[]; answer: (s: PlatformState) => SetupAnswer }[] = [
  {
    words: ["password", "login", "log in", "sign in", "credentials", "account details"],
    answer: () => T("I'll never ask for your registrar password or login. When records need adding, you sign in at your provider yourself; TopFan only adds the 2 records and can't see your password."),
  },
  {
    words: ["email", "mail", "inbox", "gmail", "outlook"],
    answer: (s) =>
      T(
        `A sub-domain like ${s.subdomain || "fans"}.${s.domainName || "yourdomain.com"} leaves your main domain and its email untouched: adding records for a sub-domain doesn't affect your main website or email. That's why I recommend it when your domain already handles email.`,
        "urlPreference",
      ),
  },
  {
    words: ["ssl", "https", "secure", "certificate", "padlock", "acm"],
    answer: () => T("The second CNAME record (its host starts with an underscore) validates your SSL certificate, so your site loads securely over https."),
  },
  {
    words: ["cname", "dns", "record", "records", "host", "value", "cloudfront"],
    answer: (s) =>
      T(
        "DNS records tell the internet where your site lives. Step 2 shows 2 CNAME records: the first points your site address to TopFan, the second validates your SSL certificate. Copy each Host and Value into your provider's DNS settings, then click Verify & Continue.",
        s.screen === "step2" ? "record1-host" : undefined,
      ),
  },
  {
    words: ["how long", "long does", "wait", "waiting", "propagat", "minutes", "hours", "time", "slow", "taking"],
    answer: (s) =>
      T(
        s.screen === "provisioning"
          ? "Provisioning can take up to 10 minutes. The countdown is an estimate; your site is ready only when TopFan reports it. You can safely leave this page."
          : "DNS changes can take time to spread (TopFan says up to 48 hours, often much faster). After verification, provisioning takes up to 10 minutes.",
      ),
  },
  {
    words: ["fail", "failed", "error", "not working", "not found", "doesn't work", "didnt work", "didn't work", "verify", "verification", "wrong"],
    answer: (s) =>
      T(
        "Common reasons a check fails: the records aren't saved yet, a typo in a Host or Value, the domain typed twice in the Host (like fans.example.com.example.com), Cloudflare's proxy turned on (it should be DNS only, the gray cloud), or the change is still spreading. Fix it at your provider, then click Verify & Continue again.",
        s.screen === "step2" ? "verify" : undefined,
      ),
  },
  {
    words: ["cloudflare"],
    answer: () => T("At Cloudflare, add the 2 CNAME records like at any provider, and set Proxy status to DNS only (the gray cloud) so SSL works."),
  },
  {
    words: ["namecheap"],
    answer: () => T("At Namecheap: Domain List › Manage next to your domain › Advanced DNS › Add New Record › CNAME Record. Enter the Host and Value for each record, then save."),
  },
  {
    words: ["godaddy", "go daddy"],
    answer: (s) =>
      T(
        `At GoDaddy, open your domain's DNS settings and add the 2 CNAME records from Step 2. ${s.screen === "step2" ? "The video card above shows each click (it uses example values)." : "In Step 2 I'll show a short video of it."}`,
      ),
  },
  {
    words: ["provider", "registrar", "where did i buy", "dns provider"],
    answer: () => T("Your DNS provider is where your domain's records are managed, usually the company you bought it from (like GoDaddy or Namecheap). Pick it in Domain / DNS Provider.", "provider"),
  },
  {
    words: ["buy", "purchase", "price", "cost", "don't have a domain", "dont have a domain", "no domain", "get a domain", "new domain"],
    answer: () =>
      T(
        "TopFan doesn't sell domain names. I can help you find a name and buy it at GoDaddy; the purchase and payment happen on GoDaddy's own site. Then come back and enter it in Domain Name.",
        "buy-domain",
      ),
  },
  {
    words: ["subdomain", "sub domain", "sub-domain", "root", "www", "address", "url", "look to fans"],
    answer: (s) =>
      T(
        `You can use your root domain (${s.domainName || "yourdomain.com"} and www) or a sub-domain like ${s.subdomain || "fans"}.${s.domainName || "yourdomain.com"}. A sub-domain is the safer choice when your domain already hosts another website or email, because the main domain stays untouched.`,
        "urlPreference",
      ),
  },
  {
    words: ["logo", "color", "colors", "colour", "brand", "branding", "theme", "design", "appearance"],
    answer: () => T("Colors and logo come after your site is live, in Preferences › White Label Site › Customize Appearance."),
  },
  {
    words: ["change later", "change my domain", "different domain", "delete", "remove domain", "switch domain"],
    answer: () =>
      T("To change the domain later: View domain details, then delete at the bottom. Your content and cover pages stay, but the domain setup and color and logo preferences need to be done again. Deletion can take up to 15 minutes."),
  },
  {
    words: ["quest", "game", "mascot", "play"],
    answer: () => T("Creator Quest is an optional set of mini-games on the provisioning page. It teaches ideas only; its numbers are fictional and it never changes provisioning."),
  },
  {
    words: ["provisioning", "provisioned", "what's happening", "what is happening", "progress"],
    answer: () => T("Provisioning is TopFan setting up your site on your domain: domain submitted, DNS records configured, site provisioning, then site activated. It can take up to 10 minutes."),
  },
];

/** What to do on the current step (the answer to "help", "what now" and anything unrecognized). */
export function stepHelp(s: PlatformState): SetupAnswer {
  switch (s.screen) {
    case "step1":
      if (!s.provider) return T("On this step, tell TopFan which domain to use. Start with Domain / DNS Provider: where your domain's records are managed.", "provider");
      if (!s.domainName) return T("Next, type your domain in Domain Name, like yourname.com (no http:// or www).", "domain");
      return T("Choose how your address should look to fans, then click Save & Continue.", "save");
    case "step2":
      return T(`Add the 2 records shown here at ${s.provider || "your provider"}, then click Verify & Continue. I can prepare it for you or walk you through it.`, "record1-host");
    case "provisioning":
      return T(
        s.provisionDone
          ? "Your site is ready. You can go to it now."
          : "TopFan is setting up your site. It can take up to 10 minutes, and you can leave this page. Want to play Creator Quest meanwhile?",
      );
    default:
      return T(`Your site is ready${s.domainName ? ` at ${siteAddress(s)}` : ""}. Next, personalize your logo and colors in White Label Site preferences.`);
  }
}

export function setupAnswer(text: string, s: PlatformState): SetupAnswer {
  const t = normalizeText(text);
  const hit = TOPICS.find((x) => x.words.some((w) => t.includes(` ${w}`)));
  return hit ? hit.answer(s) : stepHelp(s);
}
