"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Send, Loader2, Mail, Users, Clock, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Blast = {
    id: string;
    subject: string;
    body: string;
    recipient_count: number;
    sent_at: string;
};

export default function BlastPage() {
    const params = useParams();
    const slug = params.slug as string;

    // Compose
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [recipients, setRecipients] = useState<"confirmed" | "all">("confirmed");
    const [sending, setSending] = useState(false);
    const [showRecipients, setShowRecipients] = useState(false);

    // History
    const [blasts, setBlasts] = useState<Blast[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        const res = await fetch(`/api/events/${slug}/blast`);
        if (res.ok) {
            const data = await res.json();
            setBlasts(data.blasts);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    const handleSend = async () => {
        if (!subject.trim() || !body.trim()) {
            toast.error("Subject and message are required");
            return;
        }

        setSending(true);

        const res = await fetch(`/api/events/${slug}/blast`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subject,
                body,
                includeStatus: recipients,
            }),
        });

        const result = await res.json();
        setSending(false);

        if (!res.ok) {
            toast.error(result.error || "Failed to send blast");
            return;
        }

        toast.success(`Blast sent to ${result.recipientCount} recipient(s)!`);
        setSubject("");
        setBody("");
        fetchHistory();
    };

    return (
        <div className="space-y-8">
            {/* Compose Section */}
            <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-50 flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-zinc-400" />
                    <h3 className="text-sm font-semibold text-zinc-900">Compose Blast</h3>
                </div>

                <div className="p-5 space-y-4">
                    {/* Recipients Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowRecipients(!showRecipients)}
                            className="flex items-center gap-2 text-sm text-zinc-600 bg-zinc-50 rounded-xl px-3.5 py-2 hover:bg-zinc-100 transition-colors"
                        >
                            <Users className="h-3.5 w-3.5 text-zinc-400" />
                            <span className="font-medium">
                                {recipients === "confirmed" ? "Confirmed guests only" : "All guests (confirmed + pending)"}
                            </span>
                            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                        </button>
                        {showRecipients && (
                            <div className="absolute top-full left-0 mt-1 w-64 rounded-xl bg-white border border-black/5 shadow-xl p-1.5 z-20">
                                <button
                                    onClick={() => { setRecipients("confirmed"); setShowRecipients(false); }}
                                    className={cn(
                                        "w-full text-left rounded-lg px-3 py-2 text-sm transition-colors",
                                        recipients === "confirmed" ? "bg-zinc-100 text-zinc-900 font-medium" : "text-zinc-600 hover:bg-zinc-50"
                                    )}
                                >
                                    Confirmed guests only
                                </button>
                                <button
                                    onClick={() => { setRecipients("all"); setShowRecipients(false); }}
                                    className={cn(
                                        "w-full text-left rounded-lg px-3 py-2 text-sm transition-colors",
                                        recipients === "all" ? "bg-zinc-100 text-zinc-900 font-medium" : "text-zinc-600 hover:bg-zinc-50"
                                    )}
                                >
                                    All guests (confirmed + pending)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Subject */}
                    <input
                        type="text"
                        placeholder="Subject line..."
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full border border-black/5 rounded-xl px-4 py-3 text-sm font-medium placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                    />

                    {/* Body */}
                    <textarea
                        placeholder="Write your message to attendees..."
                        rows={8}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        className="w-full border border-black/5 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200 resize-none leading-relaxed"
                    />

                    {/* Preview & Send */}
                    <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-zinc-400">
                            Emails will be sent via Resend
                        </p>
                        <button
                            onClick={handleSend}
                            disabled={sending || !subject.trim() || !body.trim()}
                            className={cn(
                                "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all",
                                sending || !subject.trim() || !body.trim()
                                    ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                                    : "bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm hover:shadow-md"
                            )}
                        >
                            {sending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Send Blast
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Blast History */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 px-1">Blast History</h3>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
                    </div>
                ) : blasts.length === 0 ? (
                    <div className="rounded-2xl border border-black/5 bg-white shadow-sm py-16 text-center">
                        <div className="text-4xl mb-3">📨</div>
                        <p className="text-sm text-zinc-400">No blasts sent yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {blasts.map((blast) => (
                            <div
                                key={blast.id}
                                className="rounded-2xl border border-black/5 bg-white shadow-sm p-5 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-semibold text-zinc-900 truncate">
                                            {blast.subject}
                                        </h4>
                                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                                            {blast.body}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                                            <Users className="h-3 w-3" />
                                            {blast.recipient_count}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs text-zinc-300">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(blast.sent_at), "MMM d, h:mm a")}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
