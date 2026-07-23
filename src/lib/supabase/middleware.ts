import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh the session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Resolve public host-scoped event URLs to the existing event page while
  // keeping the organization-aware address visible in the browser.
  const publicEventMatch = pathname.match(/^\/hosts\/([^/]+)\/events\/([^/]+)\/?$/);
  if (publicEventMatch) {
    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
    );
    const { data: event } = await admin
      .from('events')
      .select('slug, host:hosts!inner(slug, status)')
      .eq('public_slug', decodeURIComponent(publicEventMatch[2]))
      .eq('hosts.slug', decodeURIComponent(publicEventMatch[1]))
      .eq('hosts.status', 'active')
      .maybeSingle();

    if (event) {
      const url = request.nextUrl.clone();
      url.pathname = `/events/${event.slug}`;
      return NextResponse.rewrite(url);
    }
  }

  // Event creation requires a logged-in user
  if (
    pathname === '/events/new' &&
    !user
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // /admin routes require admin login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!user || !user.email) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }

    const { data: staff } = await supabase
      .from('staff_allowlist')
      .select('id')
      .ilike('email', user.email.trim())
      .single();

    const manageMatch = pathname.match(/^\/admin\/events\/([^/]+)\/manage(?:\/|$)/);
    let ownsManagedEvent = false;
    let checkInOnly = false;

    if (manageMatch) {
      const admin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
      );
      const { data: event } = await admin
        .from('events')
        .select('id, host_id, organizer_id')
        .eq('slug', decodeURIComponent(manageMatch[1]))
        .maybeSingle();
      if (event) {
        const [{ data: membership }, { data: collaborationByUser }, { data: collaborationByEmail }] = await Promise.all([
          admin.from('host_organizers').select('host_id').eq('host_id', event.host_id).eq('user_id', user.id).maybeSingle(),
          admin.from('event_collaborators').select('id, role').eq('event_id', event.id).eq('user_id', user.id).eq('status', 'active').maybeSingle(),
          admin.from('event_collaborators').select('id, role').eq('event_id', event.id).ilike('email', user.email).eq('status', 'active').maybeSingle(),
        ]);
        ownsManagedEvent = Boolean(membership || collaborationByUser || collaborationByEmail || event.organizer_id === user.id);
        const collaborationRole = collaborationByUser?.role || collaborationByEmail?.role;
        checkInOnly = !membership && event.organizer_id !== user.id && collaborationRole === 'check_in';
      }
    }

    if (!staff && !user.user_metadata?.is_admin && !ownsManagedEvent) {
      const url = request.nextUrl.clone();
      url.pathname = '/'; // redirect to home if not staff
      return NextResponse.redirect(url);
    }

    const checkInStaffPath = pathname.endsWith('/manage/checkin') || pathname.endsWith('/manage/guests');
    if (checkInOnly && manageMatch && !checkInStaffPath) {
      const url = request.nextUrl.clone();
      url.pathname = `/admin/events/${manageMatch[1]}/manage/checkin`;
      return NextResponse.redirect(url);
    }
  }

  // If logged in and visiting /admin/login, redirect to dashboard
  if (pathname === '/admin/login' && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  return response;
}
