"use client";

import type { WeddingDetails } from "@/lib/wedding-details";
import { WeddingInvitationPreview } from "@/components/wedding-invitation-preview";

const DESIGN_PRESETS = [
    { id: "romantic", label: "Romantic", background: "#fff7f8", accent: "#be123c", text: "#292524" },
    { id: "classic", label: "Classic", background: "#faf7f0", accent: "#9a7b3f", text: "#292524" },
    { id: "botanical", label: "Botanical", background: "#f4f7f0", accent: "#3f6844", text: "#243127" },
    { id: "modern", label: "Modern", background: "#f4f4f5", accent: "#18181b", text: "#18181b" },
] as const;

export function WeddingDetailsEditor({
    value,
    onChange,
}: {
    value: WeddingDetails;
    onChange: (value: WeddingDetails) => void;
}) {
    const update = <K extends keyof WeddingDetails>(key: K, next: WeddingDetails[K]) =>
        onChange({ ...value, [key]: next });
    const input = "w-full rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm text-zinc-800 outline-none focus:border-rose-300";

    return <section className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-amber-50 p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-rose-500">Wedding invitation details</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">The event name above will be used as the couple&apos;s names on the invitation.</p>
        <div className="mt-5 grid gap-4">
            <div>
                <p className="text-xs font-semibold text-zinc-600">Invitation style</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {DESIGN_PRESETS.map((preset) => <button
                        key={preset.id}
                        type="button"
                        onClick={() => update("invitation_design", { template: preset.id, background: preset.background, accent: preset.accent, text: preset.text })}
                        className={`rounded-xl border p-2 text-left transition ${value.invitation_design.template === preset.id ? "border-rose-400 bg-white shadow-sm" : "border-rose-100 bg-white/70"}`}
                    >
                        <div className="h-12 overflow-hidden rounded-lg"><WeddingInvitationPreview title="M & J" details={{ ...value, invitation_design: { template: preset.id, background: preset.background, accent: preset.accent, text: preset.text } }} compact /></div>
                        <span className="mt-1.5 block text-[10px] font-bold text-zinc-600">{preset.label}</span>
                    </button>)}
                </div>
            </div>
            <div>
                <p className="text-xs font-semibold text-zinc-600">Custom colours</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {([
                        ["background", "Background"],
                        ["accent", "Accent"],
                        ["text", "Text"],
                    ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-xl border border-rose-100 bg-white px-3 py-2 text-xs font-medium text-zinc-600">
                        <input type="color" value={value.invitation_design[key]} onChange={(event) => update("invitation_design", { ...value.invitation_design, [key]: event.target.value })} className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
                        <span>{label}<small className="block font-mono text-[9px] text-zinc-400">{value.invitation_design[key]}</small></span>
                    </label>)}
                </div>
            </div>
            <label className="text-xs font-semibold text-zinc-600">Personal invitation message
                <textarea className={`${input} mt-2 resize-none`} rows={3} value={value.invitation_message} onChange={(event) => update("invitation_message", event.target.value)} placeholder="We warmly invite you to celebrate with us…" />
            </label>
            <label className="text-xs font-semibold text-zinc-600">Dress code
                <input className={`${input} mt-2`} value={value.dress_code} onChange={(event) => update("dress_code", event.target.value)} placeholder="e.g. Formal, emerald and gold" />
            </label>
            {(["ceremony", "reception"] as const).map((key) => {
                const item = value[key];
                const label = key === "ceremony" ? "Wedding ceremony" : "Reception";
                return <div key={key} className="rounded-xl border border-rose-100 bg-white p-4">
                    <label className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold text-zinc-700">
                        Add {label.toLowerCase()}
                        <input type="checkbox" checked={item.enabled} onChange={(event) => update(key, { ...item, enabled: event.target.checked })} className="accent-rose-500" />
                    </label>
                    {item.enabled && <div className="mt-4 grid gap-3 sm:grid-cols-[130px_1fr]">
                        <label className="text-xs font-semibold text-zinc-500">Time
                            <input type="time" className={`${input} mt-2`} value={item.time} onChange={(event) => update(key, { ...item, time: event.target.value })} />
                        </label>
                        <label className="text-xs font-semibold text-zinc-500">Location
                            <input className={`${input} mt-2`} value={item.location} onChange={(event) => update(key, { ...item, location: event.target.value })} placeholder={`${label} venue`} />
                        </label>
                    </div>}
                </div>;
            })}
            <label className="text-xs font-semibold text-zinc-600">Directions or arrival instructions
                <textarea className={`${input} mt-2 resize-none`} rows={2} value={value.directions} onChange={(event) => update("directions", event.target.value)} placeholder="Landmarks, entrance or parking instructions" />
            </label>
        </div>
    </section>;
}
