import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, Building2, Clock3, Eye, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

const statusStyles: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  pending_review: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-800",
  suspended: "bg-rose-100 text-rose-800",
  rejected: "bg-rose-100 text-rose-800",
};

function statusLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function ManageVenuesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/venues/manage");

  const { data: platformAdmin } = await supabase.rpc("is_radius_platform_admin");
  const { data: memberships } = platformAdmin
    ? { data: [] }
    : await admin
        .from("venue_members")
        .select("venue_id")
        .or(`user_id.eq.${user.id}${user.email ? `,email.ilike.${user.email}` : ""}`)
        .eq("status", "active");
  const venueIds = Array.from(new Set((memberships || []).map((membership) => membership.venue_id)));
  const { data: venues } = platformAdmin
    ? await admin
        .from("venues")
        .select("id, name, slug, area, city, venue_type, status, verification_status, updated_at")
        .order("updated_at", { ascending: false })
    : venueIds.length
      ? await admin
        .from("venues")
        .select("id, name, slug, area, city, venue_type, status, verification_status, updated_at")
        .in("id", venueIds)
        .order("updated_at", { ascending: false })
      : { data: [] };

  return (
    <div className="venuefind-page min-h-screen bg-[#faf6f2]">
      <header className="h-[76px] border-b border-[#ebe5de] bg-white">
        <div className="mx-auto flex h-full max-w-[1380px] items-center justify-between px-5 sm:px-10 lg:px-16">
          <Link href="/venues" className="inline-flex items-center gap-2 text-sm font-medium text-[#5f6b64] hover:text-[#ff5e36]">
            <ArrowLeft className="h-4 w-4" /> Venue discovery
          </Link>
          <Link href="/venues/new" className="inline-flex items-center gap-2 rounded-full bg-[#ff5e36] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e84c27]">
            <Plus className="h-4 w-4" /> List another venue
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-5 py-14 sm:px-10 sm:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff5e36]">Venue owner account</p>
        <h1 className="venuefind-display mt-3 text-5xl leading-tight tracking-[-0.04em] text-[#18231d] sm:text-6xl">Your venue listings</h1>
        <p className="mt-5 max-w-2xl leading-7 text-[#5f6b64]">
          Follow each submission through review and see which venue profiles are currently public.
        </p>

        {venues?.length ? (
          <div className="mt-10 grid gap-4">
            {venues.map((venue) => (
              <article key={venue.id} className="flex flex-col gap-5 rounded-[18px] border border-[#ebe5de] bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#fff1d3] text-[#e84c27]">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="venuefind-display text-2xl text-[#18231d]">{venue.name}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusStyles[venue.status] || statusStyles.draft}`}>
                        {statusLabel(venue.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#5f6b64]">{venue.area}, {venue.city}</p>
                    {venue.status === "pending_review" && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#896f3d]">
                        <Clock3 className="h-3.5 w-3.5" /> Radius is reviewing this venue before publication.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link href={`/venues/manage/${venue.id}`} className="inline-flex items-center gap-2 rounded-full bg-[#ff5e36] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e84c27]">
                    Manage calendar <ArrowRight className="h-4 w-4" />
                  </Link>
                  {venue.status === "published" ? (
                    <Link href={`/venues/${venue.slug}`} className="inline-flex items-center gap-2 rounded-full border border-[#ebe5de] px-4 py-2.5 text-sm font-semibold text-[#46534c] hover:border-[#ff5e36] hover:text-[#e84c27]">
                      <Eye className="h-4 w-4" /> View public page
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#f7f1e9] px-4 py-2.5 text-sm font-semibold text-[#7b857f]">
                      Review in progress <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-[22px] border border-dashed border-[#ead8bd] bg-white p-10 text-center">
            <Building2 className="mx-auto h-9 w-9 text-[#ff5e36]" />
            <h2 className="venuefind-display mt-4 text-3xl text-[#18231d]">No venue submissions yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5f6b64]">Start a venue profile and submit its information and photographs for review.</p>
            <Link href="/venues/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ff5e36] px-5 py-3 text-sm font-semibold text-white">
              List a venue <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
