/**
 * Overlays that open over any page without a URL change: Livestream (P19), Welcome (P80),
 * sign-in / join (inferred). Owned by the Social build.
 */
import { closeOverlay, useOverlay } from "../../app/ui";
import { Modal } from "../../platform/ui/surfaces";

export function SocialOverlays() {
  const o = useOverlay();
  return (
    <Modal open={!!o} onClose={closeOverlay} title={o === "livestream" ? "Create a Livestream" : o === "welcome" ? "Welcome" : o === "join" ? "Join" : "Sign In"}>
      <p className="px-[30px] py-6 text-sm text-muted">This overlay is being rebuilt.</p>
    </Modal>
  );
}
