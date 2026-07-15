"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Plus, UserRoundCog, X } from "lucide-react";
import { toast } from "sonner";

type Collaborator = { id: string; email: string; status: string };

export default function EventTeamPage() {
    const params = useParams();
    const slug = params.slug as string;
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        const response = await fetch(`/api/events/${slug}/collaborators`);
        if (response.ok) {
            const result = await response.json();
            setCollaborators(result.collaborators || []);
        }
        setLoading(false);
    }, [slug]);

    useEffect(() => { load(); }, [load]);

    async function add(event: React.FormEvent) {
        event.preventDefault();
        setSaving(true);
        const response = await fetch(`/api/events/${slug}/collaborators`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
        const result = await response.json();
        setSaving(false);
        if (!response.ok) return toast.error(result.error || "Could not add collaborator");
        toast.success("Event collaborator added");
        setEmail("");
        await load();
    }

    async function remove(id: string) {
        const response = await fetch(`/api/events/${slug}/collaborators?id=${id}`, { method: "DELETE" });
        if (!response.ok) return toast.error("Could not remove collaborator");
        toast.success("Collaborator removed");
        await load();
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div>
                <h2 className="text-2xl font-semibold text-zinc-900">Event team</h2>
                <p className="text-sm text-zinc-500 mt-1">Collaborators can edit this event, manage guests, send invitations, and check people in. They cannot access your other events.</p>
            </div>
            <form onSubmit={add} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                <label className="text-sm font-semibold text-zinc-700">Add collaborator by email</label>
                <div className="flex gap-2 mt-3">
                    <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="helper@example.com" className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-200" />
                    <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add</button>
                </div>
                <p className="text-xs text-zinc-400 mt-2">If they are new to Radius, access activates when they sign up with this email.</p>
            </form>
            <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-4"><UserRoundCog className="h-4 w-4" /><h3 className="font-semibold">Collaborators</h3></div>
                {loading ? <div className="p-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div> : collaborators.length ? (
                    <div className="divide-y divide-zinc-100">{collaborators.map((collaborator) => <div key={collaborator.id} className="flex items-center justify-between px-5 py-4"><span className="text-sm font-medium text-zinc-700">{collaborator.email}</span><button onClick={() => remove(collaborator.id)} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500" title="Remove collaborator"><X className="h-4 w-4" /></button></div>)}</div>
                ) : <div className="p-8 text-center text-sm text-zinc-400">No collaborators yet.</div>}
            </div>
        </div>
    );
}
