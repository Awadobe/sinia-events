import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

export async function POST(request: NextRequest, { params }: { params: { hostId: string } }) {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const { data: host } = await admin.from("hosts").select("id, name").eq("id", params.hostId).maybeSingle();
    if (!host) return NextResponse.json({ error: "Organization not found." }, { status: 404 });

    const { error } = await admin.from("host_subscriptions").upsert(
        { host_id: host.id, email, status: "active", updated_at: new Date().toISOString() },
        { onConflict: "host_id,email" }
    );

    if (error) {
        console.error("Host subscription failed:", error);
        return NextResponse.json({ error: "Could not save your subscription." }, { status: 500 });
    }

    return NextResponse.json({ message: `You will be notified when ${host.name} publishes an event.` });
}
