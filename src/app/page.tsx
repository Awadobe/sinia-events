import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { Calendar, MapPin, ArrowRight, Clock } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase admin client for server-side fetching
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0; // Always fetch fresh data

async function getUpcomingEvents() {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id, title, date, end_date, location, image_url, event_type, slug, theme_color, is_virtual")
    .neq("status", "cancelled")
    .gte("date", now)
    .order("date", { ascending: true });

  if (error) {
    console.error("Upcoming events fetch error:", error);
    return [];
  }
  return data || [];
}

async function getPastEvents() {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id, title, date, end_date, location, image_url, event_type, slug, theme_color, is_virtual")
    .neq("status", "cancelled")
    .lt("date", now)
    .order("date", { ascending: false })
    .limit(5); // fetch 5 so we know if there are more than 4

  if (error) {
    console.error("Past events fetch error:", error);
    return [];
  }
  return data || [];
}

export default async function HomePage() {
  const upcomingEvents = await getUpcomingEvents();
  const pastEventsRaw = await getPastEvents();
  const hasMorePastEvents = pastEventsRaw.length > 4;
  const pastEvents = pastEventsRaw.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold text-zinc-900">
            <div className="h-8 w-8 rounded-xl bg-zinc-900 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              R
            </div>
            Radius
          </Link>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex text-xs font-semibold uppercase tracking-widest text-zinc-400">
              By Christex Foundation
            </div>
            <Link
              href="/admin/events"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Admin
            </Link>
            <Link
              href="/admin/events/new"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors"
            >
              Create Event
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="max-w-2xl">
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-zinc-900 leading-[1.1]">
            Discover tech events. <br className="hidden sm:block" /> Learn and connect.
          </h1>
          <p className="mt-6 text-lg text-zinc-500 max-w-xl leading-relaxed">
            Join our community events in Sierra Leone and online. Register for workshops, meetups, and hackathons hosted by Christex Foundation.
          </p>
        </div>
      </section>

      {/* Upcoming Events Grid */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-zinc-900">Upcoming Events</h2>
          {upcomingEvents.length > 0 && (
            <span className="text-sm font-medium text-zinc-400 bg-white border border-black/5 rounded-full px-3 py-1 shadow-sm">
              {upcomingEvents.length} event{upcomingEvents.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white/50 border border-black/5 rounded-[2rem]">
            <div className="h-20 w-20 rounded-3xl bg-zinc-100 flex items-center justify-center mb-6 shadow-none">
              <Calendar className="h-8 w-8 text-zinc-300" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-800 mb-2">No upcoming events</h3>
            <p className="text-sm text-zinc-500 max-w-sm text-center">
              We&apos;re currently planning our next activities. Check back later or follow our social channels for updates.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event) => (
              <Link
                href={`/events/${event.slug}`}
                key={event.id}
                className="group flex flex-col bg-white rounded-[2rem] border border-black/5 overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300"
              >
                {/* Cover Image Area */}
                <div className="relative aspect-[4/3] w-full bg-zinc-100 overflow-hidden">
                  {event.image_url ? (
                    <Image
                      src={event.image_url}
                      alt={event.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
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

                  {/* Event Type / Tag */}
                  {event.event_type && (
                    <div className="absolute top-4 right-4">
                      <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                        {event.event_type}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content Area */}
                <div className="p-6 flex-grow flex flex-col">
                  <h3 className="text-lg font-semibold text-zinc-900 leading-snug line-clamp-2 mb-4 group-hover:text-zinc-600 transition-colors">
                    {event.title}
                  </h3>

                  <div className="mt-auto space-y-2.5">
                    <div className="flex items-center gap-2.5 text-sm text-zinc-500">
                      <Calendar className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span className="truncate">
                        {format(new Date(event.date), "h:mm a")}
                        {event.end_date && ` - ${format(new Date(event.end_date), "h:mm a")}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-sm text-zinc-500">
                      <MapPin className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span className="truncate">
                        {event.is_virtual ? "Virtual Event" : event.location || "Location TBD"}
                      </span>
                    </div>
                  </div>

                  {/* Footer / CTA */}
                  <div className="mt-6 pt-5 border-t border-black/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Free Registration
                    </span>
                    <div className="h-8 w-8 rounded-full bg-zinc-50 text-zinc-400 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
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
                href={`/events/${event.slug}`}
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
