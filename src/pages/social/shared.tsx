/**
 * Social area primitives: modal variant (centred / custom top), round checkbox, post card (Feed
 * spec 11), helpers. Generic primitives come from src/platform/ui.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, FileText, Heart, Lock, MessageSquareText, MoreVertical, Play, Share2, X } from "lucide-react";
import type { Post } from "../../store/model";
import { useAct, useData } from "../../store/store";
import { deletePost, extraOf, toggleLike, togglePin, votePoll } from "../../store/slices/social";
import { routeById, pathFor } from "../../app/routeCatalog";
import { useRouter } from "../../app/router";
import { ImageSlot } from "../../platform/ui/surfaces";
import { VideoPlayer } from "../../platform/ui/media";
import { Button, TextButton, useOutside } from "../../platform/ui/controls";
import { useToast } from "../../platform/ui/toast";

/* ---------------- helpers ---------------- */

export const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** "2 Likes   3 Comments" (zero parts are hidden, as captured). */
export function Counts({ post, className = "" }: { post: Post; className?: string }) {
  if (!post.likes && !post.comments) return null;
  return (
    <div className={`flex gap-[12px] text-[13px] ${className}`}>
      {post.likes > 0 && <span>{plural(post.likes, "Like")}</span>}
      {post.comments > 0 && <span>{plural(post.comments, "Comment")}</span>}
    </div>
  );
}

/** Caption with #hashtags in the accent colour. */
export function Caption({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(/(#[\p{L}\p{N}_]+)/u);
  return (
    <p className={`whitespace-pre-line break-words ${className}`}>
      {parts.map((s, i) => (s.startsWith("#") ? <span key={i} className="text-accent">{s}</span> : <span key={i}>{s}</span>))}
    </p>
  );
}

/** Navigate to a route id if it exists in the catalogue (other areas may still be building theirs). */
export function useGo() {
  const { navigate } = useRouter();
  return (id: string, params: Record<string, string | number> = {}, fallback?: string) => {
    if (routeById(id)) navigate(pathFor(id, params));
    else if (fallback) navigate(fallback);
  };
}

/** Badge label per post (spec 11: "Image", "Video", "Fundraiser", "Downloadable"…). */
export function badgeOf(p: Post): string | null {
  const x = extraOf(p);
  if (x.variant === "welcome") return null;
  if (x.variant === "downloadable") return "Downloadable";
  return { video: "Video", images: "Image", article: "Article", audio: "Audio", reel: "Reel", poll: "Poll", giveaway: "Giveaway", link: "Link", fundraiser: "Fundraiser", text: null }[p.type];
}

/** Content filter options on the Feed (11a) and the type each one matches. */
export const CONTENT_FILTERS: { label: string; match: (p: Post) => boolean }[] = [
  { label: "All Content", match: () => true },
  { label: "Videos", match: (p) => p.type === "video" },
  { label: "Images", match: (p) => p.type === "images" && extraOf(p).variant !== "downloadable" },
  { label: "Articles", match: (p) => p.type === "article" },
  { label: "Audio", match: (p) => p.type === "audio" },
  { label: "Reels", match: (p) => p.type === "reel" },
  { label: "Polls", match: (p) => p.type === "poll" },
  { label: "Giveaways", match: (p) => p.type === "giveaway" },
  { label: "Links", match: (p) => p.type === "link" },
  { label: "Downloadables", match: (p) => extraOf(p).variant === "downloadable" },
  { label: "Fundraisers", match: (p) => p.type === "fundraiser" },
  { label: "Text", match: (p) => p.type === "text" },
];

/* ---------------- modal ---------------- */

/**
 * Modal for this area: same look as the platform Modal (#272a2b, r30, title + ✕, 1px divider) but
 * positioned like the captures: Livestream is vertically centred (19), Welcome sits at top ≈170 (80).
 */
export function SocialModal({
  open,
  onClose,
  title,
  width,
  children,
  testid,
  centered,
  top = 170,
  bodyClass = "px-[30px] py-[30px]",
  hideClose,
  titleClass = "text-[20px] font-bold",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  width: number;
  children: ReactNode;
  testid: string;
  centered?: boolean;
  top?: number;
  bodyClass?: string;
  /** No ✕ in the header (dialogs that close with their own CANCEL, e.g. New Post › Lock). */
  hideClose?: boolean;
  titleClass?: string;
}) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/70 px-[16px] ${centered ? "items-center" : "items-start"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            data-testid={testid}
            style={{ width, marginTop: centered ? 0 : top }}
            className="mb-[40px] max-w-full rounded-card bg-surface"
            initial={{ y: reduce ? 0 : -12 }}
            animate={{ y: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
          >
            <div className="flex h-[61px] items-center justify-between border-b border-white/[.12] px-[30px]">
              <h4 className={titleClass}>{title}</h4>
              {!hideClose && (
                <button aria-label="Close" data-testid={`${testid}-close`} onClick={onClose} className="text-white hover:text-accent">
                  <X size={24} strokeWidth={2.5} />
                </button>
              )}
            </div>
            <div className={bodyClass}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Confirm-tier dialog (publish, delete…): explicit second step before act(). */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
  testid,
  error,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  testid: string;
  error?: string | null;
}) {
  return (
    <SocialModal open={open} onClose={onClose} title={title} width={450} centered testid={testid} bodyClass="px-[30px] pb-[30px] pt-6">
      <div className="text-[16px] leading-[24px] text-soft">{body}</div>
      {error && <p className="mt-[12px] text-[13px] font-medium text-danger" role="alert">{error}</p>}
      <div className="mt-[24px] flex items-center justify-end gap-[12px]">
        <TextButton data-testid={`${testid}-cancel`} onClick={onClose}>
          Cancel
        </TextButton>
        <Button data-testid={`${testid}-confirm`} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </SocialModal>
  );
}

/* ---------------- round checkbox (New Post option rows) ---------------- */

export function RoundCheck({ checked, onChange, label, testid }: { checked: boolean; onChange: () => void; label: string; testid: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      data-testid={testid}
      onClick={onChange}
      className={`flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full ${checked ? "bg-accent" : "border border-accent"}`}
    >
      {checked && <Check size={15} strokeWidth={3.5} />}
    </button>
  );
}

/* ---------------- post card (Feed, spec 11) ---------------- */

const fmtDuration = (s: number) => `-${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const fmtPollEnd = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="absolute left-[16px] top-[16px] z-10 inline-flex h-[31px] min-w-[88px] items-center justify-center rounded-[22px] bg-accent px-[9px] text-[12px] text-white">
      {children}
    </span>
  );
}

function Media({ post }: { post: Post }) {
  const x = extraOf(post);
  const badge = badgeOf(post);
  const media = post.media ?? [];
  if (!media.length) return null;
  if (post.type === "images" && media.length > 1) {
    const extra = media.length - 3;
    return (
      <div className="relative mt-[16px] grid grid-cols-2 gap-[6px] overflow-hidden rounded-2xl">
        {badge && <Badge>{badge}</Badge>}
        <ImageSlot src={media[0].src} label={media[0].placeholder} className="col-span-2 h-[410px] w-full" />
        <ImageSlot src={media[1].src} label={media[1].placeholder} className="h-[252px] w-full" />
        <div className="relative">
          <ImageSlot src={media[2]?.src} label={media[2]?.placeholder ?? "Image"} className="h-[252px] w-full" />
          {extra > 0 && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-[18px] font-bold">+{extra} More</span>
          )}
        </div>
      </div>
    );
  }
  const h = x.variant === "welcome" || post.type === "video" ? "h-[290px]" : post.type === "poll" ? "h-[383px]" : post.type === "audio" ? "h-[295px]" : "h-[344px]";
  return (
    <div className={`relative overflow-hidden rounded-2xl ${post.type === "poll" ? "mt-[50px]" : "mt-[16px]"}`}>
      {badge && <Badge>{badge}</Badge>}
      {post.type === "video" || x.variant === "welcome" ? (
        <VideoPlayer video={media[0].video} poster={media[0].src} label={media[0].placeholder} className={`${h} w-full`} />
      ) : (
        <ImageSlot src={media[0].src} label={media[0].placeholder} className={`${h} w-full ${post.type === "poll" ? "!bg-[#efefef] !text-black/25" : ""}`} />
      )}
    </div>
  );
}

function PostMenu({ post }: { post: Post }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  const act = useAct();
  const toast = useToast();
  const { navigate } = useRouter();
  const handle = useData((d) => d.account.handle);
  const pinned = useData((d) => d.social.pinnedPostId === post.id);
  const item = "block w-full px-[20px] py-[7px] text-left text-[15px] hover:text-accent";
  return (
    <div ref={ref} className="relative -mr-[4px] shrink-0">
      <button aria-label="Post options" aria-expanded={open} data-testid={`feed-post-menu-${post.id}`} onClick={() => setOpen((o) => !o)} className="flex h-[36px] w-[32px] items-center justify-center">
        <MoreVertical size={26} strokeWidth={2.6} />
      </button>
      {open && (
        <div role="menu" data-testid="feed-post-menu" className="absolute right-[0px] top-[40px] z-30 w-[160px] rounded-tile bg-surface py-[8px] shadow-[0_4px_16px_rgba(0,0,0,.45)]">
          <button
            role="menuitem"
            data-testid="feed-post-pin"
            className={item}
            onClick={() => {
              setOpen(false);
              const r = act("social.togglePin", (d) => togglePin(d, post.id), { need: "content.write" });
              toast(r.ok ? (pinned ? "Post unpinned" : "Post pinned") : r.reason);
            }}
          >
            {pinned ? "Unpin Post" : "Pin Post"}
          </button>
          <button role="menuitem" data-testid="feed-post-edit" className={item} onClick={() => (setOpen(false), navigate(`${pathFor("post-detail", { handle, postId: post.id })}?edit=1`))}>
            Edit Post
          </button>
          <button role="menuitem" data-testid="feed-post-delete" className={item} onClick={() => (setOpen(false), setErr(null), setConfirm(true))}>
            Delete Post
          </button>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete Post"
        // inferred: delete confirmation copy was not captured
        body="Are you sure you want to delete this post? This cannot be undone."
        confirmLabel="Delete"
        testid="modal-delete-post"
        error={err}
        onConfirm={() => {
          const r = act("social.deletePost", (d) => deletePost(d, post.id), { need: "content.write" });
          if (!r.ok) return setErr(r.reason);
          setConfirm(false);
          toast("Post deleted");
        }}
      />
    </div>
  );
}

function ActionBar({ post }: { post: Post }) {
  const liked = useData((d) => d.social.likedByMe.includes(post.id));
  const handle = useData((d) => d.account.handle);
  const act = useAct();
  const toast = useToast();
  const go = useGo();
  return (
    <div className="mt-[16px] flex h-[56px] items-center justify-between rounded-[32px] bg-bg px-[24px] text-[14px] font-medium">
      <button
        data-testid={`feed-like-${post.id}`}
        aria-pressed={liked}
        onClick={() => act("social.toggleLike", (d) => toggleLike(d, post.id))}
        className={`flex w-[100px] items-center gap-[12px] ${liked ? "text-accent" : ""}`}
      >
        <Heart size={22} className={liked ? "fill-accent" : "fill-white"} strokeWidth={0} />
        Like
      </button>
      <button data-testid={`feed-comment-${post.id}`} onClick={() => go("post-detail", { handle, postId: post.id })} className="flex items-center gap-[12px]">
        <MessageSquareText size={20} className="fill-white text-bg" />
        Comment
      </button>
      <button
        data-testid={`feed-share-${post.id}`}
        onClick={() => {
          const url = `${window.location.origin}/${handle}/post/${post.id}`;
          navigator.clipboard?.writeText(url).catch(() => {});
          toast("Link copied"); // inferred: share sheet was not captured
        }}
        className="flex w-[100px] items-center justify-end gap-[12px]"
      >
        <Share2 size={20} />
        Share
      </button>
    </div>
  );
}

/** Full post card for the Feed and the single post page. */
export function PostCard({ post, canManage }: { post: Post; canManage: boolean }) {
  const x = extraOf(post);
  const handle = useData((d) => d.account.handle);
  const go = useGo();
  const act = useAct();
  const toCta = () => go("post-detail", { handle, postId: post.id });
  const toast = useToast();
  const pill = "mt-[16px] flex h-[40px] w-full items-center justify-center rounded-pill bg-accent text-[14px] font-black uppercase tracking-caps text-white hover:brightness-110";
  return (
    <article data-testid={`feed-post-${post.id}`} className="rounded-[32px] bg-surface px-[16px] pb-[16px] pt-[23px]">
      <div className="flex items-start justify-between gap-[16px]">
        <Caption text={post.text} className="pt-[4px] text-[15px] leading-[21px]" />
        {canManage && <PostMenu post={post} />}
      </div>
      <Media post={post} />

      {x.variant === "downloadable" && (
        <div className="mt-[12px] flex h-[88px] items-center gap-[16px] rounded-popover bg-accent px-[24px]">
          <FileText size={40} className="fill-white text-accent" strokeWidth={1.2} />
          <span className="flex-1 text-[16px] font-bold">{x.file?.title}</span>
          {post.locked && <Lock size={22} className="fill-white text-accent" />}
        </div>
      )}
      {post.type === "audio" && (
        <div className="mt-[8px] flex h-[66px] items-center gap-[12px] rounded-popover bg-bg px-[20px]">
          <button
            aria-label="Play"
            data-testid={`feed-audio-play-${post.id}`}
            onClick={() => toast("This demo post has no audio file attached, so there's nothing to play.")}
            className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-accent">
            <Play size={16} className="ml-[2px] fill-white" />
          </button>
          <span className="relative h-[3px] flex-1 rounded bg-white/25">
            <span className="absolute -top-[5px] left-[0px] h-[12px] w-[12px] rounded-full bg-accent" />
          </span>
          <span className="w-[48px] text-right text-[12px]">{fmtDuration(x.audio?.duration ?? 0)}</span>
        </div>
      )}
      {post.type === "poll" && x.poll && (
        <>
          <div className="mt-[16px] space-y-[20px] rounded-2xl border border-accent px-[16px] py-[16px]">
            {(() => {
              const total = x.poll.options.reduce((s, o) => s + o.votes, 0);
              const ended = !!x.poll.endsAt && new Date(x.poll.endsAt) < new Date();
              return x.poll.options.map((o, i) => {
                const pct = total ? Math.round((o.votes / total) * 100) : 0;
                return (
                  <button
                    key={i}
                    data-testid={`feed-poll-option-${post.id}-${i}`}
                    disabled={ended}
                    onClick={() => act("social.votePoll", (d) => votePoll(d, post.id, i))}
                    className="relative flex h-[36px] w-full items-center justify-between overflow-hidden rounded-popover bg-bg px-[10px] text-[14px]"
                  >
                    <span className="absolute inset-y-0 left-[0px] bg-accent/35" style={{ width: `${pct}%` }} />
                    <span className="relative">{o.label}</span>
                    <span className="relative">{pct}%</span>
                  </button>
                );
              });
            })()}
          </div>
          <p className="mt-[12px] text-[14px] text-muted">
            Total Votes: {x.poll.options.reduce((s, o) => s + o.votes, 0)}
            {x.poll.endsAt && (
              <>
                {"  "}•{"  "}
                {new Date(x.poll.endsAt) < new Date() ? "Poll Ended on " : "Poll Ends on "}
                {fmtPollEnd(x.poll.endsAt)}
              </>
            )}
          </p>
        </>
      )}
      {post.type === "article" && (
        <button data-testid={`feed-read-article-${post.id}`} onClick={toCta} className={`${pill} !h-[30px]`}>
          Read Article
        </button>
      )}
      {post.type === "link" && (
        <a data-testid={`feed-open-link-${post.id}`} href={x.link?.url} target="_blank" rel="noreferrer noopener" className={`${pill} !h-[30px]`}>
          Open Link
        </a>
      )}
      {post.type === "giveaway" && (
        <button data-testid={`feed-giveaway-${post.id}`} onClick={toCta} className={`${pill} !h-[30px]`}>
          View {x.giveaway?.responses ?? 0} Responses
        </button>
      )}

      <Counts post={post} className="mt-[16px] justify-end" />

      {post.type === "fundraiser" && x.fundraiser && (
        <div className="mt-[16px]">
          <div className="flex justify-between text-[14px] font-bold">
            <span>{money(x.fundraiser.raised)} Raised So Far</span>
            <span>{money(x.fundraiser.goal)} Goal</span>
          </div>
          <div className="mt-[12px] h-[22px] overflow-hidden rounded-[11px] bg-bg">
            <div className="h-full min-w-[32px] rounded-[11px] bg-accent" style={{ width: `${Math.min(100, (x.fundraiser.raised / x.fundraiser.goal) * 100)}%` }} />
          </div>
          <div className="mt-[20px] space-y-[10px]">
            {x.fundraiser.levels.map((l) => (
              <div key={l.title} className="flex h-[50px] items-center justify-between rounded-popover bg-bg pl-[13px] pr-[20px] text-[14px]">
                <span>
                  {l.title}
                  <b className="ml-[8px]">{money(l.amount)}</b>
                </span>
                <button data-testid={`feed-see-gift-${l.title.toLowerCase()}`} onClick={toCta} className="text-accent hover:underline">
                  See Gift
                </button>
              </div>
            ))}
          </div>
          <button data-testid={`feed-contributions-${post.id}`} onClick={toCta} className={pill}>
            View {x.fundraiser.contributions} Contributions
          </button>
        </div>
      )}

      <ActionBar post={post} />
    </article>
  );
}
