/**
 * Activity, Messages (inbox, lists, automated messages), Resources (announcements, guides, providers, support), Help & FAQ.
 * Owned by the Comms build. Expand freely: keep the exported names (CommsState, initialComms).
 * Actions are plain functions that mutate a draft: act("label", (d) => myAction(d, …)).
 */
import type { AppData } from "../store";
import type { Announcement, AutomatedMessage } from "../model";

export interface CommsState {
  /* --- cross-section contract (keep these fields; others read them) --- */
  announcements: Announcement[];
  automatedMessages: AutomatedMessage[];
  unreadMessages: number;
}

export const initialComms: CommsState = {
  announcements: [{ id: "an1", title: "New: schedule livestreams from Events", date: "2026-10-30", body: "", read: false }],
  automatedMessages: [], // spec: none
  unreadMessages: 0,
};

export type _Draft = AppData;
