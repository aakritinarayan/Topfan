/**
 * Sources the assistant may use to prepare the Cover Page (Account Setup & Navigation demo).
 *
 * SIMULATED: nothing here is fetched. The "website" and "social" entries are a fictional, authorized
 * fixture for the demo creator, standing in for what a real integration would return. A real build
 * would fetch the creator's own website server-side (URL validation, private-network blocking,
 * timeouts, public pages only) and read social profiles only through authorized integrations.
 * Every value the assistant prepares names the source it came from.
 */
export type SourceId = "profile" | "onboarding" | "website" | "instagram" | "facebook" | "x" | "ai";

export const SOURCE_LABEL: Record<SourceId, string> = {
  profile: "Your TopFan profile",
  onboarding: "Account setup",
  website: "Your website (simulated)",
  instagram: "Instagram (simulated, authorized)",
  facebook: "Facebook link",
  x: "X link",
  ai: "Written by AI from the sources above",
};

/** The creator's existing website, as a real fetch of its public pages might describe it. */
export const websiteFixture = {
  url: "https://ajwhite-riding.example",
  title: "AJ White | Freestyle Snowboarding",
  metaDescription: "Freestyle snowboarding from Breckenridge, Colorado: training, competition clips and life on the mountain.",
  metaKeywords: ["freestyle snowboarding", "snowboard training", "Breckenridge"],
  ogImage: { key: "creators/ajwhite/hero-2", width: 1920, height: 1080, alt: "Snowboarder mid-air on a bright mountain day" },
  /** Colors found in the site's stylesheet, with where they're used. */
  colors: [
    { hex: "#0e2a47", use: "header and section backgrounds" },
    { hex: "#f26b1d", use: "buttons and links" },
    { hex: "#f7c548", use: "decorative illustration accents" },
  ],
  /** Public images on the site the creator approved for reuse. */
  approvedImages: [
    { key: "creators/ajwhite/hero-2", width: 1920, height: 1080, alt: "Snowboarder mid-air on a bright mountain day" },
    { key: "creators/ajwhite/mountain-wide", width: 1600, height: 900, alt: "Wide mountain view above the park" },
    { key: "creators/ajwhite/slope-tall", width: 480, height: 720, alt: "Rider on a steep slope (small file)" },
  ],
};

/** Social links given during setup, and what access the demo has to each. */
export const socialFixture: {
  id: "instagram" | "facebook" | "x";
  url: string;
  access: "authorized" | "link-only" | "private";
  name?: string;
  bio?: string;
  profileImage?: string;
}[] = [
  {
    id: "instagram",
    url: "https://instagram.com/ajwhite",
    access: "authorized",
    name: "AJ White",
    bio: "Freestyle snowboarder · Breckenridge, CO · Training and competition clips",
    profileImage: "creators/ajwhite/avatar",
  },
  // No integration permission: the link is kept, nothing is read from it.
  { id: "facebook", url: "https://facebook.com/ajwhite", access: "link-only" },
  // Private account: the link is kept, nothing is read from it.
  { id: "x", url: "https://x.com/ajwhite", access: "private" },
];

/**
 * Demo outcomes on request: ?coverFixture=<id>.
 * no-website: the creator has no existing website · site-unreachable: it couldn't be accessed ·
 * no-photo: no usable cover image · publish-fail: Update & Publish fails once.
 */
export type CoverFixture = "no-website" | "site-unreachable" | "no-photo" | "publish-fail";
const FIXTURES: CoverFixture[] = ["no-website", "site-unreachable", "no-photo", "publish-fail"];
export const coverFixture: CoverFixture | null = (() => {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("coverFixture");
  return FIXTURES.includes(v as CoverFixture) ? (v as CoverFixture) : null;
})();
