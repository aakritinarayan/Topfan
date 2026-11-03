/**
 * Phone-width live preview of the fan site (P50 right card; 50e FEED PAGE tab).
 * Fan-site headings use Satoshi (falls back to Roboto until the font file is added).
 */
import { useState, type CSSProperties } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Globe, Mail, Menu, Share2, X } from "lucide-react";
import { coverSections, creator, siteCopy } from "../../config/demo";
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
    <div
      className="preview-scroll mx-auto h-[620px] max-w-[390px] overflow-y-auto overscroll-contain rounded-card border border-line bg-bg"
      style={vars}
      data-testid="wls-site-preview"
      tabIndex={0}
      aria-label="Fan website preview (scrollable)"
    >
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
      <div className="sticky top-0 z-20 flex h-12 items-center justify-between bg-bg px-4">
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
      <CoverSections logo={logo} />
    </div>
  );
}

/* ---------------- the rest of the cover page: the editor's visible sections, from the account's data ---------------- */

const H = ({ children }: { children: React.ReactNode }) => <h3 className="font-display text-[19px] font-bold leading-6">{children}</h3>;
const Sec = ({ children, tone = "bg" }: { children: React.ReactNode; tone?: "bg" | "surface" | "accent" }) => (
  <section className={`px-4 py-7 ${tone === "surface" ? "bg-surface" : tone === "accent" ? "bg-accent text-center" : ""}`}>{children}</section>
);

function CoverSections({ logo }: { logo: React.ReactNode }) {
  const sections = useData((d) => d.cover?.sections ?? coverSections);
  const m = useData((d) => d.monetize);
  const posts = useData((d) => d.social.posts.filter((p) => p.status === "published" && !p.locked && p.media?.some((x) => x.src)).slice(0, 4));
  const previewOnly = usePreviewOnly();
  const live = m.products.filter((p) => p.published);
  const exps = live.filter((p) => p.kind === "experience");
  const merch = live.filter((p) => p.kind === "merchandise");
  const single = live.find((p) => p.featured && p.kind === "merchandise") ?? merch[0];
  const btn = "mt-3 inline-flex h-7 items-center rounded-full bg-accent px-4 text-[10px] font-black uppercase";
  const card = (img: string | null | undefined, title: string, sub?: string, kind: "product" | "image" = "product") => (
    <div className="overflow-hidden rounded-tile bg-surface">
      <ImageSlot src={img ?? null} kind={kind} label={title} className="h-[84px] w-full" />
      <div className="p-2">
        <p className="line-clamp-2 text-[11px] font-bold leading-[14px]">{title}</p>
        {sub && <p className="mt-1 text-[10px] text-soft">{sub}</p>}
      </div>
    </div>
  );
  const render = (name: string) => {
    switch (name) {
      case "About Us":
        return (
          <Sec tone="accent">
            <H>{siteCopy.aboutTitle}</H>
            <p className="mt-2 text-xs leading-[18px]">{siteCopy.about}</p>
          </Sec>
        );
      case "Experience":
        return exps.length ? (
          <Sec>
            <H>Experiences</H>
            <div className="mt-3 grid grid-cols-2 gap-2">{exps.slice(0, 4).map((p) => <div key={p.id}>{card(p.image, p.title, p.price != null ? `$${p.price}` : undefined)}</div>)}</div>
          </Sec>
        ) : null;
      case "Store Experience Single Item":
        return single ? (
          <Sec tone="surface">
            <div className="flex gap-3">
              <ImageSlot src={single.image ?? null} kind="product" label={single.title} className="h-[110px] w-[96px] shrink-0" rounded="rounded-tile" />
              <div className="min-w-0">
                <p className="text-[14px] font-bold">{single.title}</p>
                <p className="mt-1 line-clamp-3 text-[11px] leading-4 text-soft">{single.description}</p>
                {single.price != null && <p className="mt-1.5 text-[13px] font-semibold">${single.price.toFixed(2)}</p>}
                <button onClick={previewOnly} className={btn}>Buy Now</button>
              </div>
            </div>
          </Sec>
        ) : null;
      case "Collaborate With a Creator Built Around Movement and Culture": {
        // Ways to work with the creator: only what the account actually offers.
        const ways = [
          m.ads.enabled && ["Sponsored posts", `${m.adBrands.length} brand requests`],
          exps.length && ["Experiences", `${exps.length} to book`],
          merch.length && ["Store", `${merch.length} products`],
          m.vipOffers.some((v) => v.active) && ["VIP Deals", `${m.vipOffers.filter((v) => v.active).length} partner offers`],
        ].filter(Boolean) as [string, string][];
        return ways.length ? (
          <Sec>
            <H>{name}</H>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {ways.map(([t, sub]) => (
                <div key={t} className="rounded-tile bg-surface p-3">
                  <p className="text-[12px] font-bold">{t}</p>
                  <p className="mt-0.5 text-[10px] text-soft">{sub}</p>
                </div>
              ))}
            </div>
          </Sec>
        ) : null;
      }
      case "Built for Snowboard Creators": {
        const list = [...new Set(exps.map((p) => p.experienceType).filter(Boolean)), ...live.filter((p) => p.kind === "course").map((p) => p.title)].slice(0, 4) as string[];
        return list.length ? (
          <Sec tone="surface">
            <H>{name}</H>
            <div className="mt-3 grid grid-cols-[1fr_96px] gap-3">
              <ul className="flex flex-col gap-1.5 text-[11px]">
                {list.map((x) => (
                  <li key={x} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {x}
                  </li>
                ))}
              </ul>
              <ImageSlot src="creators/ajwhite/hero-2" label="Section image" className="h-[90px] w-full" rounded="rounded-tile" />
            </div>
          </Sec>
        ) : null;
      }
      case "Merchandise Listing":
        return merch.length ? (
          <Sec>
            <H>Store</H>
            <div className="mt-3 grid grid-cols-2 gap-2">{merch.slice(0, 4).map((p) => <div key={p.id}>{card(p.image, p.title, p.price != null ? `$${p.price.toFixed(2)}` : undefined)}</div>)}</div>
          </Sec>
        ) : null;
      case "Feed Content":
        return posts.length ? (
          <Sec tone="surface">
            <H>Latest from the Feed</H>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {posts.map((p) => (
                <div key={p.id}>{card(p.media?.find((x) => x.src)?.src, p.text || "Post", undefined, "image")}</div>
              ))}
            </div>
          </Sec>
        ) : null;
      case "Event Ticketing":
        return (
          <Sec tone="accent">
            <H>{m.eventsBannerTitle}</H>
            <p className="mt-2 text-xs">{m.events.length ? `${m.events.length} upcoming` : "No upcoming events yet. They'll show here when you add them."}</p>
          </Sec>
        );
      case "Stats":
        return (
          <Sec>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                [live.length, "Offerings"],
                [m.plans.reduce((n, p) => n + p.subscribers, 0), "Members"],
                [m.portfolios.length, "Portfolios"],
              ].map(([n, l]) => (
                <div key={l} className="rounded-tile bg-surface py-3">
                  <p className="text-[18px] font-bold text-accent">{n}</p>
                  <p className="text-[10px] text-soft">{l}</p>
                </div>
              ))}
            </div>
          </Sec>
        );
      case "Portfolio":
        return m.portfolios.length ? (
          <Sec tone="surface">
            <H>{m.portfolios[0].title}</H>
            <ImageSlot src={m.portfolios[0].banner ?? null} label={m.portfolios[0].title} className="mt-3 h-[120px] w-full" rounded="rounded-tile" />
          </Sec>
        ) : null;
      case "VIP Deals": {
        const deals = m.vipOffers.filter((v) => v.active);
        return deals.length ? (
          <Sec>
            <H>VIP Deals</H>
            <ul className="mt-3 flex flex-col gap-2">
              {deals.slice(0, 3).map((v) => (
                <li key={v.id} className="flex items-center gap-2 rounded-tile bg-surface p-2">
                  <ImageSlot src={v.logo ?? null} label={v.title} className="h-9 w-9 shrink-0" rounded="rounded-full" />
                  <span className="line-clamp-2 text-[11px] font-bold leading-[14px]">{v.title}</span>
                </li>
              ))}
            </ul>
          </Sec>
        ) : null;
      }
      case "Newsletter Subscription":
        return (
          <Sec tone="surface">
            <H>Get my newsletter</H>
            <div className="mt-3 flex h-9 items-center gap-2 rounded-full bg-bg px-3 text-[11px] text-soft">
              <Mail size={13} /> Email address
            </div>
            <button onClick={previewOnly} className={btn}>Subscribe</button>
          </Sec>
        );
      case "Footer":
        return (
          <footer className="border-t border-line px-4 py-6">
            {logo}
            <p className="mt-2 text-[11px] leading-4 text-soft">{creator.bio}</p>
            <div className="mt-4 grid grid-cols-2 gap-1 text-[11px]">
              {MENU.concat(["Store", "Newsletters"]).map((x) => (
                <button key={x} onClick={previewOnly} className="text-left text-soft hover:text-accent">{x}</button>
              ))}
            </div>
          </footer>
        );
      default:
        return null; // Header and hero are drawn above; Free Form has no content in this demo.
    }
  };
  return (
    <>
      {sections
        .filter((x) => x.visible && !["Header", "Hero Layout", "Hero Carousel"].includes(x.name))
        .map((x) => (
          <div key={x.name} data-preview-section={x.name}>
            {render(x.name)}
          </div>
        ))}
    </>
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
