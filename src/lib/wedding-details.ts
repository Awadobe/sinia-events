export type WeddingDetails = {
    hosts: string;
    invitation_message: string;
    dress_code: string;
    directions: string;
    programme: string;
    ceremony: WeddingScheduleItem;
    reception: WeddingScheduleItem;
    invitation_design: WeddingInvitationDesign;
};

export type WeddingScheduleItem = {
    enabled: boolean;
    time: string;
    location: string;
};

export type WeddingInvitationDesign = {
    template: "romantic" | "classic" | "botanical" | "modern";
    background: string;
    accent: string;
    text: string;
};

export const defaultWeddingInvitationDesign: WeddingInvitationDesign = {
    template: "romantic",
    background: "#fff7f8",
    accent: "#be123c",
    text: "#292524",
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
    invitation_design: { ...defaultWeddingInvitationDesign },
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
    const designSource = source.invitation_design && typeof source.invitation_design === "object"
        ? source.invitation_design as Record<string, unknown>
        : {};
    const templates = ["romantic", "classic", "botanical", "modern"] as const;
    const template = templates.includes(designSource.template as typeof templates[number])
        ? designSource.template as typeof templates[number]
        : defaultWeddingInvitationDesign.template;
    const color = (key: keyof WeddingInvitationDesign, fallback: string) =>
        typeof designSource[key] === "string" && /^#[0-9a-f]{6}$/i.test(designSource[key] as string)
            ? designSource[key] as string
            : fallback;
    return {
        hosts: text("hosts", 160),
        invitation_message: text("invitation_message", 1200),
        dress_code: text("dress_code", 200),
        directions: text("directions", 1000),
        programme: text("programme", 2000),
        ceremony: schedule("ceremony"),
        reception: schedule("reception"),
        invitation_design: {
            template,
            background: color("background", defaultWeddingInvitationDesign.background),
            accent: color("accent", defaultWeddingInvitationDesign.accent),
            text: color("text", defaultWeddingInvitationDesign.text),
        },
    };
}
