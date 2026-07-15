import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendReminderEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

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
        // Events happening between 23h and 25h from now
        const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
        const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

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
                if (result.success) results.sent24h++;
                else results.errors++;
            }
        }

        // ── 1-hour reminders ──
        // Events happening between 50min and 70min from now
        const in50m = new Date(now.getTime() + 50 * 60 * 1000).toISOString();
        const in70m = new Date(now.getTime() + 70 * 60 * 1000).toISOString();

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
                if (result.success) results.sent1h++;
                else results.errors++;
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
