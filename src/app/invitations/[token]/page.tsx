"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CalendarDays, Check, Loader2, MapPin } from "lucide-react";
import { format } from "date-fns";

type Invitation = {
    email: string;
    name: string | null;
    status: string;
    event: {
        title: string;
        date: string;
        location: string | null;
        event_type: string;
        host: { name: string } | { name: string }[] | null;
    } | Array<{
        title: string;
        date: string;
        location: string | null;
        event_type: string;
        host: { name: string } | { name: string }[] | null;
    }>;
};

export default function InvitationPage() {
    const { token } = useParams<{ token: string }>();
    const router = useRouter();
    const [invitation, setInvitation] = useState<Invitation | null>(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch(`/api/invitations/${encodeURIComponent(token)}`, { cache: "no-store" })
            .then(async (response) => {
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                setInvitation(result.invitation);
            })
            .catch((reason) => setError(reason.message || "Could not open this invitation."))
            .finally(() => setLoading(false));
    }, [token]);

    const accept = async () => {
        setAccepting(true);
        const response = await fetch(`/api/invitations/${encodeURIComponent(token)}`, { method: "POST" });
        const result = await response.json();
        if (!response.ok) {
            setError(result.error || "Could not accept this invitation.");
            setAccepting(false);
            return;
        }
        router.push(result.ticket_url);
    };

    if (loading) return <main className="min-h-screen grid place-items-center bg-stone-50"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></main>;
    if (error || !invitation) return <main className="min-h-screen grid place-items-center bg-stone-50 px-6"><div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-semibold">Invitation unavailable</h1><p className="mt-3 text-sm text-stone-500">{error}</p></div></main>;

    const event = Array.isArray(invitation.event) ? invitation.event[0] : invitation.event;
    const hostValue = Array.isArray(event.host) ? event.host[0] : event.host;
    const hostName = hostValue?.name || "Your host";
    const isWedding = event.event_type?.toLowerCase() === "wedding";

    return (
        <main className="min-h-screen bg-[#fbf8f3] px-5 py-12 grid place-items-center">
            <section className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-xl shadow-stone-200/40">
                <div className="bg-stone-900 px-8 py-7 text-center text-white"><p className="text-xs font-bold uppercase tracking-[0.28em]">{isWedding ? "Wedding invitation" : "Private invitation"}</p></div>
                <div className="px-8 py-10 text-center">
                    <p className="text-sm text-stone-500">{hostName} invites you to</p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">{event.title}</h1>
                    <div className="mt-8 space-y-3 rounded-2xl bg-stone-50 p-5 text-left text-sm text-stone-600">
                        <p className="flex gap-3"><CalendarDays className="h-4 w-4 shrink-0" />{format(new Date(event.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}</p>
                        {event.location && <p className="flex gap-3"><MapPin className="h-4 w-4 shrink-0" />{event.location}</p>}
                    </div>
                    <p className="mt-6 text-xs text-stone-400">This invitation is reserved for {invitation.email}.</p>
                    <button onClick={accept} disabled={accepting} className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 py-4 text-sm font-bold text-white disabled:opacity-60">
                        {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        {accepting ? "Accepting…" : "Accept invitation"}
                    </button>
                    <p className="mt-3 text-xs text-stone-400">Your QR entry ticket will appear immediately after acceptance.</p>
                </div>
            </section>
        </main>
    );
}
