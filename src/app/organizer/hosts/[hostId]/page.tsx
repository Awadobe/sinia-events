"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Building2, ImageIcon, Loader2, Mail, Plus, Save, ShieldCheck, Trash2, Upload, Users, X } from "lucide-react";
import { toast } from "sonner";

type Organizer = { user_id: string; profile: { name: string | null; email: string | null } | null };
type Invitation = { id: string; email: string; status: string };

export default function HostOrganizersPage() {
    const params = useParams();
    const hostId = params.hostId as string;
    const [organizers, setOrganizers] = useState<Organizer[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hostName, setHostName] = useState("");
    const [description, setDescription] = useState("");
    const [savingDetails, setSavingDetails] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const load = useCallback(async () => {
        const response = await fetch(`/api/hosts/${hostId}/organizers`);
        if (response.ok) {
            const result = await response.json();
            setOrganizers(result.organizers || []);
            setInvitations(result.invitations || []);
        }
        setLoading(false);
    }, [hostId]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        fetch(`/api/hosts/${hostId}`).then((response) => response.json()).then((result) => {
            if (result.host) {
                setHostName(result.host.name || "");
                setDescription(result.host.description || "");
                setLogoUrl(result.host.logo_url || null);
            }
        });
    }, [hostId]);

    async function saveDetails(event: React.FormEvent) {
        event.preventDefault();
        setSavingDetails(true);
        const response = await fetch(`/api/hosts/${hostId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: hostName, description }) });
        const result = await response.json();
        setSavingDetails(false);
        if (!response.ok) return toast.error(result.error || "Could not save organization");
        toast.success("Organization updated");
    }

    async function uploadLogo(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        const formData = new FormData();
        formData.append("logo", file);
        const response = await fetch(`/api/hosts/${hostId}/logo`, { method: "POST", body: formData });
        const result = await response.json();
        setUploadingLogo(false);
        event.target.value = "";
        if (!response.ok) return toast.error(result.error || "Could not upload logo");
        setLogoUrl(result.logo_url);
        toast.success("Organization logo updated");
    }

    async function removeOrganizer(userId: string) {
        if (!window.confirm("Remove this organizer from the organization?")) return;
        const response = await fetch(`/api/hosts/${hostId}/organizers`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
        const result = await response.json();
        if (!response.ok) return toast.error(result.error || "Could not remove organizer");
        toast.success("Organizer removed");
        await load();
    }

    async function cancelInvitation(invitationId: string) {
        const response = await fetch(`/api/hosts/${hostId}/organizers`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invitationId }) });
        const result = await response.json();
        if (!response.ok) return toast.error(result.error || "Could not cancel invitation");
        toast.success("Invitation cancelled");
        await load();
    }

    async function addOrganizer(event: React.FormEvent) {
        event.preventDefault();
        setSaving(true);
        const response = await fetch(`/api/hosts/${hostId}/organizers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
        const result = await response.json();
        setSaving(false);
        if (!response.ok) return toast.error(result.error || "Could not add organizer");
        toast.success("Invitation email sent");
        setEmail("");
        await load();
    }

    async function resendInvitation(invitationEmail: string) {
        const response = await fetch(`/api/hosts/${hostId}/organizers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: invitationEmail }),
        });
        const result = await response.json();
        if (!response.ok) return toast.error(result.error || "Could not resend invitation");
        toast.success("Invitation email resent");
        await load();
    }

    return (
        <div className="min-h-screen bg-[#f6f3ee]">
            <div className="border-b border-orange-100 bg-gradient-to-br from-[#fff7ed] via-[#fffaf5] to-[#f7f2ff]">
                <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
                    <Link href="/organizer" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"><ArrowLeft className="h-4 w-4" /> Organizer dashboard</Link>
                    <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600"><Building2 className="h-3.5 w-3.5" /> Organization settings</div>
                            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">Shape how your organization appears</h1>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">Update your public identity and choose the people who can manage every event for {hostName || "this organization"}.</p>
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
                            <ShieldCheck className="h-5 w-5 text-emerald-600" />
                            <div><p className="text-xs font-semibold text-zinc-800">Organizer access</p><p className="text-[11px] text-zinc-400">Shared across all events</p></div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start lg:py-10">
                <form onSubmit={saveDetails} className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_18px_50px_rgba(75,46,20,0.06)]">
                    <div className="border-b border-zinc-100 px-6 py-5 sm:px-8">
                        <div className="flex items-center gap-3"><div className="rounded-xl bg-orange-50 p-2.5 text-orange-600"><ImageIcon className="h-5 w-5" /></div><div><h2 className="font-semibold text-zinc-900">Public profile</h2><p className="text-xs text-zinc-400">What visitors see on your organization page</p></div></div>
                    </div>
                    <div className="space-y-7 p-6 sm:p-8">
                        <div className="rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50/80 to-amber-50/40 p-5">
                            <label className="text-sm font-semibold text-zinc-800">Organization logo</label>
                            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                                {logoUrl ? <Image src={logoUrl} alt="Organization logo" width={80} height={80} className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-md" unoptimized /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-orange-400 to-rose-500 text-xl font-bold text-white shadow-md">{hostName.slice(0, 2).toUpperCase() || "OR"}</div>}
                                <div><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md">{uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-orange-500" />} {uploadingLogo ? "Uploading" : "Choose a new logo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadLogo} disabled={uploadingLogo} className="hidden" /></label><p className="mt-2 text-xs text-zinc-400">JPG, PNG or WebP · maximum 5 MB</p></div>
                            </div>
                        </div>
                        <div><label className="text-sm font-semibold text-zinc-800">Organization name</label><p className="mt-1 text-xs text-zinc-400">Use the name people know you by.</p><input required value={hostName} onChange={(event) => setHostName(event.target.value)} className="mt-3 w-full rounded-2xl border border-zinc-200 bg-zinc-50/60 px-4 py-3.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-300 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100" /></div>
                        <div><div className="flex items-end justify-between gap-4"><div><label className="text-sm font-semibold text-zinc-800">About the organization</label><p className="mt-1 text-xs text-zinc-400">Help visitors understand your work and community.</p></div><span className="text-[11px] text-zinc-400">{description.length} characters</span></div><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={6} placeholder="Tell people what your organization does, who it serves, and the kind of events you host..." className="mt-3 w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50/60 px-4 py-4 text-sm leading-relaxed text-zinc-900 outline-none transition placeholder:text-zinc-300 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100" /></div>
                        <div className="flex justify-end border-t border-zinc-100 pt-6"><button disabled={savingDetails} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-900/10 transition hover:-translate-y-0.5 hover:bg-zinc-800 disabled:opacity-50">{savingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save profile</button></div>
                    </div>
                </form>

                <div className="space-y-6">
                    <form onSubmit={addOrganizer} className="rounded-[2rem] border border-black/5 bg-zinc-900 p-6 text-white shadow-[0_18px_50px_rgba(24,24,27,0.14)]">
                        <div className="flex items-start gap-3"><div className="rounded-xl bg-white/10 p-2.5 text-orange-300"><Users className="h-5 w-5" /></div><div><h2 className="font-semibold">Invite an organizer</h2><p className="mt-1 text-xs leading-relaxed text-zinc-400">They can edit the organization and manage all its events.</p></div></div>
                        <label className="mt-6 block text-xs font-semibold uppercase tracking-widest text-zinc-400">Email address</label>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row"><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@example.com" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-orange-300 focus:ring-4 focus:ring-orange-400/10" /><button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Send invite</button></div>
                        <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">Access begins only after they open the email and accept with the invited address.</p>
                    </form>

                    <section className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_14px_40px_rgba(75,46,20,0.05)]">
                        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5"><div><h2 className="font-semibold text-zinc-900">Team access</h2><p className="mt-1 text-xs text-zinc-400">{organizers.length} active · {invitations.filter((invite) => invite.status === "pending").length} pending</p></div><div className="rounded-full bg-emerald-50 p-2 text-emerald-600"><ShieldCheck className="h-4 w-4" /></div></div>
                        {loading ? <div className="p-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-orange-500" /></div> : <div className="divide-y divide-zinc-100">
                            {organizers.map((organizer) => <div key={organizer.user_id} className="flex items-center justify-between gap-4 px-6 py-4"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-rose-100 text-xs font-bold text-orange-700">{(organizer.profile?.name || organizer.profile?.email || "O").slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-800">{organizer.profile?.name || organizer.profile?.email || "Organizer"}</p><p className="truncate text-xs text-zinc-400">{organizer.profile?.email}</p></div></div><button type="button" onClick={() => removeOrganizer(organizer.user_id)} disabled={organizers.length <= 1} title={organizers.length <= 1 ? "An organization must keep one organizer" : "Remove organizer"} className="rounded-lg p-2 text-zinc-300 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div>)}
                            {invitations.filter((invite) => invite.status === "pending").map((invite) => <div key={invite.id} className="flex items-center justify-between gap-4 bg-amber-50/40 px-6 py-4"><div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-700">{invite.email}</p><p className="mt-1 text-[11px] font-medium text-amber-600">Waiting for acceptance</p></div><div className="flex items-center gap-1"><button type="button" onClick={() => resendInvitation(invite.email)} title="Resend invitation email" className="rounded-lg p-2 text-zinc-400 transition hover:bg-white hover:text-zinc-700"><Mail className="h-4 w-4" /></button><button type="button" onClick={() => cancelInvitation(invite.id)} title="Cancel invitation" className="rounded-lg p-2 text-zinc-300 transition hover:bg-white hover:text-zinc-600"><X className="h-4 w-4" /></button></div></div>)}
                        </div>}
                    </section>
                </div>
            </main>
        </div>
    );
}
