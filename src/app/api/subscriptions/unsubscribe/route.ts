import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get("token");
    if (token) {
        await admin.from("host_subscriptions").update({ status: "unsubscribed", updated_at: new Date().toISOString() }).eq("unsubscribe_token", token);
    }
    return new NextResponse(`<!doctype html><html><body style="font-family:system-ui;background:#faf9f7;padding:60px 20px;text-align:center"><h1>You have been unsubscribed</h1><p>You will no longer receive new-event emails from this organizer.</p><a href="/" style="color:#18181b">Return to Radius</a></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}
