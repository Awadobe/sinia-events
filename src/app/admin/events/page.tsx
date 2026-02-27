"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PlusCircle, Calendar, MapPin, Users, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type EventRow = {
    id: string;
    title: string;
    date: string;
    location: string | null;
    status: string;
    image_url: string | null;
    max_attendees: number | null;
    event_type: string;
    slug: string;
    theme_color: string;
};

const STATUS_STYLES: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-500",
    published: "bg-emerald-50 text-emerald-600",
    cancelled: "bg-red-50 text-red-500",
};

export default function AdminEventsPage() {
    const router = useRouter();
    const [events, setEvents] = useState<EventRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        async function fetchEvents() {
            try {
                const res = await fetch('/api/events/list');
                const result = await res.json();
                if (res.ok && result.events) {
                    setEvents(result.events);
                }
            } catch (err) {
                console.error('Failed to fetch events:', err);
            }
            setLoading(false);
        }
        fetchEvents();
    }, []);

    const filtered = events.filter((e) =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.event_type?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#f5f3ef]">
            {/* Header */}
            <div className="mx-auto max-w-5xl px-4 pt-16 pb-10">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">Events</h1>
                        <p className="text-sm text-zinc-400 mt-1">
                            {events.length} event{events.length !== 1 ? "s" : ""} total
                        </p>
                    </div>
                    <Link
                        href="/admin/events/new"
                        className="flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Create Event
                    </Link>
                </div>

                {/* Search */}
                <div className="relative mt-8 mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search events..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-black/5 bg-white/70 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 shadow-sm"
                    />
                </div>

                {/* Events Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-32 text-zinc-400 text-sm">
                        Loading events…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="h-20 w-20 rounded-3xl bg-white/60 flex items-center justify-center text-3xl shadow-sm">
                            📅
                        </div>
                        <p className="text-zinc-500 font-medium">
                            {search ? "No events match your search" : "No events yet"}
                        </p>
                        {!search && (
                            <Link
                                href="/admin/events/new"
                                className="text-sm font-semibold text-zinc-900 underline underline-offset-4"
                            >
                                Create your first event
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((event) => (
                            <button
                                key={event.id}
                                onClick={() => router.push(`/admin/events/${event.slug}`)}
                                className="group text-left rounded-3xl bg-white/70 border border-black/5 shadow-sm overflow-hidden hover:shadow-md hover:translate-y-[-2px] transition-all duration-300"
                            >
                                {/* Cover */}
                                <div className="relative aspect-[4/3] bg-zinc-100">
                                    {event.image_url ? (
                                        <Image
                                            src={event.image_url}
                                            alt={event.title}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-4xl text-zinc-200">
                                            🖼
                                        </div>
                                    )}
                                    {/* Status badge */}
                                    <span className={cn(
                                        "absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm",
                                        STATUS_STYLES[event.status] || STATUS_STYLES.draft
                                    )}>
                                        {event.status}
                                    </span>
                                    {/* Tag badge */}
                                    {event.event_type && (
                                        <span className="absolute top-3 right-3 rounded-full bg-black/40 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                                            #{event.event_type}
                                        </span>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4 space-y-2">
                                    <h2 className="text-base font-semibold text-zinc-900 leading-snug line-clamp-2 group-hover:text-zinc-700 transition-colors">
                                        {event.title}
                                    </h2>
                                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                                        <span>{format(new Date(event.date), "EEE, MMM d · h:mm a")}</span>
                                    </div>
                                    {event.location && (
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{event.location}</span>
                                        </div>
                                    )}
                                    {event.max_attendees && (
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                            <Users className="h-3.5 w-3.5 shrink-0" />
                                            <span>{event.max_attendees.toLocaleString()} capacity</span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
