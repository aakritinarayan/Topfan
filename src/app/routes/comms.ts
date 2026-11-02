import { ANYONE, CREATOR, type RouteDef } from "./types";

/** Activity, Messages, Resources, Help & legal. Owned by the Comms build. */
export const commsRoutes: RouteDef[] = [
  { id: "activity", pattern: "/dashboard/activity", title: "Activity", section: "activity", menu: "Sidebar › Activity", layout: "bleed", access: CREATOR, status: "captured", spec: "12-activity.md", shots: ["12-", "12a-", "12x-"] },
  { id: "messages", pattern: "/messages", title: "Messages", section: "messages", menu: "Sidebar › Messages", layout: "bleed", access: CREATOR, status: "captured", spec: "13-messages.md", shots: ["13-", "13a-", "13b-", "13c-", "13d-", "13e-", "13f-", "13g-", "13h-", "13i-", "13j-", "13k-", "13x-"] },
  { id: "resources", pattern: "/resources", title: "Resources", section: "resources", menu: "Sidebar › Resources", layout: "dashboard", access: CREATOR, status: "captured", spec: "17-resources.md", redirect: "resources-announcements" },
  { id: "resources-announcements", pattern: "/resources/announcements", title: "Announcements", section: "resources", menu: "Sidebar › Resources › Announcements", layout: "dashboard", access: CREATOR, status: "captured", spec: "17-resources.md", shots: ["17-"] },
  { id: "resources-guides", pattern: "/resources/tips-tutorials", title: "Guides", section: "resources", menu: "Sidebar › Resources › Guides", layout: "dashboard", access: CREATOR, status: "captured", spec: "17-resources.md", shots: ["17a-"] },
  { id: "resources-providers", pattern: "/resources/service-providers", title: "Service Providers", section: "resources", menu: "Sidebar › Resources › Service Providers", layout: "dashboard", access: CREATOR, status: "captured", spec: "17-resources.md", shots: ["17b-"] },
  { id: "resources-support", pattern: "/resources/creator-support", title: "Creator Support", section: "resources", menu: "Sidebar › Resources › Creator Support", layout: "dashboard", access: CREATOR, status: "captured", spec: "17-resources.md", shots: ["17c-"] },
  { id: "help-faq", pattern: "/help-faq", title: "Help Center & FAQ", section: "help", menu: "Avatar menu › Help Center & FAQ", layout: "public", access: ANYONE, status: "captured", spec: "72-help-faq.md", shots: ["72-", "72a-"] },
  { id: "terms", pattern: "/terms-of-service", title: "Terms of Service", section: "help", menu: "Avatar menu › Terms & Privacy Policy", layout: "public", access: ANYONE, status: "captured", spec: "73-terms-and-privacy.md", shots: ["73-"] },
  { id: "privacy-policy", pattern: "/privacy-policy", title: "Privacy Policy", section: "help", menu: "Terms of Service › Privacy Policy", layout: "public", access: ANYONE, status: "captured", spec: "73-terms-and-privacy.md", shots: ["74-"] },
];
