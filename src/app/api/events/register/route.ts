import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { sendConfirmationEmail, sendOrganizerNotificationEmail } from '@/lib/email';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { sanitizeRegistrationFields, validateRegistrationAnswers } from '@/lib/registration-fields';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { event_id, name, email, phone, custom_answers, invitation_token } = body;

        if (!event_id || !name || !email) {
            return NextResponse.json(
                { error: 'Missing required fields: event_id, name, or email.' },
                { status: 400 }
            );
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const serverClient = createServerClient();
        const { data: { user } } = await serverClient.auth.getUser();
        const registrationUserId = user?.email?.toLowerCase() === normalizedEmail ? user.id : null;
        const [{ data: legacyOrganizer }, { data: organizerProfile }] = await Promise.all([
            supabaseAdmin.from('staff_allowlist').select('id').ilike('email', normalizedEmail).maybeSingle(),
            supabaseAdmin.from('profiles').select('id').ilike('email', normalizedEmail).maybeSingle(),
        ]);
        const { data: organizerMembership } = organizerProfile
            ? await supabaseAdmin.from('host_organizers').select('host_id').eq('user_id', organizerProfile.id).limit(1).maybeSingle()
            : { data: null };

        if (legacyOrganizer || organizerMembership) {
            return NextResponse.json(
                { error: 'This email belongs to an organizer account. Please use a different email to register as an attendee.' },
                { status: 409 }
            );
        }

        // Check if event exists and get details + organizer info
        const { data: event, error: eventError } = await supabaseAdmin
            .from('events')
            .select('id, title, max_attendees, require_approval, date, end_date, location, slug, status, visibility, organizer_id, registration_fields, organizer:profiles!organizer_id(email, name, org_name)')
            .eq('id', event_id)
            .single();

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
        }

        if (event.status !== 'published') {
            return NextResponse.json({ error: 'Registration is not open for this event.' }, { status: 409 });
        }

        let matchedInvitation: { id: string } | null = null;
        if (event.visibility === 'invite_only') {
            if (!invitation_token) return NextResponse.json({ error: 'A personal invitation is required for this event.' }, { status: 403 });
            const { data: invitation } = await supabaseAdmin.from('invites').select('id').eq('event_id', event.id).eq('invitation_token', invitation_token).ilike('email', normalizedEmail).maybeSingle();
            if (!invitation) return NextResponse.json({ error: 'This invitation does not match that email address.' }, { status: 403 });
            matchedInvitation = invitation;
        }

        const registrationFields = sanitizeRegistrationFields(event.registration_fields);
        const answerValidation = validateRegistrationAnswers(registrationFields, custom_answers);
        if (answerValidation.error) return NextResponse.json({ error: answerValidation.error }, { status: 400 });

        const eventEnd = event.end_date ? new Date(event.end_date) : new Date(event.date);
        if (eventEnd.getTime() < Date.now()) {
            return NextResponse.json({ error: 'This event has already ended.' }, { status: 409 });
        }

        // Check capacity
        if (event.max_attendees) {
            const { count } = await supabaseAdmin
                .from('registrations')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', event_id)
                .neq('status', 'cancelled');

            if (count !== null && count >= event.max_attendees) {
                return NextResponse.json({ error: 'This event is at full capacity.' }, { status: 409 });
            }
        }

        // Insert registration
        const status = event.require_approval ? 'pending' : 'confirmed';
        const { data: registration, error: regError } = await supabaseAdmin
            .from('registrations')
            .insert([{ event_id, name, email: normalizedEmail, phone: phone || null, status, user_id: registrationUserId, custom_answers: answerValidation.answers }])
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

        if (matchedInvitation) {
            await supabaseAdmin.from('invites').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', matchedInvitation.id);
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
