import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('event_id');

        let query = supabaseAdmin
            .from('registrations')
            .select(`
                id,
                name,
                email,
                phone,
                status,
                checked_in,
                created_at,
                events (
                    title
                )
            `)
            .order('created_at', { ascending: false });

        if (eventId && eventId !== 'all') {
            query = query.eq('event_id', eventId);
        }

        const { data: registrations, error } = await query;

        if (error) {
            console.error('Export error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!registrations || registrations.length === 0) {
            return new NextResponse('No registrations found', { status: 404 });
        }

        // Convert to CSV
        // Standard CSV headers
        const headers = ['Name', 'Email', 'Phone', 'Event', 'Status', 'Checked In', 'Registration Date'];
        
        // Map data to rows
        const rows = registrations.map(reg => {
            const eventTitle = reg.events && !Array.isArray(reg.events) ? reg.events.title : 'Unknown Event';
            // Escape quotes in data by replacing " with "" and wrap entire field in quotes if it contains commas
            const escapeField = (field: unknown) => {
                const str = String(field || '');
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            return [
                escapeField(reg.name),
                escapeField(reg.email),
                escapeField(reg.phone),
                escapeField(eventTitle),
                escapeField(reg.status),
                reg.checked_in ? 'Yes' : 'No',
                escapeField(new Date(reg.created_at).toLocaleString())
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');

        const fileName = eventId && eventId !== 'all' 
            ? `attendees_event_${eventId}_${new Date().toISOString().split('T')[0]}.csv`
            : `all_attendees_${new Date().toISOString().split('T')[0]}.csv`;

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            },
        });

    } catch (err) {
        console.error('❌ Unexpected export error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
