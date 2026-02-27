import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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

        // Check if event exists and get details
        const { data: event, error: eventError } = await supabaseAdmin
            .from('events')
            .select('id, title, max_attendees, require_approval, date, location, slug')
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

        // Send confirmation email via Resend
        // Fire-and-forget so we don't slow down the response
        import('@/lib/email').then(({ sendConfirmationEmail }) => {
            sendConfirmationEmail({
                toEmail: email,
                attendeeName: name,
                eventTitle: event.title,
                eventDate: event.date,
                eventLocation: event.location,
                eventSlug: event.slug,
                status: status as 'confirmed' | 'pending',
            }).catch(err => console.error('Failed to send async email:', err));
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
