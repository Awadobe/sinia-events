"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function CreateOrganizationForm() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setSaving(true);
        const response = await fetch("/api/hosts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, description }),
        });
        const result = await response.json();
        setSaving(false);

        if (!response.ok) {
            toast.error(result.error || "Could not create organization");
            return;
        }

        toast.success("Organization created");
        setName("");
        setDescription("");
        setOpen(false);
        router.refresh();
    }

    if (!open) {
        return (
            <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                <Plus className="h-4 w-4" /> Create organization
            </button>
        );
    }

    return (
        <form onSubmit={submit} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm space-y-4">
            <div>
                <h2 className="font-semibold text-zinc-900">Create an organization</h2>
                <p className="text-sm text-zinc-500 mt-1">You can add other organizers after creating it.</p>
            </div>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Organization name" required className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-200" />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short description (optional)" className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-200" />
            <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-sm text-zinc-500">Cancel</button>
                <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create
                </button>
            </div>
        </form>
    );
}
