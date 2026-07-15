"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
    Loader2,
    CalendarDays,
    MapPin,
    ArrowLeft,

    CheckCircle2,
    Clock,

} from "lucide-react";
import { format } from "date-fns";
import QRCode from "qrcode";

/* ─────────────── types ─────────────── */
interface EventData {
    id: string;
    title: string;
    slug: string;
    date: string;
    end_date?: string;
    location?: string;
    image_url?: string;
    theme_color?: string;
    theme_style?: string;
    theme_font?: string;
    theme_mode?: string;
    organizer?: { org_name?: string; name?: string };
}

interface RegistrationData {
    id: string;
    name: string;
    email: string;
    status: string;
    checked_in: boolean;
    checked_in_at?: string;
    created_at: string;
}

/* ─────────────── theme helper (lightweight) ─────────────── */
const COLORS: Record<string, string> = {
    slate: "#64748b", rose: "#f43f5e", orange: "#f97316", amber: "#f59e0b",
    emerald: "#10b981", sky: "#0ea5e9", indigo: "#6366f1", violet: "#8b5cf6",
    pink: "#ec4899", zinc: "#18181b",
};

export default function TicketPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const slug = params.slug as string;
    const regId = searchParams.get("id");

    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState<EventData | null>(null);
    const [registration, setRegistration] = useState<RegistrationData | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>("");
    const [error, setError] = useState<string>("");

    useEffect(() => {
        if (!regId) {
            setError("No ticket ID provided.");
            setLoading(false);
            return;
        }

        async function load() {
            try {
                // Fetch event
                const evRes = await fetch(`/api/events/${slug}?t=${Date.now()}`);
                if (!evRes.ok) { setError("Event not found."); setLoading(false); return; }
                const evData = await evRes.json();
                setEvent(evData.event);

                // Fetch registrations to find this specific one
                const regRes = await fetch(`/api/events/${slug}/registrations?t=${Date.now()}`);
                if (!regRes.ok) { setError("Could not load registrations."); setLoading(false); return; }
                const regData = await regRes.json();
                const found = regData.registrations?.find((r: RegistrationData) => r.id === regId);

                if (!found) {
                    setError("Ticket not found. Please check your link.");
                    setLoading(false);
                    return;
                }
                setRegistration(found);

                // Generate QR code — encodes the registration ID for scanning

                const checkInPayload = JSON.stringify({
                    type: "checkin",
                    registrationId: regId,
                    eventSlug: slug,
                });
                const qr = await QRCode.toDataURL(checkInPayload, {
                    width: 300,
                    margin: 2,
                    color: { dark: "#18181b", light: "#ffffff" },
                    errorCorrectionLevel: "M",
                });
                setQrDataUrl(qr);
            } catch {
                setError("Something went wrong loading your ticket.");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [slug, regId]);

    const accent = COLORS[event?.theme_color || "zinc"] || "#18181b";

    /* ─── Loading ─── */
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
        );
    }

    /* ─── Error ─── */
    if (error || !event || !registration) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 gap-4 px-6">
                <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center">
                    <span className="text-2xl">😕</span>
                </div>
                <h1 className="text-xl font-bold text-zinc-900">{error || "Ticket not found"}</h1>
                <Link href={`/events/${slug}`} className="text-sm font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1.5 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to Event
                </Link>
            </div>
        );
    }

    const dateObj = new Date(event.date);
    const formattedDate = format(dateObj, "EEEE, MMMM d, yyyy");
    const formattedTime = format(dateObj, "h:mm a");
    const orgName = event.organizer?.org_name || event.organizer?.name || "Event Organizer";

    return (
        <div className="min-h-screen bg-zinc-100" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* ─── Header bar ─── */}
            <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
                <div className="max-w-lg mx-auto flex items-center justify-between px-5 py-3">
                    <Link href={`/events/${slug}`} className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Event
                    </Link>
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">My Ticket</span>
                </div>
            </header>

            <div className="max-w-lg mx-auto px-5 py-8 space-y-6">
                {/* ─── Ticket Card ─── */}
                <div className="bg-white rounded-3xl shadow-lg overflow-hidden relative">
                    {/* Color accent bar */}
                    <div className="h-2" style={{ backgroundColor: accent }} />

                    {/* Event cover (if any) */}
                    {event.image_url && (
                        <div className="relative h-40 w-full">
                            <Image src={event.image_url} alt={event.title} fill className="object-cover" unoptimized />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        </div>
                    )}

                    {/* Event info */}
                    <div className="px-6 pt-6 pb-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                            {orgName}
                        </p>
                        <h1 className="text-2xl font-bold text-zinc-900 leading-tight mb-4">
                            {event.title}
                        </h1>

                        <div className="space-y-2.5">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}15` }}>
                                    <CalendarDays className="h-4 w-4" style={{ color: accent }} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-zinc-900">{formattedDate}</p>
                                    <p className="text-xs text-zinc-400">{formattedTime}</p>
                                </div>
                            </div>

                            {event.location && (
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}15` }}>
                                        <MapPin className="h-4 w-4" style={{ color: accent }} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-900">{event.location}</p>
                                        <p className="text-xs text-zinc-400">In-person</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── Perforated divider ─── */}
                    <div className="relative my-2">
                        {/* Left circle cutout */}
                        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-zinc-100 rounded-full" />
                        {/* Right circle cutout */}
                        <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-zinc-100 rounded-full" />
                        {/* Dashed line */}
                        <div className="border-t-2 border-dashed border-zinc-200 mx-8" />
                    </div>

                    {/* ─── QR Code section ─── */}
                    <div className="px-6 pt-4 pb-6 text-center">
                        {registration.checked_in ? (
                            <div className="space-y-3 py-4">
                                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                                <h3 className="text-lg font-bold text-zinc-900">Checked In</h3>
                                <p className="text-sm text-zinc-400">
                                    {registration.checked_in_at
                                        ? `at ${format(new Date(registration.checked_in_at), "h:mm a, MMM d")}`
                                        : "Successfully checked in"}
                                </p>
                            </div>
                        ) : (
                            <>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">
                                    Show this code at the door
                                </p>
                                {qrDataUrl && (
                                    <div className="inline-block p-3 bg-white rounded-2xl border-2 border-zinc-100 shadow-sm">
                                        <Image src={qrDataUrl} alt="Ticket QR Code" width={208} height={208} className="w-52 h-52" />
                                    </div>
                                )}
                                <p className="text-xs text-zinc-400 mt-3">
                                    Ticket ID: <span className="font-mono text-zinc-500">{registration.id.slice(0, 8)}</span>
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* ─── Attendee info card ─── */}
                <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Attendee</p>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: accent }}>
                            {registration.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-zinc-900">{registration.name}</p>
                            <p className="text-xs text-zinc-400">{registration.email}</p>
                        </div>
                        <div className="ml-auto">
                            {registration.status === "confirmed" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase">
                                    <CheckCircle2 className="h-3 w-3" /> Confirmed
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold uppercase">
                                    <Clock className="h-3 w-3" /> Pending
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─── Actions ─── */}
                <div className="flex gap-3">
                    <Link
                        href={`/events/${slug}`}
                        className="flex-1 text-center rounded-2xl py-3.5 text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: accent }}
                    >
                        View Event
                    </Link>
                </div>

                {/* ─── Footer ─── */}
                <p className="text-center text-xs text-zinc-300 pt-4">
                    Powered by Radius
                </p>
            </div>
        </div>
    );
}
