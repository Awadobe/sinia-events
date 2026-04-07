import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendInviteEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — fetch invites & suggestions for an event
export async function GET(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const { slug } = params;

        // Get event
        const { data: event, error: eventError } = await supabaseAdmin
            .from('events')
            .select('id, title, date, location, slug, organizer:profiles!organizer_id(org_name, name)')
            .eq('slug', slug)
            .single();

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Get all invites for this event
        const { data: invites } = await supabaseAdmin
            .from('invites')
            .select('*')
            .eq('event_id', event.id)
            .order('created_at', { ascending: false });

        // Stats
        const total = invites?.length || 0;
        const accepted = invites?.filter(i => i.status === 'accepted').length || 0;
        const declined = invites?.filter(i => i.status === 'declined').length || 0;

        // Recently accepted
        const recentlyAccepted = invites
            ?.filter(i => i.status === 'accepted')
            .slice(0, 5) || [];

        // Get suggestions — past guests from other events by this organizer
        // First get organizer's other events
        const { data: orgEvents } = await supabaseAdmin
            .from('events')
            .select('id, title, date')
            .eq('organizer_id', (event.organizer as { id?: string })?.id || '')
            .neq('id', event.id)
            .order('date', { ascending: false })
            .limit(10);

        // Get unique registrations from those events
        const suggestions: { name: string; email: string; phone?: string; eventTitle: string; eventDate: string; guestCount: number }[] = [];
        const seenEmails = new Set<string>();

        // Also get registrations already in this event (to exclude from suggestions)
        const { data: currentRegs } = await supabaseAdmin
            .from('registrations')
            .select('email')
            .eq('event_id', event.id);

        const currentEmails = new Set((currentRegs || []).map(r => r.email.toLowerCase()));
        const invitedEmails = new Set((invites || []).map(i => i.email.toLowerCase()));

        if (orgEvents && orgEvents.length > 0) {
            for (const orgEvent of orgEvents) {
                const { data: regs } = await supabaseAdmin
                    .from('registrations')
                    .select('name, email, phone')
                    .eq('event_id', orgEvent.id)
                    .eq('status', 'confirmed');

                const { count: guestCount } = await supabaseAdmin
                    .from('registrations')
                    .select('*', { count: 'exact', head: true })
                    .eq('event_id', orgEvent.id);

                for (const reg of regs || []) {
                    const emailLower = reg.email.toLowerCase();
                    if (!seenEmails.has(emailLower) && !currentEmails.has(emailLower) && !invitedEmails.has(emailLower)) {
                        seenEmails.add(emailLower);
                        suggestions.push({
                            name: reg.name,
                            email: reg.email,
                            phone: reg.phone || undefined,
                            eventTitle: orgEvent.title,
                            eventDate: orgEvent.date,
                            guestCount: guestCount || 0,
                        });
                    }
                }
            }
        }

        // Group past events for the sidebar
        const pastEvents = (orgEvents || []).map(e => ({
            id: e.id,
            title: e.title,
            date: e.date,
        }));

        return NextResponse.json({
            invites: invites || [],
            stats: { total, accepted, declined },
            recentlyAccepted,
            suggestions,
            pastEvents,
        });
    } catch (err) {
        console.error('❌ Invites GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST — send invites
export async function POST(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const { slug } = params;
        const body = await req.json();
        const { emails } = body; // Array of { email: string, name?: string }

        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return NextResponse.json({ error: 'No emails provided' }, { status: 400 });
        }

        // Get event
        const { data: event, error: eventError } = await supabaseAdmin
            .from('events')
            .select('id, title, date, location, slug, organizer:profiles!organizer_id(org_name, name)')
            .eq('slug', slug)
            .single();

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const organizerName = (event.organizer as { org_name?: string; name?: string })?.org_name
            || (event.organizer as { name?: string })?.name || 'Radius';

        const results = { sent: 0, skipped: 0, errors: 0 };

        for (const entry of emails) {
            const email = entry.email?.trim().toLowerCase();
            if (!email) continue;

            // Check if already invited
            const { data: existing } = await supabaseAdmin
                .from('invites')
                .select('id')
                .eq('event_id', event.id)
                .eq('email', email)
                .single();

            if (existing) {
                results.skipped++;
                continue;
            }

            // Check if already registered
            const { data: alreadyRegistered } = await supabaseAdmin
                .from('registrations')
                .select('id')
                .eq('event_id', event.id)
                .ilike('email', email)
                .single();

            if (alreadyRegistered) {
                results.skipped++;
                continue;
            }

            // Insert invite record
            const { error: insertError } = await supabaseAdmin
                .from('invites')
                .insert({
                    event_id: event.id,
                    email,
                    name: entry.name || null,
                    status: 'sent',
                });

            if (insertError) {
                console.error('❌ Invite insert error:', insertError);
                results.errors++;
                continue;
            }

            // Send invite email
            const emailResult = await sendInviteEmail({
                toEmail: email,
                attendeeName: entry.name || email.split('@')[0],
                eventTitle: event.title,
                eventDate: event.date,
                eventLocation: event.location,
                eventSlug: event.slug,
                organizerName,
            });

            if (emailResult.success) {
                results.sent++;
            } else {
                results.errors++;
            }
        }

        return NextResponse.json({ success: true, ...results });
    } catch (err) {
        console.error('❌ Invites POST error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
