/**
 * Preferences › Creator Type (/edit-preference/edit-creator) — spec 33, shots 33-*, 33a.
 * Edits are a local draft until SUBMIT. "Add Another Category Type" is inferred (build prompt §5.2).
 */
import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { PageProps } from "../types";
import { PreferencesPage } from "../../platform/PreferencesPage";
import { Button, FieldError, TextButton } from "../../platform/ui/controls";
import { Modal } from "../../platform/ui/surfaces";
import { useData } from "../../store/store";
import { CREATOR_CATEGORIES, CREATOR_QUESTIONS, newCreatorType, setCreatorTypes, type CreatorTypeEntry } from "../../store/slices/prefsA";
import { SelectChip, useRun } from "./ui";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

type Wizard =
  | { mode: "edit"; entryId: string; category: string; step: number; answers: Record<string, string[]> }
  | { mode: "add"; category: string | null; step: number; answers: Record<string, string[]> };

export function CreatorType({ route }: PageProps) {
  const saved = useData((d) => d.prefsA.creatorTypes);
  const run = useRun();
  const [types, setTypes] = useState<CreatorTypeEntry[]>(saved);
  const [wiz, setWiz] = useState<Wizard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => setTypes(saved), [saved]);

  const remaining = CREATOR_CATEGORIES.filter((c) => !types.some((t) => t.category === c));

  const submit = () => {
    if (!types.length) return setError("Select at least one Creator Type"); // inferred: validation copy
    setError("");
    run("prefs.setCreatorTypes", (d) => setCreatorTypes(d, types), "account.admin", "Creator Type updated"); // inferred: toast copy
  };

  return (
    <PreferencesPage>
      <div data-testid={`page-${route.id}`}>
        <div className="rounded-card bg-surface p-[30px]">
          <div className="text-base font-medium">Select what Type of Creator you are:</div>
          <p className="mt-1.5 text-[13px] italic">Note: Selecting a Creator Type allows your profile and content to be discovered by new fans.</p>

          {types.map((t, ti) => (
            <div key={t.id} data-testid={`pref-creator-type-${ti + 1}`} className="mt-[30px] rounded-popover border border-accent">
              <div className="flex h-16 items-center justify-between px-5">
                <h3 className="text-[15px]">
                  <span className="uppercase">Creator Type {ti + 1}:</span> {t.category}
                </h3>
                <button
                  type="button"
                  aria-label={`Remove ${t.category}`}
                  data-testid={`pref-creator-type-${ti + 1}-delete`}
                  onClick={() => setTypes((x) => x.filter((y) => y.id !== t.id))}
                  className="text-white hover:text-accent"
                >
                  <Trash2 size={22} fill="currentColor" className="[&>path:first-child]:fill-none" />
                </button>
              </div>
              {(CREATOR_QUESTIONS[t.category] ?? []).map((q, qi) => (
                <div key={q.id} className="border-t border-accent px-5 pb-5 pt-2.5">
                  <div className="relative rounded-popover bg-bg pt-3.5">
                    <h4 className="px-5 text-[13px] font-bold uppercase">Question {qi + 1}</h4>
                    <p className="mt-[13px] px-5 pb-4 text-base">{q.text}</p>
                    <button
                      type="button"
                      aria-label={`Edit question ${qi + 1}`}
                      data-testid={`pref-creator-type-${ti + 1}-edit-q${qi + 1}`}
                      onClick={() => setWiz({ mode: "edit", entryId: t.id, category: t.category, step: qi, answers: { ...t.answers } })}
                      className="absolute right-5 top-3.5 text-white hover:text-accent"
                    >
                      <Pencil size={18} fill="currentColor" />
                    </button>
                    <div className="border-t border-line px-5 py-[15px] text-[15px] font-black">{(t.answers[q.id] ?? []).join(", ") || "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {!types.length && (
            // inferred: empty state after removing every type
            <p className="mt-[30px] rounded-popover border border-accent px-5 py-6 text-sm text-muted" data-testid="pref-creator-type-empty">
              No Creator Type selected yet. Use ADD ANOTHER CREATOR TYPE to choose one.
            </p>
          )}
          <FieldError>{error}</FieldError>
        </div>

        <div className="mt-[31px] flex flex-wrap gap-2.5">
          <Button type="submit" data-testid="pref-creator-type-submit" onClick={submit}>
            Submit
          </Button>
          <Button
            data-testid="pref-creator-type-add"
            disabled={!remaining.length}
            onClick={() => setWiz({ mode: "add", category: null, step: -1, answers: {} })}
          >
            Add Another Creator Type
          </Button>
        </div>

        {wiz && (
          <CreatorWizard
            wiz={wiz}
            setWiz={setWiz}
            options={remaining}
            onDone={(w) => {
              if (w.mode === "edit") setTypes((x) => x.map((t) => (t.id === w.entryId ? { ...t, answers: w.answers } : t)));
              else if (w.category) setTypes((x) => [...x, newCreatorType(w.category!, w.answers)]);
              setWiz(null);
            }}
          />
        )}
      </div>
    </PreferencesPage>
  );
}

function CreatorWizard({ wiz, setWiz, options, onDone }: { wiz: Wizard; setWiz: (w: Wizard | null) => void; options: string[]; onDone: (w: Wizard) => void }) {
  const questions = wiz.category ? CREATOR_QUESTIONS[wiz.category] ?? [] : [];
  // Source quirk reproduced (33a): the current answer is NOT pre-highlighted when a question opens.
  const [picked, setPicked] = useState<string[]>([]);
  const q = wiz.step >= 0 ? questions[wiz.step] : null;
  const isPickType = wiz.step < 0;
  const last = !isPickType && wiz.step >= questions.length - 1;
  const title = wiz.mode === "add" ? "Add Another Category Type" : `Edit ${wiz.category}`;
  const close = () => setWiz(null);

  const next = () => {
    if (isPickType) {
      const category = picked[0];
      const w: Wizard = { ...wiz, category, step: 0, answers: {} } as Wizard;
      setPicked([]);
      if (!(CREATOR_QUESTIONS[category] ?? []).length) return onDone(w);
      return setWiz(w);
    }
    const answers = { ...wiz.answers, [q!.id]: picked };
    setPicked([]);
    if (last) return onDone({ ...wiz, answers } as Wizard);
    setWiz({ ...wiz, step: wiz.step + 1, answers } as Wizard);
  };

  const opts = isPickType ? options : q?.options ?? [];
  const multi = !isPickType && !!q?.multi;
  return (
    <Modal open onClose={close} title={title}>
      <div data-testid={wiz.mode === "add" ? "modal-pref-creator-type-add" : "modal-pref-creator-type-edit"}>
        <div className="min-h-[285px]">
          <p className="mb-4 text-base">{isPickType ? "What type of Content Creator are you?" : q?.text}</p>
          <div className="flex flex-wrap gap-x-2 gap-y-[9px]">
            {opts.map((o) => (
              <SelectChip
                key={o}
                size="lg"
                selected={picked.includes(o)}
                testid={`pref-creator-option-${slug(o)}`}
                onClick={() => setPicked((p) => (multi ? (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]) : [o]))}
              >
                {o}
              </SelectChip>
            ))}
          </div>
        </div>
        <div className="-mx-[30px] -mb-6 mt-0 flex items-center justify-end gap-3 border-t border-line px-[30px] py-5">
          <TextButton data-testid="pref-creator-wizard-cancel" className="w-[120px] justify-center" onClick={close}>
            Cancel
          </TextButton>
          <Button data-testid="pref-creator-wizard-next" className="w-[120px]" disabled={!picked.length} onClick={next}>
            {last ? "Save" : "Next" /* inferred: last-step label */}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

