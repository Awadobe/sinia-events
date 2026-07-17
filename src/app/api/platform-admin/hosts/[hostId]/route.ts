import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder");

export async function PATCH(request: NextRequest, { params }: { params: { hostId: string } }) {
    const access = await requireAdmin();
    if (!access.authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const status = String(body.status || "");
    if (!['active', 'suspended'].includes(status)) return NextResponse.json({ error: "Invalid organization status" }, { status: 400 });
    const { data: host, error } = await admin.from("hosts").update({ status, updated_at: new Date().toISOString() }).eq("id", params.hostId).eq("type", "organization").select("id, status").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!host) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    return NextResponse.json({ host });
}
