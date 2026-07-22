import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { Resend } from 'resend';
import { requireEventManager } from '@/lib/auth';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

// POST — send a blast email to event registrants
export async function POST(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const access = await requireEventManager(params.slug);
        if (!access.authorized || access.isCheckInStaff) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { slug } = params;
        const { subject, body, includeStatus = 'confirmed' } = await req.json();

        if (!subject || !body) {
            return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 });
        }

        // Get event
        const { data: event, error: eventError } = await supabaseAdmin
            .from('events')
            .select('id, title')
            .eq('slug', slug)
            .single();

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Get recipients based on status filter
        let query = supabaseAdmin
            .from('registrations')
            .select('email, name')
            .eq('event_id', event.id);

        if (includeStatus === 'confirmed') {
            query = query.eq('status', 'confirmed');
        } else if (includeStatus === 'all') {
            query = query.in('status', ['confirmed', 'pending']);
        }

        const { data: recipients, error: recipError } = await query;

        if (recipError) {
            return NextResponse.json({ error: recipError.message }, { status: 500 });
        }

        if (!recipients || recipients.length === 0) {
            return NextResponse.json({ error: 'No recipients found' }, { status: 400 });
        }

        // Send emails via Resend
        if (!process.env.RESEND_API_KEY) {
            console.warn('⚠️ RESEND_API_KEY not set. Skipping blast.');
            // Still save the blast record
        } else {
            const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');
            const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

            // Send to each recipient
            const sendPromises = recipients.map(r =>
                resend.emails.send({
                    from: `Radius <${fromEmail}>`,
                    to: [r.email],
                    subject,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #111827;">Hi ${r.name},</h2>
                            <div style="color: #4b5563; line-height: 1.8; white-space: pre-wrap;">${body}</div>
                            <p style="color: #9ca3af; font-size: 14px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                                This email was sent regarding <strong>${event.title}</strong> via Radius.
                            </p>
                        </div>
                    `,
                }).catch(err => {
                    console.error(`Failed to send blast to ${r.email}:`, err);
                    return null;
                })
            );

            await Promise.allSettled(sendPromises);
        }

        // Save blast record to database
        const { data: blast, error: blastError } = await supabaseAdmin
            .from('blasts')
            .insert({
                event_id: event.id,
                subject,
                body,
                recipient_count: recipients.length,
            })
            .select()
            .single();

        if (blastError) {
            console.error('❌ Blast record save error:', blastError);
        }

        return NextResponse.json({
            success: true,
            blast,
            recipientCount: recipients.length,
            message: `Blast sent to ${recipients.length} recipient(s)`,
        });
    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET — blast history for event
export async function GET(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const access = await requireEventManager(params.slug);
        if (!access.authorized || access.isCheckInStaff) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { slug } = params;

        // Get event
        const { data: event, error: eventError } = await supabaseAdmin
            .from('events')
            .select('id')
            .eq('slug', slug)
            .single();

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const { data: blasts, error } = await supabaseAdmin
            .from('blasts')
            .select('*')
            .eq('event_id', event.id)
            .order('sent_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ blasts: blasts || [] });
    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
