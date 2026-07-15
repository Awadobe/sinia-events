import { createClient } from "./supabase/server";

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
