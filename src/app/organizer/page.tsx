import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Calendar, Plus, Settings, Users, ScanLine, UserRoundCog, ArrowRight } from "lucide-react";
import { CreateOrganizationForm } from "./create-organization-form";

export const dynamic = "force-dynamic";

const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

export default async function OrganizerDashboard() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: platformStaff } = user.email
        ? await admin.from("platform_admins").select("id").ilike("email", user.email).maybeSingle()
        : { data: null };

    const { data: memberships } = await admin
        .from("host_organizers")
        .select("host_id, host:hosts(id, type, name, slug, description, logo_url)")
        .eq("user_id", user.id);

    const [{ data: collaborationsByUser }, { data: collaborationsByEmail }] = await Promise.all([
        admin
            .from("event_collaborators")
            .select("id, role, event:events(id, title, date, status, slug, location, host:hosts(name))")
            .eq("user_id", user.id)
            .eq("status", "active"),
        user.email
            ? admin
                .from("event_collaborators")
                .select("id, role, event:events(id, title, date, status, slug, location, host:hosts(name))")
                .ilike("email", user.email)
                .eq("status", "active")
            : Promise.resolve({ data: [] }),
    ]);

    const collaborationMap = new Map<string, {
        id: string;
        role: "manager" | "check_in";
        event: {
            id: string;
            title: string;
            date: string;
            status: string;
            slug: string;
            location: string | null;
            host: { name: string } | { name: string }[] | null;
        };
    }>();
    for (const collaboration of [...(collaborationsByUser || []), ...(collaborationsByEmail || [])]) {
        const event = Array.isArray(collaboration.event) ? collaboration.event[0] : collaboration.event;
        if (event) collaborationMap.set(event.id, {
            id: collaboration.id,
            role: collaboration.role as "manager" | "check_in",
            event,
        });
    }
    const assignedEvents = Array.from(collaborationMap.values());

    const hosts = (memberships || []).map((membership) => membership.host).filter(Boolean) as unknown as Array<{
        id: string; type: "individual" | "organization"; name: string; slug: string; description: string | null; logo_url: string | null;
    }>;
    const { data: createdEvent } = await admin.from("events").select("id").eq("organizer_id", user.id).limit(1).maybeSingle();
    const isOrganizerOwner = Boolean(platformStaff || createdEvent || hosts.some((host) => host.type === "organization"));
    const hostIds = hosts.map((host) => host.id);
    const { data: events } = hostIds.length
        ? await admin.from("events").select("id, title, date, status, slug, public_slug, host_id").in("host_id", hostIds).order("date", { ascending: false })
        : { data: [] };

    return (
        <div className="min-h-screen bg-[#faf9f7]">
            <header className="border-b border-black/5 bg-white/90">
                <div className="mx-auto max-w-6xl flex items-center justify-between px-5 py-4">
                    <Link href="/" className="font-semibold text-zinc-900">Radius</Link>
                    <div className="flex items-center gap-3">
                        {platformStaff && <Link href="/platform-admin" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">Platform admin</Link>}
                        <span className="hidden sm:inline text-xs font-semibold uppercase tracking-widest text-zinc-400">{isOrganizerOwner ? "Organizer account" : "Event team account"}</span>
                        <form action="/auth/signout" method="post"><button className="text-sm text-zinc-500 hover:text-zinc-900">Log out</button></form>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-5 py-10 space-y-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">{isOrganizerOwner ? "Organizer Dashboard" : "Event Assignments"}</p>
                        <h1 className="text-3xl font-semibold text-zinc-900 mt-1">{isOrganizerOwner ? "Your hosts and events" : "Events assigned to you"}</h1>
                    </div>
                    {isOrganizerOwner && <div className="flex gap-2">
                        <CreateOrganizationForm />
                        <Link href="/events/new" className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Create event</Link>
                    </div>}
                </div>

                {assignedEvents.length > 0 && (
                    <section>
                        <div className="mb-4">
                            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Event team</p>
                            <h2 className="mt-1 text-2xl font-semibold text-zinc-900">Assigned to you</h2>
                            <p className="mt-1 text-sm text-zinc-500">Events where another organizer added you to help.</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {assignedEvents.map(({ id, role, event }) => {
                                const hostValue = Array.isArray(event.host) ? event.host[0] : event.host;
                                const isCheckIn = role === "check_in";
                                return (
                                    <Link
                                        key={id}
                                        href={`/admin/events/${event.slug}/manage/${isCheckIn ? "checkin" : "overview"}`}
                                        className="group rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`rounded-2xl p-3 ${isCheckIn ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"}`}>
                                                {isCheckIn ? <ScanLine className="h-5 w-5" /> : <UserRoundCog className="h-5 w-5" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-semibold text-zinc-900">{event.title}</h3>
                                                    <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${isCheckIn ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"}`}>
                                                        {isCheckIn ? "Check-in staff" : "Event manager"}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs text-zinc-400">{hostValue?.name || "Event host"} · {new Date(event.date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</p>
                                                {event.location && <p className="mt-1 truncate text-xs text-zinc-400">{event.location}</p>}
                                                <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-zinc-700">
                                                    {isCheckIn ? "Open check-in" : "Manage event"} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                )}

                {isOrganizerOwner && <section className="grid gap-5 md:grid-cols-2">
                    {hosts.map((host) => {
                        const hostEvents = (events || []).filter((event) => event.host_id === host.id);
                        const orderedHostEvents = [
                            ...hostEvents.filter((event) => event.status === "draft"),
                            ...hostEvents.filter((event) => event.status !== "draft"),
                        ];
                        const visibleHostEvents = orderedHostEvents.slice(0, 4);
                        const remainingHostEvents = orderedHostEvents.slice(4);
                        const eventRow = (event: typeof orderedHostEvents[number]) => (
                            <Link key={event.id} href={`/admin/events/${event.slug}/manage`} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 text-sm hover:bg-zinc-100">
                                <span className="min-w-0 truncate font-medium text-zinc-700">{event.title}</span>
                                <span className={`flex-shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${
                                    event.status === "draft"
                                        ? "bg-amber-100 text-amber-700"
                                        : event.status === "cancelled"
                                            ? "bg-red-100 text-red-600"
                                            : "bg-emerald-100 text-emerald-700"
                                }`}>{event.status}</span>
                            </Link>
                        );
                        return (
                            <div key={host.id} className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{host.type === "organization" ? "Organization" : "Personal host"}</span>
                                        <h2 className="text-xl font-semibold text-zinc-900 mt-1">{host.name}</h2>
                                        {host.description && <p className="text-sm text-zinc-500 mt-2">{host.description}</p>}
                                    </div>
                                    {host.type === "organization" && <Link href={`/organizer/hosts/${host.id}`} className="rounded-lg bg-zinc-100 p-2 text-zinc-500" title="Manage organizers"><Settings className="h-4 w-4" /></Link>}
                                </div>
                                <div className="flex items-center gap-4 mt-5 text-xs text-zinc-400">
                                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {hostEvents.length} events</span>
                                    <Link href={`/hosts/${host.slug}`} className="hover:text-zinc-900">View public page →</Link>
                                </div>
                                <div className="mt-5 space-y-2">
                                    {visibleHostEvents.map(eventRow)}
                                    {remainingHostEvents.length > 0 && (
                                        <details className="group">
                                            <summary className="cursor-pointer list-none rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-center text-xs font-semibold text-zinc-500 hover:bg-zinc-50">
                                                <span className="group-open:hidden">Show {remainingHostEvents.length} more event{remainingHostEvents.length === 1 ? "" : "s"}</span>
                                                <span className="hidden group-open:inline">Hide additional events</span>
                                            </summary>
                                            <div className="mt-2 space-y-2">{remainingHostEvents.map(eventRow)}</div>
                                        </details>
                                    )}
                                    {!hostEvents.length && <div className="rounded-xl border border-dashed border-zinc-200 p-5 text-center text-sm text-zinc-400">No events yet</div>}
                                </div>
                            </div>
                        );
                    })}
                </section>}

                {isOrganizerOwner && !hosts.length && (
                    <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-12 text-center">
                        <Users className="h-8 w-8 text-zinc-300 mx-auto" />
                        <p className="text-zinc-500 mt-3">Your personal host will appear after the database migration is applied.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
