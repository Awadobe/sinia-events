"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthConfirmPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const requestedNext = new URLSearchParams(window.location.search).get("next");
        const nextPath = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
            ? requestedNext
            : "/profile";
        // The Supabase client library automatically detects the token in the URL hash
        // and exchanges it for a session via onAuthStateChange
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === "SIGNED_IN" && session) {
                    router.replace(nextPath);
                } else if (event === "TOKEN_REFRESHED") {
                    router.replace(nextPath);
                }
            }
        );

        // Also check if user is already signed in (in case the event fired before we subscribed)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                router.replace(nextPath);
            }
        });

        // If nothing happens after 5 seconds, show error
        const timeout = setTimeout(() => {
            setError("Authentication timed out. The magic link may have expired.");
        }, 5000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, [supabase, router]);

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9f7] gap-4">
                <div className="text-5xl">⚠️</div>
                <h1 className="text-xl font-semibold text-zinc-700">{error}</h1>
                <a
                    href="/login"
                    className="text-sm font-medium text-emerald-600 hover:underline"
                >
                    Try signing in again
                </a>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9f7] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            <p className="text-sm text-zinc-500">Signing you in...</p>
        </div>
    );
}
