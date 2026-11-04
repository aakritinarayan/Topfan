/**
 * Home — public white-label landing page (spec 10-home.md, screenshots 10-home-part1…17, 80).
 * Marketing layout: no sidebar; this page renders its own 78px marketing header and footer.
 * Copy follows the spec; brand/person names in the captured cover content are replaced with
 * fictional ones. Media are local demo assets (keys in HOME_MEDIA below; store items/posts carry their own keys).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import {
  ArrowRight, BookOpen, CalendarDays, ChevronLeft, ChevronRight, Footprints, Gift, LayoutGrid, Megaphone, MonitorPlay, Package, Sparkles, Users,
} from "lucide-react";
import type { PageProps } from "../types";
import type { Post } from "../../store/model";
import { act, useData } from "../../store/store";
import { extraOf, joinNewsletter, publishedPosts } from "../../store/slices/social";
import { openOverlay } from "../../app/ui";
import { Link } from "../../app/router";
import { Logo } from "../../platform/Shell";
import { ImageSlot } from "../../platform/ui/surfaces";
import { VideoPlayer } from "../../platform/ui/media";
import { posterOf } from "../../media";
import { useToast } from "../../platform/ui/toast";
import { HeaderActions } from "./AuthHeader";
import { Caption, Counts, badgeOf, money, useGo } from "./shared";

const WRAP = "mx-auto max-w-[1280px] px-[24px]";

/** Static marketing-section media (asset keys, src/media). Store items and posts carry their own keys. */
const HOME_MEDIA = {
  hero: ["creators/ajwhite/hero-1", "creators/ajwhite/hero-2", "creators/ajwhite/hero-3"],
  experience: ["creators/ajwhite/about-curiosity", "creators/ajwhite/about-content", "creators/ajwhite/about-community", "creators/ajwhite/about-style"],
  videoCall: "experiences/video-call",
  collaborateBg: "backgrounds/snow-texture",
  newsletterBg: "backgrounds/curtain-red",
  culture: "creators/ajwhite/slope-tall",
  eventsBg: "events/banner",
  series: "videos/competition-run",
  episodes: ["videos/halfpipe", "videos/big-air", "videos/slopestyle"],
  dealLogos: ["illustrations/brands/glacier-hydration", "illustrations/brands/northpeak"],
  freeFormImage: "creators/ajwhite/mountain-wide",
  freeFormVideo: "videos/event-highlights",
  freeFormEmbed: "videos/welcome",
};
const H2 = "font-display text-[48px] font-extrabold leading-[58px]";
const EYEBROW = "text-[24px] font-bold uppercase tracking-[2px] text-accent";

function Underline({ center }: { center?: boolean }) {
  return <span className={`mt-[4px] block h-[3px] w-[64px] bg-accent ${center ? "mx-auto" : ""}`} />;
}

/** Red pill with a white circle arrow (Join the Journey / Schedule / View All / Join Newsletter). */
function ArrowPill({ children, onClick, testid, type = "button" }: { children: ReactNode; onClick?: () => void; testid: string; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      data-testid={testid}
      onClick={onClick}
      className="inline-flex h-[40px] items-center gap-[12px] rounded-pill border border-accent bg-accent pb-[2px] pl-[14px] pr-[2px] pt-[3px] text-[14px] font-medium text-white hover:brightness-110"
    >
      {children}
      <span className="flex h-[33px] w-[33px] items-center justify-center rounded-full bg-white text-accent">
        <ArrowRight size={20} strokeWidth={2.6} />
      </span>
    </button>
  );
}

function SmallPill({ children, onClick, testid, className = "" }: { children: ReactNode; onClick?: () => void; testid: string; className?: string }) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      className={`inline-flex h-[31px] items-center justify-center rounded-pill bg-accent px-[16px] text-[12px] font-bold uppercase text-white hover:brightness-110 ${className}`}
    >
      {children}
    </button>
  );
}

export function HomePage({ route }: PageProps) {
  return (
    <div data-testid={`page-${route.id}`} className="white-label min-h-screen bg-bg">
      <MarketingHeader />
      <Hero />
      <About />
      <Experience />
      <Exclusive />
      <Collaborate />
      <Culture />
      <Merchandise />
      <StayConnected />
      <Events />
      <Stats />
      <Videos />
      <VipDeals />
      <Newsletter />
      <FreeForm />
      <Footer />
    </div>
  );
}

/* ---------------- header ---------------- */

function MarketingHeader() {
  const handle = useData((d) => d.account.handle);
  const go = useGo();
  const link = "text-[16px] font-medium text-white hover:text-accent";
  return (
    <header data-testid="marketing-header" className="sticky top-[0px] z-40 h-[78px] bg-bg">
      <div className="relative flex h-full items-center justify-between pl-[26px] pr-[30px]">
        <Logo size={36} />
        <nav aria-label="Site" className="absolute left-1/2 flex -translate-x-1/2 items-center gap-[28px]">
          <Link to={`/${handle}`} className={link} data-testid="home-nav-feed">
            Feed
          </Link>
          {/* "Welcome" is a <button> that opens the Welcome Message modal (P80). */}
          <button className={link} data-testid="home-nav-welcome" onClick={() => openOverlay("welcome")}>
            Welcome
          </button>
          <button className={link} data-testid="home-nav-videos" onClick={() => go("public-videos", { handle, portfolioId: "competition-videos" })}>
            Videos
          </button>
          <button className={link} data-testid="home-nav-competitions" onClick={() => go("public-events", { handle })}>
            Competitions
          </button>
        </nav>
        <HeaderActions />
      </div>
    </header>
  );
}

/* ---------------- 1. hero carousel ---------------- */

function Hero() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  const view = useData((d) => d.account.session.fanView);
  const handle = useData((d) => d.account.handle);
  const go = useGo();
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((x) => (x + 1) % 3), 6000);
    return () => clearInterval(t);
  }, [reduce]);
  const arrow = "absolute top-1/2 z-10 flex h-[40px] w-[40px] -translate-y-1/2 items-center justify-center rounded-full border border-accent text-accent hover:bg-accent hover:text-white";
  return (
    <section data-testid="home-hero" className="relative h-[calc(100svh-78px)] min-h-[480px] overflow-hidden" aria-roledescription="carousel">
      <div aria-label={`Hero slide ${i + 1}`} className="absolute inset-0">
        <ImageSlot src={HOME_MEDIA.hero[i]} label={`Hero slide ${i + 1}`} className="h-full w-full" eager />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
      <div className="relative mx-auto flex h-full max-w-[1280px] flex-col justify-center pl-[80px]">
        <h1 className="font-display text-[48px] font-bold leading-[58px]">
          Where Balance Meets
          <br />
          the <span className="text-accent">Frozen Edge</span>
        </h1>
        <div className="mt-[24px]">
          {/* inferred target: logged-out → Join modal; signed in → Feed */}
          <ArrowPill testid="home-hero-cta" onClick={() => (view === "logged-out" ? openOverlay("join") : go("feed", { handle }))}>
            Join the Journey
          </ArrowPill>
        </div>
      </div>
      <button aria-label="Previous slide" data-testid="home-hero-prev" className={`${arrow} left-[16px]`} onClick={() => setI((x) => (x + 2) % 3)}>
        <ChevronLeft size={20} />
      </button>
      <button aria-label="Next slide" data-testid="home-hero-next" className={`${arrow} right-[16px]`} onClick={() => setI((x) => (x + 1) % 3)}>
        <ChevronRight size={20} />
      </button>
      <div className="absolute bottom-[24px] left-1/2 flex -translate-x-1/2 gap-[8px]">
        {[0, 1, 2].map((n) => (
          <button
            key={n}
            aria-label={`Slide ${n + 1}`}
            aria-current={n === i}
            data-testid={`home-hero-dot-${n}`}
            onClick={() => setI(n)}
            className={`h-[10px] w-[10px] rounded-full ${n === i ? "bg-accent" : "bg-white/60"}`}
          />
        ))}
      </div>
    </section>
  );
}

/* ---------------- 2. about ---------------- */

function About() {
  return (
    <section data-testid="home-about" className="bg-accent pb-[50px] pt-[38px] text-center">
      <div className="mx-auto max-w-[1280px] px-[36px]">
        <h2 className="font-display text-[48px] font-bold leading-[60px]">About</h2>
        <p className="mt-[8px] text-[16px] leading-[24px]">
          American snowboarder AJ White is taking his connection with supporters to the next level with the launch of his brand-new fan engagement website. Known
          for his aggressive riding style and massive airs across the peaks of Colorado, White is now bringing that same energy into the digital space.The platform
          serves as a dedicated, direct-to-fan hub. By cutting out the noise of traditional social media algorithms, the site gives his community exactly what they
          want: raw content, exclusive gear, and a dedicated place to connect.
        </p>
      </div>
    </section>
  );
}

/* ---------------- 3. experience ---------------- */

function Experience() {
  const handle = useData((d) => d.account.handle);
  const go = useGo();
  const cards = [
    ["Started With Curiosity", "A simple board, an open street, and the urge to try something new."],
    ["Deliver Content Your Fans Want", "The culture grows through sessions, videos, collaborations, and shared spots."],
    ["hared With Community", "Snowboarding is not only about landing tricks. It is about how you move."], // sic: source typo
    ["Driven by Style", "Every trick comes from repetition, patience, and learning from every fall."],
  ];
  return (
    <section data-testid="home-experience" className={`${WRAP} pb-[100px] pt-[81px]`}>
      <p className={EYEBROW}>Experience</p>
      <h2 className={`${H2} mt-[12px]`}>From First Push to Full Flow</h2>
      <Underline />
      <p className="mt-[16px] text-[18px] leading-[29px]">
        Every snowboarder starts with a first push, a first fall, and a first moment of balance. What begins as curiosity slowly becomes a habit, then a passion,
        then a way of expressing identity.
      </p>
      <p className="mt-[29px] text-[18px] leading-[29px]">
        This journey is built through daily practice, repeated attempts, failed landings, small wins, and the excitement of finally landing a trick that once felt
        impossible.
      </p>
      <div className="mt-[47px] grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[32px]">
        {cards.map(([t, b], i) => (
          <div key={t} className="min-h-[362px] rounded-[18px] border border-accent p-[8px]">
            <ImageSlot src={HOME_MEDIA.experience[i]} label={t} className="h-[170px] w-full" rounded="rounded-tile" />
            <h3 className="mt-[16px] font-display text-[18px] font-bold leading-[22px]">{t}</h3>
            <p className="mt-[12px] text-[16px] leading-[26px] text-soft">{b}</p>
            {i === 0 && (
              <button data-testid="home-buy-experience" onClick={() => go("public-store", { handle })} className="mt-[20px] inline-flex items-center gap-[8px] text-[14px] font-semibold">
                Buy Experience
                <span className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-white text-bg">
                  <ArrowRight size={11} strokeWidth={3} />
                </span>
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- 4. exclusive experience (store item) ---------------- */

function Exclusive() {
  const handle = useData((d) => d.account.handle);
  const go = useGo();
  const toStore = () => go("public-store", { handle });
  return (
    <section data-testid="home-exclusive" className={`${WRAP} flex items-center justify-between pb-[40px]`}>
      <div className="max-w-[480px]">
        <p className={EYEBROW}>Exclusive Experience</p>
        <h2 className="mt-[16px] font-display text-[40px] font-bold leading-[48px]">One to One Call / Video Conferencing</h2>
        <Underline />
        <p className="mt-[16px] text-[18px]">Video Call With The Band</p>
        <div className="mt-[24px]">
          <ArrowPill testid="home-schedule" onClick={toStore}>
            Schedule
          </ArrowPill>
        </div>
      </div>
      <div className="flex w-[527px] gap-[24px] rounded-[20px] border-2 border-accent p-[16px]">
        <ImageSlot src={HOME_MEDIA.videoCall} label="Video call" className="h-[131px] w-[148px] shrink-0" rounded="rounded-popover" />
        <div className="flex-1 rounded-tile bg-surface p-[20px]">
          <p className="text-[16px] font-bold">One to One Call / Video Conferencing</p>
          <p className="mt-[12px] text-[14px] font-bold">Live Video Call with Me</p>
          <p className="mt-[12px] text-[12px] leading-[16px]">
            We will do a video call where I can show you how to tune your snowboard or answer any of your questions about snowboarding techniques!
          </p>
          <p className="mt-[20px] text-[12px] font-bold">Choose an Option Below:</p>
          <div className="mt-[12px] space-y-[10px]">
            {[["15 Minutes", 100], ["30 Minutes", 150], ["45 Minutes", 200]].map(([l, p]) => (
              <button key={l} data-testid={`home-call-option-${String(l).split(" ")[0]}`} onClick={toStore} className="flex h-[45px] w-full items-center justify-between rounded-popover bg-bg px-[16px] text-[12px]">
                <span>{l}</span>
                <span>{money(p as number)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 5. collaborate ---------------- */

function Collaborate() {
  const cards: [typeof Megaphone, string, string][] = [
    [Megaphone, "Brand Campaigns", "Creative content for lifestyle, sports, streetwear, footwear, and youth-focused brands."],
    [Package, "Product Features", "Authentic gear, apparel, and accessory showcases through skate-led storytelling."],
    [CalendarDays, "Event Coverage", "Ski resort events, community sessions, competitions, and launch experiences."],
    [LayoutGrid, "Social Content", "Short-form videos, reels, behind-the-scenes clips, and creator-led campaigns."],
  ];
  return (
    <section data-testid="home-collaborate" className="relative bg-[linear-gradient(180deg,#e9eef3_0%,#f6f8fa_45%,#dfe5ea_100%)] pb-[40px] pt-[70px]">
      <span aria-hidden className="absolute inset-0">
        <ImageSlot src={HOME_MEDIA.collaborateBg} label="" className="h-full w-full" />
      </span>
      <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,#e9eef3_0%,#f6f8fa_45%,#dfe5ea_100%)] opacity-75" />
      <div className={`${WRAP} relative`}>
        <h2 className={`${H2} mx-auto max-w-[900px] text-center text-[#191a1c]`}>Collaborate With a Creator Built Around Movement and Culture</h2>
        <p className="mx-auto mt-[32px] max-w-[700px] text-center text-[18px] leading-[27px] text-[#191a1c]">
          Partner with a snowboarding creator who brings together visual storytelling, authentic mountain culture, and an engaged audience. From brand campaigns and
          product showcases to event coverage and community activations, every collaboration is shaped around real movement and credible creator-led content.
        </p>
        <div className="mt-[46px] grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-[16px]">
          {cards.map(([Icon, t, b]) => (
            <div key={t} className="min-h-[183px] rounded-tile bg-accent p-[24px]">
              <span className="flex h-[44px] w-[44px] items-center justify-center rounded-popover border border-white/40 bg-black">
                <Icon size={20} />
              </span>
              <h3 className="mt-[16px] font-display text-[18px] font-bold">{t}</h3>
              <p className="mt-[12px] text-[15px] leading-[22px]">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 6. culture ---------------- */

function Culture() {
  const rows: [typeof BookOpen, string, string][] = [
    [BookOpen, "Learn Together", "Get practical insights, trick tips, and honest breakdowns."],
    [Footprints, "Share the Culture", "Discover snowboarding spots, creator stories, and community-led moments."],
    [Sparkles, "Stay Inspired", "Follow new videos, challenges, collaborations, and progression updates."],
    [Users, "Connect With Fellow Snowboarders", "Join a community of riders who share experiences, tips, stories, and mountain moments."],
    [Gift, "Access Exclusive Drops", "Get early updates on merch, events, creator content, and limited community releases."],
    [MonitorPlay, "Join Local Sessions", "Find meetups, snowboarding sessions, and group rides happening around the community."],
  ];
  return (
    <section data-testid="home-culture" className={`${WRAP} pb-[100px] pt-[40px]`}>
      <h2 className={`${H2} text-center`}>
        Built for <span className="text-accent">Snowboard Culture</span> Lovers
      </h2>
      <p className="mx-auto mt-[16px] max-w-[760px] text-center text-[18px] leading-[22px]">
        Premium snowboard merchandise crafted for riders, creators, and fans who bring skate culture wherever they go.
      </p>
      <div className="mt-[58px] flex items-center justify-between gap-[48px]">
        <ul className="w-[440px] space-y-[30px]">
          {rows.map(([Icon, t, b]) => (
            <li key={t} className="flex gap-[16px]">
              <Icon size={46} strokeWidth={1.3} className="shrink-0 text-accent" />
              <div>
                <h3 className="font-display text-[18px] font-bold leading-[24px]">{t}</h3>
                <p className="text-[16px] leading-[20px] text-soft">{b}</p>
              </div>
            </li>
          ))}
        </ul>
        <ImageSlot src={HOME_MEDIA.culture} label="Riders on a snowy slope" className="h-[872px] w-[593px] min-w-0 shrink" rounded="rounded-tile" />
      </div>
    </section>
  );
}

/* ---------------- 7. merchandise ---------------- */

function Merchandise() {
  const handle = useData((d) => d.account.handle);
  const items = useData((d) => d.social.showcase.filter((s) => s.home));
  const go = useGo();
  return (
    <section data-testid="home-merchandise" className={`${WRAP} pb-[100px] pt-[40px]`}>
      <p className={EYEBROW}>Merchandise</p>
      <h2 className={`${H2} mt-[16px] max-w-[760px]`}>Inspired by Snow. Designed for Life.</h2>
      <Underline />
      <p className="mt-[16px] max-w-[760px] text-[18px] leading-[27px]">
        Premium snowboard merchandise crafted for riders, creators, and fans who bring skate culture wherever they go.
      </p>
      <div className="mt-[20px]">
        <ArrowPill testid="home-merch-view-all" onClick={() => go("public-store", { handle })}>
          View All
        </ArrowPill>
      </div>
      <div className="mt-[35px] grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[24px]">
        {items.map((it) => (
          <div key={it.id} data-testid={`home-product-${it.id}`} className="overflow-hidden rounded-[20px] border border-transparent bg-surface">
            <ImageSlot src={it.image} kind="product" label={it.title} className="aspect-square w-full !bg-[#efefef] !text-black/25" />
            <div className="p-[16px]">
              <h3 className="font-display text-[18px] font-bold">{it.title}</h3>
              <p className="mt-[8px] line-clamp-2 text-[14px] leading-[20px] text-soft/80">{it.description}</p>
              <div className="mt-[12px] flex items-center justify-between">
                <span className="text-[20px] font-bold">{it.price != null ? money(it.price) : "Free"}</span>
                <SmallPill testid={`home-buy-${it.id}`} onClick={() => go("public-product", { handle, productId: it.id })}>
                  Buy Now
                </SmallPill>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- 8. stay connected (feed posts grid) ---------------- */

function ctaLabel(p: Post) {
  const x = extraOf(p);
  if (p.type === "article") return "Read Article";
  if (p.type === "poll") return "Cast Vote";
  if (p.type === "fundraiser") return `View ${x.fundraiser?.contributions ?? 0} Contributions`;
  return "See Post";
}

function GridPost({ post }: { post: Post }) {
  const handle = useData((d) => d.account.handle);
  const go = useGo();
  const x = extraOf(post);
  const badge = badgeOf(post);
  const open = () => go("post-detail", { handle, postId: post.id });
  const media = post.media?.[0];
  return (
    <article data-testid={`home-post-${post.id}`} className="mb-[24px] break-inside-avoid rounded-[20px] bg-surface">
      <div className="px-[16px] pb-[16px] pt-[16px]">
        <Caption text={post.text} className="text-[14px] leading-[20px]" />
        {media && (
          <div className="relative mt-[16px] overflow-hidden rounded-tile">
            {badge && <span className="absolute left-[10px] top-[10px] z-10 rounded-full bg-accent px-[10px] py-[4px] text-[11px] font-bold uppercase">{badge}</span>}
            <ImageSlot
              src={media.src ?? posterOf(media.video)}
              label={media.placeholder}
              className={`w-full ${post.type === "poll" ? "h-[230px] !bg-[#efefef] !text-black/25" : post.type === "images" && post.id.endsWith("2") ? "h-[310px]" : "h-[174px]"}`}
            />
          </div>
        )}
        {post.type === "poll" && x.poll && (
          <div className="mt-[12px] space-y-[12px] rounded-2xl border border-accent p-[16px]">
            {(() => {
              const total = x.poll.options.reduce((s, o) => s + o.votes, 0);
              return x.poll.options.map((o) => {
                const pct = total ? Math.round((o.votes / total) * 100) : 0;
                return (
                  <div key={o.label} className="relative flex h-[36px] items-center justify-between overflow-hidden rounded-popover bg-bg px-[10px] text-[14px]">
                    <span className="absolute inset-y-0 left-[0px] bg-accent/35" style={{ width: `${pct}%` }} />
                    <span className="relative">{o.label}</span>
                    <span className="relative">{pct}%</span>
                  </div>
                );
              });
            })()}
          </div>
        )}
        {post.type === "fundraiser" && x.fundraiser && (
          <div className="mt-[12px]">
            <div className="flex flex-wrap justify-between gap-x-[8px] text-[14px] font-bold">
              <span>{money(x.fundraiser.raised)} Raised So Far</span>
              <span>{money(x.fundraiser.goal)} Goal</span>
            </div>
            <div className="mt-[12px] h-[22px] rounded-[11px] bg-bg p-[4px]">
              <div className="h-full min-w-[14px] rounded-full bg-accent" style={{ width: `${Math.min(100, (x.fundraiser.raised / x.fundraiser.goal) * 100)}%` }} />
            </div>
            <div className="mt-[16px] space-y-[10px]">
              {x.fundraiser.levels.map((l) => (
                <div key={l.title} className="flex h-[54px] items-center justify-between rounded-popover bg-bg px-[14px] text-[16px]">
                  <span>
                    {l.title}
                    <b className="ml-[8px]">{money(l.amount)}</b>
                  </span>
                  <button onClick={open} className="text-accent">
                    See Gift
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <button data-testid={`home-post-cta-${post.id}`} onClick={open} className="mt-[12px] flex h-[37px] w-full items-center justify-center rounded-pill bg-accent text-[12px] font-bold uppercase hover:brightness-110">
          {ctaLabel(post)}
        </button>
      </div>
      {(post.likes > 0 || post.comments > 0) && (
        <>
          <div className="h-px bg-white/[.08]" />
          <Counts post={post} className="px-[16px] py-[16px] text-soft/80" />
        </>
      )}
    </article>
  );
}

function StayConnected() {
  const posts = useData((d) => publishedPosts(d).filter((p) => extraOf(p).variant !== "welcome" && p.type !== "text").slice(0, 10));
  return (
    <section data-testid="home-feed-grid" className={`${WRAP} pb-[60px] pt-[40px]`}>
      <h2 className="text-[24px] font-bold tracking-[2px]">Stay Connected. Stay In The Moment</h2>
      <p className="mt-[16px] max-w-[760px] text-[18px] leading-[27px]">
        Keep your community engaged with fresh updates, exclusive posts, photos, videos, announcements, and everyday moments. Share what matters, spark
        conversations, and turn followers into a connected community.
      </p>
      <div className="mt-[48px] columns-4 gap-[24px]">
        {posts.map((p) => (
          <GridPost key={p.id} post={p} />
        ))}
      </div>
    </section>
  );
}

/* ---------------- 9. upcoming events ---------------- */

function Events() {
  const handle = useData((d) => d.account.handle);
  const events = useData((d) => {
    const now = new Date().toISOString();
    return d.monetize.events.filter((e) => !e.past && e.date > now).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  });
  const go = useGo();
  return (
    <section data-testid="home-events" className="relative py-[72px]">
      <div aria-hidden className="absolute inset-0">
        <ImageSlot src={HOME_MEDIA.eventsBg} kind="event" label="" className="h-full w-full" />
      </div>
      <div className="absolute inset-0 bg-black/60" />
      <div className={`${WRAP} relative`}>
        <div className="flex justify-between gap-[40px] rounded-[20px] bg-[#2b2d2f]/80 p-[32px]">
          <div className="max-w-[400px] pt-[8px]">
            <p className="text-[18px] font-bold">Tour</p>
            <h2 className="mt-[12px] font-display text-[40px] font-bold leading-[48px]">Upcoming Events</h2>
            <Underline />
            <p className="mt-[16px] text-[18px] leading-[27px]">Fall 2026 - the Long Way Home tour. Fan-club members get first crack at tickets 48 hours early.</p>
          </div>
          <div className="w-[569px] space-y-[16px]">
            {events.map((e) => {
              const d = new Date(e.date);
              return (
                <div key={e.id} data-testid={`home-event-${e.id}`} className="flex gap-[16px] rounded-inner bg-bg p-[16px]">
                  <div className="flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-popover bg-surface">
                    <span className="text-[11px] font-bold uppercase">{d.toLocaleString("en-US", { month: "short" })}</span>
                    <span className="text-[22px] font-bold leading-[24px]">{d.getDate()}</span>
                    <span className="text-[11px]">{d.getFullYear()}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[16px] font-bold">{e.title}</p>
                    <p className="mt-[8px] text-[13px] text-soft">
                      {e.location} - {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                    {e.description && <p className="mt-[8px] line-clamp-1 text-[12px] text-muted">{e.description}</p>}
                    <div className="mt-[8px] flex justify-end">
                      <SmallPill testid={`home-buy-tickets-${e.id}`} onClick={() => go("public-event-detail", { handle, eventId: e.id })}>
                        Buy Tickets
                      </SmallPill>
                    </div>
                  </div>
                </div>
              );
            })}
            {!events.length && <p className="rounded-inner bg-bg p-[24px] text-[14px] text-muted">No upcoming events.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 10. stats ---------------- */

function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) return setV(to);
    let raf = 0;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 1200);
        setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => (io.disconnect(), cancelAnimationFrame(raf));
  }, [to, reduce]);
  return <span ref={ref}>{v.toLocaleString("en-US")}</span>;
}

function Stats() {
  const stats: [number, string][] = [
    [11, "Olympic and World Medals"],
    [6901432, "Million Views on You Tube"],
    [68999, "Combined Followers"],
  ];
  return (
    <section data-testid="home-stats" className={`${WRAP} pb-[40px] pt-[78px]`}>
      <h2 className="text-center font-display text-[48px] font-bold leading-[58px]">Global Audience</h2>
      <p className="mt-[8px] text-center text-[18px]">AJ White Fan Reach Around the World</p>
      <div className="mt-[35px] grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[16px]">
        {stats.map(([n, l]) => (
          <div key={l} className="flex h-[145px] flex-col items-center justify-center rounded-inner bg-surface">
            <span className="font-display text-[40px] font-bold leading-[48px] text-accent">
              <CountUp to={n} />
            </span>
            <span className="mt-[8px] text-[16px]">{l}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- 11. videos (portfolio album) ---------------- */

function Videos() {
  const handle = useData((d) => d.account.handle);
  const go = useGo();
  const eps = [
    ["Halfpipe Finals Run", "00:09| Jan 23, 2026"],
    ["Big Air Session", "00:09"],
    ["Slopestyle Practice", "00:09"],
  ];
  const watch = () => go("public-video-series", { handle, seriesId: "competition-videos" });
  return (
    <section data-testid="home-videos" className={`${WRAP} pb-[64px] pt-[64px]`}>
      <h2 className="text-[24px] font-bold tracking-[2px]">Your Story. Your Sound. Your Visual World.</h2>
      <p className="mt-[4px] text-[18px] leading-[27px]">
        Explore a curated collection of music, videos, performances, and creative moments. From your latest releases to behind-the-scenes footage, showcase your
        work and give your community a closer look at your creative journey.
      </p>
      <div className="mt-[24px] rounded-[20px] bg-surface p-[20px]">
        <div className="flex gap-[16px]">
          <ImageSlot src={posterOf(HOME_MEDIA.series)} kind="video" label="Competition Videos" className="h-[180px] w-[320px] shrink-0" rounded="rounded-popover" />
          <div className="pt-[4px]">
            <p className="text-[11px] font-bold uppercase text-accent">Video/Series</p>
            <h3 className="mt-[8px] font-display text-[20px] font-bold">Competition Videos</h3>
            <p className="mt-[12px] text-[12px] text-soft">3 Episodes</p>
          </div>
        </div>
        <p className="mt-[24px] text-[16px]">Videos of my various snowboard competitions around the world</p>
        <div className="mt-[20px] space-y-[12px]">
          {eps.map(([t, m], i) => (
            <div key={t} className="flex h-[100px] items-center gap-[20px] rounded-tile bg-bg px-[16px]">
              <span className="w-[16px] text-[14px] font-bold">{i + 1}</span>
              <ImageSlot src={posterOf(HOME_MEDIA.episodes[i])} kind="video" label={t} className="h-[72px] w-[90px] shrink-0" rounded="rounded-md" />
              <div className="flex-1">
                <p className="text-[14px] font-bold">{t}</p>
                <p className="mt-[4px] text-[12px] text-soft">{m}</p>
              </div>
              <SmallPill testid={`home-watch-${i + 1}`} className="!h-[35px] w-[100px]" onClick={watch}>
                Watch
              </SmallPill>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 12. VIP deals ---------------- */

function VipDeals() {
  const handle = useData((d) => d.account.handle);
  const go = useGo();
  const deals = [
    ["$1 Off Glacier Hydration Drinks", "To celebrate a podium finish, Glacier Hydration is offering $1.00 off any drink at partner stores", "Ends Sep 15, 2028"],
    ["Free Gift with any Northpeak Goggle Purchase", "Our friends at Northpeak Outfitters have a special gift for my best fans", "Ends Mar 2, 2029"],
  ];
  return (
    <section data-testid="home-vip" className={`${WRAP} pb-[40px] pt-[64px]`}>
      <div className="flex justify-between gap-[40px] rounded-[20px] bg-surface p-[32px]">
        <div className="max-w-[410px] pt-[12px]">
          <p className="text-[18px] font-bold uppercase tracking-[2px]">VIP Deals</p>
          <h2 className="mt-[16px] font-display text-[36px] font-bold leading-[43px]">Exclusive Access. Unforgettable Experiences</h2>
          <Underline />
          <p className="mt-[16px] text-[18px] leading-[27px]">
            Step beyond the ordinary with VIP offers created for true fans. Unlock exclusive experiences, special perks, personal interactions, and opportunities
            designed to bring you closer to the moments and people you love.
          </p>
        </div>
        <div className="w-[569px] space-y-[16px]">
          {deals.map(([t, b, e], i) => (
            <div key={t} className="rounded-inner bg-bg p-[16px]">
              <div className="flex gap-[16px]">
                <ImageSlot src={HOME_MEDIA.dealLogos[i]} label={`${t} logo`} className="h-[88px] w-[88px] shrink-0" rounded="rounded-popover" />
                <div>
                  <p className="font-display text-[16px] font-bold">{t}</p>
                  <p className="mt-[8px] text-[12px] leading-[16px] text-soft">{b}</p>
                  <p className="mt-[8px] text-[11px] font-bold">{e}</p>
                </div>
              </div>
              <div className="mt-[8px] flex justify-end">
                <SmallPill testid={`home-view-deal-${i + 1}`} onClick={() => go("public-store", { handle })}>
                  View Deal
                </SmallPill>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 13. newsletter ---------------- */

function Newsletter() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();
  return (
    <section data-testid="home-newsletter" className="bg-accent py-[40px]">
      <div className={WRAP}>
        <div className="relative overflow-hidden rounded-[20px] bg-black px-[40px] pb-[48px] pt-[54px]">
          {/* Reference: black on the left, a red stage curtain coming in from the right. */}
          <span aria-hidden className="absolute inset-0">
            <ImageSlot src={HOME_MEDIA.newsletterBg} label="" className="h-full w-full" />
          </span>
          <span aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,#000_0%,#000_30%,rgba(0,0,0,0.55)_55%,rgba(0,0,0,0.15)_80%,rgba(0,0,0,0.3)_100%)]" />
          <h2 className={`${H2} relative`}>Get the Latest Drops, Sessions, and Stories</h2>
          <p className="relative mt-[12px] text-[16px]">Stay updated with new videos, trick breakdowns, park sessions, collaborations, events, and event updates.</p>
          <form
            className="relative mt-[24px] flex items-center gap-[12px]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr("Please enter a valid email address."); // inferred copy
              act("social.joinNewsletter", (d) => joinNewsletter(d, email.trim()));
              setErr(null);
              setEmail("");
              toast("Thanks for joining the newsletter (demo)");
            }}
          >
            <input
              aria-label="Email address"
              data-testid="home-newsletter-email"
              placeholder="Enter Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-[40px] w-[330px] rounded-pill border border-white bg-transparent px-[20px] text-[14px] text-white outline-none placeholder:text-white"
            />
            <ArrowPill testid="home-newsletter-join" type="submit">
              Join Newsletter
            </ArrowPill>
          </form>
          {err && <p className="relative mt-[8px] pl-[20px] text-[13px] text-white">{err}</p>}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 14. free-form ---------------- */

function FreeForm() {
  return (
    <section data-testid="home-free-form" className={`${WRAP} pb-[32px] pt-[44px]`}>
      <h2 className="font-display text-[36px] font-bold">What is Snowboarding?</h2>
      <p className="mt-[30px] text-[16px] leading-[23px]">
        Snowboarding grew out of a wish for new winter sports and more freedom of expression. Early riders borrowed ideas from surfing and skateboarding, boards got
        better every season, and the sport quickly spread from a few local hills to resorts everywhere. Competitions, federations and international events followed.
      </p>
      <p className="mt-[16px] text-[16px] leading-[23px]">
        Halfpipe, slopestyle and big air are freestyle events, where tricks are scored by judges, while snowboard cross and parallel giant slalom are racing events
        where the first athlete across the line wins.
      </p>
      <ImageSlot src={HOME_MEDIA.freeFormImage} label="Riders on the mountain" className="mt-[32px] h-[600px] w-full" rounded="rounded-tile" />
      <h2 className="mt-[48px] font-display text-[36px] font-bold">Olympic history of snowboard</h2>
      <p className="mt-[24px] text-[16px] leading-[23px]">
        Snowboarding joined the Winter Games in the late 1990s with halfpipe and giant slalom events. New formats such as snowboard cross, slopestyle, big air and a
        mixed team event were added over the following editions.
      </p>
      <div className="mt-[32px] overflow-hidden rounded-tile" aria-label="Video player">
        <VideoPlayer video={HOME_MEDIA.freeFormVideo} label="Olympic history of snowboard" className="h-[606px] w-full" />
      </div>
      <div className="mt-[32px] overflow-hidden rounded-tile" aria-label="Embedded video">
        <VideoPlayer video={HOME_MEDIA.freeFormEmbed} label="Embedded video" className="h-[606px] w-full" />
      </div>
    </section>
  );
}

/* ---------------- 15. footer ---------------- */

function Footer() {
  const handle = useData((d) => d.account.handle);
  const name = useData((d) => d.account.name);
  const go = useGo();
  const link = "block text-[14px] leading-[32px] text-white hover:text-accent";
  const learn: [string, () => void][] = [
    ["Store", () => go("public-store", { handle })],
    ["Feed", () => go("feed", { handle })],
    ["Welcome", () => go("feed", { handle })], // as captured: a plain link to the Feed (not the modal)
    ["Competitions", () => go("public-events", { handle })],
    ["Newsletters", () => go("public-store", { handle })], // inferred target
    ["Videos", () => go("public-videos", { handle, portfolioId: "competition-videos" })],
  ];
  const follow = ["Twitter / X", "Facebook", "Instagram", "TikTok", "Snapchat", "LinkedIn", "Spotify", "Website"];
  return (
    <footer data-testid="home-footer" className="pt-[100px]">
      <div className="mx-auto flex max-w-[1280px] justify-between px-[30px] pb-[56px]">
        <div className="max-w-[510px]">
          <Logo size={44} />
          <p className="mt-[36px] text-[14px] font-bold">Who is {name} ?</p>
          <p className="mt-[12px] text-[14px] leading-[24px]">
            {name} is an American freestyle snowboarder and sports content creator known for posting tricks, training sessions, competition clips, and outdoor
            adventure content on social media.
          </p>
        </div>
        <div className="flex gap-[128px] pr-[16px]">
          <div>
            <h3 className="mb-[8px] font-display text-[24px] font-bold">Learn More</h3>
            {learn.map(([l, f]) => (
              <button key={l} data-testid={`home-footer-${l.toLowerCase()}`} onClick={f} className={link}>
                {l}
              </button>
            ))}
          </div>
          <div>
            <h3 className="mb-[8px] font-display text-[24px] font-bold">Follow Us</h3>
            {follow.map((l) => (
              <a key={l} href="https://example.com" target="_blank" rel="noreferrer noopener" className={link}>
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-accent py-[22px] text-center text-[12px]">
        Copyright 2026 {name}&nbsp;&nbsp;{" "}
        <Link to="/terms-of-service" className="hover:text-accent">
          Terms
        </Link>
        &nbsp; &amp; &nbsp;
        <Link to="/privacy-policy" className="hover:text-accent">
          Privacy Policy.
        </Link>
        &nbsp;{" "}
        <Link to="/help-faq" className="hover:text-accent">
          Help Center.
        </Link>
      </div>
    </footer>
  );
}
