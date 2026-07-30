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

function venuePrice(venue: { starting_price: number | null; price_basis: string | null }) {
  if (venue.starting_price === null || venue.price_basis === "on_request") return "Price on request";
  const basis: Record<string, string> = {
    per_hour: "hour",
    per_session: "session",
    per_day: "day",
    per_event: "event",
  };
  const suffix = basis[venue.price_basis || ""];
  return `From SLE ${Number(venue.starting_price).toLocaleString()}${suffix ? ` / ${suffix}` : ""}`;
}

function youtubeEmbedUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    let videoId = "";
    if (url.hostname === "youtu.be") videoId = url.pathname.slice(1).split("/")[0];
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      if (url.pathname === "/watch") videoId = url.searchParams.get("v") || "";
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/")[2] || "";
      }
    }
    return /^[a-zA-Z0-9_-]{6,20}$/.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}`
      : null;
  } catch {
    return null;
  }
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
  const venueVideo = youtubeEmbedUrl(venue.video_url);

  return (
    <div className="venuefind-page min-h-screen bg-[#faf6f2]">
      <header className="h-[76px] border-b border-[#ebe5de] bg-white">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-5 sm:px-10 lg:px-20">
          <Link href="/" className="flex items-center gap-3 text-lg font-semibold text-[#18231d]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff5e36] text-sm font-bold text-white">R</span>
            Radius
          </Link>
          <Link href="/venues" className="inline-flex items-center gap-2 text-sm font-medium text-[#5f6b64] transition hover:text-[#ff5e36]">
            <ArrowLeft className="h-4 w-4" /> All venues
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1380px] px-5 py-10 sm:px-10 sm:py-14 lg:px-16">
        <nav className="mb-9 flex items-center gap-2 text-xs text-[#7b857f]">
          <Link href="/venues" className="hover:text-[#ff5e36]">Venues</Link>
          <span>/</span>
          <strong className="font-semibold text-[#18231d]">{venue.name}</strong>
        </nav>
        <section className="grid gap-8 lg:grid-cols-[1fr_370px] lg:items-end">
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
            <h1 className="venuefind-display mt-5 text-5xl leading-[1.02] tracking-[-0.04em] text-[#18231d] sm:text-7xl">{venue.name}</h1>
            <p className="mt-4 flex items-center gap-2 text-sm text-[#5f6b64]">
              <MapPin className="h-4 w-4 text-[#ff5e36]" /> {venue.area}, {venue.city}
            </p>
          </div>
          <div className="rounded-[15px] border border-[#ead7a2] bg-[#fff4d8] p-5 text-sm text-[#74500d]">
            <p className="flex items-center gap-2 font-semibold">
              <CalendarCheck2 className="h-4 w-4 text-[#f5b82e]" /> Availability requires confirmation
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#896f3d]">
              A displayed open date is not a reservation. Radius reconfirms it before you proceed.
            </p>
          </div>
        </section>

        <section className="mt-9 grid min-h-[430px] gap-2.5 overflow-hidden rounded-[22px] bg-[#eee8e1] lg:h-[min(58vw,610px)] lg:grid-cols-[1.8fr_1fr]">
          <div className="relative min-h-[360px] overflow-hidden lg:min-h-0">
            {cover ? (
              <Image src={cover.url} alt={cover.alt_text || venue.name} fill unoptimized className="object-cover" priority />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center"><Building2 className="h-16 w-16 text-orange-300" /></div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
            {gallery.slice(1, 3).map((item) => (
              <div key={item.id} className="relative min-h-[190px] overflow-hidden bg-zinc-100 lg:min-h-0">
                <Image src={item.url} alt={item.alt_text || venue.name} fill unoptimized className="object-cover" />
              </div>
            ))}
            {gallery.length < 2 && <div className="hidden bg-[#f4ece3] lg:block" />}
          </div>
        </section>

        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_410px] lg:gap-16">
          <div>
            <section className="border-b border-[#ebe5de] pb-14">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">About this space</p>
              <h2 className="venuefind-display mt-3 text-4xl tracking-[-0.025em] text-[#18231d]">A closer look at the venue</h2>
              <p className="mt-5 max-w-3xl text-[17px] leading-8 text-[#46534c]">{venue.description || venue.short_description || "More venue information is being prepared."}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {(venue.event_types || []).map((eventType: string) => (
                  <span key={eventType} className="rounded-full border border-[#ead8bd] bg-[#fffaf2] px-3 py-2 text-xs font-semibold text-[#76521a]">{eventType}</span>
                ))}
              </div>
            </section>

            {venueVideo && (
              <section className="border-b border-[#ebe5de] py-14">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff5e36]">Venue tour</p>
                <h2 className="venuefind-display mt-3 text-4xl tracking-[-0.025em] text-[#18231d]">Experience the space before you visit</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f6b64]">
                  Watch the venue walkthrough to understand its layout, atmosphere and facilities.
                </p>
                <div className="mt-7 aspect-video overflow-hidden rounded-[18px] border border-[#ebe5de] bg-[#18231d] shadow-[0_16px_40px_rgba(80,54,39,0.1)]">
                  <iframe
                    src={venueVideo}
                    title={`${venue.name} venue tour`}
                    className="h-full w-full"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              </section>
            )}

            {spaces?.length ? (
              <section className="border-b border-[#ebe5de] py-14">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Spaces and layouts</p>
                <h2 className="venuefind-display mt-3 text-4xl tracking-[-0.025em] text-[#18231d]">Choose the setup that fits</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {spaces.map((space) => {
                    const capacities = [
                      ["Theatre", space.theatre_capacity],
                      ["Classroom", space.classroom_capacity],
                      ["Banquet", space.banquet_capacity],
                      ["Standing", space.standing_capacity],
                    ].filter(([, capacity]) => capacity !== null);
                    return (
                      <article key={space.id} className="rounded-[15px] border border-[#ebe5de] bg-white p-5">
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
              <section className="grid gap-4 py-14 sm:grid-cols-2">
                <div className="rounded-[15px] border border-[#ebe5de] bg-white p-6">
                  <h2 className="venuefind-display text-2xl text-[#18231d]">Important conditions</h2>
                  <ul className="mt-4 space-y-3 text-sm text-zinc-600">
                    {(venue.rules || []).map((rule: string) => <li key={rule} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{rule}</li>)}
                  </ul>
                </div>
                <div className="rounded-[15px] border border-[#ebe5de] bg-white p-6">
                  <h2 className="venuefind-display text-2xl text-[#18231d]">Possible additional charges</h2>
                  <ul className="mt-4 space-y-3 text-sm text-zinc-600">
                    {(venue.additional_charges || []).map((charge: string) => <li key={charge} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />{charge}</li>)}
                  </ul>
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-[19px] border border-[#ebe5de] bg-white p-7 shadow-[0_16px_40px_rgba(80,54,39,0.09)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff5e36]">Plan your occasion</p>
              <h2 className="venuefind-display mt-2 text-4xl leading-tight tracking-[-0.025em] text-[#18231d]">Check your preferred date</h2>
              <div className="mt-5 space-y-2">
                {(availability || []).length ? availability?.map((item) => (
                  <div key={item.date} className="flex items-center justify-between rounded-[10px] border border-[#ebe5de] bg-[#fffdfa] px-3 py-3 text-sm text-[#18231d]">
                    <span>{new Date(`${item.date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span className="text-xs font-semibold text-[#e84c27]">{label(item.status)}</span>
                  </div>
                )) : <p className="rounded-[10px] bg-[#fff4d8] p-4 text-sm leading-relaxed text-[#74500d]">Choose a date when sending your enquiry. The venue will provide a fresh confirmation.</p>}
              </div>
              <button disabled className="mt-5 w-full cursor-not-allowed rounded-xl bg-[#ff5e36]/50 px-4 py-3 text-sm font-semibold text-white">
                Availability enquiries coming soon
              </button>
            </div>

            {venue.maximum_capacity && (
              <div className="flex items-center gap-3 rounded-[15px] border border-[#ebe5de] bg-white p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Users className="h-5 w-5" /></span>
                <div><p className="text-xs text-zinc-400">Maximum capacity</p><p className="font-semibold text-zinc-900">Up to {venue.maximum_capacity} guests</p></div>
              </div>
            )}

            <div className="rounded-[15px] border border-[#ebe5de] bg-white p-5">
              <p className="text-xs text-[#7b857f]">Starting price</p>
              <p className="mt-1 font-semibold text-[#18231d]">{venuePrice(venue)}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-[#7b857f]">Confirm the final package and any additional charges directly with the venue.</p>
            </div>

            {packages?.map((item) => (
              <div key={item.id} className="rounded-[15px] border border-[#ebe5de] bg-white p-5">
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
      <footer className="mt-12 bg-[#173f41] text-white">
        <div className="mx-auto flex max-w-[1380px] flex-col gap-7 px-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-16">
          <div>
            <Link href="/" className="flex items-center gap-2.5 text-base font-semibold text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff5e36] text-xs font-bold">R</span>
              Radius
            </Link>
            <p className="mt-3 text-xs text-white/55">Events, communities, and venue discovery across Sierra Leone.</p>
          </div>
          <nav className="flex flex-wrap gap-5 text-sm font-medium text-white/65">
            <Link href="/">Events</Link>
            <Link href="/venues">Find a venue</Link>
            <Link href="/venues/new">List a venue</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
