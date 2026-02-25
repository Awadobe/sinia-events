"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
    CalendarIcon,
    ArrowLeft,
    Loader2,
    Upload,
    ImageIcon,
    Check,
    Palette,
    X,
    MapPin,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

/* ───── Theming Options (Luma Style) ───── */
const themeStyles = [
    { id: "minimal", label: "Minimal", pattern: "", colorId: "slate", fontId: "standard" },
    { id: "quantum", label: "Quantum", pattern: "bg-pattern-quantum", colorId: "indigo", fontId: "technical" },
    { id: "warp", label: "Warp", pattern: "bg-pattern-warp", colorId: "midnight", fontId: "modern" },
    { id: "emoji", label: "Emoji", pattern: "bg-pattern-emoji", colorId: "amber", fontId: "soft" },
    { id: "confetti", label: "Confetti", pattern: "bg-pattern-confetti", colorId: "rose", fontId: "display" },
    { id: "pattern", label: "Pattern", pattern: "bg-pattern-abstract", colorId: "forest", fontId: "elegant" },
];

const themeColors = [
    { id: "forest", label: "Forest", primary: "bg-emerald-600", light: "bg-emerald-50", dark: "bg-emerald-950/40" },
    { id: "sky", label: "Sky", primary: "bg-sky-600", light: "bg-sky-50", dark: "bg-sky-950/40" },
    { id: "rose", label: "Rose", primary: "bg-rose-600", light: "bg-rose-50", dark: "bg-rose-950/40" },
    { id: "slate", label: "Slate", primary: "bg-slate-600", light: "bg-slate-50", dark: "bg-slate-950/40" },
    { id: "amber", label: "Amber", primary: "bg-amber-600", light: "bg-amber-50", dark: "bg-amber-950/40" },
    { id: "indigo", label: "Indigo", primary: "bg-indigo-600", light: "bg-indigo-50", dark: "bg-indigo-950/40" },
    { id: "violet", label: "Violet", primary: "bg-violet-600", light: "bg-violet-50", dark: "bg-violet-950/40" },
    { id: "crimson", label: "Crimson", primary: "bg-rose-700", light: "bg-rose-50", dark: "bg-rose-950/60" },
    { id: "ocean", label: "Ocean", primary: "bg-cyan-600", light: "bg-cyan-50", dark: "bg-cyan-950/40" },
    { id: "sunset", label: "Sunset", primary: "bg-orange-600", light: "bg-orange-50", dark: "bg-orange-950/40" },
    { id: "lavender", label: "Lavender", primary: "bg-purple-400", light: "bg-purple-50", dark: "bg-purple-950/40" },
    { id: "earth", label: "Earth", primary: "bg-stone-600", light: "bg-stone-50", dark: "bg-stone-950/40" },
    { id: "neon", label: "Neon", primary: "bg-lime-400", light: "bg-lime-50", dark: "bg-lime-950/40" },
    { id: "midnight", label: "Midnight", primary: "bg-blue-900", light: "bg-blue-50", dark: "bg-blue-950/80" },
    { id: "mint", label: "Mint", primary: "bg-teal-400", light: "bg-teal-50", dark: "bg-teal-950/40" },
    { id: "honey", label: "Honey", primary: "bg-yellow-500", light: "bg-yellow-50", dark: "bg-yellow-950/40" },
    { id: "coral", label: "Coral", primary: "bg-coral-500", light: "bg-orange-50", dark: "bg-orange-950/40" },
    { id: "charcoal", label: "Charcoal", primary: "bg-zinc-800", light: "bg-zinc-100", dark: "bg-zinc-950/90" },
    { id: "gold", label: "Gold", primary: "bg-amber-400", light: "bg-amber-50", dark: "bg-amber-950/50" },
    { id: "plum", label: "Plum", primary: "bg-fuchsia-800", light: "bg-fuchsia-50", dark: "bg-fuchsia-950/50" },
    { id: "emerald", label: "Emerald", primary: "bg-emerald-500", light: "bg-emerald-50", dark: "bg-emerald-950/50" },
    { id: "ruby", label: "Ruby", primary: "bg-red-600", light: "bg-red-50", dark: "bg-red-950/50" },
    { id: "sapphire", label: "Sapphire", primary: "bg-blue-600", light: "bg-blue-50", dark: "bg-blue-950/50" },
    { id: "topaz", label: "Topaz", primary: "bg-yellow-400", light: "bg-yellow-50", dark: "bg-yellow-950/50" },
    { id: "amethyst", label: "Amethyst", primary: "bg-purple-600", light: "bg-purple-50", dark: "bg-purple-950/50" },
    { id: "peridot", label: "Peridot", primary: "bg-lime-500", light: "bg-lime-50", dark: "bg-lime-950/50" },
    { id: "turquoise", label: "Turquoise", primary: "bg-cyan-400", light: "bg-cyan-50", dark: "bg-cyan-950/50" },
    { id: "garnet", label: "Garnet", primary: "bg-red-800", light: "bg-red-50", dark: "bg-red-950/70" },
    { id: "onyx", label: "Onyx", primary: "bg-gray-900", light: "bg-gray-100", dark: "bg-gray-950/90" },
    { id: "pearl", label: "Pearl", primary: "bg-gray-200", light: "bg-gray-50", dark: "bg-gray-950/20" },
];

const themeFonts = [
    { id: "standard", label: "Standard Sans", class: "font-sans", category: "Modern" },
    { id: "classic", label: "Classic Serif", class: "font-serif", category: "Elegant" },
    { id: "technical", label: "Tech Mono", class: "font-mono", category: "Minimal" },
    { id: "soft", label: "Soft Rounded", class: "font-rounded", category: "Playful" },
    { id: "display", label: "Bold Display", class: "font-display", category: "Celebrative" },
    { id: "elegant", label: "Elegant Serif", class: "font-elegant", category: "Formal" },
    { id: "modern", label: "Clean Modern", class: "font-modern", category: "Corporate" },
    { id: "retro", label: "Retro Style", class: "font-mono", category: "Vintage" },
    { id: "playful", label: "Fun Playful", class: "font-rounded", category: "Casual" },
];

/* ───── Preset Covers ───── */
const presetCovers = [
    { id: "bootcamp", label: "Bootcamp", src: "/covers/bootcamp.png" },
    { id: "workshop", label: "Workshop", src: "/covers/workshop.png" },
    { id: "hackathon", label: "Hackathon", src: "/covers/hackathon.png" },
    { id: "meetup", label: "Meetup", src: "/covers/meetup.png" },
    { id: "community", label: "Community", src: "/covers/community.png" },
    { id: "abstract", label: "Abstract", src: "/covers/abstract.png" },
];

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
    max_attendees: string;
    status: string;
    slug: string;
    require_approval: boolean;
    ticket_price: string;
};

const initialFormData: EventFormData = {
    title: "",
    description: "",
    event_type: "",
    date: undefined,
    end_date: undefined,
    location: "",
    is_virtual: false,
    virtual_link: "",
    max_attendees: "",
    status: "draft",
    slug: "",
    require_approval: false,
    ticket_price: "free",
};

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

export default function CreateEventPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState<EventFormData>(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Advanced Theme state
    const [activeStyle, setActiveStyle] = useState(themeStyles[0]);
    const [activeColor, setActiveColor] = useState(themeColors[0]);
    const [activeFont, setActiveFont] = useState(themeFonts[0]);
    const [activeDisplay, setActiveDisplay] = useState<"light" | "dark">("light");
    const [showPersonalize, setShowPersonalize] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);

    // Cover state
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null); // Real file for upload
    const [coverSource, setCoverSource] = useState<"preset" | "upload" | null>(null);
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
    const [showCoverPicker, setShowCoverPicker] = useState(false);

    const updateField = <K extends keyof EventFormData>(
        field: K,
        value: EventFormData[K]
    ) => {
        setFormData((prev) => {
            const updated = { ...prev, [field]: value };
            if (field === "title" && typeof value === "string") {
                updated.slug = generateSlug(value);
            }
            return updated;
        });
    };

    const handlePresetSelect = (preset: (typeof presetCovers)[number]) => {
        setCoverImage(preset.src);
        setCoverSource("preset");
        setSelectedPresetId(preset.id);
        setShowCoverPicker(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCoverFile(file);
            const url = URL.createObjectURL(file);
            setCoverImage(url);
            setCoverSource("upload");
            setSelectedPresetId(null);
            setShowCoverPicker(false);
        }
    };

    const removeCover = () => {
        setCoverImage(null);
        setCoverFile(null);
        setCoverSource(null);
        setSelectedPresetId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("🚀 Submit clicked. isFormValid:", isFormValid);
        console.log("📦 Form Data:", formData);
        setIsSubmitting(true);

        // 0. Check Staff Access Control
        const { data: { user } } = await supabase.auth.getUser();
        console.log("👤 Auth User:", user);
        if (!user || !user.email) {
            toast.error("You must be logged in to create events.");
            setIsSubmitting(false);
            return;
        }

        const { data: staffData, error: staffError } = await supabase
            .from('staff_allowlist')
            .select('email')
            .eq('email', user.email)
            .single();

        console.log("🛡️ Staff Check:", { staffData, staffError });

        if (staffError || !staffData) {
            toast.error("Access Denied: Your email is not on the CF staff allowlist.");
            setIsSubmitting(false);
            return;
        }

        let finalImageUrl = coverImage;

        // 1. Upload file if source is "upload" and we have a coverFile
        if (coverSource === "upload" && coverFile) {
            const fileExt = coverFile.name.split('.').pop();
            const fileName = `${formData.slug}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `covers/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('event-covers')
                .upload(filePath, coverFile);

            if (uploadError) {
                console.error("❌ Storage upload error:", uploadError);
                toast.error(`Image upload failed: ${uploadError.message}`);
                setIsSubmitting(false);
                return;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('event-covers')
                .getPublicUrl(filePath);

            finalImageUrl = publicUrl;
        }

        const payload = {
            title: formData.title,
            description: formData.description || null,
            event_type: formData.event_type,
            date: formData.date?.toISOString(),
            end_date: formData.end_date?.toISOString() || null,
            location: formData.location || null,
            is_virtual: formData.is_virtual,
            virtual_link: formData.virtual_link || null,
            image_url: finalImageUrl,
            max_attendees: formData.max_attendees
                ? parseInt(formData.max_attendees.toString())
                : null,
            status: formData.status,
            slug: formData.slug,
            theme_style: activeStyle.id,
            theme_color: activeColor.id,
            theme_font: activeFont.id || 'inter',
            require_approval: formData.require_approval,
        };

        const { error } = await supabase.from("events").insert([payload]);

        setIsSubmitting(false);

        if (error) {
            console.error("❌ Supabase insertion error:", error);
            if (error.code === '23505') {
                toast.error("An event with this slug already exists.");
            } else {
                toast.error(`Failed to create event: ${error.message}`);
            }
            return;
        }

        toast.success("Event created successfully!");
        setSubmitSuccess(true);

        setTimeout(() => {
            setSubmitSuccess(false);
            setFormData(initialFormData);
            setCoverImage(null);
            setCoverFile(null);
            setCoverSource(null);
            setSelectedPresetId(null);
            router.push("/admin/events");
        }, 1200);
    };

    const isFormValid =
        formData.title.trim() !== "" &&
        formData.event_type !== "" &&
        formData.date !== undefined &&
        formData.slug.trim() !== "";

    // console.log("🔍 isFormValid state:", { 
    //     title: formData.title.trim() !== "", 
    //     type: formData.event_type !== "", 
    //     date: formData.date !== undefined, 
    //     slug: formData.slug.trim() !== "" 
    // });

    return (
        <div
            className={cn(
                "min-h-screen transition-all duration-700 relative overflow-x-hidden",
                activeFont.class,
                activeDisplay === "light" ? activeColor.light : "bg-[#1a1614] text-white"
            )}
        >
            {/* Background Pattern Overlay */}
            {activeStyle.pattern && (
                <div className={cn("absolute inset-0 pointer-events-none opacity-60 transition-opacity duration-1000", activeStyle.pattern)} />
            )}

            <div className="mx-auto max-w-5xl px-4 py-12 pb-32 relative z-10">
                {/* Back link */}
                <button
                    onClick={() => router.back()}
                    className={cn(
                        "mb-8 flex items-center gap-1.5 text-sm font-medium transition-colors opacity-60 hover:opacity-100",
                        activeDisplay === "dark" ? "text-white" : "text-zinc-900"
                    )}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>

                <form onSubmit={handleSubmit}>
                    {/* ═══ Main two-column Luma-style layout ═══ */}
                    <div className="grid gap-12 lg:grid-cols-[400px_1fr]">
                        {/* ──── LEFT: Cover Image & Personalization ──── */}
                        <div className="space-y-8">
                            <div
                                className={cn(
                                    "relative overflow-hidden rounded-[2rem] border-4 shadow-2xl transition-all duration-500",
                                    activeDisplay === "dark" ? "border-white/10" : "border-white/50",
                                    !coverImage && (activeDisplay === "dark" ? "bg-white/5" : "bg-white/30")
                                )}
                            >
                                {coverImage ? (
                                    <div className="group relative aspect-square lg:aspect-[4/5]">
                                        <Image
                                            src={coverImage}
                                            alt="Event cover"
                                            fill
                                            className="object-cover"
                                            unoptimized={coverSource === "upload"}
                                        />
                                        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                                            <div className="flex w-full gap-2 p-6">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    className="flex-1 rounded-xl bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30"
                                                    onClick={() => setShowCoverPicker(true)}
                                                >
                                                    <ImageIcon className="mr-2 h-4 w-4" />
                                                    Change Image
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    className="rounded-xl bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30 px-3"
                                                    onClick={removeCover}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowCoverPicker(true)}
                                        className={cn(
                                            "flex aspect-square lg:aspect-[4/5] w-full flex-col items-center justify-center gap-4 transition-colors",
                                            activeDisplay === "dark" ? "text-white/40 hover:text-white" : "text-zinc-400 hover:text-zinc-900"
                                        )}
                                    >
                                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border-2 border-dashed border-current opacity-50">
                                            <ImageIcon className="h-8 w-8" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold">Add Cover Image</p>
                                            <p className="text-sm opacity-60">Presets or custom upload</p>
                                        </div>
                                    </button>
                                )}
                            </div>

                            {/* ═══ Personalization Panel ═══ */}
                            <div className={cn(
                                "rounded-[2rem] border p-6 space-y-4 transition-all duration-500",
                                activeDisplay === "dark" ? "bg-white/5 border-white/10" : "bg-white/50 border-black/5"
                            )}>
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-sm font-bold opacity-60 uppercase tracking-widest">Theme style</h3>
                                    <Palette className="h-4 w-4 opacity-40" />
                                </div>

                                <Select value={activeStyle.id} onValueChange={(val) => {
                                    const style = themeStyles.find(s => s.id === val);
                                    if (style) {
                                        setActiveStyle(style);
                                        // Sync color if recommended
                                        const recommendedColor = themeColors.find(c => c.id === style.colorId);
                                        if (recommendedColor) setActiveColor(recommendedColor);

                                        // Sync font if recommended
                                        const recommendedFont = themeFonts.find(f => f.id === style.fontId);
                                        if (recommendedFont) setActiveFont(recommendedFont);

                                        setShowPersonalize(true);
                                    }
                                }}>
                                    <SelectTrigger className="w-full h-14 rounded-2xl border-none bg-black/5 hover:bg-black/10 transition-colors px-6 font-bold text-lg ring-0">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("h-4 w-4 rounded-full border border-current opacity-40", activeStyle.pattern)} />
                                            <span>{activeStyle.label}</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                        {themeStyles.map(style => (
                                            <SelectItem key={style.id} value={style.id}>
                                                <div className="flex items-center gap-3 py-1">
                                                    <div className={cn("h-3 w-3 rounded-full border border-zinc-200", style.pattern)} />
                                                    {style.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {activeStyle && (
                                    <div className={cn(
                                        "space-y-4 pt-2 overflow-hidden transition-all duration-500",
                                        showPersonalize ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                                    )}>
                                        <div className="h-px bg-current opacity-5 mx-2" />

                                        {/* Color Selection */}
                                        <div className="space-y-2 px-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-100">Color</p>
                                            <div className="flex flex-wrap gap-2">
                                                {themeColors.map(c => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => setActiveColor(c)}
                                                        className={cn(
                                                            "h-6 w-6 rounded-full border-2 transition-all",
                                                            activeColor.id === c.id ? "border-zinc-900 scale-110" : "border-transparent opacity-60 hover:opacity-100",
                                                            c.primary
                                                        )}
                                                        title={c.label}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Font & Mode */}
                                        <div className="grid grid-cols-2 gap-3 px-2">
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Font choice</p>
                                                <Select value={activeFont.id} onValueChange={(val) => setActiveFont(themeFonts.find(f => f.id === val) || themeFonts[0])}>
                                                    <SelectTrigger className="w-full h-10 rounded-xl border-none bg-black/5 hover:bg-black/10 transition-colors px-3 font-normal text-xs ring-0">
                                                        <div className="flex items-center justify-between w-full text-zinc-900/80">
                                                            <SelectValue />
                                                            <span className="opacity-50 text-[9px] uppercase tracking-tighter ml-1">{activeFont.category}</span>
                                                        </div>
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-none shadow-2xl">
                                                        {themeFonts.map(f => (
                                                            <SelectItem key={f.id} value={f.id} className={cn(f.class, "font-normal")}>
                                                                <div className="flex items-center justify-between w-full gap-4">
                                                                    <span>{f.label}</span>
                                                                    <span className="opacity-40 text-[9px] uppercase">{f.category}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Mode</p>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveDisplay(activeDisplay === "light" ? "dark" : "light")}
                                                    className="w-full h-10 rounded-xl bg-black/5 hover:bg-black/10 transition-colors px-3 font-normal text-xs flex items-center justify-between text-zinc-900/80"
                                                >
                                                    <span>{activeDisplay === "light" ? "Light" : "Dark"}</span>
                                                    <span>{activeDisplay === "light" ? "☀️" : "🌙"}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!showPersonalize && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPersonalize(true)}
                                        className="w-full py-2 text-[10px] font-bold uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity"
                                    >
                                        Customize further
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ──── RIGHT: Event form ──── */}
                        <div className="space-y-6">
                            {/* Personal Calendar indicator - Above Event Name */}
                            <div className="flex items-center gap-2 px-1">
                                <div className="h-5 w-5 rounded-full bg-orange-100 flex items-center justify-center text-[10px] shadow-inner">👤</div>
                                <button type="button" className="flex items-center gap-1.5 text-sm font-medium opacity-60 hover:opacity-100 transition-opacity">
                                    <span>Personal calendar</span>
                                    <span className="text-[10px] opacity-40">▼</span>
                                </button>
                                <div className="ml-auto px-3 py-1 rounded-full bg-black/5 text-[10px] font-bold opacity-40 flex items-center gap-1.5">
                                    <span className="h-1 w-1 rounded-full bg-current" />
                                    Public
                                </div>
                            </div>

                            {/* Event name — prominent */}
                            <div className="px-1">
                                <Input
                                    id="title"
                                    placeholder="Event Name"
                                    value={formData.title}
                                    onChange={(e) => updateField("title", e.target.value)}
                                    className={cn(
                                        "border-none bg-transparent text-5xl font-bold tracking-tight placeholder:opacity-30 focus-visible:ring-0 px-0 h-auto py-0 leading-tight",
                                        activeDisplay === "dark" ? "text-white" : "text-zinc-900"
                                    )}
                                />
                            </div>

                            {/* Date/Time Section with standalone Timezone card */}
                            <div className="flex gap-3">
                                <div className={cn(
                                    "flex-1 rounded-2xl border transition-all duration-500 overflow-hidden shadow-sm",
                                    activeDisplay === "dark" ? "bg-white/[0.03] border-white/10" : "bg-white/60 border-black/5"
                                )}>
                                    {/* Start row */}
                                    <div className="flex items-center gap-10 border-b border-inherit px-6 py-4">
                                        <div className="flex items-center gap-3 w-16">
                                            <div className="h-2 w-2 rounded-full border-2 border-primary" />
                                            <span className="text-sm font-medium opacity-40">Start</span>
                                        </div>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    className="h-auto px-0 py-0 text-base font-medium hover:bg-transparent text-foreground flex-1 justify-start"
                                                >
                                                    {formData.date ? format(formData.date, "EEE, MMM d") : format(new Date(), "EEE, MMM d")}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                                                <Calendar mode="single" selected={formData.date} onSelect={(d) => updateField("date", d)} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        <Input type="time" className="h-auto w-16 border-none bg-transparent px-0 text-base font-medium focus-visible:ring-0 text-right opacity-80" defaultValue="16:00" />
                                    </div>
                                    {/* End row */}
                                    <div className="flex items-center gap-10 px-6 py-4">
                                        <div className="flex items-center gap-3 w-16">
                                            <div className="h-2 w-2 rounded-full border-2 border-dashed border-foreground/20" />
                                            <span className="text-sm font-medium opacity-40">End</span>
                                        </div>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    className="h-auto px-0 py-0 text-base font-medium hover:bg-transparent text-foreground/60 flex-1 justify-start"
                                                >
                                                    {formData.end_date ? format(formData.end_date, "EEE, MMM d") : format(new Date(), "EEE, MMM d")}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                                                <Calendar mode="single" selected={formData.end_date} onSelect={(d) => updateField("end_date", d)} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        <Input type="time" className="h-auto w-16 border-none bg-transparent px-0 text-base font-medium focus-visible:ring-0 text-right opacity-60" defaultValue="17:00" />
                                    </div>
                                </div>

                                {/* Timezone standalone card */}
                                <div className={cn(
                                    "w-32 rounded-2xl border p-4 flex flex-col justify-center items-center shadow-sm text-center gap-1",
                                    activeDisplay === "dark" ? "bg-white/[0.03] border-white/10" : "bg-white/60 border-black/5"
                                )}>
                                    <div className="h-5 w-5 rounded-full border border-dashed border-foreground/20 flex items-center justify-center text-[10px] opacity-40">🌐</div>
                                    <Select defaultValue="GMT+00:00">
                                        <SelectTrigger className="w-full border-none bg-transparent h-auto p-0 text-[10px] font-bold opacity-60 uppercase tracking-widest focus:ring-0 ring-0 text-center flex justify-center hover:opacity-100 transition-opacity">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            <SelectItem value="GMT+00:00">GMT+00:00</SelectItem>
                                            <SelectItem value="GMT-05:00">EST (GMT-5)</SelectItem>
                                            <SelectItem value="GMT-08:00">PST (GMT-8)</SelectItem>
                                            <SelectItem value="GMT+01:00">CET (GMT+1)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span className="text-[9px] font-bold opacity-30 uppercase tracking-tighter">Monrovia</span>
                                </div>
                            </div>

                            {/* Action Cards */}
                            <div className="space-y-3">
                                {/* Location elevated card */}
                                <div className={cn(
                                    "rounded-2xl border p-5 flex items-center gap-4 shadow-sm hover:translate-y-[-1px] transition-all",
                                    activeDisplay === "dark" ? "bg-white/[0.03] border-white/10" : "bg-white/60 border-black/5"
                                )}>
                                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center opacity-40">
                                        <MapPin className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <Input
                                            id="location"
                                            placeholder="Add event location"
                                            value={formData.location}
                                            onChange={(e) => updateField("location", e.target.value)}
                                            className="border-none bg-transparent px-0 text-base font-semibold focus-visible:ring-0 h-auto py-0 placeholder:opacity-30 leading-tight"
                                        />
                                        <span className="text-[10px] opacity-40 mt-1 font-medium">Offline location or virtual link</span>
                                    </div>
                                </div>

                                {/* Description elevated card */}
                                <div className={cn(
                                    "rounded-2xl border p-5 flex items-start gap-4 shadow-sm",
                                    activeDisplay === "dark" ? "bg-white/[0.03] border-white/10" : "bg-white/60 border-black/5"
                                )}>
                                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center opacity-40 mt-1 text-xs">📝</div>
                                    <Textarea
                                        id="description"
                                        placeholder="Add description"
                                        rows={1}
                                        value={formData.description}
                                        onChange={(e) => updateField("description", e.target.value)}
                                        className="border-none bg-transparent px-0 text-base font-semibold resize-none focus-visible:ring-0 placeholder:opacity-30 min-h-0 py-0 flex-1 leading-normal"
                                    />
                                </div>
                            </div>

                            {/* Event Options section */}
                            <div className="pt-4 space-y-3">
                                <p className="text-sm font-bold opacity-60 px-2">Event options</p>
                                <div className={cn(
                                    "rounded-2xl border transition-all duration-500 overflow-hidden",
                                    activeDisplay === "dark" ? "bg-white/5 border-white/10" : "bg-white/40 border-black/5"
                                )}>
                                    {/* Event Options grouped card */}
                                    <div className="space-y-3">
                                        <h4 className="text-[11px] font-bold uppercase tracking-widest opacity-60 px-1">Event options</h4>
                                        <div className={cn(
                                            "rounded-2xl border shadow-sm transition-all duration-500 overflow-hidden",
                                            activeDisplay === "dark" ? "bg-white/[0.03] border-white/10" : "bg-white/60 border-black/5"
                                        )}>
                                            <div className="flex items-center justify-between px-6 py-4 border-b border-inherit bg-white/[0.01]">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-base font-normal opacity-60">Ticket Price</span>
                                                </div>
                                                <span className="text-base font-normal opacity-40 flex items-center gap-1">Free <span className="text-xs">🔗</span></span>
                                            </div>
                                            <div className="flex items-center justify-between px-6 py-4 border-b border-inherit">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-base font-normal opacity-60">Require approval</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => updateField("require_approval", !formData.require_approval)}
                                                    className={cn(
                                                        "relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                                                        formData.require_approval ? activeColor.primary : "bg-black/20"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                                                        formData.require_approval ? "translate-x-5" : "translate-x-1"
                                                    )} />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-base font-normal opacity-60">Capacity</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-base font-normal opacity-40">Unlimited</span>
                                                    <span className="text-xs opacity-25">🔗</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button Section - Elevated from bottom */}
                            <div className="pt-8">
                                <Button
                                    type="submit"
                                    disabled={!isFormValid || isSubmitting}
                                    className={cn(
                                        "w-full rounded-2xl py-8 text-xl font-bold shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99]",
                                        activeDisplay === "dark" ? "bg-white text-black hover:bg-white/90" : "bg-zinc-900 text-white hover:bg-zinc-800"
                                    )}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                    ) : submitSuccess ? (
                                        "✓ Event Created!"
                                    ) : (
                                        "Create Event"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </div >

            {/* Removed Floating Control Bar */}

            {/* ═══ Cover Image Picker Modal ═══ */}
            {
                showCoverPicker && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
                        <div className="mx-4 w-full max-w-lg rounded-[2.5rem] border bg-background p-8 shadow-2xl relative">
                            <div className="mb-6 flex items-center justify-between">
                                <h3 className="text-2xl font-bold">Choose Cover Image</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowCoverPicker(false)}
                                    className="rounded-full p-2 bg-black/5 hover:bg-black/10 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Upload option */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="mb-8 flex w-full items-center gap-4 rounded-3xl border-2 border-dashed border-zinc-200 px-6 py-6 text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
                            >
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Upload className="h-6 w-6" />
                                </div>
                                <div className="text-left">
                                    <p className="text-lg font-bold">Upload from computer</p>
                                    <p className="text-xs opacity-60">JPG, PNG, or WebP up to 5MB</p>
                                </div>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleFileUpload}
                            />

                            {/* Divider */}
                            <div className="mb-8 flex items-center gap-4">
                                <div className="h-px flex-1 bg-zinc-100" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">or choose a preset</span>
                                <div className="h-px flex-1 bg-zinc-100" />
                            </div>

                            {/* Preset gallery */}
                            <div className="grid grid-cols-3 gap-4">
                                {presetCovers.map((preset) => (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => handlePresetSelect(preset)}
                                        className={cn(
                                            "group relative overflow-hidden rounded-[1.5rem] border-4 transition-all",
                                            selectedPresetId === preset.id
                                                ? "border-primary scale-105 shadow-xl"
                                                : "border-transparent opacity-60 hover:opacity-100 hover:scale-[1.02]"
                                        )}
                                    >
                                        <div className="relative aspect-square">
                                            <Image
                                                src={preset.src}
                                                alt={preset.label}
                                                fill
                                                className="object-cover"
                                            />
                                            {selectedPresetId === preset.id && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-primary/20 backdrop-blur-[2px]">
                                                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg transform scale-125">
                                                        <Check className="h-5 w-5 text-white" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <p className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-md py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-white">
                                            {preset.label}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
