"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RegistrationAnswers, RegistrationField } from "@/lib/registration-fields";

import { resolveTheme } from "@/lib/theme";
import {
    Calendar,
    MapPin,
    Users,
    Share2,
    Copy,
    CheckCircle2,
    Loader2,
    ExternalLink,
    X,
    Globe,
    Settings,
} from "lucide-react";

type OrganizerData = {
    id: string;
    org_name: string | null;
    name: string | null;
    avatar_url: string | null;
};

type HostData = {
    id: string;
    type: "individual" | "organization";
    name: string;
    slug: string;
    logo_url: string | null;
};

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
    registration_fields: RegistrationField[];
    organizer: OrganizerData | null;
    host: HostData | null;
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
    const url = window.location.href.split("?")[0];
    const text = `Check out this event: *${event.title}*\n📅 ${format(new Date(event.date), "EEE, MMM d · h:mm a")}\n📍 ${event.location || "Online"}\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

function shareTwitter(event: EventData) {
    const url = window.location.href.split("?")[0];
    const text = `${event.title} — ${format(new Date(event.date), "MMM d")}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
}

function shareLinkedIn() {
    const url = window.location.href.split("?")[0];
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank");
}

async function copyLink(slug: string) {
    const url = `${window.location.origin}/events/${slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied!");
}

/* ───── Organizer display name helper ───── */
function getOrganizerName(organizer: OrganizerData | null, host?: HostData | null): string {
    if (host?.name) return host.name;
    if (!organizer) return "Radius Events";
    return organizer.org_name || organizer.name || "Radius Events";
}

function getOrganizerInitials(organizer: OrganizerData | null, host?: HostData | null): string {
    const name = getOrganizerName(organizer, host);
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

/* ═══════════════════════════════════════════ */
/*           REGISTRATION MODAL               */
/* ═══════════════════════════════════════════ */

function CustomRegistrationField({ field, value, onChange }: { field: RegistrationField; value: RegistrationAnswers[string] | undefined; onChange: (value: RegistrationAnswers[string]) => void }) {
    const inputClass = "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-transparent focus:ring-2 focus:ring-zinc-300";
    const options = (field.options || []).filter(Boolean);
    return <div><label className="mb-2 block text-sm font-medium text-zinc-700">{field.label}{field.required && <span className="text-zinc-400"> *</span>}</label>{field.description && <p className="mb-2 text-xs leading-relaxed text-zinc-400">{field.description}</p>}
        {field.type === "long_text" ? <textarea required={field.required} rows={4} value={String(value || "")} onChange={(e) => onChange(e.target.value)} className={`${inputClass} resize-none`} />
        : field.type === "select" ? <select required={field.required} value={String(value || "")} onChange={(e) => onChange(e.target.value)} className={inputClass}><option value="">Select an option</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
        : field.type === "radio" ? <div className="space-y-2">{options.map((option) => <label key={option} className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700"><input type="radio" name={field.id} required={field.required} checked={value === option} onChange={() => onChange(option)} className="accent-zinc-900" />{option}</label>)}</div>
        : field.type === "multi_select" ? <div className="space-y-2">{options.map((option) => { const selected = Array.isArray(value) ? value : []; return <label key={option} className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700"><input type="checkbox" checked={selected.includes(option)} onChange={(e) => onChange(e.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} className="accent-zinc-900" />{option}</label>; })}</div>
        : field.type === "checkbox" ? <div className="grid grid-cols-2 gap-2"><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700"><input type="radio" name={field.id} required={field.required} checked={value === true} onChange={() => onChange(true)} className="accent-zinc-900" />Yes</label><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700"><input type="radio" name={field.id} required={field.required} checked={value === false} onChange={() => onChange(false)} className="accent-zinc-900" />No</label></div>
        : <input type={field.type === "number" ? "number" : field.type === "phone" ? "tel" : "text"} required={field.required} value={String(value || "")} onChange={(e) => onChange(e.target.value)} className={inputClass} />}
    </div>;
}

function RegistrationModal({
    event,
    invitationToken,
    onClose,
    onSuccess,
}: {
    event: EventData;
    invitationToken?: string | null;
    onClose: () => void;
    onSuccess: (regId?: string) => void;
}) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [customAnswers, setCustomAnswers] = useState<RegistrationAnswers>({});
    const overlayRef = useRef<HTMLDivElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch("/api/events/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event_id: event.id,
                    name,
                    email,
                    phone: null,
                    custom_answers: customAnswers,
                    invitation_token: invitationToken,
                }),
            });
            const result = await res.json();
            if (!res.ok) {
                toast.error(result.error || "Registration failed");
            } else {
                toast.success(
                    event.require_approval
                        ? "Your request has been submitted!"
                        : "You're registered! Your ticket is ready."
                );
                // Save registration to localStorage so page remembers on reload
                try {
                    localStorage.setItem(`registered_${event.slug}`, JSON.stringify({
                        email,
                        name,
                        registrationId: result.registration?.id,
                    }));
                } catch {}
                onSuccess(result.registration?.id);
            }
        } catch {
            toast.error("Something went wrong. Please try again.");
        }
        setSubmitting(false);
    };

    return (
        <div
            ref={overlayRef}
            onClick={(e) => {
                if (e.target === overlayRef.current) onClose();
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ animation: "modalFadeIn 0.25s ease-out" }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xl" />

            {/* Modal */}
            <div
                className="relative z-10 max-h-[90vh] w-full max-w-md mx-4 overflow-y-auto rounded-2xl bg-white border border-black/5 shadow-2xl"
                style={{ animation: "modalSlideUp 0.3s ease-out" }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition-all"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="p-8">
                    <h2 className="text-xl font-bold text-zinc-900 mb-6">Your Info</h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-2">
                                Name <span className="text-zinc-400">*</span>
                            </label>
                            <input
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your Name"
                                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-2">
                                Email <span className="text-zinc-400">*</span>
                            </label>
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@email.com"
                                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:border-transparent transition-all"
                            />
                        </div>

                        {(event.registration_fields || []).map((field) => <CustomRegistrationField key={field.id} field={field} value={customAnswers[field.id]} onChange={(value) => setCustomAnswers((answers) => ({ ...answers, [field.id]: value }))} />)}

                        <button
                            type="submit"
                            disabled={submitting || !name || !email}
                            className={cn(
                                "w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all duration-200 shadow-sm mt-2",
                                submitting || !name || !email
                                    ? "bg-zinc-300 cursor-not-allowed"
                                    : "bg-zinc-900 hover:bg-zinc-800 hover:shadow-md active:scale-[0.98]"
                            )}
                        >
                            {submitting ? (
                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            ) : event.require_approval ? (
                                "Request to Join"
                            ) : (
                                "Register"
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Inline animation keyframes */}
            <style jsx>{`
                @keyframes modalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalSlideUp {
                    from { opacity: 0; transform: translateY(16px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}

/* ═══════════════════════════════════════════ */
/*               PAGE COMPONENT               */
/* ═══════════════════════════════════════════ */

export default function PublicEventPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const slug = params.slug as string;
    const invitationToken = searchParams.get("invite");

    const [event, setEvent] = useState<EventData | null>(null);
    const [attendeeCount, setAttendeeCount] = useState(0);
    const [canManage, setCanManage] = useState(false);
    const [teamRole, setTeamRole] = useState<"manager" | "check_in" | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);



    // Modal
    const [showModal, setShowModal] = useState(false);
    const [registered, setRegistered] = useState(false);
    const [registrationId, setRegistrationId] = useState<string | null>(null);

    // Share dropdown
    const [showShare, setShowShare] = useState(false);

    useEffect(() => {
        async function load() {
            const [res, accessRes, accountRegistrationRes] = await Promise.all([
                fetch(`/api/events/${slug}?t=${Date.now()}${invitationToken ? `&invite=${encodeURIComponent(invitationToken)}` : ""}`, { cache: "no-store" }),
                fetch(`/api/events/${slug}/access?t=${Date.now()}`),
                fetch(`/api/events/${slug}/registration?t=${Date.now()}`),
            ]);
            if (!res.ok) {
                setNotFound(true);
                setLoading(false);
                return;
            }
            const data = await res.json();
            setEvent(data.event);
            setAttendeeCount(data.attendee_count ?? 0);
            if (data.invitation_registration_id) {
                setRegistered(true);
                setRegistrationId(data.invitation_registration_id);
            }
            if (accessRes.ok) {
                const access = await accessRes.json();
                setCanManage(Boolean(access.can_manage));
                setTeamRole(access.collaborator_role === "check_in" ? "check_in" : access.can_manage ? "manager" : null);
            }
            setLoading(false);

            if (accountRegistrationRes.ok) {
                const accountRegistration = await accountRegistrationRes.json();
                if (accountRegistration.registration) {
                    setRegistered(true);
                    setRegistrationId(accountRegistration.registration.id);
                    try {
                        localStorage.setItem(`registered_${slug}`, JSON.stringify({
                            email: accountRegistration.registration.email,
                            name: accountRegistration.registration.name,
                            registrationId: accountRegistration.registration.id,
                        }));
                    } catch {}
                    return;
                }
            }

            // Check if user already registered (from localStorage)
            try {
                const stored = localStorage.getItem(`registered_${slug}`);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.registrationId) {
                        // The registration ID acts as the private ticket reference.
                        const regRes = await fetch(`/api/events/${slug}/registration?id=${encodeURIComponent(parsed.registrationId)}&t=${Date.now()}`);
                        if (regRes.ok) {
                            const regData = await regRes.json();
                            if (regData.registration) {
                                setRegistered(true);
                                setRegistrationId(regData.registration.id);
                            }
                        }
                    }
                }
            } catch {}
        }
        load();
    }, [slug, invitationToken]);

    // Close share dropdown when clicking outside
    useEffect(() => {
        const handler = () => setShowShare(false);
        if (showShare) {
            document.addEventListener("click", handler);
            return () => document.removeEventListener("click", handler);
        }
    }, [showShare]);

    /* ───── Loading / Not found states ───── */
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8f7f4]">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (notFound || !event) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f7f4] gap-4">
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
    const organizerName = getOrganizerName(event.organizer, event.host);
    const organizerInitials = getOrganizerInitials(event.organizer, event.host);
    const organizerImage = event.host?.logo_url || event.organizer?.avatar_url;

    /* ───── Date display helpers ───── */
    const monthAbbr = format(eventDate, "MMM").toUpperCase();
    const dayNum = format(eventDate, "d");
    const dayOfWeek = format(eventDate, "EEEE");
    const fullDate = format(eventDate, "MMMM d");
    const startTime = format(eventDate, "h:mm a");
    const endTime = event.end_date ? format(new Date(event.end_date), "h:mm a") : null;
    const resolvedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timeZone = ["Africa/Freetown", "Africa/Monrovia", "Africa/Abidjan", "GMT", "UTC"].includes(resolvedTimeZone)
        ? "GMT (Sierra Leone)"
        : resolvedTimeZone.split("/").pop()?.replace(/_/g, " ") || "GMT";

    const theme = resolveTheme({
        color: event.theme_color,
        style: event.theme_style,
        font: event.theme_font,
        mode: event.theme_mode,
    });

    return (
        <div className="min-h-screen" style={{ background: theme.pageBackground, fontFamily: theme.fontFamily }}>
            {/* ───── Top Navigation Bar ───── */}
            <header className="border-b border-black/[0.04] backdrop-blur-xl sticky top-0 z-50" style={{ backgroundColor: theme.headerBackground }}>
                <div className="mx-auto max-w-6xl flex items-center justify-between px-5 py-3.5">
                    <a href="/" className="flex items-center gap-2.5 text-sm font-semibold transition-colors" style={{ color: theme.text }}>
                        <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: theme.primary }}>R</div>
                        Radius
                    </a>

                    <div className="flex items-center gap-3">
                        {canManage && (
                            <Link
                                href={`/admin/events/${slug}/manage/${teamRole === "check_in" ? "checkin" : "overview"}`}
                                className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors shadow-sm"
                            >
                                <Settings className="h-4 w-4" />
                                {teamRole === "check_in" ? "Check in" : "Manage"}
                            </Link>
                        )}

                        {/* Share button */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setShowShare(!showShare)}
                                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                                style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : '#f4f4f5', color: theme.textMuted }}
                            >
                                <Share2 className="h-4 w-4" />
                                Share
                            </button>
                            {showShare && (
                                <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white border border-black/5 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button onClick={() => { shareWhatsApp(event); setShowShare(false); }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-zinc-50 flex items-center gap-2.5 transition-colors">
                                        💬 WhatsApp
                                    </button>
                                    <button onClick={() => { shareTwitter(event); setShowShare(false); }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-zinc-50 flex items-center gap-2.5 transition-colors">
                                        𝕏 Twitter / X
                                    </button>
                                    <button onClick={() => { shareLinkedIn(); setShowShare(false); }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-zinc-50 flex items-center gap-2.5 transition-colors">
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
            </header>

            {/* ───── Main Content ───── */}
            <main className="mx-auto max-w-6xl px-5 py-10">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(400px,480px)]">

                    {/* ═══════ LEFT COLUMN ═══════ */}
                    <div className="space-y-8 order-2 lg:order-1">
                        {/* Cover image */}
                        {event.image_url && (
                            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-md">
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

                        {/* Hosted By card */}
                        <div className="rounded-2xl p-6" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.cardBorder}` }}>
                            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: theme.textMuted }}>Hosted by</p>
                            <div className="flex items-center gap-3">
                                {organizerImage ? (
                                    <Image
                                        src={organizerImage}
                                        alt={organizerName}
                                        width={44}
                                        height={44}
                                        className="rounded-full object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="h-11 w-11 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: theme.primary }}>
                                        {organizerInitials}
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold" style={{ color: theme.text }}>{organizerName}</p>
                                    <p className="text-xs" style={{ color: theme.textMuted }}>Event Organizer</p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ═══════ RIGHT COLUMN ═══════ */}
                    <div className="space-y-6 order-1 lg:order-2">
                        {/* Event title */}
                        <h1 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-semibold tracking-tight leading-[1.15]" style={{ color: theme.text }}>
                            {event.title}
                        </h1>

                        {/* Date & Time */}
                        <div className="flex items-start gap-4">
                            {/* Calendar icon block */}
                            <div className="flex-shrink-0 h-14 w-14 rounded-xl flex flex-col items-center justify-center overflow-hidden shadow-sm" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.cardBorder}` }}>
                                <span className="text-[10px] font-bold uppercase leading-none pt-1" style={{ color: theme.primary }}>{monthAbbr}</span>
                                <span className="text-xl font-bold leading-none" style={{ color: theme.text }}>{dayNum}</span>
                            </div>
                            <div>
                                <p className="font-semibold" style={{ color: theme.text }}>{dayOfWeek}, {fullDate}</p>
                                <p className="text-sm mt-0.5" style={{ color: theme.textMuted }}>
                                    {startTime}{endTime && ` - ${endTime}`} {timeZone}
                                </p>
                            </div>
                        </div>

                        {/* Location */}
                        {event.location && (
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 h-14 w-14 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.cardBorder}` }}>
                                    {event.is_virtual ? (
                                        <Globe className="h-5 w-5" style={{ color: theme.primary }} />
                                    ) : (
                                        <MapPin className="h-5 w-5" style={{ color: theme.primary }} />
                                    )}
                                </div>
                                <div>
                                    <p className="font-semibold" style={{ color: theme.text }}>{event.location}</p>
                                    <p className="text-sm mt-0.5" style={{ color: theme.textMuted }}>
                                        {event.is_virtual ? "Virtual Event" : "In-person"}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── Registration Card ─── */}
                        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.cardBorder}` }}>
                            {/* Header */}
                            <div className="px-6 pt-5 pb-3">
                                <p className="text-sm font-semibold" style={{ color: theme.textMuted }}>Registration</p>
                            </div>

                            <div className="px-6 pb-6">
                                {canManage ? (
                                    <div className="py-5 text-center">
                                        <Settings className="mx-auto h-10 w-10" style={{ color: theme.primary }} />
                                        <h4 className="mt-3 text-lg font-semibold" style={{ color: theme.text }}>
                                            You&apos;re on the event team
                                        </h4>
                                        <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                                            {teamRole === "check_in"
                                                ? "You have check-in access for this event."
                                                : "You have event management access."}
                                        </p>
                                        <Link
                                            href={`/admin/events/${slug}/manage/${teamRole === "check_in" ? "checkin" : "overview"}`}
                                            className="mt-5 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold text-white"
                                            style={{ backgroundColor: theme.primary }}
                                        >
                                            {teamRole === "check_in" ? "Open check-in" : "Manage event"}
                                        </Link>
                                    </div>
                                ) : registered ? (
                                    /* ── Success state ── */
                                    <div className="text-center py-6 space-y-3">
                                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                                        <h4 className="text-lg font-semibold" style={{ color: theme.text }}>You&apos;re in!</h4>
                                        <p className="text-sm" style={{ color: theme.textMuted }}>
                                            Your registration is saved. Open your ticket below.
                                        </p>
                                        <div className="flex flex-col gap-2 pt-2">
                                            {registrationId && (
                                                <a
                                                    href={`/events/${slug}/ticket?id=${registrationId}${invitationToken ? `&invite=${encodeURIComponent(invitationToken)}` : ""}`}
                                                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors hover:opacity-90"
                                                    style={{ backgroundColor: theme.primary }}
                                                >
                                                    🎫 My Ticket
                                                </a>
                                            )}
                                            <a
                                                href={googleCalendarUrl(event)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                                                style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : '#f4f4f5', color: theme.textMuted }}
                                            >
                                                <Calendar className="h-3.5 w-3.5" />
                                                Add to Calendar
                                            </a>
                                        </div>
                                    </div>
                                ) : isPast ? (
                                    /* ── Past event state ── */
                                    <div className="flex items-center gap-3 py-3">
                                        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : '#f4f4f5' }}>
                                            <Calendar className="h-5 w-5" style={{ color: theme.textMuted }} />
                                        </div>
                                        <div>
                                            <p className="font-medium" style={{ color: theme.text }}>Past Event</p>
                                            <p className="text-sm" style={{ color: theme.textMuted }}>This event has ended.</p>
                                        </div>
                                    </div>
                                ) : isFull ? (
                                    /* ── Full capacity state ── */
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 py-2">
                                            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                                                <Users className="h-5 w-5 text-amber-500" />
                                            </div>
                                            <div>
                                                <p className="font-medium" style={{ color: theme.text }}>Sold Out</p>
                                                <p className="text-sm" style={{ color: theme.textMuted }}>This event is at full capacity.</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* ── Active registration state ── */
                                    <div className="space-y-4">
                                        {/* Confirmed attendee count */}
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <span className="text-sm font-medium" style={{ color: theme.text }}>{attendeeCount} going</span>
                                                {spotsLeft !== null && (
                                                    <span className={cn(
                                                        "text-sm ml-1.5 font-medium",
                                                        spotsLeft <= 10 ? "text-amber-500" : ""
                                                    )} style={spotsLeft > 10 ? { color: theme.textMuted } : undefined}>
                                                        · {spotsLeft} spots left
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-sm" style={{ color: theme.textMuted }}>
                                            Welcome! To join the event, please register below.
                                        </p>

                                        <button
                                            onClick={() => setShowModal(true)}
                                            className="w-full rounded-xl py-3.5 text-sm font-bold text-white hover:shadow-md active:scale-[0.98] transition-all duration-200 shadow-sm hover:opacity-90"
                                            style={{ backgroundColor: theme.primary }}
                                        >
                                            {event.require_approval ? "Request to Join" : "Register"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─── About Event Section ─── */}
                        {event.description && (
                            <div className="space-y-3">
                                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>About Event</h2>
                                <p className="leading-relaxed whitespace-pre-wrap text-[15px]" style={{ color: theme.isDark ? theme.textMuted : '#52525b' }}>
                                    {event.description}
                                </p>
                            </div>
                        )}

                        {/* Tag */}
                        {event.event_type && (
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: theme.textMuted }}>
                                    #{event.event_type}
                                </span>
                            </div>
                        )}

                        {/* Add to Calendar row */}
                        <div className="flex gap-3">
                            <a
                                href={googleCalendarUrl(event)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-80"
                                style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: theme.textMuted }}
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Google Calendar
                            </a>
                            <button
                                onClick={() => downloadIcal(event)}
                                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-80"
                                style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: theme.textMuted }}
                            >
                                <Calendar className="h-3.5 w-3.5" />
                                Download .ics
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* ───── Footer ───── */}
            <footer className="border-t py-8 mt-4" style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                <div className="mx-auto max-w-6xl px-5 flex items-center justify-center gap-3">
                    {organizerImage ? (
                        <Image
                            src={organizerImage}
                            alt={organizerName}
                            width={28}
                            height={28}
                            className="rounded-full object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="h-7 w-7 rounded-full flex items-center justify-center text-white font-bold text-[10px]" style={{ backgroundColor: theme.primary }}>
                            {organizerInitials}
                        </div>
                    )}
                    <p className="text-sm" style={{ color: theme.textMuted }}>
                        Presented by <span className="font-semibold" style={{ color: theme.text }}>{organizerName}</span>
                    </p>
                </div>
            </footer>

            {/* ───── Registration Modal ───── */}
            {showModal && (
                <RegistrationModal
                    event={event}
                    invitationToken={invitationToken}
                    onClose={() => setShowModal(false)}
                    onSuccess={(regId) => {
                        setShowModal(false);
                        setRegistered(true);
                        if (regId) setRegistrationId(regId);
                        if (!event.require_approval) setAttendeeCount((c) => c + 1);
                    }}
                />
            )}
        </div>
    );
}
