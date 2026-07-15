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

    // Check if user is in staff_allowlist
    // We use the regular client here. If RLS on staff_allowlist allows public viewing, this works.
    // If not, we might need service_role just to check the allowlist, but currently RLS says:
    // CREATE POLICY "Public can view staff allowlist" ON staff_allowlist FOR SELECT TO authenticated USING (true);
    const { data: staff } = await supabase
        .from('staff_allowlist')
        .select('id')
        .eq('email', user.email)
        .single();

    if (!staff && !user.user_metadata?.is_admin) {
        return { authorized: false, user };
    }

    return { authorized: true, user };
}

export async function requireEventManager(slug: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { authorized: false, user: null, isAdmin: false, isOwner: false };
    }

    const admin = createAdminClient();
    const [{ data: staff }, { data: event }] = await Promise.all([
        admin.from("staff_allowlist").select("id").eq("email", user.email).maybeSingle(),
        admin.from("events").select("organizer_id").eq("slug", slug).maybeSingle(),
    ]);

    const isAdmin = Boolean(staff || user.user_metadata?.is_admin);
    const isOwner = event?.organizer_id === user.id;

    return {
        authorized: isAdmin || isOwner,
        user,
        isAdmin,
        isOwner,
    };
}
