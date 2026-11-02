/**
 * Activity, Messages (inbox, lists, automated messages), Resources (announcements, guides, providers, support), Help & FAQ,
 * header menus (language, sign out). Owned by the Comms build. Keep the exported names (CommsState, initialComms).
 * Actions are plain functions that mutate a draft: act("comms.x", (d) => myAction(d, …), { need }).
 *
 * ALL people, messages and businesses below are fictional (spec names/messages are not copied).
 */
import type { AppData } from "../store";
import type { Announcement, AutomatedMessage } from "../model";
import { personAvatar } from "../../media";

/* ------------------------------------------------------------------ types */

export type ActivityKind = "tip-live" | "tip-post" | "follow" | "import";
export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  actorId: string | null; // null = the creator / system
  amount?: number;
  postExcerpt?: string;
  others?: number; // "and 1 other"
  date: string; // ISO date
  read: boolean;
  followedBack?: boolean;
}

export type FanBadge = "subscriber" | "trophy";
export interface Fan {
  id: string;
  name: string;
  badges: FanBadge[];
  /** Media key of the fan's illustrated avatar (personAvatar(id); same everywhere the fan appears). */
  avatar: string;
}

export type ChatBody =
  | { kind: "text"; text: string }
  | { kind: "tip"; text: string; amount: number }
  | { kind: "guaranteed"; text: string; amount: number }
  | { kind: "paid"; caption?: string; price: number; preview: "image" | "audio"; locked: "image" | "audio"; fileName?: string; /** media key of the free preview image */ previewMedia?: string | null }
  | { kind: "store"; caption: string; itemId: string }
  | { kind: "course"; itemId: string }
  | { kind: "audio"; seconds: number }
  | { kind: "media"; fileName: string }
  | { kind: "coupon"; code: string; percent: number };

export interface ChatMessage {
  id: string;
  from: "creator" | "fan";
  at: string; // ISO datetime (local)
  body: ChatBody;
}

export interface Conversation {
  id: string;
  fanId: string;
  folder: "priority" | "general";
  unread: boolean;
  /** Relative time label as the list shows it ("5 Months Ago"). */
  ago: string;
  preview: string;
  messages: ChatMessage[];
}

export interface MessageList {
  id: string;
  name: string;
  fanIds: string[];
  /** Built-in segments added to the list (e.g. "Top 20 Spenders"). */
  segments: string[];
  ago: string;
  messages: ChatMessage[];
}

export interface StoreItemOption {
  label: string;
  price: number;
}
export interface ChatStoreItem {
  id: string;
  type: "experience" | "course";
  title: string;
  subtitle: string;
  description: string;
  options: StoreItemOption[];
  price?: number;
  /** Monetize product this store item sells (its image is read from there when set). */
  productId?: string;
  /** Media key fallback when the linked product has no image. */
  image?: string | null;
}

export interface FanProfile {
  location: string;
  birthdate: string;
  gender: string;
  email: string;
  phone: string;
  shipping: [string, string];
  lifetimeSpend: string;
  lifetimeEngagement: string;
  lifetimeRecruitment: string;
  registered: string;
  lastSession: string;
  lastEngagement: string;
  statuses: string[];
  notes: string;
  badge: string;
  groups: string;
  loyalty: string;
  purchases: { date: string; type: string; item: string; amount: string; thumb: "image" | "subscription"; /** media key for image thumbs */ image?: string | null }[];
  engagement: { date: string; type: string; caption: string; /** media key of the engaged post */ image?: string | null }[];
  recruits: { date: string; fanId: string | "creator" }[];
}

export type ResourceAnnouncement = Announcement & { likes: number; comments: number; ago: string; tint: string };
export interface ResourceGuide {
  id: string;
  title: string;
  likes: number;
  comments: number;
  ago: string;
  tint: string;
  body: string;
}
export interface ServiceProvider {
  id: string;
  name: string;
  category: "Merchandise" | "Content Support" | "Professional Services";
  description: string;
  tint: string | null; // null = no image (dark gradient only)
}

export interface SupportRequest {
  id: string;
  type: string;
  text: string;
  at: string;
  from: "creator-support" | "help-center";
}

export type CommsAutomatedMessage = AutomatedMessage & { attachment?: string | null; price?: number | null; createdAt: string };

export interface CommsState {
  /* --- cross-section contract (keep these fields; others read them) --- */
  announcements: ResourceAnnouncement[];
  automatedMessages: CommsAutomatedMessage[];
  unreadMessages: number;
  /* --- Comms-only --- */
  activity: ActivityItem[];
  fans: Fan[];
  conversations: Conversation[];
  messageLists: MessageList[];
  storeItems: ChatStoreItem[];
  fanProfiles: Record<string, FanProfile>;
  guides: ResourceGuide[];
  providers: ServiceProvider[];
  supportRequests: SupportRequest[];
  language: string;
  /** Mock session flag for the avatar menu's Sign Out (demo only). */
  signedOut: boolean;
}

/* ------------------------------------------------------------------ seed (fictional) */

const fans: Fan[] = ([
  { id: "f-marcus", name: "Marcus Bell", badges: ["subscriber", "trophy"] },
  { id: "f-summit", name: "Summit Line Band", badges: ["subscriber"] },
  { id: "f-theo", name: "Theo Grant", badges: ["subscriber", "trophy"] },
  { id: "f-owen", name: "Owen Pratt", badges: ["subscriber"] },
  { id: "f-luis", name: "Luis Moreno", badges: ["subscriber"] },
  { id: "f-caleb", name: "Caleb Ward", badges: ["subscriber"] },
  { id: "f-nate", name: "Nate Fischer", badges: ["subscriber"] },
  { id: "f-peak", name: "Peak Crew", badges: ["trophy"] },
  { id: "f-rowan", name: "Balance With Rowan", badges: [] },
  { id: "f-harbor", name: "Bright Harbor Co", badges: [] },
  { id: "f-sasha", name: "Sasha Lind", badges: [] },
  { id: "f-cascade", name: "Cascade Outdoor Club", badges: [] },
  { id: "f-harper", name: "Harper Quinn", badges: [] },
  { id: "f-ivy", name: "Ivy Collins", badges: [] },
  { id: "f-ezra", name: "Ezra Stone", badges: [] },
  { id: "f-mia", name: "Mia Rivers", badges: [] },
  { id: "f-jonah", name: "Jonah Price", badges: [] },
  { id: "f-dean", name: "Dean Holt", badges: [] },
  { id: "f-ronan", name: "Ronan Avery", badges: [] },
  { id: "f-kai", name: "Kai Morgan", badges: [] },
  { id: "f-ella", name: "Ella Dunn", badges: [] },
  { id: "f-isla", name: "Isla Reed", badges: [] },
  { id: "f-ben", name: "Ben Kessler", badges: [] },
  { id: "f-rob", name: "Rob Delgado", badges: [] },
  { id: "f-paige", name: "Paige Barton", badges: [] },
  { id: "f-dylan", name: "Dylan Cross", badges: [] },
  { id: "f-ava", name: "Ava Lin", badges: [] },
  { id: "f-leo", name: "Leo Hart", badges: [] },
  { id: "f-alexa", name: "Alexa Moore", badges: [] },
  { id: "f-cory", name: "Cory Sands", badges: [] },
  { id: "f-gwen", name: "Gwen Talley", badges: [] },
] as Omit<Fan, "avatar">[]).map((f) => ({ ...f, avatar: personAvatar(f.id) }));

const m = (id: string, from: "creator" | "fan", at: string, body: ChatBody): ChatMessage => ({ id, from, at, body });

/** Thread with the demo fan, oldest first (neutral, invented messages). */
const marcusThread: ChatMessage[] = [
  m("mm1", "fan", "2025-07-29T18:02", { kind: "tip", text: "Hi AJ, big fan here. When are you riding in Utah next?", amount: 10 }),
  m("mm2", "fan", "2025-07-29T18:05", { kind: "tip", text: "Hi AJ", amount: 5 }),
  m("mm3", "fan", "2025-07-29T18:09", { kind: "tip", text: "hello", amount: 10 }),
  m("mm4", "fan", "2025-07-30T09:15", { kind: "guaranteed", text: "Hi AJ!", amount: 20 }),
  m("mm5", "fan", "2025-08-07T20:47", { kind: "tip", text: "Hey AJ!", amount: 5 }),
  m("mm6", "creator", "2025-08-27T02:56", { kind: "paid", price: 1, preview: "image", locked: "audio", previewMedia: "posts/on-the-hill" }),
  m("mm7", "creator", "2025-09-02T14:10", { kind: "store", caption: "Check this out", itemId: "si-video" }),
  m("mm8", "creator", "2025-09-02T14:12", { kind: "store", caption: "Just store item", itemId: "si-call" }),
  m("mm9", "creator", "2025-09-03T11:30", { kind: "course", itemId: "si-course" }),
  m("mm10", "creator", "2025-09-05T16:40", { kind: "audio", seconds: 2 }),
  m("mm11", "creator", "2025-09-08T20:21", { kind: "text", text: "hi" }),
  m("mm12", "creator", "2025-11-10T20:58", { kind: "text", text: "hello" }),
  m("mm13", "creator", "2025-11-10T20:59", { kind: "text", text: "How are you?" }),
  m("mm14", "fan", "2026-02-27T10:42", { kind: "text", text: "Great run today!" }),
  m("mm15", "creator", "2026-05-19T03:57", { kind: "paid", price: 5, preview: "image", locked: "image", previewMedia: "posts/big-air" }),
];

const conv = (id: string, fanId: string, folder: "priority" | "general", ago: string, preview: string, extra: Partial<Conversation> = {}): Conversation => ({
  id,
  fanId,
  folder,
  unread: false,
  ago,
  preview,
  messages: preview ? [m(`${id}-1`, "creator", "2025-06-01T12:00", { kind: "text", text: preview })] : [],
  ...extra,
});

const conversations: Conversation[] = [
  conv("c-marcus", "f-marcus", "priority", "5 Months Ago", "Media", { unread: true, messages: marcusThread }),
  conv("c-summit", "f-summit", "priority", "8 Months Ago", "New Merch Drop", { messages: [m("cs1", "fan", "2026-02-20T15:00", { kind: "text", text: "New Merch Drop" })] }),
  conv("c-theo", "f-theo", "priority", "A Year Ago", "Hello", { messages: [m("ct1", "fan", "2025-10-02T09:00", { kind: "text", text: "Hello" })] }),
  conv("c-owen", "f-owen", "priority", "A Year Ago", ""),
  conv("c-luis", "f-luis", "priority", "A Year Ago", "Sorry Luis, let me send you a new link to the clinic signup."),
  conv("c-caleb", "f-caleb", "priority", "2 Years Ago", "Hi my subs!"),
  conv("c-nate", "f-nate", "priority", "2 Years Ago", "Hi my subs!"),
  conv("c-peak", "f-peak", "general", "A Month Ago", "Hi", { messages: [m("cp1", "fan", "2026-10-01T12:00", { kind: "text", text: "Hi" })] }),
  conv("c-rowan", "f-rowan", "general", "2 Months Ago", "Hi AJ, I would like to wish you the best of luck this season!", {
    messages: [m("cr1", "fan", "2026-09-01T08:30", { kind: "text", text: "Hi AJ, I would like to wish you the best of luck this season!" })],
  }),
  conv("c-harbor", "f-harbor", "general", "5 Months Ago", "Media"),
  conv("c-sasha", "f-sasha", "general", "5 Months Ago", "Media"),
  conv("c-cascade", "f-cascade", "general", "6 Months Ago", "Come join us!", { messages: [m("cc1", "fan", "2026-04-10T10:00", { kind: "text", text: "Come join us!" })] }),
  conv("c-harper", "f-harper", "general", "7 Months Ago", "Media"),
  conv("c-ivy", "f-ivy", "general", "7 Months Ago", "Media"),
  conv("c-ezra", "f-ezra", "general", "8 Months Ago", "yes"),
  conv("c-mia", "f-mia", "general", "9 Months Ago", "Hey buddy"),
  conv("c-jonah", "f-jonah", "general", "10 Months Ago", "hi"),
  conv("c-dean", "f-dean", "general", "10 Months Ago", "hi"),
  conv("c-ronan", "f-ronan", "general", "A Year Ago", "Hey Ronan"),
  conv("c-kai", "f-kai", "general", "A Year Ago", "What's Up!"),
  conv("c-ella", "f-ella", "general", "A Year Ago", "Here's a tip"),
  conv("c-isla", "f-isla", "general", "2 Years Ago", "Hi my subs!"),
  conv("c-ben", "f-ben", "general", "2 Years Ago", "Hi my subs!"),
  conv("c-rob", "f-rob", "general", "2 Years Ago", "Sleep well friends!"),
  conv("c-paige", "f-paige", "general", "2 Years Ago", "Sleep well friends!"),
  conv("c-dylan", "f-dylan", "general", "2 Years Ago", "Sleep well friends!"),
];

const list = (id: string, name: string, fanIds: string[], ago: string): MessageList => ({ id, name, fanIds, segments: [], ago, messages: [] });

/** Built-in recipient segments offered in "Create New Direct Message List" (product labels). */
export const RECIPIENT_SEGMENTS = [
  "Fans and Subscribers",
  "All Current Subscribers",
  "Current Fans",
  "Previously Paid Subscribers",
  "Top 20 Spenders",
  "Prior Paid DM Users",
  "Gold Plan Subscribers",
  "Silver Plan Subscribers",
  "Bronze Plan Subscribers",
];

/** Event types offered by "Setup Automated Messages" (P13k). */
export const AUTOMATED_EVENT_TYPES = ["Fan Registers", "Fan Purchases Subscription", "Fan Purchases Content Post", "Fan's Birthday"];

/** Inquiry types of the Creator Support form (P17c). */
export const INQUIRY_TYPES = [
  "Account Issue",
  "Payment Issue",
  "Technical Problem",
  "New Feature Suggestion",
  "Intellectual Property Matter",
  "Inappropriate Content or User",
  "Currency Change Request",
];

/** Language switcher options, in the product's order and native scripts (P70). */
export const LANGUAGES = [
  "English", "Español", "Français", "Deutsch", "中文（普通话）", "हिन्दी", "日本語", "العربية", "한국어", "বাংলা", "Português", "Русский",
  "اردو", "Bahasa Indonesia", "मराठी", "తెలుగు", "Türkçe", "தமிழ்", "粵語", "Tiếng Việt", "Tagalog / Filipino", "فارسی", "Italiano", "Hausa",
  "Kiswahili", "ไทย", "ગુજરાતી", "Polski", "پښتو", "ಕನ್ನಡ", "മലയാളം", "አማርኛ", "ଓଡ଼ିଆ", "မြန်မာ", "پنجابی", "Basa Sunda", "Українська", "Norsk",
  "Suomi", "Ελληνικά", "Magyar", "Română", "עברית",
];

const marcusProfile: FanProfile = {
  location: "Frisco, Colorado, United States",
  birthdate: "June 12, 1985 (41 Years 4 Months)",
  gender: "Male",
  email: "marcus.bell@example.com",
  phone: "(+1) 555-0142",
  shipping: ["12 Example Lane", "Frisco, Colorado, US 80000"],
  lifetimeSpend: "$12,480.25 (Ranked #1)",
  lifetimeEngagement: "287 Engagements (Ranked #1)",
  lifetimeRecruitment: "1 Recruitments (Ranked #3)",
  registered: "Mar 27, 2025, 10:03 AM IST",
  lastSession: "Oct 31, 2026, 4:51 AM IST",
  lastEngagement: "Oct 30, 2026, 12:08 AM IST",
  statuses: ["Follower", "Subscriber", "Newsletter Recipient", "Purchaser", "Content Engager"],
  notes: "Marcus wants tips on park lines for next season",
  badge: "Gold Level",
  groups: "-",
  loyalty: "1,640 Points",
  purchases: [
    { date: "Oct 29, 2026", type: "Livestream Tip", item: "Livestream Tip", amount: "$5.00", thumb: "image", image: "videos/livestream-preview" },
    { date: "Oct 25, 2026", type: "Subscription", item: "Bronze Plan", amount: "$5.00", thumb: "subscription" },
    { date: "Oct 25, 2026", type: "Subscription", item: "Gold Plan", amount: "$67.50", thumb: "subscription" },
    { date: "Sep 25, 2026", type: "Subscription", item: "Bronze Plan", amount: "$5.00", thumb: "subscription" },
    { date: "Aug 25, 2026", type: "Subscription", item: "Bronze Plan", amount: "$5.00", thumb: "subscription" },
    { date: "Aug 15, 2026", type: "Merchandise", item: "Team Hoodie", amount: "$86.00", thumb: "image", image: "merchandise/hoodie" },
    { date: "Jul 25, 2026", type: "Subscription", item: "Bronze Plan", amount: "$5.00", thumb: "subscription" },
    { date: "Jul 25, 2026", type: "Subscription", item: "Gold Plan", amount: "$67.50", thumb: "subscription" },
    { date: "Jul 25, 2026", type: "Merchandise", item: "Signed Board Graphic", amount: "$240.00", thumb: "image", image: "merchandise/signature-series" },
    { date: "Jun 02, 2026", type: "Event Ticket", item: "Summer Camp 2026", amount: "$150.00", thumb: "image", image: "events/poster" },
  ],
  engagement: [
    { date: "Oct 30, 2026", type: "Image", caption: "Some of my favorite shots from the last contest!", image: "posts/contest-1" },
    { date: "Oct 30, 2026", type: "Image", caption: "First day back on snow! Thanks for your support, go team!", image: "posts/on-the-hill" },
    { date: "Oct 30, 2026", type: "Poll", caption: "Which board should I ride at the next contest? #Sports", image: "posts/two-boards" },
    { date: "Oct 30, 2026", type: "Fundraiser", caption: "Help me raise money for my training season this winter!", image: "posts/fundraiser" },
    { date: "Oct 30, 2026", type: "Image", caption: "Getting BIG air at the park last weekend #snowboarding", image: "posts/big-air" },
    { date: "Oct 30, 2026", type: "Link", caption: "My new interview is live", image: "posts/podcast-cover" },
    { date: "Oct 30, 2026", type: "Audio", caption: "Quick voice note from the lift", image: "posts/podcast" },
    { date: "Oct 30, 2026", type: "Video", caption: "Full run from the slopestyle final", image: "videos/slopestyle" },
    { date: "Oct 30, 2026", type: "Article", caption: "How I prep my board before a contest", image: "posts/riding-switch" },
  ],
  recruits: [
    { date: "Apr 8, 2026", fanId: "creator" },
    { date: "Apr 1, 2026", fanId: "f-leo" },
    { date: "Mar 31, 2026", fanId: "f-marcus" }, // source quirk reproduced: the fan appears in his own recruit list
  ],
};

export const initialComms: CommsState = {
  announcements: [
    {
      id: "an1",
      title: "Webinar: User Adoption",
      date: "2026-03-30",
      body: "Join our next live webinar to learn simple ways to bring more of your fans onto your TopFan site and keep them coming back. (Sample announcement text.)",
      read: false,
      likes: 1,
      comments: 3,
      ago: "7 months ago",
      tint: "#4aa89a",
    },
    {
      id: "an2",
      title: "Subscription Update",
      date: "2026-03-28",
      body: "Subscription plans now support more flexible billing options. Review your plans under Monetize › Subscription. (Sample announcement text.)",
      read: true,
      likes: 1,
      comments: 2,
      ago: "7 months ago",
      tint: "#5a3fd6",
    },
  ],
  automatedMessages: [], // spec: none by default (empty state 13i)
  unreadMessages: 1,
  activity: [
    { id: "ac1", kind: "tip-live", actorId: "f-marcus", amount: 5, date: "2026-10-29", read: false },
    { id: "ac2", kind: "follow", actorId: "f-ava", others: 1, date: "2026-10-29", read: false },
    { id: "ac3", kind: "tip-post", actorId: "f-owen", amount: 5.7, postExcerpt: "First day back on snow! Thanks for your support, go", date: "2026-03-30", read: false },
    { id: "ac4", kind: "import", actorId: null, date: "2026-03-25", read: false },
    { id: "ac5", kind: "tip-post", actorId: "f-owen", amount: 5.74, postExcerpt: "Just got back from a week of riding in Japan.", date: "2026-03-25", read: false },
    { id: "ac6", kind: "tip-post", actorId: "f-marcus", amount: 1, postExcerpt: "First day back on snow! Thanks for your support, go", date: "2026-03-24", read: false },
    { id: "ac7", kind: "tip-post", actorId: "f-marcus", amount: 1, postExcerpt: "Hey guys, I need your help raising money to sup", date: "2026-03-24", read: false },
    { id: "ac8", kind: "tip-post", actorId: "f-marcus", amount: 1, postExcerpt: "First day back on snow! Thanks for your support, go", date: "2026-03-24", read: false },
    { id: "ac9", kind: "tip-post", actorId: "f-marcus", amount: 1, postExcerpt: "First day back on snow! Thanks for your support, go", date: "2026-03-24", read: false },
  ],
  fans,
  conversations,
  messageLists: [
    list("ml1", "Copper Crew 1", ["f-theo", "f-owen"], "5 Months Ago"),
    list("ml2", "Testing", ["f-luis"], "7 Months Ago"),
    list("ml3", "Best Followers", ["f-marcus"], "7 Months Ago"),
    list("ml4", "Copper Crew", ["f-caleb", "f-nate"], "8 Months Ago"),
    list("ml5", "BC", ["f-peak", "f-rowan", "f-harbor", "f-sasha", "f-cascade", "f-harper", "f-ivy", "f-ezra", "f-mia"], "10 Months Ago"),
    list("ml6", "Park Riders", ["f-kai", "f-ella"], "2 Years Ago"),
  ],
  storeItems: [
    {
      id: "si-video",
      type: "experience",
      title: "Personalized Video",
      subtitle: "A Custom Shout-Out",
      description: "I'll record a short personalized video for you or a friend.",
      options: [{ label: "Up to 60 Second Video", price: 50 }],
      productId: "exp-personal-video",
      image: "experiences/personal-video",
    },
    {
      id: "si-call",
      type: "experience",
      title: "One to One Call / Video Conferencing",
      subtitle: "Live Video Call with Me",
      description: "We will do a video call where I can show you how to tune your snowboard or answer any of your questions about riding technique!",
      options: [
        { label: "15 Minutes", price: 100 },
        { label: "30 Minutes", price: 150 },
        { label: "45 Minutes", price: 200 },
      ],
      productId: "exp-video-call",
      image: "experiences/video-call",
    },
    {
      id: "si-course",
      type: "course",
      title: "Learn How to Snowboard",
      subtitle: "3 part course",
      description: "In this 3 part course, I'll walk you through riding the main types of terrain: moguls, trees, and the terrain park.",
      options: [],
      price: 60,
      productId: "course-learn",
      image: "courses/learn-to-snowboard",
    },
  ],
  fanProfiles: { "f-marcus": marcusProfile },
  guides: [
    { id: "g1", title: "Let's Get Started", likes: 2, comments: 1, ago: "17 months ago", tint: "#f08a12", body: "A quick tour of your creator dashboard: set up your profile, post your first content and invite your fans. (Sample guide text.)" },
    { id: "g2", title: "Feed Content Overview", likes: 1, comments: 1, ago: "17 months ago", tint: "#f2f2f2", body: "Learn the post types you can publish to your feed and when to use each one. (Sample guide text.)" },
    { id: "g3", title: "Driving Users To TopFans", likes: 0, comments: 0, ago: "17 months ago", tint: "#2f6fdc", body: "Ideas for sharing your site link on social channels so fans join you here. (Sample guide text.)" },
    { id: "g4", title: "Creating An Experience: Custom Experience", likes: 0, comments: 0, ago: "17 months ago", tint: "#17b3c9", body: "Offer a custom experience in your store and decide how fans book it. (Sample guide text.)" },
    { id: "g5", title: "Creating An Experience: One To One Call", likes: 0, comments: 0, ago: "17 months ago", tint: "#c86fd6", body: "Set up a bookable one-to-one video call with time options and prices. (Sample guide text.)" },
  ],
  providers: [
    {
      id: "sp1",
      name: "Summit Thread Co.",
      category: "Merchandise",
      description:
        "Summit Thread Co. Helps You Turn Your Brand Into Revenue With Custom Merch And No Upfront Costs. We Handle Design, Production, Fulfillment, And Storefront Setup, Plus Real-Time Sales Tracking And Marketing Tools.",
      tint: "#2c8f4e",
    },
    {
      id: "sp2",
      name: "Studio North Productions",
      category: "Content Support",
      description:
        "Here At Studio North We Strive To Take What Is In Your Head And Bring It To Life On The Web, From Video Edits To Full Site Builds.",
      tint: null,
    },
  ],
  supportRequests: [],
  language: "English",
  signedOut: false,
};

/* ------------------------------------------------------------------ selectors / helpers */

export const fanById = (d: AppData, id: string | null | undefined) => d.comms.fans.find((f) => f.id === id);

/** Number of unread conversations (what the sidebar badge shows). */
export const countUnreadConversations = (c: CommsState) => c.conversations.filter((x) => x.unread).length;

const syncUnread = (d: AppData) => {
  d.comms.unreadMessages = countUnreadConversations(d.comms);
};

let seq = 0;
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;
const nowLocalIso = () => {
  const n = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}T${pad(n.getHours())}:${pad(n.getMinutes())}`;
};

/** Short preview text for a message (conversation list). */
export function previewOf(b: ChatBody): string {
  switch (b.kind) {
    case "text":
      return b.text;
    case "tip":
    case "guaranteed":
      return b.text;
    case "coupon":
      return "Coupon";
    default:
      return "Media";
  }
}

/* ------------------------------------------------------------------ actions: Activity */

/** Mark one activity notification as read. */
export function markActivityRead(d: AppData, id: string) {
  const a = d.comms.activity.find((x) => x.id === id);
  if (a) a.read = true;
}

/** "MARK ALL AS READ": mark every activity notification as read. */
export function markAllActivityRead(d: AppData) {
  d.comms.activity.forEach((a) => (a.read = true));
}

/** "FOLLOW" on a new-follower notification: follow the fan back (mock flag). */
export function followBack(d: AppData, id: string) {
  const a = d.comms.activity.find((x) => x.id === id);
  if (a) {
    a.followedBack = true;
    a.read = true;
  }
}

/* ------------------------------------------------------------------ actions: Messages */

/** Open a conversation: marks it read and updates the sidebar's unread count. */
export function markConversationRead(d: AppData, conversationId: string) {
  const c = d.comms.conversations.find((x) => x.id === conversationId);
  if (c) c.unread = false;
  syncUnread(d);
}

/** Find (or create, in General) the 1:1 conversation with a fan. Returns its id. */
export function startConversation(d: AppData, fanId: string): string {
  const existing = d.comms.conversations.find((c) => c.fanId === fanId);
  if (existing) return existing.id;
  const id = newId("c");
  d.comms.conversations.unshift({ id, fanId, folder: "general", unread: false, ago: "Just Now", preview: "", messages: [] });
  return id;
}

/** Send a direct message (text, paid media, store item, coupon, audio, media) to one fan. Needs content.write. */
export function sendDirectMessage(d: AppData, conversationId: string, body: ChatBody) {
  const c = d.comms.conversations.find((x) => x.id === conversationId);
  if (!c) return;
  c.messages.push({ id: newId("msg"), from: "creator", at: nowLocalIso(), body });
  c.preview = previewOf(body);
  c.ago = "Just Now";
  c.unread = false;
  // the list is ordered by most recent activity
  d.comms.conversations = [c, ...d.comms.conversations.filter((x) => x.id !== c.id)];
  syncUnread(d);
}

/** Broadcast a message to every recipient of a Direct Message List (Confirm tier). Needs content.write. */
export function sendToMessageList(d: AppData, listId: string, body: ChatBody) {
  const l = d.comms.messageLists.find((x) => x.id === listId);
  if (!l) return;
  l.messages.push({ id: newId("msg"), from: "creator", at: nowLocalIso(), body });
  l.ago = "Just Now";
  d.comms.messageLists = [l, ...d.comms.messageLists.filter((x) => x.id !== l.id)];
}

/** Create a Direct Message List from segments and individual fans. Returns its id. Needs content.write. */
export function createMessageList(d: AppData, name: string, fanIds: string[], segments: string[]): string {
  const id = newId("ml");
  d.comms.messageLists.unshift({ id, name: name.trim(), fanIds, segments, ago: "Just Now", messages: [] });
  return id;
}

/** Delete a Direct Message List. Needs content.write. */
export function deleteMessageList(d: AppData, listId: string) {
  d.comms.messageLists = d.comms.messageLists.filter((l) => l.id !== listId);
}

/** Recipient count shown for a list ("N Recipients"). Segments count as one recipient group each (inferred). */
export const listRecipientCount = (l: MessageList) => l.fanIds.length + l.segments.length;

/** Save a fan's notes (Fan Information › Fan Notes ✎). Needs content.write. */
export function saveFanNotes(d: AppData, fanId: string, notes: string) {
  const p = d.comms.fanProfiles[fanId];
  if (p) p.notes = notes;
}

/* ------------------------------------------------------------------ actions: Automated messages */

/** Create an automated message for an event type (Confirm tier: it sends automatically). Needs content.write. */
export function saveAutomatedMessage(d: AppData, input: { event: string; text: string; attachment?: string | null; price?: number | null }) {
  d.comms.automatedMessages.push({
    id: newId("am"),
    event: input.event,
    text: input.text,
    active: true,
    attachment: input.attachment ?? null,
    price: input.price ?? null,
    createdAt: nowLocalIso(),
  });
}

/** Update an existing automated message. Needs content.write. */
export function updateAutomatedMessage(d: AppData, id: string, input: { event: string; text: string; attachment?: string | null; price?: number | null }) {
  const a = d.comms.automatedMessages.find((x) => x.id === id);
  if (!a) return;
  a.event = input.event;
  a.text = input.text;
  a.attachment = input.attachment ?? null;
  a.price = input.price ?? null;
}

/** Turn an automated message on/off. Needs content.write. */
export function toggleAutomatedMessage(d: AppData, id: string) {
  const a = d.comms.automatedMessages.find((x) => x.id === id);
  if (a) a.active = !a.active;
}

/** Delete an automated message. Needs content.write. */
export function deleteAutomatedMessage(d: AppData, id: string) {
  d.comms.automatedMessages = d.comms.automatedMessages.filter((a) => a.id !== id);
}

/* ------------------------------------------------------------------ actions: Resources / help */

/** Open an announcement: marks it read (the sidebar Resources badge counts unread announcements). */
export function markAnnouncementRead(d: AppData, id: string) {
  const a = d.comms.announcements.find((x) => x.id === id);
  if (a) a.read = true;
}

/** Submit the Creator Support / Help Center contact form (mock: stored locally, nothing is sent). */
export function submitSupportRequest(d: AppData, type: string, text: string, from: SupportRequest["from"] = "creator-support") {
  d.comms.supportRequests.push({ id: newId("sr"), type, text: text.trim(), at: nowLocalIso(), from });
}

/* ------------------------------------------------------------------ actions: header menus */

/** Language switcher: remember the chosen language (mock: UI copy stays English). */
export function setLanguage(d: AppData, language: string) {
  d.comms.language = language;
}

/** Avatar menu › Sign Out (mock session flag). */
export function signOut(d: AppData) {
  d.comms.signedOut = true;
}

/** Sign back in after the mock Sign Out. */
export function signIn(d: AppData) {
  d.comms.signedOut = false;
}

export type _Draft = AppData;
