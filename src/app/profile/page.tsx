import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "./profile-form";
import { LogOut, Ticket, Trophy, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export const revalidate = 0;

// Achievement badge definitions
function getAchievements(totalRegistered: number, totalAttended: number) {
    const achievements = [];

    if (totalRegistered >= 1) {
        achievements.push({ icon: "🎟️", label: "First Registration", desc: "Registered for your first event" });
    }
    if (totalAttended >= 1) {
        achievements.push({ icon: "✅", label: "First Check-In", desc: "Attended your first event" });
    }
    if (totalAttended >= 3) {
        achievements.push({ icon: "🔥", label: "Active Member", desc: "Attended 3+ events" });
    }
    if (totalAttended >= 5) {
        achievements.push({ icon: "⭐", label: "Community Star", desc: "Attended 5+ events" });
    }
    if (totalAttended >= 10) {
        achievements.push({ icon: "🏆", label: "CF Champion", desc: "Attended 10+ events" });
    }

    return achievements;
}

export default async function UserProfilePage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
        process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
    );
    const [{ data: organizationMembership }, { data: createdEvent }] = await Promise.all([
        admin.from("host_organizers").select("host_id, host:hosts!inner(type)").eq("user_id", user.id).eq("hosts.type", "organization").limit(1).maybeSingle(),
        admin.from("events").select("id").eq("organizer_id", user.id).limit(1).maybeSingle(),
    ]);

    if (organizationMembership || createdEvent) {
        redirect("/organizer");
    }

    // Fetch the user's profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
    
    // Fetch user's registered events
    const { data: userTickets } = await supabase
        .from("registrations")
        .select(`
            id,
            status,
            checked_in,
            events (
                title,
                date,
                slug,
                location,
                event_type
            )
        `)
        .eq("email", user.email || profile?.phone || "")
        .order("created_at", { ascending: false });

    // Compute stats
    const totalRegistered = userTickets?.length || 0;
    const totalAttended = userTickets?.filter(t => t.checked_in).length || 0;
    const confirmedTickets = userTickets?.filter(t => t.status === "confirmed").length || 0;
    const achievements = getAchievements(totalRegistered, totalAttended);

    // Separate past and upcoming
    const now = new Date();
    const upcomingTickets = userTickets?.filter(t => {
        const event = Array.isArray(t.events) ? t.events[0] : t.events;
        return event && new Date(event.date) >= now;
    }) || [];
    const pastTickets = userTickets?.filter(t => {
        const event = Array.isArray(t.events) ? t.events[0] : t.events;
        return event && new Date(event.date) < now;
    }) || [];


    return (
        <div className="min-h-screen bg-[#faf9f7]">
            {/* Simple header */}
            <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="mx-auto max-w-5xl flex items-center justify-between px-4 sm:px-6 py-4">
                    <Link href="/" className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Events
                    </Link>
                    <form action="/auth/signout" method="post">
                        <Button variant="outline" size="sm" type="submit">
                            <LogOut className="mr-2 h-4 w-4" />
                            Log Out
                        </Button>
                    </form>
                </div>
            </header>

            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
                {/* Page Title */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                        My Profile
                    </h1>
                    <p className="text-zinc-500 mt-1 text-sm">
                        Manage your details and track your event activity.
                    </p>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm text-center">
                        <div className="text-3xl font-bold text-zinc-900">{totalRegistered}</div>
                        <div className="text-xs font-medium text-zinc-400 mt-1 uppercase tracking-wider">Registered</div>
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm text-center">
                        <div className="text-3xl font-bold text-emerald-600">{totalAttended}</div>
                        <div className="text-xs font-medium text-zinc-400 mt-1 uppercase tracking-wider">Attended</div>
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm text-center">
                        <div className="text-3xl font-bold text-zinc-900">{confirmedTickets}</div>
                        <div className="text-xs font-medium text-zinc-400 mt-1 uppercase tracking-wider">Confirmed</div>
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm text-center">
                        <div className="text-3xl font-bold text-amber-500">{achievements.length}</div>
                        <div className="text-xs font-medium text-zinc-400 mt-1 uppercase tracking-wider">Badges</div>
                    </div>
                </div>

                {/* Achievements Section */}
                {achievements.length > 0 && (
                    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Trophy className="h-5 w-5 text-amber-500" />
                            <h2 className="text-lg font-semibold text-zinc-900">Achievements</h2>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {achievements.map((badge) => (
                                <div
                                    key={badge.label}
                                    className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 px-4 py-3 shadow-sm"
                                    title={badge.desc}
                                >
                                    <span className="text-2xl">{badge.icon}</span>
                                    <div>
                                        <div className="text-sm font-semibold text-zinc-800">{badge.label}</div>
                                        <div className="text-[11px] text-zinc-500">{badge.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Profile Form Column */}
                    <div className="md:col-span-1 border border-black/5 rounded-2xl bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4">Personal Details</h2>
                        <ProfileForm profile={profile} email={user.email || ""} />
                    </div>

                    {/* Tickets/Events Column */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Upcoming Tickets */}
                        <div className="border border-black/5 rounded-2xl bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6 text-lg font-semibold border-b pb-4">
                                <Calendar className="h-5 w-5 text-emerald-500" />
                                <h2>Upcoming Events</h2>
                                {upcomingTickets.length > 0 && (
                                    <Badge variant="secondary" className="ml-auto">{upcomingTickets.length}</Badge>
                                )}
                            </div>
                            
                            {!upcomingTickets.length ? (
                                <div className="text-center py-8 text-zinc-400">
                                    <p>No upcoming events.</p>
                                    <Button asChild variant="link" className="mt-2">
                                        <Link href="/">Browse Events</Link>
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {upcomingTickets.map((ticket) => {
                                        const event = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events;
                                        if (!event) return null;
                                        
                                        return (
                                            <Link href={`/events/${event.slug}`} key={ticket.id} className="block group">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-zinc-50 border-zinc-100 hover:border-zinc-200 hover:bg-zinc-100/50 transition-colors">
                                                    <div>
                                                        <h3 className="font-semibold text-zinc-900 group-hover:text-emerald-600 transition-colors">
                                                            {event.title}
                                                        </h3>
                                                        <p className="text-sm text-zinc-500 mt-1">
                                                            {format(new Date(event.date), "MMM d, yyyy 'at' h:mm a")} • {event.location || "TBD"}
                                                        </p>
                                                    </div>
                                                    <div className="mt-3 sm:mt-0 flex items-center gap-2">
                                                        <Badge variant={ticket.status === 'confirmed' ? 'default' : 'secondary'}>
                                                            {ticket.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Past Tickets / Attendance History */}
                        <div className="border border-black/5 rounded-2xl bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6 text-lg font-semibold border-b pb-4">
                                <Ticket className="h-5 w-5 text-zinc-400" />
                                <h2>Attendance History</h2>
                                {pastTickets.length > 0 && (
                                    <Badge variant="secondary" className="ml-auto">{pastTickets.length}</Badge>
                                )}
                            </div>
                            
                            {!pastTickets.length ? (
                                <div className="text-center py-8 text-zinc-400">
                                    <p>No past events yet. Your history will appear here.</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {pastTickets.map((ticket) => {
                                        const event = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events;
                                        if (!event) return null;
                                        
                                        return (
                                            <Link href={`/events/${event.slug}`} key={ticket.id} className="block group">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-zinc-50/50 border-zinc-100 hover:border-zinc-200 hover:bg-zinc-100/50 transition-colors">
                                                    <div>
                                                        <h3 className="font-medium text-zinc-700 group-hover:text-zinc-900 transition-colors">
                                                            {event.title}
                                                        </h3>
                                                        <p className="text-sm text-zinc-400 mt-1">
                                                            {format(new Date(event.date), "MMM d, yyyy")} • {event.location || "TBD"}
                                                        </p>
                                                    </div>
                                                    <div className="mt-3 sm:mt-0 flex items-center gap-2">
                                                        {ticket.checked_in ? (
                                                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                                                ✓ Attended
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="bg-zinc-100 text-zinc-500">
                                                                Missed
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
