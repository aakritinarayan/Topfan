/**
 * Preferences › Topic Tags (54) and Groups (55). The two tabs are structurally identical: header + info,
 * empty card, and the dynamic-form add view (Title*, optional description, CREATE …).
 * Captured: empty states, info popovers, add forms. inferred: the list once items exist, edit view, delete
 * confirm for Groups, and the Group sub-settings (Chat Room / DM restriction) the Groups popover mentions.
 */
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "../../app/router";
import { pathFor } from "../../app/routeCatalog";
import { FieldError } from "../../platform/ui/controls";
import { useData } from "../../store/store";
import { setTaskInput, taskOfType } from "../../app/agent-context/workflow-state";
import {
  addGroup, addTopicTag, deleteGroup, deleteTopicTag, setGroupRestriction, updateGroup, updateTopicTag, validateTitle,
} from "../../store/slices/prefsB";
import type { PageProps } from "../types";
import { BackTitle, ConfirmModal, InfoPop, PrefPage, StatusSwitch, useWrite, Pill, Field } from "./ui";

type Kind = "tags" | "groups";
interface Item { id: string; name: string; description?: string; active: boolean; createdAt: string }

const CFG = {
  tags: {
    title: "Topic Tags",
    listId: "pref-topic-tags",
    addId: "pref-topic-tags-add",
    editId: "pref-topic-tags-edit",
    addLabel: "Add New Topic Tag",
    empty: "Add your first Topic Tag. You must add at least two tags to activate this feature.",
    emptyGap: "mt-[24px]",
    addTitle: "Add New Topic Tag",
    editTitle: "Edit Topic Tag",
    create: "Create Topic Tag",
    tid: "pref-topic-tags",
    info: "These optional tags allow you to organize your Post content by a topic, so your fans can filter your Post Feed by a respective topic you define. This feature is typically used by creators with multiple lines of business or subject matters that are diverse and require additional levels of organization. Note: For Topic Tags to be enabled, you must have at least two active Topic Tags.",
    deleteTitle: "Delete Topic Tag",
    deleteBody: (t: string) => `Are you sure you want to delete ${t} topic tag?`,
  },
  groups: {
    title: "Groups",
    listId: "pref-groups",
    addId: "pref-groups-add",
    editId: "pref-groups-edit",
    addLabel: "Add New Group",
    empty: "Create your first group to get started.",
    emptyGap: "mt-4",
    addTitle: "Add New Group",
    editTitle: "Edit Group", // inferred
    create: "Create Group",
    tid: "pref-groups",
    // Source typos kept ("allow you create", "resorted").
    info: "This feature allow you create micro-communities inside your platform, by assigning your fans to Groups. You add specific Fans to Groups inside Insights & Fans > Fan Relationship Management. Once a Fan is inside a Group, certain Content can be restricted to just members of a Group when you post in your Feed. You can also restrict various monetization options including Experiences, Courses, Merchandise, VIP Offers, Portfolios, to Groups as well. Finally, Chat Room and Direct Messaging can be resorted to Groups using the sub-settings below.",
    deleteTitle: "Delete Group", // inferred
    deleteBody: (t: string) => `Are you sure you want to delete ${t} group?`, // inferred
  },
} as const;

function useItems(kind: Kind): Item[] {
  return useData((d) => (kind === "tags" ? d.prefsB.topicTags : d.prefsB.groups));
}

/* ------------------------------------------------------------------ list */

function ListView({ kind, route }: { kind: Kind; route: PageProps["route"] }) {
  const c = CFG[kind];
  const { navigate } = useRouter();
  const items = useItems(kind);
  const restrictions = useData((d) => d.prefsB.groupRestrictions);
  const write = useWrite();
  const [toDelete, setToDelete] = useState<Item | null>(null);
  const activeCount = items.filter((i) => i.active).length;

  const toggle = (it: Item) =>
    kind === "tags"
      ? write("prefsB.updateTopicTag", (d) => updateTopicTag(d, it.id, { active: !it.active }), "content.write")
      : write("prefsB.updateGroup", (d) => updateGroup(d, it.id, { active: !it.active }), "content.write");

  return (
    <PrefPage id={route.id}>
      <div className="flex h-[40px] items-center justify-between">
        <h4 className="flex items-center gap-[8px] text-[24px] font-bold">
          {c.title}
          <InfoPop testid={`${c.tid}-info`}>{c.info}</InfoPop>
        </h4>
        <Pill data-testid={`${c.tid}-add`} onClick={() => navigate(pathFor(c.addId))}>
          {c.addLabel}
        </Pill>
      </div>

      {items.length === 0 ? (
        <div data-testid={`${c.tid}-empty`} className={`${c.emptyGap} flex h-[160px] items-center justify-center rounded-card bg-surface px-[24px]`}>
          <p className="max-w-[600px] text-center text-[16px]">{c.empty}</p>
        </div>
      ) : (
        <>
          {/* inferred: list layout follows the delegates table (53). */}
          {kind === "tags" && activeCount < 2 && (
            <p data-testid="pref-topic-tags-requirement" className="mt-[16px] text-[16px] text-soft">
              You must add at least two tags to activate this feature.
            </p>
          )}
          <div className={`${c.emptyGap} rounded-card bg-surface p-[30px]`} data-testid={`${c.tid}-table`}>
            <div className="grid grid-cols-[1.3fr_2fr_1fr_1fr_90px] gap-[16px] border-b border-surface-2 pb-[20px] text-[13px] font-medium uppercase">
              <span>Title</span>
              <span>Description</span>
              <span>{kind === "tags" ? "Topic Tag Engagement" : "Members"}</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>
            {items.map((it) => (
              <div key={it.id} data-testid={`${c.tid}-row-${it.id}`} className="grid min-h-[64px] grid-cols-[1.3fr_2fr_1fr_1fr_90px] items-center gap-[16px] border-b border-surface-2 py-[12px] text-[14px]">
                <span className="font-bold text-accent">{it.name}</span>
                <span className="text-soft">{it.description || "—"}</span>
                <span>0</span>
                <span>
                  <StatusSwitch on={it.active} onChange={() => toggle(it)} testid={`${c.tid}-toggle-${it.id}`} />
                </span>
                <span className="flex justify-end gap-[12px]">
                  <button aria-label={`Edit ${it.name}`} data-testid={`${c.tid}-edit-${it.id}`} onClick={() => navigate(`${pathFor(c.editId)}?id=${it.id}`)} className="hover:text-accent">
                    <Pencil size={18} />
                  </button>
                  <button aria-label={`Delete ${it.name}`} data-testid={`${c.tid}-delete-${it.id}`} onClick={() => setToDelete(it)} className="hover:text-accent">
                    <Trash2 size={18} />
                  </button>
                </span>
              </div>
            ))}
          </div>

          {kind === "groups" && (
            // inferred: the "sub-settings below" named in the Groups popover (only rendered once groups exist).
            <div className="mt-[20px] rounded-card bg-surface p-[30px]" data-testid="pref-groups-subsettings">
              <h5 className="text-[16px] font-medium uppercase">Group Restrictions</h5>
              <div className="mt-[16px] flex flex-col gap-[12px]">
                {([
                  ["chatRoom", "Restrict Chat Room to Groups"],
                  ["directMessages", "Restrict Direct Messaging to Groups"],
                ] as const).map(([k, label]) => (
                  <div key={k} className="flex h-[64px] items-center justify-between rounded-[22px] bg-bg px-[16px] text-[14px]">
                    <span>{label}</span>
                    <StatusSwitch
                      on={restrictions[k]}
                      testid={`pref-groups-restrict-${k}`}
                      onChange={() => write("prefsB.setGroupRestriction", (d) => setGroupRestriction(d, k, !restrictions[k]), "content.write")}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={!!toDelete}
        title={c.deleteTitle}
        confirmLabel="Delete"
        testid={`modal-${c.tid}-delete`}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          const it = toDelete!;
          const res =
            kind === "tags"
              ? write("prefsB.deleteTopicTag", (d) => deleteTopicTag(d, it.id), "content.write")
              : write("prefsB.deleteGroup", (d) => deleteGroup(d, it.id), "content.write");
          if (res.ok) setToDelete(null);
        }}
      >
        {toDelete && c.deleteBody(toDelete.name)}
      </ConfirmModal>
    </PrefPage>
  );
}

/* ------------------------------------------------------------------ add / edit form */

function FormView({ kind, route, query }: { kind: Kind; route: PageProps["route"]; query: URLSearchParams }) {
  const c = CFG[kind];
  const { navigate } = useRouter();
  const items = useItems(kind);
  const editing = route.id === c.editId ? items.find((i) => i.id === query.get("id")) : undefined;
  // A new group started as the assistant's "Create a VIP group" task keeps what was typed, so
  // resuming the task later restores it.
  const task = kind === "groups" && !editing ? "vip-group" : null;
  const saved = task ? taskOfType(task)?.input : undefined;
  const [title, setTitleState] = useState(editing?.name ?? saved?.title ?? "");
  const [desc, setDescState] = useState(editing?.description ?? saved?.description ?? "");
  const setTitle = (v: string) => (setTitleState(v), task && setTaskInput(task, { title: v }));
  const setDesc = (v: string) => (setDescState(v), task && setTaskInput(task, { description: v }));
  const [touched, setTouched] = useState(false);
  const write = useWrite();
  const err = validateTitle(title);
  const back = () => navigate(pathFor(c.listId));

  if (route.id === c.editId && !editing) {
    return (
      <PrefPage id={route.id}>
        <BackTitle title={c.editTitle} onBack={back} testid={`${c.tid}-back`} />
        <p className="mt-[24px] text-[16px] text-soft">This item no longer exists.</p>
      </PrefPage>
    );
  }

  const submit = () => {
    setTouched(true);
    if (err) return;
    const input = { name: title, description: desc };
    const res = editing
      ? kind === "tags"
        ? write("prefsB.updateTopicTag", (d) => updateTopicTag(d, editing.id, input), "content.write")
        : write("prefsB.updateGroup", (d) => updateGroup(d, editing.id, input), "content.write")
      : kind === "tags"
        ? write("prefsB.addTopicTag", (d) => void addTopicTag(d, input), "content.write")
        : write("prefsB.addGroup", (d) => void addGroup(d, input), "content.write");
    if (res.ok && task) setTaskInput(task, { title: "", description: "" });
    if (res.ok) back();
  };

  return (
    <PrefPage id={route.id}>
      <BackTitle title={editing ? c.editTitle : c.addTitle} onBack={back} testid={`${c.tid}-back`} />
      <form
        className="mt-[30px] rounded-card bg-surface p-[24px]"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor={`${c.tid}-title`} className="mb-[16px] block text-[16px]">Title*</label>
        <Field
          id={`${c.tid}-title`}
          data-testid={`${c.tid}-title`}
          placeholder="Enter Title"
          value={title}
          invalid={touched && !!err}
          onBlur={() => setTouched(true)}
          onChange={(e) => setTitle(e.target.value)}
        />
        <FieldError>{touched ? err : null}</FieldError>
        <label htmlFor={`${c.tid}-desc`} className="mb-[16px] mt-[22px] block text-[16px]">Optional Description (Not publicly visible)</label>
        <textarea
          id={`${c.tid}-desc`}
          data-testid={`${c.tid}-desc`}
          placeholder="Write Description"
          maxLength={500}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="h-[110px] w-full resize-none rounded-panel bg-bg px-[24px] py-[17px] text-[14px] font-black text-white outline-none placeholder:font-bold placeholder:text-muted focus:ring-1 focus:ring-accent"
        />
        <p className="mt-[10px] pr-[6px] text-right text-[12px] italic">{500 - desc.length} Characters left</p>
        <Pill type="submit" className="mt-[30px]" disabled={!!err} data-testid={`${c.tid}-submit`}>
          {editing ? "Save Changes" : c.create}
        </Pill>
      </form>
    </PrefPage>
  );
}

export const TopicTagsPage = ({ route }: PageProps) => <ListView kind="tags" route={route} />;
export const GroupsPage = ({ route }: PageProps) => <ListView kind="groups" route={route} />;
export const TopicTagFormPage = ({ route, query }: PageProps) => <FormView kind="tags" route={route} query={query} />;
export const GroupFormPage = ({ route, query }: PageProps) => <FormView kind="groups" route={route} query={query} />;
