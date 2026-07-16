"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
    ArrowLeft,
    Loader2,
    Upload,
    ImageIcon,
    MapPin,
    Clock,
    CalendarDays,
    Pencil,
    Globe,
    Check,
    Palette,
    Save,
    Copy,
    Share2,
} from "lucide-react";

import { toast } from "sonner";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

/* ───── Theme Options ───── */
const THEME_COLORS = [
    { id: "slate", hex: "#64748b" },
    { id: "rose", hex: "#f43f5e" },
    { id: "orange", hex: "#f97316" },
    { id: "amber", hex: "#f59e0b" },
    { id: "emerald", hex: "#10b981" },
    { id: "sky", hex: "#0ea5e9" },
    { id: "indigo", hex: "#6366f1" },
    { id: "violet", hex: "#8b5cf6" },
    { id: "red", hex: "#dc2626" },
    { id: "cyan", hex: "#0891b2" },
    { id: "teal", hex: "#0f766e" },
    { id: "lime", hex: "#65a30d" },
    { id: "yellow", hex: "#eab308" },
    { id: "fuchsia", hex: "#c026d3" },
    { id: "burgundy", hex: "#881337" },
    { id: "navy", hex: "#1e3a8a" },
    { id: "brown", hex: "#92400e" },
    { id: "pink", hex: "#ec4899" },
    { id: "zinc", hex: "#18181b" },
];

const THEME_STYLES = [
    { id: "minimal", label: "Minimal", preview: "bg-zinc-100" },
    { id: "quantum", label: "Quantum", preview: "bg-gradient-to-r from-indigo-200 to-purple-200" },
    { id: "warp", label: "Warp", preview: "bg-gradient-to-r from-zinc-800 to-zinc-600" },
    { id: "confetti", label: "Confetti", preview: "bg-gradient-to-r from-pink-200 to-purple-200" },
    { id: "pattern", label: "Pattern", preview: "bg-gradient-to-r from-emerald-200 to-teal-200" },
    { id: "seasonal", label: "Seasonal", preview: "bg-gradient-to-r from-rose-200 to-orange-200" },
];

const THEME_FONTS = [
    { id: "standard", label: "Sans" },
    { id: "classic", label: "Serif" },
    { id: "technical", label: "Mono" },
    { id: "display", label: "Display" },
];

const THEME_MODES = [
    { id: "light", label: "Light", icon: "☀️" },
    { id: "dark", label: "Dark", icon: "🌙" },
    { id: "auto", label: "Auto", icon: "🔄" },
];

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [eventType, setEventType] = useState("Event");
    const [date, setDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [location, setLocation] = useState("");
    const [isVirtual, setIsVirtual] = useState(false);
    const [virtualLink, setVirtualLink] = useState("");
    const [maxAttendees, setMaxAttendees] = useState<number | null>(null);
    const [status, setStatus] = useState("published");
    const [requireApproval, setRequireApproval] = useState(false);
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [editingCapacity, setEditingCapacity] = useState(false);

    // Theme state
    const [themeStyle, setThemeStyle] = useState("minimal");
    const [themeColor, setThemeColor] = useState("slate");
    const [themeFont, setThemeFont] = useState("standard");
    const [themeMode, setThemeMode] = useState("light");
    const [showTheme, setShowTheme] = useState(false);

    useEffect(() => {
        async function load() {
            const res = await fetch(`/api/events/${slug}`);
            if (!res.ok) {
                toast.error("Event not found");
                router.push("/admin/events");
                return;
            }
            const { event } = await res.json();
            setTitle(event.title || "");
            setDescription(event.description || "");
            setEventType(event.event_type || "Event");
            setDate(event.date ? new Date(event.date) : undefined);
            setEndDate(event.end_date ? new Date(event.end_date) : undefined);
            setLocation(event.location || "");
            setIsVirtual(event.is_virtual || false);
            setVirtualLink(event.virtual_link || "");
            setMaxAttendees(event.max_attendees);
            setStatus(event.status || "published");
            setRequireApproval(event.require_approval || false);
            setCoverImage(event.image_url);
            setThemeStyle(event.theme_style || "minimal");
            setThemeColor(event.theme_color || "slate");
            setThemeFont(event.theme_font || "standard");
            setThemeMode(event.theme_mode || "light");
            setLoading(false);
        }
        load();
    }, [slug, router]);

    const handleSave = async () => {
        setSaving(true);

        const payload = {
            title,
            description: description || null,
            event_type: eventType,
            date: date?.toISOString(),
            end_date: endDate?.toISOString() || null,
            location: location || null,
            is_virtual: isVirtual,
            virtual_link: virtualLink || null,
            max_attendees: maxAttendees,
            status,
            require_approval: requireApproval,
            theme_style: themeStyle,
            theme_color: themeColor,
            theme_font: themeFont,
            theme_mode: themeMode,
        };

        const res = await fetch(`/api/events/${slug}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        setSaving(false);

        if (!res.ok) {
            const err = await res.json();
            toast.error(`Failed to save: ${err.error}`);
            return;
        }

        toast.success("Event updated!");
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const copyEventLink = async () => {
        const url = `${window.location.origin}/events/${slug}`;
        await navigator.clipboard.writeText(url);
        toast.success("Event link copied!");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#faf9f7]">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#faf9f7]">
            {/* Header */}
            <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="mx-auto max-w-4xl flex items-center justify-between px-4 sm:px-6 py-3">
                    <button
                        onClick={() => router.push("/admin/events")}
                        className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Events
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={copyEventLink}
                            className="flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
                        >
                            <Copy className="h-3.5 w-3.5" />
                            Copy Link
                        </button>
                        <a
                            href={`/events/${slug}`}
                            target="_blank"
                            className="flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
                        >
                            <Share2 className="h-3.5 w-3.5" />
                            View
                        </a>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 text-xs px-4 py-2 h-auto font-semibold"
                        >
                            {saving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : saved ? (
                                <Check className="h-3.5 w-3.5 mr-1.5" />
                            ) : (
                                <Save className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {saved ? "Saved!" : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 pb-32">
                {/* ═══ Two-column layout ═══ */}
                <div className="grid gap-10 lg:grid-cols-[340px_1fr]">
                    {/* ──── LEFT: Cover + Theme ──── */}
                    <div className="space-y-5">
                        {/* Cover */}
                        <div className={cn("relative overflow-hidden rounded-2xl border border-black/5 shadow-sm bg-white transition-all", !coverImage && "bg-zinc-50")}>
                            {coverImage ? (
                                <div className="group relative aspect-[4/5]">
                                    <Image src={coverImage} alt="Event cover" fill className="object-cover" unoptimized />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                                        <div className="flex w-full gap-2 p-4">
                                            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 rounded-xl bg-white/20 backdrop-blur-md text-white text-sm font-medium py-2.5 px-4 hover:bg-white/30 transition-colors flex items-center justify-center gap-2">
                                                <Upload className="h-3.5 w-3.5" /> Change
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 text-zinc-300 hover:text-zinc-500 transition-colors">
                                    <div className="h-14 w-14 rounded-2xl border-2 border-dashed border-current flex items-center justify-center">
                                        <ImageIcon className="h-6 w-6" />
                                    </div>
                                    <p className="text-sm font-semibold">Upload Cover</p>
                                </button>
                            )}
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={() => toast.info("Image upload for edit coming soon")} />

                        {/* Theme Strip */}
                        <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
                            <button type="button" onClick={() => setShowTheme(!showTheme)} className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
                                <div className="flex items-center gap-2.5">
                                    <Palette className="h-4 w-4 text-zinc-400" />
                                    <span>Theme</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-400 capitalize">{themeStyle}</span>
                                    <div className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: THEME_COLORS.find(c => c.id === themeColor)?.hex || '#64748b' }} />
                                </div>
                            </button>
                            {showTheme && (
                                <div className="border-t border-black/5 p-4 space-y-4">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Style</p>
                                        <div className="flex gap-2 overflow-x-auto pb-1">
                                            {THEME_STYLES.map(s => (
                                                <button key={s.id} type="button" onClick={() => setThemeStyle(s.id)} className={cn("flex flex-col items-center gap-1.5 flex-shrink-0", themeStyle === s.id ? "opacity-100" : "opacity-50 hover:opacity-80")}>
                                                    <div className={cn("h-12 w-16 rounded-lg border-2 transition-all", s.preview, themeStyle === s.id ? "border-zinc-900 scale-105" : "border-transparent")} />
                                                    <span className="text-[9px] font-bold uppercase tracking-wider">{s.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Color</p>
                                            <span className="text-[10px] font-semibold capitalize text-zinc-500">{themeColor}</span>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {THEME_COLORS.map(c => (
                                                <button key={c.id} type="button" onClick={() => setThemeColor(c.id)} className={cn("h-6 w-6 rounded-full border-2 transition-all", themeColor === c.id ? "border-zinc-900 scale-110" : "border-transparent hover:scale-105")} style={{ backgroundColor: c.hex }} title={c.id} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-1 space-y-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Font</p>
                                            <div className="flex gap-1.5">
                                                {THEME_FONTS.map(f => (
                                                    <button key={f.id} type="button" onClick={() => setThemeFont(f.id)} className={cn("px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all", themeFont === f.id ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200")}>{f.label}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Display</p>
                                            <div className="flex gap-1.5">
                                                {THEME_MODES.map(m => (
                                                    <button key={m.id} type="button" onClick={() => setThemeMode(m.id)} className={cn("px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all", themeMode === m.id ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200")}>{m.icon}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status */}
                        <div className="rounded-2xl border border-black/5 bg-white shadow-sm px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Status</p>
                            <div className="flex gap-2">
                                {["published", "draft", "cancelled"].map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setStatus(s)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                                            status === s
                                                ? s === "published" ? "bg-emerald-100 text-emerald-700" : s === "cancelled" ? "bg-red-100 text-red-600" : "bg-zinc-200 text-zinc-700"
                                                : "bg-zinc-50 text-zinc-400 hover:bg-zinc-100"
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ──── RIGHT: Event Details ──── */}
                    <div className="space-y-6">
                        {/* Title */}
                        <div>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border-none bg-transparent text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 placeholder:text-zinc-200 outline-none" style={{ lineHeight: 1.2 }} />
                        </div>

                        {/* Event Type */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-zinc-400">#</span>
                            <input type="text" value={eventType} onChange={(e) => setEventType(e.target.value)} className="border-none bg-transparent text-sm font-medium text-zinc-600 outline-none" placeholder="Event type" />
                        </div>

                        {/* Date & Time */}
                        <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
                            <div className="flex items-center gap-4 px-5 py-4 border-b border-zinc-50">
                                <div className="flex items-center gap-2.5 w-20">
                                    <CalendarDays className="h-4 w-4 text-zinc-300" />
                                    <span className="text-sm text-zinc-400">Start</span>
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button type="button" className="text-sm font-medium text-zinc-900 hover:text-zinc-600 transition-colors">
                                            {date ? format(date, "EEE, MMM d, yyyy") : "Pick a date"}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <div className="ml-auto flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-zinc-300" />
                                    <Input type="time" className="h-auto w-20 border-none bg-transparent px-0 text-sm font-medium focus-visible:ring-0 text-right" defaultValue={date ? format(date, "HH:mm") : "16:00"} />
                                </div>
                            </div>
                            <div className="flex items-center gap-4 px-5 py-4">
                                <div className="flex items-center gap-2.5 w-20">
                                    <div className="h-4 w-4 flex items-center justify-center">
                                        <div className="h-2 w-2 rounded-full border-2 border-dashed border-zinc-200" />
                                    </div>
                                    <span className="text-sm text-zinc-400">End</span>
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button type="button" className="text-sm font-medium text-zinc-400 hover:text-zinc-600 transition-colors">
                                            {endDate ? format(endDate, "EEE, MMM d, yyyy") : "Pick end date"}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="rounded-2xl border border-black/5 bg-white shadow-sm">
                            <div className="flex items-center gap-4 px-5 py-4">
                                <MapPin className="h-4 w-4 text-zinc-300 flex-shrink-0" />
                                <Input placeholder="Add event location" value={location} onChange={(e) => setLocation(e.target.value)} className="border-none bg-transparent px-0 text-sm font-medium focus-visible:ring-0 h-auto py-0 placeholder:text-zinc-300" />
                            </div>
                            <div className="flex items-center gap-4 px-5 py-3 border-t border-zinc-50">
                                <Globe className="h-4 w-4 text-zinc-300 flex-shrink-0" />
                                <button type="button" onClick={() => setIsVirtual(!isVirtual)} className="flex items-center gap-2 text-sm">
                                    <div className={cn("h-4 w-4 rounded border flex items-center justify-center transition-colors", isVirtual ? "bg-zinc-900 border-zinc-900" : "border-zinc-200")}>
                                        {isVirtual && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <span className="text-zinc-500">Virtual event</span>
                                </button>
                            </div>
                            {isVirtual && (
                                <div className="flex items-center gap-4 px-5 py-3 border-t border-zinc-50">
                                    <div className="w-4" />
                                    <Input placeholder="Meeting link" value={virtualLink} onChange={(e) => setVirtualLink(e.target.value)} className="border-none bg-transparent px-0 text-sm font-medium focus-visible:ring-0 h-auto py-0 placeholder:text-zinc-300" />
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className="rounded-2xl border border-black/5 bg-white shadow-sm px-5 py-4">
                            <Textarea placeholder="Add a description..." rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="border-none bg-transparent px-0 text-sm font-normal resize-none focus-visible:ring-0 placeholder:text-zinc-300 min-h-0 py-0 leading-relaxed" />
                        </div>

                        {/* Options */}
                        <div className="space-y-2.5">
                            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest px-1">Event Options</p>
                            <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
                                    <span className="text-sm text-zinc-500">Require Approval</span>
                                    <button type="button" onClick={() => setRequireApproval(!requireApproval)} className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors", requireApproval ? "bg-zinc-900" : "bg-zinc-200")}>
                                        <span className={cn("pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform", requireApproval ? "translate-x-[18px]" : "translate-x-[3px]")} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between px-5 py-4">
                                    <span className="text-sm text-zinc-500">Capacity</span>
                                    {editingCapacity ? (
                                        <input type="number" autoFocus placeholder="e.g. 100" value={maxAttendees ?? ""} onChange={(e) => setMaxAttendees(e.target.value === "" ? null : parseInt(e.target.value))} onBlur={() => setEditingCapacity(false)} onKeyDown={(e) => e.key === "Enter" && setEditingCapacity(false)} className="w-20 border-none bg-transparent p-0 text-right text-sm font-medium focus:outline-none placeholder:text-zinc-300" />
                                    ) : (
                                        <button type="button" onClick={() => setEditingCapacity(true)} className="flex items-center gap-1 text-sm font-medium text-zinc-900 hover:text-zinc-600 transition-colors">
                                            <span>{maxAttendees ? maxAttendees.toLocaleString() : "Unlimited"}</span>
                                            <Pencil className="h-3 w-3 text-zinc-300" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Save */}
                        <div className="pt-4">
                            <Button onClick={handleSave} disabled={saving} className="w-full rounded-2xl py-7 text-base font-semibold shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] bg-zinc-900 text-white hover:bg-zinc-800">
                                {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : saved ? <span className="flex items-center gap-2"><Check className="h-5 w-5" /> Saved!</span> : <span className="flex items-center gap-2"><Save className="h-5 w-5" /> Save Changes</span>}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
