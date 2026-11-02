/**
 * Help Center & FAQ (P72) and the legal pages (P73/P74). No sidebar: header + centred ~1146px container.
 * Legal copy is SAMPLE text (headings follow the source; the real terms are not reproduced).
 */
import { useState, type ReactNode } from "react";
import { Link } from "../../app/router";
import type { PageProps } from "../types";
import { CommsModal, FaqItem, SearchPill, useOpenSet } from "./ui";
import { SupportForm } from "./SupportForm";

function Breadcrumb({ title }: { title: string }) {
  return (
    <nav aria-label="Breadcrumb" className="pt-[51px] text-[16px] font-medium">
      <Link to="/" data-testid="help-breadcrumb-home" className="text-white hover:text-accent">
        Home
      </Link>
      <span className="px-[10px]">/</span>
      <span>{title}</span>
    </nav>
  );
}

/** Answer 1 is the product's copy (spec); the rest are inferred sample answers. */
const HELP_FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "How do I report an issue with a purchase or request a refund?",
    a: (
      <>
        <p>Go to Wallet &gt; My Purchases &gt; Select Your Purchase Type &gt; View Details and either Request a Refund or Dispute.</p>
        <p>You can also click Messages and initiate a Direct Message with the Creator to resolve the issue.</p>
        <p>If you still can't resolve the problem, and before you dispute the charge with your credit card company, please use the contact form below so we can try to assist you.</p>
      </>
    ),
  },
  { q: "How do I pause or delete my account?", a: <p>Go to Preferences &gt; Privacy, Password &amp; Integrations and choose Pause Account or Delete Account. (Sample answer.)</p> },
  { q: "How do I report an incident or user harassing me?", a: <p>Use the contact form below and choose "Inappropriate Content or User". Include the user's name and what happened. (Sample answer.)</p> },
  { q: "How do I report a copyright or trademark violation?", a: <p>Use the contact form below and choose "Intellectual Property Matter", with a link to the content. (Sample answer.)</p> },
  { q: "Who has access to my information?", a: <p>Creators you follow or buy from can see the information described in our Privacy Policy. (Sample answer.)</p> },
  { q: "How do I manage or cancel my subscription?", a: <p>Go to Wallet &gt; My Purchases &gt; Subscriptions to change or cancel a subscription. (Sample answer.)</p> },
  { q: "How do I change my payment information?", a: <p>Go to Wallet &gt; Payment Methods to add or remove a card. (Sample answer.)</p> },
];

export function HelpFaqPage({ route }: PageProps) {
  const [q, setQ] = useState("");
  const [open, toggle] = useOpenSet();
  const [contact, setContact] = useState(false);
  const shown = HELP_FAQ.map((f, i) => ({ ...f, i })).filter((f) => f.q.toLowerCase().includes(q.toLowerCase()));
  return (
    <div data-testid={`page-${route.id}`} className="mx-auto max-w-[1146px]">
      <Breadcrumb title="Help Center & FAQ" />
      <div className="mt-[49px] flex items-center justify-between">
        <h3 className="text-[30px] font-medium leading-[36px]">Help Center &amp; FAQ</h3>
        <SearchPill value={q} onChange={setQ} placeholder="Search FAQs" testid="help-search" redIcon height={50} bg="bg-surface" className="w-[317px] !pl-[18px]" />
      </div>
      <div className="mt-[11px] space-y-[12px]">
        {shown.map((f) => (
          <FaqItem key={f.i} q={f.q} open={open.has(f.i)} onToggle={() => toggle(f.i)} testid={`help-faq-${f.i}`}>
            {f.a}
          </FaqItem>
        ))}
        {shown.length === 0 && <p className="py-[24px] text-center text-[14px] text-muted">No FAQs match your search.</p>}
      </div>
      <div className="mt-[48px] text-center text-[18px]">
        <p>Still have Questions?</p>
        <button type="button" data-testid="help-contact" onClick={() => setContact(true)} className="mt-[12px] text-accent hover:underline">
          We are here to Help
        </button>
      </div>
      {/* inferred: the contact form behind "We are here to Help" was not captured; it reuses the support form */}
      <CommsModal open={contact} onClose={() => setContact(false)} title="Contact Us" testid="modal-help-contact" width={620} top={60}>
        <SupportForm source="help-center" onDone={() => setContact(false)} />
      </CommsModal>
    </div>
  );
}

/* ------------------------------------------------------------------ legal */

type Section = { h: string; intro?: string; subs?: { h: string; p: string }[] };

const SAMPLE = "This is placeholder sample text for the demo. It stands in for the real legal copy owned by TopFan, Inc., which is not reproduced here.";

const TERMS: Section[] = [
  {
    h: "1. Changes to Terms of Service",
    subs: [
      { h: "(a) We reserve the right to change the Terms", p: `${SAMPLE} It describes, in general terms, that the Terms may be updated from time to time.` },
      { h: "(b) Terms Changes", p: `${SAMPLE} Keeping up with changes is the user's responsibility in the original document.` },
    ],
  },
  { h: "2. Accounts", subs: [{ h: "(a) Account Registration", p: SAMPLE }, { h: "(b) Account Security", p: SAMPLE }] },
  { h: "3. Your Content", subs: [{ h: "(a) Ownership", p: SAMPLE }, { h: "(b) Content Standards", p: SAMPLE }] },
  { h: "4. Creator Payouts", intro: SAMPLE },
  { h: "5. Consumer Protection - Fulfillment Period", intro: SAMPLE },
  { h: "6. Fraud Protection - Funds Settlement Period", intro: SAMPLE },
  { h: "7. Giveaways", intro: SAMPLE },
  { h: "8. Intellectual Property", intro: SAMPLE },
  { h: "9. Liability", intro: SAMPLE },
  { h: "10. Third-party services", intro: SAMPLE },
];

const PRIVACY: Section[] = [
  { h: "1. Information We Collect", intro: `${SAMPLE} The original section lists the kinds of account, profile and purchase information collected.` },
  { h: "2. How We Use Your Information", intro: SAMPLE },
  { h: "3. How We Share Your Information", intro: SAMPLE }, // inferred heading: spec lists only 1–2 then "…"
  { h: "4. Your Choices", intro: SAMPLE }, // inferred heading
  { h: "5. Contact Us", intro: SAMPLE }, // inferred heading
];

function LegalPage({ routeId, title, crumb, intro, sections }: { routeId: string; title: string; crumb: string; intro: string[]; sections: Section[] }) {
  return (
    <div data-testid={`page-${routeId}`} className="mx-auto max-w-[1146px]">
      <Breadcrumb title={crumb} />
      <h3 className="mt-[47px] text-[30px] font-medium leading-[36px]">{title}</h3>
      <article className="mt-[51px] rounded-[15px] bg-surface px-[30px] py-[50px] text-[16px] leading-[25px]">
        <p className="mb-[24px] rounded-tile border border-accent/60 bg-bg px-[16px] py-[10px] text-[14px] text-soft" data-testid={`${routeId}-sample-notice`}>
          Sample text: this page shows placeholder copy with the same structure as the original. It is not the actual TopFan legal text.
        </p>
        <p className="text-[20px] font-bold">Effective Date: March 1, 2025</p>
        {intro.map((p, i) => (
          <p key={i} className="mt-[24px]">
            {p}
          </p>
        ))}
        {sections.map((s) => (
          <section key={s.h} className="mt-[26px]">
            <h3 className="text-[18px] font-bold">{s.h}</h3>
            {s.intro && <p className="mt-[16px] pl-[20px]">{s.intro}</p>}
            {s.subs?.map((x) => (
              <div key={x.h} className="mt-[16px] pl-[20px]">
                <h4 className="font-bold">{x.h}</h4>
                <p className="mt-[12px] pl-[25px]">{x.p}</p>
              </div>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}

export function TermsPage({ route }: PageProps) {
  return (
    <LegalPage
      routeId={route.id}
      title="Terms of Service and Acceptable Use Policy"
      crumb="Terms of Service and Acceptable Use Policy"
      intro={[
        `${SAMPLE} In the original, this paragraph defines the agreement between you and TopFan, Inc. and the Service it covers.`,
        `${SAMPLE} In the original, this paragraph explains that using the Service means accepting these Terms.`,
      ]}
      sections={TERMS}
    />
  );
}

export function PrivacyPage({ route }: PageProps) {
  return (
    <LegalPage
      routeId={route.id}
      title="Privacy Policy"
      crumb="Privacy Policy"
      intro={[`${SAMPLE} In the original, this paragraph describes who the policy applies to, how it may change, and how to get in touch.`]}
      sections={PRIVACY}
    />
  );
}
