import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireEventManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
    const { authorized } = await requireEventManager(params.slug);
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { visibility } = await request.json();
    if (!["public", "unlisted", "invite_only"].includes(visibility)) {
        return NextResponse.json({ error: "Invalid event visibility." }, { status: 400 });
    }

    const { data: event } = await admin.from("events").select("id").eq("slug", params.slug).maybeSingle();
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

    const { error } = await admin.rpc("set_event_visibility", { target_event_id: event.id, new_visibility: visibility });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const { data: verified } = await admin.from("events").select("visibility").eq("id", event.id).single();
    if (!verified || verified.visibility !== visibility) {
        return NextResponse.json({ error: "The visibility change did not persist." }, { status: 500 });
    }
    return NextResponse.json({ visibility: verified.visibility }, { headers: { "Cache-Control": "no-store" } });
}
