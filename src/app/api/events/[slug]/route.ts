import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendNewHostEventEmail } from '@/lib/email';
import { sanitizeRegistrationFields } from '@/lib/registration-fields';

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
            .select('*, host:hosts(id, type, name, slug, logo_url), organizer:profiles!organizer_id(id, org_name, name, avatar_url)')
            .eq('slug', slug)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Get registration counts
        const { count: confirmedCount, error: countError } = await supabaseAdmin
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', data.id)
            .eq('status', 'confirmed');

        if (countError) {
            console.error('Registration count error:', countError);
            return NextResponse.json({ error: 'Could not load registration count' }, { status: 500 });
        }

        return NextResponse.json({
            event: data,
            attendee_count: confirmedCount ?? 0,
            confirmed_count: confirmedCount ?? 0,
        }, { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } });
    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

import { requireEventManager } from '@/lib/auth';

export async function PUT(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const { authorized } = await requireEventManager(params.slug);
        if (!authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { slug } = params;
        const body = await req.json();
        const { data: previousEvent } = await supabaseAdmin.from('events').select('status').eq('slug', slug).maybeSingle();

        // Whitelist only valid event columns to avoid Supabase errors
        // from extra fields like joined organizer objects
        const allowedFields = [
            'title', 'description', 'event_type', 'date', 'end_date',
            'location', 'is_virtual', 'virtual_link', 'image_url',
            'max_attendees', 'status', 'require_approval',
            'theme_style', 'theme_color', 'theme_font', 'theme_mode',
            'registration_fields',
        ];
        const updatePayload: Record<string, unknown> = {};
        for (const key of allowedFields) {
            if (key in body) updatePayload[key] = body[key];
        }
        if ('registration_fields' in updatePayload) updatePayload.registration_fields = sanitizeRegistrationFields(updatePayload.registration_fields);

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

        if (previousEvent?.status !== 'published' && data.status === 'published') {
            const [{ data: host }, { data: subscribers }] = await Promise.all([
                supabaseAdmin.from('hosts').select('name, slug').eq('id', data.host_id).maybeSingle(),
                supabaseAdmin.from('host_subscriptions').select('email, unsubscribe_token').eq('host_id', data.host_id).eq('status', 'active'),
            ]);
            if (host) await Promise.allSettled((subscribers || []).map((subscriber) => sendNewHostEventEmail({
                toEmail: subscriber.email,
                unsubscribeToken: subscriber.unsubscribe_token,
                hostName: host.name,
                hostSlug: host.slug,
                eventTitle: data.title,
                eventPublicSlug: data.public_slug,
                eventDate: data.date,
                eventLocation: data.location,
            })));
        }

        return NextResponse.json({ event: data }, { status: 200 });
    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
