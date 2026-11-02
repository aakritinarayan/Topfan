/**
 * Messages › chat thread (bubbles, date separators, lazy load of older messages) and composer (P13).
 */
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Camera, Layers, Lock, Mic, Navigation, Play, Ticket, Volume2 } from "lucide-react";
import { useData } from "../../../store/store";
import type { ChatBody, ChatMessage, ChatStoreItem } from "../../../store/slices/comms";
import { Avatar, ImageSlot } from "../../../platform/ui/surfaces";
import { useOutside } from "../../../platform/ui/controls";
import { SCROLL, money } from "../ui";

const PAGE = 8;
const dayKey = (iso: string) => iso.slice(0, 10);
const dayLabel = (iso: string) => new Date(`${dayKey(iso)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** Scrollable thread, newest at the bottom; scrolling to the top loads older messages (as the source does). */
export function Thread({ messages, fanAvatar, threadKey }: { messages: ChatMessage[]; fanAvatar: string | null; threadKey: string }) {
  const avatar = useData((d) => d.account.avatar);
  const storeItems = useData((d) => d.comms.storeItems);
  const [count, setCount] = useState(PAGE);
  const ref = useRef<HTMLDivElement>(null);
  const prevHeight = useRef<number | null>(null);
  const lastLen = useRef(messages.length);

  // new thread: reset window and jump to the newest message
  useLayoutEffect(() => {
    setCount(PAGE);
    lastLen.current = messages.length;
    requestAnimationFrame(() => ref.current && (ref.current.scrollTop = ref.current.scrollHeight));
  }, [threadKey]);
  // new message sent: keep it in view
  useEffect(() => {
    if (messages.length > lastLen.current) {
      setCount((c) => c + (messages.length - lastLen.current));
      requestAnimationFrame(() => ref.current && (ref.current.scrollTop = ref.current.scrollHeight));
    }
    lastLen.current = messages.length;
  }, [messages.length]);
  // older messages loaded: keep the scroll position anchored
  useLayoutEffect(() => {
    if (prevHeight.current != null && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight - prevHeight.current;
      prevHeight.current = null;
    }
  }, [count]);

  const shown = messages.slice(Math.max(0, messages.length - count));
  return (
    <div
      ref={ref}
      data-testid="messages-thread"
      onScroll={(e) => {
        const el = e.currentTarget;
        if (el.scrollTop < 8 && count < messages.length) {
          prevHeight.current = el.scrollHeight;
          setCount((c) => c + PAGE);
        }
      }}
      className={`${SCROLL} min-h-[0px] flex-1 overflow-y-auto px-[16px] pb-[8px] pt-[16px]`}
    >
      {messages.length === 0 && <p className="pt-[40px] text-center text-[14px] text-muted">No messages yet. Say hi!</p>}
      {shown.map((msg, i) => {
        const newDay = i === 0 || dayKey(shown[i - 1].at) !== dayKey(msg.at);
        return (
          <Fragment key={msg.id}>
            {newDay && (
              <div className="relative my-[16px] flex items-center justify-center">
                <span className="absolute inset-x-[0px] top-1/2 h-px bg-white/20" />
                <span className="relative bg-surface px-[10px] py-[3px] text-[12px] text-white">{dayLabel(msg.at)}</span>
              </div>
            )}
            <Bubble msg={msg} avatar={msg.from === "creator" ? avatar : fanAvatar} storeItems={storeItems} />
          </Fragment>
        );
      })}
    </div>
  );
}

function Bubble({ msg, avatar, storeItems }: { msg: ChatMessage; avatar: string | null; storeItems: ChatStoreItem[] }) {
  const out = msg.from === "creator";
  const side = (
    <div className="flex w-[50px] shrink-0 flex-col items-center gap-[4px] pt-[2px]">
      <Avatar src={avatar} size={38} ring={2} />
      <span className="whitespace-nowrap text-[11px] text-date">{timeLabel(msg.at)}</span>
    </div>
  );
  return (
    <div data-testid={`messages-bubble-${msg.id}`} className={`mb-[12px] flex items-start gap-[12px] ${out ? "justify-end" : "justify-start"}`}>
      {!out && side}
      <div className={`min-w-[0px] max-w-[78%] ${out ? "flex justify-end" : ""}`}>
        <BubbleBody body={msg.body} out={out} storeItems={storeItems} />
      </div>
      {out && side}
    </div>
  );
}

const plain = (out: boolean) => `rounded-[5px] px-[12px] pb-[20px] pt-[10px] text-[14px] leading-[18px] text-white ${out ? "bg-accent" : "bg-bg"}`;

function BubbleBody({ body, out, storeItems }: { body: ChatBody; out: boolean; storeItems: ChatStoreItem[] }) {
  switch (body.kind) {
    case "text":
      return <div className={`${plain(out)} min-w-[64px] whitespace-pre-wrap break-words text-center`}>{body.text}</div>;
    case "tip":
    case "guaranteed":
      return (
        <div className={`${plain(out)} flex items-start gap-[16px] !pb-[16px] !pt-[16px]`}>
          <span className="pt-[4px]">{body.text}</span>
          <span className="rounded-lg bg-accent px-[10px] py-[8px] text-white">
            <span className="block text-[20px] font-bold leading-[24px]">
              {money(body.amount)}
              {body.kind === "guaranteed" && <span className="ml-[4px] text-[14px]">ⓢ</span>}
            </span>
            <span className="block text-[13px]">{body.kind === "tip" ? "Tip" : "Guaranteed Reply"}</span>
          </span>
        </div>
      );
    case "paid":
      return (
        <div className="flex gap-[10px]">
          <PaidCard title="Free Preview" kind={body.preview} media={body.previewMedia} />
          <PaidCard title={`Locked ${money(body.price)}`} kind={body.locked} locked />
        </div>
      );
    case "store": {
      const item = storeItems.find((s) => s.id === body.itemId);
      return (
        <div className="w-full rounded-lg bg-accent p-[12px]">
          <p className="mb-[10px] px-[4px] text-[14px]">{body.caption}</p>
          {item && <StoreItemCard item={item} />}
        </div>
      );
    }
    case "course": {
      const item = storeItems.find((s) => s.id === body.itemId);
      if (!item) return null;
      return (
        <div className="w-[300px] max-w-full rounded-lg bg-accent p-[12px]">
          <div className="rounded-lg bg-surface p-[16px]">
            <StoreItemImage item={item} className="mb-[12px] h-[120px] w-full" />
            <p className="text-[16px] font-bold">{item.title}</p>
            <p className="mt-[8px] text-[12px] leading-[16px] text-soft">{item.description}</p>
            <button type="button" className="mt-[12px] h-[36px] w-full rounded-pill bg-accent text-[12px] font-black uppercase tracking-caps">
              Enroll in course for {money(item.price ?? 0)}
            </button>
            <button type="button" className="mt-[8px] h-[36px] w-full rounded-pill border border-accent text-[12px] font-black uppercase tracking-caps text-white">
              Enroll in course via subscription
            </button>
          </div>
        </div>
      );
    }
    case "audio":
      return (
        <div className="rounded-[5px] bg-accent p-[10px]">
          <div className="flex w-[220px] items-center gap-[10px] rounded-full bg-bg px-[10px] py-[8px]">
            <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-white text-bg">
              <Play size={14} className="fill-current" />
            </span>
            <span className="h-[4px] flex-1 rounded-full bg-accent" />
            <span className="text-[12px] text-soft">-00:{String(body.seconds).padStart(2, "0")}</span>
          </div>
        </div>
      );
    case "media":
      return (
        <div className="rounded-[5px] bg-accent p-[10px]">
          <ImageSlot label={body.fileName} className="h-[110px] w-[150px]" rounded="rounded-lg" />
          <p className="mt-[6px] max-w-[150px] truncate text-[12px]">{body.fileName}</p>
        </div>
      );
    case "coupon":
      return (
        <div className="rounded-[5px] bg-accent px-[16px] py-[12px] text-center">
          <p className="text-[13px]">Coupon</p>
          <p className="text-[20px] font-bold">{body.percent}% OFF</p>
          <p className="mt-[4px] rounded bg-bg px-[8px] py-[2px] font-mono text-[12px]">{body.code}</p>
        </div>
      );
  }
}

function PaidCard({ title, kind, locked, media }: { title: string; kind: "image" | "audio"; locked?: boolean; media?: string | null }) {
  return (
    <div className="w-[115px] rounded-[3px] bg-accent px-[12px] pb-[10px] pt-[10px]">
      <p className="mb-[8px] whitespace-nowrap text-[14px] font-bold">{title}</p>
      {kind === "audio" ? (
        <div className="flex h-[78px] items-center justify-center">
          <Volume2 size={24} />
        </div>
      ) : locked ? (
        <div className="flex h-[78px] w-[78px] items-center justify-center rounded-[14px] bg-black/25 backdrop-blur">
          <Lock size={18} className="text-white/60" />
        </div>
      ) : (
        <ImageSlot src={media} label="Free preview" className="h-[78px] w-[78px]" rounded="rounded-[14px]" />
      )}
    </div>
  );
}

/** Store item image: the linked Monetize product's image when it has one, else the seed key. */
function useStoreItemImage(item: ChatStoreItem) {
  const products = useData((d) => d.monetize.products);
  return products.find((p) => p.id === item.productId)?.image ?? item.image ?? null;
}

function StoreItemImage({ item, className }: { item: ChatStoreItem; className: string }) {
  return <ImageSlot src={useStoreItemImage(item)} kind={item.type === "course" ? "course" : "image"} label={item.title} className={className} rounded="rounded-lg" />;
}

export function StoreItemCard({ item }: { item: ChatStoreItem }) {
  return (
    <div className="flex gap-[24px] rounded-lg bg-bg p-[8px]">
      <StoreItemImage item={item} className="h-[131px] w-[134px] shrink-0" />
      <div className="min-w-[0px] flex-1 rounded-lg bg-surface p-[20px]">
        <p className="text-[16px] font-bold leading-[20px]">{item.title}</p>
        <p className="mt-[12px] text-[14px] font-bold">{item.subtitle}</p>
        <p className="mt-[12px] text-[12px] leading-[16px]">{item.description}</p>
        {item.options.length > 0 && (
          <>
            <p className="mb-[8px] mt-[20px] text-[12px] font-bold">Choose an Option Below:</p>
            <div className="space-y-[8px]">
              {item.options.map((o) => (
                <div key={o.label} className="flex items-center justify-between rounded-lg bg-bg px-[16px] py-[12px] text-[12px]">
                  <span>{o.label}</span>
                  <span>{money(o.price)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const EMOJI = ["😀", "😂", "😍", "🥳", "😎", "🤙", "👍", "🙏", "🔥", "💯", "❤️", "🏂", "❄️", "⛷️", "🏔️", "🎉", "👏", "💪", "😅", "🤩", "😢", "😮", "✨", "🙌"];

export type ComposerAttach = "paid" | "store" | "coupon";

/** Composer: pill textarea + send, and the icon row (emoji, paid media, store items, coupon, photo, voice). */
export function Composer({
  onSend,
  onAttach,
  disabled,
}: {
  onSend: (body: ChatBody) => void;
  onAttach: (kind: ComposerAttach) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState(false);
  const [rec, setRec] = useState<number | null>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useOutside(emojiRef, () => setEmoji(false), emoji);
  useEffect(() => {
    if (rec == null) return;
    const t = setInterval(() => setRec((r) => (r == null ? r : r + 1)), 1000);
    return () => clearInterval(t);
  }, [rec != null]);

  const send = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend({ kind: "text", text: t });
    setText("");
  };
  const icon = "flex h-[30px] w-[30px] items-center justify-center text-white hover:text-accent disabled:opacity-40";
  return (
    <div className="px-[16px] pb-[16px] pt-[8px]">
      <div className="flex h-[50px] items-center rounded-[25px] bg-bg pl-[20px] pr-[3px]">
        <textarea
          data-testid="messages-composer-input"
          value={text}
          rows={1}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a message here"
          aria-label="Type a message here"
          className="h-[20px] min-w-[0px] flex-1 resize-none bg-transparent text-[14px] leading-[20px] text-white outline-none placeholder:text-soft"
        />
        <button
          type="button"
          aria-label="Send message"
          data-testid="messages-send"
          onClick={send}
          className={`ml-[8px] flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full ${text.trim() ? "bg-accent" : "bg-accent/45"} text-white`}
        >
          <Navigation size={19} className="-ml-[2px] mt-[2px] rotate-45 fill-white" />
        </button>
      </div>
      <div className="relative mt-[12px] flex items-center justify-end gap-[6px]">
        {rec != null && (
          <span className="mr-auto flex items-center gap-[8px] text-[12px] text-soft" data-testid="messages-recording">
            <span className="h-[8px] w-[8px] animate-pulse rounded-full bg-accent" /> Recording 0:{String(rec).padStart(2, "0")} — tap the mic to send
          </span>
        )}
        <div ref={emojiRef} className="relative">
          <button type="button" aria-label="Emoji" data-testid="messages-attach-emoji" className={icon} onClick={() => setEmoji((o) => !o)}>
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="11" fill="white" />
              <circle cx="8.3" cy="9.5" r="1.6" fill="var(--surface)" />
              <circle cx="15.7" cy="9.5" r="1.6" fill="var(--surface)" />
              <path d="M7 14c1.2 2.2 3 3.2 5 3.2s3.8-1 5-3.2" stroke="var(--surface)" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </button>
          {emoji && (
            // inferred: emoji picker not captured
            <div className="absolute bottom-[40px] right-[0px] z-20 grid w-[232px] grid-cols-6 gap-[4px] rounded-popover border border-line bg-surface p-[8px] shadow-lg" data-testid="messages-emoji-picker">
              {EMOJI.map((e) => (
                <button key={e} type="button" className="rounded p-[4px] text-[18px] hover:bg-accent-tint" onClick={() => setText((t) => t + e)}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" aria-label="Send paid media" data-testid="messages-attach-paid" className={icon} onClick={() => onAttach("paid")} disabled={disabled}>
          <Lock size={22} className="fill-white text-white" />
        </button>
        <button type="button" aria-label="Share a store item" data-testid="messages-attach-store" className={icon} onClick={() => onAttach("store")} disabled={disabled}>
          <Layers size={23} className="fill-white text-white" />
        </button>
        <button type="button" aria-label="Send a coupon" data-testid="messages-attach-coupon" className={`${icon} w-[36px]`} onClick={() => onAttach("coupon")} disabled={disabled}>
          <Ticket size={25} className="text-white" strokeWidth={2.2} />
        </button>
        <button type="button" aria-label="Send a photo or video" data-testid="messages-attach-camera" className={icon} onClick={() => fileRef.current?.click()} disabled={disabled}>
          <Camera size={24} className="fill-white text-surface" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          data-testid="messages-attach-file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onSend({ kind: "media", fileName: f.name }); // mock upload: keep the file name only
            e.target.value = "";
          }}
        />
        <button
          type="button"
          aria-label={rec == null ? "Record a voice message" : "Stop and send voice message"}
          aria-pressed={rec != null}
          data-testid="messages-attach-mic"
          disabled={disabled}
          className={`${icon} ${rec != null ? "!text-accent" : ""}`}
          onClick={() => {
            if (rec == null) setRec(0);
            else {
              onSend({ kind: "audio", seconds: Math.max(1, rec) });
              setRec(null);
            }
          }}
        >
          <Mic size={23} className={rec != null ? "fill-accent" : "fill-white"} />
        </button>
      </div>
    </div>
  );
}
