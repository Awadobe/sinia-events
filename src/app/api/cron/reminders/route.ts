import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendReminderEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

async function reserveReminder(eventId: string, email: string, reminderType: '24h' | '1h') {
    const { error } = await supabaseAdmin
        .from('reminder_deliveries')
        .insert({ event_id: eventId, email: email.trim().toLowerCase(), reminder_type: reminderType });

    if (!error) return true;
    if (error.code === '23505') return false;
    throw error;
}

async function releaseReminder(eventId: string, email: string, reminderType: '24h' | '1h') {
    await supabaseAdmin
        .from('reminder_deliveries')
        .delete()
        .eq('event_id', eventId)
        .ilike('email', email.trim())
        .eq('reminder_type', reminderType);
}

export async function GET(req: NextRequest) {
    // Verify cron secret for security
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date();
        const results = { sent24h: 0, sent1h: 0, errors: 0 };

        // ── 24-hour reminders ──
        // One-hour window centred on 24h. With an hourly scheduler, an event
        // is selected by one run instead of receiving duplicate reminders.
        const in23h = new Date(now.getTime() + 23.5 * 60 * 60 * 1000).toISOString();
        const in25h = new Date(now.getTime() + 24.5 * 60 * 60 * 1000).toISOString();

        const { data: events24h } = await supabaseAdmin
            .from('events')
            .select('id, title, date, location, slug, organizer:profiles!organizer_id(org_name, name)')
            .gte('date', in23h)
            .lte('date', in25h)
            .eq('status', 'published');

        for (const event of events24h || []) {
            const { data: registrations } = await supabaseAdmin
                .from('registrations')
                .select('name, email')
                .eq('event_id', event.id)
                .eq('status', 'confirmed');

            const orgName = (event.organizer as { org_name?: string; name?: string })?.org_name
                || (event.organizer as { name?: string })?.name || undefined;

            for (const reg of registrations || []) {
                if (!(await reserveReminder(event.id, reg.email, '24h'))) continue;
                const result = await sendReminderEmail({
                    toEmail: reg.email,
                    attendeeName: reg.name,
                    eventTitle: event.title,
                    eventDate: event.date,
                    eventLocation: event.location,
                    eventSlug: event.slug,
                    reminderType: '24h',
                    organizerName: orgName,
                });
                if (result.success && !result.skipped) results.sent24h++;
                else {
                    await releaseReminder(event.id, reg.email, '24h');
                    if (!result.skipped) results.errors++;
                }
            }
        }

        // ── 1-hour reminders ──
        // One-hour window centred on 1h for the same hourly cadence.
        const in50m = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
        const in70m = new Date(now.getTime() + 90 * 60 * 1000).toISOString();

        const { data: events1h } = await supabaseAdmin
            .from('events')
            .select('id, title, date, location, slug, organizer:profiles!organizer_id(org_name, name)')
            .gte('date', in50m)
            .lte('date', in70m)
            .eq('status', 'published');

        for (const event of events1h || []) {
            const { data: registrations } = await supabaseAdmin
                .from('registrations')
                .select('name, email')
                .eq('event_id', event.id)
                .eq('status', 'confirmed');

            const orgName = (event.organizer as { org_name?: string; name?: string })?.org_name
                || (event.organizer as { name?: string })?.name || undefined;

            for (const reg of registrations || []) {
                if (!(await reserveReminder(event.id, reg.email, '1h'))) continue;
                const result = await sendReminderEmail({
                    toEmail: reg.email,
                    attendeeName: reg.name,
                    eventTitle: event.title,
                    eventDate: event.date,
                    eventLocation: event.location,
                    eventSlug: event.slug,
                    reminderType: '1h',
                    organizerName: orgName,
                });
                if (result.success && !result.skipped) results.sent1h++;
                else {
                    await releaseReminder(event.id, reg.email, '1h');
                    if (!result.skipped) results.errors++;
                }
            }
        }

        console.log(`✅ Reminders sent: ${results.sent24h} (24h) + ${results.sent1h} (1h), ${results.errors} errors`);

        return NextResponse.json({
            success: true,
            ...results,
            timestamp: now.toISOString(),
        });
    } catch (err) {
        console.error('❌ Cron reminder error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
