import type { Metadata, ResolvingMetadata } from 'next';
import { createClient } from '@supabase/supabase-js';

// Prevent layout from being statically cached — ensures edits always reflect
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

type Props = {
    params: { slug: string };
};

const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return 'http://localhost:3000';
};

export async function generateMetadata(
    { params }: Props,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _parent: ResolvingMetadata
): Promise<Metadata> {
    const { slug } = params;

    // Fetch event details for metadata
    const { data: event } = await supabaseAdmin
        .from('events')
        .select('title, description, date, image_url, status, visibility')
        .eq('slug', slug)
        .single();

    if (!event) {
        return {
            title: 'Event Not Found | Radius',
        };
    }

    if (event.status === 'draft' || event.visibility === 'invite_only') {
        return {
            title: 'Private Event | Radius',
            description: 'This is a private event on Radius. A valid invitation or event-team account is required.',
            robots: { index: false, follow: false },
            openGraph: {
                title: 'Private Event',
                description: 'A valid invitation is required to view this event.',
                siteName: 'Radius',
                type: 'website',
            },
        };
    }

    const appUrl = getBaseUrl();
    const ogUrl = new URL(`${appUrl}/api/og/event`);
    ogUrl.searchParams.set('title', event.title);

    // Format date nicely for the social card (e.g. "January 15")
    const dateObj = new Date(event.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    ogUrl.searchParams.set('date', formattedDate);

    if (event.image_url) {
        ogUrl.searchParams.set('cover', event.image_url);
    }

    const description = event.description
        ? (event.description.length > 150 ? event.description.substring(0, 147) + '...' : event.description)
        : `Join us for ${event.title} hosted by Christex Foundation`;

    return {
        title: `${event.title} | Radius`,
        description,
        openGraph: {
            title: event.title,
            description,
            url: `${appUrl}/events/${slug}`,
            siteName: 'Radius',
            images: [
                {
                    url: ogUrl.toString(),
                    width: 1200,
                    height: 630,
                    alt: event.title,
                },
            ],
            locale: 'en_US',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: event.title,
            description,
            images: [ogUrl.toString()],
        },
    };
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
    // We just return the children; the layout exists purely to set the Server-side metadata
    // since page.tsx is a "use client" component.
    return <>{children}</>;
}
