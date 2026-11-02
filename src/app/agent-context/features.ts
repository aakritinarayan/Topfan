/**
 * Feature registry: what each TopFan feature is called, what creators might call it, and where it
 * lives in the ORIGINAL navigation. The assistant resolves everyday language against this list and
 * only ever opens the existing route (routeId). Account state is never stored here: see account-state.ts.
 *
 * Sources: References/topfan-reference (REFERENCE.md, page specs), the md brief §3.5–3.6, and the
 * prototype's own onboarding. Synonyms are judgment (everyday phrasing), not usage data.
 */
import type { Capability } from "../../store/permissions";

export type Audience = "creator" | "fan" | "both";

export interface Feature {
  id: string;
  /** Official TopFan name, exactly as the UI shows it. */
  name: string;
  /** Where it lives, in the product's own words (breadcrumb). */
  where: string;
  /** Destination route id (src/app/routes). */
  routeId: string;
  params?: Record<string, string>;
  /** Opens this overlay (modal) instead of changing the page, e.g. the Livestream modal. */
  overlay?: "livestream";
  /** Everyday words and phrases a creator might use (lowercase). */
  synonyms: string[];
  description: string;
  /** Creator goals this feature serves (ids in GOALS below). */
  goals: string[];
  prerequisites?: string[];
  related?: string[];
  /** Action ids (actions.ts) available on this feature. */
  actions?: string[];
  /** Capability needed to open/use it (store/permissions). */
  need?: Capability;
  audience: Audience;
  /** Similar-name group: the assistant asks before guessing between these. */
  ambiguity?: string;
  status: "built" | "inferred";
}

/** Creator goals in plain words: used for "I want to…" requests and recommendations. */
export const GOALS: Record<string, string> = {
  earn: "Start earning",
  "exclusive-content": "Share exclusive content",
  community: "Build a community",
  sell: "Sell products",
  events: "Run events and sell tickets",
  teach: "Teach and sell knowledge",
  grow: "Grow my audience",
  brand: "Make it look like my brand",
  "get-paid": "Get paid",
  team: "Work with a team",
  fans: "Understand my fans",
  engage: "Engage my fans",
  setup: "Set up my account",
  support: "Get help",
};

const f = (x: Feature) => x;

export const FEATURES: Feature[] = [
  /* ---------------- Publish ---------------- */
  f({ id: "new-post", name: "New Post", where: "Sidebar › NEW POST", routeId: "newpost", synonyms: ["post", "new post", "create a post", "publish", "upload a video", "share a photo", "write an article", "poll", "giveaway", "fundraiser", "reel", "what should i post", "content"], description: "Publish a video, images, article, audio, reel, poll, giveaway, link, fundraiser or text post. Posts can be locked for subscribers or a price.", goals: ["exclusive-content", "engage", "grow"], related: ["topic-tags", "groups", "subscriptions"], actions: ["post.draft", "post.publish"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "livestream", name: "Livestream", where: "Sidebar › LIVESTREAM", routeId: "monetize-event-calendar", overlay: "livestream", synonyms: ["livestream", "go live", "live stream", "stream", "live video", "broadcast live", "schedule a livestream"], description: "Start a livestream now, or schedule one as an event in Monetize › Events & Ticketing.", goals: ["engage", "events"], related: ["events"], actions: ["livestream.open"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "feed", name: "Feed", where: "Sidebar › Feed", routeId: "feed", synonyms: ["feed", "my profile", "my page", "public profile", "timeline", "my posts", "what fans see"], description: "Your public profile and posts, as fans see them.", goals: ["grow"], audience: "both", status: "built" }),
  f({ id: "home", name: "Home", where: "Sidebar › Home", routeId: "home", synonyms: ["home", "homepage", "landing page", "my website", "site home"], description: "Your public Home page (the White Label Site landing page).", goals: ["brand", "grow"], related: ["white-label", "cover-page"], audience: "both", status: "built" }),

  /* ---------------- Sell (Monetize) ---------------- */
  f({ id: "subscriptions", name: "Subscriptions", where: "Monetize › Subscriptions", routeId: "monetize-subscription", synonyms: ["subscription", "subscriptions", "membership", "members", "paid membership", "plan", "plans", "tiers", "monthly", "exclusive content", "paid community", "patreon", "gold plan", "silver plan", "bronze plan", "start earning"], description: "Monthly plans fans subscribe to (Gold, Silver, Bronze). Each plan has prices for 1, 3, 6 or 12 months, optional discounts and free trials, and benefits.", goals: ["earn", "exclusive-content", "community"], related: ["groups", "new-post", "discount-codes"], actions: ["plan.draft", "plan.publish", "plan.changePrice"], need: "content.write", audience: "creator", ambiguity: "monetize", status: "built" }),
  f({ id: "newsletters", name: "Newsletters", where: "Monetize › Newsletters", routeId: "monetize-newsletters", synonyms: ["newsletter", "newsletters", "email fans", "email blast", "mailing list", "send an email", "send a newsletter", "announcement email"], description: "Write and send newsletters to fans, optionally paid. Sending uses your Outbound Emails sender domain.", goals: ["engage", "earn"], prerequisites: ["outbound-emails"], related: ["outbound-emails", "notifications", "groups"], actions: ["newsletter.draft", "newsletter.send"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "experiences", name: "Experiences", where: "Monetize › Experiences", routeId: "monetize-experience", synonyms: ["experience", "experiences", "shoutout", "video call", "1:1", "one on one", "meet and greet", "personal video", "coaching session", "book me"], description: "Sell personal experiences such as shoutouts, video calls and 1:1 sessions. Fans' orders appear in Wallet › My Fulfillment Requests.", goals: ["earn", "engage"], related: ["fulfillment"], actions: ["experience.draft", "experience.publish"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "courses", name: "Courses", where: "Monetize › Courses", routeId: "monetize-courses", synonyms: ["course", "courses", "class", "lessons", "teach", "tutorial series", "training program", "curriculum", "online course", "workshop"], description: "Sell a course with lessons.", goals: ["teach", "earn"], actions: ["course.draft", "course.publish"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "downloadables", name: "Downloadables", where: "Monetize › Downloadables", routeId: "monetize-downloadable", synonyms: ["downloadable", "downloadables", "digital product", "pdf", "ebook", "preset", "file", "guide to download", "training plan download", "digital download"], description: "Sell digital files fans can download.", goals: ["sell", "teach", "earn"], actions: ["downloadable.draft", "downloadable.publish"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "merchandise", name: "Merchandise", where: "Monetize › Merchandise", routeId: "monetize-merchandise", synonyms: ["merch", "merchandise", "store", "shop", "hoodie", "t-shirt", "shirts", "products", "shopify", "sell merch", "physical products"], description: "Sell merchandise through Shopify or an external link. Physical orders appear in fulfillment.", goals: ["sell", "earn"], related: ["public-store", "fulfillment"], actions: ["merch.draft", "merch.publish"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "nfts", name: "NFTs", where: "Monetize › NFTs", routeId: "monetize-nfts", synonyms: ["nft", "nfts", "collectible", "digital collectible", "crypto"], description: "List external NFTs. (Your MetaMask connection is in Preferences › NFT Wallet.)", goals: ["sell"], related: ["nft-wallet"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "events", name: "Events & Ticketing", where: "Monetize › Events & Ticketing", routeId: "monetize-event-calendar", synonyms: ["event", "events", "tickets", "ticket", "sell tickets", "ticketing", "concert", "tour", "competition", "meetup", "bandsintown", "calendar", "schedule"], description: "Create events and sell tickets (native tickets or Bandsintown import). Events appear on your public event listing; livestreams can be scheduled here.", goals: ["events", "earn", "engage"], related: ["livestream", "public-events", "google-calendar"], actions: ["event.draft", "event.publish"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "vip-offers", name: "VIP Offers", where: "Monetize › VIP Offers", routeId: "monetize-vip-offers", synonyms: ["vip", "vip offer", "vip offers", "exclusive deal", "special offer", "perk", "deal"], description: "Special offers and deals for fans.", goals: ["earn", "community"], related: ["groups", "subscriptions"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "portfolios", name: "Portfolios", where: "Monetize › Portfolios", routeId: "monetize-portfolio", synonyms: ["portfolio", "portfolios", "video series", "series", "showcase", "videos page", "episodes"], description: "Group videos into portfolios and series fans can watch (public Videos pages).", goals: ["exclusive-content", "grow"], related: ["public-videos"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "discount-codes", name: "Discount Codes", where: "Monetize › Discount Codes", routeId: "monetize-discount-codes", synonyms: ["discount", "discount code", "coupon", "promo code", "promo", "sale", "percent off"], description: "Create discount codes for your plans and products.", goals: ["earn", "grow"], related: ["subscriptions"], need: "finance.write", audience: "creator", status: "built" }),
  f({ id: "advertisements", name: "Advertisements", where: "Monetize › Advertisements", routeId: "monetize-advertisements", synonyms: ["ads", "advertisements", "advertising", "sponsor", "sponsorship", "brand deal", "brands", "partners", "brand offers"], description: "Review brands that want to advertise with you and approve or decline them.", goals: ["earn"], related: ["referrals"], actions: ["ad.approve", "ad.decline"], need: "content.write", audience: "creator", status: "built" }),

  /* ---------------- Fans & communication ---------------- */
  f({ id: "activity", name: "Activity", where: "Sidebar › Activity", routeId: "activity", synonyms: ["activity", "notifications feed", "what happened", "recent activity", "likes", "comments", "who liked", "alerts"], description: "Recent likes, comments, purchases and follows. (Notification settings are separate, in Preferences.)", goals: ["fans", "engage"], audience: "creator", ambiguity: "notifications", status: "built" }),
  f({ id: "messages", name: "Messages", where: "Sidebar › Messages", routeId: "messages", synonyms: ["messages", "dm", "dms", "inbox", "chat with fans", "reply", "direct message", "paid dm", "message a fan", "message list", "broadcast message"], description: "Priority, General and Message Lists inboxes; message fans, paid DMs and automated messages.", goals: ["engage", "earn"], related: ["automated-messages", "monetization-settings"], actions: ["message.draft", "message.send"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "automated-messages", name: "Automated Messages", where: "Messages › Automated Messages", routeId: "messages", synonyms: ["automated message", "automated messages", "auto reply", "welcome dm", "auto message", "automatic message"], description: "Messages sent automatically, for example when a fan subscribes.", goals: ["engage"], related: ["messages", "welcome-message"], actions: ["automated.draft", "automated.activate"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "insights", name: "Insights & Fans", where: "Sidebar › Insights & Fans", routeId: "insights", synonyms: ["insights", "analytics", "stats", "statistics", "metrics", "performance", "how am i doing"], description: "Fan list, Fan Relationship Management, segmentation, Earning Metrics and Engagement Metrics.", goals: ["fans", "grow"], related: ["groups", "segments"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "fans", name: "Fan Relationship Management", where: "Insights & Fans › Fan Relationship Management", routeId: "insights", params: { tab: "fan-relationship-management" }, synonyms: ["fans", "my fans", "fan list", "followers", "audience", "who are my fans", "top fans", "fan management", "subscribers list", "assign fans", "add fans to a group"], description: "Your fan list: top supporters, most engaged, top recruiters, and (once you have Groups) group membership.", goals: ["fans", "community"], related: ["groups", "segments"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "engagement", name: "Engagement Metrics", where: "Insights & Fans › Engagement Metrics", routeId: "insights", params: { tab: "engagement" }, synonyms: ["engagement", "engagement metrics", "likes and comments", "post performance", "which posts did well"], description: "How fans engage with your posts.", goals: ["fans", "grow"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "segments", name: "Segmentation & Outreach", where: "Insights & Fans › Segmentation & Outreach", routeId: "insights", params: { tab: "fan-relationship-management", sub: "segmentation" }, synonyms: ["segment", "segments", "segmentation", "outreach", "target fans", "filter fans", "fan segment", "top spenders", "reach out"], description: "Filter fans by criteria and reach out to that segment.", goals: ["fans", "engage"], related: ["groups", "messages", "newsletters"], actions: ["segment.draft"], need: "content.write", audience: "creator", ambiguity: "groups", status: "built" }),
  f({ id: "earnings", name: "Earning Metrics", where: "Insights & Fans › Earning Metrics", routeId: "insights", synonyms: ["earnings", "revenue", "income", "how much did i make", "money made", "sales", "earning metrics"], description: "Revenue over time by stream.", goals: ["earn", "fans"], related: ["wallet-balance"], need: "finance.read", audience: "creator", ambiguity: "wallet", status: "built" }),

  /* ---------------- Money (Wallet) ---------------- */
  f({ id: "wallet-balance", name: "Current Balance", where: "Wallet › Current Balance", routeId: "wallet-balance", synonyms: ["wallet", "balance", "my money", "withdraw", "withdrawal", "cash out", "payout", "get paid", "transfer to bank", "bank account", "payout account", "saved cards", "card"], description: "Available balance, withdrawals, payout account and saved cards.", goals: ["get-paid"], actions: ["wallet.withdraw", "wallet.connectPayout"], need: "finance.read", audience: "creator", ambiguity: "wallet", status: "built" }),
  f({ id: "transactions", name: "Transactions", where: "Wallet › Transactions", routeId: "wallet-transactions", synonyms: ["transactions", "payments", "payment history", "purchases by fans", "statement", "history"], description: "Every payment in and out.", goals: ["get-paid"], need: "finance.read", audience: "creator", status: "built" }),
  f({ id: "referrals", name: "Referrals", where: "Wallet › Referrals", routeId: "wallet-referrals", synonyms: ["referral", "referrals", "invite creators", "refer a friend", "referral link"], description: "Referral earnings (referrals also appear in Link in Bio and Advertisements).", goals: ["earn", "grow"], need: "finance.read", audience: "creator", status: "built" }),
  f({ id: "loyalty", name: "Loyalty History", where: "Wallet › Loyalty History", routeId: "wallet-loyalty", synonyms: ["loyalty", "loyalty history", "points history", "rewards history"], description: "Points history from gamification.", goals: ["engage"], related: ["gamification"], need: "finance.read", audience: "creator", status: "built" }),
  f({ id: "purchases", name: "My Purchases", where: "Wallet › My Purchases", routeId: "wallet-purchases", synonyms: ["my purchases", "things i bought", "purchased", "my orders"], description: "What you've bought on TopFan.", goals: [], need: "finance.read", audience: "creator", status: "built" }),
  f({ id: "refunds", name: "Refund Requests", where: "Wallet › Refund Requests", routeId: "wallet-refunds", synonyms: ["refund", "refunds", "refund request", "refund requests", "money back", "chargeback", "fan wants refund"], description: "Review fans' refund requests and approve or decline each one.", goals: ["get-paid", "support"], actions: ["refund.approve", "refund.decline"], need: "finance.read", audience: "creator", status: "built" }),
  f({ id: "fulfillment", name: "My Fulfillment Requests", where: "Wallet › My Fulfillment Requests", routeId: "wallet-fulfillment", synonyms: ["fulfillment", "fulfil", "fulfill", "orders", "orders to ship", "pending orders", "requests to fulfill", "shoutout requests", "deliver"], description: "Experience and merchandise orders waiting for you to fulfill.", goals: ["sell"], actions: ["fulfillment.markDone"], need: "content.write", audience: "creator", status: "built" }),

  /* ---------------- Preferences ---------------- */
  f({ id: "profile", name: "Profile", where: "Preferences › Profile", routeId: "pref-profile", synonyms: ["profile", "edit profile", "my name", "bio", "profile picture", "avatar", "username", "handle", "about me", "photo"], description: "Name, username, picture, bio and profile details.", goals: ["setup", "brand"], actions: ["profile.update"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "welcome-message", name: "Welcome Message", where: "Preferences › Welcome Message", routeId: "pref-welcome", synonyms: ["welcome message", "welcome video", "greeting", "intro message", "welcome new fans"], description: "The message (and video) new fans see when they join.", goals: ["engage", "setup"], related: ["automated-messages"], actions: ["welcome.draft", "welcome.save"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "interests", name: "Interests", where: "Preferences › Interests", routeId: "pref-interests", synonyms: ["interests", "content categories", "my topics", "what i'm into"], description: "Interests used for discovery.", goals: ["grow"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "creator-type", name: "Creator Type", where: "Preferences › Creator Type", routeId: "pref-creator-type", synonyms: ["creator type", "category", "creator category", "what kind of creator"], description: "Your creator category.", goals: ["setup"], need: "account.admin", audience: "creator", status: "built" }),
  f({ id: "customer-support", name: "Customer Support", where: "Preferences › Customer Support", routeId: "pref-customer-support", synonyms: ["customer support", "support email", "where fans contact me", "fan support"], description: "How YOUR fans reach your support. (TopFan's own help is Resources › Creator Support and Help Center & FAQ.)", goals: ["support"], need: "content.write", audience: "creator", ambiguity: "support", status: "built" }),
  f({ id: "notifications", name: "Notifications & Newsletters", where: "Preferences › Notifications & Newsletters", routeId: "pref-notifications", synonyms: ["notification settings", "notifications", "email notifications", "turn off notifications", "newsletter settings", "alerts settings"], description: "Which notifications you receive, and newsletter recipient settings. (The Activity page is separate.)", goals: ["setup"], related: ["newsletters"], need: "content.write", audience: "creator", ambiguity: "notifications", status: "built" }),
  f({ id: "nft-wallet", name: "NFT Wallet", where: "Preferences › NFT Wallet", routeId: "pref-nft-wallet", synonyms: ["nft wallet", "nft settings", "nft setting", "my nft settings", "metamask", "crypto wallet", "connect wallet", "unlink wallet", "web3"], description: "Your connected MetaMask wallet for NFTs. Not where your earnings are (that's Wallet).", goals: ["sell"], related: ["nfts"], actions: ["wallet.unlinkNft"], need: "account.admin", audience: "creator", ambiguity: "wallet", status: "built" }),
  f({ id: "monetization-settings", name: "Monetization", where: "Preferences › Monetization", routeId: "pref-monetization", synonyms: ["monetization", "monetization settings", "tips", "tipping", "paid dm price", "dm price", "subscriber only chat", "subscriber only comments", "guaranteed reply"], description: "Settings for tips, paid DMs and subscriber-only chat and comments. (Your products and plans are in Monetize.)", goals: ["earn"], related: ["messages"], actions: ["monetization.update"], need: "finance.write", audience: "creator", ambiguity: "monetize", status: "built" }),
  f({ id: "privacy", name: "Privacy, Password & Integrations", where: "Preferences › Privacy, Password & Integrations", routeId: "pref-privacy", synonyms: ["privacy", "password", "change password", "security", "integrations", "google calendar", "sign in methods", "login", "blocked users", "block a fan", "pause account", "delete account", "deactivate", "close my account"], description: "Privacy, password, sign-in methods, Google Calendar, blocked users, and pause or delete your account.", goals: ["setup"], actions: ["account.changePassword", "account.pause", "account.delete"], need: "account.admin", audience: "creator", status: "built" }),
  f({ id: "white-label", name: "White Label Site", where: "Preferences › White Label Site", routeId: "pref-whitelabel", synonyms: ["white label", "white label site", "my website", "website", "domain", "custom domain", "logo", "change my logo", "colors", "brand colors", "theme", "branding", "website design", "change my website design", "favicon", "seo", "gtm", "google tag manager", "dns", "site address"], description: "Your own website on your domain: domain and DNS, logo, colors, SEO and the cover page.", goals: ["brand", "setup"], related: ["cover-page", "link-in-bio", "home"], actions: ["wls.updateBranding", "wls.changeDns"], need: "account.admin", audience: "creator", ambiguity: "site", status: "built" }),
  f({ id: "cover-page", name: "Cover page editor", where: "Preferences › White Label Site › Cover page", routeId: "pref-whitelabel-cover", synonyms: ["cover page", "landing page design", "homepage layout", "hero image", "cover"], description: "Edit the cover (landing) page of your White Label Site.", goals: ["brand"], related: ["white-label"], need: "account.admin", audience: "creator", status: "built" }),
  f({ id: "outbound-emails", name: "Outbound Emails", where: "Preferences › Outbound Emails", routeId: "pref-outbound-emails", synonyms: ["outbound emails", "outbound email", "email domain", "sender email", "connect my email", "email verification", "email not working", "emails failing", "dkim", "spf", "email dns", "why is my email failing"], description: "Send newsletters and emails from your own domain. Needs DNS records added at your domain provider, then verification.", goals: ["engage", "setup"], related: ["newsletters", "white-label"], actions: ["email.verify", "email.changeDns"], need: "account.admin", audience: "creator", status: "built" }),
  f({ id: "link-in-bio", name: "Link In Bio", where: "Preferences › Link In Bio", routeId: "pref-link-in-bio", synonyms: ["link in bio", "linktree", "bio link", "links page", "instagram link", "one link"], description: "A separate public links page with its own editor (not your White Label Site).", goals: ["grow", "brand"], related: ["white-label", "referrals"], actions: ["linkinbio.update"], need: "content.write", audience: "creator", ambiguity: "site", status: "built" }),
  f({ id: "delegation", name: "Delegation", where: "Preferences › Delegation", routeId: "pref-delegation", synonyms: ["delegation", "delegate", "delegates", "team", "team member", "add a team member", "manager", "assistant access", "give access", "add my manager", "editor access"], description: "Give team members Content or Financial, Content access, with revenue share per stream.", goals: ["team"], actions: ["delegate.addContent", "delegate.addFinancial"], need: "account.admin", audience: "creator", status: "built" }),
  f({ id: "topic-tags", name: "Topic Tags", where: "Preferences › Topic Tags", routeId: "pref-topic-tags", synonyms: ["topic tags", "tags", "hashtags", "categories for posts", "feed filter", "filter my feed"], description: "Tags fans use to filter your feed. Topic Tags show on the feed once at least 2 are active.", goals: ["engage"], related: ["new-post", "feed"], actions: ["tag.add"], need: "content.write", audience: "creator", status: "built" }),
  f({ id: "groups", name: "Groups", where: "Preferences › Groups", routeId: "pref-groups", synonyms: ["groups", "group", "vip group", "vip club", "private group", "inner circle", "micro community", "restrict access", "close friends", "exclusive group"], description: "Micro-communities: create a group, assign fans in Insights & Fans, then restrict posts, products, offers, chat or DMs to it.", goals: ["community", "exclusive-content"], related: ["insights", "subscriptions", "new-post"], actions: ["group.add"], need: "content.write", audience: "creator", ambiguity: "groups", status: "built" }),
  f({ id: "gamification", name: "Gamification", where: "Preferences › Gamification", routeId: "pref-gamification", synonyms: ["gamification", "points", "badges", "leaderboard", "rewards", "earn points", "buy points", "fan rewards"], description: "Points fans earn, points they can buy, badges, and the leaderboard on your public profile.", goals: ["engage", "community"], related: ["loyalty"], actions: ["gamification.update"], need: "content.write", audience: "creator", ambiguity: "gamification", status: "built" }),

  /* ---------------- Help ---------------- */
  f({ id: "announcements", name: "Announcements", where: "Resources › Announcements", routeId: "resources-announcements", synonyms: ["announcements", "news", "what's new", "updates from topfan", "release notes"], description: "News from TopFan.", goals: ["support"], audience: "creator", status: "built" }),
  f({ id: "guides", name: "Guides", where: "Resources › Guides", routeId: "resources-guides", synonyms: ["guides", "tutorials", "tips", "how to videos", "learn topfan", "tips and tutorials"], description: "Tips and tutorials for using TopFan.", goals: ["support"], audience: "creator", status: "built" }),
  f({ id: "providers", name: "Service Providers", where: "Resources › Service Providers", routeId: "resources-providers", synonyms: ["service providers", "providers", "hire help", "agencies", "editors for hire"], description: "Service providers who can help with your business.", goals: ["support", "team"], audience: "creator", status: "built" }),
  f({ id: "creator-support", name: "Creator Support", where: "Resources › Creator Support", routeId: "resources-support", synonyms: ["creator support", "contact topfan", "support ticket", "talk to support", "contact support", "help from topfan", "report a problem"], description: "Contact TopFan's creator support team.", goals: ["support"], audience: "creator", ambiguity: "support", status: "built" }),
  f({ id: "help-center", name: "Help Center & FAQ", where: "Avatar menu › Help Center & FAQ", routeId: "help-faq", synonyms: ["help", "help center", "faq", "faqs", "questions", "how does topfan work"], description: "Frequently asked questions.", goals: ["support"], audience: "both", ambiguity: "support", status: "built" }),

  /* ---------------- Public (fan side) ---------------- */
  f({ id: "public-store", name: "Store", where: "Public profile › Store", routeId: "public-store", synonyms: ["my store page", "public store", "store page", "shop page", "store order"], description: "Your public store. The order of items is set from the Store button on your profile, not in Monetize.", goals: ["sell"], related: ["merchandise"], audience: "both", status: "built" }),
  f({ id: "public-events", name: "Competitions", where: "Public Home › Competitions", routeId: "public-events", synonyms: ["public events", "event listing", "event page", "competitions page", "ticket page"], description: "Your public list of events and competitions.", goals: ["events"], related: ["events"], audience: "both", status: "built" }),
  f({ id: "public-videos", name: "Videos", where: "Public Home › Videos", routeId: "public-videos", params: { portfolioId: "p1" }, synonyms: ["videos page", "public videos", "watch page"], description: "Your public videos and series.", goals: ["exclusive-content"], related: ["portfolios"], audience: "both", status: "built" }),
  f({ id: "creator-quest", name: "Creator Quest", where: "White Label setup › Provisioning (mini-games)", routeId: "wls-setup-provisioning", synonyms: ["creator quest", "mini game", "mini games", "the game", "jelly game"], description: "Optional mini-games on the provisioning screen while your site is set up. Not the same as platform Gamification (fan points and badges).", goals: [], audience: "creator", ambiguity: "gamification", status: "built" }),
];

/** Similar names, with the short question to ask when the request doesn't say which one. */
export const AMBIGUITIES: Record<string, { question: string; options: { featureId: string; label: string }[]; sensitive?: boolean }> = {
  wallet: {
    question: "Do you mean your earnings and withdrawals, or your connected NFT wallet?",
    options: [
      { featureId: "wallet-balance", label: "Earnings & withdrawals" },
      { featureId: "nft-wallet", label: "NFT wallet (MetaMask)" },
    ],
    sensitive: true,
  },
  monetize: {
    question: "Do you mean what you sell (plans and products), or your tips and paid-DM settings?",
    options: [
      { featureId: "subscriptions", label: "What I sell (Monetize)" },
      { featureId: "monetization-settings", label: "Tips & paid DMs (Monetization settings)" },
    ],
  },
  support: {
    question: "Do you want help from TopFan, or to set how your fans contact you?",
    options: [
      { featureId: "creator-support", label: "Help from TopFan" },
      { featureId: "help-center", label: "Help Center & FAQ" },
      { featureId: "customer-support", label: "How fans contact me" },
    ],
  },
  notifications: {
    question: "Do you want to see recent activity, or change which notifications you get?",
    options: [
      { featureId: "activity", label: "Recent activity" },
      { featureId: "notifications", label: "Notification settings" },
    ],
  },
  groups: {
    question: "Do you want a lasting group (for restricted content), or a one-off filter of fans to reach out to?",
    options: [
      { featureId: "groups", label: "A group" },
      { featureId: "segments", label: "A fan segment" },
    ],
  },
  site: {
    question: "Do you mean your website (White Label Site), or your Link in Bio page?",
    options: [
      { featureId: "white-label", label: "My website" },
      { featureId: "link-in-bio", label: "Link in Bio" },
    ],
  },
  gamification: {
    question: "Do you mean fan points and badges, or the Creator Quest mini-games?",
    options: [
      { featureId: "gamification", label: "Fan points & badges" },
      { featureId: "creator-quest", label: "Creator Quest games" },
    ],
  },
};

export const featureById = (id: string) => FEATURES.find((x) => x.id === id);
