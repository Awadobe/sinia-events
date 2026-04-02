"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Camera,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    ScanLine,
    Users,
    RefreshCw,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

/* ─────────────── types ─────────────── */
interface ScanResult {
    type: "success" | "error" | "already" | "not_found";
    name?: string;
    message: string;
}

export default function CheckInScannerPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [scanning, setScanning] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [processing, setProcessing] = useState(false);
    const [totalCheckedIn, setTotalCheckedIn] = useState(0);
    const [totalGuests, setTotalGuests] = useState(0);
    const [scanCount, setScanCount] = useState(0);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const lastScannedRef = useRef<string>("");

    // Load stats
    useEffect(() => {
        fetch(`/api/events/${slug}/registrations?t=${Date.now()}`)
            .then(r => r.json())
            .then(data => {
                setTotalGuests(data.stats?.confirmed || 0);
                setTotalCheckedIn(data.stats?.checkedIn || 0);
            })
            .catch(() => {});
    }, [slug, scanCount]);

    // Process scanned QR data
    const handleScan = useCallback(async (qrData: string) => {
        // Prevent double-scanning same code
        if (qrData === lastScannedRef.current || processing) return;
        lastScannedRef.current = qrData;
        setProcessing(true);
        setScanResult(null);

        try {
            // Parse QR payload
            let parsed: { type?: string; registrationId?: string; eventSlug?: string };
            try {
                parsed = JSON.parse(qrData);
            } catch {
                setScanResult({ type: "error", message: "Invalid QR code format." });
                setProcessing(false);
                setTimeout(() => { lastScannedRef.current = ""; }, 3000);
                return;
            }

            if (parsed.type !== "checkin" || !parsed.registrationId) {
                setScanResult({ type: "error", message: "This QR code is not a valid ticket." });
                setProcessing(false);
                setTimeout(() => { lastScannedRef.current = ""; }, 3000);
                return;
            }

            // Check if this registration belongs to this event by fetching all registrations
            const regRes = await fetch(`/api/events/${slug}/registrations?t=${Date.now()}`);
            const regData = await regRes.json();
            const registration = regData.registrations?.find(
                (r: { id: string }) => r.id === parsed.registrationId
            );

            if (!registration) {
                setScanResult({ type: "not_found", message: "Ticket not found for this event." });
                setProcessing(false);
                setTimeout(() => { lastScannedRef.current = ""; }, 3000);
                return;
            }

            if (registration.checked_in) {
                setScanResult({
                    type: "already",
                    name: registration.name,
                    message: `${registration.name} is already checked in.`,
                });
                setProcessing(false);
                setTimeout(() => { lastScannedRef.current = ""; }, 3000);
                return;
            }

            // Check them in!
            const patchRes = await fetch(`/api/events/${slug}/registrations`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    registrationId: parsed.registrationId,
                    checked_in: true,
                }),
            });

            if (!patchRes.ok) {
                setScanResult({ type: "error", message: "Failed to check in. Please try again." });
                setProcessing(false);
                setTimeout(() => { lastScannedRef.current = ""; }, 3000);
                return;
            }

            setScanResult({
                type: "success",
                name: registration.name,
                message: `${registration.name} checked in successfully!`,
            });
            setScanCount(c => c + 1);
            setTotalCheckedIn(c => c + 1);

            // Allow re-scanning after 3 seconds
            setTimeout(() => {
                lastScannedRef.current = "";
                setScanResult(null);
            }, 3000);
        } catch {
            setScanResult({ type: "error", message: "Connection error. Please try again." });
            setTimeout(() => { lastScannedRef.current = ""; }, 3000);
        } finally {
            setProcessing(false);
        }
    }, [slug, processing]);

    // Start camera
    const startScanner = useCallback(async () => {
        try {
            const scanner = new Html5Qrcode("qr-reader");
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1,
                },
                (decodedText) => {
                    handleScan(decodedText);
                },
                () => {} // ignore errors during scanning
            );

            setScanning(true);
            setCameraReady(true);
        } catch (err) {
            console.error("Camera error:", err);
            setScanResult({
                type: "error",
                message: "Could not access camera. Please allow camera permissions.",
            });
        }
    }, [handleScan]);

    // Stop camera
    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch {}
            scannerRef.current = null;
        }
        setScanning(false);
        setCameraReady(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-zinc-950 text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* ─── Header ─── */}
            <header className="border-b border-white/5 backdrop-blur-xl sticky top-0 z-50 bg-zinc-950/90">
                <div className="max-w-lg mx-auto flex items-center justify-between px-5 py-3">
                    <Link
                        href={`/events/${slug}/manage`}
                        className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Link>
                    <div className="flex items-center gap-2">
                        <ScanLine className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-bold text-white">Check-In Scanner</span>
                    </div>
                    <div className="w-16" /> {/* Spacer */}
                </div>
            </header>

            <div className="max-w-lg mx-auto px-5 py-6 space-y-5">
                {/* ─── Stats bar ─── */}
                <div className="flex gap-3">
                    <div className="flex-1 rounded-2xl bg-white/5 border border-white/5 px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-white">{totalCheckedIn}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">Checked In</p>
                    </div>
                    <div className="flex-1 rounded-2xl bg-white/5 border border-white/5 px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-white">{totalGuests}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">Expected</p>
                    </div>
                    <div className="flex-1 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-emerald-400">{scanCount}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/60 mt-0.5">This Session</p>
                    </div>
                </div>

                {/* ─── Scanner Area ─── */}
                <div className="rounded-3xl bg-white/5 border border-white/5 overflow-hidden">
                    {!scanning ? (
                        /* Start scanning button */
                        <div className="flex flex-col items-center justify-center py-16 px-6 space-y-4">
                            <div className="h-20 w-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center">
                                <Camera className="h-10 w-10 text-emerald-400" />
                            </div>
                            <div className="text-center space-y-1">
                                <h2 className="text-lg font-bold text-white">Ready to Scan</h2>
                                <p className="text-sm text-zinc-400">Point the camera at the attendee&apos;s QR code</p>
                            </div>
                            <button
                                onClick={startScanner}
                                className="rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3.5 text-sm font-bold transition-colors"
                            >
                                Start Camera
                            </button>
                        </div>
                    ) : (
                        /* Camera view */
                        <div className="relative">
                            <div id="qr-reader" className="w-full" />
                            <button
                                onClick={stopScanner}
                                className="absolute top-3 right-3 rounded-xl bg-black/50 backdrop-blur-md text-white px-3 py-1.5 text-xs font-bold hover:bg-black/70 transition-colors z-10"
                            >
                                Stop Camera
                            </button>
                        </div>
                    )}
                </div>

                {/* ─── Scan Result Feedback ─── */}
                {processing && (
                    <div className="rounded-2xl bg-white/5 border border-white/10 px-5 py-4 flex items-center gap-3 animate-pulse">
                        <Loader2 className="h-5 w-5 text-zinc-400 animate-spin flex-shrink-0" />
                        <p className="text-sm font-medium text-zinc-300">Processing...</p>
                    </div>
                )}

                {scanResult && !processing && (
                    <div className={`rounded-2xl border px-5 py-4 flex items-center gap-3 transition-all ${
                        scanResult.type === "success"
                            ? "bg-emerald-500/10 border-emerald-500/20"
                            : scanResult.type === "already"
                            ? "bg-amber-500/10 border-amber-500/20"
                            : scanResult.type === "not_found"
                            ? "bg-red-500/10 border-red-500/20"
                            : "bg-red-500/10 border-red-500/20"
                    }`}>
                        {scanResult.type === "success" ? (
                            <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0" />
                        ) : scanResult.type === "already" ? (
                            <AlertTriangle className="h-6 w-6 text-amber-400 flex-shrink-0" />
                        ) : (
                            <XCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
                        )}
                        <div>
                            {scanResult.name && (
                                <p className={`text-sm font-bold ${
                                    scanResult.type === "success" ? "text-emerald-300" :
                                    scanResult.type === "already" ? "text-amber-300" : "text-red-300"
                                }`}>{scanResult.name}</p>
                            )}
                            <p className={`text-sm ${
                                scanResult.type === "success" ? "text-emerald-400/80" :
                                scanResult.type === "already" ? "text-amber-400/80" : "text-red-400/80"
                            }`}>{scanResult.message}</p>
                        </div>
                    </div>
                )}

                {/* ─── Quick links ─── */}
                <div className="flex gap-3">
                    <Link
                        href={`/events/${slug}/manage/guests`}
                        className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/5 py-3.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <Users className="h-4 w-4" />
                        Guest List
                    </Link>
                    <button
                        onClick={() => { setScanCount(0); setScanResult(null); lastScannedRef.current = ""; }}
                        className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/5 py-3.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Reset Count
                    </button>
                </div>
            </div>
        </div>
    );
}
