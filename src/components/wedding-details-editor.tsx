"use client";

import type { WeddingDetails } from "@/lib/wedding-details";

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
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">These details appear on private invitations and the wedding page.</p>
        <div className="mt-5 grid gap-4">
            <label className="text-xs font-semibold text-zinc-600">Names of the couple or hosts
                <input className={`${input} mt-2`} value={value.hosts} onChange={(event) => update("hosts", event.target.value)} placeholder="e.g. Mia James & Daniel Cole" />
            </label>
            <label className="text-xs font-semibold text-zinc-600">Personal invitation message
                <textarea className={`${input} mt-2 resize-none`} rows={3} value={value.invitation_message} onChange={(event) => update("invitation_message", event.target.value)} placeholder="We warmly invite you to celebrate with us…" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-zinc-600">Dress code
                    <input className={`${input} mt-2`} value={value.dress_code} onChange={(event) => update("dress_code", event.target.value)} placeholder="e.g. Formal, emerald and gold" />
                </label>
                <label className="text-xs font-semibold text-zinc-600">Guest allowance
                    <span className="mt-2 flex min-h-[46px] items-center gap-3 rounded-xl border border-rose-100 bg-white px-4 text-sm font-normal text-zinc-600">
                        <input type="checkbox" checked={value.allow_plus_one} onChange={(event) => update("allow_plus_one", event.target.checked)} className="accent-rose-500" />
                        Allow each invitee to bring one guest
                    </span>
                </label>
            </div>
            <label className="text-xs font-semibold text-zinc-600">Directions or arrival instructions
                <textarea className={`${input} mt-2 resize-none`} rows={2} value={value.directions} onChange={(event) => update("directions", event.target.value)} placeholder="Landmarks, entrance or parking instructions" />
            </label>
            <label className="text-xs font-semibold text-zinc-600">Programme
                <textarea className={`${input} mt-2 resize-none`} rows={3} value={value.programme} onChange={(event) => update("programme", event.target.value)} placeholder={"2:00 PM — Ceremony\n4:00 PM — Reception"} />
            </label>
        </div>
    </section>;
}
