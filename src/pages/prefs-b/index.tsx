/**
 * Page map for Preferences B (tabs 11–16): route id → component.
 */
import type { PageMap } from "../types";
import { OutboundEmailsPage } from "./OutboundEmails";
import { LinkInBioPage } from "./LinkInBio";
import { AddDelegatePage, DelegateDetailsPage, DelegationPage } from "./Delegation";
import { GroupFormPage, GroupsPage, TopicTagFormPage, TopicTagsPage } from "./TagsGroups";
import { BadgesPage, BuyPointsPage, EarnPointsPage } from "./Gamification";

export const pages: PageMap = {
  "pref-outbound-emails": OutboundEmailsPage,
  "pref-link-in-bio": LinkInBioPage,
  "pref-link-in-bio-edit": LinkInBioPage,
  "pref-delegation": DelegationPage,
  "pref-delegate-details": DelegateDetailsPage,
  "pref-delegate-add": AddDelegatePage,
  "pref-topic-tags": TopicTagsPage,
  "pref-topic-tags-add": TopicTagFormPage,
  "pref-topic-tags-edit": TopicTagFormPage,
  "pref-groups": GroupsPage,
  "pref-groups-add": GroupFormPage,
  "pref-groups-edit": GroupFormPage,
  "pref-gamification": EarnPointsPage,
  "pref-gamification-buy": BuyPointsPage,
  "pref-gamification-badges": BadgesPage,
};
