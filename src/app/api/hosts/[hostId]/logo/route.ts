import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

async function canManage(hostId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await admin.from("host_organizers").select("host_id").eq("host_id", hostId).eq("user_id", user.id).maybeSingle();
    return Boolean(data);
}

export async function POST(request: NextRequest, { params }: { params: { hostId: string } }) {
    if (!await canManage(params.hostId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const formData = await request.formData();
    const file = formData.get("logo");
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose an image first" }, { status: 400 });
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return NextResponse.json({ error: "Use a JPG, PNG, or WebP image" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Logo must be smaller than 5 MB" }, { status: 400 });

    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${params.hostId}/logo-${Date.now()}.${extension}`;
    const { error: bucketError } = await admin.storage.createBucket("host-logos", { public: true, fileSizeLimit: 5 * 1024 * 1024 });
    if (bucketError && !bucketError.message.toLowerCase().includes("already exists")) return NextResponse.json({ error: bucketError.message }, { status: 500 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage.from("host-logos").upload(path, buffer, { contentType: file.type, upsert: true });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: { publicUrl } } = admin.storage.from("host-logos").getPublicUrl(path);
    const { error: updateError } = await admin.from("hosts").update({ logo_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", params.hostId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ logo_url: publicUrl });
}
