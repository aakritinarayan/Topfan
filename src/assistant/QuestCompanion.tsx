/**
 * The assistant's side of Creator Quest. Same character as the in-game mascot, but it stays in the
 * panel and speaks rarely: once when the quest opens, once per first completion (the takeaway),
 * at most one hint per mission run if the player seems stuck, and, after launch, one reminder of the
 * features the creator explicitly saved. Game logic never depends on it.
 */
import { useEffect, useRef } from "react";
import { useAssistant } from "../state/assistantStore";
import { isOnboarding, usePlatform } from "../state/platformStore";
import { useQuest } from "../state/questStore";
import { missionById, type MissionId } from "../platform/wls/quest/missions";

const HINTS: Record<MissionId, string> = {
  revenue: "Tip for Fan Revenue Rush: jump just before a rock, and stay on the ground for the low offer tokens.",
  superfan: "Tip for Superfan Signal: touch a signal to pick it up, walk to the group with the same icon, then press E. The center group is up high: climb the side ledges first.",
  hq: "Tip for Build Your Fan HQ: Community is on the high ledge to the left (hop up from Content). Linking Fan experiences on the right reveals the Store.",
  insight: "Tip for Fan Insight Explorer: signals glow when you're close. Check the tops of the higher ledges, and press Review the pattern once you have 5.",
};

export function QuestCompanion() {
  const a = useAssistant();
  const q = useQuest();
  const { state } = usePlatform();
  const hinted = useRef(new Set<string>());
  const last = q.events[q.events.length - 1];

  // Opening the quest: one short introduction.
  useEffect(() => {
    if (last?.type !== "quest_opened") return;
    a.once("quest-intro", () =>
      a.say({
        text: "Creator Quest is optional: four short missions about growing a fan business. Your site keeps setting up in the background, and I'll tell you when it's ready. Ask me about any mission.",
      }),
    );
  }, [last]);

  // First completion of each mission: the takeaway, once.
  useEffect(() => {
    if (last?.type !== "mission_completed" || !last.mission) return;
    const m = missionById(last.mission);
    a.once(`quest-done-${m.id}`, () =>
      a.say({
        status: "done",
        text: `${m.name} complete. ${m.takeaway} In TopFan, you'll find this in ${m.feature.where}.`,
      }),
    );
  }, [last]);

  // Stuck: no progress for 35s in a mission run → one gentle hint (skipped while suggestions are paused).
  useEffect(() => {
    if (q.view.kind !== "play") return;
    const key = `${q.view.id}-${q.view.run}`;
    if (hinted.current.has(key)) return;
    const id = q.view.id;
    const t = setTimeout(() => {
      hinted.current.add(key);
      a.suggest({ text: HINTS[id] });
    }, 35000);
    return () => clearTimeout(t);
  }, [q.view, q.events.length]);

  // After launch: remind once about the features the creator chose to explore.
  useEffect(() => {
    if (isOnboarding(state.screen) || !q.interests.length) return;
    a.once("quest-interests", () => {
      const ms = q.interests.map(missionById);
      a.say({
        text: `During Creator Quest you saved ${ms.map((m) => m.feature.label).join(", ")} to explore. You'll find ${ms.length > 1 ? "them" : "it"} in ${ms
          .map((m) => m.feature.where)
          .join("; ")}. Nothing has been turned on; open ${ms.length > 1 ? "them" : "it"} when you're ready.`,
      });
      const nav = ms.find((m) => m.feature.nav)?.feature.nav;
      if (nav) setTimeout(() => a.highlight(nav), 400);
    });
  }, [state.screen]);

  return null;
}
