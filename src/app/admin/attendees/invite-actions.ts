"use server";

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function sendInvite(eventId: string, email: string, name: string) {
    const supabase = createClient();

    // 1. Fetch Event Details
    const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title, date, location, slug')
        .eq('id', eventId)
        .single();

    if (eventError || !event) {
        return { error: "Event not found" };
    }

    // 2. Check if the user is already registered to avoid spam
    const { data: existingReg } = await supabase
        .from('registrations')
        .select('id')
        .eq('event_id', eventId)
        .eq('email', email)
        .single();
    
    if (existingReg) {
         return { error: "This user is already registered for this event." };
    }

    // 3. Create the registration as 'confirmed' seamlessly
    const { data: registration, error: insertError } = await supabase
        .from('registrations')
        .insert([{ 
            event_id: eventId, 
            name, 
            email, 
            status: 'confirmed' 
        }])
        .select()
        .single();

    if (insertError) {
        return { error: "Failed to create registration instance" };
    }

    // 4. Send the Invite / Confirmation Email with QR Ticket
    try {
        const { sendConfirmationEmail } = await import('@/lib/email');
       
        await sendConfirmationEmail({
            toEmail: email,
            attendeeName: name,
            eventTitle: event.title,
            eventDate: event.date,
            eventLocation: event.location,
            eventSlug: event.slug,
            status: 'confirmed',
            registrationId: registration.id,
            isInvite: true // Pass an optional flag if we want it to say "You're Invited" instead
        });
    } catch (err) {
        console.error("Failed to send invite email:", err);
        // We handle email error silently so the registration doesn't appear as a 500
    }

    revalidatePath('/admin/attendees');
    return { success: true };
}
