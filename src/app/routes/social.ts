import { ANYONE, CONTENT, type RouteDef } from "./types";

/** Home, Feed, New Post (Livestream is a modal), public social pages. Owned by the Social build. */
export const socialRoutes: RouteDef[] = [
  { id: "home", pattern: "/", title: "Home", section: "home", menu: "Sidebar › Home", layout: "marketing", access: ANYONE, status: "captured", spec: "10-home.md", shots: ["10-"] },
  { id: "newpost", pattern: "/dashboard/newpost", title: "New Post", section: "newpost", menu: "Sidebar › NEW POST", layout: "narrow", access: CONTENT, status: "captured", spec: "18-new-post.md", shots: ["18-", "18a-", "18b-", "18c-", "18d-", "18e-", "18f-", "18g-", "18h-", "18i-", "18j-"] },
  /* Feed is the catch-all /:handle and is matched last (see routeCatalog.ts). */
  { id: "feed", pattern: "/:handle", title: "Feed", section: "feed", menu: "Sidebar › Feed", layout: "public", access: ANYONE, status: "captured", spec: "11-feed.md", shots: ["11-", "11a-", "11b-"] },
];
