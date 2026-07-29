import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder",
    { global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) } }
);

async function findInvitation(token: string) {
    return admin
        .from("invites")
        .select("id, email, name, status, party_size, event_id, event:events!inner(id, title, date, end_date, location, slug, image_url, event_type, status, max_attendees, wedding_details, host:hosts(name))")
        .eq("invitation_token", token)
        .maybeSingle();
}

export async function GET(_request: Request, { params }: { params: { token: string } }) {
    const { data, error } = await findInvitation(params.token);
    if (error || !data) return NextResponse.json({ error: "This invitation is invalid or no longer available." }, { status: 404 });
    return NextResponse.json({ invitation: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: { token: string } }) {
    const { data: invitation, error } = await findInvitation(params.token);
    if (error || !invitation) return NextResponse.json({ error: "This invitation is invalid or no longer available." }, { status: 404 });

    const event = Array.isArray(invitation.event) ? invitation.event[0] : invitation.event;
    if (!event || event.status !== "published") return NextResponse.json({ error: "This event is not currently accepting invitations." }, { status: 409 });
    const body = await request.json().catch(() => ({}));
    const response = body.response === "decline" ? "decline" : "accept";

    const { data: existing } = await admin
        .from("registrations")
        .select("id, status")
        .eq("event_id", event.id)
        .ilike("email", invitation.email)
        .maybeSingle();

    if (response === "decline") {
        if (existing) {
            await admin
                .from("registrations")
                .update({ status: "cancelled", checked_in: false, checked_in_at: null })
                .eq("id", existing.id);
        }
        await admin.from("invites").update({ status: "declined", accepted_at: null }).eq("id", invitation.id);
        return NextResponse.json({ response: "declined" });
    }

    let registrationId = existing?.id;
    if (event.max_attendees && existing?.status !== "confirmed") {
        const [{ data: activeRegistrations }, { data: eventInvites }] = await Promise.all([
            admin.from("registrations").select("email").eq("event_id", event.id).neq("status", "cancelled"),
            admin.from("invites").select("email, party_size").eq("event_id", event.id),
        ]);
        const sizes = new Map((eventInvites || []).map((item) => [item.email.toLowerCase(), item.party_size || 1]));
        const occupiedPlaces = (activeRegistrations || []).reduce((total, item) => total + (sizes.get(item.email.toLowerCase()) || 1), 0);
        if (occupiedPlaces + (invitation.party_size || 1) > event.max_attendees) {
            return NextResponse.json({ error: "There are not enough remaining places for this invitation." }, { status: 409 });
        }
    }
    if (registrationId) {
        if (existing?.status !== "confirmed") {
            await admin.from("registrations").update({ status: "confirmed" }).eq("id", registrationId);
        }
    } else {
        const guestName = invitation.name?.trim() || invitation.email.split("@")[0];
        const { data: registration, error: registrationError } = await admin
            .from("registrations")
            .insert({ event_id: event.id, name: guestName, email: invitation.email, status: "confirmed" })
            .select("id")
            .single();
        if (registrationError || !registration) return NextResponse.json({ error: registrationError?.message || "Could not accept this invitation." }, { status: 500 });
        registrationId = registration.id;
    }

    await admin.from("invites").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", invitation.id);

    return NextResponse.json({
        response: "accepted",
        ticket_url: `/events/${event.slug}/ticket?id=${registrationId}&invite=${encodeURIComponent(params.token)}`,
    });
}
