export function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "untitled";
}

export async function findAvailableSlug(
    base: string,
    exists: (candidate: string) => Promise<boolean>
): Promise<string> {
    const normalized = slugify(base);
    let candidate = normalized;
    let suffix = 2;

    while (await exists(candidate)) {
        candidate = `${normalized}-${suffix}`;
        suffix += 1;
    }

    return candidate;
}
