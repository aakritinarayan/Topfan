/**
 * Preferences › Privacy › Blocked Users (/edit-preference/privacy/blocked-users) — INFERRED.
 * The row exists in spec 38 but the list was never opened: layout follows the Privacy card pattern.
 */
import { useState } from "react";
import { ArrowLeft, UserX } from "lucide-react";
import type { PageProps } from "../types";
import { useRouter } from "../../app/router";
import { pathFor } from "../../app/routeCatalog";
import { PreferencesPage } from "../../platform/PreferencesPage";
import { OutlineButton } from "../../platform/ui/controls";
import { useData } from "../../store/store";
import { unblockUser, type BlockedUser } from "../../store/slices/prefsA";
import { personAvatar } from "../../media";
import { ConfirmModal, MiniAvatar, PrefCard, useRun } from "./ui";

const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function BlockedUsers({ route }: PageProps) {
  const { navigate } = useRouter();
  const blocked = useData((d) => d.prefsA.privacy.blocked);
  const run = useRun();
  const [target, setTarget] = useState<BlockedUser | null>(null);
  return (
    <PreferencesPage>
      <div data-testid={`page-${route.id}`}>
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            aria-label="Back to Privacy, Password & Integrations"
            data-testid="pref-blocked-back"
            onClick={() => navigate(pathFor("pref-privacy"))}
            className="text-white hover:text-accent"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold">Blocked Users</h2>
        </div>
        <PrefCard title={`Blocked Users (${blocked.length})`} testid="pref-blocked-list">
          {blocked.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center" data-testid="pref-blocked-empty">
              <UserX size={36} className="text-accent" />
              <p className="mt-4 text-base font-medium">You haven't blocked anyone</p>
              <p className="mt-1 text-sm text-muted">People you block can't see your content, message you or join your chat rooms.</p>
            </div>
          ) : (
            blocked.map((b) => (
              <div key={b.id} className="flex items-center justify-between border-b border-white/10 py-4 last:border-0" data-testid={`pref-blocked-row-${b.id}`}>
                <span className="flex items-center gap-3">
                  <MiniAvatar name={b.name} src={personAvatar(b.id)} />
                  <span>
                    <p className="text-sm font-medium">{b.name}</p>
                    <p className="text-xs text-muted">
                      @{b.username} · Blocked {fmt(b.blockedAt)}
                    </p>
                  </span>
                </span>
                <OutlineButton className="h-9" data-testid={`pref-blocked-unblock-${b.id}`} onClick={() => setTarget(b)}>
                  Unblock
                </OutlineButton>
              </div>
            ))
          )}
        </PrefCard>
        <ConfirmModal
          open={!!target}
          onClose={() => setTarget(null)}
          title="Unblock User"
          testid="pref-blocked-unblock-modal"
          confirmLabel="Unblock"
          cancelLabel="Cancel"
          onConfirm={() => {
            if (target && run("prefs.unblockUser", (d) => unblockUser(d, target.id), "account.admin", `${target.name} unblocked`)) setTarget(null);
          }}
        >
          Unblock <b>{target?.name}</b>? They will be able to see your content, message you and join your chat rooms again.
        </ConfirmModal>
      </div>
    </PreferencesPage>
  );
}
