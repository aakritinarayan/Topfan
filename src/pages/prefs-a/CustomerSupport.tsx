/**
 * Preferences › Customer Support (/edit-preference/customer-support) — spec 34, shots 34-*.
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { PageProps } from "../types";
import { PreferencesPage } from "../../platform/PreferencesPage";
import { Button } from "../../platform/ui/controls";
import { useData } from "../../store/store";
import { isEmail, setSupportEmails, SUPPORT_INQUIRIES, TOPFAN_HANDLED, type SupportInquiry } from "../../store/slices/prefsA";
import { InfoPop, useRun } from "./ui";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function CustomerSupport({ route }: PageProps) {
  const saved = useData((d) => d.prefsA.customerSupport);
  const run = useRun();
  const [emails, setEmails] = useState(saved);
  useEffect(() => setEmails(saved), [saved]);
  const dirty = JSON.stringify(emails) !== JSON.stringify(saved);
  const empty = SUPPORT_INQUIRIES.some((i) => !emails[i.id].length);

  return (
    <PreferencesPage>
      <div data-testid={`page-${route.id}`}>
        <h2 className="flex items-center text-2xl font-bold">
          Customer Support
          <InfoPop testid="pref-support-info" align="right" className="ml-2">
            Select the email address that should receive customer support emails for each inquiry type.
          </InfoPop>
        </h2>

        <div className="mt-[25px] rounded-inner bg-surface p-5" data-testid="pref-support-editable">
          <div className="grid grid-cols-[minmax(0,281fr)_minmax(0,464fr)] border-b border-bg pb-[18px] pt-[17px] text-sm font-semibold">
            <span>Inquiry Type</span>
            <span>Email Addresses</span>
          </div>
          {SUPPORT_INQUIRIES.map((inq) => (
            <div key={inq.id} className="grid grid-cols-[minmax(0,281fr)_minmax(0,464fr)] items-center border-b border-bg py-4" data-testid={`pref-support-row-${inq.id}`}>
              <span className="text-[15px] font-semibold">{inq.label}</span>
              <EmailChips
                id={inq.id}
                values={emails[inq.id]}
                onChange={(v) => setEmails((e) => ({ ...e, [inq.id]: v }))}
              />
            </div>
          ))}
          {/* inferred: validation */ empty && <p className="mt-3 text-[13px] text-danger">Each inquiry type needs at least one email address.</p>}
          <div className="flex justify-end pt-4">
            <Button
              data-testid="pref-support-save"
              disabled={!dirty || empty}
              onClick={() => run("prefs.setSupportEmails", (d) => setSupportEmails(d, emails), "account.admin", "Changes saved")} // inferred: toast copy
            >
              Save Changes
            </Button>
          </div>
        </div>

        <div className="mt-6 rounded-inner bg-surface p-5" data-testid="pref-support-topfan">
          <h3 className="flex items-center pb-4 text-lg font-bold">
            Handled by TopFan
            <InfoPop testid="pref-support-topfan-info" align="right" className="ml-2">
              These inquiries go to the TopFan Customer Support Team and can't be changed.
            </InfoPop>
          </h3>
          {TOPFAN_HANDLED.map((l) => (
            <div key={l} className="flex h-[60px] items-center justify-between border-t border-bg" data-testid={`pref-support-locked-${slug(l)}`}>
              <span className="text-[15px] font-semibold">{l}</span>
              <span className="rounded-[24px] bg-bg px-3 py-1.5 text-xs">TopFan Customer Support Team</span>
            </div>
          ))}
        </div>
      </div>
    </PreferencesPage>
  );
}

function EmailChips({ id, values, onChange }: { id: SupportInquiry; values: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const add = () => {
    const v = text.trim().replace(/,$/, "");
    if (!v) return;
    if (!isEmail(v)) return setErr("Enter a valid email address"); // inferred: validation copy
    if (values.includes(v)) return setErr("This email is already added");
    onChange([...values, v]);
    setText("");
    setErr("");
  };
  return (
    <div>
      <div className="flex min-h-[54px] flex-wrap items-center gap-2 rounded-panel border border-bg px-3 py-2">
        {values.map((v) => (
          <span key={v} className="group inline-flex h-9 items-center gap-1.5 rounded-panel border-2 border-bg px-3 text-[13px]">
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              data-testid={`pref-support-${id}-remove-${v}`}
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
            >
              <X size={13} />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => (setText(e.target.value), setErr(""))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !text && values.length) onChange(values.slice(0, -1));
          }}
          placeholder="Press enter to add another email"
          aria-label="Add email address"
          data-testid={`pref-support-${id}-input`}
          className="min-w-[180px] flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted"
        />
      </div>
      {err && <p className="mt-1.5 pl-3 text-[13px] text-danger">{err}</p>}
    </div>
  );
}
