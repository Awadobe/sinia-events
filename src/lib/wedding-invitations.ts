export type WeddingInvitationDraft = {
    id: string;
    name: string;
    email: string;
    party_size: number;
};

export function sanitizeWeddingInvitations(value: unknown): WeddingInvitationDraft[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.slice(0, 500).flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const source = item as Record<string, unknown>;
        const name = typeof source.name === "string" ? source.name.trim().slice(0, 300) : "";
        const email = typeof source.email === "string" ? source.email.trim().toLowerCase().slice(0, 320) : "";
        const partySize = Math.min(20, Math.max(1, Number.parseInt(String(source.party_size || 1), 10) || 1));
        const id = typeof source.id === "string" && /^[0-9a-f-]{36}$/i.test(source.id)
            ? source.id
            : crypto.randomUUID();
        if (!name || seen.has(id)) return [];
        seen.add(id);
        return [{ id, name, email, party_size: partySize }];
    });
}
