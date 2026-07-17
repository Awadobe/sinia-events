import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, Building2, Calendar, CalendarDays, MapPin, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { SubscribeForm } from "./subscribe-form";

export const dynamic = "force-dynamic";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder");

type HostEvent = { id: string; title: string; date: string; location: string | null; event_type: string | null; public_slug: string; image_url: string | null; theme_color: string | null };

function EventCard({ event, hostSlug, past = false }: { event: HostEvent; hostSlug: string; past?: boolean }) {
    return (
        <Link href={`/hosts/${hostSlug}/events/${event.public_slug}`} className="group overflow-hidden rounded-[1.75rem] border border-black/5 bg-white shadow-[0_10px_30px_rgba(60,40,20,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(60,40,20,0.1)]">
            <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-orange-200 via-rose-200 to-violet-300">
                {event.image_url ? <Image src={event.image_url} alt={event.title} fill className={`object-cover transition duration-500 group-hover:scale-105 ${past ? "grayscale-[35%]" : ""}`} unoptimized /> : <><div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border-[22px] border-white/20" /><div className="absolute bottom-7 left-7 rounded-2xl bg-white/25 p-4 text-white backdrop-blur-sm"><CalendarDays className="h-8 w-8" /></div></>}
                <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-700 shadow-sm backdrop-blur">{event.event_type || "Event"}</div>
                {past && <div className="absolute right-4 top-4 rounded-full bg-zinc-900/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur">Ended</div>}
            </div>
            <div className="p-5 sm:p-6">
                <h3 className="text-lg font-semibold leading-snug text-zinc-900 transition group-hover:text-orange-700">{event.title}</h3>
                <div className="mt-4 space-y-2.5 text-sm text-zinc-500">
                    <p className="flex items-center gap-2"><span className="rounded-lg bg-orange-50 p-1.5 text-orange-600"><Calendar className="h-3.5 w-3.5" /></span>{format(new Date(event.date), "EEE, MMM d · h:mm a")}</p>
                    {event.location && <p className="flex items-center gap-2"><span className="rounded-lg bg-violet-50 p-1.5 text-violet-600"><MapPin className="h-3.5 w-3.5" /></span><span className="truncate">{event.location}</span></p>}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 text-sm font-semibold text-zinc-700"><span>{past ? "View event" : "See event details"}</span><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
            </div>
        </Link>
    );
}

export default async function PublicHostPage({ params }: { params: { hostSlug: string } }) {
    const { data: host } = await admin.from("hosts").select("id, type, name, slug, description, logo_url").eq("slug", params.hostSlug).eq("status", "active").maybeSingle();
    if (!host) notFound();

    const { data } = await admin.from("events").select("id, title, date, location, event_type, public_slug, image_url, theme_color").eq("host_id", host.id).eq("status", "published").order("date", { ascending: true });
    const now = Date.now();
    const events = (data || []) as HostEvent[];
    const upcoming = events.filter((event) => new Date(event.date).getTime() >= now);
    const past = events.filter((event) => new Date(event.date).getTime() < now).reverse();

    return (
        <div className="min-h-screen bg-[#f7f4ef]">
            <header className="border-b border-black/5 bg-white/85 backdrop-blur-md"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link href="/" className="flex items-center gap-2.5 text-sm font-semibold text-zinc-900"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white">R</span>Radius</Link><div className="flex items-center gap-4 sm:gap-6"><Link href="/organizations" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"><ArrowLeft className="h-3.5 w-3.5" /> Communities</Link><Link href="/login" className="hidden text-sm text-zinc-500 transition hover:text-zinc-900 sm:block">Organizer sign in</Link></div></div></header>

            <main>
                <section className="relative overflow-hidden bg-gradient-to-br from-[#ffb26b] via-[#fb7185] to-[#8b5cf6] text-white">
                    <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border-[55px] border-white/10" />
                    <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute left-10 top-16 h-3 w-28 rounded-full bg-white/20" />
                    <div className="relative mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:py-20 lg:grid-cols-[1fr_360px] lg:items-end">
                        <div>
                            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.75rem] border-4 border-white/70 bg-zinc-900 text-2xl font-bold text-white shadow-2xl sm:h-28 sm:w-28">
                                {host.logo_url ? <Image src={host.logo_url} alt={host.name} width={112} height={112} className="h-full w-full object-cover" unoptimized /> : host.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur"><Building2 className="h-3.5 w-3.5" />{host.type === "organization" ? "Organization" : "Independent organizer"}</div>
                            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">{host.name}</h1>
                            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">{host.description || "Discover the experiences, ideas, and people brought together by this community."}</p>
                            <div className="mt-7 flex flex-wrap gap-3"><span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-900">{upcoming.length} upcoming</span><span className="rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur">{past.length} past event{past.length === 1 ? "" : "s"}</span></div>
                        </div>
                        <SubscribeForm hostId={host.id} hostName={host.name} enabled={process.env.NEXT_PUBLIC_ORG_SUBSCRIPTIONS_ENABLED === "true"} />
                    </div>
                </section>

                <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
                    <section>
                        <div className="mb-7 flex items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-600"><Sparkles className="h-3.5 w-3.5" />What’s next</div><h2 className="mt-2 text-2xl font-semibold text-zinc-900 sm:text-3xl">Upcoming events</h2></div><span className="flex h-10 min-w-10 items-center justify-center rounded-full bg-white px-3 text-sm font-semibold text-zinc-500 shadow-sm">{upcoming.length}</span></div>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map((event) => <EventCard key={event.id} event={event} hostSlug={host.slug} />)}{!upcoming.length && <div className="rounded-[2rem] border border-dashed border-orange-200 bg-gradient-to-br from-orange-50 to-rose-50 p-12 text-center sm:col-span-2 lg:col-span-3"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm"><CalendarDays className="h-6 w-6" /></div><h3 className="mt-4 font-semibold text-zinc-800">Nothing scheduled just yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">Follow {host.name} to hear when the next event is published.</p></div>}</div>
                    </section>

                    {past.length > 0 && <section className="mt-16 border-t border-zinc-200 pt-12"><div className="mb-7 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">From the archive</p><h2 className="mt-2 text-2xl font-semibold text-zinc-900">Past events</h2></div><span className="rounded-full bg-zinc-200/70 px-3 py-1.5 text-sm font-medium text-zinc-500">{past.length}</span></div><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{past.map((event) => <EventCard key={event.id} event={event} hostSlug={host.slug} past />)}</div></section>}

                    <div className="mt-16 rounded-[2rem] bg-zinc-900 px-6 py-7 text-white sm:flex sm:items-center sm:justify-between sm:px-8"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-300">Keep exploring</p><h2 className="mt-2 text-xl font-semibold">Find another community on Radius</h2></div><Link href="/organizations" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-orange-50 sm:mt-0">Browse organizations <ArrowRight className="h-4 w-4" /></Link></div>
                </div>
            </main>
        </div>
    );
}
