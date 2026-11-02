/**
 * Overlays that open over any page without a URL change: Livestream (P19), Welcome (P80),
 * sign-in / join (inferred). Owned by the Social build.
 *
 * Dev-only mock auth switch (no visible UI): add ?mockAuth=logged-out | fan | creator to any URL.
 */
import { useEffect, useState } from "react";
import { closeOverlay, openOverlay, useOverlay } from "../../app/ui";
import { useRouter } from "../../app/router";
import { act, delaysOff, getData, useData } from "../../store/store";
import { endLivestream, initialSocial, setFanView, startLivestream } from "../../store/slices/social";
import { ImageSlot } from "../../platform/ui/surfaces";
import { Button, Input, TextButton } from "../../platform/ui/controls";
import { useToast } from "../../platform/ui/toast";
import { SocialModal, useGo } from "./shared";

export function SocialOverlays() {
  const o = useOverlay();
  const { query } = useRouter();
  // One-time migration: data saved before the Social seed existed kept `posts: []` (the store merges
  // slices shallowly). Detected by the default likedByMe ids being present with no posts at all.
  useEffect(() => {
    const d = getData();
    if (d.social.posts.length === 0 && d.social.likedByMe.includes("p-welcome"))
      act("social.seedPosts", (x) => void (x.social.posts = structuredClone(initialSocial.posts)));
  }, []);
  // Dev-only mock auth switch (does not change the visible UI).
  useEffect(() => {
    const v = query.get("mockAuth");
    if (v === "logged-out" || v === "fan" || v === "creator") act("social.mockAuth", (d) => setFanView(d, v));
  }, [query]);
  return (
    <>
      <LivestreamModal open={o === "livestream"} />
      <WelcomeModal open={o === "welcome"} />
      <AuthModal mode={o === "sign-in" ? "sign-in" : o === "join" ? "join" : null} />
    </>
  );
}

/* ---------------- P19 Create a Livestream ---------------- */

function LivestreamModal({ open }: { open: boolean }) {
  const [step, setStep] = useState<"choose" | "confirm">("choose");
  const [err, setErr] = useState<string | null>(null);
  const live = useData((d) => d.social.livestream);
  const toast = useToast();
  const go = useGo();
  useEffect(() => {
    if (open) {
      setStep("choose");
      setErr(null);
    }
  }, [open]);
  const pill = "flex h-[40px] w-full items-center justify-center rounded-pill bg-accent text-[14px] font-black uppercase tracking-caps text-white hover:brightness-110";
  return (
    <SocialModal open={open} onClose={closeOverlay} title="Create a Livestream" width={450} centered testid="modal-livestream" bodyClass="px-[30px] pb-[50px] pt-[29px]">
      {live.status === "live" ? (
        // inferred: the live state was never captured (Go Live is mock only)
        <div data-testid="livestream-live">
          <p className="text-[16px] leading-[24px] text-soft">
            <span className="mr-[8px] inline-block h-[10px] w-[10px] rounded-full bg-accent align-middle" />
            You're live (demo). No stream is broadcast in this prototype.
          </p>
          <button
            data-testid="livestream-end"
            className={`${pill} mt-[24px]`}
            onClick={() => {
              const r = act("social.endLivestream", endLivestream, { need: "content.write" });
              if (!r.ok) return setErr(r.reason);
              toast("Livestream ended");
              closeOverlay();
            }}
          >
            End Livestream
          </button>
          {err && <p className="mt-[12px] text-[13px] text-danger">{err}</p>}
        </div>
      ) : step === "choose" ? (
        <>
          <button data-testid="livestream-go-live" className={pill} onClick={() => setStep("confirm")}>
            Instant Livestream - Go Live Now
          </button>
          <div className="my-[14px] flex items-center gap-[12px] text-[14px]">
            <span className="h-px flex-1 bg-white/40" />
            or
            <span className="h-px flex-1 bg-white/40" />
          </div>
          <button
            data-testid="livestream-schedule"
            className={pill}
            onClick={() => {
              closeOverlay();
              go("monetize-event-calendar", {}, "/monetize");
            }}
          >
            Schedule a Future Livestream in Events
          </button>
        </>
      ) : (
        // inferred: Confirm-tier step before going live
        <div data-testid="livestream-confirm">
          <p className="text-[16px] leading-[24px] text-soft">Go live now? Your fans will be notified that you're live. (Demo: nothing is broadcast.)</p>
          {err && <p className="mt-[12px] text-[13px] text-danger" role="alert">{err}</p>}
          <div className="mt-[24px] flex justify-end gap-[12px]">
            <TextButton data-testid="livestream-confirm-cancel" onClick={() => setStep("choose")}>
              Cancel
            </TextButton>
            <Button
              data-testid="livestream-confirm-go"
              onClick={() => {
                const r = act("social.startLivestream", startLivestream, { need: "content.write" });
                if (!r.ok) return setErr(r.reason);
                toast("You're live (demo)");
                closeOverlay();
              }}
            >
              Go Live
            </Button>
          </div>
        </div>
      )}
    </SocialModal>
  );
}

/* ---------------- P80 Welcome Message ---------------- */

const WELCOME_MS = 10_000;

function WelcomeModal({ open }: { open: boolean }) {
  // Video autoplays with no controls and the modal closes itself when it ends (~10s). Mock clip = placeholder.
  useEffect(() => {
    if (!open || delaysOff()) return;
    const t = setTimeout(closeOverlay, WELCOME_MS);
    return () => clearTimeout(t);
  }, [open]);
  return (
    <SocialModal open={open} onClose={closeOverlay} title="Welcome Message" width={620} top={180} testid="modal-welcome" bodyClass="px-[30px] pb-[35px] pt-[22px]">
      <div role="region" aria-label="Video Player" className="overflow-hidden rounded-[20px]">
        <ImageSlot label="Welcome video" className="h-[315px] w-full" />
      </div>
    </SocialModal>
  );
}

/* ---------------- Sign in / Join (inferred, dev-only mock auth) ---------------- */

function AuthModal({ mode }: { mode: "sign-in" | "join" | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const toast = useToast();
  useEffect(() => {
    setEmail("");
    setPassword("");
    setName("");
  }, [mode]);
  const join = mode === "join";
  const valid = email.trim() && password.trim() && (!join || name.trim());
  const submit = () => {
    if (!valid) return;
    // Mock only: any input works, nothing is checked, sent or stored.
    act(join ? "social.join" : "social.signIn", (d) => setFanView(d, "fan"));
    toast(join ? "Welcome! You've joined (demo)" : "Signed in (demo)");
    closeOverlay();
  };
  return (
    <SocialModal
      open={!!mode}
      onClose={closeOverlay}
      title={join ? "Join" : "Sign In"}
      width={450}
      centered
      testid={join ? "modal-join" : "modal-sign-in"}
      bodyClass="px-[30px] pb-[30px] pt-6"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-[12px]"
      >
        <p className="rounded-inner border border-accent/60 bg-bg px-[16px] py-[12px] text-[13px] leading-[20px] text-soft" data-testid="auth-demo-note">
          Demo sign-in: any details work. Nothing is checked or sent.
        </p>
        {join && <Input aria-label="Full name" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} data-testid="auth-name" />}
        <Input aria-label="Email address" placeholder="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="auth-email" />
        <Input aria-label="Password" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="auth-password" />
        <Button type="submit" disabled={!valid} className="!mt-[20px] w-full" data-testid="auth-submit">
          {join ? "Join" : "Sign In"}
        </Button>
        <p className="pt-[4px] text-center text-[14px] text-muted">
          {join ? "Already have an account? " : "New here? "}
          <button type="button" data-testid="auth-switch" className="font-bold text-accent" onClick={() => openOverlay(join ? "sign-in" : "join")}>
            {join ? "Sign In" : "Join"}
          </button>
        </p>
      </form>
    </SocialModal>
  );
}
