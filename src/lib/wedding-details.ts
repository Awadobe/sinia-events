export type WeddingDetails = {
    hosts: string;
    invitation_message: string;
    dress_code: string;
    directions: string;
    programme: string;
    ceremony: WeddingScheduleItem;
    reception: WeddingScheduleItem;
};

export type WeddingScheduleItem = {
    enabled: boolean;
    time: string;
    location: string;
};

const emptyScheduleItem: WeddingScheduleItem = { enabled: false, time: "", location: "" };

export const emptyWeddingDetails: WeddingDetails = {
    hosts: "",
    invitation_message: "",
    dress_code: "",
    directions: "",
    programme: "",
    ceremony: { ...emptyScheduleItem },
    reception: { ...emptyScheduleItem },
};

export function sanitizeWeddingDetails(value: unknown): WeddingDetails {
    const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
    const text = (key: string, max: number) => typeof source[key] === "string" ? source[key].trim().slice(0, max) : "";
    const schedule = (key: string): WeddingScheduleItem => {
        const item = source[key] && typeof source[key] === "object" ? source[key] as Record<string, unknown> : {};
        return {
            enabled: item.enabled === true,
            time: typeof item.time === "string" ? item.time.slice(0, 5) : "",
            location: typeof item.location === "string" ? item.location.trim().slice(0, 500) : "",
        };
    };
    return {
        hosts: text("hosts", 160),
        invitation_message: text("invitation_message", 1200),
        dress_code: text("dress_code", 200),
        directions: text("directions", 1000),
        programme: text("programme", 2000),
        ceremony: schedule("ceremony"),
        reception: schedule("reception"),
    };
}
