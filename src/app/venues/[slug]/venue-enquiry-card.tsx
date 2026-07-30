"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { addMonths, format, getDay, getDaysInMonth, isBefore, startOfDay, startOfMonth } from "date-fns";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

type Availability = {
  date: string;
  status: "available" | "confirmation_required" | "held" | "booked" | "blocked";
  time_slot: "morning" | "afternoon" | "evening" | "full_day";
};

type VenueSpace = { id: string; name: string };
type VenuePackage = {
  id: string;
  space_id: string | null;
  name: string;
  description: string | null;
  price: number | null;
  price_basis: string;
};
type VenueAddon = {
  id: string;
  space_id: string | null;
  name: string;
  description: string | null;
  price: number | null;
  price_basis: string;
};

const timeSlots = [
  ["morning", "Morning"],
  ["afternoon", "Afternoon"],
  ["evening", "Evening"],
  ["full_day", "Full day"],
] as const;

function money(value: number | null) {
  return value === null ? "Price on request" : `SLE ${Number(value).toLocaleString()}`;
}

export function VenueEnquiryCard({
  venueId,
  venueName,
  availability,
  spaces,
  packages,
  addons,
}: {
  venueId: string;
  venueName: string;
  availability: Availability[];
  spaces: VenueSpace[];
  packages: VenuePackage[];
  addons: VenueAddon[];
}) {
  const today = startOfDay(new Date());
  const [month, setMonth] = useState(startOfMonth(today));
  const [liveAvailability, setLiveAvailability] = useState(availability);
  const [selectedDate, setSelectedDate] = useState("");
  const [timeSlot, setTimeSlot] = useState<(typeof timeSlots)[number][0]>("full_day");
  const [spaceId, setSpaceId] = useState(spaces.length === 1 ? spaces[0].id : "");
  const [packageId, setPackageId] = useState("");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [showContact, setShowContact] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  const statusByDate = useMemo(() => {
    const map = new Map<string, Availability[]>();
    liveAvailability.forEach((item) => map.set(item.date, [...(map.get(item.date) || []), item]));
    return map;
  }, [liveAvailability]);

  useEffect(() => {
    let active = true;
    fetch(`/api/venues/${venueId}/availability/public`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Availability could not be refreshed.");
        return response.json();
      })
      .then((result) => {
        if (active && Array.isArray(result.availability)) setLiveAvailability(result.availability);
      })
      .catch((refreshError) => console.error(refreshError));
    return () => { active = false; };
  }, [venueId]);

  const visiblePackages = packages.filter((item) => !item.space_id || !spaceId || item.space_id === spaceId);
  const visibleAddons = addons.filter((item) => !item.space_id || !spaceId || item.space_id === spaceId);
  const selectedPackage = packages.find((item) => item.id === packageId);
  const estimate =
    (selectedPackage?.price || 0) +
    addons.filter((item) => addonIds.includes(item.id)).reduce((sum, item) => sum + (item.price || 0), 0);

  const offset = getDay(month);
  const cells = [...Array(offset).fill(null), ...Array.from({ length: getDaysInMonth(month) }, (_, index) => index + 1)];

  function dateState(day: number) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const key = format(date, "yyyy-MM-dd");
    const entries = statusByDate.get(key) || [];
    if (timeSlot === "full_day") {
      for (const unavailable of ["booked", "blocked", "held"] as const) {
        if (entries.some((item) => item.status === unavailable)) return unavailable;
      }
      if (entries.some((item) => item.status === "available" && item.time_slot === "full_day")) return "available";
      return "confirmation_required";
    }
    const exact = entries.find((item) => item.time_slot === timeSlot);
    const fullDay = entries.find((item) => item.time_slot === "full_day");
    const entry = exact || fullDay;
    if (isBefore(date, today)) return "past";
    return entry?.status || "confirmation_required";
  }

  function chooseDate(day: number) {
    const state = dateState(day);
    if (["past", "held", "booked", "blocked"].includes(state)) return;
    setSelectedDate(format(new Date(month.getFullYear(), month.getMonth(), day), "yyyy-MM-dd"));
    setShowContact(false);
    setError("");
  }

  function toggleAddon(id: string) {
    setAddonIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/venues/${venueId}/enquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventDate: selectedDate,
        timeSlot,
        spaceId: spaceId || null,
        packageId: packageId || null,
        addonIds,
        eventType: String(form.get("eventType") || ""),
        guestCount: Number(form.get("guestCount") || 0),
        requesterName: String(form.get("requesterName") || ""),
        requesterPhone: String(form.get("requesterPhone") || ""),
        requesterEmail: String(form.get("requesterEmail") || ""),
        preferredContact: String(form.get("preferredContact") || "whatsapp"),
        message: String(form.get("message") || ""),
        website: String(form.get("website") || ""),
      }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error || "The enquiry could not be sent.");
      return;
    }
    setReference(result.reference || "Submitted");
  }

  if (reference) {
    return (
      <div className="rounded-[19px] border border-emerald-200 bg-white p-7 text-center shadow-[0_16px_40px_rgba(80,54,39,0.09)]">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Enquiry received</p>
        <h2 className="venuefind-display mt-2 text-3xl text-[#18231d]">The venue will confirm your date.</h2>
        <p className="mt-3 text-sm leading-6 text-[#5f6b64]">
          Your request for {venueName} has been recorded. It is not a confirmed reservation yet.
        </p>
        <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">Reference: {reference}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[19px] border border-[#ebe5de] bg-white p-6 shadow-[0_16px_40px_rgba(80,54,39,0.09)] sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff5e36]">Plan your occasion</p>
      <h2 className="venuefind-display mt-2 text-4xl leading-tight tracking-[-0.025em] text-[#18231d]">Choose your preferred date</h2>
      <p className="mt-2 text-xs leading-5 text-[#7b857f]">Your selection sends an enquiry. The venue must approve it before it is reserved.</p>

      {spaces.length > 1 && (
        <label className="mt-5 block text-sm font-semibold text-[#46534c]">
          Venue space
          <select value={spaceId} onChange={(event) => { setSpaceId(event.target.value); setPackageId(""); setAddonIds([]); }} className="mt-2 w-full rounded-xl border border-[#ddd4cb] bg-white px-3 py-3 text-sm">
            <option value="">Choose a space</option>
            {spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
          </select>
        </label>
      )}

      <div className="mt-5">
        <p className="text-sm font-semibold text-[#46534c]">Preferred time</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {timeSlots.map(([value, label]) => (
            <button key={value} type="button" onClick={() => { setTimeSlot(value); setSelectedDate(""); }} className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${timeSlot === value ? "border-[#ff5e36] bg-[#fff0eb] text-[#d94322]" : "border-[#ebe5de] text-[#5f6b64] hover:border-[#ffb9a7]"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => setMonth((current) => addMonths(current, -1))} disabled={month <= startOfMonth(today)} className="rounded-full border border-[#ebe5de] p-2 disabled:opacity-30"><ArrowLeft className="h-4 w-4" /></button>
        <strong className="text-sm text-[#18231d]">{format(month, "MMMM yyyy")}</strong>
        <button type="button" aria-label="Next month" onClick={() => setMonth((current) => addMonths(current, 1))} className="rounded-full border border-[#ebe5de] p-2"><ArrowRight className="h-4 w-4" /></button>
      </div>
      <div className="mt-4 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-[#9aa19d]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) return <span key={`empty-${index}`} />;
          const key = format(new Date(month.getFullYear(), month.getMonth(), day), "yyyy-MM-dd");
          const state = dateState(day);
          const disabled = ["past", "held", "booked", "blocked"].includes(state);
          const selected = selectedDate === key;
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => chooseDate(day)}
              aria-label={`${format(new Date(month.getFullYear(), month.getMonth(), day), "MMMM d, yyyy")}: ${state.replaceAll("_", " ")}`}
              className={`aspect-square rounded-lg text-xs font-semibold transition ${
                selected ? "bg-[#ff5e36] text-white" :
                state === "available" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" :
                state === "confirmation_required" ? "bg-amber-50 text-amber-800 hover:bg-amber-100" :
                "cursor-not-allowed bg-zinc-100 text-zinc-300"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-[#6f7973]">
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-200" />Recently available</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-100" />Confirmation required</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-zinc-200" />Unavailable</span>
      </div>

      {selectedDate && !showContact && (
        <div className="mt-6 border-t border-[#ebe5de] pt-6">
          <p className="text-sm font-semibold text-[#18231d]">{format(new Date(`${selectedDate}T12:00:00`), "EEEE, d MMMM yyyy")}</p>
          {visiblePackages.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-semibold text-[#46534c]">Choose a package <span className="font-normal text-[#9aa19d]">(optional)</span></p>
              <div className="mt-2 space-y-2">
                {visiblePackages.map((item) => (
                  <label key={item.id} className={`block cursor-pointer rounded-xl border p-3 ${packageId === item.id ? "border-[#ff5e36] bg-[#fff8f4]" : "border-[#ebe5de]"}`}>
                    <input type="radio" name="venuePackage" className="sr-only" checked={packageId === item.id} onChange={() => setPackageId(item.id)} />
                    <span className="flex items-start justify-between gap-3 text-sm font-semibold text-[#18231d]"><span>{item.name}</span><span className="whitespace-nowrap text-[#d94322]">{money(item.price)}</span></span>
                    {item.description && <span className="mt-1 block text-xs leading-5 text-[#7b857f]">{item.description}</span>}
                  </label>
                ))}
              </div>
            </div>
          )}
          {visibleAddons.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-semibold text-[#46534c]">Optional extras</p>
              <div className="mt-2 space-y-2">
                {visibleAddons.map((item) => (
                  <label key={item.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#ebe5de] p-3 text-sm">
                    <span className="flex items-center gap-2"><input type="checkbox" checked={addonIds.includes(item.id)} onChange={() => toggleAddon(item.id)} />{item.name}</span>
                    <strong className="whitespace-nowrap text-[#d94322]">{money(item.price)}</strong>
                  </label>
                ))}
              </div>
            </div>
          )}
          {(selectedPackage || addonIds.length > 0) && (
            <div className="mt-5 flex items-center justify-between rounded-xl bg-[#fff4d8] p-3 text-sm text-[#74500d]">
              <span>Estimated cost<small className="block font-normal">Final price requires confirmation</small></span>
              <strong>{estimate > 0 ? `SLE ${estimate.toLocaleString()}` : "On request"}</strong>
            </div>
          )}
          <button type="button" onClick={() => setShowContact(true)} className="mt-5 w-full rounded-xl bg-[#ff5e36] px-4 py-3 text-sm font-semibold text-white hover:bg-[#e84c27]">
            Continue with this date
          </button>
        </div>
      )}

      {showContact && (
        <form onSubmit={submit} className="mt-6 space-y-4 border-t border-[#ebe5de] pt-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#ff5e36]">Your enquiry</p>
            <p className="mt-1 text-sm text-[#5f6b64]">{format(new Date(`${selectedDate}T12:00:00`), "d MMMM yyyy")} · {timeSlots.find(([value]) => value === timeSlot)?.[1]}</p>
          </div>
          <label className="block text-sm font-semibold text-[#46534c]">Event type<input name="eventType" required placeholder="e.g. Wedding or conference" className="mt-2 w-full rounded-xl border border-[#ddd4cb] px-3 py-3 font-normal" /></label>
          <label className="block text-sm font-semibold text-[#46534c]">Number of guests<input name="guestCount" required min="1" type="number" className="mt-2 w-full rounded-xl border border-[#ddd4cb] px-3 py-3 font-normal" /></label>
          <label className="block text-sm font-semibold text-[#46534c]">Full name<input name="requesterName" required autoComplete="name" className="mt-2 w-full rounded-xl border border-[#ddd4cb] px-3 py-3 font-normal" /></label>
          <label className="block text-sm font-semibold text-[#46534c]">Phone or WhatsApp<input name="requesterPhone" required type="tel" autoComplete="tel" placeholder="+232…" className="mt-2 w-full rounded-xl border border-[#ddd4cb] px-3 py-3 font-normal" /></label>
          <label className="block text-sm font-semibold text-[#46534c]">Email address <span className="font-normal text-[#9aa19d]">(optional)</span><input name="requesterEmail" type="email" autoComplete="email" className="mt-2 w-full rounded-xl border border-[#ddd4cb] px-3 py-3 font-normal" /></label>
          <label className="block text-sm font-semibold text-[#46534c]">Preferred contact<select name="preferredContact" className="mt-2 w-full rounded-xl border border-[#ddd4cb] bg-white px-3 py-3 font-normal"><option value="whatsapp">WhatsApp</option><option value="phone">Phone call</option><option value="email">Email</option></select></label>
          <label className="block text-sm font-semibold text-[#46534c]">Anything the venue should know? <span className="font-normal text-[#9aa19d]">(optional)</span><textarea name="message" rows={3} className="mt-2 w-full resize-none rounded-xl border border-[#ddd4cb] px-3 py-3 font-normal" /></label>
          <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <label className="flex gap-2 text-xs leading-5 text-[#5f6b64]"><input type="checkbox" required className="mt-1" />I agree that Radius and the venue may contact me about this request.</label>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff5e36] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Send availability enquiry
          </button>
          <p className="text-center text-[11px] leading-5 text-[#8c948f]">Submitting does not confirm or reserve the venue.</p>
        </form>
      )}
    </div>
  );
}
