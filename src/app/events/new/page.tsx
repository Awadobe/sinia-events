"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowLeft,
    Loader2,
    Upload,
    ImageIcon,
    X,
    MapPin,
    Clock,
    CalendarDays,
    Pencil,
    Globe,
    Check,
    Palette,
} from "lucide-react";

import { toast } from "sonner";
import { format } from "date-fns";

import { cn } from "@/lib/utils";



import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RegistrationFieldBuilder } from "@/components/registration-field-builder";
import type { RegistrationField } from "@/lib/registration-fields";

/* ───── Event Categories with Default Covers ───── */
const EVENT_CATEGORIES = [
    { id: "Event", label: "Event", cover: null, emoji: "📅" },
    { id: "Bootcamp", label: "Bootcamp", cover: "/covers/bootcamp.png", emoji: "🚀" },
    { id: "Workshop", label: "Workshop", cover: "/covers/workshop.png", emoji: "🛠️" },
    { id: "Hackathon", label: "Hackathon", cover: "/covers/hackathon.png", emoji: "⚡" },
    { id: "Meetup", label: "Meetup", cover: "/covers/meetup.png", emoji: "🤝" },
    { id: "Conference", label: "Conference", cover: "/covers/conference.png", emoji: "🎤" },
    { id: "Webinar", label: "Webinar", cover: "/covers/webinar.png", emoji: "💻" },
];

/* ───── Theme Options ───── */
const THEME_STYLES = [
    { id: "minimal", label: "Minimal" },
    { id: "quantum", label: "Quantum" },
    { id: "warp", label: "Warp" },
    { id: "confetti", label: "Confetti" },
    { id: "pattern", label: "Pattern" },
    { id: "seasonal", label: "Seasonal" },
];

function buildThemeColor(id: string, hex: string) {
    return {
        id,
        hex,
        light: { bg: `${hex}12`, accent: hex, text: "#1c1917", muted: hex, card: "#ffffff", cardBorder: `${hex}40`, inputBg: `${hex}0a` },
        dark: { bg: "#0a0a0f", accent: hex, text: "#f4f4f5", muted: hex, card: "#18181f", cardBorder: `${hex}55`, inputBg: "#18181f" },
    };
}

const THEME_COLORS = [
    { id: "slate",   hex: "#64748b", light: { bg: "#f1f5f9", accent: "#475569", text: "#1e293b", muted: "#94a3b8", card: "#ffffff", cardBorder: "#e2e8f0", inputBg: "#f8fafc" }, dark: { bg: "#0f172a", accent: "#94a3b8", text: "#f1f5f9", muted: "#64748b", card: "#1e293b", cardBorder: "#334155", inputBg: "#1e293b" } },
    { id: "rose",    hex: "#f43f5e", light: { bg: "#fff1f2", accent: "#e11d48", text: "#1c1917", muted: "#fb7185", card: "#ffffff", cardBorder: "#fecdd3", inputBg: "#fff5f5" }, dark: { bg: "#1a0a0e", accent: "#fb7185", text: "#fef2f2", muted: "#f43f5e", card: "#2a1015", cardBorder: "#4c1d2a", inputBg: "#2a1015" } },
    { id: "orange",  hex: "#f97316", light: { bg: "#fff7ed", accent: "#ea580c", text: "#1c1917", muted: "#fb923c", card: "#ffffff", cardBorder: "#fed7aa", inputBg: "#fffbf5" }, dark: { bg: "#1a120a", accent: "#fb923c", text: "#fff7ed", muted: "#f97316", card: "#2a1a0e", cardBorder: "#4c2a12", inputBg: "#2a1a0e" } },
    { id: "amber",   hex: "#f59e0b", light: { bg: "#fffbeb", accent: "#d97706", text: "#1c1917", muted: "#fbbf24", card: "#ffffff", cardBorder: "#fde68a", inputBg: "#fffdf5" }, dark: { bg: "#1a150a", accent: "#fbbf24", text: "#fffbeb", muted: "#f59e0b", card: "#2a200e", cardBorder: "#4c3512", inputBg: "#2a200e" } },
    { id: "emerald", hex: "#10b981", light: { bg: "#ecfdf5", accent: "#059669", text: "#1c1917", muted: "#34d399", card: "#ffffff", cardBorder: "#a7f3d0", inputBg: "#f0fdf9" }, dark: { bg: "#0a1a14", accent: "#34d399", text: "#ecfdf5", muted: "#10b981", card: "#0e2a1e", cardBorder: "#124c32", inputBg: "#0e2a1e" } },
    { id: "sky",     hex: "#0ea5e9", light: { bg: "#f0f9ff", accent: "#0284c7", text: "#1c1917", muted: "#38bdf8", card: "#ffffff", cardBorder: "#bae6fd", inputBg: "#f5fbff" }, dark: { bg: "#0a1520", accent: "#38bdf8", text: "#f0f9ff", muted: "#0ea5e9", card: "#0e1f2e", cardBorder: "#12354c", inputBg: "#0e1f2e" } },
    { id: "indigo",  hex: "#6366f1", light: { bg: "#eef2ff", accent: "#4f46e5", text: "#1c1917", muted: "#818cf8", card: "#ffffff", cardBorder: "#c7d2fe", inputBg: "#f5f7ff" }, dark: { bg: "#0e0e2a", accent: "#818cf8", text: "#eef2ff", muted: "#6366f1", card: "#16163a", cardBorder: "#2e2e5c", inputBg: "#16163a" } },
    { id: "violet",  hex: "#8b5cf6", light: { bg: "#f5f3ff", accent: "#7c3aed", text: "#1c1917", muted: "#a78bfa", card: "#ffffff", cardBorder: "#ddd6fe", inputBg: "#faf8ff" }, dark: { bg: "#120e2a", accent: "#a78bfa", text: "#f5f3ff", muted: "#8b5cf6", card: "#1c163a", cardBorder: "#362e5c", inputBg: "#1c163a" } },
    { id: "pink",    hex: "#ec4899", light: { bg: "#fdf2f8", accent: "#db2777", text: "#1c1917", muted: "#f472b6", card: "#ffffff", cardBorder: "#fbcfe8", inputBg: "#fef5fa" }, dark: { bg: "#1a0a15", accent: "#f472b6", text: "#fdf2f8", muted: "#ec4899", card: "#2a1020", cardBorder: "#4c1d3a", inputBg: "#2a1020" } },
    buildThemeColor("red", "#dc2626"),
    buildThemeColor("cyan", "#0891b2"),
    buildThemeColor("teal", "#0f766e"),
    buildThemeColor("lime", "#65a30d"),
    buildThemeColor("yellow", "#eab308"),
    buildThemeColor("fuchsia", "#c026d3"),
    buildThemeColor("burgundy", "#881337"),
    buildThemeColor("navy", "#1e3a8a"),
    buildThemeColor("brown", "#92400e"),
    { id: "zinc",    hex: "#18181b", light: { bg: "#faf9f7", accent: "#18181b", text: "#18181b", muted: "#71717a", card: "#ffffff", cardBorder: "#e4e4e7", inputBg: "#fafafa" }, dark: { bg: "#09090b", accent: "#e4e4e7", text: "#fafafa", muted: "#a1a1aa", card: "#18181b", cardBorder: "#27272a", inputBg: "#18181b" } },
];

const THEME_FONTS = [
    { id: "standard", label: "Sans",    class: "font-sans" },
    { id: "classic",  label: "Serif",   class: "font-serif" },
    { id: "technical",label: "Mono",    class: "font-mono" },
    { id: "display",  label: "Display", class: "font-display" },
];

const THEME_MODES = [
    { id: "light", label: "Light", icon: "☀️" },
    { id: "dark",  label: "Dark",  icon: "🌙" },
    { id: "auto",  label: "Auto",  icon: "🔄" },
];

/* ───── Theme computation helper ───── */
function useTheme(colorId: string, modeId: string, styleId: string, fontId: string) {
    return useMemo(() => {
        const colorDef = THEME_COLORS.find(c => c.id === colorId) || THEME_COLORS[9];
        const isDark = modeId === "dark";
        const palette = isDark ? colorDef.dark : colorDef.light;
        const fontDef = THEME_FONTS.find(f => f.id === fontId) || THEME_FONTS[0];

        let bgPatternClass = "";
        let bgOverlayStyle: React.CSSProperties = {};
        switch (styleId) {
            case "quantum": bgPatternClass = "bg-pattern-quantum"; break;
            case "warp": bgPatternClass = "bg-pattern-warp"; break;
            case "confetti": bgPatternClass = "bg-pattern-confetti"; break;
            case "pattern": bgPatternClass = "bg-pattern-abstract"; break;
            case "seasonal": bgPatternClass = "bg-pattern-emoji"; break;
            default: break;
        }

        if (styleId !== "minimal" && !isDark) {
            bgOverlayStyle = {
                backgroundImage: `radial-gradient(ellipse at 20% 50%, ${colorDef.hex}12 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, ${colorDef.hex}10 0%, transparent 50%)`,
            };
        }

        return {
            isDark,
            palette,
            colorHex: colorDef.hex,
            fontClass: fontDef.class,
            bgPatternClass,
            bgOverlayStyle,
            pageBg: { backgroundColor: palette.bg },
            textPrimary: { color: palette.text },
            textMuted: { color: palette.muted },
            textAccent: { color: palette.accent },
            cardStyle: { backgroundColor: palette.card, borderColor: palette.cardBorder },
            inputStyle: { backgroundColor: palette.inputBg, borderColor: palette.cardBorder, color: palette.text },
            btnPrimary: { backgroundColor: palette.accent, color: isDark ? "#09090b" : "#ffffff" },
            btnSecondary: { backgroundColor: isDark ? palette.card : palette.inputBg, borderColor: palette.cardBorder, color: palette.text },
        };
    }, [colorId, modeId, styleId, fontId]);
}

/* ───── Form types ───── */
type EventFormData = {
    title: string;
    description: string;
    event_type: string;
    date: Date | undefined;
    end_date: Date | undefined;
    location: string;
    is_virtual: boolean;
    virtual_link: string;
    max_attendees: number | null;
    status: string;
    slug: string;
    require_approval: boolean;
    visibility: "public" | "unlisted" | "invite_only";
};

type HostOption = { id: string; type: "individual" | "organization"; name: string; slug: string };

const initialFormData: EventFormData = {
    title: "",
    description: "",
    event_type: "Event",
    date: undefined,
    end_date: undefined,
    location: "",
    is_virtual: false,
    virtual_link: "",
    max_attendees: null,
    status: "draft",
    slug: "",
    require_approval: false,
    visibility: "public",
};

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function applyTime(date: Date, time: string): Date {
    const next = new Date(date);
    const [hours, minutes] = time.split(":").map(Number);
    next.setHours(hours, minutes, 0, 0);
    return next;
}

export default function CreateEventPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState<EventFormData>(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverSource, setCoverSource] = useState<"category" | "upload" | null>(null);
    const [editingCapacity, setEditingCapacity] = useState(false);

    const [themeStyle, setThemeStyle] = useState("minimal");
    const [themeColor, setThemeColor] = useState("zinc");
    const [themeFont, setThemeFont] = useState("standard");
    const [themeMode, setThemeMode] = useState("light");
    const [showTheme, setShowTheme] = useState(false);
    const [hosts, setHosts] = useState<HostOption[]>([]);
    const [selectedHostId, setSelectedHostId] = useState("");
    const [startTime, setStartTime] = useState("16:00");
    const [endTime, setEndTime] = useState("17:00");
    const [registrationFields, setRegistrationFields] = useState<RegistrationField[]>([]);

    useEffect(() => {
        fetch("/api/hosts")
            .then((response) => response.ok ? response.json() : Promise.reject())
            .then((result) => {
                const availableHosts = (result.hosts || []) as HostOption[];
                setHosts(availableHosts);
                const personal = availableHosts.find((host) => host.type === "individual");
                setSelectedHostId(personal?.id || availableHosts[0]?.id || "");
            })
            .catch(() => toast.error("Could not load your organizer profiles."));
    }, []);

    const theme = useTheme(themeColor, themeMode, themeStyle, themeFont);

    const updateField = <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => {
        setFormData((prev) => {
            const updated = { ...prev, [field]: value };
            if (field === "title" && typeof value === "string") updated.slug = generateSlug(value);
            return updated;
        });
    };

    const handleCategorySelect = (category: (typeof EVENT_CATEGORIES)[number]) => {
        updateField("event_type", category.id);
        if (coverSource !== "upload" && category.cover) {
            setCoverImage(category.cover);
            setCoverSource("category");
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { setCoverFile(file); setCoverImage(URL.createObjectURL(file)); setCoverSource("upload"); }
    };

    const removeCover = () => { setCoverImage(null); setCoverFile(null); setCoverSource(null); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.date) { toast.error("Please pick a date for your event."); return; }
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const requestedStatus = submitter?.value === "published" ? "published" : "draft";
        setIsSubmitting(true);
        const payload = {
            title: formData.title, description: formData.description || null,
            event_type: formData.event_type.trim() || "Event", date: applyTime(formData.date, startTime).toISOString(),
            end_date: formData.end_date ? applyTime(formData.end_date, endTime).toISOString() : null, location: formData.location || null,
            is_virtual: formData.is_virtual, virtual_link: formData.virtual_link || null,
            image_url: coverSource === "category" ? coverImage : null,
            max_attendees: formData.max_attendees ? parseInt(formData.max_attendees.toString()) : null,
            status: requestedStatus, slug: formData.slug,
            theme_style: themeStyle, theme_color: themeColor, theme_font: themeFont, theme_mode: themeMode,
            require_approval: formData.require_approval,
            visibility: formData.visibility,
            registration_fields: registrationFields,
            host_id: selectedHostId,
        };
        const submitData = new FormData();
        submitData.append("payload", JSON.stringify(payload));
        if (coverSource === "upload" && coverFile) submitData.append("coverFile", coverFile);

        const res = await fetch("/api/events/create", { method: "POST", body: submitData });
        const result = await res.json();
        setIsSubmitting(false);
        if (!res.ok) {
            if (result.code === "23505") toast.error("An event with this slug already exists.");
            else toast.error(`Failed to create event: ${result.error}`);
            return;
        }
        toast.success(requestedStatus === "published" ? "Event published successfully!" : "Draft saved successfully!");
        setSubmitSuccess(true);
        setTimeout(() => {
            setSubmitSuccess(false); setFormData(initialFormData);
            setCoverImage(null); setCoverFile(null); setCoverSource(null);
            setRegistrationFields([]);
            const selectedHost = hosts.find((host) => host.id === selectedHostId);
            router.push(selectedHost
                ? `/hosts/${selectedHost.slug}/events/${result.event.public_slug}`
                : `/events/${result.event.slug}`);
        }, 1200);
    };

    const isFormValid = formData.title.trim() !== "";
    const activeCategory = EVENT_CATEGORIES.find(c => c.id === formData.event_type) || EVENT_CATEGORIES[0];
    const selectedHost = hosts.find((host) => host.id === selectedHostId);
    const eventUrlPreview = selectedHost && formData.slug
        ? `radius-sl.vercel.app/hosts/${selectedHost.slug}/events/${formData.slug}`
        : "";

    return (
        <div className={cn("min-h-screen transition-colors duration-500", theme.fontClass, theme.bgPatternClass)} style={{ ...theme.pageBg, ...theme.bgOverlayStyle }}>
            <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 pb-32">
                <button onClick={() => router.back()} className="mb-8 flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-70" style={theme.textMuted}>
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-10 lg:grid-cols-[340px_1fr]">
                        {/* LEFT */}
                        <div className="space-y-5">
                            <div className="relative overflow-hidden rounded-2xl shadow-sm transition-all" style={{ ...theme.cardStyle, borderWidth: "1px", borderStyle: "solid", ...(coverImage ? {} : { backgroundColor: theme.isDark ? theme.palette.card : "#fafafa" }) }}>
                                {coverImage ? (
                                    <div className="group relative aspect-[4/5]">
                                        <Image src={coverImage} alt="Event cover" fill className="object-cover" unoptimized={coverSource === "upload"} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                                            <div className="flex w-full gap-2 p-4">
                                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 rounded-xl bg-white/20 backdrop-blur-md text-white text-sm font-medium py-2.5 px-4 hover:bg-white/30 transition-colors flex items-center justify-center gap-2"><Upload className="h-3.5 w-3.5" /> Change</button>
                                                <button type="button" onClick={removeCover} className="rounded-xl bg-white/20 backdrop-blur-md text-white py-2.5 px-3 hover:bg-white/30 transition-colors"><X className="h-3.5 w-3.5" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 transition-colors hover:opacity-70" style={theme.textMuted}>
                                        <div className="h-14 w-14 rounded-2xl border-2 border-dashed border-current flex items-center justify-center"><ImageIcon className="h-6 w-6" /></div>
                                        <div className="text-center"><p className="text-sm font-semibold">Upload Cover Image</p><p className="text-xs mt-0.5 opacity-60">or pick a category below</p></div>
                                    </button>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileUpload} />

                            {/* Theme */}
                            <div className="rounded-2xl shadow-sm overflow-hidden transition-colors duration-300" style={{ ...theme.cardStyle, borderWidth: "1px", borderStyle: "solid" }}>
                                <button type="button" onClick={() => setShowTheme(!showTheme)} className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium transition-colors" style={theme.textPrimary}>
                                    <div className="flex items-center gap-2.5"><Palette className="h-4 w-4" style={theme.textMuted} /><span>Theme</span></div>
                                    <div className="flex items-center gap-2"><span className="text-xs capitalize" style={theme.textMuted}>{themeStyle}</span><div className="h-4 w-4 rounded-full border-2" style={{ backgroundColor: THEME_COLORS.find(c => c.id === themeColor)?.hex || '#64748b', borderColor: theme.palette.cardBorder }} /></div>
                                </button>
                                {showTheme && (
                                    <div className="p-4 space-y-4" style={{ borderTop: `1px solid ${theme.palette.cardBorder}` }}>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest" style={theme.textMuted}>Style</p>
                                            <div className="flex gap-2 overflow-x-auto pb-1">
                                                {THEME_STYLES.map(s => {
                                                    const previewColors: Record<string, string> = {
                                                        minimal: theme.isDark ? "linear-gradient(135deg, #27272a, #3f3f46)" : "linear-gradient(135deg, #f4f4f5, #e4e4e7)",
                                                        quantum: `linear-gradient(135deg, ${theme.palette.accent}40, ${theme.palette.muted}30)`,
                                                        warp: theme.isDark ? "linear-gradient(135deg, #0a0a0a, #1a1a2e)" : "linear-gradient(135deg, #374151, #1f2937)",
                                                        confetti: `linear-gradient(135deg, ${theme.palette.accent}30, ${theme.palette.muted}20)`,
                                                        pattern: `linear-gradient(135deg, ${theme.palette.accent}25, ${theme.palette.bg})`,
                                                        seasonal: `linear-gradient(135deg, ${theme.palette.accent}20, #f97316${theme.isDark ? '30' : '20'})`,
                                                    };
                                                    return (
                                                        <button key={s.id} type="button" onClick={() => setThemeStyle(s.id)} className={cn("flex flex-col items-center gap-1.5 flex-shrink-0 transition-all", themeStyle === s.id ? "opacity-100 scale-105" : "opacity-50 hover:opacity-80")}>
                                                            <div className="h-12 w-16 rounded-lg border-2 transition-all" style={{ background: previewColors[s.id] || previewColors.minimal, borderColor: themeStyle === s.id ? theme.palette.accent : "transparent" }} />
                                                            <span className="text-[9px] font-bold uppercase tracking-wider" style={theme.textMuted}>{s.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-bold uppercase tracking-widest" style={theme.textMuted}>Color</p>
                                                <span className="text-[10px] font-semibold capitalize" style={theme.textMuted}>{themeColor}</span>
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                {THEME_COLORS.map(c => (
                                                    <button key={c.id} type="button" onClick={() => setThemeColor(c.id)} className={cn("h-7 w-7 rounded-full border-2 transition-all flex items-center justify-center", themeColor === c.id ? "scale-110 shadow-md" : "hover:scale-105")} style={{ backgroundColor: c.hex, borderColor: themeColor === c.id ? theme.palette.text : "transparent" }} title={c.id}>
                                                        {themeColor === c.id && <Check className="h-3 w-3 text-white" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="flex-1 space-y-2">
                                                <p className="text-[10px] font-bold uppercase tracking-widest" style={theme.textMuted}>Font</p>
                                                <div className="flex gap-1.5">
                                                    {THEME_FONTS.map(f => (<button key={f.id} type="button" onClick={() => setThemeFont(f.id)} className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all" style={themeFont === f.id ? theme.btnPrimary : theme.btnSecondary}>{f.label}</button>))}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold uppercase tracking-widest" style={theme.textMuted}>Display</p>
                                                <div className="flex gap-1.5">
                                                    {THEME_MODES.map(m => (<button key={m.id} type="button" onClick={() => setThemeMode(m.id)} className="px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all" style={themeMode === m.id ? theme.btnPrimary : theme.btnSecondary}>{m.icon}</button>))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Categories */}
                            <div className="space-y-2.5">
                                <p className="text-xs font-semibold uppercase tracking-widest px-1" style={theme.textMuted}>Event Type</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {EVENT_CATEGORIES.map((cat) => (
                                        <button key={cat.id} type="button" onClick={() => handleCategorySelect(cat)} className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-all border" style={activeCategory.id === cat.id ? { ...theme.btnPrimary, borderColor: theme.palette.accent } : { ...theme.cardStyle, borderWidth: "1px", borderStyle: "solid", color: theme.palette.text }}>
                                            <span className="text-base">{cat.emoji}</span>{cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT */}
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="host" className="text-xs font-bold uppercase tracking-widest" style={theme.textMuted}>Hosted by</label>
                                <select id="host" value={selectedHostId} onChange={(event) => setSelectedHostId(event.target.value)} required className="mt-2 w-full rounded-xl border px-4 py-3 text-sm font-medium" style={theme.inputStyle}>
                                    {hosts.map((host) => <option key={host.id} value={host.id}>{host.name} · {host.type === "organization" ? "Organization" : "Myself"}</option>)}
                                </select>
                                <Link href="/organizer" className="mt-2 inline-block text-xs underline" style={theme.textMuted}>Create or manage an organization</Link>
                            </div>

                            <div>
                                <input id="title" type="text" placeholder="Event Name" value={formData.title} onChange={(e) => updateField("title", e.target.value)} className="w-full border-none bg-transparent text-3xl sm:text-4xl font-semibold tracking-tight outline-none transition-colors duration-300" style={{ color: theme.palette.text, lineHeight: 1.2, caretColor: theme.palette.accent }} />
                                {eventUrlPreview && (
                                    <div className="mt-2 text-xs" style={theme.textMuted}>
                                        <span>Your event link: </span>
                                        <span className="font-medium break-all" style={theme.textPrimary}>{eventUrlPreview}</span>
                                        <p className="mt-1 opacity-75">If this organization already used that link, Radius will add a number automatically.</p>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-2xl shadow-sm overflow-hidden transition-colors duration-300" style={{ ...theme.cardStyle, borderWidth: "1px", borderStyle: "solid" }}>
                                <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: `1px solid ${theme.palette.cardBorder}15` }}>
                                    <div className="flex items-center gap-2.5 w-20"><CalendarDays className="h-4 w-4" style={theme.textMuted} /><span className="text-sm" style={theme.textMuted}>Start</span></div>
                                    <Popover><PopoverTrigger asChild><button type="button" className="text-sm font-medium transition-colors" style={theme.textPrimary}>{formData.date ? format(formData.date, "EEE, MMM d, yyyy") : "Pick a date"}</button></PopoverTrigger><PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start"><Calendar mode="single" selected={formData.date} onSelect={(d) => updateField("date", d)} initialFocus /></PopoverContent></Popover>
                                    <div className="ml-auto flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" style={theme.textMuted} /><input type="time" className="h-auto w-20 border-none bg-transparent px-0 text-sm font-medium text-right focus:outline-none" style={{ color: theme.palette.text }} value={startTime} onChange={(event) => setStartTime(event.target.value)} /></div>
                                </div>
                                <div className="flex items-center gap-4 px-5 py-4">
                                    <div className="flex items-center gap-2.5 w-20"><div className="h-4 w-4 flex items-center justify-center"><div className="h-2 w-2 rounded-full border-2 border-dashed" style={{ borderColor: theme.palette.cardBorder }} /></div><span className="text-sm" style={theme.textMuted}>End</span></div>
                                    <Popover><PopoverTrigger asChild><button type="button" className="text-sm font-medium transition-colors" style={theme.textMuted}>{formData.end_date ? format(formData.end_date, "EEE, MMM d, yyyy") : "Pick end date"}</button></PopoverTrigger><PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start"><Calendar mode="single" selected={formData.end_date} onSelect={(d) => updateField("end_date", d)} initialFocus /></PopoverContent></Popover>
                                    <div className="ml-auto flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" style={theme.textMuted} /><input type="time" className="h-auto w-20 border-none bg-transparent px-0 text-sm font-medium text-right focus:outline-none" style={{ color: theme.palette.muted }} value={endTime} onChange={(event) => setEndTime(event.target.value)} /></div>
                                </div>
                            </div>

                            <div className="rounded-2xl shadow-sm transition-colors duration-300" style={{ ...theme.cardStyle, borderWidth: "1px", borderStyle: "solid" }}>
                                <div className="flex items-center gap-4 px-5 py-4"><MapPin className="h-4 w-4 flex-shrink-0" style={theme.textMuted} /><input id="location" placeholder="Add event location" value={formData.location} onChange={(e) => updateField("location", e.target.value)} className="flex-1 border-none bg-transparent text-sm font-medium outline-none" style={{ color: theme.palette.text, caretColor: theme.palette.accent }} /></div>
                                <div className="flex items-center gap-4 px-5 py-3" style={{ borderTop: `1px solid ${theme.palette.cardBorder}30` }}>
                                    <Globe className="h-4 w-4 flex-shrink-0" style={theme.textMuted} />
                                    <button type="button" onClick={() => updateField("is_virtual", !formData.is_virtual)} className="flex items-center gap-2 text-sm">
                                        <div className="h-4 w-4 rounded border flex items-center justify-center transition-colors" style={formData.is_virtual ? { backgroundColor: theme.palette.accent, borderColor: theme.palette.accent } : { borderColor: theme.palette.cardBorder }}>{formData.is_virtual && <Check className="h-3 w-3 text-white" />}</div>
                                        <span style={theme.textMuted}>This is a virtual event</span>
                                    </button>
                                </div>
                                {formData.is_virtual && (
                                    <div className="flex items-center gap-4 px-5 py-3" style={{ borderTop: `1px solid ${theme.palette.cardBorder}30` }}><div className="w-4" /><input placeholder="Add meeting link (Zoom, Meet, etc.)" value={formData.virtual_link} onChange={(e) => updateField("virtual_link", e.target.value)} className="flex-1 border-none bg-transparent text-sm font-medium outline-none" style={{ color: theme.palette.text, caretColor: theme.palette.accent }} /></div>
                                )}
                            </div>

                            <div className="rounded-2xl shadow-sm px-5 py-4 transition-colors duration-300" style={{ ...theme.cardStyle, borderWidth: "1px", borderStyle: "solid" }}>
                                <textarea id="description" placeholder="Add a description... Tell people what your event is about" rows={4} value={formData.description} onChange={(e) => updateField("description", e.target.value)} className="w-full border-none bg-transparent text-sm font-normal resize-none outline-none leading-relaxed" style={{ color: theme.palette.text, caretColor: theme.palette.accent }} />
                            </div>

                            <RegistrationFieldBuilder fields={registrationFields} onChange={setRegistrationFields} />

                            <div className="space-y-2.5">
                                <p className="text-xs font-semibold uppercase tracking-widest px-1" style={theme.textMuted}>Event Options</p>
                                <div className="rounded-2xl shadow-sm overflow-hidden transition-colors duration-300" style={{ ...theme.cardStyle, borderWidth: "1px", borderStyle: "solid" }}>
                                    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${theme.palette.cardBorder}30` }}><span className="text-sm" style={theme.textMuted}>Ticket Price</span><span className="text-sm font-medium" style={theme.textPrimary}>Free</span></div>
                                    <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.palette.cardBorder}30` }}><label className="text-sm" style={theme.textMuted}>Who can find this event?</label><select value={formData.visibility} onChange={(event) => updateField("visibility", event.target.value as EventFormData["visibility"])} className="mt-2 w-full rounded-xl border bg-transparent px-3 py-2.5 text-sm font-medium outline-none" style={{ color: theme.palette.text, borderColor: theme.palette.cardBorder }}><option value="public">Public — listed on Radius</option><option value="unlisted">Unlisted — anyone with the link</option><option value="invite_only">Invite only — approved guest list</option></select></div>
                                    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${theme.palette.cardBorder}30` }}>
                                        <span className="text-sm" style={theme.textMuted}>Require Approval</span>
                                        <button type="button" onClick={() => updateField("require_approval", !formData.require_approval)} className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors" style={{ backgroundColor: formData.require_approval ? theme.palette.accent : theme.palette.cardBorder }}><span className={cn("pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform", formData.require_approval ? "translate-x-[18px]" : "translate-x-[3px]")} /></button>
                                    </div>
                                    <div className="flex items-center justify-between px-5 py-4">
                                        <span className="text-sm" style={theme.textMuted}>Capacity</span>
                                        <div className="flex items-center gap-1.5">
                                            {editingCapacity ? (<input type="number" autoFocus placeholder="e.g. 100" value={formData.max_attendees ?? ""} onChange={(e) => updateField("max_attendees", e.target.value === "" ? null : parseInt(e.target.value))} onBlur={() => setEditingCapacity(false)} onKeyDown={(e) => e.key === "Enter" && setEditingCapacity(false)} className="w-20 border-none bg-transparent p-0 text-right text-sm font-medium focus:outline-none" style={{ color: theme.palette.text }} />) : (
                                                <button type="button" onClick={() => setEditingCapacity(true)} className="flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-70" style={theme.textPrimary}><span>{formData.max_attendees ? formData.max_attendees.toLocaleString() : "Unlimited"}</span><Pencil className="h-3 w-3" style={theme.textMuted} /></button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr]">
                                <button type="submit" name="status" value="draft" disabled={!isFormValid || isSubmitting} className={cn("rounded-2xl border py-4 text-sm font-semibold transition-all hover:bg-black/5", (!isFormValid || isSubmitting) && "opacity-50 cursor-not-allowed")} style={{ color: theme.palette.text, borderColor: theme.palette.cardBorder }}>
                                    Save as draft
                                </button>
                                <button type="submit" name="status" value="published" disabled={!isFormValid || isSubmitting} className={cn("rounded-2xl py-4 text-base font-semibold shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] hover:shadow-xl", (!isFormValid || isSubmitting) && "opacity-50 cursor-not-allowed hover:scale-100")} style={theme.btnPrimary}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin inline" /> : submitSuccess ? <span className="flex items-center justify-center gap-2"><Check className="h-5 w-5" /> Event Created!</span> : "Publish event"}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
