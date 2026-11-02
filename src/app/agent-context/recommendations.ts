/**
 * What to suggest, in order (brief §12): account health first, then the creator's own stated goals,
 * then gentle discovery. Creator category only breaks ties inside the same priority; it never hides
 * features or pushes monetization by default.
 */
import type { AppData } from "../../store/store";
import { getAccountState, visibleItems, type HealthItem } from "./account-state";

/** Light tie-breakers by creator model (md §6.4 hypothesis; to validate). */
const AFFINITY: Record<string, string[]> = {
  Musicians: ["events", "merchandise", "livestream"],
  Athletes: ["events", "experiences", "new-post"],
  Educators: ["courses", "downloadables", "newsletters"],
  Fitness: ["courses", "downloadables", "subscriptions"],
  Podcasters: ["subscriptions", "newsletters"],
  Writers: ["newsletters", "subscriptions"],
  Gamers: ["livestream", "groups", "gamification"],
  Artists: ["merchandise", "portfolios", "downloadables"],
};

export interface RecOptions {
  /** Health item ids the creator dismissed (not shown again this session). */
  dismissed?: string[];
  /** Goals the creator stated in conversation (feature ids). */
  statedGoals?: string[];
  limit?: number;
}

export function recommend(d: AppData, o: RecOptions = {}): HealthItem[] {
  const affinity = AFFINITY[d.account.creatorCategory] ?? [];
  const goals = o.statedGoals ?? [];
  const weight = (i: HealthItem) => (goals.includes(i.featureId) ? -2 : 0) + (affinity.includes(i.featureId) ? -1 : 0);
  return visibleItems(d, getAccountState(d))
    .filter((i) => !o.dismissed?.includes(i.id))
    .sort((a, b) => a.priority - b.priority || weight(a) - weight(b))
    .slice(0, o.limit ?? 3);
}

/** The single most useful next action (for "What should I do next?"). */
export const topRecommendation = (d: AppData, o: RecOptions = {}) => recommend(d, { ...o, limit: 1 })[0] ?? null;
