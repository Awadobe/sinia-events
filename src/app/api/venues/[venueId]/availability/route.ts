import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

const timeSlots = ["morning", "afternoon", "evening", "full_day"];
const statuses = ["available", "confirmation_required", "held", "booked", "blocked"];

async function manager(request: NextRequest, venueId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in to manage this venue." }, { status: 401 }) };
  const { data: allowed } = await supabase.rpc("can_manage_venue", { target_venue_id: venueId });
  if (!allowed) return { error: NextResponse.json({ error: "You cannot manage this venue." }, { status: 403 }) };
  return { user };
}

export async function POST(request: NextRequest, { params }: { params: { venueId: string } }) {
  const authorization = await manager(request, params.venueId);
  if (authorization.error) return authorization.error;
  const body = await request.json().catch(() => ({}));
  const date = String(body.date || "");
  const timeSlot = String(body.timeSlot || "");
  const status = String(body.status || "");
  const notes = String(body.notes || "").trim().slice(0, 500) || null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !timeSlots.includes(timeSlot) || !statuses.includes(status)) {
    return NextResponse.json({ error: "Choose a valid date, time, and status." }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("venue_availability")
    .select("id")
    .eq("venue_id", params.venueId)
    .is("space_id", null)
    .eq("date", date)
    .eq("time_slot", timeSlot)
    .maybeSingle();

  const values = {
    venue_id: params.venueId,
    date,
    time_slot: timeSlot,
    status,
    notes,
    source: "venue_manager",
    verified_at: status === "available" ? new Date().toISOString() : null,
    created_by: authorization.user!.id,
  };
  const query = existing
    ? admin.from("venue_availability").update(values).eq("id", existing.id)
    : admin.from("venue_availability").insert(values);
  const { data, error } = await query.select("id, date, time_slot, status, notes, verified_at").single();
  if (error || !data) {
    console.error("Availability update failed:", error);
    return NextResponse.json({ error: "The calendar could not be updated." }, { status: 500 });
  }
  return NextResponse.json({ availability: data });
}

export async function DELETE(request: NextRequest, { params }: { params: { venueId: string } }) {
  const authorization = await manager(request, params.venueId);
  if (authorization.error) return authorization.error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Choose a calendar entry." }, { status: 400 });
  const { error } = await admin.from("venue_availability").delete().eq("id", id).eq("venue_id", params.venueId);
  if (error) return NextResponse.json({ error: "The calendar entry could not be removed." }, { status: 500 });
  return NextResponse.json({ success: true });
}
