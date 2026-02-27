import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Uses the service role key server-side — this bypasses RLS safely
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();

        if (!payload.title || !payload.date || !payload.slug) {
            return NextResponse.json(
                { error: 'Missing required fields: title, date, or slug.' },
                { status: 400 }
            );
        }

        // Handle image upload to storage if a base64 file is passed
        // (File upload is handled client-side; only the URL reaches here)

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
