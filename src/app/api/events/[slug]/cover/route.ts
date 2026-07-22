import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireEventManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
    const access = await requireEventManager(params.slug);
    if (!access.authorized || access.isCheckInStaff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("coverFile");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image first." }, { status: 400 });
    if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "The image must be smaller than 5 MB." }, { status: 400 });

    const { data: event } = await admin.from("events").select("id").eq("slug", params.slug).maybeSingle();
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

    await admin.storage.createBucket("event-covers", { public: true, fileSizeLimit: 5 * 1024 * 1024 });
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `covers/${event.id}-${Date.now()}.${extension}`;
    const { error: uploadError } = await admin.storage.from("event-covers").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: { publicUrl } } = admin.storage.from("event-covers").getPublicUrl(path);
    return NextResponse.json({ image_url: publicUrl });
}
