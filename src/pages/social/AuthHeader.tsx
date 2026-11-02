/**
 * Logged-out header variant (inferred: the logged-out fan view was not captured).
 * Used by the Home marketing header. Exported so the shell header can show the same actions when
 * account.session.fanView === "logged-out" (the shell is owned by core; see NOTES.md).
 */
import { openOverlay } from "../../app/ui";
import { useData } from "../../store/store";
import { LanguageMenu, AvatarMenu } from "../comms/HeaderMenus";

export function LoggedOutHeaderActions() {
  return (
    <div className="flex items-center gap-[12px]" data-testid="header-logged-out">
      <LanguageMenu />
      <button
        data-testid="header-sign-in"
        onClick={() => openOverlay("sign-in")}
        className="inline-flex h-[40px] items-center rounded-pill border border-accent px-[20px] text-[14px] font-black uppercase tracking-caps text-white hover:bg-accent-tint"
      >
        Sign In
      </button>
      <button
        data-testid="header-join"
        onClick={() => openOverlay("join")}
        className="inline-flex h-[40px] items-center rounded-pill bg-accent px-[20px] text-[14px] font-black uppercase tracking-caps text-white hover:brightness-110"
      >
        Join
      </button>
    </div>
  );
}

/** Right side of a header: globe + avatar when signed in; globe + SIGN IN + JOIN when logged out. */
export function HeaderActions() {
  const view = useData((d) => d.account.session.fanView);
  const avatar = useData((d) => d.account.avatar);
  if (view === "logged-out") return <LoggedOutHeaderActions />;
  return (
    <div className="flex items-center gap-[12px]">
      <LanguageMenu />
      <AvatarMenu avatar={avatar} />
    </div>
  );
}
