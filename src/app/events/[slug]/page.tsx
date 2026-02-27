"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    Calendar,
    MapPin,
    Clock,
    Users,
    Share2,
    Copy,
    CheckCircle2,
    Loader2,
    ExternalLink,
} from "lucide-react";

type EventData = {
    id: string;
    title: string;
    description: string | null;
    event_type: string;
    date: string;
    end_date: string | null;
    location: string | null;
    is_virtual: boolean;
    virtual_link: string | null;
    image_url: string | null;
    max_attendees: number | null;
    status: string;
    slug: string;
    theme_style: string;
    theme_color: string;
    theme_font: string;
    theme_mode: string;
    require_approval: boolean;
};

/* ───── Helper: Generate Google Calendar URL ───── */
function googleCalendarUrl(event: EventData) {
    const start = new Date(event.date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const end = event.end_date
        ? new Date(event.end_date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
        : new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000)
            .toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: event.title,
        dates: `${start}/${end}`,
        details: event.description || "",
        location: event.location || "",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/* ───── Helper: Generate iCal file ───── */
function downloadIcal(event: EventData) {
    const start = new Date(event.date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const end = event.end_date
        ? new Date(event.end_date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
        : new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000)
            .toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ical = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description || ""}`,
        `LOCATION:${event.location || ""}`,
        "END:VEVENT",
        "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ical], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.slug}.ics`;
    a.click();
    URL.revokeObjectURL(url);
}

/* ───── Share helpers ───── */
function shareWhatsApp(event: EventData) {
    const url = `${window.location.origin}/events/${event.slug}`;
    const text = `Check out this event: *${event.title}*\n📅 ${format(new Date(event.date), "EEE, MMM d · h:mm a")}\n📍 ${event.location || "Online"}\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

function shareTwitter(event: EventData) {
    const url = `${window.location.origin}/events/${event.slug}`;
    const text = `${event.title} — ${format(new Date(event.date), "MMM d")}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
}

function shareLinkedIn(event: EventData) {
    const url = `${window.location.origin}/events/${event.slug}`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank");
}

async function copyLink(slug: string) {
    const url = `${window.location.origin}/events/${slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied!");
}

/* ═══════════════════════════════════════════ */
/*                PAGE COMPONENT               */
/* ═══════════════════════════════════════════ */

export default function PublicEventPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [event, setEvent] = useState<EventData | null>(null);
    const [attendeeCount, setAttendeeCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // Registration form
    const [regName, setRegName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPhone, setRegPhone] = useState("");
    const [registering, setRegistering] = useState(false);
    const [registered, setRegistered] = useState(false);

    // Share dropdown
    const [showShare, setShowShare] = useState(false);

    useEffect(() => {
        async function load() {
            const res = await fetch(`/api/events/${slug}`);
            if (!res.ok) {
                setNotFound(true);
                setLoading(false);
                return;
            }
            const data = await res.json();
            setEvent(data.event);
            setAttendeeCount(data.attendee_count ?? 0);
            setLoading(false);
        }
        load();
    }, [slug]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!event) return;
        setRegistering(true);

        try {
            const res = await fetch("/api/events/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event_id: event.id,
                    name: regName,
                    email: regEmail,
                    phone: regPhone || null,
                }),
            });
            const result = await res.json();
            if (!res.ok) {
                toast.error(result.error || "Registration failed");
            } else {
                toast.success("You're registered! Check your email for confirmation.");
                setRegistered(true);
                setAttendeeCount((c) => c + 1);
            }
        } catch {
            toast.error("Something went wrong. Please try again.");
        }
        setRegistering(false);
    };

    /* ───── Loading / Not found states ───── */
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#faf9f7]">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (notFound || !event) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9f7] gap-4">
                <div className="text-5xl">🔍</div>
                <h1 className="text-2xl font-semibold text-zinc-700">Event not found</h1>
                <p className="text-zinc-400">This event may have been removed or the link is incorrect.</p>
            </div>
        );
    }

    const eventDate = new Date(event.date);
    const isPast = eventDate.getTime() < Date.now();
    const spotsLeft = event.max_attendees ? event.max_attendees - attendeeCount : null;
    const isFull = spotsLeft !== null && spotsLeft <= 0;

    return (
        <div className="min-h-screen bg-[#faf9f7]">
            {/* Top bar */}
            <div className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
                    <a href="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                        <div className="h-7 w-7 rounded-lg bg-zinc-900 flex items-center justify-center text-white text-xs font-bold">S</div>
                        Sinia Events
                    </a>
                    <div className="flex items-center gap-6">
                        <a
                            href="/admin/events"
                            className="hidden sm:block text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
                        >
                            Admin
                        </a>
                        <div className="relative">
                            <button
                                onClick={() => setShowShare(!showShare)}
                                className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
                            >
                                <Share2 className="h-4 w-4" />
                                Share
                            </button>
                            {showShare && (
                                <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white border border-black/5 shadow-xl p-2 z-50">
                                    <button onClick={() => { shareWhatsApp(event); setShowShare(false); }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-zinc-50 flex items-center gap-2.5 transition-colors">
                                        💬 WhatsApp
                                    </button>
                                    <button onClick={() => { shareTwitter(event); setShowShare(false); }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-zinc-50 flex items-center gap-2.5 transition-colors">
                                        𝕏 Twitter / X
                                    </button>
                                    <button onClick={() => { shareLinkedIn(event); setShowShare(false); }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-zinc-50 flex items-center gap-2.5 transition-colors">
                                        💼 LinkedIn
                                    </button>
                                    <hr className="my-1 border-black/5" />
                                    <button onClick={() => { copyLink(event.slug); setShowShare(false); }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-zinc-50 flex items-center gap-2.5 transition-colors">
                                        <Copy className="h-3.5 w-3.5" /> Copy link
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="mx-auto max-w-5xl px-4 py-10">
                <div className="grid gap-10 lg:grid-cols-[1fr_380px]">

                    {/* ─── LEFT COLUMN ─── */}
                    <div className="space-y-8">
                        {/* Cover image */}
                        {event.image_url && (
                            <div className="relative aspect-[16/9] rounded-3xl overflow-hidden shadow-lg">
                                <Image
                                    src={event.image_url}
                                    alt={event.title}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                    priority
                                />
                            </div>
                        )}

                        {/* Tag */}
                        {event.event_type && (
                            <span className="inline-block rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                                #{event.event_type}
                            </span>
                        )}

                        {/* Title */}
                        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-zinc-900 leading-tight">
                            {event.title}
                        </h1>

                        {/* Date / Time / Location */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-zinc-600">
                                <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                                    <Calendar className="h-5 w-5 text-zinc-400" />
                                </div>
                                <div>
                                    <p className="font-medium">{format(eventDate, "EEEE, MMMM d, yyyy")}</p>
                                    <p className="text-sm text-zinc-400">
                                        {format(eventDate, "h:mm a")}
                                        {event.end_date && ` – ${format(new Date(event.end_date), "h:mm a")}`}
                                    </p>
                                </div>
                            </div>

                            {event.location && (
                                <div className="flex items-center gap-3 text-zinc-600">
                                    <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                                        <MapPin className="h-5 w-5 text-zinc-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{event.location}</p>
                                        <p className="text-sm text-zinc-400">
                                            {event.is_virtual ? "Virtual Event" : "In-person"}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Add to Calendar */}
                        <div className="flex gap-3">
                            <a
                                href={googleCalendarUrl(event)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Google Calendar
                            </a>
                            <button
                                onClick={() => downloadIcal(event)}
                                className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
                            >
                                <Calendar className="h-3.5 w-3.5" />
                                Download .ics
                            </button>
                        </div>

                        {/* Description */}
                        {event.description && (
                            <div className="space-y-3">
                                <h2 className="text-lg font-semibold text-zinc-800">About this event</h2>
                                <p className="text-zinc-600 leading-relaxed whitespace-pre-wrap">
                                    {event.description}
                                </p>
                            </div>
                        )}

                        {/* Hosted by */}
                        <div className="rounded-2xl border border-black/5 bg-white/60 p-6">
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Hosted by</p>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center text-white font-bold text-sm">CF</div>
                                <div>
                                    <p className="font-semibold text-zinc-800">Christex Foundation</p>
                                    <p className="text-xs text-zinc-400">Sierra Leone · Tech Community</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── RIGHT COLUMN (Registration) ─── */}
                    <div className="lg:sticky lg:top-24 h-fit">
                        <div className="rounded-3xl border border-black/5 bg-white shadow-sm overflow-hidden">
                            {/* Header */}
                            <div className="px-6 pt-6 pb-4 border-b border-black/5">
                                <h3 className="font-semibold text-zinc-800 text-lg">Registration</h3>
                                <div className="flex items-center gap-3 mt-2 text-sm text-zinc-400">
                                    <div className="flex items-center gap-1.5">
                                        <Users className="h-4 w-4" />
                                        <span>{attendeeCount} going</span>
                                    </div>
                                    {spotsLeft !== null && (
                                        <span className={cn(
                                            "font-medium",
                                            spotsLeft <= 5 ? "text-amber-500" : "text-zinc-400"
                                        )}>
                                            · {spotsLeft > 0 ? `${spotsLeft} spots left` : "Sold out"}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Form or Confirmation */}
                            <div className="p-6">
                                {registered ? (
                                    <div className="text-center py-6 space-y-3">
                                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                                        <h4 className="text-lg font-semibold text-zinc-800">You're in!</h4>
                                        <p className="text-sm text-zinc-400">
                                            Check your email for the confirmation.
                                        </p>
                                        <a
                                            href={googleCalendarUrl(event)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-200 transition-colors mt-2"
                                        >
                                            <Calendar className="h-3.5 w-3.5" />
                                            Add to Calendar
                                        </a>
                                    </div>
                                ) : isPast ? (
                                    <div className="text-center py-6">
                                        <p className="text-zinc-400 font-medium">This event has ended</p>
                                    </div>
                                ) : isFull ? (
                                    <div className="text-center py-6">
                                        <p className="text-zinc-400 font-medium">This event is at full capacity</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleRegister} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Full Name *</label>
                                            <input
                                                required
                                                value={regName}
                                                onChange={(e) => setRegName(e.target.value)}
                                                placeholder="Your name"
                                                className="w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200 transition-shadow"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Email *</label>
                                            <input
                                                required
                                                type="email"
                                                value={regEmail}
                                                onChange={(e) => setRegEmail(e.target.value)}
                                                placeholder="you@example.com"
                                                className="w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200 transition-shadow"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Phone (optional)</label>
                                            <input
                                                type="tel"
                                                value={regPhone}
                                                onChange={(e) => setRegPhone(e.target.value)}
                                                placeholder="+232 XXX XXXX"
                                                className="w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200 transition-shadow"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={registering || !regName || !regEmail}
                                            className={cn(
                                                "w-full rounded-2xl py-4 text-sm font-bold text-white transition-all duration-300 shadow-sm",
                                                registering || !regName || !regEmail
                                                    ? "bg-zinc-300 cursor-not-allowed"
                                                    : "bg-zinc-900 hover:bg-zinc-800 hover:shadow-md active:scale-[0.98]"
                                            )}
                                        >
                                            {registering ? (
                                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                            ) : event.require_approval ? (
                                                "Request to Join"
                                            ) : (
                                                "Register"
                                            )}
                                        </button>
                                        <p className="text-[11px] text-center text-zinc-300">
                                            Free · No credit card required
                                        </p>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
