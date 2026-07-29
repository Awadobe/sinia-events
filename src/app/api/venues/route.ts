import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { findAvailableSlug } from "@/lib/slugs";

export const dynamic = "force-dynamic";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

function text(form: FormData, name: string) {
  return String(form.get(name) || "").trim();
}

function nullableNumber(form: FormData, name: string) {
  const value = text(form, name);
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function lines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function stringArray(value: FormDataEntryValue | null) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.map(String).map((item) => item.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Sign in before submitting a venue." }, { status: 401 });
  }

  const form = await request.formData();
  const hostId = text(form, "host_id");
  const name = text(form, "name");
  const eventTypes = stringArray(form.get("event_types"));
  const amenityKeys = stringArray(form.get("amenities"));
  const cover = form.get("cover");

  if (!hostId || !name || !text(form, "venue_type") || !text(form, "area")) {
    return NextResponse.json({ error: "Complete the required venue details." }, { status: 400 });
  }
  if (!eventTypes.length) {
    return NextResponse.json({ error: "Choose at least one accepted event type." }, { status: 400 });
  }

  const { data: membership } = await admin
    .from("host_organizers")
    .select("host_id")
    .eq("host_id", hostId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "You cannot submit a venue for this account." }, { status: 403 });
  }

  const slug = await findAvailableSlug(name, async (candidate) => {
    const { data } = await admin.from("venues").select("id").eq("slug", candidate).maybeSingle();
    return Boolean(data);
  });

  const { data: venue, error: venueError } = await admin
    .from("venues")
    .insert({
      host_id: hostId,
      created_by: user.id,
      name,
      slug,
      venue_type: text(form, "venue_type"),
      short_description: text(form, "short_description"),
      description: text(form, "description"),
      event_types: eventTypes,
      area: text(form, "area"),
      address: text(form, "address") || null,
      city: text(form, "city") || "Freetown",
      maximum_capacity: nullableNumber(form, "maximum_capacity"),
      starting_price: nullableNumber(form, "starting_price"),
      price_basis: text(form, "price_basis") || "on_request",
      contact_name: text(form, "contact_name"),
      contact_phone: text(form, "contact_phone"),
      contact_email: text(form, "contact_email") || user.email,
      rules: lines(text(form, "rules")),
      additional_charges: lines(text(form, "additional_charges")),
      status: "pending_review",
      verification_status: "in_review",
    })
    .select("id, name, slug")
    .single();

  if (venueError || !venue) {
    console.error("Venue submission failed:", venueError);
    return NextResponse.json({ error: venueError?.message || "Could not create the venue." }, { status: 500 });
  }
  const venueId = venue.id;

  async function rollback(message: string, error?: unknown) {
    console.error(message, error);
    await admin.from("venues").delete().eq("id", venueId);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: space, error: spaceError } = await admin
    .from("venue_spaces")
    .insert({
      venue_id: venueId,
      name: text(form, "space_name"),
      space_type: text(form, "space_type"),
      theatre_capacity: nullableNumber(form, "theatre_capacity"),
      classroom_capacity: nullableNumber(form, "classroom_capacity"),
      banquet_capacity: nullableNumber(form, "banquet_capacity"),
      standing_capacity: nullableNumber(form, "standing_capacity"),
      is_indoor: !["outdoor_garden", "covered_outdoor"].includes(text(form, "space_type")),
    })
    .select("id")
    .single();
  if (spaceError || !space) return rollback("Could not save the venue space.", spaceError);

  const { error: memberError } = await admin.from("venue_members").insert({
    venue_id: venueId,
    user_id: user.id,
    email: user.email,
    role: "owner",
    status: "active",
    invited_by: user.id,
  });
  if (memberError) return rollback("Could not create venue ownership.", memberError);

  if (amenityKeys.length) {
    const { data: amenityRows } = await admin.from("venue_amenities").select("id, key").in("key", amenityKeys);
    if (amenityRows?.length) {
      const { error } = await admin.from("venue_space_amenities").insert(
        amenityRows.map((amenity) => ({ space_id: space.id, amenity_id: amenity.id }))
      );
      if (error) return rollback("Could not save the venue facilities.", error);
    }
  }

  const includedItems = lines(text(form, "included_items"));
  if (includedItems.length || nullableNumber(form, "starting_price") !== null) {
    const { error } = await admin.from("venue_packages").insert({
      venue_id: venueId,
      space_id: space.id,
      name: "Standard venue hire",
      description: "The venue's starting package. Final inclusions and price require confirmation.",
      price: nullableNumber(form, "starting_price"),
      price_basis: text(form, "price_basis") || "on_request",
      included_items: includedItems,
    });
    if (error) return rollback("Could not save the venue package.", error);
  }

  if (cover instanceof File && cover.size > 0) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(cover.type) || cover.size > 10 * 1024 * 1024) {
      return rollback("The cover photograph must be a JPG, PNG, or WebP under 10 MB.");
    }
    const extension = cover.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${venueId}/cover-${Date.now()}.${extension}`;
    const { error: bucketError } = await admin.storage.createBucket("venue-media", {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    if (bucketError && !bucketError.message.toLowerCase().includes("already exists")) {
      return rollback("Could not prepare venue photograph storage.", bucketError);
    }
    const { error: uploadError } = await admin.storage
      .from("venue-media")
      .upload(filePath, Buffer.from(await cover.arrayBuffer()), { contentType: cover.type, upsert: true });
    if (uploadError) return rollback("Could not upload the venue photograph.", uploadError);
    const {
      data: { publicUrl },
    } = admin.storage.from("venue-media").getPublicUrl(filePath);
    const { error: mediaError } = await admin.from("venue_media").insert({
      venue_id: venueId,
      space_id: space.id,
      url: publicUrl,
      alt_text: `${venue.name} venue`,
      is_cover: true,
      display_order: 0,
    });
    if (mediaError) return rollback("Could not save the venue photograph.", mediaError);
  }

  return NextResponse.json({ venue }, { status: 201 });
}
