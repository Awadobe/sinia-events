import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

const allowedStatuses = ["pending_review", "published", "suspended", "rejected"] as const;

export async function PATCH(request: NextRequest, { params }: { params: { venueId: string } }) {
  const access = await requireAdmin();
  if (!access.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!access.authorized) return NextResponse.json({ error: "Platform administrator access required" }, { status: 403 });

  const body = await request.json();
  const status = String(body.status || "") as (typeof allowedStatuses)[number];
  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid venue status" }, { status: 400 });
  }

  const updates: Record<string, string | null> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "published") {
    updates.verification_status = "verified";
    updates.verified_at = new Date().toISOString();
    updates.published_at = new Date().toISOString();
  } else if (status === "pending_review") {
    updates.verification_status = "in_review";
    updates.verified_at = null;
  }

  const { data: venue, error } = await admin
    .from("venues")
    .update(updates)
    .eq("id", params.venueId)
    .select("id, name, status")
    .maybeSingle();
  if (error || !venue) {
    return NextResponse.json({ error: error?.message || "Venue not found" }, { status: error ? 500 : 404 });
  }

  return NextResponse.json({ venue });
}

