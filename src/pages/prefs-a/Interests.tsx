/**
 * Preferences › Interests (/edit-preference/edit-content) — spec 32, shots 32-*.
 */
import { useEffect, useState } from "react";
import type { PageProps } from "../types";
import { PreferencesPage } from "../../platform/PreferencesPage";
import { Button } from "../../platform/ui/controls";
import { useData } from "../../store/store";
import { INTERESTS, setInterests } from "../../store/slices/prefsA";
import { SelectChip, useRun } from "./ui";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function Interests({ route }: PageProps) {
  const saved = useData((d) => d.prefsA.interests);
  const run = useRun();
  const [sel, setSel] = useState<string[]>(saved);
  useEffect(() => setSel(saved), [saved]);
  const toggle = (i: string) => setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  return (
    <PreferencesPage>
      <div data-testid={`page-${route.id}`}>
        <div className="rounded-card bg-surface p-[30px] pb-[46px]">
          <p className="mb-6 text-base">What are your Interests? (Select as many as you like):</p>
          <div className="flex flex-wrap gap-x-2 gap-y-4">
            {INTERESTS.map((i) => (
              <SelectChip key={i} selected={sel.includes(i)} onClick={() => toggle(i)} testid={`pref-interests-${slug(i)}`}>
                {i}
              </SelectChip>
            ))}
          </div>
        </div>
        <Button
          className="mt-[30px] w-[170px]"
          data-testid="pref-interests-update"
          onClick={() => run("prefs.setInterests", (d) => setInterests(d, sel), "content.write", "Interests updated")} // inferred: toast copy
        >
          Update
        </Button>
      </div>
    </PreferencesPage>
  );
}
