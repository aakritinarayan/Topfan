/**
 * Shared entity types used across sections (the store's "contract"). Section-specific data lives in
 * its slice file. All data is fictional mock data.
 */
export type ID = string;

/** A fan of the creator (Insights & Fans owns the list; Messages, Groups and Wallet read it). */
export interface Fan {
  id: ID;
  name: string;
  username: string;
  avatar?: string | null;
  email: string;
  joinedAt: string; // ISO date
  subscription?: string | null; // plan name, e.g. "Gold Plan"
  totalSpent: number;
  engagement: number; // interactions (mock)
  recruited: number;
  groupIds: ID[];
  location?: string;
}

/** Preferences › Groups (micro-communities and restricted access). */
export interface Group {
  id: ID;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
}

/** Preferences › Topic Tags (feed filter; needs at least 2 active). */
export interface TopicTag {
  id: ID;
  name: string;
  active: boolean;
  createdAt: string;
}

export type PostType = "video" | "images" | "article" | "audio" | "reel" | "poll" | "giveaway" | "link" | "fundraiser" | "text";

export interface Post {
  id: ID;
  type: PostType;
  title?: string;
  text: string;
  createdAt: string;
  status: "published" | "draft";
  locked: boolean;
  price?: number;
  topicTagIds: ID[];
  groupIds: ID[];
  likes: number;
  comments: number;
  tips: number;
  views: number;
  media?: { kind: "image" | "video" | "audio"; placeholder: string }[];
  /** Extra per-type data (poll options, link URL, fundraiser goal…). */
  extra?: Record<string, unknown>;
}

export interface SubscriptionPlan {
  id: ID;
  name: string; // "Gold Plan"
  prices: { amount: number; months: 1 | 3 | 6 | 12; discountPct?: number; freeTrialDays?: number }[];
  benefits: string[];
  subscribers: number;
  active: boolean;
}

export interface EventItem {
  id: ID;
  title: string;
  date: string; // ISO
  location: string;
  description: string;
  kind: "event" | "competition" | "livestream";
  source: "native" | "bandsintown";
  tickets: { name: string; price: number; quantity: number; sold: number }[];
  image?: string | null;
  past?: boolean;
}

export interface Transaction {
  id: ID;
  date: string;
  type: string; // "Subscription", "Tip", "Paid Message", …
  description: string;
  fan?: string;
  amount: number;
  status: "Completed" | "Pending" | "Refunded" | "Failed";
}

export type Role = "creator" | "content" | "financial";

/** Preferences › Delegation. access per the observed types: "Content" or "Financial, Content". */
export interface Delegate {
  id: ID;
  firstName: string;
  lastName: string;
  email: string;
  access: ("Content" | "Financial")[];
  /** Revenue share % by stream (Delegate Details). */
  revenueShare: Record<string, number>;
  status: "Active" | "Pending" | "Inactive";
  addedAt: string;
}

export interface RefundRequest {
  id: ID;
  date: string;
  fan: string;
  item: string;
  type: string;
  amount: number;
  reason: string;
  status: "Pending" | "Approved" | "Declined";
}

export interface FulfillmentRequest {
  id: ID;
  date: string;
  fan: string;
  item: string; // e.g. an experience or merchandise
  type: string;
  status: "Pending" | "In Progress" | "Fulfilled" | "Cancelled";
}

export interface AdBrand {
  id: ID;
  name: string;
  status: "new" | "approved" | "declined";
  offer: string;
}

export interface Announcement {
  id: ID;
  title: string;
  date: string;
  body: string;
  read: boolean;
}

export interface AutomatedMessage {
  id: ID;
  event: string;
  text: string;
  active: boolean;
}

export type OutboundStepStatus = "Verified" | "Pending" | "Failed";
export interface OutboundEmail {
  domain: string;
  senderEmail: string;
  status: "not-set-up" | "pending" | "failed" | "verified";
  steps: { label: string; status: OutboundStepStatus }[];
  /** Records the creator must add (example values only). */
  records: { type: string; host: string; value: string }[];
  lastCheckedAt: string | null;
  errorDetail: string | null;
}
