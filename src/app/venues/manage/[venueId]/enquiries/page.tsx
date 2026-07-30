import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { ArrowLeft, CalendarDays, Mail, Phone, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EnquiryActions } from "./enquiry-actions";

export const dynamic = "force-dynamic";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const statusStyle: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-800",
  available: "bg-emerald-100 text-emerald-800",
  confirmed: "bg-teal-100 text-teal-800",
  proposed_alternative: "bg-orange-100 text-orange-800",
  rejected: "bg-rose-100 text-rose-700",
  unavailable: "bg-rose-100 text-rose-700",
  cancelled: "bg-zinc-100 text-zinc-600",
  closed: "bg-zinc-100 text-zinc-600",
};

type Enquiry = {
  id: string;
  requester_name: string;
  requester_email: string | null;
  requester_phone: string;
  preferred_contact: string;
  event_type: string;
  event_date: string;
  time_slot: string;
  guest_count: number | null;
  message: string | null;
  status: string;
  response_message: string | null;
  alternative_date: string | null;
  alternative_time_slot: string | null;
  estimated_total: number | null;
  created_at: string;
  space: { name: string } | Array<{ name: string }> | null;
  package: { name: string } | Array<{ name: string }> | null;
  selected_addons: Array<{
    quantity: number;
    unit_price: number | null;
    addon: { name: string } | Array<{ name: string }> | null;
  }>;
};

export default async function VenueEnquiriesPage({ params }: { params: { venueId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/venues/manage/${params.venueId}/enquiries`);
  const { data: allowed } = await supabase.rpc("can_manage_venue", { target_venue_id: params.venueId });
  if (!allowed) notFound();

  const [{ data: venue }, { data: enquiries }] = await Promise.all([
    admin.from("venues").select("id, name").eq("id", params.venueId).maybeSingle(),
    admin
      .from("venue_enquiries")
      .select("id, requester_name, requester_email, requester_phone, preferred_contact, event_type, event_date, time_slot, guest_count, message, status, response_message, alternative_date, alternative_time_slot, estimated_total, created_at, space:venue_spaces(name), package:venue_packages(name), selected_addons:venue_enquiry_addons(quantity, unit_price, addon:venue_addons(name))")
      .eq("venue_id", params.venueId)
      .order("created_at", { ascending: false }),
  ]);
  if (!venue) notFound();
  const venueEnquiries = (enquiries || []) as unknown as Enquiry[];

  return (
    <div className="venuefind-page min-h-screen bg-[#faf6f2]">
      <header className="border-b border-[#ebe5de] bg-white">
        <div className="mx-auto flex min-h-[76px] max-w-[1180px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-10">
          <Link href={`/venues/manage/${venue.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-[#5f6b64] hover:text-[#ff5e36]"><ArrowLeft className="h-4 w-4" /> Venue calendar</Link>
          <Link href={`/venues/manage/${venue.id}`} className="rounded-full border border-[#ebe5de] px-4 py-2 text-sm font-semibold text-[#46534c]">Manage dates</Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1050px] px-5 py-12 sm:px-10 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff5e36]">Venue enquiries</p>
        <h1 className="venuefind-display mt-3 text-5xl tracking-[-0.04em] text-[#18231d]">{venue.name}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5f6b64]">Review each request, contact the person, and record a clear response. Confirming a booking blocks that date and time on the public calendar.</p>

        <div className="mt-9 space-y-5">
          {venueEnquiries.map((enquiry) => {
            const space = Array.isArray(enquiry.space) ? enquiry.space[0] : enquiry.space;
            const venuePackage = Array.isArray(enquiry.package) ? enquiry.package[0] : enquiry.package;
            return (
              <article key={enquiry.id} className="rounded-[20px] border border-[#ebe5de] bg-white p-6 shadow-[0_10px_28px_rgba(80,54,39,0.06)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="venuefind-display text-3xl text-[#18231d]">{enquiry.requester_name}</h2>
                    <p className="mt-1 text-sm text-[#5f6b64]">{enquiry.event_type}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${statusStyle[enquiry.status] || "bg-zinc-100 text-zinc-700"}`}>{label(enquiry.status)}</span>
                </div>
                <div className="mt-5 grid gap-3 rounded-xl bg-[#fffdfa] p-4 text-sm text-[#46534c] sm:grid-cols-2">
                  <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#ff5e36]" />{new Date(`${enquiry.event_date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {label(enquiry.time_slot)}</p>
                  <p className="flex items-center gap-2"><Users className="h-4 w-4 text-[#ff5e36]" />{enquiry.guest_count || "Not provided"} guests</p>
                  <a href={`tel:${enquiry.requester_phone}`} className="flex items-center gap-2 hover:text-[#ff5e36]"><Phone className="h-4 w-4" />{enquiry.requester_phone}</a>
                  {enquiry.requester_email && <a href={`mailto:${enquiry.requester_email}`} className="flex items-center gap-2 hover:text-[#ff5e36]"><Mail className="h-4 w-4" />{enquiry.requester_email}</a>}
                </div>
                {(space || venuePackage || enquiry.estimated_total) && (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#5f6b64]">
                    {space && <span className="rounded-full border border-[#ebe5de] px-3 py-1.5">{space.name}</span>}
                    {venuePackage && <span className="rounded-full border border-[#ebe5de] px-3 py-1.5">{venuePackage.name}</span>}
                    {enquiry.estimated_total && <span className="rounded-full border border-[#ebe5de] px-3 py-1.5">Estimate SLE {Number(enquiry.estimated_total).toLocaleString()}</span>}
                  </div>
                )}
                {enquiry.selected_addons?.length > 0 && (
                  <p className="mt-3 text-xs text-[#5f6b64]">
                    Extras: {enquiry.selected_addons
                      .map((selection) => Array.isArray(selection.addon) ? selection.addon[0]?.name : selection.addon?.name)
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
                {enquiry.message && <p className="mt-4 rounded-xl border-l-4 border-[#ffd1c5] bg-[#fff8f4] p-4 text-sm leading-6 text-[#5f6b64]">{enquiry.message}</p>}
                <EnquiryActions venueId={venue.id} enquiryId={enquiry.id} currentStatus={enquiry.status} />
              </article>
            );
          })}
          {!venueEnquiries.length && (
            <div className="rounded-[20px] border border-dashed border-[#ead8bd] bg-white p-10 text-center">
              <Mail className="mx-auto h-9 w-9 text-[#ff5e36]" />
              <h2 className="venuefind-display mt-4 text-3xl text-[#18231d]">No enquiries yet</h2>
              <p className="mt-2 text-sm text-[#5f6b64]">New availability requests will appear here.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
