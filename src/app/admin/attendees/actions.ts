"use server";

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateRegistrationStatus(registrationId: string, newStatus: 'confirmed' | 'denied') {
    const supabase = createClient();

    // 1. Update the status in the database
    const { data: registration, error: updateError } = await supabase
        .from('registrations')
        .update({ status: newStatus })
        .eq('id', registrationId)
        .select('*, events(title, date, location, slug)')
        .single();

    if (updateError) {
        console.error('Failed to update registration:', updateError);
        return { error: updateError.message };
    }

    // 2. If approved, trigger the confirmation email via Resend
    if (newStatus === 'confirmed' && registration) {
        try {
            // Import dynamically so we don't block the server action
            const { sendConfirmationEmail } = await import('@/lib/email');

            await sendConfirmationEmail({
                toEmail: registration.email,
                attendeeName: registration.name,
                eventTitle: registration.events.title,
                eventDate: registration.events.date,
                eventLocation: registration.events.location,
                eventSlug: registration.events.slug,
                status: 'confirmed',
                registrationId: registrationId,
            });
        } catch (emailError) {
            console.error('Failed to send approval email:', emailError);
            // We don't return an error here because the DB update actually succeeded.
            // The admin can try to resend manually later if needed.
        }
    }

    revalidatePath('/admin/attendees');
    revalidatePath(`/admin/events/${registration.event_id}/attendees`);

    return { success: true };
}
