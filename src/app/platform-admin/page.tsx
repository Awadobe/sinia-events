import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Building2, Calendar, ExternalLink, ShieldCheck, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { OrganizationControls } from "./organization-controls";

export const dynamic = "force-dynamic";
const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder");

export default async function PlatformAdminPage() {
    const access = await requireAdmin();
    if (!access.user) redirect("/login?next=/platform-admin");
    if (!access.authorized) redirect("/");

    const [{ data: organizations }, { count: registrationCount }] = await Promise.all([
        admin
            .from("hosts")
            .select("id, name, slug, description, status, created_at, events(id, title, slug, status), host_organizers(user_id)")
            .eq("type", "organization")
            .order("created_at", { ascending: false }),
        admin
            .from("registrations")
            .select("*", { count: "exact", head: true })
            .neq("status", "cancelled"),
    ]);

    const organizationList = organizations || [];
    const eventCount = organizationList.reduce((total, organization) => total + organization.events.length, 0);
    const activeCount = organizationList.filter((organization) => organization.status === "active").length;
    const suspendedCount = organizationList.length - activeCount;

    return <div className="min-h-screen bg-[#faf9f7]"><header className="border-b border-black/5 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link href="/" className="font-semibold text-zinc-900">Radius</Link><div className="flex items-center gap-4"><Link href="/organizer" className="text-sm text-zinc-500">Organizer account</Link><form action="/auth/signout" method="post"><button className="text-sm text-zinc-500">Log out</button></form></div></div></header><main className="mx-auto max-w-6xl px-5 py-10"><div className="flex items-start gap-3"><div className="rounded-xl bg-zinc-900 p-2.5 text-white"><ShieldCheck className="h-5 w-5" /></div><div><p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Platform administration</p><h1 className="mt-1 text-3xl font-semibold text-zinc-900">Platform overview</h1><p className="mt-2 text-sm text-zinc-500">Monitor activity and manage organizations from one place.</p></div></div>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
                { label: "Organizations", value: organizationList.length, detail: `${activeCount} active`, icon: Building2 },
                { label: "Events", value: eventCount, detail: "Across organizations", icon: Calendar },
                { label: "Registrations", value: registrationCount || 0, detail: "Not cancelled", icon: Users },
                { label: "Suspended", value: suspendedCount, detail: suspendedCount ? "Needs attention" : "None", icon: ShieldCheck },
            ].map((item) => <div key={item.label} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-zinc-500">{item.label}</p><item.icon className="h-4 w-4 text-zinc-400" /></div><p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">{item.value}</p><p className="mt-1 text-xs text-zinc-400">{item.detail}</p></div>)}
        </section>

        {organizationList.length > 0 && <section className="mt-8 rounded-3xl bg-zinc-900 p-6 text-white"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Recent activity</p><h2 className="mt-1 text-xl font-semibold">Recently added organizations</h2></div><p className="text-xs text-zinc-400">Newest first</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{organizationList.slice(0, 3).map((organization) => <Link key={organization.id} href={`/hosts/${organization.slug}`} className="rounded-2xl bg-white/10 p-4 transition hover:bg-white/15"><div className="flex items-center justify-between gap-3"><p className="truncate font-medium">{organization.name}</p><ExternalLink className="h-3.5 w-3.5 text-zinc-400" /></div><p className="mt-2 text-xs text-zinc-400">{organization.events.length} event{organization.events.length === 1 ? "" : "s"} · Added {new Intl.DateTimeFormat("en-SL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(organization.created_at))}</p></Link>)}</div></section>}

        <div className="mt-10"><h2 className="text-xl font-semibold text-zinc-900">Manage organizations</h2><p className="mt-1 text-sm text-zinc-500">Suspension is reversible and preserves all records.</p></div><div className="mt-5 grid gap-5">{organizationList.map((organization) => <section key={organization.id} className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-zinc-400" /><h2 className="text-lg font-semibold text-zinc-900">{organization.name}</h2><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${organization.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{organization.status}</span></div>{organization.description && <p className="mt-2 max-w-2xl text-sm text-zinc-500">{organization.description}</p>}<p className="mt-3 text-xs text-zinc-400">{organization.host_organizers.length} organizer{organization.host_organizers.length === 1 ? "" : "s"} · {organization.events.length} event{organization.events.length === 1 ? "" : "s"}</p></div><div className="flex items-center gap-2"><Link href={`/hosts/${organization.slug}`} className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-600"><ExternalLink className="h-3.5 w-3.5" /> Public page</Link><OrganizationControls hostId={organization.id} initialStatus={organization.status as "active" | "suspended"} /></div></div>{organization.events.length > 0 && <div className="mt-5 grid gap-2 border-t border-zinc-100 pt-4 sm:grid-cols-2">{organization.events.slice(0, 6).map((event) => <Link key={event.id} href={`/admin/events/${event.slug}/manage`} className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 text-sm"><span className="flex items-center gap-2 font-medium text-zinc-700"><Calendar className="h-3.5 w-3.5 text-zinc-400" />{event.title}</span><span className="text-[10px] uppercase text-zinc-400">Manage</span></Link>)}</div>}</section>)}{!organizationList.length && <div className="rounded-3xl border border-dashed border-zinc-200 p-12 text-center text-zinc-400">No organizations yet.</div>}</div></main></div>;
}
