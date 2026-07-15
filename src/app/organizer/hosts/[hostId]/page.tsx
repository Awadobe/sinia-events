"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Users } from "lucide-react";
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
        toast.success(result.status === "added" ? "Organizer added" : "Invitation recorded");
        setEmail("");
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

                <form onSubmit={addOrganizer} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                    <label className="text-sm font-semibold text-zinc-700">Add organizer by email</label>
                    <div className="flex gap-2 mt-3">
                        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@example.com" className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-200" />
                        <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
                        </button>
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">If they do not have an account yet, access activates when they sign up with this email.</p>
                </form>

                <section className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-4"><Users className="h-4 w-4" /><h2 className="font-semibold">Current organizers</h2></div>
                    {loading ? <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div> : (
                        <div className="divide-y divide-zinc-100">
                            {organizers.map((organizer) => <div key={organizer.user_id} className="px-5 py-4"><p className="font-medium text-zinc-800">{organizer.profile?.name || organizer.profile?.email || "Organizer"}</p><p className="text-sm text-zinc-400">{organizer.profile?.email}</p></div>)}
                            {invitations.filter((invite) => invite.status === "pending").map((invite) => <div key={invite.id} className="px-5 py-4"><p className="font-medium text-zinc-700">{invite.email}</p><p className="text-xs text-amber-600">Pending account signup</p></div>)}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
