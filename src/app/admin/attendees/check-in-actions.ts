"use server";

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function checkInAttendee(registrationId: string, status: boolean) {
    const supabase = createClient();

    const { error } = await supabase
        .from('registrations')
        .update({ checked_in: status })
        .eq('id', registrationId);

    if (error) {
        console.error('Failed to check in attendee:', error);
        return { error: error.message };
    }

    revalidatePath('/admin/attendees');
    return { success: true };
}
