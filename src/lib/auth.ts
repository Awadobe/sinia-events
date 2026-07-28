import { createClient } from "./supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function createAdminClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
        process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
    );
}

export async function requireAdmin() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { authorized: false, user: null };
    }

    const admin = createAdminClient();
    const { data: platformAdmin } = await admin
        .from('platform_admins')
        .select('id')
        .ilike('email', user.email.trim())
        .maybeSingle();

    if (!platformAdmin) {
        return { authorized: false, user };
    }

    return { authorized: true, user };
}

export async function requireEventManager(slug: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { authorized: false, user: null, isAdmin: false, isOwner: false, isCollaborator: false, collaboratorRole: null, isCheckInStaff: false };
    }

    const admin = createAdminClient();
    const [{ data: platformAdmin }, { data: event }] = await Promise.all([
        admin.from("platform_admins").select("id").ilike("email", user.email.trim()).maybeSingle(),
        admin.from("events").select("id, host_id, organizer_id, host:hosts(created_by)").eq("slug", slug).maybeSingle(),
    ]);

    const isAdmin = Boolean(platformAdmin);
    const [{ data: hostMembership }, { data: collaborationByUser }, { data: collaborationByEmail }] = event
        ? await Promise.all([
            admin.from("host_organizers").select("host_id").eq("host_id", event.host_id).eq("user_id", user.id).maybeSingle(),
            admin.from("event_collaborators").select("id, role").eq("event_id", event.id).eq("user_id", user.id).eq("status", "active").maybeSingle(),
            admin.from("event_collaborators").select("id, role").eq("event_id", event.id).ilike("email", user.email).eq("status", "active").maybeSingle(),
        ])
        : [{ data: null }, { data: null }, { data: null }];
    const hostCreator = event?.host as { created_by?: string | null } | null;
    const isOwner = Boolean(hostMembership || event?.organizer_id === user.id || hostCreator?.created_by === user.id);
    const isCollaborator = Boolean(collaborationByUser || collaborationByEmail);
    const collaboratorRole = collaborationByUser?.role || collaborationByEmail?.role || null;
    const isCheckInStaff = isCollaborator && collaboratorRole === "check_in";

    return {
        authorized: isAdmin || isOwner || isCollaborator,
        user,
        isAdmin,
        isOwner,
        isCollaborator,
        collaboratorRole,
        isCheckInStaff,
    };
}
