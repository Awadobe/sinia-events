import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "./profile-form";
import { LogOut, Ticket } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export const revalidate = 0;

export default async function UserProfilePage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Since admins also have accounts, prevent them from getting confused here vs /admin
    if (user.email) {
        // Simple heuristic: if they have an email, they arrived via admin email login
        // but we won't strictly block them, just let them see their profile
    }

    // Fetch the user's profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
    
    // Fetch user's registered events (matching phone or just by event_id if we hardlinked it, 
    // but in Sprint 1/2 we didn't link registrations to user.id, we used email. 
    // Now we use phone for users. Let's find registrations where phone matches profile phone.)
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
                location
            )
        `)
        .eq("phone", profile?.phone || user.phone)
        .order("created_at", { ascending: false });


    return (
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                        My Profile
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manage your details and view your upcoming events.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <form action="/auth/signout" method="post">
                        <Button variant="outline" size="sm" type="submit">
                            <LogOut className="mr-2 h-4 w-4" />
                            Log Out
                        </Button>
                    </form>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Form Column */}
                <div className="md:col-span-1 border rounded-xl bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">Personal Details</h2>
                    <ProfileForm profile={profile} phone={user.phone || ""} />
                </div>

                {/* Tickets/Events Column */}
                <div className="md:col-span-2 space-y-6">
                    <div className="border rounded-xl bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 text-lg font-semibold border-b pb-4">
                            <Ticket className="h-5 w-5 text-primary" />
                            <h2>My Tickets</h2>
                        </div>
                        
                        {!userTickets?.length ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>You haven't registered for any events yet.</p>
                                <Button asChild variant="link" className="mt-2">
                                    <Link href="/">Browse Events</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {userTickets.map((ticket) => {
                                    const event = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events;
                                    if (!event) return null;
                                    
                                    return (
                                        <Link href={`/events/${event.slug}`} key={ticket.id} className="block group">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-zinc-50 border-zinc-100 hover:border-zinc-200 hover:bg-zinc-100/50 transition-colors">
                                                <div>
                                                    <h3 className="font-semibold text-zinc-900 group-hover:text-primary transition-colors">
                                                        {event.title}
                                                    </h3>
                                                    <p className="text-sm text-zinc-500 mt-1">
                                                        {format(new Date(event.date), "MMM d, yyyy 'at' h:mm a")} • {event.location}
                                                    </p>
                                                </div>
                                                <div className="mt-3 sm:mt-0 flex items-center gap-2">
                                                    {ticket.checked_in && (
                                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Attended</Badge>
                                                    )}
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
                </div>
            </div>
        </div>
    );
}
