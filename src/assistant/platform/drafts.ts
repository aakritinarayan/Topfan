/**
 * Demo-mode drafts (Draft tier): short starting points built only from what the store knows about the
 * creator. Anything the creator hasn't told us is a [placeholder] they fill in; nothing is published.
 * With a language model connected, the model writes drafts instead (prepare_draft), same rules.
 */
import type { AppData } from "../../store/store";
import type { TaskDef } from "../../app/agent-context/tasks";

export type DraftKind = NonNullable<TaskDef["draft"]>;

export const DRAFT_LABEL: Record<DraftKind, string> = {
  "plan-benefits": "Plan benefits",
  "post-idea": "Post idea",
  "welcome-message": "Welcome message",
  "event-promo": "Event promo",
  newsletter: "Newsletter",
  "course-outline": "Course outline",
  "group-welcome": "Group welcome",
  "fan-segment": "Fan segment",
};

export function makeDraft(kind: DraftKind, d: AppData): string {
  const first = d.account.firstName;
  const what = d.account.creatorCategory.toLowerCase();
  const gold = d.monetize.plans[0]?.name ?? "your top plan";
  const event = d.monetize.events.find((e) => !e.past);
  switch (kind) {
    case "plan-benefits":
      return [
        `${gold}`,
        "• Members-only posts every week",
        "• Behind-the-scenes from [your training / your process]",
        "• Early access to new [drops / events]",
        "• Monthly Q&A",
      ].join("\n");
    case "post-idea":
      return `Quick update from ${first}: [one thing you worked on this week] and what's coming next. What do you want to see more of? Tell me in the comments.`;
    case "welcome-message":
      return `Hey, thanks for joining! I'm ${first}. This is where I share [what fans get here] first. Say hi and tell me what you'd like to see.`;
    case "event-promo":
      return event
        ? `${event.title} is coming up on ${new Date(event.date).toLocaleDateString("en-US", { month: "long", day: "numeric" })}. Tickets are on my page. See you there!`
        : `I'm hosting [event name] on [date] at [place]. Tickets are on my page now. Can't wait to see you there!`;
    case "newsletter":
      return `Subject: [A short, specific subject]\n\nHi [first name],\n\nHere's what's new: [one or two updates]. [One thing you want fans to do next.]\n\nThanks for being here,\n${first}`;
    case "course-outline":
      return `Course: [title]\n1. Welcome and what you'll learn\n2. [Core skill 1]\n3. [Core skill 2]\n4. [Common mistakes]\n5. Putting it together`;
    case "group-welcome":
      return `Welcome to the VIP group! You're one of the first to see [what's exclusive here]. I'll post here [how often].`;
    case "fan-segment":
      return `Fans who: subscribed in the last [30] days, OR spent more than [$50], OR [engaged with your last 3 posts].`;
  }
  return `[${what}]`;
}
