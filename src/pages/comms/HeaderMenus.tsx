/**
 * Header › Language menu (globe, P70) and Avatar menu (P71). Shell imports LanguageMenu / AvatarMenu.
 * Source quirk kept: Escape does NOT close either menu; clicking the trigger again (or outside) does.
 */
import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { IconCircle } from "../../platform/ui/controls";
import { Avatar } from "../../platform/ui/surfaces";
import { useToast } from "../../platform/ui/toast";
import { Link, useRouter } from "../../app/router";
import { pathFor } from "../../app/routeCatalog";
import { act, useData } from "../../store/store";
import { LANGUAGES, setLanguage, signIn, signOut } from "../../store/slices/comms";

/** Outside-click close only (no Escape — matches the source). */
function useClickOutside(ref: React.RefObject<HTMLElement | null>, close: () => void, active: boolean) {
  const fn = useRef(close);
  fn.current = close;
  useEffect(() => {
    if (!active) return;
    const down = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && fn.current();
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [active, ref]);
}

export function LanguageMenu() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const current = useData((d) => d.comms.language ?? "English");
  const toast = useToast();
  useClickOutside(ref, () => setOpen(false), open);
  const shown = LANGUAGES.filter((l) => l.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div ref={ref} className="relative">
      <IconCircle aria-label="Select Language" aria-expanded={open} data-testid="header-language" onClick={() => setOpen((o) => !o)}>
        <Globe size={22} />
      </IconCircle>
      {open && (
        <div data-testid="menu-language" className="absolute right-[-52px] top-[48px] z-50 w-[220px] rounded-popover bg-surface shadow-[0_8px_24px_rgba(0,0,0,.35)]">
          <div className="border-b border-bg p-[8px]">
            <input

              data-testid="menu-language-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search language..."
              aria-label="Search language"
              className="h-[34px] w-full rounded-[6px] border border-bg bg-white/[.06] px-[12px] text-[13px] text-white outline-none placeholder:text-muted focus:border-accent"
            />
          </div>
          <ul role="menu" className="max-h-[280px] overflow-y-auto py-[4px] [scrollbar-color:#6b6b6b_transparent] [scrollbar-width:thin]">
            {shown.map((l) => (
              <li key={l}>
                <button
                  role="menuitemradio"
                  aria-checked={l === current}
                  data-testid={`menu-language-${LANGUAGES.indexOf(l)}`}
                  onClick={() => {
                    setOpen(false);
                    setQ("");
                    if (l === current) return;
                    act("comms.setLanguage", (d) => setLanguage(d, l));
                    // inferred: translations are out of scope for the mock, so the copy stays English
                    toast(`Language set to ${l}. (Demo: text stays in English.)`);
                  }}
                  className={`block h-[34px] w-full px-[14px] text-left text-[14px] hover:bg-white/[.06] ${l === current ? "font-semibold text-accent" : "text-white"}`}
                >
                  {l}
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="px-[14px] py-[8px] text-[14px] text-muted">No languages found</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

export function AvatarMenu({ avatar }: { avatar: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { navigate } = useRouter();
  const toast = useToast();
  const signedOut = useData((d) => d.comms.signedOut ?? false);
  useClickOutside(ref, () => setOpen(false), open);

  if (signedOut)
    // inferred: logged-out header state was not captured (REFERENCE › Not yet captured)
    return (
      <button
        data-testid="header-sign-in"
        onClick={() => {
          act("comms.signIn", (d) => signIn(d));
          toast("Signed in as AJ White");
        }}
        className="inline-flex h-[40px] items-center rounded-[22px] bg-accent px-[20px] text-[14px] text-white hover:brightness-110"
      >
        Sign In
      </button>
    );

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };
  const item = "block w-full py-[11px] text-center text-[14px] text-white hover:text-accent";
  return (
    <div ref={ref} className="relative">
      <button aria-label="Account menu" aria-haspopup="menu" aria-expanded={open} data-testid="header-avatar" onClick={() => setOpen((o) => !o)}>
        <Avatar src={avatar} size={42} ring={2} />
      </button>
      {open && (
        <div role="menu" data-testid="menu-avatar" className="absolute right-[0px] top-[46px] z-50 w-[225px] rounded-panel border border-accent bg-surface px-[24px] pb-[24px] pt-[13px]">
          <button role="menuitem" data-testid="menu-avatar-preferences" onClick={() => go("/edit-preference")} className={item}>
            Edit Preferences
          </button>
          <p className="py-[8px] text-center text-[14px] text-white" data-testid="menu-avatar-terms-row">
            <Link to={pathFor("terms")} role="menuitem" data-testid="menu-avatar-terms" onClick={() => setOpen(false)} className="hover:text-accent">
              Terms
            </Link>
            {" & "}
            <Link to={pathFor("privacy-policy")} role="menuitem" data-testid="menu-avatar-privacy" onClick={() => setOpen(false)} className="hover:text-accent">
              Privacy Policy
            </Link>
          </p>
          <button role="menuitem" data-testid="menu-avatar-help" onClick={() => go(pathFor("help-faq"))} className={`${item} pt-[13px]`}>
            Help Center &amp; FAQ
          </button>
          <div className="mx-auto mb-[20px] mt-[11px] h-px w-[175px] bg-surface-2" />
          <button
            role="menuitem"
            data-testid="menu-avatar-sign-out"
            onClick={() => {
              setOpen(false);
              act("comms.signOut", (d) => signOut(d));
              navigate("/");
              toast("You have been signed out. (Demo)");
            }}
            className="h-[40px] w-[175px] rounded-[22px] bg-accent px-[16px] text-[14px] text-white hover:brightness-110"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
