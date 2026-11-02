/**
 * Preferences › Privacy, Password & Integrations (/edit-preference/privacy) — spec 38, shots 38-*, 38a, 38b.
 * Pause / Delete account and password change are Protected (modal + password / typed phrase, account.admin).
 * They only flip mock flags: the demo is never locked, and each has an undo path.
 */
import { useState } from "react";
import { Apple, CalendarDays, ChevronRight, Mail } from "lucide-react";
import type { PageProps } from "../types";
import { useRouter } from "../../app/router";
import { pathFor } from "../../app/routeCatalog";
import { PreferencesPage } from "../../platform/PreferencesPage";
import { Button, FieldError, Label } from "../../platform/ui/controls";
import { Modal, NoticeBox } from "../../platform/ui/surfaces";
import { useData } from "../../store/store";
import {
  cancelAccountDeletion,
  changePassword,
  pauseAccount,
  passwordProblems,
  reactivateAccount,
  requestAccountDeletion,
  setCalendarLinked,
  setPrivacyFlag,
  setSharing,
  setSignInMethod,
} from "../../store/slices/prefsA";
import { personAvatar } from "../../media";
import { ConfirmModal, InfoPop, MiniAvatar, PasswordField, PrefCard, PrefRow, ProtectedModal, TToggle, useRun } from "./ui";

type Method = "email" | "google" | "apple";
const METHODS: { id: Method; label: string; icon: React.ReactNode }[] = [
  { id: "email", label: "Email", icon: <Mail size={20} /> },
  // Neutral "G" mark instead of the Google logo image.
  { id: "google", label: "Google", icon: <span className="flex h-5 w-5 items-center justify-center text-[17px] font-black leading-none">G</span> },
  { id: "apple", label: "Apple", icon: <Apple size={20} fill="currentColor" /> },
];
const PAGE = 5;
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "");

export function Privacy({ route }: PageProps) {
  const { navigate } = useRouter();
  const p = useData((d) => d.prefsA.privacy);
  const integ = useData((d) => d.prefsA.integrations);
  const status = useData((d) => d.prefsA.accountStatus);
  const run = useRun();
  const [modal, setModal] = useState<null | "pause" | "reactivate" | "delete" | "cancel-delete" | "calendar" | { disconnect: Method } | "password" | "password-done">(null);
  const [shown, setShown] = useState(PAGE);
  const [pw, setPw] = useState({ old: "", next: "", confirm: "" });
  const close = () => setModal(null);

  const problems = passwordProblems(pw.next);
  const mismatch = pw.confirm !== "" && pw.confirm !== pw.next;
  const pwValid = pw.old !== "" && pw.next !== "" && problems.length === 0 && pw.confirm === pw.next;

  const flag = (key: "showChatRooms" | "showPostTimestamps" | "privateAccount" | "showLocation", label: string, info?: React.ReactNode) => (
    <PrefRow
      label={label}
      info={info}
      right={<TToggle on={p[key]} label={label} testid={`pref-privacy-${key}`} onChange={() => run("prefs.setPrivacyFlag", (d) => setPrivacyFlag(d, key, !p[key]), "account.admin")} />}
    />
  );

  const navRow = (label: string, testid: string, onClick: () => void, info?: React.ReactNode, extra?: React.ReactNode) => (
    <div
      role="button"
      tabIndex={0}
      data-testid={testid}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick())}
      className="mt-[26px] flex cursor-pointer items-center justify-between hover:text-accent"
    >
      <p className="flex items-center text-sm">
        {label}
        {info}
        {extra}
      </p>
      <ChevronRight size={20} />
    </div>
  );

  const activeCount = Object.values(integ.signIn).filter(Boolean).length;

  return (
    <PreferencesPage>
      <div data-testid={`page-${route.id}`} className="flex flex-col gap-[15px]">
        {/* inferred: account status banners (pause / delete only flip mock flags) */}
        {status.paused && (
          <NoticeBox>
            <div className="flex flex-wrap items-center justify-between gap-3" data-testid="pref-privacy-paused-banner">
              <span>
                <b>Your account is paused</b> since {fmt(status.pausedAt)}. Fans can't see your profile, content or offers until you reactivate it.
              </span>
              <Button data-testid="pref-privacy-reactivate" onClick={() => setModal("reactivate")}>
                Reactivate Account
              </Button>
            </div>
          </NoticeBox>
        )}
        {status.deletionRequested && (
          <NoticeBox>
            <div className="flex flex-wrap items-center justify-between gap-3" data-testid="pref-privacy-deletion-banner">
              <span>
                <b>Account deletion requested</b> on {fmt(status.deletionRequestedAt)}. Your account is scheduled to be deleted in 30 days. You can cancel this until then.
              </span>
              <Button data-testid="pref-privacy-cancel-deletion" onClick={() => setModal("cancel-delete")}>
                Cancel Deletion
              </Button>
            </div>
          </NoticeBox>
        )}

        <PrefCard title="Audience & Visibility" testid="pref-privacy-audience">
          {flag("showChatRooms", "Display My Chat Rooms to Other Users")}
          {flag("showPostTimestamps", "Display Content Post Timestamps")}
          {flag(
            "privateAccount",
            "Make My Account Private",
            <InfoPop testid="pref-privacy-private-info" className="ml-5">
              If you make your Account Private, fans will need to request your permission to able to see your content and interact with you. Those requests will
              show in Follow Requests inside the Activity Section.
            </InfoPop>,
          )}
          {flag("showLocation", "Display My General Location on Home Screen")}
        </PrefCard>

        <PrefCard title="Account Information" testid="pref-privacy-account">
          {navRow("Blocked Users", "pref-privacy-blocked-users", () => navigate(pathFor("pref-blocked-users")))}
          {navRow(
            "Pause Account",
            "pref-privacy-pause",
            () => setModal(status.paused ? "reactivate" : "pause"),
            // inferred: popover copy (not captured; the icon sits inside the clickable row)
            <InfoPop testid="pref-privacy-pause-info" className="ml-4">
              Pausing hides your profile, content and offers from fans until you reactivate your account.
            </InfoPop>,
            status.paused && <span className="ml-3 rounded-pill border border-accent px-2.5 py-0.5 text-xs text-accent">Paused</span>,
          )}
          {navRow(
            "Delete Account",
            "pref-privacy-delete",
            () => setModal(status.deletionRequested ? "cancel-delete" : "delete"),
            <InfoPop testid="pref-privacy-delete-info" className="ml-4">
              Deleting your account permanently removes your profile, content and fan data after a 30-day grace period.
            </InfoPop>,
            status.deletionRequested && <span className="ml-3 rounded-pill border border-accent px-2.5 py-0.5 text-xs text-accent">Deletion requested</span>,
          )}
        </PrefCard>

        <PrefCard title="Linked Calendar" testid="pref-privacy-calendar">
          <div className="mt-[26px] flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm">
              <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-white text-[#1a73e8]">
                <CalendarDays size={16} />
              </span>
              {integ.googleCalendarLinked ? `Google Calendar Linked (${p.calendarEmail})` : "Google Calendar Not Linked" /* inferred */}
            </p>
            {integ.googleCalendarLinked ? (
              <button type="button" data-testid="pref-privacy-unlink-calendar" onClick={() => setModal("calendar")} className="text-[13px] text-accent hover:brightness-125">
                Unlink Calendar
              </button>
            ) : (
              // inferred: re-link (simulated, no OAuth)
              <button
                type="button"
                data-testid="pref-privacy-link-calendar"
                onClick={() => run("prefs.setCalendarLinked", (d) => setCalendarLinked(d, true), "account.admin", "Google Calendar linked")}
                className="text-[13px] text-accent hover:brightness-125"
              >
                Link Calendar
              </button>
            )}
          </div>
        </PrefCard>

        <section className="rounded-card bg-surface px-[30px] pt-[30px]" data-testid="pref-privacy-sharing">
          <div className="flex items-center border-b border-bg pb-5 text-base uppercase">
            <h3>Allow Sharing of my Information with Creators</h3>
            <InfoPop testid="pref-privacy-sharing-info" className="ml-5">
              These settings will determine if the creator has access to your age, gender, email, mobile phone, shipping address, in order to provide content and
              merchandise to you. You can edit the notifications you receive from the creator in Preferences &gt; Notifications &amp; Newsletters.
            </InfoPop>
          </div>
          <div className="pb-[22px] pt-[18px]">
            {p.sharingCreators.slice(0, shown).map((c) => (
              <div key={c.id} className="flex h-[46px] items-center justify-between">
                <span className="flex items-center gap-3">
                  <MiniAvatar name={c.name} src={personAvatar(c.id)} />
                  <p className="text-sm">{c.name}</p>
                </span>
                <TToggle
                  on={!!p.sharing[c.id]}
                  label={`Share my information with ${c.name}`}
                  testid={`pref-privacy-sharing-${c.id}`}
                  onChange={() => run("prefs.setSharing", (d) => setSharing(d, c.id, !p.sharing[c.id]))}
                />
              </div>
            ))}
          </div>
          {shown < p.sharingCreators.length && (
            <div className="-mx-[30px] flex h-[61px] items-center justify-center border-t border-white/10">
              <button type="button" data-testid="pref-privacy-sharing-see-more" onClick={() => setShown((s) => s + PAGE)} className="text-sm font-black uppercase tracking-caps text-accent hover:brightness-125">
                See More
              </button>
            </div>
          )}
        </section>

        <PrefCard
          title="Sign-in Methods"
          testid="pref-privacy-signin"
          info={
            <InfoPop testid="pref-privacy-signin-info" className="ml-5">
              You need to have at least two sign-in methods set up before you can disconnect one of them.
            </InfoPop>
          }
        >
          <div className="pt-[8px]">
            {METHODS.map((m) => {
              const on = integ.signIn[m.id];
              return (
                <div key={m.id} className="mt-[26px] flex h-9 items-center justify-between">
                  <p className="flex items-center gap-2.5 text-sm">
                    {m.icon}
                    {m.label}
                  </p>
                  {on ? (
                    <button
                      type="button"
                      data-testid={`pref-privacy-signin-${m.id}`}
                      data-state="active"
                      onClick={() => setModal({ disconnect: m.id })}
                      className="h-9 rounded-pill border border-accent px-[15px] text-sm font-extrabold text-accent"
                    >
                      Active
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-testid={`pref-privacy-signin-${m.id}`}
                      data-state="inactive"
                      onClick={() => run("prefs.setSignInMethod", (d) => setSignInMethod(d, m.id, true), "account.admin", `${m.label} sign-in activated`)}
                      className="h-9 rounded-pill bg-accent px-[15px] text-sm font-extrabold text-white hover:brightness-110"
                    >
                      Activate
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </PrefCard>

        <PrefCard title="Change Password" testid="pref-privacy-password">
          <form
            className="pt-[30px]"
            onSubmit={(e) => {
              e.preventDefault();
              if (pwValid) setModal("password");
            }}
          >
            <Label htmlFor="pw-old">Old Password</Label>
            <PasswordField id="pw-old" value={pw.old} onChange={(v) => setPw((x) => ({ ...x, old: v }))} testid="pref-privacy-password-old" />
            <div className="mt-5">
              <label htmlFor="pw-new" className="mb-4 flex items-center text-base">
                New Password
                <InfoPop testid="pref-privacy-password-info" align="left" className="ml-6" width={280}>
                  <b className="mb-1.5 block text-base">Secure Password Requirements:</b>
                  <ul className="list-disc space-y-1 pl-5 text-[13px] leading-[19px]">
                    <li>All standard special characters are allowed</li>
                    <li>Should have at least one special character</li>
                    <li>Should have at least one upper case character</li>
                    <li>Should have at least one lower case character</li>
                    <li>Should have at least one numerical digit</li>
                    <li>Should be of at least 8 characters</li>
                  </ul>
                </InfoPop>
              </label>
              <PasswordField
                id="pw-new"
                autoComplete="new-password"
                value={pw.next}
                invalid={pw.next !== "" && problems.length > 0}
                onChange={(v) => setPw((x) => ({ ...x, next: v }))}
                testid="pref-privacy-password-new"
              />
              {pw.next !== "" && problems.length > 0 && <FieldError>{problems[0]}</FieldError>}
            </div>
            <div className="mt-5">
              <Label htmlFor="pw-confirm">Confirm New Password</Label>
              <PasswordField
                id="pw-confirm"
                autoComplete="new-password"
                value={pw.confirm}
                invalid={mismatch}
                onChange={(v) => setPw((x) => ({ ...x, confirm: v }))}
                testid="pref-privacy-password-confirm"
              />
              {/* inferred copy */ mismatch && <FieldError>Passwords do not match</FieldError>}
            </div>
            <Button type="submit" className="mt-[35px] w-[180px]" disabled={!pwValid} data-testid="pref-privacy-password-submit">
              Change Password
            </Button>
          </form>
        </PrefCard>

        {/* ---------- modals ---------- */}
        <ProtectedModal
          open={modal === "pause"}
          onClose={close}
          title="Warning!"
          testid="pref-privacy-pause-modal"
          confirmLabel="Pause Temporarily"
          onConfirm={() => run("prefs.pauseAccount", pauseAccount, "account.admin", "Your account is paused") && close()}
        >
          {/* inferred: body copy (only title, field and buttons are in the source DOM) */}
          Pausing your account temporarily hides your profile, content, offers and chat rooms from fans and stops new subscriptions. You can reactivate your account
          at any time.
        </ProtectedModal>

        <ConfirmModal
          open={modal === "reactivate"}
          onClose={close}
          title="Reactivate Account" // inferred
          testid="pref-privacy-reactivate-modal"
          confirmLabel="Reactivate"
          cancelLabel="Cancel"
          onConfirm={() => run("prefs.reactivateAccount", reactivateAccount, "account.admin", "Your account is active again") && close()}
        >
          Reactivate your account? Your profile, content and offers will be visible to fans again.
        </ConfirmModal>

        <ProtectedModal
          open={modal === "delete"}
          onClose={close}
          title="Warning!"
          testid="pref-privacy-delete-modal"
          confirmLabel="Delete Account"
          phrase="DELETE"
          onConfirm={() => run("prefs.requestAccountDeletion", requestAccountDeletion, "account.admin", "Account deletion requested") && close()}
        >
          {/* PLACEHOLDER COPY (inferred, build prompt §5.2): the delete flow was not captured. */}
          Deleting your account is permanent. Your profile, content, products, fan relationships and wallet history will be removed after a 30-day grace period, and
          any active subscriptions will be cancelled. You can cancel the request during the grace period.
        </ProtectedModal>

        <ConfirmModal
          open={modal === "cancel-delete"}
          onClose={close}
          title="Cancel Account Deletion" // inferred
          testid="pref-privacy-cancel-delete-modal"
          confirmLabel="Keep My Account"
          cancelLabel="Close"
          onConfirm={() => run("prefs.cancelAccountDeletion", cancelAccountDeletion, "account.admin", "Account deletion cancelled") && close()}
        >
          Cancel the deletion request and keep your account?
        </ConfirmModal>

        <ConfirmModal
          open={modal === "calendar"}
          onClose={close}
          title="Unlink Calendar" // inferred
          testid="pref-privacy-calendar-modal"
          onConfirm={() => run("prefs.setCalendarLinked", (d) => setCalendarLinked(d, false), "account.admin", "Google Calendar unlinked") && close()}
        >
          Are you sure you want to unlink your Google Calendar? Scheduled livestreams and events will no longer be added to it.
        </ConfirmModal>

        {typeof modal === "object" && modal && "disconnect" in modal && (
          <ConfirmModal
            open
            onClose={close}
            title="Sign-in Methods"
            testid="pref-privacy-signin-modal"
            confirmLabel={activeCount < 2 ? "Okay" : "Disconnect"}
            cancelLabel="Cancel"
            onConfirm={() => {
              if (activeCount < 2) return close();
              const m = METHODS.find((x) => x.id === modal.disconnect)!;
              if (run("prefs.setSignInMethod", (d) => setSignInMethod(d, m.id, false), "account.admin", `${m.label} sign-in disconnected`)) close();
            }}
          >
            {activeCount < 2
              ? "You need to have at least two sign-in methods set up before you can disconnect one of them."
              : `Disconnect ${METHODS.find((x) => x.id === modal.disconnect)!.label} as a sign-in method?` /* inferred */}
          </ConfirmModal>
        )}

        <ConfirmModal
          open={modal === "password"}
          onClose={close}
          title="Change Password" // inferred: Protected-tier confirm step
          testid="pref-privacy-password-modal"
          confirmLabel="Change Password"
          cancelLabel="Cancel"
          onConfirm={() => {
            // Mock check: the old password just has to be non-empty. Passwords are never stored.
            if (run("prefs.changePassword", changePassword, "account.admin")) {
              setPw({ old: "", next: "", confirm: "" });
              setModal("password-done");
            } else close();
          }}
        >
          Change the password you use to sign in to TopFan?
        </ConfirmModal>

        <Modal open={modal === "password-done"} onClose={close} title="Password Reset Complete">
          <div data-testid="modal-pref-privacy-password-done" className="text-center">
            <p className="text-sm">Your password has been changed successfully.</p>
            {/* inferred: "Sign In" just closes the modal in the demo (no sign-out). */}
            <Button className="mt-6 w-[200px]" data-testid="pref-privacy-password-signin" onClick={close}>
              Sign In
            </Button>
          </div>
        </Modal>
      </div>
    </PreferencesPage>
  );
}
