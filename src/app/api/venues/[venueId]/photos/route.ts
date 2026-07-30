import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

export async function POST(
  request: NextRequest,
  { params }: { params: { venueId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload venue photographs." }, { status: 401 });

  const { data: membership } = await admin
    .from("venue_members")
    .select("venue_id")
    .eq("venue_id", params.venueId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "You cannot update this venue." }, { status: 403 });
  }

  const form = await request.formData();
  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "Choose a photograph." }, { status: 400 });
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type) || photo.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Use a JPG, PNG, or WebP photograph under 4 MB." }, { status: 400 });
  }

  const isCover = String(form.get("is_cover")) === "true";
  const displayOrder = Math.max(0, Number.parseInt(String(form.get("display_order") || "0"), 10) || 0);
  const extension = photo.name.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = `${params.venueId}/${isCover ? "cover" : "gallery"}-${Date.now()}.${extension}`;

  const { error: bucketError } = await admin.storage.createBucket("venue-media", {
    public: true,
    fileSizeLimit: 4 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (bucketError && !bucketError.message.toLowerCase().includes("already exists")) {
    return NextResponse.json({ error: "Could not prepare photograph storage." }, { status: 500 });
  }

  const { error: uploadError } = await admin.storage
    .from("venue-media")
    .upload(filePath, Buffer.from(await photo.arrayBuffer()), {
      contentType: photo.type,
      upsert: false,
    });
  if (uploadError) {
    console.error("Venue photograph upload failed:", uploadError);
    return NextResponse.json({ error: "Could not upload the photograph." }, { status: 500 });
  }

  if (isCover) {
    await admin.from("venue_media").update({ is_cover: false }).eq("venue_id", params.venueId);
  }
  const {
    data: { publicUrl },
  } = admin.storage.from("venue-media").getPublicUrl(filePath);
  const { error: mediaError } = await admin.from("venue_media").insert({
    venue_id: params.venueId,
    url: publicUrl,
    alt_text: isCover ? "Venue cover photograph" : "Venue gallery photograph",
    is_cover: isCover,
    display_order: displayOrder,
  });
  if (mediaError) {
    await admin.storage.from("venue-media").remove([filePath]);
    return NextResponse.json({ error: "Could not save the photograph." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
