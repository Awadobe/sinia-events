"use client";

import { useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";

export function SubscribeForm({ hostId, hostName }: { hostId: string; hostName: string }) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    async function subscribe(event: React.FormEvent) {
        event.preventDefault();
        setLoading(true);
        setMessage("");
        const response = await fetch(`/api/hosts/${hostId}/subscribe`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email }),
        });
        const result = await response.json();
        setLoading(false);
        setMessage(result.message || result.error || "Something went wrong.");
        if (response.ok) setEmail("");
    }

    return (
        <div className="rounded-2xl bg-zinc-900 p-5 text-white sm:min-w-[330px]">
            <div className="flex items-center gap-2"><Bell className="h-4 w-4" /><p className="font-semibold">Follow {hostName}</p></div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">Get an email when a new event is published. No account required.</p>
            <form onSubmit={subscribe} className="mt-4 flex gap-2">
                <input aria-label="Email address" type="email" required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-white/30" />
                <button disabled={loading} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Follow"}</button>
            </form>
            {message && <p className="mt-3 flex items-start gap-1.5 text-xs text-zinc-300"><Check className="mt-0.5 h-3 w-3 shrink-0" />{message}</p>}
        </div>
    );
}
