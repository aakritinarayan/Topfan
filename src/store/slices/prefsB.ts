/**
 * Preferences tabs 11–16: outbound emails, link in bio, delegates, topic tags, groups, gamification.
 * Owned by the Preferences B build. Expand freely: keep the exported names (PrefsBState, initialPrefsB).
 * Actions are plain functions that mutate a draft: act("label", (d) => myAction(d, …)).
 */
import type { AppData } from "../store";
import type { Delegate, Group, OutboundEmail, TopicTag } from "../model";

export interface PrefsBState {
  /* --- cross-section contract (keep these fields; others read them) --- */
  groups: Group[];
  topicTags: TopicTag[];
  delegates: Delegate[];
  outboundEmail: OutboundEmail;
}

export const initialPrefsB: PrefsBState = {
  groups: [], // spec: no Groups
  topicTags: [], // spec: no Topic Tags
  delegates: [
    { id: "dl1", firstName: "Maya", lastName: "Torres", email: "maya.torres@example.com", access: ["Financial", "Content"], revenueShare: { Subscriptions: 10, Merchandise: 5 }, status: "Active", addedAt: "2026-03-02" },
    { id: "dl2", firstName: "Leo", lastName: "Grant", email: "leo.grant@example.com", access: ["Content"], revenueShare: {}, status: "Active", addedAt: "2026-04-11" },
    { id: "dl3", firstName: "Priya", lastName: "Shah", email: "priya.shah@example.com", access: ["Financial", "Content"], revenueShare: { Experiences: 8 }, status: "Active", addedAt: "2026-05-20" },
    { id: "dl4", firstName: "Sam", lastName: "Okafor", email: "sam.okafor@example.com", access: ["Content"], revenueShare: {}, status: "Active", addedAt: "2026-07-08" },
  ],
  outboundEmail: {
    domain: "mail.ajwhite.com",
    senderEmail: "hello@mail.ajwhite.com",
    status: "failed",
    steps: [
      { label: "Domain verification", status: "Failed" },
      { label: "DKIM verification", status: "Failed" },
    ],
    records: [
      { type: "TXT", host: "_amazonses.mail", value: "example-verification-token-0000" },
      { type: "CNAME", host: "exampletoken1._domainkey.mail", value: "exampletoken1.dkim.example.net" },
    ],
    lastCheckedAt: "2026-11-01T09:30:00Z",
    errorDetail: "The verification records were not found in the domain's DNS.",
  },
};

export type _Draft = AppData;
