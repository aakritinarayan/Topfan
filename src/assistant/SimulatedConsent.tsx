/**
 * Simulated, simplified provider consent screen in a tab-like frame. Clearly labelled "Simulated".
 * Neutral styling on purpose: it stands in for a third-party page and carries no provider branding.
 */
import { AnimatePresence, motion } from "framer-motion";
import { Lock } from "lucide-react";

export function SimulatedConsent({
  open,
  provider,
  domain,
  records,
  onConnect,
  onCancel,
}: {
  open: boolean;
  provider: string;
  domain: string;
  records: { host: string; value: string }[];
  onConnect: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--backdrop)] p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-[560px] max-w-full overflow-hidden rounded-tile bg-white text-[#1b1b1b] shadow-2xl"
          >
            {/* Tab-like browser chrome */}
            <div className="flex items-center gap-3 bg-[#e9e9eb] px-4 py-2.5">
              <span className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#c8c8cc]" />
                <span className="h-3 w-3 rounded-full bg-[#c8c8cc]" />
                <span className="h-3 w-3 rounded-full bg-[#c8c8cc]" />
              </span>
              <span className="flex flex-1 items-center gap-2 rounded-md bg-white px-3 py-1 text-xs text-[#555]">
                <Lock size={12} /> {provider} · sign in to approve
              </span>
              <span className="rounded-full bg-danger px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-caps text-white">Simulated</span>
            </div>

            <div className="px-8 py-7">
              <p className="text-xs font-bold uppercase tracking-[1px] text-[#777]">{provider}</p>
              <h2 className="mt-2 text-xl font-bold">TopFan wants to add 2 records to {domain}</h2>
              <p className="mt-2 text-sm text-[#555]">
                You're signed in to {provider}. TopFan can't see your password and won't change anything else.
              </p>
              <ul className="mt-5 divide-y divide-[#e4e4e6] rounded-lg border border-[#e4e4e6] text-[13px]">
                {records.map((r, i) => (
                  <li key={i} className="px-4 py-3">
                    <p className="font-bold">Record {i + 1}</p>
                    <p className="mt-1 break-all font-mono text-[12px] text-[#444]">
                      {r.host} → {r.value}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={onCancel} className="h-10 rounded-md px-5 text-sm font-bold text-[#333] hover:bg-[#f0f0f2]">
                  Cancel
                </button>
                <button onClick={onConnect} className="h-10 rounded-md bg-[#1b1b1b] px-6 text-sm font-bold text-white hover:bg-black">
                  Connect
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
