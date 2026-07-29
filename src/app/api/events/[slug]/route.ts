import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendEventChangeEmail, sendNewHostEventEmail } from '@/lib/email';
import { sanitizeRegistrationFields } from '@/lib/registration-fields';
import { sanitizeWeddingDetails } from '@/lib/wedding-details';
import { sanitizeWeddingInvitations } from '@/lib/wedding-invitations';

// Prevent Next.js from caching GET responses — ensures edits reflect immediately
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
    {
        global: {
            fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
        },
    }
);

export async function GET(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const { slug } = params;

        const { data, error } = await supabaseAdmin
            .from('events')
            .select('*, host:hosts(id, type, name, slug, logo_url, status), organizer:profiles!organizer_id(id, org_name, name, avatar_url)')
            .eq('slug', slug)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const eventHost = Array.isArray(data.host) ? data.host[0] : data.host;
        const managerAccess = data.status === 'draft' || data.visibility === 'invite_only' || eventHost?.status === 'suspended'
            ? await requireEventManager(slug)
            : { authorized: false };

        if (eventHost?.status === 'suspended' && !managerAccess.authorized) {
            return NextResponse.json({ error: 'This organization is currently unavailable.' }, { status: 404 });
        }

        if (data.status === 'draft' && !managerAccess.authorized) {
            return NextResponse.json({ error: 'This event is still a draft.' }, { status: 403 });
        }

        let invitation: { id: string; email: string; status: string; party_size: number } | null = null;
        if (data.visibility === 'invite_only') {
            const token = req.nextUrl.searchParams.get('invite');
            const { data: matchedInvitation } = token
                ? await supabaseAdmin.from('invites').select('id, email, status, party_size').eq('event_id', data.id).eq('invitation_token', token).maybeSingle()
                : { data: null };
            invitation = matchedInvitation;
            if (!managerAccess.authorized && !invitation) {
                return NextResponse.json({ error: 'A valid invitation is required.' }, { status: 403 });
            }
        }

        let invitationRegistrationId: string | null = null;
        if (invitation?.status === 'accepted') {
            const { data: invitedRegistration } = await supabaseAdmin
                .from('registrations')
                .select('id')
                .eq('event_id', data.id)
                .ilike('email', invitation.email)
                .maybeSingle();
            invitationRegistrationId = invitedRegistration?.id || null;
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
            invitation_registration_id: invitationRegistrationId,
            invitation_party_size: invitation?.party_size || 1,
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
        const access = await requireEventManager(params.slug);
        if (!access.authorized || access.isCheckInStaff) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { slug } = params;
        const body = await req.json();
        const weddingInvitations = sanitizeWeddingInvitations(body.wedding_invitations);
        const { data: previousEvent } = await supabaseAdmin
            .from('events')
            .select('id, status, title, date, end_date, location, is_virtual, virtual_link')
            .eq('slug', slug)
            .maybeSingle();
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
            'registration_fields', 'wedding_details',
        ];
        const updatePayload: Record<string, unknown> = {};
        for (const key of allowedFields) {
            if (key in body) updatePayload[key] = body[key];
        }
        if ('registration_fields' in updatePayload) updatePayload.registration_fields = sanitizeRegistrationFields(updatePayload.registration_fields);
        if ('wedding_details' in updatePayload) updatePayload.wedding_details = sanitizeWeddingDetails(updatePayload.wedding_details);

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

        if (verifiedEvent.event_type?.toLowerCase() === 'wedding' && 'wedding_invitations' in body) {
            const incomingIds = weddingInvitations.map((invitation) => invitation.id);
            if (incomingIds.length > 0) {
                const { data: protectedInvitations } = await supabaseAdmin
                    .from('invites')
                    .select('id, status')
                    .eq('event_id', verifiedEvent.id)
                    .in('id', incomingIds)
                    .neq('status', 'draft');
                if (protectedInvitations?.length) {
                    return NextResponse.json({ error: 'Sent invitations cannot be changed from the event editor.' }, { status: 409 });
                }
            }
            let deleteDrafts = supabaseAdmin.from('invites').delete().eq('event_id', verifiedEvent.id).eq('status', 'draft');
            if (incomingIds.length > 0) deleteDrafts = deleteDrafts.not('id', 'in', `(${incomingIds.join(',')})`);
            const { error: deleteError } = await deleteDrafts;
            if (deleteError) return NextResponse.json({ error: `Could not update wedding invitations: ${deleteError.message}` }, { status: 500 });
            if (weddingInvitations.length > 0) {
                const { error: invitationError } = await supabaseAdmin.from('invites').upsert(weddingInvitations.map((invitation) => ({
                    id: invitation.id,
                    event_id: verifiedEvent.id,
                    name: invitation.name,
                    email: invitation.email || null,
                    party_size: invitation.party_size,
                    status: 'draft',
                })), { onConflict: 'id' });
                if (invitationError) return NextResponse.json({ error: `Could not save wedding invitations: ${invitationError.message}` }, { status: 500 });
            }
        }

        if (previousEvent.status !== 'published' && updatedEvent.status === 'published' && verifiedEvent.visibility === 'public') {
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

        const wasCancelled = previousEvent.status !== 'cancelled' && verifiedEvent.status === 'cancelled';
        const importantChanges: string[] = [];
        if (previousEvent.title !== verifiedEvent.title) importantChanges.push('The event title was changed.');
        if (previousEvent.date !== verifiedEvent.date || previousEvent.end_date !== verifiedEvent.end_date) importantChanges.push('The event date or time was changed.');
        if (previousEvent.location !== verifiedEvent.location || previousEvent.is_virtual !== verifiedEvent.is_virtual) importantChanges.push('The event location was changed.');
        if (previousEvent.virtual_link !== verifiedEvent.virtual_link) importantChanges.push('The online event link was changed.');

        const shouldNotifyUpdate = previousEvent.status === 'published'
            && verifiedEvent.status === 'published'
            && importantChanges.length > 0;
        const notificationSummary = { attempted: 0, sent: 0, failed: 0 };

        if (wasCancelled || shouldNotifyUpdate) {
            const { data: registrations } = await supabaseAdmin
                .from('registrations')
                .select('name, email')
                .eq('event_id', previousEvent.id)
                .neq('status', 'cancelled');

            notificationSummary.attempted = registrations?.length || 0;
            const results = await Promise.allSettled((registrations || []).map((registration) => sendEventChangeEmail({
                toEmail: registration.email,
                attendeeName: registration.name,
                eventTitle: verifiedEvent.title,
                eventDate: verifiedEvent.date,
                eventLocation: verifiedEvent.location,
                eventSlug: verifiedEvent.slug,
                visibility: verifiedEvent.visibility,
                kind: wasCancelled ? 'cancelled' : 'updated',
                changes: importantChanges,
            })));
            for (const result of results) {
                if (result.status === 'fulfilled' && result.value.success && !result.value.skipped) notificationSummary.sent++;
                else notificationSummary.failed++;
            }
        }

        return NextResponse.json({
            event: verifiedEvent,
            notifications: notificationSummary,
        }, { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } });
    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
