import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Eye,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Users,
  XCircle,
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

const occasions = [
  { name: "Wedding", label: "Weddings", icon: "💍" },
  { name: "Birthday", label: "Birthdays", icon: "🎂" },
  { name: "Corporate event", label: "Corporate", icon: "🏢" },
  { name: "Conference", label: "Conferences", icon: "🎤" },
];

const frequentlyAskedQuestions = [
  {
    question: "Does searching for a venue cost anything?",
    answer: "No. Browsing venue profiles and sending an availability enquiry is free. A venue may charge for hire, packages, inspections, or optional services, and those costs should be explained before you commit.",
  },
  {
    question: "Does “available” mean my date is booked?",
    answer: "No. Available means the venue recently reported that the date was open. Your date is only secured after the venue confirms the request and you complete whatever reservation process it requires.",
  },
  {
    question: "Why does a date sometimes say “confirmation required”?",
    answer: "Venues can receive bookings by phone, WhatsApp, referrals, or walk-ins. Radius asks for a fresh answer when existing calendar information is missing or may be outdated.",
  },
  {
    question: "Can I list a venue that belongs to my organization?",
    answer: "Yes. Sign in, choose the organization or personal account responsible for the venue, complete the guided form, and send it for review. The listing stays private until Radius approves it.",
  },
  {
    question: "Can I pay for and book a venue immediately?",
    answer: "Not yet. The first version focuses on trustworthy discovery, date confirmation, and inspection enquiries. Instant booking and payments will only be added after the process has been tested with real venues.",
  },
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
  searchParams?: { event?: string; area?: string; date?: string; guests?: string };
}) {
  const eventType = searchParams?.event?.trim() || "";
  const area = searchParams?.area?.trim() || "";
  const preferredDate = searchParams?.date?.trim() || "";
  const guestCount = Number.parseInt(searchParams?.guests || "", 10);

  let query = admin
    .from("venues")
    .select("*")
    .eq("status", "published")
    .order("name");

  if (eventType) query = query.contains("event_types", [eventType]);
  if (area) query = query.ilike("area", `%${area}%`);
  if (Number.isFinite(guestCount) && guestCount > 0) {
    query = query.gte("maximum_capacity", guestCount);
  }

  const { data, error } = await query;
  if (error) console.error("Venue catalogue fetch error:", error);

  const venueRows = (data || []) as Array<Omit<Venue, "media">>;
  const venueIds = venueRows.map((venue) => venue.id);
  const { data: mediaRows, error: mediaError } = venueIds.length
    ? await admin
        .from("venue_media")
        .select("venue_id, url, alt_text, is_cover, display_order")
        .in("venue_id", venueIds)
    : { data: [], error: null };
  if (mediaError) console.error("Venue catalogue media fetch error:", mediaError);

  const venues = venueRows.map((venue) => ({
    ...venue,
    media: (mediaRows || [])
      .filter((item) => item.venue_id === venue.id)
      .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.display_order - b.display_order),
  }));

  return (
    <div className="venuefind-page min-h-screen bg-[#faf6f2]">
      <header className="h-[76px] border-b border-[#ebe5de] bg-white">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-5 sm:px-10 lg:px-20">
          <Link href="/" className="flex items-center gap-3 text-lg font-semibold text-[#18231d]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff5e36] text-sm font-bold text-white">
              R
            </span>
            Radius
          </Link>
          <nav className="flex items-center gap-5 lg:gap-8">
            <a href="#venue-catalogue" className="hidden text-sm font-medium text-[#5f6b64] transition hover:text-[#ff5e36] md:block">Discover</a>
            <a href="#occasions" className="hidden text-sm font-medium text-[#5f6b64] transition hover:text-[#ff5e36] lg:block">Occasions</a>
            <a href="#how-it-works" className="hidden text-sm font-medium text-[#5f6b64] transition hover:text-[#ff5e36] lg:block">How it works</a>
            <Link
              href="/venues/new"
              className="rounded-full border border-[#ff5e36] px-5 py-2.5 text-sm font-semibold text-[#ff5e36] transition hover:bg-[#ff5e36] hover:text-white"
            >
              List a venue
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative mx-4 my-5 min-h-[calc(100svh-116px)] overflow-hidden rounded-[26px] bg-[#eadfce] sm:mx-8 lg:mx-[5vw]">
          <Image
            src="/images/venuefind-hero.jpg"
            alt="An elegant outdoor event venue"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(250,246,242,0.95)_0%,rgba(250,246,242,0.82)_48%,rgba(250,246,242,0.36)_100%)]" />
          <div className="relative mx-auto flex min-h-[calc(100svh-116px)] max-w-[1380px] items-center px-6 py-14 sm:px-10 lg:px-16">
            <div className="grid w-full gap-12 lg:grid-cols-[1.15fr_.72fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5e36]/25 bg-white/70 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#e84c27]">
                  <MapPin className="h-3.5 w-3.5" />
                  Venue discovery across Sierra Leone
                </div>
                <h1 className="venuefind-display mt-7 max-w-[760px] text-[clamp(3.25rem,6.7vw,5.4rem)] leading-[1.01] tracking-[-0.045em] text-[#18231d]">
                  Find the space that makes <em className="font-normal text-[#1d4d4f]">the moment.</em>
                </h1>
                <p className="mt-7 max-w-xl text-base leading-8 text-[#5f6b64] sm:text-lg">
                  Beautiful spaces for weddings, celebrations, conferences and everything in
                  between. Search clearly, compare confidently, and confirm before you visit.
                </p>
                <div className="mt-8 flex flex-wrap gap-5 text-xs font-semibold text-[#33453b]">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-[#ff5e36]" /> Verified details
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarCheck2 className="h-4 w-4 text-[#ff5e36]" /> Clear date status
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Search className="h-4 w-4 text-[#ff5e36]" /> Free to search
                  </span>
                </div>
              </div>

              <form
                action="/venues"
                className="rounded-[22px] border border-[#ded7cf] bg-white/95 p-7 shadow-[0_24px_70px_rgba(44,48,36,0.16)] backdrop-blur-sm sm:p-9"
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e84c27]">
                  Start your search
                </p>
                <h2 className="venuefind-display mt-2 text-[2rem] leading-tight text-[#18231d]">What are you planning?</h2>
                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-zinc-600">Event type</span>
                    <select
                      name="event"
                      defaultValue={eventType}
                      className="h-12 w-full rounded-lg border border-[#ded7cf] bg-white px-3 text-sm outline-none transition focus:border-[#ff5e36]"
                    >
                      <option value="">Choose an event type</option>
                      {eventOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-zinc-600">Preferred area</span>
                    <select
                      name="area"
                      defaultValue={area}
                      className="h-12 w-full rounded-lg border border-[#ded7cf] bg-[#fffdfa] px-3 text-sm font-medium outline-none transition focus:border-[#ff5e36]"
                    >
                      <option value="">Anywhere in the Western Area</option>
                      <option>Central Freetown</option>
                      <option>East Freetown</option>
                      <option>West Freetown</option>
                      <option>Western Area Rural</option>
                    </select>
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold text-zinc-600">Preferred date</span>
                    <input
                      name="date"
                      type="date"
                      defaultValue={preferredDate}
                      className="h-12 w-full rounded-lg border border-[#ded7cf] bg-[#fffdfa] px-3 text-sm font-medium outline-none transition focus:border-[#ff5e36]"
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
                      className="h-12 w-full rounded-lg border border-[#ded7cf] px-3 text-sm outline-none transition placeholder:text-zinc-300 focus:border-[#ff5e36]"
                    />
                  </label>
                </div>
                <button className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#ff5e36] text-sm font-semibold text-white shadow-sm transition hover:bg-[#e84c27]">
                  Find venues <ArrowRight className="h-4 w-4" />
                </button>
                <p className="mt-5 text-center text-xs text-[#5f6b64]">
                  Searching is free. No account is required.
                </p>
              </form>
            </div>
          </div>
        </section>

        <section id="occasions" className="mx-auto max-w-[1380px] px-5 py-20 sm:px-10 sm:py-24 lg:px-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Explore by occasion</p>
              <h2 className="venuefind-display mt-3 max-w-3xl text-4xl leading-tight tracking-[-0.035em] text-[#18231d] sm:text-[3.4rem]">Whatever you&apos;re celebrating,<br />start here.</h2>
            </div>
            <a href="#venue-catalogue" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900">See the catalogue <ArrowRight className="h-4 w-4" /></a>
          </div>
          <div className="mt-10 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {occasions.map((occasion) => (
              <Link key={occasion.name} href={`/venues?event=${encodeURIComponent(occasion.name)}`} className="group flex min-h-[88px] items-center gap-3 rounded-[15px] border border-[#ead8bd] bg-white px-[18px] py-4 transition hover:-translate-y-1 hover:border-[#f5b82e] hover:shadow-[0_10px_26px_rgba(89,55,29,0.1)]">
                <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-[#fff1d3] text-xl">{occasion.icon}</span>
                <strong className="text-[15px] font-semibold text-[#18231d]">{occasion.label}</strong>
                <span className="ml-auto flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#fff1d3] text-[#8d5d0a] transition group-hover:translate-x-0.5">→</span>
              </Link>
            ))}
          </div>
        </section>

        <section id="venue-catalogue" className="border-y border-[#ebe5de] bg-white">
          <div className="mx-auto max-w-[1380px] px-5 py-20 sm:px-10 sm:py-24 lg:px-16">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff5e36]">
                Featured in Freetown
              </p>
              <h2 className="venuefind-display mt-2 text-4xl text-[#18231d] sm:text-5xl">
                {eventType || area || guestCount
                  ? `${venues.length} matching venue${venues.length === 1 ? "" : "s"}`
                  : "Spaces worth discovering"}
              </h2>
              {!eventType && !area && !Number.isFinite(guestCount) && (
                <p className="mt-3 text-sm leading-relaxed text-[#5f6b64]">
                  Approved venue profiles with the practical details you need before arranging a visit.
                </p>
              )}
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
                    className="group max-w-[420px] overflow-hidden rounded-[18px] border border-[#ebe5de] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(60,40,20,0.1)]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#eee8e1]">
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
                        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1d4d4f] shadow-sm backdrop-blur">
                          <ShieldCheck className="h-3.5 w-3.5" /> Verified venue
                        </span>
                      )}
                      <span className="absolute bottom-4 left-4 rounded-full bg-[#fff0c7] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#8a5700]">
                        Confirmation required
                      </span>
                    </div>
                    <div className="p-6">
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
                      <div className="mt-5 flex items-center justify-between border-t border-[#ebe5de] pt-4">
                        <span className="text-sm font-semibold text-zinc-700">{priceLabel(venue)}</span>
                      </div>
                      <span className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#ff5e36] text-sm font-semibold text-white transition group-hover:bg-[#e84c27]">
                        View details <ArrowRight className="h-4 w-4" />
                      </span>
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
          </div>
        </section>

        <section className="mx-auto grid max-w-[1380px] gap-12 px-5 py-20 sm:px-10 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Availability without guesswork</p>
            <h2 className="venuefind-display mt-3 text-4xl leading-tight tracking-[-0.025em] text-[#18231d] sm:text-5xl">Know what the date status really means.</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-zinc-500">Radius does not place a green tick on old information. We show when a date needs a fresh answer and remind you that availability is not the same as a reservation.</p>
            <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm leading-relaxed text-orange-900">
              <strong>Why this matters:</strong> many venues also receive bookings through WhatsApp, phone calls and physical visits. A fresh confirmation helps prevent wasted journeys.
            </div>
          </div>
          <div className="space-y-3">
            <article className="flex gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span>
              <div><h3 className="font-semibold text-zinc-900">Available — recently verified</h3><p className="mt-1 text-sm leading-relaxed text-zinc-500">An authorized venue contact recently reported the date as open. It must still be reserved.</p></div>
            </article>
            <article className="flex gap-4 rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><Clock3 className="h-5 w-5" /></span>
              <div><h3 className="font-semibold text-zinc-900">Confirmation required</h3><p className="mt-1 text-sm leading-relaxed text-zinc-500">The information is missing, older, or waiting for a fresh response from the venue.</p></div>
            </article>
            <article className="flex gap-4 rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700"><XCircle className="h-5 w-5" /></span>
              <div><h3 className="font-semibold text-zinc-900">Booked or blocked</h3><p className="mt-1 text-sm leading-relaxed text-zinc-500">The venue has reported that the date cannot be selected.</p></div>
            </article>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-[#ebe5de] bg-[#f7f1e9]">
          <div className="mx-auto max-w-[1380px] px-5 py-20 sm:px-10 sm:py-24 lg:px-16">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e84c27]">Simple from search to inspection</p>
            <h2 className="venuefind-display mt-3 text-4xl tracking-[-0.025em] text-[#18231d] sm:text-5xl">Find it. Confirm it. Go and see it.</h2>
            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {[
                { number: "01", title: "Describe the occasion", text: "Share the event type, preferred area, expected guests, and the practical things the venue must provide.", icon: Search },
                { number: "02", title: "Compare useful details", text: "Review photographs, layouts, facilities, packages, rules, prices, and honest date information.", icon: Eye },
                { number: "03", title: "Confirm and inspect", text: "Send an enquiry, receive a fresh answer, and arrange an inspection before making a final commitment.", icon: MessageCircle },
              ].map((item) => (
                <article key={item.number} className="rounded-[18px] border border-[#e3d8cb] bg-white p-7">
                  <div className="flex items-center justify-between"><span className="text-sm font-bold text-[#ff5e36]">{item.number}</span><item.icon className="h-5 w-5 text-[#1d4d4f]" /></div>
                  <h3 className="venuefind-display mt-10 text-2xl text-[#18231d]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#5f6b64]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="venue-owners" className="mx-auto max-w-[1380px] px-5 py-20 sm:px-10 sm:py-24 lg:px-16">
          <div className="overflow-hidden rounded-[26px] bg-[#ff5e36] p-8 text-white shadow-[0_25px_70px_rgba(232,76,39,0.18)] sm:p-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur"><BadgeCheck className="h-3.5 w-3.5" /> For venue owners and managers</div>
              <h2 className="venuefind-display mt-4 text-4xl leading-tight tracking-[-0.025em] sm:text-5xl">Turn your space into someone’s perfect occasion.</h2>
              <p className="mt-4 max-w-xl leading-relaxed text-white/75">Create one structured profile for your venue, show what it genuinely provides, manage date information, and receive clearer enquiries from people planning events.</p>
            </div>
            <Link href="/venues/new" className="mt-7 inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-zinc-900 shadow-lg transition hover:bg-orange-50 lg:mt-0">List your venue <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>

        <section className="border-t border-black/5 bg-white">
          <div className="mx-auto max-w-4xl px-5 py-14 sm:py-20">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Frequently asked questions</p>
              <h2 className="venuefind-display mt-3 text-4xl tracking-[-0.025em] text-[#18231d] sm:text-5xl">Before you start searching</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-500">Clear answers about venue discovery, confirmation, and listing a space on Radius.</p>
            </div>
            <div className="mt-8 divide-y divide-zinc-100 rounded-[1.75rem] border border-zinc-200 bg-[#faf9f7] px-5 sm:px-7">
              {frequentlyAskedQuestions.map((item) => (
                <details key={item.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-semibold text-zinc-900">
                    {item.question}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="max-w-3xl pt-3 text-sm leading-relaxed text-zinc-500">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-[#173f41] text-white">
        <div className="mx-auto flex max-w-[1380px] flex-col gap-7 px-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-16">
          <div><Link href="/" className="flex items-center gap-2.5 text-base font-semibold text-white"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff5e36] text-xs font-bold text-white">R</span>Radius</Link><p className="mt-3 text-xs text-white/55">Events, communities, and venue discovery across Sierra Leone.</p></div>
          <nav className="flex flex-wrap gap-5 text-sm font-medium text-white/65"><Link href="/">Events</Link><Link href="/organizations">Organizations</Link><a href="#venue-catalogue">Find a venue</a><Link href="/venues/new">List a venue</Link></nav>
        </div>
      </footer>
    </div>
  );
}
