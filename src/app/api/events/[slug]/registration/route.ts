import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

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
        const serverClient = createServerClient();
        const { data: { user } } = await serverClient.auth.getUser();
        if (!user?.email) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

        const { data: event } = await supabaseAdmin.from("events").select("id").eq("slug", params.slug).maybeSingle();
        if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

        let { data: registration, error } = await supabaseAdmin
            .from("registrations")
            .select("id, name, email, status, checked_in, checked_in_at, created_at")
            .eq("event_id", event.id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!registration && !error) {
            const emailMatch = await supabaseAdmin
                .from("registrations")
                .select("id, name, email, status, checked_in, checked_in_at, created_at")
                .eq("event_id", event.id)
                .ilike("email", user.email)
                .maybeSingle();
            registration = emailMatch.data;
            error = emailMatch.error;
            if (registration) await supabaseAdmin.from("registrations").update({ user_id: user.id }).eq("id", registration.id).is("user_id", null);
        }

        if (error) return NextResponse.json({ error: "Could not load registration" }, { status: 500 });
        if (!registration) return NextResponse.json({ registration: null });
        return NextResponse.json({ registration });
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
