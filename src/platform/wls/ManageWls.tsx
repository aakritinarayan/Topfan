/**
 * Preferences › White Label Site, Manage mode (P50; screenshots 50-part1…4, 50a–50e).
 */
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutTemplate, Settings, Trash2 } from "lucide-react";
import { appearance, domain as demoDomain, seo } from "../../config/demo";
import { siteAddress, usePlatform } from "../../state/platformStore";
import { Button, CopyField, IconCircle, Input, InfoIcon, OutlineButton, Radio, Select } from "../ui/controls";
import { ActiveBadge, DarkBadge, Modal } from "../ui/surfaces";
import { useToast } from "../ui/toast";
import { act, getData, setLogoDraft, useData } from "../../store/store";
import { takePendingTheme } from "../../store/slices/cover";
import { fontStack, LOGO_FONTS, type AccountState } from "../../store/slices/account";
import { ConfirmModal } from "../../pages/prefs-b/ui";
import { useRouter } from "../../app/router";
import { GoDaddySteps, useRecords } from "./DnsRecordsStep";
import { SitePreview } from "./SitePreview";

type Theme = AccountState["theme"];
/** The six color rows, in page order, and the saved theme key each one edits. */
const COLOR_KEYS: (keyof Theme)[] = ["bg", "text", "secondaryBg", "postText", "accent", "buttonText"];
const HEX = /^#[0-9a-f]{6}$/i;

/*
 * Choosing "Standard Color Palettes" or "Standard Themes" shows a "Choose Color Palette" picker in the
 * live product (P50: not opened in the captures). These presets are this demo's own (inferred).
 */
const PRESETS: Record<string, { name: string; theme: Partial<Theme> }[]> = {
  "Standard Color Palettes": [
    { name: "TopFan Red", theme: { accent: "#bc1111", buttonText: "#ffffff" } },
    { name: "Ocean", theme: { accent: "#1d6fd8", buttonText: "#ffffff" } },
    { name: "Violet", theme: { accent: "#7c3aed", buttonText: "#ffffff" } },
    { name: "Sunset", theme: { accent: "#e2561d", buttonText: "#ffffff" } },
  ],
  "Standard Themes": [
    { name: "Dark", theme: { bg: "#191a1c", secondaryBg: "#272a2b", text: "#ffffff", postText: "#ffffff" } },
    { name: "Midnight", theme: { bg: "#0d1220", secondaryBg: "#182035", text: "#ffffff", postText: "#e6e9f2" } },
    { name: "Graphite", theme: { bg: "#202020", secondaryBg: "#303030", text: "#f2f2f2", postText: "#f2f2f2" } },
  ],
};

export function ManageWls() {
  const { state, go, reset } = usePlatform();
  const { navigate } = useRouter();
  const toast = useToast();
  const url = `https://${siteAddress(state)}`;
  const savedTheme = useData((d) => d.account.theme);
  const savedLogo = useData((d) => d.account.logo) ?? { text: getData().account.name, font: "Rubik Dirt" };
  const coverEnabled = useData((d) => d.account.whiteLabel.coverEnabled);
  const [dnsOpen, setDnsOpen] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [tab, setTab] = useState<"cover" | "feed">("cover");
  const [palette, setPalette] = useState(appearance.palette);
  // Unsaved appearance: shown in the preview right away, saved by Update & Publish.
  // Colors the creator accepted from the assistant arrive here unsaved, like a preset click.
  const [theme, setTheme] = useState<Theme>(() => ({ postText: savedTheme.text, ...savedTheme, ...takePendingTheme() }));
  const [logoMode, setLogoMode] = useState<"text" | "image">("text");
  const [logoText, setLogoText] = useState(savedLogo.text);
  const [font, setFont] = useState(Math.max(0, LOGO_FONTS.indexOf(savedLogo.font)));
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const setColor = (k: keyof Theme, v: string) => HEX.test(v) && setTheme((t) => ({ ...t, [k]: v.toLowerCase() }));
  // The header logo follows the font and text being edited; leaving without publishing reverts it.
  useEffect(() => setLogoDraft({ text: logoText.trim() || savedLogo.text, font: LOGO_FONTS[font] }), [logoText, font, savedLogo.text]);
  useEffect(() => () => setLogoDraft(null), []);
  const stepFont = (dir: 1 | -1) => setFont((i) => (i + dir + LOGO_FONTS.length) % LOGO_FONTS.length);
  const setCover = (on: boolean) => {
    const res = act("wls.coverEnabled", (d) => void (d.account.whiteLabel.coverEnabled = on), { need: "account.admin" });
    toast(!res.ok ? res.reason : on ? "Your Cover Page will now be visible on your White Label Site." : "Your Cover Page will no longer be visible on your White Label Site.");
  };
  const desktopPreview = () => {
    // Like the live product: the site in a new tab, with the unsaved appearance as preview params.
    const params = new URLSearchParams({ wlsPreview: JSON.stringify({ ...theme, font: LOGO_FONTS[font], logoText }) });
    window.open(`${tab === "cover" ? "/" : `/${getData().account.handle}`}?${params}`, "_blank", "noopener");
  };

  return (
    <>
      {/* Heading row */}
      <div className="flex items-start justify-between">
        <h3 className="mt-[18px] text-[27.5px] font-medium">Manage Your White Label Site</h3>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2">
            <ActiveBadge>Active</ActiveBadge>
            <IconCircle size={36} aria-label="Delete domain" onClick={() => setRemoveOpen(true)}>
              <Trash2 size={17} />
            </IconCircle>
          </div>
          <button onClick={() => setDnsOpen(true)} className="pb-2.5 pt-1 text-sm font-medium text-accent">
            View DNS Records
          </button>
        </div>
      </div>

      {/* URL */}
      <p className="mt-5 text-sm font-medium">White Label Site URL</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="inline-flex h-10 items-center rounded-pill bg-surface px-4 text-sm">{url}</span>
        <Button
          className="w-[100px]"
          onClick={() => {
            navigator.clipboard?.writeText(url).catch(() => {});
            toast("URL copied to clipboard");
          }}
        >
          Copy
        </Button>
      </div>

      {/* Cover Page card */}
      <div className="mt-5 flex items-center gap-4 rounded-pill bg-surface p-6">
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center self-start rounded-lg bg-accent">
          <LayoutTemplate size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">Your Cover Page</span>
            <DarkBadge>Published</DarkBadge>
          </div>
          <p className="mt-1 max-w-[340px] text-base">Visitors see your Cover Page before your Feed Page.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex">
            <button
              onClick={() => setCover(false)}
              className={`h-9 rounded-l-pill px-[18px] text-[13px] font-black uppercase ${coverEnabled ? "bg-bg" : "bg-accent"}`}
            >
              Disable
            </button>
            <button
              onClick={() => setCover(true)}
              className={`h-9 rounded-r-pill px-[18px] text-[13px] font-black uppercase ${coverEnabled ? "bg-accent" : "bg-bg"}`}
            >
              Enable
            </button>
          </div>
          <Button onClick={() => go("coverEditor")} data-field="edit-cover">Edit Cover Page</Button>
        </div>
      </div>

      {/* Two-column panel */}
      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-pill bg-surface p-6">
          <h4 className="text-lg font-semibold">Customize Appearance</h4>
          <div className="mt-6 rounded-inner bg-bg p-5" data-field="colors">
            <h4 className="text-base font-semibold">Site Colors &amp; Themes</h4>
            <p className="mb-4 mt-6 text-base">Choose a Color Palette or Theme Type *</p>
            <Select tone="surface" value={palette} options={appearance.paletteOptions} onChange={setPalette} />
            {PRESETS[palette] && (
              <div className="mt-5" data-testid="wls-palette-presets">
                <p className="mb-2.5 text-sm font-medium">Choose Color Palette</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS[palette].map((pr) => (
                    <button
                      key={pr.name}
                      type="button"
                      onClick={() => setTheme((t) => ({ ...t, ...pr.theme }))}
                      className="flex h-9 items-center gap-2 rounded-pill bg-surface px-3 text-[13px] font-bold hover:ring-1 hover:ring-accent"
                    >
                      <span className="h-4 w-4 rounded-full border border-white/40" style={{ background: pr.theme.accent ?? pr.theme.bg }} />
                      {pr.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-col gap-5">
              {appearance.colors.map((c, i) => {
                const k = COLOR_KEYS[i];
                const value = (theme[k] as string | undefined) ?? c.value;
                return (
                  <div key={c.label}>
                    <p className="mb-2.5 text-sm font-medium">{c.label}</p>
                    {/* Clicking the swatch or the picker icon opens the browser's color picker. */}
                    <label className="flex h-14 cursor-pointer items-center rounded-pill bg-surface pl-6 pr-[22px]" data-testid={`wls-color-${k}`}>
                      <span className="h-8 w-11 rounded-[5px] border border-accent" style={{ background: value }} />
                      <span className="ml-5 flex-1 text-sm font-black">{value}</span>
                      <span className="relative h-[18px] w-[26px]" aria-hidden>
                        <span className="absolute left-0 top-0 h-[18px] w-[18px] rounded-full border border-accent" />
                        <span className="absolute left-2 top-0 h-[18px] w-[18px] rounded-full border border-accent" />
                      </span>
                      <input type="color" className="sr-only" aria-label={c.label.replace(" *", "")} value={value} onChange={(e) => setColor(k, e.target.value)} />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-inner bg-bg p-5" data-field="logo">
            <h4 className="text-base font-semibold">Site Logo</h4>
            <div className="mt-5 flex flex-col gap-4">
              <Radio name="logoMode" checked={logoMode === "text"} onChange={() => setLogoMode("text")}>
                Generate Text Logo
              </Radio>
              <Radio name="logoMode" checked={logoMode === "image"} onChange={() => setLogoMode("image")}>
                Upload Logo Image
              </Radio>
            </div>
            {logoMode === "text" ? (
              <>
                <p className="mb-4 mt-6 text-base">Logo Text*</p>
                <Input tone="surface" value={logoText} placeholder="Miles Karston" onChange={(e) => setLogoText(e.target.value)} />
                <p className="mb-3 mt-6 text-base">Logo Font</p>
                <div className="flex items-center justify-center gap-4" data-testid="wls-logo-font">
                  <button type="button" aria-label="Previous logo font" onClick={() => stepFont(-1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface">
                    <ChevronLeft size={22} />
                  </button>
                  <span className="text-4xl" style={{ fontFamily: fontStack(LOGO_FONTS[font]), color: theme.accent }} title={LOGO_FONTS[font]} data-font={LOGO_FONTS[font]}>
                    {logoText || savedLogo.text}
                  </span>
                  <button type="button" aria-label="Next logo font" onClick={() => stepFont(1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface">
                    <ChevronRight size={22} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Button className="mt-6" onClick={() => fileRef.current?.click()}>
                  Select File
                </Button>
                {/* Demo: the image stays in this browser tab for the preview; nothing is uploaded. */}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png"
                  className="hidden"
                  data-testid="wls-logo-file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.type !== "image/png") return void toast("Please choose a PNG image.");
                    setLogoImage(URL.createObjectURL(f));
                  }}
                />
                {logoImage && <img src={logoImage} alt="Selected logo" className="mt-4 h-8 max-w-[335px] object-contain" />}
                <p className="mt-3 text-sm text-soft">
                  Upload a transparent PNG image that is 32px in Height, and between 32px and 335px Wide.
                </p>
              </>
            )}
          </div>

          <button
            onClick={() => setSeoOpen(true)}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[50px] border border-accent bg-surface text-sm text-accent"
          >
            <Settings size={16} /> Feed Page SEO Settings &amp; GTM Tag
          </button>
        </div>

        <div className="self-start rounded-pill bg-surface p-6">
          <div className="flex rounded-full bg-bg p-1">
            {(["cover", "feed"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`h-10 flex-1 rounded-full text-sm font-black uppercase ${tab === t ? "bg-accent" : ""}`}
              >
                {t === "cover" ? "Cover Page" : "Feed Page"}
              </button>
            ))}
          </div>
          {/* "White Level" (sic) is the live copy on the COVER PAGE tab. */}
          <h4 className="mt-4 text-lg font-semibold">{tab === "cover" ? "White Level Site Preview" : "White Label Site Preview"}</h4>
          <p className="mt-2 text-base leading-6">
            Below is how your site will look on Mobile. Click the Desktop Preview button below to see how it will look on full size
            browsers.
          </p>
          <OutlineButton className="mt-5 w-full" onClick={desktopPreview}>
            Desktop Preview of White Label Site
          </OutlineButton>
          <div className="mt-5">
            <SitePreview tab={tab} theme={theme} font={LOGO_FONTS[font]} logoText={logoText || savedLogo.text} logoImage={logoMode === "image" ? logoImage : null} />
          </div>
        </div>
      </div>

      <Button
        className="mt-10"
        data-testid="wls-update-publish"
        onClick={() => {
          // Records the publish in the mock store (owner only) so progress and the assistant see it.
          if (logoMode === "text" && !logoText.trim()) return void toast("Logo Text is required.");
          const res = act(
            "wls.publish",
            (d) => {
              d.account.theme = { ...theme };
              d.account.logo = { text: logoText.trim() || d.account.name, font: LOGO_FONTS[font] };
              d.account.whiteLabel.lastPublishedAt = new Date().toISOString();
            },
            { need: "account.admin" },
          );
          toast(res.ok ? "White Label site updated and published successfully" : res.reason);
        }}
      >
        Update &amp; Publish
      </Button>

      <DomainDetailsModal open={dnsOpen} onClose={() => setDnsOpen(false)} onDelete={() => (setDnsOpen(false), setRemoveOpen(true))} />
      <ConfirmModal
        open={removeOpen}
        title="Remove White Label Site"
        confirmLabel="Remove"
        testid="modal-wls-remove"
        onClose={() => setRemoveOpen(false)}
        onConfirm={() => {
          // Demo data only: the site goes back to "not set up" and setup starts again.
          const res = act("wls.remove", (d) => void (d.account.whiteLabel.status = "not-set-up"), { need: "account.admin" });
          setRemoveOpen(false);
          if (!res.ok) return void toast(res.reason);
          toast("Your White Label Site was removed. Your content and cover pages are still here.");
          reset();
          navigate("/edit-preference/whitelabel/setup/domain");
        }}
      >
        If you delete your domain settings, your content and cover pages will remain intact, but you'll need to set up your domain name and white label site color and logo preferences again.
      </ConfirmModal>
      <SeoModal open={seoOpen} onClose={() => setSeoOpen(false)} />
    </>
  );
}

export function DomainDetailsModal({ open, onClose, onDelete }: { open: boolean; onClose: () => void; onDelete?: () => void }) {
  const { state } = usePlatform();
  const records = useRecords();
  return (
    <Modal open={open} onClose={onClose} title="Domain Details" divider={false}>
      <div className="flex gap-12">
        <div>
          <p className="text-base font-extrabold text-soft">Domain</p>
          <p className="mt-1 text-lg font-semibold">{siteAddress(state)}</p>
        </div>
        <div>
          <p className="text-base font-extrabold text-soft">Domain / DNS Provider</p>
          <p className="mt-1 text-lg font-semibold">{state.provider ?? demoDomain.provider}</p>
        </div>
      </div>
      <h3 className="mt-6 text-2xl font-medium">DNS Records</h3>
      <div className="mt-5 flex flex-col gap-5">
        {records.map((r, i) => (
          <div key={i} className="contents">
            <div>
              <p className="mb-3 text-sm font-medium">CNAME Host #{i + 1}</p>
              <CopyField value={r.host} />
            </div>
            <div>
              <p className="mb-3 text-sm font-medium">Value #{i + 1}</p>
              <CopyField value={r.value} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <GoDaddySteps />
      </div>
      {onDelete && (
        <button onClick={onDelete} className="mt-6 h-[42px] w-full rounded-pill bg-[linear-gradient(#fd9292,#fb6767)] text-sm font-black uppercase text-white">
          Delete White Label Site
        </button>
      )}
    </Modal>
  );
}

function SeoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [v, setV] = useState(seo);
  const left = 160 - v.description.length;
  return (
    <Modal
      open={open}
      onClose={onClose}
      uppercaseTitle
      title="Feed Page SEO Settings & GTM Tag"
      footer={
        <Button
          onClick={() => {
            toast("SEO and Page Meta updated successfully.");
            onClose();
          }}
        >
          Update Settings
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="mb-4 flex items-center text-base">
            Optional GTM Tag
            <InfoIcon text="Hint: This feature allows you to insert an optional tracking tag on all pages on your White Label Site and mobile apps. To use go to Google Tag Manager to create a unique GTM tag ID. Google Tag Manager allows you to consolidate tracking codes (pixels) from multiple providers including Google Analytics, Meta, Go High Level and other advertising retargeting providers." />
          </p>
          <Input value={v.gtm} placeholder="e.g. G-XXXXXXXXXX or GTM-XXXXXXX" onChange={(e) => setV({ ...v, gtm: e.target.value })} />
        </div>
        <div>
          <p className="mb-4 text-base">Feed Page SEO Title</p>
          <Input value={v.title} placeholder="Enter title" onChange={(e) => setV({ ...v, title: e.target.value })} />
        </div>
        <div className="col-span-2" data-field="seo-keywords">
          <p className="mb-4 text-base">Feed Page SEO Keywords (Separated by commas)</p>
          <Input value={v.keywords} placeholder="Enter keywords" onChange={(e) => setV({ ...v, keywords: e.target.value })} />
        </div>
        <div className="col-span-2">
          <p className="mb-4 text-base">Feed Page SEO Description</p>
          <textarea
            value={v.description}
            placeholder="Enter description"
            onChange={(e) => setV({ ...v, description: e.target.value })}
            className="h-[110px] w-full resize-y rounded-panel bg-bg px-6 py-[17px] text-sm font-black leading-[21px] text-white outline-none focus:ring-1 focus:ring-accent"
          />
          <p className="mt-1 pr-2 text-right text-xs italic text-soft">{left} Characters left</p>
        </div>
      </div>
    </Modal>
  );
}

