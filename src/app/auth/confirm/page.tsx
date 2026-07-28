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
        let active = true;

        async function confirmSession() {
            const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
            const accessToken = hash.get("access_token");
            const refreshToken = hash.get("refresh_token");
            const authError = hash.get("error_description");

            if (authError) {
                if (active) setError(authError);
                return;
            }

            if (accessToken && refreshToken) {
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });
                if (sessionError) {
                    if (active) setError("This sign-in link is invalid or has expired. Please request a new invitation.");
                    return;
                }
                if (active) router.replace(nextPath);
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                if (active) router.replace(nextPath);
                return;
            }

            if (active) setError("This sign-in link is incomplete or has expired. Please request a new invitation.");
        }

        confirmSession();

        // If nothing happens after 5 seconds, show error
        const timeout = setTimeout(() => {
            if (active) setError("Authentication timed out. Please request a new invitation.");
        }, 5000);

        return () => {
            active = false;
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
