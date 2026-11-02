/**
 * Messages (P13): MESSAGES | SETUP AUTOMATED MESSAGES; conversation list (Priority / General / Message Lists) + chat.
 * All tabs and modals stay on /messages. 1:1 sends need content.write; list broadcasts and paid media are Confirm tier.
 */
import { useEffect, useRef, useState } from "react";
import { Ellipsis, Ribbon, Trophy, UserRound, Zap } from "lucide-react";
import { act, useData, useMockLoading } from "../../../store/store";
import {
  createMessageList,
  deleteMessageList,
  listRecipientCount,
  markConversationRead,
  sendDirectMessage,
  sendToMessageList,
  startConversation,
  type ChatBody,
  type Fan,
} from "../../../store/slices/comms";
import { Avatar } from "../../../platform/ui/surfaces";
import { Button, useOutside } from "../../../platform/ui/controls";
import { useToast } from "../../../platform/ui/toast";
import type { PageProps } from "../../types";
import { ConfirmModal, CountBadge, PillTab, SCROLL, SearchPill, Spinner, money } from "../ui";
import { Composer, Thread, type ComposerAttach } from "./Chat";
import { CouponModal, CreateListModal, NewMessageModal, PaidMessageModal, StoreItemModal } from "./Modals";
import { FanInfoModal } from "./FanInfo";
import { AutomatedTab } from "./Automated";

type Sub = "priority" | "general" | "lists";
type Sel = { kind: "conv"; id: string } | { kind: "list"; id: string } | null;

export function MessagesPage({ route, query }: PageProps) {
  const [top, setTop] = useState<"messages" | "automated">(query.get("tab") === "automated" ? "automated" : "messages");
  return (
    <div data-testid={`page-${route.id}`} className="px-[12px]">
      <div role="tablist" className="flex gap-[16px]">
        <PillTab testid="messages-tab-messages" active={top === "messages"} onClick={() => setTop("messages")}>
          Messages
        </PillTab>
        <PillTab testid="messages-tab-automated" active={top === "automated"} onClick={() => setTop("automated")}>
          Setup Automated Messages
        </PillTab>
      </div>
      {top === "messages" ? <Inbox /> : <AutomatedTab />}
    </div>
  );
}

function Inbox() {
  const loading = useMockLoading(900);
  const toast = useToast();
  const comms = useData((d) => ({ conversations: d.comms.conversations, lists: d.comms.messageLists, fans: d.comms.fans }));
  const [sub, setSub] = useState<Sub>("priority");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Sel>(null);
  const [modal, setModal] = useState<null | "new" | "list" | "fan" | ComposerAttach>(null);
  const [pending, setPending] = useState<{ body: ChatBody; to: "conv" | "list" } | null>(null);
  const [delList, setDelList] = useState<string | null>(null);

  const fanOf = (id: string) => comms.fans.find((f) => f.id === id);
  // spec: on load the first Priority conversation opens automatically (without being marked read — source behaviour)
  useEffect(() => {
    if (!loading && !sel) {
      const first = comms.conversations.find((c) => c.folder === "priority");
      if (first) setSel({ kind: "conv", id: first.id });
    }
  }, [loading]);

  const conv = sel?.kind === "conv" ? comms.conversations.find((c) => c.id === sel.id) : undefined;
  const list = sel?.kind === "list" ? comms.lists.find((l) => l.id === sel.id) : undefined;
  const fan = conv ? fanOf(conv.fanId) : undefined;
  const priorityUnread = comms.conversations.filter((c) => c.folder === "priority" && c.unread).length;

  const openConv = (id: string) => {
    setSel({ kind: "conv", id });
    act("comms.markConversationRead", (d) => markConversationRead(d, id));
  };

  /** Send now (1:1 text/media) or ask for confirmation first (list broadcasts, paid media). */
  const send = (body: ChatBody) => {
    if (!sel) return;
    if (sel.kind === "list" || body.kind === "paid") return setPending({ body, to: sel.kind });
    commit(body, "conv");
  };
  const commit = (body: ChatBody, to: "conv" | "list") => {
    if (!sel) return;
    const res =
      to === "conv"
        ? act("comms.sendDirectMessage", (d) => sendDirectMessage(d, sel.id, body), { need: "content.write" })
        : act("comms.sendToMessageList", (d) => sendToMessageList(d, sel.id, body), { need: "content.write" });
    if (!res.ok) return toast(res.reason);
    if (to === "list") toast(`Message sent to ${list ? listRecipientCount(list) : 0} recipients`);
  };

  const ql = q.toLowerCase();
  const convRows = comms.conversations.filter((c) => (sub === "priority" ? c.folder === "priority" : c.folder === "general") && (fanOf(c.fanId)?.name.toLowerCase().includes(ql) ?? false));
  const listRows = comms.lists.filter((l) => l.name.toLowerCase().includes(ql));

  return (
    <>
      <div className="mt-[29px] flex h-[40px] items-center gap-[24px]">
        <div className="flex w-[323px] shrink-0 items-center justify-between">
          <h2 className="text-[24px] font-bold">Messages</h2>
          {sub === "lists" ? (
            <Button data-testid="messages-new-list" className="!font-normal !normal-case !tracking-normal" onClick={() => setModal("list")}>
              + New Message List
            </Button>
          ) : (
            <Button data-testid="messages-new" className="!font-normal !normal-case !tracking-normal" onClick={() => setModal("new")}>
              + New Message
            </Button>
          )}
        </div>
        {!loading && (conv || list) && (
          <div className="flex min-w-[0px] flex-1 items-center justify-between" data-testid="messages-chat-header">
            {conv && fan ? (
              <>
                <div className="flex items-center gap-[16px]">
                  <Avatar src={null} size={44} ring={2} />
                  <div>
                    <p className="flex items-center gap-[6px] text-[18px] font-bold leading-[22px]">
                      {fan.name}
                      {fan.badges.includes("trophy") && <Trophy size={18} className="fill-accent/30 text-accent" />}
                    </p>
                    <p className="mt-[2px] flex items-center gap-[6px] text-[16px] text-muted">
                      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent">
                        <Zap size={11} className="fill-white text-white" />
                      </span>
                      Offline
                    </p>
                  </div>
                </div>
                <Button data-testid="messages-fan-info" onClick={() => setModal("fan")}>
                  Fan Info
                </Button>
              </>
            ) : list ? (
              // inferred: chat header for a message list was not captured
              <div className="flex items-center gap-[16px]">
                <span className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-black">
                  <UserRound size={20} className="fill-white text-white" />
                </span>
                <div>
                  <p className="text-[18px] font-bold leading-[22px]">{list.name}</p>
                  <p className="mt-[2px] text-[16px] text-muted">{listRecipientCount(list)} Recipients</p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-[25px] flex gap-[24px]" style={{ height: "max(420px, calc(100vh - 275px))" }}>
        {/* conversation list */}
        <section className="flex w-[323px] shrink-0 flex-col overflow-hidden rounded-card bg-surface" aria-label="Conversations">
          <div className="p-[16px] pb-[0px]">
            <SearchPill value={q} onChange={setQ} testid="messages-search" className="!rounded-[20px]" />
          </div>
          <div role="tablist" className="mt-[18px] flex justify-between border-b border-white/20 px-[16px]">
            {(
              [
                ["priority", "Priority"],
                ["general", "General"],
                ["lists", "Message Lists"],
              ] as [Sub, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={sub === id}
                data-testid={`messages-sub-${id}`}
                onClick={() => setSub(id)}
                className={`-mb-px flex h-[45px] items-center gap-[8px] border-b-2 px-[6px] pb-[4px] text-[16px] font-medium ${sub === id ? "border-accent text-accent" : "border-transparent text-white hover:text-accent"}`}
              >
                {label}
                {id === "priority" && !loading && <CountBadge n={priorityUnread} className="!h-[20px] !min-w-[20px] !text-[11px]" />}
              </button>
            ))}
          </div>
          <div className={`${SCROLL} min-h-[0px] flex-1 overflow-y-auto py-[8px]`} data-testid="messages-list">
            {loading ? (
              <div className="flex justify-center pt-[32px]">
                <Spinner />
              </div>
            ) : sub === "lists" ? (
              listRows.map((l) => (
                <ListRow
                  key={l.id}
                  name={l.name}
                  count={listRecipientCount(l)}
                  ago={l.ago}
                  active={sel?.kind === "list" && sel.id === l.id}
                  testid={`messages-listrow-${l.id}`}
                  onOpen={() => setSel({ kind: "list", id: l.id })}
                  onDelete={() => setDelList(l.id)}
                />
              ))
            ) : (
              convRows.map((c) => {
                const f = fanOf(c.fanId)!;
                return <ConvRow key={c.id} fan={f} preview={c.preview} ago={c.ago} unread={c.unread} active={sel?.kind === "conv" && sel.id === c.id} onOpen={() => openConv(c.id)} testid={`messages-conv-${c.id}`} />;
              })
            )}
            {!loading && (sub === "lists" ? listRows : convRows).length === 0 && <p className="px-[16px] py-[32px] text-center text-[14px] text-muted">No conversations found.</p>}
          </div>
        </section>

        {/* chat */}
        <section className="flex min-w-[0px] flex-1 flex-col overflow-hidden rounded-card bg-surface" aria-label="Chat">
          {loading ? (
            <div className="flex justify-center pt-[40px]">
              <Spinner />
            </div>
          ) : conv || list ? (
            <>
              <Thread threadKey={sel!.id} messages={conv ? conv.messages : list!.messages} fanAvatar={null} />
              <Composer onSend={send} onAttach={(k) => setModal(k)} />
            </>
          ) : (
            <p className="m-auto text-[14px] text-muted">Select a conversation to start messaging.</p>
          )}
        </section>
      </div>

      <NewMessageModal
        open={modal === "new"}
        onClose={() => setModal(null)}
        onPick={(fanId) => {
          let id = "";
          act("comms.startConversation", (d) => {
            id = startConversation(d, fanId);
          });
          const c = comms.conversations.find((x) => x.fanId === fanId);
          setSub(c?.folder === "priority" ? "priority" : "general");
          setSel({ kind: "conv", id });
          setModal(null);
        }}
      />
      <CreateListModal
        open={modal === "list"}
        onClose={() => setModal(null)}
        onCreate={(name, ids, segs) => {
          let id = "";
          const res = act("comms.createMessageList", (d) => {
            id = createMessageList(d, name, ids, segs);
          }, { need: "content.write" });
          if (!res.ok) {
            toast(res.reason);
            return false;
          }
          toast(`"${name.trim()}" list created`);
          setSub("lists");
          setSel({ kind: "list", id });
          setModal(null);
          return true;
        }}
      />
      {fan && <FanInfoModal fanId={modal === "fan" ? fan.id : null} onClose={() => setModal(null)} />}
      <PaidMessageModal open={modal === "paid"} onClose={() => setModal(null)} onSubmit={send} />
      <StoreItemModal open={modal === "store"} onClose={() => setModal(null)} onSubmit={send} />
      <CouponModal open={modal === "coupon"} onClose={() => setModal(null)} onSubmit={send} />
      <ConfirmModal
        open={!!pending}
        title={pending?.body.kind === "paid" ? "Send Paid Message" : "Send to Message List"}
        confirmLabel="Send"
        testid="modal-messages-confirm-send"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) commit(pending.body, pending.to);
          setPending(null);
        }}
      >
        {pending?.to === "list" && list ? (
          <>
            This message will be sent to <b className="text-white">{listRecipientCount(list)} recipients</b> in "{list.name}".
          </>
        ) : (
          <>
            {fan?.name} will need to pay <b className="text-white">{pending?.body.kind === "paid" ? money(pending.body.price) : ""}</b> to unlock this message.
          </>
        )}
        {pending?.to === "list" && pending.body.kind === "paid" && <> Each recipient pays {money(pending.body.price)} to unlock it.</>}
      </ConfirmModal>
      <ConfirmModal
        open={!!delList}
        title="Delete Message List"
        confirmLabel="Delete"
        testid="modal-messages-delete-list"
        onCancel={() => setDelList(null)}
        onConfirm={() => {
          const id = delList!;
          const res = act("comms.deleteMessageList", (d) => deleteMessageList(d, id), { need: "content.write" });
          setDelList(null);
          if (!res.ok) return toast(res.reason);
          if (sel?.kind === "list" && sel.id === id) setSel(null);
          toast("Message list deleted");
        }}
      >
        This list will be removed. Fans in it are not notified.
      </ConfirmModal>
    </>
  );
}

function FanBadges({ fan }: { fan: Fan }) {
  return (
    <>
      {fan.badges.includes("subscriber") && <Ribbon size={15} className="text-accent" aria-label="Subscriber" />}
      {fan.badges.includes("trophy") && <Trophy size={15} className="text-accent" aria-label="Top fan" />}
    </>
  );
}

function ConvRow({ fan, preview, ago, unread, active, onOpen, testid }: { fan: Fan; preview: string; ago: string; unread: boolean; active: boolean; onOpen: () => void; testid: string }) {
  return (
    <button
      type="button"
      data-testid={testid}
      aria-current={active || undefined}
      onClick={onOpen}
      className={`flex h-[64px] w-full items-center gap-[9px] px-[12px] text-left hover:bg-white/[.04] ${active ? "bg-white/[.03]" : ""}`}
    >
      <Avatar src={null} size={46} ring={2} />
      <span className="min-w-[0px] flex-1">
        <span className={`flex items-center gap-[4px] text-[14px] font-medium ${unread ? "text-white" : "text-[#9a9a9a]"}`}>
          <span className="truncate">{fan.name}</span>
          <FanBadges fan={fan} />
        </span>
        {preview && <span className={`mt-[4px] line-clamp-2 block text-[12px] leading-[15px] ${unread ? "text-white" : "text-[#9a9a9a]"}`}>{preview}</span>}
      </span>
      <span className={`shrink-0 self-center whitespace-nowrap text-[12px] ${unread ? "text-white" : "text-[#9a9a9a]"}`}>{ago}</span>
    </button>
  );
}

function ListRow({ name, count, ago, active, onOpen, onDelete, testid }: { name: string; count: number; ago: string; active: boolean; onOpen: () => void; onDelete: () => void; testid: string }) {
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setMenu(false), menu);
  return (
    <div className={`relative flex h-[64px] items-center gap-[12px] px-[16px] hover:bg-white/[.04] ${active ? "bg-white/[.03]" : ""}`}>
      <button type="button" data-testid={testid} onClick={onOpen} className="flex min-w-[0px] flex-1 items-center gap-[12px] text-left">
        <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-black">
          <UserRound size={18} className="fill-white text-white" />
        </span>
        <span className="min-w-[0px]">
          <span className="block truncate text-[14px] font-medium">{name}</span>
          <span className="block text-[12px] text-muted">{count} Recipients</span>
        </span>
      </button>
      <div ref={ref} className="flex flex-col items-end">
        <button type="button" aria-label={`Options for ${name}`} data-testid={`${testid}-menu`} onClick={() => setMenu((m) => !m)} className="-mt-[8px] text-accent">
          <Ellipsis size={22} />
        </button>
        <span className="mt-[4px] whitespace-nowrap text-[12px] text-muted">{ago}</span>
        {menu && (
          // inferred: kebab menu contents not captured
          <div className="absolute right-[16px] top-[32px] z-20 w-[150px] rounded-popover border border-accent bg-surface py-[6px] shadow-lg">
            <button type="button" data-testid={`${testid}-open`} onClick={() => (setMenu(false), onOpen())} className="block w-full px-[16px] py-[8px] text-left text-[14px] hover:bg-accent-tint">
              Open
            </button>
            <button type="button" data-testid={`${testid}-delete`} onClick={() => (setMenu(false), onDelete())} className="block w-full px-[16px] py-[8px] text-left text-[14px] hover:bg-accent-tint">
              Delete List
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
