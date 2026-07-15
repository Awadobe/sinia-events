import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { sendConfirmationEmail, sendOrganizerNotificationEmail } from '@/lib/email';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { event_id, name, email, phone } = body;

        if (!event_id || !name || !email) {
            return NextResponse.json(
                { error: 'Missing required fields: event_id, name, or email.' },
                { status: 400 }
            );
        }

        // Check if event exists and get details + organizer info
        const { data: event, error: eventError } = await supabaseAdmin
            .from('events')
            .select('id, title, max_attendees, require_approval, date, location, slug, organizer_id, organizer:profiles!organizer_id(email, name, org_name)')
            .eq('id', event_id)
            .single();

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
        }

        // Check capacity
        if (event.max_attendees) {
            const { count } = await supabaseAdmin
                .from('registrations')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', event_id);

            if (count !== null && count >= event.max_attendees) {
                return NextResponse.json({ error: 'This event is at full capacity.' }, { status: 409 });
            }
        }

        // Insert registration
        const status = event.require_approval ? 'pending' : 'confirmed';
        const { data: registration, error: regError } = await supabaseAdmin
            .from('registrations')
            .insert([{ event_id, name, email, phone: phone || null, status }])
            .select()
            .single();

        if (regError) {
            if (regError.code === '23505') {
                return NextResponse.json(
                    { error: 'You are already registered for this event.' },
                    { status: 409 }
                );
            }
            console.error('❌ Registration error:', regError);
            return NextResponse.json({ error: regError.message }, { status: 500 });
        }

        // Extract organizer info for email
        const organizer = event.organizer as { email?: string; name?: string; org_name?: string } | null;

        // Send confirmation email via Resend (awaited for proper error logging)
        try {
            console.log('📧 Sending confirmation email to:', email);
            const emailResult = await sendConfirmationEmail({
                toEmail: email,
                attendeeName: name,
                eventTitle: event.title,
                eventDate: event.date,
                eventLocation: event.location,
                eventSlug: event.slug,
                status: status as 'confirmed' | 'pending',
                registrationId: registration.id,
                organizerName: organizer?.org_name || organizer?.name || undefined,
            });
            if (emailResult.success) {
                console.log('✅ Confirmation email sent successfully');
            } else {
                console.error('❌ Email send failed:', emailResult.error);
            }
        } catch (emailErr) {
            console.error('❌ Email send exception:', emailErr);
        }

        // Sync to Airtable (fire-and-forget)
        import('@/lib/airtable').then(({ syncRegistrationToAirtable }) => {
            syncRegistrationToAirtable({
                Name: name,
                Email: email,
                Phone: phone || null,
                EventTitle: event.title,
                Status: status,
                DateRegistered: new Date().toISOString()
            }).catch(err => console.error('Failed to sync to Airtable:', err));
        });

        // Notify event organizer
        if (organizer?.email) {
            try {
                await sendOrganizerNotificationEmail({
                    organizerEmail: organizer.email!,
                    organizerName: organizer.name || organizer.org_name || '',
                    attendeeName: name,
                    attendeeEmail: email,
                    eventTitle: event.title,
                    eventSlug: event.slug,
                    registrationStatus: status as 'confirmed' | 'pending',
                });
            } catch (orgErr) {
                console.error('❌ Organizer notification failed:', orgErr);
            }
        }

        // Auto-match invites — mark as accepted if this email was invited
        supabaseAdmin
            .from('invites')
            .update({ status: 'accepted', accepted_at: new Date().toISOString() })
            .eq('event_id', event_id)
            .ilike('email', email)
            .eq('status', 'sent')
            .then(({ error: inviteErr }) => {
                if (inviteErr) console.error('Invite match error (non-critical):', inviteErr);
            });

        return NextResponse.json({
            registration,
            message: status === 'pending'
                ? 'Your request has been submitted. You will be notified when approved.'
                : 'Registration confirmed!',
        }, { status: 201 });
    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
