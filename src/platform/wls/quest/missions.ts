/**
 * Creator Quest missions. Takeaways and features name only things in the TopFan references
 * (Monetize sub-tabs, Messages, Livestream, Newsletters, White Label Site + Cover Page, Insights & Fans).
 * All in-game numbers are fictional game data.
 */
export type MissionId = "revenue" | "superfan" | "hq" | "insight";

export interface Mission {
  id: MissionId;
  name: string;
  topic: string;
  objective: string;
  /** one-line card description on the quest picker */
  tagline: string;
  duration: string;
  takeaway: string;
  /** related TopFan feature, as named in the product */
  feature: { label: string; where: string; nav: string };
  /** non-game summary for creators who'd rather read */
  summary: string;
}

export const MISSIONS: Mission[] = [
  {
    id: "revenue",
    name: "Fan Revenue Rush",
    topic: "Monetization",
    objective: "Collect offer ideas, then launch the one your fans are asking for.",
    tagline: "Discover ways to earn from your fans.",
    duration: "1 min",
    takeaway: "Different fans value different things. TopFan helps creators offer content and experiences their communities care about.",
    feature: { label: "Monetize", where: "Monetize › Subscriptions, Experiences, Merchandise, VIP Offers", nav: "nav-monetize" },
    summary: "Income can come from exclusive content, merchandise or fan experiences. The offers that work best are the ones that match what your fans already ask for.",
  },
  {
    id: "superfan",
    name: "Superfan Signal",
    topic: "Community Engagement",
    objective: "Carry each fan signal to the group that cares about it.",
    tagline: "Learn how to engage your community.",
    duration: "2 min",
    takeaway: "Strong fan communities grow through meaningful, relevant interactions — not just follower counts.",
    feature: { label: "Messages, Livestream & Newsletters", where: "Messages, the Livestream button and Monetize › Newsletters", nav: "nav-messages" },
    summary: "Different groups of fans want different things: behind-the-scenes posts, live moments or exclusive updates. Reaching each group with what it cares about builds a stronger community.",
  },
  {
    id: "hq",
    name: "Build Your Fan HQ",
    topic: "Brand Ownership",
    objective: "Connect your content, community, experiences and store to one home.",
    tagline: "Bring your content and community together.",
    duration: "2 min",
    takeaway:
      "Social platforms help people discover you. Your own fan destination gives your community a place to find your content, experiences, and offerings together.",
    feature: { label: "White Label Site & Cover Page", where: "Preferences › White Label Site (Cover Page editor)", nav: "" },
    summary: "Your white label site brings your posts, community, experiences and store together under your own domain, with a cover page you design.",
  },
  {
    id: "insight",
    name: "Fan Insight Explorer",
    topic: "Audience Insights",
    objective: "Find fan signals, spot the pattern, and decide what to make next.",
    tagline: "Understand your fans and their interests.",
    duration: "2 min",
    takeaway: "Understanding what your fans engage with can help you choose what to create next.",
    feature: { label: "Insights & Fans", where: "Insights & Fans", nav: "nav-insights & fans" },
    summary: "Looking at what fans actually engage with, rather than guessing, helps you pick your next post, live session or offer.",
  },
];

export const missionById = (id: MissionId) => MISSIONS.find((m) => m.id === id)!;
