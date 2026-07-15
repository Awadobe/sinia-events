import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

export async function GET(
    request: NextRequest,
    { params }: { params: { slug: string } }
) {
    const registrationId = request.nextUrl.searchParams.get("id");

    if (!registrationId) {
        return NextResponse.json({ error: "Registration ID is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from("registrations")
        .select("id, name, email, status, checked_in, checked_in_at, created_at, events!inner(slug)")
        .eq("id", registrationId)
        .eq("events.slug", params.slug)
        .maybeSingle();

    if (error) {
        console.error("Registration lookup failed:", error);
        return NextResponse.json({ error: "Could not load registration" }, { status: 500 });
    }

    if (!data) {
        return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    return NextResponse.json({
        registration: {
            id: data.id,
            name: data.name,
            email: data.email,
            status: data.status,
            checked_in: data.checked_in,
            checked_in_at: data.checked_in_at,
            created_at: data.created_at,
        },
    });
}
