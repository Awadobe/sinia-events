"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow, isPast, differenceInHours } from "date-fns";
import { Users, UserCheck, Clock, QrCode, ArrowRight, Loader2, Check, TrendingUp, BarChart3, Calendar, MapPin, User, CheckCircle2, Timer, Plus, X, Mail, Search, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type InviteStats = { total: number; accepted: number; declined: number };
type Invite = { id: string; email: string; name: string | null; status: string; sent_at: string; accepted_at: string | null };
type Suggestion = { name: string; email: string; phone?: string; eventTitle: string; eventDate: string; guestCount: number };
type PastEvent = { id: string; title: string; date: string };

type Stats = {
    total: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    checkedIn: number;
};

type Registration = {
    id: string;
    name: string;
    email: string;
    status: string;
    checked_in: boolean;
    created_at: string;
};

type EventData = {
    id: string;
    title: string;
    date: string;
    end_date: string | null;
    location: string | null;
    slug: string;
    status: string;
    organizer?: {
        org_name?: string;
        name?: string;
    };
};

export default function OverviewPage() {
    const params = useParams();
    const slug = params.slug as string;
    const [event, setEvent] = useState<EventData | null>(null);
    const [stats, setStats] = useState<Stats | null>(null);
    const [recent, setRecent] = useState<Registration[]>([]);
    const [dailyBreakdown, setDailyBreakdown] = useState<{ date: string; count: number }[]>([]);
    const [loading, setLoading] = useState(true);

    // Invites state
    const [inviteStats, setInviteStats] = useState<InviteStats>({ total: 0, accepted: 0, declined: 0 });
    const [recentlyAccepted, setRecentlyAccepted] = useState<Invite[]>([]);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
    const [inviteTab, setInviteTab] = useState<'suggestions' | 'emails'>('suggestions');
    const [selectedEmails, setSelectedEmails] = useState<{ email: string; name: string }[]>([]);
    const [manualEmails, setManualEmails] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sendingInvites, setSendingInvites] = useState(false);

    const loadInvites = useCallback(async () => {
        try {
            const res = await fetch(`/api/events/${slug}/invites`);
            if (res.ok) {
                const data = await res.json();
                setInviteStats(data.stats);
                setRecentlyAccepted(data.recentlyAccepted || []);
                setSuggestions(data.suggestions || []);
                setPastEvents(data.pastEvents || []);
            }
        } catch {}
    }, [slug]);

    useEffect(() => {
        async function load() {
            const [eventRes, regRes] = await Promise.all([
                fetch(`/api/events/${slug}`),
                fetch(`/api/events/${slug}/registrations`),
            ]);

            if (eventRes.ok) {
                const eventData = await eventRes.json();
                setEvent(eventData.event);
            }

            if (regRes.ok) {
                const data = await regRes.json();
                setStats(data.stats);
                setRecent(data.registrations.slice(0, 5));
                setDailyBreakdown(data.dailyBreakdown || []);
            }

            await loadInvites();
            setLoading(false);
        }
        load();
    }, [slug, loadInvites]);

    const toggleSuggestion = (s: Suggestion) => {
        setSelectedEmails(prev => {
            const exists = prev.some(e => e.email === s.email);
            if (exists) return prev.filter(e => e.email !== s.email);
            return [...prev, { email: s.email, name: s.name }];
        });
    };

    const sendInvites = async () => {
        const emails: { email: string; name?: string }[] = [...selectedEmails];

        // Parse manual emails
        if (manualEmails.trim()) {
            const lines = manualEmails.split(/[,\n]/).map(e => e.trim()).filter(Boolean);
            for (const line of lines) {
                const emailMatch = line.match(/([\w.-]+@[\w.-]+\.[\w]+)/i);
                if (emailMatch) {
                    emails.push({ email: emailMatch[1], name: line.replace(emailMatch[1], '').trim() || undefined });
                }
            }
        }

        if (emails.length === 0) {
            toast.error('No emails to send invites to');
            return;
        }

        setSendingInvites(true);
        try {
            const res = await fetch(`/api/events/${slug}/invites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emails }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`${data.sent} invite${data.sent !== 1 ? 's' : ''} sent!${data.skipped ? ` (${data.skipped} skipped)` : ''}`);
                setShowInviteModal(false);
                setSelectedEmails([]);
                setManualEmails('');
                await loadInvites();
            } else {
                toast.error(data.error || 'Failed to send invites');
            }
        } catch {
            toast.error('Failed to send invites');
        }
        setSendingInvites(false);
    };

    const filteredSuggestions = suggestions.filter(s =>
        !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
            </div>
        );
    }

    const eventDate = event?.date ? new Date(event.date) : null;
    const isEventPast = eventDate ? isPast(eventDate) : false;
    const organizerName = event?.organizer?.org_name || event?.organizer?.name || 'Organizer';
    const hoursUntil = eventDate ? differenceInHours(eventDate, new Date()) : null;

    const statCards = [
        { label: "Total Registrations", value: stats?.total || 0, icon: Users, color: "bg-blue-50 text-blue-600" },
        { label: "Confirmed", value: stats?.confirmed || 0, icon: UserCheck, color: "bg-emerald-50 text-emerald-600" },
        { label: "Pending Approval", value: stats?.pending || 0, icon: Clock, color: "bg-amber-50 text-amber-600" },
        { label: "Checked In", value: stats?.checkedIn || 0, icon: QrCode, color: "bg-violet-50 text-violet-600" },
    ];

    return (
        <div className="space-y-8">
            {/* ── Event Status Banner ── */}
            {event && isEventPast ? (
                /* Past Event Banner */
                <div className="space-y-4">
                    <div className="rounded-2xl bg-zinc-900 p-6 text-white">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-bold">This Event Has Ended</h2>
                                <p className="text-sm text-zinc-400 mt-1">Thank you for hosting. We hope it was a success!</p>
                            </div>
                            <Link
                                href={`/events/${slug}/manage/guests`}
                                className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors shrink-0"
                            >
                                Insights <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Event Recap */}
                        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Event Recap</p>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-zinc-600">
                                    <Calendar className="h-4 w-4 text-zinc-400 shrink-0" />
                                    <span>{eventDate ? format(eventDate, "EEEE, MMM d") : "—"}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-zinc-600">
                                    <Clock className="h-4 w-4 text-zinc-400 shrink-0" />
                                    <span>{eventDate ? format(eventDate, "h:mm a") : "—"}</span>
                                </div>
                                {event.location && (
                                    <div className="flex items-center gap-3 text-sm text-zinc-600">
                                        <MapPin className="h-4 w-4 text-zinc-400 shrink-0" />
                                        <span>{event.location}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 text-sm text-zinc-600">
                                    <User className="h-4 w-4 text-zinc-400 shrink-0" />
                                    <span>{organizerName}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-zinc-600">
                                    <CheckCircle2 className="h-4 w-4 text-zinc-400 shrink-0" />
                                    <span className="font-medium">{stats?.checkedIn || 0} Checked-In Guests</span>
                                </div>
                            </div>
                        </div>

                        {/* Post-Event Summary */}
                        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Event Summary</p>
                            <div className="space-y-4">
                                {/* Attendance Rate */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-medium text-zinc-500">Attendance Rate</span>
                                        <span className="text-sm font-bold text-zinc-900">
                                            {stats?.confirmed ? Math.round((stats.checkedIn / stats.confirmed) * 100) : 0}%
                                        </span>
                                    </div>
                                    <div className="h-3 rounded-full bg-zinc-100 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                                            style={{ width: `${stats?.confirmed ? (stats.checkedIn / stats.confirmed) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <p className="text-[11px] text-zinc-400 mt-1.5">
                                        {stats?.checkedIn || 0} of {stats?.confirmed || 0} confirmed guests attended
                                    </p>
                                </div>

                                {/* Quick numbers */}
                                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-50">
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-zinc-900">{stats?.total || 0}</div>
                                        <div className="text-[9px] font-medium text-zinc-400 uppercase tracking-wider">Registered</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-emerald-600">{stats?.checkedIn || 0}</div>
                                        <div className="text-[9px] font-medium text-zinc-400 uppercase tracking-wider">Attended</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-red-400">{(stats?.confirmed || 0) - (stats?.checkedIn || 0)}</div>
                                        <div className="text-[9px] font-medium text-zinc-400 uppercase tracking-wider">No-Shows</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : event && !isEventPast ? (
                /* Upcoming Event Banner */
                <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 p-6 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                                    {hoursUntil !== null && hoursUntil <= 24 ? 'Starting Soon' : 'Upcoming Event'}
                                </span>
                            </div>
                            <h2 className="text-lg font-bold">
                                {hoursUntil !== null && hoursUntil <= 1
                                    ? 'Your event starts in less than an hour!'
                                    : hoursUntil !== null && hoursUntil <= 24
                                    ? `Your event starts in ${hoursUntil} hours`
                                    : eventDate
                                    ? `Event on ${format(eventDate, "EEEE, MMM d")} at ${format(eventDate, "h:mm a")}`
                                    : 'Event coming soon'
                                }
                            </h2>
                            <p className="text-sm text-white/70 mt-1">
                                {eventDate ? formatDistanceToNow(eventDate, { addSuffix: true }) : ''} • {stats?.confirmed || 0} confirmed guests
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Link
                                href={`/events/${slug}/manage/checkin`}
                                className="rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium hover:bg-white/30 transition-colors flex items-center gap-1.5"
                            >
                                <QrCode className="h-3.5 w-3.5" />
                                Check In
                            </Link>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => (
                    <div
                        key={card.label}
                        className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", card.color)}>
                                <card.icon className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-zinc-900">{card.value}</div>
                        <div className="text-xs text-zinc-400 font-medium mt-0.5">{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Registration Trend Chart */}
                <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="h-4 w-4 text-zinc-400" />
                        <h3 className="text-sm font-semibold text-zinc-900">Registrations — Last 7 Days</h3>
                    </div>
                    <div className="flex items-end gap-1.5 h-28">
                        {dailyBreakdown.map((day, i) => {
                            const maxCount = Math.max(...dailyBreakdown.map(d => d.count), 1);
                            const heightPct = Math.max((day.count / maxCount) * 100, 4);
                            const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' });
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-bold text-zinc-500">{day.count || ''}</span>
                                    <div
                                        className="w-full rounded-t-md transition-all duration-500"
                                        style={{
                                            height: `${heightPct}%`,
                                            backgroundColor: day.count > 0 ? '#6366f1' : '#f4f4f5',
                                            minHeight: '4px',
                                        }}
                                    />
                                    <span className="text-[9px] font-medium text-zinc-400">{dayLabel}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Check-in Rate + Quick Stats */}
                <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="h-4 w-4 text-zinc-400" />
                        <h3 className="text-sm font-semibold text-zinc-900">Event Insights</h3>
                    </div>
                    <div className="space-y-4">
                        {/* Check-in Rate */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-zinc-500">Check-in Rate</span>
                                <span className="text-sm font-bold text-zinc-900">
                                    {stats?.confirmed ? Math.round((stats.checkedIn / stats.confirmed) * 100) : 0}%
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                                    style={{ width: `${stats?.confirmed ? (stats.checkedIn / stats.confirmed) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Approval Rate */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-zinc-500">Approval Rate</span>
                                <span className="text-sm font-bold text-zinc-900">
                                    {stats?.total ? Math.round((stats.confirmed / stats.total) * 100) : 0}%
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                                    style={{ width: `${stats?.total ? (stats.confirmed / stats.total) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Quick totals */}
                        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-zinc-50">
                            <div className="text-center">
                                <div className="text-lg font-bold text-zinc-900">{stats?.total || 0}</div>
                                <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Total</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-bold text-emerald-600">{stats?.checkedIn || 0}</div>
                                <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Checked In</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-bold text-amber-500">{stats?.pending || 0}</div>
                                <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Pending</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Registrations */}
            <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
                    <h3 className="text-sm font-semibold text-zinc-900">Recent Registrations</h3>
                    <Link
                        href={`/events/${slug}/manage/guests`}
                        className="text-xs font-medium text-zinc-400 hover:text-zinc-900 flex items-center gap-1 transition-colors"
                    >
                        View all <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>

                {recent.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="text-4xl mb-3">👤</div>
                        <p className="text-sm text-zinc-400">No registrations yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-50">
                        {recent.map((reg) => (
                            <div key={reg.id} className="flex items-center gap-4 px-5 py-3.5">
                                <div className="relative">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                        {reg.name.charAt(0).toUpperCase()}
                                    </div>
                                    {reg.checked_in && (
                                        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                                            <Check className="h-2 w-2 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-zinc-900 truncate">{reg.name}</div>
                                    <div className="text-xs text-zinc-400 truncate">{reg.email}</div>
                                </div>
                                <span className={cn(
                                    "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest flex-shrink-0",
                                    reg.status === "confirmed" ? "bg-emerald-50 text-emerald-600" :
                                    reg.status === "pending" ? "bg-amber-50 text-amber-600" :
                                    "bg-red-50 text-red-500"
                                )}>
                                    {reg.checked_in ? "checked in" : reg.status}
                                </span>
                                <div className="text-xs text-zinc-300 flex-shrink-0">
                                    {format(new Date(reg.created_at), "MMM d")}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Invites Section ── */}
            <div className="space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-zinc-900">Invites</h2>
                        <p className="text-sm text-zinc-400 mt-0.5">Invite subscribers, contacts and past guests via email.</p>
                    </div>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Invite Guests
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Invite stats card */}
                    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold text-zinc-900">{inviteStats.accepted}</span>
                                    <span className="text-lg text-zinc-400 font-medium">/ {inviteStats.total}</span>
                                </div>
                                <p className="text-sm text-zinc-400 mt-0.5">Invites Accepted</p>
                            </div>
                            <Link
                                href={`/events/${slug}/manage/guests`}
                                className="text-zinc-300 hover:text-zinc-600 transition-colors"
                            >
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className="flex gap-4 mt-4 pt-3 border-t border-zinc-50">
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                <Mail className="h-3 w-3" />
                                <span>{inviteStats.total} Sent</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                <span>{inviteStats.declined} Declined</span>
                            </div>
                        </div>
                    </div>

                    {/* Recently accepted */}
                    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Recently Accepted</p>
                        {recentlyAccepted.length === 0 ? (
                            <p className="text-sm text-zinc-300 py-4 text-center">No accepted invites yet</p>
                        ) : (
                            <div className="space-y-2.5">
                                {recentlyAccepted.slice(0, 4).map((inv) => (
                                    <div key={inv.id} className="flex items-center gap-3">
                                        <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700 shrink-0">
                                            {(inv.name || inv.email).charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-sm font-medium text-zinc-900">{inv.name || inv.email.split('@')[0]}</span>
                                            <span className="text-xs text-zinc-400 ml-2">{inv.email}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ══════ Invite Modal ══════ */}
            {showInviteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                            <h2 className="text-lg font-bold text-zinc-900">Invite Guests</h2>
                            <div className="flex items-center gap-3">
                                {selectedEmails.length > 0 && (
                                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                                        {selectedEmails.length} selected
                                    </span>
                                )}
                                <button
                                    onClick={() => { setShowInviteModal(false); setSelectedEmails([]); setManualEmails(''); setSearchQuery(''); }}
                                    className="text-zinc-400 hover:text-zinc-600 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex flex-1 min-h-0">
                            {/* Left sidebar */}
                            <div className="w-48 border-r border-zinc-100 flex flex-col shrink-0">
                                <div className="p-3 space-y-1">
                                    <button
                                        onClick={() => setInviteTab('suggestions')}
                                        className={cn(
                                            "w-full text-left px-3 py-2 text-sm rounded-lg font-medium transition-colors flex items-center gap-2",
                                            inviteTab === 'suggestions' ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-500 hover:bg-zinc-50'
                                        )}
                                    >
                                        <Users className="h-3.5 w-3.5" />
                                        Suggestions
                                    </button>
                                    <button
                                        onClick={() => setInviteTab('emails')}
                                        className={cn(
                                            "w-full text-left px-3 py-2 text-sm rounded-lg font-medium transition-colors flex items-center gap-2",
                                            inviteTab === 'emails' ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-500 hover:bg-zinc-50'
                                        )}
                                    >
                                        <Mail className="h-3.5 w-3.5" />
                                        Enter Emails
                                    </button>
                                </div>

                                {/* Past events list in sidebar */}
                                {pastEvents.length > 0 && (
                                    <div className="px-3 mt-2 border-t border-zinc-50 pt-3">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 px-3 mb-2">Events</p>
                                        <div className="space-y-1 overflow-y-auto max-h-60">
                                            {pastEvents.map((pe) => (
                                                <div key={pe.id} className="px-3 py-1.5">
                                                    <p className="text-xs font-medium text-zinc-700 truncate">{pe.title}</p>
                                                    <p className="text-[10px] text-zinc-400">
                                                        {format(new Date(pe.date), 'MMM d, yyyy')}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right content */}
                            <div className="flex-1 flex flex-col min-h-0">
                                {inviteTab === 'suggestions' ? (
                                    <>
                                        {/* Search */}
                                        <div className="px-5 py-3 border-b border-zinc-50">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300" />
                                                <input
                                                    type="text"
                                                    placeholder="Search Suggestions"
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                                                />
                                            </div>
                                        </div>

                                        {/* Suggestions list */}
                                        <div className="flex-1 overflow-y-auto">
                                            {filteredSuggestions.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                                    <Users className="h-8 w-8 text-zinc-200 mb-3" />
                                                    <p className="text-sm text-zinc-400">
                                                        {suggestions.length === 0 ? 'No past guests to suggest' : 'No results found'}
                                                    </p>
                                                    <p className="text-xs text-zinc-300 mt-1">
                                                        Switch to &quot;Enter Emails&quot; to add manually
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-zinc-50">
                                                    {filteredSuggestions.map((s, i) => {
                                                        const isSelected = selectedEmails.some(e => e.email === s.email);
                                                        const colors = ['bg-emerald-100 text-emerald-700', 'bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700'];
                                                        return (
                                                            <button
                                                                key={s.email}
                                                                onClick={() => toggleSuggestion(s)}
                                                                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 transition-colors text-left"
                                                            >
                                                                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", colors[i % colors.length])}>
                                                                    {s.name.substring(0, 2).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="text-sm font-medium text-zinc-900">{s.name}</div>
                                                                    <div className="text-xs text-zinc-400">{s.email}</div>
                                                                </div>
                                                                <div className={cn(
                                                                    "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                                                    isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-300'
                                                                )}>
                                                                    {isSelected && <Check className="h-3 w-3 text-white" />}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    /* Enter Emails tab */
                                    <div className="p-5 flex-1 flex flex-col">
                                        <p className="text-xs font-medium text-zinc-500 mb-2">
                                            Enter email addresses (one per line or comma-separated)
                                        </p>
                                        <textarea
                                            value={manualEmails}
                                            onChange={e => setManualEmails(e.target.value)}
                                            placeholder={"john@example.com\njane@example.com\nmark@example.com"}
                                            className="flex-1 w-full rounded-xl border border-zinc-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 min-h-[200px]"
                                        />
                                        <p className="text-[11px] text-zinc-400 mt-2">
                                            Tip: Already registered or previously invited emails will be skipped automatically.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50/50">
                            <button
                                onClick={() => { setShowInviteModal(false); setSelectedEmails([]); setManualEmails(''); }}
                                className="px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={sendInvites}
                                disabled={sendingInvites || (selectedEmails.length === 0 && !manualEmails.trim())}
                                className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                {sendingInvites ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Send className="h-3.5 w-3.5" />
                                )}
                                {sendingInvites ? 'Sending...' : 'Send Invites'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
