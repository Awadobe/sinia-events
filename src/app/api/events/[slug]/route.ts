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

        if (data.visibility === 'invite_only') {
            const token = req.nextUrl.searchParams.get('invite');
            const managerAccess = await requireEventManager(slug);
            const { data: invitation } = token
                ? await supabaseAdmin.from('invites').select('id').eq('event_id', data.id).eq('invitation_token', token).maybeSingle()
                : { data: null };
            if (!managerAccess.authorized && !invitation) {
                return NextResponse.json({ error: 'A valid invitation is required.' }, { status: 403 });
            }
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
        const { data: previousEvent } = await supabaseAdmin.from('events').select('id, status').eq('slug', slug).maybeSingle();
        if (!previousEvent) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

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

        // Use one database-side operation for the complete edit. This avoids
        // differences between migrated events and newly created events.
        const { data, error } = await supabaseAdmin
            .rpc('update_event_details', {
                target_event_id: previousEvent.id,
                event_patch: updatePayload,
            })
            .single();

        if (error) {
            console.error('❌ Event update error:', error);
            return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
        }
        const updatedEvent = data as {
            id: string;
            status: string;
            host_id: string;
            title: string;
            public_slug: string;
            date: string;
            location: string | null;
        };

        // Do not report a successful save from the update response alone.
        // Re-read the durable row so the editor and public page use the same
        // source of truth.
        const { data: verifiedEvent, error: verificationError } = await supabaseAdmin
            .from('events')
            .select('*')
            .eq('id', updatedEvent.id)
            .single();

        if (verificationError || !verifiedEvent) {
            console.error('❌ Event verification error:', verificationError);
            return NextResponse.json({ error: 'The event was updated but could not be verified. Please try again.' }, { status: 500 });
        }

        if ('registration_fields' in updatePayload) {
            const expectedFields = sanitizeRegistrationFields(updatePayload.registration_fields);
            const savedFields = sanitizeRegistrationFields(verifiedEvent.registration_fields);
            if (JSON.stringify(savedFields) !== JSON.stringify(expectedFields)) {
                console.error('❌ Registration questions did not persist for event:', updatedEvent.id);
                return NextResponse.json({ error: 'The registration questions did not persist. Please try saving again.' }, { status: 500 });
            }
        }

        if (previousEvent.status !== 'published' && updatedEvent.status === 'published') {
            const [{ data: host }, { data: subscribers }] = await Promise.all([
                supabaseAdmin.from('hosts').select('name, slug').eq('id', updatedEvent.host_id).maybeSingle(),
                supabaseAdmin.from('host_subscriptions').select('email, unsubscribe_token').eq('host_id', updatedEvent.host_id).eq('status', 'active'),
            ]);
            if (host) await Promise.allSettled((subscribers || []).map((subscriber) => sendNewHostEventEmail({
                toEmail: subscriber.email,
                unsubscribeToken: subscriber.unsubscribe_token,
                hostName: host.name,
                hostSlug: host.slug,
                eventTitle: updatedEvent.title,
                eventPublicSlug: updatedEvent.public_slug,
                eventDate: updatedEvent.date,
                eventLocation: updatedEvent.location,
            })));
        }

        return NextResponse.json({ event: verifiedEvent }, { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } });
    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
