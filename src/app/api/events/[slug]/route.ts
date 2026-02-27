import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const { slug } = params;

        const { data, error } = await supabaseAdmin
            .from('events')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Also get registration count
        const { count } = await supabaseAdmin
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', data.id);

        return NextResponse.json({ event: data, attendee_count: count ?? 0 }, { status: 200 });
    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
