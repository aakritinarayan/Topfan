/** Monetize › Experiences (14c), Courses (14d), Downloadables (14e), Merchandise (14f), NFTs (14g). */
import { useState } from "react";
import { Copy, Lock, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "../../../app/router";
import { pathFor } from "../../../app/routeCatalog";
import { useData } from "../../../store/store";
import {
  connectShopify, deleteProduct, disconnectShopify, money, resyncShopify, type Product, type ProductKind,
} from "../../../store/slices/monetize";
import { Modal } from "../../../platform/ui/surfaces";
import { useToast } from "../../../platform/ui/toast";
import type { PageProps } from "../../types";
import { AddTile, ConfirmModal, DarkPill, MediaCard, MiniSelect, MonetizeFrame, Pill, productMediaKind, RedCircle, SectionHeader, TextInput, useRun } from "../ui";

const META: Record<ProductKind, { tab: string; add: string; addRoute: string; editRoute: string; addLabel?: string }> = {
  experience: { tab: "monetize-experience", add: "Add Another Experience", addRoute: "monetize-experience-add", editRoute: "monetize-experience-edit" },
  course: { tab: "monetize-courses", add: "Add Another Course", addRoute: "monetize-course-add", editRoute: "monetize-course-edit" },
  downloadable: { tab: "monetize-downloadable", add: "Add Another Downloadable", addRoute: "monetize-downloadable-add", editRoute: "monetize-downloadable-edit" },
  merchandise: { tab: "monetize-merchandise", add: "", addRoute: "monetize-merch-add", editRoute: "monetize-merch-edit" },
  nft: { tab: "monetize-nfts", add: "", addRoute: "monetize-nft-add", editRoute: "monetize-nft-edit" },
};

export const editRouteFor = (kind: ProductKind) => META[kind].editRoute;

function ProductGrid({ kind, items, withAdd }: { kind: ProductKind; items: Product[]; withAdd: boolean }) {
  const { navigate } = useRouter();
  const run = useRun();
  const [del, setDel] = useState<Product | null>(null);
  const m = META[kind];
  return (
    <>
      <div className="grid grid-cols-3 gap-[10px]" data-testid={`monetize-grid-${kind}`}>
        {withAdd && <AddTile label={m.add} testid={`monetize-add-${kind}`} onClick={() => navigate(pathFor(m.addRoute))} />}
        {items.map((p) => (
          <MediaCard
            key={p.id}
            testid={`monetize-card-${p.id}`}
            title={p.title}
            image={p.image}
            kind={productMediaKind(p.kind)}
            // Downloadables show no price in the capture (14e).
            price={kind === "downloadable" || p.price == null ? null : money(p.price)}
            external={p.external}
            topLeft={
              kind === "course" && p.published ? (
                <span className="-ml-[5px] -mt-[5px]">
                  <DarkPill>Published</DarkPill>
                </span>
              ) : p.locked ? (
                <RedCircle label="Locked" badge>
                  <Lock size={18} strokeWidth={2.5} />
                </RedCircle>
              ) : undefined
            }
            topRight={
              <>
                <RedCircle label={`Delete ${p.title}`} data-testid={`monetize-card-delete-${p.id}`} onClick={() => setDel(p)}>
                  <Trash2 size={18} strokeWidth={2.4} />
                </RedCircle>
                <RedCircle label={`Edit ${p.title}`} data-testid={`monetize-card-edit-${p.id}`} onClick={() => navigate(pathFor(m.editRoute, { productId: p.id }))}>
                  <Pencil size={18} fill="currentColor" strokeWidth={1.5} />
                </RedCircle>
              </>
            }
          />
        ))}
      </div>
      <ConfirmModal
        open={!!del}
        title="Delete Item"
        confirmLabel="Delete"
        testid="monetize-delete-product"
        onClose={() => setDel(null)}
        onConfirm={() => {
          if (del && run("monetize.deleteProduct", (d) => deleteProduct(d, del.id), "content.write", `${del.title} deleted`)) setDel(null);
        }}
      >
        Are you sure you want to delete <b>{del?.title}</b>? It will be removed from your Store.
      </ConfirmModal>
    </>
  );
}

/** Monetize grids list items in creation order (14c–14e). */
const byCreated = (a: Product, b: Product) => a.createdAt.localeCompare(b.createdAt) || a.order - b.order;

export function SimpleProductTab({ route, kind }: PageProps & { kind: "experience" | "course" | "downloadable" }) {
  const items = useData((d) => d.monetize.products.filter((p) => p.kind === kind).sort(byCreated));
  return (
    <MonetizeFrame routeId={route.id} active={META[kind].tab}>
      <ProductGrid kind={kind} items={items} withAdd />
    </MonetizeFrame>
  );
}

export function MerchandiseTab({ route }: PageProps) {
  // 14f: external items first, then Shopify items in creation order
  const all = useData((d) => d.monetize.products.filter((p) => p.kind === "merchandise").sort((a, b) => (a.external === b.external ? byCreated(a, b) : a.external ? -1 : 1)));
  const shopify = useData((d) => d.monetize.shopify);
  const collections = useData((d) => d.monetize.collections);
  const [col, setCol] = useState<string | null>(null);
  const [disc, setDisc] = useState(false);
  const [typed, setTyped] = useState("");
  const [connectName, setConnectName] = useState("");
  const { navigate, back } = useRouter();
  const run = useRun();
  const toast = useToast();
  const items = !col || col === "ALL" ? all : all.filter((p) => p.collection === col);
  return (
    <MonetizeFrame routeId={route.id} active="monetize-merchandise">
      <SectionHeader title="Merchandise Store" back={back}>
        {shopify.connected && (
          <Pill data-testid="monetize-merch-resync" onClick={() => run("monetize.resyncShopify", resyncShopify, "content.write", "Merchandise re-synced from Shopify")}>
            Re-Sync Merch From Shopify
          </Pill>
        )}
        <Pill data-testid="monetize-merch-add" onClick={() => navigate(pathFor("monetize-merch-add"))}>
          Add External Merchandise
        </Pill>
      </SectionHeader>
      <p className="mt-[44px] text-[14px] uppercase">Filter By:</p>
      <div className="mt-[16px]">
        <MiniSelect
          label="Select collection"
          testid="monetize-merch-collection"
          value={col}
          placeholder="SELECT COLLECTION"
          options={collections}
          onChange={setCol}
          width={306}
          height={56}
          className="text-[13px] font-medium uppercase"
        />
      </div>
      <div className="mt-[20px]">
        <ProductGrid kind="merchandise" items={items} withAdd={false} />
        {!items.length && <p className="py-[40px] text-center text-[16px] text-[#c8c8c8]">No Merchandise Found</p>}
      </div>
      {shopify.connected ? (
        <div className="mt-[30px] flex h-[60px] items-center justify-between rounded-inner bg-surface pl-[10px] pr-[10px]" data-testid="monetize-shopify-bar">
          <span className="flex items-center gap-[8px] text-[14px] font-bold">
            Connected Shopify Store:&nbsp;&nbsp;{shopify.store}
            <button
              type="button"
              aria-label="Copy store address"
              data-testid="monetize-shopify-copy"
              onClick={() => {
                navigator.clipboard?.writeText(shopify.store).catch(() => {});
                toast("Copied to clipboard");
              }}
              className="hover:text-accent"
            >
              <Copy size={18} />
            </button>
          </span>
          <Pill data-testid="monetize-shopify-disconnect" onClick={() => setDisc(true)}>
            Disconnect Shopify Store
          </Pill>
        </div>
      ) : (
        // inferred: disconnected state (not captured)
        <div className="mt-[30px] flex items-center gap-[12px] rounded-inner bg-surface p-[10px]" data-testid="monetize-shopify-connect-bar">
          <span className="whitespace-nowrap pl-[6px] text-[14px] font-bold">Connect Shopify Store:</span>
          <TextInput className="!h-[40px]" placeholder="your-store.myshopify.com" value={connectName} onChange={(e) => setConnectName(e.target.value)} data-testid="monetize-shopify-store-input" />
          <Pill
            data-testid="monetize-shopify-connect"
            disabled={!connectName.trim()}
            onClick={() => run("monetize.connectShopify", (d) => connectShopify(d, connectName.trim()), "account.admin", "Shopify store connected (simulated)")}
          >
            Connect
          </Pill>
        </div>
      )}
      {/* Protected tier: unlink store → typed confirmation. INFERRED copy. */}
      <Modal open={disc} onClose={() => setDisc(false)} title="Disconnect Shopify Store">
        <div data-testid="modal-monetize-shopify-disconnect" className="text-[15px] leading-[22px]">
          <p>Your Shopify products will be removed from your Store. Fans won't be able to buy them until you connect a store again.</p>
          <p className="mt-[16px]">
            Type <b>{shopify.store}</b> to confirm.
          </p>
          <TextInput className="mt-[12px]" value={typed} onChange={(e) => setTyped(e.target.value)} data-testid="monetize-shopify-disconnect-input" aria-label="Type the store address to confirm" />
          <div className="mt-[24px] flex justify-end gap-[12px]">
            <button type="button" className="h-[40px] px-[16px] text-[14px] font-black uppercase text-white hover:text-accent" onClick={() => setDisc(false)}>
              Cancel
            </button>
            <Pill
              disabled={typed.trim() !== shopify.store}
              data-testid="monetize-shopify-disconnect-confirm"
              onClick={() => {
                if (run("monetize.disconnectShopify", disconnectShopify, "account.admin", "Shopify store disconnected")) {
                  setDisc(false);
                  setTyped("");
                }
              }}
            >
              Disconnect
            </Pill>
          </div>
        </div>
      </Modal>
    </MonetizeFrame>
  );
}

export function NftsTab({ route }: PageProps) {
  const items = useData((d) => d.monetize.products.filter((p) => p.kind === "nft").sort(byCreated));
  const { navigate, back } = useRouter();
  return (
    <MonetizeFrame routeId={route.id} active="monetize-nfts">
      <SectionHeader title="External NFTs" back={back}>
        <Pill data-testid="monetize-nft-add" onClick={() => navigate(pathFor("monetize-nft-add"))}>
          Add External NFTs
        </Pill>
      </SectionHeader>
      <div className="mt-[24px]">
        <ProductGrid kind="nft" items={items} withAdd={false} />
        {!items.length && <p className="py-[40px] text-center text-[16px] text-[#c8c8c8]">No NFTs Found</p>}
      </div>
    </MonetizeFrame>
  );
}
