/**
 * Add / Edit Newsletter, rebuilt from the reference screen pack (newsletter-05 … newsletter-14), plus the
 * Newsletter Recipients dialog (newsletter-03) and the legacy recipients page.
 *
 * Order: Monetize pills · back + title + DISABLE/ENABLE · title card · editor card (toolbar, body,
 * "Draft Auto-Saved" on Edit, SEE PREVIEW) · interests + preview image · pricing options · chevron + PUBLISH NOW.
 *
 * Decisions (reference section 8):
 * - PUBLISH NOW opens a confirmation with who it is sent to (Send To was not in the reference; sending needs it).
 *   The chevron opens Schedule and Save as Draft. Send/Schedule are refused by the store unless
 *   outbound email is verified; the refusal is shown, never a fake success.
 * - Draft autosave runs only on Edit for Draft newsletters, through the same content.write write path.
 * - Loyalty Points: the reference showed no field. This build adds a Points input (like the post Lock
 *   dialog) stored on the newsletter as `points`.
 * - DISABLE / ENABLE: disabled newsletters are hidden from the public Newsletters page.
 * - Editor tools that need flows not built here (AI image, feature an item) are left out, not faked.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ALargeSmall, ArrowLeft, Bold, ChevronDown, Code, Image as ImageIcon, Info, Italic, Link2, List, ListOrdered, Minus, Music, Redo2, Search, Smile, Trash2, Underline, Undo2, UserRound, Video,
} from "lucide-react";
import { Link, useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { act, getData, useData, type AppData } from "../../../store/store";
import { itemById, linkSaved, syncFromScreen } from "../../../store/slices/content";
import { INTERESTS } from "../../../store/slices/prefsA";
import {
  audienceSize, money, saveNewsletterDraft, scheduleNewsletter, sendNewsletter, type Newsletter, type NewsletterInput, type Recipient,
} from "../../../store/slices/monetize";
import { InfoIcon, useOutside } from "../../../platform/ui/controls";
import { Modal } from "../../../platform/ui/surfaces";
import { useToast } from "../../../platform/ui/toast";
import type { PageProps } from "../../types";
import {
  ChipChoice, ConfirmModal, MoneyInput, MonetizeFrame, Pill, RefFormHeader, RoundCheck, TableCard, TextInput, UploadTile, td, th, useRun,
} from "../ui";
import { Missing } from "./PlanForm";

const AUDIENCES: { id: Newsletter["audience"]; label: string }[] = [
  { id: "all", label: "All Recipients" },
  { id: "plans", label: "Subscription Plans" },
  { id: "groups", label: "Groups" },
];
/** Formatting for editor/preview HTML (lists, code, links, media). */
export const NL_BODY = "[&_a]:text-accent [&_a]:underline [&_hr]:my-[12px] [&_hr]:border-line [&_img]:max-w-full [&_img]:rounded-[8px] [&_ol]:list-decimal [&_ol]:pl-[24px] [&_pre]:rounded [&_pre]:bg-bg [&_pre]:p-[8px] [&_ul]:list-disc [&_ul]:pl-[24px]";
const IMAGE_TIP = "Width of image should be greater than 450 pixels and height of image should be greater than 200 pixels.";

/* ------------------------------------------------------------ html helpers */

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const textToHtml = (t: string) => (t ? esc(t).split("\n").join("<br>") : "");
const ALLOWED = new Set(["B", "STRONG", "I", "EM", "U", "BR", "P", "DIV", "SPAN", "FONT", "OL", "UL", "LI", "A", "PRE", "CODE", "HR", "IMG", "VIDEO", "AUDIO", "H1", "H2", "H3", "BLOCKQUOTE"]);
/** Keep only simple formatting from editor HTML (no scripts, handlers or javascript: links). */
export function safeHtml(html: string) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const walk = (el: Element) => {
    for (const c of [...el.children]) {
      if (!ALLOWED.has(c.tagName)) {
        c.replaceWith(...(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED"].includes(c.tagName) ? [] : [...c.childNodes]));
        continue;
      }
      for (const a of [...c.attributes]) {
        const v = a.value.trim().toLowerCase();
        if (a.name.startsWith("on") || ((a.name === "href" || a.name === "src") && !/^(https?:|blob:|mailto:|data:image\/)/.test(v)) || !["href", "src", "controls", "size", "target", "rel"].includes(a.name)) c.removeAttribute(a.name);
      }
      walk(c);
    }
  };
  const root = doc.body.firstElementChild!;
  walk(root);
  return root.innerHTML;
}

/* ------------------------------------------------------------ page */

export function NewsletterFormPage({ route, params, query }: PageProps) {
  const n = useData((d) => d.monetize.newsletters.find((x) => x.id === params.newsletterId));
  if (route.id === "monetize-newsletter-edit" && !n) return <Missing routeId={route.id} what="Newsletter" back="monetize-newsletters" />;
  // inferred (assistant hand-off): ?work=<id> opens the newsletter the assistant prepared.
  const workId = query.get("work") ?? undefined;
  return <NewsletterForm routeId={route.id} n={n ?? null} workId={workId} key={`${n?.id ?? "new"}-${workId ?? ""}`} />;
}

const fmtSaved = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", "").replace(/, (\d)/, " $1") : "";

function NewsletterForm({ routeId, n, workId }: { routeId: string; n: Newsletter | null; workId?: string }) {
  const plans = useData((d) => d.monetize.plans.filter((p) => p.active));
  const groups = useData((d) => d.prefsB.groups.filter((g) => g.active));
  const verified = useData((d) => d.prefsB.outboundEmail.status === "verified");
  const savedAt = useData((d) => (n ? d.monetize.newsletters.find((x) => x.id === n.id)?.updatedAt : undefined));
  const data = useData((d) => d);
  const { navigate } = useRouter();
  const run = useRun();
  const work = workId ? itemById(getData(), workId) : null;
  const wn = !n ? work?.newsletter : undefined;
  const lock0 = n?.lock ?? wn?.lock ?? "Free";
  const allPlanIds = plans.map((p) => p.id);

  const [title, setTitle] = useState(n?.title ?? wn?.title ?? "");
  const [html, setHtml] = useState(n?.bodyHtml ?? textToHtml(n?.body ?? wn?.body ?? ""));
  const [plain, setPlain] = useState(n?.body ?? wn?.body ?? "");
  const [interests, setInterests] = useState<string[]>(n?.interests ?? []);
  const [image, setImage] = useState<string | null>(n?.image ?? (wn ? work?.media?.key ?? null : null));
  const [imageName, setImageName] = useState(wn && work?.media ? work.media.label : "");
  const [imageErr, setImageErr] = useState("");
  const [enabled, setEnabled] = useState(n?.enabled ?? true);
  // pricing options
  const [freeSubsOn, setFreeSubsOn] = useState(lock0 === "Subscribers" || !!n?.freePlanIds?.length);
  const [freePlanIds, setFreePlanIds] = useState<string[]>(n?.freePlanIds ?? (lock0 === "Subscribers" ? (wn?.audience === "plans" && wn.planIds.length ? wn.planIds : allPlanIds) : []));
  const [freeNftOn, setFreeNftOn] = useState(!!n?.freeNftContracts?.length);
  const [freeNfts, setFreeNfts] = useState<string[]>(n?.freeNftContracts?.length ? n.freeNftContracts : [""]);
  const [priceOn, setPriceOn] = useState(lock0 === "Paid" && n?.price != null);
  const [priceText, setPriceText] = useState(n?.price ? String(n.price) : "");
  const [pointsOn, setPointsOn] = useState(n?.points != null);
  const [pointsText, setPointsText] = useState(n?.points ? String(n.points) : "");
  const [buySubsOn, setBuySubsOn] = useState(!!n?.buyRestrict?.planIds.length);
  const [buyPlanIds, setBuyPlanIds] = useState<string[]>(n?.buyRestrict?.planIds ?? []);
  const [buyNftOn, setBuyNftOn] = useState(!!n?.buyRestrict?.nftContracts.length);
  const [buyNfts, setBuyNfts] = useState<string[]>(n?.buyRestrict?.nftContracts?.length ? n.buyRestrict.nftContracts : [""]);
  // delivery
  const [audience, setAudience] = useState<Newsletter["audience"]>(n?.audience ?? wn?.audience ?? "all");
  const [planIds, setPlanIds] = useState<string[]>(n?.planIds ?? wn?.planIds ?? []);
  const [groupIds, setGroupIds] = useState<string[]>(n?.groupIds ?? []);
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState<"send" | "schedule" | null>(null);
  const [confirmTried, setConfirmTried] = useState(false);
  const [when, setWhen] = useState("");
  const [menu, setMenu] = useState(false);
  const [preview, setPreview] = useState(false);
  const [autoErr, setAutoErr] = useState("");
  const dirty = useRef<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useOutside(menuRef, () => setMenu(false), menu);

  const back = pathFor("monetize-newsletters");
  const sent = n?.status === "Sent";
  const price = priceOn ? Number(priceText) : NaN;
  const points = pointsOn ? Number(pointsText) : NaN;
  const nfts = (l: string[]) => l.map((x) => x.trim()).filter(Boolean);
  const lock: Newsletter["lock"] = (priceOn && price > 0) || (pointsOn && points > 0) ? "Paid" : freeSubsOn || freeNftOn ? "Subscribers" : "Free";

  const input: NewsletterInput = {
    title: title.trim(),
    body: plain.trim(),
    bodyHtml: html,
    lock,
    price: priceOn && price > 0 ? price : undefined,
    points: pointsOn && points > 0 ? Math.round(points) : undefined,
    audience,
    planIds,
    groupIds,
    image,
    interests,
    freePlanIds: freeSubsOn ? freePlanIds : [],
    freeNftContracts: freeNftOn ? nfts(freeNfts) : [],
    buyRestrict: priceOn && price > 0 && (buySubsOn || buyNftOn) ? { planIds: buySubsOn ? buyPlanIds : [], nftContracts: buyNftOn ? nfts(buyNfts) : [] } : undefined,
    enabled,
  };
  const size = audienceSize(data, input);
  const badNft = (l: string[]) => (!nfts(l).length ? "Add at least one NFT contract address" : nfts(l).some((x) => !/^0x[0-9a-fA-F]{10,64}$/.test(x)) ? "Contract addresses start with 0x (letters a–f and numbers only)" : "");
  const errors = {
    title: title.trim() ? "" : "Newsletter Title is required",
    body: plain.trim() ? "" : "Write the newsletter before publishing",
    image: image ? "" : "Newsletter Preview Image is required",
    freeSubs: freeSubsOn && !freePlanIds.length ? (plans.length ? "Choose at least one subscription" : "You have no subscriptions. Unselect this option or create a plan first.") : "",
    freeNft: freeNftOn ? badNft(freeNfts) : "",
    price: priceOn && !(price > 0) ? "Enter a price" : "",
    points: pointsOn && !(points > 0 && Number.isInteger(points)) ? "Enter a whole number of points" : "",
    buySubs: priceOn && buySubsOn && !buyPlanIds.length ? (plans.length ? "Choose at least one subscription" : "You have no subscriptions yet") : "",
    buyNft: priceOn && buyNftOn ? badNft(buyNfts) : "",
  };
  const valid = !Object.values(errors).some(Boolean);
  const audienceErr = audience === "plans" && !planIds.length ? "Select at least one plan" : audience === "groups" && !groupIds.length ? "Select at least one group" : "";

  // Keep the assistant's copy in step with what the creator types here.
  useEffect(() => {
    if (!wn || !workId) return;
    const t = setTimeout(() => {
      const cur = itemById(getData(), workId)?.newsletter;
      if (cur && (cur.title !== title || cur.body !== plain)) act("content.syncNewsletter", (d) => syncFromScreen(d, workId, { title, body: plain }), { need: "content.write" });
    }, 600);
    return () => clearTimeout(t);
  }, [title, plain]);

  // Draft autosave (Edit, Draft only). Same write path as Save as Draft; a refusal is shown, not hidden.
  const inputKey = JSON.stringify(input);
  useEffect(() => {
    if (!n || n.status !== "Draft") return;
    // Only after the creator changed something (safe under StrictMode's double effects).
    if (dirty.current === null) dirty.current = inputKey;
    if (dirty.current === inputKey) return;
    dirty.current = "changed";
    const t = setTimeout(() => {
      const res = act("monetize.autosaveNewsletterDraft", (d) => void saveNewsletterDraft(d, input, n.id), { need: "content.write" });
      setAutoErr(res.ok ? "" : res.reason);
    }, 1200);
    return () => clearTimeout(t);
  }, [inputKey]);

  /** The assistant's work item (if any) records the saved or sent newsletter. */
  const link = (d: AppData, newsletterId: string, status: "saved" | "sent") => workId && wn && linkSaved(d, workId, { newsletterId }, status);
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const saveDraft = () => {
    setMenu(false);
    if (run("monetize.saveNewsletterDraft", (d) => void link(d, saveNewsletterDraft(d, input, n?.id ?? work?.ref?.newsletterId), "saved"), "content.write", sent ? "Newsletter updated" : "Saved as draft")) navigate(back);
  };
  const ask = (k: "send" | "schedule") => {
    setMenu(false);
    setTried(true);
    if (!valid) return;
    setConfirmTried(false);
    setConfirm(k);
  };
  const doIt = () => {
    setConfirmTried(true);
    if (audienceErr || (confirm === "schedule" && !when)) return;
    const ok =
      confirm === "send"
        ? run("monetize.sendNewsletter", (d) => void link(d, sendNewsletter(d, input, n?.id ?? work?.ref?.newsletterId), "sent"), "content.write", `Newsletter sent to ${size} recipient${size === 1 ? "" : "s"}`)
        : run("monetize.scheduleNewsletter", (d) => void link(d, scheduleNewsletter(d, input, new Date(when).toISOString(), n?.id ?? work?.ref?.newsletterId), "saved"), "content.write", "Newsletter scheduled");
    if (ok) navigate(back);
    else setConfirm(null);
  };

  const pickImage = (name: string, file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 450 && img.naturalHeight > 200) {
        setImage(url);
        setImageName(name);
        setImageErr("");
      } else setImageErr(`That image is ${img.naturalWidth}×${img.naturalHeight}. ${IMAGE_TIP}`);
    };
    img.onerror = () => setImageErr("That file couldn't be read as an image.");
    img.src = url;
  };

  const plansPicker = (value: string[], set: (v: string[]) => void, testid: string, empty: string) =>
    plans.length ? (
      <ChipChoice multi options={plans.map((p) => p.name)} value={plans.filter((p) => value.includes(p.id)).map((p) => p.name)} onToggle={(v) => set(toggle(value, plans.find((p) => p.name === v)!.id))} testid={testid} />
    ) : (
      <p className="py-[16px] text-center text-[16px] font-bold" data-testid={`${testid}-empty`}>
        {empty}
      </p>
    );

  return (
    <MonetizeFrame routeId={routeId} active="monetize-newsletters">
      <RefFormHeader title={n ? "Edit Newsletter" : "Add Newsletter"} backTo={back} enabled={enabled} onEnabled={setEnabled} what="newsletter" testid="monetize-newsletter-enable" />
      {!enabled && <p className="mt-[10px] text-right text-[13px] text-muted">Disabled: hidden from your public Newsletters page.</p>}
      {sent && <p className="mt-[16px] rounded-inner bg-surface px-[20px] py-[14px] text-[14px] text-soft">This newsletter was already sent to {n?.sent} recipients. Changes only affect how it appears on your profile.</p>}

      <div className="mt-[20px] rounded-card bg-surface px-[24px] py-[6px]">
        <input
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add Newsletter Title here..."
          aria-label="Newsletter Title"
          data-testid="monetize-newsletter-title"
          className="h-[55px] w-full bg-transparent text-[16px] font-bold text-white outline-none placeholder:text-[14px] placeholder:font-bold placeholder:text-muted"
        />
      </div>
      {tried && errors.title && <p className="mt-[6px] pl-[24px] text-[13px] font-medium text-danger">{errors.title}</p>}

      <div className="mt-[20px]">
        <NewsletterEditor
          html={html}
          onChange={(h, t) => {
            setHtml(h);
            setPlain(t);
          }}
          footer={
            <>
              {n && n.status === "Draft" && (
                <p className="px-[30px] pb-[14px] text-right text-[14px] text-soft" data-testid="monetize-newsletter-autosaved">
                  {autoErr ? <span className="text-danger">Auto-save failed: {autoErr}</span> : `Draft Auto-Saved: ${fmtSaved(savedAt ?? `${n.createdAt}T12:00:00Z`)}`}
                </p>
              )}
              <div className="flex justify-end border-t border-line px-[30px] py-[18px]">
                <Pill data-testid="monetize-newsletter-see-preview" onClick={() => setPreview(true)}>
                  See Preview
                </Pill>
              </div>
            </>
          }
        />
        {tried && errors.body && <p className="mt-[6px] pl-[24px] text-[13px] font-medium text-danger">{errors.body}</p>}
      </div>

      <div className="mt-[20px] rounded-card bg-surface p-[26px]">
        <div className="rounded-card bg-bg/60 p-[30px]">
          <p className="mb-[20px] text-[16px]">Select Interests</p>
          <ChipChoice multi options={INTERESTS} value={interests} onToggle={(v) => setInterests(toggle(interests, v))} testid="monetize-newsletter-interest" />
          <p className="mb-[14px] mt-[24px] flex items-center text-[16px]">
            Newsletter Preview Image*
            <InfoIcon text={IMAGE_TIP} />
          </p>
          <UploadTile src={image} name={imageName} onPick={pickImage} testid="monetize-newsletter-image" />
          {(imageErr || (tried && errors.image)) && <p className="mt-[8px] text-[13px] font-medium text-danger">{imageErr || errors.image}</p>}
        </div>
      </div>

      <div className="mt-[20px] rounded-card bg-surface p-[30px]" data-testid="monetize-newsletter-lock">
        <p className="mb-[20px] text-[16px]">Optional: Set Pricing Options for Newsletter</p>
        <div className="flex flex-col gap-[16px]">
          <PriceOption on={freeSubsOn} toggle={() => setFreeSubsOn(!freeSubsOn)} label="Select Which Subscribers Can Access Newsletter For Free" testid="monetize-newsletter-opt-free-subs">
            {plansPicker(freePlanIds, setFreePlanIds, "monetize-newsletter-free-plan", "You haven't created any subscriptions yet")}
            {tried && <Err>{errors.freeSubs}</Err>}
          </PriceOption>
          <PriceOption on={freeNftOn} toggle={() => setFreeNftOn(!freeNftOn)} label="Allow NFT Holders To Access Newsletter For Free" testid="monetize-newsletter-opt-free-nft">
            <NftRows value={freeNfts} onChange={setFreeNfts} testid="monetize-newsletter-free-nft" />
            {tried && <Err>{errors.freeNft}</Err>}
          </PriceOption>
          <PriceOption on={priceOn} toggle={() => setPriceOn(!priceOn)} label="Individual Purchase Price" testid="monetize-newsletter-opt-price">
            <MoneyInput value={priceText} onChange={setPriceText} label="Individual purchase price" testid="monetize-newsletter-price" placeholder="" invalid={tried && !!errors.price} />
            {tried && <Err>{errors.price}</Err>}
            {price > 0 && (
              <div className="mt-[22px]" data-testid="monetize-newsletter-buy-restrict">
                <p className="mb-[14px] text-[16px]">Restrict Ability to Individually Purchase Newsletter to:</p>
                <div className="grid grid-cols-2 gap-[24px]">
                  <div>
                    <RoundCheck on={buySubsOn} onClick={() => setBuySubsOn(!buySubsOn)} label="Subscribers" testid="monetize-newsletter-buy-subscribers">
                      Subscribers
                    </RoundCheck>
                    {buySubsOn && <div className="mt-[14px]">{plansPicker(buyPlanIds, setBuyPlanIds, "monetize-newsletter-buy-plan", "You haven't created any subscriptions yet")}</div>}
                    {tried && <Err>{errors.buySubs}</Err>}
                  </div>
                  <div>
                    <RoundCheck on={buyNftOn} onClick={() => setBuyNftOn(!buyNftOn)} label="NFT Holders" testid="monetize-newsletter-buy-nft">
                      NFT Holders
                    </RoundCheck>
                    {buyNftOn && (
                      <div className="mt-[14px]">
                        <NftRows value={buyNfts} onChange={setBuyNfts} testid="monetize-newsletter-buy-nft-rows" />
                      </div>
                    )}
                    {tried && <Err>{errors.buyNft}</Err>}
                  </div>
                </div>
              </div>
            )}
          </PriceOption>
          <PriceOption on={pointsOn} toggle={() => setPointsOn(!pointsOn)} label="Loyalty Points" testid="monetize-newsletter-opt-points">
            <label className={`flex h-[55px] items-center rounded-pill bg-bg px-[24px] text-[14px] font-black ${tried && errors.points ? "ring-1 ring-danger" : ""}`}>
              <input aria-label="Points needed to unlock" data-testid="monetize-newsletter-points" inputMode="numeric" value={pointsText} onChange={(e) => setPointsText(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Points needed to unlock" className="w-full bg-transparent outline-none placeholder:font-bold placeholder:text-muted" />
              <span className="ml-[8px] text-muted">Points</span>
            </label>
            {tried && <Err>{errors.points}</Err>}
          </PriceOption>
        </div>
      </div>

      {!verified && !sent && (
        <p className="mt-[20px] flex items-start gap-[8px] rounded-[12px] bg-surface px-[18px] py-[12px] text-[13px] leading-[19px] text-soft" data-testid="monetize-newsletter-email-unverified">
          <Info size={16} className="mt-[1px] shrink-0 text-accent" />
          <span>
            Email sending isn't verified yet, so Publish Now and Schedule will be refused and nothing is sent. You can save a draft, or fix it in{" "}
            <Link to={pathFor("pref-outbound-emails")} className="font-bold text-accent hover:underline">
              Edit Preferences › Outbound Emails
            </Link>
            .
          </span>
        </p>
      )}

      <div className="mt-[20px] flex flex-wrap items-center gap-[12px]">
        {!sent && (
          <div ref={menuRef} className="relative">
            <button type="button" aria-label="More publish options" aria-expanded={menu} data-testid="monetize-newsletter-more" onClick={() => setMenu(!menu)} className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-accent text-white hover:brightness-110">
              <ChevronDown size={22} className={menu ? "rotate-180" : ""} />
            </button>
            {menu && (
              <div role="menu" className="absolute bottom-[54px] left-0 z-30 min-w-[200px] rounded-[10px] bg-surface py-[6px] shadow-[0_4px_12px_rgba(0,0,0,.45)]">
                <button type="button" role="menuitem" data-testid="monetize-newsletter-schedule" onClick={() => ask("schedule")} className="flex h-[38px] w-full items-center px-[18px] text-left text-[14px] hover:bg-accent">
                  Schedule
                </button>
                <button type="button" role="menuitem" data-testid="monetize-newsletter-menu-draft" onClick={saveDraft} className="flex h-[38px] w-full items-center px-[18px] text-left text-[14px] hover:bg-accent">
                  Save as Draft
                </button>
              </div>
            )}
          </div>
        )}
        {!sent && (
          <Pill data-testid="monetize-newsletter-send" className="!h-[46px] !px-[28px]" onClick={() => ask("send")}>
            Publish Now
          </Pill>
        )}
        <span className="flex-1" />
        <button type="button" onClick={() => navigate(back)} data-testid="monetize-newsletter-cancel" className="h-[40px] px-[16px] text-[14px] font-black uppercase hover:text-accent">
          Cancel
        </button>
        <button type="button" data-testid="monetize-newsletter-save-draft" onClick={saveDraft} className="h-[40px] rounded-pill border border-accent px-[20px] text-[14px] font-black uppercase tracking-caps hover:bg-accent-tint">
          {sent ? "Save Changes" : "Save As Draft"}
        </button>
      </div>
      {tried && !valid && <p className="mt-[8px] text-[13px] font-medium text-danger" data-testid="monetize-newsletter-invalid">Fill in the highlighted fields to publish.</p>}

      <Modal open={preview} onClose={() => setPreview(false)} title="Newsletter Preview" uppercaseTitle width={720}>
        <div data-testid="modal-monetize-newsletter-see-preview" className="px-[20px] pb-[10px]">
          {n && <p className="text-[12px] text-soft">Last Saved on: {fmtSaved(savedAt ?? `${n.createdAt}T12:00:00Z`)}</p>}
          {title.trim() && <h3 className="mt-[16px] text-[20px] font-bold">{title}</h3>}
          {plain.trim() ? <div className={`${NL_BODY} mt-[16px] text-[15px] leading-[22px]`} dangerouslySetInnerHTML={{ __html: safeHtml(html) }} /> : <p className="mt-[16px] text-[15px] text-muted">This newsletter has no content yet.</p>}
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirm}
        title={confirm === "send" ? "Publish Newsletter" : "Schedule Newsletter"}
        confirmLabel={confirm === "send" ? "Send Now" : "Schedule"}
        testid="monetize-newsletter-confirm"
        onClose={() => setConfirm(null)}
        onConfirm={doIt}
      >
        <p className="mb-[12px] text-[16px]">Send To</p>
        <ChipChoice options={AUDIENCES.map((a) => a.label)} value={[AUDIENCES.find((a) => a.id === audience)!.label]} onToggle={(v) => setAudience(AUDIENCES.find((a) => a.label === v)!.id)} testid="monetize-newsletter-audience" />
        {audience === "plans" && <div className="mt-[14px]">{plansPicker(planIds, setPlanIds, "monetize-newsletter-plan", "You haven't created any subscriptions yet")}</div>}
        {audience === "groups" && (
          <div className="mt-[14px]" data-testid="monetize-newsletter-groups">
            {groups.length ? (
              <ChipChoice multi options={groups.map((g) => g.name)} value={groups.filter((g) => groupIds.includes(g.id)).map((g) => g.name)} onToggle={(v) => setGroupIds(toggle(groupIds, groups.find((g) => g.name === v)!.id))} testid="monetize-newsletter-group" />
            ) : (
              <p className="rounded-inner bg-bg px-[20px] py-[14px] text-[14px] text-soft">
                You haven't created any Groups yet.{" "}
                <Link to={pathFor("pref-groups-add")} className="font-bold text-accent hover:underline" data-testid="monetize-newsletter-create-group">
                  Create a Group
                </Link>{" "}
                in Edit Preferences › Groups, then come back to send to it.
              </p>
            )}
          </div>
        )}
        {confirmTried && audienceErr && <Err>{audienceErr}</Err>}
        <p className="mt-[12px] text-[13px] text-muted" data-testid="monetize-newsletter-audience-size">
          {size} recipient{size === 1 ? "" : "s"}
        </p>
        {confirm === "schedule" && (
          <div className="mt-[16px]">
            <p className="mb-[10px] text-[16px]">Schedule For</p>
            <TextInput type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} data-testid="monetize-newsletter-when" className="w-[300px] [color-scheme:dark]" invalid={confirmTried && !when} />
            {confirmTried && !when && <Err>Pick a date and time to schedule</Err>}
          </div>
        )}
        <p className="mt-[16px] text-[14px] text-muted">
          <b className="text-white">{input.title}</b> will be {confirm === "send" ? "emailed now" : `emailed on ${when ? new Date(when).toLocaleString("en-US") : "the date you pick"}`}.{" "}
          {lock === "Free" ? "Everyone can read it." : input.price ? `Fans pay ${money(input.price)} to unlock it.` : input.points ? `Fans spend ${input.points} points to unlock it.` : "Only the subscribers or NFT holders you chose can read it."} This can't be undone.
        </p>
      </ConfirmModal>
    </MonetizeFrame>
  );
}

const Err = ({ children }: { children: string }) => (children ? <p className="mt-[8px] pl-[24px] text-[13px] font-medium text-danger">{children}</p> : null);

/** Pricing option row: round selector at far left, expanding card (selected state shown, unlike the reference). */
function PriceOption({ on, toggle, label, testid, children }: { on: boolean; toggle: () => void; label: string; testid: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-[20px]" data-testid={testid}>
      <span className="pt-[16px]">
        <RoundCheck on={on} onClick={toggle} label={label} testid={`${testid}-check`} />
      </span>
      <div className={`min-w-0 flex-1 overflow-hidden rounded-[28px] bg-bg ${on ? "ring-1 ring-accent/60" : ""}`}>
        <button type="button" onClick={toggle} aria-expanded={on} className="flex h-[56px] w-full items-center px-[22px] text-left text-[16px] text-white">
          {label}
        </button>
        {on && <div className="border-t border-line px-[22px] pb-[22px] pt-[20px]">{children}</div>}
      </div>
    </div>
  );
}

/** "Add NFT Contract Address" rows with "Add Another NFT ID"; extra rows get a delete icon. */
function NftRows({ value, onChange, testid }: { value: string[]; onChange: (v: string[]) => void; testid: string }) {
  return (
    <div className="flex flex-col gap-[12px]" data-testid={testid}>
      {value.map((v, i) => (
        <div key={i} className="flex h-[55px] items-center rounded-pill bg-bg pl-[24px] pr-[18px] focus-within:ring-1 focus-within:ring-accent" data-testid={`${testid}-row`}>
          <input value={v} aria-label="NFT contract address" onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Add NFT Contract Address" className="min-w-0 flex-1 bg-transparent text-[14px] font-black text-white outline-none placeholder:font-bold placeholder:text-muted" />
          {i > 0 && (
            <button type="button" aria-label="Delete NFT row" data-testid={`${testid}-delete`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="ml-[10px] text-white hover:text-accent">
              <Trash2 size={18} />
            </button>
          )}
        </div>
      ))}
      <button type="button" data-testid={`${testid}-add`} onClick={() => onChange([...value, ""])} className="self-end text-[14px] text-white hover:text-accent">
        Add Another NFT ID
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ editor (contentEditable + execCommand) */

const EMOJIS = ["🙂", "😂", "😍", "🔥", "🏂", "❄️", "🎉", "👏", "🙌", "💪", "⭐", "❤️"];

function NewsletterEditor({ html, onChange, footer }: { html: string; onChange: (html: string, plain: string) => void; footer: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<"image" | "video" | "audio">("image");
  const [pop, setPop] = useState<"emoji" | "link" | null>(null);
  const [url, setUrl] = useState("https://");
  const saved = useRef<Range | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  useOutside(popRef, () => setPop(null), !!pop);
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) ref.current.innerHTML = safeHtml(html);
  }, []);
  const emit = () => ref.current && onChange(ref.current.innerHTML, ref.current.innerText);
  const keep = () => {
    const s = window.getSelection();
    if (s && s.rangeCount && ref.current?.contains(s.anchorNode)) saved.current = s.getRangeAt(0).cloneRange();
  };
  const restore = () => {
    const s = window.getSelection();
    // Keep a live selection inside the editor; otherwise put back the last one (toolbar clicks, popovers).
    if (s && s.rangeCount && ref.current?.contains(s.anchorNode)) return;
    ref.current?.focus();
    if (saved.current && s) {
      s.removeAllRanges();
      s.addRange(saved.current);
    }
  };
  const exec = (cmd: string, arg?: string) => {
    restore();
    document.execCommand(cmd, false, arg);
    keep();
    emit();
  };
  const pickMedia = (k: "image" | "video" | "audio") => {
    keep();
    setMedia(k);
    if (fileRef.current) {
      fileRef.current.accept = `${k}/*`;
      fileRef.current.click();
    }
  };
  const onFile = (f: File) => {
    const src = URL.createObjectURL(f);
    if (media === "image") exec("insertImage", src);
    else exec("insertHTML", media === "video" ? `<video controls src="${src}" style="max-width:100%"></video><br>` : `<audio controls src="${src}"></audio><br>`);
  };
  const tools: [typeof Bold, string, () => void][] = [
    [Smile, "Emoji", () => (keep(), setPop(pop === "emoji" ? null : "emoji"))],
    [Bold, "Bold", () => exec("bold")],
    [Italic, "Italic", () => exec("italic")],
    [Underline, "Underline", () => exec("underline")],
    [ALargeSmall, "Text size", () => exec("fontSize", document.queryCommandValue("fontSize") === "5" ? "3" : "5")],
    [ListOrdered, "Ordered list", () => exec("insertOrderedList")],
    [List, "Bullet list", () => exec("insertUnorderedList")],
    [Link2, "Link", () => (keep(), setPop(pop === "link" ? null : "link"))],
    [Code, "Code", () => exec("formatBlock", "pre")],
    [ImageIcon, "Image", () => pickMedia("image")],
    [Video, "Video", () => pickMedia("video")],
    [Music, "Audio", () => pickMedia("audio")],
    [Minus, "Divider", () => exec("insertHorizontalRule")],
  ];
  return (
    <div className="rounded-card bg-surface">
      <input ref={fileRef} type="file" className="hidden" data-testid="monetize-newsletter-editor-file" onChange={(e) => (e.target.files?.[0] && onFile(e.target.files[0]), (e.target.value = ""))} />
      <div className="relative flex min-h-[60px] flex-wrap items-center justify-between gap-[10px] border-b border-line px-[22px] py-[10px]">
        <div className="flex flex-wrap items-center gap-[10px]" role="toolbar" aria-label="Formatting">
          {tools.map(([I, label, go]) => (
            <button key={label} type="button" aria-label={label} title={label} data-testid={`monetize-newsletter-tool-${label.toLowerCase().replace(/\s+/g, "-")}`} onMouseDown={(e) => e.preventDefault()} onClick={go} className="flex h-[24px] w-[24px] items-center justify-center hover:text-accent">
              <I size={18} strokeWidth={2.3} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-[14px] text-[14px] font-bold uppercase">
          <button type="button" data-testid="monetize-newsletter-undo" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("undo")} className="flex items-center gap-[4px] hover:text-accent">
            <Undo2 size={16} strokeWidth={2.5} />
            Undo
          </button>
          <button type="button" data-testid="monetize-newsletter-redo" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("redo")} className="flex items-center gap-[4px] hover:text-accent">
            <Redo2 size={16} strokeWidth={2.5} />
            Redo
          </button>
        </div>
        {pop && (
          <div ref={popRef} className="absolute left-[22px] top-[54px] z-30 rounded-[12px] border border-accent bg-surface p-[10px] shadow-lg" data-testid={`monetize-newsletter-${pop}-pop`}>
            {pop === "emoji" ? (
              <div className="grid grid-cols-6 gap-[4px]">
                {EMOJIS.map((e) => (
                  <button key={e} type="button" onMouseDown={(x) => x.preventDefault()} onClick={() => (exec("insertText", e), setPop(null))} className="h-[32px] w-[32px] rounded hover:bg-accent-tint">
                    {e}
                  </button>
                ))}
              </div>
            ) : (
              <form
                className="flex items-center gap-[8px]"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (/^https?:\/\/\S+\.\S+/.test(url.trim())) {
                    exec("createLink", url.trim());
                    setPop(null);
                  }
                }}
              >
                <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Link URL" className="h-[36px] w-[260px] rounded-pill bg-bg px-[14px] text-[14px] outline-none" />
                <Pill type="submit" className="!h-[36px]">
                  Add Link
                </Pill>
              </form>
            )}
          </div>
        )}
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label="Newsletter body"
        data-testid="monetize-newsletter-body"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Write some text..."
        onInput={emit}
        onKeyUp={keep}
        onMouseUp={keep}
        onBlur={keep}
        className={`${NL_BODY} min-h-[250px] px-[22px] py-[18px] text-[16px] outline-none empty:before:text-muted empty:before:content-[attr(data-placeholder)]`}
      />
      {footer}
    </div>
  );
}

/* ------------------------------------------------------------ recipients */

const joined = (r: Recipient) => new Date(`${r.joinedAt}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** Local CSV from the mock (fictional) recipients. Nothing leaves the browser. */
function downloadCsv(rows: Recipient[]) {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = ["Recipient Name,Email,Status,Date Joined", ...rows.map((r) => [r.name, r.email, r.source, r.joinedAt].map(q).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "newsletter-recipients.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function RecipientsTable({ rows }: { rows: Recipient[] }) {
  return (
    <table className="w-full" data-testid="monetize-recipients-table">
      <thead>
        <tr>
          <th className={th}>Recipient Name</th>
          <th className={th}>Email</th>
          <th className={th}>Status</th>
          <th className={th}>Date Joined</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={`${td} !py-[12px]`}>
              <span className="flex items-center gap-[10px] font-bold">
                {/* fictional mock people have no photos: a neutral person icon, as in the reference */}
                <span aria-hidden className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full border-2 border-accent bg-bg text-muted">
                  <UserRound size={18} />
                </span>
                {r.name}
              </span>
            </td>
            <td className={td}>{r.email}</td>
            <td className={td}>{r.source}</td>
            <td className={td}>{joined(r)}</td>
          </tr>
        ))}
        {!rows.length && (
          <tr>
            <td colSpan={4} className={`${td} py-[40px] text-center text-[16px] text-[#c8c8c8]`}>
              No Recipients Found
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/** Newsletter Recipients dialog (newsletter-03): count, DOWNLOAD CSV, table, CLOSE. */
export function RecipientsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const recipients = useData((d) => d.monetize.recipients);
  const toast = useToast();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[var(--backdrop)] px-4 py-5" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Newsletter Recipients" data-testid="modal-monetize-newsletter-recipients" className="mt-[200px] w-[920px] max-w-full rounded-card bg-surface">
        <div className="flex items-center justify-between gap-[12px] border-b border-line px-[30px] py-[16px]">
          <h2 className="text-[20px] font-bold">Newsletter Recipients ({recipients.length})</h2>
          <Pill
            data-testid="monetize-recipients-csv"
            disabled={!recipients.length}
            onClick={() => {
              downloadCsv(recipients);
              toast(`Downloaded newsletter-recipients.csv (${recipients.length} sample recipients)`);
            }}
          >
            Download CSV
          </Pill>
        </div>
        <div className="max-h-[300px] overflow-y-auto px-[30px] pt-[20px]">
          <RecipientsTable rows={recipients} />
        </div>
        <div className="flex justify-end px-[30px] py-[16px]">
          <button type="button" data-testid="monetize-recipients-close" onClick={onClose} className="h-[40px] px-[16px] text-[14px] font-black uppercase tracking-caps hover:text-accent">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/** Newsletter Recipients page (kept for direct links; the list opens the dialog). */
export function RecipientsPage({ route }: PageProps) {
  const recipients = useData((d) => d.monetize.recipients);
  const [q, setQ] = useState("");
  const { navigate } = useRouter();
  const rows = useMemo(() => recipients.filter((r) => `${r.name} ${r.email}`.toLowerCase().includes(q.trim().toLowerCase())), [recipients, q]);
  return (
    <div data-testid={`page-${route.id}`} className="max-w-[939px]">
      <div className="flex items-center justify-between gap-[12px]">
        <div className="flex items-center gap-[20px]">
          <button type="button" aria-label="Back" data-testid="monetize-recipients-back" onClick={() => navigate(pathFor("monetize-newsletters"))} className="hover:text-accent">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[24px] font-bold">Newsletter Recipients ({recipients.length})</h1>
        </div>
        <div className="flex items-center gap-[10px]">
          <label className="flex h-[40px] w-[260px] items-center gap-[12px] rounded-pill bg-surface px-[16px]">
            <Search size={18} className="text-accent" strokeWidth={3} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Recipients" aria-label="Search Recipients" data-testid="monetize-recipients-search" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted" />
          </label>
          <Pill data-testid="monetize-recipients-csv" onClick={() => downloadCsv(rows)} disabled={!rows.length}>
            Download CSV
          </Pill>
        </div>
      </div>
      <TableCard className="mt-[26px]">
        <RecipientsTable rows={rows} />
      </TableCard>
    </div>
  );
}
