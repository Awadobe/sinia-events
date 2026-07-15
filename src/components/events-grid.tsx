"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { Calendar, MapPin, ArrowRight, Search, X } from "lucide-react";

type EventItem = {
  id: string;
  title: string;
  date: string;
  end_date: string | null;
  location: string | null;
  image_url: string | null;
  event_type: string;
  slug: string;
  public_slug?: string;
  host?: { slug: string } | null;
  theme_color: string;
  is_virtual: boolean;
  is_featured?: boolean;
};

const EVENT_TYPE_FILTERS = [
  "All",
  "Bootcamp",
  "Workshop",
  "Hackathon",
  "Meetup",
  "Conference",
  "Webinar",
];

export function EventsGrid({
  events,
  userLocation,
}: {
  events: EventItem[];
  userLocation: string | null;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  // Get unique event types from actual data to supplement our predefined list
  const dynamicTypes = useMemo(() => {
    const typesFromData = events
      .map((e) => e.event_type)
      .filter(Boolean)
      .map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
    const uniqueTypes = Array.from(new Set(typesFromData));
    // Add any types from data that aren't in our predefined list
    const allTypes = [...EVENT_TYPE_FILTERS];
    uniqueTypes.forEach((t) => {
      if (!allTypes.some((f) => f.toLowerCase() === t.toLowerCase())) {
        allTypes.push(t);
      }
    });
    return allTypes;
  }, [events]);

  const filteredEvents = useMemo(() => {
    let result = events;

    // Filter by type
    if (activeFilter !== "All") {
      result = result.filter(
        (e) => e.event_type?.toLowerCase() === activeFilter.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.event_type?.toLowerCase().includes(q) ||
          e.location?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [events, activeFilter, searchQuery]);

  // Separate featured events
  const featuredEvents = filteredEvents.filter((e) => e.is_featured);
  const regularEvents = filteredEvents.filter((e) => !e.is_featured);
  const displayEvents = featuredEvents.length > 0 ? [...featuredEvents, ...regularEvents] : filteredEvents;

  return (
    <div className="space-y-6">
      {/* Search + Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-black/5 bg-white pl-10 pr-9 py-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 shadow-sm transition-shadow"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Event Count */}
        <span className="hidden sm:block text-sm font-medium text-zinc-400 bg-white border border-black/5 rounded-full px-3 py-1 shadow-sm shrink-0">
          {filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {dynamicTypes.map((type) => (
          <button
            key={type}
            onClick={() => setActiveFilter(type)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
              activeFilter === type
                ? "bg-zinc-900 text-white shadow-md"
                : "bg-white text-zinc-600 border border-black/5 hover:bg-zinc-50 hover:border-zinc-200 shadow-sm"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      {displayEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white/50 border border-black/5 rounded-[2rem]">
          <div className="h-20 w-20 rounded-3xl bg-zinc-100 flex items-center justify-center mb-6 shadow-none">
            <Search className="h-8 w-8 text-zinc-300" />
          </div>
          <h3 className="text-xl font-semibold text-zinc-800 mb-2">
            {searchQuery || activeFilter !== "All"
              ? "No matching events"
              : "No upcoming events"}
          </h3>
          <p className="text-sm text-zinc-500 max-w-sm text-center">
            {searchQuery || activeFilter !== "All"
              ? "Try changing your search or filter to find what you're looking for."
              : "We're currently planning our next activities. Check back later."}
          </p>
          {(searchQuery || activeFilter !== "All") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveFilter("All");
              }}
              className="mt-4 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors underline underline-offset-4"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayEvents.map((event) => (
            <Link
              href={event.host?.slug && event.public_slug
                ? `/hosts/${event.host.slug}/events/${event.public_slug}`
                : `/events/${event.slug}`}
              key={event.id}
              className={`group flex flex-col bg-white rounded-[2rem] border overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 ${
                event.is_featured
                  ? "border-amber-200 ring-1 ring-amber-100"
                  : "border-black/5"
              }`}
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

                {/* Badges */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                  {event.is_featured && (
                    <span className="bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                      ⭐ Featured
                    </span>
                  )}
                  {userLocation &&
                    event.location?.toLowerCase().includes(userLocation) && (
                      <span className="bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                        <MapPin className="h-3 w-3" /> Near Me
                      </span>
                    )}
                  {event.event_type && (
                    <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
                      {event.event_type}
                    </span>
                  )}
                </div>
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
                      {event.end_date &&
                        ` - ${format(new Date(event.end_date), "h:mm a")}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-sm text-zinc-500">
                    <MapPin className="h-4 w-4 shrink-0 text-zinc-400" />
                    <span className="truncate">
                      {event.is_virtual
                        ? "Virtual Event"
                        : event.location || "Location TBD"}
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
    </div>
  );
}
