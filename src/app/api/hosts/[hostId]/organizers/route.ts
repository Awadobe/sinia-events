import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);
const authClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
);

async function requireHostOrganizer(hostId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: membership } = await admin
        .from("host_organizers")
        .select("host_id")
        .eq("host_id", hostId)
        .eq("user_id", user.id)
        .maybeSingle();

    return membership ? user : null;
}

export async function GET(
    _request: NextRequest,
    { params }: { params: { hostId: string } }
) {
    const user = await requireHostOrganizer(params.hostId);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [{ data: members }, { data: invitations }] = await Promise.all([
        admin
            .from("host_organizers")
            .select("user_id, created_at")
            .eq("host_id", params.hostId),
        admin
            .from("host_invitations")
            .select("id, email, status, created_at")
            .eq("host_id", params.hostId)
            .neq("status", "revoked"),
    ]);

    const memberIds = (members || []).map((member) => member.user_id);
    const { data: profiles } = memberIds.length
        ? await admin.from("profiles").select("id, name, email").in("id", memberIds)
        : { data: [] };
    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));

    return NextResponse.json({
        organizers: (members || []).map((member) => ({
            ...member,
            profile: profileById.get(member.user_id) || null,
        })),
        invitations: invitations || [],
    });
}

export async function POST(
    request: NextRequest,
    { params }: { params: { hostId: string } }
) {
    const user = await requireHostOrganizer(params.hostId);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .ilike("email", email)
        .maybeSingle();

    if (profile) {
        const { data: existingMembership } = await admin.from("host_organizers").select("host_id").eq("host_id", params.hostId).eq("user_id", profile.id).maybeSingle();
        if (existingMembership) return NextResponse.json({ error: "This person is already an organizer" }, { status: 409 });
    }

    const { data: invitation, error } = await admin.from("host_invitations").upsert({
        host_id: params.hostId,
        email,
        invited_by: user.id,
        status: "pending",
        accept_token: crypto.randomUUID(),
    }, { onConflict: "host_id,email" }).select("accept_token").single();

    if (error || !invitation) return NextResponse.json({ error: error?.message || "Could not create invitation" }, { status: 500 });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const acceptancePath = `/organizer/invitations/accept?token=${invitation.accept_token}`;
    const callbackUrl = `${appUrl}/auth/confirm?next=${encodeURIComponent(acceptancePath)}`;
    const { error: emailError } = await authClient.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: callbackUrl },
    });

    if (emailError) {
        console.error("Organizer invitation email failed:", emailError);
        return NextResponse.json({ error: `Invitation was saved, but the email could not be sent: ${emailError.message}` }, { status: 502 });
    }
    return NextResponse.json({ status: "invited" }, { status: 201 });
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { hostId: string } }
) {
    const user = await requireHostOrganizer(params.hostId);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();

    if (body.invitationId) {
        const { error } = await admin.from("host_invitations").update({ status: "revoked" }).eq("id", body.invitationId).eq("host_id", params.hostId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ status: "invitation_revoked" });
    }

    const organizerId = String(body.userId || "");
    if (!organizerId) return NextResponse.json({ error: "Organizer is required" }, { status: 400 });
    const { count } = await admin.from("host_organizers").select("*", { count: "exact", head: true }).eq("host_id", params.hostId);
    if ((count || 0) <= 1) return NextResponse.json({ error: "An organization must keep at least one organizer" }, { status: 409 });

    const { error } = await admin.from("host_organizers").delete().eq("host_id", params.hostId).eq("user_id", organizerId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: "organizer_removed" });
}
