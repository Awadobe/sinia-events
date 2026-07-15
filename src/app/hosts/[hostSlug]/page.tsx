import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

export default async function PublicHostPage({ params }: { params: { hostSlug: string } }) {
    const { data: host } = await admin
        .from("hosts")
        .select("id, type, name, slug, description, logo_url")
        .eq("slug", params.hostSlug)
        .maybeSingle();

    if (!host) notFound();

    const { data: events } = await admin
        .from("events")
        .select("id, title, date, location, event_type, public_slug, status")
        .eq("host_id", host.id)
        .eq("status", "published")
        .order("date", { ascending: true });

    return (
        <div className="min-h-screen bg-[#faf9f7]">
            <header className="border-b border-black/5 bg-white/90">
                <div className="mx-auto max-w-5xl flex items-center justify-between px-5 py-4">
                    <Link href="/" className="font-semibold text-zinc-900">Radius</Link>
                    <Link href="/login" className="text-sm text-zinc-500">Organizer sign in</Link>
                </div>
            </header>
            <main className="mx-auto max-w-5xl px-5 py-12">
                <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{host.type === "organization" ? "Organization" : "Independent organizer"}</span>
                    <h1 className="text-4xl font-semibold text-zinc-900 mt-2">{host.name}</h1>
                    {host.description && <p className="text-zinc-500 mt-4 max-w-2xl">{host.description}</p>}
                </section>

                <section className="mt-10">
                    <h2 className="text-xl font-semibold text-zinc-900 mb-5">Events</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {(events || []).map((event) => (
                            <Link key={event.id} href={`/hosts/${host.slug}/events/${event.public_slug}`} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{event.event_type}</span>
                                <h3 className="text-lg font-semibold text-zinc-900 mt-1">{event.title}</h3>
                                <div className="mt-4 space-y-2 text-sm text-zinc-500">
                                    <p className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {format(new Date(event.date), "EEE, MMM d · h:mm a")}</p>
                                    {event.location && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {event.location}</p>}
                                </div>
                            </Link>
                        ))}
                        {!events?.length && <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center text-zinc-400 sm:col-span-2">No published events yet.</div>}
                    </div>
                </section>
            </main>
        </div>
    );
}
