import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findAvailableSlug } from "@/lib/slugs";

export const dynamic = "force-dynamic";

const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

export async function GET() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: memberships, error } = await admin
        .from("host_organizers")
        .select("host:hosts(id, type, name, slug, description, logo_url)")
        .eq("user_id", user.id);

    if (error) {
        console.error("Host membership lookup failed:", error);
        return NextResponse.json({ error: "Could not load hosts" }, { status: 500 });
    }

    return NextResponse.json({
        hosts: (memberships || []).map((membership) => membership.host).filter(Boolean),
    });
}

export async function POST(request: NextRequest) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim() || null;

    if (!name) {
        return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    const slug = await findAvailableSlug(name, async (candidate) => {
        const { data } = await admin.from("hosts").select("id").eq("slug", candidate).maybeSingle();
        return Boolean(data);
    });

    const { data: host, error: hostError } = await admin
        .from("hosts")
        .insert({ type: "organization", name, slug, description, created_by: user.id })
        .select("id, type, name, slug, description, logo_url")
        .single();

    if (hostError || !host) {
        console.error("Organization creation failed:", hostError);
        return NextResponse.json({ error: "Could not create organization" }, { status: 500 });
    }

    const { error: membershipError } = await admin
        .from("host_organizers")
        .insert({ host_id: host.id, user_id: user.id, added_by: user.id });

    if (membershipError) {
        await admin.from("hosts").delete().eq("id", host.id);
        console.error("Organization membership creation failed:", membershipError);
        return NextResponse.json({ error: "Could not create organization membership" }, { status: 500 });
    }

    return NextResponse.json({ host }, { status: 201 });
}
