/**
 * Phone-width live preview of the fan site (P50 right card; 50e FEED PAGE tab).
 * Fan-site headings use Satoshi (falls back to Roboto until the font file is added).
 */
import { useState, type CSSProperties } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Globe, Menu, Share2, X } from "lucide-react";
import { creator, siteCopy } from "../../config/demo";
import { useData } from "../../store/store";
import { fontStack, type AccountState } from "../../store/slices/account";
import { Logo } from "../Shell";
import { Avatar, ImageSlot, VerifiedBadge } from "../ui/surfaces";
import { useToast } from "../ui/toast";

const HERO = ["creators/ajwhite/hero-1", "creators/ajwhite/hero-2", "creators/ajwhite/hero-3"];
const MENU = ["Feed", "Welcome", "Videos", "Competitions"];

interface PreviewProps {
  tab: "cover" | "feed";
  /** Unsaved appearance from Customize Appearance: the preview shows it before Update & Publish. */
  theme?: AccountState["theme"];
  font?: string;
  logoText?: string;
  logoImage?: string | null;
}

export function SitePreview({ tab, theme, font, logoText, logoImage }: PreviewProps) {
  // Scoped overrides: only this preview changes, not the dashboard around it.
  const vars = (theme
    ? {
        "--bg": theme.bg,
        "--surface": theme.secondaryBg,
        "--accent": theme.accent,
        "--text": theme.text,
        "--configButtonTextColor": theme.buttonText,
        "--configPostTextColor": theme.postText ?? theme.text,
        color: theme.text,
      }
    : {}) as CSSProperties;
  if (font) (vars as Record<string, string>)["--font-logo"] = fontStack(font);
  const logo = logoImage ? <img src={logoImage} alt="Logo" className="h-6 max-w-[160px] object-contain" /> : <Logo size={24} text={logoText} />;
  return (
    <div className="h-[360px] overflow-y-auto rounded-inner bg-bg" style={vars} data-testid="wls-site-preview">
      {tab === "cover" ? <CoverPreview logo={logo} /> : <FeedPreview logo={logo} />}
    </div>
  );
}

/** Buttons that belong to the fan's site: in the preview they explain instead of leaving the page. */
function usePreviewOnly() {
  const toast = useToast();
  return () => toast("Preview only: fans use this on your site. Use Desktop Preview to try the full site.");
}

function CoverPreview({ logo }: { logo: React.ReactNode }) {
  const saved = useData((d) => d.account.hero);
  const slides = saved && !HERO.includes(saved) ? [saved, ...HERO] : HERO;
  const [i, setI] = useState(Math.max(0, slides.indexOf(saved ?? HERO[0])));
  const [menu, setMenu] = useState(false);
  const previewOnly = usePreviewOnly();
  const step = (d: number) => setI((x) => (x + d + slides.length) % slides.length);
  return (
    <div>
      <div className="relative flex h-12 items-center justify-between px-4">
        {logo}
        <button aria-label={menu ? "Close menu" : "Open menu"} onClick={() => setMenu(!menu)}>
          {menu ? <X size={22} /> : <Menu size={22} />}
        </button>
        {menu && (
          <ul className="absolute right-3 top-11 z-10 flex flex-col rounded-tile bg-surface py-1 text-[13px] shadow-lg">
            {MENU.map((m) => (
              <li key={m}>
                <button onClick={previewOnly} className="w-full px-4 py-1.5 text-left hover:text-accent">
                  {m}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="relative h-[300px]">
        <ImageSlot src={slides[i]} label="Hero image" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <button aria-label="Previous slide" onClick={() => step(-1)} className="absolute left-2 top-[120px] flex h-6 w-6 items-center justify-center rounded-full border border-accent text-accent">
          <ChevronLeft size={14} />
        </button>
        <button aria-label="Next slide" onClick={() => step(1)} className="absolute right-2 top-[120px] flex h-6 w-6 items-center justify-center rounded-full border border-accent text-accent">
          <ChevronRight size={14} />
        </button>
        <div className="absolute bottom-6 left-4 right-4">
          <h3 className="font-display text-[22px] font-bold leading-[26px]">
            {siteCopy.heroLine1}
            <br />
            {siteCopy.heroLine2Plain}
            <span className="text-accent">{siteCopy.heroLine2Accent}</span>
          </h3>
          <button onClick={previewOnly} className="mt-3 inline-flex h-7 items-center gap-2 rounded-full bg-accent pl-3 pr-1 text-[11px] font-bold">
            {siteCopy.heroCta}
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-accent">
              <ArrowRight size={12} />
            </span>
          </button>
          <div className="mt-4 flex justify-center gap-1.5">
            {slides.slice(0, 3).map((_, d) => (
              <button key={d} aria-label={`Slide ${d + 1}`} onClick={() => setI(d)} className={`h-1.5 w-1.5 rounded-full ${d === i ? "bg-accent" : "bg-white/60"}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="bg-accent px-5 py-6 text-center">
        <h3 className="font-display text-2xl font-bold">{siteCopy.aboutTitle}</h3>
        <p className="mt-2 text-xs leading-[18px]">{siteCopy.about}</p>
      </div>
    </div>
  );
}

function FeedPreview({ logo }: { logo: React.ReactNode }) {
  const media = useData((d) => ({ avatar: d.account.avatar, cover: d.account.cover }));
  return (
    <div className="px-2.5 pb-4">
      <div className="flex h-12 items-center justify-between px-1.5">
        {logo}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent px-2 py-1 text-[8px] font-black uppercase">Get Started</span>
          <Globe size={18} className="text-accent" />
        </div>
      </div>
      <div className="relative">
        <ImageSlot src={media.cover} label="Cover photo" className="h-[150px] w-full" rounded="rounded-t-tile" />
        <div className="absolute -bottom-8 left-3">
          <Avatar src={media.avatar} size={60} ring={2} />
        </div>
        <span className="absolute -bottom-4 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-accent">
          <Share2 size={15} />
        </span>
      </div>
      <div className="mt-10 px-3">
        <div className="flex items-center gap-1.5">
          <span className="text-lg">{creator.name}</span>
          <VerifiedBadge size={20} />
        </div>
        <p className="mt-1 text-xs text-soft">{creator.location}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {siteCopy.feedChips.map((c) => (
            <span key={c} className="rounded-full bg-accent px-3 py-1.5 text-[11px] font-black uppercase">
              {c}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs leading-[18px]">{creator.bio}</p>
        <span className="mt-3 flex h-8 items-center justify-center rounded-full bg-accent text-[11px] font-black uppercase">
          View Subscription Plans
        </span>
      </div>
    </div>
  );
}
