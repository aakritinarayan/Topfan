/**
 * Permissions and risk tiers for the assistant (brief Part 13, md §6.3).
 * Role capabilities are enforced in the store (src/store/permissions.ts → act()); this file adds
 * what the assistant itself must do before each kind of action.
 */
export { capabilitiesOf, roleCan, can, ROLE_LABEL, type Capability } from "../../store/permissions";

export type RiskTier = "navigate" | "draft" | "confirm" | "protected";

export const TIERS: Record<RiskTier, { meaning: string; assistant: string }> = {
  navigate: { meaning: "Read, find, explain, open a screen.", assistant: "May do it right away." },
  draft: { meaning: "Prepare something for the creator to review, without saving or publishing.", assistant: "Shows the draft marked Draft; the creator copies or uses it." },
  confirm: {
    meaning: "Publish, send, change prices, grant Content access, approve ads, process refunds.",
    assistant: "Never does it from chat. Opens the original screen; the creator confirms with the product's own button.",
  },
  protected: {
    meaning: "Withdrawals, payment details, delegate Financial access, password, pause/delete account, delete site, unlink wallet or store, change DNS.",
    assistant: "Never does it. Explains, opens the original screen, and the page's own strong confirmation applies.",
  },
};

/** INFERRED (not confirmed by the pack): what each delegate role can open and change. */
export const ROLE_NOTES = {
  creator: "Owner: everything.",
  content: "Delegate · Content: posts, livestreams, products and offers, messages, groups, tags. No Wallet, no money decisions, no account settings.",
  financial: "Delegate · Financial, Content: everything a Content delegate can do, plus Wallet, refunds, payouts and prices. No account settings (password, delegates, domain/DNS, pause/delete).",
};
