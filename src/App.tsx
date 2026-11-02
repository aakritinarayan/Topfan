import { useEffect, useState } from "react";
import { isOnboarding, screenOrder, usePlatform } from "./state/platformStore";
import { useAssistant } from "./state/assistantStore";
import { DashboardLayout, FullWidthLayout, OnboardingLayout } from "./platform/Shell";
import { PreferencesPage } from "./platform/PreferencesPage";
import { DomainInfoStep } from "./platform/wls/DomainInfoStep";
import { DnsRecordsStep } from "./platform/wls/DnsRecordsStep";
import { ProvisioningStep } from "./platform/wls/ProvisioningStep";
import { SpaceBackdrop } from "./platform/wls/SpaceBackdrop";
import { AssistantIntro } from "./assistant/AssistantIntro";
import { DomainFinderDirector } from "./assistant/DomainFinder";
import { useDomainFinder } from "./state/domainFinderStore";
import { ManageWls } from "./platform/wls/ManageWls";
import { CoverPageEditor } from "./platform/wls/CoverPageEditor";
import { AssistantPanel } from "./assistant/AssistantPanel";
import { AssistantDirector } from "./assistant/Director";
import { QuestCompanion } from "./assistant/QuestCompanion";
import { useQuest } from "./state/questStore";

export default function App() {
  const { state } = usePlatform();
  const assistant = <AssistantPanel />;

  let page;
  if (isOnboarding(state.screen)) {
    // Account setup: TopFan header + setup form + assistant. No creator dashboard components render here.
    const body = {
      step1: <DomainInfoStep />,
      step2: <DnsRecordsStep />,
      provisioning: <ProvisioningStep />,
      // Same component (and instance) as provisioning: completion is its resolved state.
      complete: <ProvisioningStep />,
    }[state.screen as "step1" | "step2" | "provisioning" | "complete"];
    page = (
      <OnboardingLayout assistant={assistant} backdrop={state.screen === "provisioning" || state.screen === "complete" ? <SpaceBackdrop /> : undefined}>
        {body}
      </OnboardingLayout>
    );
  } else if (state.screen === "coverEditor") {
    page = (
      <FullWidthLayout assistant={assistant}>
        <CoverPageEditor />
      </FullWidthLayout>
    );
  } else {
    page = (
      <DashboardLayout assistant={assistant}>
        <PreferencesPage>
          <ManageWls />
        </PreferencesPage>
      </DashboardLayout>
    );
  }

  return (
    <>
      {page}
      <AssistantDirector />
      <QuestCompanion />
      <AssistantIntro />
      <DomainFinderDirector />
      <ReviewNav />
    </>
  );
}

/**
 * Review helper: jump between recreated screens. Toggle with "R".
 * Replaced by the presenter bar ("P") in a later phase.
 */
function ReviewNav() {
  const { state, go, reset } = usePlatform();
  const finder = useDomainFinder();
  const quest = useQuest();
  const assistant = useAssistant();
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.key === "r" || e.key === "R") && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  if (!open) return null;
  return (
    <div className="fixed bottom-4 left-4 z-[70] flex items-center gap-1 rounded-full border border-line bg-black/85 p-1 text-xs shadow-lg backdrop-blur">
      <span className="px-3 text-muted">Review</span>
      {screenOrder.map((s) => (
        <button
          key={s.id}
          onClick={() => go(s.id)}
          className={`rounded-full px-3 py-1.5 ${state.screen === s.id ? "bg-white text-black" : "text-white hover:bg-white/10"}`}
        >
          {s.label}
        </button>
      ))}
      <button
        onClick={() => {
          reset();
          assistant.reset();
          finder.reset();
          quest.reset();
        }}
        className="rounded-full px-3 py-1.5 text-muted hover:text-white"
      >
        Reset
      </button>
    </div>
  );
}
