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
        .select("id, email, name, status, event_id, event:events!inner(id, title, date, end_date, location, slug, image_url, event_type, status, max_attendees, host:hosts(name))")
        .eq("invitation_token", token)
        .maybeSingle();
}

export async function GET(_request: Request, { params }: { params: { token: string } }) {
    const { data, error } = await findInvitation(params.token);
    if (error || !data) return NextResponse.json({ error: "This invitation is invalid or no longer available." }, { status: 404 });
    return NextResponse.json({ invitation: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(_request: Request, { params }: { params: { token: string } }) {
    const { data: invitation, error } = await findInvitation(params.token);
    if (error || !invitation) return NextResponse.json({ error: "This invitation is invalid or no longer available." }, { status: 404 });

    const event = Array.isArray(invitation.event) ? invitation.event[0] : invitation.event;
    if (!event || event.status !== "published") return NextResponse.json({ error: "This event is not currently accepting invitations." }, { status: 409 });

    const { data: existing } = await admin
        .from("registrations")
        .select("id")
        .eq("event_id", event.id)
        .ilike("email", invitation.email)
        .maybeSingle();

    let registrationId = existing?.id;
    if (!registrationId) {
        if (event.max_attendees) {
            const { count } = await admin.from("registrations").select("*", { count: "exact", head: true }).eq("event_id", event.id).neq("status", "cancelled");
            if ((count || 0) >= event.max_attendees) return NextResponse.json({ error: "This event has reached capacity." }, { status: 409 });
        }

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
        ticket_url: `/events/${event.slug}/ticket?id=${registrationId}&invite=${encodeURIComponent(params.token)}`,
    });
}
