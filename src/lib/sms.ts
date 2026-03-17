/**
 * SMS/WhatsApp Notification Utility
 * 
 * To enable this, configure an SMS provider like Twilio, Vonage, or MessageBird.
 * The following environment variables should be added to .env.local:
 * 
 * SMS_PROVIDER_API_KEY
 * SMS_PROVIDER_API_SECRET
 * SMS_SENDER_ID (e.g. "CF Events")
 */

export async function sendSmsNotification(to: string, message: string) {
    // Determine the phone number format
    const formattedPhone = to.startsWith("+") ? to : `+232${to.replace(/^0/, "")}`;
    
    // Example Twilio Implementation:
    /*
    const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    try {
        await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedPhone
        });
        return { success: true };
    } catch (error) {
        console.error("Failed to send SMS:", error);
        return { error: error.message };
    }
    */

    // For now, in MVP mode without a paid provider, we just log it:
    console.log(`[SMS MOCK] Sending to ${formattedPhone}: ${message}`);
    return { success: true, mock: true };
}

/**
 * Utility to notify all subscribed users when a new event goes live.
 * This should be called from `src/app/admin/events/new/page.tsx` after successful insertion.
 */
export async function notifySubscribersOfNewEvent(eventTitle: string, eventUrl: string) {
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
