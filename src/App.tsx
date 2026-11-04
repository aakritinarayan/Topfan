import { useEffect, useState, type ReactNode } from "react";
import { screenOrder, usePlatform } from "./state/platformStore";
import { useRouter } from "./app/router";
import { pathFor, resolve } from "./app/routeCatalog";
import { PAGES } from "./app/pages";
import { Pending } from "./pages/Pending";
import { SocialOverlays } from "./pages/social/Overlays";
import { useData } from "./store/store";
import { useAssistant } from "./state/assistantStore";
import { BleedLayout, DashboardLayout, FullWidthLayout, MarketingLayout, OnboardingLayout, PublicLayout } from "./platform/Shell";
import { SpaceBackdrop } from "./platform/wls/SpaceBackdrop";
import { AssistantIntro } from "./assistant/AssistantIntro";
import { DomainFinderDirector } from "./assistant/DomainFinder";
import { CoverAssistant } from "./assistant/platform/CoverAssistant";
import { ContentAgent } from "./assistant/platform/ContentAgent";
import { useDomainFinder } from "./state/domainFinderStore";
import { AssistantPanel } from "./assistant/AssistantPanel";
import { AssistantDirector } from "./assistant/Director";
import { QuestCompanion } from "./assistant/QuestCompanion";
import { useQuest } from "./state/questStore";
import { DevSwitcher } from "./app/DevSwitcher";
import { resetWorkflow } from "./app/agent-context/workflow-state";
import { demoId, inScope, resetPath } from "./app/demo";

export default function App() {
  const assistant = <AssistantPanel />;
  // ?resetMock=1 is read once at startup; drop it from the address bar so an accidental reload
  // mid-demo keeps the presenter's progress instead of resetting it.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("resetMock") !== "1") return;
    url.searchParams.delete("resetMock");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);
  return (
    <>
      <AppRoutes assistant={assistant} />
      <SocialOverlays />
      {/* Website setup guidance (domain, DNS, provisioning, Creator Quest): Account Setup demo only. */}
      {inScope("setup") && (
        <>
          <AssistantDirector />
          <QuestCompanion />
          <AssistantIntro />
          <DomainFinderDirector />
          <CoverAssistant />
        </>
      )}
      {/* Intent-driven posts, newsletters, experiences and weekly plans: AI-Assisted Content demo only. */}
      {demoId === "ai-content" && <ContentAgent />}
      <ReviewNav />
    </>
  );
}

/** Resolve the URL to a route, enforce access for the demo role, and wrap the page in its layout. */
function AppRoutes({ assistant }: { assistant: ReactNode }) {
  const { path, query, navigate } = useRouter();
  const { route, params } = resolve(path);
  const role = useData((d) => d.account.session.role);
  const name = useData((d) => d.account.name);
  useEffect(() => {
    if (route.redirect) navigate(`${pathFor(route.redirect, params)}${window.location.search}`, { replace: true });
  }, [route.id]);
  useEffect(() => {
    document.title = `${route.title} | ${name}`;
  }, [route.id, name]);
  // Account setup screens use the setup colors (teal); everything after setup stays red and black.
  // Set during render (idempotent) so pages that read theme colors on mount, like the space
  // backdrop's canvas, already see the right theme.
  document.body.classList.toggle("setup-theme", route.id.startsWith("wls-setup-"));
  if (route.redirect) return null;

  const Page = PAGES[route.id] ?? Pending;
  const allowed = route.access.includes(role) || route.access.includes("public");
  const page = (
    <div data-route={route.id} className="contents">
      {/* A different assistant draft (?work=) is a different form: remount instead of keeping the last one's fields. */}
      {allowed ? <Page key={query.get("work") ?? undefined} route={route} params={params} query={query} /> : <NoAccess title={route.title} />}
    </div>
  );
  switch (route.layout) {
    case "onboarding":
      return (
        <OnboardingLayout assistant={assistant} backdrop={route.id === "wls-setup-provisioning" || route.id === "wls-setup-complete" ? <SpaceBackdrop /> : undefined}>
          {page}
        </OnboardingLayout>
      );
    case "bleed":
      return <BleedLayout assistant={assistant} section={route.section}>{page}</BleedLayout>;
    case "narrow":
      return <DashboardLayout assistant={assistant} section={route.section} narrow>{page}</DashboardLayout>;
    case "public":
      return <PublicLayout assistant={assistant}>{page}</PublicLayout>;
    case "marketing":
      return <MarketingLayout assistant={assistant}>{page}</MarketingLayout>;
    case "wide":
      return <FullWidthLayout assistant={assistant}>{page}</FullWidthLayout>;
    default:
      return <DashboardLayout assistant={assistant} section={route.section}>{page}</DashboardLayout>;
  }
}

/** Shown when the demo role (e.g. a Content delegate) can't open a screen. INFERRED copy. */
function NoAccess({ title }: { title: string }) {
  return (
    <div data-testid="page-no-access" className="py-10">
      <h4 className="text-2xl font-bold">{title}</h4>
      <p className="mt-2 text-sm text-muted">Your delegate access doesn't include this section. Ask the account owner if you need it.</p>
    </div>
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
  // Developer review bar: shown by default on the White Label demo routes only; "R" toggles it anywhere.
  const [forced, setForced] = useState<boolean | null>(null);
  const open = forced ?? state.screen !== "app";
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.key === "r" || e.key === "R") && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        setForced((f) => !(f ?? state.screen !== "app"));
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
      <DevSwitcher />
      <button
        onClick={() => {
          resetWorkflow();
          reset();
          assistant.reset();
          finder.reset();
          quest.reset();
          // Full demo reset: reload on the starting screen with ?resetMock=1, which clears the local mock
          // data, tasks and Autopilot review state of this demo only (this browser; nothing real is touched).
          try {
            localStorage.removeItem("tf-fail-save");
          } catch {
            /* storage blocked: the reload still resets */
          }
          window.location.assign(`${resetPath()}?resetMock=1`);
        }}
        title="Reset the whole demo (local mock data only)"
        data-testid="review-reset"
        className="rounded-full px-3 py-1.5 text-muted hover:text-white"
      >
        Reset
      </button>
    </div>
  );
}
