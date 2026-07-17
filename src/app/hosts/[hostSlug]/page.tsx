import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { SubscribeForm } from "./subscribe-form";

export const dynamic = "force-dynamic";

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

type HostEvent = { id: string; title: string; date: string; location: string | null; event_type: string | null; public_slug: string; image_url: string | null };

function EventCard({ event, hostSlug, past = false }: { event: HostEvent; hostSlug: string; past?: boolean }) {
    return (
        <Link href={`/hosts/${hostSlug}/events/${event.public_slug}`} className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            {event.image_url && <div className="relative aspect-[16/8] bg-zinc-100"><Image src={event.image_url} alt={event.title} fill className={`object-cover ${past ? "grayscale-[35%]" : ""}`} unoptimized /></div>}
            <div className="p-5">
                <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{event.event_type || "Event"}</span>{past && <span className="rounded-full bg-zinc-100 px-2 py-1 text-[9px] font-bold uppercase text-zinc-500">Ended</span>}</div>
                <h3 className="mt-1 text-lg font-semibold text-zinc-900">{event.title}</h3>
                <div className="mt-4 space-y-2 text-sm text-zinc-500">
                    <p className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {format(new Date(event.date), "EEE, MMM d · h:mm a")}</p>
                    {event.location && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {event.location}</p>}
                </div>
            </div>
        </Link>
    );
}

export default async function PublicHostPage({ params }: { params: { hostSlug: string } }) {
    const { data: host } = await admin.from("hosts").select("id, type, name, slug, description, logo_url").eq("slug", params.hostSlug).eq("status", "active").maybeSingle();
    if (!host) notFound();

    const { data } = await admin.from("events").select("id, title, date, location, event_type, public_slug, image_url").eq("host_id", host.id).eq("status", "published").order("date", { ascending: true });
    const now = Date.now();
    const events = (data || []) as HostEvent[];
    const upcoming = events.filter((event) => new Date(event.date).getTime() >= now);
    const past = events.filter((event) => new Date(event.date).getTime() < now).reverse();

    return (
        <div className="min-h-screen bg-[#faf9f7]">
            <header className="border-b border-black/5 bg-white/90"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-semibold text-zinc-900">Radius</Link><div className="flex items-center gap-5"><Link href="/organizations" className="text-sm text-zinc-500">Browse organizations</Link><Link href="/login" className="text-sm text-zinc-500">Organizer sign in</Link></div></div></header>
            <main className="mx-auto max-w-5xl px-5 py-12">
                <section className="flex flex-col justify-between gap-7 rounded-3xl border border-black/5 bg-white p-7 shadow-sm sm:flex-row sm:items-center sm:p-8">
                    <div className="flex items-start gap-4">
                        {host.logo_url ? <Image src={host.logo_url} alt={host.name} width={64} height={64} className="rounded-2xl object-cover" unoptimized /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-xl font-bold text-white">{host.name.slice(0, 2).toUpperCase()}</div>}
                        <div><span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{host.type === "organization" ? "Organization" : "Independent organizer"}</span><h1 className="mt-1 text-3xl font-semibold text-zinc-900 sm:text-4xl">{host.name}</h1>{host.description && <p className="mt-3 max-w-xl text-zinc-500">{host.description}</p>}<p className="mt-3 text-sm text-zinc-400">{upcoming.length} upcoming · {past.length} past event{past.length === 1 ? "" : "s"}</p></div>
                    </div>
                    <SubscribeForm hostId={host.id} hostName={host.name} enabled={process.env.NEXT_PUBLIC_ORG_SUBSCRIPTIONS_ENABLED === "true"} />
                </section>

                <section className="mt-12"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold text-zinc-900">Upcoming events</h2><span className="text-sm text-zinc-400">{upcoming.length}</span></div><div className="grid gap-4 sm:grid-cols-2">{upcoming.map((event) => <EventCard key={event.id} event={event} hostSlug={host.slug} />)}{!upcoming.length && <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center text-zinc-400 sm:col-span-2">No upcoming events. Follow this organizer to hear when something new is published.</div>}</div></section>

                {past.length > 0 && <section className="mt-14"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold text-zinc-900">Past events</h2><span className="text-sm text-zinc-400">{past.length}</span></div><div className="grid gap-4 sm:grid-cols-2">{past.map((event) => <EventCard key={event.id} event={event} hostSlug={host.slug} past />)}</div></section>}

                <Link href="/organizations" className="mt-12 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900">Discover other organizations <ArrowRight className="h-4 w-4" /></Link>
            </main>
        </div>
    );
}
