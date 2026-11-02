/**
 * Action registry (md §6.2, brief Part 13): every meaningful action, its risk tier, the capability the
 * store enforces, the store function that performs it, and what the ASSISTANT may do with it:
 *
 * - "navigate":  the assistant may do it directly (open a screen, point at a control).
 * - "draft":     the assistant shows text marked Draft; nothing is saved.
 * - "execute-with-approval": the assistant shows exactly what will change; it runs only after the
 *                creator clicks Approve, through the same store function (role still enforced).
 * - "open-screen": the assistant never does it; it opens the original screen and the page's own
 *                confirmation applies (all Protected actions, and Confirm actions with money/public impact).
 *
 * Plain data (exported to docs/agent-context/actions.json).
 */
import type { Capability } from "../../store/permissions";
import type { RiskTier } from "./permissions";

export interface ActionDef {
  id: string;
  label: string;
  tier: RiskTier;
  need?: Capability;
  /** "slice.function" in src/store/slices. */
  storeFn?: string;
  inputs?: string[];
  featureId: string;
  assistant: "navigate" | "draft" | "execute-with-approval" | "open-screen";
}

const a = (x: ActionDef) => x;

export const ACTIONS: ActionDef[] = [
  /* navigate */
  a({ id: "navigate", label: "Open a screen", tier: "navigate", featureId: "*", assistant: "navigate" }),
  a({ id: "highlight", label: "Point at a control", tier: "navigate", featureId: "*", assistant: "navigate" }),
  a({ id: "livestream.open", label: "Open the Livestream modal", tier: "navigate", featureId: "livestream", assistant: "navigate" }),

  /* drafts (text only) */
  a({ id: "post.draft", label: "Draft a post", tier: "draft", featureId: "new-post", assistant: "draft" }),
  a({ id: "plan.draft", label: "Draft plan benefits", tier: "draft", featureId: "subscriptions", assistant: "draft" }),
  a({ id: "newsletter.draft", label: "Draft a newsletter", tier: "draft", featureId: "newsletters", assistant: "draft" }),
  a({ id: "welcome.draft", label: "Draft a welcome message", tier: "draft", featureId: "welcome-message", assistant: "draft" }),
  a({ id: "event.draft", label: "Draft event promo copy", tier: "draft", featureId: "events", assistant: "draft" }),
  a({ id: "course.draft", label: "Draft a course outline", tier: "draft", featureId: "courses", assistant: "draft" }),
  a({ id: "segment.draft", label: "Suggest fan segment criteria", tier: "draft", featureId: "segments", assistant: "draft" }),
  a({ id: "message.draft", label: "Draft a message", tier: "draft", featureId: "messages", assistant: "draft" }),

  /* confirm: the assistant may run these after an explicit Approve in the panel */
  a({ id: "group.add", label: "Create a group", tier: "confirm", need: "content.write", storeFn: "prefsB.addGroup", inputs: ["name", "description?"], featureId: "groups", assistant: "execute-with-approval" }),
  a({ id: "tag.add", label: "Add a Topic Tag", tier: "confirm", need: "content.write", storeFn: "prefsB.addTopicTag", inputs: ["name", "description?"], featureId: "topic-tags", assistant: "execute-with-approval" }),
  a({ id: "automated.add", label: "Add and turn on an automated message", tier: "confirm", need: "content.write", storeFn: "comms.saveAutomatedMessage", inputs: ["event", "text"], featureId: "automated-messages", assistant: "execute-with-approval" }),

  /* confirm: done on the original screen (public, money or other people involved) */
  a({ id: "post.publish", label: "Publish a post", tier: "confirm", need: "content.write", storeFn: "social.publishPost", featureId: "new-post", assistant: "open-screen" }),
  a({ id: "plan.publish", label: "Add or edit a subscription plan", tier: "confirm", need: "content.write", storeFn: "monetize.*Plan", featureId: "subscriptions", assistant: "open-screen" }),
  a({ id: "plan.changePrice", label: "Change a plan's price", tier: "confirm", need: "finance.write", storeFn: "monetize.*Plan", featureId: "subscriptions", assistant: "open-screen" }),
  a({ id: "newsletter.send", label: "Send a newsletter", tier: "confirm", need: "content.write", storeFn: "monetize.*Newsletter", featureId: "newsletters", assistant: "open-screen" }),
  a({ id: "event.publish", label: "Create an event with tickets", tier: "confirm", need: "content.write", storeFn: "monetize.*Event", featureId: "events", assistant: "open-screen" }),
  a({ id: "course.publish", label: "Publish a course", tier: "confirm", need: "content.write", storeFn: "monetize.*Course", featureId: "courses", assistant: "open-screen" }),
  a({ id: "downloadable.publish", label: "Publish a downloadable", tier: "confirm", need: "content.write", storeFn: "monetize.*Downloadable", featureId: "downloadables", assistant: "open-screen" }),
  a({ id: "merch.publish", label: "Add merchandise", tier: "confirm", need: "content.write", storeFn: "monetize.*Merch*", featureId: "merchandise", assistant: "open-screen" }),
  a({ id: "experience.publish", label: "Publish an experience", tier: "confirm", need: "content.write", storeFn: "monetize.*Experience", featureId: "experiences", assistant: "open-screen" }),
  a({ id: "ad.approve", label: "Approve an advertiser", tier: "confirm", need: "content.write", storeFn: "monetize.*Ad*", featureId: "advertisements", assistant: "open-screen" }),
  a({ id: "ad.decline", label: "Decline an advertiser", tier: "confirm", need: "content.write", storeFn: "monetize.*Ad*", featureId: "advertisements", assistant: "open-screen" }),
  a({ id: "refund.approve", label: "Approve a refund", tier: "confirm", need: "finance.write", storeFn: "money.*Refund*", featureId: "refunds", assistant: "open-screen" }),
  a({ id: "refund.decline", label: "Decline a refund", tier: "confirm", need: "finance.write", storeFn: "money.*Refund*", featureId: "refunds", assistant: "open-screen" }),
  a({ id: "fulfillment.markDone", label: "Mark an order fulfilled", tier: "confirm", need: "content.write", storeFn: "money.*Fulfill*", featureId: "fulfillment", assistant: "open-screen" }),
  a({ id: "message.send", label: "Send a message to fans", tier: "confirm", need: "content.write", storeFn: "comms.sendDirectMessage / sendToMessageList", featureId: "messages", assistant: "open-screen" }),
  a({ id: "welcome.save", label: "Save the welcome message", tier: "confirm", need: "content.write", storeFn: "prefsA.updateWelcomeMessage", featureId: "welcome-message", assistant: "open-screen" }),
  a({ id: "profile.update", label: "Update profile", tier: "confirm", need: "content.write", storeFn: "prefsA.updateProfile", featureId: "profile", assistant: "open-screen" }),
  a({ id: "monetization.update", label: "Change tips / DM price settings", tier: "confirm", need: "finance.write", storeFn: "prefsA.setMonetizationFlag / setDmPrice", featureId: "monetization-settings", assistant: "open-screen" }),
  a({ id: "linkinbio.update", label: "Save Link in Bio", tier: "confirm", need: "content.write", storeFn: "prefsB.saveLinkInBio", featureId: "link-in-bio", assistant: "open-screen" }),
  a({ id: "gamification.update", label: "Save gamification settings", tier: "confirm", need: "content.write", storeFn: "prefsB.saveEarnPoints / saveBuyPoints / saveBadges", featureId: "gamification", assistant: "open-screen" }),
  a({ id: "delegate.addContent", label: "Give a delegate Content access", tier: "confirm", need: "account.admin", storeFn: "prefsB.addDelegate", featureId: "delegation", assistant: "open-screen" }),
  a({ id: "wls.updateBranding", label: "Update & publish White Label appearance", tier: "confirm", need: "account.admin", storeFn: "account.whiteLabel.lastPublishedAt (ManageWls)", featureId: "white-label", assistant: "open-screen" }),
  a({ id: "email.verify", label: "Re-run Outbound Email verification", tier: "confirm", need: "account.admin", storeFn: "prefsB.startOutboundVerification / recheckOutboundEmail", featureId: "outbound-emails", assistant: "open-screen" }),
  a({ id: "livestream.start", label: "Go live", tier: "confirm", need: "content.write", storeFn: "social.startLivestream", featureId: "livestream", assistant: "open-screen" }),

  /* protected: never by the assistant */
  a({ id: "wallet.withdraw", label: "Withdraw earnings", tier: "protected", need: "finance.write", storeFn: "money.*Withdraw*", featureId: "wallet-balance", assistant: "open-screen" }),
  a({ id: "wallet.connectPayout", label: "Connect a payout account", tier: "protected", need: "finance.write", storeFn: "money.*Payout*", featureId: "wallet-balance", assistant: "open-screen" }),
  a({ id: "wallet.addCard", label: "Add a card", tier: "protected", need: "finance.write", storeFn: "money.*Card*", featureId: "wallet-balance", assistant: "open-screen" }),
  a({ id: "delegate.addFinancial", label: "Give a delegate Financial access", tier: "protected", need: "account.admin", storeFn: "prefsB.addDelegate / updateDelegateAccess", featureId: "delegation", assistant: "open-screen" }),
  a({ id: "account.changePassword", label: "Change password", tier: "protected", need: "account.admin", storeFn: "prefsA.changePassword", featureId: "privacy", assistant: "open-screen" }),
  a({ id: "account.pause", label: "Pause account", tier: "protected", need: "account.admin", storeFn: "prefsA.pauseAccount", featureId: "privacy", assistant: "open-screen" }),
  a({ id: "account.delete", label: "Delete account", tier: "protected", need: "account.admin", storeFn: "prefsA.requestAccountDeletion", featureId: "privacy", assistant: "open-screen" }),
  a({ id: "wallet.unlinkNft", label: "Unlink MetaMask", tier: "protected", need: "account.admin", storeFn: "prefsA.unlinkWallet", featureId: "nft-wallet", assistant: "open-screen" }),
  a({ id: "wls.changeDns", label: "Change White Label domain / DNS", tier: "protected", need: "account.admin", featureId: "white-label", assistant: "open-screen" }),
  a({ id: "wls.delete", label: "Delete White Label Site", tier: "protected", need: "account.admin", featureId: "white-label", assistant: "open-screen" }),
  a({ id: "email.changeDns", label: "Change Outbound Email domain", tier: "protected", need: "account.admin", storeFn: "prefsB.setOutboundDomain", featureId: "outbound-emails", assistant: "open-screen" }),
];

export const actionById = (id: string) => ACTIONS.find((x) => x.id === id);
