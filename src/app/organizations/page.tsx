import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder");

export default async function OrganizationsPage() {
    const { data: hosts } = await admin.from("hosts").select("id, name, slug, description, logo_url, events(id, date, status)").eq("type", "organization").eq("status", "active").order("name");
    const now = Date.now();
    return <div className="min-h-screen bg-[#faf9f7]"><main className="mx-auto max-w-6xl px-5 py-12"><Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500"><ArrowLeft className="h-4 w-4" /> Back to events</Link><div className="mt-10"><p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Radius communities</p><h1 className="mt-2 text-4xl font-semibold text-zinc-900">Discover organizations</h1><p className="mt-3 max-w-2xl text-zinc-500">Explore each organization’s upcoming and past events, then follow the ones you care about.</p></div><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{(hosts || []).map((host) => { const published = (host.events || []).filter((event) => event.status === "published"); const upcoming = published.filter((event) => new Date(event.date).getTime() >= now).length; return <Link key={host.id} href={`/hosts/${host.slug}`} className="group rounded-3xl border border-black/5 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"><div className="flex items-center gap-4">{host.logo_url ? <Image src={host.logo_url} alt={host.name} width={52} height={52} className="rounded-2xl object-cover" unoptimized /> : <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-zinc-100 p-3 text-zinc-600"><Building2 /></div>}<div><h2 className="font-semibold text-zinc-900">{host.name}</h2><p className="text-xs text-zinc-400">{upcoming} upcoming · {published.length} total</p></div></div>{host.description && <p className="mt-5 line-clamp-2 text-sm leading-relaxed text-zinc-500">{host.description}</p>}<span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600">View organization <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span></Link>; })}</div>{!hosts?.length && <div className="mt-10 rounded-3xl border border-dashed border-zinc-200 p-12 text-center text-zinc-400">No organizations have been published yet.</div>}</main></div>;
}
