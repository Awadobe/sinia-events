import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Building2,
  CalendarCheck2,
  Check,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function VenueDetailPage({ params }: { params: { slug: string } }) {
  const { data: venue } = await admin
    .from("venues")
    .select("*")
    .eq("slug", params.slug)
    .eq("status", "published")
    .maybeSingle();

  if (!venue) notFound();

  const [{ data: media }, { data: spaces }, { data: packages }, { data: availability }] =
    await Promise.all([
      admin
        .from("venue_media")
        .select("id, url, alt_text, is_cover, display_order")
        .eq("venue_id", venue.id)
        .order("is_cover", { ascending: false })
        .order("display_order"),
      admin
        .from("venue_spaces")
        .select("id, name, space_type, description, theatre_capacity, classroom_capacity, banquet_capacity, standing_capacity")
        .eq("venue_id", venue.id)
        .eq("is_active", true),
      admin
        .from("venue_packages")
        .select("id, name, description, price, price_basis, included_items")
        .eq("venue_id", venue.id)
        .eq("is_active", true)
        .order("price"),
      admin
        .from("venue_availability")
        .select("date, status, verified_at")
        .eq("venue_id", venue.id)
        .gte("date", new Date().toISOString().slice(0, 10))
        .order("date")
        .limit(6),
    ]);

  const gallery = media || [];
  const cover = gallery[0];

  return (
    <div className="min-h-screen bg-[#f6f3ed]">
      <header className="border-b border-black/5 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold text-zinc-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white">R</span>
            Radius
          </Link>
          <Link href="/venues" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900">
            <ArrowLeft className="h-4 w-4" /> All venues
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
        <section className="grid gap-7 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-orange-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                {label(venue.venue_type)}
              </span>
              {venue.verification_status === "verified" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified venue
                </span>
              )}
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">{venue.name}</h1>
            <p className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
              <MapPin className="h-4 w-4 text-orange-600" /> {venue.area}, {venue.city}
            </p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-zinc-600">
            <p className="flex items-center gap-2 font-semibold text-zinc-900">
              <CalendarCheck2 className="h-4 w-4 text-orange-600" /> Availability requires confirmation
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
              A displayed open date is not a reservation. Radius reconfirms it before you proceed.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-3 lg:grid-cols-[2fr_1fr]">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-100 via-rose-100 to-emerald-100">
            {cover ? (
              <Image src={cover.url} alt={cover.alt_text || venue.name} fill unoptimized className="object-cover" priority />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center"><Building2 className="h-16 w-16 text-orange-300" /></div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            {gallery.slice(1, 3).map((item) => (
              <div key={item.id} className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-zinc-100 lg:aspect-auto">
                <Image src={item.url} alt={item.alt_text || venue.name} fill unoptimized className="object-cover" />
              </div>
            ))}
            {gallery.length < 2 && <div className="hidden rounded-[1.5rem] bg-gradient-to-br from-emerald-100 to-orange-100 lg:block" />}
          </div>
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <section className="rounded-[2rem] bg-white p-6 shadow-[0_10px_30px_rgba(60,40,20,0.05)] sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">About this space</p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-900">A closer look at the venue</h2>
              <p className="mt-4 leading-relaxed text-zinc-600">{venue.description || venue.short_description || "More venue information is being prepared."}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {(venue.event_types || []).map((eventType: string) => (
                  <span key={eventType} className="rounded-full bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-600">{eventType}</span>
                ))}
              </div>
            </section>

            {spaces?.length ? (
              <section>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Spaces and layouts</p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Choose the setup that fits</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {spaces.map((space) => {
                    const capacities = [
                      ["Theatre", space.theatre_capacity],
                      ["Classroom", space.classroom_capacity],
                      ["Banquet", space.banquet_capacity],
                      ["Standing", space.standing_capacity],
                    ].filter(([, capacity]) => capacity !== null);
                    return (
                      <article key={space.id} className="rounded-[1.5rem] border border-black/5 bg-white p-5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">{label(space.space_type)}</p>
                        <h3 className="mt-2 text-lg font-semibold text-zinc-900">{space.name}</h3>
                        {space.description && <p className="mt-2 text-sm leading-relaxed text-zinc-500">{space.description}</p>}
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {capacities.map(([name, capacity]) => (
                            <div key={String(name)} className="rounded-xl bg-zinc-50 px-3 py-2">
                              <p className="text-sm font-semibold text-zinc-800">{capacity}</p>
                              <p className="text-[10px] uppercase tracking-wider text-zinc-400">{name}</p>
                            </div>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {(venue.rules?.length || venue.additional_charges?.length) ? (
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] bg-white p-6">
                  <h2 className="font-semibold text-zinc-900">Important conditions</h2>
                  <ul className="mt-4 space-y-3 text-sm text-zinc-600">
                    {(venue.rules || []).map((rule: string) => <li key={rule} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{rule}</li>)}
                  </ul>
                </div>
                <div className="rounded-[1.5rem] bg-white p-6">
                  <h2 className="font-semibold text-zinc-900">Possible additional charges</h2>
                  <ul className="mt-4 space-y-3 text-sm text-zinc-600">
                    {(venue.additional_charges || []).map((charge: string) => <li key={charge} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />{charge}</li>)}
                  </ul>
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] bg-zinc-900 p-6 text-white shadow-xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-300">Plan your occasion</p>
              <h2 className="mt-2 text-2xl font-semibold">Check your preferred date</h2>
              <div className="mt-5 space-y-2">
                {(availability || []).length ? availability?.map((item) => (
                  <div key={item.date} className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-3 text-sm">
                    <span>{new Date(`${item.date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span className="text-xs font-semibold text-orange-200">{label(item.status)}</span>
                  </div>
                )) : <p className="rounded-xl bg-white/10 p-4 text-sm leading-relaxed text-white/65">Choose a date when sending your enquiry. The venue will provide a fresh confirmation.</p>}
              </div>
              <button disabled className="mt-5 w-full cursor-not-allowed rounded-xl bg-white/15 px-4 py-3 text-sm font-semibold text-white/60">
                Enquiries opening next
              </button>
            </div>

            {venue.maximum_capacity && (
              <div className="flex items-center gap-3 rounded-2xl bg-white p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Users className="h-5 w-5" /></span>
                <div><p className="text-xs text-zinc-400">Maximum capacity</p><p className="font-semibold text-zinc-900">Up to {venue.maximum_capacity} guests</p></div>
              </div>
            )}

            {packages?.map((item) => (
              <div key={item.id} className="rounded-2xl border border-black/5 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-zinc-900">{item.name}</h3>
                  <span className="whitespace-nowrap text-sm font-semibold text-orange-700">{item.price === null ? "On request" : `SLE ${Number(item.price).toLocaleString()}`}</span>
                </div>
                {item.description && <p className="mt-2 text-sm leading-relaxed text-zinc-500">{item.description}</p>}
              </div>
            ))}
          </aside>
        </div>
      </main>
    </div>
  );
}

