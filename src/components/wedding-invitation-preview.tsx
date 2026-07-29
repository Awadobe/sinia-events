import type { WeddingDetails } from "@/lib/wedding-details";

export function WeddingInvitationPreview({
    title,
    details,
    compact = false,
}: {
    title: string;
    details: WeddingDetails;
    compact?: boolean;
}) {
    const design = details.invitation_design;
    const isClassic = design.template === "classic";
    const isBotanical = design.template === "botanical";
    const isModern = design.template === "modern";

    return <div
        className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden text-center ${compact ? "p-5" : "p-8"}`}
        style={{ backgroundColor: design.background, color: design.text }}
    >
        {isBotanical && <><span className="absolute left-3 top-3 text-3xl opacity-40">🌿</span><span className="absolute bottom-3 right-3 rotate-180 text-3xl opacity-40">🌿</span></>}
        {design.template === "romantic" && <div className="absolute inset-4 rounded-[2rem] border opacity-30" style={{ borderColor: design.accent }} />}
        {isModern && <div className="absolute left-0 top-0 h-2 w-full" style={{ backgroundColor: design.accent }} />}
        <p className="relative text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: design.accent }}>Wedding invitation</p>
        <div className="relative my-4 h-px w-12" style={{ backgroundColor: design.accent }} />
        <h3 className={`relative leading-tight ${compact ? "text-xl" : "text-3xl"} ${isClassic ? "font-serif" : isModern ? "font-sans font-bold uppercase tracking-tight" : "font-serif italic"}`}>
            {title.trim() || "Your names here"}
        </h3>
        {details.invitation_message && <p className="relative mt-4 line-clamp-3 max-w-xs text-xs leading-relaxed opacity-70">{details.invitation_message}</p>}
        {(details.ceremony.time || details.reception.time) && <p className="relative mt-5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: design.accent }}>
            {details.ceremony.time || details.reception.time}
        </p>}
    </div>;
}
