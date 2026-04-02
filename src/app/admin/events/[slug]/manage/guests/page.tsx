"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Search, Download, UserCheck, XCircle, Check, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Registration = {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    checked_in: boolean;
    checked_in_at: string | null;
    created_at: string;
};

export default function GuestsPage() {
    const params = useParams();
    const slug = params.slug as string;
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [updating, setUpdating] = useState<string | null>(null);

    const fetchGuests = async () => {
        const res = await fetch(`/api/events/${slug}/registrations`);
        if (res.ok) {
            const data = await res.json();
            setRegistrations(data.registrations);
        }
        setLoading(false);
    };

    useEffect(() => { fetchGuests(); }, [slug]);

    const updateStatus = async (regId: string, newStatus: string) => {
        setUpdating(regId);
        const res = await fetch(`/api/events/${slug}/registrations`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ registrationId: regId, status: newStatus }),
        });
        if (res.ok) {
            toast.success(`Registration ${newStatus}`);
            await fetchGuests();
        } else {
            toast.error("Failed to update status");
        }
        setUpdating(null);
    };

    const toggleCheckIn = async (regId: string, currentlyCheckedIn: boolean) => {
        setUpdating(regId);
        const res = await fetch(`/api/events/${slug}/registrations`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ registrationId: regId, checked_in: !currentlyCheckedIn }),
        });
        if (res.ok) {
            toast.success(currentlyCheckedIn ? "Check-in removed" : "Checked in!");
            await fetchGuests();
        } else {
            toast.error("Failed to update check-in");
        }
        setUpdating(null);
    };

    const exportCSV = () => {
        const headers = ["Name", "Email", "Phone", "Status", "Checked In", "Registered"];
        const rows = filteredGuests.map(r => [
            r.name,
            r.email,
            r.phone || "",
            r.status,
            r.checked_in ? "Yes" : "No",
            format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slug}-guests.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Guest list exported!");
    };

    const filteredGuests = registrations.filter(r => {
        const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.email.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || r.status === statusFilter;
        return matchSearch && matchStatus;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/5 bg-white text-sm placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200 shadow-sm"
                    />
                </div>
                <div className="flex gap-2">
                    {["all", "confirmed", "pending", "cancelled"].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                "px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all border",
                                statusFilter === s
                                    ? "bg-zinc-900 text-white border-zinc-900"
                                    : "bg-white text-zinc-500 border-black/5 hover:border-zinc-300"
                            )}
                        >
                            {s}
                        </button>
                    ))}
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-600 bg-white border border-black/5 hover:bg-zinc-50 transition-colors"
                    >
                        <Download className="h-3 w-3" />
                        CSV
                    </button>
                </div>
            </div>

            {/* Guest count */}
            <div className="text-xs text-zinc-400 font-medium">
                {filteredGuests.length} guest{filteredGuests.length !== 1 ? "s" : ""}
                {statusFilter !== "all" && ` (${statusFilter})`}
            </div>

            {/* Guest Table */}
            <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
                {filteredGuests.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="text-4xl mb-3">📋</div>
                        <p className="text-sm text-zinc-400">
                            {search ? "No guests match your search" : "No guests yet"}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-zinc-50">
                                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-5 py-3">Guest</th>
                                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-5 py-3">Status</th>
                                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-5 py-3">Check-in</th>
                                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-5 py-3">Registered</th>
                                    <th className="text-right text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-5 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {filteredGuests.map((reg) => (
                                    <tr key={reg.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                                    {reg.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <button
                                                        onClick={() => toggleCheckIn(reg.id, reg.checked_in)}
                                                        className="text-sm font-medium text-zinc-900 hover:text-emerald-600 transition-colors cursor-pointer text-left"
                                                    >
                                                        {reg.name}
                                                    </button>
                                                    <div className="text-xs text-zinc-400">{reg.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={cn(
                                                "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
                                                reg.status === "confirmed" ? "bg-emerald-50 text-emerald-600" :
                                                reg.status === "pending" ? "bg-amber-50 text-amber-600" :
                                                "bg-red-50 text-red-500"
                                            )}>
                                                {reg.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <button
                                                onClick={() => toggleCheckIn(reg.id, reg.checked_in)}
                                                disabled={updating === reg.id}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                                    reg.checked_in
                                                        ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                                        : "bg-zinc-50 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                                                )}
                                            >
                                                {updating === reg.id ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : reg.checked_in ? (
                                                    <Check className="h-3 w-3" />
                                                ) : (
                                                    <div className="h-3 w-3 rounded-full border-2 border-current" />
                                                )}
                                                {reg.checked_in ? "Checked In" : "Check In"}
                                            </button>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-zinc-400">
                                            {format(new Date(reg.created_at), "MMM d, h:mm a")}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {reg.status === "pending" && (
                                                    <>
                                                        <button
                                                            onClick={() => updateStatus(reg.id, "confirmed")}
                                                            disabled={updating === reg.id}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                                        >
                                                            {updating === reg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => updateStatus(reg.id, "cancelled")}
                                                            disabled={updating === reg.id}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                                        >
                                                            <XCircle className="h-3 w-3" />
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {reg.status === "confirmed" && (
                                                    <a
                                                        href={`mailto:${reg.email}`}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-zinc-50 text-zinc-500 hover:bg-zinc-100 transition-colors"
                                                    >
                                                        <Mail className="h-3 w-3" />
                                                        Email
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
