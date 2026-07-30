import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

export async function GET(_: Request, { params }: { params: { venueId: string } }) {
  const { data: venue } = await admin
    .from("venues")
    .select("id")
    .eq("id", params.venueId)
    .eq("status", "published")
    .maybeSingle();
  if (!venue) return NextResponse.json({ error: "Venue not found." }, { status: 404 });

  const { data, error } = await admin
    .from("venue_availability")
    .select("date, status, time_slot")
    .eq("venue_id", venue.id)
    .gte("date", new Date().toISOString().slice(0, 10))
    .order("date");
  if (error) {
    console.error("Public availability fetch failed:", error);
    return NextResponse.json({ error: "Availability could not be loaded." }, { status: 500 });
  }

  return NextResponse.json(
    { availability: data || [] },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
