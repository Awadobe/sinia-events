import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/profile";
  const error_param = searchParams.get("error");

  // If Supabase sent an error (e.g. expired OTP), redirect to login
  if (error_param) {
    const errorDesc = searchParams.get("error_description") || "Authentication failed";
    console.error("❌ Auth error from Supabase:", errorDesc);
    return NextResponse.redirect(`${origin}/login`);
  }

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete(name);
        },
      },
    }
  );

  // Handle PKCE flow (code exchange)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("❌ Auth code exchange failed:", error.message);
  }

  // Handle implicit flow (token_hash verification)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'magiclink' | 'email',
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("❌ Auth token verification failed:", error.message);
  }

  // Fallback: redirect to login on error
  return NextResponse.redirect(`${origin}/login`);
}
