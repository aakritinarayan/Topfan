/**
 * Preferences › Notifications & Newsletters (/edit-preference/notifications) — spec 35, shots 35-*, 35a.
 * No save button in the source: every control saves on change.
 */
import { useState } from "react";
import type { PageProps } from "../types";
import { PreferencesPage } from "../../platform/PreferencesPage";
import { useData, useMockLoading } from "../../store/store";
import { setCreatorNotification, setPostNotification } from "../../store/slices/prefsA";
import { InfoPop, MiniAvatar, PrefCard, RoundCheck, Skel, TToggle, useRun } from "./ui";

/** Column widths so the header centres sit at −370/−270/−190/−130/−50px from the card's inner right edge (spec 35). */
const COLS = [
  { id: "activity", label: "Activity", w: 100 },
  { id: "browser", label: "Browser", w: 100 },
  { id: "email", label: "Email", w: 60 },
  { id: "sms", label: "SMS", w: 60 },
  { id: "newsletter", label: "Newsletter", w: 100 },
] as const;
const PAGE = 10;

export function Notifications({ route }: PageProps) {
  const loading = useMockLoading(1500);
  const n = useData((d) => d.prefsA.notifications);
  const run = useRun();
  const [shown, setShown] = useState(PAGE);

  return (
    <PreferencesPage>
      <div data-testid={`page-${route.id}`}>
        {loading ? (
          <div className="rounded-card bg-surface p-[30px]" data-testid="pref-notifications-skeleton" aria-busy="true">
            <div className="flex items-center justify-between">
              <Skel className="h-5 w-[300px] rounded" />
              <div className="flex gap-4">
                {COLS.map((c) => (
                  <Skel key={c.id} className="h-3 w-11 rounded" />
                ))}
              </div>
            </div>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="mt-11 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skel className="h-10 w-10 rounded-full" />
                  <Skel className="h-3.5 w-[120px] rounded" />
                </div>
                <div className="flex gap-4">
                  {COLS.map((c) => (
                    <Skel key={c.id} className="h-5 w-11 rounded-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <PrefCard title="Receive Activity Notifications on my Posts" weight="font-medium" testid="pref-notifications-posts" className="[&>div:first-child]:border-0 [&>div:first-child]:pb-0">
              {(
                [
                  ["comments", "New comments on my posts"],
                  ["reactions", "New reactions on my posts"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex h-[65px] items-center justify-between border-b border-white/10">
                  <RoundCheck
                    checked={n.posts[key].checked}
                    onChange={() => run("prefs.setPostNotification", (d) => setPostNotification(d, key, "checked", !n.posts[key].checked))}
                    label={label}
                    testid={`pref-notifications-${key}-check`}
                  />
                  <TToggle
                    on={n.posts[key].on}
                    label={label}
                    testid={`pref-notifications-${key}-toggle`}
                    onChange={() => run("prefs.setPostNotification", (d) => setPostNotification(d, key, "on", !n.posts[key].on))}
                  />
                </div>
              ))}
            </PrefCard>

            <section className="mt-6 rounded-card bg-surface px-[30px] pt-[30px]" data-testid="pref-notifications-creators">
              <div className="flex items-center justify-between border-b border-white/10 pb-[22px]">
                <h3 className="min-w-0 pr-4 text-base uppercase leading-6">
                  Receive Notifications &amp; Newsletters
                  <InfoPop testid="pref-notifications-info" align="right" className="ml-5 align-[-2px]">
                    These settings will allow you receive notification in the Activity Center, Browser Notifications (if enabled in your browser) when important
                    creator events happen, including New Content Posts, Personalized Emails and SMS text messages to you.
                  </InfoPop>
                </h3>
                <div className="flex">
                  {COLS.map((c) => (
                    <span key={c.id} style={{ width: c.w }} className="text-center text-base uppercase">
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pb-[22px] pt-[26px]">
                {n.creators.slice(0, shown).map((c) => (
                  <div key={c.id} className="flex h-[46px] items-center justify-between" data-testid={`pref-notifications-row-${c.id}`}>
                    <span className="flex items-center gap-3">
                      <MiniAvatar name={c.name} />
                      <p className="text-sm">{c.name}</p>
                    </span>
                    <span className="flex">
                      {COLS.map((col) => {
                        const on = n.matrix[c.id]?.[col.id] ?? true;
                        return (
                          <span key={col.id} style={{ width: col.w }} className="flex justify-center">
                            <TToggle
                              on={on}
                              label={`${col.label} notifications from ${c.name}`}
                              testid={`pref-notifications-${c.id}-${col.id}`}
                              onChange={() => run("prefs.setCreatorNotification", (d) => setCreatorNotification(d, c.id, col.id, !on))}
                            />
                          </span>
                        );
                      })}
                    </span>
                  </div>
                ))}
              </div>
              {shown < n.creators.length && (
                <div className="-mx-[30px] flex h-[61px] items-center justify-center border-t border-white/10">
                  <button
                    type="button"
                    data-testid="pref-notifications-see-more"
                    onClick={() => setShown((s) => s + PAGE)}
                    className="text-sm font-black uppercase tracking-caps text-accent hover:brightness-125"
                  >
                    See More
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </PreferencesPage>
  );
}

