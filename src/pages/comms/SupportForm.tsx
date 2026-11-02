/**
 * "Have a question or need to resolve a technical issue?" support form (P17c). Also used by the Help Center's
 * "We are here to Help" link (inferred). SUBMIT stays disabled until both required fields are filled.
 * Mock: the request is stored locally, nothing is sent.
 */
import { useState } from "react";
import { MessageCircleMore } from "lucide-react";
import { act } from "../../store/store";
import { INQUIRY_TYPES, submitSupportRequest, type SupportRequest } from "../../store/slices/comms";
import { Button, Select } from "../../platform/ui/controls";
import { useToast } from "../../platform/ui/toast";
import { CountedTextarea } from "./ui";

export function SupportForm({ source, onDone }: { source: SupportRequest["from"]; onDone?: () => void }) {
  const toast = useToast();
  const [type, setType] = useState<string | null>(null);
  const [text, setText] = useState("");
  const valid = !!type && text.trim().length > 0;
  return (
    <form
      data-testid={`support-form-${source}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        const res = act("comms.submitSupportRequest", (d) => submitSupportRequest(d, type!, text, source));
        if (!res.ok) return toast(res.reason);
        toast("Thanks! Your request has been sent. We'll be in touch shortly."); // inferred copy
        setType(null);
        setText("");
        onDone?.();
      }}
    >
      <span className="relative inline-flex">
        <MessageCircleMore size={44} strokeWidth={1.8} className="text-white" />
      </span>
      <h3 className="mt-[12px] text-[20px] font-bold">Have a question or need to resolve a technical issue?</h3>
      <p className="mt-[8px] text-[14px] text-muted">We are here to help you succeed! Ask your questions using the form and we'll be in touch with you shortly.</p>
      <label className="mb-[16px] mt-[36px] block text-[16px]">Inquiry Type*</label>
      <div className="w-[427px] max-w-full" data-testid={`support-type-${source}`}>
        <Select value={type} options={INQUIRY_TYPES} placeholder="Select Inquiry Type" onChange={setType} />
      </div>
      <label htmlFor={`support-text-${source}`} className="mb-[16px] mt-[22px] block text-[16px]">
        How can we help you?*
      </label>
      <CountedTextarea id={`support-text-${source}`} testid={`support-text-${source}`} value={text} onChange={setText} placeholder="Please provide details here..." className="h-[110px] rounded-card" />
      <Button type="submit" data-testid={`support-submit-${source}`} disabled={!valid} className="mt-[8px] w-[100px]">
        Submit
      </Button>
    </form>
  );
}
