import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  MapPin,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

type VenueMedia = {
  url: string;
  alt_text: string | null;
  is_cover: boolean;
  display_order: number;
};

type Venue = {
  id: string;
  name: string;
  slug: string;
  venue_type: string;
  short_description: string | null;
  area: string;
  city: string;
  maximum_capacity: number | null;
  starting_price: number | null;
  price_basis: string | null;
  verification_status: string;
  event_types: string[];
  media: VenueMedia[];
};

const eventOptions = [
  "Wedding",
  "Birthday",
  "Corporate event",
  "Workshop",
  "Conference",
  "Private dinner",
];

function priceLabel(venue: Venue) {
  if (venue.starting_price === null || venue.price_basis === "on_request") {
    return "Price on request";
  }
  const basis: Record<string, string> = {
    per_hour: "hour",
    per_session: "session",
    per_day: "day",
    per_event: "event",
  };
  return `From SLE ${Number(venue.starting_price).toLocaleString()}${basis[venue.price_basis || ""] ? ` / ${basis[venue.price_basis || ""]}` : ""}`;
}

function venueTypeLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function VenuesPage({
  searchParams,
}: {
  searchParams?: { event?: string; area?: string; guests?: string };
}) {
  const eventType = searchParams?.event?.trim() || "";
  const area = searchParams?.area?.trim() || "";
  const guestCount = Number.parseInt(searchParams?.guests || "", 10);

  let query = admin
    .from("venues")
    .select(
      "id, name, slug, venue_type, short_description, area, city, maximum_capacity, starting_price, price_basis, verification_status, event_types, media:venue_media(url, alt_text, is_cover, display_order)"
    )
    .eq("status", "published")
    .order("name");

  if (eventType) query = query.contains("event_types", [eventType]);
  if (area) query = query.ilike("area", `%${area}%`);
  if (Number.isFinite(guestCount) && guestCount > 0) {
    query = query.gte("maximum_capacity", guestCount);
  }

  const { data, error } = await query;
  if (error) console.error("Venue catalogue fetch error:", error);

  const venues = ((data || []) as Venue[]).map((venue) => ({
    ...venue,
    media: [...(venue.media || [])].sort(
      (a, b) => Number(b.is_cover) - Number(a.is_cover) || a.display_order - b.display_order
    ),
  }));

  return (
    <div className="min-h-screen bg-[#f6f3ed]">
      <header className="border-b border-black/5 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold text-zinc-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white">
              R
            </span>
            Radius
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6">
            <Link href="/" className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900">
              Events
            </Link>
            <Link
              href="/organizations"
              className="hidden text-sm font-medium text-zinc-500 transition hover:text-zinc-900 sm:block"
            >
              Organizations
            </Link>
            <Link
              href="/venues/new"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              List a venue
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-orange-100 bg-gradient-to-br from-[#fff6ec] via-[#fbfaf7] to-[#eef5ef]">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-orange-200/35 blur-3xl" />
          <div className="absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-emerald-200/25 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-5 py-14 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[1fr_430px] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-700">
                  <MapPin className="h-3.5 w-3.5" />
                  Venue discovery across Sierra Leone
                </div>
                <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-6xl">
                  Find a space that fits the moment.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-500 sm:text-lg">
                  Compare practical venue details, understand the date status, and request
                  confirmation before travelling to inspect a space.
                </p>
                <div className="mt-7 flex flex-wrap gap-4 text-xs font-semibold text-zinc-600">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Verified details
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarCheck2 className="h-4 w-4 text-orange-600" /> Clear date status
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Search className="h-4 w-4 text-violet-600" /> Free to search
                  </span>
                </div>
              </div>

              <form
                action="/venues"
                className="rounded-[2rem] border border-black/5 bg-white p-5 shadow-[0_24px_60px_rgba(64,45,30,0.1)] sm:p-6"
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
                  Start your search
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-900">What are you planning?</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-zinc-600">Event type</span>
                    <select
                      name="event"
                      defaultValue={eventType}
                      className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-orange-400"
                    >
                      <option value="">All event types</option>
                      {eventOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold text-zinc-600">Preferred area</span>
                    <input
                      name="area"
                      defaultValue={area}
                      placeholder="e.g. Aberdeen"
                      className="h-12 w-full rounded-xl border border-zinc-200 px-3 text-sm outline-none transition placeholder:text-zinc-300 focus:border-orange-400"
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold text-zinc-600">Number of guests</span>
                    <input
                      name="guests"
                      type="number"
                      min="1"
                      defaultValue={Number.isFinite(guestCount) ? guestCount : ""}
                      placeholder="e.g. 150"
                      className="h-12 w-full rounded-xl border border-zinc-200 px-3 text-sm outline-none transition placeholder:text-zinc-300 focus:border-orange-400"
                    />
                  </label>
                </div>
                <button className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f06445] text-sm font-semibold text-white shadow-sm transition hover:bg-[#db5336]">
                  Find venues <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                Venue catalogue
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-900">
                {eventType || area || guestCount
                  ? `${venues.length} matching venue${venues.length === 1 ? "" : "s"}`
                  : "Spaces worth discovering"}
              </h2>
            </div>
            {(eventType || area || Number.isFinite(guestCount)) && (
              <Link href="/venues" className="text-sm font-semibold text-orange-700 hover:text-orange-900">
                Clear search
              </Link>
            )}
          </div>

          {venues.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {venues.map((venue) => {
                const cover = venue.media[0];
                return (
                  <Link
                    key={venue.id}
                    href={`/venues/${venue.slug}`}
                    className="group overflow-hidden rounded-[1.75rem] border border-black/5 bg-white shadow-[0_10px_30px_rgba(60,40,20,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(60,40,20,0.12)]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-orange-100 via-rose-100 to-emerald-100">
                      {cover ? (
                        <Image
                          src={cover.url}
                          alt={cover.alt_text || venue.name}
                          fill
                          unoptimized
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Building2 className="h-12 w-12 text-orange-300" />
                        </div>
                      )}
                      {venue.verification_status === "verified" && (
                        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 shadow-sm backdrop-blur">
                          <ShieldCheck className="h-3.5 w-3.5" /> Verified
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-600">
                        {venueTypeLabel(venue.venue_type)}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-zinc-900">{venue.name}</h3>
                      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-relaxed text-zinc-500">
                        {venue.short_description || "Explore this venue’s spaces, facilities and availability."}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-50 px-2.5 py-1.5">
                          <MapPin className="h-3.5 w-3.5" /> {venue.area}
                        </span>
                        {venue.maximum_capacity && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-50 px-2.5 py-1.5">
                            <Users className="h-3.5 w-3.5" /> Up to {venue.maximum_capacity}
                          </span>
                        )}
                      </div>
                      <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4">
                        <span className="text-sm font-semibold text-zinc-700">{priceLabel(venue)}</span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 transition group-hover:bg-zinc-900 group-hover:text-white">
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-[2rem] border border-dashed border-orange-200 bg-gradient-to-br from-white to-orange-50 p-10 text-center sm:p-16">
              <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-orange-100/70" />
              <div className="relative">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm">
                  <Building2 className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-zinc-900">
                  {eventType || area || Number.isFinite(guestCount)
                    ? "No venues match this search yet"
                    : "The first Radius venues are being prepared"}
                </h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-500">
                  {eventType || area || Number.isFinite(guestCount)
                    ? "Try clearing one of the filters, or check back as more verified spaces are added."
                    : "Venue profiles will appear here after their details and authorized managers have been reviewed."}
                </p>
                <Link
                  href="/venues/new"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700"
                >
                  Submit a venue <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
