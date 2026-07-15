/**
 * SMS/WhatsApp Notification Utility
 * 
 * To enable this, configure an SMS provider like Twilio, Vonage, or MessageBird.
 * The following environment variables should be added to .env.local:
 * 
 * TWILIO_ACCOUNT_SID
 * TWILIO_AUTH_TOKEN
 * TWILIO_WHATSAPP_NUMBER (e.g. "whatsapp:+14155238886")
 */

export async function sendSmsNotification(to: string, message: string) {
    // Determine the phone number format
    const formattedPhone = to.startsWith("+") ? to : `+232${to.replace(/^0/, "")}`;
    const whatsappTo = `whatsapp:${formattedPhone}`;
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
        console.warn(`[SMS MOCK] Missing Twilio credentials. Skipping WhatsApp to ${formattedPhone}: ${message}`);
        return { success: true, mock: true };
    }

    try {
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                To: whatsappTo,
                From: fromNumber,
                Body: message
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error("Failed to send WhatsApp:", data);
            return { error: data.message };
        }
        
        return { success: true, messageSid: data.sid };
    } catch (error: unknown) {
        console.error("Twilio API Error:", error);
        return { error: error instanceof Error ? error.message : "Unknown error" };
    }
}

/**
 * Utility to notify all subscribed users when a new event goes live.
 * This should be called from `src/app/admin/events/new/page.tsx` after successful insertion.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function notifySubscribersOfNewEvent(eventTitle: string, _eventUrl: string) {
    // 1. Fetch all profiles where opt_in_notifications is true
    // const { data: subscribers } = await supabaseAdmin.from('profiles').select('phone').eq('opt_in_notifications', true).not('phone', 'is', null);
    
    // 2. Loop through and send
    /*
    for (const sub of subscribers ) {
        await sendSmsNotification(
            sub.phone, 
            `New Event from Christex Foundation! ${eventTitle}. Register here: ${eventUrl}`
        );
    }
    */
    console.log(`[SMS MOCK] Triggered broadcast for event: ${eventTitle}`);
}
