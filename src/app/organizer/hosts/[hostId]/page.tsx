"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2, Mail, Plus, Save, Trash2, Upload, Users, X } from "lucide-react";
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
        <div className="min-h-screen bg-[#faf9f7]">
            <main className="mx-auto max-w-3xl px-5 py-10 space-y-8">
                <Link href="/organizer" className="inline-flex items-center gap-2 text-sm text-zinc-500"><ArrowLeft className="h-4 w-4" /> Organizer dashboard</Link>
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Organization settings</p>
                    <h1 className="text-3xl font-semibold text-zinc-900 mt-1">Organizers</h1>
                    <p className="text-sm text-zinc-500 mt-2">Every organizer can manage the organization and all its events.</p>
                </div>

                <form onSubmit={saveDetails} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm space-y-4">
                    <div>
                        <label className="text-sm font-semibold text-zinc-700">Organization logo</label>
                        <div className="mt-3 flex items-center gap-4">
                            {logoUrl ? <Image src={logoUrl} alt="Organization logo" width={64} height={64} className="h-16 w-16 rounded-2xl border border-zinc-100 object-cover" unoptimized /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-lg font-bold text-zinc-500">{hostName.slice(0, 2).toUpperCase()}</div>}
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {uploadingLogo ? "Uploading" : "Upload logo"}
                                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadLogo} disabled={uploadingLogo} className="hidden" />
                            </label>
                        </div>
                        <p className="mt-2 text-xs text-zinc-400">JPG, PNG or WebP. Maximum 5 MB.</p>
                    </div>
                    <div><label className="text-sm font-semibold text-zinc-700">Organization name</label><input required value={hostName} onChange={(event) => setHostName(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-200" /></div>
                    <div><label className="text-sm font-semibold text-zinc-700">Description</label><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Tell visitors what your organization does" className="mt-2 w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-200" /></div>
                    <button disabled={savingDetails} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{savingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save details</button>
                </form>

                <form onSubmit={addOrganizer} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                    <label className="text-sm font-semibold text-zinc-700">Add organizer by email</label>
                    <div className="flex gap-2 mt-3">
                        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@example.com" className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-200" />
                        <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
                        </button>
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">They will receive an email. They must open its link and sign in with this exact email address to accept access.</p>
                </form>

                <section className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-4"><Users className="h-4 w-4" /><h2 className="font-semibold">Current organizers</h2></div>
                    {loading ? <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div> : (
                        <div className="divide-y divide-zinc-100">
                            {organizers.map((organizer) => <div key={organizer.user_id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="font-medium text-zinc-800">{organizer.profile?.name || organizer.profile?.email || "Organizer"}</p><p className="text-sm text-zinc-400">{organizer.profile?.email}</p></div><button type="button" onClick={() => removeOrganizer(organizer.user_id)} disabled={organizers.length <= 1} title={organizers.length <= 1 ? "An organization must keep one organizer" : "Remove organizer"} className="rounded-lg p-2 text-zinc-300 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div>)}
                            {invitations.filter((invite) => invite.status === "pending").map((invite) => <div key={invite.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="font-medium text-zinc-700">{invite.email}</p><p className="text-xs text-amber-600">Waiting for the invited person to accept</p></div><div className="flex items-center gap-1"><button type="button" onClick={() => resendInvitation(invite.email)} title="Resend invitation email" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"><Mail className="h-4 w-4" /></button><button type="button" onClick={() => cancelInvitation(invite.id)} title="Cancel invitation" className="rounded-lg p-2 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-600"><X className="h-4 w-4" /></button></div></div>)}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
