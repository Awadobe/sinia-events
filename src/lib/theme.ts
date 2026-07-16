export const THEME_COLOR_HEX: Record<string, string> = {
    slate: '#64748b',
    rose: '#f43f5e',
    orange: '#f97316',
    amber: '#f59e0b',
    emerald: '#10b981',
    sky: '#0ea5e9',
    indigo: '#6366f1',
    violet: '#8b5cf6',
    pink: '#ec4899',
    red: '#dc2626',
    cyan: '#0891b2',
    teal: '#0f766e',
    lime: '#65a30d',
    yellow: '#eab308',
    fuchsia: '#c026d3',
    burgundy: '#881337',
    navy: '#1e3a8a',
    brown: '#92400e',
    zinc: '#18181b',
};

export const THEME_STYLE_CONFIG: Record<string, {
    pageBackground: string;
    headerBackground: string;
    isDark: boolean;
}> = {
    minimal: {
        pageBackground: '#f8f7f4',
        headerBackground: 'rgba(255,255,255,0.9)',
        isDark: false,
    },
    quantum: {
        pageBackground: 'linear-gradient(145deg, #eef2ff 0%, #f5f3ff 100%)',
        headerBackground: 'rgba(238,242,255,0.9)',
        isDark: false,
    },
    warp: {
        pageBackground: '#0f0f13',
        headerBackground: 'rgba(15,15,19,0.92)',
        isDark: true,
    },
    confetti: {
        pageBackground: 'linear-gradient(145deg, #fdf2f8 0%, #f5f3ff 100%)',
        headerBackground: 'rgba(253,242,248,0.9)',
        isDark: false,
    },
    pattern: {
        pageBackground: 'linear-gradient(145deg, #ecfdf5 0%, #f0fdf9 100%)',
        headerBackground: 'rgba(236,253,245,0.9)',
        isDark: false,
    },
    seasonal: {
        pageBackground: 'linear-gradient(145deg, #fff1f2 0%, #fff7ed 100%)',
        headerBackground: 'rgba(255,241,242,0.9)',
        isDark: false,
    },
};

export const THEME_FONT_FAMILY: Record<string, string> = {
    standard: "'Inter', system-ui, -apple-system, sans-serif",
    classic: "Georgia, 'Times New Roman', serif",
    technical: "'Courier New', Courier, monospace",
    display: "'Playfair Display', Georgia, serif",
};

export type ResolvedTheme = {
    primary: string;
    fontFamily: string;
    pageBackground: string;
    headerBackground: string;
    isDark: boolean;
    text: string;
    textMuted: string;
    cardBackground: string;
    cardBorder: string;
};

export function resolveTheme(opts: {
    color?: string | null;
    style?: string | null;
    font?: string | null;
    mode?: string | null;
}): ResolvedTheme {
    const color = opts.color || 'zinc';
    const style = opts.style || 'minimal';
    const font = opts.font || 'standard';
    const mode = opts.mode || 'light';

    const styleConfig = THEME_STYLE_CONFIG[style] || THEME_STYLE_CONFIG.minimal;
    const primary = THEME_COLOR_HEX[color] || '#18181b';
    // Dark text when: user chose dark mode OR the style preset itself is dark (e.g. warp)
    const isDark = mode === 'dark' || styleConfig.isDark;

    // When dark mode is explicitly selected, override background to dark regardless of style
    const darkPageBg = '#0a0a0f';

    return {
        primary,
        fontFamily: THEME_FONT_FAMILY[font] || THEME_FONT_FAMILY.standard,
        pageBackground: isDark
            ? `linear-gradient(${hexToRgba(primary, 0.08)}, ${hexToRgba(primary, 0.03)}), ${darkPageBg}`
            : `linear-gradient(${hexToRgba(primary, 0.07)}, ${hexToRgba(primary, 0.015)}), ${styleConfig.pageBackground}`,
        headerBackground: isDark ? hexToRgba(primary, 0.12) : hexToRgba(primary, 0.08),
        isDark,
        // High-contrast text for dark mode
        text: isDark ? '#f4f4f5' : '#18181b',
        textMuted: isDark ? '#d4d4d8' : '#71717a',
        cardBackground: isDark ? mixHex(primary, '#18181f', 0.12) : mixHex(primary, '#ffffff', 0.045),
        cardBorder: isDark ? hexToRgba(primary, 0.28) : hexToRgba(primary, 0.18),
    };
}

function hexToRgba(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '');
    const value = Number.parseInt(normalized, 16);
    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function mixHex(color: string, base: string, amount: number): string {
    const parse = (hex: string) => {
        const value = Number.parseInt(hex.replace('#', ''), 16);
        return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
    };
    const source = parse(color);
    const background = parse(base);
    const mixed = source.map((channel, index) => Math.round(channel * amount + background[index] * (1 - amount)));
    return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}
