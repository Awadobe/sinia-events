"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CalendarDays, Check, Loader2, MapPin, X } from "lucide-react";
import { format } from "date-fns";
import { sanitizeWeddingDetails, type WeddingDetails } from "@/lib/wedding-details";
import Image from "next/image";
import { WeddingInvitationPreview } from "@/components/wedding-invitation-preview";

type Invitation = {
    email: string;
    name: string | null;
    status: string;
    party_size: number;
    event: {
        title: string;
        date: string;
        location: string | null;
        event_type: string;
        image_url: string | null;
        wedding_details: WeddingDetails | null;
        host: { name: string } | { name: string }[] | null;
    } | Array<{
        title: string;
        date: string;
        location: string | null;
        event_type: string;
        image_url: string | null;
        wedding_details: WeddingDetails | null;
        host: { name: string } | { name: string }[] | null;
    }>;
};

export default function InvitationPage() {
    const { token } = useParams<{ token: string }>();
    const router = useRouter();
    const [invitation, setInvitation] = useState<Invitation | null>(null);
    const [loading, setLoading] = useState(true);
    const [responding, setResponding] = useState<"accept" | "decline" | null>(null);
    const [declined, setDeclined] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch(`/api/invitations/${encodeURIComponent(token)}`, { cache: "no-store" })
            .then(async (response) => {
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                setInvitation(result.invitation);
                setDeclined(result.invitation.status === "declined");
            })
            .catch((reason) => setError(reason.message || "Could not open this invitation."))
            .finally(() => setLoading(false));
    }, [token]);

    const accept = async () => {
        setResponding("accept");
        const response = await fetch(`/api/invitations/${encodeURIComponent(token)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ response: "accept" }),
        });
        const result = await response.json();
        if (!response.ok) {
            setError(result.error || "Could not accept this invitation.");
            setResponding(null);
            return;
        }
        router.push(result.ticket_url);
    };

    const decline = async () => {
        setResponding("decline");
        const response = await fetch(`/api/invitations/${encodeURIComponent(token)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ response: "decline" }),
        });
        const result = await response.json();
        if (!response.ok) {
            setError(result.error || "Could not decline this invitation.");
            setResponding(null);
            return;
        }
        setDeclined(true);
        setInvitation((current) => current ? { ...current, status: "declined" } : current);
        setResponding(null);
    };

    if (loading) return <main className="min-h-screen grid place-items-center bg-stone-50"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></main>;
    if (error || !invitation) return <main className="min-h-screen grid place-items-center bg-stone-50 px-6"><div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-semibold">Invitation unavailable</h1><p className="mt-3 text-sm text-stone-500">{error}</p></div></main>;

    const event = Array.isArray(invitation.event) ? invitation.event[0] : invitation.event;
    const hostValue = Array.isArray(event.host) ? event.host[0] : event.host;
    const hostName = hostValue?.name || "Your host";
    const isWedding = event.event_type?.toLowerCase() === "wedding";
    const wedding = sanitizeWeddingDetails(event.wedding_details);
    const inviter = wedding.hosts || hostName;
    const design = wedding.invitation_design;

    return (
        <main className="min-h-screen px-5 py-12 grid place-items-center" style={{ backgroundColor: isWedding ? design.background : "#fbf8f3" }}>
            <section className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-xl shadow-stone-200/40">
                {isWedding ? event.image_url ? <div className="relative aspect-[16/9]"><Image src={event.image_url} alt={`${event.title} invitation`} fill className="object-cover" unoptimized />{design.image_mode === "photo" && <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/75 via-transparent to-transparent p-6 text-center text-white"><p className="text-[10px] font-bold uppercase tracking-[0.25em]">Wedding invitation</p><p className="mt-1 font-serif text-3xl italic">{event.title}</p></div>}</div> : <div className="aspect-[16/8]"><WeddingInvitationPreview title={event.title} details={wedding} /></div> : <div className="bg-stone-900 px-8 py-7 text-center text-white"><p className="text-xs font-bold uppercase tracking-[0.28em]">Private invitation</p></div>}
                <div className="px-8 py-10 text-center">
                    <p className="text-sm text-stone-500">{inviter} invites you to</p>
                    {isWedding && invitation.name && <p className="mt-3 text-lg font-semibold text-rose-700">{invitation.name}</p>}
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">{event.title}</h1>
                    {isWedding && wedding.invitation_message && <p className="mx-auto mt-5 max-w-sm whitespace-pre-line text-sm italic leading-relaxed text-stone-600">{wedding.invitation_message}</p>}
                    <div className="mt-8 space-y-3 rounded-2xl bg-stone-50 p-5 text-left text-sm text-stone-600">
                        <p className="flex gap-3"><CalendarDays className="h-4 w-4 shrink-0" />{format(new Date(event.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}</p>
                        {event.location && <p className="flex gap-3"><MapPin className="h-4 w-4 shrink-0" />{event.location}</p>}
                    </div>
                    {isWedding && (wedding.dress_code || wedding.directions || wedding.ceremony.enabled || wedding.reception.enabled) && <div className="mt-4 space-y-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-5 text-left text-sm text-stone-600">
                        {wedding.dress_code && <p><strong className="text-stone-800">Dress code:</strong> {wedding.dress_code}</p>}
                        {wedding.ceremony.enabled && <p><strong className="text-stone-800">Ceremony:</strong> {[wedding.ceremony.time, wedding.ceremony.location].filter(Boolean).join(" · ")}</p>}
                        {wedding.reception.enabled && <p><strong className="text-stone-800">Reception:</strong> {[wedding.reception.time, wedding.reception.location].filter(Boolean).join(" · ")}</p>}
                        {wedding.directions && <p className="whitespace-pre-line"><strong className="text-stone-800">Directions:</strong> {wedding.directions}</p>}
                    </div>}
                    <p className="mt-6 text-xs text-stone-400">This invitation is reserved for {invitation.email}.</p>
                    {isWedding && <p className="mt-2 text-sm font-semibold text-rose-600">Admits {invitation.party_size || 1} {(invitation.party_size || 1) === 1 ? "person" : "people"}</p>}
                    {declined ? (
                        <div className="mt-7 rounded-2xl bg-stone-50 p-5">
                            <X className="mx-auto h-7 w-7 text-stone-400" />
                            <p className="mt-2 font-semibold text-stone-800">Invitation declined</p>
                            <p className="mt-1 text-xs text-stone-500">The host will see your response. If your plans change, you can still accept below.</p>
                            <button onClick={accept} disabled={responding !== null} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: isWedding ? design.accent : "#1c1917" }}>
                                {responding === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                Accept instead
                            </button>
                        </div>
                    ) : (
                        <div className="mt-7 grid gap-3 sm:grid-cols-2">
                            <button onClick={decline} disabled={responding !== null || invitation.status === "accepted"} className="flex items-center justify-center gap-2 rounded-2xl border border-stone-200 px-5 py-4 text-sm font-bold text-stone-600 disabled:opacity-50">
                                {responding === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                Decline
                            </button>
                            <button onClick={accept} disabled={responding !== null} className="flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: isWedding ? design.accent : "#1c1917" }}>
                                {responding === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                {invitation.status === "accepted" ? "View my ticket" : "Accept invitation"}
                            </button>
                        </div>
                    )}
                    {!declined && <p className="mt-3 text-xs text-stone-400">Your QR entry ticket will appear immediately after acceptance.</p>}
                </div>
            </section>
        </main>
    );
}
