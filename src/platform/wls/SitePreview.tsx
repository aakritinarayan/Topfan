/**
 * Phone-width live preview of the fan site (P50 right card; 50e FEED PAGE tab).
 * Fan-site headings use Satoshi (falls back to Roboto until the font file is added).
 */
import { ArrowRight, ChevronLeft, ChevronRight, Globe, Menu, Share2 } from "lucide-react";
import { creator, siteCopy } from "../../config/demo";
import { useData } from "../../store/store";
import { Logo } from "../Shell";
import { Avatar, ImageSlot, VerifiedBadge } from "../ui/surfaces";

export function SitePreview({ tab }: { tab: "cover" | "feed" }) {
  return (
    <div className="h-[360px] overflow-y-auto rounded-inner bg-bg">
      {tab === "cover" ? <CoverPreview /> : <FeedPreview />}
    </div>
  );
}

function CoverPreview() {
  const hero = useData((d) => d.account.hero);
  return (
    <div>
      <div className="flex h-12 items-center justify-between px-4">
        <Logo size={24} />
        <Menu size={22} />
      </div>
      <div className="relative h-[300px]">
        <ImageSlot src={hero} label="Hero image" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <button className="absolute left-2 top-[120px] flex h-6 w-6 items-center justify-center rounded-full border border-accent text-accent">
          <ChevronLeft size={14} />
        </button>
        <button className="absolute right-2 top-[120px] flex h-6 w-6 items-center justify-center rounded-full border border-accent text-accent">
          <ChevronRight size={14} />
        </button>
        <div className="absolute bottom-6 left-4 right-4">
          <h3 className="font-display text-[22px] font-bold leading-[26px]">
            {siteCopy.heroLine1}
            <br />
            {siteCopy.heroLine2Plain}
            <span className="text-accent">{siteCopy.heroLine2Accent}</span>
          </h3>
          <span className="mt-3 inline-flex h-7 items-center gap-2 rounded-full bg-accent pl-3 pr-1 text-[11px] font-bold">
            {siteCopy.heroCta}
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-accent">
              <ArrowRight size={12} />
            </span>
          </span>
          <div className="mt-4 flex justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
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

function FeedPreview() {
  const media = useData((d) => ({ avatar: d.account.avatar, cover: d.account.cover }));
  return (
    <div className="px-2.5 pb-4">
      <div className="flex h-12 items-center justify-between px-1.5">
        <Logo size={24} />
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
