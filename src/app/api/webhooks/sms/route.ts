import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';

/**
 * Webhook Endpoint for Supabase 'Send SMS' Hook
 * Supabase will call this endpoint whenever a user tries to log in with their phone.
 * We will take the OTP code provided by Supabase and forward it to WASender API.
 */
export async function POST(request: Request) {
    try {
        // Enforce a webhook secret to prevent unauthorized spam
        const authHeader = request.headers.get("authorization");
        const webhookSecret = process.env.SMS_WEBHOOK_SECRET;
        
        if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse the payload from Supabase
        const payload = await request.json();
        const { user, sms } = payload;
        
        const phone = user.phone; // e.g., +23277123456
        const otpCode = sms.code; // e.g., 123456
        
        // --- WASender API Integration ---
        const waSenderEndpoint = process.env.WASENDER_API_ENDPOINT || "https://api.wasender.com/send";
        const waSenderToken = process.env.WASENDER_API_TOKEN;

        const message = `Welcome to Christex Foundation! Your verification code is: ${otpCode}. Please do not share this code with anyone.`;

        // Send the WhatsApp message via WASender
        if (waSenderToken) {
            const response = await fetch(waSenderEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${waSenderToken}`
                },
                body: JSON.stringify({
                    number: phone,
                    message: message,
                    // Note: Depending on WASender's exact API shape, this body might need adjusting.
                })
            });

            if (!response.ok) {
                console.error("WASender Error:", await response.text());
                // Still return 200 to Supabase so it doesn't fail the authentication block entirely
            }
        } else {
            // For local development testing when WASender isn't hooked up yet
            console.log("----------------------------------------");
            console.log(`[DEVELOPMENT ONLY] Mock WASender Message`);
            console.log(`To: ${phone}`);
            console.log(`Message: ${message}`);
            console.log("----------------------------------------");
        }

        // Return the expected response format back to Supabase
        return NextResponse.json({
            message: "SMS sent successfully via WASender hook."
        }, { status: 200 });

    } catch (error) {
        console.error("Error in WASender Hook:", error);
        return NextResponse.json({ error: "Failed to process SMS hook" }, { status: 500 });
    }
}
