// First: picks the demo (if opened from a demo link) before any store reads saved state.
import "./app/demo";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "@fontsource/roboto/900.css";
import "@fontsource/rubik-dirt/400.css";
// Logo Font carousel options (Preferences › White Label Site).
import "@fontsource/bebas-neue/400.css";
import "@fontsource/permanent-marker/400.css";
import "@fontsource/bungee/400.css";
import "@fontsource/black-ops-one/400.css";
import "@fontsource/pacifico/400.css";
import "./styles/tokens.css";
import "./styles/index.css";
import App from "./App";
import { PlatformProvider } from "./state/platformStore";
import { ToastProvider } from "./platform/ui/toast";
import { AssistantProvider } from "./state/assistantStore";
import { DomainFinderProvider } from "./state/domainFinderStore";
import { ChatProvider } from "./assistant/chat/ChatEngine";
import { PlatformAgentProvider } from "./assistant/platform/PlatformAgent";
import { QuestProvider } from "./state/questStore";
import { RouterProvider } from "./app/router";
import { StoreProvider } from "./store/store";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider>
    <StoreProvider>
    <PlatformProvider>
      <AssistantProvider>
        <DomainFinderProvider>
          <QuestProvider>
            <PlatformAgentProvider>
              <ChatProvider>
                <ToastProvider>
                  <App />
                </ToastProvider>
              </ChatProvider>
            </PlatformAgentProvider>
          </QuestProvider>
        </DomainFinderProvider>
      </AssistantProvider>
    </PlatformProvider>
    </StoreProvider>
    </RouterProvider>
  </StrictMode>,
);
