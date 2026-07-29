"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { WeddingInvitationDraft } from "@/lib/wedding-invitations";

export function WeddingGuestListBuilder({
    invitations,
    onChange,
    capacity,
}: {
    invitations: WeddingInvitationDraft[];
    onChange: (invitations: WeddingInvitationDraft[]) => void;
    capacity?: number | null;
}) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [partySize, setPartySize] = useState(1);
    const totalPeople = invitations.reduce((total, invitation) => total + invitation.party_size, 0);

    const addInvitation = () => {
        if (!name.trim()) {
            toast.error("Enter the names of the people receiving this invitation.");
            return;
        }
        if (email.trim() && !email.includes("@")) {
            toast.error("Enter a valid email or leave it blank for now.");
            return;
        }
        onChange([...invitations, {
            id: crypto.randomUUID(),
            name: name.trim(),
            email: email.trim().toLowerCase(),
            party_size: partySize,
        }]);
        setName("");
        setEmail("");
        setPartySize(1);
    };

    return <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Guest invitations</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">Create one invitation per person, couple or family. Add one household email now or later.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_1fr_110px]">
            <label className="text-xs font-semibold text-zinc-600">Names receiving this invitation
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Mr. and Mrs. Kargbo" className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-violet-300" />
            </label>
            <label className="text-xs font-semibold text-zinc-600">One email address <span className="font-normal text-zinc-400">(optional)</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="household@email.com" className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-violet-300" />
            </label>
            <label className="text-xs font-semibold text-zinc-600">Admits
                <select value={partySize} onChange={(event) => setPartySize(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none">
                    {Array.from({ length: 20 }, (_, index) => index + 1).map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
            </label>
        </div>
        <button type="button" onClick={addInvitation} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Add invitation</button>

        <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">{invitations.length} invitation{invitations.length === 1 ? "" : "s"}</span>
            <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">{totalPeople} people invited</span>
            {capacity ? <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${totalPeople > capacity ? "bg-red-50 text-red-700" : "bg-zinc-50 text-zinc-600"}`}>{Math.max(0, capacity - totalPeople)} places remaining</span> : null}
        </div>

        {invitations.length > 0 && <div className="mt-4 divide-y divide-zinc-100 rounded-xl border border-zinc-100">
            {invitations.map((invitation) => <div key={invitation.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-zinc-800">{invitation.name}</p><p className="truncate text-xs text-zinc-400">{invitation.email || "Email will be added before sending"}</p></div>
                <span className="whitespace-nowrap rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700">Admits {invitation.party_size}</span>
                <button type="button" onClick={() => onChange(invitations.filter((item) => item.id !== invitation.id))} className="text-zinc-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </div>)}
        </div>}
    </section>;
}
