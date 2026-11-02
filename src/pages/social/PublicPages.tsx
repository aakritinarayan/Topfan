/**
 * Inferred public pages (not captured; built from the Feed / Messages / Insights patterns):
 * single post page, Chat Room, Leaderboards. Every screen here is `status: "inferred"`.
 */
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send, Trophy } from "lucide-react";
import type { PageProps } from "../types";
import { useAct, useData } from "../../store/store";
import { can } from "../../store/permissions";
import { addComment, editPostText, sendChatMessage } from "../../store/slices/social";
import { openOverlay } from "../../app/ui";
import { useRouter } from "../../app/router";
import { Avatar } from "../../platform/ui/surfaces";
import { Button, TextButton } from "../../platform/ui/controls";
import { useToast } from "../../platform/ui/toast";
import { PostCard, useGo } from "./shared";

function BackToFeed() {
  const handle = useData((d) => d.account.handle);
  const go = useGo();
  return (
    <button data-testid="social-back-feed" onClick={() => go("feed", { handle })} className="mb-[20px] inline-flex items-center gap-[4px] text-[14px] font-bold hover:text-accent">
      <ChevronLeft size={18} />
      Back to Feed
    </button>
  );
}

const fmt = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/* ---------------- single post (inferred) ---------------- */

export function PostDetailPage({ route, params, query }: PageProps) {
  const post = useData((d) => d.social.posts.find((p) => p.id === params.postId) ?? null);
  const comments = useData((d) => d.social.postComments.filter((c) => c.postId === params.postId));
  const view = useData((d) => d.account.session.fanView);
  const name = useData((d) => d.account.name);
  const canManage = useData((d) => d.account.session.fanView === "creator" && can(d, "content.write"));
  const act = useAct();
  const toast = useToast();
  const { navigate, path } = useRouter();
  const [text, setText] = useState("");
  const editing = query.get("edit") === "1" && canManage;
  const [caption, setCaption] = useState(post?.text ?? "");
  useEffect(() => setCaption(post?.text ?? ""), [post?.id, editing]);

  if (!post) {
    return (
      <div data-testid={`page-${route.id}`}>
        <BackToFeed />
        <p className="text-[16px] text-muted">This post is no longer available.</p>
      </div>
    );
  }
  return (
    <div data-testid={`page-${route.id}`} className="w-[548px]">
      <BackToFeed />
      {editing && (
        <div className="mb-[16px] rounded-[32px] bg-surface p-[24px]" data-testid="post-edit">
          <p className="text-[16px] font-bold">Edit Post</p>
          <textarea aria-label="Caption" data-testid="post-edit-caption" value={caption} onChange={(e) => setCaption(e.target.value)} className="mt-[12px] h-[112px] w-full resize-none rounded-popover bg-bg p-[12px] text-[15px] outline-none" />
          <div className="mt-[12px] flex justify-end gap-[8px]">
            <TextButton data-testid="post-edit-cancel" onClick={() => navigate(path)}>
              Cancel
            </TextButton>
            <Button
              data-testid="post-edit-save"
              disabled={!caption.trim()}
              onClick={() => {
                const r = act("social.editPost", (d) => editPostText(d, post.id, caption.trim()), { need: "content.write" });
                toast(r.ok ? "Post updated" : r.reason);
                if (r.ok) navigate(path);
              }}
            >
              Save
            </Button>
          </div>
        </div>
      )}
      <PostCard post={post} canManage={canManage} />
      <section className="mt-[16px] rounded-[32px] bg-surface p-[24px]" data-testid="post-comments">
        <h5 className="text-[18px] font-bold">Comments</h5>
        <ul className="mt-[16px] space-y-[12px]">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-[12px]">
              <Avatar size={36} ring={2} />
              <div className="flex-1 rounded-inner bg-bg px-[16px] py-[12px]">
                <p className="text-[14px] font-bold">
                  {c.author} <span className="ml-[8px] text-[12px] font-normal text-muted">{fmt(c.at)}</span>
                </p>
                <p className="mt-[4px] text-[14px]">{c.text}</p>
              </div>
            </li>
          ))}
          {!comments.length && <li className="text-[14px] text-muted">{post.comments > 0 ? "Earlier comments are not loaded in this demo." : "No comments yet."}</li>}
        </ul>
        {view === "logged-out" ? (
          <p className="mt-[20px] text-[14px]">
            <button data-testid="post-comment-sign-in" onClick={() => openOverlay("sign-in")} className="font-bold text-accent">
              Sign In
            </button>{" "}
            to comment.
          </p>
        ) : (
          <form
            className="mt-[20px] flex items-center gap-[8px]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              act("social.addComment", (d) => addComment(d, post.id, view === "creator" ? name : "You", text.trim()));
              setText("");
            }}
          >
            <input aria-label="Write a comment" data-testid="post-comment-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment..." className="h-[44px] flex-1 rounded-pill bg-bg px-[20px] text-[14px] outline-none placeholder:text-muted" />
            <button aria-label="Send comment" data-testid="post-comment-send" disabled={!text.trim()} className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-accent disabled:opacity-50">
              <Send size={18} />
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

/* ---------------- chat room (inferred) ---------------- */

export function ChatRoomPage({ route }: PageProps) {
  const msgs = useData((d) => d.social.chatRoom);
  const view = useData((d) => d.account.session.fanView);
  const name = useData((d) => d.account.name);
  const act = useAct();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: "nearest" }), [msgs.length]);
  return (
    <div data-testid={`page-${route.id}`} className="max-w-[785px]">
      <BackToFeed />
      <h4 className="text-[24px] font-bold">Chat Room</h4>
      <div className="mt-[24px] flex h-[560px] flex-col rounded-card bg-surface">
        <div className="flex-1 space-y-[16px] overflow-y-auto px-[30px] py-[24px]" data-testid="chat-room-messages">
          {msgs.map((m) => (
            <div key={m.id} className={`flex gap-[12px] ${m.mine ? "flex-row-reverse" : ""}`}>
              <Avatar size={36} ring={2} />
              <div className={`max-w-[70%] rounded-inner px-[16px] py-[12px] ${m.mine ? "bg-accent" : "bg-bg"}`}>
                <p className="text-[12px] font-bold">
                  {m.author} <span className="ml-[4px] font-normal opacity-70">{fmt(m.at)}</span>
                </p>
                <p className="mt-[4px] text-[14px]">{m.text}</p>
              </div>
            </div>
          ))}
          <div ref={end} />
        </div>
        <div className="border-t border-white/[.08] px-[30px] py-[16px]">
          {view === "logged-out" ? (
            <p className="text-[14px]">
              <button data-testid="chat-room-sign-in" onClick={() => openOverlay("sign-in")} className="font-bold text-accent">
                Sign In
              </button>{" "}
              to join the conversation.
            </p>
          ) : (
            <form
              className="flex items-center gap-[8px]"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                const r = act("social.chatSend", (d) => sendChatMessage(d, view === "creator" ? name : "You", text.trim()), view === "creator" ? { need: "content.write" } : {});
                if (!r.ok) return setErr(r.reason);
                setErr(null);
                setText("");
              }}
            >
              <input aria-label="Message" data-testid="chat-room-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." className="h-[44px] flex-1 rounded-pill bg-bg px-[20px] text-[14px] outline-none placeholder:text-muted" />
              <button aria-label="Send message" data-testid="chat-room-send" disabled={!text.trim()} className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-accent disabled:opacity-50">
                <Send size={18} />
              </button>
            </form>
          )}
          {err && <p className="mt-[8px] text-[13px] text-danger">{err}</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- leaderboards (inferred) ---------------- */

export function LeaderboardsPage({ route }: PageProps) {
  const rows = useData((d) => [...d.social.leaderboard].sort((a, b) => b.points - a.points));
  return (
    <div data-testid={`page-${route.id}`} className="max-w-[785px]">
      <BackToFeed />
      <h4 className="text-[24px] font-bold">Leaderboards</h4>
      <div className="mt-[24px] rounded-card bg-surface p-[30px]">
        <div className="grid grid-cols-[60px_1fr_120px] border-b border-bg pb-[12px] text-[14px] font-bold uppercase text-muted">
          <span>Rank</span>
          <span>Fan</span>
          <span className="text-right">Points</span>
        </div>
        <ul>
          {rows.map((r, i) => (
            <li key={r.id} data-testid={`leaderboard-row-${r.id}`} className="grid grid-cols-[60px_1fr_120px] items-center border-b border-bg py-[16px] last:border-0">
              <span className="flex items-center gap-[4px] text-[16px] font-bold">
                {i + 1}
                {i < 3 && <Trophy size={16} className="text-accent" />}
              </span>
              <span className="flex items-center gap-[12px]">
                <Avatar size={40} ring={2} />
                <span>
                  <span className="block text-[16px] font-bold">{r.name}</span>
                  <span className="block text-[14px] text-muted">@{r.username}</span>
                </span>
              </span>
              <span className="text-right text-[16px] font-bold">{r.points.toLocaleString("en-US")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
