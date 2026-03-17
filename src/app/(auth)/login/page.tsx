"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowRight, Phone, Sparkles } from "lucide-react";
import Link from "next/link";

export default function UserLoginPage() {
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<"phone" | "otp">("phone");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const formatPhone = phone.startsWith("+") ? phone : `+232${phone.replace(/^0/, "")}`;

        try {
            const { error } = await supabase.auth.signInWithOtp({
                phone: formatPhone,
            });

            if (error) {
                toast.error(error.message);
            } else {
                toast.success("Verification code sent!");
                setStep("otp");
            }
        } catch (err) {
            toast.error("Failed to send code. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const formatPhone = phone.startsWith("+") ? phone : `+232${phone.replace(/^0/, "")}`;

        try {
            const { error } = await supabase.auth.verifyOtp({
                phone: formatPhone,
                token: otp,
                type: 'sms'
            });

            if (error) {
                toast.error("Invalid or expired code.");
            } else {
                toast.success("Successfully logged in!");
                router.push("/profile");
                router.refresh();
            }
        } catch (err) {
            toast.error("Verification failed.");
        } finally {
            setLoading(false);
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
                        Discover & Connect.
                    </h2>
                    <p className="text-lg text-zinc-400">
                        Join the Christex Foundation community to attend workshops, connect with talent, and level up your tech skills.
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
                    <div className="space-y-2 text-center lg:text-left">
                        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                            {step === "phone" ? "Welcome back" : "Verify your number"}
                        </h1>
                        <p className="text-sm text-zinc-500 pb-2">
                            {step === "phone"
                                ? "Enter your phone number to sign in or create an account securely."
                                : `We sent a 6-digit code to ${phone}.`}
                        </p>
                    </div>

                    <form onSubmit={step === "phone" ? handleSendOtp : handleVerifyOtp} className="space-y-5">
                        {step === "phone" ? (
                            <div className="space-y-2.5">
                                <label htmlFor="phone" className="text-sm font-medium leading-none text-zinc-700">
                                    Phone Number
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="+232 77 123 456"
                                        className="pl-10 h-11 bg-white border-zinc-200"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                <label htmlFor="otp" className="text-sm font-medium leading-none text-zinc-700">
                                    Verification Code
                                </label>
                                <Input
                                    id="otp"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    placeholder="000 000"
                                    className="h-12 text-center text-xl tracking-widest bg-white border-zinc-200"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <Button type="submit" className="w-full h-11 text-base bg-zinc-900 hover:bg-zinc-800 transition-colors" disabled={loading}>
                            {loading ? (
                                "Please wait..."
                            ) : step === "phone" ? (
                                <>
                                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            ) : (
                                "Verify & Log In"
                            )}
                        </Button>
                    </form>

                    {step === "otp" && (
                        <div className="text-center lg:text-left">
                            <button
                                type="button"
                                onClick={() => setStep("phone")}
                                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                            >
                                Change phone number
                            </button>
                        </div>
                    )}
                    
                    <div className="mt-8 border-t border-black/5 pt-8 text-center lg:text-left text-sm text-zinc-500">
                        Are you an admin? <Link href="/admin/login" className="font-medium text-zinc-900 hover:text-emerald-600 transition-colors">Log in here</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
