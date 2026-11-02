/**
 * Developer-only demo controls (inside the review bar, toggled with "R"): switch the demo role and
 * creator profile. Not part of TopFan's own UI. Roles are enforced by the store (store/permissions),
 * so switching to a delegate really blocks owner-only and money actions everywhere.
 */
import { act, useData } from "../store/store";
import { ROLE_LABEL } from "../store/permissions";
import type { Role } from "../store/model";
import { PROFILES, applyProfile } from "./profiles";

export function DevSwitcher() {
  const role = useData((d) => d.account.session.role);
  const profile = useData((d) => d.account.session.profileId);
  const sel = "h-7 rounded-full border border-line bg-black px-2 text-xs text-white";
  return (
    <span className="flex items-center gap-1 border-l border-line pl-2" data-testid="dev-switcher">
      <select
        aria-label="Demo creator profile"
        data-testid="dev-profile"
        value={profile}
        onChange={(e) => applyProfile(e.target.value)}
        className={sel}
      >
        {PROFILES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Demo role"
        data-testid="dev-role"
        value={role}
        onChange={(e) => act("dev.role", (d) => void (d.account.session.role = e.target.value as Role))}
        className={sel}
      >
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
    </span>
  );
}
