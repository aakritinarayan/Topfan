/** Monetize › Advertisements: Ad Preferences (14l, loading 14x) and Earnings (14m). */
import { useMemo, useState } from "react";
import { ChevronRight, Crown, Search } from "lucide-react";
import { useData, useMockLoading } from "../../../store/store";
import { approveAdBrand, declineAdBrand, money, saveAdPreferences, type AdCatalogBrand } from "../../../store/slices/monetize";
import type { AdBrand } from "../../../store/model";
import { Radio } from "../../../platform/ui/controls";
import { ImageSlot, Modal } from "../../../platform/ui/surfaces";
import { useToast } from "../../../platform/ui/toast";
import type { PageProps } from "../../types";
import { Checkbox, ConfirmModal, MiniSelect, MonetizeFrame, Pill, TableCard, td, th, useRun } from "../ui";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function AdsTab({ route }: PageProps) {
  const [tab, setTab] = useState<"prefs" | "earnings">("prefs");
  return (
    <MonetizeFrame routeId={route.id} active="monetize-advertisements">
      <div role="tablist" className="flex gap-[10px]">
        {(
          [
            ["prefs", "Ad Preferences"],
            ["earnings", "Earnings"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            data-testid={`monetize-ads-tab-${id}`}
            onClick={() => setTab(id)}
            className={`h-[40px] rounded-pill px-[20px] text-[14px] font-black uppercase tracking-caps ${tab === id ? "bg-accent" : "bg-surface hover:brightness-125"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-[20px]">{tab === "prefs" ? <AdPreferences /> : <Earnings />}</div>
    </MonetizeFrame>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-[12px] text-[14px]" role="status">
      <span className="h-[32px] w-[32px] animate-spin rounded-full border-[3px] border-white/20 border-l-accent motion-reduce:animate-none" />
      {label}
    </div>
  );
}

const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/** 50px white brand circle: the brand's logo (media key) when it has one, else its initials. */
function BrandMark({ name, logo, className = "" }: { name: string; logo?: string | null; className?: string }) {
  return (
    <span className={`flex h-[50px] w-[50px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-[14px] font-black text-black ${className}`}>
      {logo ? <ImageSlot src={logo} fit="contain" label={`${name} logo`} className="h-full w-full" rounded="rounded-full" /> : initials(name)}
    </span>
  );
}

function AdPreferences() {
  const ads = useData((d) => d.monetize.ads);
  const newBrands = useData((d) => d.monetize.adBrands.filter((b) => b.status === "new"));
  const loading = useMockLoading(900);
  const [enabled, setEnabled] = useState(ads.enabled);
  const [auto, setAuto] = useState(ads.autoEnableNew);
  const [sel, setSel] = useState<string[]>(() => ads.catalog.filter((b) => b.enabled).map((b) => b.id));
  const [cat, setCat] = useState("All Categories");
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [approve, setApprove] = useState<AdBrand | null>(null);
  const run = useRun();
  const toast = useToast();

  const visible = useMemo(
    () => ads.catalog.filter((b) => (cat === "All Categories" || b.categories.includes(cat)) && b.name.toLowerCase().includes(q.trim().toLowerCase())),
    [ads.catalog, cat, q],
  );
  const allSel = visible.length > 0 && visible.every((b) => sel.includes(b.id));
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const cats = ["New Brands to Review", "All Categories", ...ads.categories];

  return (
    <>
      <section className="rounded-card bg-surface px-[24px] pb-[24px] pt-[24px]" data-testid="monetize-ads-preferences">
        <h3 className="text-[18px] font-bold">Advertisement Preferences</h3>
        <div className="mt-[30px] flex gap-[40px]" data-testid="monetize-ads-enable">
          <Radio name="ads-enable" checked={enabled} onChange={() => setEnabled(true)}>
            Enable Ads
          </Radio>
          <Radio name="ads-enable" checked={!enabled} onChange={() => setEnabled(false)}>
            Disable Ads
          </Radio>
        </div>
        <div className="mt-[28px] flex gap-[48px]">
          <div className="w-[276px] shrink-0">
            {loading ? (
              <div className="pt-[44px]">
                <Spinner label="Loading categories..." />
              </div>
            ) : (
              <ul data-testid="monetize-ads-categories">
                {cats.map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      data-testid={`monetize-ads-cat-${c.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                      onClick={() => setCat(c)}
                      className={`flex h-[55px] w-full items-center gap-[10px] rounded-[4px] px-[10px] text-left text-[14px] ${cat === c ? "bg-accent font-bold" : "hover:bg-white/5"}`}
                    >
                      <span className="flex-1">{c}</span>
                      {c === "New Brands to Review" && newBrands.length > 0 && (
                        <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-danger text-[11px]">{newBrands.length}</span>
                      )}
                      <ChevronRight size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="min-w-0 flex-1 rounded-inner bg-bg p-[16px]">
            <Checkbox checked={auto} onChange={() => setAuto((a) => !a)} label="Enable All New Brands in All Categories Automatically" testid="monetize-ads-auto">
              <span className="text-[14px] font-bold">Enable All New Brands in All Categories Automatically</span>
            </Checkbox>
            {cat !== "New Brands to Review" && (
              <label className="mt-[18px] flex h-[40px] items-center gap-[14px] rounded-pill bg-surface px-[16px]">
                <Search size={18} className="text-accent" strokeWidth={3} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Brands" aria-label="Search Brands" data-testid="monetize-ads-search" className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted" />
              </label>
            )}
            {loading ? (
              <div className="flex h-[200px] items-center justify-center">
                <Spinner label="Loading brands" />
              </div>
            ) : cat === "New Brands to Review" ? (
              <div className="mt-[16px] flex flex-col gap-[10px]" data-testid="monetize-ads-new-brands">
                {newBrands.length ? (
                  newBrands.map((b) => (
                    <div key={b.id} className="flex items-center gap-[14px] rounded-inner bg-surface p-[12px]" data-testid={`monetize-ads-new-${b.id}`}>
                      <BrandMark name={b.name} logo={b.logo} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-medium">{b.name}</span>
                        <span className="text-[13px] text-[#c8c8c8]">({b.offer})</span>
                      </span>
                      {/* inferred: review controls (not captured) */}
                      <button type="button" data-testid={`monetize-ads-decline-${b.id}`} onClick={() => run("monetize.declineAdBrand", (d) => declineAdBrand(d, b.id), "content.write", `${b.name} declined`)} className="h-[32px] px-[12px] text-[12px] font-black uppercase hover:text-accent">
                        Decline
                      </button>
                      <Pill className="!h-[32px] !text-[12px]" data-testid={`monetize-ads-approve-${b.id}`} onClick={() => setApprove(b)}>
                        Approve
                      </Pill>
                    </div>
                  ))
                ) : (
                  <p className="py-[40px] text-center text-[14px] text-[#c8c8c8]">No New Brands to Review</p>
                )}
              </div>
            ) : (
              <>
                <div className="mt-[16px]">
                  <Checkbox
                    checked={allSel}
                    onChange={() => setSel((s) => (allSel ? s.filter((id) => !visible.some((b) => b.id === id)) : [...new Set([...s, ...visible.map((b) => b.id)])]))}
                    label="Select All"
                    testid="monetize-ads-select-all"
                  >
                    <span className="text-[14px] font-bold">Select All</span>
                  </Checkbox>
                </div>
                <ul className="mt-[10px] [&::-webkit-scrollbar-thumb]:bg-accent [&::-webkit-scrollbar]:w-[5px] max-h-[385px] overflow-y-auto pr-[12px]" data-testid="monetize-ads-brands">
                  {visible.map((b: AdCatalogBrand) => (
                    <li key={b.id} className="flex h-[70px] items-center">
                      <Checkbox checked={sel.includes(b.id)} onChange={() => toggle(b.id)} label={b.name} testid={`monetize-ads-brand-${b.id}`}>
                        <BrandMark name={b.name} logo={b.logo} className="ml-[4px]" />
                        <span>
                          <span className="block text-[16px] font-medium">{b.name}</span>
                          <span className="text-[13px] text-[#c8c8c8]">({b.categories.join(", ")})</span>
                        </span>
                      </Checkbox>
                    </li>
                  ))}
                  {!visible.length && <li className="py-[30px] text-center text-[14px] text-[#c8c8c8]">No Brands Found</li>}
                </ul>
              </>
            )}
          </div>
        </div>
        <div className="mt-[26px] flex justify-end">
          <Pill data-testid="monetize-ads-save" className="w-[100px]" disabled={loading} onClick={() => setConfirm(true)}>
            Save
          </Pill>
        </div>
      </section>

      <section className="mt-[16px] flex gap-[16px] rounded-card bg-surface px-[24px] py-[30px]" data-testid="monetize-ads-referral">
        <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[6px] bg-accent/25 text-accent">
          <Crown size={22} fill="currentColor" />
        </span>
        <div className="text-[16px] leading-[20px] text-soft">
          <h3 className="pt-[6px] text-[18px] font-bold text-white">Already working with a Brand?</h3>
          <p className="mt-[12px]">
            If you are already working with a brand who wants to run ads on your TopFan.com profile page and white label site, please direct them to{" "}
            <a
              href="https://www7.topfan.dev/advertise"
              onClick={(e) => {
                e.preventDefault(); // mock: no outbound navigation
                toast("External link (disabled in this mock)");
              }}
              className="text-accent hover:underline"
            >
              https://www7.topfan.dev/advertise
            </a>
            , where they can setup their ad campaign.
          </p>
          <p className="mt-[20px]">When they use your referral code, you will receive a 15% revenue share bonus, and earn 85% of revenue from the ads that run on your profile and white label site.</p>
          <div className="mt-[24px] flex items-center gap-[16px]">
            <span className="flex h-[40px] w-[200px] items-center rounded-[25px] bg-bg px-[12px] text-[14px] text-white">{ads.referralCode}</span>
            <Pill
              data-testid="monetize-ads-copy-code"
              className="w-[100px]"
              onClick={() => {
                navigator.clipboard?.writeText(ads.referralCode).catch(() => {});
                toast("Copied to clipboard");
              }}
            >
              Copy
            </Pill>
          </div>
        </div>
      </section>

      <ConfirmModal
        open={confirm}
        title="Save Advertisement Preferences"
        confirmLabel="Save"
        testid="monetize-ads-save"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          if (run("monetize.saveAdPreferences", (d) => saveAdPreferences(d, { enabled, autoEnableNew: auto, enabledIds: sel }), "content.write", "Advertisement preferences saved")) setConfirm(false);
        }}
      >
        {enabled ? (
          <>
            Ads from <b>{sel.length}</b> selected brand{sel.length === 1 ? "" : "s"} will run on your profile and white label site{auto ? ", and new brands will be enabled automatically" : ""}.
          </>
        ) : (
          "Ads will be turned off on your profile and white label site."
        )}
      </ConfirmModal>
      <ConfirmModal
        open={!!approve}
        title="Approve Brand"
        confirmLabel="Approve"
        testid="monetize-ads-approve"
        onClose={() => setApprove(null)}
        onConfirm={() => {
          if (approve && run("monetize.approveAdBrand", (d) => approveAdBrand(d, approve.id), "content.write", `${approve.name} approved`)) setApprove(null);
        }}
      >
        Approve <b>{approve?.name}</b> ({approve?.offer}) to run ads on your profile and white label site?
      </ConfirmModal>
    </>
  );
}

function Earnings() {
  const earnings = useData((d) => d.monetize.ads.earnings);
  const [month, setMonth] = useState("November");
  const [year, setYear] = useState("2026");
  const [view, setView] = useState<(typeof earnings)[number] | null>(null);
  const rows = earnings.filter((e) => {
    const d = new Date(`${e.date}T12:00:00Z`);
    return MONTHS[d.getUTCMonth()] === month && String(d.getUTCFullYear()) === year;
  });
  return (
    <>
      <div className="flex justify-end gap-[16px]">
        <MiniSelect label="Month" testid="monetize-ads-month" value={month} options={MONTHS} onChange={setMonth} width={150} />
        <MiniSelect label="Year" testid="monetize-ads-year" value={year} options={["2024", "2025", "2026"]} onChange={setYear} width={150} />
      </div>
      <TableCard className="mt-[22px]">
        <table className="w-full table-fixed" data-testid="monetize-ads-earnings">
          <thead>
            <tr>
              <th className={`${th} w-[225px]`}>Date</th>
              <th className={`${th} w-[359px]`}>Earnings</th>
              <th className={th}>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date}>
                <td className={`${td} !py-[24px]`}>{new Date(`${r.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                <td className={td}>{money(r.amount)}</td>
                <td className={td}>
                  <button type="button" className="text-accent hover:underline" data-testid={`monetize-ads-view-${r.date}`} onClick={() => setView(r)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={3} className={`${td} py-[30px] text-center text-[16px] text-[#c8c8c8]`}>
                  No Earnings Found {/* inferred */}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableCard>
      {/* inferred: earnings detail (not captured) */}
      <Modal open={!!view} onClose={() => setView(null)} title="Earnings Details">
        <dl data-testid="modal-monetize-ads-earning" className="grid grid-cols-2 gap-y-[12px] text-[15px]">
          <dt className="text-muted">Date</dt>
          <dd>{view && new Date(`${view.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</dd>
          <dt className="text-muted">Ad Impressions</dt>
          <dd>{view?.impressions}</dd>
          <dt className="text-muted">Earnings</dt>
          <dd>{view && money(view.amount)}</dd>
        </dl>
      </Modal>
    </>
  );
}
