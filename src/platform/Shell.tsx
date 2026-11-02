/**
 * Creator dashboard shell: 75px header, 268px left column, content column (REF › App shell; P75).
 */
import type { ReactNode } from "react";
import {
  Bell, ChartColumn, CircleDollarSign, Globe, House, Lightbulb, MessageCircle, Plus, SquarePlay, Video, Wallet,
} from "lucide-react";
import { assets, creator, sidebarNav } from "../config/demo";
import { Avatar, VerifiedBadge } from "./ui/surfaces";
import { IconCircle } from "./ui/controls";

const navIcons = {
  home: House,
  feed: SquarePlay,
  activity: Bell,
  messages: MessageCircle,
  monetize: CircleDollarSign,
  wallet: Wallet,
  insights: ChartColumn,
  resources: Lightbulb,
};

export function Logo({ size = 36 }: { size?: number }) {
  if (assets.logoImage) return <img src={assets.logoImage} alt={creator.name} style={{ height: size }} />;
  return (
    <span className="whitespace-nowrap font-logo leading-none text-accent" style={{ fontSize: size }}>
      {creator.name}
    </span>
  );
}

export function Header({ wide = false }: { wide?: boolean }) {
  return (
    <header className="sticky top-0 z-40 bg-bg">
      <div className={`mx-auto flex h-[75px] items-center justify-between ${wide ? "max-w-[1512px] px-5" : "max-w-[1280px] px-[26px]"}`}>
        <Logo />
        <div className="flex items-center gap-3">
          <IconCircle aria-label="Language">
            <Globe size={22} />
          </IconCircle>
          <button aria-label="Account menu">
            <Avatar src={assets.avatar} size={42} ring={2} />
          </button>
        </div>
      </div>
    </header>
  );
}

function Sidebar() {
  return (
    <aside className="sticky top-[75px] w-[268px] shrink-0 self-start pt-9">
      <div className="flex flex-col items-center">
        <Avatar src={assets.avatar} size={104} ring={3} />
        <div className="mt-3 flex items-center gap-1.5">
          <span className="text-2xl font-bold">{creator.name}</span>
          <VerifiedBadge />
        </div>
      </div>
      <div className="mt-[42px] flex flex-col gap-2.5">
        <SidebarCta field="new-post" icon={<Plus size={20} />}>New Post</SidebarCta>
        <SidebarCta icon={<Video size={20} />}>Livestream</SidebarCta>
      </div>
      <nav className="mt-2.5">
        <ul>
          {sidebarNav.map((item) => {
            const Icon = navIcons[item.icon];
            return (
              <li key={item.label}>
                <a
                  href="#"
                  data-field={`nav-${item.label.toLowerCase()}`}
                  onClick={(e) => e.preventDefault()}
                  className="group flex h-[39px] items-center gap-4 rounded-[20px] pb-[7px] pl-6 pr-2 pt-1.5 text-base text-white hover:bg-accent-tint hover:text-accent"
                >
                  <Icon size={22} className="shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {"badge" in item && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-danger text-xs text-white">
                      {item.badge}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

function SidebarCta({ icon, children, field }: { icon: ReactNode; children: ReactNode; field?: string }) {
  return (
    <button data-field={field} className="relative flex h-[37px] w-[268px] items-center justify-center rounded-pill bg-accent px-5 pb-1.5 pt-[7px] text-sm font-black uppercase tracking-caps text-white hover:brightness-110">
      <span className="absolute left-5">{icon}</span>
      {children}
    </button>
  );
}

/**
 * TopFan logo for the account-setup header, always white on the dark background.
 * If a logo file is set (config › assets.topfanLogo) it is used and forced to white;
 * otherwise an SVG recreation (emblem + "TOP" light / "FAN" bold) is shown.
 */
export function TopFanLogo({ height = 34 }: { height?: number }) {
  if (assets.topfanLogo)
    return <img src={assets.topfanLogo} alt="TopFan" style={{ height }} className="[filter:brightness(0)_invert(1)]" />;
  return (
    <span className="flex items-center text-white" style={{ height, gap: height * 0.28 }} aria-label="TopFan" role="img">
      <TopFanEmblem size={height} />
      <span className="leading-none tracking-[0.5px]" style={{ fontSize: height * 0.86 }}>
        <span className="font-light">TOP</span>
        <span className="font-bold">FAN</span>
      </span>
    </span>
  );
}

/** Approximation of the TopFan emblem: rocket inside a broken ring with a speed swoosh. */
function TopFanEmblem({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      {/* broken ring */}
      <path d="M8.5 27.5A15 15 0 1 1 27.5 34" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      {/* swoosh */}
      <path d="M4 33.5c5-1.2 9.5-4 13.2-7.6" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M11 36.5c4.2-1.6 8-4.2 11-7.4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      {/* rocket, pointing up-right */}
      <g transform="rotate(45 22 18)">
        <path d="M22 5c3.6 2.8 4.6 9.6 3.4 15h-6.8C17.4 14.6 18.4 7.8 22 5Z" fill="currentColor" />
        <circle cx="22" cy="12.5" r="1.9" fill="var(--bg)" />
        <path d="M18.6 16.5 16 21.5h3.2ZM25.4 16.5 28 21.5h-3.2Z" fill="currentColor" />
        <path d="M20.2 22h3.6l-1.8 3.2Z" fill="currentColor" />
      </g>
    </svg>
  );
}

/** Header used during account setup: TopFan brand, no creator features. */
function SetupHeader({ overBackdrop = false }: { overBackdrop?: boolean }) {
  return (
    <header className={overBackdrop ? "relative z-40" : "sticky top-0 z-40 bg-bg"}>
      <div className="flex h-[75px] items-center justify-between px-[26px]">
        <TopFanLogo />
        <div className="flex items-center gap-3">
          <IconCircle aria-label="Language">
            <Globe size={22} />
          </IconCircle>
          <button aria-label="Account menu">
            <Avatar src={assets.avatar} size={42} ring={2} />
          </button>
        </div>
      </div>
    </header>
  );
}

/**
 * Account setup layout: TopFan header + setup form (left, dominant) + assistant (right slot).
 * No sidebar, no Preferences, no creator dashboard features.
 */
export function OnboardingLayout({
  children,
  assistant,
  backdrop,
}: {
  children: ReactNode;
  assistant?: ReactNode;
  /** Optional decorative layer behind the setup column (provisioning uses the space backdrop). */
  backdrop?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-bg">
      <div className="relative min-w-0 flex-1">
        {backdrop}
        <div className="relative">
          <SetupHeader overBackdrop={!!backdrop} />
          <main className="mx-auto max-w-[1180px] px-10 pb-24 pt-8">{children}</main>
        </div>
      </div>
      {assistant}
    </div>
  );
}

/** Creator dashboard layout with the left column (only after setup is complete). */
export function DashboardLayout({ children, assistant }: { children: ReactNode; assistant?: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <div className="min-w-0 flex-1">
        <Header />
        <div className="mx-auto flex max-w-[1280px] gap-[37px] px-3 pb-24">
          <Sidebar />
          <main className="min-w-0 flex-1 pt-10">{children}</main>
        </div>
      </div>
      {assistant}
    </div>
  );
}

/** Full-width layout (cover page editor has no sidebar, 20px side padding — P50f). */
export function FullWidthLayout({ children, assistant }: { children: ReactNode; assistant?: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <div className="min-w-0 flex-1">
        <Header wide />
        <main className="mx-auto max-w-[1512px] px-5 pb-24 pt-5">{children}</main>
      </div>
      {assistant}
    </div>
  );
}
