/**
 * Page map for the Comms area: route id → component.
 */
import type { PageMap } from "../types";
import { ActivityPage } from "./Activity";
import { MessagesPage } from "./messages/MessagesPage";
import { AnnouncementsPage, GuidesPage, ProvidersPage, SupportPage } from "./Resources";
import { HelpFaqPage, PrivacyPage, TermsPage } from "./HelpLegal";

export const pages: PageMap = {
  "activity": ActivityPage,
  "messages": MessagesPage,
  "resources": AnnouncementsPage, // redirects to /resources/announcements (route.redirect)
  "resources-announcements": AnnouncementsPage,
  "resources-guides": GuidesPage,
  "resources-providers": ProvidersPage,
  "resources-support": SupportPage,
  "help-faq": HelpFaqPage,
  "terms": TermsPage,
  "privacy-policy": PrivacyPage,
};
