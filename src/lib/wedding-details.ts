export type WeddingDetails = {
    hosts: string;
    invitation_message: string;
    dress_code: string;
    directions: string;
    programme: string;
    allow_plus_one: boolean;
};

export const emptyWeddingDetails: WeddingDetails = {
    hosts: "",
    invitation_message: "",
    dress_code: "",
    directions: "",
    programme: "",
    allow_plus_one: false,
};

export function sanitizeWeddingDetails(value: unknown): WeddingDetails {
    const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
    const text = (key: string, max: number) => typeof source[key] === "string" ? source[key].trim().slice(0, max) : "";
    return {
        hosts: text("hosts", 160),
        invitation_message: text("invitation_message", 1200),
        dress_code: text("dress_code", 200),
        directions: text("directions", 1000),
        programme: text("programme", 2000),
        allow_plus_one: source.allow_plus_one === true,
    };
}
