/**
 * Page map for this area: route id → component.
 */
import type { PageMap } from "../types";
import { HomePage } from "./Home";
import { FeedPage } from "./Feed";
import { NewPostPage } from "./NewPost";
import { ChatRoomPage, LeaderboardsPage, PostDetailPage } from "./PublicPages";

export const pages: PageMap = {
  "home": HomePage,
  "newpost": NewPostPage,
  "feed": FeedPage,
  "post-detail": PostDetailPage,
  "chat-room": ChatRoomPage,
  "leaderboards": LeaderboardsPage,
};
