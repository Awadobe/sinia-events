"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ArrowLeft, Calendar, MapPin, ExternalLink, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type EventData = {
    id: string;
    title: string;
    date: string;
    end_date: string | null;
    location: string | null;
    image_url: string | null;
    slug: string;
    status: string;
    event_type: string;
    is_virtual: boolean;
    public_slug: string;
    host: { slug: string } | null;
};

const TABS = [
    { id: "overview", label: "Overview", href: "overview" },
    { id: "guests", label: "Guests", href: "guests" },
    { id: "checkin", label: "Check In", href: "checkin" },
    { id: "edit", label: "Edit", href: "edit" },
    { id: "blast", label: "Blast", href: "blast" },
    { id: "team", label: "Team", href: "team" },
];

export default function ManageEventLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const params = useParams();
    const pathname = usePathname();
    const slug = params.slug as string;
    const [event, setEvent] = useState<EventData | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkInOnly, setCheckInOnly] = useState(false);

    useEffect(() => {
        async function load() {
            const [res, accessRes] = await Promise.all([fetch(`/api/events/${slug}`), fetch(`/api/events/${slug}/access`)]);
            if (res.ok) {
                const { event } = await res.json();
                setEvent(event);
            }
            if (accessRes.ok) {
                const access = await accessRes.json();
                setCheckInOnly(Boolean(access.is_check_in_staff));
            }
            setLoading(false);
        }
        load();
    }, [slug]);

    const activeTab = TABS.find(t => pathname.includes(`/manage/${t.href}`))?.id || "overview";
    const publicEventPath = event?.host?.slug && event.public_slug
        ? `/hosts/${event.host.slug}/events/${event.public_slug}`
        : `/events/${slug}`;

    const copyLink = async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${publicEventPath}`);
        toast.success("Event link copied!");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#faf9f7]">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#faf9f7]">
                <p className="text-zinc-500">Event not found</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#faf9f7]">
            {/* Top Header */}
            <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="mx-auto max-w-5xl px-4 sm:px-6">
                    {/* Row 1: Back + Actions */}
                    <div className="flex items-center justify-between py-3">
                        <Link
                            href="/"
                            className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-900 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Events
                        </Link>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={copyLink}
                                className="flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
                            >
                                <Copy className="h-3.5 w-3.5" />
                                Copy Link
                            </button>
                            <Link
                                href={publicEventPath}
                                target="_blank"
                                className="flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View Page
                            </Link>
                        </div>
                    </div>

                    {/* Row 2: Event Info */}
                    <div className="flex items-center gap-4 pb-4">
                        {event.image_url && (
                            <div className="relative h-14 w-14 rounded-xl overflow-hidden flex-shrink-0 border border-black/5">
                                <Image src={event.image_url} alt={event.title} fill className="object-cover" unoptimized />
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg font-semibold text-zinc-900 truncate">{event.title}</h1>
                            <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(event.date), "EEE, MMM d, yyyy")}
                                </span>
                                {event.location && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {event.location}
                                    </span>
                                )}
                            </div>
                        </div>
                        <span className={cn(
                            "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest flex-shrink-0",
                            event.status === "published" ? "bg-emerald-50 text-emerald-600" :
                            event.status === "cancelled" ? "bg-red-50 text-red-500" :
                            "bg-zinc-100 text-zinc-500"
                        )}>
                            {event.status}
                        </span>
                    </div>

                    {/* Row 3: Tabs */}
                    <div className="flex gap-0 -mb-px">
                        {TABS.filter((tab) => !checkInOnly || tab.id === "checkin" || tab.id === "guests").map(tab => (
                            <Link
                                key={tab.id}
                                href={`/admin/events/${slug}/manage/${tab.href}`}
                                className={cn(
                                    "px-5 py-2.5 text-sm font-medium border-b-2 transition-colors",
                                    activeTab === tab.id
                                        ? "border-zinc-900 text-zinc-900"
                                        : "border-transparent text-zinc-400 hover:text-zinc-600 hover:border-zinc-200"
                                )}
                            >
                                {tab.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </header>

            {/* Tab Content */}
            <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
                {children}
            </main>
        </div>
    );
}
