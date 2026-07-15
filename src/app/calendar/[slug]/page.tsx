import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Calendar, MapPin, ArrowRight, ArrowLeft, Bell } from "lucide-react";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

export const revalidate = 0;

type Props = {
  params: { slug: string };
};

// Dynamic metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("name, org_name, bio")
    .eq("slug", params.slug)
    .single();

  if (!profile) {
    return { title: "Calendar Not Found — Radius" };
  }

  const displayName = profile.org_name || profile.name || params.slug;
  return {
    title: `${displayName} — Events Calendar | Radius`,
    description: profile.bio || `Discover upcoming events by ${displayName} on Radius.`,
  };
}

async function getOrgProfile(slug: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, name, org_name, bio, avatar_url, slug")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data;
}

async function getOrgUpcomingEvents(organizerId: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id, title, date, end_date, location, image_url, event_type, slug, theme_color, is_virtual, is_featured")
    .eq("organizer_id", organizerId)
    .neq("status", "cancelled")
    .gte("date", now)
    .order("date", { ascending: true });

  if (error) {
    console.error("Org upcoming events fetch error:", error);
    return [];
  }
  return data || [];
}

async function getOrgPastEvents(organizerId: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id, title, date, end_date, location, image_url, event_type, slug, theme_color, is_virtual")
    .eq("organizer_id", organizerId)
    .neq("status", "cancelled")
    .lt("date", now)
    .order("date", { ascending: false });

  if (error) {
    console.error("Org past events fetch error:", error);
    return [];
  }
  return data || [];
}

export default async function OrgCalendarPage({ params }: Props) {
  const profile = await getOrgProfile(params.slug);

  if (!profile) {
    notFound();
  }

  const upcomingEvents = await getOrgUpcomingEvents(profile.id);
  const pastEvents = await getOrgPastEvents(profile.id);

  const displayName = profile.org_name || profile.name || params.slug;
  const totalEvents = upcomingEvents.length + pastEvents.length;

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 sm:px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Radius
          </Link>
          <a
            href={`/api/calendar/feed?org=${params.slug}`}
            className="rounded-full bg-zinc-900 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-zinc-700 transition-colors inline-flex items-center gap-2"
          >
            <Bell className="h-3.5 w-3.5" />
            Subscribe
          </a>
        </div>
      </header>

      {/* Organizer Profile Header */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-12 pb-10">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center text-3xl font-bold text-zinc-500 overflow-hidden shadow-sm border border-black/5 shrink-0">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={displayName}
                width={80}
                height={80}
                className="object-cover h-full w-full"
                unoptimized
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 leading-tight">
              {displayName}
            </h1>
            {profile.bio && (
              <p className="mt-2 text-zinc-500 max-w-lg leading-relaxed text-sm">
                {profile.bio}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                <Calendar className="h-4 w-4" />
                <span>{totalEvents} event{totalEvents === 1 ? "" : "s"}</span>
              </div>
              <a
                href={`/api/calendar/feed?org=${params.slug}`}
                className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                <Calendar className="h-4 w-4" />
                Download .ics
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-lg font-semibold text-zinc-900">Upcoming Events</h2>
          {upcomingEvents.length > 0 && (
            <span className="text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-0.5">
              {upcomingEvents.length}
            </span>
          )}
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white/50 border border-black/5 rounded-[2rem]">
            <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
              <Calendar className="h-7 w-7 text-zinc-300" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-700 mb-1">No upcoming events</h3>
            <p className="text-sm text-zinc-400 text-center max-w-sm">
              Subscribe to get notified when {displayName} creates new events.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcomingEvents.map((event) => (
              <Link
                href={`/events/${event.slug}`}
                key={event.id}
                className="group flex flex-col bg-white rounded-[2rem] border border-black/5 overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300"
              >
                {/* Cover */}
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
                  {/* Date Badge */}
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur shadow-sm rounded-2xl px-3 py-2 flex flex-col items-center justify-center min-w-[3.5rem] text-center border border-black/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 leading-none mb-1">
                      {format(new Date(event.date), "MMM")}
                    </span>
                    <span className="text-lg font-bold text-zinc-900 leading-none">
                      {format(new Date(event.date), "d")}
                    </span>
                  </div>
                  {event.event_type && (
                    <div className="absolute top-4 right-4">
                      <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
                        {event.event_type}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex-grow flex flex-col">
                  <h3 className="text-base font-semibold text-zinc-900 leading-snug line-clamp-2 mb-3 group-hover:text-zinc-600 transition-colors">
                    {event.title}
                  </h3>
                  <div className="mt-auto space-y-2">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {format(new Date(event.date), "MMM d, yyyy · h:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {event.is_virtual ? "Virtual Event" : event.location || "Location TBD"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Register
                    </span>
                    <div className="h-7 w-7 rounded-full bg-zinc-50 text-zinc-400 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-20">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-lg font-semibold text-zinc-900">Past Events</h2>
            <span className="text-sm font-medium text-zinc-400 bg-white border border-black/5 rounded-full px-3 py-0.5 shadow-sm">
              {pastEvents.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pastEvents.map((event) => (
              <Link
                href={`/events/${event.slug}`}
                key={event.id}
                className="group flex items-center gap-4 bg-white rounded-2xl border border-black/5 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                {/* Thumbnail */}
                <div className="relative h-16 w-16 rounded-xl bg-zinc-100 overflow-hidden flex-shrink-0">
                  {event.image_url ? (
                    <Image
                      src={event.image_url}
                      alt={event.title}
                      fill
                      className="object-cover grayscale-[30%]"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-zinc-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-900 truncate group-hover:text-zinc-600 transition-colors">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                    <span>{format(new Date(event.date), "MMM d, yyyy")}</span>
                    <span>·</span>
                    <span className="truncate">{event.is_virtual ? "Virtual" : event.location || "TBD"}</span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="h-7 w-7 rounded-full bg-zinc-50 text-zinc-300 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors flex-shrink-0">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-black/5 bg-white py-10">
        <div className="mx-auto max-w-5xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-zinc-900 flex items-center justify-center text-white text-[10px] font-bold">R</div>
            <span className="text-sm font-semibold text-zinc-900">Radius</span>
          </Link>
          <p className="text-xs text-zinc-400">
            Open-source event platform — discover, create, and share events.
          </p>
        </div>
      </footer>
    </div>
  );
}
