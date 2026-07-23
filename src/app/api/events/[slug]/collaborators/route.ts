import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireEventManager } from "@/lib/auth";
import { sendEventCollaboratorEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

async function getEventId(slug: string) {
    const { data } = await admin.from("events").select("id").eq("slug", slug).maybeSingle();
    return data?.id || null;
}

export async function GET(
    _request: NextRequest,
    { params }: { params: { slug: string } }
) {
    const access = await requireEventManager(params.slug);
    if (!access.authorized || access.isCheckInStaff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const eventId = await getEventId(params.slug);
    if (!eventId) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const { data, error } = await admin
        .from("event_collaborators")
        .select("id, email, role, status, created_at")
        .eq("event_id", eventId)
        .neq("status", "revoked")
        .order("created_at");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ collaborators: data || [] });
}

export async function POST(
    request: NextRequest,
    { params }: { params: { slug: string } }
) {
    const access = await requireEventManager(params.slug);
    if (!access.isOwner && !access.isAdmin) return NextResponse.json({ error: "Only an organizer can add collaborators" }, { status: 403 });
    const eventId = await getEventId(params.slug);
    if (!eventId || !access.user) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const role = body.role === "check_in" ? "check_in" : "manager";
    if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email is required" }, { status: 400 });

    const { data: profile } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
    const { error } = await admin.from("event_collaborators").upsert({
        event_id: eventId,
        email,
        user_id: profile?.id || null,
        added_by: access.user.id,
        role,
        status: "active",
    }, { onConflict: "event_id,email" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { data: event } = await admin.from("events").select("title, slug").eq("id", eventId).single();
    const emailResult = event ? await sendEventCollaboratorEmail({ toEmail: email, eventTitle: event.title, eventSlug: event.slug, role }) : null;
    return NextResponse.json({
        status: "added",
        email_sent: Boolean(emailResult?.success),
        email_notice: emailResult?.success
            ? null
            : "Access was added, but the notification email was not delivered. Resend testing mode only delivers to the email connected to your Resend account.",
    }, { status: 201 });
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { slug: string } }
) {
    const access = await requireEventManager(params.slug);
    if (!access.isOwner && !access.isAdmin) return NextResponse.json({ error: "Only an organizer can remove collaborators" }, { status: 403 });
    const eventId = await getEventId(params.slug);
    const collaboratorId = request.nextUrl.searchParams.get("id");
    if (!eventId || !collaboratorId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { error } = await admin.from("event_collaborators").update({ status: "revoked" }).eq("id", collaboratorId).eq("event_id", eventId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
