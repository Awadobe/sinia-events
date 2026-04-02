import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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

        const payload = JSON.parse(payloadJson);

        if (!payload.title || !payload.date || !payload.slug) {
            return NextResponse.json(
                { error: 'Missing required fields: title, date, or slug.' },
                { status: 400 }
            );
        }

        // Handle image upload server-side using service role key
        if (coverFile && coverFile.size > 0) {
            const fileExt = coverFile.name.split('.').pop();
            const fileName = `${payload.slug}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `covers/${fileName}`;

            // Convert File to Buffer for upload
            const arrayBuffer = await coverFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const { error: uploadError } = await supabaseAdmin.storage
                .from('event-covers')
                .upload(filePath, buffer, {
                    contentType: coverFile.type,
                    upsert: false,
                });

            if (uploadError) {
                // If bucket doesn't exist, try creating it
                if (uploadError.message.includes('not found') || uploadError.message.includes('Bucket')) {
                    // Create the bucket
                    const { error: bucketError } = await supabaseAdmin.storage.createBucket('event-covers', {
                        public: true,
                        fileSizeLimit: 10485760, // 10MB
                    });

                    if (bucketError && !bucketError.message.includes('already exists')) {
                        console.error('❌ Bucket creation error:', bucketError);
                        return NextResponse.json({ error: `Storage setup failed: ${bucketError.message}` }, { status: 500 });
                    }

                    // Retry upload after bucket creation
                    const { error: retryError } = await supabaseAdmin.storage
                        .from('event-covers')
                        .upload(filePath, buffer, {
                            contentType: coverFile.type,
                            upsert: false,
                        });

                    if (retryError) {
                        console.error('❌ Storage retry error:', retryError);
                        return NextResponse.json({ error: `Image upload failed: ${retryError.message}` }, { status: 500 });
                    }
                } else {
                    console.error('❌ Storage upload error:', uploadError);
                    return NextResponse.json({ error: `Image upload failed: ${uploadError.message}` }, { status: 500 });
                }
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

        return NextResponse.json({ event: data }, { status: 201 });
    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
