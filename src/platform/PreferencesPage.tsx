/**
 * "Preferences" title + the 16 chip tabs (P30 chip row). Each chip is its own route under
 * /edit-preference. Order, labels and the ungrouped wrapping row are the product's own.
 */
import type { ReactNode } from "react";
import { useRouter } from "../app/router";
import { ChipTab } from "./ui/controls";

export const PREFERENCE_TABS: { label: string; path: string; id: string }[] = [
  { label: "Profile", path: "/edit-preference", id: "profile" },
  { label: "Welcome Message", path: "/edit-preference/edit-welcome-message", id: "welcome-message" },
  { label: "Interests", path: "/edit-preference/edit-content", id: "interests" },
  { label: "Creator Type", path: "/edit-preference/edit-creator", id: "creator-type" },
  { label: "Customer Support", path: "/edit-preference/customer-support", id: "customer-support" },
  { label: "Notifications & Newsletters", path: "/edit-preference/notifications", id: "notifications" },
  { label: "NFT Wallet", path: "/edit-preference/connect-nft-wallet", id: "nft-wallet" },
  { label: "Monetization", path: "/edit-preference/monetization", id: "monetization" },
  { label: "Privacy, Password & Integrations", path: "/edit-preference/privacy", id: "privacy" },
  { label: "White Label Site", path: "/edit-preference/whitelabel", id: "whitelabel" },
  { label: "Outbound Emails", path: "/edit-preference/outbound-emails", id: "outbound-emails" },
  { label: "Link In Bio", path: "/edit-preference/link-in-bio", id: "link-in-bio" },
  { label: "Delegation", path: "/edit-preference/delegation/delegation-view", id: "delegation" },
  { label: "Topic Tags", path: "/edit-preference/topic-tags", id: "topic-tags" },
  { label: "Groups", path: "/edit-preference/groups", id: "groups" },
  { label: "Gamification", path: "/edit-preference/gamification/earn-points", id: "gamification" },
];

/** Which chip is active for a path: the longest tab path that prefixes it (sub-pages keep their tab). */
export function activePrefTab(path: string) {
  const first = path.split("/").slice(0, 3).join("/"); // /edit-preference/<tab>
  return (
    PREFERENCE_TABS.find((t) => t.path === path) ??
    PREFERENCE_TABS.filter((t) => t.path !== "/edit-preference").find((t) => t.path.split("/").slice(0, 3).join("/") === first) ??
    (path === "/edit-preference" ? PREFERENCE_TABS[0] : undefined)
  );
}

export function PreferencesPage({ children, chips = true }: { children: ReactNode; chips?: boolean }) {
  const { path, navigate } = useRouter();
  const active = activePrefTab(path);
  return (
    <>
      <h4 className="text-2xl font-bold">Preferences</h4>
      {chips && (
        <div className="mt-[30px] flex flex-wrap gap-x-2 gap-y-2.5" role="tablist" aria-label="Preferences">
          {PREFERENCE_TABS.map((t) => (
            <ChipTab
              key={t.id}
              role="tab"
              aria-selected={active?.id === t.id}
              active={active?.id === t.id}
              data-testid={`pref-tab-${t.id}`}
              onClick={() => navigate(t.path)}
            >
              {t.label}
            </ChipTab>
          ))}
        </div>
      )}
      <div className="mt-10">{children}</div>
    </>
  );
}
