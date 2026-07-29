import type { WeddingDetails } from "@/lib/wedding-details";

export function WeddingInvitationPreview({
    title,
    details,
    compact = false,
    recipientName,
    partySize,
}: {
    title: string;
    details: WeddingDetails;
    compact?: boolean;
    recipientName?: string | null;
    partySize?: number;
}) {
    const design = details.invitation_design;
    const isClassic = design.template === "classic";
    const isBotanical = design.template === "botanical";
    const isModern = design.template === "modern";

    return <div
        className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden text-center ${compact ? "p-5" : "p-8"}`}
        style={{ backgroundColor: design.background, color: design.text }}
    >
        {isBotanical && <><span className="absolute -left-2 -top-2 text-6xl opacity-35">🌿</span><span className="absolute -bottom-2 -right-2 rotate-180 text-6xl opacity-35">🌿</span><div className="absolute inset-3 border opacity-25" style={{ borderColor: design.accent }} /></>}
        {design.template === "romantic" && <><div className="absolute inset-4 rounded-[2rem] border opacity-40" style={{ borderColor: design.accent }} /><div className="absolute left-1/2 top-7 -translate-x-1/2 text-xl opacity-40" style={{ color: design.accent }}>♥</div><div className="absolute bottom-7 left-1/2 -translate-x-1/2 text-xl opacity-40" style={{ color: design.accent }}>♥</div></>}
        {isClassic && <><div className="absolute inset-3 border-2 opacity-40" style={{ borderColor: design.accent }} /><div className="absolute inset-5 border opacity-25" style={{ borderColor: design.accent }} /></>}
        {isModern && <><div className="absolute left-0 top-0 h-2 w-full" style={{ backgroundColor: design.accent }} /><div className="absolute -right-10 -top-10 h-28 w-28 rotate-45 opacity-10" style={{ backgroundColor: design.accent }} /><div className="absolute -bottom-10 -left-10 h-24 w-24 rotate-45 opacity-10" style={{ backgroundColor: design.accent }} /></>}
        <p className="relative text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: design.accent }}>Wedding invitation</p>
        <div className="relative my-4 h-px w-12" style={{ backgroundColor: design.accent }} />
        <h3 className={`relative leading-tight ${compact ? "text-xl" : "text-3xl"} ${isClassic ? "font-serif" : isModern ? "font-sans font-bold uppercase tracking-tight" : "font-serif italic"}`}>
            {title.trim() || "Type the couple’s names"}
        </h3>
        {recipientName && <div className="relative mt-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-60">warmly invite</p>
            <p className={`${compact ? "mt-1 text-sm" : "mt-2 text-xl"} font-serif font-semibold`}>{recipientName}</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: design.accent }}>Admits {partySize || 1}</p>
        </div>}
        {details.invitation_message && <p className="relative mt-4 line-clamp-3 max-w-xs text-xs leading-relaxed opacity-70">{details.invitation_message}</p>}
        {(details.ceremony.time || details.reception.time) && <p className="relative mt-5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: design.accent }}>
            {details.ceremony.time || details.reception.time}
        </p>}
    </div>;
}
