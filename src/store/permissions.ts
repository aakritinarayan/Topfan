/**
 * Demo roles and capabilities, enforced in store.act() (the mock service layer).
 *
 * Confirmed by the pack: delegates have "Content" or "Financial, Content" access (53-pref-delegation).
 * INFERRED (not in the pack): exactly which screens each grant opens, and that account-level actions
 * (password, pause/delete, domain/DNS, payout details, adding delegates) stay owner-only.
 */
import type { AppData } from "./store";
import type { Role } from "./model";

export type Capability =
  | "content.write" // posts, livestreams, offers, messages, groups, tags
  | "finance.read" // wallet, earnings, transactions
  | "finance.write" // withdrawals, refunds decisions, payout/cards
  | "account.admin"; // password, pause/delete, domain & DNS, delegates, integrations

const GRANTS: Record<Role, Capability[]> = {
  creator: ["content.write", "finance.read", "finance.write", "account.admin"],
  content: ["content.write"],
  financial: ["content.write", "finance.read", "finance.write"], // "Financial, Content"
};

export const capabilitiesOf = (role: Role) => GRANTS[role];
export const roleCan = (role: Role, c: Capability) => GRANTS[role].includes(c);
export const can = (d: AppData, c: Capability) => roleCan(d.account.session.role, c);

export const ROLE_LABEL: Record<Role, string> = {
  creator: "Creator (owner)",
  content: "Delegate · Content",
  financial: "Delegate · Financial, Content",
};
