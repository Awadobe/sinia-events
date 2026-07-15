import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Prevent Next.js from caching GET responses — ensures edits reflect immediately
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

export async function GET(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const { slug } = params;

        const { data, error } = await supabaseAdmin
            .from('events')
            .select('*, organizer:profiles!organizer_id(id, org_name, name, avatar_url)')
            .eq('slug', slug)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Get registration counts
        const { count: confirmedCount } = await supabaseAdmin
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', data.id)
            .eq('status', 'confirmed');

        const { count: totalCount } = await supabaseAdmin
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', data.id)
            .in('status', ['confirmed', 'pending']);

        // Get recent attendee names for avatar strip (public social proof)
        const { data: recentAttendees } = await supabaseAdmin
            .from('registrations')
            .select('name')
            .eq('event_id', data.id)
            .in('status', ['confirmed', 'pending'])
            .order('created_at', { ascending: false })
            .limit(8);

        return NextResponse.json({
            event: data,
            attendee_count: totalCount ?? 0,
            confirmed_count: confirmedCount ?? 0,
            recent_attendees: (recentAttendees || []).map(r => r.name),
        }, { status: 200 });
    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

import { requireAdmin } from '@/lib/auth';

export async function PUT(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const { authorized } = await requireAdmin();
        if (!authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { slug } = params;
        const body = await req.json();

        // Whitelist only valid event columns to avoid Supabase errors
        // from extra fields like joined organizer objects
        const allowedFields = [
            'title', 'description', 'event_type', 'date', 'end_date',
            'location', 'is_virtual', 'virtual_link', 'image_url',
            'max_attendees', 'status', 'require_approval',
            'theme_style', 'theme_color', 'theme_font', 'theme_mode',
        ];
        const updatePayload: Record<string, unknown> = {};
        for (const key of allowedFields) {
            if (key in body) updatePayload[key] = body[key];
        }

        const { data, error } = await supabaseAdmin
            .from('events')
            .update(updatePayload)
            .eq('slug', slug)
            .select()
            .single();

        if (error) {
            console.error('❌ Event update error:', error);
            return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
        }

        return NextResponse.json({ event: data }, { status: 200 });
    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
