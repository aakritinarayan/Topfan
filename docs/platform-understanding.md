# TopFan platform understanding

This is the starting point for anyone working on TopFan AI in this prototype. It covers what the product is, how it's organized, how its sections connect, and where creators need help.

> This understanding comes from one creator account and desktop screens (the reference pack). It needs validating with support tickets, search logs, feature usage and creator interviews.

## 1. What TopFan is

A creator gets a white-label website for content, commerce, fan data and payments.

- **Ways to earn:** subscriptions, digital products, merchandise, events, offers, ads and referrals.
- **Teams:** creators can give team members delegated access.
- **Creators are also fans:** a logged-in creator can be a fan of other creators. That's why Wallet has *My Purchases*, and why Notifications and Privacy list other creators.

Two experiences share the same site:

- **Creator dashboard:** a sidebar shell for running the business.
- **Public fan pages:** Home (marketing layout), Feed, Store, Events, Videos and similar pages.

## 2. Navigation

**Header (every page):**
- Logo.
- Globe icon, which opens the language menu.
- Avatar menu: Edit Preferences, Terms & Privacy Policy, Help Center & FAQ, Sign Out.
- There's no notification bell.

**Sidebar:** NEW POST, LIVESTREAM, Home, Feed, Activity, Messages, Monetize, Wallet, Insights & Fans, Resources. Messages and Resources can show count badges.

**Layout exceptions:**

| Screen | Layout |
|---|---|
| Home `/` | Marketing layout with no sidebar |
| Feed | Three columns |
| Activity and Messages | Full-bleed |
| New Post | About 850px wide |
| Livestream | Modal over the current page |

**Preferences** is reached from the avatar menu and has 16 ungrouped chip tabs:

| Theme | Tabs |
|---|---|
| Identity | Profile, Welcome Message, Interests, Creator Type |
| Comms | Customer Support, Notifications & Newsletters |
| Money | NFT Wallet, Monetization |
| Account | Privacy, Password & Integrations |
| Site | White Label Site, Outbound Emails, Link In Bio |
| Team | Delegation |
| Audience | Topic Tags, Groups, Gamification |

These themes are analysis only. The UI shows the 16 tabs ungrouped.

The full route list is in [`docs/agent-context/routes.json`](agent-context/routes.json). Its source is `src/app/routes/*`.

## 3. Feature map

- **Publish:**
  - Post types: Video, Images, Article, Audio, Reel, Poll, Giveaways, Link, Fundraiser and Text.
  - Post options: Lock, Collaborate, Select Interests, Discovery Feed, require sign-in, and sensitive content.
  - Livestream: start now, or schedule as an Event.
- **Sell:**
  - Subscriptions, Newsletters, Experiences, Courses and Downloadables.
  - Merchandise (Shopify and external) and NFTs (external).
  - Events & Ticketing (Bandsintown and native tickets).
  - VIP Offers, Portfolios, Discount Codes and Advertisements.
- **Fans:**
  - Activity, and Messages (Priority, General, Message Lists), plus automated messages.
  - Chat Room, Fan Management, and Segmentation & Outreach.
  - Groups, Topic Tags and Gamification.
- **Money:**
  - Balance, withdrawal, payout account and saved cards.
  - Referrals, transactions, loyalty history and purchases.
  - Refunds and fulfillment.
  - Delegate revenue share has a percentage for each revenue stream.
- **Performance:** Earning Metrics, Engagement Metrics, the post table, and CSV buttons.
- **Help:** Announcements, Guides, Service Providers, FAQs, the support form, and the Help Center.

Each feature's name, everyday synonyms, location and prerequisites are in [`docs/agent-context/features.json`](agent-context/features.json).

## 4. How sections connect

These relationships are modeled in the single mock store (`src/store`):

- **Groups:**
  1. Create a group in Preferences.
  2. Assign fans to it in Insights & Fans.
  3. Restrict posts, products, offers, portfolios, chat or DMs to the group.
- **Topic Tags:**
  1. Create tags in Preferences. At least 2 must be active.
  2. Use them on posts.
  3. Fans filter the feed by tag. The Feed's gear icon links to Topic Tags.
- **Gamification:**
  1. Configure it in Preferences.
  2. A leaderboard shows on the public profile.
  3. Points appear in Wallet and in Earning Metrics.
- **Paid DMs and tips:**
  1. Set them in Preferences › Monetization.
  2. Fans use them in Messages and posts.
  3. Earnings appear in Wallet and Insights.
- **Newsletters:**
  1. Create one in Monetize.
  2. Recipient settings come from Notifications and fan data.
  3. The sender domain depends on Outbound Emails.
  4. Results appear in the Newsletter table.
- **Events:**
  1. Create one in Monetize.
  2. It gets a public listing and a ticket page.
  3. Scheduled livestreams connect here, and the Google Calendar link is under Privacy.
- **White Label Site:**
  1. Domain and appearance are set in Preferences.
  2. The cover page editor shapes the public Home.
  3. Link in Bio is a separate public page with its own editor.
- **Store order:** set from the Store button on the profile, not in Monetize.
- **Integrations are scattered:**

  | Integration | Where |
  |---|---|
  | Shopify | Merchandise |
  | Bandsintown | Events |
  | MetaMask | NFT Wallet |
  | Google Calendar and sign-in | Privacy |
  | DNS | White Label Site and Outbound Emails |
  | GTM | White Label Site |

- **Referrals appear in three places:** Wallet, Link in Bio and Advertisements.
- **Similar names:**
  - Monetize vs Monetization.
  - Wallet vs NFT Wallet.
  - Customer Support vs Creator Support vs Help Center & FAQ.
  - Notifications settings vs Activity.
  - Groups vs fan segments.
  - White Label Site vs Link in Bio.
  - Creator Quest (prototype mini-games) vs platform Gamification.

  TopFan AI asks one short question before choosing between these. It always asks when money is involved.

## 5. Creator priorities

This is judgment, not usage data.

- **Essential:** Profile, New Post, a Subscription or first product, payout setup, Balance, Earnings, Messages.
- **Important:**
  - White Label Site, Link in Bio, Newsletters.
  - Merchandise, Courses, Experiences, Events, Livestream.
  - Fan list, Engagement Metrics, Refunds and Fulfillment.
- **Useful later:** Segmentation, automated messages, Discount Codes, VIP Offers, Ads, Referrals, Delegation, Gamification, Groups.
- **Rarely needed or niche:** NFTs and MetaMask, Topic Tags, DNS records, GTM and SEO settings, support routing, Interests.

## 6. Where creators need the most help

- Knowing what to set up first.
- Choosing what to sell.
- Technical setup, especially DNS.
- Finding settings across 16 Preferences tabs.
- Tasks that span sections.
- Similar names.
- Using data to decide what to do.
- Noticing failed setups and waiting requests.

## 7. Suggestions the account state supports

Each one is implemented in `src/app/agent-context/account-state.ts` and derived from the store:

| State | Suggestion |
|---|---|
| Failed email verification | Explain the problem and walk through the fix (task `fix-outbound-email`) |
| Refunds or fulfillment waiting | Open them, starting with the oldest |
| New ad brands | Show them for review |
| No automated messages | Offer to draft a welcome message |
| Fewer than 2 active Topic Tags | Explain the requirement |
| Upcoming event | Suggest a post or reminder |
| No recent posts | Suggest an idea |

Priority order:

1. Critical or blocking.
2. Pending operations.
3. Unfinished work.
4. Setup.
5. Growth.
6. Discovery.

Creator category only breaks ties within the same priority. It never hides features.

## 8. Creator models

This is a hypothesis to validate:

| Model | Typical creators |
|---|---|
| Membership-led | Podcasters and newsletter writers |
| Knowledge-led | Educators, finance and fitness creators |
| Moment-led | Musicians, athletes and entertainers |
| Live and community-led | Gamers and streamers |
| Commerce-led | Food and lifestyle creators |

The dev-only profile switcher (`src/app/profiles.ts`) has one demo profile for each of these models.
