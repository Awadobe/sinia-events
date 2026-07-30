"use client";

import { useMemo, useState } from "react";
import { addMonths, format, getDay, getDaysInMonth, startOfMonth } from "date-fns";
import { ArrowLeft, ArrowRight, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Availability = {
  id: string;
  date: string;
  time_slot: string;
  status: string;
  notes: string | null;
  verified_at: string | null;
};

const statuses = [
  ["available", "Available"],
  ["confirmation_required", "Confirmation required"],
  ["held", "Held"],
  ["booked", "Booked"],
  ["blocked", "Blocked"],
] as const;

const timeSlots = [
  ["morning", "Morning"],
  ["afternoon", "Afternoon"],
  ["evening", "Evening"],
  ["full_day", "Full day"],
] as const;

const statusStyle: Record<string, string> = {
  available: "bg-emerald-500 text-white",
  confirmation_required: "bg-amber-400 text-amber-950",
  held: "bg-orange-500 text-white",
  booked: "bg-rose-500 text-white",
  blocked: "bg-zinc-600 text-white",
};

export function AvailabilityManager({ venueId, initialAvailability }: { venueId: string; initialAvailability: Availability[] }) {
  const [entries, setEntries] = useState(initialAvailability);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [timeSlot, setTimeSlot] = useState("full_day");
  const [status, setStatus] = useState("available");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const byDate = useMemo(() => {
    const result = new Map<string, Availability[]>();
    entries.forEach((entry) => result.set(entry.date, [...(result.get(entry.date) || []), entry]));
    return result;
  }, [entries]);

  const cells = [
    ...Array(getDay(month)).fill(null),
    ...Array.from({ length: getDaysInMonth(month) }, (_, index) => index + 1),
  ];
  const selectedEntry = entries.find((entry) => entry.date === selectedDate && entry.time_slot === timeSlot);

  async function save() {
    setSaving(true);
    const response = await fetch(`/api/venues/${venueId}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDate, timeSlot, status, notes }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      toast.error(result.error || "Availability could not be saved.");
      return;
    }
    setEntries((current) => [...current.filter((entry) => entry.id !== result.availability.id), result.availability]);
    toast.success("Calendar updated.");
  }

  async function remove() {
    if (!selectedEntry) return;
    setSaving(true);
    const response = await fetch(`/api/venues/${venueId}/availability?id=${selectedEntry.id}`, { method: "DELETE" });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      toast.error(result.error || "The calendar entry could not be removed.");
      return;
    }
    setEntries((current) => current.filter((entry) => entry.id !== selectedEntry.id));
    toast.success("Date returned to confirmation required.");
  }

  function choose(day: number) {
    const date = format(new Date(month.getFullYear(), month.getMonth(), day), "yyyy-MM-dd");
    setSelectedDate(date);
    const entry = entries.find((item) => item.date === date && item.time_slot === timeSlot);
    setStatus(entry?.status || "available");
    setNotes(entry?.notes || "");
  }

  function changeSlot(nextSlot: string) {
    setTimeSlot(nextSlot);
    const entry = entries.find((item) => item.date === selectedDate && item.time_slot === nextSlot);
    setStatus(entry?.status || "available");
    setNotes(entry?.notes || "");
  }

  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-[20px] border border-[#ebe5de] bg-white p-5 sm:p-7">
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Previous month" onClick={() => setMonth((current) => addMonths(current, -1))} className="rounded-full border border-[#ebe5de] p-2"><ArrowLeft className="h-4 w-4" /></button>
          <h2 className="venuefind-display text-3xl text-[#18231d]">{format(month, "MMMM yyyy")}</h2>
          <button type="button" aria-label="Next month" onClick={() => setMonth((current) => addMonths(current, 1))} className="rounded-full border border-[#ebe5de] p-2"><ArrowRight className="h-4 w-4" /></button>
        </div>
        <div className="mt-6 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-[#9aa19d]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {cells.map((day, index) => {
            if (day === null) return <span key={`empty-${index}`} />;
            const date = format(new Date(month.getFullYear(), month.getMonth(), day), "yyyy-MM-dd");
            const dateEntries = byDate.get(date) || [];
            const fullDay = dateEntries.find((entry) => entry.time_slot === "full_day");
            const strongest = fullDay || dateEntries[0];
            return (
              <button key={day} type="button" onClick={() => choose(day)} className={`relative aspect-square rounded-xl border text-sm font-semibold transition ${selectedDate === date ? "border-[#ff5e36] ring-2 ring-[#ff5e36]/20" : "border-[#ebe5de] hover:border-[#ffb9a7]"} ${strongest ? statusStyle[strongest.status] : "bg-[#fffdfa] text-[#46534c]"}`}>
                {day}
                {dateEntries.length > 1 && <span className="absolute bottom-1 right-1 rounded-full bg-white/80 px-1 text-[8px] text-zinc-700">{dateEntries.length}</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap gap-3 text-[10px] text-[#6f7973]">
          {statuses.map(([value, label]) => <span key={value}><i className={`mr-1 inline-block h-2.5 w-2.5 rounded-full ${statusStyle[value].split(" ")[0]}`} />{label}</span>)}
        </div>
      </section>

      <aside className="rounded-[20px] border border-[#ebe5de] bg-white p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff5e36]">Update a date</p>
        <h2 className="venuefind-display mt-2 text-3xl text-[#18231d]">{format(new Date(`${selectedDate}T12:00:00`), "d MMMM yyyy")}</h2>
        <label className="mt-5 block text-sm font-semibold text-[#46534c]">
          Time
          <select value={timeSlot} onChange={(event) => changeSlot(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ddd4cb] bg-white px-3 py-3 font-normal">
            {timeSlots.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="mt-4 block text-sm font-semibold text-[#46534c]">
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ddd4cb] bg-white px-3 py-3 font-normal">
            {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="mt-4 block text-sm font-semibold text-[#46534c]">
          Private note <span className="font-normal text-[#9aa19d]">(optional)</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-2 w-full resize-none rounded-xl border border-[#ddd4cb] px-3 py-3 font-normal" placeholder="Why this date is held or blocked" />
        </label>
        <button type="button" disabled={saving} onClick={save} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff5e36] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save date status
        </button>
        {selectedEntry && (
          <button type="button" disabled={saving} onClick={remove} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600">
            <Trash2 className="h-4 w-4" /> Remove this status
          </button>
        )}
        <p className="mt-4 text-[11px] leading-5 text-[#7b857f]">Removing a status makes the date show as “confirmation required” to visitors.</p>
      </aside>
    </div>
  );
}
