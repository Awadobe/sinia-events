"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowRight, Mail, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function UserLoginPage() {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const supabase = createClient();
    const router = useRouter();
    const getNextPath = () => {
        const requestedNext = new URLSearchParams(window.location.search).get("next");
        return requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/organizer";
    };

    // Check if user is already signed in (e.g. redirected here after magic link)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === "SIGNED_IN" && session) {
                    router.replace(getNextPath());
                }
            }
        );

        // Also check existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                router.replace(getNextPath());
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase, router]);


    const handleSendMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: true,
                    emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(getNextPath())}`,
                },
            });

            if (error) {
                toast.error(error.message);
            } else {
                toast.success("Magic link sent! Check your inbox.");
                setSent(true);
            }
        } catch {
            toast.error("Failed to send magic link. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(getNextPath())}`,
                queryParams: {
                    access_type: "offline",
                    prompt: "select_account",
                },
            },
        });
        if (error) {
            toast.error(error.message || "Google sign-in is not available yet.");
            setGoogleLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#faf9f7]">
            {/* Left Side - Brand Display (Hidden on mobile) */}
            <div className="hidden lg:flex w-1/2 bg-zinc-900 border-r border-black/5 flex-col justify-between p-12 relative overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 p-32 opacity-5 pointer-events-none">
                    <Sparkles className="w-96 h-96 text-white transform rotate-12" />
                </div>
                
                <div className="relative z-10">
                    <Link href="/" className="flex items-center gap-3 text-lg font-semibold text-white">
                        <div className="h-10 w-10 text-xl rounded-xl bg-white text-zinc-900 flex items-center justify-center font-bold shadow-sm">
                            R
                        </div>
                        Radius
                    </Link>
                </div>
                
                <div className="relative z-10 max-w-sm">
                    <h2 className="text-4xl font-semibold text-white leading-tight mb-4">
                        Create & Share Events.
                    </h2>
                    <p className="text-lg text-zinc-400">
                        Sign in to create events, share them with your audience, and build your community on Radius.
                    </p>
                </div>
                
                <div className="relative z-10">
                    <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                        Powered by Christex Foundation
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form area */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
                {/* Mobile Logo (Visible only on small screens) */}
                <Link href="/" className="lg:hidden flex items-center gap-2 text-lg font-semibold text-zinc-900 mb-12">
                    <div className="h-8 w-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold shadow-sm">
                        R
                    </div>
                    Radius
                </Link>

                <div className="w-full max-w-[360px] space-y-8">
                    {!sent ? (
                        <>
                            <div className="space-y-2 text-center lg:text-left">
                                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                                    Sign in to Radius
                                </h1>
                                <p className="text-sm text-zinc-500 pb-2">
                                    Use Google for the quickest sign-in, or receive a secure link by email.
                                </p>
                            </div>

                            <Button type="button" variant="outline" onClick={handleGoogleSignIn} disabled={googleLoading || loading} className="h-12 w-full border-zinc-200 bg-white text-base font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50">
                                {googleLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-800" /> : (
                                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                                        <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
                                        <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.37l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
                                        <path fill="#FBBC05" d="M6.39 13.92A6.02 6.02 0 0 1 6.07 12c0-.67.11-1.32.32-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.63.39 3.17 1.04 4.54l3.35-2.62Z" />
                                        <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.82 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.71 9.39 5.95 12 5.95Z" />
                                    </svg>
                                )}
                                {googleLoading ? "Connecting to Google..." : "Continue with Google"}
                            </Button>

                            <div className="flex items-center gap-3"><div className="h-px flex-1 bg-zinc-200" /><span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">or use email</span><div className="h-px flex-1 bg-zinc-200" /></div>

                            <form onSubmit={handleSendMagicLink} className="space-y-5">
                                <div className="space-y-2.5">
                                    <label htmlFor="email" className="text-sm font-medium leading-none text-zinc-700">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            className="pl-10 h-11 bg-white border-zinc-200"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <Button type="submit" className="w-full h-11 text-base bg-zinc-900 hover:bg-zinc-800 transition-colors" disabled={loading}>
                                    {loading ? (
                                        "Sending..."
                                    ) : (
                                        <>
                                            Email me a sign-in link <ArrowRight className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center lg:text-left space-y-5">
                            <div className="flex justify-center lg:justify-start">
                                <div className="h-16 w-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                </div>
                            </div>
                            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                                Check your email
                            </h1>
                            <p className="text-sm text-zinc-500 leading-relaxed">
                                We sent a magic link to <span className="font-medium text-zinc-700">{email}</span>. 
                                Click the link in the email to sign in — no password needed.
                            </p>
                            <button
                                type="button"
                                onClick={() => setSent(false)}
                                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                            >
                                Use a different email
                            </button>
                        </div>
                    )}
                    
                    <div className="mt-8 border-t border-black/5 pt-8 text-center lg:text-left text-sm text-zinc-400">
                        By signing in, you can create events, manage your calendar, and build your community.
                    </div>
                </div>
            </div>
        </div>
    );
}
