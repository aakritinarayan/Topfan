/**
 * "Preferences" title + 16 chip tabs, WHITE LABEL SITE active (P30 chip row; P50).
 * Only the White Label Site tab is recreated for this demo; other chips do nothing.
 */
import type { ReactNode } from "react";
import { preferenceTabs } from "../config/demo";
import { ChipTab } from "./ui/controls";

export function PreferencesPage({ children }: { children: ReactNode }) {
  return (
    <>
      <h4 className="text-2xl font-bold">Preferences</h4>
      <div className="mt-[30px] flex flex-wrap gap-x-2 gap-y-2.5">
        {preferenceTabs.map((t) => (
          <ChipTab key={t} active={t === "White Label Site"} tabIndex={t === "White Label Site" ? 0 : -1}>
            {t}
          </ChipTab>
        ))}
      </div>
      <div className="mt-10">{children}</div>
    </>
  );
}
