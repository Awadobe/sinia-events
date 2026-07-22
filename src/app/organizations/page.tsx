import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, Building2, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder");
const palettes = [
    "from-orange-300 via-rose-300 to-fuchsia-400",
    "from-sky-300 via-cyan-300 to-emerald-400",
    "from-violet-300 via-purple-300 to-indigo-400",
    "from-amber-300 via-orange-300 to-red-400",
];

export default async function OrganizationsPage() {
    const { data: hosts } = await admin.from("hosts").select("id, name, slug, description, logo_url, events(id, date, status, visibility)").eq("type", "organization").eq("status", "active").neq("slug", "radius-legacy").order("name");
    const now = Date.now();
    const organizations = hosts || [];

    return (
        <div className="min-h-screen bg-[#f7f4ef]">
            <header className="border-b border-black/5 bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
                    <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold text-zinc-900"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white">R</span>Radius</Link>
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"><ArrowLeft className="h-4 w-4" /> Events</Link>
                </div>
            </header>

            <main>
                <section className="relative overflow-hidden border-b border-orange-100 bg-gradient-to-br from-[#fff5e9] via-[#fffaf6] to-[#f1edff]">
                    <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
                    <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-violet-200/30 blur-3xl" />
                    <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-20">
                        <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600"><Sparkles className="h-3.5 w-3.5" /> Radius communities</div>
                        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">Find the communities creating experiences that matter.</h1>
                        <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-500 sm:text-lg">Discover the people and organizations behind events across Sierra Leone and online. Visit a community to explore everything they have hosted.</p>
                        <p className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-600"><Building2 className="h-4 w-4 text-orange-600" /> Browse {organizations.length} organization{organizations.length === 1 ? "" : "s"} and their upcoming and past events.</p>
                    </div>
                </section>

                <section className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
                    <div id="organizations" className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Community directory</p><h2 className="mt-2 text-2xl font-semibold text-zinc-900">Explore organizations</h2></div>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {organizations.map((host, index) => {
                            const published = (host.events || []).filter((event) => event.status === "published" && event.visibility === "public");
                            const upcoming = published.filter((event) => new Date(event.date).getTime() >= now).length;
                            const past = published.length - upcoming;
                            return (
                                <Link key={host.id} href={`/hosts/${host.slug}`} className="group overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_12px_35px_rgba(60,40,20,0.06)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_45px_rgba(60,40,20,0.11)]">
                                    <div className={`relative h-28 overflow-hidden bg-gradient-to-br ${palettes[index % palettes.length]}`}>
                                        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full border-[18px] border-white/20" />
                                        <div className="absolute bottom-3 right-5 h-7 w-7 rotate-12 rounded-lg bg-white/25" />
                                        <div className="absolute left-6 top-6 h-2 w-16 rounded-full bg-white/30" />
                                    </div>
                                    <div className="relative px-6 pb-6">
                                        <div className="-mt-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-zinc-900 text-xl font-bold text-white shadow-lg">
                                            {host.logo_url ? <Image src={host.logo_url} alt={host.name} width={80} height={80} className="h-full w-full object-cover" unoptimized /> : host.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <h3 className="mt-5 text-xl font-semibold text-zinc-900">{host.name}</h3>
                                        <p className="mt-2 min-h-10 line-clamp-2 text-sm leading-relaxed text-zinc-500">{host.description || "Explore this community and the events they bring to life."}</p>
                                        <div className="mt-5 grid grid-cols-2 gap-2">
                                            <div className="rounded-xl bg-orange-50 px-3 py-2.5"><p className="text-lg font-semibold text-orange-700">{upcoming}</p><p className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Upcoming</p></div>
                                            <div className="rounded-xl bg-zinc-50 px-3 py-2.5"><p className="text-lg font-semibold text-zinc-700">{past}</p><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Past events</p></div>
                                        </div>
                                        <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 text-sm font-semibold text-zinc-700"><span>Visit community</span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 transition group-hover:bg-zinc-900 group-hover:text-white"><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span></div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                    {!organizations.length && <div className="rounded-[2rem] border border-dashed border-zinc-200 bg-white p-14 text-center"><Building2 className="mx-auto h-8 w-8 text-zinc-300" /><p className="mt-3 text-zinc-400">No organizations have been published yet.</p></div>}
                </section>
            </main>
        </div>
    );
}
