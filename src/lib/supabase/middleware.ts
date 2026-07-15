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
      .eq('email', user.email)
      .single();

    const manageMatch = pathname.match(/^\/admin\/events\/([^/]+)\/manage(?:\/|$)/);
    let ownsManagedEvent = false;

    if (manageMatch) {
      const admin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
      );
      const { data: event } = await admin
        .from('events')
        .select('organizer_id')
        .eq('slug', decodeURIComponent(manageMatch[1]))
        .maybeSingle();
      ownsManagedEvent = event?.organizer_id === user.id;
    }

    if (!staff && !user.user_metadata?.is_admin && !ownsManagedEvent) {
      const url = request.nextUrl.clone();
      url.pathname = '/'; // redirect to home if not staff
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
