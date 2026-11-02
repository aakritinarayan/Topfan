/**
 * Preferences › White Label Site, Manage mode (P50; screenshots 50-part1…4, 50a–50e).
 */
import { useState } from "react";
import { ChevronLeft, ChevronRight, LayoutTemplate, Settings, Trash2 } from "lucide-react";
import { appearance, creator, domain as demoDomain, seo } from "../../config/demo";
import { siteAddress, usePlatform } from "../../state/platformStore";
import { Button, CopyField, IconCircle, Input, InfoIcon, OutlineButton, Radio, Select } from "../ui/controls";
import { ActiveBadge, DarkBadge, Modal } from "../ui/surfaces";
import { useToast } from "../ui/toast";
import { GoDaddySteps, useRecords } from "./DnsRecordsStep";
import { SitePreview } from "./SitePreview";

export function ManageWls() {
  const { state, go } = usePlatform();
  const toast = useToast();
  const url = `https://${siteAddress(state)}`;
  const [dnsOpen, setDnsOpen] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [coverEnabled, setCoverEnabled] = useState(true);
  const [tab, setTab] = useState<"cover" | "feed">("cover");
  const [palette, setPalette] = useState(appearance.palette);
  const [logoMode, setLogoMode] = useState<"text" | "image">("text");
  const [logoText, setLogoText] = useState(creator.name);

  return (
    <>
      {/* Heading row */}
      <div className="flex items-start justify-between">
        <h3 className="mt-[18px] text-[27.5px] font-medium">Manage Your White Label Site</h3>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2">
            <ActiveBadge>Active</ActiveBadge>
            <IconCircle size={36} aria-label="Delete domain">
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
              onClick={() => {
                setCoverEnabled(false);
                toast("Your Cover Page will no longer be visible on your White Label Site.");
              }}
              className={`h-9 rounded-l-pill px-[18px] text-[13px] font-black uppercase ${coverEnabled ? "bg-bg" : "bg-accent"}`}
            >
              Disable
            </button>
            <button
              onClick={() => {
                setCoverEnabled(true);
                toast("Your Cover Page will now be visible on your White Label Site.");
              }}
              className={`h-9 rounded-r-pill px-[18px] text-[13px] font-black uppercase ${coverEnabled ? "bg-accent" : "bg-bg"}`}
            >
              Enable
            </button>
          </div>
          <Button onClick={() => go("coverEditor")}>Edit Cover Page</Button>
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
            <div className="mt-6 flex flex-col gap-5">
              {appearance.colors.map((c) => (
                <div key={c.label}>
                  <p className="mb-2.5 text-sm font-medium">{c.label}</p>
                  <div className="flex h-14 items-center rounded-pill bg-surface pl-6 pr-[22px]">
                    <span className="h-8 w-11 rounded-[5px] border border-accent" style={{ background: c.value }} />
                    <span className="ml-5 flex-1 text-sm font-black">{c.value}</span>
                    <span className="relative h-[18px] w-[26px]" aria-hidden>
                      <span className="absolute left-0 top-0 h-[18px] w-[18px] rounded-full border border-accent" />
                      <span className="absolute left-2 top-0 h-[18px] w-[18px] rounded-full border border-accent" />
                    </span>
                  </div>
                </div>
              ))}
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
                <div className="flex items-center justify-center gap-4">
                  <ChevronLeft size={22} />
                  <span className="font-logo text-4xl text-accent">{logoText}</span>
                  <ChevronRight size={22} />
                </div>
              </>
            ) : (
              <>
                <Button className="mt-6">Select File</Button>
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
          <OutlineButton className="mt-5 w-full">Desktop Preview of White Label Site</OutlineButton>
          <div className="mt-5">
            <SitePreview tab={tab} />
          </div>
        </div>
      </div>

      <Button className="mt-10" onClick={() => toast("White Label site updated and published successfully")}>
        Update &amp; Publish
      </Button>

      <DomainDetailsModal open={dnsOpen} onClose={() => setDnsOpen(false)} />
      <SeoModal open={seoOpen} onClose={() => setSeoOpen(false)} />
    </>
  );
}

export function DomainDetailsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      <button className="mt-6 h-[42px] w-full rounded-pill bg-[linear-gradient(#fd9292,#fb6767)] text-sm font-black uppercase text-white">
        Delete White Label Site
      </button>
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

