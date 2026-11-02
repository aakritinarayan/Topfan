/**
 * Posts (feed, drafts), livestreams, public social pages (welcome modal, chat room, leaderboards).
 * Owned by the Social build. Expand freely: keep the exported names (SocialState, initialSocial).
 * Actions are plain functions that mutate a draft: act("label", (d) => myAction(d, …)).
 */
import type { AppData } from "../store";
import type { Post } from "../model";

export interface SocialState {
  /* --- cross-section contract (keep these fields; others read them) --- */
  posts: Post[];
}

export const initialSocial: SocialState = {
  posts: [],
};

export type _Draft = AppData;
