"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Users, UserCheck, Clock, QrCode, ArrowRight, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function OverviewPage() {
    const params = useParams();
    const slug = params.slug as string;
    const [stats, setStats] = useState<Stats | null>(null);
    const [recent, setRecent] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const res = await fetch(`/api/events/${slug}/registrations`);
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setRecent(data.registrations.slice(0, 5));
            }
            setLoading(false);
        }
        load();
    }, [slug]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
            </div>
        );
    }

    const statCards = [
        { label: "Total Registrations", value: stats?.total || 0, icon: Users, color: "bg-blue-50 text-blue-600" },
        { label: "Confirmed", value: stats?.confirmed || 0, icon: UserCheck, color: "bg-emerald-50 text-emerald-600" },
        { label: "Pending Approval", value: stats?.pending || 0, icon: Clock, color: "bg-amber-50 text-amber-600" },
        { label: "Checked In", value: stats?.checkedIn || 0, icon: QrCode, color: "bg-violet-50 text-violet-600" },
    ];

    return (
        <div className="space-y-8">
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
        </div>
    );
}
