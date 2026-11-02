/**
 * ALL demo data lives here. Everything is simulated: no backend, no real DNS, no real GoDaddy.
 * Edit this file to change names, domains, copy or assets.
 */

export const assets = {
  // Placeholders for now (approved). Drop files into /public/assets and set the paths here.
  avatar: null as string | null, // e.g. "/assets/aj-avatar.jpg"
  cover: null as string | null, // feed cover photo
  hero: null as string | null, // cover-page hero photo
  logoImage: null as string | null, // optional SVG/PNG logo; null = text logo in the logo font
  // Assistant mascot. Cropped from the supplied artwork (black background); shown with a screen
  // blend so the black disappears on the dark UI. A transparent PNG can replace it 1:1.
  mascot: "/assets/mascot.png" as string | null,
  // TopFan logo for the account-setup header, e.g. "/assets/topfan-logo.png". Any color works: it is shown in white.
  topfanLogo: null as string | null,
};

export const creator = {
  name: "AJ White",
  handle: "ajwhite",
  location: "Breckenridge, Colorado, United States",
  bio: "US freestyle snowboarder. Training, competition clips and life on the mountain.",
  // Simulated: the link the creator pastes in Scene 1.
  socialLinkPasted: "instagram.com/ajwhite",
};

export const domain = {
  name: "ajwhite.com",
  provider: "GoDaddy",
  hasEmail: true,
  recommendedSubdomain: "fans",
  subdomainAlternatives: ["club", "team"],
  temporaryAddress: "ajwhite.topfan.dev",
  // Shown only in "Show details" / the DNS records step.
  records: [
    { host: "fans", value: "d1in24lp4gnnuf.cloudfront.net" },
    {
      host: "_f6f4da22c723f266d0c98ec17272e0c4.fans",
      value: "_42b5ccc2a8147a44a0f2343082c90176.acm-validations.aws",
    },
  ],
};

export const fullSiteAddress = `${domain.recommendedSubdomain}.${domain.name}`;

// Drafted during provisioning ("Draft my first post"). Built only from the creator's own bio above.
export const draftWelcomePost = `Welcome to my new fan site! This is where I'll share training, competition clips and life on the mountain.

So glad you're here.
– ${creator.name.split(" ")[0]}`;

// Scene 4 copy (from the brief): the temporary address works while the custom domain connects.
export const temporaryAddressNote = `In the meantime, your site already works at ${domain.temporaryAddress}. I'll switch it to your own address as soon as the connection finishes. You can leave this page.`;

// Domain / DNS Provider options (P50, from the app bundle; order preserved).
export const dnsProviders = [
  "GoDaddy", "Namecheap", "OpenSRS", "Enom", "Hover", "Onamae.com", "Dynadot", "Domain.com",
  "Network Solutions", "Bluehost", "Register.com", "Squarespace", "NameSilo", "Gname", "Hostinger",
  "IONOS", "Alibaba Cloud", "NameBright", "DropCatch", "Internet.bs", "Moniker", "123 Reg", "Wix",
  "OVHcloud", "Gandi.net", "Name.com", "Cloudflare", "DreamHost", "Shopify", "Fasthosts",
  "United Domains", "Porkbun", "Other",
];

export const preferenceTabs = [
  "Profile", "Welcome Message", "Interests", "Creator Type", "Customer Support",
  "Notifications & Newsletters", "NFT Wallet", "Monetization", "Privacy, Password & Integrations",
  "White Label Site", "Outbound Emails", "Link In Bio", "Delegation", "Topic Tags", "Groups", "Gamification",
];

export const sidebarNav = [
  { label: "Home", icon: "home" },
  { label: "Feed", icon: "feed" },
  { label: "Activity", icon: "activity" },
  { label: "Messages", icon: "messages" },
  { label: "Monetize", icon: "monetize" },
  { label: "Wallet", icon: "wallet" },
  { label: "Insights & Fans", icon: "insights" },
  { label: "Resources", icon: "resources", badge: 1 },
] as const;

// Customize Appearance values (P50).
export const appearance = {
  palette: "Custom Color Palette",
  paletteOptions: ["Standard Color Palettes", "Custom Color Palette", "Standard Themes"],
  colors: [
    { label: "Page Background Color *", value: "#191a1c" },
    { label: "Background Text Color *", value: "#ffffff" },
    { label: "Post Background Color *", value: "#272a2b" },
    { label: "Post Text Color *", value: "#ffffff" },
    { label: "Logo & Button Color *", value: "#bc1111" },
    { label: "Button Text Color *", value: "#ffffff" },
  ],
};

// SEO values as captured (P50c / P50f). "Freestyle Skiing" is a real leftover the Scene 6 health check finds.
export const seo = {
  gtm: "GTM-XXXXXXX",
  title: "Official Site of AJ White",
  keywords: "AJ White, Sports, Content Creator, Freestyle Skiing",
  description:
    "AJ White is a sports content creator specializing in freestyle snowboarding. Follow for snowboarding videos, tricks, training tips, one-to-one personal experiences, and adventures.",
};

// Cover page sections table (P50f).
export const coverSections = [
  { name: "Header", layout: "Header Layout", desc: "Sticky site header with logo, menu links and two CTA buttons", fixed: true, visible: true },
  { name: "Hero Layout", layout: "Hero Layout 1", desc: "Full-width hero section with heading, subheading and responsive background", visible: false },
  { name: "Hero Carousel", layout: "Full Page Carousel", desc: "Full-screen image carousel with heading and call to action", visible: true },
  { name: "About Us", layout: "Read More Text Section", desc: "Text section with a read more toggle", visible: true },
  { name: "Experience", layout: "Feature Cards Grid", desc: "Heading with a grid of feature cards", visible: true },
  { name: "Store Experience Single Item", layout: "Single Store Item Layout", desc: "Highlight one store item", visible: true },
  { name: "Collaborate With a Creator Built Around Movement and Culture", layout: "Four Cards Grid", desc: "Four cards in a grid", visible: true },
  { name: "Built for Snowboard Creators", layout: "Feature List With Side Image", desc: "Feature list next to an image", visible: true },
  { name: "Merchandise Listing", layout: "Store Items Grid Layout", desc: "Grid of store items", visible: true },
  { name: "Feed Content", layout: "Feed Posts Grid Layout", desc: "Grid of recent feed posts", visible: true },
  { name: "Event Ticketing", layout: "Event Tickets Banner Layout", desc: "Banner listing upcoming events", visible: true },
  { name: "Stats", layout: "Stats Cards", desc: "Number cards", visible: true },
  { name: "Portfolio", layout: "Portfolio Album Detail Layout", desc: "Portfolio album with details", visible: true },
  { name: "VIP Deals", layout: "VIP Deals Banner Layout", desc: "Banner listing VIP deals", visible: true },
  { name: "Newsletter Subscription", layout: "Newsletter Layout", desc: "Email sign-up block", visible: true },
  { name: "Free Form", layout: "Free Form Layout", desc: "Free-form rich content", visible: true },
  { name: "Footer", layout: "Footer Layout", desc: "Site footer with logo, description, store links and two link columns", fixed: true, visible: true },
];

// Fan-site copy used in the phone preview (P10). Leftovers are kept on purpose for Scene 6.
export const siteCopy = {
  heroLine1: "Where Balance Meets",
  heroLine2Plain: "the ",
  heroLine2Accent: "Frozen Edge",
  heroCta: "Join the Journey",
  aboutTitle: "About",
  about:
    "American snowboarder AJ White is taking his connection with supporters to the next level with the launch of his brand-new fan engagement website.",
  feedChips: ["Welcome", "Store", "Chat Room", "Leaderboards", "Competitions", "VIP Deals", "Videos", "Newsletters"],
};

// Simulated: the wrong social link the Scene 6 health check finds. DEMO DATA, not from the capture.
export const simulatedWrongSocialLink = "instagram.com/ajwhite_old";

/* ------------------------------------------------------------------------------------------------
 * Domain discovery (Scene: "I don't have a Domain Name"). ALL SIMULATED.
 * The assistant never invents availability or prices: they come from the domain service
 * (src/services/domainService.ts), which in this prototype reads these mocks. A real registrar API
 * replaces the mock service later without touching the UI.
 * ---------------------------------------------------------------------------------------------- */

/** Word from the creator's own bio, used for one themed suggestion. */
export const creatorNicheWord = "snow";

/**
 * Registrars the assistant can hand off to. Only public search/product pages are used (no carts,
 * no checkout links). `searchUrl` = the registrar's public domain-search page for that name.
 * Verify these open correctly in a browser before a live demo (registrars block automated checks).
 */
export const registrars: {
  id: string;
  name: string;
  note: string;
  searchUrl: ((domain: string) => string) | null;
  homeUrl: string;
}[] = [
  {
    id: "namecheap",
    name: "Namecheap",
    note: "Recommended by TopFan and fully compatible with setup.",
    searchUrl: (d) => `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(d)}`,
    homeUrl: "https://www.namecheap.com/",
  },
  {
    id: "godaddy",
    name: "GoDaddy",
    note: "Widely used. Works with TopFan.",
    searchUrl: (d) => `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(d)}`,
    homeUrl: "https://www.godaddy.com/",
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    note: "Needs a Cloudflare account. Search for the name after signing in.",
    searchUrl: null,
    homeUrl: "https://www.cloudflare.com/products/registrar/",
  },
];

/** Extensions the (mock) availability service can check. */
export const supportedTlds = ["com", "net", "co", "me", "club"];

/** Simulated first-year / renewal prices (USD per year) by registrar and extension. null = not available. */
export const mockPrices: Record<string, Record<string, { first: number; renewal: number } | null>> = {
  namecheap: { com: { first: 11, renewal: 16 }, net: { first: 13, renewal: 17 }, co: { first: 9, renewal: 30 }, me: null, club: { first: 3, renewal: 19 } },
  godaddy: { com: { first: 12, renewal: 22 }, net: { first: 15, renewal: 23 }, co: { first: 13, renewal: 38 }, me: { first: 8, renewal: 25 }, club: { first: 5, renewal: 23 } },
  cloudflare: { com: null, net: null, co: null, me: null, club: null },
};

/**
 * Deterministic mock availability, so the demo is repeatable.
 * - "taken": already registered.  - "flaky": the first check fails, a retry succeeds.
 * - "goneAtCheckout": available, but taken when re-checked before checkout.
 * Names not listed use a stable hash (see domainService).
 */
export const mockAvailability: Record<string, "available" | "taken" | "flaky" | "goneAtCheckout"> = {
  "ajwhite.com": "taken",
  "ajwhite.net": "taken",
  "ajwhitefans.com": "available",
  "teamajwhite.com": "flaky",
  "ajwhite.co": "available",
  "ajwhitesnow.com": "available",
  "ajwhite.club": "goneAtCheckout",
  "ajwhite.me": "available",
  "theajwhite.com": "available",
  "ajwhitehq.com": "available",
};

/** Registered names that already show a website (mock), so the assistant can suggest a sub-domain. */
export const mockExistingSites = ["ajwhite.com"];
