/**
 * Header › Language menu (globe, P70) and Avatar menu (P71). Owned by the Comms build: refine
 * against screenshots 70-menu-language.jpg and 71-menu-avatar.jpg.
 */
import { useRef, useState } from "react";
import { Globe } from "lucide-react";
import { IconCircle, useOutside } from "../../platform/ui/controls";
import { Avatar } from "../../platform/ui/surfaces";
import { useRouter } from "../../app/router";

export function LanguageMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  return (
    <div ref={ref} className="relative">
      <IconCircle aria-label="Language" aria-expanded={open} data-testid="header-language" onClick={() => setOpen((o) => !o)}>
        <Globe size={22} />
      </IconCircle>
      {open && (
        <div role="menu" data-testid="menu-language" className="absolute right-0 top-[52px] z-50 w-[180px] rounded-popover border border-line bg-surface py-2">
          {["English"].map((l) => (
            <button key={l} role="menuitem" onClick={() => setOpen(false)} className="block w-full px-4 py-2 text-left text-sm hover:bg-accent-tint">
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AvatarMenu({ avatar }: { avatar: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { navigate } = useRouter();
  useOutside(ref, () => setOpen(false), open);
  const items: [string, string, string][] = [
    ["Edit Preferences", "/edit-preference", "menu-avatar-preferences"],
    ["Terms & Privacy Policy", "/terms-of-service", "menu-avatar-terms"],
    ["Help Center & FAQ", "/help-faq", "menu-avatar-help"],
    ["Sign Out", "", "menu-avatar-sign-out"],
  ];
  return (
    <div ref={ref} className="relative">
      <button aria-label="Account menu" aria-expanded={open} data-testid="header-avatar" onClick={() => setOpen((o) => !o)}>
        <Avatar src={avatar} size={42} ring={2} />
      </button>
      {open && (
        <div role="menu" data-testid="menu-avatar" className="absolute right-0 top-[52px] z-50 w-[240px] rounded-popover border border-line bg-surface py-2">
          {items.map(([label, to, id]) => (
            <button
              key={id}
              role="menuitem"
              data-testid={id}
              onClick={() => {
                setOpen(false);
                if (to) navigate(to);
              }}
              className="block w-full px-4 py-2.5 text-left text-sm hover:bg-accent-tint"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
