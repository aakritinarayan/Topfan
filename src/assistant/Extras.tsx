/**
 * Small in-panel extras offered while the site provisions: a drafted post card.
 * (Creator Quest lives on the provisioning page itself: platform/wls/quest/.)
 */
/** Drafted content is always labelled "Draft" until the creator approves it. */
export function DraftCard({ text }: { text: string }) {
  return (
    <div className="rounded-tile bg-bg p-3">
      <span className="inline-flex h-5 items-center rounded-full border border-accent px-2 text-[10px] font-bold uppercase tracking-caps">Draft</span>
      <p className="mt-2 whitespace-pre-line text-[13px] leading-5">{text}</p>
    </div>
  );
}
