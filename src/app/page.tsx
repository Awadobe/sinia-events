import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Calendar, MapPin, ArrowRight, Clock, Sparkles, Building2 } from "lucide-react";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { EventsGrid } from "@/components/events-grid";

// Initialize Supabase admin client for server-side fetching
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

export const revalidate = 0; // Always fetch fresh data

async function getUpcomingEvents() {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id, title, date, end_date, location, image_url, event_type, slug, public_slug, theme_color, is_virtual, is_featured, host:hosts(slug)")
    .neq("status", "cancelled")
    .gte("date", now)
    .order("date", { ascending: true });

  if (error) {
    console.error("Upcoming events fetch error:", error);
    return [];
  }
  return (data || []).map((event) => ({
    ...event,
    host: Array.isArray(event.host) ? event.host[0] || null : event.host,
  }));
}

async function getPastEvents() {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id, title, date, end_date, location, image_url, event_type, slug, public_slug, theme_color, is_virtual, host:hosts(slug)")
    .neq("status", "cancelled")
    .lt("date", now)
    .order("date", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Past events fetch error:", error);
    return [];
  }
  return (data || []).map((event) => ({
    ...event,
    host: Array.isArray(event.host) ? event.host[0] || null : event.host,
  }));
}

async function getFeaturedOrganizations() {
  const { data } = await supabaseAdmin
    .from("hosts")
    .select("id, name, slug, description, logo_url")
    .eq("type", "organization")
    .order("created_at", { ascending: false })
    .limit(4);
  return data || [];
}

export default async function HomePage() {
  const upcomingEvents = await getUpcomingEvents();
  const pastEventsRaw = await getPastEvents();
  const organizations = await getFeaturedOrganizations();
  const hasMorePastEvents = pastEventsRaw.length > 4;
  const pastEvents = pastEventsRaw.slice(0, 4);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: organizerMembership }, { data: legacyOrganizer }] = user?.email
    ? await Promise.all([
        supabaseAdmin.from("host_organizers").select("host_id").eq("user_id", user.id).limit(1).maybeSingle(),
        supabaseAdmin.from("staff_allowlist").select("id").ilike("email", user.email).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  const isOrganizer = Boolean(organizerMembership || legacyOrganizer);

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold text-zinc-900">
            <div className="h-8 w-8 rounded-xl bg-zinc-900 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              R
            </div>
            Radius
          </Link>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden md:flex text-xs font-semibold uppercase tracking-widest text-zinc-400">
              By Christex Foundation
            </div>

            <a
              href="#upcoming-events"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors hidden sm:block"
            >
              Explore Events ↗
            </a>

            {user ? (
              <>
                {isOrganizer ? (
                  <>
                    <Link href="/organizer" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
                      Organizer account
                    </Link>
                    <Link
                      href="/events/new"
                      className="rounded-full bg-zinc-900 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-zinc-700 transition-colors"
                    >
                      + Create Event
                    </Link>
                  </>
                ) : (
                  <Link href="/profile" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
                    My profile
                  </Link>
                )}
                <form action="/auth/signout" method="post">
                  <button type="submit" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
                  Sign in
                </Link>
                <Link
                  href="/events/new"
                  className="rounded-full bg-zinc-900 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-zinc-700 transition-colors"
                >
                  + Create Event
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section — Two Column */}
      <section className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text + CTAs */}
          <div className="max-w-xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-zinc-900 leading-[1.1]">
              Discover tech events. <br className="hidden sm:block" /> Learn and connect.
            </h1>
            <p className="mt-6 text-lg text-zinc-500 max-w-xl leading-relaxed">
              Join community events in Sierra Leone and online. Register for workshops, meetups, and hackathons — or create your own and share them with the world.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#upcoming-events"
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-all hover:shadow-md"
              >
                Explore Events
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/events/new"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 transition-all hover:shadow-md"
              >
                <Sparkles className="h-4 w-4" />
                Create an Event
              </Link>
            </div>
          </div>

          {/* Right: Decorative Illustration (CSS-based floating cards) */}
          <div className="hidden lg:block relative" aria-hidden="true">
            <div className="relative h-[420px] w-full">
              {/* Background glow */}
              <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-amber-50 via-rose-50 to-violet-50 opacity-80" />
              
              {/* Floating card 1 — Event preview */}
              <div className="absolute top-8 left-8 w-[260px] bg-white rounded-3xl shadow-xl border border-black/5 p-5 transform rotate-[-3deg] hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">Tech Meetup</div>
                    <div className="text-xs text-zinc-400">Freetown, SL</div>
                  </div>
                </div>
                <div className="h-24 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                  <span className="text-3xl">🚀</span>
                </div>
              </div>

              {/* Floating card 2 — Calendar widget */}
              <div className="absolute top-4 right-6 w-[180px] bg-white rounded-2xl shadow-lg border border-black/5 p-4 transform rotate-[4deg] hover:rotate-0 transition-transform duration-500">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Upcoming</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold">15</div>
                    <div className="text-xs text-zinc-600 font-medium">Hackathon</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 text-xs font-bold">22</div>
                    <div className="text-xs text-zinc-600 font-medium">Workshop</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 text-xs font-bold">28</div>
                    <div className="text-xs text-zinc-600 font-medium">Bootcamp</div>
                  </div>
                </div>
              </div>

              {/* Floating card 3 — Community badge */}
              <div className="absolute bottom-12 left-16 w-[220px] bg-white rounded-2xl shadow-lg border border-black/5 p-4 transform rotate-[2deg] hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 border-2 border-white" />
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 border-2 border-white" />
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 border-2 border-white" />
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold">+5</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">Community</div>
                    <div className="text-xs text-emerald-500 font-medium">Join 200+ members</div>
                  </div>
                </div>
              </div>

              {/* Floating card 4 — Location pin */}
              <div className="absolute bottom-6 right-12 bg-white rounded-xl shadow-md border border-black/5 px-4 py-2.5 flex items-center gap-2 transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                <MapPin className="h-4 w-4 text-rose-500" />
                <span className="text-sm font-medium text-zinc-700">Sierra Leone & Online</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compact organization discovery */}
      {organizations.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-14">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Follow the communities you care about</p><h2 className="mt-1 text-xl font-semibold text-zinc-900">Organizations</h2></div>
            <Link href="/organizations" className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {organizations.map((organization) => (
              <Link key={organization.id} href={`/hosts/${organization.slug}`} className="flex min-w-[240px] max-w-[280px] items-center gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                {organization.logo_url ? <Image src={organization.logo_url} alt={organization.name} width={44} height={44} className="h-11 w-11 rounded-xl object-cover" unoptimized /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500"><Building2 className="h-5 w-5" /></div>}
                <div className="min-w-0"><h3 className="truncate text-sm font-semibold text-zinc-900">{organization.name}</h3><p className="mt-0.5 truncate text-xs text-zinc-400">View events and follow</p></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Events — Searchable & Filterable */}
      <section id="upcoming-events" className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-zinc-900">Upcoming Events</h2>
        </div>
        <EventsGrid events={upcomingEvents} userLocation={null} />
      </section>

      {/* Past Events - Horizontal Scroll */}
      {pastEvents.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-zinc-900">Past Events</h2>
              <span className="text-sm font-medium text-zinc-400 bg-white border border-black/5 rounded-full px-3 py-1 shadow-sm">
                {pastEvents.length}{hasMorePastEvents ? "+" : ""} event{pastEvents.length === 1 ? "" : "s"}
              </span>
            </div>
            {hasMorePastEvents && (
              <Link
                href="/events/past"
                className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                View all past events
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          <div className="flex gap-5 overflow-x-auto pb-4 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {pastEvents.map((event) => (
              <Link
                href={event.host?.slug && event.public_slug
                  ? `/hosts/${event.host.slug}/events/${event.public_slug}`
                  : `/events/${event.slug}`}
                key={event.id}
                className="group flex-shrink-0 w-[280px] sm:w-[300px] flex flex-col bg-white rounded-[2rem] border border-black/5 overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 snap-start"
              >
                {/* Cover Image Area */}
                <div className="relative aspect-[4/3] w-full bg-zinc-100 overflow-hidden">
                  {event.image_url ? (
                    <Image
                      src={event.image_url}
                      alt={event.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105 grayscale-[30%]"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Calendar className="h-10 w-10 text-zinc-300" />
                    </div>
                  )}

                  {/* Floating Date Badge */}
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur shadow-sm rounded-2xl px-3 py-2 flex flex-col items-center justify-center min-w-[3.5rem] text-center border border-black/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 leading-none mb-1">
                      {format(new Date(event.date), "MMM")}
                    </span>
                    <span className="text-lg font-bold text-zinc-900 leading-none">
                      {format(new Date(event.date), "d")}
                    </span>
                  </div>

                  {/* Ended Badge */}
                  <div className="absolute top-4 right-4">
                    <span className="bg-zinc-800/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Ended
                    </span>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-5 flex-grow flex flex-col">
                  <h3 className="text-base font-semibold text-zinc-900 leading-snug line-clamp-2 mb-3 group-hover:text-zinc-600 transition-colors">
                    {event.title}
                  </h3>

                  <div className="mt-auto space-y-2">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {format(new Date(event.date), "MMM d, yyyy")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {event.is_virtual ? "Virtual Event" : event.location || "Location TBD"}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Event Ended
                    </span>
                    <div className="h-7 w-7 rounded-full bg-zinc-50 text-zinc-300 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-black/5 bg-white py-12">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-zinc-900 flex items-center justify-center text-white text-[10px] font-bold">CF</div>
            <span className="text-sm font-semibold text-zinc-900">Christex Foundation</span>
          </div>
          <p className="text-xs text-zinc-400">
            Empowering the next generation of tech leaders in Sierra Leone.
          </p>
        </div>
      </footer>
    </div>
  );
}
