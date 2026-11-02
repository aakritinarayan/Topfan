/**
 * Preferences › NFT Wallet (/edit-preference/connect-nft-wallet) — spec 36, shot 36-*.
 * UNLINK WALLET is Protected (confirm modal + password, account.admin). No wallet is ever contacted.
 */
import { useEffect, useRef, useState } from "react";
import type { PageProps } from "../types";
import { PreferencesPage } from "../../platform/PreferencesPage";
import { Button } from "../../platform/ui/controls";
import { useData } from "../../store/store";
import { linkWallet, maskWallet, resyncWallet, unlinkWallet } from "../../store/slices/prefsA";
import { ProtectedModal, useRun } from "./ui";

export function NftWallet({ route }: PageProps) {
  const linked = useData((d) => d.prefsA.integrations.metamaskLinked);
  const wallet = useData((d) => d.prefsA.wallet);
  const run = useRun();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const resync = () => {
    setBusy(true);
    timer.current = setTimeout(() => {
      setBusy(false);
      run("prefs.resyncWallet", resyncWallet, "account.admin", "Wallet resynced"); // inferred: toast copy
    }, 900);
  };

  return (
    <PreferencesPage>
      <div data-testid={`page-${route.id}`}>
        <section className="rounded-card bg-surface p-[30px]" data-testid="pref-nft-wallet-card">
          <div className="flex items-center gap-5 border-b border-bg pb-5">
            {/* Neutral stand-in for the MetaMask fox tile (no brand image is imported). */}
            <span aria-hidden className="flex h-[60px] w-[60px] items-center justify-center rounded-[10px] bg-[#4a3022] text-[32px]">
              🦊
            </span>
            <h3 className="text-base font-medium uppercase">My MetaMask Wallet</h3>
          </div>

          {linked ? (
            <>
              <div className="pt-5">
                <div className="text-[28px] font-black" data-testid="pref-nft-wallet-address">
                  {maskWallet(wallet.address)}
                </div>
                <Button className="mt-[30px] w-[131px]" data-testid="pref-nft-wallet-resync" disabled={busy} onClick={resync}>
                  {busy ? "Resyncing…" : "Resync"}
                </Button>
              </div>
              <div className="mt-[30px] border-t border-white/[.13] pt-[30px] text-center">
                <button
                  type="button"
                  data-testid="pref-nft-wallet-unlink"
                  onClick={() => setConfirm(true)}
                  className="text-base font-medium uppercase text-white hover:text-accent"
                >
                  Unlink Wallet
                </button>
              </div>
            </>
          ) : (
            // inferred: unconnected state (the account in the capture was connected)
            <div className="pt-5" data-testid="pref-nft-wallet-unlinked">
              <p className="text-sm leading-[22px]">No wallet is linked. Connect your MetaMask wallet to show and sell NFTs on your TopFan site.</p>
              <Button
                className="mt-[30px]"
                data-testid="pref-nft-wallet-connect"
                onClick={() => run("prefs.linkWallet", linkWallet, "account.admin", "MetaMask wallet linked")}
              >
                Connect MetaMask Wallet
              </Button>
            </div>
          )}
        </section>

        <ProtectedModal
          open={confirm}
          onClose={() => setConfirm(false)}
          title="Unlink Wallet" // inferred: modal title (only the body and buttons were read from the DOM)
          testid="pref-nft-wallet-unlink-modal"
          cancelLabel="No"
          confirmLabel="Yes"
          onConfirm={() => {
            if (run("prefs.unlinkWallet", unlinkWallet, "account.admin", "MetaMask wallet unlinked")) setConfirm(false);
          }}
        >
          Are you sure you want to disconnect your MetaMask Wallet?
        </ProtectedModal>
      </div>
    </PreferencesPage>
  );
}
