"use client";

import { useState } from "react";
import { Check, Loader2, Mail, RefreshCw, Send, X } from "lucide-react";
import { toast } from "sonner";

const timeSlots = [
  ["morning", "Morning"],
  ["afternoon", "Afternoon"],
  ["evening", "Evening"],
  ["full_day", "Full day"],
] as const;

export function EnquiryActions({
  venueId,
  enquiryId,
  currentStatus,
  initialMessage,
  initialAlternativeDate,
  initialAlternativeTimeSlot,
  requesterEmail,
  initialEmailDelivered,
}: {
  venueId: string;
  enquiryId: string;
  currentStatus: string;
  initialMessage: string;
  initialAlternativeDate: string;
  initialAlternativeTimeSlot: string;
  requesterEmail: string | null;
  initialEmailDelivered: boolean;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [message, setMessage] = useState(initialMessage);
  const [alternativeDate, setAlternativeDate] = useState(initialAlternativeDate);
  const [alternativeTimeSlot, setAlternativeTimeSlot] = useState(initialAlternativeTimeSlot);
  const [emailDelivered, setEmailDelivered] = useState(initialEmailDelivered);
  const [saving, setSaving] = useState("");

  async function respond(nextStatus: string) {
    setSaving(nextStatus);
    const response = await fetch(`/api/venues/${venueId}/enquiries/${enquiryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: nextStatus,
        responseMessage: message,
        alternativeDate: nextStatus === "proposed_alternative" ? alternativeDate : null,
        alternativeTimeSlot: nextStatus === "proposed_alternative" ? alternativeTimeSlot : null,
      }),
    });
    const result = await response.json();
    setSaving("");
    if (!response.ok) {
      toast.error(result.error || "The response could not be saved.");
      return;
    }
    setStatus(result.enquiry.status);
    setEmailDelivered(Boolean(result.emailDelivered));
    if (!result.emailDelivered) {
      toast.warning("The response was saved, but no email was delivered. Contact the requester by phone or WhatsApp.");
      return;
    }
    toast.success(
      nextStatus === "confirmed" ? "Booking confirmed and calendar updated." :
      nextStatus === "available" ? "Date marked available for this requester." :
      nextStatus === "proposed_alternative" ? "Alternative date saved." :
      "Enquiry updated."
    );
  }

  async function retryEmail() {
    setSaving("email");
    const response = await fetch(`/api/venues/${venueId}/enquiries/${enquiryId}`, { method: "POST" });
    const result = await response.json();
    setSaving("");
    if (!response.ok || !result.emailDelivered) {
      toast.error(result.error || "The email could not be delivered. Check Resend or contact the requester directly.");
      return;
    }
    setEmailDelivered(true);
    toast.success("Email delivered.");
  }

  return (
    <div className="mt-5 border-t border-[#ebe5de] pt-5">
      <label className="block text-xs font-semibold text-[#5f6b64]">
        Saved response to the requester
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} className="mt-2 w-full resize-none rounded-xl border border-[#ddd4cb] px-3 py-3 text-sm font-normal" placeholder="Add a helpful explanation, instructions, or next steps" />
      </label>

      <div className={`mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl p-3 text-xs ${emailDelivered ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
        <span className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{requesterEmail ? (emailDelivered ? `Email delivered to ${requesterEmail}` : `Email not delivered to ${requesterEmail}`) : "No requester email was provided"}</span>
        {requesterEmail && !emailDelivered && (
          <button type="button" onClick={retryEmail} disabled={Boolean(saving)} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 font-semibold shadow-sm disabled:opacity-50">
            {saving === "email" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Retry email
          </button>
        )}
      </div>

      <details className="mt-3 rounded-xl border border-[#ebe5de] bg-[#fffdfa] p-3">
        <summary className="cursor-pointer text-xs font-semibold text-[#46534c]">Suggest a different date</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input type="date" value={alternativeDate} onChange={(event) => setAlternativeDate(event.target.value)} className="rounded-lg border border-[#ddd4cb] px-3 py-2 text-sm" />
          <select value={alternativeTimeSlot} onChange={(event) => setAlternativeTimeSlot(event.target.value)} className="rounded-lg border border-[#ddd4cb] bg-white px-3 py-2 text-sm">
            {timeSlots.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <button type="button" disabled={!alternativeDate || Boolean(saving)} onClick={() => respond("proposed_alternative")} className="mt-3 flex items-center gap-2 rounded-lg bg-[#fff0eb] px-3 py-2 text-xs font-semibold text-[#d94322] disabled:opacity-40">
          {saving === "proposed_alternative" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Save alternative
        </button>
      </details>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={Boolean(saving)} onClick={() => respond("available")} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-800">
          {saving === "available" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Date is available
        </button>
        <button type="button" disabled={Boolean(saving)} onClick={() => respond("confirmed")} className="inline-flex items-center gap-1.5 rounded-full bg-[#173f41] px-4 py-2 text-xs font-semibold text-white">
          {saving === "confirmed" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Confirm booking
        </button>
        <button type="button" disabled={Boolean(saving)} onClick={() => respond("rejected")} className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-4 py-2 text-xs font-semibold text-rose-700">
          {saving === "rejected" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Cannot accommodate
        </button>
      </div>
      <p className="mt-3 text-[11px] text-[#8c948f]">Current status: <strong className="text-[#46534c]">{status.replaceAll("_", " ")}</strong></p>
    </div>
  );
}
