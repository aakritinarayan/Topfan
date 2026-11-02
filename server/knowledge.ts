/**
 * What the assistant may say about TopFan. Distilled ONLY from References/topfan-reference
 * (REFERENCE.md, pages/50-pref-white-label-site.md, the dashboard page specs) and the prototype's
 * own behavior. If something is not written here, the assistant must say it doesn't know.
 * Keep it factual; update it when the references change.
 */
export const TOPFAN_KNOWLEDGE = `
# TopFan White Label Site setup (the flow this prototype covers)
In TopFan's own wizard, appearance (Customize Appearance) is the third step; in this prototype colors and logo are set after the site is live.

TopFan lets a creator load their TopFan site on their own custom domain (a "White Label Site").
TopFan does not sell domain names. It recommends Namecheap, "which is fully compatible with our tool and offers quick, reliable domain setup". Any registrar works.
The creator should purchase the domain before setting up the White Label Site.

## "Step 1 of 3" · Domain Information
- Question: "I already have a Domain Name" or "I don't have a Domain Name".
- With a domain:
  - "Domain / DNS Provider" (required; 33 options incl. GoDaddy, Namecheap, Cloudflare, Squarespace, Wix, Porkbun, IONOS, Hostinger, Name.com, Bluehost, Other). The DNS provider is where the domain's DNS records are managed, usually the registrar it was bought from.
  - "Domain Name": the root domain without http:// or https://, e.g. example.com. Errors: "Domain name is required", "Please enter a valid root domain name (e.g., example.com)".
  - "White Label Site URL Preference": "How would you like your White Label website address to look to fans?"
    - root domain: {domain} & www.{domain}
    - sub-domain: sub-domain.{domain} (then "Sub-domain Name" is required, e.g. fans).
  - Choosing a sub-domain is the safer choice when the domain already hosts another website or email setup, because the main domain stays untouched.
- Without a domain: "No domain? No problem. To continue, you'll need an active domain." Steps: open Namecheap's domain page, search for a name, choose an available domain and check out, complete payment on Namecheap, return and enter the new domain. Button: PURCHASE DOMAIN ON NAMECHEAP (opens in a new tab).
- Buttons: BACK / SAVE & CONTINUE. "Note: This can take up to 60 seconds."

## "Step 2 of 3" · Add DNS Records
- "Add these records to your DNS with your provider. Once they are added, click on VERIFY."
- Two CNAME records, each a Host and a Value with a Copy button:
  1. the site record: host = the sub-domain (or www), value = a CloudFront address (…cloudfront.net)
  2. the SSL certificate validation record: host starts with an underscore, value ends in acm-validations.aws
- When GoDaddy is the provider, the assistant panel offers a 42-second video walkthrough of adding the two CNAME records at GoDaddy (it uses example values; the creator copies their own Host and Value from Step 2).
- Provider instructions:
  - Namecheap: log in › Domain List › "Manage" next to the domain › "Advanced DNS" tab › "Add New Record" › CNAME Record › enter Host and Value for each record › save.
  - GoDaddy: Step 1 "Connect domain to hosting or website", Step 2 "After connecting Setup".
  - Cloudflare: same as Namecheap-style steps, plus set Proxy status to "DNS only" (gray cloud) for SSL to work properly.
  - Other providers: open the DNS settings, add the CNAME records; contact the provider's support if needed.
  - Root domain on some providers needs domain forwarding (Permanent 301 to www) or an ANAME/ALIAS ("Flattened CNAME") record.
  - Sub-domain: the Host is the sub-domain name (e.g. "shop" for shop.example.com). Many providers add the domain automatically, so only the part before the domain is entered.
- DNS changes can take time to propagate (TopFan's copy says up to 48 hours; often much faster).
- Buttons: BACK / VERIFY & CONTINUE. Errors: "Verification failed. Please check your DNS records and try again." / "DNS records not found".
- Common causes of a failed check: records not saved yet, typo in host/value, the domain typed twice in the host (e.g. fans.example.com.example.com), Cloudflare proxy on (orange cloud), changes still propagating.

## Provisioning (after DNS verification)
- "Your White Label Site is Being Provisioned". "Provisioning can take up to 10 minutes to complete globally."
- Countdown, and 4 milestones: Domain submitted successfully → DNS CNAME records configured → White Label Site Provisioning → Site Activated.
- "You don't need to stay on this page - You can safely navigate away and explore other features."
- TopFan suggests reviewing its Onboarding Guide (PDF) while waiting.
- The countdown is an estimate, not a guarantee. The site is only ready when TopFan reports completion.

## Creator Quest (this prototype, provisioning page)
- Optional mini-games while the site provisions, starring the same red jelly mascot: Fan Revenue Rush (monetization), Superfan Signal (community engagement), Build Your Fan HQ (brand ownership), Fan Insight Explorer (audience insights).
- They teach ideas only. Fan requests, percentages and scores in the games are fictional game data, never real analytics or earnings.
- Playing never speeds up, pauses or changes provisioning. When the site is ready during a game, a notice offers "Go to my site".
- "Explore this after launch" only saves an interest; nothing is turned on, created or published.
- When asked about the current mission, use <app_state>.creatorQuest (objective, stage, recent events). Give a short hint if the creator seems stuck.

## Complete
- The provisioning screen resolves in place: pill "WHITE LABEL SITE ACTIVATED", heading "Your website is ready!", "Your TopFan website has been configured successfully.", the orbit shows a check, and "YOUR WEBSITE ADDRESS" shows the site URL with a Copy URL button. Primary button GO TO MY SITE; secondary "View domain details". "Next, personalize your logo and colors in White Label Site preferences" (Preferences > White Label Site). Tracker: "Step 4 of 4 · All steps completed".
- "Need to change your domain later?" (expandable): open View domain details and use delete at the bottom. Deleting domain settings keeps content and cover pages, but the domain name and white label site color and logo preferences must be set up again.
- Colors and logo are set afterwards in Preferences › White Label Site.
- To change the site's domain later: View Domain Details › delete at the bottom. Content and cover pages stay, but domain setup and color/logo preferences must be done again. Deletion can take up to 15 minutes.

## After setup: Preferences › White Label Site (Manage mode)
- ACTIVE badge, View DNS Records (Domain Details modal with the CNAME records and provider steps), White Label Site URL with COPY.
- Cover Page card: DISABLE / ENABLE, EDIT COVER PAGE (a page builder with SEO fields, sections and sub-pages; UPDATE & PUBLISH). Visitors see the Cover Page before the Feed Page.
- Customize Appearance: color palette or theme, six colors (Page Background, Background Text, Post Background, Post Text, Logo & Button, Button Text), Site Logo (Generate Text Logo with a Logo Font, or Upload Logo Image: transparent PNG 32px high, 32–335px wide), "Feed Page SEO Settings & GTM Tag" (optional Google Tag Manager ID, SEO title, keywords, description up to 160 characters), mobile/desktop preview, UPDATE & PUBLISH. Changes take about 1 minute to appear.

## Creator dashboard (navigation only; do not describe features beyond this)
- Left menu: Home, Feed, Activity, Messages, Monetize, Wallet, Insights & Fans, Resources. Buttons: NEW POST, LIVESTREAM.
- Monetize sub-tabs: Subscriptions, Newsletters, Experiences, Courses, Downloadables, Merchandise, NFTs, Events & Ticketing, VIP Offers, Portfolios, Discount Codes, Advertisements.
- Wallet (balances and purchases), Insights & Fans (earning metrics and fans), Resources (Announcements, Guides, Service Providers, Creator Support).
- Preferences (avatar menu) tabs: Profile, Welcome Message, Interests, Creator Type, Customer Support, Notifications & Newsletters, NFT Wallet, Monetization, Privacy, Password & Integrations, White Label Site, Outbound Emails, Link In Bio, Delegation, Topic Tags, Groups, Gamification.
- Help Center & FAQ (avatar menu) covers refunds, pausing/deleting accounts, reporting, subscriptions and payment info.

## General domain facts you may explain
- Domain = the web address (ajwhite.com). Registrar = where it was bought. DNS provider = where its records are managed (usually the registrar, sometimes Cloudflare or a host).
- CNAME = a record that points a name (like fans.ajwhite.com) to another address. Adding records for a sub-domain does not affect the main website or email.
- A domain's purchase and payment always happen on the registrar's own website, never in this chat.
`.trim();
