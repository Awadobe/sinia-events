import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format, subDays } from "date-fns";
import { AnalyticsChart } from "./AnalyticsChart";
import { Users, Calendar, QrCode } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

export const revalidate = 0;

export default async function AnalyticsPage() {
    const { authorized } = await requireAdmin();

    if (!authorized) {
        redirect("/admin/login");
    }

    const supabase = createClient();

    // Fetch total events
    const { count: totalEvents } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true });

    // Fetch all registrations for aggregate stats
    const { data: registrations } = await supabase
        .from("registrations")
        .select("status, checked_in, created_at");

    const totalRegistrations = registrations?.length || 0;
    const totalConfirmed = registrations?.filter(r => r.status === "confirmed").length || 0;
    const totalCheckedIn = registrations?.filter(r => r.checked_in).length || 0;
    const checkInRate = totalConfirmed > 0 ? Math.round((totalCheckedIn / totalConfirmed) * 100) : 0;

    // Generate last 7 days breakdown
    const dailyBreakdown: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const dayStr = format(d, "MMM dd");
        const isoStr = format(d, "yyyy-MM-dd");

        const count = registrations?.filter(r => {
            return r.created_at.startsWith(isoStr);
        }).length || 0;

        dailyBreakdown.push({ date: dayStr, count });
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Platform Analytics</h1>
                <p className="text-muted-foreground">
                    Overview of all events and registrations.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="p-6 border rounded-xl bg-white shadow-sm flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                        <Calendar className="h-4 w-4" />
                        <h3 className="text-sm font-medium">Total Events</h3>
                    </div>
                    <div className="text-3xl font-bold">{totalEvents || 0}</div>
                </div>

                <div className="p-6 border rounded-xl bg-white shadow-sm flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                        <Users className="h-4 w-4" />
                        <h3 className="text-sm font-medium">Total Registrations</h3>
                    </div>
                    <div className="text-3xl font-bold">{totalRegistrations}</div>
                    <div className="text-xs text-zinc-400 mt-1">{totalConfirmed} confirmed</div>
                </div>

                <div className="p-6 border rounded-xl bg-white shadow-sm flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                        <QrCode className="h-4 w-4" />
                        <h3 className="text-sm font-medium">Global Check-in Rate</h3>
                    </div>
                    <div className="text-3xl font-bold">{checkInRate}%</div>
                    <div className="text-xs text-zinc-400 mt-1">{totalCheckedIn} attendees arrived</div>
                </div>
            </div>

            <div className="p-6 border rounded-xl bg-white shadow-sm">
                <h3 className="text-lg font-semibold mb-6">Registrations (Last 7 Days)</h3>
                <AnalyticsChart data={dailyBreakdown} />
            </div>
        </div>
    );
}
