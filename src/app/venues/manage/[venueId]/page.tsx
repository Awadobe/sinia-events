import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { ArrowLeft, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AvailabilityManager } from "./availability-manager";

export const dynamic = "force-dynamic";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

export default async function VenueManagementPage({ params }: { params: { venueId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/venues/manage/${params.venueId}`);

  const { data: allowed } = await supabase.rpc("can_manage_venue", { target_venue_id: params.venueId });
  if (!allowed) notFound();

  const [{ data: venue }, { data: availability }] = await Promise.all([
    admin.from("venues").select("id, name, slug, status").eq("id", params.venueId).maybeSingle(),
    admin
      .from("venue_availability")
      .select("id, date, time_slot, status, notes, verified_at")
      .eq("venue_id", params.venueId)
      .order("date"),
  ]);
  if (!venue) notFound();

  return (
    <div className="venuefind-page min-h-screen bg-[#faf6f2]">
      <header className="border-b border-[#ebe5de] bg-white">
        <div className="mx-auto flex min-h-[76px] max-w-[1380px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-10 lg:px-16">
          <Link href="/venues/manage" className="inline-flex items-center gap-2 text-sm font-medium text-[#5f6b64] hover:text-[#ff5e36]"><ArrowLeft className="h-4 w-4" /> Your venues</Link>
          {venue.status === "published" && <Link href={`/venues/${venue.slug}`} className="inline-flex items-center gap-2 rounded-full border border-[#ebe5de] px-4 py-2 text-sm font-semibold text-[#46534c]"><Eye className="h-4 w-4" /> View public page</Link>}
        </div>
      </header>
      <main className="mx-auto max-w-[1180px] px-5 py-12 sm:px-10 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff5e36]">Venue calendar</p>
        <h1 className="venuefind-display mt-3 text-5xl tracking-[-0.04em] text-[#18231d]">{venue.name}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5f6b64]">Keep date information honest and current. Visitors can still send an enquiry, but blocked, held, and booked dates cannot be selected.</p>
        <div className="mt-9">
          <AvailabilityManager venueId={venue.id} initialAvailability={availability || []} />
        </div>
      </main>
    </div>
  );
}
