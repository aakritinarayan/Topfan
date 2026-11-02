/**
 * Verified platform knowledge for the assistant: generated from the feature registry plus the
 * cross-section relationships in the md brief §3.6. The server sends this to the model; the model is
 * told to say it isn't sure about anything not written here. Runs in Node and the browser (no DOM).
 */
import { AMBIGUITIES, FEATURES } from "./features";

const RELATIONSHIPS = `
- Groups: create in Preferences › Groups → assign fans in Insights & Fans (Fan Relationship Management) → restrict posts, products, offers, portfolios, chat or DMs to the group.
- Topic Tags: create in Preferences › Topic Tags → at least 2 must be active before they show → use them on posts → fans filter the feed. The Feed's gear icon links to Topic Tags.
- Gamification: configure in Preferences › Gamification → leaderboard on the public profile → points appear in Wallet › Loyalty History and Earning Metrics.
- Paid DMs and tips: set in Preferences › Monetization → used in Messages and posts → earnings appear in Wallet and Insights.
- Newsletters: create in Monetize › Newsletters → recipient settings in Preferences › Notifications & Newsletters → sending from your own domain needs Preferences › Outbound Emails verified → results appear in the Newsletters table.
- Events: create in Monetize › Events & Ticketing → public listing and ticket page → livestreams are scheduled as events → Google Calendar link is in Preferences › Privacy, Password & Integrations.
- White Label Site: domain and appearance in Preferences › White Label Site → cover page editor → public Home. Link in Bio is a separate public page with its own editor.
- Store order: set from the Store button on the public profile, not in Monetize.
- Integrations are spread out: Shopify (Monetize › Merchandise), Bandsintown (Events), MetaMask (Preferences › NFT Wallet), Google Calendar and sign-in methods (Preferences › Privacy), DNS (White Label Site and Outbound Emails), Google Tag Manager (White Label Site).
- Referrals appear in three places: Wallet › Referrals, Link in Bio, and Advertisements.
- Outbound Emails: TopFan shows DNS records (for example a verification TXT record and DKIM CNAME records) to add at the creator's domain provider; then the creator clicks verify. If the records aren't found, both steps show Failed. Changing DNS happens at the provider, never in TopFan or the assistant.
- Delegation: delegates get "Content" or "Financial, Content" access, with a revenue share per stream. (Exactly which screens each access opens is inferred in this demo.)
- Refund Requests: the creator approves or declines each request; nothing is refunded automatically.
- Withdrawals need a connected payout account. In this demo no money moves.`;

export function platformKnowledge() {
  const features = FEATURES.map((f) => `- ${f.name} (${f.where}): ${f.description}`).join("\n");
  const similar = Object.values(AMBIGUITIES)
    .map((a) => `- ${a.options.map((o) => FEATURES.find((f) => f.id === o.featureId)?.name).join(" vs ")}: ${a.question}`)
    .join("\n");
  return `# TopFan creator platform

Navigation (left sidebar): NEW POST, LIVESTREAM, Home, Feed, Activity, Messages, Monetize, Wallet, Insights & Fans, Resources. Avatar menu (top right): Edit Preferences, Terms & Privacy Policy, Help Center & FAQ, Sign Out. Preferences has 16 tabs: Profile, Welcome Message, Interests, Creator Type, Customer Support, Notifications & Newsletters, NFT Wallet, Monetization, Privacy, Password & Integrations, White Label Site, Outbound Emails, Link In Bio, Delegation, Topic Tags, Groups, Gamification.

## Features (official name, where, what it does)
${features}

## How features connect
${RELATIONSHIPS.trim()}

## Similar names (ask which one if unclear)
${similar}`;
}
