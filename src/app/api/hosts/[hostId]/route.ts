import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

async function hasAccess(hostId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await admin.from("host_organizers").select("host_id").eq("host_id", hostId).eq("user_id", user.id).maybeSingle();
    return Boolean(data);
}

export async function GET(_request: NextRequest, { params }: { params: { hostId: string } }) {
    if (!await hasAccess(params.hostId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: host } = await admin.from("hosts").select("id, type, name, slug, description, logo_url").eq("id", params.hostId).maybeSingle();
    return host ? NextResponse.json({ host }) : NextResponse.json({ error: "Organization not found" }, { status: 404 });
}

export async function PATCH(request: NextRequest, { params }: { params: { hostId: string } }) {
    if (!await hasAccess(params.hostId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim() || null;
    if (!name) return NextResponse.json({ error: "Organization name is required" }, { status: 400 });

    const { data: host, error } = await admin.from("hosts").update({ name, description, updated_at: new Date().toISOString() }).eq("id", params.hostId).select("id, type, name, slug, description, logo_url").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ host });
}
