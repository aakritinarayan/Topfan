import { ANYONE, CONTENT, type RouteDef } from "./types";

/** Home, Feed, New Post (Livestream is a modal), public social pages. Owned by the Social build. */
export const socialRoutes: RouteDef[] = [
  { id: "home", pattern: "/", title: "Home", section: "home", menu: "Sidebar › Home", layout: "marketing", access: ANYONE, status: "captured", spec: "10-home.md", shots: ["10-"] },
  { id: "newpost", pattern: "/dashboard/newpost", title: "New Post", section: "newpost", menu: "Sidebar › NEW POST", layout: "narrow", access: CONTENT, status: "captured", spec: "18-new-post.md", shots: ["18-", "18a-", "18b-", "18c-", "18d-", "18e-", "18f-", "18g-", "18h-", "18i-", "18j-"] },
  /* Inferred public pages reached from the Feed (chips / post cards). Static segments outrank /:handle. */
  { id: "post-detail", pattern: "/:handle/post/:postId", title: "Post", section: "feed", parent: "feed", menu: "Feed › post card (SEE POST / READ ARTICLE …)", layout: "dashboard", access: ANYONE, status: "inferred", note: "Single post page was not captured; URL and layout inferred." },
  { id: "chat-room", pattern: "/:handle/chat-room", title: "Chat Room", section: "feed", parent: "feed", menu: "Feed › CHAT ROOM", layout: "dashboard", access: ANYONE, status: "inferred", note: "Not captured; built from the Messages/Feed patterns." },
  { id: "leaderboards", pattern: "/:handle/leaderboards", title: "Leaderboards", section: "feed", parent: "feed", menu: "Feed › LEADERBOARDS", layout: "dashboard", access: ANYONE, status: "inferred", note: "Not captured; built from the Gamification/Insights table patterns." },
  /* Feed is the catch-all /:handle and is matched last (see routeCatalog.ts).
     Spec 11: it uses the creator shell (header + sticky left sidebar), so layout is "dashboard". */
  { id: "feed", pattern: "/:handle", title: "Feed", section: "feed", menu: "Sidebar › Feed", layout: "dashboard", access: ANYONE, status: "captured", spec: "11-feed.md", shots: ["11-", "11a-", "11b-"] },
];
