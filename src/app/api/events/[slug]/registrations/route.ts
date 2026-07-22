import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireEventManager } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

// GET all registrations for an event
export async function GET(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const access = await requireEventManager(params.slug);
        if (!access.authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { slug } = params;

        // Get event by slug first
        const { data: event, error: eventError } = await supabaseAdmin
            .from('events')
            .select('id, registration_fields')
            .eq('slug', slug)
            .single();

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Get all registrations for this event
        const { data: registrations, error } = await supabaseAdmin
            .from('registrations')
            .select('*')
            .eq('event_id', event.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Registrations fetch error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Get counts by status
        const confirmed = registrations?.filter(r => r.status === 'confirmed').length || 0;
        const pending = registrations?.filter(r => r.status === 'pending').length || 0;
        const cancelled = registrations?.filter(r => r.status === 'cancelled').length || 0;
        const checkedIn = registrations?.filter(r => r.checked_in).length || 0;

        // Daily registration breakdown (last 7 days) for analytics chart
        const dailyBreakdown: { date: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
            const count = registrations?.filter(r => {
                const regDate = new Date(r.created_at).toISOString().split('T')[0];
                return regDate === dayStr;
            }).length || 0;
            dailyBreakdown.push({ date: dayStr, count });
        }

        return NextResponse.json({
            registrations: registrations || [],
            stats: { total: registrations?.length || 0, confirmed, pending, cancelled, checkedIn },
            dailyBreakdown,
            registrationFields: event.registration_fields || [],
        });
    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH — update registration status (approve/reject)
export async function PATCH(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const access = await requireEventManager(params.slug);
        if (!access.authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { registrationId, status, checked_in } = body;

        if (access.isCheckInStaff && (status !== undefined || typeof checked_in !== 'boolean')) {
            return NextResponse.json({ error: 'Check-in staff can only update check-in status.' }, { status: 403 });
        }

        if (!registrationId) {
            return NextResponse.json({ error: 'registrationId is required' }, { status: 400 });
        }

        if (status && !['pending', 'confirmed', 'cancelled'].includes(status)) {
            return NextResponse.json({ error: 'Invalid registration status' }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};
        if (status) updateData.status = status;
        if (checked_in !== undefined) {
            updateData.checked_in = checked_in;
            updateData.checked_in_at = checked_in ? new Date().toISOString() : null;
        }

        const { data: managedEvent } = await supabaseAdmin
            .from('events')
            .select('id')
            .eq('slug', params.slug)
            .maybeSingle();

        if (!managedEvent) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        let updateQuery = supabaseAdmin
            .from('registrations')
            .update(updateData)
            .eq('id', registrationId)
            .eq('event_id', managedEvent.id);
        if (checked_in === true) updateQuery = updateQuery.eq('status', 'confirmed');

        const { data, error } = await updateQuery.select().maybeSingle();

        if (error) {
            console.error('❌ Registration update error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: checked_in === true ? 'Only confirmed attendees can be checked in' : 'Registration not found for this event' }, { status: 409 });
        }

        return NextResponse.json({ registration: data });
    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
