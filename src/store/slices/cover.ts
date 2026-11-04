/**
 * White Label Site › Cover Page editor state, kept in the mock store so edits survive navigation and
 * refresh, plus the assistant's proposed draft for it.
 *
 * The editor's own fields are the three SEO fields, the sections list and sub-pages. The assistant
 * only proposes values for fields that exist there. Its draft is applied to the editor only when the
 * creator chooses "Review in Cover Page Editor"; fields the creator edited are never overwritten, and
 * Undo restores what was there before. Colors are a suggestion for Customize Appearance (applied
 * there, unsaved, by the creator); images are a suggestion for the cover-page hero image.
 */
import type { AppData } from "../store";
import { coverSections, seo } from "../../config/demo";
import { coverFixture, socialFixture, websiteFixture, type SourceId } from "../../config/coverSources";

export type CoverField = "title" | "keywords" | "description";
export const COVER_FIELD_LABEL: Record<CoverField, string> = {
  title: "Cover Page SEO Title",
  keywords: "Cover Page SEO Keywords",
  description: "Cover Page SEO Description",
};
export const DESCRIPTION_MAX = 1000;

export interface PreparedField {
  field: CoverField;
  value: string;
  sources: SourceId[];
  /** Written by the assistant (vs. copied from a source). */
  ai: boolean;
}
export interface ColorProposal {
  accent: string;
  buttonText: string;
  secondaryBg: string;
  /** Contrast of the button label on the accent (WCAG ratio). */
  contrast: number;
  left: { hex: string; why: string }[];
  status: "proposed" | "accepted" | "rejected";
}
export interface ImageProposal {
  key: string;
  alt: string;
  source: SourceId;
  status: "proposed" | "used" | "kept";
}
export interface CoverDraft {
  preparedAt: string;
  fields: PreparedField[];
  /** Draft copy with no matching field in this editor (copy to use elsewhere). */
  copy: { label: string; text: string }[];
  colors: ColorProposal | null;
  image: ImageProposal | null;
  /** What couldn't be prepared, in plain words. */
  unresolved: string[];
  /** Sources used, with what happened to each. */
  sources: { id: SourceId; note: string }[];
}

export interface CoverState {
  meta: Record<CoverField, string>;
  sections: (typeof coverSections)[number][];
  subPages: { name: string; slug: string }[];
  /** Fields the creator typed in (never overwritten by the assistant). */
  edited: CoverField[];
  draft: CoverDraft | null;
  /** The last apply, for Undo (only fields still holding the applied value are restored). */
  applied: { fields: CoverField[]; before: Partial<Record<CoverField, string>>; values: Partial<Record<CoverField, string>> } | null;
  /** Set only when Update & Publish succeeds. */
  publishedAt: string | null;
}

export const initialCover = (): CoverState => ({
  meta: { title: seo.title, keywords: seo.keywords, description: seo.description },
  sections: structuredClone(coverSections),
  // Fictional sample sub-pages so the list isn't empty in the demo.
  subPages: [
    { name: "About AJ", slug: "about-aj" },
    { name: "Training Camps", slug: "training-camps" },
    { name: "Gear Guide", slug: "gear-guide" },
  ],
  edited: [],
  draft: null,
  applied: null,
  publishedAt: null,
});

/* ---------------- contrast (WCAG 2) ---------------- */

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return Math.round(((x + 0.05) / (y + 0.05)) * 10) / 10;
};

/* ---------------- preparing the draft (deterministic; sources are the demo fixture) ---------------- */

export function prepareCoverDraft(d: AppData): CoverDraft {
  const name = d.account.name;
  const bio = d.prefsA.profile.bio.trim();
  const location = d.prefsA.profile.location;
  const city = location.split(",")[0]?.trim();
  const site = coverFixture === "no-website" || coverFixture === "site-unreachable" ? null : websiteFixture;
  const insta = socialFixture.find((s) => s.id === "instagram" && s.access === "authorized");
  const sources: CoverDraft["sources"] = [
    { id: "profile", note: "Name, bio and location" },
    { id: "onboarding", note: `Your new site address (${d.account.whiteLabel.siteUrl || d.account.whiteLabel.domain})` },
  ];
  const unresolved: string[] = [];
  if (coverFixture === "no-website") unresolved.push("No existing website was given, so I used your TopFan profile and Instagram instead.");
  else if (coverFixture === "site-unreachable") unresolved.push(`I couldn't access ${websiteFixture.url} (simulated), so nothing was taken from it. I used your TopFan profile and Instagram instead.`);
  else sources.push({ id: "website", note: `${websiteFixture.url}: title, description, colors and approved images` });
  for (const s of socialFixture) {
    if (s.access === "authorized") sources.push({ id: s.id, note: `${s.url}: public bio and profile photo` });
    else {
      sources.push({ id: s.id, note: `${s.url}: link kept; ${s.access === "private" ? "the account is private" : "no permission to read it"}, so nothing was used from it` });
    }
  }

  // Fields that exist in the editor.
  const fields: PreparedField[] = [];
  fields.push(
    site
      ? { field: "title", value: site.title, sources: ["website"], ai: false }
      : { field: "title", value: `${name} | Official Site`, sources: ["profile"], ai: false },
  );
  const kw = [name, ...(site ? site.metaKeywords : ["freestyle snowboarding"]), city].filter(Boolean);
  fields.push({ field: "keywords", value: [...new Set(kw.map((k) => k!.trim()))].join(", "), sources: site ? ["profile", "website"] : ["profile"], ai: false });
  // Written from the bio and location only; no claims the sources don't support.
  const about = bio.replace(/^US /, "").replace(/\.$/, "");
  const desc = `Official site of ${name}, ${about.charAt(0).toLowerCase()}${about.slice(1)}${location ? ` from ${city}${location.includes(",") ? `, ${location.split(",")[1].trim()}` : ""}` : ""}. Follow along, join as a member, and get closer to the riding.`;
  fields.push({ field: "description", value: desc.slice(0, DESCRIPTION_MAX), sources: site ? ["profile", "website", "ai"] : insta ? ["profile", "instagram", "ai"] : ["profile", "ai"], ai: true });

  // Copy with no matching field here (the editor has no headline or intro fields).
  const copy = [
    { label: "Headline", text: `Freestyle snowboarding with ${name}` },
    { label: "Short introduction", text: insta?.bio ?? bio },
  ];

  // Colors: brand colors from the website, checked for readable button text; decorative ones left out.
  let colors: ColorProposal | null = null;
  if (site) {
    const accent = site.colors.find((c) => /button|link/.test(c.use))!.hex;
    const navy = site.colors.find((c) => /background/.test(c.use))!.hex;
    const options = ["#ffffff", navy, "#111111"];
    const buttonText = options.reduce((best, c) => (contrast(c, accent) > contrast(best, accent) ? c : best), options[0]);
    colors = {
      accent,
      buttonText,
      secondaryBg: navy,
      contrast: contrast(buttonText, accent),
      left: site.colors.filter((c) => /decorative/.test(c.use)).map((c) => ({ hex: c.hex, why: `Used only for ${c.use} on your site` })),
      status: "proposed",
    };
    if (contrast("#ffffff", accent) < 4.5) unresolved.push(`White text on ${accent} is hard to read (${contrast("#ffffff", accent)}:1), so I suggest ${buttonText} for button text (${colors.contrast}:1).`);
  } else unresolved.push("No brand colors to suggest without your website. Your current colors stay as they are.");

  // Image: the website's approved hero image, if it's large enough for a full-width cover.
  let image: ImageProposal | null = null;
  if (site && coverFixture !== "no-photo") {
    const big = site.approvedImages.filter((i) => i.width >= 1280 && i.key !== d.account.hero);
    const small = site.approvedImages.filter((i) => i.width < 1280);
    if (big[0]) image = { key: big[0].key, alt: big[0].alt, source: "website", status: "proposed" };
    if (small.length) unresolved.push(`${small.length} approved image${small.length > 1 ? "s are" : " is"} too small for a full-width cover, so I left ${small.length > 1 ? "them" : "it"} out.`);
  }
  if (!image) unresolved.push("Would you like to upload a cover image or choose one from your existing media?");
  if (!d.account.avatar) unresolved.push("No profile photo yet. Add one in Profile.");

  return { preparedAt: new Date().toISOString(), fields, copy, colors, image, unresolved, sources };
}

/* ---------------- store changes ---------------- */

export function saveDraft(d: AppData, draft: CoverDraft) {
  d.cover.draft = draft;
}

/** The creator typed in a field: their value wins from now on. */
export function editField(d: AppData, field: CoverField, value: string) {
  d.cover.meta[field] = field === "description" ? value.slice(0, DESCRIPTION_MAX) : value;
  if (!d.cover.edited.includes(field)) d.cover.edited.push(field);
}

/** Put the draft into the editor's fields (never over the creator's edits). Returns what changed. */
export function applyDraft(d: AppData): { applied: CoverField[]; kept: CoverField[] } {
  const draft = d.cover.draft;
  if (!draft) return { applied: [], kept: [] };
  const applied: CoverField[] = [];
  const kept: CoverField[] = [];
  const before: Partial<Record<CoverField, string>> = {};
  const values: Partial<Record<CoverField, string>> = {};
  for (const f of draft.fields) {
    if (d.cover.edited.includes(f.field)) {
      kept.push(f.field);
      continue;
    }
    before[f.field] = d.cover.meta[f.field];
    values[f.field] = f.value;
    d.cover.meta[f.field] = f.value;
    applied.push(f.field);
  }
  d.cover.applied = { fields: applied, before, values };
  return { applied, kept };
}

/** One suggestion the creator chose to use (e.g. "Use in SEO Description"); Undo restores the previous text. */
export function suggestField(d: AppData, field: CoverField, value: string) {
  d.cover.applied = { fields: [field], before: { [field]: d.cover.meta[field] }, values: { [field]: value } };
  d.cover.meta[field] = value.slice(0, DESCRIPTION_MAX);
}

/** Undo the last apply: restores fields that still hold the applied value (later edits are kept). */
export function undoApply(d: AppData): CoverField[] {
  const a = d.cover.applied;
  if (!a) return [];
  const restored = a.fields.filter((f) => d.cover.meta[f] === a.values[f]);
  for (const f of restored) d.cover.meta[f] = a.before[f] ?? "";
  d.cover.applied = null;
  return restored;
}

export function setColorStatus(d: AppData, status: ColorProposal["status"]) {
  if (d.cover.draft?.colors) d.cover.draft.colors.status = status;
}

/**
 * Accepted colors wait here for White Label Site › Customize Appearance, which shows them as unsaved
 * changes (nothing is saved until the creator clicks Update & Publish there). Taken once.
 */
let pendingTheme: Partial<AppData["account"]["theme"]> | null = null;
export const setPendingTheme = (t: typeof pendingTheme) => void (pendingTheme = t);
export const hasPendingTheme = () => !!pendingTheme;
export function takePendingTheme() {
  const t = pendingTheme ?? {};
  pendingTheme = null;
  return t;
}

/** Use the proposed image as the cover-page hero image, or keep the current one. */
export function decideImage(d: AppData, use: boolean) {
  const img = d.cover.draft?.image;
  if (!img) return;
  if (use) d.account.hero = img.key;
  img.status = use ? "used" : "kept";
}

export function setSections(d: AppData, sections: CoverState["sections"]) {
  d.cover.sections = sections;
}
export function setSubPages(d: AppData, subPages: CoverState["subPages"]) {
  d.cover.subPages = subPages;
}

/** Update & Publish. Simulated failure with ?coverFixture=publish-fail (first attempt only). */
let failedOnce = false;
export function canPublish(): boolean {
  if (coverFixture === "publish-fail" && !failedOnce) {
    failedOnce = true;
    return false;
  }
  return true;
}
export function markPublished(d: AppData) {
  d.cover.publishedAt = new Date().toISOString();
  d.account.whiteLabel.lastPublishedAt = d.cover.publishedAt;
}

/** Required fields (all three are marked * in the editor). */
export const missingRequired = (d: AppData) => (Object.keys(COVER_FIELD_LABEL) as CoverField[]).filter((f) => !d.cover.meta[f].trim());
