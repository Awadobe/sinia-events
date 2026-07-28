import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { findAvailableSlug, slugify } from '@/lib/slugs';
import { sendNewHostEventEmail } from '@/lib/email';
import { sanitizeRegistrationFields } from '@/lib/registration-fields';
import { sanitizeWeddingDetails } from '@/lib/wedding-details';
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

export async function POST(req: NextRequest) {
    try {
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: You must be logged in to create events' }, { status: 401 });
        }
        const formData = await req.formData();
        const payloadJson = formData.get('payload') as string;
        const coverFile = formData.get('coverFile') as File | null;

        if (!payloadJson) {
            return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
        }

        const rawPayload = JSON.parse(payloadJson);
        const allowedFields = [
            'title', 'description', 'event_type', 'date', 'end_date',
            'location', 'is_virtual', 'virtual_link', 'image_url',
            'max_attendees', 'status', 'slug', 'theme_style', 'theme_color',
            'theme_font', 'theme_mode', 'require_approval', 'visibility',
            'registration_fields', 'host_id', 'wedding_details',
        ];
        const payload: Record<string, unknown> = {};
        for (const field of allowedFields) {
            if (field in rawPayload) payload[field] = rawPayload[field];
        }
        payload.registration_fields = sanitizeRegistrationFields(payload.registration_fields);
        payload.wedding_details = sanitizeWeddingDetails(payload.wedding_details);
        if (typeof payload.visibility !== 'string' || !['public', 'unlisted', 'invite_only'].includes(payload.visibility)) payload.visibility = 'public';
        if (typeof payload.status !== 'string' || !['draft', 'published'].includes(payload.status)) payload.status = 'draft';

        if (!payload.title || !payload.date) {
            return NextResponse.json(
                { error: 'Missing required fields: title or date.' },
                { status: 400 }
            );
        }

        // Resolve the selected host. If none was supplied, use the user's
        // personal host so an organization is never required.
        let hostId = payload.host_id as string | undefined;
        if (!hostId) {
            const { data: personalMembership } = await supabaseAdmin
                .from('host_organizers')
                .select('host_id, host:hosts!inner(type)')
                .eq('user_id', user.id)
                .eq('hosts.type', 'individual')
                .limit(1)
                .maybeSingle();
            hostId = personalMembership?.host_id;
        }

        if (!hostId) {
            return NextResponse.json({ error: 'No host profile is available for this account.' }, { status: 400 });
        }

        const [{ data: membership }, { data: host }] = await Promise.all([
            supabaseAdmin.from('host_organizers').select('host_id').eq('host_id', hostId).eq('user_id', user.id).maybeSingle(),
            supabaseAdmin.from('hosts').select('id, slug, name').eq('id', hostId).maybeSingle(),
        ]);

        if (!membership || !host) {
            return NextResponse.json({ error: 'You cannot create events for this host.' }, { status: 403 });
        }

        const requestedPublicSlug = slugify(String(payload.slug || payload.title));
        const publicSlug = await findAvailableSlug(requestedPublicSlug, async (candidate) => {
            const { data } = await supabaseAdmin.from('events').select('id').eq('host_id', hostId!).eq('public_slug', candidate).maybeSingle();
            return Boolean(data);
        });
        const technicalSlug = await findAvailableSlug(`${host.slug}-${publicSlug}`, async (candidate) => {
            const { data } = await supabaseAdmin.from('events').select('id').eq('slug', candidate).maybeSingle();
            return Boolean(data);
        });

        payload.host_id = hostId;
        payload.public_slug = publicSlug;
        payload.slug = technicalSlug;

        // Handle image upload server-side using service role key
        if (coverFile && coverFile.size > 0) {
            const fileExt = coverFile.name.split('.').pop();
            const fileName = `${payload.slug}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `covers/${fileName}`;

            // Convert File to Buffer for upload
            const arrayBuffer = await coverFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Ensure the bucket exists before uploading
            const { error: bucketError } = await supabaseAdmin.storage.createBucket('event-covers', {
                public: true,
                fileSizeLimit: 10485760, // 10MB
            });

            // Ignore "already exists" errors — that's fine
            if (bucketError && !bucketError.message.includes('already exists')) {
                console.error('❌ Bucket creation error:', bucketError);
                // Don't fail — the bucket might already exist with a different check
            }

            const { error: uploadError } = await supabaseAdmin.storage
                .from('event-covers')
                .upload(filePath, buffer, {
                    contentType: coverFile.type,
                    upsert: true,
                });

            if (uploadError) {
                console.error('❌ Storage upload error:', uploadError);
                return NextResponse.json({ error: `Image upload failed: ${uploadError.message}` }, { status: 500 });
            }

            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('event-covers')
                .getPublicUrl(filePath);

            payload.image_url = publicUrl;
        }

        // Link event to the organizer who created it
        payload.organizer_id = user.id;

        const { data, error } = await supabaseAdmin
            .from('events')
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error('❌ DB insert error:', error);
            return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
        }

        if (data.status === 'published' && data.visibility === 'public') {
            const { data: subscribers } = await supabaseAdmin
                .from('host_subscriptions')
                .select('email, unsubscribe_token')
                .eq('host_id', hostId)
                .eq('status', 'active');
            await Promise.allSettled((subscribers || []).map((subscriber) => sendNewHostEventEmail({
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

        return NextResponse.json({ event: data }, { status: 201 });
    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
